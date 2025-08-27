# bulk_set_delivery_date.py
import os, time, math, csv
import requests
from typing import List, Dict, Any

# ====== CONFIG ======
SHOP_NAME = os.getenv("SHOPIFY_SHOP_NAME_2", "c3b13f-2.myshopify.com").replace("https://","").replace("http://","")
ACCESS_TOKEN = os.getenv("SHOPIFY_ACCESS_TOKEN_2", "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")
API_VERSION = os.getenv("SHOPIFY_API_VERSION_2", "2025-07")
GRAPHQL_URL = f"https://{SHOP_NAME}/admin/api/{API_VERSION}/graphql.json"
HEADERS = {"X-Shopify-Access-Token": ACCESS_TOKEN, "Content-Type": "application/json"}

# Metafield destino
MF_NAMESPACE = "Logistica"
MF_KEY = "FechaEntrega"
MF_TYPE = "date"   # "date" | "date_time"

# Entrada
INPUT_XLSX = "orders.xlsx"     # Alternativa: "orders.xlsx" (ver función opcional más abajo)
BATCH_SIZE = 20              # tamaño de lote para metafieldsSet
RETRY = 2                    # reintentos por lote en caso de userErrors/costos

def to_gid(order_id: int) -> str:
    return f"gid://shopify/Order/{order_id}"

def graphql(query: str, variables: Dict[str, Any]) -> Dict[str, Any]:
    r = requests.post(GRAPHQL_URL, headers=HEADERS, json={"query": query, "variables": variables})
    r.raise_for_status()
    data = r.json()
    if "errors" in data and data["errors"]:
        raise RuntimeError(data["errors"])
    return data

def ensure_definition():
    mutation = """
    mutation CreateDef($definition: MetafieldDefinitionInput!) {
      metafieldDefinitionCreate(definition: $definition) {
        createdDefinition { id key namespace ownerType }
        userErrors { field message code }
      }
    }
    """
    variables = {"definition": {
        "name": "Delivery date",
        "namespace": MF_NAMESPACE,
        "key": MF_KEY,
        "description": "Fecha de entrega confirmada",
        "type": MF_TYPE,
        "ownerType": "ORDER"
    }}
    resp = graphql(mutation, variables)["data"]["metafieldDefinitionCreate"]
    if resp.get("createdDefinition"):
        cd = resp["createdDefinition"]
        print(f"✔ Definición creada: {cd['namespace']}.{cd['key']} ({cd['ownerType']})")
    else:
        errs = resp.get("userErrors") or []
        if any("already" in (e.get("message","").lower()) for e in errs):
            print("ℹ Definición ya existente, continuando…")
        elif errs:
            raise RuntimeError(f"metafieldDefinitionCreate userErrors: {errs}")

def metafields_set_batch(rows: List[Dict[str,str]]):
    mutation = """
    mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields { ownerId key namespace value updatedAt }
        userErrors { field message code }
      }
    }
    """
    metas = []
    for r in rows:
        metas.append({
            "ownerId": to_gid(int(r["order_id"])),
            "namespace": MF_NAMESPACE,
            "key": MF_KEY,
            "type": MF_TYPE,
            "value": r["delivery_date"]
        })
    return graphql(mutation, {"metafields": metas})["data"]["metafieldsSet"]

def read_csv(path: str) -> List[Dict[str,str]]:
    out = []
    with open(path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            # Espera columnas: order_id, delivery_date
            if not row.get("order_id") or not row.get("delivery_date"):
                continue
            out.append({"order_id": row["order_id"].strip(), "delivery_date": row["delivery_date"].strip()})
    return out

# # Si prefieres Excel (.xlsx), descomenta esto y cambia INPUT_CSV por INPUT_XLSX
import pandas as pd
def read_xlsx(path: str) -> List[Dict[str,str]]:
     df = pd.read_excel(path, dtype={"order_id": "Int64", "delivery_date": "string"})
     df = df.dropna(subset=["order_id", "delivery_date"])
     return [{"order_id": str(int(r.order_id)), "delivery_date": str(r.delivery_date)} for r in df.itertuples(index=False)]

def main():
    print("🔧 Bulk set metafield logistics.delivery_date")
    ensure_definition()

    rows = read_csv(INPUT_XLSX)  # o read_xlsx("orders.xlsx")
    total = len(rows)
    if not total:
        print("No hay filas válidas en el archivo de entrada.")
        return

    print(f"🗂 Registros a procesar: {total}")
    ok, fail = 0, 0

    for i in range(0, total, BATCH_SIZE):
        batch = rows[i:i+BATCH_SIZE]
        attempt = 0
        while True:
            attempt += 1
            try:
                resp = metafields_set_batch(batch)
                errs = resp.get("userErrors") or []
                if errs:
                    # Muestra errores y marca fallidos este lote
                    print(f"❗ userErrors en lote {i//BATCH_SIZE+1}: {errs}")
                    fail += len(batch)
                else:
                    ok += len(batch)
                break
            except requests.HTTPError as he:
                # Rate limit o error HTTP: espera y reintenta
                if attempt <= RETRY:
                    wait = 2 * attempt
                    print(f"⏳ HTTP error, reintentando en {wait}s… ({he})")
                    time.sleep(wait)
                    continue
                print(f"❌ HTTP error definitivo en lote {i//BATCH_SIZE+1}: {he}")
                fail += len(batch)
                break
            except Exception as e:
                if attempt <= RETRY:
                    wait = 2 * attempt
                    print(f"⏳ Error '{e}', reintentando en {wait}s…")
                    time.sleep(wait)
                    continue
                print(f"❌ Error definitivo en lote {i//BATCH_SIZE+1}: {e}")
                fail += len(batch)
                break

    print(f"\n✅ OK: {ok}   ❌ Fallidos: {fail}   Total: {total}")

if __name__ == "__main__":
    main()
