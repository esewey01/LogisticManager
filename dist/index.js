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
  carriers: () => carriers,
  catalogProducts: () => catalogProducts,
  channels: () => channels,
  insertNoteSchema: () => insertNoteSchema,
  insertOrderSchema: () => insertOrderSchema,
  insertTicketSchema: () => insertTicketSchema,
  notes: () => notes,
  orders: () => orders,
  shippingRules: () => shippingRules,
  tickets: () => tickets,
  users: () => users
});
import { pgTable, serial, text, boolean, timestamp, integer, decimal } from "drizzle-orm/pg-core";
import { z } from "zod";
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  role: text("role").notNull().default("user"),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at")
});
var brands = pgTable("brands", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at")
});
var catalogProducts = pgTable("catalog_products", {
  id: serial("id").primaryKey(),
  sku: text("sku").notNull().unique(),
  brandId: integer("brand_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  price: decimal("price"),
  cost: decimal("cost"),
  weight: decimal("weight"),
  dimensions: text("dimensions"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at")
});
var channels = pgTable("channels", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  color: text("color"),
  icon: text("icon"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at")
});
var carriers = pgTable("carriers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  apiEndpoint: text("api_endpoint"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at")
});
var orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderId: text("order_id").notNull().unique(),
  channelId: integer("channel_id").notNull(),
  customerName: text("customer_name"),
  totalAmount: decimal("total_amount"),
  isManaged: boolean("is_managed").notNull().default(false),
  hasTicket: boolean("has_ticket").notNull().default(false),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at")
});
var tickets = pgTable("tickets", {
  id: serial("id").primaryKey(),
  ticketNumber: text("ticket_number").notNull().unique(),
  orderId: integer("order_id").notNull(),
  status: text("status").notNull().default("open"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at")
});
var shippingRules = pgTable("shipping_rules", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  condition: text("condition").notNull(),
  carrierId: integer("carrier_id").notNull(),
  service: text("service"),
  cost: decimal("cost"),
  estimatedDays: integer("estimated_days"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at")
});
var notes = pgTable("notes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at")
});
var insertOrderSchema = z.object({
  orderId: z.string().min(1, "El ID de la orden es obligatorio"),
  channelId: z.number().int().positive("El ID del canal debe ser un n\xFAmero positivo"),
  customerName: z.string().optional(),
  totalAmount: z.string().optional(),
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
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}
var pool = new Pool({
  connectionString: process.env.DATABASE_URL
});
var db = drizzle(pool, { schema: schema_exports });

// server/storage.ts
import { eq, and, desc, asc, sql, count } from "drizzle-orm";
var DatabaseStorage = class {
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  async getUserByEmail(email) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }
  async createUser(insertUser) {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  async updateUser(id, updates) {
    const [user] = await db.update(users).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(users.id, id)).returning();
    return user;
  }
  async getAllUsers() {
    return await db.select().from(users).orderBy(asc(users.email));
  }
  async getBrands() {
    return await db.select().from(brands).where(eq(brands.isActive, true)).orderBy(asc(brands.name));
  }
  async getBrand(id) {
    const [brand] = await db.select().from(brands).where(eq(brands.id, id));
    return brand;
  }
  async createBrand(brand) {
    const [newBrand] = await db.insert(brands).values(brand).returning();
    return newBrand;
  }
  async updateBrand(id, updates) {
    const [brand] = await db.update(brands).set(updates).where(eq(brands.id, id)).returning();
    return brand;
  }
  async getCatalogProducts(brandId) {
    const query = db.select().from(catalogProducts);
    if (brandId) {
      return await query.where(eq(catalogProducts.brandId, brandId)).orderBy(asc(catalogProducts.sku));
    }
    return await query.orderBy(asc(catalogProducts.sku));
  }
  async createCatalogProduct(product) {
    const [newProduct] = await db.insert(catalogProducts).values(product).returning();
    return newProduct;
  }
  async updateCatalogProduct(id, updates) {
    const [product] = await db.update(catalogProducts).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(catalogProducts.id, id)).returning();
    return product;
  }
  async getChannels() {
    return await db.select().from(channels).where(eq(channels.isActive, true)).orderBy(asc(channels.name));
  }
  async getChannel(id) {
    const [channel] = await db.select().from(channels).where(eq(channels.id, id));
    return channel;
  }
  async createChannel(channel) {
    const [newChannel] = await db.insert(channels).values(channel).returning();
    return newChannel;
  }
  async getCarriers() {
    return await db.select().from(carriers).where(eq(carriers.isActive, true)).orderBy(asc(carriers.name));
  }
  async getCarrier(id) {
    const [carrier] = await db.select().from(carriers).where(eq(carriers.id, id));
    return carrier;
  }
  async createCarrier(carrier) {
    const [newCarrier] = await db.insert(carriers).values(carrier).returning();
    return newCarrier;
  }
  async getOrders(filters) {
    let query = db.select().from(orders);
    const conditions = [];
    if (filters?.channelId) {
      conditions.push(eq(orders.channelId, filters.channelId));
    }
    if (filters?.managed !== void 0) {
      conditions.push(eq(orders.isManaged, filters.managed));
    }
    if (filters?.hasTicket !== void 0) {
      conditions.push(eq(orders.hasTicket, filters.hasTicket));
    }
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    return await query.orderBy(desc(orders.createdAt));
  }
  async getOrder(id) {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order;
  }
  async createOrder(order) {
    const [newOrder] = await db.insert(orders).values(order).returning();
    return newOrder;
  }
  async updateOrder(id, updates) {
    const [order] = await db.update(orders).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(orders.id, id)).returning();
    return order;
  }
  async getOrdersByCustomer(customerName) {
    return await db.select().from(orders).where(eq(orders.customerName, customerName)).orderBy(desc(orders.createdAt));
  }
  async getTickets() {
    return await db.select().from(tickets).orderBy(desc(tickets.createdAt));
  }
  async getTicket(id) {
    const [ticket] = await db.select().from(tickets).where(eq(tickets.id, id));
    return ticket;
  }
  async createTicket(ticket) {
    const [newTicket] = await db.insert(tickets).values(ticket).returning();
    return newTicket;
  }
  async updateTicket(id, updates) {
    const [ticket] = await db.update(tickets).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(tickets.id, id)).returning();
    return ticket;
  }
  async getShippingRules() {
    return await db.select().from(shippingRules).where(eq(shippingRules.isActive, true));
  }
  async createShippingRule(rule) {
    const [newRule] = await db.insert(shippingRules).values(rule).returning();
    return newRule;
  }
  async getNotes(userId) {
    const query = db.select().from(notes);
    if (userId) {
      return await query.where(eq(notes.userId, userId)).orderBy(desc(notes.createdAt));
    }
    return await query.orderBy(desc(notes.createdAt));
  }
  async createNote(note) {
    const [newNote] = await db.insert(notes).values(note).returning();
    return newNote;
  }
  async deleteNote(id) {
    await db.delete(notes).where(eq(notes.id, id));
  }
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
    return {
      totalOrders,
      unmanaged,
      totalSales,
      delayed,
      channelStats
    };
  }
};
var storage = new DatabaseStorage();

// server/routes.ts
import bcrypt from "bcrypt";
import session from "express-session";
import MemoryStore from "memorystore";
import { z as z2 } from "zod";
var MemoryStoreSession = MemoryStore(session);
var loginSchema = z2.object({
  email: z2.string().email(),
  password: z2.string().min(1)
});
var requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};
var requireAdmin = async (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const user = await storage.getUser(req.session.userId);
  if (!user || user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};
async function registerRoutes(app2) {
  app2.use(session({
    secret: process.env.SESSION_SECRET || "dev-secret-key",
    resave: false,
    saveUninitialized: false,
    store: new MemoryStoreSession({
      checkPeriod: 864e5
      // prune expired entries every 24h
    }),
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1e3
      // 7 days
    }
  }));
  await initializeDefaultData();
  app2.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      await storage.updateUser(user.id, { lastLogin: /* @__PURE__ */ new Date() });
      req.session.userId = user.id;
      res.json({ user: { id: user.id, email: user.email, role: user.role } });
    } catch (error) {
      res.status(400).json({ message: "Invalid request data" });
    }
  });
  app2.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ message: "Logged out" });
    });
  });
  app2.get("/api/auth/user", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ id: user.id, email: user.email, role: user.role });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  app2.get("/api/dashboard/metrics", requireAuth, async (req, res) => {
    try {
      const metrics = await storage.getDashboardMetrics();
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch metrics" });
    }
  });
  app2.get("/api/orders", requireAuth, async (req, res) => {
    try {
      const { channelId, managed, hasTicket } = req.query;
      const filters = {};
      if (channelId) filters.channelId = channelId;
      if (managed !== void 0) filters.managed = managed === "true";
      if (hasTicket !== void 0) filters.hasTicket = hasTicket === "true";
      const orders2 = await storage.getOrders(filters);
      res.json(orders2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });
  app2.get("/api/orders/:id", requireAuth, async (req, res) => {
    try {
      const order = await storage.getOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      res.json(order);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch order" });
    }
  });
  app2.post("/api/orders", requireAuth, async (req, res) => {
    try {
      const orderData = insertOrderSchema.parse(req.body);
      const order = await storage.createOrder(orderData);
      res.status(201).json(order);
    } catch (error) {
      res.status(400).json({ message: "Invalid order data" });
    }
  });
  app2.patch("/api/orders/:id", requireAuth, async (req, res) => {
    try {
      const updates = req.body;
      const order = await storage.updateOrder(req.params.id, updates);
      res.json(order);
    } catch (error) {
      res.status(400).json({ message: "Failed to update order" });
    }
  });
  app2.get("/api/tickets", requireAuth, async (req, res) => {
    try {
      const tickets2 = await storage.getTickets();
      res.json(tickets2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tickets" });
    }
  });
  app2.post("/api/tickets", requireAuth, async (req, res) => {
    try {
      const ticketData = insertTicketSchema.parse(req.body);
      const ticketNumber = `TK-${(/* @__PURE__ */ new Date()).getFullYear()}-${String(Date.now()).slice(-6)}`;
      const ticket = await storage.createTicket({
        ...ticketData,
        ticketNumber
      });
      res.status(201).json(ticket);
    } catch (error) {
      res.status(400).json({ message: "Invalid ticket data" });
    }
  });
  app2.get("/api/channels", requireAuth, async (req, res) => {
    try {
      const channels2 = await storage.getChannels();
      res.json(channels2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch channels" });
    }
  });
  app2.get("/api/brands", requireAuth, async (req, res) => {
    try {
      const brands2 = await storage.getBrands();
      res.json(brands2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch brands" });
    }
  });
  app2.get("/api/carriers", requireAuth, async (req, res) => {
    try {
      const carriers2 = await storage.getCarriers();
      res.json(carriers2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch carriers" });
    }
  });
  app2.get("/api/notes", requireAuth, async (req, res) => {
    try {
      const notes2 = await storage.getNotes(req.session.userId);
      res.json(notes2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch notes" });
    }
  });
  app2.post("/api/notes", requireAuth, async (req, res) => {
    try {
      const noteData = insertNoteSchema.parse({
        ...req.body,
        userId: req.session.userId
      });
      const note = await storage.createNote(noteData);
      res.status(201).json(note);
    } catch (error) {
      res.status(400).json({ message: "Invalid note data" });
    }
  });
  app2.delete("/api/notes/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteNote(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete note" });
    }
  });
  app2.get("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const users2 = await storage.getAllUsers();
      res.json(users2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });
  app2.get("/api/integrations/shopify/sync", requireAuth, async (req, res) => {
    res.json({ message: "Shopify sync initiated", status: "success" });
  });
  app2.get("/api/integrations/mercadolibre/simulate", requireAuth, async (req, res) => {
    res.json({ message: "MercadoLibre simulation", status: "pending" });
  });
  const httpServer = createServer(app2);
  return httpServer;
}
async function initializeDefaultData() {
  try {
    const logisticUser = await storage.getUserByEmail("logistica@empresa.com");
    if (!logisticUser) {
      const hashedPassword = await bcrypt.hash("123456", 10);
      await storage.createUser({
        email: "logistica@empresa.com",
        password: hashedPassword,
        firstName: "Usuario",
        lastName: "Log\xEDstica",
        role: "user"
      });
    }
    const adminUser = await storage.getUserByEmail("admin@empresa.com");
    if (!adminUser) {
      const hashedPassword = await bcrypt.hash("admin123", 10);
      await storage.createUser({
        email: "admin@empresa.com",
        password: hashedPassword,
        firstName: "Admin",
        lastName: "Sistema",
        role: "admin"
      });
    }
    const channels2 = await storage.getChannels();
    if (channels2.length === 0) {
      await storage.createChannel({
        code: "WW",
        name: "WW Channel",
        color: "#4CAF50",
        icon: "fas fa-globe"
      });
      await storage.createChannel({
        code: "CT",
        name: "CT Channel",
        color: "#FF9800",
        icon: "fas fa-store"
      });
      await storage.createChannel({
        code: "MGL",
        name: "MGL Channel",
        color: "#2196F3",
        icon: "fas fa-shopping-cart"
      });
    }
    const carriers2 = await storage.getCarriers();
    if (carriers2.length === 0) {
      await storage.createCarrier({
        name: "Estafeta",
        code: "ESTAFETA",
        apiEndpoint: "https://api.estafeta.com"
      });
      await storage.createCarrier({
        name: "DHL",
        code: "DHL",
        apiEndpoint: "https://api.dhl.com"
      });
      await storage.createCarrier({
        name: "Express PL",
        code: "EXPRESS_PL",
        apiEndpoint: "https://api.expresspl.com"
      });
    }
    const brands2 = await storage.getBrands();
    if (brands2.length === 0) {
      await storage.createBrand({
        name: "ELEGATE",
        code: "ELG"
      });
    }
    console.log("Default data initialized successfully");
  } catch (error) {
    console.error("Failed to initialize default data:", error);
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
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    // Plugins de Replit (cartographer) solo en Replit;
    // localmente NO los cargues:
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
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
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({ port, host: "0.0.0.0" }, () => {
    log(`serving on port ${port}`);
  });
})();
