// server/syncShopifyOrders.ts (fix 406 + headers seguros + params compatibles)
// Mantiene mismos exports y firmas para no romper imports existentes.

import { eq } from "drizzle-orm";
import { db } from "./db";
import { orders, orderItems } from "@shared/schema";
import { getShopifyCredentials } from "./shopifyEnv";
import { validateEnv } from "./config/validateEnv";
import { setLastSyncResult } from "./syncState";

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

/* ===================== Helper de espera ===================== */
const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

/* ===================== Headers seguros (sin undefined) ===================== */
function buildShopifyHeaders(token: string, extra?: Record<string, string | undefined>) {
  const base: Record<string, string> = {
    "X-Shopify-Access-Token": token,
    "Accept": "application/json",
    "User-Agent": "LogisticManager/1.0 (+node)"
  };
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      if (v != null) base[k] = String(v);
    }
  }
  return base;
}

/* ===================== Wrapper de fetch con reintentos ===================== */
// Centraliza 429/5xx y evita 406 por headers inválidos.
async function fetchShopifyWithRetry(
  storeNumber: number,
  path: string,
  opts: { maxRetries?: number; method?: string; body?: any; headers?: Record<string, string | undefined> } = {},
) {
  const { shop, token, apiVersion } = getShopifyCredentials(String(storeNumber));
  const base = `https://${shop}/admin/api/${apiVersion}`;
  const maxRetries = opts.maxRetries ?? 3;
  const method = opts.method ?? "GET";

  let attempt = 0;
  let lastError: any;

  while (attempt <= maxRetries) {
    try {
      const url = `${base}${path}`;
      const headers = buildShopifyHeaders(
        token,
        {
          // Sólo enviamos Content-Type cuando hay body
          "Content-Type": opts.body ? "application/json" : undefined,
          ...(opts.headers || {}),
        }
      );

      const r = await fetch(url, {
        method,
        body: opts.body ? (typeof opts.body === "string" ? opts.body : JSON.stringify(opts.body)) : undefined,
        headers,
      });

      console.log(`[SHOPIFY][try=${attempt}] store=${storeNumber} path=${path} status=${r.status}`);

      if (r.status === 429) {
        const ra = r.headers.get("retry-after");
        const waitMs = ra ? Math.max(0, Math.round(parseFloat(ra) * 1000)) : 1000 + attempt * 1000;
        console.warn(`[SHOPIFY][429] store=${storeNumber} path=${path} Retry-After=${ra ?? "?"} waitMs=${waitMs}`);
        await sleep(waitMs);
        attempt++;
        continue;
      }

      if (r.status >= 500) {
        const backoffMs = [800, 1600, 3500][Math.min(attempt, 2)];
        console.warn(`[SHOPIFY][5xx] store=${storeNumber} path=${path} status=${r.status} backoffMs=${backoffMs}`);
        await sleep(backoffMs);
        attempt++;
        continue;
      }

      return r;
    } catch (err: any) {
      lastError = err;
      const backoffMs = [800, 1600, 3500][Math.min(attempt, 2)];
      console.warn(`[SHOPIFY][fetch-error][try=${attempt}] store=${storeNumber} path=${path} err=${err?.message || err}. backoff=${backoffMs}ms`);
      await sleep(backoffMs);
      attempt++;
    }
  }
  throw new Error(`fetchShopifyWithRetry agotó reintentos: store=${storeNumber} path=${path} lastErr=${lastError?.message || lastError}`);
}

/* ===================== Fetch RAW (headers+texto) ===================== */
async function shopifyRestGetRaw(storeNumber: number, path: string) {
  const r = await fetchShopifyWithRetry(storeNumber, path);
  const text = await r.text();
  const { shop } = getShopifyCredentials(String(storeNumber));
  if (r.status === 406) {
    console.error(`[SHOPIFY][406] store=${storeNumber} path=${path}`);
    try {
      console.error(`[SHOPIFY][406][body-300] ${String(text).slice(0, 300)}`);
    } catch {}
  }
  return { ok: r.ok, status: r.status, statusText: r.statusText, headers: r.headers, text, shop };
}

/* ===================== Fetch JSON simple ===================== */
async function shopifyRestGet<T>(storeNumber: number, path: string): Promise<T> {
  const r = await fetchShopifyWithRetry(storeNumber, path);
  const text = await r.text();
  if (!r.ok) {
    throw new Error(`Shopify ${storeNumber} ${r.status} ${r.statusText} :: ${text.slice(0, 500)}`);
  }
  return JSON.parse(text) as T;
}

/* ===================== Tipos Shopify (REST) ===================== */

type SyncOpts = { store?: string | number; limit?: number };

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
      email?: string | null;
    } | null;
    line_items?: Array<{
      id: number | string;
      product_id?: number | string | null;
      variant_id?: number | string | null;
      sku?: string | null;
      price?: string | number | null;
      quantity: number;
      title?: string | null;
      variant_title?: string | null;
    }>;
    note_attributes?: Array<{ name: string; value: any }>;
  }>;
};

/* ===================== Upsert de 1 orden dentro de TX ===================== */
async function upsertOneOrderTx(tx: any, storeNumber: number, o: any) {
  const toStrOrNull = (v: any) => (v == null ? null : String(v));
  const toDateOrNull = (v: any) => (v ? new Date(v) : null);

  const orderIdStr = String(o.id);

  // ====== CUSTOMER ======
  const first = o.customer?.first_name ?? null;
  const last  = o.customer?.last_name  ?? null;
  const customerName =
    (first || last) ? `${first ?? ""} ${last ?? ""}`.trim()
                    : (o.email ?? o.name ?? null);

  // ====== TAGS ======
  const tagsArr =
    typeof o.tags === "string"
      ? o.tags.split(",").map((s: string) => s.trim()).filter(Boolean)
      : [];

  // ====== SHIPPING (NUEVO) ======
  // Shopify: o.shipping_address puede venir null si aún no hay dirección.
  const sa = o.shipping_address ?? null;
  const shipName     = sa?.name     ?? null;
  const shipPhone    = sa?.phone    ?? null;
  const shipAddress1 = sa?.address1 ?? null;
  const shipCity     = sa?.city     ?? null;
  const shipProvince = sa?.province ?? null;
  const shipCountry  = sa?.country  ?? null;
  const shipZip      = sa?.zip      ?? null;

  // ====== INSERT DATA ======
  const insertData = {
    // claves
    shopId: Number(storeNumber),
    orderId: orderIdStr,

    // básicos
    name: o.name ?? null,
    orderNumber: toStrOrNull(o.order_number),
    customerName,
    customerEmail: o.email ?? o.customer?.email ?? null,

    // montos/moneda/estatus
    subtotalPrice: toStrOrNull(o.subtotal_price),
    totalAmount:   toStrOrNull(o.total_price),
    currency: o.currency ?? null,
    financialStatus: o.financial_status ?? null,
    fulfillmentStatus: o.fulfillment_status ?? null,

    // tags y notas (si en tu schema NO existe noteAttributes, no lo envíes)
    tags: tagsArr.length ? tagsArr : null,

    // shipping (NUEVO)
    shipName,
    shipPhone,
    shipAddress1,
    shipCity,
    shipProvince,
    shipCountry,
    shipZip,

    // fechas
    createdAt:           toDateOrNull(o.created_at),
    shopifyCreatedAt:    toDateOrNull(o.created_at),
    shopifyUpdatedAt:    toDateOrNull(o.updated_at),
    shopifyProcessedAt:  toDateOrNull(o.processed_at),
    shopifyClosedAt:     toDateOrNull(o.closed_at),
    shopifyCancelledAt:  toDateOrNull(o.cancelled_at),
  } as const;

  // Para UPSERT: no reescribimos createdAt en updates
  const { createdAt, ...rest } = insertData as any;
  const updateData = { ...rest, updatedAt: new Date() };

  // ====== UPSERT ORDER ======
  const upsertedOrder = await tx
    .insert(orders)
    .values(insertData)
    .onConflictDoUpdate({
      target: [orders.shopId, orders.orderId],
      set: updateData as any,
    })
    .returning({ id: orders.id });

  const orderPk = upsertedOrder[0]?.id;
  if (!orderPk) throw new Error("No se obtuvo ID de la orden tras UPSERT.");

  // ====== RE-INSERT ITEMS ======
  await tx.delete(orderItems).where(eq(orderItems.orderId, orderPk));

  const items = Array.isArray(o.line_items) ? o.line_items : [];
  if (items.length > 0) {
    const values = items.map((li: any) => ({
      orderId: orderPk,
      sku: li.sku ?? null,
      quantity: Number(li.quantity ?? 0),
      // price puede llegar numérico o string; guardamos como string
      price: toStrOrNull(li.price),
      shopifyProductId: li.product_id != null ? String(li.product_id) : null,
      shopifyVariantId: li.variant_id != null ? String(li.variant_id) : null,
      title: li.title ?? null,
      variantTitle: li.variant_title ?? null,
    }));
    if (values.length) {
      await tx.insert(orderItems).values(values);
    }
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

// 1) Conteo simple (REST /count.json sigue disponible)
export async function getOrdersCount(storeParam: string | number) {
  const storeNumber = parseInt(String(storeParam), 10);
  const { shop } = getShopifyCredentials(String(storeNumber));

  const { ok, status, statusText, text } = await shopifyRestGetRaw(
    storeNumber,
    `/orders/count.json`
  );
  if (!ok) throw new Error(`Shopify count ${status} ${statusText} :: ${text.slice(0, 200)}`);
  const body = JSON.parse(text) as { count?: number };
  return { ok: true as const, store: storeNumber, shop, count: body.count ?? 0 };
}

// 2) Backfill/first page por updated_at_min o por cursor
export async function syncShopifyOrdersBackfill(opts: {
  store: string | number;
  updatedSince?: string;  // ISO UTC
  pageInfo?: string | null;
  limit?: number;
}) {
  const storeNumber = parseInt(String(opts.store), 10);
  const limit = Math.min(opts.limit ?? 100, 250);

  const params: string[] = [];
  if (opts.pageInfo) {
    // Con cursor: SOLO limit + page_info
    params.push(`limit=${limit}`);
    params.push(`page_info=${encodeURIComponent(String(opts.pageInfo))}`);
  } else {
    // Primera página: evitar 'status' y 'order' para compatibilidad 2025-07+
    if (opts.updatedSince) params.push(`updated_at_min=${encodeURIComponent(opts.updatedSince)}`);
    params.push(`limit=${limit}`);
  }

  const path = `/orders.json?${params.join("&")}`;
  const { ok, status, statusText, text, headers } = await shopifyRestGetRaw(storeNumber, path);
  if (!ok) throw new Error(`Shopify backfill ${status} ${statusText} :: ${text.slice(0, 300)}`);

  const body = JSON.parse(text) as { orders?: any[] };

  let upserted = 0, inserted = 0;
  const errors: Array<{ store: number; orderId?: string; reason: string }> = [];
  for (const o of body.orders ?? []) {
    try {
      await db.transaction(async (tx) => {
        await upsertOneOrderTx(tx, storeNumber, o);
      });
      upserted++;
      console.log(`[UPSERT] store=${storeNumber} order=${String(o.id)} upserted items=${(o.line_items ?? []).length}`);
    } catch (e: any) {
      const reason = e?.message || String(e);
      console.error(`[UPSERT-ERR] store=${storeNumber} order=${String(o.id)} reason=${reason}`);
      errors.push({ store: storeNumber, orderId: String(o.id), reason });
    }
  }

  const link = headers.get("link");
  const parsed = parseLinkHeader(link);
  const nextPageInfo = extractPageInfoFromUrl(parsed["next"]);
  const hasNextPage = !!nextPageInfo;

  const { shop } = getShopifyCredentials(String(storeNumber));
  return {
    ok: true as const,
    summary: [{ store: storeNumber, shop, inserted, upserted, errors: errors.length }],
    hasNextPage,
    nextPageInfo,
  };
}

// ====== NUEVO: refetch puntual por IDs (rellenar campos faltantes sin duplicar) ======
export async function refetchShopifyOrdersByIds(opts: {
  store: string | number;
  ids: Array<string | number>;
}) {
  const storeNumber = parseInt(String(opts.store), 10);
  const { shop } = getShopifyCredentials(String(storeNumber));

  let okCount = 0;
  const errors: Array<{ id: string; reason: string }> = [];

  for (const rawId of opts.ids) {
    const orderId = String(rawId).trim();
    if (!orderId) continue;

    // Pedimos 1 orden por ID
    const path = `/orders/${encodeURIComponent(orderId)}.json`;
    const { ok, status, statusText, text } = await shopifyRestGetRaw(storeNumber, path);
    if (!ok) {
      errors.push({ id: orderId, reason: `HTTP ${status} ${statusText} :: ${String(text).slice(0, 200)}` });
      continue;
    }

    let body: any;
    try {
      body = JSON.parse(text);
    } catch (e: any) {
      errors.push({ id: orderId, reason: `JSON parse error: ${e?.message || e}` });
      continue;
    }

    const o = body?.order;
    if (!o || !o.id) {
      errors.push({ id: orderId, reason: `Respuesta vacía o sin 'order'` });
      continue;
    }

    try {
      await db.transaction(async (tx) => { await upsertOneOrderTx(tx, storeNumber, o); });
      okCount++;
    } catch (e: any) {
      errors.push({ id: orderId, reason: e?.message || String(e) });
    }
  }

  return {
    ok: true as const,
    store: storeNumber,
    shop,
    refetched: okCount,
    errors
  };
}

// 3) Incremental: updated_at_min (sin 'status' ni 'order'); con cursor sólo limit+page_info
export async function syncShopifyOrdersIncremental(opts: {
  store: string | number;
  updatedSince: string;   // ISO UTC
  pageInfo?: string | null;
  limit?: number;
}) {
  const storeNumber = parseInt(String(opts.store), 10);
  const limit = Math.min(opts.limit ?? 100, 250);

  const params: string[] = [];
  if (opts.pageInfo) {
    params.push(`limit=${limit}`);
    params.push(`page_info=${encodeURIComponent(String(opts.pageInfo))}`);
  } else {
    params.push(`updated_at_min=${encodeURIComponent(opts.updatedSince)}`);
    params.push(`limit=${limit}`);
  }

  const path = `/orders.json?${params.join("&")}`;
  const { ok, status, statusText, text, headers } = await shopifyRestGetRaw(storeNumber, path);
  if (!ok) throw new Error(`Shopify incremental ${status} ${statusText} :: ${text.slice(0, 300)}`);

  const body = JSON.parse(text) as { orders?: any[] };

  let upserted = 0, inserted = 0;
  const errors: Array<{ store: number; orderId?: string; reason: string }> = [];
  for (const o of body.orders ?? []) {
    try {
      await db.transaction(async (tx) => {
        await upsertOneOrderTx(tx, storeNumber, o);
      });
      upserted++;
      console.log(`[UPSERT] store=${storeNumber} order=${String(o.id)} upserted items=${(o.line_items ?? []).length}`);
    } catch (e: any) {
      const reason = e?.message || String(e);
      console.error(`[UPSERT-ERR] store=${storeNumber} order=${String(o.id)} reason=${reason}`);
      errors.push({ store: storeNumber, orderId: String(o.id), reason });
    }
  }

  const link = headers.get("link");
  const parsed = parseLinkHeader(link);
  const nextPageInfo = extractPageInfoFromUrl(parsed["next"]);
  const hasNextPage = !!nextPageInfo;

  const { shop } = getShopifyCredentials(String(storeNumber));
  return {
    ok: true as const,
    summary: [{ store: storeNumber, shop, inserted, upserted, errors: errors.length }],
    hasNextPage,
    nextPageInfo,
  };
}

/* ===================== Sincronización “all” (endpoint manual) ===================== */

export async function syncShopifyOrders(opts: SyncOpts = {}) {
  validateEnv();
  const perPage = Math.min(opts.limit ?? 100, 250);

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
      // Evitar status/order para compatibilidad: sólo limit
      const data = await shopifyRestGet<OrdersResp>(
        storeNumber,
        `/orders.json?limit=${perPage}`
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

  const totalUpserted = summary.reduce((acc, s) => acc + s.upserted, 0);
  setLastSyncResult({ source: "manual", summary, totalUpserted, timestamp: new Date().toISOString() });
  return { ok: true, summary, totalUpserted };
}

/* ===================== Sincronización bulk programada ===================== */
export async function syncShopifyOrdersBulk(opts: { daysBack?: number; store?: string | number } = {}) {
  const { stores } = validateEnv();
  const daysBack = opts.daysBack ?? 30;
  const perPage = 250;

  let targets: number[];
  if (opts.store && String(opts.store).toLowerCase() !== "all") {
    targets = [parseInt(String(opts.store), 10)];
  } else {
    targets = stores.map(s => s.store);
  }

  const summary: Array<{ store: number; shop: string; inserted: number; upserted: number; errors: number }> = [];

  const isIsoUtc = (s: string | undefined) => !!s && /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(s);

  for (const storeNumber of targets) {
    const { shop } = getShopifyCredentials(String(storeNumber));
    let updatedSince = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();
    if (!isIsoUtc(updatedSince)) {
      console.warn(`[SHOPIFY BULK] store=${storeNumber} updated_at_min inválido (${updatedSince}). Usando fallback 30d.`);
      updatedSince = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    }

    let nextPageInfo: string | undefined = undefined;
    let upserted = 0;
    let inserted = 0;
    const errors: Array<{ store: number; orderId?: string; reason: string }> = [];

    do {
      const isCursor = !!nextPageInfo;
      const params: string[] = isCursor
        ? [
          `limit=${perPage}`,
          `page_info=${encodeURIComponent(nextPageInfo!)}`,
        ]
        : [
          `limit=${perPage}`,
          `updated_at_min=${encodeURIComponent(updatedSince)}`,
        ];

      const path = `/orders.json?${params.join("&")}`;
      const { ok, status, statusText, text, headers } = await shopifyRestGetRaw(storeNumber, path);
      console.log(`[SHOPIFY BULK] store=${storeNumber} path=${path} status=${status}`);

      if (status === 406) {
        try { console.error(`[SHOPIFY BULK][406] body-300: ${String(text).slice(0, 300)}`); } catch {}
        errors.push({ store: storeNumber, orderId: undefined, reason: `Shopify 406 Not Acceptable: ${statusText}` });
        break;
      }
      if (!ok) {
        console.error(`[SHOPIFY BULK][ERR] store=${storeNumber} status=${status} body-300=${String(text).slice(0, 300)}`);
        errors.push({ store: storeNumber, orderId: undefined, reason: `HTTP ${status} ${statusText}` });
        break;
      }

      const body = JSON.parse(text) as { orders?: any[] };
      for (const o of body.orders ?? []) {
        try {
          await db.transaction(async (tx) => {
            await upsertOneOrderTx(tx, storeNumber, o);
          });
          upserted++;
        } catch (e: any) {
          const reason = e?.message || String(e);
          console.error(`[UPSERT-ERR] store=${storeNumber} order=${String(o.id)} reason=${reason}`);
          errors.push({ store: storeNumber, orderId: String(o.id), reason });
        }
      }

      const link = headers.get("link");
      const parsed = parseLinkHeader(link);
      nextPageInfo = extractPageInfoFromUrl(parsed["next"]);
    } while (nextPageInfo);

    summary.push({ store: storeNumber, shop, inserted, upserted, errors: errors.length });
  }

  const totalUpserted = summary.reduce((acc, s) => acc + s.upserted, 0);
  const last = { source: "bulk" as const, summary, totalUpserted, timestamp: new Date().toISOString() };
  setLastSyncResult(last);
  return { ok: true, summary, totalUpserted, timestamp: last.timestamp };
}
