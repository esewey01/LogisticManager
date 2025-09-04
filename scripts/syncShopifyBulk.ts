// scripts/syncShopifyBulk.ts
// Modo por defecto: BULK (últimos 30 días)
// Flags:
//   --full            => recorre TODO el historial con cursores (usa backfill paginado real)
//   --missing         => rehidrata órdenes con campos faltantes (por ID, lotes pequeños)
//   --store=1         => limita a tienda 1 (por defecto: todas en .env)
//   --days=45         => (solo bulk) cambia rango de días atrás (default 30)
//   --limitMissing=NN => limita cantidad de órdenes a rehidratar (para pruebas; default: 5000)
//   --chunkSize=NN    => tamaño del lote al rehidratar por IDs (default 50, seguro para rate-limit)
//   --sleepMs=NN      => espera entre lotes de rehidratación (default 800 ms)

import { db } from "../server/db";
import { orders } from "@shared/schema";
import { and, isNull, or, eq } from "drizzle-orm";
import {
  syncShopifyOrdersBulk,
  syncShopifyOrdersBackfill,
  refetchShopifyOrdersByIds,
  // Nota: NO existe syncShopifyOrdersFullHistory en tu server; implementamos aquí la lógica full.
} from "../server/syncShopifyOrders";

// ===== util argv simple
const argv = process.argv.slice(2);
const has = (flag: string) => argv.some(a => a === flag);
const getKV = (key: string) => {
  const p = argv.find(a => a.startsWith(`${key}=`));
  return p ? p.split("=").slice(1).join("=") : undefined;
};

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

async function runBulk() {
  const store = getKV("store");
  const daysRaw = getKV("days");
  const daysBack = daysRaw ? Math.max(1, parseInt(daysRaw, 10)) : undefined;

  const res = await syncShopifyOrdersBulk({
    store: store ?? "all",
    daysBack,
  });

  console.log("Sync BULK completado:");
  console.table(res.summary.map(s => ({ store: s.store, upserted: s.upserted, errors: s.errors })));
  console.log(`Total upserted: ${res.totalUpserted} Timestamp: ${res.timestamp}`);
}

/**
 * FULL HISTORY real usando backfill + cursores.
 * Avanza desde la primera página sin filtros (o con updated_at_min si quieres afinar),
 * leyendo page_info hasta que no haya next.
 */
async function runFullHistory() {
  const storeKV = getKV("store") ?? "all";
  const limit = 250; // máx seguro en Shopify REST

  // Helper para iterar una tienda específica
  async function iterateStore(store: string | number) {
    let nextPageInfo: string | null | undefined = null;
    let pages = 0;
    let upserted = 0;
    let errors = 0;

    do {
      const res = await syncShopifyOrdersBackfill({
        store,
        pageInfo: nextPageInfo,
        limit,
      });

      const s = res.summary?.[0];
      upserted += s?.upserted ?? 0;
      errors += s?.errors ?? 0;
      pages += 1;

      nextPageInfo = res.hasNextPage ? (res.nextPageInfo ?? null) : null;

      console.log(`[FULL][store=${store}] page=${pages} upserted+=${s?.upserted ?? 0} errors+=${s?.errors ?? 0} next=${!!nextPageInfo}`);

      // peq. espera para ser amables con rate-limit
      await sleep(300);
    } while (nextPageInfo);

    return { store: Number(store), pages, upserted, errors };
  }

  // Si te pasan un número, iteramos una sola tienda. Si "all", descubrimos por bulk de 30d 1a vez
  // y extraemos de ahí las tiendas; si prefieres, puedes listar del .env en server/validateEnv.
  if (storeKV !== "all") {
    const s = await iterateStore(storeKV);
    console.log("Sync FULL-HISTORY completado (1 tienda):");
    console.table([s]);
    console.log(`Total upserted: ${s.upserted}`);
    return;
  }

  // "all": usamos el summary de un bulk ligero para descubrir tiendas (no importa el rango)
  const bootstrap = await syncShopifyOrdersBulk({ store: "all", daysBack: 1 });
  const stores = bootstrap.summary.map(s => s.store);

  const summary = [];
  for (const st of stores) {
    const r = await iterateStore(st);
    summary.push(r);
  }

  console.log("Sync FULL-HISTORY completado (todas las tiendas):");
  console.table(summary);
  console.log(`Total upserted: ${summary.reduce((a, s) => a + s.upserted, 0)}`);
}

/**
 * Rehidratación masiva de órdenes con campos faltantes.
 * - Selecciona IDs de órdenes donde falten campos "claves".
 * - Agrupa por tienda.
 * - Llama a refetchShopifyOrdersByIds en lotes pequeños con espera.
 */
async function runFillMissing() {
  const storeKV = getKV("store");
  const limitMissing = parseInt(getKV("limitMissing") ?? "", 10) || (storeKV ? 2000 : 5000);
  const chunkSize = Math.max(1, parseInt(getKV("chunkSize") ?? "", 10) || 50);
  const sleepMs   = Math.max(0, parseInt(getKV("sleepMs")   ?? "", 10) || 800);

  // Campos “clave” (ajústalos a tu schema real de Drizzle):
  // Incluimos shipping y fechas comunes, que suelen faltar.
  const MISSING_FIELDS = [
    orders.customerEmail,
    orders.financialStatus,
    orders.fulfillmentStatus,
    orders.shopifyProcessedAt,
    orders.shipName,
    orders.shipAddress1,
    orders.shipCity,
    orders.shipCountry,
  ];

  // Construcción del WHERE
  const missingOr = or(...MISSING_FIELDS.map(c => isNull(c)));

  let rows: Array<{ id: number; shopId: number; orderId: string }> = [];
  if (storeKV) {
    rows = await db
      .select({ id: orders.id, shopId: orders.shopId, orderId: orders.orderId })
      .from(orders)
      .where(and(eq(orders.shopId, parseInt(storeKV, 10)), missingOr))
      .limit(limitMissing);
  } else {
    rows = await db
      .select({ id: orders.id, shopId: orders.shopId, orderId: orders.orderId })
      .from(orders)
      .where(missingOr)
      .limit(limitMissing);
  }

  if (!rows.length) {
    console.log("No se encontraron órdenes con campos faltantes. 🎉");
    return;
  }

  // Agrupar por tienda
  const byStore = new Map<number, string[]>();
  for (const r of rows) {
    const arr = byStore.get(r.shopId) ?? [];
    arr.push(r.orderId);
    byStore.set(r.shopId, arr);
  }

  const summary: Array<{ store: number; requested: number; refetched: number; errors: number }> = [];

  for (const [store, ids] of byStore.entries()) {
    let refetched = 0;
    let errs = 0;

    // Shopify REST no soporta batch por IDs => hacemos una a una en nuestro helper.
    for (let i = 0; i < ids.length; i += chunkSize) {
      const slice = ids.slice(i, i + chunkSize);
      const res = await refetchShopifyOrdersByIds({ store, ids: slice });
      refetched += res.refetched;
      errs += res.errors.length;

      if (res.errors.length) {
        console.error(`[FILL][store=${store}] errores (primeros 3):`, res.errors.slice(0, 3));
      }

      // Espera entre lotes para respetar rate-limit
      if (i + chunkSize < ids.length && sleepMs > 0) {
        await sleep(sleepMs);
      }
    }

    summary.push({ store, requested: ids.length, refetched, errors: errs });
  }

  console.log("Fill Missing completado:");
  console.table(summary);
}

// ====== main ======
(async () => {
  try {
    if (has("--full")) {
      await runFullHistory();
    } else if (has("--missing")) {
      await runFillMissing();
    } else {
      await runBulk();
    }
    process.exit(0);
  } catch (e: any) {
    console.error("syncShopifyBulk.ts ERROR:", e?.message || e);
    process.exit(1);
  }
})();
