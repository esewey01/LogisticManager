/*

Auth: POST /api/auth/login, POST /api/auth/logout, GET /api/auth/user

Dashboard: GET /api/dashboard/metrics

Órdenes: GET /api/orders, GET /api/orders/:id, POST /api/orders, PATCH /api/orders/:id

Tickets: GET /api/tickets, POST /api/tickets

Catálogos: GET /api/channels, GET /api/brands, GET /api/carriers

Notas: GET /api/notes, POST /api/notes, DELETE /api/notes/:id

Admin: GET /api/admin/users

Integraciones (demo): GET /api/integrations/shopify/sync, GET /api/integrations/mercadolibre/simulate

*/

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
} from "@shared/schema";
import { syncShopifyOrders } from "./syncShopifyOrders"; // archivo de sincrinizacion
import { getShopifyCredentials } from "./shopifyEnv"; // Helper para múltiples tiendas
import { OrderSyncService } from "./services/OrderSyncService"; // Servicio de sync de órdenes
import { ProductService } from "./services/ProductService"; // Servicio de productos
import { ShopifyAdminClient } from "./services/ShopifyAdminClient"; // Cliente de Shopify

// Adaptador de store en memoria para sesiones (con limpieza automática)
const AlmacenSesionesMemoria = MemoryStore(session);

// Esquema de validación para login
const esquemaLogin = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Middleware: requiere usuario autenticado
const requiereAutenticacion = (req: any, res: any, next: any) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "No autorizado" });
  }
  next();
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
  app.get(
    "/api/dashboard/metrics",
    requiereAutenticacion,
    async (_req, res) => {
      try {
        const metricas = await almacenamiento.getDashboardMetrics();
        res.json(metricas);
      } catch {
        res.status(500).json({ message: "No se pudieron obtener métricas" });
      }
    },
  );

  // ---------- Órdenes ----------
  app.get("/api/orders", requiereAutenticacion, async (req, res) => {
    try {
      const page = parseInt((req.query.page as string) ?? "1", 10) || 1;
      const pageSize = parseInt((req.query.pageSize as string) ?? "20", 10) || 20;
      const fulfillment = (req.query.fulfillment as string) || "unfulfilled";
      const { channelId, managed, hasTicket } = req.query;

      const filtros: {
        page: number;
        pageSize: number;
        fulfillment: "unfulfilled" | "fulfilled" | "any";
        channelId?: number;
        managed?: boolean;
        hasTicket?: boolean;
      } = {
        page,
        pageSize,
        fulfillment:
          fulfillment === "fulfilled" || fulfillment === "any"
            ? (fulfillment as any)
            : "unfulfilled",
      };

      if (channelId !== undefined) {
        const channelIdNum = Number(channelId);
        if (!Number.isNaN(channelIdNum)) filtros.channelId = channelIdNum;
      }
      if (managed !== undefined) filtros.managed = managed === "true";
      if (hasTicket !== undefined) filtros.hasTicket = hasTicket === "true";

      const result = await almacenamiento.getOrdersPaginated(filtros);
      res.json(result);
    } catch {
      res.status(500).json({ message: "No se pudieron obtener órdenes" });
    }
  });

  app.get("/api/orders/:id", requiereAutenticacion, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id))
        return res.status(400).json({ message: "ID de orden inválido" });

      const orden = await almacenamiento.getOrder(id);
      if (!orden)
        return res.status(404).json({ message: "Orden no encontrada" });
      res.json(orden);
    } catch {
      res.status(500).json({ message: "No se pudo obtener la orden" });
    }
  });

  app.get("/api/orders/:id/items", requiereAutenticacion, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id))
        return res.status(400).json({ message: "ID de orden inválido" });
      const items = await almacenamiento.getOrderItems(id);
      res.json(items);
    } catch {
      res.status(500).json({ message: "No se pudieron obtener los ítems" });
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

  // ---------- Tickets ----------
  app.get("/api/tickets", requiereAutenticacion, async (_req, res) => {
    try {
      const tickets = await almacenamiento.getTickets();
      res.json(tickets);
    } catch {
      res.status(500).json({ message: "No se pudieron obtener tickets" });
    }
  });

  app.post("/api/tickets", requiereAutenticacion, async (req, res) => {
    try {
      const datosTicket = insertTicketSchema.parse(req.body);
      // Genera número de ticket
      const numeroTicket = `TK-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

      const ticket = await almacenamiento.createTicket({
        ...datosTicket,
        ticketNumber: numeroTicket,
      });
      res.status(201).json(ticket);
    } catch {
      res.status(400).json({ message: "Datos de ticket inválidos" });
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
      const notas = await almacenamiento.getNotes(req.session.userId);
      res.json(notas);
    } catch {
      res.status(500).json({ message: "No se pudieron obtener notas" });
    }
  });

  app.post("/api/notes", requiereAutenticacion, async (req: any, res) => {
    try {
      const datosNota = insertNoteSchema.parse({
        ...req.body,
        userId: req.session.userId,
      });
      const nota = await almacenamiento.createNote(datosNota);
      res.status(201).json(nota);
    } catch {
      res.status(400).json({ message: "Datos de nota inválidos" });
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
      const storeParam = req.query.store as string || '1';
      console.log(`📊 Shopify ping count para tienda ${storeParam}`);

      const orderSync = new OrderSyncService(storeParam);
      const countResult = await orderSync.getOrdersCount();
      const storeInfo = orderSync.getStoreInfo();

      if (countResult.error) {
        return res.status(500).json({
          ok: false,
          store: storeInfo.storeNumber,
          error: countResult.error,
        });
      }

      return res.json({
        ok: true,
        store: storeInfo.storeNumber,
        shop: storeInfo.shopDomain,
        count: countResult.count,
        apiVersion: storeInfo.apiVersion,
      });

    } catch (e: any) {
      console.log(`❌ Error en ping count: ${e.message}`);
      res.status(500).json({
        ok: false,
        error: e.message,
      });
    }
  });

  // Backfill inicial de órdenes
  app.post("/api/integrations/shopify/orders/backfill", requiereAutenticacion, async (req, res) => {
    try {
      const storeParam = req.query.store as string || '1';
      const since = req.query.since as string;
      const cursor = req.query.cursor as string;
      const limit = parseInt(req.query.limit as string) || 50;

      console.log(`🔄 Backfill iniciado para tienda ${storeParam}, since: ${since}, limit: ${limit}`);

      const orderSync = new OrderSyncService(storeParam);
      const result = await orderSync.backfillOrders(since, cursor, limit);

      if (result.success) {
        res.json({
          ok: true,
          message: `Backfill completado para tienda ${storeParam}`,
          ordersProcessed: result.ordersProcessed,
          hasNextPage: result.hasNextPage,
          errors: result.errors,
        });
      } else {
        res.status(500).json({
          ok: false,
          message: `Backfill falló para tienda ${storeParam}`,
          ordersProcessed: result.ordersProcessed,
          errors: result.errors,
        });
      }

    } catch (e: any) {
      console.log(`❌ Error en backfill: ${e.message}`);
      res.status(500).json({
        ok: false,
        error: e.message,
      });
    }
  });

  // Sincronización incremental de órdenes
  app.post("/api/integrations/shopify/orders/sync", requiereAutenticacion, async (req, res) => {
    try {
      const storeParam = req.query.store as string || '1';
      const updatedSince = req.query.updatedSince as string;

      if (!updatedSince) {
        return res.status(400).json({
          ok: false,
          error: 'Parámetro updatedSince es requerido (formato ISO8601)',
        });
      }

      console.log(`🔄 Sync incremental para tienda ${storeParam}, desde: ${updatedSince}`);

      const orderSync = new OrderSyncService(storeParam);
      const result = await orderSync.incrementalSync(updatedSince);

      if (result.success) {
        res.json({
          ok: true,
          message: `Sync incremental completado para tienda ${storeParam}`,
          ordersProcessed: result.ordersProcessed,
          errors: result.errors,
        });
      } else {
        res.status(500).json({
          ok: false,
          message: `Sync incremental falló para tienda ${storeParam}`,
          ordersProcessed: result.ordersProcessed,
          errors: result.errors,
        });
      }

    } catch (e: any) {
      console.log(`❌ Error en sync incremental: ${e.message}`);
      res.status(500).json({
        ok: false,
        error: e.message,
      });
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
