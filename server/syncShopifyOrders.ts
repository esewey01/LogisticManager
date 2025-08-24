// server/syncShopifyOrders.ts
import { eq } from "drizzle-orm";
import { db } from "./db";
import { orders, orderItems } from "@shared/schema";
import { getShopifyCredentials } from "./shopifyEnv";

/* ===================== Helpers paginación ===================== */

function parseLinkHeader(link: string | null | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!link) return out;
  for (const part of link.split(",")) {
    const m = part.match(/<([^>]+)>\s*;\s*rel="([^"]+)"/);
    if (m) out[m[2]] = m[1];
  }
  return out;
}

function extractPageInfoFromUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  const u = new URL(url);
  const pi = u.searchParams.get("page_info");
  return pi ?? undefined;
}

/* ===================== Fetch RAW (headers+texto) ===================== */

async function shopifyRestGetRaw(storeNumber: number, path: string) {
  const { shop, token, apiVersion } = getShopifyCredentials(String(storeNumber));
  const base = `https://${shop}/admin/api/${apiVersion}`;
  const r = await fetch(`${base}${path}`, {
    headers: {
      "X-Shopify-Access-Token": token,
      "User-Agent": "LogisticManager/1.0 (+node)",
    },
  });
  const text = await r.text();
  return { ok: r.ok, status: r.status, statusText: r.statusText, headers: r.headers, text, shop };
}

/* ===================== Fetch JSON simple ===================== */

async function shopifyRestGet<T>(storeNumber: number, path: string): Promise<T> {
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
    throw new Error(`Shopify ${storeNumber} ${r.status} ${r.statusText} :: ${text.slice(0, 500)}`);
  }
  return JSON.parse(text) as T;
}

/* ===================== Tipos Shopify (REST) ===================== */

type SyncOpts = { store?: string | number; limit?: number };
type CountResp = { count: number };

type OrdersResp = {
  orders: Array<{
    id: number | string;
    email?: string | null;
    name?: string | null;
    order_number?: number | null;
    total_price?: string | null;
    subtotal_price?: string | null;
    currency?: string | null;
    financial_status?: string | null;
    fulfillment_status?: string | null;
    tags?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    processed_at?: string | null;
    closed_at?: string | null;
    cancelled_at?: string | null;
    customer?: {
      first_name?: string | null;
      last_name?: string | null;
      email?: string | null; // << necesario, tu código lo usa
    } | null;
    line_items?: Array<{
      id: number | string;
      product_id?: number | string | null;
      variant_id?: number | string | null;
      sku?: string | null;
      price?: string | number | null;
      quantity: number;
    }>;
    note_attributes?: Array<{ name: string; value: any }>;
  }>;
};

/* ===================== Upsert de 1 orden dentro de TX ===================== */

async function upsertOneOrderTx(tx: any, storeNumber: number, o: any) {
  const orderIdStr = String(o.id);

  const tagsArr =
    typeof o.tags === "string"
      ? o.tags.split(",").map((s: string) => s.trim()).filter(Boolean)
      : [];

  const first = o.customer?.first_name ?? null;
  const last = o.customer?.last_name ?? null;
  const customerName =
    (first || last) ? `${first ?? ""} ${last ?? ""}`.trim() : (o.email ?? o.name ?? null);

  const toStrOrNull = (v: any) => (v == null ? null : String(v));
  const toDateOrNull = (v: any) => (v ? new Date(v) : null);

  const insertData = {
    shopId: Number(storeNumber),
    orderId: orderIdStr,
    name: o.name ?? null,
    orderNumber: toStrOrNull(o.order_number),
    customerName,
    customerEmail: o.email ?? o.customer?.email ?? null,

    subtotalPrice: toStrOrNull(o.subtotal_price),
    totalAmount: toStrOrNull(o.total_price),
    currency: o.currency ?? null,
    financialStatus: o.financial_status ?? null,
    fulfillmentStatus: o.fulfillment_status ?? null,

    tags: tagsArr.length ? tagsArr : null,
    noteAttributes: null,

    createdAt: toDateOrNull(o.created_at),
    shopifyCreatedAt: toDateOrNull(o.created_at),
    shopifyUpdatedAt: toDateOrNull(o.updated_at),
    shopifyProcessedAt: toDateOrNull(o.processed_at),
    shopifyClosedAt: toDateOrNull(o.closed_at),
    shopifyCancelledAt: toDateOrNull(o.cancelled_at),
  };

  const upsertedOrder = await tx
    .insert(orders)
    .values(insertData)
    .onConflictDoUpdate({
      target: [orders.shopId, orders.orderId],
      set: insertData,
    })
    .returning({ id: orders.id });

  const orderPk = upsertedOrder[0]?.id;
  if (!orderPk) throw new Error("No se obtuvo ID de la orden tras UPSERT.");

  await tx.delete(orderItems).where(eq(orderItems.orderId, orderPk));

  const items = (o as any).line_items ?? [];
  if (items.length > 0) {
    const values = items.map((li: any) => ({
      orderId: orderPk,
      sku: li.sku ?? null,
      quantity: Number(li.quantity ?? 0),
      price: toStrOrNull(li.price),
      shopifyProductId: li.product_id != null ? String(li.product_id) : null,
      shopifyVariantId: li.variant_id != null ? String(li.variant_id) : null,
    }));
    await tx.insert(orderItems).values(values);
  }
}

/* ===================== Descubrir tiendas ===================== */

function listStoreNumbersFromEnv(): number[] {
  const nums = new Set<number>();
  for (const k of Object.keys(process.env)) {
    const m = k.match(/^SHOPIFY_SHOP_NAME_(\d+)$/);
    if (m) nums.add(parseInt(m[1], 10));
  }
  return Array.from(nums).sort((a, b) => a - b);
}

/* ===================== Exports unificados ===================== */

// 1) Conteo simple
export async function getOrdersCount(storeParam: string | number) {
  const storeNumber = parseInt(String(storeParam), 10);
  const { shop } = getShopifyCredentials(String(storeNumber));

  const { ok, status, statusText, text } = await shopifyRestGetRaw(
    storeNumber,
    `/orders/count.json?status=any`
  );
  if (!ok) throw new Error(`Shopify count ${status} ${statusText} :: ${text.slice(0, 200)}`);
  const body = JSON.parse(text) as { count?: number };
  return { ok: true as const, store: storeNumber, shop, count: body.count ?? 0 };
}

// 2) Backfill por created_at (una página; soporta page_info)
export async function syncShopifyOrdersBackfill(opts: {
  store: string | number;
  since?: string;
  pageInfo?: string | null;
  limit?: number;
}) {
  const storeNumber = parseInt(String(opts.store), 10);
  const limit = Math.min(opts.limit ?? 50, 250);

  const params: string[] = [`status=any`, `limit=${limit}`];
  if (opts.pageInfo) {
    params.push(`page_info=${encodeURIComponent(String(opts.pageInfo))}`);
  } else {
    if (opts.since) params.push(`created_at_min=${encodeURIComponent(opts.since)}`);
    params.push(`order=created_at+asc`);
  }

  const { ok, status, statusText, text, headers } = await shopifyRestGetRaw(
    storeNumber,
    `/orders.json?${params.join("&")}`
  );
  if (!ok) throw new Error(`Shopify backfill ${status} ${statusText} :: ${text.slice(0, 200)}`);

  const body = JSON.parse(text) as { orders?: any[] };

  let upserted = 0, inserted = 0;
  for (const o of body.orders ?? []) {
    await db.transaction(async (tx) => {
      await upsertOneOrderTx(tx, storeNumber, o);
      upserted++;
    });
  }

  const link = headers.get("link");
  const parsed = parseLinkHeader(link);
  const nextPageInfo = extractPageInfoFromUrl(parsed["next"]);
  const hasNextPage = !!nextPageInfo;

  const { shop } = getShopifyCredentials(String(storeNumber));
  return {
    ok: true as const,
    summary: [{ store: storeNumber, shop, inserted, upserted }],
    hasNextPage,
    nextPageInfo,
  };
}

// 3) Incremental por updated_at_min (una página; soporta page_info)
export async function syncShopifyOrdersIncremental(opts: {
  store: string | number;
  updatedSince: string;
  pageInfo?: string | null;
  limit?: number;
}) {
  const storeNumber = parseInt(String(opts.store), 10);
  const limit = Math.min(opts.limit ?? 100, 250);

  const params: string[] = [`status=any`, `limit=${limit}`];
  if (opts.pageInfo) {
    params.push(`page_info=${encodeURIComponent(String(opts.pageInfo))}`);
  } else {
    params.push(`updated_at_min=${encodeURIComponent(opts.updatedSince)}`);
    params.push(`order=updated_at+asc`);
  }

  const { ok, status, statusText, text, headers } = await shopifyRestGetRaw(
    storeNumber,
    `/orders.json?${params.join("&")}`
  );
  if (!ok) throw new Error(`Shopify incremental ${status} ${statusText} :: ${text.slice(0, 200)}`);

  const body = JSON.parse(text) as { orders?: any[] };

  let upserted = 0, inserted = 0;
  for (const o of body.orders ?? []) {
    await db.transaction(async (tx) => {
      await upsertOneOrderTx(tx, storeNumber, o);
      upserted++;
    });
  }

  const link = headers.get("link");
  const parsed = parseLinkHeader(link);
  const nextPageInfo = extractPageInfoFromUrl(parsed["next"]);
  const hasNextPage = !!nextPageInfo;

  const { shop } = getShopifyCredentials(String(storeNumber));
  return {
    ok: true as const,
    summary: [{ store: storeNumber, shop, inserted, upserted }],
    hasNextPage,
    nextPageInfo,
  };
}

/* ===================== Sincronización “all” (tu endpoint manual) ===================== */

export async function syncShopifyOrders(opts: SyncOpts = {}) {
  const limit = opts.limit ?? 50;

  let targets: number[];
  if (opts.store && String(opts.store).toLowerCase() !== "all") {
    targets = [parseInt(String(opts.store), 10)];
  } else {
    targets = listStoreNumbersFromEnv();
  }
  if (targets.length === 0) {
    throw new Error("No se encontraron tiendas (SHOPIFY_SHOP_NAME_N) en .env");
  }

  const summary: Array<{ store: number; shop: string; inserted: number; upserted: number; }> = [];

  for (const storeNumber of targets) {
    const { shop } = getShopifyCredentials(String(storeNumber));
    let inserted = 0;
    let upserted = 0;

    try {
      const data = await shopifyRestGet<OrdersResp>(
        storeNumber,
        `/orders.json?limit=${limit}&status=any&order=created_at+desc`
      );

      for (const o of data.orders ?? []) {
        await db.transaction(async (tx) => {
          await upsertOneOrderTx(tx, storeNumber, o);
          upserted++;
        });
      }
    } catch (e: any) {
      console.error(`Sync tienda ${storeNumber} falló:`, e?.message || e);
    }

    summary.push({ store: storeNumber, shop, inserted, upserted });
  }

  return { ok: true, summary };
}
