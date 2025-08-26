// REFACTOR: Health check endpoints for external services
import { Router, Request, Response } from "express";
import { HttpClient } from "../services/_http";

const router = Router();

interface HealthStatus {
  ok: boolean;
  status?: number;
  error?: string;
  timestamp: string;
}

// Cache health status to avoid hammering external APIs
const healthCache = new Map<string, { status: HealthStatus; expires: number }>();
const CACHE_DURATION = 30 * 1000; // 30 seconds

function getCachedHealth(service: string): HealthStatus | null {
  const cached = healthCache.get(service);
  if (cached && Date.now() < cached.expires) {
    return cached.status;
  }
  return null;
}

function setCachedHealth(service: string, status: HealthStatus) {
  healthCache.set(service, {
    status,
    expires: Date.now() + CACHE_DURATION
  });
}

// Shopify health check
router.get("/shopify", async (req: Request, res: Response) => {
  try {
    // Check cache first
    const cached = getCachedHealth("shopify");
    if (cached) {
      return res.json(cached);
    }

    const shopifyClient = new HttpClient({
      timeout: 10000,
      retries: 1
    });

    // Try both stores if configured
    const stores = [
      { url: process.env.SHOPIFY_STORE_1_URL, token: process.env.SHOPIFY_STORE_1_TOKEN },
      { url: process.env.SHOPIFY_STORE_2_URL, token: process.env.SHOPIFY_STORE_2_TOKEN }
    ].filter(store => store.url && store.token);

    if (stores.length === 0) {
      const status: HealthStatus = {
        ok: false,
        error: "No Shopify stores configured",
        timestamp: new Date().toISOString()
      };
      setCachedHealth("shopify", status);
      return res.json(status);
    }

    // Test first available store
    const store = stores[0];
    const shopUrl = `${store.url!}/admin/api/2023-10/shop.json`;
    
    const response = await shopifyClient.get(shopUrl, {
      'X-Shopify-Access-Token': store.token!
    });

    const status: HealthStatus = {
      ok: true,
      status: response.status,
      timestamp: new Date().toISOString()
    };

    setCachedHealth("shopify", status);
    res.json(status);

  } catch (error: any) {
    const status: HealthStatus = {
      ok: false,
      status: error.status || 0,
      error: error.message,
      timestamp: new Date().toISOString()
    };

    setCachedHealth("shopify", status);
    res.json(status);
  }
});

// MLG health check
router.get("/mlg", async (req: Request, res: Response) => {
  try {
    // Check cache first
    const cached = getCachedHealth("mlg");
    if (cached) {
      return res.json(cached);
    }

    const mlgClient = new HttpClient({
      baseURL: process.env.MLG_BASE_URL || "https://www.mlgdev.mx/marketplaceapi",
      timeout: 10000,
      retries: 1
    });

    // Step 1: Try login
    const loginResponse = await mlgClient.post("/api/Account/login", {
      email: process.env.MLG_EMAIL,
      password: process.env.MLG_PASSWORD,
      idproveedor: process.env.MLG_PROVIDER_ID
    });

    const loginData = loginResponse.data as any;
    if (!loginData?.token) {
      throw new Error("Login failed: No token received");
    }

    // Step 2: Try ping with token
    const pingResponse = await mlgClient.get("/api/Productos/ObtenerCategorias", {
      'Authorization': `Bearer ${loginData.token}`
    });

    const status: HealthStatus = {
      ok: true,
      status: pingResponse.status,
      timestamp: new Date().toISOString()
    };

    setCachedHealth("mlg", status);
    res.json(status);

  } catch (error: any) {
    const status: HealthStatus = {
      ok: false,
      status: error.status || 0,
      error: error.message,
      timestamp: new Date().toISOString()
    };

    setCachedHealth("mlg", status);
    res.json(status);
  }
});

// Express-PL health check
router.get("/expresspl", async (req: Request, res: Response) => {
  try {
    // Check cache first
    const cached = getCachedHealth("expresspl");
    if (cached) {
      return res.json(cached);
    }

    const baseUrl = process.env.EXPRESSPL_BASE_URL;
    if (!baseUrl) {
      const status: HealthStatus = {
        ok: false,
        error: "Express-PL not configured",
        timestamp: new Date().toISOString()
      };
      setCachedHealth("expresspl", status);
      return res.json(status);
    }

    const client = new HttpClient({
      baseURL: baseUrl,
      timeout: 10000,
      retries: 1
    });

    // Simple connectivity check (assuming base URL responds)
    const response = await client.get("/");

    const status: HealthStatus = {
      ok: true,
      status: response.status,
      timestamp: new Date().toISOString()
    };

    setCachedHealth("expresspl", status);
    res.json(status);

  } catch (error: any) {
    const status: HealthStatus = {
      ok: false,
      status: error.status || 0,
      error: error.message,
      timestamp: new Date().toISOString()
    };

    setCachedHealth("expresspl", status);
    res.json(status);
  }
});

// Overall system health
router.get("/", async (req: Request, res: Response) => {
  try {
    const services = await Promise.allSettled([
      fetch(`${req.protocol}://${req.get('host')}/api/health/shopify`).then(r => r.json()),
      fetch(`${req.protocol}://${req.get('host')}/api/health/mlg`).then(r => r.json()),
      fetch(`${req.protocol}://${req.get('host')}/api/health/expresspl`).then(r => r.json())
    ]);

    const results = services.map((service, index) => ({
      name: ['shopify', 'mlg', 'expresspl'][index],
      ...(service.status === 'fulfilled' ? service.value : { ok: false, error: 'Failed to check' })
    }));

    const allHealthy = results.every(service => service.ok);

    res.json({
      ok: allHealthy,
      services: results,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    res.json({
      ok: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;