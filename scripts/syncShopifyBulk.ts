// scripts/syncShopifyBulk.ts
// Modo por defecto: BULK (últimos 30 días)
// Flags extra:
//   --full      => recorre TODO el historial con cursores
//   --missing   => rellena campos faltantes releyendo órdenes puntuales por ID
//   --store=1   => limita a tienda 1 (opcional). Por defecto: todas detectadas en .env
//   --days=45   => (solo bulk) cambia rango de días atrás (default 30)

import { db } from "../server/db";
import { orders } from "@shared/schema";
import { and, isNull, or, eq } from "drizzle-orm";
import {
  syncShopifyOrdersBulk,
  syncShopifyOrdersFullHistory,
  refetchShopifyOrdersByIds,
} from "../server/syncShopifyOrders";

// ===== util argv simple
const argv = process.argv.slice(2);
const has = (flag: string) => argv.some(a => a === flag);
const getKV = (key: string) => {
  const p = argv.find(a => a.startsWith(`${key}=`));
  return p ? p.split("=").slice(1).join("=") : undefined;
};

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

async function runFullHistory() {
  const store = getKV("store");

  const res = await syncShopifyOrdersFullHistory({
    store: store ?? "all",
    limit: 250,
  });

  console.log("Sync FULL-HISTORY completado:");
  console.table(res.summary.map(s => ({ store: s.store, pages: s.pages, upserted: s.upserted, errors: s.errors })));
  console.log(`Total upserted: ${res.totalUpserted} Timestamp: ${res.timestamp}`);
}

async function runFillMissing() {
  // Campos “clave” que solemos querer completos. Ajusta si gustas.
  // Nota: si deseas incluir más campos, agrégalos al OR de abajo.
  const MISSING_FIELDS = [
    orders.customerEmail,
    orders.financialStatus,
    orders.fulfillmentStatus,
    orders.shopifyProcessedAt,
  ];

  // Si pasan --store=1 limitamos; si no, buscamos en todas
  const storeKV = getKV("store");
  let rows;
  if (storeKV) {
    rows = await db
      .select({ id: orders.id, shopId: orders.shopId, orderId: orders.orderId })
      .from(orders)
      .where(
        and(
          eq(orders.shopId, parseInt(storeKV, 10)),
          or(...MISSING_FIELDS.map(c => isNull(c)))
        )
      )
      .limit(2000); // evita traer demasiadas en un sólo tiro
  } else {
    rows = await db
      .select({ id: orders.id, shopId: orders.shopId, orderId: orders.orderId })
      .from(orders)
      .where(or(...MISSING_FIELDS.map(c => isNull(c))))
      .limit(5000);
  }

  if (rows.length === 0) {
    console.log("No se encontraron órdenes con campos faltantes. 🎉");
    return;
  }

  // Agrupamos por tienda para llamar a Shopify por store
  const byStore = new Map<number, string[]>();
  for (const r of rows) {
    const arr = byStore.get(r.shopId) ?? [];
    arr.push(r.orderId);
    byStore.set(r.shopId, arr);
  }

  const summary: Array<{ store: number; requested: number; refetched: number; errors: number }> = [];

  for (const [store, ids] of byStore.entries()) {
    // OJO: Shopify permite pedir por ID una a una (no hay batch REST)
    // Hacemos chunks de 200 por si la lista es larga
    let refetched = 0;
    let errs = 0;

    const chunkSize = 200;
    for (let i = 0; i < ids.length; i += chunkSize) {
      const slice = ids.slice(i, i + chunkSize);
      const res = await refetchShopifyOrdersByIds({ store, ids: slice });
      refetched += res.refetched;
      errs += res.errors.length;
      if (res.errors.length) {
        console.error(`[FILL][store=${store}] errores:`, res.errors.slice(0, 3));
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
