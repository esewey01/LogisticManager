// server/syncShopifyOrders.ts
import { eq } from "drizzle-orm";
import { db } from "./db"; // ✅usa tu pool y drizzle centralizados
import { orders, channels } from "@shared/schema";
import { getShopifyCredentials } from "./shopifyEnv";

// Descubre qué tiendas hay en envs: SHOPIFY_SHOP_NAME_1, _2, _3...
function listStoreNumbersFromEnv(): number[] {
  const nums = new Set<number>();
  for (const k of Object.keys(process.env)) {
    const m = k.match(/^SHOPIFY_SHOP_NAME_(\d+)$/);
    if (m) nums.add(parseInt(m[1], 10));
  }
  return Array.from(nums).sort((a, b) => a - b);
}

// Canal por tienda: lee SHOPIFY_CHANNEL_CODE_N o usa defaults razonables
async function getChannelIdForStore(storeNumber: number): Promise<number> {
  const code =
    process.env[`SHOPIFY_CHANNEL_CODE_${storeNumber}`] ||
    // fallback simples (ajusta si quieres)
    (storeNumber === 1 ? "CT" : storeNumber === 2 ? "WW" : "WW");

  const [ch] = await db.select().from(channels).where(eq(channels.code, code));
  if (ch?.id) return ch.id;

  // Si no existe el canal, como último recurso usa el primer canal
  const all = await db.select().from(channels).limit(1);
  return all[0]?.id ?? 1;
}

// REST GET contra Shopify para una tienda específica
async function shopifyRestGet<T>(
  storeNumber: number,
  path: string
): Promise<T> {
  const { shop, token, apiVersion } = getShopifyCredentials(String(storeNumber));
  console.log(`[SYNC DEBUG] store=${storeNumber} shop=${shop} ver=${apiVersion} tokenLen=${token?.length}`);

  const base = `https://${shop}/admin/api/${apiVersion}`;
  const r = await fetch(`${base}${path}`, {
    headers: {
      "X-Shopify-Access-Token": token,
      "User-Agent": "LogisticManager/1.0 (+node)",
    },
  });

  const text = await r.text();
  if (!r.ok) {
    throw new Error(
      `Shopify ${storeNumber} ${r.status} ${r.statusText} :: ${text.slice(0, 500)}`
    );
  }
  return JSON.parse(text) as T;
}

type SyncOpts = { store?: string | number; limit?: number };

export async function syncShopifyOrders(opts: SyncOpts = {}) {
  const limit = opts.limit ?? 50;

  // 1) Determinar tiendas a sincronizar
  let targets: number[];
  if (opts.store && String(opts.store).toLowerCase() !== "all") {
    targets = [parseInt(String(opts.store), 10)];
  } else {
    targets = listStoreNumbersFromEnv();
  }

  if (targets.length === 0) {
    throw new Error("No se encontraron tiendas (SHOPIFY_SHOP_NAME_N) en .env");
  }

  const summary: Array<{
    store: number;
    shop: string;
    inserted: number;
    upserted: number;
  }> = [];

  // 2) Procesar cada tienda independientemente
  for (const storeNumber of targets) {
    try {
      const { shop } = getShopifyCredentials(String(storeNumber));
      const channelId = await getChannelIdForStore(storeNumber);

      // REST /orders.json (status=any para traer todas)
      type OrdersResp = {
        orders: Array<{
          id: number | string;
          email?: string | null;
          name?: string | null;
          total_price?: string | null;
          financial_status?: string | null;
          customer?: {
            first_name?: string | null;
            last_name?: string | null;
          } | null;
        }>;
      };

      const data = await shopifyRestGet<OrdersResp>(
        storeNumber,
        `/orders.json?limit=${limit}&status=any&order=created_at+desc`
      );

      let inserted = 0,
        upserted = 0;

      for (const o of data.orders ?? []) {
        const orderIdStr = String(o.id);

        // Shopify devuelve tags como string separado por comas en REST:
        const tagsArr =
          typeof (o as any).tags === "string"
            ? (o as any).tags.split(",").map((s: string) => s.trim()).filter(Boolean)
            : [];

        const customerName = o.customer?.first_name
          ? `${o.customer.first_name} ${o.customer.last_name || ""}`.trim()
          : o.email || o.name || null;

        // 🔴 Campos obligatorios en tu schema:
        const baseRow = {
          orderId: orderIdStr,                 // UNIQUE externo
          idShopify: orderIdStr,               // ✅ NOT NULL
          shopId: storeNumber,                 // ✅ NOT NULL (1 o 2)
          channelId,                           // FK a channels

          // Campos “básicos” que ya tenías:
          customerName,
          totalAmount: (o as any).total_price || null,
          isManaged: false,
          hasTicket: false,
          status: o.financial_status || "pending", // puede mapearse a un estado interno

          // Extras de Shopify (opcionales pero útiles):
          name: (o as any).name || null,
          orderNumber: (o as any).order_number != null ? String((o as any).order_number) : null,
          financialStatus: o.financial_status || null,
          fulfillmentStatus: (o as any).fulfillment_status || null,
          currency: (o as any).currency || null,
          subtotalPrice: (o as any).subtotal_price || null,
          customerEmail: (o as any).email || null,
          tags: tagsArr,

          // Timestamps
          createdAt: (o as any).created_at ? new Date((o as any).created_at) : undefined,
          updatedAt: new Date(),
        };

        // upsert por orderId
        const existing = await db
          .select()
          .from(orders)
          .where(eq(orders.orderId, orderIdStr))
          .limit(1);

        if (existing[0]) {
          await db
            .update(orders)
            .set(baseRow)
            .where(eq(orders.id, existing[0].id));
          upserted++;
        } else {
          await db.insert(orders).values(baseRow);
          inserted++;
        }
      }
      summary.push({ store: storeNumber, shop, inserted, upserted });
    } catch (e: any) {
      // No rompas las otras tiendas si una falla
      summary.push({
        store: storeNumber,
        shop: "unknown",
        inserted: 0,
        upserted: 0,
      });
      console.error(`Sync tienda ${storeNumber} falló:`, e.message);
    }
  }

  return { ok: true, summary };
}
