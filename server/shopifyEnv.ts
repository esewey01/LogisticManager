// server/shopifyEnv.ts
// Helper para manejo de múltiples tiendas Shopify con variables de entorno

interface ShopifyCredentials {
  shop: string;
  token: string;
  apiVersion: string;
  storeNumber: string;
}

/**
 * Obtiene las credenciales de Shopify para una tienda específica
 * Soporta múltiples tiendas usando sufijos _1, _2, etc.
 */
export function getShopifyCredentials(storeParam: string = '1'): ShopifyCredentials {
  const storeNumber = storeParam.toString();
  
  // Variables de entorno por tienda
  const shopVar = storeNumber === '1' ? 'SHOPIFY_SHOP_1' : `SHOPIFY_SHOP_${storeNumber}`;
  const tokenVar = storeNumber === '1' ? 'SHOPIFY_TOKEN_1' : `SHOPIFY_TOKEN_${storeNumber}`;
  const versionVar = storeNumber === '1' ? 'SHOPIFY_API_VERSION_1' : `SHOPIFY_API_VERSION_${storeNumber}`;
  
  const shop = process.env[shopVar];
  const token = process.env[tokenVar];
  const apiVersion = process.env[versionVar] || '2024-01';
  
  if (!shop || !token) {
    throw new Error(
      `Credenciales de Shopify faltantes para tienda ${storeNumber}. ` +
      `Requeridas: ${shopVar}, ${tokenVar}. ` +
      `Disponibles: shop=${!!shop}, token=${!!token}`
    );
  }
  
  // Validar formato del shop
  if (!shop.includes('.myshopify.com') && !shop.includes('.shopify.com')) {
    throw new Error(
      `Formato de shop inválido para tienda ${storeNumber}: ${shop}. ` +
      `Debe incluir .myshopify.com o .shopify.com`
    );
  }
  
  // Validar que el token no esté vacío
  if (token.length < 10) {
    throw new Error(
      `Token de Shopify inválido para tienda ${storeNumber}: demasiado corto`
    );
  }
  
  return {
    shop,
    token,
    apiVersion,
    storeNumber,
  };
}

/**
 * Lista todas las tiendas configuradas
 */
export function getConfiguredStores(): string[] {
  const stores: string[] = [];
  
  // Verificar tienda 1
  if (process.env.SHOPIFY_SHOP_1 && process.env.SHOPIFY_TOKEN_1) {
    stores.push('1');
  }
  
  // Verificar tiendas 2-5 (máximo razonable)
  for (let i = 2; i <= 5; i++) {
    const shopVar = `SHOPIFY_SHOP_${i}`;
    const tokenVar = `SHOPIFY_TOKEN_${i}`;
    
    if (process.env[shopVar] && process.env[tokenVar]) {
      stores.push(i.toString());
    }
  }
  
  return stores;
}

/**
 * Valida que todas las credenciales estén configuradas correctamente
 */
export function validateShopifyConfig(): {
  valid: boolean;
  errors: string[];
  stores: string[];
} {
  const result = {
    valid: true,
    errors: [] as string[],
    stores: [] as string[],
  };
  
  try {
    const configuredStores = getConfiguredStores();
    
    if (configuredStores.length === 0) {
      result.valid = false;
      result.errors.push('No hay tiendas Shopify configuradas');
      return result;
    }
    
    // Validar cada tienda configurada
    for (const store of configuredStores) {
      try {
        const credentials = getShopifyCredentials(store);
        result.stores.push(store);
        console.log(`✅ Tienda ${store} configurada: ${credentials.shop}`);
      } catch (error) {
        result.valid = false;
        result.errors.push(`Tienda ${store}: ${error}`);
      }
    }
    
  } catch (error) {
    result.valid = false;
    result.errors.push(`Error validando configuración: ${error}`);
  }
  
  return result;
}

/**
 * Información de debug para troubleshooting
 */
export function getShopifyDebugInfo(): Record<string, any> {
  const debugInfo: Record<string, any> = {};
  
  // Verificar variables de entorno (sin mostrar valores sensibles)
  for (let i = 1; i <= 5; i++) {
    const shopVar = `SHOPIFY_SHOP_${i}`;
    const tokenVar = `SHOPIFY_TOKEN_${i}`;
    const versionVar = `SHOPIFY_API_VERSION_${i}`;
    
    const shop = process.env[shopVar];
    const token = process.env[tokenVar];
    const version = process.env[versionVar];
    
    if (shop || token) {
      debugInfo[`store_${i}`] = {
        shop_configured: !!shop,
        shop_format_valid: shop ? shop.includes('.myshopify.com') || shop.includes('.shopify.com') : false,
        token_configured: !!token,
        token_length: token ? token.length : 0,
        api_version: version || '2024-01',
      };
    }
  }
  
  return debugInfo;
}