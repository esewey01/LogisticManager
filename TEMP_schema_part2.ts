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
    status: text("status").notNull().default("open"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at"),
  },
  (t) => ({
    uxTicketNumber: uniqueIndex("tickets_ticket_number_unique").on(t.ticketNumber),
    idxOrder: index("ix_tickets_order").on(t.orderId),
    idxStatus: index("ix_tickets_status").on(t.status),
  }),
);
export type Ticket = typeof tickets.$inferSelect;
export type InsertTicket = typeof tickets.$inferInsert;

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
