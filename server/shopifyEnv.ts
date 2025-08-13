// server/shopifyEnv.ts - Helper para manejar múltiples tiendas Shopify

/**
 * Obtiene las credenciales de Shopify según la tienda solicitada
 * @param storeParam - Parámetro de tienda ('1', '2', etc.) - por defecto '1'
 * @returns Objeto con shop, token y apiVersion
 * @throws Error si faltan credenciales o formato incorrecto
 */
export function getShopifyCredentials(storeParam: string = '1') {
  // Determinar cuál conjunto de variables usar (por defecto tienda 1)
  const storeNumber = storeParam === '2' ? '2' : '1';
  
  // Obtener variables de entorno según la tienda seleccionada
  const shop = process.env[`SHOPIFY_SHOP_NAME_${storeNumber}`];
  const token = process.env[`SHOPIFY_ACCESS_TOKEN_${storeNumber}`];
  const apiVersion = process.env[`SHOPIFY_API_VERSION_${storeNumber}`] || "2024-07";

  // Validar que existan las credenciales
  if (!shop || !token) {
    throw new Error(`Faltan credenciales para la tienda ${storeNumber}. Se requieren SHOPIFY_SHOP_NAME_${storeNumber} y SHOPIFY_ACCESS_TOKEN_${storeNumber}`);
  }

  // Validar formato del dominio (debe ser solo dominio, sin protocolo)
  const hasProtocol = shop.startsWith("http://") || shop.startsWith("https://");
  if (hasProtocol) {
    throw new Error(`SHOPIFY_SHOP_NAME_${storeNumber} debe ser SOLO el dominio *.myshopify.com, sin https://. Ejemplo: mi-tienda.myshopify.com`);
  }

  // Validar que termine en .myshopify.com
  if (!shop.endsWith('.myshopify.com')) {
    throw new Error(`SHOPIFY_SHOP_NAME_${storeNumber} debe terminar en .myshopify.com. Recibido: ${shop}`);
  }

  return {
    shop,
    token,
    apiVersion,
    storeNumber
  };
}

/**
 * Realiza una petición GET a la API de Shopify
 * @param path - Ruta de la API (ej: '/orders.json')
 * @param storeParam - Tienda a usar ('1' o '2')
 * @returns Promise con la respuesta JSON
 */
export async function shopifyGet(path: string, storeParam: string = '1') {
  const { shop, token, apiVersion } = getShopifyCredentials(storeParam);
  
  const url = `https://${shop}/admin/api/${apiVersion}${path}`;
  
  const response = await fetch(url, {
    headers: {
      "X-Shopify-Access-Token": token,
      "User-Agent": "LogisticManager/1.0 (+node)"
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Shopify API Error ${response.status} ${response.statusText}: ${errorText}`);
  }

  return response.json();
}