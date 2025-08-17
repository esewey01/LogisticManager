// scripts/wipe-orders.ts
import "dotenv/config";
import { Client } from "pg";

async function main() {
  const shopsArg = (process.argv.find(a => a.startsWith("--shops=")) || "--shops=1,2").split("=")[1];
  const shops = shopsArg.split(",").map(s => parseInt(s.trim(), 10)).filter(Boolean);

  const c = new Client({ connectionString: process.env.DATABASE_URL!, ssl: { rejectUnauthorized: false } });
  await c.connect();
  try {
    await c.query("BEGIN");

    // Cuenta previa
    const before = await c.query(`
      SELECT (SELECT COUNT(*) FROM order_items) AS items,
             (SELECT COUNT(*) FROM orders) AS orders
    `);

    // Borra items de esas órdenes y luego órdenes (por shop)
    const itemsDel = await c.query(`DELETE FROM order_items WHERE order_id IN (
      SELECT id FROM orders WHERE shop_id = ANY($1::int[])
    )`, [shops]);

    const ordersDel = await c.query(`DELETE FROM orders WHERE shop_id = ANY($1::int[])`, [shops]);

    await c.query("COMMIT");

    console.log("Wipe OK");
    console.table({
      items_deleted: itemsDel.rowCount,
      orders_deleted: ordersDel.rowCount,
      shops: shops.join(", "),
      before_items: (before.rows[0] as any).items,
      before_orders: (before.rows[0] as any).orders,
    });
  } catch (e) {
    await c.query("ROLLBACK");
    console.error("Error en wipe:", e);
    process.exit(1);
  } finally {
    await c.end();
  }
}

main();
