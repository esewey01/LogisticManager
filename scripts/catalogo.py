#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Convierte el bloque COPY de (public.)catalogo_productos en INSERTs multi-row.

Uso:
  python copy_catalogo_to_inserts.py backup.sql > catalogo_inserts.sql
  # Luego abre catalogo_inserts.sql en VS Code y ejecuta (Ctrl+Enter) o:
  # psql "<CONN_STRING>" -f catalogo_inserts.sql
"""

import sys
import re

# === Ajustes rápidos ===
TABLE_TARGET = "catalogo_productos"   # solo esta tabla
BATCH_SIZE = 500                      # filas por INSERT (sube a 1000/2000 si quieres)
WRAP_IN_TX = True                     # genera BEGIN/COMMIT para acelerar

COPY_RE = re.compile(
    r'^\s*COPY\s+([^\s(]+)\s*\(([^)]+)\)\s+FROM\s+stdin;\s*$',
    re.IGNORECASE
)

def copy_unescape(v: str) -> str:
    # Des-escapes típicos del formato COPY texto
    v = v.replace(r'\t', '\t').replace(r'\n', '\n').replace(r'\r', '\r').replace(r'\\', '\\')
    return v

def sql_quote(v: str | None) -> str:
    if v is None:
        return "NULL"
    return "'" + v.replace("'", "''") + "'"

def values_tuple(parts):
    return "(" + ", ".join(sql_quote(p) for p in parts) + ")"

def main(path: str):
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        lines = f.readlines()

    in_block = False
    table = None
    columns = []
    rows = []

    for line in lines:
        if not in_block:
            m = COPY_RE.match(line)
            if m:
                table = m.group(1).strip()              # p.ej. public.catalogo_productos
                tshort = table.lower().split(".")[-1]    # nombre sin esquema
                if tshort != TABLE_TARGET:
                    # Saltar otros COPYs
                    table = None
                    continue
                columns = [c.strip() for c in m.group(2).split(",")]
                in_block = True
                continue
        else:
            s = line.rstrip("\n")
            if s == r'\.':
                break  # fin del bloque COPY
            # parsear línea de datos (tab-delimited)
            parts = s.split("\t")
            # '\N' => NULL, el resto va literal (incluye vacío)
            parsed = [None if p == r'\N' else copy_unescape(p) for p in parts]
            if len(parsed) != len(columns):
                sys.stderr.write(
                    f"[WARN] columnas esperadas={len(columns)}, encontradas={len(parsed)}. Línea omitida.\n"
                )
                continue
            rows.append(parsed)

    if not rows:
        sys.stderr.write("No se encontró bloque COPY para catalogo_productos o no tenía filas.\n")
        return

    cols_sql = ", ".join(columns)
    if WRAP_IN_TX:
        print("BEGIN;")

    # Generar INSERTs por lotes
    batch = []
    for r in rows:
        batch.append(values_tuple(r))
        if len(batch) >= BATCH_SIZE:
            print(f"INSERT INTO public.{TABLE_TARGET} ({cols_sql}) VALUES " + ", ".join(batch) + ";")
            batch = []
    if batch:
        print(f"INSERT INTO public.{TABLE_TARGET} ({cols_sql}) VALUES " + ", ".join(batch) + ";")

    if WRAP_IN_TX:
        print("COMMIT;")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.stderr.write("Uso: python copy_catalogo_to_inserts.py <backup.sql>\n")
        sys.exit(1)
    main(sys.argv[1])
