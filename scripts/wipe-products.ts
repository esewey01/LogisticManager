import "dotenv/config";
import { Client } from "pg";

async function main() {
  const shopsArg = (process.argv.find(a => a.startsWith("--shops=")) || "--shops=1,2").split("=")[1];
  const shops = shopsArg.split(",").map(s => parseInt(s.trim(), 10)).filter(Boolean);

  const c = new Client({ connectionString: process.env.DATABASE_URL!, ssl: { rejectUnauthorized: false } });
  await c.connect();
  try {
    await c.query("BEGIN");

    // Borra variantes de productos de estas tiendas
    const delVar = await c.query(`
      DELETE FROM variants v
      USING products p
      WHERE v.product_id = p.id
        AND p.shop_id = ANY($1::int[])
    `, [shops]);

    // Borra productos de estas tiendas
    const delProd = await c.query(`
      DELETE FROM products
      WHERE shop_id = ANY($1::int[])
    `, [shops]);

    await c.query("COMMIT");
    console.table({ variants_deleted: delVar.rowCount, products_deleted: delProd.rowCount, shops: shops.join(", ") });
  } catch (e) {
    await c.query("ROLLBACK");
    console.error("Error en wipe:", e);
    process.exit(1);
  } finally {
    await c.end();
  }
}
main();
