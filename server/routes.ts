

import type { Express } from "express";

import { createServer, type Server } from "http";
import { storage as almacenamiento } from "./storage"; // almacenamiento de datos (DAO)
import bcrypt from "bcrypt";
import session from "express-session";
import MemoryStore from "memorystore";
import { z } from "zod";
import { db as baseDatos } from "./db";
import { searchMercadoLibre } from "./integrations/mercadoLibre";
import { searchAmazon } from "./integrations/amazon";
import { seedLogistics } from "./db/catalogs";
import { sql, type SQL } from "drizzle-orm";
import {
  insertOrderSchema,
  insertTicketSchema,
  insertNoteSchema,
  createBulkTicketsSchema,
  TICKET_STATUS,
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
                    await tx.execute(sql`
                      UPDATE catalogo_productos
                      SET nombre_producto = ${nombre}, costo = ${costoNum}, stock = ${stockNum}, sku_interno = ${sku_interno || null}, marca = ${marca}, categoria = ${categoria}
                      WHERE sku = ${sku}
                    `);
                    updated++;
                  } else {
                    await tx.execute(sql`
                      INSERT INTO catalogo_productos (sku, sku_interno, nombre_producto, costo, stock, marca, categoria)
                      VALUES (${sku || null}, ${sku_interno || null}, ${nombre}, ${costoNum}, ${stockNum}, ${marca}, ${categoria})
                    `);
                    inserted++;
                  }
                } else {
                  // No sku externo, insert con sku_interno al menos
                  await tx.execute(sql`
                    INSERT INTO catalogo_productos (sku, sku_interno, nombre_producto, costo, stock, marca, categoria)
                    VALUES (${null}, ${sku_interno || null}, ${nombre}, ${costoNum}, ${stockNum}, ${marca}, ${categoria})
                  `);
                  inserted++;
                }
              } catch (e: any) {
                // Provoca rollback del lote completo
                errors.push({ rowIndex, message: e?.message || 'Error desconocido' });
                throw e;
              }
            }
          });
        } catch (e) {
          // Lote falló y se revirtió; continuar con el siguiente
          continue;
        }
      }

      // Generar CSV de errores si existen
      let reportBase64: string | undefined;
      if (errors.length) {
        const h = 'rowIndex,message';
        const lines = [h, ...errors.map((e) => `${e.rowIndex},"${String(e.message).replace(/"/g,'""')}"`)];
        const csv = lines.join('\n');
        reportBase64 = Buffer.from(csv, 'utf8').toString('base64');
      }

      res.json({ inserted, updated, errors: errors.length, errorRows: errors, reportBase64 });
    } catch (error: any) {
      console.error('Error en POST /api/catalogo/import:', error);
      res.status(500).json({ message: error?.message || 'Error al importar catálogo' });
    }
  });

  // GET /api/catalogo/:sku_interno
  // Devuelve TODOS los campos de catalogo_productos para un sku_interno dado (identificador natural para este flujo).
  app.get("/api/catalogo/:sku_interno", requiereAutenticacion, async (req, res) => {
    try {
      const skuInterno = String(req.params.sku_interno || "").trim();
      if (!skuInterno) return res.status(400).json({ message: "sku_interno requerido" });

      const r = await baseDatos.execute(sql`
        SELECT sku, marca, sku_interno, codigo_barras, nombre_producto, modelo, categoria,
               condicion, marca_producto, variante, largo, ancho, alto, peso, foto, costo, stock
        FROM catalogo_productos
        WHERE lower(sku_interno) = lower(${skuInterno})
        LIMIT 1
      `);
      const row: any = r.rows[0];
      if (!row) return res.status(404).json({ message: "Producto no encontrado" });

      // Normaliza tipos numéricos
      const parseNum = (v: any) => (v == null ? null : Number(v));
      const out = jsonSafe({
        sku: row.sku ?? null,
        marca: row.marca ?? null,
        sku_interno: row.sku_interno ?? null,
        codigo_barras: row.codigo_barras ?? null,
        nombre_producto: row.nombre_producto ?? null,
        modelo: row.modelo ?? null,
        categoria: row.categoria ?? null,
        condicion: row.condicion ?? null,
        marca_producto: row.marca_producto ?? null,
        variante: row.variante ?? null,
        largo: parseNum(row.largo),
        ancho: parseNum(row.ancho),
        alto: parseNum(row.alto),
        peso: parseNum(row.peso),
        foto: row.foto ?? null,
        costo: parseNum(row.costo),
        stock: row.stock == null ? 0 : Number(row.stock),
      });
      return res.json(out);
    } catch (error: any) {
      console.error("Error en GET /api/catalogo/:sku_interno:", error);
      return res.status(500).json({ message: error?.message || "Error al obtener producto" });
    }
  });

  // PUT /api/catalogo/:sku_interno
  // Actualiza campos editables del producto. sku_interno se usa como identificador natural en este flujo.
  app.put("/api/catalogo/:sku_interno", requiereAutenticacion, async (req, res) => {
    try {
      const skuInterno = String(req.params.sku_interno || "").trim();
      if (!skuInterno) return res.status(400).json({ message: "sku_interno requerido" });

      // Validación/sanitización básica
      const b = req.body || {};
      const str = (v: any, max = 255) => {
        if (v == null) return null;
        const s = String(v).trim();
        if (s.length === 0) return null;
        return s.slice(0, max);
      };
      const num = (v: any) => {
        if (v == null || v === "") return null;
        const n = Number(v);
        return Number.isFinite(n) ? n : NaN;
      };
      const intNonNeg = (v: any) => {
        if (v == null || v === "") return 0;
        const n = Number(v);
        if (!Number.isFinite(n) || n < 0) return NaN;
        return Math.floor(n);
      };

      const updates: Record<string, any> = {};
      // Textuales editables
      const textualFields = [
        "sku", "sku_interno", "codigo_barras", "nombre_producto", "modelo",
        "condicion", "variante", "marca", "marca_producto", "categoria", "foto",
      ] as const;
      for (const f of textualFields) {
        if (f in b) updates[f] = str(b[f]);
      }

      // Numéricos (>=0 donde aplica)
      const numericNonNeg = ["largo", "ancho", "alto", "peso", "costo"] as const;
      for (const f of numericNonNeg) {
        if (f in b) {
          const n = num(b[f]);
          if (n != null && !Number.isFinite(n)) return res.status(400).json({ message: `${f} inválido` });
          if (n != null && n < 0) return res.status(400).json({ message: `${f} no puede ser negativo` });
          updates[f] = n;
        }
      }
      if ("stock" in b) {
        const s = intNonNeg(b.stock);
        if (!Number.isFinite(s as any)) return res.status(400).json({ message: `stock inválido` });
        updates.stock = s;
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: "No hay campos para actualizar" });
      }

      // Construir SET dinámico seguro
      const setFragments: SQL[] = [];
      for (const [k, v] of Object.entries(updates)) {
        setFragments.push(sql`${sql.raw(k)} = ${v}`);
      }
      const updateSQL = sql`
        UPDATE catalogo_productos
        SET ${sql.join(setFragments, sql`, `)}
        WHERE lower(sku_interno) = lower(${skuInterno})
      `;
      const result = await baseDatos.execute(updateSQL);

      // Si no afectó filas, 404
      const rowCount = (result as any).rowCount ?? 0;
      if (rowCount === 0) return res.status(404).json({ message: "Producto no encontrado" });

      // Devuelve el recurso actualizado
      const nuevoSkuInterno = updates.sku_interno ?? skuInterno;
      const r2 = await baseDatos.execute(sql`
        SELECT sku, marca, sku_interno, codigo_barras, nombre_producto, modelo, categoria,
               condicion, marca_producto, variante, largo, ancho, alto, peso, foto, costo, stock
        FROM catalogo_productos
        WHERE lower(sku_interno) = lower(${nuevoSkuInterno})
        LIMIT 1
      `);
      const row: any = r2.rows[0];
      if (!row) return res.status(404).json({ message: "Producto no encontrado tras actualizar" });
      const parseNum = (v: any) => (v == null ? null : Number(v));
      return res.json(jsonSafe({
        sku: row.sku ?? null,
        marca: row.marca ?? null,
        sku_interno: row.sku_interno ?? null,
        codigo_barras: row.codigo_barras ?? null,
        nombre_producto: row.nombre_producto ?? null,
        modelo: row.modelo ?? null,
        categoria: row.categoria ?? null,
        condicion: row.condicion ?? null,
        marca_producto: row.marca_producto ?? null,
        variante: row.variante ?? null,
        largo: parseNum(row.largo),
        ancho: parseNum(row.ancho),
        alto: parseNum(row.alto),
        peso: parseNum(row.peso),
        foto: row.foto ?? null,
        costo: parseNum(row.costo),
        stock: row.stock == null ? 0 : Number(row.stock),
      }));
    } catch (error: any) {
      console.error("Error en PUT /api/catalogo/:sku_interno:", error);
      return res.status(500).json({ message: error?.message || "Error al actualizar producto" });
    }
  });

  // GET /api/catalogo/shopify-link?sku_interno=...
  // Comportamiento tolerante: si no hay mapeo real, devuelve connected=false. Si existe, informa tienda.
  app.get("/api/catalogo/shopify-link", requiereAutenticacion, async (req, res) => {
    try {
      const skuInterno = String(req.query.sku_interno || "").trim();
      if (!skuInterno) return res.status(400).json({ connected: false });

      // Intenta mapear vía product_links -> variants -> products para obtener shop_id
      try {
        const q = sql`
          SELECT p.shop_id
          FROM product_links pl
          LEFT JOIN variants v ON v.id = pl.variant_id
          LEFT JOIN products p ON p.id = v.product_id
          WHERE lower(pl.catalogo_sku) = lower(${skuInterno})
          LIMIT 1
        `;
        const r = await baseDatos.execute(q);
        const shopId = r.rows[0]?.shop_id as number | undefined;
        if (!shopId) return res.json({ connected: false });
        // Etiqueta amigable
        const store = shopId === 1 ? "WW" : shopId === 2 ? "CT" : `Tienda ${shopId}`;
        return res.json({ connected: true, store });
      } catch {
        return res.json({ connected: false });
      }
    } catch (error: any) {
      // Tolerante: nunca falla
      return res.json({ connected: false });
    }
  });

  // Filtro de marcas unificado: union de products.vendor y catalogo_productos.marca
  app.get("/api/orders/brands", requiereAutenticacion, async (req, res) => {
    try {
      const shopIdRaw = (req.query.shopId ?? req.query.channelId) as string | undefined;
      const shopId = shopIdRaw && shopIdRaw !== 'all' ? Number(shopIdRaw) : undefined;
      const result = await baseDatos.execute(sql`
        (
          SELECT DISTINCT TRIM(COALESCE(p.vendor, '')) AS marca
          FROM products p
          ${shopId !== undefined ? sql`WHERE p.vendor IS NOT NULL AND p.vendor <> '' AND p.shop_id = ${shopId}` : sql`WHERE p.vendor IS NOT NULL AND p.vendor <> ''`}
        )
        UNION
        (
          SELECT DISTINCT TRIM(COALESCE(cp.marca, '')) AS marca
          FROM catalogo_productos cp
          WHERE cp.marca IS NOT NULL AND cp.marca <> ''
        )
        ORDER BY marca ASC
      `);
      const brands = (result.rows || [])
        .map((r: any) => r.marca)
        .filter((s: any) => typeof s === 'string' && s.trim().length > 0);
      res.json(brands);
    } catch (e) {
      res.status(500).json({ message: 'No se pudieron obtener marcas' });
    }
  });

  // Flags: unmapped y stock cero por orden
  app.get("/api/orders/:id/flags", requiereAutenticacion, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ message: "ID de orden inválido" });
      }

      const q = sql`
        SELECT
          -- Ítems sin mapeo
          EXISTS (
            SELECT 1
            FROM order_items oi
            LEFT JOIN LATERAL (
              SELECT cp.*
              FROM catalogo_productos cp
              WHERE oi.sku IS NOT NULL AND (
                lower(cp.sku_interno) = lower(oi.sku) OR lower(cp.sku) = lower(oi.sku)
              )
              ORDER BY (lower(cp.sku_interno) = lower(oi.sku)) DESC,
                       (lower(cp.sku) = lower(oi.sku)) DESC
              LIMIT 1
            ) cp ON TRUE
            WHERE oi.order_id = ${id}
              AND cp.sku IS NULL AND cp.sku_interno IS NULL
          ) AS has_unmapped,

          -- Ítems con stock de marca en cero
          EXISTS (
            SELECT 1
            FROM order_items oi
            LEFT JOIN LATERAL (
              SELECT cp.*
              FROM catalogo_productos cp
              WHERE oi.sku IS NOT NULL AND (
                lower(cp.sku_interno) = lower(oi.sku) OR lower(cp.sku) = lower(oi.sku)
              )
              ORDER BY (lower(cp.sku_interno) = lower(oi.sku)) DESC,
                       (lower(cp.sku) = lower(oi.sku)) DESC
              LIMIT 1
            ) cp ON TRUE
            WHERE oi.order_id = ${id}
              AND cp.stock = 0
          ) AS has_zero_stock
      `;
      const r = await baseDatos.execute(q);
      const row = (r.rows as any[])[0] || {};
      res.json({ has_unmapped: !!row.has_unmapped, has_zero_stock: !!row.has_zero_stock });
    } catch (e: any) {
      res.status(500).json({ message: e?.message || "No se pudieron calcular flags" });
    }
  });



  app.get("/api/orders/:id", requiereAutenticacion, async (req, res) => {
    try {
      const id = Number(req.params.id);
      console.log(`[GET /api/orders/:id] Solicitando orden ID: ${id}`);

      if (Number.isNaN(id)) {
        return res.status(400).json({ message: "ID de orden inválido" });
      }

      const orden = await almacenamiento.getOrder(id);
      console.log(`[GET /api/orders/:id] Orden encontrada:`, !!orden);

      if (!orden) {
        return res.status(404).json({ message: "Orden no encontrada" });
      }
      res.json(jsonSafe(orden));
    } catch (error) {
      console.error(`[GET /api/orders/:id] Error:`, error);
      res.status(500).json({ message: "No se pudo obtener la orden" });
    }
  });

  app.get("/api/orders/:orderId/items", requiereAutenticacion, async (req, res) => {
    const orderId = Number(req.params.orderId);
    console.log(`[DEBUG] Solicitando items para order ID: ${orderId}`);

    if (!Number.isFinite(orderId)) {
      console.log(`[DEBUG] Order ID inválido: ${req.params.orderId}`);
      return res.status(400).json({ message: "orderId inválido" });
    }

    try {
      const items = await almacenamiento.getOrderItems(orderId);
      console.log(`[DEBUG] Items retornados:`, items);
      res.json(jsonSafe({ items }));
    } catch (e: any) {
      console.error("[items] Error:", e?.message);
      res.status(500).json({ message: "No se pudieron obtener items" });
    }
  });

  // Reasignación de SKU para un item de una orden
  app.put("/api/orders/:orderId/items/:itemId/sku", requiereAutenticacion, async (req, res) => {
    try {
      const orderId = Number(req.params.orderId);
      const itemId = Number(req.params.itemId);
      if (!Number.isInteger(orderId) || orderId <= 0 || !Number.isInteger(itemId) || itemId <= 0) {
        return res.status(400).json({ message: "Parámetros inválidos" });
      }

      const bodySchema = z.object({ sku: z.string().min(1) });
      const { sku } = bodySchema.parse(req.body);

      const existsQ = sql`
        SELECT 1 FROM catalogo_productos cp
        WHERE lower(cp.sku_interno) = lower(${sku}) OR lower(cp.sku) = lower(${sku})
        LIMIT 1
      `;
      const exists = await baseDatos.execute(existsQ);
      if (!exists.rows.length) {
        return res.status(400).json({ message: "SKU no existe en catálogo" });
      }

      const upd = sql`
        UPDATE order_items SET sku = ${sku}
        WHERE id = ${itemId} AND order_id = ${orderId}
      `;
      await baseDatos.execute(upd);
      res.json({ ok: true });
    } catch (e: any) {
      res.status(400).json({ message: e?.message || "No se pudo reasignar el SKU" });
    }
  });

  app.post("/api/orders/:id/cancel", requiereAutenticacion, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id))
        return res.status(400).json({ message: "ID de orden inválido" });

      const orden = await almacenamiento.getOrder(id);
      if (!orden) return res.status(404).json({ ok: false, errors: "Orden no encontrada" });

      // [cancel-order] Evita cancelar nuevamente si ya aparece cancelada
      if ((orden as any).shopifyCancelledAt) {
        return res.status(400).json({ ok: false, errors: "La orden ya está cancelada" });
      }

      const { reason, staffNote, notifyCustomer, restock, refundToOriginal } = req.body;
      const gid = (orden.orderId && orden.orderId.startsWith("gid://"))
        ? orden.orderId
        : `gid://shopify/Order/${orden.orderId || orden.id}`;

      // [cancel-order] Nuevo flujo con polling y actualización segura en BD
      {
        if (orden.shopId !== 1 && orden.shopId !== 2) {
          return res.status(400).json({ ok: false, errors: "La orden no corresponde a Shopify (shopId 1 o 2)" });
        }

        const reasonEff = typeof reason === 'string' && reason ? reason : 'OTHER';
        const staffNoteEff = typeof staffNote === 'string' ? staffNote : '';
        const notifyCustomerEff = (notifyCustomer === undefined ? true : !!notifyCustomer);
        const restockEff = (restock === undefined ? true : !!restock);
        const refundEff = !!refundToOriginal;

        console.log("[cancel-order] start", { id, gid, reason: reasonEff });

        const { cancelShopifyOrderAndWait } = await import("./integrations/shopify/cancelOrder");
        const result = await cancelShopifyOrderAndWait({
          shopId: orden.shopId,
          orderGid: gid,
          reason: reasonEff,
          staffNote: staffNoteEff,
          notifyCustomer: notifyCustomerEff,
          restock: restockEff,
          refundToOriginal: refundEff,
        });

        if (!result.ok) {
          console.warn("[cancel-order] shopify failed", result);
          return res.status(400).json({ ok: false, errors: (result as any).errors || [{ message: "Cancelación no confirmada en Shopify" }], stage: (result as any).stage });
        }

        const o = (result as any).order;
        const { markOrderCancelledSafe } = await import("./storage");
        await markOrderCancelledSafe(id, {
          cancelledAt: o?.cancelledAt || null,
          cancelReason: o?.cancelReason || reasonEff || null,
          staffNote: staffNoteEff || null,
          displayFinancialStatus: o?.displayFinancialStatus || null,
          displayFulfillmentStatus: o?.displayFulfillmentStatus || null,
        });

        return res.json({ ok: true, order: o });
      }

      // legacy fallback removed in favor of helper with job polling
    } catch (e: any) {
      console.error("cancel order", e?.message);
      res.status(500).json({ ok: false, errors: e?.message });
    }
  });

  app.post("/api/orders", requiereAutenticacion, async (req, res) => {
    try {
      const datosOrden = insertOrderSchema.parse(req.body); // validación Zod
      const orden = await almacenamiento.createOrder(datosOrden);
      res.status(201).json(orden);
    } catch {
      res.status(400).json({ message: "Datos de orden inválidos" });
    }
  });

  app.patch("/api/orders/:id", requiereAutenticacion, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id))
        return res.status(400).json({ message: "ID de orden inválido" });

      const orden = await almacenamiento.updateOrder(id, req.body);
      res.json(orden);
    } catch {
      res.status(400).json({ message: "No se pudo actualizar la orden" });
    }
  });


  //ORDENES IMPORTACION Y EXPORTACION VIA EXCEL
  // Body: { selectedIds?: (number|string)[], statusFilter?, channelId?, search?, searchType? }
  // Si no hay selectedIds, usa los filtros actuales para exportar lo visible (page/pageSize opcional).
  // ———————————————————————————————————
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
      const allowed = new Set([
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
        "text/csv",
        "application/csv",
      ]);
      const ok = allowed.has(file.mimetype);
      if (!ok) return cb(new Error("415: Tipo de archivo no soportado. Sube CSV o Excel (.xlsx/.xls)."));
      cb(null, true);
    },
  });

  app.post(
    "/api/orders/import",
    requiereAutenticacion,
    upload.single("file"),
    async (req: Request & { file?: Express.Multer.File }, res: Response) => {
      try {
        // gracias a @types/multer, req.file existe:
        if (!req.file?.buffer) {
          return res.status(400).json({ message: "No se recibió archivo" });
        }

        const wb = xlsx.read(req.file.buffer, { type: "buffer" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        if (!ws) return res.status(400).json({ message: "El Excel no tiene hojas" });

        const rawRows = xlsx.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null, raw: true });
        // Validación de columnas mínimas según modo (A: items JSON, B: filas por ítem)
        {
          const firstRow = rawRows[0] ?? {};
          const modeA = Object.prototype.hasOwnProperty.call(firstRow, "items");
          const requiredA = ["shopId", "orderId", "items"];
          const requiredB = ["shopId", "orderId", "sku", "quantity"];
          const required = modeA ? requiredA : requiredB;
          const missing = required.filter((c) => !(c in firstRow));
          if (missing.length) {
            return res.status(400).json({
              message: "Faltan columnas obligatorias",
              missing,
              requiredTemplate: (modeA ? requiredA : requiredB).concat([
                "name", "orderNumber", "customerName", "customerEmail",
                "subtotalPrice", "totalAmount", "currency", "financialStatus", "fulfillmentStatus",
                "tags", "createdAt", "shopifyCreatedAt",
                ...(modeA ? [] : ["price", "cost", "itemCurrency", "title"])
              ]),
            });
          }
        }

        // Validar columnas mínimas
        const requiredColumns = ["shopId", "orderId"];
        const firstRow = rawRows[0] ?? {};
        const missing = requiredColumns.filter((c) => !(c in firstRow));
        if (missing.length) {
          return res.status(400).json({
            message: "Faltan columnas obligatorias",
            missing,
            requiredTemplate: requiredColumns.concat([
              "name", "orderNumber", "customerName", "customerEmail",
              "subtotalPrice", "totalAmount", "currency", "financialStatus", "fulfillmentStatus",
              "tags", "createdAt", "shopifyCreatedAt", "items", "skus"
            ]),
          });
        }

        const { results, summary } = await almacenamiento.importOrdersFromRows(rawRows);
        return res.json({
          ...summary,
          errors: results
            .filter((r) => r.status === "error")
            .map((r) => ({ rowIndex: r.rowIndex, message: r.message, field: r.field, value: r.value })),
        });
      } catch (err: any) {
        console.error("❌ Import error:", err);
        res.status(500).json({ message: err?.message || "Error en la importación" });
      }
    }
  );


  app.post("/api/orders/export", requiereAutenticacion, async (req: Request, res: Response) => {
    try {
      const {
        selectedIds,
        statusFilter = "unmanaged",
        channelId,
        search,
        searchType,
        page,
        pageSize,
        sortField,
        sortOrder,
      } = (req.body ?? {}) as {
        selectedIds?: (number | string)[];
        statusFilter?: "unmanaged" | "managed" | "all";
        channelId?: number | string;
        search?: string;
        searchType?: "all" | "sku" | "customer" | "product";
        page?: number;
        pageSize?: number;
        sortField?: string;
        sortOrder?: "asc" | "desc";
      };

      const rows = await almacenamiento.getOrdersForExport({
        selectedIds,
        statusFilter,
        channelId: channelId ? Number(channelId) : undefined,
        search,
        searchType,
        page,
        pageSize,
        sortField,
        sortOrder,
      });

      const data = rows.map((o: any) => ({
        shopId: o.shopId,
        orderId: o.orderId,
        name: o.name,
        orderNumber: o.orderNumber ?? null,
        customerName: o.customerName,
        customerEmail: o.customerEmail,
        subtotalPrice: o.subtotalPrice ?? null,
        totalAmount: o.totalAmount ?? null,
        currency: o.currency ?? null,
        financialStatus: o.financialStatus ?? null,
        fulfillmentStatus: o.fulfillmentStatus ?? null,
        tags: Array.isArray(o.tags) ? o.tags.join(",") : o.tags ?? "",
        createdAt: o.createdAt ? new Date(o.createdAt) : null,
        shopifyCreatedAt: o.shopifyCreatedAt ? new Date(o.shopifyCreatedAt) : null,
        itemsCount: o.itemsCount ?? 0,
        skus: Array.isArray(o.skus) ? o.skus.join(",") : "",
      }));

      const wb = xlsx.utils.book_new();
      const ws = xlsx.utils.json_to_sheet(data, { dateNF: "yyyy-mm-dd hh:mm:ss" });
      xlsx.utils.book_append_sheet(wb, ws, "orders");
      const buf = xlsx.write(wb, { bookType: "xlsx", type: "buffer" });

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="ordenes_${new Date().toISOString().slice(0, 10)}.xlsx"`);
      res.send(buf);
    } catch (err: any) {
      console.error("❌ Export error:", err);
      res.status(500).json({ message: "No se pudo exportar el Excel" });
    }
  });





  // ---------- Tickets ----------
  // routes.ts
  app.get("/api/tickets", requiereAutenticacion, async (_req, res) => {
    try {
      const rows = await almacenamiento.getTicketsView();

      // Si en algún lado quedara BigInt, lo volvemos JSON-safe por si acaso
      const safe = JSON.parse(JSON.stringify(rows, (_, v) => (typeof v === "bigint" ? v.toString() : v)));

      res.json(safe);
    } catch (e: any) {
      res.status(400).json({ message: e?.message || "No se pudieron obtener los tickets" });
    }
  });

  // 🔧 Elimina la definición duplicada de POST /api/tickets/bulk (dejando solo una).



  app.post("/api/tickets", requiereAutenticacion, async (req, res) => {
    try {
      const datos = insertTicketSchema.parse(req.body); // { orderId, notes? }
      const ticket = await almacenamiento.createTicketAndFulfill({
        orderId: datos.orderId,
        notes: datos.notes,
      });

      // 🔥 Convierte BigInt → string antes de mandar al cliente
      const safeTicket = JSON.parse(
        JSON.stringify(ticket, (_, v) => (typeof v === "bigint" ? v.toString() : v))
      );

      res.status(201).json(safeTicket);
    } catch (e: any) {
      const msg = e?.message || "No se pudo crear el ticket";
      const isShopify = /Shopify (GET|POST)/i.test(msg);
      res.status(isShopify ? 502 : 400).json({ message: msg });
    }
  });



  // Crear tickets masivos
  app.post("/api/tickets/bulk", requiereAutenticacion, async (req, res) => {
    try {
      const { orderIds, notes } = createBulkTicketsSchema.parse(req.body);

      console.log(`🎫 Creando tickets masivos para ${orderIds.length} órdenes...`);
      const resultado = await almacenamiento.createBulkTickets(orderIds, notes);

      const mensaje = `Tickets creados: ${resultado.tickets.length}. Órdenes actualizadas: ${resultado.updated}. Fallidas: ${resultado.failed.length}`;

      res.status(201).json({
        ok: true,
        message: mensaje,
        tickets: resultado.tickets,
        ordersUpdated: resultado.updated,
        failed: resultado.failed,
      });
    } catch (error: any) {
      console.error("❌ Error creando tickets masivos:", error);
      res.status(500).json({
        ok: false,
        message: "Error interno al crear tickets masivos",
        error: error?.message
      });
    }
  });

  // Eliminar ticket por ID
  app.delete("/api/tickets/:id", requiereAutenticacion, async (req, res) => {
    try {
      const id = Number(req.params.id);
      await almacenamiento.deleteTicket(id);
      res.json({ ok: true });
    } catch (e: any) {
      res.status(400).json({ ok: false, message: e?.message || "No se pudo eliminar el ticket" });
    }
  });

  // Revertir ticket (borrar + revertir fulfillment local; opcional Shopify)
  app.post("/api/tickets/:id/revert", requiereAutenticacion, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const revertShopify = req.query.revertShopify === "1" || req.body?.revertShopify === true;
      const r = await almacenamiento.revertTicket(id, { revertShopify });
      res.json(r);
    } catch (e: any) {
      res.status(400).json({ ok: false, message: e?.message || "No se pudo revertir el ticket" });
    }
  });

  //Feedback de ticket
  app.post("/api/tickets/bulk", requiereAutenticacion, async (req, res) => {
    try {
      const { orderIds, notes } = createBulkTicketsSchema.parse(req.body);
      const r = await almacenamiento.createBulkTickets(orderIds, notes);

      // BigInt-safe por si algún field viene en bigint
      const safe = JSON.parse(JSON.stringify(r, (_, v) => (typeof v === "bigint" ? v.toString() : v)));

      res.status(201).json({
        ok: true,
        message: `Tickets creados: ${safe.tickets.length}. Órdenes marcadas fulfilled: ${safe.updated}. Fallidas: ${safe.failed.length}`,
        ...safe,
      });
    } catch (e: any) {
      res.status(400).json({ ok: false, message: e?.message || "Error al crear tickets masivos" });
    }
  });




  // ---------- Catálogos: Canales, Marcas, Paqueterías ----------
  app.get("/api/channels", requiereAutenticacion, async (_req, res) => {
    try {
      const canales = await almacenamiento.getChannels();
      res.json(canales);
    } catch {
      res.status(500).json({ message: "No se pudieron obtener canales" });
    }
  });

  app.get("/api/brands", requiereAutenticacion, async (_req, res) => {
    try {
      const marcas = await almacenamiento.getBrands();
      res.json(marcas);
    } catch {
      res.status(500).json({ message: "No se pudieron obtener marcas" });
    }
  });

  app.get("/api/carriers", requiereAutenticacion, async (_req, res) => {
    try {
      const paqueterias = await almacenamiento.getCarriers();
      res.json(paqueterias);
    } catch {
      res.status(500).json({ message: "No se pudieron obtener paqueterías" });
    }
  });

  // ---------- Notas ----------
  app.get("/api/notes", requiereAutenticacion, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const notas = await almacenamiento.getUserNotes(userId);

      const mapped = notas?.map((n) => ({
        id: n.id,
        content: n.content,
        date: new Date(n.createdAt!).toISOString().split('T')[0], // Para el calendario
        createdAt: n.createdAt,
      })) ?? [];

      res.json(mapped);
    } catch (error) {
      console.log('Error en GET /api/notes:', error);
      res.status(500).json([]);
    }
  });

  app.post("/api/notes", requiereAutenticacion, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { content } = insertNoteSchema.parse(req.body);

      console.log('Creando nota para usuario:', userId, 'con contenido:', content);

      const nota = await almacenamiento.createNote({
        userId: userId,
        content,
      });

      console.log('Nota creada:', nota);
      res.status(201).json({
        id: nota.id,
        content: nota.content,
        date: new Date(nota.createdAt!).toISOString().split('T')[0],
        createdAt: nota.createdAt
      });
    } catch (error) {
      console.log('Error en POST /api/notes:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Datos de nota inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  app.put("/api/notes/:id", requiereAutenticacion, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { text } = req.body as { text?: string };
      if (!id || !text || !text.trim()) return res.status(400).json({ message: "Texto inválido" });

      await almacenamiento.updateNote(id, { content: text.trim() });
      res.json({ ok: true });
    } catch {
      res.status(500).json({ message: "No se pudo actualizar la nota" });
    }
  });

  app.delete("/api/notes/:id", requiereAutenticacion, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id))
        return res.status(400).json({ message: "ID de nota inválido" });

      await almacenamiento.deleteNote(id);
      res.status(204).send();
    } catch {
      res.status(500).json({ message: "No se pudo eliminar la nota" });
    }
  });

  // ---------- Productos ----------
  app.get("/api/products", requiereAutenticacion, async (req, res) => {
    try {
      const shopId = Number(req.query.shopId);
      const page = req.query.page ? Number(req.query.page) : 1;
      const pageSize = req.query.pageSize ? Number(req.query.pageSize) : 15;
      const data = await almacenamiento.getProductsPaginated({ page, pageSize });
      res.json(data);
    } catch {
      res.status(500).json({ message: "No se pudieron obtener productos" });
    }
  });

  app.get("/api/catalog-products", requiereAutenticacion, async (req, res) => {
    try {
      const page = req.query.page ? Number(req.query.page) : 1;
      const pageSize = req.query.pageSize ? Number(req.query.pageSize) : 15;
      const data = await almacenamiento.getCatalogProductsPaginated(page, pageSize);
      res.json(data);
    } catch {
      res.status(500).json({ message: "No se pudieron obtener productos" });
    }
  });

  // Catálogo: servicios logísticos
  app.get("/api/logistic-services", requiereAutenticacion, async (_req, res) => {
    try {
      const servicios = await almacenamiento.getLogisticServices();
      res.json(servicios);
    } catch (e) {
      res.status(500).json({ message: "No se pudieron obtener servicios logísticos" });
    }
  });

  // Relación servicio -> paqueterías compatibles
  app.get("/api/service-carriers", requiereAutenticacion, async (req, res) => {
    try {
      const serviceId = Number(req.query.serviceId);
      if (!Number.isFinite(serviceId) || serviceId <= 0) return res.json([]);
      const carriers = await almacenamiento.getServiceCarriers(serviceId);
      res.json(carriers);
    } catch (e) {
      res.status(500).json({ message: "No se pudieron obtener paqueterías del servicio" });
    }
  });

  // PATCH servicio/carrier del ticket
  // Meta de logística para UI (servicios, paqueterías y compatibilidades)
  app.get("/api/logistics/meta", requiereAutenticacion, async (_req, res) => {
    try {
      const [services, carriers, serviceCarriers] = await Promise.all([
        almacenamiento.getLogisticServices(),
        almacenamiento.getCarriers(),
        almacenamiento.getAllServiceCarriers(),
      ]);
      res.json({ services, carriers, serviceCarriers });
    } catch (e: any) {
      res.status(500).json({ message: e?.message || "No se pudo cargar meta de logística" });
    }
  });

  // =================== Búsqueda de alternativas (Mercado Libre / Amazon) ===================
  // GET /api/search -> unificado (marketplace = 'all' | 'ml' | 'amazon')
  app.get("/api/search", requiereAutenticacion, async (req, res) => {
    try {
      const q = String(req.query.q || "").trim();
      const marketplace = String(req.query.marketplace || "all"); // 'all' | 'ml' | 'amazon'
      const limit = Number(req.query.limit || 20);

      if (!q) return res.status(400).json({ error: "Missing q" });

      const tasks: Promise<any[]>[] = [];
      if (marketplace === "all" || marketplace === "ml") {
        tasks.push(searchMercadoLibre(q, limit));
      }
      if (marketplace === "all" || marketplace === "amazon") {
        tasks.push(searchAmazon(q, Math.min(limit, 10)));
      }

      const settled = await Promise.allSettled(tasks);
      const results = settled
        .filter((s): s is PromiseFulfilledResult<any[]> => s.status === "fulfilled")
        .flatMap((s) => s.value);

      res.json({ q, marketplace, results });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || "Search failed" });
    }
  });

  // Endpoints específicos (opcional)
  app.get("/api/search/mercadolibre", requiereAutenticacion, async (req, res) => {
    const q = String(req.query.q || "").trim();
    const limit = Number(req.query.limit || 20);
    if (!q) return res.status(400).json({ error: "Missing q" });
    try {
      const results = await searchMercadoLibre(q, limit);
      res.json({ q, results });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || "ML search failed" });
    }
  });

  app.get("/api/search/amazon", requiereAutenticacion, async (req, res) => {
    const q = String(req.query.q || "").trim();
    const limit = Number(req.query.limit || 10);
    if (!q) return res.status(400).json({ error: "Missing q" });
    try {
      const results = await searchAmazon(q, limit);
      res.json({ q, results });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || "Amazon search failed" });
    }
  });

  // Admin: reintenta el seeding de catálogos logísticos manualmente (opcional)
  app.post("/api/admin/seed-logistics", requiereAutenticacion, requiereAdmin, async (_req, res) => {
    try {
      if ((process.env.ADMIN_SEED_ENABLED || "0") !== "1") {
        return res.status(403).json({ message: "Seeding no habilitado (ADMIN_SEED_ENABLED != '1')" });
      }
      const r = await seedLogistics();
      return res.json({ seeded: true, services: r.services, carriers: r.carriers, mappings: r.mappings });
    } catch (e: any) {
      return res.status(500).json({ message: e?.message || "Error al ejecutar seeding" });
    }
  });

  app.patch("/api/tickets/:id/service", requiereAutenticacion, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { serviceId, carrierId } = req.body || {};
      if (!Number.isFinite(serviceId)) return res.status(400).json({ message: "serviceId es requerido" });
      await almacenamiento.setTicketService(id, { serviceId: Number(serviceId), carrierId: carrierId != null ? Number(carrierId) : null });
      res.status(204).send();
    } catch (e: any) {
      res.status(400).json({ message: e?.message || "No se pudo actualizar el servicio" });
    }
  });

  // PATCH masivo de servicio/carrier de tickets
  app.patch("/api/tickets/bulk/service", requiereAutenticacion, async (req, res) => {
    try {
      const body = req.body || {};
      const ids: number[] = Array.isArray(body.ids) ? body.ids.map((x: any) => Number(x)).filter((n: any) => Number.isFinite(n)) : [];
      const serviceId = Number(body.serviceId);
      const carrierId = typeof body.carrierId === 'undefined' ? undefined : (body.carrierId === null ? null : Number(body.carrierId));

      if (!ids.length) return res.status(400).json({ message: "Debe proporcionar IDs de tickets a actualizar." });
      if (!Number.isFinite(serviceId) || serviceId <= 0) return res.status(400).json({ message: "serviceId es requerido y debe ser válido." });

      const r = await almacenamiento.bulkUpdateTicketService({ ids, serviceId, carrierId });
      res.json({ updated: r.updated, skipped: r.skipped, ids: r.ids });
    } catch (e: any) {
      const msg = String(e?.message || e || "Error en actualización masiva");
      const isCompat = /compatible|compatibilidad/i.test(msg);
      res.status(isCompat ? 400 : 500).json({ message: msg });
    }
  });

  // PATCH datos de envío
  app.patch("/api/tickets/:id/shipping-data", requiereAutenticacion, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { weight_kg, length_cm, width_cm, height_cm, package_count, service_level } = req.body || {};
      if (package_count != null && Number(package_count) < 1) return res.status(400).json({ message: "El número de paquetes debe ser ≥ 1" });
      if (weight_kg != null && !(Number(weight_kg) > 0)) return res.status(400).json({ message: "El peso debe ser mayor a 0" });
      await almacenamiento.updateTicketShippingData(id, {
        weightKg: weight_kg != null ? Number(weight_kg) : null,
        lengthCm: length_cm != null ? Number(length_cm) : null,
        widthCm: width_cm != null ? Number(width_cm) : null,
        heightCm: height_cm != null ? Number(height_cm) : null,
        packageCount: package_count != null ? Number(package_count) : null,
        serviceLevel: service_level ?? null,
      });
      res.status(204).send();
    } catch (e: any) {
      res.status(400).json({ message: e?.message || "No se pudo actualizar los datos de envío" });
    }
  });

  // PATCH status
  app.patch("/api/tickets/:id/status", requiereAutenticacion, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { status } = req.body || {};
      const allowed = new Set(Object.values(TICKET_STATUS).concat(['open','closed']));
      if (!status || !allowed.has(String(status))) return res.status(400).json({ message: "Estado inválido" });
      await almacenamiento.updateTicketStatus(id, String(status));
      res.status(204).send();
    } catch (e: any) {
      res.status(400).json({ message: e?.message || "No se pudo actualizar el estado" });
    }
  });

  // PATCH tracking/label
  app.patch("/api/tickets/:id/tracking", requiereAutenticacion, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { tracking_number, label_url, carrierId } = req.body || {};
      await almacenamiento.updateTicketTracking(id, {
        trackingNumber: typeof tracking_number !== 'undefined' ? String(tracking_number || '') || null : undefined,
        labelUrl: typeof label_url !== 'undefined' ? String(label_url || '') || null : undefined,
        carrierId: typeof carrierId !== 'undefined' ? (carrierId != null ? Number(carrierId) : null) : undefined,
      });
      res.status(204).send();
    } catch (e: any) {
      res.status(400).json({ message: e?.message || "No se pudo actualizar el tracking" });
    }
  });

  // Búsqueda simple en catálogo por sku/sku_interno/nombre (case-insensitive)
  app.get("/api/catalogo/search", requiereAutenticacion, async (req, res) => {
    try {
      const q = String(req.query.q || "").trim();
      if (!q) return res.json([]);
      const pattern = `%${q.toLowerCase()}%`;
      const r = await baseDatos.execute(sql`
        SELECT sku, sku_interno, nombre_producto, costo, stock
        FROM catalogo_productos
        WHERE lower(sku) LIKE ${pattern}
           OR lower(sku_interno) LIKE ${pattern}
           OR lower(nombre_producto) LIKE ${pattern}
        LIMIT 20
      `);
      res.json(r.rows);
    } catch (e: any) {
      res.status(500).json({ message: e?.message || "Error en búsqueda de catálogo" });
    }
  });

  // TODO: /api/external-products endpoint removed — external_products not in current schema

  // ---------- Admin ----------
  app.get("/api/admin/users", requiereAdmin, async (_req, res) => {
    try {
      const usuarios = await almacenamiento.getAllUsers();
      res.json(usuarios);
    } catch {
      res.status(500).json({ message: "No se pudieron obtener usuarios" });
    }
  });

  // ========== INTEGRACIÓN SHOPIFY COMPLETA ==========

  // PING SHOPIFY CON CONTEO DE ÓRDENES
  app.get("/api/integrations/shopify/ping-count", requiereAutenticacion, async (req, res) => {
    try {
      const storeParam = (req.query.store as string) || '1';
      const result = await getOrdersCount(storeParam);

      return res.json({
        ok: true,
        store: result.store,
        shop: result.shop,
        count: result.count,
        apiVersion: getShopifyCredentials(String(storeParam)).apiVersion,
      });
    } catch (e: any) {
      console.log(`❌ Error en ping count: ${e.message}`);
      res.status(500).json({ ok: false, error: e.message });
    }
  });
  // Backfill inicial de órdenes
  app.post("/api/integrations/shopify/orders/backfill", requiereAutenticacion, async (req, res) => {
    try {
      const storeParam = (req.query.store as string) || '1';
      const since = req.query.since as string | undefined;
      const cursor = (req.query.cursor as string) || undefined;
      const limit = parseInt(req.query.limit as string) || 50;

      const result = await syncShopifyOrdersBackfill({
        store: storeParam,
        since,
        pageInfo: cursor,
        limit,
      });

      if (result.ok) {
        res.json({
          ok: true,
          message: `Backfill completado para tienda ${storeParam}`,
          summary: result.summary,
          hasNextPage: result.hasNextPage,
          nextPageInfo: result.nextPageInfo,
        });
      } else {
        res.status(500).json({ ok: false, message: `Backfill falló para tienda ${storeParam}` });
      }
    } catch (e: any) {
      console.log(`❌ Error en backfill: ${e.message}`);
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // Sincronización manual de órdenes (botón "Sincronizar ahora")
  app.post("/api/integrations/shopify/sync-now", requiereAutenticacion, async (req, res) => {
    try {
      console.log('🔄 Iniciando sincronización manual de Shopify...');

      // Usar la función existente syncShopifyOrders
      const resultado = await syncShopifyOrders({ store: "all", limit: 50 });

      console.log('✅ Sincronización manual completada');

      res.json({
        ok: true,
        message: "Sincronización completada exitosamente",
        resultado,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('❌ Error en sincronización manual:', error);
      res.status(500).json({
        ok: false,
        message: "Error durante la sincronización",
        error: error?.message || "Error desconocido"
      });
    }
  });

  // Sincronización incremental de órdenes
  app.post("/api/integrations/shopify/orders/sync", requiereAutenticacion, async (req, res) => {
    try {
      const storeParam = (req.query.store as string) || '1';
      const updatedSince = req.query.updatedSince as string;
      const cursor = (req.query.cursor as string) || undefined;
      const limit = parseInt(req.query.limit as string) || 100;

      if (!updatedSince && !cursor) {
        return res.status(400).json({
          ok: false,
          error: 'Parámetro updatedSince es requerido cuando no hay cursor',
        });
      }

      const result = await syncShopifyOrdersIncremental({
        store: storeParam,
        updatedSince: updatedSince || new Date(Date.now() - 10 * 60_000).toISOString(),
        pageInfo: cursor,
        limit,
      });

      res.json({
        ok: true,
        message: `Sync incremental para tienda ${storeParam}`,
        summary: result.summary,
        hasNextPage: result.hasNextPage,
        nextPageInfo: result.nextPageInfo,
      });

    } catch (e: any) {
      console.log(`❌ Error en sync incremental: ${e.message}`);
      res.status(500).json({ ok: false, error: e.message });
    }
  });
  // Listar productos por tienda
  app.get("/api/integrations/shopify/products", requiereAutenticacion, async (req, res) => {
    try {
      const storeParam = req.query.store as string || '1';
      const storeId = parseInt(storeParam);

      console.log(`📦 Listando productos para tienda ${storeParam}`);

      const productService = new ProductService(storeParam);
      const products = await productService.getProductsForStore(storeId);

      res.json({
        ok: true,
        store: storeParam,
        products: products,
        count: products.length,
      });

    } catch (e: any) {
      console.log(`❌ Error listando productos: ${e.message}`);
      res.status(500).json({
        ok: false,
        error: e.message,
      });
    }
  });

  // Sincronizar productos desde Shopify
  app.post("/api/integrations/shopify/products/sync", requiereAutenticacion, async (req, res) => {
    try {
      const storeParam = req.query.store as string || '1';
      const limit = parseInt(req.query.limit as string) || 50;

      console.log(`🔄 Sincronizando productos desde Shopify tienda ${storeParam}`);

      const productService = new ProductService(storeParam);
      const result = await productService.syncProductsFromShopify(limit);

      if (result.success) {
        res.json({
          ok: true,
          message: `Productos sincronizados para tienda ${storeParam}`,
          productsProcessed: result.productsProcessed,
          errors: result.errors,
        });
      } else {
        res.status(500).json({
          ok: false,
          message: `Sync de productos falló para tienda ${storeParam}`,
          productsProcessed: result.productsProcessed,
          errors: result.errors,
        });
      }

    } catch (e: any) {
      console.log(`❌ Error sincronizando productos: ${e.message}`);
      res.status(500).json({
        ok: false,
        error: e.message,
      });
    }
  });

  // Actualizar producto (con sincronización a Shopify)
  app.put("/api/integrations/shopify/products/:id", requiereAutenticacion, async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const updates = req.body;

      if (!updates || typeof updates !== 'object') {
        return res.status(400).json({
          ok: false,
          error: 'Datos de actualización requeridos',
        });
      }

      console.log(`🔄 Actualizando producto ${productId} en Shopify`);

      const product = await almacenamiento.getProduct(productId);
      if (!product) {
        return res.status(404).json({
          ok: false,
          error: 'Producto no encontrado',
        });
      }

      const productService = new ProductService(product.shopId.toString());
      const result = await productService.updateProductInShopify(productId, updates);

      if (result.success) {
        res.json({
          ok: true,
          message: 'Producto actualizado exitosamente',
          product: result.product,
          shopifyUpdated: result.shopifyUpdated,
        });
      } else {
        res.status(500).json({
          ok: false,
          error: result.error,
          shopifyUpdated: result.shopifyUpdated,
        });
      }

    } catch (e: any) {
      console.log(`❌ Error actualizando producto: ${e.message}`);
      res.status(500).json({
        ok: false,
        error: e.message,
      });
    }
  });

  // ========== INTEGRACIÓN MERCADOLIBRE (SIMULADA) ==========
  app.get("/api/integrations/mercadolibre/simulate", requiereAutenticacion, async (_req, res) => {
    res.json({ message: "Simulación MercadoLibre", status: "pending" });
  });

  // ========== INTEGRACIÓN MLG API (MLG-INTEGRATION) ==========
  // Health/ping contra un endpoint protegido de MLG
  app.get("/api/mlg/ping", requiereAutenticacion, async (_req, res) => {
    try {
      const { mlgRequest } = await import("./services/MlgClient");
      // Ajusta el path a un recurso real de MLG que requiera token:
      // Ejemplos posibles (confirma con su doc):
      //  - /api/Productos/ObtenerCategorias
      //  - /api/Productos/ObtenerCatalogo
      const upstream = await mlgRequest(`/api/Productos/ObtenerCategorias`, { method: "GET" });
      if (!upstream.ok) {
        const text = await upstream.text();
        return res.status(502).json({ message: "MLG upstream error", status: upstream.status, body: text });
      }
      const json = await upstream.json();
      res.json({ ok: true, data: json });
    } catch (err: any) {
      res.status(500).json({ message: "MLG ping failed", error: String(err?.message ?? err) });
    }
  });

  // Register all MLG routes
  const { registerMlgRoutes } = await import("./routes/mlgRoutes");
  registerMlgRoutes(app);

  // EXPRESSPL-INTEGRATION: Registrar rutas de envío
  const { registerShippingRoutes } = await import("./routes/shippingRoutes");
  registerShippingRoutes(app);

  // Crea y devuelve el servidor HTTP a quien llama (index.ts)
  const servidorHttp = createServer(app);
  return servidorHttp;
}

// --------- Inicialización de datos por defecto ---------
async function inicializarDatosPorDefecto() {
  try {
    // Usuarios base
    const usuarioLogistica = await almacenamiento.getUserByEmail(
      "logistica@empresa.com",
    );
    if (!usuarioLogistica) {
      const passwordHasheada = await bcrypt.hash("123456", 10); // ⚠️ demo
      await almacenamiento.createUser({
        email: "logistica@empresa.com",
        password: passwordHasheada,
        firstName: "Usuario",
        lastName: "Logística",
        role: "user",
      });
    }

    const usuarioAdmin =
      await almacenamiento.getUserByEmail("admin@empresa.com");
    if (!usuarioAdmin) {
      const passwordHasheada = await bcrypt.hash("admin123", 10); // ⚠️ demo
      await almacenamiento.createUser({
        email: "admin@empresa.com",
        password: passwordHasheada,
        firstName: "Admin",
        lastName: "Sistema",
        role: "admin",
      });
    }

    // Canales base
    const canales = await almacenamiento.getChannels();
    if (canales.length === 0) {
      await almacenamiento.createChannel({
        code: "WW",
        name: "WW Channel",
        color: "#4CAF50",
        icon: "fas fa-globe",
      });
      await almacenamiento.createChannel({
        code: "CT",
        name: "CT Channel",
        color: "#FF9800",
        icon: "fas fa-store",
      });
      await almacenamiento.createChannel({
        code: "MGL",
        name: "MGL Channel",
        color: "#2196F3",
        icon: "fas fa-shopping-cart",
      });
    }

    // Paqueterías base
    const paqueterias = await almacenamiento.getCarriers();
    if (paqueterias.length === 0) {
      await almacenamiento.createCarrier({
        name: "Estafeta",
        code: "ESTAFETA",
        apiEndpoint: "https://api.estafeta.com",
      });
      await almacenamiento.createCarrier({
        name: "DHL",
        code: "DHL",
        apiEndpoint: "https://api.dhl.com",
      });
      await almacenamiento.createCarrier({
        name: "Express PL",
        code: "EXPRESS_PL",
        apiEndpoint: "https://api.expresspl.com",
      });
    }

    // Marcas base
    const marcas = await almacenamiento.getBrands();
    if (marcas.length === 0) {
      await almacenamiento.createBrand({ name: "ELEGATE", code: "ELG" });
    }

    console.log("Datos por defecto inicializados correctamente");
  } catch (error) {
    console.error("Fallo en la inicialización de datos por defecto:", error);
  }
}
