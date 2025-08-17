// server/services/ShopifyAdminClient.ts
// Cliente administrador de Shopify con manejo de rate limits y reintentos

import { getShopifyCredentials } from "../shopifyEnv";

interface RateLimitInfo {
  remaining: number;
  max: number;
  resetTime: number;
}

interface GraphQLResponse<T = any> {
  data?: T;
  errors?: Array<{ message: string; locations?: any[]; path?: string[] }>;
  extensions?: {
    cost?: {
      requestedQueryCost: number;
      actualQueryCost: number;
      throttleStatus: {
        maximumAvailable: number;
        currentlyAvailable: number;
        restoreRate: number;
      };
    };
  };
}

export class ShopifyAdminClient {
  private shopDomain: string;
  private accessToken: string;
  private apiVersion: string;
  private storeNumber: string;

  constructor(storeParam: string = '1') {
    const credentials = getShopifyCredentials(storeParam);
    this.shopDomain = credentials.shop;
    this.accessToken = credentials.token;
    this.apiVersion = credentials.apiVersion;
    this.storeNumber = credentials.storeNumber;
  }

  private getBaseUrl(): string {
    return `https://${this.shopDomain}/admin/api/${this.apiVersion}`;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private extractRateLimitInfo(headers: Headers): RateLimitInfo | null {
    const remaining = headers.get('x-shopify-shop-api-call-limit');
    if (!remaining) return null;

    const [current, max] = remaining.split('/').map(Number);
    return {
      remaining: max - current,
      max,
      resetTime: Date.now() + 1000, // Estimación: reset en 1 segundo
    };
  }

  private async handleRateLimit(rateLimitInfo: RateLimitInfo): Promise<void> {
    if (rateLimitInfo.remaining <= 2) {
      console.log(`🚧 Rate limit bajo para tienda ${this.storeNumber}: ${rateLimitInfo.remaining}/${rateLimitInfo.max} - Esperando...`);
      await this.delay(1000); // Esperar 1 segundo
    }
  }

  // Método REST para endpoints específicos
  async restRequest<T = any>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any,
    maxRetries: number = 3
  ): Promise<T> {
    const url = `${this.getBaseUrl()}${endpoint}`;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          method,
          headers: {
            'X-Shopify-Access-Token': this.accessToken,
            'Content-Type': 'application/json',
            'User-Agent': 'LogiSys/1.0 (+shopify-integration)',
          },
          body: body ? JSON.stringify(body) : undefined,
        });

        // Manejo de rate limit
        const rateLimitInfo = this.extractRateLimitInfo(response.headers);
        if (rateLimitInfo) {
          await this.handleRateLimit(rateLimitInfo);
        }

        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('retry-after') || '1') * 1000;
          console.log(`⏳ Rate limit excedido para tienda ${this.storeNumber}, reintentando en ${retryAfter}ms (intento ${attempt}/${maxRetries})`);
          await this.delay(retryAfter);
          continue;
        }

        if (!response.ok) {
          const errorText = await response.text();
          console.log(`❌ Error HTTP ${response.status} en tienda ${this.storeNumber}: ${errorText}`);

          if (response.status >= 500 && attempt < maxRetries) {
            const backoffDelay = Math.min(1000 * Math.pow(2, attempt - 1), 30000);
            console.log(`🔄 Reintentando en ${backoffDelay}ms (intento ${attempt}/${maxRetries})`);
            await this.delay(backoffDelay);
            continue;
          }

          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        return data;

      } catch (error) {
        console.log(`❌ Error en intento ${attempt}/${maxRetries} para tienda ${this.storeNumber}:`, error);

        if (attempt === maxRetries) {
          throw error;
        }

        const backoffDelay = Math.min(1000 * Math.pow(2, attempt - 1), 30000);
        await this.delay(backoffDelay);
      }
    }

    throw new Error(`Falló después de ${maxRetries} intentos`);
  }

  // Método GraphQL
  async graphqlRequest<T = any>(
    query: string,
    variables?: Record<string, any>,
    maxRetries: number = 3
  ): Promise<GraphQLResponse<T>> {
    const url = `${this.getBaseUrl()}/graphql.json`;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'X-Shopify-Access-Token': this.accessToken,
            'Content-Type': 'application/json',
            'User-Agent': 'LogiSys/1.0 (+shopify-graphql)',
          },
          body: JSON.stringify({ query, variables }),
        });

        // Manejo de rate limit GraphQL
        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('retry-after') || '2') * 1000;
          console.log(`⏳ GraphQL rate limit para tienda ${this.storeNumber}, esperando ${retryAfter}ms`);
          await this.delay(retryAfter);
          continue;
        }

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`GraphQL HTTP ${response.status}: ${errorText}`);
        }

        const result: GraphQLResponse<T> = await response.json();

        // Verificar errores GraphQL
        if (result.errors && result.errors.length > 0) {
          console.log(`⚠️ Errores GraphQL en tienda ${this.storeNumber}:`, result.errors);
        }

        // Manejo de throttling GraphQL
        if (result.extensions?.cost?.throttleStatus) {
          const throttle = result.extensions.cost.throttleStatus;
          if (throttle.currentlyAvailable < 100) {
            const waitTime = Math.ceil((100 - throttle.currentlyAvailable) / throttle.restoreRate) * 1000;
            console.log(`🚧 GraphQL throttling bajo: ${throttle.currentlyAvailable}/${throttle.maximumAvailable}, esperando ${waitTime}ms`);
            await this.delay(waitTime);
          }
        }

        return result;

      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }

        const backoffDelay = Math.min(1000 * Math.pow(2, attempt - 1), 30000);
        console.log(`🔄 Reintentando GraphQL en ${backoffDelay}ms (${attempt}/${maxRetries})`);
        await this.delay(backoffDelay);
      }
    }

    throw new Error(`GraphQL falló después de ${maxRetries} intentos`);
  }

  // Métodos de conveniencia
  async getShopInfo() {
    return this.restRequest('/shop.json');
  }

  async getOrdersCount() {
    return this.restRequest('/orders/count.json');
  }

  async getOrders(params: Record<string, any> = {}) {
    const { shopDomain, accessToken, apiVersion } = this;

    // Construir URL
    const url = new URL(`https://${shopDomain}/admin/api/${apiVersion}/orders.json`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));

    // Reutilizamos restRequest para mantener manejo de errores y reintentos
    const response = await fetch(url.toString(), {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'User-Agent': 'LogisticManager/1.0 (+node)',
        'Content-Type': 'application/json',
      },
    });

    const text = await response.text();
    if (!response.ok) {
      throw new Error(`Shopify ${response.status} ${response.statusText} :: ${text.slice(0, 400)}`);
    }

    const data = JSON.parse(text);
    const linkHeader = response.headers.get('link') || response.headers.get('Link') || '';
    let nextPageInfo: string | null = null;
    let hasNextPage = false;

    // Parsear header Link para obtener page_info
    if (linkHeader && /rel="next"/i.test(linkHeader)) {
      const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/i);
      if (match) {
        const nextUrl = new URL(match[1]);
        nextPageInfo = nextUrl.searchParams.get('page_info');
        hasNextPage = !!nextPageInfo;
      }
    }

    return {
      orders: data.orders ?? [],
      nextPageInfo,
      hasNextPage,
    };
  }

  async getProducts(params: Record<string, any> = {}) {
  const url = new URL(`https://${this.shopDomain}/admin/api/${this.apiVersion}/products.json`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));

  const response = await fetch(url.toString(), {
    headers: {
      'X-Shopify-Access-Token': this.accessToken,
      'User-Agent': 'LogisticManager/1.0 (+node)',
      'Content-Type': 'application/json',
    },
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Shopify ${response.status} ${response.statusText} :: ${text.slice(0, 400)}`);
  }

  const data = JSON.parse(text);
  const linkHeader = response.headers.get('link') || response.headers.get('Link') || '';
  let nextPageInfo: string | null = null;
  let hasNextPage = false;

  if (linkHeader && /rel="next"/i.test(linkHeader)) {
    const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/i);
    if (match) {
      const nextUrl = new URL(match[1]);
      nextPageInfo = nextUrl.searchParams.get('page_info');
      hasNextPage = !!nextPageInfo;
    }
  }

  return {
    products: data.products ?? [],
    nextPageInfo,
    hasNextPage,
  };
}

  async updateProduct(productId: string, productData: any) {
    return this.restRequest(`/products/${productId}.json`, 'PUT', { product: productData });
  }

  async updateVariant(variantId: string, variantData: any) {
    return this.restRequest(`/variants/${variantId}.json`, 'PUT', { variant: variantData });
  }

  getStoreInfo() {
    return {
      storeNumber: this.storeNumber,
      shopDomain: this.shopDomain,
      apiVersion: this.apiVersion,
    };
  }
}