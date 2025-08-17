// server/scheduler.ts
import { OrderSyncService } from "./services/OrderSyncService";
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
    const windowMin = parseInt(process.env.SYNC_WINDOW_MIN ?? "10", 10); // búfer > intervalo
    const since = new Date(Date.now() - windowMin * 60_000).toISOString();

    const svc = new OrderSyncService(String(store));
    const res = await svc.incrementalSync(since);
    console.log(
      `[CRON][${nowISO()}] Orders store ${store}: processed=${res.ordersProcessed} errors=${res.errors.length}`
    );
    if (res.errors.length) console.log(res.errors.slice(0, 3));
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
    setInterval(() => runProductSync(s), prodMs);
  }
}
