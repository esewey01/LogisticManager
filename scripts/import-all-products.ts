import "dotenv/config";
import { ProductService } from "../server/services/ProductService";
import { ShopifyAdminClient } from "../server/services/ShopifyAdminClient";

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function backfillProductsForStore(store: number, pageSize = 250) {
  console.log(`\n== PRODUCTS BACKFILL STORE ${store} ==`);
  const client = new ShopifyAdminClient(String(store));
  let cursor: string | undefined = undefined;
  let firstPage = true;
  let totalSeen = 0;

  while (true) {
    let params: Record<string, any>;
    if (firstPage) {
      params = { limit: Math.min(pageSize, 250), status: "active" }; // o sin status
      firstPage = false;
    } else {
      params = { limit: Math.min(pageSize, 250), page_info: cursor };
    }

    // Usa un método "getProducts" de tu client (similar a orders)
    const resp = await client.getProducts(params); // implementa algo como orders
    const products = resp.products || [];
    totalSeen += products.length;

    // Inserta/actualiza con tu ProductService
    const svc = new ProductService(String(store));
    const r = await svc.syncProductsChunk(products); // crea este método para recibir lista directa
    console.log(`store ${store}: página procesada=${products.length}, upserts=${r?.productsProcessed ?? "?"}`);

    if (!resp.hasNextPage) break;
    cursor = resp.nextPageInfo!;
    await sleep(500);
  }

  console.log(`== FIN STORE ${store} :: total productos vistos=${totalSeen} ==`);
}

function listStores(): number[] {
  const s = new Set<number>();
  for (const k of Object.keys(process.env)) {
    const m = k.match(/^SHOPIFY_SHOP_NAME_(\d+)$/);
    if (m) s.add(parseInt(m[1], 10));
  }
  return Array.from(s).sort((a, b) => a - b);
}

async function main() {
  const stores = listStores();
  if (!stores.length) {
    console.error("No se encontraron tiendas (SHOPIFY_SHOP_NAME_N).");
    process.exit(1);
  }
  for (const s of stores) {
    await backfillProductsForStore(s, 250);
  }
}
main().catch(e => { console.error(e); process.exit(1); });
