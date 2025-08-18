import 'dotenv/config';
import { Client } from 'pg';

// Override opcional por dominio → shop_id fijo
const SHOP_ID_BY_DOMAIN: Record<string, number> = {
  // 'c3b13f-2.myshopify.com': 2,
  // '98d26f-3.myshopify.com': 1,
};

type ShopCfg = {
  shopDomain: string;
  apiVersion: string;
  token: string;
  shopId: number;
};

function readShopsFromEnv(): ShopCfg[] {
  const shops: ShopCfg[] = [];
  for (let i = 1; i <= 10; i++) {
    const name = process.env[`SHOPIFY_SHOP_NAME_${i}`];
    const ver  = process.env[`SHOPIFY_API_VERSION_${i}`];
    const tok  = process.env[`SHOPIFY_ACCESS_TOKEN_${i}`];
    if (!name || !ver || !tok) continue;
    const shopDomain = name.includes('.myshopify.com') ? name : `${name}.myshopify.com`;
    const override = SHOP_ID_BY_DOMAIN[shopDomain];
    const shopId = override ?? i; // _1 → 1, _2 → 2...
    shops.push({ shopDomain, apiVersion: ver, token: tok, shopId });
  }
  if (shops.length === 0) {
    const name = process.env.SHOPIFY_SHOP_NAME;
    const ver  = process.env.SHOPIFY_API_VERSION;
    const tok  = process.env.SHOPIFY_ACCESS_TOKEN;
    if (!name || !ver || !tok) throw new Error('No hay configuración de tiendas en variables de entorno.');
    const shopDomain = name.includes('.myshopify.com') ? name : `${name}.myshopify.com`;
    const override = SHOP_ID_BY_DOMAIN[shopDomain];
    const shopId = override ?? 1;
    shops.push({ shopDomain, apiVersion: ver, token: tok, shopId });
  }
  return shops;
}

// NOTA: sin noteAttributes (no existe en Order 2025-04)
const ORDERS_QUERY = `
query OrdersPage($cursor: String) {
  orders(first: 250, after: $cursor, sortKey: ID, reverse: false) {
    edges {
      cursor
      node {
        id
        name
        createdAt
        updatedAt
        processedAt
        closedAt
        cancelledAt
        cancelReason
        note
        phone
        email
        tags
        shippingAddress { phone }
        billingAddress  { phone }
        customer { email phone }
      }
    }
    pageInfo { hasNextPage }
  }
}
`;

function shopifyGidToNumeric(gid: string): string {
  const parts = String(gid).split('/');
  return parts[parts.length - 1];
}

async function fetchOrdersPage(shop: ShopCfg, cursor: string | null) {
  const url = `https://${shop.shopDomain}/admin/api/${shop.apiVersion}/graphql.json`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': shop.token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: ORDERS_QUERY, variables: { cursor } }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Shopify ${shop.shopDomain} ${res.status}: ${text}`);
  }
  const json = await res.json();
  if (json.errors) throw new Error(`Shopify GraphQL errors: ${JSON.stringify(json.errors)}`);
  return json.data.orders as {
    edges: { cursor: string; node: any }[];
    pageInfo: { hasNextPage: boolean };
  };
}

function normalizeTags(tags: unknown): string[] | null {
  if (Array.isArray(tags)) {
    const arr = tags.map(String).map(s => s.trim()).filter(Boolean);
    return arr.length ? arr : [];
  }
  if (tags == null) return null;
  // por si alguna vez llega string CSV (REST)
  const arr = String(tags).split(',').map(s => s.trim()).filter(Boolean);
  return arr.length ? arr : [];
}

function pickPhone(n: any): string | null {
  return (
    n.phone ??
    n?.shippingAddress?.phone ??
    n?.billingAddress?.phone ??
    n?.customer?.phone ??
    null
  );
}

function pickEmail(n: any): string | null {
  return n.email ?? n?.customer?.email ?? null;
}

async function backfillShop(shop: ShopCfg, pg: Client) {
  console.log(`\n== Backfill tienda: ${shop.shopDomain} (shop_id=${shop.shopId}) ==`);
  let cursor: string | null = null;
  let page = 0;
  let updated = 0;

  while (true) {
    page++;
    const data = await fetchOrdersPage(shop, cursor);
    if (!data.edges || data.edges.length === 0) {
      console.log(`Página ${page}: sin órdenes`);
      break;
    }

    for (const e of data.edges) {
      const n = e.node;
      const idShopify = shopifyGidToNumeric(n.id);

      const phone = pickPhone(n);
      const email = pickEmail(n);
      const tagsArr = normalizeTags(n.tags);

      const q = `
        UPDATE orders
           SET shopify_created_at   = COALESCE($3::timestamptz, shopify_created_at),
               shopify_updated_at   = COALESCE($4::timestamptz, shopify_updated_at),
               shopify_processed_at = COALESCE($5::timestamptz, shopify_processed_at),
               shopify_closed_at    = COALESCE($6::timestamptz, shopify_closed_at),
               shopify_cancelled_at = COALESCE($7::timestamptz, shopify_cancelled_at),
               cancel_reason        = COALESCE($8::text,        cancel_reason),
               order_note           = COALESCE($9::text,        order_note),
               contact_phone        = COALESCE($10::text,       contact_phone),
               customer_email       = COALESCE($11::text,       customer_email),
               tags                 = COALESCE($12::text[],     tags)
         WHERE shop_id = $1
           AND id_shopify = $2
      `;

      const params: any[] = [
        shop.shopId,                // $1
        idShopify,                  // $2
        n.createdAt ?? null,        // $3
        n.updatedAt ?? null,        // $4
        n.processedAt ?? null,      // $5
        n.closedAt ?? null,         // $6
        n.cancelledAt ?? null,      // $7
        n.cancelReason ?? null,     // $8
        n.note ?? null,             // $9
        phone,                      // $10
        email,                      // $11
        tagsArr,                    // $12
      ];

      const r = await pg.query(q, params);
      updated += r.rowCount ?? 0;
    }

    console.log(`Página ${page}: ${data.edges.length} órdenes leídas; updates acumulados: ${updated}`);

    if (!data.pageInfo?.hasNextPage) break;
    cursor = data.edges[data.edges.length - 1].cursor;
    await new Promise((r) => setTimeout(r, 250));
  }

  console.log(`Backfill terminado para ${shop.shopDomain}. Filas tocadas: ${updated}`);
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('Falta DATABASE_URL');

  const pg = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }, // Neon
  });
  await pg.connect();

  await pg.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS ux_orders_shop_shopify
    ON orders (shop_id, id_shopify);
  `);

  const shops = readShopsFromEnv();
  console.log('Tiendas detectadas:', shops.map(s => `${s.shopDomain}→shop_id:${s.shopId}`).join(', '));

  for (const shop of shops) {
    await backfillShop(shop, pg);
  }

  const r = await pg.query(`
    SELECT
      COUNT(*) FILTER (WHERE shopify_created_at   IS NULL) AS created_nulls,
      COUNT(*) FILTER (WHERE shopify_updated_at   IS NULL) AS updated_nulls,
      COUNT(*) FILTER (WHERE shopify_processed_at IS NULL) AS processed_nulls,
      COUNT(*) FILTER (WHERE shopify_closed_at    IS NULL) AS closed_nulls,
      COUNT(*) FILTER (WHERE shopify_cancelled_at IS NULL) AS cancelled_nulls
    FROM orders;
  `);
  console.log('\nPendientes con algún shopify_* en NULL:', r.rows?.[0]);

  await pg.end();
  console.log('\n✅ Backfill completado');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
