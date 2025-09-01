// server/syncState.ts
// Almacenamiento en memoria del último resultado de sincronización
// Español: Mantiene un snapshot del último resumen (manual/auto/bulk) para
// que la UI lo consulte vía /api/integrations/shopify/sync-last-result.
// TODO: considerar persistir en BD (tabla sync_runs) para histórico.

export type LastSyncResult = {
  source: "manual" | "auto" | "bulk";
  summary: Array<{ store: number; shop: string; inserted: number; upserted: number; errors?: number }>;
  totalUpserted: number;
  timestamp: string; // ISO
};

let lastResult: LastSyncResult | null = null;

export function setLastSyncResult(result: LastSyncResult) {
  lastResult = result;
}

export function getLastSyncResult(): LastSyncResult | null {
  return lastResult;
}

