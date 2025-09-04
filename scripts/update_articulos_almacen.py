#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Actualiza 'en_almacen' (a true) y 'stock' en la tabla 'articulos' a partir de un CSV con columnas:
  - sku (obligatoria)
  - stock (obligatoria, entero)

- Match por SKU case-insensitive (lower(sku)).
- Logs generados en la misma carpeta del CSV:
   * matched.csv (db_sku, csv_sku, old_stock, new_stock)
   * no_coincidencias.csv (sku_no_encontrado)
   * coincidencias_case_only.csv (csv_sku, db_sku)
- --dry-run: no escribe en BD ni genera archivos; imprime conteos.

Requisitos:
  pip install pandas psycopg2-binary python-dotenv
"""

import argparse
import os
import sys
import csv
import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv

def parse_args():
    p = argparse.ArgumentParser(description="Actualizar articulos.en_almacen=true y stock desde CSV (sku, stock)")
    p.add_argument("--file", required=True, help="Ruta al CSV (debe incluir columnas 'sku' y 'stock')")
    p.add_argument("--db", help="DATABASE_URL de Postgres. Si no, usa .env")
    p.add_argument("--dry-run", action="store_true", help="Simular sin escribir en BD ni generar logs")
    p.add_argument("--batch-size", type=int, default=5000, help="Tamaño de lote para la tabla temporal")
    return p.parse_args()

def load_dataframe(path: str) -> pd.DataFrame:
    df = pd.read_csv(path, dtype=str, keep_default_na=False)
    # Normalizamos encabezados
    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]
    # Aceptamos alias comunes para stock
    colmap = {
        "inventario": "stock",
        "inventario_actual": "stock",
        "existencia": "stock",
        "qty": "stock",
        "quantity": "stock"
    }
    df.rename(columns={k: v for k, v in colmap.items() if k in df.columns}, inplace=True)

    if "sku" not in df.columns or "stock" not in df.columns:
        raise ValueError("El CSV debe contener columnas 'sku' y 'stock'")

    # Limpieza
    df["sku"] = df["sku"].astype(str).str.strip()
    # Convertir stock a int seguro
    def to_int(x):
        try:
            return int(float(str(x).strip()))
        except:
            return None
    df["stock"] = df["stock"].apply(to_int)

    # Filtramos filas válidas
    df = df.dropna(subset=["sku"]).copy()
    df = df[df["sku"] != ""]
    if df.empty:
        raise ValueError("No hay filas válidas (sku vacío) en el CSV")
    return df

def main():
    args = parse_args()
    load_dotenv()

    db_url = args.db or os.getenv("DATABASE_URL")
    if not db_url:
        print("ERROR: Debes proporcionar --db o definir DATABASE_URL en .env", file=sys.stderr)
        sys.exit(1)

    df = load_dataframe(args.file)

    # Solo dejamos columnas necesarias
    df = df[["sku", "stock"]]

    # Conexión
    conn = psycopg2.connect(db_url)
    conn.autocommit = False

    create_tmp = """
      CREATE TEMP TABLE tmp_update_articulos(
        sku   text NOT NULL,
        stock integer
      ) ON COMMIT DROP;
    """

    insert_tmp = """
      INSERT INTO tmp_update_articulos (sku, stock)
      VALUES %s
    """

    # Matcheos y logs
    not_found_sql = """
      SELECT t.sku
      FROM tmp_update_articulos t
      WHERE NOT EXISTS (
        SELECT 1 FROM articulos a WHERE lower(a.sku) = lower(t.sku)
      )
      ORDER BY t.sku;
    """

    case_only_sql = """
      SELECT t.sku AS csv_sku, a.sku AS db_sku
      FROM tmp_update_articulos t
      JOIN articulos a ON lower(a.sku) = lower(t.sku)
      WHERE a.sku <> t.sku
      ORDER BY t.sku;
    """

    matched_sql = """
      SELECT a.sku AS db_sku, t.sku AS csv_sku, a.stock AS old_stock, t.stock AS new_stock
      FROM tmp_update_articulos t
      JOIN articulos a ON lower(a.sku) = lower(t.sku)
      ORDER BY a.sku;
    """

    # UPDATE: pone en_almacen=true y actualiza stock
    update_sql = """
      UPDATE articulos a
      SET
        en_almacen = true,
        stock      = COALESCE(t.stock, a.stock),
        updated_at = now()
      FROM tmp_update_articulos t
      WHERE lower(a.sku) = lower(t.sku);
    """

    def chunker(seq, size):
        for pos in range(0, len(seq), size):
            yield seq[pos:pos+size]

    rows = [(r["sku"], r["stock"]) for _, r in df.iterrows()]

    try:
        with conn.cursor() as cur:
            cur.execute(create_tmp)
            for chunk in chunker(rows, args.batch_size):
                execute_values(cur, insert_tmp, chunk)

            # Pre-cálculos para reporting
            cur.execute(not_found_sql)
            not_found = [r[0] for r in cur.fetchall()]

            cur.execute(case_only_sql)
            case_only = cur.fetchall()  # (csv_sku, db_sku)

            cur.execute(matched_sql)
            matched = cur.fetchall()    # (db_sku, csv_sku, old_stock, new_stock)

            print(f"Filas en CSV: {len(rows)}")
            print(f"Matched (lower): {len(matched)}")
            print(f"Sin coincidencia: {len(not_found)}")
            print(f"Solo mayúsc/minúsc: {len(case_only)}")

            if args.dry_run:
                print("[DRY-RUN] No se aplicaron cambios ni se generaron CSVs de log.")
                conn.rollback()
            else:
                cur.execute(update_sql)
                print(f"Actualización aplicada. Filas afectadas: {cur.rowcount}")

                out_dir = os.path.abspath(os.path.dirname(args.file))

                # matched.csv
                if matched:
                    m_path = os.path.join(out_dir, "matched.csv")
                    with open(m_path, "w", newline="", encoding="utf-8") as f:
                        w = csv.writer(f)
                        w.writerow(["db_sku", "csv_sku", "old_stock", "new_stock"])
                        for db_sku, csv_sku, old_stock, new_stock in matched:
                            w.writerow([db_sku, csv_sku, old_stock, new_stock])
                    print(f"Log generado: {m_path}")

                # no_coincidencias.csv
                if not_found:
                    nf_path = os.path.join(out_dir, "no_coincidencias.csv")
                    with open(nf_path, "w", newline="", encoding="utf-8") as f:
                        w = csv.writer(f)
                        w.writerow(["sku_no_encontrado"])
                        for sku in not_found:
                            w.writerow([sku])
                    print(f"Log generado: {nf_path}")

                # coincidencias_case_only.csv
                if case_only:
                    co_path = os.path.join(out_dir, "coincidencias_case_only.csv")
                    with open(co_path, "w", newline="", encoding="utf-8") as f:
                        w = csv.writer(f)
                        w.writerow(["csv_sku", "db_sku"])
                        for csv_sku, db_sku in case_only:
                            w.writerow([csv_sku, db_sku])
                    print(f"Log generado: {co_path}")

                conn.commit()

    except Exception as e:
        conn.rollback()
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        conn.close()

if __name__ == "__main__":
    main()
