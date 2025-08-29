// scripts/runMlgSyncOnce.ts
// One-shot para importar ventas MLG inyectando variables directamente
// ⚠️ Recuerda quitar las credenciales del repo si lo versionas.
//    Úsalo como puente para poblar datos rápidamente.

process.env.MLG_BASE_URL = "https://www.mlgdev.mx/marketplaceapi";
process.env.MLG_EMAIL = "daniel@gmart.com.mx";
process.env.MLG_PASSWORD = "Noviembre#27";

// Usa el ID NUMÉRICO de proveedor para ventas
process.env.MLG_PROVIDER_ID = "637"; // <- ajusta si aplica
process.env.MLG_SYNC_SINCE = "2025-06-01";
process.env.MLG_TOKEN_TTL_MIN = "50";
process.env.MLG_ENABLED = "true"; // fuerza el sync en el one-shot

(async () => {
  try {
    // Importa DESPUÉS de setear envs
    const { syncMlgOnce } = await import("../server/integrations/mlg/syncMlgSales");
    const res = await syncMlgOnce();
    console.log("[MLG] One-shot import:", res);
    process.exit(0);
  } catch (err) {
    console.error("[MLG] One-shot import error:", err);
    process.exit(1);
  }
})();
