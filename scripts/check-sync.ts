import "dotenv/config";
import { Client } from "pg";
import { OrderSyncService } from "../server/services/OrderSyncService";

async function shopifyCount(store: number) {
  const svc = new OrderSyncService(String(store));
  const { count } = await svc.getOrdersCount();
  return count || 0;
}

async function dbStats(store: number) {
  const c = new Client({ connectionString: process.env.DATABASE_URL!, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const one = await c.query(
    "SELECT COUNT(*)::int AS n FROM orders WHERE shop_id=$1",
    [store]
  );
  const two = await c.query(
    "SELECT COUNT(DISTINCT id_shopify)::int AS n FROM orders WHERE shop_id=$1",
    [store]
  );
  const three = await c.query(
    `SELECT COUNT(*)::int AS n
     FROM orders o LEFT JOIN order_items oi ON oi.order_id=o.id
     WHERE o.shop_id=$1 AND oi.id IS NULL`,
    [store]
  );
  await c.end();
  return {
    dbOrders: one.rows[0].n,
    dbDistinctShopifyIds: two.rows[0].n,
    ordersWithoutItems: three.rows[0].n,
  };
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
  for (const store of stores) {
    const sc = await shopifyCount(store);
    const db = await dbStats(store);
    console.log(`\n=== STORE ${store} ===`);
    console.table({
      shopifyCount: sc,
      dbOrders: db.dbOrders,
      dbDistinctShopifyIds: db.dbDistinctShopifyIds,
      duplicates: db.dbOrders - db.dbDistinctShopifyIds,
      ordersWithoutItems: db.ordersWithoutItems,
    });
  }
}
main().catch(e => { console.error(e); process.exit(1); });
