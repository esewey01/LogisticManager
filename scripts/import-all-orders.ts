// scripts/import-all-orders.ts
import "dotenv/config";
import { OrderSyncService } from "../server/services/OrderSyncService";

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// Descubre tiendas por envs: SHOPIFY_SHOP_NAME_1, _2, ...
function listStores(): number[] {
  const s = new Set<number>();
  for (const k of Object.keys(process.env)) {
    const m = k.match(/^SHOPIFY_SHOP_NAME_(\d+)$/);
    if (m) s.add(parseInt(m[1], 10));
  }
  return Array.from(s).sort((a, b) => a - b);
}

async function backfillStore(store: number, pageSize = 250) {
  console.log(`\n== BACKFILL STORE ${store} ==`);
  const svc = new OrderSyncService(String(store));
  let cursor: string | undefined = undefined;
  let totalProcessed = 0;
  let page = 0;

  while (true) {
    page++;
    const res = await svc.backfillOrders(undefined, cursor, pageSize);
    totalProcessed += res.ordersProcessed;
    console.log(`Store ${store} page ${page}: processed=${res.ordersProcessed} errors=${res.errors.length} hasNext=${res.hasNextPage}`);

    if (res.errors.length) {
      console.log("Ejemplos de errores:", res.errors.slice(0, 3));
    }

    if (!res.hasNextPage) break;
    cursor = res.lastCursor;
    // Respeta rate limit (REST ~2 req/s). Con 400–600ms vas bien.
    await sleep(500);
  }

  console.log(`== FIN STORE ${store} :: totalProcessed=${totalProcessed} ==`);
}

async function main() {
  const storeArg = (process.argv.find(a => a.startsWith("--store=")) || "--store=all").split("=")[1];
  const sizeArg  = (process.argv.find(a => a.startsWith("--pageSize=")) || "--pageSize=250").split("=")[1];
  const pageSize = Math.min(parseInt(sizeArg, 10) || 250, 250);

  const stores = storeArg === "all" ? listStores() : [parseInt(storeArg, 10)];
  if (!stores.length) {
    console.error("No se encontraron tiendas. Define SHOPIFY_SHOP_NAME_N en .env");
    process.exit(1);
  }
  for (const s of stores) {
    await backfillStore(s, pageSize);
  }
}
main().catch(e => { console.error(e); process.exit(1); });
