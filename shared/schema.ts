// shared/schema.ts — Esquema de base de datos con Drizzle (comentado en español)
// NOTA: Mantengo los mismos exports originales para no romper imports existentes.
//       Además agrego alias en español (usuarios, marcas, etc.) por claridad.

import { pgTable, serial, text, boolean, timestamp, integer, decimal, date } from "drizzle-orm/pg-core";
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

// === ÓRDENES MEJORADAS (Shopify Integration) ===
// Registro de órdenes integradas con datos completos de Shopify
// === ÓRDENES (Shopify Integration) ===
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),

  // Datos de cliente / envío
  customerFirstName: text("customer_first_name"),
  customerLastName: text("customer_last_name"),

  shipName: text("ship_name"),
  shipPhone: text("ship_phone"),
  shipAddress1: text("ship_address1"),
  shipCity: text("ship_city"),
  shipProvince: text("ship_province"),
  shipCountry: text("ship_country"),
  shipZip: text("ship_zip"),

  // Compatibilidad / legacy
  orderId: text("order_id").notNull().unique(),    // si lo usas como ID externo legible
  channelId: integer("channel_id").notNull(),
  customerName: text("customer_name"),
  totalAmount: decimal("total_amount"),
  isManaged: boolean("is_managed").notNull().default(false),
  hasTicket: boolean("has_ticket").notNull().default(false),
  status: text("status").notNull().default("pending"),

  // Identificación Shopify
  idShopify: text("id_shopify").notNull(),
  shopId: integer("shop_id").notNull(),

  // Datos generales de la orden
  name: text("name"),
  orderNumber: text("order_number"),
  financialStatus: text("financial_status"),
  fulfillmentStatus: text("fulfillment_status"),
  currency: text("currency").default("MXN"),
  subtotalPrice: decimal("subtotal_price"),
  customerEmail: text("customer_email"),
  contactPhone: text("contact_phone"),

  // Notas & tags
  orderNote: text("order_note"),
  tags: text("tags").array(),

  // Fechas nativas de Shopify (timestamptz)
  shopifyCreatedAt: timestamp("shopify_created_at", { withTimezone: true }),
  shopifyUpdatedAt: timestamp("shopify_updated_at", { withTimezone: true }),
  shopifyProcessedAt: timestamp("shopify_processed_at", { withTimezone: true }),
  shopifyClosedAt: timestamp("shopify_closed_at", { withTimezone: true }),
  shopifyCancelledAt: timestamp("shopify_cancelled_at", { withTimezone: true }),

  // Motivo de cancelación (Shopify)
  cancelReason: text("cancel_reason"),

  // Timestamps internos de tu app
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

// === TICKETS ===
// Tickets vinculados a órdenes (soporte/gestión)
export const tickets = pgTable("tickets", {
  id: serial("id").primaryKey(),
  ticketNumber: text("ticket_number").notNull().unique(), // folio del ticket
  orderId: integer("order_id").notNull(),                 // referencia a orders.id
  status: text("status").notNull().default("open"),      // estado del ticket
  notes: text("notes"),                                    // notas libres
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
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
  content: text("content").notNull(), // contenido de la nota
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  userId: integer("user_id").references(() => users.id).nullish(),
});
export type DBNote = typeof notes.$inferSelect;
export type InsertNote = typeof notes.$inferInsert;

// Tipo de nota expuesto en la API/cliente
export interface Note {
  id: number;
  content: string;
  created_at: string;
  updated_at: string;
  user_id: number | null;
}

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
  idShopify: text("id_shopify").notNull(),        // ID de variante en Shopify
  productId: integer("product_id").notNull(),     // referencia a products.id
  sku: text("sku"),                               // SKU de la variante
  price: decimal("price"),                        // precio de venta
  compareAtPrice: decimal("compare_at_price"),    // precio de comparación
  barcode: text("barcode"),                       // código de barras
  inventoryQty: integer("inventory_qty"),         // cantidad en inventario
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});
export type Variant = typeof variants.$inferSelect;
export type InsertVariant = typeof variants.$inferInsert;

// === ÍTEMS DE ORDEN ===
// Líneas de orden (productos dentro de una orden)
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),         // referencia a orders.id
  // en schema de items
  shopifyProductId: text("shopify_product_id"),
  shopifyVariantId: text("shopify_variant_id"),
  productId: integer("product_id"),               // referencia a products.id (opcional)
  variantId: integer("variant_id"),               // referencia a variants.id (opcional)
  sku: text("sku"),                               // SKU del producto
  quantity: integer("quantity").notNull(),        // cantidad
  price: decimal("price"),                        // precio unitario
  createdAt: timestamp("created_at").defaultNow(),
});
export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = typeof orderItems.$inferInsert;

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
export const insertOrderSchema = z.object({
  // Campos originales
  orderId: z.string().min(1, "El ID de la orden es obligatorio"),
  channelId: z.number().int().positive("El ID del canal debe ser un número positivo"),
  customerName: z.string().optional(),
  totalAmount: z.string().optional(), // se acepta como string para evitar issues de decimal
  isManaged: z.boolean().optional().default(false),
  hasTicket: z.boolean().optional().default(false),
  status: z.string().default("pending"),

  // Nuevos campos Shopify
  idShopify: z.string().min(1, "ID de Shopify requerido"),
  shopId: z.number().int().min(1).max(2, "Shop ID debe ser 1 o 2"),
  name: z.string().optional(),
  orderNumber: z.string().optional(),
  financialStatus: z.string().optional(),
  fulfillmentStatus: z.string().optional(),
  currency: z.string().default("MXN"),
  subtotalPrice: z.string().optional(),
  customerEmail: z.string().email().optional(),
  tags: z.array(z.string()).optional().default([]),
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
  ticketNumber: z.string().min(1, "El número de ticket es obligatorio"),
  orderId: z.number().int().positive("El ID de la orden debe ser un número positivo"),
  status: z.string().default("open"),
  notes: z.string().optional(),
});

export const insertNoteSchema = z.object({
  content: z.string().min(1, "El contenido es obligatorio"),
  userId: z.number().int().optional(),
});

export interface DashboardMetrics {
  totalOrders: number;
  totalSales: number;
  managed: number;
  unmanaged: number;
  returned: number;
  byChannel: Array<{ channelId: number; channelName: string; count: number }>;
  byShop: Array<{ shopId: number; shopName?: string | null; count: number }>;
}

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
  DBNote as Nota,
  InsertNote as InsertarNota,
  Note,
};
