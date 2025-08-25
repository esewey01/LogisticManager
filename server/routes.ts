

import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage as almacenamiento } from "./storage"; // almacenamiento de datos (DAO)
import bcrypt from "bcrypt";
import session from "express-session";
import MemoryStore from "memorystore";
import { z } from "zod";
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

  // Endpoint de salud de la API
  app.get("/api/health", (req, res) => {
    console.log("Health check solicitado");
    res.json({
      ok: true,
      ts: Date.now(),
    });
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
            visto: { shop: !!shop, token: !!token, ver },
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
      });
      res.json(data);
    } catch (e) {
      res.status(500).json({ message: "No se pudieron obtener órdenes" });
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



  app.post("/api/orders/:id/cancel", requiereAutenticacion, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id))
        return res.status(400).json({ message: "ID de orden inválido" });

      const orden = await almacenamiento.getOrder(id);
      if (!orden) return res.status(404).json({ ok: false, errors: "Orden no encontrada" });

      const { reason, staffNote, notifyCustomer, restock, refundToOriginal } = req.body;
      const { shop, token, apiVersion } = getShopifyCredentials(String(orden.shopId));
      const gid = (orden.orderId && orden.orderId.startsWith("gid://"))
        ? orden.orderId
        : `gid://shopify/Order/${orden.orderId || orden.id}`;

      const mutation = `mutation orderCancel($id: ID!, $reason: OrderCancelReason, $staffNote: String, $email: Boolean, $restock: Boolean, $refund: Boolean){
        orderCancel(id: $id, reason: $reason, staffNote: $staffNote, email: $email, restock: $restock, refund: $refund){
          job { id }
          userErrors { field message }
        }
      }`;

      const variables = {
        id: gid,
        reason,
        staffNote,
        email: !!notifyCustomer,
        restock: !!restock,
        refund: !!refundToOriginal,
      };

      const r = await fetch(`https://${shop}/admin/api/${apiVersion}/graphql.json`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": token,
        },
        body: JSON.stringify({ query: mutation, variables }),
      });

      const data = await r.json();
      const userErrors = data?.data?.orderCancel?.userErrors || data?.errors;
      if (!r.ok || (userErrors && userErrors.length)) {
        return res.status(400).json({ ok: false, errors: userErrors });
      }
      return res.json({ ok: true, job: data?.data?.orderCancel?.job });
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
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
      const ok =
        file.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        file.mimetype === "application/vnd.ms-excel";
      if (!ok) return cb(new Error("Formato de archivo no permitido. Sube un .xlsx/.xls"));
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
      const { text } = insertNoteSchema.parse(req.body);

      console.log('Creando nota para usuario:', userId, 'con contenido:', text);

      const nota = await almacenamiento.createNote({
        userId: userId,
        content: text,
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
      if (Number.isNaN(id))
        return res.status(400).json({ message: "ID de nota inválido" });
      const nota = await almacenamiento.updateNote(id, req.body);
      res.json(nota);
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
      const data = await almacenamiento.getProductsPaginated(shopId, page, pageSize);
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

  app.get("/api/external-products", requiereAutenticacion, async (req, res) => {
    try {
      const page = req.query.page ? Number(req.query.page) : 1;
      const pageSize = req.query.pageSize ? Number(req.query.pageSize) : 15;
      const data = await almacenamiento.getExternalProductsPaginated(page, pageSize);
      res.json(data);
    } catch {
      res.status(500).json({ message: "No se pudieron obtener productos" });
    }
  });

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
