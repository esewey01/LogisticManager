import "dotenv/config";
import { Client } from "pg";
import { getOrdersCount } from "../server/syncShopifyOrders";

async function shopifyCount(store: number) {
  const r = await getOrdersCount(store);
  return r.count || 0;
}

async function dbStats(store: number) {
  const c = new Client({ connectionString: process.env.DATABASE_URL!, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const one = await c.query("SELECT COUNT(*)::int AS n FROM orders WHERE shop_id=$1", [store]);
  const two = await c.query(
    "SELECT COUNT(DISTINCT order_id)::int AS n FROM orders WHERE shop_id=$1",
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
    dbDistinctOrderIds: two.rows[0].n,
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
      dbDistinctOrderIds: db.dbDistinctOrderIds,
      duplicates: db.dbOrders - db.dbDistinctOrderIds,
      ordersWithoutItems: db.ordersWithoutItems,
    });
  }
}
main().catch(e => { console.error(e); process.exit(1); });
