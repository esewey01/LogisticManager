// server/integrations/mlg/syncMlgSales.ts
import fs from "node:fs";
import { obtenerVentas } from "./mlgClient";
import { upsertMlgOrder } from "./mapAndUpsert";

function todayPlus(days = 1) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

const CURSOR_FILE = ".mlg-cursor.json";

function readCursor(): string | null {
  try {
    const raw = fs.readFileSync(CURSOR_FILE, "utf-8");
    const j = JSON.parse(raw);
    return j?.lastFechaSolicitud ?? null;
  } catch {
    return null;
  }
}
function writeCursor(fecha: string) {
  try {
    fs.writeFileSync(CURSOR_FILE, JSON.stringify({ lastFechaSolicitud: fecha }, null, 2));
  } catch {}
}

export async function syncMlgOnce() {
  if (process.env.MLG_ENABLED !== "true") return { imported: 0 };

  const providerId = process.env.MLG_PROVIDER_ID || process.env.MLG_IDPROVEEDOR;
  if (!providerId) return { imported: 0 };

  const dateMin = readCursor() || process.env.MLG_SYNC_SINCE || "2025-06-01";
  const dateMax = todayPlus(1);

  let page = 1;
  let total = 0;
  for (;;) {
    const res = await obtenerVentas({
      page,
      totalRows: 100,
      providerId,
      orderBy: 1,
      orderType: 1,
      dateMin,
      dateMax,
    });
    const rows = res?.ventas?.results ?? [];
    if (!rows.length) break;

    for (const v of rows) {
      await upsertMlgOrder(v as any);
    }

    // Move cursor to max fechaSolicitud processed
    const maxFecha = rows
      .map((r) => r.fechaSolicitud)
      .filter(Boolean)
      .sort()
      .pop();
    if (maxFecha) writeCursor(maxFecha);

    total += rows.length;
    page += 1;
  }

  return { imported: total };
}

let timer: NodeJS.Timeout | null = null;
export function startMlgSyncScheduler() {
  if (process.env.MLG_ENABLED !== "true") return;
  const interval = Number(process.env.MLG_SYNC_INTERVAL_MS || 300_000);
  const tick = async () => {
    try {
      const r = await syncMlgOnce();
      if (r.imported) console.log(`[MLG] Imported ${r.imported} ventas`);
    } catch (e) {
      console.error("[MLG] sync error:", (e as any)?.message || e);
    }
  };
  timer = setInterval(tick, interval);
  tick(); // first run immediately
}

