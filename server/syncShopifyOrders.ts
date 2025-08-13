// server/syncShopifyOrders.ts
import { shopifyGet } from "../client/src/lib/shopify";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { orders, channels } from "@shared/schema"; // según tus alias del bundler

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema: { orders, channels } as any });

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
    const existing = await db.query.orders.findFirst({ where: (t, { eq }) => eq(t.orderId, row.orderId) });
    if (existing) {
      await db.update(orders).set({ ...row, updatedAt: new Date() }).where(eq(orders.id, existing.id));
      upserted++;
    } else {
      await db.insert(orders).values(row);
      inserted++;
    }
  }

  return { inserted, upserted };
}
