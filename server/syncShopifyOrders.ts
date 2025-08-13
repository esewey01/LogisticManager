// server/syncShopifyOrders.ts
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { orders, channels } from "@shared/schema"; // según tus alias del bundler

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
const db = drizzle(pool, { schema: { orders, channels } });

// Función para realizar peticiones a Shopify desde el servidor
async function shopifyGet(path: string) {
  const shop = process.env.SHOPIFY_SHOP_NAME;
  const token = process.env.SHOPIFY_ACCESS_TOKEN;
  const apiVersion = process.env.SHOPIFY_API_VERSION || "2024-07";
  
  if (!shop || !token) {
    throw new Error("Faltan SHOPIFY_SHOP_NAME/SHOPIFY_ACCESS_TOKEN en el entorno");
  }
  
  const base = `https://${shop}/admin/api/${apiVersion}`;
  const res = await fetch(`${base}${path}`, {
    headers: { "X-Shopify-Access-Token": token }
  });
  
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Shopify ${res.status} ${res.statusText} :: ${txt}`);
  }
  
  return res.json();
}

async function getChannelIdByCode(code: string) {
  // Mapear por ahora todo a "WW" si existe; si no, crea tu mapping real por canal
  const [ch] = await db.select().from(channels).where(eq(channels.code, code));
  return ch?.id ?? 1; // fallback naive
}

export async function syncShopifyOrders({ limit = 50 } = {}) {
  // Trae últimas N órdenes; puedes luego paginar con `since_id` o `created_at_min`
  const data = await shopifyGet(`/orders.json?limit=${limit}&status=any&order=created_at+desc`);
  const channelId = await getChannelIdByCode("WW");

  let inserted = 0, upserted = 0;

  for (const o of data.orders ?? []) {
    const row = {
      orderId: String(o.id),
      channelId,
      customerName: o.customer?.first_name
        ? `${o.customer.first_name} ${o.customer.last_name || ""}`.trim()
        : o.email || o.name || null,
      totalAmount: o.total_price || null,
      isManaged: false,
      hasTicket: false,
      status: (o.financial_status || "pending")
    };

    // upsert simple por orderId
    const existing = await db.select().from(orders).where(eq(orders.orderId, row.orderId)).limit(1);
    const existingOrder = existing[0];
    if (existingOrder) {
      await db.update(orders).set({ ...row, updatedAt: new Date() }).where(eq(orders.id, existingOrder.id));
      upserted++;
    } else {
      await db.insert(orders).values(row);
      inserted++;
    }
  }

  return { inserted, upserted };
}
