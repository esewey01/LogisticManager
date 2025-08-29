var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  brands: () => brands,
  canales: () => channels,
  carriers: () => carriers,
  catalogoProductos: () => catalogoProductos,
  channels: () => channels,
  createBulkTicketsSchema: () => createBulkTicketsSchema,
  insertNoteSchema: () => insertNoteSchema,
  insertOrderSchema: () => insertOrderSchema,
  insertTicketSchema: () => insertTicketSchema,
  marcas: () => brands,
  notas: () => notes,
  notes: () => notes,
  ordenes: () => orders,
  orderItems: () => orderItems,
  orders: () => orders,
  paqueterias: () => carriers,
  productLinks: () => productLinks,
  products: () => products,
  tickets: () => tickets,
  ticketsTabla: () => tickets,
  users: () => users,
  usuarios: () => users,
  variants: () => variants
});
import {
  pgTable,
  serial,
  text,
  boolean,
  timestamp,
  integer,
  decimal,
  bigint,
  varchar,
  jsonb
} from "drizzle-orm/pg-core";
import { index, uniqueIndex } from "drizzle-orm/pg-core";
import { z } from "zod";
var users, brands, carriers, catalogoProductos, channels, notes, orders, orderItems, products, variants, productLinks, tickets, insertOrderSchema, insertTicketSchema, createBulkTicketsSchema, insertNoteSchema;
var init_schema = __esm({
  "shared/schema.ts"() {
    "use strict";
    users = pgTable("users", {
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
    brands = pgTable(
      "brands",
      {
        id: serial("id").primaryKey(),
        name: text("name").notNull(),
        code: text("code").notNull(),
        isActive: boolean("is_active").notNull().default(true),
        createdAt: timestamp("created_at").defaultNow(),
        updatedAt: timestamp("updated_at")
      },
      (t) => ({
        uxCode: uniqueIndex("brands_code_unique").on(t.code)
      })
    );
    carriers = pgTable(
      "carriers",
      {
        id: serial("id").primaryKey(),
        name: text("name").notNull(),
        code: text("code").notNull(),
        apiEndpoint: text("api_endpoint"),
        isActive: boolean("is_active").notNull().default(true),
        createdAt: timestamp("created_at").defaultNow(),
        updatedAt: timestamp("updated_at")
      },
      (t) => ({
        uxCode: uniqueIndex("carriers_code_unique").on(t.code)
      })
    );
    catalogoProductos = pgTable("catalogo_productos", {
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
      stock: integer("stock")
    });
    channels = pgTable(
      "channels",
      {
        id: serial("id").primaryKey(),
        code: text("code").notNull(),
        name: text("name").notNull(),
        color: text("color"),
        icon: text("icon"),
        isActive: boolean("is_active").notNull().default(true),
        createdAt: timestamp("created_at").defaultNow(),
        updatedAt: timestamp("updated_at")
      },
      (t) => ({
        uxCode: uniqueIndex("channels_code_unique").on(t.code)
      })
    );
    notes = pgTable("notes", {
      id: serial("id").primaryKey(),
      userId: integer("user_id").notNull(),
      content: text("content").notNull(),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at")
      // en la BD no hay default
    });
    orders = pgTable(
      "orders",
      {
        id: serial("id").primaryKey(),
        // SERIAL (int4) en la BD real
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
        updatedAt: timestamp("updated_at").defaultNow()
      },
      (t) => ({
        // La BD tiene ambos: uniq_shop_order y ux_orders_shop_order (duplicados). Mantener uno
        uxShopOrder: uniqueIndex("ux_orders_shop_order").on(t.shopId, t.orderId),
        idxByShopCreated: index("ix_orders_shop_created").on(t.shopId, t.createdAt),
        idxFulfillment: index("orders_fulfillment_status_idx").on(t.fulfillmentStatus),
        idxShopifyCreated: index("orders_shopify_created_idx").on(t.shopifyCreatedAt),
        idxShop: index("ix_orders_shop").on(t.shopId),
        idxChannel: index("ix_orders_channel").on(t.shopId)
      })
    );
    orderItems = pgTable(
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
        variantTitle: text("variant_title")
      },
      (t) => ({
        idxOrder: index("idx_order_items_order_id").on(t.orderId),
        idxSku: index("ix_order_items_sku").on(t.sku),
        idxShopProd: index("ix_order_items_shopify_product").on(t.shopifyProductId),
        idxShopVar: index("ix_order_items_shopify_variant").on(t.shopifyVariantId)
      })
    );
    products = pgTable(
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
        sku: text("sku")
      },
      (t) => ({
        idxShop: index("ix_products_shop").on(t.shopId),
        idxShop2: index("products_shop_id_idx").on(t.shopId),
        uxShopShopify: uniqueIndex("ux_products_shop_shopify").on(t.shopId, t.idShopify)
      })
    );
    variants = pgTable(
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
        externalVariantId: text("external_variant_id")
      },
      (t) => ({
        idxProd: index("ix_variants_product").on(t.productId),
        idxShopify: index("ix_variants_shopify").on(t.idShopify),
        idxSku: index("ix_variants_sku").on(t.sku)
      })
    );
    productLinks = pgTable("product_links", {
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
      updatedBy: integer("updated_by").references(() => users.id)
    });
    tickets = pgTable(
      "tickets",
      {
        id: serial("id").primaryKey(),
        ticketNumber: serial("ticket_number").notNull(),
        // SERIAL en la BD
        orderId: bigint("order_id", { mode: "number" }).notNull().references(() => orders.id),
        status: text("status").notNull().default("open"),
        notes: text("notes"),
        createdAt: timestamp("created_at").defaultNow(),
        updatedAt: timestamp("updated_at")
      },
      (t) => ({
        uxTicketNumber: uniqueIndex("tickets_ticket_number_unique").on(t.ticketNumber),
        idxOrder: index("ix_tickets_order").on(t.orderId),
        idxStatus: index("ix_tickets_status").on(t.status)
      })
    );
    insertOrderSchema = z.object({
      // La PK es SERIAL, no se envía
      shopId: z.number().int().optional(),
      // nullable en BD; se recomienda enviarlo
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
      noteAttributes: z.any().optional()
      // jsonb
    });
    insertTicketSchema = z.object({
      orderId: z.coerce.number().int().positive(),
      // en BD es BIGINT; aquí lo traemos como number
      status: z.string().default("open"),
      notes: z.string().optional()
    });
    createBulkTicketsSchema = z.object({
      orderIds: z.array(z.union([z.number().int().positive(), z.string().min(1)])).min(1),
      notes: z.string().optional()
    });
    insertNoteSchema = z.object({
      content: z.string().min(1)
    });
  }
});

// server/db.ts
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import "dotenv/config";
var pool, u, db;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    init_schema();
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL no definida/encontrada");
    }
    pool = new Pool({
      connectionString: process.env.DATABASE_URL
      //  ssl: { rejectUnauthorized: true },
    });
    u = new URL(process.env.DATABASE_URL);
    console.log("[DB] Conectando a:", u.hostname);
    db = drizzle(pool, { schema: schema_exports });
  }
});

// server/shopifyEnv.ts
function getShopifyCredentials(storeParam) {
  const storeNumber = parseInt(storeParam || "1", 10);
  const shop = process.env[`SHOPIFY_SHOP_NAME_${storeNumber}`] || process.env[`SHOPIFY_SHOP_${storeNumber}`];
  const token = process.env[`SHOPIFY_ACCESS_TOKEN_${storeNumber}`] || process.env[`SHOPIFY_TOKEN_${storeNumber}`];
  const apiVersion = process.env[`SHOPIFY_API_VERSION_${storeNumber}`] || process.env.SHOPIFY_API_VERSION || "2025-04";
  if (!shop || !token) {
    throw new Error(
      `Credenciales de Shopify faltantes para tienda ${storeNumber}. Requeridas: SHOPIFY_SHOP_NAME_${storeNumber} y SHOPIFY_ACCESS_TOKEN_${storeNumber}. Disponibles: shop=${!!shop}, token=${!!token}`
    );
  }
  if (/^https?:\/\//i.test(shop)) {
    throw new Error(
      `SHOPIFY_SHOP_NAME_${storeNumber} debe ser "*.myshopify.com" sin https:// (recibido: ${shop})`
    );
  }
  return {
    shop,
    token,
    apiVersion,
    storeNumber,
    shopDomain: shop
  };
}
var init_shopifyEnv = __esm({
  "server/shopifyEnv.ts"() {
    "use strict";
  }
});

// server/shopifyFulfillment.ts
import pRetry from "p-retry";
async function shopifyRestGet2(storeNumber, path3) {
  const { shop, token, apiVersion } = getShopifyCredentials(String(storeNumber));
  const base = `https://${shop}/admin/api/${apiVersion}`;
  const r = await fetch(`${base}${path3}`, {
    headers: {
      "X-Shopify-Access-Token": token,
      "Content-Type": "application/json",
      "User-Agent": "LogisticManager/1.0 (+node)"
    }
  });
  const text2 = await r.text();
  if (!r.ok) {
    throw new Error(`Shopify GET ${path3} => ${r.status} ${r.statusText} :: ${text2.slice(0, 400)}`);
  }
  return JSON.parse(text2);
}
async function shopifyRestPost(storeNumber, path3, body) {
  const { shop, token, apiVersion } = getShopifyCredentials(String(storeNumber));
  const base = `https://${shop}/admin/api/${apiVersion}`;
  const r = await fetch(`${base}${path3}`, {
    method: "POST",
    headers: {
      "X-Shopify-Access-Token": token,
      "Content-Type": "application/json",
      "User-Agent": "LogisticManager/1.0 (+node)"
    },
    body: JSON.stringify(body)
  });
  const text2 = await r.text();
  if (!r.ok) {
    const errorText = await r.text();
    throw new Error(`Shopify POST ${path3} => ${r.status} ${r.statusText} :: ${errorText.slice(0, 400)}`);
  }
  return JSON.parse(text2);
}
async function fulfillOrderInShopify(params) {
  const { storeNumber, shopifyOrderId, notifyCustomer = false } = params;
  return await pRetry(
    async () => {
      console.log(`[Shopify] Fulfilling order ${shopifyOrderId} on store ${storeNumber}`);
      const foResp = await shopifyRestGet2(storeNumber, `/orders/${shopifyOrderId}/fulfillment_orders.json`);
      const line_items_by_fulfillment_order = foResp.fulfillment_orders.map((fo) => {
        const items = fo.line_items.filter((li) => (li.fulfillable_quantity ?? 0) > 0).map((li) => ({
          id: li.id,
          quantity: li.fulfillable_quantity
        }));
        return items.length > 0 ? { fulfillment_order_id: fo.id, fulfillment_order_line_items: items } : null;
      }).filter(Boolean);
      if (line_items_by_fulfillment_order.length === 0) {
        return { ok: true, alreadyFulfilled: true };
      }
      const created = await shopifyRestPost(
        storeNumber,
        `/fulfillments.json`,
        {
          fulfillment: {
            line_items_by_fulfillment_order,
            notify_customer: notifyCustomer,
            tracking_info: { number: null, url: null, company: "Manual" }
          }
        }
      );
      return { ok: true, fulfillmentId: created.fulfillment.id };
    },
    {
      retries: 3,
      minTimeout: 1e3,
      onFailedAttempt: (error) => {
        console.warn(`Intento ${error.attemptNumber} fall\xF3. Quedan ${error.retriesLeft} reintentos. Error: ${error}`);
      }
    }
  );
}
var init_shopifyFulfillment = __esm({
  "server/shopifyFulfillment.ts"() {
    "use strict";
    init_shopifyEnv();
  }
});

// server/storage.ts
var storage_exports = {};
__export(storage_exports, {
  DatabaseStorage: () => DatabaseStorage,
  almacenamiento: () => almacenamiento,
  markOrderCancelledSafe: () => markOrderCancelledSafe,
  storage: () => storage
});
import {
  eq as eq2,
  and,
  isNull,
  isNotNull,
  desc,
  asc,
  sql,
  count,
  gte,
  lte
} from "drizzle-orm";
async function markOrderCancelledSafe(idNum, payload) {
  try {
    const updateData = {};
    if (typeof payload.cancelledAt !== "undefined") updateData["shopifyCancelledAt"] = payload.cancelledAt;
    if (typeof payload.cancelReason !== "undefined") updateData["cancelReason"] = payload.cancelReason;
    if (typeof payload.staffNote !== "undefined") updateData["orderNote"] = payload.staffNote;
    if (typeof payload.displayFinancialStatus !== "undefined") updateData["financialStatus"] = payload.displayFinancialStatus;
    if (typeof payload.displayFulfillmentStatus !== "undefined") updateData["fulfillmentStatus"] = payload.displayFulfillmentStatus;
    if (Object.keys(updateData).length === 0) return { ok: true, skipped: true };
    await db.update(orders).set(updateData).where(eq2(orders.id, idNum));
    return { ok: true };
  } catch (e) {
    console.warn("[cancel-order] markOrderCancelledSafe skipped or failed:", e?.message);
    return { ok: true, warning: "update skipped" };
  }
}
var createdAtEff, DatabaseStorage, storage, almacenamiento;
var init_storage = __esm({
  "server/storage.ts"() {
    "use strict";
    init_schema();
    init_db();
    init_shopifyFulfillment();
    createdAtEff = (tabla) => sql`COALESCE(${tabla.shopifyCreatedAt}, ${tabla.createdAt})`;
    DatabaseStorage = class {
      // ==== USUARIOS ====
      /** Obtiene un usuario por su ID. */
      async getUser(id) {
        const [usuario] = await db.select().from(users).where(eq2(users.id, id));
        return usuario;
      }
      /** Busca un usuario por correo electrónico. */
      async getUserByEmail(email) {
        const [usuario] = await db.select().from(users).where(eq2(users.email, email));
        return usuario;
      }
      /** Crea un nuevo usuario. */
      async createUser(datos) {
        const [usuario] = await db.insert(users).values(datos).returning();
        return usuario;
      }
      /** Actualiza campos de un usuario existente. */
      async updateUser(id, updates) {
        const [usuario] = await db.update(users).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq2(users.id, id)).returning();
        return usuario;
      }
      /** Lista todos los usuarios ordenados por correo. */
      async getAllUsers() {
        return await db.select().from(users).orderBy(asc(users.email));
      }
      // ==== MARCAS ====
      /** Devuelve las marcas activas ordenadas por nombre. */
      async getBrands() {
        return await db.select().from(brands).where(eq2(brands.isActive, true)).orderBy(asc(brands.name));
      }
      /** Obtiene una marca por ID. */
      async getBrand(id) {
        const [marca] = await db.select().from(brands).where(eq2(brands.id, id));
        return marca;
      }
      /** Crea una nueva marca. */
      async createBrand(datos) {
        const [marcaNueva] = await db.insert(brands).values(datos).returning();
        return marcaNueva;
      }
      /** Actualiza una marca. */
      async updateBrand(id, updates) {
        const [marca] = await db.update(brands).set(updates).where(eq2(brands.id, id)).returning();
        return marca;
      }
      // ==== CATÁLOGO ====
      /** Lista productos de catálogo; puede filtrar por ID de marca. */
      async getCatalogProducts(brandId) {
        const consulta = db.select().from(catalogoProductos);
        return await consulta.orderBy(asc(catalogoProductos.sku));
      }
      /** Crea un producto de catálogo. */
      async createCatalogProduct(datos) {
        const [productoNuevo] = await db.insert(catalogoProductos).values(datos).returning();
        return productoNuevo;
      }
      /** Actualiza un producto de catálogo. */
      async updateCatalogProduct(id, updates) {
        const [producto] = await db.update(catalogoProductos).set(updates).where(eq2(catalogoProductos.sku_interno, String(id))).returning();
        return producto;
      }
      // ==== CANALES ====
      /** Devuelve canales activos ordenados por nombre. */
      async getChannels() {
        return await db.select().from(channels).where(eq2(channels.isActive, true)).orderBy(asc(channels.name));
      }
      /** Obtiene un canal por ID. */
      async getChannel(id) {
        const [canal] = await db.select().from(channels).where(eq2(channels.id, id));
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
        return await db.select().from(carriers).where(eq2(carriers.isActive, true)).orderBy(asc(carriers.name));
      }
      /** Obtiene una paquetería por ID. */
      async getCarrier(id) {
        const [paq] = await db.select().from(carriers).where(eq2(carriers.id, id));
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
        if (filtros?.channelId !== void 0)
          condiciones.push(eq2(orders.shopId, filtros.channelId));
        if (filtros?.managed !== void 0) {
          if (filtros.managed) {
            condiciones.push(sql`LOWER(COALESCE(${orders.fulfillmentStatus}, '')) = 'fulfilled'`);
          } else {
            condiciones.push(sql`LOWER(COALESCE(${orders.fulfillmentStatus}, '')) IN ('', 'unfulfilled')`);
          }
        }
        if (filtros?.hasTicket !== void 0) {
          if (filtros.hasTicket) {
            condiciones.push(sql`EXISTS(SELECT 1 FROM tickets t WHERE t.order_id = ${orders.id})`);
          } else {
            condiciones.push(sql`NOT EXISTS(SELECT 1 FROM tickets t WHERE t.order_id = ${orders.id})`);
          }
        }
        if (condiciones.length > 0) {
          return await db.select().from(orders).where(and(...condiciones)).orderBy(desc(createdAtEff(orders)));
        }
        return await db.select().from(orders).orderBy(desc(createdAtEff(orders)));
      }
      //INFORMACION RELEVANTE DE LA ORDEN
      // server/storage.ts
      async getOrderDetails(idParam) {
        try {
          const idNum = Number(idParam);
          if (!Number.isInteger(idNum) || idNum <= 0) return void 0;
          const { rows } = await db.execute(sql`
      SELECT
        -- Datos generales (alias camelCase)
        o.id                              AS "id",
        o.shop_id                         AS "shopId",
        o.order_id                        AS "orderId",
        o.name                            AS "name",
        o.order_number                    AS "orderNumber",
        o.customer_name                   AS "customerName",
        o.customer_email                  AS "customerEmail",
        o.subtotal_price                  AS "subtotalPrice",
        o.total_amount                    AS "totalAmount",
        o.currency                        AS "currency",
        o.financial_status                AS "financialStatus",
        o.fulfillment_status              AS "fulfillmentStatus",
        o.tags                            AS "tags",
        o.order_note                      AS "orderNote",
        o.created_at                      AS "createdAt",
        o.shopify_created_at              AS "shopifyCreatedAt",
        o.ship_name                       AS "shipName",
        o.ship_phone                      AS "shipPhone",
        o.ship_address1                   AS "shipAddress1",
        o.ship_city                       AS "shipCity",
        o.ship_province                   AS "shipProvince",
        o.ship_country                    AS "shipCountry",
        o.ship_zip                        AS "shipZip",

        -- Ítems enriquecidos: subconsulta por orden (garantiza 1-a-1 por order_item)
        COALESCE((
          SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'orderItemId',    x.order_item_id,
            'skuCanal',       x.sku_canal,
            'skuMarca',       x.sku_marca,
            'skuInterno',     x.sku_interno,
            'quantity',       x.quantity,
            'priceVenta',     x.price_venta,
            'unitPrice',      x.unit_price,
            'mappingStatus',  x.mapping_status,
            'matchSource',    x.match_source,

            'title',          x.title,
            'vendor',         x.vendor,
            'productType',    x.product_type,

            'barcode',        x.barcode,
            'compareAtPrice', x.compare_at_price,
            'stockShopify',   x.inventory_qty,

            'nombreProducto', x.nombre_producto,
            'categoria',      x.categoria,
            'condicion',      x.condicion,
            'marca',          x.marca,
            'variante',       x.variante,
            'largo',          x.largo,
            'ancho',          x.ancho,
            'alto',           x.alto,
            'peso',           x.peso,
            'foto',           x.foto,
            'costo',          x.costo,
            'stockMarca',     x.stock_marca
          )), '[]'::jsonb)
          FROM (
            SELECT
              oi.id          AS order_item_id,
              oi.sku         AS sku_canal,
              oi.quantity    AS quantity,
              oi.price       AS price_venta,

              -- products (1 fila garantizada por id_shopify)
              p.title        AS title,
              p.vendor       AS vendor,
              p.product_type AS product_type,

              -- variants (1 fila garantizada por id_shopify)
              v.barcode,
              v.compare_at_price,
              v.inventory_qty,

              -- catalogo_productos (elegir UNA fila “mejor coincidencia”)
              cp.sku         AS sku_marca,
              cp.sku_interno AS sku_interno,
              cp.nombre_producto,
              cp.categoria,
              cp.condicion,
              cp.marca,
              cp.variante,
              cp.largo,
              cp.ancho,
              cp.alto,
              cp.peso,
              cp.foto,
              cp.costo,
              cp.stock       AS stock_marca,

              -- Campos derivados de mapeo
              CASE WHEN cp.sku IS NULL AND cp.sku_interno IS NULL THEN 'unmapped'
                   ELSE 'matched'
              END AS mapping_status,
              CASE
                WHEN cp.sku_interno IS NOT NULL AND oi.sku IS NOT NULL AND lower(cp.sku_interno) = lower(oi.sku) THEN 'interno'
                WHEN cp.sku           IS NOT NULL AND oi.sku IS NOT NULL AND lower(cp.sku)           = lower(oi.sku) THEN 'externo'
                ELSE NULL
              END AS match_source,
              cp.costo AS unit_price

            FROM order_items oi

            -- products por Shopify product id
            LEFT JOIN LATERAL (
              SELECT p.*
              FROM products p
              WHERE p.id_shopify = oi.shopify_product_id
              LIMIT 1
            ) p ON TRUE

            -- variants por Shopify variant id
            LEFT JOIN LATERAL (
              SELECT v.*
              FROM variants v
              WHERE v.id_shopify = oi.shopify_variant_id
              LIMIT 1
            ) v ON TRUE

            -- catalogo_productos: NO hay updated_at ni id; preferimos coincidencia exacta.
            -- Regla: si oi.sku coincide con cp.sku_interno => prioriza; si no, prueba con cp.sku.
            LEFT JOIN LATERAL (
              SELECT cp.*
              FROM catalogo_productos cp
              WHERE
                (cp.sku_interno IS NOT NULL OR cp.sku IS NOT NULL)
                AND (
                  (oi.sku IS NOT NULL AND lower(cp.sku_interno) = lower(oi.sku))
                  OR
                  (oi.sku IS NOT NULL AND lower(cp.sku) = lower(oi.sku))
                )
              ORDER BY
                (lower(cp.sku_interno) = lower(oi.sku)) DESC,
                (lower(cp.sku) = lower(oi.sku)) DESC,
                cp.sku_interno NULLS LAST,
                cp.sku        NULLS LAST
              LIMIT 1
            ) cp ON TRUE

            WHERE oi.order_id = o.id
          ) x
        ), '[]'::jsonb) AS "items"

      FROM orders o
      WHERE o.id = ${idNum}
      LIMIT 1
    `);
          const row = rows[0];
          return row ?? void 0;
        } catch (e) {
          console.error("[Storage] Error getOrderDetails:", e?.message || e);
          return void 0;
        }
      }
      /** 
       * Obtiene una orden por ID con detalles completos 
       * Corrección: Manejo correcto de bigint IDs y campos de la DB real
       */
      async getOrder(idParam) {
        try {
          const idNum = Number(idParam);
          if (!Number.isInteger(idNum) || idNum <= 0) return void 0;
          const idBig = Number(idNum);
          const [orden] = await db.select().from(orders).where(eq2(orders.id, idBig));
          return orden ?? void 0;
        } catch (e) {
          console.error("[Storage] Error getting order:", e);
          return void 0;
        }
      }
      /** Crea una orden. */
      async createOrder(datos) {
        const [ordenNueva] = await db.insert(orders).values(datos).returning();
        return ordenNueva;
      }
      /** Actualiza una orden. */
      async updateOrder(id, updates) {
        const [orden] = await db.update(orders).set(updates).where(eq2(orders.id, Number(id))).returning();
        return orden;
      }
      /** Lista órdenes por nombre de cliente. */
      async getOrdersByCustomer(nombreCliente) {
        return await db.select().from(orders).where(eq2(orders.customerName, nombreCliente)).orderBy(desc(orders.createdAt));
      }
      async getOrdersByChannel(from, to) {
        const fromCond = from ? sql`o.created_at >= ${from}` : sql`o.created_at >= NOW() - INTERVAL '30 days'`;
        const toCond = to ? sql`o.created_at < ${to}` : sql`TRUE`;
        const result = await db.execute(sql`
      SELECT 
        CASE 
          WHEN o.shop_id = 1 THEN 'WW'
          WHEN o.shop_id = 2 THEN 'CT'
          ELSE 'OTHER'
        END as channel_code,
        CASE 
          WHEN o.shop_id = 1 THEN 'WordWide'
          WHEN o.shop_id = 2 THEN 'CrediTienda'
          ELSE 'Otra Tienda'
        END as channel_name,
        COUNT(o.id)::int as orders
      FROM orders o
      WHERE ${fromCond} AND ${toCond}
      GROUP BY o.shop_id
      ORDER BY orders DESC
    `);
        return result.rows.map((row) => ({
          channelCode: row.channel_code,
          channelName: row.channel_name,
          orders: row.orders
        }));
      }
      /** Obtiene estadísticas de órdenes canceladas/reabastecidas */
      async getCancelledOrdersStats() {
        try {
          const result = await db.execute(sql`
        SELECT 
          COUNT(CASE WHEN LOWER(COALESCE(fulfillment_status, '')) = 'restocked' THEN 1 END)::int as cancelled_count,
          COUNT(*)::int as total_count
        FROM orders
        WHERE created_at >= NOW() - INTERVAL '30 days'
      `);
          const row = result.rows[0];
          const count3 = row?.cancelled_count || 0;
          const total = row?.total_count || 1;
          const percentage = total > 0 ? Math.round(count3 / total * 100) : 0;
          return { count: count3, percentage };
        } catch (error) {
          console.error("Error getting cancelled orders stats:", error);
          return { count: 0, percentage: 0 };
        }
      }
      /** Obtiene una orden por ID de Shopify y tienda. */
      async getOrderByShopifyId(shopifyId, shopId) {
        const [orden] = await db.select().from(orders).where(
          and(
            eq2(orders.orderId, shopifyId),
            eq2(orders.shopId, shopId)
          )
        );
        return orden;
      }
      // ==== TICKETS ====
      //Vista para obtener tickets en la tabla de tickets
      // storage.ts
      async getTicketsView() {
        const result = await db.execute(sql`
    SELECT 
      t.id,
      t.ticket_number                                                         AS "ticketNumber",
      t.status                                                                AS "status",
      t.notes                                                                 AS "notes",
      t.created_at                                                            AS "createdAt",
      t.updated_at                                                            AS "updatedAt",
      COALESCE(o.id::text, '')                                                AS "orderPk",
      COALESCE(o.order_id, '')                                                AS "orderId",
      COALESCE(o.name, '')                                                    AS "orderName",
      COALESCE(o.customer_name, '')                                           AS "customerName",
      o.shop_id                                                               AS "shopId",
      COALESCE(COUNT(oi.id), 0)::int                                          AS "itemsCount",
      COALESCE(
        ARRAY_AGG(DISTINCT oi.sku) FILTER (WHERE oi.sku IS NOT NULL),
        ARRAY[]::text[]
      )                                                                        AS "skus",
      COALESCE(
        ARRAY_AGG(DISTINCT cp.marca) FILTER (WHERE cp.marca IS NOT NULL),
        ARRAY[]::text[]
      )                                                                        AS "brands"
    FROM tickets t
    LEFT JOIN orders o           ON o.id = t.order_id::bigint
    LEFT JOIN order_items oi     ON oi.order_id = o.id
    LEFT JOIN catalogo_productos cp ON cp.sku = oi.sku   -- usa SKU externo del item
    GROUP BY t.id, o.id
    ORDER BY t.created_at DESC
  `);
        return result.rows;
      }
      /** Lista tickets ordenados por fecha de creación descendente. */
      async getTickets() {
        return await db.select().from(tickets).orderBy(desc(tickets.createdAt));
      }
      /** Obtiene un ticket por ID. */
      async getTicket(id) {
        const [ticket] = await db.select().from(tickets).where(eq2(tickets.id, id));
        return ticket;
      }
      /** Crea un ticket. */
      async createTicket(datos) {
        const [ticketNuevo] = await db.insert(tickets).values(datos).returning();
        return ticketNuevo;
      }
      /** Actualiza un ticket. */
      async updateTicket(id, updates) {
        const [ticket] = await db.update(tickets).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq2(tickets.id, id)).returning();
        return ticket;
      }
      /** Obtiene el siguiente número de ticket secuencial empezando en 30000. */
      async getNextTicketNumber() {
        const resultado = await db.select({ maxTicket: sql`MAX(${tickets.ticketNumber})` }).from(tickets).where(sql`${tickets.ticketNumber} ~ '^[0-9]+$'`);
        const maxTicket = resultado[0]?.maxTicket;
        let nextNumber = 3e4;
        if (maxTicket && !isNaN(Number(maxTicket))) {
          nextNumber = Math.max(3e4, Number(maxTicket) + 1);
        }
        return nextNumber.toString();
      }
      /** Crea tickets masivos y marca fulfilled en Shopify + BD */
      // storage.ts
      async createBulkTickets(orderIds, notes2) {
        const tickets2 = [];
        let updated = 0;
        const failed = [];
        for (const oid of orderIds) {
          const orderIdNum = typeof oid === "string" ? parseInt(oid, 10) : oid;
          try {
            const orden = await this.getOrder(orderIdNum);
            if (!orden) {
              failed.push({ orderId: oid, reason: "Orden no encontrada" });
              continue;
            }
            const storeNumber = orden.shopId ?? parseInt(process.env.DEFAULT_SHOPIFY_STORE || "1", 10);
            const shopifyOrderId = orden.orderId || orden.order_id;
            if (!shopifyOrderId) {
              failed.push({ orderId: oid, reason: "Orden sin order_id Shopify" });
              continue;
            }
            let fulfillResp;
            if (storeNumber !== 3) {
              try {
                fulfillResp = await fulfillOrderInShopify({
                  storeNumber,
                  shopifyOrderId: String(shopifyOrderId),
                  notifyCustomer: false
                });
              } catch (shopifyError) {
                failed.push({
                  orderId: oid,
                  reason: `Shopify error: ${shopifyError?.message || shopifyError}`
                });
                continue;
              }
            }
            const ticketTx = await db.transaction(async (tx) => {
              const [ticketNuevo] = await tx.insert(tickets).values({
                ticketNumber: sql`nextval('public.ticket_number_seq')::text`,
                orderId: Number(orderIdNum),
                status: "open",
                notes: notes2 || `Ticket creado masivamente para orden ${shopifyOrderId}`
              }).returning();
              await tx.update(orders).set({
                fulfillmentStatus: "fulfilled",
                shopifyUpdatedAt: /* @__PURE__ */ new Date()
              }).where(eq2(orders.id, Number(orderIdNum)));
              return ticketNuevo;
            });
            tickets2.push(ticketTx);
            updated++;
          } catch (error) {
            failed.push({
              orderId: oid,
              reason: `Error interno: ${error?.message || "Desconocido"}`
            });
          }
        }
        return { tickets: tickets2, updated, failed };
      }
      // ==== STATUS FULLFILMENT 
      async createTicketAndFulfill(params) {
        const { orderId, notes: notes2, notifyCustomer = false } = params;
        const [orden] = await db.select().from(orders).where(eq2(orders.id, Number(orderId)));
        if (!orden) throw new Error(`Orden ${orderId} no encontrada`);
        const shopifyOrderId = orden.orderId;
        if (!shopifyOrderId) throw new Error(`La orden ${orderId} no tiene order_id de Shopify`);
        const storeNumber = orden.shopId ?? parseInt(process.env.DEFAULT_SHOPIFY_STORE || "1", 10);
        if (storeNumber === 3) {
          const nuevoTicket = await db.transaction(async (tx) => {
            const [ticketCreado] = await tx.insert(tickets).values({
              ticketNumber: sql`nextval('public.ticket_number_seq')::text`,
              orderId: Number(orderId),
              status: "open",
              notes: notes2
            }).returning();
            if (!ticketCreado) throw new Error("No se pudo crear el ticket");
            await tx.update(orders).set({
              fulfillmentStatus: "fulfilled",
              shopifyUpdatedAt: /* @__PURE__ */ new Date()
            }).where(eq2(orders.id, Number(orderId)));
            return ticketCreado;
          });
          return nuevoTicket;
        }
        try {
          const fulfillResp = await fulfillOrderInShopify({
            storeNumber,
            shopifyOrderId: String(shopifyOrderId),
            notifyCustomer
          });
          console.log("\u{1F6D2} Shopify fulfill response:", fulfillResp);
          const nuevoTicket = await db.transaction(async (tx) => {
            const [ticketCreado] = await tx.insert(tickets).values({
              ticketNumber: sql`nextval('public.ticket_number_seq')::text`,
              orderId: Number(orderId),
              status: "open",
              notes: notes2
            }).returning();
            if (!ticketCreado) throw new Error("No se pudo crear el ticket");
            await tx.update(orders).set({
              fulfillmentStatus: "fulfilled",
              shopifyUpdatedAt: /* @__PURE__ */ new Date()
            }).where(eq2(orders.id, Number(orderId)));
            return ticketCreado;
          });
          return nuevoTicket;
        } catch (error) {
          throw new Error(`Error al crear ticket y fulfill: ${error}`);
        }
      }
      /** Borra un ticket. */
      async deleteTicket(id) {
        await db.delete(tickets).where(eq2(tickets.id, id));
      }
      //DESHACER: BORAR EL TICKET Y DEVUELVE LA ORDEN A UNFULFILLED LOCALMENTE
      async revertTicket(id, opts) {
        const ticket = await this.getTicket(id);
        if (!ticket) return { ok: true, changedLocal: false };
        const orderPk = ticket.orderId;
        const orden = await this.getOrder(Number(orderPk));
        if (!orden) {
          await this.deleteTicket(id);
          return { ok: true, changedLocal: false };
        }
        let cancelledRemote = 0;
        if (opts?.revertShopify) {
          const storeNumber = orden.shopId;
          const shopifyOrderId = orden.orderId || orden.order_id;
          try {
            console.log(`Should unfulfill order ${shopifyOrderId} in store ${storeNumber}`);
            cancelledRemote = 0;
          } catch (e) {
            console.warn("[RevertTicket] No se pudo cancelar en Shopify:", e?.message || e);
          }
        }
        await db.transaction(async (tx) => {
          await tx.delete(tickets).where(eq2(tickets.id, id));
          await tx.update(orders).set({ fulfillmentStatus: "", shopifyUpdatedAt: /* @__PURE__ */ new Date() }).where(eq2(orders.id, Number(orderPk)));
        });
        return { ok: true, changedLocal: true, cancelledRemote };
      }
      ///==== REGLAS DE ENVÍO ====
      /** Devuelve reglas de envío activas. */
      // Removed: shipping rules are not part of current schema
      async getShippingRules() {
        return [];
      }
      /** Crea una regla de envío. */
      async createShippingRule(_regla) {
        throw new Error("Shipping rules not supported");
      }
      // ==== NOTAS ====
      /** Lista notas por usuario. */
      async getUserNotes(userId) {
        return await db.select().from(notes).where(eq2(notes.userId, userId)).orderBy(desc(notes.createdAt));
      }
      /** Lista notas; si se pasa userId, filtra por usuario. */
      async getNotesRange(from, to) {
        return await db.select().from(notes).where(
          and(gte(notes.createdAt, from), lte(notes.createdAt, to))
        ).orderBy(asc(notes.createdAt));
      }
      /** Crea una nota. */
      async createNote(nota) {
        const [nuevaNota] = await db.insert(notes).values(nota).returning();
        return nuevaNota;
      }
      /** Actualiza una nota. */
      async updateNote(id, updates) {
        const [nota] = await db.update(notes).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq2(notes.id, id)).returning();
        return nota;
      }
      /** Elimina una nota por ID. */
      async deleteNote(id) {
        await db.delete(notes).where(eq2(notes.id, id));
      }
      // ==== NUEVOS MÉTODOS SHOPIFY ====
      /** Crea un item de orden. */
      async createOrderItem(datos) {
        const [item] = await db.insert(orderItems).values(datos).returning();
        return item;
      }
      /** Lista productos por tienda (opcional). */
      async getProducts(shopId) {
        if (shopId !== void 0) {
          return await db.select().from(products).where(eq2(products.shopId, shopId)).orderBy(asc(products.title));
        }
        return await db.select().from(products).orderBy(asc(products.title));
      }
      /** Obtiene un producto por ID. */
      async getProduct(id) {
        const [producto] = await db.select().from(products).where(eq2(products.id, id));
        return producto;
      }
      /** Obtiene un producto por ID de Shopify y tienda. */
      async getProductByShopifyId(shopifyId, shopId) {
        const [producto] = await db.select().from(products).where(
          and(
            eq2(products.idShopify, shopifyId),
            eq2(products.shopId, shopId)
          )
        );
        return producto;
      }
      /** Crea un producto. */
      async createProduct(datos) {
        const [producto] = await db.insert(products).values(datos).returning();
        return producto;
      }
      /** Actualiza un producto. */
      async updateProduct(id, updates) {
        const [producto] = await db.update(products).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq2(products.id, id)).returning();
        return producto;
      }
      /** Lista variantes por producto (opcional). */
      async getVariants(productId) {
        if (productId !== void 0) {
          return await db.select().from(variants).where(eq2(variants.productId, productId)).orderBy(asc(variants.sku));
        }
        return await db.select().from(variants).orderBy(asc(variants.sku));
      }
      /** Obtiene una variante por ID. */
      async getVariant(id) {
        const [variante] = await db.select().from(variants).where(eq2(variants.id, id));
        return variante;
      }
      /** Crea una variante. */
      async createVariant(datos) {
        const [variante] = await db.insert(variants).values(datos).returning();
        return variante;
      }
      /** Actualiza una variante. */
      async updateVariant(id, updates) {
        const [variante] = await db.update(variants).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq2(variants.id, id)).returning();
        return variante;
      }
      // ==== MÉTRICAS DE DASHBOARD ====
      /**
       * Métricas de dashboard entre dos fechas.
       */
      async getDashboardMetricsRange(from, to) {
        const range = and(
          gte(orders.shopifyCreatedAt, from),
          lte(orders.shopifyCreatedAt, to),
          isNotNull(orders.shopifyCreatedAt),
          isNull(orders.shopifyCancelledAt)
        );
        const totalOrdersRes = await db.select({ count: count() }).from(orders).where(range);
        const totalSalesRes = await db.select({
          sum: sql`COALESCE(SUM(${orders.totalAmount}),0)`
        }).from(orders).where(range);
        const unmanagedRes = await db.select({ count: count() }).from(orders).where(and(
          sql`LOWER(COALESCE(${orders.fulfillmentStatus}, '')) IN ('', 'unfulfilled')`,
          range
        ));
        const managedRes = await db.select({ count: count() }).from(orders).where(and(
          sql`LOWER(COALESCE(${orders.fulfillmentStatus}, '')) = 'fulfilled'`,
          range
        ));
        const byChannelRes = await db.select({
          channelId: orders.shopId,
          channelName: sql`CASE 
          WHEN ${orders.shopId} = 1 THEN 'WordWide'
          WHEN ${orders.shopId} = 2 THEN 'CrediTienda'
          ELSE 'Tienda ' || ${orders.shopId}::text
        END`,
          count: sql`COUNT(*)`
        }).from(orders).where(range).groupBy(orders.shopId);
        const byShopRes = await db.select({
          shopId: orders.shopId,
          count: sql`COUNT(*)`
        }).from(orders).where(range).groupBy(orders.shopId);
        return {
          totalOrders: Number(totalOrdersRes[0]?.count ?? 0),
          totalSales: Number(totalSalesRes[0]?.sum ?? 0),
          unmanaged: Number(unmanagedRes[0]?.count ?? 0),
          managed: Number(managedRes[0]?.count ?? 0),
          byChannel: byChannelRes.map((r) => ({
            channelId: Number(r.channelId ?? 0),
            channelName: r.channelName ?? "",
            count: Number(r.count ?? 0)
          })),
          byShop: byShopRes.map((r) => ({
            shopId: Number(r.shopId ?? 0),
            shopName: null,
            count: Number(r.count ?? 0)
          }))
        };
      }
      //============TOP SKU EN UN RANGO DE FECHAS=============
      // TOP SKUs en un rango de fechas
      async getTopSkusRange(from, to, limit = 5) {
        const range = and(
          gte(orders.shopifyCreatedAt, from),
          lte(orders.shopifyCreatedAt, to),
          isNotNull(orders.shopifyCreatedAt),
          isNull(orders.shopifyCancelledAt)
        );
        const rows = await db.select({
          sku: orderItems.sku,
          // tu "SKU interno"
          totalQty: sql`COALESCE(SUM(${orderItems.quantity}), 0)`,
          revenue: sql`COALESCE(SUM(${orderItems.quantity} * COALESCE(${orderItems.price}, 0)), 0)`
        }).from(orderItems).innerJoin(orders, eq2(orders.id, orderItems.orderId)).where(range).groupBy(orderItems.sku).orderBy(sql`COALESCE(SUM(${orderItems.quantity}), 0) DESC`).limit(limit);
        return rows.map((r) => ({
          sku: r.sku ?? null,
          totalQty: Number(r.totalQty ?? 0),
          revenue: Number(r.revenue ?? 0)
        }));
      }
      /** Obtiene órdenes del día actual. */
      async getTodayOrders() {
        try {
          const today = /* @__PURE__ */ new Date();
          today.setHours(0, 0, 0, 0);
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          const result = await db.execute(sql`
        SELECT 
          COUNT(*) as count,
          COALESCE(SUM(CAST(total_amount AS NUMERIC)), 0) as total_amount
        FROM orders 
        WHERE shopify_created_at >= ${today.toISOString()} 
          AND shopify_created_at < ${tomorrow.toISOString()}
      `);
          const stats = result.rows[0];
          return {
            count: Number(stats.count) || 0,
            totalAmount: Number(stats.total_amount) || 0
          };
        } catch (error) {
          console.error("Error getting today orders:", error);
          return { count: 0, totalAmount: 0 };
        }
      }
      /** Obtiene datos de órdenes por día de la semana para gráfico. */
      // storage.ts
      async getOrdersByWeekday(weekOffset = 0) {
        try {
          const result = await db.execute(sql`
      WITH base AS (
        SELECT (now() AT TIME ZONE 'America/Mexico_City') AS now_cdmx
      ),
      limites AS (
        SELECT
          -- Semana que inicia en DOMINGO:
          -- Truco: mueve +1 día para usar date_trunc('week') (que es lunes),
          -- luego resta 1 día para quedar en domingo.
          (date_trunc('week', (now_cdmx + INTERVAL '1 day')) - INTERVAL '1 day')
            - (${weekOffset}::int * INTERVAL '7 day') AS ini,
          CASE
            -- Semana actual: corta en hoy+1d para no mostrar días futuros
            WHEN ${weekOffset}::int = 0 THEN LEAST(
              (date_trunc('week', (now_cdmx + INTERVAL '1 day')) - INTERVAL '1 day') + INTERVAL '7 day',
              date_trunc('day', now_cdmx) + INTERVAL '1 day'
            )
            -- Semanas pasadas: rango completo domingo→domingo
            ELSE (
              (date_trunc('week', (now_cdmx + INTERVAL '1 day')) - INTERVAL '1 day')
                - (${weekOffset}::int * INTERVAL '7 day')
              + INTERVAL '7 day'
            )
          END AS fin
        FROM base
      )
      SELECT
        EXTRACT(DOW FROM (shopify_created_at AT TIME ZONE 'America/Mexico_City'))::int AS dow,
        COUNT(*)::bigint AS count
      FROM orders, limites
      WHERE shopify_created_at IS NOT NULL
        AND (shopify_created_at AT TIME ZONE 'America/Mexico_City') >= limites.ini
        AND (shopify_created_at AT TIME ZONE 'America/Mexico_City') <  limites.fin
      GROUP BY 1
      ORDER BY 1;
    `);
          const dayNames = ["Dom", "Lun", "Mar", "Mi\xE9", "Jue", "Vie", "S\xE1b"];
          const data = dayNames.map((day, index2) => {
            const found = result.rows.find((row) => Number(row.dow) === index2);
            return { day, count: found ? Number(found.count) : 0 };
          });
          return data;
        } catch (error) {
          console.error("Error getting orders by weekday:", error);
          return [];
        }
      }
      /** Obtiene ventas por mes para gráfico. */
      async getSalesByMonth() {
        try {
          const result = await db.execute(sql`
        SELECT 
          TO_CHAR(shopify_created_at, 'YYYY-MM') as month,
          COALESCE(SUM(CAST(total_amount AS NUMERIC)), 0) as sales
        FROM orders 
        WHERE shopify_created_at >= CURRENT_DATE - INTERVAL '12 months'
        GROUP BY TO_CHAR(shopify_created_at, 'YYYY-MM')
        ORDER BY month
      `);
          return result.rows.map((row) => ({
            month: row.month || "",
            sales: Number(row.sales) || 0
          }));
        } catch (error) {
          console.error("Error getting sales by month:", error);
          return [];
        }
      }
      // EXPRESSPL-INTEGRATION: Implementación de métodos para generar guías
      /** Obtiene una orden por ID para generación de guías. */
      async getOrderById(orderId) {
        try {
          const [order] = await db.select().from(orders).where(eq2(orders.id, Number(orderId))).limit(1);
          return order;
        } catch (error) {
          console.error("Error getting order by ID:", error);
          return void 0;
        }
      }
      /** Obtiene los items de una orden para calcular dimensiones y cantidad (EXPRESSPL). */
      async getOrderItemsForShipping(orderId) {
        try {
          const items = await db.select().from(orderItems).where(eq2(orderItems.orderId, Number(orderId)));
          return items;
        } catch (error) {
          console.error("Error getting order items for shipping:", error);
          return [];
        }
      }
      /** Obtiene un producto del catálogo por SKU interno para dimensiones. */
      async getCatalogoBySkuInterno(sku) {
        try {
          const [producto] = await db.select().from(catalogoProductos).where(eq2(catalogoProductos.sku_interno, sku)).limit(1);
          return producto;
        } catch (error) {
          console.error("Error getting catalog product by SKU:", error);
          return void 0;
        }
      }
      // ==== CATÁLOGO DE PRODUCTOS ====
      /** Obtiene productos paginados con filtros. */
      async getProductsPaginated(params) {
        const { page, pageSize, search, categoria, activo } = params;
        try {
          const conds = [];
          if (search) {
            const searchPattern = `%${search.toLowerCase()}%`;
            conds.push(
              sql`(
            LOWER(COALESCE(title, '')) LIKE ${searchPattern} OR
            LOWER(COALESCE(vendor, '')) LIKE ${searchPattern} OR
            LOWER(COALESCE(product_type, '')) LIKE ${searchPattern}
          )`
            );
          }
          const whereClause = conds.length > 0 ? and(...conds) : void 0;
          const offset = Math.max(0, (page - 1) * pageSize);
          const productos = await db.select().from(products).where(whereClause).orderBy(desc(products.updatedAt)).limit(pageSize).offset(offset);
          const totalResult = await db.select({ count: count() }).from(products).where(whereClause);
          const total = Number(totalResult[0]?.count ?? 0);
          return {
            rows: productos.map((p) => ({
              ...p,
              id: Number(p.id),
              // precio: p.precio ? Number(p.precio) : null, // Campo no existe
              // inventario: p.inventario || 0, // Campo no existe
              fechaCreacion: p.createdAt,
              fechaActualizacion: p.updatedAt
            })),
            total,
            page,
            pageSize
          };
        } catch (error) {
          console.error("Error getting products paginated:", error);
          return { rows: [], total: 0, page, pageSize };
        }
      }
      /** Obtiene las categorías únicas de productos. */
      async getProductCategories() {
        try {
          const result = await db.selectDistinct({ productType: products.productType }).from(products).where(isNotNull(products.productType));
          return result.map((r) => r.productType).filter(Boolean).sort();
        } catch (error) {
          console.error("Error getting product categories:", error);
          return [];
        }
      }
      /** Elimina un producto Shopify. */
      async deleteProduct(id) {
        await db.delete(products).where(eq2(products.id, id));
      }
      /** Crea tickets masivos y actualiza fulfillment_status a fulfilled */
      async createBulkTicketsAndUpdateStatus(orderIds, notes2) {
        try {
          const tickets2 = [];
          let updated = 0;
          for (const orderId of orderIds) {
            const numericOrderId = typeof orderId === "string" ? parseInt(orderId) : orderId;
            const numeroTicket = await this.getNextTicketNumber();
            const ticket = await this.createTicket({
              orderId: Number(numericOrderId),
              status: "open",
              notes: notes2 || `Ticket creado autom\xE1ticamente para orden ${numericOrderId}`
            });
            tickets2.push(ticket);
            await this.updateOrder(numericOrderId, {
              fulfillmentStatus: "fulfilled"
            });
            updated++;
          }
          return { tickets: tickets2, updated };
        } catch (error) {
          console.error("Error en createBulkTicketsAndUpdateStatus:", error);
          throw error;
        }
      }
      /** Obtiene órdenes con items para exportación */
      async getOrdersWithItemsForExport(filters) {
        try {
          const result = await db.execute(sql`
        SELECT 
          o.id,
          o.order_id as "orderId",
          o.customer_name as "customerName",
          o.customer_email as "customerEmail", 
          o.total_amount as "totalAmount",
          o.financial_status as "financialStatus",
          o.fulfillment_status as "fulfillmentStatus",
          o.shopify_created_at as "shopifyCreatedAt",
          o.shop_id as "shopId",
          -- Agregar items como JSON
          COALESCE(
            JSON_AGG(
              JSON_BUILD_OBJECT(
                'id', oi.id,
                'sku', oi.sku,
                'title', oi.title,
                'quantity', oi.quantity,
                'price', oi.price
              )
            ) FILTER (WHERE oi.id IS NOT NULL),
            '[]'::json
          ) as items
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        WHERE 1=1
        ${filters?.statusFilter === "managed" ? sql`AND LOWER(COALESCE(o.fulfillment_status, '')) = 'fulfilled'` : sql``}
        ${filters?.statusFilter === "unmanaged" ? sql`AND LOWER(COALESCE(o.fulfillment_status, '')) IN ('', 'unfulfilled')` : sql``}
        ${filters?.channelId ? sql`AND o.shop_id = ${filters.channelId}` : sql``}
        GROUP BY o.id, o.order_id, o.customer_name, o.customer_email, o.total_amount, 
                 o.financial_status, o.fulfillment_status, o.shopify_created_at, o.shop_id
        ORDER BY o.shopify_created_at DESC
        LIMIT 1000
      `);
          return result.rows.map((row) => ({
            ...row,
            items: typeof row.items === "string" ? JSON.parse(row.items) : row.items
          }));
        } catch (error) {
          console.error("Error getting orders with items for export:", error);
          return [];
        }
      }
      // ==== ÓRDENES PAGINADAS ====
      async getOrdersPaginated(params) {
        const {
          statusFilter,
          channelId,
          page,
          pageSize,
          search,
          searchType = "all",
          sortField,
          sortOrder = "desc"
        } = params;
        const conds = [];
        if (statusFilter === "unmanaged") {
          conds.push(sql`LOWER(COALESCE(o.fulfillment_status, '')) IN ('', 'unfulfilled')`);
        } else if (statusFilter === "managed") {
          conds.push(sql`LOWER(COALESCE(o.fulfillment_status, '')) = 'fulfilled'`);
        }
        if (channelId !== void 0 && channelId !== null) {
          conds.push(sql`o.shop_id = ${channelId}`);
        }
        if (search) {
          const searchPattern = `%${search.toLowerCase()}%`;
          if (searchType === "sku") {
            conds.push(sql`EXISTS (
        SELECT 1 FROM order_items oi2 
        WHERE oi2.order_id = o.id 
        AND LOWER(COALESCE(oi2.sku, '')) LIKE ${searchPattern}
      )`);
          } else if (searchType === "customer") {
            conds.push(sql`(
        LOWER(COALESCE(o.customer_name, '')) LIKE ${searchPattern} OR 
        LOWER(COALESCE(o.customer_email, '')) LIKE ${searchPattern}
      )`);
          } else if (searchType === "product") {
            conds.push(sql`EXISTS (
        SELECT 1 FROM order_items oi2 
        WHERE oi2.order_id = o.id 
        AND (
          LOWER(COALESCE(oi2.title, '')) LIKE ${searchPattern} OR
          LOWER(COALESCE(oi2.variant_title, '')) LIKE ${searchPattern}
        )
      )`);
          } else {
            conds.push(sql`(
        LOWER(COALESCE(o.order_id, '')) LIKE ${searchPattern} OR 
        LOWER(COALESCE(o.customer_name, '')) LIKE ${searchPattern} OR 
        LOWER(COALESCE(o.customer_email, '')) LIKE ${searchPattern} OR
        EXISTS (
          SELECT 1 FROM order_items oi2 
          WHERE oi2.order_id = o.id 
          AND (
            LOWER(COALESCE(oi2.sku, '')) LIKE ${searchPattern} OR
            LOWER(COALESCE(oi2.title, '')) LIKE ${searchPattern} OR
            LOWER(COALESCE(oi2.variant_title, '')) LIKE ${searchPattern}
          )
        )
      )`);
          }
        }
        const whereClause = conds.length ? sql`${conds.reduce((acc, cond, i) => i === 0 ? cond : sql`${acc} AND ${cond}`)}` : void 0;
        const offset = Math.max(0, (page - 1) * pageSize);
        const sortMap = {
          name: `COALESCE(o.name, o.order_id, '')`,
          createdAt: `COALESCE(o.shopify_created_at, o.created_at)`,
          totalAmount: `COALESCE(o.total_amount, 0)`
        };
        const sortCol = sortField && sortMap[sortField] ? sortMap[sortField] : `COALESCE(o.shopify_created_at, o.created_at)`;
        const sortDir = sortOrder === "asc" ? sql`ASC` : sql`DESC`;
        const orderDir = sortOrder?.toLowerCase() === "asc" ? sql`ASC` : sql`DESC`;
        const baseQuery = sql`
    SELECT 
      o.id::text as id,
      COALESCE(o.name, o.order_id, '') as name,
      COALESCE(o.customer_name, '') as "customerName",
      o.shop_id as "channelId",
      CASE 
        WHEN o.shop_id = 1 THEN 'Tienda 1'
        WHEN o.shop_id = 2 THEN 'Tienda 2'
        ELSE 'Tienda ' || o.shop_id::text
      END as "channelName", 
      COALESCE(o.total_amount, '0') as "totalAmount",
      COALESCE(o.fulfillment_status, '') as "fulfillmentStatus",
      COALESCE(o.shopify_created_at, o.created_at, NOW()) as "createdAt",
      COALESCE(COUNT(oi.id), 0) as "itemsCount",
      COALESCE(ARRAY_AGG(oi.sku) FILTER (WHERE oi.sku IS NOT NULL), ARRAY[]::text[]) as skus,
      CASE
        WHEN LOWER(COALESCE(o.fulfillment_status, '')) IN ('', 'unfulfilled') THEN 'SIN_GESTIONAR'
        WHEN LOWER(COALESCE(o.fulfillment_status, '')) = 'fulfilled' THEN 'GESTIONADA'
        WHEN LOWER(COALESCE(o.fulfillment_status, '')) = 'restocked' THEN 'DEVUELTO'
        ELSE 'ERROR'
      END as "uiStatus",
      EXISTS(SELECT 1 FROM tickets t WHERE t.order_id = o.id) as "hasTicket",
      CASE 
        WHEN LOWER(COALESCE(o.fulfillment_status, '')) = 'fulfilled' THEN true
        ELSE false
      END as "isManaged"
    FROM orders o
    LEFT JOIN order_items oi ON oi.order_id = o.id
    ${whereClause ? sql`WHERE ${whereClause}` : sql``}
    GROUP BY o.id, o.order_id, o.name, o.customer_name, o.total_amount, 
             o.fulfillment_status, o.shopify_created_at, o.created_at, o.shop_id
    ORDER BY ${sql.raw(sortCol)} ${sortDir}   -- ✅ orden dinámico seguro
    LIMIT ${pageSize} OFFSET ${offset}
  `;
        const countQuery = sql`
    SELECT COUNT(DISTINCT o.id) as count
    FROM orders o
    ${whereClause ? sql`WHERE ${whereClause}` : sql``}
  `;
        const [rows, totalRes] = await Promise.all([
          db.execute(baseQuery),
          db.execute(countQuery)
        ]);
        const total = Number(totalRes.rows[0]?.count ?? 0);
        return {
          rows: rows.rows,
          page,
          pageSize,
          total
        };
      }
      // Items de una orden
      async getOrderItems(orderIdParam) {
        try {
          const idNum = Number(orderIdParam);
          if (!Number.isInteger(idNum) || idNum <= 0) return [];
          const idBig = Number(idNum);
          console.log(`[DEBUG] Buscando items para order ID: ${idNum}`);
          const rawItems = await db.select().from(orderItems).where(eq2(orderItems.orderId, idBig));
          console.log(`[DEBUG] Items encontrados:`, rawItems);
          if (rawItems.length === 0) {
            console.log(`[DEBUG] No se encontraron items para order ${idNum}`);
            return [];
          }
          const items = await db.select({
            id: orderItems.id,
            sku: orderItems.sku,
            quantity: orderItems.quantity,
            price: orderItems.price,
            shopifyProductId: orderItems.shopifyProductId,
            shopifyVariantId: orderItems.shopifyVariantId,
            productName: catalogoProductos.nombre_producto,
            skuInterno: catalogoProductos.sku_interno,
            skuExterno: orderItems.sku
          }).from(orderItems).leftJoin(
            catalogoProductos,
            eq2(catalogoProductos.sku, orderItems.sku)
          ).where(eq2(orderItems.orderId, idBig)).orderBy(asc(orderItems.id));
          console.log(`[DEBUG] Items con join:`, items);
          const normalized = items.map((it) => ({
            ...it,
            productName: it.productName?.trim() || `Producto ${it.sku || "sin SKU"}`,
            skuInterno: it.skuInterno || null,
            skuExterno: it.skuExterno || it.sku || null
          }));
          console.log(`[DEBUG] Items normalizados:`, normalized);
          return normalized;
        } catch (e) {
          console.error("[ERROR] Error getting order items:", e);
          return [];
        }
      }
      async getCatalogProductsPaginated(page, pageSize) {
        const offset = (page - 1) * pageSize;
        const rows = await db.select().from(catalogoProductos).orderBy(asc(catalogoProductos.nombre_producto)).limit(pageSize).offset(offset);
        const totalRes = await db.select({ count: count() }).from(catalogoProductos);
        return { rows, total: Number(totalRes[0]?.count ?? 0), page, pageSize };
      }
      async getExternalProductsPaginated(page, pageSize) {
        return { rows: [], total: 0, page, pageSize };
      }
      async getOrdersForExport(filters) {
        const {
          selectedIds,
          statusFilter = "unmanaged",
          channelId,
          search,
          searchType = "all",
          page,
          pageSize,
          sortField,
          sortOrder = "desc"
        } = filters;
        if (selectedIds?.length) {
          const ids = selectedIds.map((id) => BigInt(id));
          const q = sql`
      SELECT 
        o.id, o.shop_id as "shopId", o.order_id as "orderId",
        o.name, o.order_number as "orderNumber",
        o.customer_name as "customerName", o.customer_email as "customerEmail",
        o.subtotal_price as "subtotalPrice", o.total_amount as "totalAmount",
        o.currency, o.financial_status as "financialStatus", o.fulfillment_status as "fulfillmentStatus",
        o.tags, o.created_at as "createdAt", o.shopify_created_at as "shopifyCreatedAt",
        COUNT(oi.id) as "itemsCount",
        COALESCE(ARRAY_AGG(oi.sku) FILTER (WHERE oi.sku IS NOT NULL), ARRAY[]::text[]) as skus
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      WHERE o.id = ANY(${ids})
      GROUP BY o.id
    `;
          const rows = await db.execute(q);
          return rows.rows;
        }
        const resp = await this.getOrdersPaginated({
          statusFilter,
          channelId,
          page: page ?? 1,
          pageSize: pageSize ?? 1e3,
          search,
          searchType,
          sortField,
          sortOrder
        });
        return resp.rows.map((r) => ({
          shopId: r.channelId,
          orderId: r.name || r.id,
          name: r.name,
          orderNumber: null,
          customerName: r.customerName,
          customerEmail: r.customerEmail,
          subtotalPrice: null,
          totalAmount: r.totalAmount,
          currency: null,
          financialStatus: null,
          fulfillmentStatus: r.fulfillmentStatus,
          tags: null,
          createdAt: r.createdAt,
          shopifyCreatedAt: r.createdAt,
          itemsCount: r.itemsCount,
          skus: r.skus
        }));
      }
      // ===== Importación por filas =====
      parseNumber(v) {
        if (v == null || v === "") return null;
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
      }
      parseDate(v) {
        if (!v) return null;
        const d = new Date(String(v));
        return isNaN(d.getTime()) ? null : d;
      }
      normalizeRow(r) {
        const get = (k) => {
          const key = Object.keys(r).find((kk) => kk.toLowerCase() === k.toLowerCase());
          return key ? r[key] : null;
        };
        const rawTags = get("tags");
        const tags = Array.isArray(rawTags) ? rawTags : typeof rawTags === "string" && rawTags ? rawTags.split(",").map((s) => s.trim()).filter(Boolean) : null;
        return {
          shopId: r.shopId ?? get("shopId") ?? get("shop_id"),
          orderId: r.orderId ?? get("orderId") ?? get("order_id"),
          name: get("name"),
          orderNumber: get("orderNumber") ?? get("order_number"),
          customerName: get("customerName") ?? get("customer_name"),
          customerEmail: get("customerEmail") ?? get("customer_email"),
          subtotalPrice: this.parseNumber(get("subtotalPrice") ?? get("subtotal_price")),
          totalAmount: this.parseNumber(get("totalAmount") ?? get("total_amount")),
          currency: get("currency"),
          financialStatus: get("financialStatus") ?? get("financial_status"),
          fulfillmentStatus: get("fulfillmentStatus") ?? get("fulfillment_status"),
          tags,
          createdAt: this.parseDate(get("createdAt") ?? get("created_at")),
          shopifyCreatedAt: this.parseDate(get("shopifyCreatedAt") ?? get("shopify_created_at")),
          items: get("items"),
          skus: get("skus") ? String(get("skus")).split(",").map((s) => s.trim()).filter(Boolean) : null
        };
      }
      validateRow(n) {
        if (n.shopId == null || String(n.shopId).trim() === "") {
          return { ok: false, field: "shopId", message: "shopId es obligatorio" };
        }
        if (n.orderId == null || String(n.orderId).trim() === "") {
          return { ok: false, field: "orderId", message: "orderId es obligatorio" };
        }
        if (n.customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(n.customerEmail))) {
          return { ok: false, field: "customerEmail", message: "Formato de email inv\xE1lido" };
        }
        if (n.subtotalPrice != null && typeof n.subtotalPrice !== "number") {
          return { ok: false, field: "subtotalPrice", message: "subtotalPrice no es num\xE9rico" };
        }
        if (n.totalAmount != null && typeof n.totalAmount !== "number") {
          return { ok: false, field: "totalAmount", message: "totalAmount no es num\xE9rico" };
        }
        return { ok: true };
      }
      async importOrdersFromRows(rows) {
        const results = [];
        let ok = 0, skipped = 0, errors = 0;
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          try {
            const shopIdRaw = row["shopId"];
            const orderIdRaw = row["orderId"];
            if (shopIdRaw == null || orderIdRaw == null) {
              skipped++;
              results.push({
                rowIndex: i,
                status: "skipped",
                message: "Faltan columnas obligatorias: shopId y/o orderId"
              });
              continue;
            }
            const shopId = Number(shopIdRaw);
            const orderId = String(orderIdRaw).trim();
            if (!Number.isInteger(shopId) || !orderId) {
              skipped++;
              results.push({
                rowIndex: i,
                status: "skipped",
                message: "Valores inv\xE1lidos en shopId/orderId",
                field: !Number.isInteger(shopId) ? "shopId" : "orderId",
                value: !Number.isInteger(shopId) ? shopIdRaw : orderIdRaw
              });
              continue;
            }
            const existente = await this.getOrderByShopifyId(orderId, shopId);
            const toDecimal = (v) => v == null || v === "" ? null : typeof v === "number" ? v : Number(String(v).replace(/,/g, ""));
            const toDate = (v) => v ? new Date(String(v)) : null;
            const toArray = (v) => Array.isArray(v) ? v : typeof v === "string" ? v.split(",").map((s) => s.trim()).filter(Boolean) : null;
            const payload = {
              shopId,
              orderId,
              name: row["name"] ?? null,
              orderNumber: row["orderNumber"] ?? null,
              customerName: row["customerName"] ?? null,
              customerEmail: row["customerEmail"] ?? null,
              subtotalPrice: toDecimal(row["subtotalPrice"]),
              totalAmount: toDecimal(row["totalAmount"]),
              currency: row["currency"] ?? null,
              financialStatus: row["financialStatus"] ?? null,
              fulfillmentStatus: row["fulfillmentStatus"] ?? null,
              tags: toArray(row["tags"]),
              createdAt: toDate(row["createdAt"]) ?? void 0,
              shopifyCreatedAt: toDate(row["shopifyCreatedAt"]) ?? void 0
            };
            if (existente) {
              await this.updateOrder(Number(existente.id), payload);
            } else {
              await this.createOrder(payload);
            }
            ok++;
            results.push({ rowIndex: i, status: "ok", orderId });
          } catch (e) {
            errors++;
            results.push({
              rowIndex: i,
              status: "error",
              message: e?.message || "Error no identificado"
            });
          }
        }
        return {
          results,
          summary: { processed: rows.length, ok, skipped, errors }
        };
      }
    };
    storage = new DatabaseStorage();
    almacenamiento = storage;
  }
});

// server/catalogStorage.ts
var catalogStorage_exports = {};
__export(catalogStorage_exports, {
  CatalogStorage: () => CatalogStorage,
  catalogStorage: () => catalogStorage
});
import { sql as sql2 } from "drizzle-orm";
var CatalogStorage, catalogStorage;
var init_catalogStorage = __esm({
  "server/catalogStorage.ts"() {
    "use strict";
    init_db();
    CatalogStorage = class {
      /** Obtiene productos del catálogo paginados con filtros. */
      async getProductsPaginated(params) {
        const { page, pageSize, search, categoria, activo } = params;
        try {
          const offset = Math.max(0, (page - 1) * pageSize);
          let whereConditions = ["1=1"];
          let params_array = [];
          let paramIndex = 1;
          if (search) {
            whereConditions.push(`(
          LOWER(COALESCE(nombre_producto, '')) LIKE LOWER($${paramIndex}) OR
          LOWER(COALESCE(sku, '')) LIKE LOWER($${paramIndex + 1}) OR
          LOWER(COALESCE(marca_producto, '')) LIKE LOWER($${paramIndex + 2})
        )`);
            const searchPattern = `%${search}%`;
            params_array.push(searchPattern, searchPattern, searchPattern);
            paramIndex += 3;
          }
          if (categoria) {
            whereConditions.push(`categoria = $${paramIndex}`);
            params_array.push(categoria);
            paramIndex++;
          }
          const whereClause = whereConditions.join(" AND ");
          const productos = await db.execute(sql2`
        SELECT sku, marca, nombre_producto, categoria, marca_producto, 
               stock, costo, sku_interno, codigo_barras
        FROM catalogo_productos 
        WHERE nombre_producto IS NOT NULL
        ORDER BY nombre_producto
        LIMIT ${pageSize} OFFSET ${offset}
      `);
          const totalResult = await db.execute(sql2`
        SELECT COUNT(*) as total 
        FROM catalogo_productos 
        WHERE nombre_producto IS NOT NULL
      `);
          const total = Number(totalResult.rows[0]?.total ?? 0);
          return {
            rows: productos.rows.map((p) => ({
              id: p.sku,
              // Usar SKU como ID único
              nombre: p.nombre_producto,
              sku: p.sku,
              categoria: p.categoria,
              marca: p.marca_producto,
              precio: p.costo ? Number(p.costo) : null,
              inventario: p.stock || 0,
              activo: true,
              // Por defecto activo ya que no tenemos columna situacion
              sku_interno: p.sku_interno,
              codigo_barras: p.codigo_barras
            })),
            total,
            page,
            pageSize
          };
        } catch (error) {
          console.error("Error getting products paginated:", error);
          return { rows: [], total: 0, page, pageSize };
        }
      }
      /** Obtiene las categorías únicas de productos del catálogo. */
      async getProductCategories() {
        try {
          const result = await db.execute(sql2`
        SELECT DISTINCT categoria 
        FROM catalogo_productos 
        WHERE categoria IS NOT NULL 
        ORDER BY categoria
      `);
          return result.rows.map((r) => r.categoria).filter(Boolean);
        } catch (error) {
          console.error("Error getting product categories:", error);
          return [];
        }
      }
      /** Crea un nuevo producto en el catálogo. */
      async createProduct(datos) {
        try {
          await db.execute(sql2`
        INSERT INTO catalogo_productos (
          sku, nombre_producto, categoria, marca_producto, stock, costo
        ) VALUES (
          ${datos.sku}, 
          ${datos.nombre}, 
          ${datos.categoria || null}, 
          ${datos.marca || null}, 
          ${datos.inventario || 0}, 
          ${datos.precio || null}
        )
      `);
          return {
            id: datos.sku,
            nombre: datos.nombre,
            sku: datos.sku,
            categoria: datos.categoria,
            marca: datos.marca,
            precio: datos.precio,
            inventario: datos.inventario || 0,
            activo: datos.activo ?? true
          };
        } catch (error) {
          console.error("Error creating product:", error);
          throw error;
        }
      }
      /** Actualiza un producto del catálogo. */
      async updateProduct(id, datos) {
        try {
          await db.execute(sql2`
        UPDATE catalogo_productos 
        SET 
          nombre_producto = ${datos.nombre || null},
          categoria = ${datos.categoria || null},
          marca_producto = ${datos.marca || null},
          stock = ${datos.inventario || 0},
          costo = ${datos.precio || null}
        WHERE sku = ${id}
      `);
          return {
            id,
            nombre: datos.nombre,
            sku: id,
            categoria: datos.categoria,
            marca: datos.marca,
            precio: datos.precio,
            inventario: datos.inventario || 0,
            activo: datos.activo ?? true
          };
        } catch (error) {
          console.error("Error updating product:", error);
          throw error;
        }
      }
      /** Elimina un producto del catálogo. */
      async deleteProduct(id) {
        try {
          await db.execute(sql2`
        DELETE FROM catalogo_productos WHERE sku = ${id}
      `);
        } catch (error) {
          console.error("Error deleting product:", error);
          throw error;
        }
      }
    };
    catalogStorage = new CatalogStorage();
  }
});

// server/productStorage.ts
var productStorage_exports = {};
__export(productStorage_exports, {
  ProductStorage: () => ProductStorage,
  productStorage: () => productStorage
});
import { sql as sql3 } from "drizzle-orm";
import { eq as eq4 } from "drizzle-orm";
var ProductStorage, productStorage;
var init_productStorage = __esm({
  "server/productStorage.ts"() {
    "use strict";
    init_db();
    init_schema();
    ProductStorage = class {
      // ================== CATÁLOGO ==================
      /** 
       * Obtiene productos del catálogo con paginación y filtros avanzados
       * Corrección: Implementa búsqueda y filtros dinámicos correctamente
       */
      async getCatalogProducts(params) {
        const {
          page,
          pageSize,
          search,
          searchField,
          marca,
          categoria,
          condicion,
          marca_producto,
          orderBy = "nombre_producto",
          orderDir = "asc"
        } = params;
        if (page < 1 || pageSize < 1 || pageSize > 1e3) {
          throw new Error("Par\xE1metros de paginaci\xF3n inv\xE1lidos");
        }
        const offset = (page - 1) * pageSize;
        const validCols = ["sku", "sku_interno", "codigo_barras", "nombre_producto", "categoria", "marca", "marca_producto"];
        const orderCol = validCols.includes(orderBy) ? orderBy : "nombre_producto";
        const orderDirection = orderDir === "desc" ? sql3.raw("DESC") : sql3.raw("ASC");
        const whereParts = [sql3`1=1`];
        if (search) {
          if (searchField && validCols.includes(searchField)) {
            whereParts.push(
              sql3`LOWER(COALESCE(${sql3.raw(searchField)}, '')) LIKE LOWER(${`%${search.toLowerCase()}%`})`
            );
          } else {
            const s = `%${search.toLowerCase()}%`;
            whereParts.push(sql3`(
        LOWER(COALESCE(sku,'')) LIKE LOWER(${s})
        OR LOWER(COALESCE(sku_interno,'')) LIKE LOWER(${s})
        OR LOWER(COALESCE(codigo_barras,'')) LIKE LOWER(${s})
        OR LOWER(COALESCE(nombre_producto,'')) LIKE LOWER(${s})
      )`);
          }
        }
        if (marca) whereParts.push(sql3`marca = ${marca}`);
        if (categoria) whereParts.push(sql3`categoria = ${categoria}`);
        if (condicion) whereParts.push(sql3`condicion = ${condicion}`);
        if (marca_producto) whereParts.push(sql3`marca_producto = ${marca_producto}`);
        const whereSQL = sql3.join(whereParts, sql3` AND `);
        const productos = await db.execute(sql3`
    SELECT
      sku, marca, sku_interno, codigo_barras, nombre_producto, modelo, categoria,
      condicion, marca_producto, variante, largo, ancho, alto, peso, foto, costo, stock
    FROM ${sql3.raw("catalogo_productos")}
    WHERE ${whereSQL}
    ORDER BY ${sql3.raw(orderCol)} ${orderDirection}
    LIMIT ${pageSize} OFFSET ${offset}
  `);
        const totalRes = await db.execute(sql3`
    SELECT COUNT(*)::int AS total
    FROM ${sql3.raw("catalogo_productos")}
    WHERE ${whereSQL}
  `);
        const total = Number(totalRes.rows[0]?.total ?? 0);
        return {
          rows: productos.rows.map((p) => ({
            sku: p.sku,
            marca: p.marca,
            sku_interno: p.sku_interno,
            codigo_barras: p.codigo_barras,
            nombre_producto: p.nombre_producto,
            modelo: p.modelo,
            categoria: p.categoria,
            condicion: p.condicion,
            marca_producto: p.marca_producto,
            variante: p.variante,
            largo: p.largo ? Number(p.largo) : null,
            ancho: p.ancho ? Number(p.ancho) : null,
            alto: p.alto ? Number(p.alto) : null,
            peso: p.peso ? Number(p.peso) : null,
            foto: p.foto,
            costo: p.costo ? Number(p.costo) : null,
            stock: p.stock ? Number(p.stock) : 0
          })),
          total,
          page,
          pageSize
        };
      }
      async createCatalogProduct(product) {
        const cols = Object.keys(product);
        if (cols.length === 0) throw new Error("Datos insuficientes");
        const colNodes = cols.map((c) => sql3.raw(c));
        const valNodes = cols.map((c) => sql3`${product[c]}`);
        const result = await db.execute(sql3`
    INSERT INTO ${sql3.raw("catalogo_productos")}
      (${sql3.join(colNodes, sql3`, `)})
    VALUES
      (${sql3.join(valNodes, sql3`, `)})
    RETURNING *
  `);
        return result.rows[0];
      }
      async deleteCatalogProduct(sku) {
        await db.execute(sql3`DELETE FROM catalogo_productos WHERE sku = ${sku}`);
        return { success: true };
      }
      /** Actualiza un producto del catálogo */
      async updateCatalogProduct(sku, updates) {
        try {
          const fields = Object.keys(updates);
          if (fields.length === 0) return { success: true };
          const setNodes = fields.map((f) => sql3`${sql3.raw(f)} = ${updates[f]}`);
          await db.execute(sql3`
      UPDATE ${sql3.raw("catalogo_productos")}
      SET ${sql3.join(setNodes, sql3`, `)}
      WHERE sku = ${sku}
    `);
          return { success: true };
        } catch (error) {
          console.error("Error updating catalog product:", error);
          throw error;
        }
      }
      /** Obtiene facetas únicas para filtros */
      async getCatalogFacets() {
        try {
          const [marcas, categorias, condiciones, marcasProducto] = await Promise.all([
            db.execute(sql3`SELECT DISTINCT marca FROM catalogo_productos WHERE marca IS NOT NULL ORDER BY marca`),
            db.execute(sql3`SELECT DISTINCT categoria FROM catalogo_productos WHERE categoria IS NOT NULL ORDER BY categoria`),
            db.execute(sql3`SELECT DISTINCT condicion FROM catalogo_productos WHERE condicion IS NOT NULL ORDER BY condicion`),
            db.execute(sql3`SELECT DISTINCT marca_producto FROM catalogo_productos WHERE marca_producto IS NOT NULL ORDER BY marca_producto`)
          ]);
          return {
            marcas: marcas.rows.map((r) => r.marca),
            categorias: categorias.rows.map((r) => r.categoria),
            condiciones: condiciones.rows.map((r) => r.condicion),
            marcasProducto: marcasProducto.rows.map((r) => r.marca_producto)
          };
        } catch (error) {
          console.error("Error getting catalog facets:", error);
          return { marcas: [], categorias: [], condiciones: [], marcasProducto: [] };
        }
      }
      // ================== SHOPIFY ==================
      /** Obtiene productos Shopify con variantes paginados */
      async getShopifyProducts(params) {
        const { page, pageSize, search, shopId, status, vendor, productType } = params;
        const offset = (page - 1) * pageSize;
        const whereParts = [sql3`1=1`];
        if (search) {
          const s = `%${search}%`;
          whereParts.push(sql3`(
      LOWER(COALESCE(p.title,'')) LIKE LOWER(${s})
      OR LOWER(COALESCE(v.sku,'')) LIKE LOWER(${s})
      OR LOWER(COALESCE(v.barcode,'')) LIKE LOWER(${s})
    )`);
        }
        if (shopId) whereParts.push(sql3`p.shop_id = ${shopId}`);
        if (status) whereParts.push(sql3`p.status = ${status}`);
        if (vendor) whereParts.push(sql3`p.vendor = ${vendor}`);
        if (productType) whereParts.push(sql3`p.product_type = ${productType}`);
        const whereSQL = sql3.join(whereParts, sql3` AND `);
        const productos = await db.execute(sql3`
    SELECT 
      p.id as product_id,
      p.id_shopify as shopify_product_id,
      p.shop_id,
      p.title,
      p.vendor,
      p.product_type,
      p.status as product_status,
      v.id as variant_id,
      v.id_shopify as shopify_variant_id,
      v.sku,
      v.price,
      v.compare_at_price,
      v.barcode,
      v.inventory_qty,
      CASE 
        WHEN p.shop_id = 1 THEN 'WordWide'
        WHEN p.shop_id = 2 THEN 'CrediTienda'
        ELSE 'Tienda ' || p.shop_id::text
      END as shop_name
    FROM products p
    LEFT JOIN variants v ON v.product_id = p.id
    WHERE ${whereSQL}
    ORDER BY p.title, v.sku
    LIMIT ${pageSize} OFFSET ${offset}
  `);
        const totalRes = await db.execute(sql3`
    SELECT COUNT(DISTINCT p.id) as total
    FROM products p
    LEFT JOIN variants v ON v.product_id = p.id
    WHERE ${whereSQL}
  `);
        const total = Number(totalRes.rows[0]?.total ?? 0);
        return {
          rows: productos.rows.map((row) => ({
            product_id: row.product_id,
            shopify_product_id: row.shopify_product_id,
            shop_id: row.shop_id,
            shop_name: row.shop_name,
            title: row.title,
            vendor: row.vendor,
            product_type: row.product_type,
            product_status: row.product_status,
            variant_id: row.variant_id,
            shopify_variant_id: row.shopify_variant_id,
            sku: row.sku,
            price: row.price ? Number(row.price) : null,
            compare_at_price: row.compare_at_price ? Number(row.compare_at_price) : null,
            barcode: row.barcode,
            inventory_qty: row.inventory_qty || 0
          })),
          total,
          page,
          pageSize
        };
      }
      /** Actualiza una variante Shopify */
      async updateShopifyVariant(variantId, updates, userId) {
        try {
          const [variant] = await db.update(variants).set({
            ...updates,
            updatedAt: /* @__PURE__ */ new Date()
          }).where(eq4(variants.id, variantId)).returning();
          if (variant) {
            await this.enqueueShopifyJob({
              shopId: await this.getShopIdByVariant(variantId),
              jobType: "update_variant",
              shopifyVariantId: variant.idShopify,
              payload: updates
            });
          }
          return variant;
        } catch (error) {
          console.error("Error updating Shopify variant:", error);
          throw error;
        }
      }
      // ================== CONCILIACIÓN ==================
      /** Obtiene estadísticas de conciliación */
      async getReconciliationStats() {
        try {
          const [emparejados, faltantes, conflictos] = await Promise.all([
            db.execute(sql3`
          SELECT COUNT(*) as count 
          FROM product_links 
          WHERE match_status = 'matched'
        `),
            db.execute(sql3`
          SELECT COUNT(*) as count 
          FROM catalogo_productos cp
          LEFT JOIN product_links pl ON cp.sku = pl.catalogo_sku
          WHERE pl.id IS NULL
        `),
            db.execute(sql3`
          SELECT COUNT(*) as count 
          FROM product_links 
          WHERE match_status = 'conflict'
        `)
          ]);
          return {
            emparejados: Number(emparejados.rows[0]?.count ?? 0),
            faltantes: Number(faltantes.rows[0]?.count ?? 0),
            conflictos: Number(conflictos.rows[0]?.count ?? 0)
          };
        } catch (error) {
          console.error("Error getting reconciliation stats:", error);
          return { emparejados: 0, faltantes: 0, conflictos: 0 };
        }
      }
      /** Obtiene productos sin vincular */
      async getUnlinkedProducts(type, params) {
        const { page, pageSize } = params;
        const offset = Math.max(0, (page - 1) * pageSize);
        try {
          if (type === "catalog") {
            const result = await db.execute(sql3`
          SELECT cp.sku, cp.nombre_producto, cp.marca_producto, cp.categoria
          FROM catalogo_productos cp
          LEFT JOIN product_links pl ON cp.sku = pl.catalogo_sku
          WHERE pl.id IS NULL
          ORDER BY cp.nombre_producto
          LIMIT ${pageSize} OFFSET ${offset}
        `);
            const totalResult = await db.execute(sql3`
          SELECT COUNT(*) as total
          FROM catalogo_productos cp
          LEFT JOIN product_links pl ON cp.sku = pl.catalogo_sku
          WHERE pl.id IS NULL
        `);
            return {
              rows: result.rows,
              total: Number(totalResult.rows[0]?.total ?? 0),
              page,
              pageSize
            };
          } else {
            const result = await db.execute(sql3`
          SELECT 
            v.id as variant_id,
            v.sku,
            v.barcode,
            p.title,
            p.shop_id,
            CASE 
              WHEN p.shop_id = 1 THEN 'WordWide'
              WHEN p.shop_id = 2 THEN 'CrediTienda'
              ELSE 'Tienda ' || p.shop_id::text
            END as shop_name
          FROM variants v
          JOIN products p ON v.product_id = p.id
          LEFT JOIN product_links pl ON v.id = pl.variant_id
          WHERE pl.id IS NULL AND v.sku IS NOT NULL
          ORDER BY p.title, v.sku
          LIMIT ${pageSize} OFFSET ${offset}
        `);
            const totalResult = await db.execute(sql3`
          SELECT COUNT(*) as total
          FROM variants v
          JOIN products p ON v.product_id = p.id
          LEFT JOIN product_links pl ON v.id = pl.variant_id
          WHERE pl.id IS NULL AND v.sku IS NOT NULL
        `);
            return {
              rows: result.rows,
              total: Number(totalResult.rows[0]?.total ?? 0),
              page,
              pageSize
            };
          }
        } catch (error) {
          console.error(`Error getting unlinked ${type} products:`, error);
          return { rows: [], total: 0, page, pageSize };
        }
      }
      /** Crea vínculo entre catálogo y Shopify */
      async createProductLink(link) {
        try {
          const [productLink] = await db.insert(productLinks).values({
            ...link,
            createdAt: /* @__PURE__ */ new Date(),
            updatedAt: /* @__PURE__ */ new Date()
          }).returning();
          return productLink;
        } catch (error) {
          console.error("Error creating product link:", error);
          throw error;
        }
      }
      /** Elimina vínculo */
      async deleteProductLink(id) {
        try {
          await db.delete(productLinks).where(eq4(productLinks.id, id));
          return { success: true };
        } catch (error) {
          console.error("Error deleting product link:", error);
          throw error;
        }
      }
      // ================== JOBS DE SHOPIFY ==================
      /** Encola job para Shopify (deshabilitado: tabla no disponible) */
      async enqueueShopifyJob(_job) {
        return;
      }
      // ================== UTILIDADES ==================
      /** Obtiene shop_id por variant_id */
      async getShopIdByVariant(variantId) {
        try {
          const result = await db.execute(sql3`
        SELECT p.shop_id 
        FROM variants v 
        JOIN products p ON v.product_id = p.id 
        WHERE v.id = ${variantId}
      `);
          return Number(result.rows[0]?.shop_id ?? 1);
        } catch (error) {
          console.error("Error getting shop_id by variant:", error);
          return 1;
        }
      }
    };
    productStorage = new ProductStorage();
  }
});

// server/integrations/shopify/cancelOrder.ts
var cancelOrder_exports = {};
__export(cancelOrder_exports, {
  cancelShopifyOrderAndWait: () => cancelShopifyOrderAndWait
});
import fetch2 from "node-fetch";
async function cancelShopifyOrderAndWait(args) {
  const { shop, token, apiVersion } = getShopifyCredentials(String(args.shopId));
  const reasonEff = args.reason && String(args.reason).trim() ? args.reason : "OTHER";
  const restockEff = typeof args.restock === "boolean" ? args.restock : true;
  const notifyEff = !!args.email;
  const refundMethod = args.refund ? { originalPaymentMethodsRefund: true } : void 0;
  const staffNote = args.staffNote ? String(args.staffNote).slice(0, 255) : null;
  const r = await fetch2(`https://${shop}/admin/api/${apiVersion}/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
    body: JSON.stringify({
      query: ORDER_CANCEL_MUTATION,
      variables: {
        orderId: args.orderGid,
        notifyCustomer: notifyEff,
        refundMethod,
        // opcional
        restock: restockEff,
        // Boolean!
        reason: reasonEff,
        // OrderCancelReason!
        staffNote
        // opcional
      }
    })
  });
  const data = await r.json();
  const gqlErrors = data?.data?.orderCancel?.orderCancelUserErrors?.length ? data.data.orderCancel.orderCancelUserErrors : data?.data?.orderCancel?.userErrors?.length ? data.data.orderCancel.userErrors : data?.errors;
  if (!r.ok || gqlErrors && gqlErrors.length) {
    return { ok: false, stage: "request", errors: gqlErrors || [{ message: "Shopify cancel failed" }] };
  }
  const jobId = data?.data?.orderCancel?.job?.id;
  if (!jobId) {
    return { ok: false, stage: "no-job", errors: [{ message: "Shopify did not return a job id" }] };
  }
  const started = Date.now();
  const deadlineMs = 2e4;
  let delay = 500;
  while (Date.now() - started < deadlineMs) {
    const jr = await fetch2(`https://${shop}/admin/api/${apiVersion}/graphql.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
      body: JSON.stringify({ query: JOB_QUERY, variables: { id: jobId } })
    });
    const jdata = await jr.json();
    const done = !!jdata?.data?.job?.done;
    if (done) break;
    await new Promise((res) => setTimeout(res, delay));
    delay = Math.min(delay + 250, 1500);
  }
  const or3 = await fetch2(`https://${shop}/admin/api/${apiVersion}/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
    body: JSON.stringify({ query: ORDER_QUERY, variables: { id: args.orderGid } })
  });
  const odata = await or3.json();
  const order = odata?.data?.node;
  if (!order?.cancelledAt) {
    return { ok: false, stage: "verify", errors: [{ message: "Cancellation not reflected yet (cancelledAt null)" }], order };
  }
  return { ok: true, order };
}
var ORDER_CANCEL_MUTATION, JOB_QUERY, ORDER_QUERY;
var init_cancelOrder = __esm({
  "server/integrations/shopify/cancelOrder.ts"() {
    "use strict";
    init_shopifyEnv();
    ORDER_CANCEL_MUTATION = `
mutation OrderCancel(
  $orderId: ID!,
  $notifyCustomer: Boolean,
  $refundMethod: OrderCancelRefundMethodInput,
  $restock: Boolean!,
  $reason: OrderCancelReason!,
  $staffNote: String
){
  orderCancel(
    orderId: $orderId,
    notifyCustomer: $notifyCustomer,
    refundMethod: $refundMethod,
    restock: $restock,
    reason: $reason,
    staffNote: $staffNote
  ) {
    job { id done }
    orderCancelUserErrors { field message code }
    userErrors { field message }
  }
}`;
    JOB_QUERY = `
query job($id: ID!){
  job(id: $id) { id done }
}`;
    ORDER_QUERY = `
query order($id: ID!){
  node(id: $id) {
    ... on Order {
      id
      name
      cancelledAt
      cancelReason
      displayFinancialStatus
      displayFulfillmentStatus
    }
  }
}`;
  }
});

// server/services/MlgClient.ts
var MlgClient_exports = {};
__export(MlgClient_exports, {
  mlgRequest: () => mlgRequest
});
import { z as z2 } from "zod";
async function doLoginAt(path3) {
  const url = `${MLG_BASE_URL}${path3}`;
  const payload = { email: MLG_EMAIL, password: MLG_PASSWORD };
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const text2 = await res.text().catch(() => "<no-body>");
    console.error("[MLG] login failed:", res.status, res.statusText, "URL:", url, "BODY:", text2?.slice(0, 500));
    throw new Error(`MLG login HTTP ${res.status}`);
  }
  const data = await res.json().catch(() => ({}));
  const parsed = LoginRespSchema.safeParse(data);
  if (!parsed.success) {
    console.error("[MLG] login schema mismatch:", data);
    throw new Error(`MLG login invalid schema`);
  }
  const token = parsed.data.token ?? null;
  if (!token) {
    console.error("[MLG] login no token. Response:", parsed.data);
    throw new Error(`MLG login failed: ${parsed.data.description ?? "no token"}`);
  }
  cachedToken = token;
  tokenExpiresAt = Date.now() + MLG_TOKEN_TTL_MIN * 60 * 1e3;
  console.log("[MLG] login ok at", path3);
  return cachedToken;
}
async function login() {
  console.log("MLG login starting...");
  try {
    return await doLoginAt("/api/Account/login");
  } catch (e) {
    if (String(e?.message).includes("HTTP 404")) {
      console.warn("[MLG] /api/Account/login \u2192 404, intentando /Account/login");
      return await doLoginAt("/Account/login");
    }
    throw e;
  }
}
async function getToken() {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;
  return login();
}
async function mlgRequest(path3, init = {}, retry = true) {
  const token = await getToken();
  const res = await fetch(`${MLG_BASE_URL}${path3}`, {
    ...init,
    method: init.method ?? "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      ...init.headers ?? {},
      Authorization: `Bearer ${token}`
    }
  });
  if (res.status === 401 && retry) {
    console.log("MLG re-login on 401");
    await login();
    return mlgRequest(path3, init, false);
  }
  if (res.status === 404) {
    const text2 = await res.text().catch(() => "<no-body>");
    console.error("[MLG] 404 at", `${MLG_BASE_URL}${path3}`, "BODY:", text2?.slice(0, 500));
  }
  return res;
}
var rawBase, rawEmail, rawPassword, MLG_TOKEN_TTL_MIN, MLG_BASE_URL, MLG_EMAIL, MLG_PASSWORD, LoginRespSchema, cachedToken, tokenExpiresAt;
var init_MlgClient = __esm({
  "server/services/MlgClient.ts"() {
    "use strict";
    rawBase = process.env.MLG_BASE_URL ?? "https://www.mlgdev.mx/marketplaceapi";
    rawEmail = process.env.MLG_EMAIL ?? "";
    rawPassword = process.env.MLG_PASSWORD ?? "";
    MLG_TOKEN_TTL_MIN = Number(process.env.MLG_TOKEN_TTL_MIN ?? 50);
    MLG_BASE_URL = rawBase.trim().replace(/\/+$/, "");
    MLG_EMAIL = rawEmail.trim();
    MLG_PASSWORD = rawPassword.trim();
    if (!MLG_BASE_URL || !MLG_EMAIL || !MLG_PASSWORD) {
      console.error("[MLG] Faltan variables de entorno:");
      console.error("  MLG_BASE_URL:", JSON.stringify(MLG_BASE_URL));
      console.error("  MLG_EMAIL:", JSON.stringify(MLG_EMAIL));
      console.error("  MLG_PASSWORD is set?:", Boolean(MLG_PASSWORD));
      throw new Error("MLG env vars missing. Revisa tu .env y proceso del server.");
    }
    console.log("[MLG] BASE_URL:", MLG_BASE_URL);
    console.log("[MLG] EMAIL:", MLG_EMAIL);
    LoginRespSchema = z2.object({
      token: z2.string().nullable(),
      statusCode: z2.number().optional(),
      description: z2.string().nullable().optional()
    });
    cachedToken = null;
    tokenExpiresAt = 0;
  }
});

// server/routes/mlgRoutes.ts
var mlgRoutes_exports = {};
__export(mlgRoutes_exports, {
  registerMlgRoutes: () => registerMlgRoutes
});
import { z as z3 } from "zod";
function registerMlgRoutes(app) {
  app.get("/api/mlg/categories", async (_req, res) => {
    try {
      const upstream = await mlgRequest("/api/Productos/ObtenerCategorias", { method: "GET" });
      if (!upstream.ok) {
        const text2 = await upstream.text();
        console.error(`[MLG] categories error: HTTP ${upstream.status}`);
        return res.status(502).json({
          message: "MLG categories upstream error",
          statusCode: upstream.status,
          body: text2
        });
      }
      const data = await upstream.json();
      const categoriesData = data.categorias || data;
      const validatedCategories = z3.array(CategorySchema).parse(categoriesData);
      console.log(`[MLG] categories ok - ${validatedCategories.length} categories`);
      res.json(validatedCategories);
    } catch (error) {
      handleMlgError(res, error, "categories");
    }
  });
  app.get("/api/mlg/subcategories", async (_req, res) => {
    try {
      const upstream = await mlgRequest("/api/Productos/ObtenerCatalogoSubCategorias", { method: "GET" });
      if (!upstream.ok) {
        const text2 = await upstream.text();
        console.error(`[MLG] subcategories error: HTTP ${upstream.status}`);
        return res.status(502).json({
          message: "MLG subcategories upstream error",
          statusCode: upstream.status,
          body: text2
        });
      }
      const data = await upstream.json();
      const subcategoriesData = data.subCategorias || data;
      const validatedSubcategories = z3.array(SubcategorySchema).parse(subcategoriesData);
      console.log(`[MLG] subcategories ok - ${validatedSubcategories.length} subcategories`);
      res.json(validatedSubcategories);
    } catch (error) {
      handleMlgError(res, error, "subcategories");
    }
  });
  app.get("/api/mlg/brands", async (_req, res) => {
    try {
      const upstream = await mlgRequest("/api/Productos/ObtenerMarcas", { method: "GET" });
      if (!upstream.ok) {
        const text2 = await upstream.text();
        console.error(`[MLG] brands error: HTTP ${upstream.status}`);
        return res.status(502).json({
          message: "MLG brands upstream error",
          statusCode: upstream.status,
          body: text2
        });
      }
      const data = await upstream.json();
      const brandsData = data.marcas || data;
      const validatedBrands = z3.array(BrandSchema).parse(brandsData);
      console.log(`[MLG] brands ok - ${validatedBrands.length} brands`);
      res.json(validatedBrands);
    } catch (error) {
      handleMlgError(res, error, "brands");
    }
  });
  app.post("/api/mlg/products/bulk", async (req, res) => {
    try {
      const { products: products3 } = BulkProductsRequestSchema.parse(req.body);
      const upstream = await mlgRequest("/api/Productos/CargaMasivaProductos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products: products3 })
      });
      if (!upstream.ok) {
        const text2 = await upstream.text();
        console.error(`[MLG] products/bulk error: HTTP ${upstream.status}`);
        return res.status(502).json({
          message: "MLG bulk products upstream error",
          statusCode: upstream.status,
          body: text2
        });
      }
      const data = await upstream.json();
      const validatedResponse = BulkProductsResponseSchema.parse(data);
      console.log(`[MLG] products/bulk ok - ${validatedResponse.totalProductos || 0} products processed`);
      res.json(validatedResponse);
    } catch (error) {
      handleMlgError(res, error, "products/bulk");
    }
  });
  app.post("/api/mlg/products/update-stock", async (req, res) => {
    try {
      const stockData = UpdateStockRequestSchema.parse(req.body);
      const upstream = await mlgRequest("/api/Productos/ActualizarInventarioProducto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(stockData)
      });
      if (!upstream.ok) {
        const text2 = await upstream.text();
        console.error(`[MLG] products/update-stock error: HTTP ${upstream.status}`);
        return res.status(502).json({
          message: "MLG update stock upstream error",
          statusCode: upstream.status,
          body: text2
        });
      }
      const data = await upstream.json();
      const validatedResponse = UpdateStockResponseSchema.parse(data);
      console.log(`[MLG] products/update-stock ok - Product ${stockData.idProducto}`);
      res.json(validatedResponse);
    } catch (error) {
      handleMlgError(res, error, "products/update-stock");
    }
  });
  app.get("/api/mlg/commissions", async (_req, res) => {
    try {
      if (!MLG_PROVIDER_ID) {
        return res.status(400).json({ message: "MLG_PROVIDER_ID not configured" });
      }
      const upstream = await mlgRequest(`/api/Productos/ObtenerComisiones?IdProveedor=${MLG_PROVIDER_ID}`, {
        method: "GET"
      });
      if (!upstream.ok) {
        const text2 = await upstream.text();
        console.error(`[MLG] commissions error: HTTP ${upstream.status}`);
        return res.status(502).json({
          message: "MLG commissions upstream error",
          statusCode: upstream.status,
          body: text2
        });
      }
      const data = await upstream.json();
      console.log(`[MLG] commissions ok`);
      res.json(data);
    } catch (error) {
      handleMlgError(res, error, "commissions");
    }
  });
  app.post("/api/mlg/products", async (req, res) => {
    try {
      const productsRequest = ProductsRequestSchema.parse(req.body);
      const upstream = await mlgRequest("/api/Productos/ObtenerMisProductos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productsRequest)
      });
      if (!upstream.ok) {
        const text2 = await upstream.text();
        console.error(`[MLG] products error: HTTP ${upstream.status}`);
        return res.status(502).json({
          message: "MLG products upstream error",
          statusCode: upstream.status,
          body: text2
        });
      }
      const data = await upstream.json();
      console.log(`[MLG] products ok - page ${productsRequest.pagina}`);
      res.json(data);
    } catch (error) {
      handleMlgError(res, error, "products");
    }
  });
  app.post("/api/mlg/sales", async (req, res) => {
    try {
      const salesRequest = SalesRequestSchema.parse(req.body);
      const upstream = await mlgRequest("/api/Ventas/ObtenerVentasProveedor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(salesRequest)
      });
      if (!upstream.ok) {
        const text2 = await upstream.text();
        console.error(`[MLG] sales error: HTTP ${upstream.status}`);
        return res.status(502).json({
          message: "MLG sales upstream error",
          statusCode: upstream.status,
          body: text2
        });
      }
      const data = await upstream.json();
      console.log(`[MLG] sales ok - page ${salesRequest.page}`);
      res.json(data);
    } catch (error) {
      handleMlgError(res, error, "sales");
    }
  });
  app.post("/api/mlg/sales/generate-shipping-label", async (req, res) => {
    try {
      const shippingRequest = GenerateShippingLabelRequestSchema.parse(req.body);
      const upstream = await mlgRequest("/api/Ventas/GeneracionGuia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(shippingRequest)
      });
      if (!upstream.ok) {
        const text2 = await upstream.text();
        console.error(`[MLG] sales/generate-shipping-label error: HTTP ${upstream.status}`);
        return res.status(502).json({
          message: "MLG generate shipping label upstream error",
          statusCode: upstream.status,
          body: text2
        });
      }
      const data = await upstream.json();
      console.log(`[MLG] sales/generate-shipping-label ok - Canje ${shippingRequest.idCanje}`);
      res.json(data);
    } catch (error) {
      handleMlgError(res, error, "sales/generate-shipping-label");
    }
  });
}
var MLG_PROVIDER_ID, CategorySchema, SubcategorySchema, BrandSchema, BulkProductsRequestSchema, BulkProductsResponseSchema, UpdateStockRequestSchema, UpdateStockResponseSchema, ProductsRequestSchema, SalesRequestSchema, GenerateShippingLabelRequestSchema, handleMlgError;
var init_mlgRoutes = __esm({
  "server/routes/mlgRoutes.ts"() {
    "use strict";
    init_MlgClient();
    MLG_PROVIDER_ID = process.env.MLG_PROVIDER_ID;
    CategorySchema = z3.object({
      id: z3.number(),
      valor: z3.string()
    });
    SubcategorySchema = z3.object({
      idSubCategoria: z3.number(),
      idCategoria: z3.number(),
      subCategoria: z3.string()
    });
    BrandSchema = z3.object({
      id: z3.number(),
      valor: z3.string()
    });
    BulkProductsRequestSchema = z3.object({
      products: z3.array(z3.object({}).passthrough())
      // Allow any product structure
    });
    BulkProductsResponseSchema = z3.object({
      isSuccess: z3.boolean(),
      totalProductos: z3.number().optional(),
      folioLote: z3.string().optional(),
      errorList: z3.array(z3.string()).optional()
    });
    UpdateStockRequestSchema = z3.object({
      idProducto: z3.number(),
      stock: z3.number()
    });
    UpdateStockResponseSchema = z3.object({
      isSuccess: z3.boolean(),
      description: z3.string().optional()
    });
    ProductsRequestSchema = z3.object({
      idProveedor: z3.number(),
      pagina: z3.number().default(1),
      registros: z3.number().default(10),
      campoOrden: z3.string().default(""),
      esDesc: z3.boolean().default(false),
      filtroProducto: z3.string().default("")
    });
    SalesRequestSchema = z3.object({
      page: z3.number().default(1),
      totalRows: z3.number().default(10),
      providerId: z3.number(),
      orderBy: z3.string().default(""),
      orderType: z3.string().default(""),
      filter: z3.string().default(""),
      dateMin: z3.string().optional(),
      dateMax: z3.string().optional()
    });
    GenerateShippingLabelRequestSchema = z3.object({
      idProveedor: z3.number(),
      idCanje: z3.number(),
      productos: z3.array(z3.object({}).passthrough())
    });
    handleMlgError = (res, error, endpoint) => {
      console.error(`[MLG] ${endpoint} error:`, error.message);
      return res.status(500).json({
        message: `MLG ${endpoint} failed`,
        error: error.message
      });
    };
  }
});

// server/services/ExpressPlClient.ts
function withTimeout(p, ms) {
  let t;
  return Promise.race([
    p.finally(() => clearTimeout(t)),
    new Promise((_, rej) => t = setTimeout(() => rej(new Error(`Timeout ${ms}ms`)), ms))
  ]);
}
async function generateLabelExpressPL(payload) {
  const body = {
    login: LOGIN,
    password: PASSWORD,
    numcliente: NUMCLIENTE,
    idmensajeria: IDMENSAJERIA,
    idservicio: IDSERVICIO,
    ...payload
  };
  const res = await withTimeout(
    fetch(`${BASE_URL}/generarguia`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }),
    TIMEOUT
  );
  if (!res.ok) {
    const text2 = await res.text().catch(() => "");
    throw new Error(`ExpressPL HTTP ${res.status}: ${text2}`);
  }
  const json = await res.json().catch(() => null);
  if (!json || json.codigo !== "200" || !json.pdf) {
    const msg = json?.mensaje || "Respuesta inv\xE1lida de Express-PL";
    throw new Error(`ExpressPL error: ${msg}`);
  }
  return {
    pdfBase64: json.pdf,
    meta: {
      guia: json.numeroGuia,
      paqueteria: json.paqueteria
    }
  };
}
var BASE_URL, LOGIN, PASSWORD, NUMCLIENTE, IDMENSAJERIA, IDSERVICIO, TIMEOUT;
var init_ExpressPlClient = __esm({
  "server/services/ExpressPlClient.ts"() {
    "use strict";
    BASE_URL = process.env.EXPRESSPL_BASE_URL;
    LOGIN = process.env.EXPRESSPL_LOGIN;
    PASSWORD = process.env.EXPRESSPL_PASSWORD;
    NUMCLIENTE = process.env.EXPRESSPL_NUMCLIENTE;
    IDMENSAJERIA = process.env.EXPRESSPL_IDMENSAJERIA;
    IDSERVICIO = process.env.EXPRESSPL_IDSERVICIO;
    TIMEOUT = Number(process.env.EXPRESSPL_TIMEOUT_MS ?? 3e4);
  }
});

// server/routes/shippingRoutes.ts
var shippingRoutes_exports = {};
__export(shippingRoutes_exports, {
  registerShippingRoutes: () => registerShippingRoutes
});
import { z as z4 } from "zod";
function getFixedSender() {
  return {
    claveCliente: "",
    rfc: "CSH180418DW0",
    razonsocial: "ULUM.MX",
    contacto: "ULUM.MX",
    telefono: "5519646667",
    celular: "5519646667",
    calle: "AV. BENJAM\xCDN FRANKLIN",
    numinterior: "302",
    numexterior: "232",
    codigoPostal: "11800",
    colonia: "HIPODROMO CONDESA",
    ciudad: "CIUDAD DE MEXICO",
    estado: "CDMX",
    email: "contacto@ulum.mx",
    pais: "MEX",
    entreCalles: "no",
    referencia: "no"
  };
}
function registerShippingRoutes(app) {
  app.post("/api/shipping/expresspl/label", async (req, res) => {
    try {
      const { orderId, observaciones } = ReqSchema.parse(req.body);
      const order = await storage.getOrderById(Number(orderId));
      if (!order) return res.status(404).json({ message: "Orden no encontrada" });
      const items = await storage.getOrderItemsForShipping(Number(orderId));
      if (!items?.length) return res.status(400).json({ message: "Orden sin items" });
      const dimsBySku = {};
      for (const it of items) {
        const sku = (it.sku ?? "").trim();
        if (!sku) continue;
        try {
          const row = await storage.getCatalogoBySkuInterno(sku);
          dimsBySku[sku] = {
            alto: Number(row?.alto ?? 10) || 10,
            ancho: Number(row?.ancho ?? 10) || 10,
            largo: Number(row?.largo ?? 10) || 10
          };
        } catch (error) {
          dimsBySku[sku] = { alto: 10, ancho: 10, largo: 10 };
        }
      }
      const piezas = items.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0) || 1;
      const firstSku = (items[0]?.sku ?? "").trim();
      const dims = dimsBySku[firstSku] ?? { alto: 10, ancho: 10, largo: 10 };
      const destinatario = {
        claveCliente: "",
        rfc: "XAXX010101000",
        razonsocial: order.customerName || "Cliente",
        contacto: order.customerName || "Cliente",
        telefono: order.shipPhone || "",
        celular: order.shipPhone || "",
        calle: order.shipAddress1 || "",
        numinterior: "",
        numexterior: "",
        codigoPostal: order.shipZip || "",
        colonia: "",
        ciudad: order.shipCity || "",
        estado: order.shipProvince || "",
        email: order.customerEmail || "contacto@ulum.mx",
        pais: order.shipCountry || "MEX",
        entreCalles: "no",
        referencia: order.orderNote || "no"
      };
      const payload = {
        referencia: String(orderId),
        observaciones: observaciones ?? "",
        remitente: getFixedSender(),
        destinatario,
        paquete: {
          cantidad: piezas,
          alto: dims.alto,
          ancho: dims.ancho,
          largo: dims.largo,
          peso: 1,
          valor: 0,
          tipoMercancia: "GENERAL",
          descripcionMercancia: "MERCANCIA",
          tipoEmpaque: "P",
          asegurarlo: false,
          esmultiple: false,
          volumen: 1
        }
      };
      const { pdfBase64, meta } = await generateLabelExpressPL(payload);
      const pdfBuffer = Buffer.from(pdfBase64, "base64");
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="guia_${meta?.guia ?? orderId}.pdf"`
      );
      res.send(pdfBuffer);
    } catch (err) {
      console.error("Error generando gu\xEDa Express-PL:", err.message);
      res.status(400).json({
        message: "No se pudo generar la gu\xEDa",
        error: String(err?.message ?? err)
      });
    }
  });
}
var ReqSchema;
var init_shippingRoutes = __esm({
  "server/routes/shippingRoutes.ts"() {
    "use strict";
    init_ExpressPlClient();
    init_storage();
    ReqSchema = z4.object({
      orderId: z4.number().int().positive(),
      observaciones: z4.string().max(500).optional()
    });
  }
});

// server/integrations/mlg/mlgClient.ts
async function obtenerVentas(params) {
  const res = await mlgRequest("/api/Ventas/ObtenerVentasProveedor", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(params)
  });
  const json = await res.json();
  return json;
}
var init_mlgClient = __esm({
  "server/integrations/mlg/mlgClient.ts"() {
    "use strict";
    init_MlgClient();
  }
});

// server/integrations/mlg/mapAndUpsert.ts
import { and as and3, eq as eq5 } from "drizzle-orm";
function toStr(n) {
  return n == null ? null : String(n);
}
function mapEstatusToStatus(e) {
  if (!e) return "pending";
  const m = e.toLowerCase();
  if (m.includes("entregado")) return "delivered";
  if (m.includes("camino") || m.includes("transito")) return "shipped";
  if (m.includes("preparaci\xF3n") || m.includes("preparacion")) return "processing";
  return "pending";
}
async function upsertMlgOrder(v) {
  const orderIdStr = toStr(v.idCanje);
  const name = v.idOrder || null;
  const customerName = v.nombreCliente ?? null;
  const totalAmount = toStr(v.totalCompra) ?? null;
  const subtotalPrice = toStr(v.precioArticulo) ?? null;
  const fulfillmentStatus = v.estatusEnvio ?? null;
  const financialStatus = "PAID";
  const createdAt = v.fechaSolicitud ? new Date(v.fechaSolicitud) : /* @__PURE__ */ new Date();
  const shopifyCreatedAt = createdAt;
  const currency = "MXN";
  const tags = ["MLG"];
  const inserted = await db.insert(orders).values({
    shopId: MLG_SHOP_ID,
    orderId: orderIdStr,
    name,
    customerName,
    totalAmount,
    subtotalPrice,
    financialStatus,
    fulfillmentStatus,
    createdAt,
    shopifyCreatedAt,
    currency,
    tags,
    status: mapEstatusToStatus(fulfillmentStatus),
    updatedAt: /* @__PURE__ */ new Date()
  }).onConflictDoUpdate({
    target: [orders.shopId, orders.orderId],
    set: {
      name,
      customerName,
      totalAmount,
      subtotalPrice,
      financialStatus,
      fulfillmentStatus,
      currency,
      tags,
      status: mapEstatusToStatus(fulfillmentStatus),
      shopifyCreatedAt,
      updatedAt: /* @__PURE__ */ new Date()
    }
  }).returning({ id: orders.id });
  const orderRowId = inserted[0]?.id;
  if (orderRowId) {
    const title = v.titulo || v.producto || "Art\xEDculo MLG";
    const sku = v.modelo ? String(v.modelo) : toStr(v.idProductoProveedor) ?? null;
    const quantity = Number(v.cantidad || 1);
    const price = toStr(v.precioArticulo) ?? null;
    const existing = await db.select({ id: orderItems.id }).from(orderItems).where(and3(eq5(orderItems.orderId, orderRowId), eq5(orderItems.title, title))).limit(1);
    if (existing.length === 0) {
      await db.insert(orderItems).values({
        orderId: orderRowId,
        title,
        sku,
        quantity,
        price,
        variantTitle: v.modelo ?? null
      });
    }
  }
}
var MLG_SHOP_ID;
var init_mapAndUpsert = __esm({
  "server/integrations/mlg/mapAndUpsert.ts"() {
    "use strict";
    init_db();
    init_schema();
    MLG_SHOP_ID = 3;
  }
});

// server/integrations/mlg/syncMlgSales.ts
var syncMlgSales_exports = {};
__export(syncMlgSales_exports, {
  startMlgSyncScheduler: () => startMlgSyncScheduler,
  syncMlgOnce: () => syncMlgOnce
});
import fs2 from "node:fs";
function todayPlus(days = 1) {
  const d = /* @__PURE__ */ new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function readCursor() {
  try {
    const raw = fs2.readFileSync(CURSOR_FILE, "utf-8");
    const j = JSON.parse(raw);
    return j?.lastFechaSolicitud ?? null;
  } catch {
    return null;
  }
}
function writeCursor(fecha) {
  try {
    fs2.writeFileSync(CURSOR_FILE, JSON.stringify({ lastFechaSolicitud: fecha }, null, 2));
  } catch {
  }
}
async function syncMlgOnce() {
  if (process.env.MLG_ENABLED !== "true") return { imported: 0 };
  const providerId = process.env.MLG_PROVIDER_ID || process.env.MLG_IDPROVEEDOR;
  if (!providerId) return { imported: 0 };
  const dateMin = readCursor() || process.env.MLG_SYNC_SINCE || "2025-06-01";
  const dateMax = todayPlus(1);
  let page = 1;
  let total = 0;
  for (; ; ) {
    const res = await obtenerVentas({
      page,
      totalRows: 100,
      providerId,
      orderBy: 1,
      orderType: 1,
      dateMin,
      dateMax
    });
    const rows = res?.ventas?.results ?? [];
    if (!rows.length) break;
    for (const v of rows) {
      await upsertMlgOrder(v);
    }
    const maxFecha = rows.map((r) => r.fechaSolicitud).filter(Boolean).sort().pop();
    if (maxFecha) writeCursor(maxFecha);
    total += rows.length;
    page += 1;
  }
  return { imported: total };
}
function startMlgSyncScheduler() {
  if (process.env.MLG_ENABLED !== "true") return;
  const interval = Number(process.env.MLG_SYNC_INTERVAL_MS || 3e5);
  const tick = async () => {
    try {
      const r = await syncMlgOnce();
      if (r.imported) console.log(`[MLG] Imported ${r.imported} ventas`);
    } catch (e) {
      console.error("[MLG] sync error:", e?.message || e);
    }
  };
  timer = setInterval(tick, interval);
  tick();
}
var CURSOR_FILE, timer;
var init_syncMlgSales = __esm({
  "server/integrations/mlg/syncMlgSales.ts"() {
    "use strict";
    init_mlgClient();
    init_mapAndUpsert();
    CURSOR_FILE = ".mlg-cursor.json";
    timer = null;
  }
});

// server/index.ts
import "dotenv/config";

// server/syncShopifyOrders.ts
init_db();
init_schema();
init_shopifyEnv();
import { eq } from "drizzle-orm";
function parseLinkHeader(link) {
  const out = {};
  if (!link) return out;
  for (const part of link.split(",")) {
    const m = part.match(/<([^>]+)>\s*;\s*rel="([^"]+)"/);
    if (m) out[m[2]] = m[1];
  }
  return out;
}
function extractPageInfoFromUrl(url) {
  if (!url) return void 0;
  const u2 = new URL(url);
  const pi = u2.searchParams.get("page_info");
  return pi ?? void 0;
}
async function shopifyRestGetRaw(storeNumber, path3) {
  const { shop, token, apiVersion } = getShopifyCredentials(String(storeNumber));
  const base = `https://${shop}/admin/api/${apiVersion}`;
  const r = await fetch(`${base}${path3}`, {
    headers: {
      "X-Shopify-Access-Token": token,
      "User-Agent": "LogisticManager/1.0 (+node)"
    }
  });
  const text2 = await r.text();
  return { ok: r.ok, status: r.status, statusText: r.statusText, headers: r.headers, text: text2, shop };
}
async function shopifyRestGet(storeNumber, path3) {
  const { shop, token, apiVersion } = getShopifyCredentials(String(storeNumber));
  console.log(`[SYNC DEBUG] store=${storeNumber} shop=${shop} ver=${apiVersion} tokenLen=${token?.length}`);
  const base = `https://${shop}/admin/api/${apiVersion}`;
  const r = await fetch(`${base}${path3}`, {
    headers: {
      "X-Shopify-Access-Token": token,
      "User-Agent": "LogisticManager/1.0 (+node)"
    }
  });
  const text2 = await r.text();
  if (!r.ok) {
    throw new Error(`Shopify ${storeNumber} ${r.status} ${r.statusText} :: ${text2.slice(0, 500)}`);
  }
  return JSON.parse(text2);
}
async function upsertOneOrderTx(tx, storeNumber, o) {
  const orderIdStr = String(o.id);
  const tagsArr = typeof o.tags === "string" ? o.tags.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const first = o.customer?.first_name ?? null;
  const last = o.customer?.last_name ?? null;
  const customerName = first || last ? `${first ?? ""} ${last ?? ""}`.trim() : o.email ?? o.name ?? null;
  const toStrOrNull = (v) => v == null ? null : String(v);
  const toDateOrNull = (v) => v ? new Date(v) : null;
  const insertData = {
    shopId: Number(storeNumber),
    orderId: orderIdStr,
    name: o.name ?? null,
    orderNumber: toStrOrNull(o.order_number),
    customerName,
    customerEmail: o.email ?? o.customer?.email ?? null,
    subtotalPrice: toStrOrNull(o.subtotal_price),
    totalAmount: toStrOrNull(o.total_price),
    currency: o.currency ?? null,
    financialStatus: o.financial_status ?? null,
    fulfillmentStatus: o.fulfillment_status ?? null,
    tags: tagsArr.length ? tagsArr : null,
    noteAttributes: null,
    createdAt: toDateOrNull(o.created_at),
    shopifyCreatedAt: toDateOrNull(o.created_at),
    shopifyUpdatedAt: toDateOrNull(o.updated_at),
    shopifyProcessedAt: toDateOrNull(o.processed_at),
    shopifyClosedAt: toDateOrNull(o.closed_at),
    shopifyCancelledAt: toDateOrNull(o.cancelled_at)
  };
  const upsertedOrder = await tx.insert(orders).values(insertData).onConflictDoUpdate({
    target: [orders.shopId, orders.orderId],
    set: insertData
  }).returning({ id: orders.id });
  const orderPk = upsertedOrder[0]?.id;
  if (!orderPk) throw new Error("No se obtuvo ID de la orden tras UPSERT.");
  await tx.delete(orderItems).where(eq(orderItems.orderId, orderPk));
  const items = o.line_items ?? [];
  if (items.length > 0) {
    const values = items.map((li) => ({
      orderId: orderPk,
      sku: li.sku ?? null,
      quantity: Number(li.quantity ?? 0),
      price: toStrOrNull(li.price),
      shopifyProductId: li.product_id != null ? String(li.product_id) : null,
      shopifyVariantId: li.variant_id != null ? String(li.variant_id) : null
    }));
    await tx.insert(orderItems).values(values);
  }
}
function listStoreNumbersFromEnv() {
  const nums = /* @__PURE__ */ new Set();
  for (const k of Object.keys(process.env)) {
    const m = k.match(/^SHOPIFY_SHOP_NAME_(\d+)$/);
    if (m) nums.add(parseInt(m[1], 10));
  }
  return Array.from(nums).sort((a, b) => a - b);
}
async function getOrdersCount(storeParam) {
  const storeNumber = parseInt(String(storeParam), 10);
  const { shop } = getShopifyCredentials(String(storeNumber));
  const { ok, status, statusText, text: text2 } = await shopifyRestGetRaw(
    storeNumber,
    `/orders/count.json?status=any`
  );
  if (!ok) throw new Error(`Shopify count ${status} ${statusText} :: ${text2.slice(0, 200)}`);
  const body = JSON.parse(text2);
  return { ok: true, store: storeNumber, shop, count: body.count ?? 0 };
}
async function syncShopifyOrdersBackfill(opts) {
  const storeNumber = parseInt(String(opts.store), 10);
  const limit = Math.min(opts.limit ?? 50, 250);
  const params = [`status=any`, `limit=${limit}`];
  if (opts.pageInfo) {
    params.push(`page_info=${encodeURIComponent(String(opts.pageInfo))}`);
  } else {
    if (opts.since) params.push(`created_at_min=${encodeURIComponent(opts.since)}`);
    params.push(`order=created_at+asc`);
  }
  const { ok, status, statusText, text: text2, headers } = await shopifyRestGetRaw(
    storeNumber,
    `/orders.json?${params.join("&")}`
  );
  if (!ok) throw new Error(`Shopify backfill ${status} ${statusText} :: ${text2.slice(0, 200)}`);
  const body = JSON.parse(text2);
  let upserted = 0, inserted = 0;
  for (const o of body.orders ?? []) {
    await db.transaction(async (tx) => {
      await upsertOneOrderTx(tx, storeNumber, o);
      upserted++;
    });
  }
  const link = headers.get("link");
  const parsed = parseLinkHeader(link);
  const nextPageInfo = extractPageInfoFromUrl(parsed["next"]);
  const hasNextPage = !!nextPageInfo;
  const { shop } = getShopifyCredentials(String(storeNumber));
  return {
    ok: true,
    summary: [{ store: storeNumber, shop, inserted, upserted }],
    hasNextPage,
    nextPageInfo
  };
}
async function syncShopifyOrdersIncremental(opts) {
  const storeNumber = parseInt(String(opts.store), 10);
  const limit = Math.min(opts.limit ?? 100, 250);
  const params = [`status=any`, `limit=${limit}`];
  if (opts.pageInfo) {
    params.push(`page_info=${encodeURIComponent(String(opts.pageInfo))}`);
  } else {
    params.push(`updated_at_min=${encodeURIComponent(opts.updatedSince)}`);
    params.push(`order=updated_at+asc`);
  }
  const { ok, status, statusText, text: text2, headers } = await shopifyRestGetRaw(
    storeNumber,
    `/orders.json?${params.join("&")}`
  );
  if (!ok) throw new Error(`Shopify incremental ${status} ${statusText} :: ${text2.slice(0, 200)}`);
  const body = JSON.parse(text2);
  let upserted = 0, inserted = 0;
  for (const o of body.orders ?? []) {
    await db.transaction(async (tx) => {
      await upsertOneOrderTx(tx, storeNumber, o);
      upserted++;
    });
  }
  const link = headers.get("link");
  const parsed = parseLinkHeader(link);
  const nextPageInfo = extractPageInfoFromUrl(parsed["next"]);
  const hasNextPage = !!nextPageInfo;
  const { shop } = getShopifyCredentials(String(storeNumber));
  return {
    ok: true,
    summary: [{ store: storeNumber, shop, inserted, upserted }],
    hasNextPage,
    nextPageInfo
  };
}
async function syncShopifyOrders(opts = {}) {
  const limit = opts.limit ?? 50;
  let targets;
  if (opts.store && String(opts.store).toLowerCase() !== "all") {
    targets = [parseInt(String(opts.store), 10)];
  } else {
    targets = listStoreNumbersFromEnv();
  }
  if (targets.length === 0) {
    throw new Error("No se encontraron tiendas (SHOPIFY_SHOP_NAME_N) en .env");
  }
  const summary = [];
  for (const storeNumber of targets) {
    const { shop } = getShopifyCredentials(String(storeNumber));
    let inserted = 0;
    let upserted = 0;
    try {
      const data = await shopifyRestGet(
        storeNumber,
        `/orders.json?limit=${limit}&status=any&order=created_at+desc`
      );
      for (const o of data.orders ?? []) {
        await db.transaction(async (tx) => {
          await upsertOneOrderTx(tx, storeNumber, o);
          upserted++;
        });
      }
    } catch (e) {
      console.error(`Sync tienda ${storeNumber} fall\xF3:`, e?.message || e);
    }
    summary.push({ store: storeNumber, shop, inserted, upserted });
  }
  return { ok: true, summary };
}

// server/services/ShopifyAdminClient.ts
init_shopifyEnv();
var ShopifyAdminClient = class {
  constructor(storeParam = "1") {
    const credentials = getShopifyCredentials(storeParam);
    this.shopDomain = credentials.shop;
    this.accessToken = credentials.token;
    this.apiVersion = credentials.apiVersion;
    this.storeNumber = credentials.storeNumber;
  }
  getBaseUrl() {
    return `https://${this.shopDomain}/admin/api/${this.apiVersion}`;
  }
  async delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  extractRateLimitInfo(headers) {
    const remaining = headers.get("x-shopify-shop-api-call-limit");
    if (!remaining) return null;
    const [current, max] = remaining.split("/").map(Number);
    return {
      remaining: max - current,
      max,
      resetTime: Date.now() + 1e3
      // Estimación: reset en 1 segundo
    };
  }
  async handleRateLimit(rateLimitInfo) {
    if (rateLimitInfo.remaining <= 2) {
      console.log(`\u{1F6A7} Rate limit bajo para tienda ${this.storeNumber}: ${rateLimitInfo.remaining}/${rateLimitInfo.max} - Esperando...`);
      await this.delay(1e3);
    }
  }
  // Método REST para endpoints específicos
  async restRequest(endpoint, method = "GET", body, maxRetries = 3) {
    const url = `${this.getBaseUrl()}${endpoint}`;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          method,
          headers: {
            "X-Shopify-Access-Token": this.accessToken,
            "Content-Type": "application/json",
            "User-Agent": "LogiSys/1.0 (+shopify-integration)"
          },
          body: body ? JSON.stringify(body) : void 0
        });
        const rateLimitInfo = this.extractRateLimitInfo(response.headers);
        if (rateLimitInfo) {
          await this.handleRateLimit(rateLimitInfo);
        }
        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get("retry-after") || "1") * 1e3;
          console.log(`\u23F3 Rate limit excedido para tienda ${this.storeNumber}, reintentando en ${retryAfter}ms (intento ${attempt}/${maxRetries})`);
          await this.delay(retryAfter);
          continue;
        }
        if (!response.ok) {
          const errorText = await response.text();
          console.log(`\u274C Error HTTP ${response.status} en tienda ${this.storeNumber}: ${errorText}`);
          if (response.status >= 500 && attempt < maxRetries) {
            const backoffDelay = Math.min(1e3 * Math.pow(2, attempt - 1), 3e4);
            console.log(`\u{1F504} Reintentando en ${backoffDelay}ms (intento ${attempt}/${maxRetries})`);
            await this.delay(backoffDelay);
            continue;
          }
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        const data = await response.json();
        return data;
      } catch (error) {
        console.log(`\u274C Error en intento ${attempt}/${maxRetries} para tienda ${this.storeNumber}:`, error);
        if (attempt === maxRetries) {
          throw error;
        }
        const backoffDelay = Math.min(1e3 * Math.pow(2, attempt - 1), 3e4);
        await this.delay(backoffDelay);
      }
    }
    throw new Error(`Fall\xF3 despu\xE9s de ${maxRetries} intentos`);
  }
  // Método GraphQL
  async graphqlRequest(query, variables, maxRetries = 3) {
    const url = `${this.getBaseUrl()}/graphql.json`;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "X-Shopify-Access-Token": this.accessToken,
            "Content-Type": "application/json",
            "User-Agent": "LogiSys/1.0 (+shopify-graphql)"
          },
          body: JSON.stringify({ query, variables })
        });
        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get("retry-after") || "2") * 1e3;
          console.log(`\u23F3 GraphQL rate limit para tienda ${this.storeNumber}, esperando ${retryAfter}ms`);
          await this.delay(retryAfter);
          continue;
        }
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`GraphQL HTTP ${response.status}: ${errorText}`);
        }
        const result = await response.json();
        if (result.errors && result.errors.length > 0) {
          console.log(`\u26A0\uFE0F Errores GraphQL en tienda ${this.storeNumber}:`, result.errors);
        }
        if (result.extensions?.cost?.throttleStatus) {
          const throttle = result.extensions.cost.throttleStatus;
          if (throttle.currentlyAvailable < 100) {
            const waitTime = Math.ceil((100 - throttle.currentlyAvailable) / throttle.restoreRate) * 1e3;
            console.log(`\u{1F6A7} GraphQL throttling bajo: ${throttle.currentlyAvailable}/${throttle.maximumAvailable}, esperando ${waitTime}ms`);
            await this.delay(waitTime);
          }
        }
        return result;
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        const backoffDelay = Math.min(1e3 * Math.pow(2, attempt - 1), 3e4);
        console.log(`\u{1F504} Reintentando GraphQL en ${backoffDelay}ms (${attempt}/${maxRetries})`);
        await this.delay(backoffDelay);
      }
    }
    throw new Error(`GraphQL fall\xF3 despu\xE9s de ${maxRetries} intentos`);
  }
  // Métodos de conveniencia
  async getShopInfo() {
    return this.restRequest("/shop.json");
  }
  async getOrdersCount() {
    return this.restRequest("/orders/count.json");
  }
  async getOrders(params = {}) {
    const { shopDomain, accessToken, apiVersion } = this;
    const url = new URL(`https://${shopDomain}/admin/api/${apiVersion}/orders.json`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
    const response = await fetch(url.toString(), {
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "User-Agent": "LogisticManager/1.0 (+node)",
        "Content-Type": "application/json"
      }
    });
    const text2 = await response.text();
    if (!response.ok) {
      throw new Error(`Shopify ${response.status} ${response.statusText} :: ${text2.slice(0, 400)}`);
    }
    const data = JSON.parse(text2);
    const linkHeader = response.headers.get("link") || response.headers.get("Link") || "";
    let nextPageInfo = null;
    let hasNextPage = false;
    if (linkHeader && /rel="next"/i.test(linkHeader)) {
      const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/i);
      if (match) {
        const nextUrl = new URL(match[1]);
        nextPageInfo = nextUrl.searchParams.get("page_info");
        hasNextPage = !!nextPageInfo;
      }
    }
    return {
      orders: data.orders ?? [],
      nextPageInfo,
      hasNextPage
    };
  }
  async getProducts(params = {}) {
    const url = new URL(`https://${this.shopDomain}/admin/api/${this.apiVersion}/products.json`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
    const response = await fetch(url.toString(), {
      headers: {
        "X-Shopify-Access-Token": this.accessToken,
        "User-Agent": "LogisticManager/1.0 (+node)",
        "Content-Type": "application/json"
      }
    });
    const text2 = await response.text();
    if (!response.ok) {
      throw new Error(`Shopify ${response.status} ${response.statusText} :: ${text2.slice(0, 400)}`);
    }
    const data = JSON.parse(text2);
    const linkHeader = response.headers.get("link") || response.headers.get("Link") || "";
    let nextPageInfo = null;
    let hasNextPage = false;
    if (linkHeader && /rel="next"/i.test(linkHeader)) {
      const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/i);
      if (match) {
        const nextUrl = new URL(match[1]);
        nextPageInfo = nextUrl.searchParams.get("page_info");
        hasNextPage = !!nextPageInfo;
      }
    }
    return {
      products: data.products ?? [],
      nextPageInfo,
      hasNextPage
    };
  }
  async updateProduct(productId, productData) {
    return this.restRequest(`/products/${productId}.json`, "PUT", { product: productData });
  }
  async updateVariant(variantId, variantData) {
    return this.restRequest(`/variants/${variantId}.json`, "PUT", { variant: variantData });
  }
  getStoreInfo() {
    return {
      storeNumber: this.storeNumber,
      shopDomain: this.shopDomain,
      apiVersion: this.apiVersion
    };
  }
};

// server/services/ProductService.ts
init_storage();
init_db();
init_schema();
import { eq as eq3 } from "drizzle-orm";
var ProductService = class {
  constructor(storeParam = "1") {
    this.client = new ShopifyAdminClient(storeParam);
    this.storeNumber = parseInt(storeParam, 10);
  }
  convertShopifyProduct(sp) {
    const statusNorm = sp.status === "active" ? "active" : sp.status === "draft" ? "draft" : "draft";
    return {
      idShopify: String(sp.id),
      shopId: this.storeNumber,
      title: sp.title,
      vendor: sp.vendor ?? null,
      productType: sp.product_type ?? null,
      status: statusNorm,
      // 'active' | 'draft'
      tags: sp.tags ? sp.tags.split(",").map((t) => t.trim()).filter(Boolean) : []
    };
  }
  convertShopifyVariant(sv, localProductId) {
    return {
      idShopify: String(sv.id),
      productId: localProductId,
      sku: sv.sku ?? null,
      price: sv.price ?? null,
      compareAtPrice: sv.compare_at_price ?? null,
      barcode: sv.barcode ?? null,
      inventoryQty: sv.inventory_quantity ?? 0
    };
  }
  // Upsert de un producto + variantes
  async upsertOne(sp) {
    const existing = await storage.getProductByShopifyId(String(sp.id), this.storeNumber);
    const productData = this.convertShopifyProduct(sp);
    let local;
    if (existing) {
      local = await storage.updateProduct(existing.id, productData);
    } else {
      local = await storage.createProduct(productData);
    }
    if (sp.variants && sp.variants.length > 0) {
      for (const sv of sp.variants) {
        const vData = this.convertShopifyVariant(sv, local.id);
        const [vExisting] = await db.select().from(variants).where(eq3(variants.idShopify, String(sv.id))).limit(1);
        if (vExisting) {
          await storage.updateVariant(vExisting.id, vData);
        } else {
          await storage.createVariant(vData);
        }
      }
    }
  }
  /**
   * Sincroniza productos con soporte opcional de incremental por fecha y paginación completa.
   * - updatedSince: ISO8601 para traer solo productos actualizados desde esa fecha
   * - limit: tamaño de página (<=250)
   */
  async syncProductsFromShopify(limit = 250, updatedSince) {
    console.log(`\u{1F504} Sincronizando productos tienda ${this.storeNumber} (limit=${limit}${updatedSince ? `, updated>=${updatedSince}` : ""})`);
    const result = { success: false, productsProcessed: 0, errors: [] };
    try {
      let cursor = void 0;
      let firstPage = true;
      while (true) {
        let params;
        if (firstPage) {
          params = { limit: Math.min(limit, 250) };
          if (updatedSince) params.updated_at_min = updatedSince;
          firstPage = false;
        } else {
          params = { limit: Math.min(limit, 250), page_info: cursor };
        }
        const resp = await this.client.getProducts(params);
        const prods = resp.products || [];
        for (const sp of prods) {
          try {
            await this.upsertOne(sp);
            result.productsProcessed++;
          } catch (e) {
            const msg = `Producto "${sp.title}" error: ${e?.message || e}`;
            console.log("\u274C", msg);
            result.errors.push(msg);
          }
        }
        if (!resp.hasNextPage) break;
        cursor = resp.nextPageInfo;
        await new Promise((r) => setTimeout(r, 500));
      }
      result.success = result.errors.length === 0;
      return result;
    } catch (e) {
      const msg = `Error general sync productos: ${e?.message || e}`;
      console.log("\u274C", msg);
      result.errors.push(msg);
      return result;
    }
  }
  // Mantén este método para el script de backfill por chunks
  async syncProductsChunk(shopifyProducts) {
    const result = { success: false, productsProcessed: 0, errors: [] };
    for (const sp of shopifyProducts) {
      try {
        await this.upsertOne(sp);
        result.productsProcessed++;
      } catch (e) {
        result.errors.push(`Producto "${sp.title}" error: ${e?.message || e}`);
      }
    }
    result.success = result.errors.length === 0;
    return result;
  }
  async updateProductInShopify(productId, updates) {
    console.log(`\u{1F504} Actualizando producto ${productId} en Shopify tienda ${this.storeNumber}`);
    try {
      const localProduct = await storage.getProduct(productId);
      if (!localProduct) {
        return { success: false, error: "Producto no encontrado en BD local" };
      }
      const shopifyData = {};
      if (updates.title) shopifyData.title = updates.title;
      if (updates.vendor) shopifyData.vendor = updates.vendor;
      if (updates.status) shopifyData.status = updates.status;
      if (updates.tags) shopifyData.tags = updates.tags.join(", ");
      await this.client.updateProduct(localProduct.idShopify, shopifyData);
      console.log(`\u2705 Shopify actualizado para producto ${localProduct.idShopify}`);
      const updatedProduct = await storage.updateProduct(productId, {
        title: updates.title || localProduct.title,
        vendor: updates.vendor || localProduct.vendor,
        status: updates.status || localProduct.status,
        tags: updates.tags || localProduct.tags
      });
      console.log(`\u2705 BD local actualizada para producto ${productId}`);
      return {
        success: true,
        product: updatedProduct,
        shopifyUpdated: true
      };
    } catch (error) {
      console.log(`\u274C Error actualizando producto ${productId}: ${error}`);
      return {
        success: false,
        error: String(error),
        shopifyUpdated: false
      };
    }
  }
  async updateVariantInShopify(variantId, updates) {
    console.log(`\u{1F504} Actualizando variante ${variantId} en Shopify tienda ${this.storeNumber}`);
    try {
      const localVariant = await storage.getVariant(variantId);
      if (!localVariant) {
        return { success: false, error: "Variante no encontrada en BD local" };
      }
      const shopifyData = {};
      if (updates.price) shopifyData.price = updates.price;
      if (updates.compareAtPrice) shopifyData.compare_at_price = updates.compareAtPrice;
      if (updates.sku) shopifyData.sku = updates.sku;
      if (updates.inventoryQty !== void 0) shopifyData.inventory_quantity = updates.inventoryQty;
      await this.client.updateVariant(localVariant.idShopify, shopifyData);
      console.log(`\u2705 Shopify actualizado para variante ${localVariant.idShopify}`);
      const updatedVariant = await storage.updateVariant(variantId, {
        price: updates.price || localVariant.price,
        compareAtPrice: updates.compareAtPrice || localVariant.compareAtPrice,
        sku: updates.sku || localVariant.sku,
        inventoryQty: updates.inventoryQty ?? localVariant.inventoryQty
      });
      console.log(`\u2705 BD local actualizada para variante ${variantId}`);
      return {
        success: true,
        shopifyUpdated: true
      };
    } catch (error) {
      console.log(`\u274C Error actualizando variante ${variantId}: ${error}`);
      return {
        success: false,
        error: String(error),
        shopifyUpdated: false
      };
    }
  }
  async getProductsForStore(shopId) {
    return await storage.getProducts(shopId);
  }
  async getVariantsForProduct(productId) {
    return await storage.getVariants(productId);
  }
  getStoreInfo() {
    return this.client.getStoreInfo();
  }
};

// server/scheduler.ts
function listStoreNumbersFromEnv2() {
  const nums = /* @__PURE__ */ new Set();
  for (const k of Object.keys(process.env)) {
    const m = k.match(/^SHOPIFY_SHOP_NAME_(\d+)$/);
    if (m) nums.add(parseInt(m[1], 10));
  }
  return Array.from(nums).sort((a, b) => a - b);
}
var orderLock = {};
function nowISO() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
async function runOrderIncremental(store) {
  if (orderLock[store]) {
    console.log(`[CRON][${nowISO()}] Orders store ${store}: saltando (en ejecuci\xF3n)`);
    return;
  }
  orderLock[store] = true;
  try {
    const windowMin = parseInt(process.env.SYNC_WINDOW_MIN ?? "10", 10);
    const since = new Date(Date.now() - windowMin * 6e4).toISOString();
    let cursor = void 0;
    let pages = 0;
    const maxPages = parseInt(process.env.SYNC_MAX_PAGES ?? "5", 10);
    do {
      const res = await syncShopifyOrdersIncremental({
        store,
        updatedSince: since,
        pageInfo: cursor,
        limit: 100
      });
      const processed = res.summary?.[0]?.upserted ?? 0;
      console.log(
        `[CRON][${nowISO()}] Orders store ${store}: processed=${processed} next=${res.hasNextPage ? "yes" : "no"}`
      );
      cursor = res.nextPageInfo;
      pages++;
    } while (cursor && pages < maxPages);
  } catch (e) {
    console.error(`[CRON][${nowISO()}] Orders store ${store} ERROR:`, e.message || e);
  } finally {
    orderLock[store] = false;
  }
}
function startSchedulers() {
  const stores = listStoreNumbersFromEnv2();
  if (stores.length === 0) {
    console.warn("[CRON] No se encontraron tiendas en envs (SHOPIFY_SHOP_NAME_N).");
    return;
  }
  const orderMs = parseInt(process.env.SYNC_INTERVAL_MS ?? `${5 * 6e4}`, 10);
  const prodMs = parseInt(process.env.PRODUCT_SYNC_INTERVAL_MS ?? `${30 * 6e4}`, 10);
  console.log(`[CRON] Iniciando. Ordenes cada ${orderMs / 6e4} min; Productos cada ${prodMs / 6e4} min. Tiendas: ${stores.join(", ")}`);
  (async () => {
    for (const s of stores) {
      runOrderIncremental(s);
    }
  })();
  for (const s of stores) {
    setInterval(() => runOrderIncremental(s), orderMs);
  }
}

// server/index.ts
import express2 from "express";
import cors from "cors";
import fileUpload from "express-fileupload";

// server/routes.ts
init_storage();
init_db();
init_schema();
import { createServer } from "http";
import bcrypt from "bcrypt";
import session from "express-session";
import MemoryStore from "memorystore";
import { z as z5 } from "zod";
import { sql as sql4 } from "drizzle-orm";
init_shopifyEnv();
import multer from "multer";
import xlsx from "xlsx";
function jsonSafe(value) {
  if (value === null || value === void 0) return value;
  const t = typeof value;
  if (t === "bigint") return value.toString();
  if (t !== "object") return value;
  if (Array.isArray(value)) {
    return value.map(jsonSafe);
  }
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    out[k] = jsonSafe(v);
  }
  return out;
}
var AlmacenSesionesMemoria = MemoryStore(session);
var esquemaLogin = z5.object({
  email: z5.string().email(),
  password: z5.string().min(1)
});
var requiereAutenticacion = async (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "No autorizado" });
  }
  try {
    const usuario = await storage.getUser(req.session.userId);
    if (!usuario) {
      return res.status(401).json({ message: "Usuario no encontrado" });
    }
    req.user = usuario;
    next();
  } catch (error) {
    console.log("Error en middleware autenticaci\xF3n:", error);
    return res.status(500).json({ message: "Error interno" });
  }
};
var requiereAdmin = async (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "No autorizado" });
  }
  const usuario = await storage.getUser(req.session.userId);
  if (!usuario || usuario.role !== "admin") {
    return res.status(403).json({ message: "Se requiere rol administrador" });
  }
  next();
};
async function registerRoutes(app) {
  app.get("/debug/ping", (req, res) => {
    console.log(
      " /debug/ping hit ::",
      req.method,
      req.url,
      "UA:",
      req.headers["user-agent"]
    );
    res.json({
      ok: true,
      time: (/* @__PURE__ */ new Date()).toISOString(),
      url: req.url
    });
  });
  app.set("trust proxy", 1);
  const isProd = process.env.NODE_ENV === "production" || process.env.FORCE_SECURE_COOKIE === "1";
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "dev-secret-key",
      resave: false,
      saveUninitialized: false,
      store: new AlmacenSesionesMemoria({ checkPeriod: 864e5 }),
      cookie: {
        httpOnly: true,
        secure: isProd,
        // ✅ en dev=false; en prod (HTTPS)=true
        sameSite: isProd ? "none" : "lax",
        // ✅ dev=lax, prod=none
        maxAge: 7 * 24 * 60 * 60 * 1e3
        // NO pongas domain en localhost
      }
    })
  );
  app.get("/api/health", (req, res) => {
    console.log("Health check solicitado");
    res.json({
      ok: true,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
      // ✅ normalizado (antes usabas ts)
    });
  });
  app.get("/api/health/shopify", async (req, res) => {
    try {
      const stores = [
        {
          name: process.env.SHOPIFY_SHOP_NAME_1,
          token: process.env.SHOPIFY_ACCESS_TOKEN_1,
          apiVersion: process.env.SHOPIFY_API_VERSION_1
        },
        {
          name: process.env.SHOPIFY_SHOP_NAME_2,
          token: process.env.SHOPIFY_ACCESS_TOKEN_2,
          apiVersion: process.env.SHOPIFY_API_VERSION_2
        }
      ].filter((s) => s.name && s.token).map((s) => ({
        shop: s.name,
        tokenMasked: s.token.slice(0, 6) + "\u2026",
        // solo para debug seguro
        apiVersion: s.apiVersion || "unset"
      }));
      if (stores.length === 0) {
        return res.json({
          ok: false,
          error: "No hay tiendas Shopify configuradas (revisar SHOPIFY_SHOP_NAME_* y SHOPIFY_ACCESS_TOKEN_*)",
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
      return res.json({
        ok: true,
        status: 200,
        stores,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch (err) {
      return res.json({
        ok: false,
        error: err?.message || "Error inesperado en health Shopify",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
  });
  app.get("/api/health/ww", async (req, res) => {
    try {
      const shop = process.env.SHOPIFY_SHOP_NAME_1;
      const token = process.env.SHOPIFY_ACCESS_TOKEN_1;
      const apiVersion = process.env.SHOPIFY_API_VERSION_1;
      if (!shop || !token) {
        return res.json({
          ok: false,
          error: "WW no configurado: revisar SHOPIFY_SHOP_NAME_1 y SHOPIFY_ACCESS_TOKEN_1",
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
      return res.json({
        ok: true,
        status: 200,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        details: {
          shop,
          apiVersion: apiVersion || "unset"
          // token no se devuelve por seguridad; si quieres mostrar en logs, enmascara
        }
      });
    } catch (err) {
      return res.json({
        ok: false,
        error: err?.message || "Error inesperado en WW",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
  });
  app.get("/api/health/ct", async (req, res) => {
    try {
      const shop = process.env.SHOPIFY_SHOP_NAME_2;
      const token = process.env.SHOPIFY_ACCESS_TOKEN_2;
      const apiVersion = process.env.SHOPIFY_API_VERSION_2;
      if (!shop || !token) {
        return res.json({
          ok: false,
          error: "CT no configurado: revisar",
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
      return res.json({
        ok: true,
        status: 200,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        details: {
          shop,
          apiVersion: apiVersion || "unset"
        }
      });
    } catch (err) {
      return res.json({
        ok: false,
        error: err?.message || "Error inesperado en CT",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
  });
  app.get("/api/health/mlg", async (req, res) => {
    try {
      const providerId = process.env.MLG_IDPROVEEDOR || process.env.MLG_PROVIDER_ID;
      const hasCredentials = Boolean(
        process.env.MLG_EMAIL && process.env.MLG_PASSWORD && providerId
      );
      if (!hasCredentials) {
        return res.json({
          ok: false,
          error: "MLG no configurado: revisar MLG_EMAIL, MLG_PASSWORD y MLG_IDPROVEEDOR",
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
      return res.json({ ok: true, status: 200, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
    } catch (err) {
      return res.json({
        ok: false,
        error: err?.message || "Error inesperado en health MLG",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
  });
  app.get("/api/health/expresspl", async (req, res) => {
    try {
      const hasCredentials = Boolean(
        process.env.EXPRESSPL_BASE_URL && process.env.EXPRESSPL_LOGIN && process.env.EXPRESSPL_PASSWORD
      );
      if (!hasCredentials) {
        return res.json({
          ok: false,
          error: "Express-PL no configurado: revisar EXPRESSPL_BASE_URL, EXPRESSPL_LOGIN, EXPRESSPL_PASSWORD",
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
      return res.json({ ok: true, status: 200, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
    } catch (err) {
      return res.json({
        ok: false,
        error: err?.message || "Error inesperado en health Express-PL",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
  });
  app.get("/api/integrations/shopify/ping", async (req, res) => {
    try {
      const storeParam = req.query.store || "1";
      console.log(` Shopify ping solicitado para tienda ${storeParam}`);
      const { shop, token, apiVersion, storeNumber } = getShopifyCredentials(storeParam);
      const url = `https://${shop}/admin/api/${apiVersion}/shop.json`;
      const r = await fetch(url, {
        headers: {
          "X-Shopify-Access-Token": token,
          "User-Agent": "LogisticManager/1.0 (+node)"
        }
      });
      const bodyText = await r.text();
      if (!r.ok) {
        console.log(
          ` Error Shopify tienda ${storeNumber}: ${r.status} ${r.statusText}`
        );
        return res.status(r.status).json({
          ok: false,
          store: storeNumber,
          status: r.status,
          statusText: r.statusText,
          body: bodyText.slice(0, 500)
          // primeros 500 caracteres del error
        });
      }
      const data = JSON.parse(bodyText);
      console.log(
        `\u2705 Shopify tienda ${storeNumber} conectada: ${data?.shop?.myshopify_domain}`
      );
      return res.json({
        ok: true,
        store: storeNumber,
        shop: data?.shop?.myshopify_domain || data?.shop?.domain || null,
        apiVersion
      });
    } catch (e) {
      console.log(` Error en Shopify ping: ${e.message}`);
      res.status(500).json({
        ok: false,
        error: e.message,
        cause: e?.cause?.message || e?.code || null
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
        return res.status(500).json({
          ok: false,
          error: "Faltan envs",
          vd: { shop: !!shop, token: !!token, ver }
        });
      }
      if (/^https?:\/\//i.test(shop)) {
        return res.status(400).json({
          ok: false,
          error: "SHOPIFY_SHOP_NAME_X debe ser solo *.myshopify.com (sin https://)",
          got: shop
        });
      }
      const url = `https://${shop}/admin/api/${ver}/shop.json`;
      const r = await fetch(url, {
        headers: {
          "X-Shopify-Access-Token": token,
          "User-Agent": "LogisticManager/1.0 (+node)"
        }
      });
      const body = await r.text();
      if (!r.ok) {
        return res.status(r.status).json({
          ok: false,
          status: r.status,
          statusText: r.statusText,
          body: body.slice(0, 500)
        });
      }
      const data = JSON.parse(body);
      res.json({
        ok: true,
        shop: data?.shop?.myshopify_domain || data?.shop?.domain,
        apiVersion: ver
      });
    } catch (e) {
      res.status(500).json({ ok: false, error: e?.message, cause: e?.cause || null });
    }
  });
  app.get("/api/integrations/shopify/sync", requiereAutenticacion, async (req, res) => {
    try {
      const storeParam = req.query.store || "all";
      const limit = Number(req.query.limit ?? 50);
      const r = await syncShopifyOrders({ store: storeParam, limit });
      res.json({ message: "Sincronizaci\xF3n Shopify OK", ...r, status: "success" });
    } catch (e) {
      res.status(500).json({ message: "Fall\xF3 la sincronizaci\xF3n", error: e.message, status: "error" });
    }
  });
  await inicializarDatosPorDefecto();
  app.post("/api/auth/login", async (req, res) => {
    try {
      console.log("Body recibido en login:", req.body);
      const { email, password } = esquemaLogin.parse(req.body);
      const usuario = await storage.getUserByEmail(email);
      if (!usuario) return res.status(401).json({ message: "Credenciales inv\xE1lidas" });
      const passwordValida = await bcrypt.compare(password, usuario.password);
      if (!passwordValida) return res.status(401).json({ message: "Credenciales inv\xE1lidas" });
      await storage.updateUser(usuario.id, { lastLogin: /* @__PURE__ */ new Date() });
      req.session.regenerate((err) => {
        if (err) return res.status(500).json({ message: "Error de sesi\xF3n" });
        req.session.userId = usuario.id;
        req.session.save((err2) => {
          if (err2) return res.status(500).json({ message: "Error guardando sesi\xF3n" });
          res.json({ user: { id: usuario.id, email: usuario.email, role: usuario.role } });
        });
      });
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
      if (!usuario)
        return res.status(404).json({ message: "Usuario no encontrado" });
      res.json({ id: usuario.id, email: usuario.email, role: usuario.role });
    } catch {
      res.status(500).json({ message: "Error del servidor" });
    }
  });
  app.get("/api/me", requiereAutenticacion, async (req, res) => {
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
    } catch (error) {
      res.status(500).json({ message: "Error al obtener el perfil", error: error.message });
    }
  });
  app.put("/api/me", requiereAutenticacion, async (req, res) => {
    try {
      const updateData = req.body;
      res.json({
        message: "Perfil actualizado correctamente",
        profile: { ...req.user, ...updateData }
      });
    } catch (error) {
      res.status(500).json({ message: "Error al actualizar el perfil", error: error.message });
    }
  });
  app.get("/api/dashboard/metrics", requiereAutenticacion, async (req, res) => {
    try {
      const { from, to } = req.query;
      const fromDate = from ? new Date(String(from)) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1e3);
      const toDate = to ? new Date(String(to)) : /* @__PURE__ */ new Date();
      const metricas = await storage.getDashboardMetricsRange(fromDate, toDate);
      res.json(metricas);
    } catch {
      res.status(500).json({ message: "No se pudieron obtener m\xE9tricas" });
    }
  });
  app.get("/api/dashboard/today-orders", requiereAutenticacion, async (req, res) => {
    try {
      const data = await storage.getTodayOrders();
      res.json(data);
    } catch {
      res.status(500).json({ message: "No se pudieron obtener \xF3rdenes del d\xEDa" });
    }
  });
  app.get("/api/dashboard/orders-by-weekday", requiereAutenticacion, async (req, res) => {
    try {
      const week = Number(req.query.week ?? 0);
      const data = await storage.getOrdersByWeekday(week);
      res.json(data);
    } catch {
      res.status(500).json({ message: "No se pudieron obtener \xF3rdenes por d\xEDa" });
    }
  });
  app.get("/api/dashboard/sales-by-month", requiereAutenticacion, async (req, res) => {
    try {
      const data = await storage.getSalesByMonth();
      res.json(data);
    } catch {
      res.status(500).json({ message: "No se pudieron obtener ventas mensuales" });
    }
  });
  app.get("/api/dashboard/top-skus", requiereAutenticacion, async (req, res) => {
    try {
      const { from, to, limit } = req.query;
      const fromDate = from ? new Date(String(from)) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1e3);
      const toDate = to ? new Date(String(to)) : /* @__PURE__ */ new Date();
      const lim = Number(limit ?? 5);
      const data = await storage.getTopSkusRange(fromDate, toDate, lim);
      res.json({ topSkus: data });
    } catch (err) {
      res.status(500).json({ message: "No se pudo obtener Top SKUs" });
    }
  });
  app.get("/api/dashboard/orders-by-channel", async (req, res) => {
    try {
      const { from, to } = req.query;
      const fromDate = from && !Number.isNaN(Date.parse(from)) ? new Date(from) : void 0;
      const toDate = to && !Number.isNaN(Date.parse(to)) ? new Date(to) : void 0;
      const data = await storage.getOrdersByChannel(fromDate, toDate);
      res.json(data);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Error obteniendo \xF3rdenes por canal" });
    }
  });
  app.get("/api/products", requiereAutenticacion, async (req, res) => {
    try {
      const { catalogStorage: catalogStorage2 } = await Promise.resolve().then(() => (init_catalogStorage(), catalogStorage_exports));
      const page = Number(req.query.page) || 1;
      const pageSize = Number(req.query.pageSize) || 25;
      const search = req.query.search;
      const categoria = req.query.categoria;
      const activo = req.query.activo;
      const productos = await catalogStorage2.getProductsPaginated({
        page,
        pageSize,
        search,
        categoria: categoria !== "all" ? categoria : void 0,
        activo: activo !== "all" ? activo === "true" : void 0
      });
      res.json(productos);
    } catch (error) {
      console.error("Error en /api/products:", error);
      res.status(500).json({ message: "No se pudieron obtener productos" });
    }
  });
  app.get("/api/products/categories", requiereAutenticacion, async (req, res) => {
    try {
      const { catalogStorage: catalogStorage2 } = await Promise.resolve().then(() => (init_catalogStorage(), catalogStorage_exports));
      const categorias = await catalogStorage2.getProductCategories();
      res.json(categorias);
    } catch (error) {
      console.error("Error en /api/products/categories:", error);
      res.status(500).json({ message: "No se pudieron obtener categor\xEDas" });
    }
  });
  app.post("/api/products", requiereAutenticacion, async (req, res) => {
    try {
      const { catalogStorage: catalogStorage2 } = await Promise.resolve().then(() => (init_catalogStorage(), catalogStorage_exports));
      const producto = await catalogStorage2.createProduct(req.body);
      res.status(201).json(producto);
    } catch (error) {
      console.error("Error en POST /api/products:", error);
      res.status(500).json({ message: "No se pudo crear el producto" });
    }
  });
  app.patch("/api/products/:id", requiereAutenticacion, async (req, res) => {
    try {
      const { catalogStorage: catalogStorage2 } = await Promise.resolve().then(() => (init_catalogStorage(), catalogStorage_exports));
      const id = req.params.id;
      const producto = await catalogStorage2.updateProduct(id, req.body);
      res.json(producto);
    } catch (error) {
      console.error("Error en PATCH /api/products:", error);
      res.status(500).json({ message: "No se pudo actualizar el producto" });
    }
  });
  app.delete("/api/products/:id", requiereAutenticacion, async (req, res) => {
    try {
      const { catalogStorage: catalogStorage2 } = await Promise.resolve().then(() => (init_catalogStorage(), catalogStorage_exports));
      const id = req.params.id;
      await catalogStorage2.deleteProduct(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error en DELETE /api/products:", error);
      res.status(500).json({ message: "No se pudo eliminar el producto" });
    }
  });
  app.get("/api/unified-products/catalog", requiereAutenticacion, async (req, res) => {
    try {
      const { productStorage: productStorage2 } = await Promise.resolve().then(() => (init_productStorage(), productStorage_exports));
      const page = Number(req.query.page) || 1;
      const pageSize = Number(req.query.pageSize) || 300;
      const search = req.query.search;
      const searchField = req.query.searchField;
      const marca = req.query.marca;
      const categoria = req.query.categoria;
      const condicion = req.query.condicion;
      const marca_producto = req.query.marca_producto;
      const orderBy = req.query.orderBy;
      const orderDir = req.query.orderDir;
      const result = await productStorage2.getCatalogProducts({
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
      res.status(500).json({ message: "Error al obtener productos del cat\xE1logo" });
    }
  });
  app.get("/api/unified-products/catalog/facets", requiereAutenticacion, async (req, res) => {
    try {
      const { productStorage: productStorage2 } = await Promise.resolve().then(() => (init_productStorage(), productStorage_exports));
      const facets = await productStorage2.getCatalogFacets();
      res.json(facets);
    } catch (error) {
      console.error("Error en /api/unified-products/catalog/facets:", error);
      res.status(500).json({ message: "Error al obtener facetas del cat\xE1logo" });
    }
  });
  app.patch("/api/unified-products/catalog/:sku", requiereAutenticacion, async (req, res) => {
    try {
      const { productStorage: productStorage2 } = await Promise.resolve().then(() => (init_productStorage(), productStorage_exports));
      const sku = req.params.sku;
      const result = await productStorage2.updateCatalogProduct(sku, req.body);
      res.json(result);
    } catch (error) {
      console.error("Error en PATCH /api/unified-products/catalog:", error);
      res.status(500).json({ message: "Error al actualizar producto del cat\xE1logo" });
    }
  });
  app.post("/api/unified-products/catalog", requiereAutenticacion, async (req, res) => {
    try {
      const { productStorage: productStorage2 } = await Promise.resolve().then(() => (init_productStorage(), productStorage_exports));
      const result = await productStorage2.createCatalogProduct(req.body);
      res.status(201).json(result);
    } catch (error) {
      console.error("Error en POST /api/unified-products/catalog:", error);
      res.status(500).json({ message: "Error al crear producto del cat\xE1logo" });
    }
  });
  app.delete("/api/unified-products/catalog/:sku", requiereAutenticacion, async (req, res) => {
    try {
      const { productStorage: productStorage2 } = await Promise.resolve().then(() => (init_productStorage(), productStorage_exports));
      const sku = req.params.sku;
      const result = await productStorage2.deleteCatalogProduct(sku);
      res.json(result);
    } catch (error) {
      console.error("Error en DELETE /api/unified-products/catalog:", error);
      res.status(500).json({ message: "Error al eliminar producto del cat\xE1logo" });
    }
  });
  app.get("/api/unified-products/shopify", requiereAutenticacion, async (req, res) => {
    try {
      const { productStorage: productStorage2 } = await Promise.resolve().then(() => (init_productStorage(), productStorage_exports));
      const page = Number(req.query.page) || 1;
      const pageSize = Number(req.query.pageSize) || 300;
      const search = req.query.search;
      const shopId = req.query.shopId ? Number(req.query.shopId) : void 0;
      const status = req.query.status;
      const vendor = req.query.vendor;
      const productType = req.query.productType;
      const syncStatus = req.query.syncStatus;
      const result = await productStorage2.getShopifyProducts({
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
      const { productStorage: productStorage2 } = await Promise.resolve().then(() => (init_productStorage(), productStorage_exports));
      const variantId = Number(req.params.id);
      const userId = req.user?.id || 1;
      const result = await productStorage2.updateShopifyVariant(variantId, req.body, userId);
      res.json(result);
    } catch (error) {
      console.error("Error en PATCH /api/unified-products/shopify/variant:", error);
      res.status(500).json({ message: "Error al actualizar variante de Shopify" });
    }
  });
  app.get("/api/unified-products/reconciliation/stats", requiereAutenticacion, async (req, res) => {
    try {
      const { productStorage: productStorage2 } = await Promise.resolve().then(() => (init_productStorage(), productStorage_exports));
      const stats = await productStorage2.getReconciliationStats();
      res.json(stats);
    } catch (error) {
      console.error("Error en /api/unified-products/reconciliation/stats:", error);
      res.status(500).json({ message: "Error al obtener estad\xEDsticas de conciliaci\xF3n" });
    }
  });
  app.get("/api/unified-products/reconciliation/unlinked/:type", requiereAutenticacion, async (req, res) => {
    try {
      const { productStorage: productStorage2 } = await Promise.resolve().then(() => (init_productStorage(), productStorage_exports));
      const type = req.params.type;
      const page = Number(req.query.page) || 1;
      const pageSize = Number(req.query.pageSize) || 300;
      const result = await productStorage2.getUnlinkedProducts(type, { page, pageSize });
      res.json(result);
    } catch (error) {
      console.error("Error en /api/unified-products/reconciliation/unlinked:", error);
      res.status(500).json({ message: "Error al obtener productos sin vincular" });
    }
  });
  app.post("/api/unified-products/reconciliation/link", requiereAutenticacion, async (req, res) => {
    try {
      const { productStorage: productStorage2 } = await Promise.resolve().then(() => (init_productStorage(), productStorage_exports));
      const userId = req.user?.id || 1;
      const link = await productStorage2.createProductLink({
        ...req.body,
        createdBy: userId,
        updatedBy: userId
      });
      res.status(201).json(link);
    } catch (error) {
      console.error("Error en POST /api/unified-products/reconciliation/link:", error);
      res.status(500).json({ message: "Error al crear v\xEDnculo de producto" });
    }
  });
  app.delete("/api/unified-products/reconciliation/link/:id", requiereAutenticacion, async (req, res) => {
    try {
      const { productStorage: productStorage2 } = await Promise.resolve().then(() => (init_productStorage(), productStorage_exports));
      const id = Number(req.params.id);
      const result = await productStorage2.deleteProductLink(id);
      res.json(result);
    } catch (error) {
      console.error("Error en DELETE /api/unified-products/reconciliation/link:", error);
      res.status(500).json({ message: "Error al eliminar v\xEDnculo de producto" });
    }
  });
  app.get("/api/orders", requiereAutenticacion, async (req, res) => {
    try {
      const statusFilter = req.query.statusFilter || "unmanaged";
      const rawChannel = req.query.channelId ?? req.query.channelFilter;
      const channelId = rawChannel && rawChannel !== "all" ? Number(rawChannel) : void 0;
      const page = req.query.page ? Number(req.query.page) : 1;
      const pageSize = req.query.pageSize ? Number(req.query.pageSize) : 50;
      const search = req.query.search;
      const searchType = req.query.searchType;
      const sortField = req.query.sortField || void 0;
      const sortOrder = (req.query.sortOrder || "desc").toLowerCase() === "asc" ? "asc" : "desc";
      const data = await storage.getOrdersPaginated({
        statusFilter,
        channelId,
        page,
        pageSize,
        search,
        searchType,
        sortField,
        sortOrder
      });
      res.json(data);
    } catch (e) {
      res.status(500).json({ message: "No se pudieron obtener \xF3rdenes" });
    }
  });
  app.get("/api/orders/:id/details", requiereAutenticacion, async (req, res) => {
    try {
      const id = Number(req.params.id);
      console.log(`[GET /api/orders/:id/details] Solicitando detalles ID: ${id}`);
      if (Number.isNaN(id)) {
        return res.status(400).json({ message: "ID de orden inv\xE1lido" });
      }
      const ordenDetallada = await storage.getOrderDetails(id);
      if (!ordenDetallada) {
        return res.status(404).json({ message: "Orden no encontrada" });
      }
      const safe = JSON.parse(JSON.stringify(ordenDetallada));
      res.json(safe);
    } catch (error) {
      console.error(`[GET /api/orders/:id/details] Error:`, error);
      res.status(500).json({ message: "No se pudo obtener la orden (detalles)" });
    }
  });
  app.get("/api/orders/:id/flags", requiereAutenticacion, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ message: "ID de orden inv\xE1lido" });
      }
      const q = sql4`
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
      const r = await db.execute(q);
      const row = r.rows[0] || {};
      res.json({ has_unmapped: !!row.has_unmapped, has_zero_stock: !!row.has_zero_stock });
    } catch (e) {
      res.status(500).json({ message: e?.message || "No se pudieron calcular flags" });
    }
  });
  app.get("/api/orders/:id", requiereAutenticacion, async (req, res) => {
    try {
      const id = Number(req.params.id);
      console.log(`[GET /api/orders/:id] Solicitando orden ID: ${id}`);
      if (Number.isNaN(id)) {
        return res.status(400).json({ message: "ID de orden inv\xE1lido" });
      }
      const orden = await storage.getOrder(id);
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
      console.log(`[DEBUG] Order ID inv\xE1lido: ${req.params.orderId}`);
      return res.status(400).json({ message: "orderId inv\xE1lido" });
    }
    try {
      const items = await storage.getOrderItems(orderId);
      console.log(`[DEBUG] Items retornados:`, items);
      res.json(jsonSafe({ items }));
    } catch (e) {
      console.error("[items] Error:", e?.message);
      res.status(500).json({ message: "No se pudieron obtener items" });
    }
  });
  app.put("/api/orders/:orderId/items/:itemId/sku", requiereAutenticacion, async (req, res) => {
    try {
      const orderId = Number(req.params.orderId);
      const itemId = Number(req.params.itemId);
      if (!Number.isInteger(orderId) || orderId <= 0 || !Number.isInteger(itemId) || itemId <= 0) {
        return res.status(400).json({ message: "Par\xE1metros inv\xE1lidos" });
      }
      const bodySchema = z5.object({ sku: z5.string().min(1) });
      const { sku } = bodySchema.parse(req.body);
      const existsQ = sql4`
        SELECT 1 FROM catalogo_productos cp
        WHERE lower(cp.sku_interno) = lower(${sku}) OR lower(cp.sku) = lower(${sku})
        LIMIT 1
      `;
      const exists = await db.execute(existsQ);
      if (!exists.rows.length) {
        return res.status(400).json({ message: "SKU no existe en cat\xE1logo" });
      }
      const upd = sql4`
        UPDATE order_items SET sku = ${sku}
        WHERE id = ${itemId} AND order_id = ${orderId}
      `;
      await db.execute(upd);
      res.json({ ok: true });
    } catch (e) {
      res.status(400).json({ message: e?.message || "No se pudo reasignar el SKU" });
    }
  });
  app.post("/api/orders/:id/cancel", requiereAutenticacion, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id))
        return res.status(400).json({ message: "ID de orden inv\xE1lido" });
      const orden = await storage.getOrder(id);
      if (!orden) return res.status(404).json({ ok: false, errors: "Orden no encontrada" });
      if (orden.shopifyCancelledAt) {
        return res.status(400).json({ ok: false, errors: "La orden ya est\xE1 cancelada" });
      }
      const { reason, staffNote, notifyCustomer, restock, refundToOriginal } = req.body;
      const gid = orden.orderId && orden.orderId.startsWith("gid://") ? orden.orderId : `gid://shopify/Order/${orden.orderId || orden.id}`;
      {
        if (orden.shopId !== 1 && orden.shopId !== 2) {
          return res.status(400).json({ ok: false, errors: "La orden no corresponde a Shopify (shopId 1 o 2)" });
        }
        const reasonEff = typeof reason === "string" && reason ? reason : "OTHER";
        const staffNoteEff = typeof staffNote === "string" ? staffNote : "";
        const notifyCustomerEff = notifyCustomer === void 0 ? true : !!notifyCustomer;
        const restockEff = restock === void 0 ? true : !!restock;
        const refundEff = !!refundToOriginal;
        console.log("[cancel-order] start", { id, gid, reason: reasonEff });
        const { cancelShopifyOrderAndWait: cancelShopifyOrderAndWait2 } = await Promise.resolve().then(() => (init_cancelOrder(), cancelOrder_exports));
        const result = await cancelShopifyOrderAndWait2({
          shopId: orden.shopId,
          orderGid: gid,
          reason: reasonEff,
          staffNote: staffNoteEff,
          email: notifyCustomerEff,
          restock: restockEff,
          refund: refundEff
        });
        if (!result.ok) {
          console.warn("[cancel-order] shopify failed", result);
          return res.status(400).json({ ok: false, errors: result.errors || [{ message: "Cancelaci\xF3n no confirmada en Shopify" }], stage: result.stage });
        }
        const o = result.order;
        const { markOrderCancelledSafe: markOrderCancelledSafe2 } = await Promise.resolve().then(() => (init_storage(), storage_exports));
        await markOrderCancelledSafe2(id, {
          cancelledAt: o?.cancelledAt || null,
          cancelReason: o?.cancelReason || reasonEff || null,
          staffNote: staffNoteEff || null,
          displayFinancialStatus: o?.displayFinancialStatus || null,
          displayFulfillmentStatus: o?.displayFulfillmentStatus || null
        });
        return res.json({ ok: true, order: o });
      }
    } catch (e) {
      console.error("cancel order", e?.message);
      res.status(500).json({ ok: false, errors: e?.message });
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
      if (Number.isNaN(id))
        return res.status(400).json({ message: "ID de orden inv\xE1lido" });
      const orden = await storage.updateOrder(id, req.body);
      res.json(orden);
    } catch {
      res.status(400).json({ message: "No se pudo actualizar la orden" });
    }
  });
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const ok = file.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || file.mimetype === "application/vnd.ms-excel";
      if (!ok) return cb(new Error("Formato de archivo no permitido. Sube un .xlsx/.xls"));
      cb(null, true);
    }
  });
  app.post(
    "/api/orders/import",
    requiereAutenticacion,
    upload.single("file"),
    async (req, res) => {
      try {
        if (!req.file?.buffer) {
          return res.status(400).json({ message: "No se recibi\xF3 archivo" });
        }
        const wb = xlsx.read(req.file.buffer, { type: "buffer" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        if (!ws) return res.status(400).json({ message: "El Excel no tiene hojas" });
        const rawRows = xlsx.utils.sheet_to_json(ws, { defval: null, raw: true });
        const requiredColumns = ["shopId", "orderId"];
        const firstRow = rawRows[0] ?? {};
        const missing = requiredColumns.filter((c) => !(c in firstRow));
        if (missing.length) {
          return res.status(400).json({
            message: "Faltan columnas obligatorias",
            missing,
            requiredTemplate: requiredColumns.concat([
              "name",
              "orderNumber",
              "customerName",
              "customerEmail",
              "subtotalPrice",
              "totalAmount",
              "currency",
              "financialStatus",
              "fulfillmentStatus",
              "tags",
              "createdAt",
              "shopifyCreatedAt",
              "items",
              "skus"
            ])
          });
        }
        const { results, summary } = await storage.importOrdersFromRows(rawRows);
        return res.json({
          ...summary,
          errors: results.filter((r) => r.status === "error").map((r) => ({ rowIndex: r.rowIndex, message: r.message, field: r.field, value: r.value }))
        });
      } catch (err) {
        console.error("\u274C Import error:", err);
        res.status(500).json({ message: err?.message || "Error en la importaci\xF3n" });
      }
    }
  );
  app.post("/api/orders/export", requiereAutenticacion, async (req, res) => {
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
        sortOrder
      } = req.body ?? {};
      const rows = await storage.getOrdersForExport({
        selectedIds,
        statusFilter,
        channelId: channelId ? Number(channelId) : void 0,
        search,
        searchType,
        page,
        pageSize,
        sortField,
        sortOrder
      });
      const data = rows.map((o) => ({
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
        skus: Array.isArray(o.skus) ? o.skus.join(",") : ""
      }));
      const wb = xlsx.utils.book_new();
      const ws = xlsx.utils.json_to_sheet(data, { dateNF: "yyyy-mm-dd hh:mm:ss" });
      xlsx.utils.book_append_sheet(wb, ws, "orders");
      const buf = xlsx.write(wb, { bookType: "xlsx", type: "buffer" });
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="ordenes_${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.xlsx"`);
      res.send(buf);
    } catch (err) {
      console.error("\u274C Export error:", err);
      res.status(500).json({ message: "No se pudo exportar el Excel" });
    }
  });
  app.get("/api/tickets", requiereAutenticacion, async (_req, res) => {
    try {
      const rows = await storage.getTicketsView();
      const safe = JSON.parse(JSON.stringify(rows, (_, v) => typeof v === "bigint" ? v.toString() : v));
      res.json(safe);
    } catch (e) {
      res.status(400).json({ message: e?.message || "No se pudieron obtener los tickets" });
    }
  });
  app.post("/api/tickets", requiereAutenticacion, async (req, res) => {
    try {
      const datos = insertTicketSchema.parse(req.body);
      const ticket = await storage.createTicketAndFulfill({
        orderId: datos.orderId,
        notes: datos.notes
      });
      const safeTicket = JSON.parse(
        JSON.stringify(ticket, (_, v) => typeof v === "bigint" ? v.toString() : v)
      );
      res.status(201).json(safeTicket);
    } catch (e) {
      const msg = e?.message || "No se pudo crear el ticket";
      const isShopify = /Shopify (GET|POST)/i.test(msg);
      res.status(isShopify ? 502 : 400).json({ message: msg });
    }
  });
  app.post("/api/tickets/bulk", requiereAutenticacion, async (req, res) => {
    try {
      const { orderIds, notes: notes2 } = createBulkTicketsSchema.parse(req.body);
      console.log(`\u{1F3AB} Creando tickets masivos para ${orderIds.length} \xF3rdenes...`);
      const resultado = await storage.createBulkTickets(orderIds, notes2);
      const mensaje = `Tickets creados: ${resultado.tickets.length}. \xD3rdenes actualizadas: ${resultado.updated}. Fallidas: ${resultado.failed.length}`;
      res.status(201).json({
        ok: true,
        message: mensaje,
        tickets: resultado.tickets,
        ordersUpdated: resultado.updated,
        failed: resultado.failed
      });
    } catch (error) {
      console.error("\u274C Error creando tickets masivos:", error);
      res.status(500).json({
        ok: false,
        message: "Error interno al crear tickets masivos",
        error: error?.message
      });
    }
  });
  app.delete("/api/tickets/:id", requiereAutenticacion, async (req, res) => {
    try {
      const id = Number(req.params.id);
      await storage.deleteTicket(id);
      res.json({ ok: true });
    } catch (e) {
      res.status(400).json({ ok: false, message: e?.message || "No se pudo eliminar el ticket" });
    }
  });
  app.post("/api/tickets/:id/revert", requiereAutenticacion, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const revertShopify = req.query.revertShopify === "1" || req.body?.revertShopify === true;
      const r = await storage.revertTicket(id, { revertShopify });
      res.json(r);
    } catch (e) {
      res.status(400).json({ ok: false, message: e?.message || "No se pudo revertir el ticket" });
    }
  });
  app.post("/api/tickets/bulk", requiereAutenticacion, async (req, res) => {
    try {
      const { orderIds, notes: notes2 } = createBulkTicketsSchema.parse(req.body);
      const r = await storage.createBulkTickets(orderIds, notes2);
      const safe = JSON.parse(JSON.stringify(r, (_, v) => typeof v === "bigint" ? v.toString() : v));
      res.status(201).json({
        ok: true,
        message: `Tickets creados: ${safe.tickets.length}. \xD3rdenes marcadas fulfilled: ${safe.updated}. Fallidas: ${safe.failed.length}`,
        ...safe
      });
    } catch (e) {
      res.status(400).json({ ok: false, message: e?.message || "Error al crear tickets masivos" });
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
      const userId = req.user.id;
      const notas = await storage.getUserNotes(userId);
      const mapped = notas?.map((n) => ({
        id: n.id,
        content: n.content,
        date: new Date(n.createdAt).toISOString().split("T")[0],
        // Para el calendario
        createdAt: n.createdAt
      })) ?? [];
      res.json(mapped);
    } catch (error) {
      console.log("Error en GET /api/notes:", error);
      res.status(500).json([]);
    }
  });
  app.post("/api/notes", requiereAutenticacion, async (req, res) => {
    try {
      const userId = req.user.id;
      const { content } = insertNoteSchema.parse(req.body);
      console.log("Creando nota para usuario:", userId, "con contenido:", content);
      const nota = await storage.createNote({
        userId,
        content
      });
      console.log("Nota creada:", nota);
      res.status(201).json({
        id: nota.id,
        content: nota.content,
        date: new Date(nota.createdAt).toISOString().split("T")[0],
        createdAt: nota.createdAt
      });
    } catch (error) {
      console.log("Error en POST /api/notes:", error);
      if (error instanceof z5.ZodError) {
        return res.status(400).json({ message: "Datos de nota inv\xE1lidos", errors: error.errors });
      }
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });
  app.put("/api/notes/:id", requiereAutenticacion, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { text: text2 } = req.body;
      if (!id || !text2 || !text2.trim()) return res.status(400).json({ message: "Texto inv\xE1lido" });
      await storage.updateNote(id, { content: text2.trim() });
      res.json({ ok: true });
    } catch {
      res.status(500).json({ message: "No se pudo actualizar la nota" });
    }
  });
  app.delete("/api/notes/:id", requiereAutenticacion, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id))
        return res.status(400).json({ message: "ID de nota inv\xE1lido" });
      await storage.deleteNote(id);
      res.status(204).send();
    } catch {
      res.status(500).json({ message: "No se pudo eliminar la nota" });
    }
  });
  app.get("/api/products", requiereAutenticacion, async (req, res) => {
    try {
      const shopId = Number(req.query.shopId);
      const page = req.query.page ? Number(req.query.page) : 1;
      const pageSize = req.query.pageSize ? Number(req.query.pageSize) : 15;
      const data = await storage.getProductsPaginated({ page, pageSize });
      res.json(data);
    } catch {
      res.status(500).json({ message: "No se pudieron obtener productos" });
    }
  });
  app.get("/api/catalog-products", requiereAutenticacion, async (req, res) => {
    try {
      const page = req.query.page ? Number(req.query.page) : 1;
      const pageSize = req.query.pageSize ? Number(req.query.pageSize) : 15;
      const data = await storage.getCatalogProductsPaginated(page, pageSize);
      res.json(data);
    } catch {
      res.status(500).json({ message: "No se pudieron obtener productos" });
    }
  });
  app.get("/api/catalogo/search", requiereAutenticacion, async (req, res) => {
    try {
      const q = String(req.query.q || "").trim();
      if (!q) return res.json([]);
      const pattern = `%${q.toLowerCase()}%`;
      const r = await db.execute(sql4`
        SELECT sku, sku_interno, nombre_producto, costo, stock
        FROM catalogo_productos
        WHERE lower(sku) LIKE ${pattern}
           OR lower(sku_interno) LIKE ${pattern}
           OR lower(nombre_producto) LIKE ${pattern}
        LIMIT 20
      `);
      res.json(r.rows);
    } catch (e) {
      res.status(500).json({ message: e?.message || "Error en b\xFAsqueda de cat\xE1logo" });
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
  app.get("/api/integrations/shopify/ping-count", requiereAutenticacion, async (req, res) => {
    try {
      const storeParam = req.query.store || "1";
      const result = await getOrdersCount(storeParam);
      return res.json({
        ok: true,
        store: result.store,
        shop: result.shop,
        count: result.count,
        apiVersion: getShopifyCredentials(String(storeParam)).apiVersion
      });
    } catch (e) {
      console.log(`\u274C Error en ping count: ${e.message}`);
      res.status(500).json({ ok: false, error: e.message });
    }
  });
  app.post("/api/integrations/shopify/orders/backfill", requiereAutenticacion, async (req, res) => {
    try {
      const storeParam = req.query.store || "1";
      const since = req.query.since;
      const cursor = req.query.cursor || void 0;
      const limit = parseInt(req.query.limit) || 50;
      const result = await syncShopifyOrdersBackfill({
        store: storeParam,
        since,
        pageInfo: cursor,
        limit
      });
      if (result.ok) {
        res.json({
          ok: true,
          message: `Backfill completado para tienda ${storeParam}`,
          summary: result.summary,
          hasNextPage: result.hasNextPage,
          nextPageInfo: result.nextPageInfo
        });
      } else {
        res.status(500).json({ ok: false, message: `Backfill fall\xF3 para tienda ${storeParam}` });
      }
    } catch (e) {
      console.log(`\u274C Error en backfill: ${e.message}`);
      res.status(500).json({ ok: false, error: e.message });
    }
  });
  app.post("/api/integrations/shopify/sync-now", requiereAutenticacion, async (req, res) => {
    try {
      console.log("\u{1F504} Iniciando sincronizaci\xF3n manual de Shopify...");
      const resultado = await syncShopifyOrders({ store: "all", limit: 50 });
      console.log("\u2705 Sincronizaci\xF3n manual completada");
      res.json({
        ok: true,
        message: "Sincronizaci\xF3n completada exitosamente",
        resultado,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch (error) {
      console.error("\u274C Error en sincronizaci\xF3n manual:", error);
      res.status(500).json({
        ok: false,
        message: "Error durante la sincronizaci\xF3n",
        error: error?.message || "Error desconocido"
      });
    }
  });
  app.post("/api/integrations/shopify/orders/sync", requiereAutenticacion, async (req, res) => {
    try {
      const storeParam = req.query.store || "1";
      const updatedSince = req.query.updatedSince;
      const cursor = req.query.cursor || void 0;
      const limit = parseInt(req.query.limit) || 100;
      if (!updatedSince && !cursor) {
        return res.status(400).json({
          ok: false,
          error: "Par\xE1metro updatedSince es requerido cuando no hay cursor"
        });
      }
      const result = await syncShopifyOrdersIncremental({
        store: storeParam,
        updatedSince: updatedSince || new Date(Date.now() - 10 * 6e4).toISOString(),
        pageInfo: cursor,
        limit
      });
      res.json({
        ok: true,
        message: `Sync incremental para tienda ${storeParam}`,
        summary: result.summary,
        hasNextPage: result.hasNextPage,
        nextPageInfo: result.nextPageInfo
      });
    } catch (e) {
      console.log(`\u274C Error en sync incremental: ${e.message}`);
      res.status(500).json({ ok: false, error: e.message });
    }
  });
  app.get("/api/integrations/shopify/products", requiereAutenticacion, async (req, res) => {
    try {
      const storeParam = req.query.store || "1";
      const storeId = parseInt(storeParam);
      console.log(`\u{1F4E6} Listando productos para tienda ${storeParam}`);
      const productService = new ProductService(storeParam);
      const products3 = await productService.getProductsForStore(storeId);
      res.json({
        ok: true,
        store: storeParam,
        products: products3,
        count: products3.length
      });
    } catch (e) {
      console.log(`\u274C Error listando productos: ${e.message}`);
      res.status(500).json({
        ok: false,
        error: e.message
      });
    }
  });
  app.post("/api/integrations/shopify/products/sync", requiereAutenticacion, async (req, res) => {
    try {
      const storeParam = req.query.store || "1";
      const limit = parseInt(req.query.limit) || 50;
      console.log(`\u{1F504} Sincronizando productos desde Shopify tienda ${storeParam}`);
      const productService = new ProductService(storeParam);
      const result = await productService.syncProductsFromShopify(limit);
      if (result.success) {
        res.json({
          ok: true,
          message: `Productos sincronizados para tienda ${storeParam}`,
          productsProcessed: result.productsProcessed,
          errors: result.errors
        });
      } else {
        res.status(500).json({
          ok: false,
          message: `Sync de productos fall\xF3 para tienda ${storeParam}`,
          productsProcessed: result.productsProcessed,
          errors: result.errors
        });
      }
    } catch (e) {
      console.log(`\u274C Error sincronizando productos: ${e.message}`);
      res.status(500).json({
        ok: false,
        error: e.message
      });
    }
  });
  app.put("/api/integrations/shopify/products/:id", requiereAutenticacion, async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const updates = req.body;
      if (!updates || typeof updates !== "object") {
        return res.status(400).json({
          ok: false,
          error: "Datos de actualizaci\xF3n requeridos"
        });
      }
      console.log(`\u{1F504} Actualizando producto ${productId} en Shopify`);
      const product = await storage.getProduct(productId);
      if (!product) {
        return res.status(404).json({
          ok: false,
          error: "Producto no encontrado"
        });
      }
      const productService = new ProductService(product.shopId.toString());
      const result = await productService.updateProductInShopify(productId, updates);
      if (result.success) {
        res.json({
          ok: true,
          message: "Producto actualizado exitosamente",
          product: result.product,
          shopifyUpdated: result.shopifyUpdated
        });
      } else {
        res.status(500).json({
          ok: false,
          error: result.error,
          shopifyUpdated: result.shopifyUpdated
        });
      }
    } catch (e) {
      console.log(`\u274C Error actualizando producto: ${e.message}`);
      res.status(500).json({
        ok: false,
        error: e.message
      });
    }
  });
  app.get("/api/integrations/mercadolibre/simulate", requiereAutenticacion, async (_req, res) => {
    res.json({ message: "Simulaci\xF3n MercadoLibre", status: "pending" });
  });
  app.get("/api/mlg/ping", requiereAutenticacion, async (_req, res) => {
    try {
      const { mlgRequest: mlgRequest2 } = await Promise.resolve().then(() => (init_MlgClient(), MlgClient_exports));
      const upstream = await mlgRequest2(`/api/Productos/ObtenerCategorias`, { method: "GET" });
      if (!upstream.ok) {
        const text2 = await upstream.text();
        return res.status(502).json({ message: "MLG upstream error", status: upstream.status, body: text2 });
      }
      const json = await upstream.json();
      res.json({ ok: true, data: json });
    } catch (err) {
      res.status(500).json({ message: "MLG ping failed", error: String(err?.message ?? err) });
    }
  });
  const { registerMlgRoutes: registerMlgRoutes2 } = await Promise.resolve().then(() => (init_mlgRoutes(), mlgRoutes_exports));
  registerMlgRoutes2(app);
  const { registerShippingRoutes: registerShippingRoutes2 } = await Promise.resolve().then(() => (init_shippingRoutes(), shippingRoutes_exports));
  registerShippingRoutes2(app);
  const servidorHttp = createServer(app);
  return servidorHttp;
}
async function inicializarDatosPorDefecto() {
  try {
    const usuarioLogistica = await storage.getUserByEmail(
      "logistica@empresa.com"
    );
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
    const paqueterias = await storage.getCarriers();
    if (paqueterias.length === 0) {
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

// server/socketio.ts
import { Server as SocketIOServer } from "socket.io";
function attachSockets(httpServer) {
  const io = new SocketIOServer(httpServer, {
    cors: { origin: true, credentials: true }
  });
  io.on("connection", (socket) => {
    console.log("Usuario conectado al chat:", socket.id);
    socket.on("chat:message", (msg) => {
      const payload = { ...msg, ts: Date.now(), id: socket.id };
      console.log("Mensaje de chat:", payload);
      io.emit("chat:message", payload);
    });
    socket.on("disconnect", () => {
      console.log("Usuario desconectado del chat:", socket.id);
    });
  });
  return io;
}

// server/index.ts
var _g = globalThis;
if (typeof _g.fetch !== "function") {
  console.log("Using built-in fetch");
}
var aplicacion = express2();
aplicacion.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      return cb(null, true);
    },
    credentials: true
  })
);
aplicacion.use(express2.json());
aplicacion.use(express2.urlencoded({ extended: true }));
aplicacion.use(fileUpload({
  limits: { fileSize: 50 * 1024 * 1024 },
  // 50MB max
  abortOnLimit: true
}));
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
  attachSockets(servidor);
  aplicacion.use(
    (err, _req, res, _next) => {
      const estado = err.status || err.statusCode || 500;
      const mensaje = err.message || "Error interno del servidor";
      res.status(estado).json({ mensaje });
      throw err;
    }
  );
  if (aplicacion.get("env") === "development") {
    await setupVite(aplicacion, servidor);
  } else {
    serveStatic(aplicacion);
  }
  const puerto = parseInt(process.env.PORT || "5000", 10);
  servidor.listen({ port: puerto, host: "0.0.0.0" }, () => {
    log(` Servidor trabajando en el puerto ${puerto}`);
    if (process.env.ENABLE_CRON === "1") {
      startSchedulers();
    } else {
      console.log("[CRON] Desactivado (ENABLE_CRON != 1)");
    }
    (async () => {
      try {
        if (process.env.MLG_ENABLED === "true") {
          const { startMlgSyncScheduler: startMlgSyncScheduler2 } = await Promise.resolve().then(() => (init_syncMlgSales(), syncMlgSales_exports));
          startMlgSyncScheduler2();
          console.log("[MLG] Sync scheduler started");
        } else {
          console.log("[MLG] Sync disabled (MLG_ENABLED != 'true')");
        }
      } catch (e) {
        console.warn("[MLG] Could not start sync scheduler:", e?.message || e);
      }
    })();
  });
})();
