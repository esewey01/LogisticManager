

import type { Express } from "express";

import { createServer, type Server } from "http";
import { storage as almacenamiento } from "./storage"; // almacenamiento de datos (DAO)
import bcrypt from "bcrypt";
import session from "express-session";
import MemoryStore from "memorystore";
import { z } from "zod";
import { db as baseDatos } from "./db";
import { sql } from "drizzle-orm";
import {
  insertOrderSchema,
  insertTicketSchema,
  insertNoteSchema,
  createBulkTicketsSchema,
} from "@shared/schema";
import { syncShopifyOrders, getOrdersCount, syncShopifyOrdersBackfill, syncShopifyOrdersIncremental } from "./syncShopifyOrders"; // archivo de sincrinizacion
import { getShopifyCredentials } from "./shopifyEnv"; // Helper para múltiples tiendas
import { ProductService } from "./services/ProductService"; // Servicio de productos
import multer, { type FileFilterCallback } from "multer";
import type { Request, Response } from "express";
import xlsx from "xlsx";





// helper al comienzo de routes.ts (o en un util compartido)
function jsonSafe<T>(value: T): T {
  if (value === null || value === undefined) return value;
  const t = typeof value;
  if (t === "bigint") return (value as unknown as bigint).toString() as unknown as T;
  if (t !== "object") return value;

  if (Array.isArray(value)) {
    return (value as unknown as any[]).map(jsonSafe) as unknown as T;
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = jsonSafe(v);
  }
  return out as T;
}

// Adaptador de store en memoria para sesiones (con limpieza automática)
const AlmacenSesionesMemoria = MemoryStore(session);

// Esquema de validación para login
const esquemaLogin = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Middleware: requiere usuario autenticado
const requiereAutenticacion = async (req: any, res: any, next: any) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "No autorizado" });
  }

  // Obtener datos del usuario y asignarlos a req.user
  try {
    const usuario = await almacenamiento.getUser(req.session.userId);
    if (!usuario) {
      return res.status(401).json({ message: "Usuario no encontrado" });
    }
    req.user = usuario;
    next();
  } catch (error) {
    console.log('Error en middleware autenticación:', error);
    return res.status(500).json({ message: "Error interno" });
  }
};

// Middleware: requiere rol admin
const requiereAdmin = async (req: any, res: any, next: any) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "No autorizado" });
  }

  const usuario = await almacenamiento.getUser(req.session.userId);
  if (!usuario || usuario.role !== "admin") {
    return res.status(403).json({ message: "Se requiere rol administrador" });
  }

  next();
};

// Función principal: registra rutas y configura sesión; devuelve el servidor HTTP
export async function registerRoutes(app: Express): Promise<Server> {
  // --- Debug: ping muy temprano (ver si entran peticiones al backend) ---
  app.get("/debug/ping", (req, res) => {
    console.log(
      " /debug/ping hit ::",
      req.method,
      req.url,
      "UA:",
      req.headers["user-agent"],
    );
    res.json({
      ok: true,
      time: new Date().toISOString(),
      url: req.url,
    });
  });
  // ----------------------------------------------------------------------

  // Configuración de sesión (cookie firmada con SESSION_SECRET)
  app.set("trust proxy", 1);
  const isProd =
    process.env.NODE_ENV === "production" ||
    process.env.FORCE_SECURE_COOKIE === "1";


  app.use(
    session({
      secret: process.env.SESSION_SECRET || "dev-secret-key",
      resave: false,
      saveUninitialized: false,
      store: new AlmacenSesionesMemoria({ checkPeriod: 86_400_000 }),
      cookie: {
        httpOnly: true,
        secure: isProd,                 // ✅ en dev=false; en prod (HTTPS)=true
        sameSite: isProd ? "none" : "lax", // ✅ dev=lax, prod=none
        maxAge: 7 * 24 * 60 * 60 * 1000,
        // NO pongas domain en localhost
      },
    }),
  );

  // REFACTOR: Health check endpoints
  app.get("/api/health", (req, res) => {
    console.log("Health check solicitado");
    res.json({
      ok: true,
      timestamp: new Date().toISOString(), // ✅ normalizado (antes usabas ts)
    });
  });

  // --- Health checks ---
  app.get("/api/health/shopify", async (req, res) => {
    try {
      // ✅ Aceptamos los nombres reales del .env que mostraste
      const stores = [
        {
          name: process.env.SHOPIFY_SHOP_NAME_1,
          token: process.env.SHOPIFY_ACCESS_TOKEN_1,
          apiVersion: process.env.SHOPIFY_API_VERSION_1,
        },
        {
          name: process.env.SHOPIFY_SHOP_NAME_2,
          token: process.env.SHOPIFY_ACCESS_TOKEN_2,
          apiVersion: process.env.SHOPIFY_API_VERSION_2,
        },
      ]
        .filter(s => s.name && s.token)
        .map(s => ({
          shop: s.name!,
          tokenMasked: s.token!.slice(0, 6) + "…", // solo para debug seguro
          apiVersion: s.apiVersion || "unset",
        }));

      if (stores.length === 0) {
        return res.json({
          ok: false,
          error: "No hay tiendas Shopify configuradas (revisar SHOPIFY_SHOP_NAME_* y SHOPIFY_ACCESS_TOKEN_*)",
          timestamp: new Date().toISOString(),
        });
      }

      // Aquí podrías opcionalmente hacer un ping real a /admin/api/<ver>/shop.json,
      // pero para health básico basta con validar presencia de credenciales.
      return res.json({
        ok: true,
        status: 200,
        stores,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      return res.json({
        ok: false,
        error: err?.message || "Error inesperado en health Shopify",
        timestamp: new Date().toISOString(),
      });
    }
  });
  // Tienda 1: WW
  app.get("/api/health/ww", async (req, res) => {
    try {
      const shop = process.env.SHOPIFY_SHOP_NAME_1;
      const token = process.env.SHOPIFY_ACCESS_TOKEN_1;
      const apiVersion = process.env.SHOPIFY_API_VERSION_1;

      if (!shop || !token) {
        return res.json({
          ok: false,
          error:
            "WW no configurado: revisar SHOPIFY_SHOP_NAME_1 y SHOPIFY_ACCESS_TOKEN_1",
          timestamp: new Date().toISOString(),
        });
      }

      // Health básico: presencia de credenciales. (Opcional: ping real a /shop.json)
      return res.json({
        ok: true,
        status: 200,
        timestamp: new Date().toISOString(),
        details: {
          shop,
          apiVersion: apiVersion || "unset",
          // token no se devuelve por seguridad; si quieres mostrar en logs, enmascara
        },
      });
    } catch (err: any) {
      return res.json({
        ok: false,
        error: err?.message || "Error inesperado en WW",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Tienda 2: CT
  app.get("/api/health/ct", async (req, res) => {
    try {
      const shop = process.env.SHOPIFY_SHOP_NAME_2;
      const token = process.env.SHOPIFY_ACCESS_TOKEN_2;
      const apiVersion = process.env.SHOPIFY_API_VERSION_2;

      if (!shop || !token) {
        return res.json({
          ok: false,
          error:
            "CT no configurado: revisar",
          timestamp: new Date().toISOString(),
        });
      }

      return res.json({
        ok: true,
        status: 200,
        timestamp: new Date().toISOString(),
        details: {
          shop,
          apiVersion: apiVersion || "unset",
        },
      });
    } catch (err: any) {
      return res.json({
        ok: false,
        error: err?.message || "Error inesperado en CT",
        timestamp: new Date().toISOString(),
      });
    }
  });

  app.get("/api/health/mlg", async (req, res) => {
    try {
      // ✅ Admitimos ambos nombres para el proveedor
      const providerId = process.env.MLG_IDPROVEEDOR || process.env.MLG_PROVIDER_ID;

      const hasCredentials = Boolean(
        process.env.MLG_EMAIL && process.env.MLG_PASSWORD && providerId,
      );

      if (!hasCredentials) {
        return res.json({
          ok: false,
          error:
            "MLG no configurado: revisar MLG_EMAIL, MLG_PASSWORD y MLG_IDPROVEEDOR",
          timestamp: new Date().toISOString(),
        });
      }

      return res.json({ ok: true, status: 200, timestamp: new Date().toISOString() });
    } catch (err: any) {
      return res.json({
        ok: false,
        error: err?.message || "Error inesperado en health MLG",
        timestamp: new Date().toISOString(),
      });
    }
  });

  app.get("/api/health/expresspl", async (req, res) => {
    try {
      const hasCredentials = Boolean(
        process.env.EXPRESSPL_BASE_URL &&
        process.env.EXPRESSPL_LOGIN &&
        process.env.EXPRESSPL_PASSWORD,
      );

      if (!hasCredentials) {
        return res.json({
          ok: false,
          error:
            "Express-PL no configurado: revisar EXPRESSPL_BASE_URL, EXPRESSPL_LOGIN, EXPRESSPL_PASSWORD",
          timestamp: new Date().toISOString(),
        });
      }

      return res.json({ ok: true, status: 200, timestamp: new Date().toISOString() });
    } catch (err: any) {
      return res.json({
        ok: false,
        error: err?.message || "Error inesperado en health Express-PL",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // PING SHOPIFY CON SOPORTE PARA MÚLTIPLES TIENDAS
  // Temporalmente sin autenticación para pruebas - luego agregar requiereAutenticacion
  app.get("/api/integrations/shopify/ping", async (req, res) => {
    try {


      // Obtener parámetro de tienda (por defecto '1')
      const storeParam = (req.query.store as string) || "1";
      console.log(` Shopify ping solicitado para tienda ${storeParam}`);

      // Usar helper para obtener credenciales según la tienda
      const { shop, token, apiVersion, storeNumber } =
        getShopifyCredentials(storeParam);

      // Construir URL de la API de Shopify
      const url = `https://${shop}/admin/api/${apiVersion}/shop.json`;

      // Realizar petición a Shopify
      const r = await fetch(url, {
        headers: {
          "X-Shopify-Access-Token": token,
          "User-Agent": "LogisticManager/1.0 (+node)",
        },
      });

      const bodyText = await r.text();



      // Si hay error de Shopify, responder con detalles completos
      if (!r.ok) {
        console.log(
          ` Error Shopify tienda ${storeNumber}: ${r.status} ${r.statusText}`,
        );
        return res.status(r.status).json({
          ok: false,
          store: storeNumber,
          status: r.status,
          statusText: r.statusText,
          body: bodyText.slice(0, 500), // primeros 500 caracteres del error
        });
      }

      // Parsear respuesta exitosa
      const data = JSON.parse(bodyText);
      console.log(
        `✅ Shopify tienda ${storeNumber} conectada: ${data?.shop?.myshopify_domain}`,
      );

      return res.json({
        ok: true,
        store: storeNumber,
        shop: data?.shop?.myshopify_domain || data?.shop?.domain || null,
        apiVersion: apiVersion,
      });
    } catch (e: any) {
      // Manejo de errores: credenciales faltantes, formato incorrecto, etc.
      console.log(` Error en Shopify ping: ${e.message}`);
      res.status(500).json({
        ok: false,
        error: e.message,
        cause: e?.cause?.message || e?.code || null,
      });
    }
  });

  app.get("/api/integrations/shopify/ping-public", async (req, res) => {
    try {
      const store = Number(req.query.store || 1);
      const shop = process.env[`SHOPIFY_SHOP_NAME_${store}`];
      const token = process.env[`SHOPIFY_ACCESS_TOKEN_${store}`];
      const ver = process.env[`SHOPIFY_API_VERSION_${store}`] || "2024-07";

      if (!shop || !token) {
        return res
          .status(500)
          .json({
            ok: false,
            error: "Faltan envs",
            vd: { shop: !!shop, token: !!token, ver },
          });
      }
      if (/^https?:\/\//i.test(shop)) {
        return res
          .status(400)
          .json({
            ok: false,
            error:
              "SHOPIFY_SHOP_NAME_X debe ser solo *.myshopify.com (sin https://)",
            got: shop,
          });
      }

      const url = `https://${shop}/admin/api/${ver}/shop.json`;
      const r = await fetch(url, {
        headers: {
          "X-Shopify-Access-Token": token,
          "User-Agent": "LogisticManager/1.0 (+node)",
        },
      });
      const body = await r.text();
      if (!r.ok) {
        return res
          .status(r.status)
          .json({
            ok: false,
            status: r.status,
            statusText: r.statusText,
            body: body.slice(0, 500),
          });
      }
      const data = JSON.parse(body);
      res.json({
        ok: true,
        shop: data?.shop?.myshopify_domain || data?.shop?.domain,
        apiVersion: ver,
      });
    } catch (e: any) {
      res
        .status(500)
        .json({ ok: false, error: e?.message, cause: e?.cause || null });
    }
  });

  // ---------- Rutas de Integración Shopify ----------

  app.get("/api/integrations/shopify/sync", requiereAutenticacion, async (req, res) => {
    try {
      const storeParam = (req.query.store as string) || "all";   // "1" | "2" | "all"
      const limit = Number(req.query.limit ?? 50);
      const r = await syncShopifyOrders({ store: storeParam, limit });
      res.json({ message: "Sincronización Shopify OK", ...r, status: "success" });
    } catch (e: any) {
      res.status(500).json({ message: "Falló la sincronización", error: e.message, status: "error" });
    }
  });


  // Crea datos base si no existen (usuarios, canales, paqueterías, marcas)
  await inicializarDatosPorDefecto();

  // ---------- Rutas de Autenticación ----------
  app.post("/api/auth/login", async (req, res) => {
    try {
      console.log("Body recibido en login:", req.body);
      const { email, password } = esquemaLogin.parse(req.body);

      const usuario = await almacenamiento.getUserByEmail(email);
      if (!usuario) return res.status(401).json({ message: "Credenciales inválidas" });

      const passwordValida = await bcrypt.compare(password, usuario.password);
      if (!passwordValida) return res.status(401).json({ message: "Credenciales inválidas" });

      await almacenamiento.updateUser(usuario.id, { lastLogin: new Date() });

      //  Previene fixation y asegura persistencia
      req.session.regenerate((err) => {
        if (err) return res.status(500).json({ message: "Error de sesión" });

        (req.session as any).userId = usuario.id;

        req.session.save((err2) => {
          if (err2) return res.status(500).json({ message: "Error guardando sesión" });
          res.json({ user: { id: usuario.id, email: usuario.email, role: usuario.role } });
        });
      });
    } catch {
      res.status(400).json({ message: "Datos de solicitud inválidos" });
    }
  });


  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ message: "Sesión cerrada" });
    });
  });

  app.get("/api/auth/user", requiereAutenticacion, async (req: any, res) => {
    try {
      const usuario = await almacenamiento.getUser(req.session.userId);
      if (!usuario)
        return res.status(404).json({ message: "Usuario no encontrado" });
      res.json({ id: usuario.id, email: usuario.email, role: usuario.role });
    } catch {
      res.status(500).json({ message: "Error del servidor" });
    }
  });

  // REFACTOR: Profile management routes
  app.get("/api/me", requiereAutenticacion, async (req: any, res) => {
    try {
      const user = req.user;
      const profile = {
        id: user.id,
        email: user.email,
        name: user.name || "Usuario",
        phone: user.phone || "",
        avatar_url: user.avatar_url || "",
        timezone: user.timezone || "America/Mexico_City",
        theme: user.theme || "system",
        notifications: user.notifications !== false,
        created_at: user.created_at,
        updated_at: user.updated_at
      };
      res.json(profile);
    } catch (error: any) {
      res.status(500).json({ message: "Error al obtener el perfil", error: error.message });
    }
  });

  app.put("/api/me", requiereAutenticacion, async (req: any, res) => {
    try {
      const updateData = req.body;
      res.json({
        message: "Perfil actualizado correctamente",
        profile: { ...req.user, ...updateData }
      });
    } catch (error: any) {
      res.status(500).json({ message: "Error al actualizar el perfil", error: error.message });
    }
  });

  // ---------- Dashboard ----------
  app.get("/api/dashboard/metrics", requiereAutenticacion, async (req, res) => {
    try {
      const { from, to } = req.query;
      const fromDate = from ? new Date(String(from)) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const toDate = to ? new Date(String(to)) : new Date();
      const metricas = await almacenamiento.getDashboardMetricsRange(fromDate, toDate);
      res.json(metricas);
    } catch {
      res.status(500).json({ message: "No se pudieron obtener métricas" });
    }
  });

  app.get("/api/dashboard/today-orders", requiereAutenticacion, async (req, res) => {
    try {
      const data = await almacenamiento.getTodayOrders();
      res.json(data);
    } catch {
      res.status(500).json({ message: "No se pudieron obtener órdenes del día" });
    }
  });

  // routes/dashboard.ts (o donde tengas tus rutas)
  app.get("/api/dashboard/orders-by-weekday", requiereAutenticacion, async (req, res) => {
    try {
      const week = Number(req.query.week ?? 0);
      const data = await almacenamiento.getOrdersByWeekday(week);
      res.json(data);
    } catch {
      res.status(500).json({ message: "No se pudieron obtener órdenes por día" });
    }
  });


  app.get("/api/dashboard/sales-by-month", requiereAutenticacion, async (req, res) => {
    try {
      const data = await almacenamiento.getSalesByMonth();
      res.json(data);
    } catch {
      res.status(500).json({ message: "No se pudieron obtener ventas mensuales" });
    }
  });

  // Top SKUs por rango
  app.get("/api/dashboard/top-skus", requiereAutenticacion, async (req, res) => {
    try {
      const { from, to, limit } = req.query;
      const fromDate = from ? new Date(String(from)) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const toDate = to ? new Date(String(to)) : new Date();
      const lim = Number(limit ?? 5);

      const data = await almacenamiento.getTopSkusRange(fromDate, toDate, lim);
      res.json({ topSkus: data });
    } catch (err) {
      res.status(500).json({ message: "No se pudo obtener Top SKUs" });
    }
  });

  //CONTEO DE ORDENES POR CANAL
  app.get("/api/dashboard/orders-by-channel", async (req, res) => {
    try {
      const { from, to } = req.query as { from?: string; to?: string };

      const fromDate =
        from && !Number.isNaN(Date.parse(from)) ? new Date(from) : undefined;
      const toDate =
        to && !Number.isNaN(Date.parse(to)) ? new Date(to) : undefined;

      const data = await almacenamiento.getOrdersByChannel(fromDate, toDate);
      res.json(data);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Error obteniendo órdenes por canal" });
    }
  });





  // ---------- Catálogo de Productos ----------
  app.get("/api/products", requiereAutenticacion, async (req, res) => {
    try {
      const { catalogStorage } = await import("./catalogStorage");
      const page = Number(req.query.page) || 1;
      const pageSize = Number(req.query.pageSize) || 25;
      const search = req.query.search as string | undefined;
      const categoria = req.query.categoria as string | undefined;
      const activo = req.query.activo as string | undefined;

      const productos = await catalogStorage.getProductsPaginated({
        page,
        pageSize,
        search,
        categoria: categoria !== "all" ? categoria : undefined,
        activo: activo !== "all" ? activo === "true" : undefined,
      });
      res.json(productos);
    } catch (error) {
      console.error("Error en /api/products:", error);
      res.status(500).json({ message: "No se pudieron obtener productos" });
    }
  });

  app.get("/api/products/categories", requiereAutenticacion, async (req, res) => {
    try {
      const { catalogStorage } = await import("./catalogStorage");
      const categorias = await catalogStorage.getProductCategories();
      res.json(categorias);
    } catch (error) {
      console.error("Error en /api/products/categories:", error);
      res.status(500).json({ message: "No se pudieron obtener categorías" });
    }
  });

  app.post("/api/products", requiereAutenticacion, async (req, res) => {
    try {
      const { catalogStorage } = await import("./catalogStorage");
      const producto = await catalogStorage.createProduct(req.body);
      res.status(201).json(producto);
    } catch (error) {
      console.error("Error en POST /api/products:", error);
      res.status(500).json({ message: "No se pudo crear el producto" });
    }
  });

  app.patch("/api/products/:id", requiereAutenticacion, async (req, res) => {
    try {
      const { catalogStorage } = await import("./catalogStorage");
      const id = req.params.id; // Mantener como string para SKU
      const producto = await catalogStorage.updateProduct(id, req.body);
      res.json(producto);
    } catch (error) {
      console.error("Error en PATCH /api/products:", error);
      res.status(500).json({ message: "No se pudo actualizar el producto" });
    }
  });

  app.delete("/api/products/:id", requiereAutenticacion, async (req, res) => {
    try {
      const { catalogStorage } = await import("./catalogStorage");
      const id = req.params.id; // Mantener como string para SKU
      await catalogStorage.deleteProduct(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error en DELETE /api/products:", error);
      res.status(500).json({ message: "No se pudo eliminar el producto" });
    }
  });

  // ---------- Página Productos Unificada ----------

  // Pestaña 1: Catálogo
  app.get("/api/unified-products/catalog", requiereAutenticacion, async (req, res) => {
    try {
      const { productStorage } = await import("./productStorage");
      const page = Number(req.query.page) || 1;
      const pageSize = Number(req.query.pageSize) || 300;
      const search = req.query.search as string;
      const searchField = req.query.searchField as 'sku' | 'sku_interno' | 'codigo_barras' | 'nombre_producto';
      const marca = req.query.marca as string;
      const categoria = req.query.categoria as string;
      const condicion = req.query.condicion as string;
      const marca_producto = req.query.marca_producto as string;
      const orderBy = req.query.orderBy as string;
      const orderDir = req.query.orderDir as 'asc' | 'desc';

      const result = await productStorage.getCatalogProducts({
        page,
        pageSize,
        search,
        searchField,
        marca,
        categoria,
        condicion,
        marca_producto,
        orderBy,
        orderDir
      });

      res.json(result);
    } catch (error) {
      console.error("Error en /api/unified-products/catalog:", error);
      res.status(500).json({ message: "Error al obtener productos del catálogo" });
    }
  });

  app.get("/api/unified-products/catalog/facets", requiereAutenticacion, async (req, res) => {
    try {
      const { productStorage } = await import("./productStorage");
      const facets = await productStorage.getCatalogFacets();
      res.json(facets);
    } catch (error) {
      console.error("Error en /api/unified-products/catalog/facets:", error);
      res.status(500).json({ message: "Error al obtener facetas del catálogo" });
    }
  });

  app.patch("/api/unified-products/catalog/:sku", requiereAutenticacion, async (req, res) => {
    try {
      const { productStorage } = await import("./productStorage");
      const sku = req.params.sku;
      const result = await productStorage.updateCatalogProduct(sku, req.body);
      res.json(result);
    } catch (error) {
      console.error("Error en PATCH /api/unified-products/catalog:", error);
      res.status(500).json({ message: "Error al actualizar producto del catálogo" });
    }
  });

  // Crear producto
  app.post("/api/unified-products/catalog", requiereAutenticacion, async (req, res) => {
    try {
      const { productStorage } = await import("./productStorage");
      const result = await productStorage.createCatalogProduct(req.body);
      res.status(201).json(result);
    } catch (error) {
      console.error("Error en POST /api/unified-products/catalog:", error);
      res.status(500).json({ message: "Error al crear producto del catálogo" });
    }
  });

  // Eliminar producto
  app.delete("/api/unified-products/catalog/:sku", requiereAutenticacion, async (req, res) => {
    try {
      const { productStorage } = await import("./productStorage");
      const sku = req.params.sku;
      const result = await productStorage.deleteCatalogProduct(sku);
      res.json(result);
    } catch (error) {
      console.error("Error en DELETE /api/unified-products/catalog:", error);
      res.status(500).json({ message: "Error al eliminar producto del catálogo" });
    }
  });


  // Pestaña 2: Shopify
  app.get("/api/unified-products/shopify", requiereAutenticacion, async (req, res) => {
    try {
      const { productStorage } = await import("./productStorage");
      const page = Number(req.query.page) || 1;
      const pageSize = Number(req.query.pageSize) || 300;
      const search = req.query.search as string;
      const shopId = req.query.shopId ? Number(req.query.shopId) : undefined;
      const status = req.query.status as string;
      const vendor = req.query.vendor as string;
      const productType = req.query.productType as string;
      const syncStatus = req.query.syncStatus as string;

      const result = await productStorage.getShopifyProducts({
        page,
        pageSize,
        search,
        shopId,
        status,
        vendor,
        productType,
        syncStatus
      });

      res.json(result);
    } catch (error) {
      console.error("Error en /api/unified-products/shopify:", error);
      res.status(500).json({ message: "Error al obtener productos de Shopify" });
    }
  });

  app.patch("/api/unified-products/shopify/variant/:id", requiereAutenticacion, async (req, res) => {
    try {
      const { productStorage } = await import("./productStorage");
      const variantId = Number(req.params.id);
      const userId = (req as any).user?.id || 1;

      const result = await productStorage.updateShopifyVariant(variantId, req.body, userId);
      res.json(result);
    } catch (error) {
      console.error("Error en PATCH /api/unified-products/shopify/variant:", error);
      res.status(500).json({ message: "Error al actualizar variante de Shopify" });
    }
  });

  // Pestaña 3: Conciliación
  app.get("/api/unified-products/reconciliation/stats", requiereAutenticacion, async (req, res) => {
    try {
      const { productStorage } = await import("./productStorage");
      const stats = await productStorage.getReconciliationStats();
      res.json(stats);
    } catch (error) {
      console.error("Error en /api/unified-products/reconciliation/stats:", error);
      res.status(500).json({ message: "Error al obtener estadísticas de conciliación" });
    }
  });

  app.get("/api/unified-products/reconciliation/unlinked/:type", requiereAutenticacion, async (req, res) => {
    try {
      const { productStorage } = await import("./productStorage");
      const type = req.params.type as 'catalog' | 'shopify';
      const page = Number(req.query.page) || 1;
      const pageSize = Number(req.query.pageSize) || 300;

      const result = await productStorage.getUnlinkedProducts(type, { page, pageSize });
      res.json(result);
    } catch (error) {
      console.error("Error en /api/unified-products/reconciliation/unlinked:", error);
      res.status(500).json({ message: "Error al obtener productos sin vincular" });
    }
  });

  app.post("/api/unified-products/reconciliation/link", requiereAutenticacion, async (req, res) => {
    try {
      const { productStorage } = await import("./productStorage");
      const userId = (req as any).user?.id || 1;

      const link = await productStorage.createProductLink({
        ...req.body,
        createdBy: userId,
        updatedBy: userId
      });

      res.status(201).json(link);
    } catch (error) {
      console.error("Error en POST /api/unified-products/reconciliation/link:", error);
      res.status(500).json({ message: "Error al crear vínculo de producto" });
    }
  });

  app.delete("/api/unified-products/reconciliation/link/:id", requiereAutenticacion, async (req, res) => {
    try {
      const { productStorage } = await import("./productStorage");
      const id = Number(req.params.id);

      const result = await productStorage.deleteProductLink(id);
      res.json(result);
    } catch (error) {
      console.error("Error en DELETE /api/unified-products/reconciliation/link:", error);
      res.status(500).json({ message: "Error al eliminar vínculo de producto" });
    }
  });

  // ---------- Órdenes ----------
  app.get("/api/orders", requiereAutenticacion, async (req, res) => {
    try {
      const statusFilter = (req.query.statusFilter as string) || "unmanaged";

      // ✅ acepta channelId o channelFilter
      const rawChannel = (req.query.channelId ?? req.query.channelFilter) as string | undefined;
      const channelId = rawChannel && rawChannel !== "all" ? Number(rawChannel) : undefined;

      const page = req.query.page ? Number(req.query.page) : 1;
      const pageSize = req.query.pageSize ? Number(req.query.pageSize) : 50; // opcional: alinea con el FE
      const search = req.query.search as string | undefined;
      const searchType = req.query.searchType as "all" | "sku" | "customer" | "product" | undefined;
      const brand = (req.query.brand as string | undefined) || undefined;
      const stockState = (req.query.stock_state as string | undefined) as any;

      // ✅ ordenamiento opcional (whitelist)
      const sortField = (req.query.sortField as string | undefined) || undefined;
      const sortOrder = ((req.query.sortOrder as string) || "desc").toLowerCase() === "asc" ? "asc" : "desc";

      const data = await almacenamiento.getOrdersPaginated({
        statusFilter: statusFilter as any,
        channelId,
        page,
        pageSize,
        search,
        searchType,
        sortField,
        sortOrder,
        brand,
        stockState,
      });
      res.json(data);
    } catch (e) {
      res.status(500).json({ message: "No se pudieron obtener órdenes" });
    }
  });

  // routes.ts (agrega este endpoint)
  app.get("/api/orders/:id/details", requiereAutenticacion, async (req, res) => {
    try {
      const id = Number(req.params.id);
      console.log(`[GET /api/orders/:id/details] Solicitando detalles ID: ${id}`);

      if (Number.isNaN(id)) {
        return res.status(400).json({ message: "ID de orden inválido" });
      }

      // Usa el nuevo método
      // Si tu almacenamiento es un objeto, asegúrate de que el método exista ahí.
      const ordenDetallada = await (almacenamiento as any).getOrderDetails(id);

      if (!ordenDetallada) {
        return res.status(404).json({ message: "Orden no encontrada" });
      }

      // Seguridad JSON
      const safe = JSON.parse(JSON.stringify(ordenDetallada));
      res.json(safe);
    } catch (error) {
      console.error(`[GET /api/orders/:id/details] Error:`, error);
      res.status(500).json({ message: "No se pudo obtener la orden (detalles)" });
    }
  });

  // ---------- Catálogo (catalogo_productos) ----------
  // GET /api/catalogo
  // Mapea columnas visibles a BD: sku->sku, sku_interno->sku_interno, nombre_producto->nombre_producto,
  // costo->costo (decimal), stock->stock (int). Campo opcional estado: si no existe en BD se deriva de stock.
  app.get("/api/catalogo", requiereAutenticacion, async (req, res) => {
    try {
      const { productStorage } = await import("./productStorage");
      const page = req.query.page ? Number(req.query.page) : 1;
      const pageSize = req.query.pageSize ? Number(req.query.pageSize) : 50;
      const q = (req.query.q as string) || "";
      const campo = (req.query.campo as string) as 'sku_interno' | 'sku' | 'nombre' | undefined;
      const marca = (req.query.marca as string) || undefined;
      const categoria = (req.query.categoria as string) || undefined;
      const stockEq0 = (req.query.stock_eq0 as string) === 'true';
      const stockGteRaw = req.query.stock_gte as string | undefined;
      const stockGte = stockGteRaw != null && stockGteRaw !== '' ? Number(stockGteRaw) : undefined;
      const sort = (req.query.sort as string) || '';

      let orderBy: string | undefined;
      let orderDir: 'asc' | 'desc' = 'asc';
      if (sort) {
        const [f, d] = sort.split(":");
        orderBy = f;
        orderDir = (d === 'desc' ? 'desc' : 'asc');
      }

      // Map UI campo -> storage searchField
      let searchField: 'sku' | 'sku_interno' | 'codigo_barras' | 'nombre_producto' | undefined;
      if (campo === 'sku') searchField = 'sku';
      else if (campo === 'sku_interno') searchField = 'sku_interno';
      else if (campo === 'nombre') searchField = 'nombre_producto';

      const result = await productStorage.getCatalogProducts({
        page,
        pageSize,
        search: q || undefined,
        searchField,
        marca,
        categoria,
        stockEq0,
        stockGte,
        orderBy,
        orderDir,
      });

      const totalPages = Math.max(1, Math.ceil((result.total || 0) / pageSize));
      res.json({
        data: result.rows.map((p: any) => ({
          sku: p.sku,
          sku_interno: p.sku_interno,
          nombre_producto: p.nombre_producto,
          costo: p.costo != null ? Number(p.costo) : null,
          stock: p.stock != null ? Number(p.stock) : 0,
          estado: (p as any).estado ?? ((Number(p.stock ?? 0) > 0) ? 'ACTIVO' : 'INACTIVO'),
          marca: p.marca ?? p.marca_producto ?? null,
          categoria: p.categoria ?? null,
        })),
        page,
        pageSize,
        total: result.total || 0,
        totalPages,
      });
    } catch (error) {
      console.error("Error en GET /api/catalogo:", error);
      res.status(500).json({ message: "Error al obtener el catálogo" });
    }
  });

  // GET /api/catalogo/export
  // Exporta CSV/XLSX con columnas en orden: Sku Externo, Sku Interno, Producto, Costo, Inventario, Estado, Marca, Categoria
  // Respeta mismos filtros de /api/catalogo. Usa paginado interno para no cargar todo en memoria de un golpe.
  app.get("/api/catalogo/export", requiereAutenticacion, async (req, res) => {
    try {
      const { productStorage } = await import("./productStorage");
      const q = (req.query.q as string) || "";
      const campo = (req.query.campo as string) as 'sku_interno' | 'sku' | 'nombre' | undefined;
      const marca = (req.query.marca as string) || undefined;
      const categoria = (req.query.categoria as string) || undefined;
      const stockEq0 = (req.query.stock_eq0 as string) === 'true';
      const stockGteRaw = req.query.stock_gte as string | undefined;
      const stockGte = stockGteRaw != null && stockGteRaw !== '' ? Number(stockGteRaw) : undefined;
      const sort = (req.query.sort as string) || '';
      const format = ((req.query.format as string) || 'csv').toLowerCase();

      let orderBy: string | undefined;
      let orderDir: 'asc' | 'desc' = 'asc';
      if (sort) {
        const [f, d] = sort.split(":");
        orderBy = f;
        orderDir = (d === 'desc' ? 'desc' : 'asc');
      }

      let searchField: 'sku' | 'sku_interno' | 'codigo_barras' | 'nombre_producto' | undefined;
      if (campo === 'sku') searchField = 'sku';
      else if (campo === 'sku_interno') searchField = 'sku_interno';
      else if (campo === 'nombre') searchField = 'nombre_producto';

      // First fetch to know total
      const first = await productStorage.getCatalogProducts({
        page: 1,
        pageSize: 5000,
        search: q || undefined,
        searchField,
        marca,
        categoria,
        stockEq0,
        stockGte,
        orderBy,
        orderDir,
      });

      const rows: any[] = [...first.rows];
      const total = first.total || 0;
      let loaded = first.rows.length;
      let page = 2;
      const pageSize = 5000;
      while (loaded < total) {
        const r = await productStorage.getCatalogProducts({
          page,
          pageSize,
          search: q || undefined,
          searchField,
          marca,
          categoria,
          stockEq0,
          stockGte,
          orderBy,
          orderDir,
        });
        rows.push(...r.rows);
        loaded += r.rows.length;
        page++;
        if (r.rows.length === 0) break;
      }

      const mapped = rows.map((p: any) => ({
        'Sku Externo': p.sku ?? '',
        'Sku Interno': p.sku_interno ?? '',
        'Producto': p.nombre_producto ?? '',
        'Costo': p.costo != null ? Number(p.costo) : '',
        'Inventario': p.stock != null ? Number(p.stock) : 0,
        'Estado': (p as any).estado ?? ((Number(p.stock ?? 0) > 0) ? 'ACTIVO' : 'INACTIVO'),
        'Marca': p.marca ?? p.marca_producto ?? '',
        'Categoria': p.categoria ?? '',
      }));

      if (format === 'xlsx') {
        const wb = xlsx.utils.book_new();
        const ws = xlsx.utils.json_to_sheet(mapped, { cellDates: false });
        xlsx.utils.book_append_sheet(wb, ws, 'catalogo');
        const buf = xlsx.write(wb, { bookType: 'xlsx', type: 'buffer' });
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="catalogo_${new Date().toISOString().slice(0,10)}.xlsx"`);
        return res.send(buf);
      }

      // CSV
      const headers = ['Sku Externo','Sku Interno','Producto','Costo','Inventario','Estado','Marca','Categoria'];
      const lines = [headers.join(',')];
      for (const r of mapped) {
        const row = headers.map((h) => {
          const v = (r as any)[h];
          if (v == null) return '';
          const s = String(v);
          return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
        }).join(',');
        lines.push(row);
      }
      const csv = lines.join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="catalogo_${new Date().toISOString().slice(0,10)}.csv"`);
      return res.send(csv);
    } catch (error) {
      console.error('Error en GET /api/catalogo/export:', error);
      res.status(500).json({ message: 'Error al exportar catálogo' });
    }
  });

  // POST /api/catalogo/import
  // Reglas de upsert: si sku_interno existe => UPDATE; si no, intenta por sku => UPDATE; de lo contrario INSERT.
  // Valida encabezados, normaliza costo/stock, procesa en lotes de 500 con transacción por lote (si falla el lote, rollback y continúa).
  const uploadCatalog = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
      const allowed = new Set([
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv',
        'application/csv',
      ]);
      if (!allowed.has(file.mimetype)) return cb(new Error('415: Tipo de archivo no soportado. Sube CSV/XLSX.'));
      cb(null, true);
    },
  });

  app.post('/api/catalogo/import', requiereAutenticacion, uploadCatalog.single('file'), async (req: Request & { file?: Express.Multer.File }, res: Response) => {
    try {
      if (!req.file?.buffer) return res.status(400).json({ message: 'No se recibió archivo' });

      const wb = xlsx.read(req.file.buffer, { type: 'buffer' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      if (!ws) return res.status(400).json({ message: 'El archivo no tiene hojas' });

      const rows = xlsx.utils.sheet_to_json<Record<string, any>>(ws, { defval: null, raw: true });
      if (!rows.length) return res.status(400).json({ message: 'El archivo está vacío' });

      const required = ['sku','sku_interno','nombre_producto','costo','stock','estado','marca','categoria'];
      const first = rows[0] || {};
      const missing = required.filter((h) => !(h in first));
      if (missing.length) {
        return res.status(400).json({ message: 'Faltan columnas obligatorias', missing, required });
      }

      // Procesar en lotes de 500 con transacción por lote
      const batchSize = 500;
      let inserted = 0;
      let updated = 0;
      const errors: Array<{ rowIndex: number; message: string }> = [];

      const { db: baseDatos } = await import('./db');

      for (let i = 0; i < rows.length; i += batchSize) {
        const slice = rows.slice(i, i + batchSize);
        try {
          await baseDatos.transaction(async (tx) => {
            for (let j = 0; j < slice.length; j++) {
              const rowIndex = i + j + 2; // +2 por header + base 1
              const r = slice[j];
              try {
                // Normalizaciones
                const sku = (r.sku ?? '').toString().trim();
                const sku_interno = (r.sku_interno ?? '').toString().trim();
                const nombre = (r.nombre_producto ?? '').toString().trim();
                let costo = r.costo;
                if (typeof costo === 'string') costo = costo.replace(',', '.');
                const costoNum = costo == null || costo === '' ? null : Number(costo);
                let stock = r.stock;
                const stockNum = stock == null || stock === '' ? 0 : Number(stock);
                const estado = (r.estado ?? '').toString().trim().toUpperCase();
                const marca = r.marca != null ? String(r.marca) : null;
                const categoria = r.categoria != null ? String(r.categoria) : null;

                if (!sku_interno && !sku) throw new Error('Fila sin sku_interno ni sku');
                if (!nombre) throw new Error('nombre_producto requerido');
                if (costoNum != null && (Number.isNaN(costoNum) || Number(costoNum) < 0)) throw new Error('costo inválido');
                if (Number.isNaN(stockNum) || stockNum < 0) throw new Error('stock inválido');
                if (estado && !['ACTIVO','INACTIVO'].includes(estado)) throw new Error('estado inválido');

                // Upsert por sku_interno, fallback por sku
                const existsByInternal = await tx.execute(sql`SELECT 1 FROM catalogo_productos WHERE sku_interno = ${sku_interno} LIMIT 1`);
                if ((existsByInternal as any).rowCount > 0) {
                  await tx.execute(sql`
                    UPDATE catalogo_productos
                    SET nombre_producto = ${nombre}, costo = ${costoNum}, stock = ${stockNum}, marca = ${marca}, categoria = ${categoria}
                    WHERE sku_interno = ${sku_interno}
                  `);
                  updated++;
                } else if (sku) {
                  const existsBySku = await tx.execute(sql`SELECT 1 FROM catalogo_productos WHERE sku = ${sku} LIMIT 1`);
                  if ((existsBySku as any).rowCount > 0) {
