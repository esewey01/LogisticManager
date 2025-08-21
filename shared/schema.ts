// shared/schema.ts — Esquema de base de datos con Drizzle (comentado en español)
// NOTA: Mantengo los mismos exports originales para no romper imports existentes.
//       Además agrego alias en español (usuarios, marcas, etc.) por claridad.

import { pgTable, serial, text, boolean, timestamp, integer, decimal, date, bigint, json, varchar, jsonb } from "drizzle-orm/pg-core";
import { z } from "zod";

// === USUARIOS ===
// Tabla de usuarios del sistema: credenciales básicas y metadatos
export const users = pgTable("users", {
  id: serial("id").primaryKey(),                 // ID autoincremental (PK)
  email: text("email").notNull().unique(),        // correo único (login)
  password: text("password").notNull(),          // hash de contraseña
  firstName: text("first_name"),                 // nombre (opcional)
  lastName: text("last_name"),                   // apellido (opcional)
  role: text("role").notNull().default("user"), // rol: user | admin
  lastLogin: timestamp("last_login"),            // último acceso
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});
export type User = typeof users.$inferSelect;       // tipo de lectura (SELECT)
export type InsertUser = typeof users.$inferInsert; // tipo de inserción (INSERT)

// === MARCAS ===
// Catálogo de marcas (ej. ELEGATE)
export const brands = pgTable("brands", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),                  // nombre visible
  code: text("code").notNull().unique(),         // código corto único
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});
export type Brand = typeof brands.$inferSelect;
export type InsertBrand = typeof brands.$inferInsert;

// === PRODUCTOS DE CATÁLOGO ===
// Productos que pertenecen a una marca; valores económicos opcionales
export const catalogProducts = pgTable("catalog_products", {
  id: serial("id").primaryKey(),
  sku: text("sku").notNull().unique(),           // SKU único
  brandId: integer("brand_id").notNull(),        // referencia a brands.id (no FK explícita aquí)
  nombreProducto: text("name").notNull(),                  // nombre del producto
  description: text("description"),              // descripción (opcional)
  price: decimal("price"),                        // precio de venta (opcional)
  cost: decimal("cost"),                          // costo (opcional)
  weight: decimal("weight"),                      // peso (opcional)
  dimensions: text("dimensions"),                 // dimensiones (opcional)
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});
export type CatalogProduct = typeof catalogProducts.$inferSelect;
export type InsertCatalogProduct = typeof catalogProducts.$inferInsert;

// === CATÁLOGO DE PRODUCTOS (Tabla Real) ===
// Catálogo de productos interno con estructura real de la DB
export const catalogoProductos = pgTable("catalogo_productos", {
  skuInterno: text("sku_interno").primaryKey().unique(),     // SKU interno único
  sku: text("sku"),                                          // SKU externo
  nombreProducto: text("nombre_producto"),                   // nombre del producto
  marca: text("marca"),                                      // marca
  modelo: text("modelo"),                                    // modelo
  categoria: text("categoria"),                              // categoría
  marcaProducto: text("marca_producto"),                     // marca del producto
  variante: text("variante"),                                // variante
  codigoBarras: text("codigo_barras"),                       // código de barras
  foto: text("foto"),                                        // URL de la foto
  peso: decimal("peso"),                                     // peso
  alto: decimal("alto"),                                     // altura
  ancho: decimal("ancho"),                                   // ancho
  largo: decimal("largo"),                                   // largo
  condicion: text("condicion"),                              // condición
  stock: integer("stock"),                                   // stock disponible
  costo: decimal("costo"),                                   // costo
  situacion: text("situacion"),                              // situación
});
export type CatalogoProducto = typeof catalogoProductos.$inferSelect;
export type InsertCatalogoProducto = typeof catalogoProductos.$inferInsert;

// === CANALES ===
// Canales de venta (WW, CT, MGL, etc.)
export const channels = pgTable("channels", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),          // código corto único del canal
  name: text("name").notNull(),                   // nombre del canal
  color: text("color"),                           // color para UI (hex)
  icon: text("icon"),                             // icono para UI (clase o nombre)
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});
export type Channel = typeof channels.$inferSelect;
export type InsertChannel = typeof channels.$inferInsert;

// === PAQUETERÍAS ===
// Transportistas/Carriers (DHL, Estafeta, etc.)
export const carriers = pgTable("carriers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),                   // nombre visible
  code: text("code").notNull().unique(),          // código único (ej. DHL)
  apiEndpoint: text("api_endpoint"),              // endpoint API (si aplica)
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});
export type Carrier = typeof carriers.$inferSelect;
export type InsertCarrier = typeof carriers.$inferInsert;

// === ÓRDENES ===
// Estructura basada en el esquema real proporcionado
export const orders = pgTable("orders", {
  id: bigint("id", { mode: "bigint" }).primaryKey(),        // BIGSERIAL PRIMARY KEY
  shopId: integer("shop_id").notNull(),                     // INT NOT NULL ← importante
  orderId: text("order_id").notNull(),                      // TEXT NOT NULL (ID externo de la plataforma)
  // UNIQUE (shop_id, order_id) ← se maneja en la DB
  // channelId: integer("channel_id"),                      // No existe en la DB real, se usa shop_id
  customerName: text("customer_name"),                      // TEXT
  customerEmail: text("customer_email"),                    // TEXT
  subtotalPrice: decimal("subtotal_price"),                 // NUMERIC
  totalAmount: decimal("total_amount"),                     // NUMERIC
  currency: text("currency"),                               // TEXT
  financialStatus: text("financial_status"),                // TEXT
  fulfillmentStatus: text("fulfillment_status"),            // TEXT
  tags: text("tags").array(),                               // TEXT[]
  noteAttributes: json("note_attributes"),                  // JSONB
  createdAt: timestamp("created_at"),                       // TIMESTAMP
  shopifyCreatedAt: timestamp("shopify_created_at", { withTimezone: true }), // TIMESTAMPTZ
  shopifyUpdatedAt: timestamp("shopify_updated_at", { withTimezone: true }), // TIMESTAMPTZ
  shopifyProcessedAt: timestamp("shopify_processed_at", { withTimezone: true }), // TIMESTAMPTZ
  shopifyClosedAt: timestamp("shopify_closed_at", { withTimezone: true }), // TIMESTAMPTZ
  shopifyCancelledAt: timestamp("shopify_cancelled_at", { withTimezone: true }), // TIMESTAMPTZ
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

// === ORDER_ITEMS ===
// Items de órdenes basado en el esquema real
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),                          // SERIAL PRIMARY KEY
  orderId: bigint("order_id", { mode: "bigint" }).notNull(), // BIGINT NOT NULL (FK a orders.id con ON DELETE CASCADE)
  sku: text("sku"),                                       // TEXT
  quantity: integer("quantity").notNull(),                // INT NOT NULL
  price: decimal("price"),                                // NUMERIC
  shopifyProductId: text("shopify_product_id"),           // TEXT
  shopifyVariantId: text("shopify_variant_id"),           // TEXT
});
export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = typeof orderItems.$inferInsert;

// === TICKETS ===
// Tickets basados en el esquema real
export const tickets = pgTable("tickets", {
  id: serial("id").primaryKey(),                          // SERIAL PRIMARY KEY
  ticketNumber: text("ticket_number").unique().notNull(), // TEXT UNIQUE NOT NULL
  orderId: integer("order_id").notNull(),                 // INTEGER NOT NULL (FK a orders.id con ON DELETE CASCADE)
  status: text("status").notNull().default('open'),       // TEXT NOT NULL DEFAULT 'open'
  notes: text("notes"),                                   // TEXT
  createdAt: timestamp("created_at").defaultNow(),        // TIMESTAMP DEFAULT now()
  updatedAt: timestamp("updated_at"),                     // TIMESTAMP
});
export type Ticket = typeof tickets.$inferSelect;
export type InsertTicket = typeof tickets.$inferInsert;

// === REGLAS DE ENVÍO ===
// Reglas para seleccionar paquetería/servicio según condiciones
export const shippingRules = pgTable("shipping_rules", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),                   // nombre de la regla
  condition: text("condition").notNull(),         // expresión/condición (definición libre)
  carrierId: integer("carrier_id").notNull(),     // referencia a carriers.id
  service: text("service"),                       // nombre del servicio (si aplica)
  cost: decimal("cost"),                          // costo estimado
  estimatedDays: integer("estimated_days"),       // días estimados de entrega
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});
export type ShippingRule = typeof shippingRules.$inferSelect;
export type InsertShippingRule = typeof shippingRules.$inferInsert;

// === NOTAS ===
// Notas privadas por usuario (cuaderno personal)
export const notes = pgTable("notes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),          // usuario propietario de la nota
  content: text("content").notNull(),             // contenido de la nota
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export type Note = typeof notes.$inferSelect;
export type InsertNote = typeof notes.$inferInsert;

// === PRODUCTOS SHOPIFY ===
// Productos sincronizados desde Shopify por tienda
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  idShopify: text("id_shopify").notNull(),        // ID de Shopify
  shopId: integer("shop_id").notNull(),           // 1 o 2 (tienda)
  title: text("title").notNull(),                 // título del producto
  vendor: text("vendor"),                         // proveedor/marca
  productType: text("product_type"),              // tipo de producto
  status: text("status").notNull().default("active"), // active, draft
  tags: text("tags").array(),                     // etiquetas (array)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});
export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

// Productos externos
export const externalProducts = pgTable("external_products", {
  id: serial("id").primaryKey(),
  sku: text("sku").notNull().unique(),
  prod: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
export type ExternalProduct = typeof externalProducts.$inferSelect;
export type InsertExternalProduct = typeof externalProducts.$inferInsert;

// === VARIANTES DE PRODUCTOS ===
// Variantes de productos Shopify (SKU, precio, inventario)
export const variants = pgTable("variants", {
  id: serial("id").primaryKey(),
  productId: integer("product_id"),               // referencia a products.id
  idShopify: text("id_shopify"),                  // ID de variante en Shopify
  sku: text("sku"),                               // SKU de la variante
  price: decimal("price"),                        // precio de venta
  compareAtPrice: decimal("compare_at_price"),    // precio de comparación
  barcode: text("barcode"),                       // código de barras
  inventoryQty: integer("inventory_qty"),         // cantidad en inventario
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});
export type Variant = typeof variants.$inferSelect;
export type InsertVariant = typeof variants.$inferInsert;



// === COMBOS DE PRODUCTOS ===
// Relación para productos combo (un producto que contiene otros)
export const productComboItems = pgTable("product_combo_items", {
  id: serial("id").primaryKey(),
  productComboId: integer("product_combo_id").notNull(), // producto que es combo
  productSimpleId: integer("product_simple_id").notNull(), // producto componente
  qty: integer("qty").notNull().default(1),              // cantidad del componente
  createdAt: timestamp("created_at").defaultNow(),
});
export type ProductComboItem = typeof productComboItems.$inferSelect;
export type InsertProductComboItem = typeof productComboItems.$inferInsert;

// === ESQUEMAS ZOD (validación en rutas) ===
// Se usan para validar cuerpo de peticiones en endpoints.
// Schema corregido para inserción de órdenes - compatible con estructura real de DB
export const insertOrderSchema = z.object({
  // ID requerido (bigint)
  id: z.union([z.bigint(), z.string(), z.number()]).optional(),
  
  // Campos obligatorios según DB
  shopId: z.number().int().min(1).max(2),
  orderId: z.string().min(1, "Order ID es requerido"),
  
  // Campos opcionales de cliente
  customerName: z.string().optional(),
  customerEmail: z.string().optional(),
  
  // Campos de precio
  subtotalPrice: z.string().optional(),
  totalAmount: z.string().optional(),
  currency: z.string().default("MXN"),
  
  // Estados
  financialStatus: z.string().optional(),
  fulfillmentStatus: z.string().optional(),
  
  // Metadatos
  tags: z.array(z.string()).default([]),
  noteAttributes: z.any().optional(),
  
  // Timestamps Shopify
  createdAt: z.date().optional(),
  shopifyCreatedAt: z.date().optional(),
  shopifyUpdatedAt: z.date().optional(),
  shopifyProcessedAt: z.date().optional(),
  shopifyClosedAt: z.date().optional(),
  shopifyCancelledAt: z.date().optional(),
}).transform((data) => {
  // Transformar ID a bigint si es necesario
  if (data.id && typeof data.id !== 'bigint') {
    data.id = typeof data.id === 'string' ? BigInt(data.id) : BigInt(data.id);
  }
  return data;
});

export const insertProductSchema = z.object({
  idShopify: z.string().min(1, "ID de Shopify requerido"),
  shopId: z.number().int().min(1).max(2, "Shop ID debe ser 1 o 2"),
  title: z.string().min(1, "Título requerido"),
  vendor: z.string().optional(),
  productType: z.string().optional(),
  status: z.enum(["active", "draft"]).default("active"),
  tags: z.array(z.string()).optional().default([]),
});

export const insertVariantSchema = z.object({
  idShopify: z.string().min(1, "ID de Shopify requerido"),
  productId: z.number().int().positive("Product ID requerido"),
  sku: z.string().optional(),
  price: z.string().optional(),
  compareAtPrice: z.string().optional(),
  barcode: z.string().optional(),
  inventoryQty: z.number().int().optional(),
});

export const insertTicketSchema = z.object({
  ticketNumber: z.string().optional(),
  orderId: z.number().int().positive("El ID de la orden debe ser un número positivo"),
  status: z.string().default("open"),
  notes: z.string().optional(),
});

export const createBulkTicketsSchema = z.object({
  orderIds: z.array(z.union([z.number().int().positive(), z.string().min(1)])).min(1, "Debe seleccionar al menos una orden"),
  notes: z.string().optional(),
});

export const insertNoteSchema = z.object({
  text: z.string().min(1, "El contenido es obligatorio"),
  date: z.string().optional(),
});

export interface NoteDTO {
  id: number;
  text: string;
  createdAt: string;
  author?: string | null;
}

export interface DashboardMetrics {
  totalOrders: number;
  totalSales: number;
  unmanaged: number;
  managed: number;
  byChannel: Array<{ channelId: number; channelName: string; count: number }>;
  byShop: Array<{ shopId: number; shopName?: string | null; count: number }>;
}

// Product links para conciliación Catálogo ↔ Shopify
export const productLinks = pgTable("product_links", {
  id: serial("id").primaryKey(),
  catalogoSku: varchar("catalogo_sku", { length: 100 }).notNull(),
  shopifyVariantId: varchar("shopify_variant_id", { length: 100 }),
  shopifyProductId: varchar("shopify_product_id", { length: 100 }),
  variantId: integer("variant_id").references(() => variants.id),
  productId: integer("product_id").references(() => products.id),
  matchStatus: varchar("match_status", { length: 20 }).default("pending"), // 'matched', 'conflict', 'missing'
  syncStatus: varchar("sync_status", { length: 20 }).default("pending"), // 'synced', 'error', 'pending'
  errorMessage: text("error_message"),
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: integer("created_by").references(() => users.id),
  updatedBy: integer("updated_by").references(() => users.id),
});

// Jobs queue para sincronización con Shopify
export const shopifyJobs = pgTable("shopify_jobs", {
  id: serial("id").primaryKey(),
  shopId: integer("shop_id").notNull(),
  jobType: varchar("job_type", { length: 50 }).notNull(), // 'update_product', 'update_variant', 'create_product'
  shopifyProductId: varchar("shopify_product_id", { length: 100 }),
  shopifyVariantId: varchar("shopify_variant_id", { length: 100 }),
  payload: jsonb("payload").notNull(),
  status: varchar("status", { length: 20 }).default("pending"), // 'pending', 'processing', 'completed', 'failed'
  attempts: integer("attempts").default(0),
  maxAttempts: integer("max_attempts").default(3),
  errorMessage: text("error_message"),
  processedAt: timestamp("processed_at"),
  scheduledFor: timestamp("scheduled_for").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type ProductLink = typeof productLinks.$inferSelect;
export type InsertProductLink = typeof productLinks.$inferInsert;

export type ShopifyJob = typeof shopifyJobs.$inferSelect;
export type InsertShopifyJob = typeof shopifyJobs.$inferInsert;

// === Alias en español (opcionales) ===
// Permiten importar en español sin romper los nombres originales.
export {
  users as usuarios,
  brands as marcas,
  catalogProducts as productosCatalogo,
  channels as canales,
  carriers as paqueterias,
  orders as ordenes,
  tickets as ticketsTabla,
  shippingRules as reglasEnvio,
  notes as notas,
};

export type {
  User as Usuario,
  InsertUser as InsertarUsuario,
  Brand as Marca,
  InsertBrand as InsertarMarca,
  CatalogProduct as ProductoCatalogo,
  InsertCatalogProduct as InsertarProductoCatalogo,
  Channel as Canal,
  InsertChannel as InsertarCanal,
  Carrier as Paqueteria,
  InsertCarrier as InsertarPaqueteria,
  Order as Orden,
  InsertOrder as InsertarOrden,
  Ticket as TicketTipo,
  InsertTicket as InsertarTicket,
  ShippingRule as ReglaEnvio,
  InsertShippingRule as InsertarReglaEnvio,
  Note as Nota,
  InsertNote as InsertarNota,
};
