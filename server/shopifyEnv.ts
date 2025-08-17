// server/shopifyEnv.ts
export function getShopifyCredentials(storeParam: string) {
  const storeNumber = parseInt(storeParam || "1", 10);

  // ✅ Preferimos los nombres ya usados por ping-public
  const shop =
    process.env[`SHOPIFY_SHOP_NAME_${storeNumber}`] ||
    process.env[`SHOPIFY_SHOP_${storeNumber}`]; // fallback opcional

  const token =
    process.env[`SHOPIFY_ACCESS_TOKEN_${storeNumber}`] ||
    process.env[`SHOPIFY_TOKEN_${storeNumber}`]; // fallback opcional

  const apiVersion =
    process.env[`SHOPIFY_API_VERSION_${storeNumber}`] ||
    process.env.SHOPIFY_API_VERSION ||
    "2025-04"; // usa la misma que tu ping-public

  if (!shop || !token) {
    throw new Error(
      `Credenciales de Shopify faltantes para tienda ${storeNumber}. ` +
      `Requeridas: SHOPIFY_SHOP_NAME_${storeNumber} y SHOPIFY_ACCESS_TOKEN_${storeNumber}. ` +
      `Disponibles: shop=${!!shop}, token=${!!token}`
    );
  }

  if (/^https?:\/\//i.test(shop)) {
    throw new Error(
      `SHOPIFY_SHOP_NAME_${storeNumber} debe ser "*.myshopify.com" sin https:// (recibido: ${shop})`
    );
  }

  return {
    shop,
    token,
    apiVersion,
    storeNumber,
    shopDomain: shop,
  };
}
