import "dotenv/config";
import { syncShopifyOrders } from "../server/syncShopifyOrders";

// Script CLI para ejecutar la sincronización manual reciente (limitada)

async function main() {
  try {
    const res = await syncShopifyOrders({ store: "all", limit: 250 });
    console.log("Sync MANUAL completado:");
    console.table(res.summary.map((s) => ({ store: s.store, upserted: s.upserted })));
    console.log("Total upserted:", res.totalUpserted);
    process.exit(0);
  } catch (e: any) {
    console.error("Sync MANUAL falló:", e?.message || e);
    process.exit(1);
  }
}

main();

