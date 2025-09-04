#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Importa datos a catalogo_productos desde un Excel.

Columnas esperadas en el Excel:
  SKU | MARCA | SKU INTERNO | MODELO | COSTO ACTUAL | INVENTARIO ACTUAL

Requisitos:
  pip install pandas psycopg2-binary python-dotenv openpyxl
"""

import argparse
import os
import sys

import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv


def parse_args():
    parser = argparse.ArgumentParser(description="Importar catálogo de productos")
    parser.add_argument("--file", required=True, help="Ruta al archivo Excel")
    parser.add_argument("--db", help="Cadena de conexión a Postgres (DATABASE_URL)")
    return parser.parse_args()


def normalize_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    # Normalizar nombres de columnas
    colmap = {
        "sku": "sku",
        "marca": "marca",
        "sku interno": "sku_interno",
        "modelo": "nombre_producto",
        "costo actual": "costo",
        "inventario actual": "stock",
    }
    df = df.rename(columns={c.lower().strip(): colmap.get(c.lower().strip(), c) for c in df.columns})

    # Validar columnas requeridas
    required = ["sku", "marca", "sku_interno", "nombre_producto", "costo", "stock"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"Faltan columnas en el Excel: {missing}")

    # Limpieza
    df["sku"] = df["sku"].astype(str).str.strip()
    df["marca"] = df["marca"].astype(str).str.strip()
    df["sku_interno"] = df["sku_interno"].astype(str).str.strip()
    df["nombre_producto"] = df["nombre_producto"].astype(str).str.strip()

    df["costo"] = pd.to_numeric(df["costo"], errors="coerce")
    df["stock"] = pd.to_numeric(df["stock"], errors="coerce").fillna(0).astype(int)

    return df


def batch_insert(conn, rows):
    sql = """
    INSERT INTO catalogo_productos
      (sku, marca, sku_interno, nombre_producto, costo, stock)
    VALUES %s
    """
    with conn.cursor() as cur:
        execute_values(cur, sql, rows, page_size=1000)


def main():
    args = parse_args()
    load_dotenv()

    db_url = args.db or os.getenv("DATABASE_URL")
    if not db_url:
        print("ERROR: No se encontró DATABASE_URL", file=sys.stderr)
        sys.exit(1)

    try:
        df = pd.read_excel(args.file)
        df = normalize_dataframe(df)
    except Exception as e:
        print(f"ERROR leyendo/validando Excel: {e}", file=sys.stderr)
        sys.exit(1)

    rows = [
        (
            r["sku"],
            r["marca"],
            r["sku_interno"],
            r["nombre_producto"],
            None if pd.isna(r["costo"]) else float(r["costo"]),
            int(r["stock"]),
        )
        for _, r in df.iterrows()
    ]

    try:
        with psycopg2.connect(db_url) as conn:
            conn.autocommit = False
            batch_insert(conn, rows)
            conn.commit()
    except Exception as e:
        print(f"ERROR en inserción: {e}", file=sys.stderr)
        sys.exit(1)

    print(f"OK: Insertadas {len(rows)} filas en catalogo_productos.")


if __name__ == "__main__":
    main()
