// server/config/validateEnv.ts
// Validación estricta de variables de entorno por tienda Shopify.
// Español: Esta función centraliza la verificación de claves de entorno necesarias
// para cada tienda (1, 2, ...). Si falta alguna clave requerida, lanza un Error
// con un mensaje explícito y detalla las llaves ausentes. También registra un
// resumen en logs para facilitar diagnóstico.

export type ShopifyStoreEnv = {
  store: number;
  shop: string;
  tokenMasked: string;
  apiVersion: string;
};

export type ValidateEnvResult = {
  stores: ShopifyStoreEnv[];
  missing: string[];
};

export function validateEnv(): ValidateEnvResult {
  const detectedStores = new Set<number>();
  for (const k of Object.keys(process.env)) {
    const m = k.match(/^SHOPIFY_SHOP_NAME_(\d+)$/);
    if (m) detectedStores.add(parseInt(m[1], 10));
  }
  // Por compatibilidad, si solo tenemos tienda 1 y 2 por el requerimiento.
  if (detectedStores.size === 0) {
    [1, 2].forEach(n => {
      if (process.env[`SHOPIFY_SHOP_NAME_${n}`]) detectedStores.add(n);
    });
  }

  const stores: ShopifyStoreEnv[] = [];
  const missing: string[] = [];

  for (const n of Array.from(detectedStores).sort((a, b) => a - b)) {
    const shop = process.env[`SHOPIFY_SHOP_NAME_${n}`];
    const token = process.env[`SHOPIFY_ACCESS_TOKEN_${n}`];
    const apiVersion = process.env[`SHOPIFY_API_VERSION_${n}`] || process.env.SHOPIFY_API_VERSION || "2025-04";

    if (!shop) missing.push(`SHOPIFY_SHOP_NAME_${n}`);
    if (!token) missing.push(`SHOPIFY_ACCESS_TOKEN_${n}`);

    if (shop && token) {
      stores.push({
        store: n,
        shop,
        tokenMasked: String(token).slice(0, 6) + "***",
        apiVersion,
      });
    }
  }

  const detectedList = stores.map(s => s.store);
  console.log(`[ENV] tiendas detectadas: [${detectedList.join(",")}]; faltantes: [${missing.join(", ")}]`);

  if (missing.length > 0) {
    throw new Error(`Variables de entorno faltantes: ${missing.join(", ")}`);
  }

  return { stores, missing };
}

