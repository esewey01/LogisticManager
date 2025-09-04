#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Sincroniza e inserta artículos desde:
- articulos.xlsx  -> UPSERT por sku (proveedor, sku_interno, nombre, costo, stock_cp)
- almacen.xlsx    -> actualiza stock_a por sku
- NUEVO: crea SKUs que estén en almacen.xlsx pero no existan aún (usa Modelo como nombre, stock_cp=0).

Flujo:
  1) UPSERT de articulos.xlsx (sin TRUNCATE).
  2) Inserta SKUs nuevos detectados en almacen.xlsx (si no vienen en articulos.xlsx ni en BD).
  3) Actualiza stock_a para todos los presentes en almacen.xlsx.
  4) Inactiva los que no estén en articulos.xlsx (opcionalmente se puede borrar con --delete-missing).

Requisitos:
  pip install pandas psycopg2-binary openpyxl
"""

import argparse
import re
from decimal import Decimal, InvalidOperation
import sys
from typing import Optional, Dict, List, Tuple

import pandas as pd
import psycopg2
from psycopg2.extras import execute_values

DB_DSN = "postgresql://postgres:6441@127.0.0.1:5432/logisticmanager"

def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Sincronizar 'articulos' desde Excel (con alta de nuevos desde almacén).")
    p.add_argument("--articulos", required=True, help="Ruta a articulos.xlsx")
    p.add_argument("--almacen", required=True, help="Ruta a almacen.xlsx")
    p.add_argument("--delete-missing", action="store_true",
                   help="Borra los SKUs que no vienen en articulos.xlsx (puede fallar por FKs). Por defecto solo inactiva.")
    return p.parse_args()

def clean_sku(raw: Optional[str]) -> Optional[str]:
    if raw is None:
        return None
    s = str(raw).strip()
    return s or None

def sku_key(sku: Optional[str]) -> Optional[str]:
    return (str(sku).strip().lower() if sku is not None else None)

_MONEY_RX = re.compile(r"[^0-9\-,\.]")

def parse_money(val) -> Optional[Decimal]:
    if val is None:
        return None
    if isinstance(val, (int, float, Decimal)):
        try: return Decimal(str(val))
        except InvalidOperation: return None
    s = str(val).strip()
    if s == "": return None
    s = _MONEY_RX.sub("", s)
    if "," in s and "." not in s:
        s = s.replace(",", ".")
    try: return Decimal(s)
    except InvalidOperation: return None

def parse_int(val) -> Optional[int]:
    if val is None:
        return None
    try:
        return int(str(val).strip())
    except Exception:
        try:
            return int(float(str(val).strip()))
        except Exception:
            return None

def read_articulos_xlsx(path: str) -> pd.DataFrame:
    df = pd.read_excel(path)
    df.columns = [str(c).strip().upper() for c in df.columns]
    required = ["SKU","MARCA","SKU INTERNO","MODELO","COSTO ACTUAL","INVENTARIO ACTUAL"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise SystemExit(f"Faltan columnas en articulos.xlsx: {missing}")

    out = pd.DataFrame()
    out["sku"] = df["SKU"].map(clean_sku)
    out["proveedor"] = df["MARCA"].astype(str).str.strip()
    out["sku_interno"] = df["SKU INTERNO"].astype(str).str.strip()
    out["nombre"] = df["MODELO"].astype(str).str.strip()
    out["costo"] = df["COSTO ACTUAL"].map(parse_money)
    out["stock_cp"] = df["INVENTARIO ACTUAL"].map(parse_int).fillna(0).astype(int)
    out["status"] = "activo"

    out["_key"] = out["sku"].map(sku_key)
    dup_mask = out["_key"].duplicated(keep="first")
    dups = out.loc[dup_mask, "sku"].tolist()
    if dups:
        print(f"[AVISO] {len(dups)} SKU(s) duplicados en articulos.xlsx (se usa la primera). Ej.: {dups[:5]}")
    null_sku = out["sku"].isna().sum()
    if null_sku:
        print(f"[AVISO] {null_sku} fila(s) sin SKU fueron descartadas.")
    out = out[~out["_key"].isna()].drop_duplicates("_key", keep="first").drop(columns=["_key"])
    return out

def read_almacen_xlsx(path: str) -> pd.DataFrame:
    """
    Devuelve DataFrame con:
      - sku (original)
      - key (para match)
      - nombre (desde 'Modelo')
      - stock_a (entero)
    """
    df = pd.read_excel(path)
    df.columns = [str(c).strip().upper() for c in df.columns]
    # Esperados (flexible en nombre de stock)
    if "SKU" not in df.columns:
        raise SystemExit("Falta columna 'Sku' en almacen.xlsx")
    if "MODELO" not in df.columns:
        raise SystemExit("Falta columna 'Modelo' en almacen.xlsx")

    stock_col = None
    for candidate in ("ALMACENGENERAL","STOCK","INVENTARIO","CANTIDAD"):
        if candidate in df.columns:
            stock_col = candidate
            break
    if not stock_col:
        raise SystemExit("No se encontró columna de stock en almacen.xlsx (ALMACENGENERAL/STOCK/INVENTARIO/CANTIDAD)")

    out = pd.DataFrame()
    out["sku"] = df["SKU"].map(clean_sku)
    out["key"] = out["sku"].map(sku_key)
    out["nombre"] = df["MODELO"].astype(str).str.strip()
    out["stock_a"] = df[stock_col].map(parse_int).fillna(0).astype(int)

    # Depurar
    out = out[~out["key"].isna()].drop_duplicates("key", keep="first")
    return out

def connect():
    return psycopg2.connect(DB_DSN)

def upsert_articulos(conn, rows: List[Tuple]):
    """
    rows = [
      (sku, proveedor, sku_interno, nombre, costo, stock_cp, status)
    ]
    """
    sql = """
        INSERT INTO articulos (
            sku, proveedor, sku_interno, nombre, costo, stock_cp, status
        )
        VALUES %s
        ON CONFLICT (sku) DO UPDATE SET
          proveedor   = EXCLUDED.proveedor,
          sku_interno = EXCLUDED.sku_interno,
          nombre      = EXCLUDED.nombre,
          costo       = EXCLUDED.costo,
          stock_cp    = EXCLUDED.stock_cp,
          status      = 'activo',
          updated_at  = now()
    """
    with conn.cursor() as cur:
        execute_values(cur, sql, rows, page_size=1000)

def insert_minimal_from_almacen(conn, rows: List[Tuple]):
    """
    Inserta nuevos artículos mínimos desde almacen.xlsx:
      rows = [(sku, nombre, stock_cp, stock_a, status), ...]
      Nota: stock_cp=0 (porque no viene desde almacén), stock_a lo fijamos al insertar.
    """
    if not rows:
        return 0
    with conn.cursor() as cur:
        # 1) Inserta mínimos (si ya existe, no falla por el UNIQUE gracias a ON CONFLICT DO NOTHING)
        execute_values(
            cur,
            """
            INSERT INTO articulos (sku, nombre, stock_cp, status)
            VALUES %s
            ON CONFLICT (sku) DO NOTHING
            """,
            [(sku, nombre, stock_cp, status) for (sku, nombre, stock_cp, _stock_a, status) in rows],
            page_size=1000
        )
        # 2) Ajusta stock_a y en_almacen para esos nuevos (y también si existían ya)
        execute_values(
            cur,
            """
            UPDATE articulos AS a
            SET stock_a = v.stock_a,
                en_almacen = (v.stock_a > 0),
                updated_at = now()
            FROM (VALUES %s) AS v(sku, stock_a)
            WHERE a.sku = v.sku
            """,
            [(sku, stock_a) for (sku, _nombre, _stock_cp, stock_a, _status) in rows],
            page_size=1000
        )
    return len(rows)

def inactivate_missing(conn, present_skus: List[str]) -> int:
    if not present_skus:
        return 0
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE articulos
            SET status = 'inactivo', updated_at = now()
            WHERE sku NOT IN %s
            """,
            (tuple(present_skus),)
        )
        affected = cur.rowcount
    return affected

def delete_missing(conn, present_skus: List[str]) -> int:
    if not present_skus:
        return 0
    with conn.cursor() as cur:
        cur.execute(
            """
            DELETE FROM articulos
            WHERE sku NOT IN %s
            """,
            (tuple(present_skus),)
        )
        affected = cur.rowcount
    return affected

def bulk_update_stock_a(conn, updates: List[Tuple[int, str]]) -> int:
    if not updates:
        return 0
    with conn.cursor() as cur:
        execute_values(
            cur,
            """
            UPDATE articulos AS a
            SET stock_a   = v.stock_a,
                en_almacen = (v.stock_a > 0),
                updated_at = now()
            FROM (VALUES %s) AS v(stock_a, sku)
            WHERE lower(a.sku) = lower(v.sku)
            """,
            updates,
            page_size=1000
        )
    return len(updates)

def fetch_existing_sku_keys(conn) -> Dict[str, str]:
    """Devuelve dict key->sku_original de los que ya existen en BD."""
    with conn.cursor() as cur:
        cur.execute("SELECT sku FROM articulos;")
        rows = cur.fetchall()
    return {sku_key(r[0]): r[0] for r in rows if r and r[0]}

def main():
    args = parse_args()

    print(f"[INFO] Leyendo {args.articulos} …")
    df_art = read_articulos_xlsx(args.articulos)
    print(f"[OK] articulos.xlsx -> {len(df_art)} filas útiles")

    print(f"[INFO] Leyendo {args.almacen} …")
    df_alm = read_almacen_xlsx(args.almacen)
    print(f"[OK] almacen.xlsx -> {len(df_alm)} SKUs para procesar (stock_a)")

    present_skus: List[str] = df_art["sku"].tolist()
    key_to_sku_from_art = {sku_key(s): s for s in present_skus if s is not None}

    # UPSERT rows desde articulos.xlsx
    upsert_rows = []
    for _, r in df_art.iterrows():
        upsert_rows.append((
            r["sku"],
            r.get("proveedor"),
            r.get("sku_interno"),
            r.get("nombre"),
            r.get("costo"),
            int(r.get("stock_cp") or 0),
            "activo",
        ))

    # Conexión
    try:
        conn = connect()
    except Exception as e:
        print(f"[ERROR] Conexión a Postgres falló: {e}")
        sys.exit(1)

    try:
        with conn:
            with conn.cursor() as cur:
                # 1) UPSERT articulos.xlsx
                upsert_articulos(conn, upsert_rows)
                print(f"[OK] UPSERT de {len(upsert_rows)} artículo(s) desde articulos.xlsx")

                # 2) Detectar nuevos desde almacen.xlsx (no presentes en Excel ni en BD)
                existing_keys = fetch_existing_sku_keys(conn)  # keys actuales en BD
                new_from_almacen: List[Tuple[str, str, int, int, str]] = []
                no_match_keys: List[str] = []

                for _, row in df_alm.iterrows():
                    key = row["key"]
                    sku_orig = row["sku"]
                    nombre = row["nombre"]
                    stock_a = int(row["stock_a"] or 0)

                    # Si ya está en Excel, no es "nuevo desde almacén"
                    if key in key_to_sku_from_art:
                        continue
                    # Si ya está en BD, tampoco es nuevo
                    if key in existing_keys:
                        continue

                    if not sku_orig:
                        continue  # seguridad

                    # Preparar inserción mínima: stock_cp=0, status='activo'
                    new_from_almacen.append((sku_orig, nombre, 0, stock_a, "activo"))

                created = insert_minimal_from_almacen(conn, new_from_almacen)
                print(f"[OK] Insertados {created} artículo(s) NUEVOS desde almacen.xlsx")

                # 3) Inactivar o borrar faltantes (comparado con articulos.xlsx)
                if args.delete_missing:
                    try:
                        deleted = delete_missing(conn, present_skus)
                        print(f"[OK] Borrados {deleted} artículo(s) no presentes en articulos.xlsx")
                    except psycopg2.Error:
                        print("[ERROR] Borrado de faltantes falló (probable FK). Usa la inactivación.")
                        raise
                else:
                    affected = inactivate_missing(conn, present_skus)
                    print(f"[OK] Inactivados {affected} artículo(s) no presentes en articulos.xlsx")

                # 4) Update stock_a para TODOS los presentes en almacen.xlsx
                #    (incluye los recién creados)
                updates: List[Tuple[int, str]] = []
                for _, row in df_alm.iterrows():
                    updates.append((int(row["stock_a"]), row["sku"]))
                applied = bulk_update_stock_a(conn, updates)
                print(f"[OK] stock_a aplicado a {applied} SKU(s) (coincidencia case-insensitive)")

                # 5) Resumen
                cur.execute("SELECT COUNT(*) FROM articulos WHERE en_almacen = TRUE;")
                en_alm = cur.fetchone()[0]
                cur.execute("SELECT COUNT(*) FROM articulos WHERE status='activo';")
                activos = cur.fetchone()[0]
                cur.execute("SELECT COUNT(*) FROM articulos;")
                total = cur.fetchone()[0]
                print(f"[RESUMEN] en_almacen=TRUE: {en_alm} | activos: {activos} | total: {total}")

    finally:
        try:
            conn.close()
        except Exception:
            pass

    print("[HECHO] Proceso completado.")

if __name__ == "__main__":
    main()
