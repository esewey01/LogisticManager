# scripts/combos.py
# -*- coding: utf-8 -*-
import os
import re
import sys
from typing import List, Dict, Tuple, Set
from collections import defaultdict

import pandas as pd
import psycopg2
from psycopg2.extras import execute_values

# ------------------------------------------------------------
# Config
# ------------------------------------------------------------
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:6441@127.0.0.1:5432/logisticmanager")
CSV_PATH = os.path.join("scripts", "combos.csv")

HEADER_SKU_COMBO = "SKU COMBO"
SKU_COL_RE = re.compile(r"^SKU(\d{1,2})$", re.IGNORECASE)

# Prefijo de marca(s) antes de 'Com' con '-' o '_' (ej. '1-Com0001_2', '1_Com0001_2', '1-2_Com003_4')
COMBO_PREFIX_RE = re.compile(r"^\s*([A-Za-z0-9]+(?:-[A-Za-z0-9]+)*)\s*[-_]\s*[Cc][Oo][Mm]")

# Mapa opcional de marcas conocidas; si no está, se inserta como "MARCA <codigo>"
BRAND_MAP: Dict[str, str] = {
    "1": "DGL LATAM",
    "2": "RED LEMON",
    "3": "BRACHES",
    "4": "GIMBEL",
    "5": "UFRA",
    "6": "MARCOS AVIMELE",
    "7": "VIESTARA",
    "8": "DUDUK",
    "9": "MIDLAIT",
    "10": "VICEVERSA",
    "11": "BMOBILE",
    "E": "ELEGATE",
    "sup": "PROTEINA",
}

# ------------------------------------------------------------
# Lectura CSV
# ------------------------------------------------------------
def read_csv_table(path: str) -> pd.DataFrame:
    if not os.path.exists(path):
        raise FileNotFoundError(f"No existe el archivo CSV: {path}")
    df = pd.read_csv(path, dtype=str).fillna("")
    df.columns = [c.strip() for c in df.columns]
    if HEADER_SKU_COMBO not in df.columns:
        raise RuntimeError(f"El CSV debe incluir la columna '{HEADER_SKU_COMBO}'.")
    sku_cols = [c for c in df.columns if SKU_COL_RE.match(c.strip().upper())]
    sku_cols = sorted(sku_cols, key=lambda c: int(SKU_COL_RE.match(c.strip().upper()).group(1)))
    if not sku_cols:
        raise RuntimeError("No se encontraron columnas tipo SKU1, SKU2, ... en el CSV.")
    for c in [HEADER_SKU_COMBO] + sku_cols:
        df[c] = df[c].astype(str).str.strip()
    df = df[df[HEADER_SKU_COMBO] != ""].reset_index(drop=True)
    return df[[HEADER_SKU_COMBO] + sku_cols]

def split_brand_codes(sku_combo: str) -> List[str]:
    m = COMBO_PREFIX_RE.match(sku_combo)
    if not m:
        raise ValueError(f"No se pudo extraer el prefijo de marca en '{sku_combo}'")
    joined = m.group(1).replace(" ", "")
    return joined.split("-")

# ------------------------------------------------------------
# Catálogo / BD helpers
# ------------------------------------------------------------
def fetch_existing_skus(conn, candidates: Set[str]) -> Set[str]:
    """ Devuelve los SKU existentes en catalogo_productos (coincidencia exacta). """
    if not candidates:
        return set()
    with conn.cursor() as cur:
        cur.execute("SELECT sku FROM catalogo_productos WHERE sku = ANY(%s)", (list(candidates),))
        return {r[0] for r in cur.fetchall()}

def upsert_marcas(conn, codes: Set[str]) -> None:
    if not codes:
        return
    rows = [(c, BRAND_MAP.get(c, f"MARCA {c}")) for c in sorted(codes, key=lambda x: (len(x), x))]
    sql = """
        INSERT INTO marcas (codigo, nombre)
        VALUES %s
        ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre
    """
    with conn.cursor() as cur:
        execute_values(cur, sql, rows)

# ------------------------------------------------------------
# Reglas de parsing (SIN multiplicadores en la misma celda)
# ------------------------------------------------------------
def parse_row_pairs(row: pd.Series, sku_cols: List[str], valid_skus: Set[str]) -> Dict[str, int]:
    """
    Reglas EXACTAS:
      - Si la celda siguiente es número puro y NO es un SKU válido: es la cantidad del SKU anterior.
      - Si el mismo SKU aparece varias veces: suma +1 por cada aparición (más la cantidad adyacente si la hay).
      - Si el token no es número y no existe en catálogo: se ignora.
      - Se requiere 'valid_skus' para distinguir cantidades de SKUs numéricos válidos.
    """
    acc: Dict[str, int] = defaultdict(int)
    prev_sku: str = None

    i = 0
    while i < len(sku_cols):
        token = (row.get(sku_cols[i]) or "").strip()
        if token == "":
            prev_sku = None
            i += 1
            continue

        # ¿Número puro? => cantidad para el SKU anterior (si NO es SKU válido)
        if token.isdigit() and token not in valid_skus:
            if prev_sku:
                acc[prev_sku] += int(token) - 1  # ya contamos 1 en la celda anterior
            prev_sku = None
            i += 1
            continue

        # ¿Token es SKU válido?
        if token in valid_skus:
            acc[token] += 1
            prev_sku = token
            # ¿La siguiente celda es número puro y NO SKU válido? => cantidad del actual
            if i + 1 < len(sku_cols):
                nxt = (row.get(sku_cols[i + 1]) or "").strip()
                if nxt.isdigit() and nxt not in valid_skus:
                    acc[token] += int(nxt) - 1
                    i += 1  # consumir cantidad
                    prev_sku = None
            i += 1
            continue

        # No número y no SKU válido => ignorar
        prev_sku = None
        i += 1

    return {sku: qty for sku, qty in acc.items() if qty >= 1}

def calc_categoria(pairs: Dict[str, int]) -> str:
    """
    permisivo = un solo SKU con cantidad >= 2
    compuesto  = resto
    (pairs ya viene solo con SKUs válidos)
    """
    if not pairs:
        return "compuesto"
    if len(pairs) == 1 and next(iter(pairs.values())) >= 2:
        return "permisivo"
    return "compuesto"

# ------------------------------------------------------------
# Carga fila a fila (cada fila = un combo)
# ------------------------------------------------------------
def main():
    print(f"Leyendo CSV: {CSV_PATH}")
    df = read_csv_table(CSV_PATH)
    sku_cols = [c for c in df.columns if SKU_COL_RE.match(c)]

    # Candidatos a validar: TODOS los tokens no vacíos (incluye numéricos, p. ej. 141580)
    candidates: Set[str] = set()
    for _, row in df.iterrows():
        for c in sku_cols:
            t = (row.get(c) or "").strip()
            if t:
                candidates.add(t)

    conn = psycopg2.connect(DATABASE_URL)
    try:
        conn.autocommit = False
        valid_skus = fetch_existing_skus(conn, candidates)

        # Upsert marcas (por prefijos presentes)
        all_codes: Set[str] = set()
        for _, row in df.iterrows():
            codes = split_brand_codes(row[HEADER_SKU_COMBO])
            all_codes.update(codes)
        upsert_marcas(conn, all_codes)
        print(f"Marcas upsertadas: {len(all_codes)}")

        sql_upsert_combo = """
            INSERT INTO combos (sku_combo, codigo_marca, titulo, descripcion, activo, categoria)
            VALUES (%s, %s, NULL, NULL, TRUE, %s)
            ON CONFLICT (sku_combo) DO UPDATE
            SET codigo_marca = EXCLUDED.codigo_marca,
                activo       = EXCLUDED.activo,
                categoria    = EXCLUDED.categoria
        """
        sql_delete_items = "DELETE FROM combo_items WHERE sku_combo = %s"
        sql_insert_items = "INSERT INTO combo_items (sku_combo, sku_marca, cantidad) VALUES %s"

        total_combos = 0
        total_items  = 0
        total_omit   = 0
        ejemplos_omit: Set[str] = set()

        with conn.cursor() as cur:
            for _, row in df.iterrows():
                sku_combo = row[HEADER_SKU_COMBO]
                codes = split_brand_codes(sku_combo)
                codigo_marca = codes[0]  # primera marca del prefijo

                # Parse con reglas exactas usando valid_skus
                pairs_all = parse_row_pairs(row, sku_cols, valid_skus)
                pairs_valid = {s: q for s, q in pairs_all.items() if s in valid_skus}
                omitidos    = [(s, q) for s, q in pairs_all.items() if s not in valid_skus]

                categoria = calc_categoria(pairs_valid)

                # UPSERT combo
                cur.execute(sql_upsert_combo, (sku_combo, codigo_marca, categoria))
                total_combos += 1

                # Reemplazar items
                cur.execute(sql_delete_items, (sku_combo,))
                if pairs_valid:
                    execute_values(cur, sql_insert_items,
                                   [(sku_combo, s, int(q)) for s, q in pairs_valid.items()])
                    total_items += len(pairs_valid)

                # Contabiliza omitidos por FK
                total_omit += len(omitidos)
                for s, _ in omitidos[:5]:
                    ejemplos_omit.add(s)

        conn.commit()
        print(f"Combos procesados: {total_combos}")
        print(f"combo_items insertados: {total_items}")
        if total_omit:
            print(f"[AVISO] Items omitidos por FK (SKU no existe): {total_omit}")
            for s in list(ejemplos_omit)[:10]:
                print(f"  - {s}")
        print("✅ PROCESO COMPLETADO (COMMIT).")

    except Exception as e:
        conn.rollback()
        print("❌ Error, ROLLBACK ejecutado.", file=sys.stderr)
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    main()
