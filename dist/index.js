var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  brands: () => brands,
  canales: () => channels,
  carriers: () => carriers,
  catalogProducts: () => catalogProducts,
  channels: () => channels,
  insertNoteSchema: () => insertNoteSchema,
  insertOrderSchema: () => insertOrderSchema,
  insertTicketSchema: () => insertTicketSchema,
  marcas: () => brands,
  notas: () => notes,
  notes: () => notes,
  ordenes: () => orders,
  orders: () => orders,
  paqueterias: () => carriers,
  productosCatalogo: () => catalogProducts,
  reglasEnvio: () => shippingRules,
  shippingRules: () => shippingRules,
  tickets: () => tickets,
  ticketsTabla: () => tickets,
  users: () => users,
  usuarios: () => users
});
import { pgTable, serial, text, boolean, timestamp, integer, decimal } from "drizzle-orm/pg-core";
import { z } from "zod";
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  // ID autoincremental (PK)
  email: text("email").notNull().unique(),
  // correo único (login)
  password: text("password").notNull(),
  // hash de contraseña
  firstName: text("first_name"),
  // nombre (opcional)
  lastName: text("last_name"),
  // apellido (opcional)
  role: text("role").notNull().default("user"),
  // rol: user | admin
  lastLogin: timestamp("last_login"),
  // último acceso
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at")
});
var brands = pgTable("brands", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  // nombre visible
  code: text("code").notNull().unique(),
  // código corto único
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at")
});
var catalogProducts = pgTable("catalog_products", {
  id: serial("id").primaryKey(),
  sku: text("sku").notNull().unique(),
  // SKU único
  brandId: integer("brand_id").notNull(),
  // referencia a brands.id (no FK explícita aquí)
  name: text("name").notNull(),
  // nombre del producto
  description: text("description"),
  // descripción (opcional)
  price: decimal("price"),
  // precio de venta (opcional)
  cost: decimal("cost"),
  // costo (opcional)
  weight: decimal("weight"),
  // peso (opcional)
  dimensions: text("dimensions"),
  // dimensiones (opcional)
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at")
});
var channels = pgTable("channels", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  // código corto único del canal
  name: text("name").notNull(),
  // nombre del canal
  color: text("color"),
  // color para UI (hex)
  icon: text("icon"),
  // icono para UI (clase o nombre)
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at")
});
var carriers = pgTable("carriers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  // nombre visible
  code: text("code").notNull().unique(),
  // código único (ej. DHL)
  apiEndpoint: text("api_endpoint"),
  // endpoint API (si aplica)
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at")
});
var orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderId: text("order_id").notNull().unique(),
  // ID externo (ej. Shopify)
  channelId: integer("channel_id").notNull(),
  // referencia a channels.id
  customerName: text("customer_name"),
  // nombre del cliente
  totalAmount: decimal("total_amount"),
  // total de la orden
  isManaged: boolean("is_managed").notNull().default(false),
  // gestionada por logística
  hasTicket: boolean("has_ticket").notNull().default(false),
  // tiene ticket asociado
  status: text("status").notNull().default("pending"),
  // estado interno
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at")
});
var tickets = pgTable("tickets", {
  id: serial("id").primaryKey(),
  ticketNumber: text("ticket_number").notNull().unique(),
  // folio del ticket
  orderId: integer("order_id").notNull(),
  // referencia a orders.id
  status: text("status").notNull().default("open"),
  // estado del ticket
  notes: text("notes"),
  // notas libres
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at")
});
var shippingRules = pgTable("shipping_rules", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  // nombre de la regla
  condition: text("condition").notNull(),
  // expresión/condición (definición libre)
  carrierId: integer("carrier_id").notNull(),
  // referencia a carriers.id
  service: text("service"),
  // nombre del servicio (si aplica)
  cost: decimal("cost"),
  // costo estimado
  estimatedDays: integer("estimated_days"),
  // días estimados de entrega
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at")
});
var notes = pgTable("notes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  // referencia a users.id
  content: text("content").notNull(),
  // contenido de la nota
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at")
});
var insertOrderSchema = z.object({
  orderId: z.string().min(1, "El ID de la orden es obligatorio"),
  channelId: z.number().int().positive("El ID del canal debe ser un n\xFAmero positivo"),
  customerName: z.string().optional(),
  totalAmount: z.string().optional(),
  // se acepta como string para evitar issues de decimal
  isManaged: z.boolean().optional().default(false),
  hasTicket: z.boolean().optional().default(false),
  status: z.string().default("pending")
});
var insertTicketSchema = z.object({
  ticketNumber: z.string().min(1, "El n\xFAmero de ticket es obligatorio"),
  orderId: z.number().int().positive("El ID de la orden debe ser un n\xFAmero positivo"),
  status: z.string().default("open"),
  notes: z.string().optional()
});
var insertNoteSchema = z.object({
  userId: z.number().int().positive("El ID de usuario debe ser un n\xFAmero positivo"),
  content: z.string().min(1, "El contenido es obligatorio")
});

// server/db.ts
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import "dotenv/config";
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL no definida/encontrada");
}
var pool = new Pool({
  connectionString: process.env.DATABASE_URL
});
var db = drizzle(pool, { schema: schema_exports });

// server/storage.ts
import { eq, and, desc, asc, sql, count } from "drizzle-orm";
var DatabaseStorage = class {
  // ==== USUARIOS ====
  /** Obtiene un usuario por su ID. */
  async getUser(id) {
    const [usuario] = await db.select().from(users).where(eq(users.id, id));
    return usuario;
  }
  /** Busca un usuario por correo electrónico. */
  async getUserByEmail(email) {
    const [usuario] = await db.select().from(users).where(eq(users.email, email));
    return usuario;
  }
  /** Crea un nuevo usuario. */
  async createUser(datos) {
    const [usuario] = await db.insert(users).values(datos).returning();
    return usuario;
  }
  /** Actualiza campos de un usuario existente. */
  async updateUser(id, updates) {
    const [usuario] = await db.update(users).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(users.id, id)).returning();
    return usuario;
  }
  /** Lista todos los usuarios ordenados por correo. */
  async getAllUsers() {
    return await db.select().from(users).orderBy(asc(users.email));
  }
  // ==== MARCAS ====
  /** Devuelve las marcas activas ordenadas por nombre. */
  async getBrands() {
    return await db.select().from(brands).where(eq(brands.isActive, true)).orderBy(asc(brands.name));
  }
  /** Obtiene una marca por ID. */
  async getBrand(id) {
    const [marca] = await db.select().from(brands).where(eq(brands.id, id));
    return marca;
  }
  /** Crea una nueva marca. */
  async createBrand(datos) {
    const [marcaNueva] = await db.insert(brands).values(datos).returning();
    return marcaNueva;
  }
  /** Actualiza una marca. */
  async updateBrand(id, updates) {
    const [marca] = await db.update(brands).set(updates).where(eq(brands.id, id)).returning();
    return marca;
  }
  // ==== CATÁLOGO ====
  /** Lista productos de catálogo; puede filtrar por ID de marca. */
  async getCatalogProducts(brandId) {
    const consulta = db.select().from(catalogProducts);
    if (brandId) {
      return await consulta.where(eq(catalogProducts.brandId, brandId)).orderBy(asc(catalogProducts.sku));
    }
    return await consulta.orderBy(asc(catalogProducts.sku));
  }
  /** Crea un producto de catálogo. */
  async createCatalogProduct(datos) {
    const [productoNuevo] = await db.insert(catalogProducts).values(datos).returning();
    return productoNuevo;
  }
  /** Actualiza un producto de catálogo. */
  async updateCatalogProduct(id, updates) {
    const [producto] = await db.update(catalogProducts).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(catalogProducts.id, id)).returning();
    return producto;
  }
  // ==== CANALES ====
  /** Devuelve canales activos ordenados por nombre. */
  async getChannels() {
    return await db.select().from(channels).where(eq(channels.isActive, true)).orderBy(asc(channels.name));
  }
  /** Obtiene un canal por ID. */
  async getChannel(id) {
    const [canal] = await db.select().from(channels).where(eq(channels.id, id));
    return canal;
  }
  /** Crea un canal. */
  async createChannel(datos) {
    const [canalNuevo] = await db.insert(channels).values(datos).returning();
    return canalNuevo;
  }
  // ==== PAQUETERÍAS ====
  /** Devuelve paqueterías activas ordenadas por nombre. */
  async getCarriers() {
    return await db.select().from(carriers).where(eq(carriers.isActive, true)).orderBy(asc(carriers.name));
  }
  /** Obtiene una paquetería por ID. */
  async getCarrier(id) {
    const [paq] = await db.select().from(carriers).where(eq(carriers.id, id));
    return paq;
  }
  /** Crea una paquetería. */
  async createCarrier(datos) {
    const [paqueteriaNueva] = await db.insert(carriers).values(datos).returning();
    return paqueteriaNueva;
  }
  // ==== ÓRDENES ====
  /** Lista órdenes con filtros opcionales (canal, gestionada, con ticket). */
  async getOrders(filtros) {
    const condiciones = [];
    if (filtros?.channelId !== void 0) condiciones.push(eq(orders.channelId, filtros.channelId));
    if (filtros?.managed !== void 0) condiciones.push(eq(orders.isManaged, filtros.managed));
    if (filtros?.hasTicket !== void 0) condiciones.push(eq(orders.hasTicket, filtros.hasTicket));
    if (condiciones.length > 0) {
      return await db.select().from(orders).where(and(...condiciones)).orderBy(desc(orders.createdAt));
    }
    return await db.select().from(orders).orderBy(desc(orders.createdAt));
  }
  /** Obtiene una orden por ID. */
  async getOrder(id) {
    const [orden] = await db.select().from(orders).where(eq(orders.id, id));
    return orden;
  }
  /** Crea una orden. */
  async createOrder(datos) {
    const [ordenNueva] = await db.insert(orders).values(datos).returning();
    return ordenNueva;
  }
  /** Actualiza una orden. */
  async updateOrder(id, updates) {
    const [orden] = await db.update(orders).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(orders.id, id)).returning();
    return orden;
  }
  /** Lista órdenes por nombre de cliente. */
  async getOrdersByCustomer(nombreCliente) {
    return await db.select().from(orders).where(eq(orders.customerName, nombreCliente)).orderBy(desc(orders.createdAt));
  }
  // ==== TICKETS ====
  /** Lista tickets ordenados por fecha de creación descendente. */
  async getTickets() {
    return await db.select().from(tickets).orderBy(desc(tickets.createdAt));
  }
  /** Obtiene un ticket por ID. */
  async getTicket(id) {
    const [ticket] = await db.select().from(tickets).where(eq(tickets.id, id));
    return ticket;
  }
  /** Crea un ticket. */
  async createTicket(datos) {
    const [ticketNuevo] = await db.insert(tickets).values(datos).returning();
    return ticketNuevo;
  }
  /** Actualiza un ticket. */
  async updateTicket(id, updates) {
    const [ticket] = await db.update(tickets).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(tickets.id, id)).returning();
    return ticket;
  }
  // ==== REGLAS DE ENVÍO ====
  /** Devuelve reglas de envío activas. */
  async getShippingRules() {
    return await db.select().from(shippingRules).where(eq(shippingRules.isActive, true));
  }
  /** Crea una regla de envío. */
  async createShippingRule(regla) {
    const [nuevaRegla] = await db.insert(shippingRules).values(regla).returning();
    return nuevaRegla;
  }
  // ==== NOTAS ====
  /** Lista notas; si se pasa userId, filtra por usuario. */
  async getNotes(userId) {
    const consulta = db.select().from(notes);
    if (userId) {
      return await consulta.where(eq(notes.userId, userId)).orderBy(desc(notes.createdAt));
    }
    return await consulta.orderBy(desc(notes.createdAt));
  }
  /** Crea una nota. */
  async createNote(nota) {
    const [nuevaNota] = await db.insert(notes).values(nota).returning();
    return nuevaNota;
  }
  /** Elimina una nota por ID. */
  async deleteNote(id) {
    await db.delete(notes).where(eq(notes.id, id));
  }
  // ==== MÉTRICAS DE DASHBOARD ====
  /**
   * Calcula métricas agregadas para el dashboard.
   * - totalOrders: total de órdenes
   * - unmanaged: órdenes no gestionadas (isManaged = false)
   * - totalSales: suma de montos
   * - delayed: usa status='unmanaged' como proxy de retrasadas
   * - channelStats: totales por canal
   */
  // Métricas de dashboard
  async getDashboardMetrics() {
    const [totalOrdersResult] = await db.select({ count: count() }).from(orders);
    const totalOrders = totalOrdersResult.count;
    const [unmanagedResult] = await db.select({ count: count() }).from(orders).where(eq(orders.isManaged, false));
    const unmanaged = unmanagedResult.count;
    const [salesResult] = await db.select({ total: sql`COALESCE(SUM(${orders.totalAmount}), 0)` }).from(orders);
    const totalSales = Number(salesResult.total) || 0;
    const [delayedResult] = await db.select({ count: count() }).from(orders).where(eq(orders.status, "unmanaged"));
    const delayed = delayedResult.count;
    const channelStats = await db.select({
      channelId: orders.channelId,
      orders: count(),
      channelName: channels.name,
      channelCode: channels.code
    }).from(orders).innerJoin(channels, eq(orders.channelId, channels.id)).groupBy(orders.channelId, channels.name, channels.code);
    return { totalOrders, unmanaged, totalSales, delayed, channelStats };
  }
};
var storage = new DatabaseStorage();

// server/routes.ts
import bcrypt from "bcrypt";
import session from "express-session";
import MemoryStore from "memorystore";
import { z as z2 } from "zod";
var AlmacenSesionesMemoria = MemoryStore(session);
var esquemaLogin = z2.object({
  email: z2.string().email(),
  password: z2.string().min(1)
});
var requiereAutenticacion = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "No autorizado" });
  }
  next();
};
var requiereAdmin = async (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ m: "No autorizado" });
  }
  const usuario = await storage.getUser(req.session.userId);
  if (!usuario || usuario.role !== "admin") {
    return res.status(403).json({ message: "Se requiere rol administrador" });
  }
  next();
};
async function registerRoutes(app) {
  app.use(session({
    secret: process.env.SESSION_SECRET || "dev-secret-key",
    // en prod ¡debe ser fuerte!
    resave: false,
    saveUninitialized: false,
    store: new AlmacenSesionesMemoria({
      checkPeriod: 864e5
      // limpia expirados cada 24h
    }),
    cookie: {
      secure: process.env.NODE_ENV === "production",
      // solo por HTTPS en prod
      httpOnly: true,
      // inaccesible desde JS del navegador
      maxAge: 7 * 24 * 60 * 60 * 1e3
      // 7 días
    }
  }));
  await inicializarDatosPorDefecto();
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = esquemaLogin.parse(req.body);
      const usuario = await storage.getUserByEmail(email);
      if (!usuario) return res.status(401).json({ message: "Credenciales inv\xE1lidas" });
      const passwordValida = await bcrypt.compare(password, usuario.password);
      if (!passwordValida) return res.status(401).json({ message: "Credenciales inv\xE1lidas" });
      await storage.updateUser(usuario.id, { lastLogin: /* @__PURE__ */ new Date() });
      req.session.userId = usuario.id;
      res.json({ user: { id: usuario.id, email: usuario.email, role: usuario.role } });
    } catch {
      res.status(400).json({ message: "Datos de solicitud inv\xE1lidos" });
    }
  });
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ message: "Sesi\xF3n cerrada" });
    });
  });
  app.get("/api/auth/user", requiereAutenticacion, async (req, res) => {
    try {
      const usuario = await storage.getUser(req.session.userId);
      if (!usuario) return res.status(404).json({ message: "Usuario no encontrado" });
      res.json({ id: usuario.id, email: usuario.email, role: usuario.role });
    } catch {
      res.status(500).json({ message: "Error del servidor" });
    }
  });
  app.get("/api/dashboard/metrics", requiereAutenticacion, async (_req, res) => {
    try {
      const metricas = await storage.getDashboardMetrics();
      res.json(metricas);
    } catch {
      res.status(500).json({ message: "No se pudieron obtener m\xE9tricas" });
    }
  });
  app.get("/api/orders", requiereAutenticacion, async (req, res) => {
    try {
      const { channelId, managed, hasTicket } = req.query;
      const filtros = {};
      if (channelId !== void 0) {
        const channelIdNum = Number(channelId);
        if (!Number.isNaN(channelIdNum)) filtros.channelId = channelIdNum;
      }
      if (managed !== void 0) filtros.managed = managed === "true";
      if (hasTicket !== void 0) filtros.hasTicket = hasTicket === "true";
      const ordenes = await storage.getOrders(filtros);
      res.json(ordenes);
    } catch {
      res.status(500).json({ message: "No se pudieron obtener \xF3rdenes" });
    }
  });
  app.get("/api/orders/:id", requiereAutenticacion, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) return res.status(400).json({ message: "ID de orden inv\xE1lido" });
      const orden = await storage.getOrder(id);
      if (!orden) return res.status(404).json({ message: "Orden no encontrada" });
      res.json(orden);
    } catch {
      res.status(500).json({ message: "No se pudo obtener la orden" });
    }
  });
  app.post("/api/orders", requiereAutenticacion, async (req, res) => {
    try {
      const datosOrden = insertOrderSchema.parse(req.body);
      const orden = await storage.createOrder(datosOrden);
      res.status(201).json(orden);
    } catch {
      res.status(400).json({ message: "Datos de orden inv\xE1lidos" });
    }
  });
  app.patch("/api/orders/:id", requiereAutenticacion, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) return res.status(400).json({ message: "ID de orden inv\xE1lido" });
      const orden = await storage.updateOrder(id, req.body);
      res.json(orden);
    } catch {
      res.status(400).json({ message: "No se pudo actualizar la orden" });
    }
  });
  app.get("/api/tickets", requiereAutenticacion, async (_req, res) => {
    try {
      const tickets2 = await storage.getTickets();
      res.json(tickets2);
    } catch {
      res.status(500).json({ message: "No se pudieron obtener tickets" });
    }
  });
  app.post("/api/tickets", requiereAutenticacion, async (req, res) => {
    try {
      const datosTicket = insertTicketSchema.parse(req.body);
      const numeroTicket = `TK-${(/* @__PURE__ */ new Date()).getFullYear()}-${String(Date.now()).slice(-6)}`;
      const ticket = await storage.createTicket({
        ...datosTicket,
        ticketNumber: numeroTicket
      });
      res.status(201).json(ticket);
    } catch {
      res.status(400).json({ message: "Datos de ticket inv\xE1lidos" });
    }
  });
  app.get("/api/channels", requiereAutenticacion, async (_req, res) => {
    try {
      const canales = await storage.getChannels();
      res.json(canales);
    } catch {
      res.status(500).json({ message: "No se pudieron obtener canales" });
    }
  });
  app.get("/api/brands", requiereAutenticacion, async (_req, res) => {
    try {
      const marcas = await storage.getBrands();
      res.json(marcas);
    } catch {
      res.status(500).json({ message: "No se pudieron obtener marcas" });
    }
  });
  app.get("/api/carriers", requiereAutenticacion, async (_req, res) => {
    try {
      const paqueterias = await storage.getCarriers();
      res.json(paqueterias);
    } catch {
      res.status(500).json({ message: "No se pudieron obtener paqueter\xEDas" });
    }
  });
  app.get("/api/notes", requiereAutenticacion, async (req, res) => {
    try {
      const notas = await storage.getNotes(req.session.userId);
      res.json(notas);
    } catch {
      res.status(500).json({ message: "No se pudieron obtener notas" });
    }
  });
  app.post("/api/notes", requiereAutenticacion, async (req, res) => {
    try {
      const datosNota = insertNoteSchema.parse({
        ...req.body,
        userId: req.session.userId
      });
      const nota = await storage.createNote(datosNota);
      res.status(201).json(nota);
    } catch {
      res.status(400).json({ message: "Datos de nota inv\xE1lidos" });
    }
  });
  app.delete("/api/notes/:id", requiereAutenticacion, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) return res.status(400).json({ message: "ID de nota inv\xE1lido" });
      await storage.deleteNote(id);
      res.status(204).send();
    } catch {
      res.status(500).json({ message: "No se pudo eliminar la nota" });
    }
  });
  app.get("/api/admin/users", requiereAdmin, async (_req, res) => {
    try {
      const usuarios = await storage.getAllUsers();
      res.json(usuarios);
    } catch {
      res.status(500).json({ message: "No se pudieron obtener usuarios" });
    }
  });
  app.get("/api/integrations/shopify/sync", requiereAutenticacion, async (_req, res) => {
    res.json({ message: "Sincronizaci\xF3n Shopify iniciada", status: "success" });
  });
  app.get("/api/integrations/mercadolibre/simulate", requiereAutenticacion, async (_req, res) => {
    res.json({ message: "Simulaci\xF3n MercadoLibre", status: "pending" });
  });
  const servidorHttp = createServer(app);
  return servidorHttp;
}
async function inicializarDatosPorDefecto() {
  try {
    const usuarioLogistica = await storage.getUserByEmail("logistica@empresa.com");
    if (!usuarioLogistica) {
      const passwordHasheada = await bcrypt.hash("123456", 10);
      await storage.createUser({
        email: "logistica@empresa.com",
        password: passwordHasheada,
        firstName: "Usuario",
        lastName: "Log\xEDstica",
        role: "user"
      });
    }
    const usuarioAdmin = await storage.getUserByEmail("admin@empresa.com");
    if (!usuarioAdmin) {
      const passwordHasheada = await bcrypt.hash("admin123", 10);
      await storage.createUser({
        email: "admin@empresa.com",
        password: passwordHasheada,
        firstName: "Admin",
        lastName: "Sistema",
        role: "admin"
      });
    }
    const canales = await storage.getChannels();
    if (canales.length === 0) {
      await storage.createChannel({ code: "WW", name: "WW Channel", color: "#4CAF50", icon: "fas fa-globe" });
      await storage.createChannel({ code: "CT", name: "CT Channel", color: "#FF9800", icon: "fas fa-store" });
      await storage.createChannel({ code: "MGL", name: "MGL Channel", color: "#2196F3", icon: "fas fa-shopping-cart" });
    }
    const paqueterias = await storage.getCarriers();
    if (paqueterias.length === 0) {
      await storage.createCarrier({ name: "Estafeta", code: "ESTAFETA", apiEndpoint: "https://api.estafeta.com" });
      await storage.createCarrier({ name: "DHL", code: "DHL", apiEndpoint: "https://api.dhl.com" });
      await storage.createCarrier({ name: "Express PL", code: "EXPRESS_PL", apiEndpoint: "https://api.expresspl.com" });
    }
    const marcas = await storage.getBrands();
    if (marcas.length === 0) {
      await storage.createBrand({ name: "ELEGATE", code: "ELG" });
    }
    console.log("Datos por defecto inicializados correctamente");
  } catch (error) {
    console.error("Fallo en la inicializaci\xF3n de datos por defecto:", error);
  }
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var vite_config_default = defineConfig({
  plugins: [
    react()
    // (eliminado) @replit/vite-plugin-runtime-error-modal
    // (eliminado) @replit/vite-plugin-cartographer
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets")
    }
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: { strict: true, deny: ["**/.*"] }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const horaFormateada = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${horaFormateada} ${message}`);
}
async function setupVite(app, server) {
  const opcionesServidor = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    // usamos el objeto importado, no buscar vite.config.* en disco
    customLogger: {
      ...viteLogger,
      // Si Vite reporta un error crítico, mostramos y salimos (evita estados raros)
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: opcionesServidor,
    appType: "custom"
    // indicamos que el servidor de la app lo controlamos nosotros
  });
  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const rutaPlantilla = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let plantilla = await fs.promises.readFile(rutaPlantilla, "utf-8");
      plantilla = plantilla.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const pagina = await vite.transformIndexHtml(url, plantilla);
      res.status(200).set({ "Content-Type": "text/html" }).end(pagina);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app) {
  const rutaDist = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(rutaDist)) {
    throw new Error(
      `No se encontr\xF3 el directorio de build: ${rutaDist}. Aseg\xFArate de compilar el cliente primero.`
    );
  }
  app.use(express.static(rutaDist));
  app.use("*", (_req, res) => {
    res.sendFile(path2.resolve(rutaDist, "index.html"));
  });
}

// server/index.ts
var aplicacion = express2();
aplicacion.use(express2.json());
aplicacion.use(express2.urlencoded({ extended: false }));
aplicacion.use((req, res, next) => {
  const inicio = Date.now();
  const ruta = req.path;
  let respuestaJsonCapturada = void 0;
  const funcionOriginalResJson = res.json;
  res.json = function(cuerpoJson, ...args) {
    respuestaJsonCapturada = cuerpoJson;
    return funcionOriginalResJson.apply(res, [cuerpoJson, ...args]);
  };
  res.on("finish", () => {
    const duracion = Date.now() - inicio;
    if (ruta.startsWith("/api")) {
      let lineaLog = `${req.method} ${ruta} ${res.statusCode} en ${duracion}ms`;
      if (respuestaJsonCapturada) {
        lineaLog += ` :: ${JSON.stringify(respuestaJsonCapturada)}`;
      }
      if (lineaLog.length > 80) {
        lineaLog = lineaLog.slice(0, 79) + "\u2026";
      }
      log(lineaLog);
    }
  });
  next();
});
(async () => {
  const servidor = await registerRoutes(aplicacion);
  aplicacion.use((err, _req, res, _next) => {
    const estado = err.status || err.statusCode || 500;
    const mensaje = err.message || "Error interno del servidor";
    res.status(estado).json({ mensaje });
    throw err;
  });
  if (aplicacion.get("env") === "development") {
    await setupVite(aplicacion, servidor);
  } else {
    serveStatic(aplicacion);
  }
  const puerto = parseInt(process.env.PORT || "5000", 10);
  servidor.listen({ port: puerto, host: "0.0.0.0" }, () => {
    log(`Servidor trabajando en el puerto ${puerto}`);
  });
})();
