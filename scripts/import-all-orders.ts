// scripts/import-all-orders.ts
// Script ÚNICO: importa TODAS las órdenes (y sus items) desde Shopify a Postgres.
// - Lee tiendas de .env con sufijos _1, _2, ...
// - Mapea envIndex -> shop_id de tu BD (ajusta el MAPEO abajo).
// - Orden de importación: más viejo primero (created_at asc).
// - Upsert (shop_id, order_id) en orders; items: borra e inserta por orden.

import "dotenv/config";
import { Client } from "pg";

// ====== AJUSTA AQUÍ el mapeo de envIndex a shop_id de tu BD ======
const SHOP_ID_BY_ENV_INDEX: Record<number, number> = {
  1: 1, // SHOPIFY_*_1  -> shop_id 1 (WW)
  2: 2, // SHOPIFY_*_2  -> shop_id 2 (CT)
  // 3: 3, // si agregas MGL después
};
// ================================================================

type StoreCfg = {
  envIndex: number;
  domain: string;
  apiVersion: string;
  token: string;
  shopId: number;
};

type ShopifyLineItem = {
  sku?: string | null;
  quantity?: number | string | null;
  price?: number | string | null;
  product_id?: number | string | null;
  variant_id?: number | string | null;
};

type ShopifyOrder = {
  id: number | string;
  name?: string | null;
  order_number?: number | string | null;
  email?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  processed_at?: string | null;
  closed_at?: string | null;
  cancelled_at?: string | null;
  currency?: string | null;
  total_price?: number | string | null;
  subtotal_price?: number | string | null;
  financial_status?: string | null;
  fulfillment_status?: string | null;
  tags?: string | null; // "tag1, tag2"
  customer?: { first_name?: string | null; last_name?: string | null; email?: string | null } | null;
  shipping_address?: {
    name?: string | null;
    phone?: string | null;
    address1?: string | null;
    city?: string | null;
    province?: string | null;
    country?: string | null;
    zip?: string | null;
  } | null;
  line_items?: ShopifyLineItem[] | null;
};

function discoverStoresFromEnv(): StoreCfg[] {
  const stores: StoreCfg[] = [];
  for (const k of Object.keys(process.env)) {
    const m = k.match(/^SHOPIFY_SHOP_NAME_(\d+)$/);
    if (!m) continue;
    const envIndex = parseInt(m[1], 10);
    const domain = process.env[`SHOPIFY_SHOP_NAME_${envIndex}`];
    const apiVersion = process.env[`SHOPIFY_API_VERSION_${envIndex}`];
    const token = process.env[`SHOPIFY_ACCESS_TOKEN_${envIndex}`];
    const shopId = SHOP_ID_BY_ENV_INDEX[envIndex];

    if (!domain || !apiVersion || !token) continue;
    if (!shopId) continue;

    stores.push({ envIndex, domain, apiVersion, token, shopId });
  }
  // ordenar por envIndex para tener un orden consistente
  stores.sort((a, b) => a.envIndex - b.envIndex);
  return stores;
}

function parseLinkHeader(header: string | null): string | null {
  // Devuelve el page_info=... de rel="next" si existe
  if (!header) return null;
  // Ejemplo:
  // <https://xxx/admin/api/2025-07/orders.json?...&page_info=abcdef>; rel="next"
  const parts = header.split(",");
  for (const p of parts) {
    const seg = p.trim();
    if (seg.includes('rel="next"')) {
      const m = seg.match(/<([^>]+)>/);
      if (m && m[1]) {
        const url = new URL(m[1]);
        const pi = url.searchParams.get("page_info");
        if (pi) return pi;
      }
    }
  }
  return null;
}

function numOrNull(v: number | string | null | undefined): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function intOrZero(v: number | string | null | undefined): number {
  if (v == null) return 0;
  const n = typeof v === "number" ? Math.trunc(v) : parseInt(String(v), 10);
  return Number.isFinite(n) ? n : 0;
}

function composeName(first?: string | null, last?: string | null): string | null {
  const f = (first ?? "").trim();
  const l = (last ?? "").trim();
  const full = `${f} ${l}`.trim();
  return full.length ? full : null;
}

function parseTags(tags?: string | null): string[] | null {
  if (!tags) return null;
  const arr = String(tags).split(",").map(t => t.trim()).filter(Boolean);
  return arr.length ? arr : null;
}

function dateOrNull(v?: string | null): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

// === CORRECCIÓN CLAVE: cuando se usa page_info, NO enviar status/order/limit ===
async function fetchOrdersPageREST(
  store: StoreCfg,
  pageInfo?: string | null
): Promise<{ orders: ShopifyOrder[]; nextPageInfo: string | null }> {
  const base = `https://${store.domain}/admin/api/${store.apiVersion}/orders.json`;

  let url: string;
  if (!pageInfo) {
    // Primera página: se pueden pasar filtros/orden/limit
    const params = new URLSearchParams();
    params.set("status", "any");
    params.set("limit", "250");
    params.set("order", "created_at asc"); // más viejo primero
    url = `${base}?${params.toString()}`;
  } else {
    // Paginación: SOLO page_info
    const params = new URLSearchParams();
    params.set("page_info", pageInfo);
    url = `${base}?${params.toString()}`;
  }

  const resp = await fetch(url, {
    headers: {
      "X-Shopify-Access-Token": store.token,
      "Accept": "application/json",
    },
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Shopify ${store.envIndex} HTTP ${resp.status}: ${text}`);
  }

  const data = (await resp.json()) as { orders: ShopifyOrder[] };
  const link = resp.headers.get("link");
  const next = parseLinkHeader(link);
  return { orders: data.orders || [], nextPageInfo: next };
}

async function upsertOrderAndItems(pg: Client, shopId: number, o: ShopifyOrder) {
  const orderId = String(o.id);
  const name = o.name ?? null;
  const order_number = o.order_number != null ? String(o.order_number) : null;

  const customer_name = composeName(o.customer?.first_name, o.customer?.last_name);
  const customer_email = (o.email ?? o.customer?.email ?? null) || null;

  const currency = o.currency ?? null;
  const subtotal = numOrNull(o.subtotal_price);
  const total = numOrNull(o.total_price);
  const financial_status = o.financial_status ?? null;
  const fulfillment_status = o.fulfillment_status ?? null;
  const tagsArr = parseTags(o.tags);

  const ship = o.shipping_address ?? null;
  const ship_name = ship?.name ?? null;
  const ship_phone = ship?.phone ?? null;
  const ship_address1 = ship?.address1 ?? null;
  const ship_city = ship?.city ?? null;
  const ship_province = ship?.province ?? null;
  const ship_country = ship?.country ?? null;
  const ship_zip = ship?.zip ?? null;

  const text = `
    INSERT INTO orders (
      shop_id, order_id, name, order_number,
      customer_name, customer_email,
      financial_status, fulfillment_status, currency,
      subtotal_price, total_amount, tags,
      ship_name, ship_phone, ship_address1, ship_city, ship_province, ship_country, ship_zip,
      shopify_created_at, shopify_updated_at, shopify_processed_at, shopify_closed_at, shopify_cancelled_at
    ) VALUES (
      $1,$2,$3,$4,
      $5,$6,
      $7,$8,$9,
      $10,$11,$12,
      $13,$14,$15,$16,$17,$18,$19,
      $20,$21,$22,$23,$24
    )
    ON CONFLICT (shop_id, order_id) DO UPDATE SET
      name = EXCLUDED.name,
      order_number = EXCLUDED.order_number,
      customer_name = COALESCE(EXCLUDED.customer_name, orders.customer_name),
      customer_email = COALESCE(EXCLUDED.customer_email, orders.customer_email),
      financial_status = EXCLUDED.financial_status,
      fulfillment_status = EXCLUDED.fulfillment_status,
      currency = EXCLUDED.currency,
      subtotal_price = EXCLUDED.subtotal_price,
      total_amount = EXCLUDED.total_amount,
      tags = EXCLUDED.tags,
      ship_name = EXCLUDED.ship_name,
      ship_phone = EXCLUDED.ship_phone,
      ship_address1 = EXCLUDED.ship_address1,
      ship_city = EXCLUDED.ship_city,
      ship_province = EXCLUDED.ship_province,
      ship_country = EXCLUDED.ship_country,
      ship_zip = EXCLUDED.ship_zip,
      shopify_created_at = COALESCE(orders.shopify_created_at, EXCLUDED.shopify_created_at),
      shopify_updated_at = EXCLUDED.shopify_updated_at,
      shopify_processed_at = COALESCE(orders.shopify_processed_at, EXCLUDED.shopify_processed_at),
      shopify_closed_at = COALESCE(orders.shopify_closed_at, EXCLUDED.shopify_closed_at),
      shopify_cancelled_at = COALESCE(orders.shopify_cancelled_at, EXCLUDED.shopify_cancelled_at)
    RETURNING id
  `;

  const values = [
    shopId, orderId, name, order_number,
    customer_name, customer_email,
    financial_status, fulfillment_status, currency,
    subtotal, total, tagsArr,
    ship_name, ship_phone, ship_address1, ship_city, ship_province, ship_country, ship_zip,
    dateOrNull(o.created_at),
    dateOrNull(o.updated_at),
    dateOrNull(o.processed_at),
    dateOrNull(o.closed_at),
    dateOrNull(o.cancelled_at),
  ];

  const r = await pg.query<{ id: number }>(text, values);
  const localOrderId = r.rows[0].id;

  // Reemplazar items de esa orden (idempotente por orden)
  await pg.query(`DELETE FROM order_items WHERE order_id = $1`, [localOrderId]);

  const insItem = `
    INSERT INTO order_items (order_id, sku, quantity, price, shopify_product_id, shopify_variant_id)
    VALUES ($1,$2,$3,$4,$5,$6)
  `;

  for (const li of o.line_items || []) {
    await pg.query(insItem, [
      localOrderId,
      li.sku ?? null,
      intOrZero(li.quantity),
      numOrNull(li.price),
      li.product_id != null ? String(li.product_id) : null,
      li.variant_id != null ? String(li.variant_id) : null,
    ]);
  }
}

async function importStore(store: StoreCfg, pg: Client) {
  console.log(`➡️ Importando tienda #${store.envIndex} (${store.domain}) → shop_id=${store.shopId}`);

  let next: string | null = null;
  let page = 0;
  let totalOrders = 0;

  do {
    const { orders, nextPageInfo } = await fetchOrdersPageREST(store, next);
    page++;
    console.log(`  Página ${page}: ${orders.length} órdenes`);

    // Importa en el orden recibido (ya es ascendente)
    for (const o of orders) {
      await upsertOrderAndItems(pg, store.shopId, o);
      totalOrders++;
    }
    next = nextPageInfo;
  } while (next);

  console.log(`✅ Tienda ${store.envIndex}: importadas ${totalOrders} órdenes (oldest → newest).`);
}

async function main() {
  const target = (process.argv.find(a => a.startsWith("--store=")) || "all").split("=")[1] || "all";
  const stores = discoverStoresFromEnv();
  if (!stores.length) {
    console.error("No hay tiendas válidas en .env (SHOPIFY_SHOP_NAME_N / API_VERSION_N / ACCESS_TOKEN_N) o falta mapear envIndex->shop_id.");
    process.exit(1);
  }

  const pg = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await pg.connect();

  try {
    const selected = target === "all"
      ? stores
      : stores.filter(s => String(s.envIndex) === String(target));

    if (!selected.length) {
      console.error(`No se encontró la tienda solicitada (--store=${target}). Tiendas disponibles: ${stores.map(s => s.envIndex).join(", ")}`);
      process.exit(1);
    }

    // Importar cada tienda (secuencial para no topar rate-limits)
    for (const s of selected) {
      await importStore(s, pg);
    }

    console.log("🏁 Importación completada.");
  } catch (e) {
    console.error("Error en importación:", e);
    process.exit(1);
  } finally {
    await pg.end();
  }
}

main();
