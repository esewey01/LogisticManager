// shared/schema.ts — Esquema de base de datos con Drizzle ALINEADO a esquema_bd.txt
// Español: este archivo refleja exactamente las tablas y columnas definidas en tu SQL real.
// Nota: Mantengo los mismos exports públicos (tipos e identificadores) donde aplica
// y añado índices/uniques conforme al dump. Tablas extra no presentes en la BD
// fueron removidas para evitar desalineaciones. Si tu app las usa, crea migraciones.

import {
  pgTable,
  serial,
  bigserial,
  text,
  boolean,
  timestamp,
  integer,
  decimal,
  bigint,
  varchar,
  jsonb,
} from "drizzle-orm/pg-core";
import { index, uniqueIndex } from "drizzle-orm/pg-core";

// =========================================================
// USERS
// =========================================================
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  role: text("role").notNull().default("user"),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// =========================================================
// BRANDS
// =========================================================
export const brands = pgTable(
  "brands",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    code: text("code").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at"),
  },
  (t) => ({
    uxCode: uniqueIndex("brands_code_unique").on(t.code),
  }),
);
export type Brand = typeof brands.$inferSelect;
export type InsertBrand = typeof brands.$inferInsert;

// =========================================================
// CARRIERS
// =========================================================
export const carriers = pgTable(
  "carriers",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    code: text("code").notNull(),
    apiEndpoint: text("api_endpoint"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at"),
  },
  (t) => ({
    uxCode: uniqueIndex("carriers_code_unique").on(t.code),
  }),
);
export type Carrier = typeof carriers.$inferSelect;
export type InsertCarrier = typeof carriers.$inferInsert;

// =========================================================
// LOGISTIC SERVICES (Servicios de logística)
// =========================================================
// Nota importante:
// - En la BD real, la columna es "active" (no "is_active").
// - Mapeamos a la propiedad TS "active" para evitar confusiones y alinear snake_case -> camelCase.
export const logisticServices = pgTable(
  "logistic_services",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    code: text("code").notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    // usa el nombre "oficial" de la BD para evitar duplicados
    uxCode: uniqueIndex("logistic_services_code_key").on(t.code),
  }),
);

export type LogisticService = typeof logisticServices.$inferSelect;
export type InsertLogisticService = typeof logisticServices.$inferInsert;

// =========================================================
// SERVICE_CARRIERS (relación servicio-paquetería)
// =========================================================
export const serviceCarriers = pgTable(
  "service_carriers",
  {
    serviceId: integer("service_id").notNull()
      .references(() => logisticServices.id, { onDelete: 'cascade' }),
    carrierId: integer("carrier_id").notNull()
      .references(() => carriers.id, { onDelete: 'cascade' }),
  },
  (t) => ({
    // En BD existe como PRIMARY KEY (service_id, carrier_id)
    pk: { columns: [t.serviceId, t.carrierId], name: "service_carriers_pkey" },
  }),
);
export type ServiceCarrier = typeof serviceCarriers.$inferSelect;
export type InsertServiceCarrier = typeof serviceCarriers.$inferInsert;

// =========================================================
// CATALOGO_PRODUCTOS (sin PK explícita en la BD)
// =========================================================
export const catalogoProductos = pgTable("catalogo_productos", {
  sku: text("sku"),
  marca: text("marca"),
  sku_interno: text("sku_interno"),
  codigo_barras: text("codigo_barras"),
  nombre_producto: text("nombre_producto"),
  modelo: text("modelo"),
  categoria: text("categoria"),
  condicion: text("condicion"),
  marca_producto: text("marca_producto"),
  variante: text("variante"),
  largo: decimal("largo"),
  ancho: decimal("ancho"),
  alto: decimal("alto"),
  peso: decimal("peso"),
  foto: text("foto"),
  costo: decimal("costo"),
  stock: integer("stock"),
});
export type CatalogoProducto = typeof catalogoProductos.$inferSelect;
export type InsertCatalogoProducto = typeof catalogoProductos.$inferInsert;

// =========================================================
// ARTICULOS (nuevo catálogo; reemplaza catalogo_productos)
// =========================================================
export const articulos = pgTable("articulos", {
  sku: text("sku"),
  proveedor: text("proveedor"), // antes: marca
  sku_interno: text("sku_interno"),
  codigo_barras: text("codigo_barras"),
  nombre: text("nombre"), // antes: nombre_producto
  descripcion: text("descripcion"),
  modelo: text("modelo"),
  categoria: text("categoria"),
  condicion_producto: text("condicion_producto"), // antes: condicion
  marca_producto: text("marca_producto"),
  tipo_variante: text("tipo_variante"),
  variante: text("variante"),
  largo_cm: decimal("largo_cm"), // antes: largo
  ancho_cm: decimal("ancho_cm"), // antes: ancho
  alto_cm: decimal("alto_cm"),   // antes: alto
  peso_kg: decimal("peso_kg"),    // antes: peso
  peso_volumetrico: decimal("peso_volumetrico"),
  imagen1: text("imagen1"),      // antes: foto
  imagen2: text("imagen2"),
  imagen3: text("imagen3"),
  imagen4: text("imagen4"),
  costo: decimal("costo"),
  stock: integer("stock"),
  status: text("status"), // 'activo' | 'inactivo'
  garantia_meses: integer("garantia_meses"),
  clave_producto_sat: text("clave_producto_sat"),
  unidad_medida_sat: text("unidad_medida_sat"),
  clave_unidad_medida_sat: text("clave_unidad_medida_sat"),
});
export type Articulo = typeof articulos.$inferSelect;
export type InsertArticulo = typeof articulos.$inferInsert;

// =========================================================
// CHANNELS
// =========================================================
export const channels = pgTable(
  "channels",
  {
    id: serial("id").primaryKey(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    color: text("color"),
    icon: text("icon"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at"),
  },
  (t) => ({
    uxCode: uniqueIndex("channels_code_unique").on(t.code),
  }),
);
export type Channel = typeof channels.$inferSelect;
export type InsertChannel = typeof channels.$inferInsert;

// =========================================================
// NOTES
// =========================================================
export const notes = pgTable("notes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"), // en la BD no hay default
});
export type Note = typeof notes.$inferSelect;
export type InsertNote = typeof notes.$inferInsert;

// =========================================================
// ORDERS
// =========================================================
export const orders = pgTable(
  "orders",
  {
    // Cambiado a BIGSERIAL para alinear con la migración SQL a BIGINT.
    // Nota: modo:number para interoperar con el resto del código TS (evitar bigint).
    id: bigserial("id", { mode: "number" }).primaryKey(),
    orderId: text("order_id").notNull(),
    customerName: text("customer_name"),
    totalAmount: decimal("total_amount"),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at").defaultNow(),

    name: text("name"),
    orderNumber: text("order_number"),
    financialStatus: text("financial_status"),
    fulfillmentStatus: text("fulfillment_status"),
    currency: text("currency").default("MXN"),
    subtotalPrice: decimal("subtotal_price"),
    customerEmail: text("customer_email"),
    tags: text("tags").array(),
    shipName: text("ship_name"),
    shipPhone: text("ship_phone"),
    shipAddress1: text("ship_address1"),
    shipCity: text("ship_city"),
    shipProvince: text("ship_province"),
    shipCountry: text("ship_country"),
    shipZip: text("ship_zip"),
    shopifyCreatedAt: timestamp("shopify_created_at", { withTimezone: true }),
    shopifyUpdatedAt: timestamp("shopify_updated_at", { withTimezone: true }),
    shopifyProcessedAt: timestamp("shopify_processed_at", { withTimezone: true }),
    shopifyClosedAt: timestamp("shopify_closed_at", { withTimezone: true }),
    shopifyCancelledAt: timestamp("shopify_cancelled_at", { withTimezone: true }),
    cancelReason: text("cancel_reason"),
    orderNote: text("order_note"),
    noteAttributes: jsonb("note_attributes"),
    shopId: integer("shop_id").references(() => channels.id),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => ({
    // La BD tiene ambos: uniq_shop_order y ux_orders_shop_order (duplicados). Mantener uno
    uxShopOrder: uniqueIndex("ux_orders_shop_order").on(t.shopId, t.orderId),
    idxByShopCreated: index("ix_orders_shop_created").on(t.shopId, t.createdAt),
    idxFulfillment: index("orders_fulfillment_status_idx").on(t.fulfillmentStatus),
    idxShopifyCreated: index("orders_shopify_created_idx").on(t.shopifyCreatedAt),
    idxShop: index("ix_orders_shop").on(t.shopId),
    idxChannel: index("ix_orders_channel").on(t.shopId),
    idxOrdersStatus: index("idx_orders_status").on(t.status),
  }),
);
export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

// =========================================================
// ORDER_ITEMS (FK a orders.id, en la BD es BIGINT)
// =========================================================
export const orderItems = pgTable(
  "order_items",
  {
    id: serial("id").primaryKey(),
    // Alineado a BIGINT en BD; mantenemos mode:number para interoperar con el resto del código.
    orderId: bigint("order_id", { mode: "number" }).notNull().references(() => orders.id),
    sku: text("sku"),
    quantity: integer("quantity").notNull(),
    price: decimal("price"),
    createdAt: timestamp("created_at").defaultNow(),
    shopifyProductId: text("shopify_product_id"),
    shopifyVariantId: text("shopify_variant_id"),
    title: text("title"),
    variantTitle: text("variant_title"),
  },
  (t) => ({
    idxOrder: index("idx_order_items_order_id").on(t.orderId),
    idxSku: index("ix_order_items_sku").on(t.sku),
    idxShopProd: index("ix_order_items_shopify_product").on(t.shopifyProductId),
    idxShopVar: index("ix_order_items_shopify_variant").on(t.shopifyVariantId),
  }),
);
export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = typeof orderItems.$inferInsert;

// =========================================================
// PRODUCTS (Shopify)
// =========================================================
export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    idShopify: text("id_shopify").notNull(),
    shopId: integer("shop_id").notNull(),
    title: text("title").notNull(),
    vendor: text("vendor"),
    productType: text("product_type"),
    status: text("status").notNull().default("active"),
    tags: text("tags").array(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at"),
    sku: text("sku"),
  },
  (t) => ({
    idxShop: index("ix_products_shop").on(t.shopId),
    idxShop2: index("products_shop_id_idx").on(t.shopId),
    uxShopShopify: uniqueIndex("ux_products_shop_shopify").on(t.shopId, t.idShopify),
  }),
);
export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

// =========================================================
// VARIANTS (Shopify)
// =========================================================
export const variants = pgTable(
  "variants",
  {
    id: serial("id").primaryKey(),
    idShopify: text("id_shopify").notNull(),
    productId: integer("product_id").notNull().references(() => products.id),
    sku: text("sku"),
    price: decimal("price"),
    compareAtPrice: decimal("compare_at_price"),
    barcode: text("barcode"),
    inventoryQty: integer("inventory_qty"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at"),
    externalVariantId: text("external_variant_id"),
  },
  (t) => ({
    idxProd: index("ix_variants_product").on(t.productId),
    idxShopify: index("ix_variants_shopify").on(t.idShopify),
    idxSku: index("ix_variants_sku").on(t.sku),
  }),
);
export type Variant = typeof variants.$inferSelect;
export type InsertVariant = typeof variants.$inferInsert;

// =========================================================
// PRODUCT_LINKS (conciliación catálogo ↔ Shopify)
// =========================================================
export const productLinks = pgTable("product_links", {
  id: serial("id").primaryKey(),
  catalogoSku: varchar("catalogo_sku", { length: 100 }).notNull(),
  shopifyVariantId: varchar("shopify_variant_id", { length: 100 }),
  shopifyProductId: varchar("shopify_product_id", { length: 100 }),
  variantId: integer("variant_id").references(() => variants.id),
  productId: integer("product_id").references(() => products.id),
  matchStatus: varchar("match_status", { length: 20 }).default("pending"),
  syncStatus: varchar("sync_status", { length: 20 }).default("pending"),
  errorMessage: text("error_message"),
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: integer("created_by").references(() => users.id),
  updatedBy: integer("updated_by").references(() => users.id),
});
export type ProductLink = typeof productLinks.$inferSelect;
export type InsertProductLink = typeof productLinks.$inferInsert;

// =========================================================
// TICKETS
// =========================================================
export const tickets = pgTable(
  "tickets",
  {
    id: serial("id").primaryKey(),
    ticketNumber: serial("ticket_number").notNull(), // SERIAL en la BD
    orderId: bigint("order_id", { mode: "number" }).notNull().references(() => orders.id),
    // Estado del ticket (compat: algunos flujos usan 'open'/'closed')
    status: text("status").default("open"),
    // Logística
    serviceId: integer("service_id").references(() => logisticServices.id),
    carrierId: integer("carrier_id").references(() => carriers.id),
    trackingNumber: text("tracking_number"),
    labelUrl: text("label_url"),
    serviceLevel: text("service_level"),
    packageCount: integer("package_count"),
    weightKg: decimal("weight_kg"),
    lengthCm: decimal("length_cm"),
    widthCm: decimal("width_cm"),
    heightCm: decimal("height_cm"),
    shippedAt: timestamp("shipped_at"),
    deliveredAt: timestamp("delivered_at"),
    canceledAt: timestamp("canceled_at"),
    slaDueAt: timestamp("sla_due_at"),
    notes: text("notes"),
    externalRefs: jsonb("external_refs"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at"),
  },
  (t) => ({
    uxTicketNumber: uniqueIndex("tickets_ticket_number_unique").on(t.ticketNumber),
    idxOrder: index("ix_tickets_order").on(t.orderId),
    idxStatus: index("ix_tickets_status").on(t.status),
    idxService: index("ix_tickets_service").on(t.serviceId),
    idxCarrier: index("ix_tickets_carrier").on(t.carrierId),
    idxTracking: index("ix_tickets_tracking").on(t.trackingNumber),
  }),
);
export type Ticket = typeof tickets.$inferSelect;
export type InsertTicket = typeof tickets.$inferInsert;

// =========================================================
// TICKET_EVENTS (auditoría de cambios de ticket)
// =========================================================
export const ticketEvents = pgTable(
  "ticket_events",
  {
    id: serial("id").primaryKey(),
    ticketId: integer("ticket_id").notNull().references(() => tickets.id),
    eventType: text("event_type").notNull(),
    payload: jsonb("payload"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    idxTicket: index("ix_ticket_events_ticket").on(t.ticketId),
    idxType: index("ix_ticket_events_type").on(t.eventType),
  }),
);
export type TicketEvent = typeof ticketEvents.$inferSelect;
export type InsertTicketEvent = typeof ticketEvents.$inferInsert;

// =========================================================
// Zod Schemas mínimos (alineados al SQL; no fuerzan campos que la BD deja opcionales)
// =========================================================
import { z } from "zod";

export const insertOrderSchema = z.object({
  // La PK es SERIAL, no se envía
  shopId: z.number().int().optional(), // nullable en BD; se recomienda enviarlo
  orderId: z.string().min(1),
  customerName: z.string().optional(),
  customerEmail: z.string().optional(),
  subtotalPrice: z.string().optional(),
  totalAmount: z.string().optional(),
  currency: z.string().optional(),
  financialStatus: z.string().optional(),
  fulfillmentStatus: z.string().optional(),
  tags: z.array(z.string()).optional(),
  shipName: z.string().optional(),
  shipPhone: z.string().optional(),
  shipAddress1: z.string().optional(),
  shipCity: z.string().optional(),
  shipProvince: z.string().optional(),
  shipCountry: z.string().optional(),
  shipZip: z.string().optional(),
  shopifyCreatedAt: z.date().optional(),
  shopifyUpdatedAt: z.date().optional(),
  shopifyProcessedAt: z.date().optional(),
  shopifyClosedAt: z.date().optional(),
  shopifyCancelledAt: z.date().optional(),
  cancelReason: z.string().optional(),
  orderNote: z.string().optional(),
  noteAttributes: z.any().optional(), // jsonb
});

export const insertTicketSchema = z.object({
  orderId: z.coerce.number().int().positive(), // en BD es BIGINT; aquí lo traemos como number
  status: z.string().default("open"),
  notes: z.string().optional(),
});

export const createBulkTicketsSchema = z.object({
  orderIds: z.array(z.union([z.number().int().positive(), z.string().min(1)])).min(1),
  notes: z.string().optional(),
});

export const insertNoteSchema = z.object({
  content: z.string().min(1),
});

export interface DashboardMetrics {
  totalOrders: number;
  totalSales: number;
  unmanaged: number;
  managed: number;
  byChannel: Array<{ channelId: number; channelName: string; count: number }>; 
  byShop: Array<{ shopId: number; shopName?: string | null; count: number }>;
}

// DTOs usados por el cliente (no tablas)
export type NoteDTO = {
  id: number;
  content: string;
  date: string; // YYYY-MM-DD derivado de createdAt
  createdAt?: Date | string;
};

// =========================================================
// Alias opcionales en español
// =========================================================
export {
  users as usuarios,
  brands as marcas,
  channels as canales,
  carriers as paqueterias,
  logisticServices as serviciosLogisticos,
  serviceCarriers as serviciosPaqueterias,
  orders as ordenes,
  tickets as ticketsTabla,
  notes as notas,
  ticketEvents as eventosTicket,
};

export type {
  User as Usuario,
  InsertUser as InsertarUsuario,
  Brand as Marca,
  InsertBrand as InsertarMarca,
  Channel as Canal,
  InsertChannel as InsertarCanal,
  Carrier as Paqueteria,
  InsertCarrier as InsertarPaqueteria,
  LogisticService as ServicioLogistico,
  InsertLogisticService as InsertarServicioLogistico,
  ServiceCarrier as ServicioPaqueteria,
  InsertServiceCarrier as InsertarServicioPaqueteria,
  Order as Orden,
  InsertOrder as InsertarOrden,
  Ticket as TicketTipo,
  InsertTicket as InsertarTicket,
  TicketEvent as EventoTicket,
  InsertTicketEvent as InsertarEventoTicket,
  Note as Nota,
  InsertNote as InsertarNota,
};

// =========================================================
// Constantes de estados de ticket (para validación en rutas)
// =========================================================
export const TICKET_STATUS = {
  ABIERTO: "ABIERTO",
  ETIQUETA_GENERADA: "ETIQUETA_GENERADA",
  EN_TRANSITO: "EN_TRÁNSITO",
  ENTREGADO: "ENTREGADO",
  CANCELADO: "CANCELADO",
  FALLIDO: "FALLIDO",
} as const;
export type TicketStatus = typeof TICKET_STATUS[keyof typeof TICKET_STATUS] | "open" | "closed";
