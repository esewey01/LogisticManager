import { sql } from "drizzle-orm";
import { 
  pgTable, 
  text, 
  varchar, 
  timestamp, 
  integer, 
  decimal, 
  boolean, 
  jsonb,
  uuid,
  index
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table (required for auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table
export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email", { length: 255 }).unique().notNull(),
  password: text("password").notNull(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  role: varchar("role", { length: 20 }).notNull().default("user"), // "user" | "admin"
  isActive: boolean("is_active").notNull().default(true),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Brands/Catalogs table
export const brands = pgTable("brands", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  code: varchar("code", { length: 20 }).unique().notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Catalog products
export const catalogProducts = pgTable("catalog_products", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  brandId: uuid("brand_id").references(() => brands.id).notNull(),
  sku: varchar("sku", { length: 100 }).notNull(),
  productName: text("product_name").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  availableStock: integer("available_stock").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Channels configuration
export const channels = pgTable("channels", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 10 }).unique().notNull(), // "WW", "CT", "MGL"
  name: varchar("name", { length: 100 }).notNull(),
  color: varchar("color", { length: 7 }).notNull(), // hex color
  icon: varchar("icon", { length: 50 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
});

// Carriers/Shipping providers
export const carriers = pgTable("carriers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  code: varchar("code", { length: 20 }).unique().notNull(),
  apiEndpoint: text("api_endpoint"),
  isActive: boolean("is_active").notNull().default(true),
});

// Orders table
export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  externalId: varchar("external_id", { length: 100 }),
  channelId: uuid("channel_id").references(() => channels.id).notNull(),
  customerName: varchar("customer_name", { length: 200 }).notNull(),
  customerEmail: varchar("customer_email", { length: 255 }),
  customerPhone: varchar("customer_phone", { length: 20 }),
  shippingAddress: text("shipping_address").notNull(),
  products: jsonb("products").notNull(), // array of {sku, name, quantity, price}
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  isCombo: boolean("is_combo").notNull().default(false),
  status: varchar("status", { length: 20 }).notNull().default("unmanaged"), // "unmanaged", "managed", "cancelled"
  isManaged: boolean("is_managed").notNull().default(false),
  hasTicket: boolean("has_ticket").notNull().default(false),
  ticketId: uuid("ticket_id").references(() => tickets.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tickets table
export const tickets = pgTable("tickets", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketNumber: varchar("ticket_number", { length: 50 }).unique().notNull(),
  customerId: varchar("customer_id", { length: 100 }).notNull(),
  customerName: varchar("customer_name", { length: 200 }).notNull(),
  brandId: uuid("brand_id").references(() => brands.id).notNull(),
  products: jsonb("products").notNull(), // array of products from orders
  stockStatus: varchar("stock_status", { length: 20 }).notNull().default("pending"), // "ok", "apart", "stock_out"
  carrierId: uuid("carrier_id").references(() => carriers.id),
  trackingNumber: varchar("tracking_number", { length: 100 }),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // "pending", "processing", "shipped", "delivered"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Shipping rules for brand-carrier assignment
export const shippingRules = pgTable("shipping_rules", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  brandId: uuid("brand_id").references(() => brands.id).notNull(),
  carrierId: uuid("carrier_id").references(() => carriers.id).notNull(),
  priority: integer("priority").notNull().default(1),
  isActive: boolean("is_active").notNull().default(true),
});

// Quick notes
export const notes = pgTable("notes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  notes: many(notes),
}));

export const brandsRelations = relations(brands, ({ many }) => ({
  catalogProducts: many(catalogProducts),
  tickets: many(tickets),
  shippingRules: many(shippingRules),
}));

export const channelsRelations = relations(channels, ({ many }) => ({
  orders: many(orders),
}));

export const carriersRelations = relations(carriers, ({ many }) => ({
  tickets: many(tickets),
  shippingRules: many(shippingRules),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  channel: one(channels, {
    fields: [orders.channelId],
    references: [channels.id],
  }),
  ticket: one(tickets, {
    fields: [orders.ticketId],
    references: [tickets.id],
  }),
}));

export const ticketsRelations = relations(tickets, ({ one, many }) => ({
  brand: one(brands, {
    fields: [tickets.brandId],
    references: [brands.id],
  }),
  carrier: one(carriers, {
    fields: [tickets.carrierId],
    references: [carriers.id],
  }),
  orders: many(orders),
}));

export const catalogProductsRelations = relations(catalogProducts, ({ one }) => ({
  brand: one(brands, {
    fields: [catalogProducts.brandId],
    references: [brands.id],
  }),
}));

export const shippingRulesRelations = relations(shippingRules, ({ one }) => ({
  brand: one(brands, {
    fields: [shippingRules.brandId],
    references: [brands.id],
  }),
  carrier: one(carriers, {
    fields: [shippingRules.carrierId],
    references: [carriers.id],
  }),
}));

export const notesRelations = relations(notes, ({ one }) => ({
  user: one(users, {
    fields: [notes.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertBrandSchema = createInsertSchema(brands).omit({ id: true, createdAt: true });
export const insertCatalogProductSchema = createInsertSchema(catalogProducts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertChannelSchema = createInsertSchema(channels).omit({ id: true });
export const insertCarrierSchema = createInsertSchema(carriers).omit({ id: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTicketSchema = createInsertSchema(tickets).omit({ id: true, createdAt: true, updatedAt: true });
export const insertShippingRuleSchema = createInsertSchema(shippingRules).omit({ id: true });
export const insertNoteSchema = createInsertSchema(notes).omit({ id: true, createdAt: true });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Brand = typeof brands.$inferSelect;
export type InsertBrand = z.infer<typeof insertBrandSchema>;
export type CatalogProduct = typeof catalogProducts.$inferSelect;
export type InsertCatalogProduct = z.infer<typeof insertCatalogProductSchema>;
export type Channel = typeof channels.$inferSelect;
export type InsertChannel = z.infer<typeof insertChannelSchema>;
export type Carrier = typeof carriers.$inferSelect;
export type InsertCarrier = z.infer<typeof insertCarrierSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Ticket = typeof tickets.$inferSelect;
export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type ShippingRule = typeof shippingRules.$inferSelect;
export type InsertShippingRule = z.infer<typeof insertShippingRuleSchema>;
export type Note = typeof notes.$inferSelect;
export type InsertNote = z.infer<typeof insertNoteSchema>;
