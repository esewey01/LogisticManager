// server/scheduler.ts
import { syncShopifyOrdersIncremental } from "./syncShopifyOrders";
import { validateEnv } from "./config/validateEnv";
import { setLastSyncResult } from "./syncState";
import { ProductService } from "./services/ProductService";

// Descubre tiendas de las envs: SHOPIFY_SHOP_NAME_1, _2, ...
function listStoreNumbersFromEnv(): number[] {
  const nums = new Set<number>();
  for (const k of Object.keys(process.env)) {
    const m = k.match(/^SHOPIFY_SHOP_NAME_(\d+)$/);
    if (m) nums.add(parseInt(m[1], 10));
  }
  return Array.from(nums).sort((a, b) => a - b);
}

// Locks simples por tienda para evitar solapamientos
const orderLock: Record<number, boolean> = {};
const productLock: Record<number, boolean> = {};

function nowISO() {
  return new Date().toISOString();
}

async function runOrderIncremental(store: number) {
  if (orderLock[store]) {
    console.log(`[CRON][${nowISO()}] Orders store ${store}: saltando (en ejecución)`);
    return;
  }
  orderLock[store] = true;
  try {
    const windowMin = parseInt(process.env.SYNC_WINDOW_MIN ?? "10", 10);
    const since = new Date(Date.now() - windowMin * 60_000).toISOString();

    let cursor: string | undefined = undefined;
    let pages = 0;
    const maxPages = parseInt(process.env.SYNC_MAX_PAGES ?? "5", 10);

    do {
      const res = await syncShopifyOrdersIncremental({
        store,
        updatedSince: since,
        pageInfo: cursor,
        limit: 100,
      });

      const processed = res.summary?.[0]?.upserted ?? 0;
      console.log(
        `[CRON][${nowISO()}] Orders store ${store}: processed=${processed} next=${res.hasNextPage ? "yes" : "no"}`
      );

      // Actualizamos el lastResult consumible por el endpoint de la UI
      const totalUpserted = res.summary?.reduce((acc: number, s: any) => acc + (s.upserted ?? 0), 0) ?? 0;
      setLastSyncResult({ source: "auto", summary: res.summary as any, totalUpserted, timestamp: nowISO() });

      cursor = res.nextPageInfo;
      pages++;
    } while (cursor && pages < maxPages);

  } catch (e: any) {
    console.error(`[CRON][${nowISO()}] Orders store ${store} ERROR:`, e.message || e);
  } finally {
    orderLock[store] = false;
  }
}


async function runProductSync(store: number) {
  if (productLock[store]) {
    console.log(`[CRON][${nowISO()}] Products store ${store}: saltando (en ejecución)`);
    return;
  }
  productLock[store] = true;
  try {
    const limit = parseInt(process.env.PRODUCT_SYNC_LIMIT ?? "250", 10);
    const svc = new ProductService(String(store));
    const res = await svc.syncProductsFromShopify(limit);
    console.log(
      `[CRON][${nowISO()}] Products store ${store}: processed=${res.productsProcessed} errors=${res.errors.length}`
    );
    if (res.errors.length) console.log(res.errors.slice(0, 3));
  } catch (e: any) {
    console.error(`[CRON][${nowISO()}] Products store ${store} ERROR:`, e.message || e);
  } finally {
    productLock[store] = false;
  }
}

export function startSchedulers() {
  // Validación de entorno al iniciar schedulers
  try { validateEnv(); } catch (e: any) {
    console.warn(`[CRON] Entorno inválido para Shopify: ${e?.message || e}`);
  }
  const stores = listStoreNumbersFromEnv();
  if (stores.length === 0) {
    console.warn("[CRON] No se encontraron tiendas en envs (SHOPIFY_SHOP_NAME_N).");
    return;
  }

  const orderMs = parseInt(process.env.SYNC_INTERVAL_MS ?? `${5 * 60_000}`, 10);      // default 5 min
  const prodMs  = parseInt(process.env.PRODUCT_SYNC_INTERVAL_MS ?? `${30 * 60_000}`, 10); // default 30 min

  console.log(`[CRON] Iniciando. Ordenes cada ${orderMs / 60000} min; Productos cada ${prodMs / 60000} min. Tiendas: ${stores.join(", ")}`);

  // Disparo inmediato para tener datos al arranque
  (async () => {
    for (const s of stores) {
      runOrderIncremental(s);
      // Si quieres productos también de inmediato, descomenta:
      // runProductSync(s);
    }
  })();

  // Programación periódica
  for (const s of stores) {
    setInterval(() => runOrderIncremental(s), orderMs);
    // Sincronización de productos deshabilitada según requerimiento del usuario
    // setInterval(() => runProductSync(s), prodMs);
  }
}
