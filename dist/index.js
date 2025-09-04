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
  TICKET_STATUS: () => TICKET_STATUS,
  articulos: () => articulos,
  brands: () => brands,
  canales: () => channels,
  carriers: () => carriers,
  catalogoProductos: () => catalogoProductos,
  channels: () => channels,
  createBulkTicketsSchema: () => createBulkTicketsSchema,
  eventosTicket: () => ticketEvents,
  insertNoteSchema: () => insertNoteSchema,
  insertOrderSchema: () => insertOrderSchema,
  insertTicketSchema: () => insertTicketSchema,
  logisticServices: () => logisticServices,
  marcas: () => brands,
  notas: () => notes,
  notes: () => notes,
  ordenes: () => orders,
  orderItems: () => orderItems,
  orders: () => orders,
  paqueterias: () => carriers,
  productLinks: () => productLinks,
  products: () => products,
  serviceCarriers: () => serviceCarriers,
  serviciosLogisticos: () => logisticServices,
  serviciosPaqueterias: () => serviceCarriers,
  ticketEvents: () => ticketEvents,
  tickets: () => tickets,
  ticketsTabla: () => tickets,
  users: () => users,
  usuarios: () => users,
  variants: () => variants
});
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
  jsonb
} from "drizzle-orm/pg-core";
import { index, uniqueIndex } from "drizzle-orm/pg-core";
import { z } from "zod";
var users, brands, carriers, logisticServices, serviceCarriers, catalogoProductos, articulos, channels, notes, orders, orderItems, products, variants, productLinks, tickets, ticketEvents, insertOrderSchema, insertTicketSchema, createBulkTicketsSchema, insertNoteSchema, TICKET_STATUS;
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
    logisticServices = pgTable(
      "logistic_services",
      {
        id: serial("id").primaryKey(),
        name: text("name").notNull(),
        code: text("code").notNull(),
        active: boolean("active").notNull().default(true),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
      },
      (t) => ({
        // usa el nombre "oficial" de la BD para evitar duplicados
        uxCode: uniqueIndex("logistic_services_code_key").on(t.code)
      })
    );
    serviceCarriers = pgTable(
      "service_carriers",
      {
        serviceId: integer("service_id").notNull().references(() => logisticServices.id, { onDelete: "cascade" }),
        carrierId: integer("carrier_id").notNull().references(() => carriers.id, { onDelete: "cascade" })
      },
      (t) => ({
        // En BD existe como PRIMARY KEY (service_id, carrier_id)
        pk: { columns: [t.serviceId, t.carrierId], name: "service_carriers_pkey" }
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
    articulos = pgTable("articulos", {
      sku: text("sku"),
      proveedor: text("proveedor"),
      // antes: marca
      sku_interno: text("sku_interno"),
      codigo_barras: text("codigo_barras"),
      nombre: text("nombre"),
      // antes: nombre_producto
      descripcion: text("descripcion"),
      modelo: text("modelo"),
      categoria: text("categoria"),
      condicion_producto: text("condicion_producto"),
      // antes: condicion
      marca_producto: text("marca_producto"),
      tipo_variante: text("tipo_variante"),
      variante: text("variante"),
      largo_cm: decimal("largo_cm"),
      // antes: largo
      ancho_cm: decimal("ancho_cm"),
      // antes: ancho
      alto_cm: decimal("alto_cm"),
      // antes: alto
      peso_kg: decimal("peso_kg"),
      // antes: peso
      peso_volumetrico: decimal("peso_volumetrico"),
      imagen1: text("imagen1"),
      // antes: foto
      imagen2: text("imagen2"),
      imagen3: text("imagen3"),
      imagen4: text("imagen4"),
      costo: decimal("costo"),
      stock: integer("stock"),
      status: text("status"),
      // 'activo' | 'inactivo'
      garantia_meses: integer("garantia_meses"),
      clave_producto_sat: text("clave_producto_sat"),
      unidad_medida_sat: text("unidad_medida_sat"),
      clave_unidad_medida_sat: text("clave_unidad_medida_sat")
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
        // Alineado a BIGINT en BD; mantenemos mode:number para interoperar con el resto del código.
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
        updatedAt: timestamp("updated_at")
      },
      (t) => ({
        uxTicketNumber: uniqueIndex("tickets_ticket_number_unique").on(t.ticketNumber),
        idxOrder: index("ix_tickets_order").on(t.orderId),
        idxStatus: index("ix_tickets_status").on(t.status),
        idxService: index("ix_tickets_service").on(t.serviceId),
        idxCarrier: index("ix_tickets_carrier").on(t.carrierId),
        idxTracking: index("ix_tickets_tracking").on(t.trackingNumber)
      })
    );
    ticketEvents = pgTable(
      "ticket_events",
      {
        id: serial("id").primaryKey(),
        ticketId: integer("ticket_id").notNull().references(() => tickets.id),
        eventType: text("event_type").notNull(),
        payload: jsonb("payload"),
        createdAt: timestamp("created_at").defaultNow()
      },
      (t) => ({
        idxTicket: index("ix_ticket_events_ticket").on(t.ticketId),
        idxType: index("ix_ticket_events_type").on(t.eventType)
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
    TICKET_STATUS = {
      ABIERTO: "ABIERTO",
      ETIQUETA_GENERADA: "ETIQUETA_GENERADA",
      EN_TRANSITO: "EN_TR\xC1NSITO",
      ENTREGADO: "ENTREGADO",
      CANCELADO: "CANCELADO",
      FALLIDO: "FALLIDO"
    };
  }
});

// server/db.ts
var db_exports = {};
__export(db_exports, {
  db: () => db,
  pool: () => pool
});
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
  lte,
  inArray
} from "drizzle-orm";
async function markOrderCancelledSafe(idNum, payload) {
  try {
    const updateData = {};
    let cancelledAtDate = void 0;
    if (typeof payload.cancelledAt === "string") {
      const d = new Date(payload.cancelledAt);
      cancelledAtDate = isNaN(d.getTime()) ? null : d;
    } else if (payload.cancelledAt instanceof Date) {
      cancelledAtDate = isNaN(payload.cancelledAt.getTime()) ? null : payload.cancelledAt;
    } else if (payload.cancelledAt === null) {
      cancelledAtDate = null;
    }
    if (typeof payload.cancelledAt !== "undefined") updateData["shopifyCancelledAt"] = cancelledAtDate;
    if (typeof payload.cancelReason !== "undefined") updateData["cancelReason"] = payload.cancelReason ?? null;
    if (typeof payload.staffNote !== "undefined") updateData["orderNote"] = payload.staffNote ?? null;
    if (typeof payload.displayFinancialStatus !== "undefined") updateData["financialStatus"] = payload.displayFinancialStatus ?? null;
    if (typeof payload.displayFulfillmentStatus !== "undefined") updateData["fulfillmentStatus"] = payload.displayFulfillmentStatus ?? null;
    if (Object.keys(updateData).length === 0) {
      return { ok: true, skipped: true };
    }
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
        const consulta = db.select().from(articulos);
        return await consulta.orderBy(asc(articulos.sku));
      }
      /** Crea un producto de catálogo. */
      async createCatalogProduct(datos) {
        const [productoNuevo] = await db.insert(articulos).values(datos).returning();
        return productoNuevo;
      }
      /** Actualiza un producto de catálogo. */
      async updateCatalogProduct(id, updates) {
        const [producto] = await db.update(articulos).set(updates).where(eq2(articulos.sku_interno, String(id))).returning();
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
      // ==== SERVICIOS LOGÍSTICOS ====
      /** Devuelve servicios logísticos activos. */
      async getLogisticServices() {
        return await db.select().from(logisticServices).where(eq2(logisticServices.active, true)).orderBy(asc(logisticServices.name));
      }
      /** Devuelve paqueterías compatibles con un servicio. */
      async getServiceCarriers(serviceId) {
        const q = sql`
      SELECT c.*
      FROM carriers c
      JOIN service_carriers sc ON sc.carrier_id = c.id
      WHERE sc.service_id = ${serviceId} AND c.is_active = TRUE
      ORDER BY c.name ASC
    `;
        const r = await db.execute(q);
        return r.rows;
      }
      /** Devuelve todos los pares servicio-paqueterA-a (para meta de UI). */
      async getAllServiceCarriers() {
        const r = await db.execute(sql`
      SELECT service_id AS "serviceId", carrier_id AS "carrierId" 
      FROM service_carriers
    `);
        return r.rows;
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

        -- Campos de catálogo (mapeo legacy)
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

          -- products (1 fila por id_shopify)
          p.title        AS title,
          p.vendor       AS vendor,
          p.product_type AS product_type,

          -- variants (1 fila por id_shopify)
          v.barcode,
          v.compare_at_price,
          v.inventory_qty,

          -- articulos (antes catalogo_productos): elegimos UNA mejor coincidencia
          a.sku          AS sku_marca,
          a.sku_interno  AS sku_interno,
          a.nombre       AS nombre_producto,
          a.categoria    AS categoria,
          a.condicion_producto AS condicion,    -- alias legacy
          a.proveedor    AS marca,              -- alias legacy
          a.variante     AS variante,
          a.largo_cm     AS largo,              -- alias legacy
          a.ancho_cm     AS ancho,              -- alias legacy
          a.alto_cm      AS alto,               -- alias legacy
          a.peso_kg      AS peso,               -- alias legacy
          a.imagen1      AS foto,               -- alias legacy
          a.costo        AS costo,
          a.stock        AS stock_marca,

          -- Campos derivados de mapeo
          CASE WHEN a.sku IS NULL AND a.sku_interno IS NULL THEN 'unmapped'
               ELSE 'matched'
          END AS mapping_status,
          CASE
            WHEN a.sku_interno IS NOT NULL AND oi.sku IS NOT NULL AND lower(a.sku_interno) = lower(oi.sku) THEN 'interno'
            WHEN a.sku         IS NOT NULL AND oi.sku IS NOT NULL AND lower(a.sku)         = lower(oi.sku) THEN 'externo'
            ELSE NULL
          END AS match_source,
          a.costo AS unit_price

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

        -- articulos: prioriza match por sku_interno, luego por sku
        LEFT JOIN LATERAL (
          SELECT a.*
          FROM articulos a
          WHERE
            (a.sku_interno IS NOT NULL OR a.sku IS NOT NULL)
            AND oi.sku IS NOT NULL
            AND (
              lower(a.sku_interno) = lower(oi.sku)
              OR lower(a.sku) = lower(oi.sku)
            )
          ORDER BY
            (lower(a.sku_interno) = lower(oi.sku)) DESC,
            (lower(a.sku) = lower(oi.sku)) DESC,
            a.sku_interno NULLS LAST,
            a.sku        NULLS LAST
          LIMIT 1
        ) a ON TRUE

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
      WITH items_agg AS (
        SELECT 
          oi.order_id,
          COUNT(oi.id)::int AS items_count,
          COALESCE(ARRAY_AGG(DISTINCT oi.sku) FILTER (WHERE oi.sku IS NOT NULL), ARRAY[]::text[]) AS skus,
          COALESCE(ARRAY_AGG(DISTINCT a.proveedor) FILTER (WHERE a.proveedor IS NOT NULL), ARRAY[]::text[]) AS brands
        FROM order_items oi
        LEFT JOIN articulos a ON a.sku = oi.sku
        GROUP BY oi.order_id
      )
      SELECT 
        t.id,
        t.ticket_number                                                         AS "ticketNumber",
        t.status                                                                AS "status",
        t.notes                                                                 AS "notes",
        t.service_id                                                            AS "serviceId",
        ls.name                                                                 AS "serviceName",
        t.carrier_id                                                            AS "carrierId",
        c.name                                                                  AS "carrierName",
        t.tracking_number                                                       AS "trackingNumber",
        t.label_url                                                             AS "labelUrl",
        t.service_level                                                         AS "serviceLevel",
        t.package_count                                                         AS "packageCount",
        t.weight_kg                                                             AS "weightKg",
        t.length_cm                                                             AS "lengthCm",
        t.width_cm                                                              AS "widthCm",
        t.height_cm                                                             AS "heightCm",
        t.created_at                                                            AS "createdAt",
        t.updated_at                                                            AS "updatedAt",
        COALESCE(o.id::text, '')                                                AS "orderPk",
        COALESCE(o.order_id, '')                                                AS "orderId",
        COALESCE(o.name, '')                                                    AS "orderName",
        COALESCE(o.customer_name, '')                                           AS "customerName",
        o.shop_id                                                               AS "shopId",
        COALESCE(ia.items_count, 0)                                             AS "itemsCount",
        COALESCE(ia.skus, ARRAY[]::text[])                                      AS "skus",
        COALESCE(ia.brands, ARRAY[]::text[])                                    AS "brands"
      FROM tickets t
      LEFT JOIN orders o           ON o.id = t.order_id::bigint
      LEFT JOIN items_agg ia       ON ia.order_id = o.id
      LEFT JOIN logistic_services ls ON ls.id = t.service_id
      LEFT JOIN carriers c           ON c.id  = t.carrier_id
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
      // === Auditoría de tickets ===
      async writeTicketEvent(ticketId, eventType, payload) {
        await db.insert(ticketEvents).values({
          ticketId,
          eventType,
          payload
        });
      }
      // === Operaciones logísticas de tickets ===
      async setTicketService(ticketId, params) {
        const { serviceId, carrierId } = params;
        const [serv] = await db.select().from(logisticServices).where(and(
          eq2(logisticServices.id, serviceId),
          // En la BD real es "active"; en TS mapeamos a .active
          eq2(logisticServices.active, true)
        ));
        if (!serv || serv.isActive === false) throw new Error("Servicio log\xEDstico inv\xE1lido o inactivo");
        const compatRequired = (process.env.LOGISTICS_COMPAT_REQUIRED ?? "true").toLowerCase() !== "false";
        if (compatRequired && carrierId != null) {
          const [compat] = await db.select().from(serviceCarriers).where(and(eq2(serviceCarriers.serviceId, serviceId), eq2(serviceCarriers.carrierId, carrierId)));
          if (!compat) throw new Error("La paqueter\xEDa no es compatible con el servicio seleccionado");
        }
        await db.update(tickets).set({ serviceId, carrierId: carrierId ?? null, updatedAt: /* @__PURE__ */ new Date() }).where(eq2(tickets.id, ticketId));
        await this.writeTicketEvent(ticketId, "SERVICE_SET", { serviceId, carrierId: carrierId ?? null });
      }
      /**
       * Actualiza servicio y paqueterA-a de varios tickets en una sola operaciA3n.
       * Valida servicio/carrier activos y compatibilidad (si existe la tabla puente).
       */
      async bulkUpdateTicketService(params) {
        const { ids, serviceId, carrierId } = params;
        if (!Array.isArray(ids) || ids.length === 0) {
          return { updated: 0, skipped: 0, ids: [] };
        }
        const [serv] = await db.select().from(logisticServices).where(and(eq2(logisticServices.id, serviceId), eq2(logisticServices.active, true)));
        if (!serv) throw new Error("Servicio logA-stico invA\uFFFDlido o inactivo");
        if (typeof carrierId !== "undefined" && carrierId !== null) {
          const [car] = await db.select().from(carriers).where(and(eq2(carriers.id, Number(carrierId)), eq2(carriers.isActive, true)));
          if (!car) throw new Error("PaqueterA-a invA\uFFFDlida o inactiva");
          const compatRequired = (process.env.LOGISTICS_COMPAT_REQUIRED ?? "true").toLowerCase() !== "false";
          const [compat] = compatRequired ? await db.select().from(serviceCarriers).where(and(eq2(serviceCarriers.serviceId, serviceId), eq2(serviceCarriers.carrierId, Number(carrierId)))) : [{ ok: true }];
          if (compatRequired && !compat) throw new Error("La paqueterA-a no es compatible con el servicio seleccionado.");
        }
        const updatedRows = await db.update(tickets).set({ serviceId, carrierId: typeof carrierId === "undefined" ? null : carrierId, updatedAt: /* @__PURE__ */ new Date() }).where(inArray(tickets.id, ids)).returning({ id: tickets.id });
        const updatedIds = (updatedRows || []).map((r) => Number(r.id));
        const updated = updatedIds.length;
        const skipped = Math.max(0, ids.length - updated);
        return { updated, skipped, ids: updatedIds };
      }
      async updateTicketShippingData(ticketId, data) {
        const payload = { updatedAt: /* @__PURE__ */ new Date() };
        if (typeof data.weightKg !== "undefined") payload.weightKg = data.weightKg;
        if (typeof data.lengthCm !== "undefined") payload.lengthCm = data.lengthCm;
        if (typeof data.widthCm !== "undefined") payload.widthCm = data.widthCm;
        if (typeof data.heightCm !== "undefined") payload.heightCm = data.heightCm;
        if (typeof data.packageCount !== "undefined") payload.packageCount = data.packageCount;
        if (typeof data.serviceLevel !== "undefined") payload.serviceLevel = data.serviceLevel;
        await db.update(tickets).set(payload).where(eq2(tickets.id, ticketId));
        await this.writeTicketEvent(ticketId, "SHIPPING_DATA_UPDATED", data);
      }
      async updateTicketStatus(ticketId, status) {
        await db.update(tickets).set({ status, updatedAt: /* @__PURE__ */ new Date() }).where(eq2(tickets.id, ticketId));
        await this.writeTicketEvent(ticketId, "STATUS_CHANGED", { status });
      }
      async updateTicketTracking(ticketId, data) {
        const update = { updatedAt: /* @__PURE__ */ new Date() };
        if (typeof data.trackingNumber !== "undefined") update.trackingNumber = data.trackingNumber ?? null;
        if (typeof data.labelUrl !== "undefined") update.labelUrl = data.labelUrl ?? null;
        if (typeof data.carrierId !== "undefined") update.carrierId = data.carrierId ?? null;
        await db.update(tickets).set(update).where(eq2(tickets.id, ticketId));
        const [t] = await db.select().from(tickets).where(eq2(tickets.id, ticketId));
        const prevStatus = t?.status || "";
        if ((data.trackingNumber || data.labelUrl) && /^(ABIERTO|open)$/i.test(prevStatus)) {
          await db.update(tickets).set({ status: "ETIQUETA_GENERADA", updatedAt: /* @__PURE__ */ new Date() }).where(eq2(tickets.id, ticketId));
          await this.writeTicketEvent(ticketId, "STATUS_CHANGED", { status: "ETIQUETA_GENERADA", reason: "tracking/label assigned" });
        }
        await this.writeTicketEvent(ticketId, "TRACKING_UPDATED", data);
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
          const [producto] = await db.select().from(articulos).where(eq2(articulos.sku_interno, sku)).limit(1);
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
        ORDER BY o.shopify_created_at DESC NULLS LAST, o.id DESC
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
          sortOrder = "desc",
          brand,
          stockState
        } = params;
        const conds = [];
        if (statusFilter === "unmanaged") {
          conds.push(sql`LOWER(COALESCE(o.fulfillment_status, '')) IN ('', 'unfulfilled')`);
        } else if (statusFilter === "managed") {
          conds.push(sql`LOWER(COALESCE(o.fulfillment_status, '')) = 'fulfilled'`);
        } else if (statusFilter === "cancelled" || statusFilter === "canceladas") {
          conds.push(sql`LOWER(COALESCE(o.fulfillment_status, '')) = 'restocked'`);
        }
        if (channelId !== void 0 && channelId !== null) {
          conds.push(sql`o.shop_id = ${channelId}`);
        }
        if (brand && brand.trim() !== "") {
          const b = brand.toLowerCase();
          conds.push(sql`(
        LOWER(COALESCE(p.vendor, '')) = ${b} OR
        LOWER(COALESCE(a.proveedor, '')) = ${b}
      )`);
        }
        if (stockState) {
          if (stockState === "out") {
            conds.push(sql`COALESCE(a.stock, -1) = 0`);
          } else if (stockState === "apartar") {
            conds.push(sql`COALESCE(a.stock, 0) BETWEEN 1 AND 15`);
          } else if (stockState === "ok") {
            conds.push(sql`COALESCE(a.stock, 0) > 15`);
          }
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
        const orderSql = sortField ? sql`ORDER BY ${sql.raw(sortCol)} ${sortDir}` : sql`ORDER BY o.shopify_created_at DESC NULLS LAST, o.id DESC`;
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
      COALESCE(
        JSON_AGG(
          JSON_BUILD_OBJECT(
          'sku', oi.sku,
          'quantity', oi.quantity,
          'price', oi.price,
          'vendorFromShop', p.vendor,
          'catalogBrand', a.proveedor,
          'stockFromCatalog', a.stock,
          'stockState', CASE 
            WHEN a.stock IS NULL THEN 'Desconocido'
            WHEN a.stock = 0 THEN 'Stock Out'
            WHEN a.stock <= 15 THEN 'Apartar'
            ELSE 'OK'
          END,
          'enAlmacen', a.en_almacen,   -- ← NUEVO
          'skuArticulo', a.sku,
          'skuInterno', a.sku_interno,
          'nombreProducto', a.nombre,
          'stockMarca', a.stock,
          'unitPrice', a.costo
          )
        ) FILTER (WHERE oi.id IS NOT NULL),
        '[]'::json
      ) as items,
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
    LEFT JOIN products p ON p.id_shopify = oi.shopify_product_id AND p.shop_id = o.shop_id
    LEFT JOIN articulos a ON a.sku_interno = oi.sku
    ${whereClause ? sql`WHERE ${whereClause}` : sql``}
    GROUP BY o.id, o.order_id, o.name, o.customer_name, o.total_amount, 
             o.fulfillment_status, o.shopify_created_at, o.created_at, o.shop_id
    ${orderSql}
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
            productName: articulos.nombre,
            skuInterno: articulos.sku_interno,
            skuExterno: orderItems.sku
          }).from(orderItems).leftJoin(
            articulos,
            eq2(articulos.sku, orderItems.sku)
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
        const rows = await db.select().from(articulos).orderBy(asc(articulos.nombre)).limit(pageSize).offset(offset);
        const totalRes = await db.select({ count: count() }).from(articulos);
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
        const toDecimal = (v) => v == null || v === "" ? null : typeof v === "number" ? v : Number(String(v).replace(/,/g, ""));
        const toDate = (v) => v ? new Date(String(v)) : null;
        const toArray = (v) => Array.isArray(v) ? v : typeof v === "string" ? v.split(",").map((s) => s.trim()).filter(Boolean) : null;
        const results = [];
        const groups = /* @__PURE__ */ new Map();
        const mark = (rowIndex, status, extra = {}) => {
          results.push({ rowIndex, status, ...extra });
        };
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const shopIdRaw = row["shopId"];
          const orderIdRaw = row["orderId"];
          if (shopIdRaw == null || orderIdRaw == null) {
            mark(i, "skipped", { message: "Faltan columnas obligatorias: shopId y/o orderId" });
            continue;
          }
          const shopId = Number(shopIdRaw);
          const orderId = String(orderIdRaw).trim();
          if (!Number.isInteger(shopId) || !orderId) {
            mark(i, "skipped", {
              message: "Valores inv\xE1lidos en shopId/orderId",
              field: !Number.isInteger(shopId) ? "shopId" : "orderId",
              value: !Number.isInteger(shopId) ? shopIdRaw : orderIdRaw
            });
            continue;
          }
          const key = `${shopId}::${orderId}`;
          if (!groups.has(key)) {
            groups.set(key, {
              shopId,
              orderId,
              rows: [],
              payload: {
                shopId,
                orderId
              },
              items: []
            });
          }
          const g = groups.get(key);
          g.rows.push(i);
          const mergeField = (k, v) => {
            if (v === void 0) return;
            const cur = g.payload[k];
            if (cur === void 0 || cur === null) g.payload[k] = v;
          };
          mergeField("name", row["name"] ?? null);
          mergeField("orderNumber", row["orderNumber"] ?? null);
          mergeField("customerName", row["customerName"] ?? null);
          mergeField("customerEmail", row["customerEmail"] ?? null);
          mergeField("subtotalPrice", toDecimal(row["subtotalPrice"]));
          mergeField("totalAmount", toDecimal(row["totalAmount"]));
          mergeField("currency", row["currency"] ?? null);
          mergeField("financialStatus", row["financialStatus"] ?? null);
          mergeField("fulfillmentStatus", row["fulfillmentStatus"] ?? null);
          mergeField("tags", toArray(row["tags"]));
          mergeField("createdAt", toDate(row["createdAt"]) ?? void 0);
          mergeField("shopifyCreatedAt", toDate(row["shopifyCreatedAt"]) ?? void 0);
          if (row.hasOwnProperty("items") && row["items"] != null && String(row["items"]).trim() !== "") {
            try {
              const arr = Array.isArray(row["items"]) ? row["items"] : JSON.parse(String(row["items"]));
              if (Array.isArray(arr)) {
                for (const it of arr) {
                  const sku = String(it?.sku ?? "").trim();
                  const qty = Number(it?.quantity ?? it?.qty ?? 0);
                  if (!sku || !Number.isFinite(qty) || qty <= 0) continue;
                  const price = toDecimal(it?.price);
                  const title = it?.title != null ? String(it.title) : null;
                  g.items.push({ sku, quantity: qty, price, title });
                }
              }
            } catch (e) {
              mark(i, "error", { message: "items JSON inv\xE1lido" });
            }
          }
          if (row.hasOwnProperty("sku") || row.hasOwnProperty("quantity")) {
            const sku = (row["sku"] != null ? String(row["sku"]) : "").trim();
            const qty = Number(row["quantity"] ?? 0);
            if (sku && Number.isFinite(qty) && qty > 0) {
              const price = toDecimal(row["price"]);
              const title = row["title"] != null ? String(row["title"]) : null;
              g.items.push({ sku, quantity: qty, price, title });
            }
          }
        }
        let ok = 0, skipped = results.filter((r) => r.status === "skipped").length, errors = results.filter((r) => r.status === "error").length;
        for (const [, g] of groups) {
          try {
            const existente = await this.getOrderByShopifyId(g.orderId, g.shopId);
            let orderPk;
            if (existente) {
              await this.updateOrder(Number(existente.id), g.payload);
              orderPk = Number(existente.id);
            } else {
              const created = await this.createOrder(g.payload);
              orderPk = Number(created.id);
            }
            const run = async () => {
              await db.delete(orderItems).where(eq2(orderItems.orderId, orderPk));
              if (g.items.length > 0) {
                const values = g.items.map((it) => ({
                  orderId: orderPk,
                  sku: it.sku,
                  quantity: it.quantity,
                  price: it.price,
                  title: it.title ?? null
                }));
                await db.insert(orderItems).values(values);
              }
            };
            const txAny = db;
            if (typeof txAny.transaction === "function") {
              await txAny.transaction(async () => {
                await run();
              });
            } else {
              await run();
            }
            ok += g.rows.length;
            for (const idx of g.rows) {
              if (!results.find((r) => r.rowIndex === idx)) {
                mark(idx, "ok", { orderId: g.orderId });
              }
            }
          } catch (e) {
            errors += g.rows.length;
            for (const idx of g.rows) {
              mark(idx, "error", { message: e?.message || "Error al guardar orden/\xEDtems", orderId: g.orderId });
            }
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
import { sql as sql3 } from "drizzle-orm";
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
          const productos = await db.execute(sql3`
        SELECT sku, proveedor, nombre, categoria, marca_producto,
               stock, costo, sku_interno, codigo_barras
        FROM articulos 
        WHERE nombre IS NOT NULL
        ORDER BY nombre
        LIMIT ${pageSize} OFFSET ${offset}
      `);
          const totalResult = await db.execute(sql3`
        SELECT COUNT(*) as total 
        FROM articulos 
        WHERE nombre IS NOT NULL
      `);
          const total = Number(totalResult.rows[0]?.total ?? 0);
          return {
            rows: productos.rows.map((p) => ({
              id: p.sku,
              // Usar SKU como ID único
              nombre: p.nombre,
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
          const result = await db.execute(sql3`
        SELECT DISTINCT categoria 
        FROM articulos 
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
          await db.execute(sql3`
        INSERT INTO articulos (
          sku, nombre, categoria, marca_producto, stock, costo
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
          await db.execute(sql3`
        UPDATE articulos 
        SET 
          nombre = ${datos.nombre || null},
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
          await db.execute(sql3`
        DELETE FROM articulos WHERE sku = ${id}
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
import { sql as sql4 } from "drizzle-orm";
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
          stockEq0,
          stockGte,
          orderBy = "nombre_producto",
          orderDir = "asc"
        } = params;
        if (page < 1 || pageSize < 1 || pageSize > 1e3) {
          throw new Error("Par\xE1metros de paginaci\xF3n inv\xE1lidos");
        }
        const offset = (page - 1) * pageSize;
        const validCols = ["sku", "sku_interno", "codigo_barras", "nombre_producto", "categoria", "marca", "marca_producto"];
        const mapCol = (ui) => ({
          sku: "sku",
          sku_interno: "sku_interno",
          codigo_barras: "codigo_barras",
          nombre_producto: "nombre",
          categoria: "categoria",
          marca: "proveedor",
          marca_producto: "marca_producto"
        })[ui] || ui;
        const orderCol = validCols.includes(orderBy) ? mapCol(orderBy) : "nombre";
        const orderDirection = orderDir === "desc" ? sql4.raw("DESC") : sql4.raw("ASC");
        const whereParts = [sql4`1=1`];
        if (search) {
          if (searchField && validCols.includes(searchField)) {
            const realCol = mapCol(searchField);
            whereParts.push(sql4`LOWER(COALESCE(${sql4.raw(realCol)}, '')) LIKE LOWER(${`%${search.toLowerCase()}%`})`);
          } else {
            const s = `%${search.toLowerCase()}%`;
            whereParts.push(sql4`(
          LOWER(COALESCE(sku,'')) LIKE LOWER(${s})
          OR LOWER(COALESCE(sku_interno,'')) LIKE LOWER(${s})
          OR LOWER(COALESCE(codigo_barras,'')) LIKE LOWER(${s})
          OR LOWER(COALESCE(nombre,'')) LIKE LOWER(${s})
        )`);
          }
        }
        if (marca) whereParts.push(sql4`proveedor = ${marca}`);
        if (categoria) whereParts.push(sql4`categoria = ${categoria}`);
        if (condicion) whereParts.push(sql4`condicion_producto = ${condicion}`);
        if (marca_producto) whereParts.push(sql4`marca_producto = ${marca_producto}`);
        if (stockEq0) whereParts.push(sql4`COALESCE(stock, 0) = 0`);
        if (typeof stockGte === "number" && !Number.isNaN(stockGte)) whereParts.push(sql4`COALESCE(stock, 0) >= ${stockGte}`);
        const whereSQL = sql4.join(whereParts, sql4` AND `);
        const productos = await db.execute(sql4`
      SELECT
        sku,
        proveedor,
        sku_interno,
        codigo_barras,
        nombre,
        modelo,
        categoria,
        condicion_producto,
        marca_producto,
        tipo_variante,
        variante,
        largo_cm,
        ancho_cm,
        alto_cm,
        peso_kg,
        imagen1,
        costo,
        stock,
        status
      FROM ${sql4.raw("articulos")}
      WHERE ${whereSQL}
      ORDER BY ${sql4.raw(orderCol)} ${orderDirection}
      LIMIT ${pageSize} OFFSET ${offset}
    `);
        const totalRes = await db.execute(sql4`
      SELECT COUNT(*)::int AS total
      FROM ${sql4.raw("articulos")}
      WHERE ${whereSQL}
    `);
        const total = Number(totalRes.rows[0]?.total ?? 0);
        return {
          rows: productos.rows.map((p) => ({
            sku: p.sku,
            marca: p.proveedor,
            sku_interno: p.sku_interno,
            codigo_barras: p.codigo_barras,
            nombre_producto: p.nombre,
            modelo: p.modelo,
            categoria: p.categoria,
            condicion: p.condicion_producto,
            marca_producto: p.marca_producto,
            variante: p.variante,
            largo: p.largo_cm ? Number(p.largo_cm) : null,
            ancho: p.ancho_cm ? Number(p.ancho_cm) : null,
            alto: p.alto_cm ? Number(p.alto_cm) : null,
            peso: p.peso_kg ? Number(p.peso_kg) : null,
            foto: p.imagen1,
            costo: p.costo ? Number(p.costo) : null,
            stock: p.stock ? Number(p.stock) : 0,
            status: p.status ?? null
          })),
          total,
          page,
          pageSize
        };
      }
      async createCatalogProduct(product) {
        const cols = Object.keys(product);
        if (cols.length === 0) throw new Error("Datos insuficientes");
        const colNodes = cols.map((c) => sql4.raw(c));
        const valNodes = cols.map((c) => sql4`${product[c]}`);
        const result = await db.execute(sql4`
      INSERT INTO ${sql4.raw("articulos")}
        (${sql4.join(colNodes, sql4`, `)})
      VALUES
        (${sql4.join(valNodes, sql4`, `)})
      RETURNING *
    `);
        return result.rows[0];
      }
      async deleteCatalogProduct(sku) {
        await db.execute(sql4`DELETE FROM articulos WHERE sku = ${sku}`);
        return { success: true };
      }
      /** Actualiza un producto del catálogo */
      async updateCatalogProduct(sku, updates) {
        try {
          const fields = Object.keys(updates);
          if (fields.length === 0) return { success: true };
          const setNodes = fields.map((f) => sql4`${sql4.raw(f)} = ${updates[f]}`);
          await db.execute(sql4`
        UPDATE ${sql4.raw("articulos")}
        SET ${sql4.join(setNodes, sql4`, `)}
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
            db.execute(sql4`SELECT DISTINCT proveedor AS marca FROM articulos WHERE proveedor IS NOT NULL ORDER BY proveedor`),
            db.execute(sql4`SELECT DISTINCT categoria FROM articulos WHERE categoria IS NOT NULL ORDER BY categoria`),
            db.execute(sql4`SELECT DISTINCT condicion_producto AS condicion FROM articulos WHERE condicion_producto IS NOT NULL ORDER BY condicion_producto`),
            db.execute(sql4`SELECT DISTINCT marca_producto FROM articulos WHERE marca_producto IS NOT NULL ORDER BY marca_producto`)
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
        const whereParts = [sql4`1=1`];
        if (search) {
          const s = `%${search}%`;
          whereParts.push(sql4`(
      LOWER(COALESCE(p.title,'')) LIKE LOWER(${s})
      OR LOWER(COALESCE(v.sku,'')) LIKE LOWER(${s})
      OR LOWER(COALESCE(v.barcode,'')) LIKE LOWER(${s})
    )`);
        }
        if (shopId) whereParts.push(sql4`p.shop_id = ${shopId}`);
        if (status) whereParts.push(sql4`p.status = ${status}`);
        if (vendor) whereParts.push(sql4`p.vendor = ${vendor}`);
        if (productType) whereParts.push(sql4`p.product_type = ${productType}`);
        const whereSQL = sql4.join(whereParts, sql4` AND `);
        const productos = await db.execute(sql4`
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
        const totalRes = await db.execute(sql4`
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
            db.execute(sql4`
          SELECT COUNT(*) as count 
          FROM product_links 
          WHERE match_status = 'matched'
        `),
            db.execute(sql4`
          SELECT COUNT(*) as count 
          FROM catalogo_productos cp
          LEFT JOIN product_links pl ON cp.sku = pl.catalogo_sku
          WHERE pl.id IS NULL
        `),
            db.execute(sql4`
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
            const result = await db.execute(sql4`
          SELECT cp.sku, cp.nombre_producto, cp.marca_producto, cp.categoria
          FROM catalogo_productos cp
          LEFT JOIN product_links pl ON cp.sku = pl.catalogo_sku
          WHERE pl.id IS NULL
          ORDER BY cp.nombre_producto
          LIMIT ${pageSize} OFFSET ${offset}
        `);
            const totalResult = await db.execute(sql4`
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
            const result = await db.execute(sql4`
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
            const totalResult = await db.execute(sql4`
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
          const result = await db.execute(sql4`
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
async function cancelShopifyOrderAndWait(args) {
  const { shop, token, apiVersion } = getShopifyCredentials(String(args.shopId));
  const r = await fetch(`https://${shop}/admin/api/${apiVersion}/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
    body: JSON.stringify({
      query: ORDER_CANCEL_MUTATION,
      variables: {
        orderId: args.orderGid,
        reason: args.reason || "OTHER",
        staffNote: args.staffNote || null,
        notifyCustomer: args.notifyCustomer === void 0 ? true : !!args.notifyCustomer,
        restock: args.restock === void 0 ? true : !!args.restock,
        refundMethod: args.refundToOriginal ? { originalPaymentMethodsRefund: true } : null
      }
    })
  });
  const data = await r.json();
  const userErrors = data?.data?.orderCancel?.userErrors || data?.errors;
  if (!r.ok || userErrors && userErrors.length) {
    return { ok: false, stage: "request", errors: userErrors || [{ message: "Shopify cancel failed" }] };
  }
  const jobId = data?.data?.orderCancel?.job?.id;
  if (!jobId) {
    return { ok: false, stage: "no-job", errors: [{ message: "Shopify did not return a job id" }] };
  }
  const started = Date.now();
  const deadlineMs = 2e4;
  let delay = 500;
  while (Date.now() - started < deadlineMs) {
    const jr = await fetch(`https://${shop}/admin/api/${apiVersion}/graphql.json`, {
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
  const or3 = await fetch(`https://${shop}/admin/api/${apiVersion}/graphql.json`, {
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
mutation orderCancel(
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
  ){
    job { id }
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
  if (orderRowId != null) {
    const title = v.titulo || v.producto || "Art\xEDculo MLG";
    const sku = v.modelo ? String(v.modelo) : toStr(v.idProductoProveedor) ?? null;
    const quantity = Number(v.cantidad || 1);
    const price = toStr(v.precioArticulo) ?? null;
    const existing = await db.select({ id: orderItems.id }).from(orderItems).where(and3(eq5(orderItems.orderId, Number(orderRowId)), eq5(orderItems.title, title))).limit(1);
    if (existing.length === 0) {
      await db.insert(orderItems).values({
        orderId: Number(orderRowId),
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

// server/config/validateEnv.ts
function validateEnv() {
  const detectedStores = /* @__PURE__ */ new Set();
  for (const k of Object.keys(process.env)) {
    const m = k.match(/^SHOPIFY_SHOP_NAME_(\d+)$/);
    if (m) detectedStores.add(parseInt(m[1], 10));
  }
  if (detectedStores.size === 0) {
    [1, 2].forEach((n) => {
      if (process.env[`SHOPIFY_SHOP_NAME_${n}`]) detectedStores.add(n);
    });
  }
  const stores = [];
  const missing = [];
  for (const n of Array.from(detectedStores).sort((a, b) => a - b)) {
    const shop = process.env[`SHOPIFY_SHOP_NAME_${n}`];
    const token = process.env[`SHOPIFY_ACCESS_TOKEN_${n}`];
    const apiVersion = process.env[`SHOPIFY_API_VERSION_${n}`] || process.env.SHOPIFY_API_VERSION || "2025-04";
    if (!shop) missing.push(`SHOPIFY_SHOP_NAME_${n}`);
    if (!token) missing.push(`SHOPIFY_ACCESS_TOKEN_${n}`);
    if (shop && token) {
      stores.push({
        store: n,
        shop,
        tokenMasked: String(token).slice(0, 6) + "***",
        apiVersion
      });
    }
  }
  const detectedList = stores.map((s) => s.store);
  console.log(`[ENV] tiendas detectadas: [${detectedList.join(",")}]; faltantes: [${missing.join(", ")}]`);
  if (missing.length > 0) {
    throw new Error(`Variables de entorno faltantes: ${missing.join(", ")}`);
  }
  return { stores, missing };
}

// server/syncState.ts
var lastResult = null;
function setLastSyncResult(result) {
  lastResult = result;
}

// server/syncShopifyOrders.ts
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
var sleep = (ms) => new Promise((res) => setTimeout(res, ms));
function buildShopifyHeaders(token, extra) {
  const base = {
    "X-Shopify-Access-Token": token,
    "Accept": "application/json",
    "User-Agent": "LogisticManager/1.0 (+node)"
  };
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      if (v != null) base[k] = String(v);
    }
  }
  return base;
}
async function fetchShopifyWithRetry(storeNumber, path3, opts = {}) {
  const { shop, token, apiVersion } = getShopifyCredentials(String(storeNumber));
  const base = `https://${shop}/admin/api/${apiVersion}`;
  const maxRetries = opts.maxRetries ?? 3;
  const method = opts.method ?? "GET";
  let attempt = 0;
  let lastError;
  while (attempt <= maxRetries) {
    try {
      const url = `${base}${path3}`;
      const headers = buildShopifyHeaders(
        token,
        {
          // Sólo enviamos Content-Type cuando hay body
          "Content-Type": opts.body ? "application/json" : void 0,
          ...opts.headers || {}
        }
      );
      const r = await fetch(url, {
        method,
        body: opts.body ? typeof opts.body === "string" ? opts.body : JSON.stringify(opts.body) : void 0,
        headers
      });
      console.log(`[SHOPIFY][try=${attempt}] store=${storeNumber} path=${path3} status=${r.status}`);
      if (r.status === 429) {
        const ra = r.headers.get("retry-after");
        const waitMs = ra ? Math.max(0, Math.round(parseFloat(ra) * 1e3)) : 1e3 + attempt * 1e3;
        console.warn(`[SHOPIFY][429] store=${storeNumber} path=${path3} Retry-After=${ra ?? "?"} waitMs=${waitMs}`);
        await sleep(waitMs);
        attempt++;
        continue;
      }
      if (r.status >= 500) {
        const backoffMs = [800, 1600, 3500][Math.min(attempt, 2)];
        console.warn(`[SHOPIFY][5xx] store=${storeNumber} path=${path3} status=${r.status} backoffMs=${backoffMs}`);
        await sleep(backoffMs);
        attempt++;
        continue;
      }
      return r;
    } catch (err) {
      lastError = err;
      const backoffMs = [800, 1600, 3500][Math.min(attempt, 2)];
      console.warn(`[SHOPIFY][fetch-error][try=${attempt}] store=${storeNumber} path=${path3} err=${err?.message || err}. backoff=${backoffMs}ms`);
      await sleep(backoffMs);
      attempt++;
    }
  }
  throw new Error(`fetchShopifyWithRetry agot\xF3 reintentos: store=${storeNumber} path=${path3} lastErr=${lastError?.message || lastError}`);
}
async function shopifyRestGetRaw(storeNumber, path3) {
  const r = await fetchShopifyWithRetry(storeNumber, path3);
  const text2 = await r.text();
  const { shop } = getShopifyCredentials(String(storeNumber));
  if (r.status === 406) {
    console.error(`[SHOPIFY][406] store=${storeNumber} path=${path3}`);
    try {
      console.error(`[SHOPIFY][406][body-300] ${String(text2).slice(0, 300)}`);
    } catch {
    }
  }
  return { ok: r.ok, status: r.status, statusText: r.statusText, headers: r.headers, text: text2, shop };
}
async function shopifyRestGet(storeNumber, path3) {
  const r = await fetchShopifyWithRetry(storeNumber, path3);
  const text2 = await r.text();
  if (!r.ok) {
    throw new Error(`Shopify ${storeNumber} ${r.status} ${r.statusText} :: ${text2.slice(0, 500)}`);
  }
  return JSON.parse(text2);
}
async function upsertOneOrderTx(tx, storeNumber, o) {
  const toStrOrNull = (v) => v == null ? null : String(v);
  const toDateOrNull = (v) => v ? new Date(v) : null;
  const orderIdStr = String(o.id);
  const first = o.customer?.first_name ?? null;
  const last = o.customer?.last_name ?? null;
  const customerName = first || last ? `${first ?? ""} ${last ?? ""}`.trim() : o.email ?? o.name ?? null;
  const tagsArr = typeof o.tags === "string" ? o.tags.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const sa = o.shipping_address ?? null;
  const shipName = sa?.name ?? null;
  const shipPhone = sa?.phone ?? null;
  const shipAddress1 = sa?.address1 ?? null;
  const shipCity = sa?.city ?? null;
  const shipProvince = sa?.province ?? null;
  const shipCountry = sa?.country ?? null;
  const shipZip = sa?.zip ?? null;
  const insertData = {
    // claves
    shopId: Number(storeNumber),
    orderId: orderIdStr,
    // básicos
    name: o.name ?? null,
    orderNumber: toStrOrNull(o.order_number),
    customerName,
    customerEmail: o.email ?? o.customer?.email ?? null,
    // montos/moneda/estatus
    subtotalPrice: toStrOrNull(o.subtotal_price),
    totalAmount: toStrOrNull(o.total_price),
    currency: o.currency ?? null,
    financialStatus: o.financial_status ?? null,
    fulfillmentStatus: o.fulfillment_status ?? null,
    // tags y notas (si en tu schema NO existe noteAttributes, no lo envíes)
    tags: tagsArr.length ? tagsArr : null,
    // shipping (NUEVO)
    shipName,
    shipPhone,
    shipAddress1,
    shipCity,
    shipProvince,
    shipCountry,
    shipZip,
    // fechas
    createdAt: toDateOrNull(o.created_at),
    shopifyCreatedAt: toDateOrNull(o.created_at),
    shopifyUpdatedAt: toDateOrNull(o.updated_at),
    shopifyProcessedAt: toDateOrNull(o.processed_at),
    shopifyClosedAt: toDateOrNull(o.closed_at),
    shopifyCancelledAt: toDateOrNull(o.cancelled_at)
  };
  const { createdAt, ...rest } = insertData;
  const updateData = { ...rest, updatedAt: /* @__PURE__ */ new Date() };
  const upsertedOrder = await tx.insert(orders).values(insertData).onConflictDoUpdate({
    target: [orders.shopId, orders.orderId],
    set: updateData
  }).returning({ id: orders.id });
  const orderPk = upsertedOrder[0]?.id;
  if (!orderPk) throw new Error("No se obtuvo ID de la orden tras UPSERT.");
  await tx.delete(orderItems).where(eq(orderItems.orderId, orderPk));
  const items = Array.isArray(o.line_items) ? o.line_items : [];
  if (items.length > 0) {
    const values = items.map((li) => ({
      orderId: orderPk,
      sku: li.sku ?? null,
      quantity: Number(li.quantity ?? 0),
      // price puede llegar numérico o string; guardamos como string
      price: toStrOrNull(li.price),
      shopifyProductId: li.product_id != null ? String(li.product_id) : null,
      shopifyVariantId: li.variant_id != null ? String(li.variant_id) : null,
      title: li.title ?? null,
      variantTitle: li.variant_title ?? null
    }));
    if (values.length) {
      await tx.insert(orderItems).values(values);
    }
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
    `/orders/count.json`
  );
  if (!ok) throw new Error(`Shopify count ${status} ${statusText} :: ${text2.slice(0, 200)}`);
  const body = JSON.parse(text2);
  return { ok: true, store: storeNumber, shop, count: body.count ?? 0 };
}
async function syncShopifyOrdersBackfill(opts) {
  const storeNumber = parseInt(String(opts.store), 10);
  const limit = Math.min(opts.limit ?? 100, 250);
  const params = [];
  if (opts.pageInfo) {
    params.push(`limit=${limit}`);
    params.push(`page_info=${encodeURIComponent(String(opts.pageInfo))}`);
  } else {
    if (opts.updatedSince) params.push(`updated_at_min=${encodeURIComponent(opts.updatedSince)}`);
    params.push(`limit=${limit}`);
  }
  const path3 = `/orders.json?${params.join("&")}`;
  const { ok, status, statusText, text: text2, headers } = await shopifyRestGetRaw(storeNumber, path3);
  if (!ok) throw new Error(`Shopify backfill ${status} ${statusText} :: ${text2.slice(0, 300)}`);
  const body = JSON.parse(text2);
  let upserted = 0, inserted = 0;
  const errors = [];
  for (const o of body.orders ?? []) {
    try {
      await db.transaction(async (tx) => {
        await upsertOneOrderTx(tx, storeNumber, o);
      });
      upserted++;
      console.log(`[UPSERT] store=${storeNumber} order=${String(o.id)} upserted items=${(o.line_items ?? []).length}`);
    } catch (e) {
      const reason = e?.message || String(e);
      console.error(`[UPSERT-ERR] store=${storeNumber} order=${String(o.id)} reason=${reason}`);
      errors.push({ store: storeNumber, orderId: String(o.id), reason });
    }
  }
  const link = headers.get("link");
  const parsed = parseLinkHeader(link);
  const nextPageInfo = extractPageInfoFromUrl(parsed["next"]);
  const hasNextPage = !!nextPageInfo;
  const { shop } = getShopifyCredentials(String(storeNumber));
  return {
    ok: true,
    summary: [{ store: storeNumber, shop, inserted, upserted, errors: errors.length }],
    hasNextPage,
    nextPageInfo
  };
}
async function syncShopifyOrdersIncremental(opts) {
  const storeNumber = parseInt(String(opts.store), 10);
  const limit = Math.min(opts.limit ?? 100, 250);
  const params = [];
  if (opts.pageInfo) {
    params.push(`limit=${limit}`);
    params.push(`page_info=${encodeURIComponent(String(opts.pageInfo))}`);
  } else {
    params.push(`updated_at_min=${encodeURIComponent(opts.updatedSince)}`);
    params.push(`limit=${limit}`);
  }
  const path3 = `/orders.json?${params.join("&")}`;
  const { ok, status, statusText, text: text2, headers } = await shopifyRestGetRaw(storeNumber, path3);
  if (!ok) throw new Error(`Shopify incremental ${status} ${statusText} :: ${text2.slice(0, 300)}`);
  const body = JSON.parse(text2);
  let upserted = 0, inserted = 0;
  const errors = [];
  for (const o of body.orders ?? []) {
    try {
      await db.transaction(async (tx) => {
        await upsertOneOrderTx(tx, storeNumber, o);
      });
      upserted++;
      console.log(`[UPSERT] store=${storeNumber} order=${String(o.id)} upserted items=${(o.line_items ?? []).length}`);
    } catch (e) {
      const reason = e?.message || String(e);
      console.error(`[UPSERT-ERR] store=${storeNumber} order=${String(o.id)} reason=${reason}`);
      errors.push({ store: storeNumber, orderId: String(o.id), reason });
    }
  }
  const link = headers.get("link");
  const parsed = parseLinkHeader(link);
  const nextPageInfo = extractPageInfoFromUrl(parsed["next"]);
  const hasNextPage = !!nextPageInfo;
  const { shop } = getShopifyCredentials(String(storeNumber));
  return {
    ok: true,
    summary: [{ store: storeNumber, shop, inserted, upserted, errors: errors.length }],
    hasNextPage,
    nextPageInfo
  };
}
async function syncShopifyOrders(opts = {}) {
  validateEnv();
  const perPage = Math.min(opts.limit ?? 100, 250);
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
        `/orders.json?limit=${perPage}`
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
  const totalUpserted = summary.reduce((acc, s) => acc + s.upserted, 0);
  setLastSyncResult({ source: "manual", summary, totalUpserted, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  return { ok: true, summary, totalUpserted };
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
      const totalUpserted = res.summary?.reduce((acc, s) => acc + (s.upserted ?? 0), 0) ?? 0;
      setLastSyncResult({ source: "auto", summary: res.summary, totalUpserted, timestamp: nowISO() });
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
  try {
    validateEnv();
  } catch (e) {
    console.warn(`[CRON] Entorno inv\xE1lido para Shopify: ${e?.message || e}`);
  }
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
import { createServer } from "http";
import bcrypt from "bcrypt";
import session from "express-session";
import MemoryStore from "memorystore";
import { z as z5 } from "zod";

// server/integrations/mercadoLibre.ts
async function searchMercadoLibre(query, limit = 20) {
  const site = process.env.ML_SITE_ID || "MLM";
  const url = `https://api.mercadolibre.com/sites/${site}/search?q=${encodeURIComponent(query)}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`MercadoLibre search failed: ${res.status}`);
  }
  const json = await res.json();
  const items = (json?.results ?? []).map((r) => ({
    marketplace: "mercado_libre",
    id: String(r.id),
    title: String(r.title ?? ""),
    price: Number(r.price ?? 0),
    currency: String(r.currency_id ?? "MXN"),
    permalink: String(r.permalink ?? ""),
    thumbnail: r?.thumbnail ? String(r.thumbnail) : r?.thumbnail_id ? String(r.thumbnail_id) : void 0,
    seller: r?.seller?.nickname ?? void 0,
    available_quantity: typeof r?.available_quantity === "number" ? r.available_quantity : void 0
  }));
  return items;
}

// server/integrations/amazon.ts
async function searchAmazon(query, limit = 10) {
  const access = process.env.AMAZON_PA_ACCESS_KEY;
  const secret = process.env.AMAZON_PA_SECRET_KEY;
  const partnerTag = process.env.AMAZON_PA_PARTNER_TAG;
  const region = process.env.AMAZON_PA_REGION || "us-east-1";
  if (!access || !secret || !partnerTag) {
    return [];
  }
  return [];
}

// server/db/catalogs.ts
init_db();
import { sql as sql2 } from "drizzle-orm";
async function upsertLogisticServices() {
  await db.execute(sql2`
    -- Nota: en la BD real la columna es "active" (no is_active)
    INSERT INTO public.logistic_services (code, name, active, updated_at)
    VALUES
      ('EXPRESS_PL', 'Express PL', TRUE, NOW()),
      ('WISHIP',     'Wiship',     TRUE, NOW())
    ON CONFLICT (code) DO UPDATE SET
      name = EXCLUDED.name,
      active = EXCLUDED.active,
      updated_at = NOW();
  `);
}
async function upsertCarriers() {
  await db.execute(sql2`
    INSERT INTO public.carriers (code, name, api_endpoint, is_active, updated_at)
    VALUES
      ('EXPRESS_PL', 'Express PL', NULL, TRUE, NOW()),
      ('FEDEX',      'FedEx',      NULL, TRUE, NOW()),
      ('ESTAFETA',   'Estafeta',   NULL, TRUE, NOW()),
      ('DHL',        'DHL',        NULL, TRUE, NOW()),
      ('UPS',        'UPS',        NULL, TRUE, NOW())
    ON CONFLICT (code) DO UPDATE SET
      name = EXCLUDED.name,
      api_endpoint = EXCLUDED.api_endpoint,
      is_active = EXCLUDED.is_active,
      updated_at = NOW();
  `);
}
async function linkServiceCarriers() {
  await db.execute(sql2`
    DELETE FROM public.service_carriers sc
    USING public.logistic_services s, public.carriers c
    WHERE sc.service_id = s.id AND sc.carrier_id = c.id
      AND s.code = 'EXPRESS_PL'
      AND c.code IN ('DHL','FEDEX');
  `);
  await db.execute(sql2`
    INSERT INTO public.service_carriers (service_id, carrier_id)
    SELECT s.id, c.id
    FROM public.logistic_services s
    JOIN public.carriers c ON c.code IN ('EXPRESS_PL')
    WHERE s.code = 'EXPRESS_PL'
    ON CONFLICT DO NOTHING;
  `);
  await db.execute(sql2`
    INSERT INTO public.service_carriers (service_id, carrier_id)
    SELECT s.id, c.id
    FROM public.logistic_services s
    JOIN public.carriers c ON c.code IN ('FEDEX','ESTAFETA','DHL','UPS')
    WHERE s.code = 'WISHIP'
    ON CONFLICT DO NOTHING;
  `);
}
async function seedLogistics() {
  console.info("[Seed] Sembrando cat\xE1logos log\xEDsticos (forzado)...");
  await upsertLogisticServices();
  await upsertCarriers();
  await linkServiceCarriers();
  const { rows: r1 } = await db.execute(sql2`SELECT COUNT(*)::int AS n FROM public.logistic_services`);
  const { rows: r2 } = await db.execute(sql2`SELECT COUNT(*)::int AS n FROM public.carriers`);
  const { rows: r3 } = await db.execute(sql2`SELECT COUNT(*)::int AS n FROM public.service_carriers`);
  const services = Number(r1[0]?.n ?? 0);
  const carriers2 = Number(r2[0]?.n ?? 0);
  const mappings = Number(r3[0]?.n ?? 0);
  console.info(`[Seed] Totales -> servicios=${services}, paqueter\xEDas=${carriers2}, v\xEDnculos=${mappings}`);
  return { services, carriers: carriers2, mappings };
}
async function seedLogisticsIfEmpty() {
  try {
    const { rows: a } = await db.execute(sql2`SELECT COUNT(*)::int AS n FROM public.logistic_services`);
    const { rows: b } = await db.execute(sql2`SELECT COUNT(*)::int AS n FROM public.carriers`);
    const countServices = Number(a[0]?.n ?? 0);
    const countCarriers = Number(b[0]?.n ?? 0);
    if (countServices === 0 || countCarriers === 0) {
      console.warn("[Seed] Cat\xE1logos log\xEDsticos vac\xEDos; ejecutando seeding inicial...");
      await upsertLogisticServices();
      await upsertCarriers();
      await linkServiceCarriers();
      const { rows: r1 } = await db.execute(sql2`SELECT COUNT(*)::int AS n FROM public.logistic_services`);
      const { rows: r2 } = await db.execute(sql2`SELECT COUNT(*)::int AS n FROM public.carriers`);
      const { rows: r32 } = await db.execute(sql2`SELECT COUNT(*)::int AS n FROM public.service_carriers`);
      const services = Number(r1[0]?.n ?? 0);
      const carriers2 = Number(r2[0]?.n ?? 0);
      const mappings2 = Number(r32[0]?.n ?? 0);
      console.info("[Seed] Seeding completado correctamente.");
      return { seeded: true, services, carriers: carriers2, mappings: mappings2 };
    }
    const { rows: r3 } = await db.execute(sql2`SELECT COUNT(*)::int AS n FROM public.service_carriers`);
    const mappings = Number(r3[0]?.n ?? 0);
    console.info("[Seed] Cat\xE1logos ya poblados; se omite seeding.");
    return { seeded: false, services: countServices, carriers: countCarriers, mappings };
  } catch (e) {
    console.error("[Seed] Error durante verificaci\xF3n/siembra:", e?.message || e);
    throw e;
  }
}

// server/routes.ts
init_schema();
import { sql as sql5 } from "drizzle-orm";
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
      const brand = req.query.brand || void 0;
      const stockState = req.query.stock_state;
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
        sortOrder,
        brand,
        stockState
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
  app.get("/api/articulos", requiereAutenticacion, async (req, res) => {
    try {
      const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 1e3);
      const offset = Math.max(Number(req.query.offset) || 0, 0);
      const sku = req.query.sku || "";
      const sku_interno = req.query.sku_interno || "";
      const producto = req.query.producto || "";
      const proveedor = req.query.proveedor || "";
      const categoria = req.query.categoria || "";
      const soloSinStock = req.query.solo_sin_stock === "true" || req.query.solo_sin_stock === "1";
      const enAlmacenQ = req.query.en_almacen || "";
      const statusQ = req.query.status || "";
      const orderByParam = req.query.order_by || "nombre";
      const orderDir = (req.query.order_dir || "asc").toLowerCase() === "desc" ? "DESC" : "ASC";
      const allowedOrderBy = /* @__PURE__ */ new Set(["nombre", "sku", "created_at", "updated_at", "stock"]);
      const orderBy = allowedOrderBy.has(orderByParam) ? orderByParam : "nombre";
      const where = [sql5`1=1`];
      if (sku) where.push(sql5`LOWER(COALESCE(sku,'')) LIKE LOWER(${`%${sku}%`})`);
      if (sku_interno) where.push(sql5`LOWER(COALESCE(sku_interno,'')) LIKE LOWER(${`%${sku_interno}%`})`);
      if (producto) where.push(sql5`LOWER(COALESCE(nombre,'')) LIKE LOWER(${`%${producto}%`})`);
      if (proveedor) where.push(sql5`proveedor = ${proveedor}`);
      if (categoria) where.push(sql5`categoria = ${categoria}`);
      if (soloSinStock) where.push(sql5`COALESCE(stock,0) = 0`);
      if (["1", "true"].includes(enAlmacenQ)) where.push(sql5`en_almacen = true`);
      else if (["0", "false"].includes(enAlmacenQ)) where.push(sql5`en_almacen = false`);
      if (statusQ) where.push(sql5`status = ${statusQ}`);
      const whereSQL = sql5.join(where, sql5` AND `);
      const rowsRes = await db.execute(sql5`
      SELECT
        sku, nombre, sku_interno, proveedor, stock, status,
        en_almacen,               -- NUEVO
        created_at, updated_at    -- NUEVO
      FROM ${sql5.raw("articulos")}
      WHERE ${whereSQL}
      ORDER BY ${sql5.raw(orderBy)} ${sql5.raw(orderDir)}, sku ASC
      LIMIT ${limit} OFFSET ${offset}
    `);
      const totalRes = await db.execute(sql5`
      SELECT COUNT(*)::int AS total
      FROM ${sql5.raw("articulos")}
      WHERE ${whereSQL}
    `);
      const total = Number(totalRes.rows?.[0]?.total ?? 0);
      res.json({ data: rowsRes.rows, limit, offset, total });
    } catch (e) {
      console.error("GET /api/articulos error:", e);
      res.status(500).json({ message: "No se pudieron obtener art\xEDculos" });
    }
  });
  app.get("/api/marcas", requiereAutenticacion, async (_req, res) => {
    try {
      const r = await db.execute(sql5`SELECT codigo, nombre FROM marcas ORDER BY nombre`);
      res.json(r.rows || []);
    } catch (e) {
      res.status(500).json({ message: "No se pudieron obtener marcas" });
    }
  });
  app.get("/api/articulos/categorias", requiereAutenticacion, async (_req, res) => {
    try {
      const r = await db.execute(sql5`
        SELECT DISTINCT categoria FROM articulos WHERE categoria IS NOT NULL ORDER BY 1`);
      res.json((r.rows || []).map((x) => x.categoria).filter(Boolean));
    } catch (e) {
      res.status(500).json({ message: "No se pudieron obtener categor\xEDas" });
    }
  });
  app.get("/api/articulos/:sku", requiereAutenticacion, async (req, res) => {
    try {
      const sku = req.params.sku;
      const r = await db.execute(sql5`SELECT * FROM articulos WHERE sku = ${sku} LIMIT 1`);
      const row = r.rows?.[0];
      if (!row) return res.status(404).json({ message: "Art\xEDculo no encontrado" });
      res.json(row);
    } catch (e) {
      res.status(500).json({ message: "No se pudo cargar el art\xEDculo" });
    }
  });
  app.put("/api/articulos/:sku", requiereAutenticacion, async (req, res) => {
    try {
      const sku = req.params.sku;
      const payload = req.body || {};
      if (payload.status && !["activo", "inactivo"].includes(String(payload.status))) {
        return res.status(400).json({ message: "status debe ser 'activo' o 'inactivo'" });
      }
      const allowed = /* @__PURE__ */ new Set([
        "sku_interno",
        "nombre",
        "descripcion",
        "proveedor",
        "status",
        "categoria",
        "marca_producto",
        "codigo_barras",
        "garantia_meses",
        "tipo_variante",
        "variante",
        "stock",
        "costo",
        "alto_cm",
        "largo_cm",
        "ancho_cm",
        "peso_kg",
        "peso_volumetrico",
        "clave_producto_sat",
        "unidad_medida_sat",
        "clave_unidad_medida_sat"
      ]);
      const updates = {};
      for (const [k, v] of Object.entries(payload)) {
        if (allowed.has(k)) updates[k] = v;
      }
      if (Object.keys(updates).length === 0) return res.json({ ok: true });
      const setNodes = Object.keys(updates).map((k) => sql5`${sql5.raw(k)} = ${updates[k]}`);
      await db.execute(sql5`
        UPDATE ${sql5.raw("articulos")}
        SET ${sql5.join(setNodes, sql5`, `)}
        WHERE sku = ${sku}
      `);
      const r = await db.execute(sql5`SELECT * FROM articulos WHERE sku = ${sku} LIMIT 1`);
      res.json(r.rows?.[0] || null);
    } catch (e) {
      res.status(500).json({ message: e?.message || "No se pudo actualizar el art\xEDculo" });
    }
  });
  const uploadImages = multer({ storage: multer.memoryStorage() });
  app.post("/api/articulos/:sku/images", requiereAutenticacion, uploadImages.array("images", 10), async (req, res) => {
    const fs3 = await import("fs");
    const fsp = fs3.promises;
    const path3 = await import("path");
    try {
      const sku = req.params.sku;
      const files = req.files || [];
      const bodyOrderRaw = req.body?.order || void 0;
      let newOrder;
      if (bodyOrderRaw) {
        try {
          newOrder = JSON.parse(bodyOrderRaw);
        } catch {
        }
      }
      const currentRes = await db.execute(sql5`SELECT imagen1, imagen2, imagen3, imagen4 FROM articulos WHERE sku = ${sku} LIMIT 1`);
      const cur = currentRes.rows?.[0] || {};
      const current = [cur.imagen1, cur.imagen2, cur.imagen3, cur.imagen4].filter(Boolean);
      const baseDir = path3.join(process.cwd(), "client", "src", "images", sku, "imagenes");
      await fsp.mkdir(baseDir, { recursive: true });
      const saved = [];
      for (const file of files) {
        let name = file.originalname || `img-${Date.now()}`;
        name = name.replace(/[^A-Za-z0-9._-]+/g, "_");
        let final = path3.join(baseDir, name);
        let base = name, i = 1;
        while (fs3.existsSync(final)) {
          const ext = path3.extname(base);
          const stem = path3.basename(base, ext);
          final = path3.join(baseDir, `${stem}-${i}${ext}`);
          i++;
        }
        await fsp.writeFile(final, file.buffer);
        const rel = path3.join("src", "images", sku, "imagenes", path3.basename(final)).replace(/\\/g, "/");
        saved.push(rel);
      }
      let finalList = [...saved, ...current.filter((c) => !saved.includes(c))];
      if (newOrder && Array.isArray(newOrder) && newOrder.length > 0) {
        const byBase = (p) => p.split("/").pop() || p;
        const map = {};
        for (const p of finalList) map[byBase(p)] = p;
        finalList = newOrder.map((b) => map[b]).filter(Boolean);
        for (const p of Object.values(map)) if (!finalList.includes(p)) finalList.push(p);
      }
      finalList = finalList.slice(0, 4);
      const [i1, i2, i3, i4] = [finalList[0] || null, finalList[1] || null, finalList[2] || null, finalList[3] || null];
      await db.execute(sql5`
        UPDATE ${sql5.raw("articulos")}
        SET imagen1 = ${i1}, imagen2 = ${i2}, imagen3 = ${i3}, imagen4 = ${i4}
        WHERE sku = ${sku}
      `);
      res.json({ imagenes: finalList });
    } catch (e) {
      console.error("POST /api/articulos/:sku/images error:", e);
      res.status(500).json({ message: e?.message || "No se pudieron procesar im\xE1genes" });
    }
  });
  app.get("/api/shopify/product", requiereAutenticacion, async (req, res) => {
    try {
      const skuInterno = String(req.query.sku_interno || "").trim();
      if (!skuInterno) return res.status(400).json({ message: "sku_interno requerido" });
      const q = sql5`
        SELECT p.id as product_id, p.id_shopify, p.title, p.vendor, p.status, p.product_type,
               array_agg(v.sku) as variant_skus
        FROM product_links pl
        LEFT JOIN variants v ON v.id = pl.variant_id
        LEFT JOIN products p ON p.id = COALESCE(pl.product_id, v.product_id)
        WHERE lower(pl.catalogo_sku) = lower(${skuInterno})
        GROUP BY p.id, p.id_shopify, p.title, p.vendor, p.status, p.product_type
        LIMIT 1`;
      let r = await db.execute(q);
      let row = r.rows?.[0];
      if (!row) {
        const q2 = sql5`
          SELECT p.id as product_id, p.id_shopify, p.title, p.vendor, p.status, p.product_type,
                 array_agg(v.sku) as variant_skus
          FROM variants v
          JOIN products p ON p.id = v.product_id
          WHERE lower(v.sku) = lower(${skuInterno})
          GROUP BY p.id, p.id_shopify, p.title, p.vendor, p.status, p.product_type
          LIMIT 1`;
        r = await db.execute(q2);
        row = r.rows?.[0];
      }
      if (!row) return res.status(404).json({ message: "No vinculado en Shopify" });
      res.json(row);
    } catch (e) {
      res.status(500).json({ message: e?.message || "Error consultando Shopify" });
    }
  });
  app.put("/api/shopify/product", requiereAutenticacion, async (req, res) => {
    try {
      const skuInterno = String(req.body?.sku_interno || "").trim();
      const updates = req.body?.updates || {};
      const store = String(req.body?.store || "1");
      if (!skuInterno) return res.status(400).json({ message: "sku_interno requerido" });
      const q = sql5`
        SELECT p.id as product_id
        FROM product_links pl
        LEFT JOIN variants v ON v.id = pl.variant_id
        LEFT JOIN products p ON p.id = COALESCE(pl.product_id, v.product_id)
        WHERE lower(pl.catalogo_sku) = lower(${skuInterno})
        LIMIT 1`;
      let r = await db.execute(q);
      let productId = r.rows?.[0]?.product_id;
      if (!productId) {
        const q2 = sql5`
          SELECT p.id as product_id
          FROM variants v
          JOIN products p ON p.id = v.product_id
          WHERE lower(v.sku) = lower(${skuInterno})
          LIMIT 1`;
        r = await db.execute(q2);
        productId = r.rows?.[0]?.product_id;
      }
      if (!productId) return res.status(404).json({ message: "Producto no localizado" });
      const svc = new ProductService(store);
      const out = await svc.updateProductInShopify(productId, {
        title: updates.title,
        vendor: updates.vendor,
        status: updates.status,
        tags: updates.tags
      });
      if (!out.success) return res.status(500).json({ message: out.error || "Error al actualizar" });
      res.json({ ok: true, product: out.product, shopifyUpdated: out.shopifyUpdated });
    } catch (e) {
      res.status(500).json({ message: e?.message || "Error actualizando Shopify" });
    }
  });
  app.get("/api/catalogo", requiereAutenticacion, async (req, res) => {
    try {
      const { productStorage: productStorage2 } = await Promise.resolve().then(() => (init_productStorage(), productStorage_exports));
      const page = req.query.page ? Number(req.query.page) : 1;
      const pageSize = req.query.pageSize ? Number(req.query.pageSize) : 50;
      const q = req.query.q || "";
      const campo = req.query.campo;
      const marca = req.query.marca || void 0;
      const categoria = req.query.categoria || void 0;
      const stockEq0 = req.query.stock_eq0 === "true";
      const stockGteRaw = req.query.stock_gte;
      const stockGte = stockGteRaw != null && stockGteRaw !== "" ? Number(stockGteRaw) : void 0;
      const sort = req.query.sort || "";
      let orderBy;
      let orderDir = "asc";
      if (sort) {
        const [f, d] = sort.split(":");
        orderBy = f;
        orderDir = d === "desc" ? "desc" : "asc";
      }
      let searchField;
      if (campo === "sku") searchField = "sku";
      else if (campo === "sku_interno") searchField = "sku_interno";
      else if (campo === "nombre") searchField = "nombre_producto";
      const result = await productStorage2.getCatalogProducts({
        page,
        pageSize,
        search: q || void 0,
        searchField,
        marca,
        categoria,
        stockEq0,
        stockGte,
        orderBy,
        orderDir
      });
      const totalPages = Math.max(1, Math.ceil((result.total || 0) / pageSize));
      res.json({
        data: result.rows.map((p) => ({
          sku: p.sku,
          sku_interno: p.sku_interno,
          nombre_producto: p.nombre_producto,
          costo: p.costo != null ? Number(p.costo) : null,
          stock: p.stock != null ? Number(p.stock) : 0,
          estado: p.estado ?? (Number(p.stock ?? 0) > 0 ? "ACTIVO" : "INACTIVO"),
          marca: p.marca ?? p.marca_producto ?? null,
          categoria: p.categoria ?? null
        })),
        page,
        pageSize,
        total: result.total || 0,
        totalPages
      });
    } catch (error) {
      console.error("Error en GET /api/catalogo:", error);
      res.status(500).json({ message: "Error al obtener el cat\xE1logo" });
    }
  });
  app.get("/api/catalogo/export", requiereAutenticacion, async (req, res) => {
    try {
      const { productStorage: productStorage2 } = await Promise.resolve().then(() => (init_productStorage(), productStorage_exports));
      const q = req.query.q || "";
      const campo = req.query.campo;
      const marca = req.query.marca || void 0;
      const categoria = req.query.categoria || void 0;
      const stockEq0 = req.query.stock_eq0 === "true";
      const stockGteRaw = req.query.stock_gte;
      const stockGte = stockGteRaw != null && stockGteRaw !== "" ? Number(stockGteRaw) : void 0;
      const sort = req.query.sort || "";
      const format = (req.query.format || "csv").toLowerCase();
      let orderBy;
      let orderDir = "asc";
      if (sort) {
        const [f, d] = sort.split(":");
        orderBy = f;
        orderDir = d === "desc" ? "desc" : "asc";
      }
      let searchField;
      if (campo === "sku") searchField = "sku";
      else if (campo === "sku_interno") searchField = "sku_interno";
      else if (campo === "nombre") searchField = "nombre_producto";
      const first = await productStorage2.getCatalogProducts({
        page: 1,
        pageSize: 5e3,
        search: q || void 0,
        searchField,
        marca,
        categoria,
        stockEq0,
        stockGte,
        orderBy,
        orderDir
      });
      const rows = [...first.rows];
      const total = first.total || 0;
      let loaded = first.rows.length;
      let page = 2;
      const pageSize = 5e3;
      while (loaded < total) {
        const r = await productStorage2.getCatalogProducts({
          page,
          pageSize,
          search: q || void 0,
          searchField,
          marca,
          categoria,
          stockEq0,
          stockGte,
          orderBy,
          orderDir
        });
        rows.push(...r.rows);
        loaded += r.rows.length;
        page++;
        if (r.rows.length === 0) break;
      }
      const mapped = rows.map((p) => ({
        "Sku Externo": p.sku ?? "",
        "Sku Interno": p.sku_interno ?? "",
        "Producto": p.nombre_producto ?? "",
        "Costo": p.costo != null ? Number(p.costo) : "",
        "Inventario": p.stock != null ? Number(p.stock) : 0,
        "Estado": p.estado ?? (Number(p.stock ?? 0) > 0 ? "ACTIVO" : "INACTIVO"),
        "Marca": p.marca ?? p.marca_producto ?? "",
        "Categoria": p.categoria ?? ""
      }));
      if (format === "xlsx") {
        const wb = xlsx.utils.book_new();
        const ws = xlsx.utils.json_to_sheet(mapped, { cellDates: false });
        xlsx.utils.book_append_sheet(wb, ws, "catalogo");
        const buf = xlsx.write(wb, { bookType: "xlsx", type: "buffer" });
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename="catalogo_${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.xlsx"`);
        return res.send(buf);
      }
      const headers = ["Sku Externo", "Sku Interno", "Producto", "Costo", "Inventario", "Estado", "Marca", "Categoria"];
      const lines = [headers.join(",")];
      for (const r of mapped) {
        const row = headers.map((h) => {
          const v = r[h];
          if (v == null) return "";
          const s = String(v);
          return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
        }).join(",");
        lines.push(row);
      }
      const csv = lines.join("\n");
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="catalogo_${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.csv"`);
      return res.send(csv);
    } catch (error) {
      console.error("Error en GET /api/catalogo/export:", error);
      res.status(500).json({ message: "Error al exportar cat\xE1logo" });
    }
  });
  const uploadCatalog = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowed = /* @__PURE__ */ new Set([
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
        "text/csv",
        "application/csv"
      ]);
      if (!allowed.has(file.mimetype)) return cb(new Error("415: Tipo de archivo no soportado. Sube CSV/XLSX."));
      cb(null, true);
    }
  });
  app.post("/api/catalogo/import", requiereAutenticacion, uploadCatalog.single("file"), async (req, res) => {
    try {
      if (!req.file?.buffer) return res.status(400).json({ message: "No se recibi\xF3 archivo" });
      const wb = xlsx.read(req.file.buffer, { type: "buffer" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      if (!ws) return res.status(400).json({ message: "El archivo no tiene hojas" });
      const rows = xlsx.utils.sheet_to_json(ws, { defval: null, raw: true });
      if (!rows.length) return res.status(400).json({ message: "El archivo est\xE1 vac\xEDo" });
      const required = ["sku", "sku_interno", "nombre_producto", "costo", "stock", "estado", "marca", "categoria"];
      const first = rows[0] || {};
      const missing = required.filter((h) => !(h in first));
      if (missing.length) {
        return res.status(400).json({ message: "Faltan columnas obligatorias", missing, required });
      }
      const batchSize = 500;
      let inserted = 0;
      let updated = 0;
      const errors = [];
      const { db: baseDatos } = await Promise.resolve().then(() => (init_db(), db_exports));
      for (let i = 0; i < rows.length; i += batchSize) {
        const slice = rows.slice(i, i + batchSize);
        try {
          await baseDatos.transaction(async (tx) => {
            for (let j = 0; j < slice.length; j++) {
              const rowIndex = i + j + 2;
              const r = slice[j];
              try {
                const sku = (r.sku ?? "").toString().trim();
                const sku_interno = (r.sku_interno ?? "").toString().trim();
                const nombre = (r.nombre_producto ?? "").toString().trim();
                let costo = r.costo;
                if (typeof costo === "string") costo = costo.replace(",", ".");
                const costoNum = costo == null || costo === "" ? null : Number(costo);
                let stock = r.stock;
                const stockNum = stock == null || stock === "" ? 0 : Number(stock);
                const estado = (r.estado ?? "").toString().trim().toUpperCase();
                const marca = r.marca != null ? String(r.marca) : null;
                const categoria = r.categoria != null ? String(r.categoria) : null;
                if (!sku_interno && !sku) throw new Error("Fila sin sku_interno ni sku");
                if (!nombre) throw new Error("nombre_producto requerido");
                if (costoNum != null && (Number.isNaN(costoNum) || Number(costoNum) < 0)) throw new Error("costo inv\xE1lido");
                if (Number.isNaN(stockNum) || stockNum < 0) throw new Error("stock inv\xE1lido");
                if (estado && !["ACTIVO", "INACTIVO"].includes(estado)) throw new Error("estado inv\xE1lido");
                const existsByInternal = await tx.execute(sql5`SELECT 1 FROM articulos WHERE sku_interno = ${sku_interno} LIMIT 1`);
                if (existsByInternal.rowCount > 0) {
                  await tx.execute(sql5`
                    UPDATE articulos
                    SET nombre = ${nombre}, costo = ${costoNum}, stock = ${stockNum}, proveedor = ${marca}, categoria = ${categoria}, status = ${estado ? estado === "ACTIVO" ? "activo" : "inactivo" : null}
                    WHERE sku_interno = ${sku_interno}
                  `);
                  updated++;
                } else if (sku) {
                  const existsBySku = await tx.execute(sql5`SELECT 1 FROM articulos WHERE sku = ${sku} LIMIT 1`);
                  if (existsBySku.rowCount > 0) {
                    await tx.execute(sql5`
                      UPDATE articulos
                      SET nombre = ${nombre}, costo = ${costoNum}, stock = ${stockNum}, sku_interno = ${sku_interno || null}, proveedor = ${marca}, categoria = ${categoria}, status = ${estado ? estado === "ACTIVO" ? "activo" : "inactivo" : null}
                      WHERE sku = ${sku}
                    `);
                    updated++;
                  } else {
                    await tx.execute(sql5`
                      INSERT INTO articulos (sku, sku_interno, nombre, costo, stock, proveedor, categoria, status)
                      VALUES (${sku || null}, ${sku_interno || null}, ${nombre}, ${costoNum}, ${stockNum}, ${marca}, ${categoria}, ${estado ? estado === "ACTIVO" ? "activo" : "inactivo" : null})
                    `);
                    inserted++;
                  }
                } else {
                  await tx.execute(sql5`
                    INSERT INTO articulos (sku, sku_interno, nombre, costo, stock, proveedor, categoria, status)
                    VALUES (${null}, ${sku_interno || null}, ${nombre}, ${costoNum}, ${stockNum}, ${marca}, ${categoria}, ${estado ? estado === "ACTIVO" ? "activo" : "inactivo" : null})
                  `);
                  inserted++;
                }
              } catch (e) {
                errors.push({ rowIndex, message: e?.message || "Error desconocido" });
                throw e;
              }
            }
          });
        } catch (e) {
          continue;
        }
      }
      let reportBase64;
      if (errors.length) {
        const h = "rowIndex,message";
        const lines = [h, ...errors.map((e) => `${e.rowIndex},"${String(e.message).replace(/"/g, '""')}"`)];
        const csv = lines.join("\n");
        reportBase64 = Buffer.from(csv, "utf8").toString("base64");
      }
      res.json({ inserted, updated, errors: errors.length, errorRows: errors, reportBase64 });
    } catch (error) {
      console.error("Error en POST /api/catalogo/import:", error);
      res.status(500).json({ message: error?.message || "Error al importar cat\xE1logo" });
    }
  });
  app.get("/api/catalogo/:sku_interno", requiereAutenticacion, async (req, res) => {
    try {
      const skuInterno = String(req.params.sku_interno || "").trim();
      if (!skuInterno) return res.status(400).json({ message: "sku_interno requerido" });
      const r = await db.execute(sql5`
        SELECT sku, proveedor, sku_interno, codigo_barras, nombre, modelo, categoria,
               condicion_producto, marca_producto, tipo_variante, variante, largo_cm, ancho_cm, alto_cm, peso_kg, imagen1, costo, stock
        FROM articulos
        WHERE lower(sku_interno) = lower(${skuInterno})
        LIMIT 1
      `);
      const row = r.rows[0];
      if (!row) return res.status(404).json({ message: "Producto no encontrado" });
      const parseNum = (v) => v == null ? null : Number(v);
      const out = jsonSafe({
        sku: row.sku ?? null,
        marca: row.proveedor ?? null,
        sku_interno: row.sku_interno ?? null,
        codigo_barras: row.codigo_barras ?? null,
        nombre_producto: row.nombre ?? null,
        modelo: row.modelo ?? null,
        categoria: row.categoria ?? null,
        condicion: row.condicion_producto ?? null,
        marca_producto: row.marca_producto ?? null,
        variante: row.variante ?? null,
        largo: parseNum(row.largo_cm),
        ancho: parseNum(row.ancho_cm),
        alto: parseNum(row.alto_cm),
        peso: parseNum(row.peso_kg),
        foto: row.imagen1 ?? null,
        costo: parseNum(row.costo),
        stock: row.stock == null ? 0 : Number(row.stock)
      });
      return res.json(out);
    } catch (error) {
      console.error("Error en GET /api/catalogo/:sku_interno:", error);
      return res.status(500).json({ message: error?.message || "Error al obtener producto" });
    }
  });
  app.put("/api/catalogo/:sku_interno", requiereAutenticacion, async (req, res) => {
    try {
      const skuInterno = String(req.params.sku_interno || "").trim();
      if (!skuInterno) return res.status(400).json({ message: "sku_interno requerido" });
      const b = req.body || {};
      const str = (v, max = 255) => {
        if (v == null) return null;
        const s = String(v).trim();
        if (s.length === 0) return null;
        return s.slice(0, max);
      };
      const num = (v) => {
        if (v == null || v === "") return null;
        const n = Number(v);
        return Number.isFinite(n) ? n : NaN;
      };
      const intNonNeg = (v) => {
        if (v == null || v === "") return 0;
        const n = Number(v);
        if (!Number.isFinite(n) || n < 0) return NaN;
        return Math.floor(n);
      };
      const updates = {};
      const textualFields = [
        "sku",
        "sku_interno",
        "codigo_barras",
        "nombre_producto",
        "modelo",
        "condicion",
        "variante",
        "marca",
        "marca_producto",
        "categoria",
        "foto"
      ];
      for (const f of textualFields) {
        if (f in b) {
          const val = str(b[f]);
          if (f === "nombre_producto") updates["nombre"] = val;
          else if (f === "marca") updates["proveedor"] = val;
          else if (f === "condicion") updates["condicion_producto"] = val;
          else if (f === "foto") updates["imagen1"] = val;
          else updates[f] = val;
        }
      }
      const numericNonNeg = ["largo", "ancho", "alto", "peso", "costo"];
      for (const f of numericNonNeg) {
        if (f in b) {
          const n = num(b[f]);
          if (n != null && !Number.isFinite(n)) return res.status(400).json({ message: `${f} inv\xE1lido` });
          if (n != null && n < 0) return res.status(400).json({ message: `${f} no puede ser negativo` });
          const key = f === "largo" ? "largo_cm" : f === "ancho" ? "ancho_cm" : f === "alto" ? "alto_cm" : f === "peso" ? "peso_kg" : f;
          updates[key] = n;
        }
      }
      if ("stock" in b) {
        const s = intNonNeg(b.stock);
        if (!Number.isFinite(s)) return res.status(400).json({ message: `stock inv\xE1lido` });
        updates.stock = s;
      }
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: "No hay campos para actualizar" });
      }
      const setFragments = [];
      for (const [k, v] of Object.entries(updates)) {
        setFragments.push(sql5`${sql5.raw(k)} = ${v}`);
      }
      const updateSQL = sql5`
        UPDATE articulos
        SET ${sql5.join(setFragments, sql5`, `)}
        WHERE lower(sku_interno) = lower(${skuInterno})
      `;
      const result = await db.execute(updateSQL);
      const rowCount = result.rowCount ?? 0;
      if (rowCount === 0) return res.status(404).json({ message: "Producto no encontrado" });
      const nuevoSkuInterno = updates.sku_interno ?? skuInterno;
      const r2 = await db.execute(sql5`
        SELECT sku, proveedor, sku_interno, codigo_barras, nombre, modelo, categoria,
               condicion_producto, marca_producto, tipo_variante, variante, largo_cm, ancho_cm, alto_cm, peso_kg, imagen1, costo, stock
        FROM articulos
        WHERE lower(sku_interno) = lower(${nuevoSkuInterno})
        LIMIT 1
      `);
      const row = r2.rows[0];
      if (!row) return res.status(404).json({ message: "Producto no encontrado tras actualizar" });
      const parseNum = (v) => v == null ? null : Number(v);
      return res.json(jsonSafe({
        sku: row.sku ?? null,
        marca: row.proveedor ?? null,
        sku_interno: row.sku_interno ?? null,
        codigo_barras: row.codigo_barras ?? null,
        nombre_producto: row.nombre ?? null,
        modelo: row.modelo ?? null,
        categoria: row.categoria ?? null,
        condicion: row.condicion_producto ?? null,
        marca_producto: row.marca_producto ?? null,
        variante: row.variante ?? null,
        largo: parseNum(row.largo_cm),
        ancho: parseNum(row.ancho_cm),
        alto: parseNum(row.alto_cm),
        peso: parseNum(row.peso_kg),
        foto: row.imagen1 ?? null,
        costo: parseNum(row.costo),
        stock: row.stock == null ? 0 : Number(row.stock)
      }));
    } catch (error) {
      console.error("Error en PUT /api/catalogo/:sku_interno:", error);
      return res.status(500).json({ message: error?.message || "Error al actualizar producto" });
    }
  });
  app.get("/api/catalogo/shopify-link", requiereAutenticacion, async (req, res) => {
    try {
      const skuInterno = String(req.query.sku_interno || "").trim();
      if (!skuInterno) return res.status(400).json({ connected: false });
      try {
        const q = sql5`
          SELECT p.shop_id
          FROM product_links pl
          LEFT JOIN variants v ON v.id = pl.variant_id
          LEFT JOIN products p ON p.id = v.product_id
          WHERE lower(pl.catalogo_sku) = lower(${skuInterno})
          LIMIT 1
        `;
        const r = await db.execute(q);
        const shopId = r.rows[0]?.shop_id;
        if (!shopId) return res.json({ connected: false });
        const store = shopId === 1 ? "WW" : shopId === 2 ? "CT" : `Tienda ${shopId}`;
        return res.json({ connected: true, store });
      } catch {
        return res.json({ connected: false });
      }
    } catch (error) {
      return res.json({ connected: false });
    }
  });
  app.get("/api/orders/brands", requiereAutenticacion, async (req, res) => {
    try {
      const shopIdRaw = req.query.shopId ?? req.query.channelId;
      const shopId = shopIdRaw && shopIdRaw !== "all" ? Number(shopIdRaw) : void 0;
      const result = await db.execute(sql5`
        (
          SELECT DISTINCT TRIM(COALESCE(p.vendor, '')) AS marca
          FROM products p
          ${shopId !== void 0 ? sql5`WHERE p.vendor IS NOT NULL AND p.vendor <> '' AND p.shop_id = ${shopId}` : sql5`WHERE p.vendor IS NOT NULL AND p.vendor <> ''`}
        )
        UNION
        (
          SELECT DISTINCT TRIM(COALESCE(cp.proveedor, '')) AS marca
          FROM articulos cp
          WHERE cp.proveedor IS NOT NULL AND cp.proveedor <> ''
        )
        ORDER BY marca ASC
      `);
      const brands2 = (result.rows || []).map((r) => r.marca).filter((s) => typeof s === "string" && s.trim().length > 0);
      res.json(brands2);
    } catch (e) {
      res.status(500).json({ message: "No se pudieron obtener marcas" });
    }
  });
  app.get("/api/orders/:id/flags", requiereAutenticacion, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ message: "ID de orden inv\xE1lido" });
      }
      const q = sql5`
        SELECT
          -- Ítems sin mapeo
          EXISTS (
            SELECT 1
            FROM order_items oi
            LEFT JOIN LATERAL (
              SELECT cp.*
              FROM articulos cp
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
              FROM articulos cp
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
      const existsQ = sql5`
        SELECT 1 FROM articulos cp
        WHERE lower(cp.sku_interno) = lower(${sku}) OR lower(cp.sku) = lower(${sku})
        LIMIT 1
      `;
      const exists = await db.execute(existsQ);
      if (!exists.rows.length) {
        return res.status(400).json({ message: "SKU no existe en cat\xE1logo" });
      }
      const upd = sql5`
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
          notifyCustomer: notifyCustomerEff,
          restock: restockEff,
          refundToOriginal: refundEff
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
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowed = /* @__PURE__ */ new Set([
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
        "text/csv",
        "application/csv"
      ]);
      const ok = allowed.has(file.mimetype);
      if (!ok) return cb(new Error("415: Tipo de archivo no soportado. Sube CSV o Excel (.xlsx/.xls)."));
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
        {
          const firstRow2 = rawRows[0] ?? {};
          const modeA = Object.prototype.hasOwnProperty.call(firstRow2, "items");
          const requiredA = ["shopId", "orderId", "items"];
          const requiredB = ["shopId", "orderId", "sku", "quantity"];
          const required = modeA ? requiredA : requiredB;
          const missing2 = required.filter((c) => !(c in firstRow2));
          if (missing2.length) {
            return res.status(400).json({
              message: "Faltan columnas obligatorias",
              missing: missing2,
              requiredTemplate: (modeA ? requiredA : requiredB).concat([
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
                ...modeA ? [] : ["price", "cost", "itemCurrency", "title"]
              ])
            });
          }
        }
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
  app.get("/api/logistic-services", requiereAutenticacion, async (_req, res) => {
    try {
      const servicios = await storage.getLogisticServices();
      res.json(servicios);
    } catch (e) {
      res.status(500).json({ message: "No se pudieron obtener servicios log\xEDsticos" });
    }
  });
  app.get("/api/service-carriers", requiereAutenticacion, async (req, res) => {
    try {
      const serviceId = Number(req.query.serviceId);
      if (!Number.isFinite(serviceId) || serviceId <= 0) return res.json([]);
      const carriers2 = await storage.getServiceCarriers(serviceId);
      res.json(carriers2);
    } catch (e) {
      res.status(500).json({ message: "No se pudieron obtener paqueter\xEDas del servicio" });
    }
  });
  app.get("/api/logistics/meta", requiereAutenticacion, async (_req, res) => {
    try {
      const [services, carriers2, serviceCarriers2] = await Promise.all([
        storage.getLogisticServices(),
        storage.getCarriers(),
        storage.getAllServiceCarriers()
      ]);
      res.json({ services, carriers: carriers2, serviceCarriers: serviceCarriers2 });
    } catch (e) {
      res.status(500).json({ message: e?.message || "No se pudo cargar meta de log\xEDstica" });
    }
  });
  app.get("/api/search", requiereAutenticacion, async (req, res) => {
    try {
      const q = String(req.query.q || "").trim();
      const marketplace = String(req.query.marketplace || "all");
      const limit = Number(req.query.limit || 20);
      if (!q) return res.status(400).json({ error: "Missing q" });
      const tasks = [];
      if (marketplace === "all" || marketplace === "ml") {
        tasks.push(searchMercadoLibre(q, limit));
      }
      if (marketplace === "all" || marketplace === "amazon") {
        tasks.push(searchAmazon(q, Math.min(limit, 10)));
      }
      const settled = await Promise.allSettled(tasks);
      const results = settled.filter((s) => s.status === "fulfilled").flatMap((s) => s.value);
      res.json({ q, marketplace, results });
    } catch (err) {
      res.status(500).json({ error: err?.message || "Search failed" });
    }
  });
  app.get("/api/search/mercadolibre", requiereAutenticacion, async (req, res) => {
    const q = String(req.query.q || "").trim();
    const limit = Number(req.query.limit || 20);
    if (!q) return res.status(400).json({ error: "Missing q" });
    try {
      const results = await searchMercadoLibre(q, limit);
      res.json({ q, results });
    } catch (err) {
      res.status(500).json({ error: err?.message || "ML search failed" });
    }
  });
  app.get("/api/search/amazon", requiereAutenticacion, async (req, res) => {
    const q = String(req.query.q || "").trim();
    const limit = Number(req.query.limit || 10);
    if (!q) return res.status(400).json({ error: "Missing q" });
    try {
      const results = await searchAmazon(q, limit);
      res.json({ q, results });
    } catch (err) {
      res.status(500).json({ error: err?.message || "Amazon search failed" });
    }
  });
  app.post("/api/admin/seed-logistics", requiereAutenticacion, requiereAdmin, async (_req, res) => {
    try {
      if ((process.env.ADMIN_SEED_ENABLED || "0") !== "1") {
        return res.status(403).json({ message: "Seeding no habilitado (ADMIN_SEED_ENABLED != '1')" });
      }
      const r = await seedLogistics();
      return res.json({ seeded: true, services: r.services, carriers: r.carriers, mappings: r.mappings });
    } catch (e) {
      return res.status(500).json({ message: e?.message || "Error al ejecutar seeding" });
    }
  });
  app.patch("/api/tickets/:id/service", requiereAutenticacion, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { serviceId, carrierId } = req.body || {};
      if (!Number.isFinite(serviceId)) return res.status(400).json({ message: "serviceId es requerido" });
      await storage.setTicketService(id, { serviceId: Number(serviceId), carrierId: carrierId != null ? Number(carrierId) : null });
      res.status(204).send();
    } catch (e) {
      res.status(400).json({ message: e?.message || "No se pudo actualizar el servicio" });
    }
  });
  app.patch("/api/tickets/bulk/service", requiereAutenticacion, async (req, res) => {
    try {
      const body = req.body || {};
      const ids = Array.isArray(body.ids) ? body.ids.map((x) => Number(x)).filter((n) => Number.isFinite(n)) : [];
      const serviceId = Number(body.serviceId);
      const carrierId = typeof body.carrierId === "undefined" ? void 0 : body.carrierId === null ? null : Number(body.carrierId);
      if (!ids.length) return res.status(400).json({ message: "Debe proporcionar IDs de tickets a actualizar." });
      if (!Number.isFinite(serviceId) || serviceId <= 0) return res.status(400).json({ message: "serviceId es requerido y debe ser v\xE1lido." });
      const r = await storage.bulkUpdateTicketService({ ids, serviceId, carrierId });
      res.json({ updated: r.updated, skipped: r.skipped, ids: r.ids });
    } catch (e) {
      const msg = String(e?.message || e || "Error en actualizaci\xF3n masiva");
      const isCompat = /compatible|compatibilidad/i.test(msg);
      res.status(isCompat ? 400 : 500).json({ message: msg });
    }
  });
  app.patch("/api/tickets/:id/shipping-data", requiereAutenticacion, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { weight_kg, length_cm, width_cm, height_cm, package_count, service_level } = req.body || {};
      if (package_count != null && Number(package_count) < 1) return res.status(400).json({ message: "El n\xFAmero de paquetes debe ser \u2265 1" });
      if (weight_kg != null && !(Number(weight_kg) > 0)) return res.status(400).json({ message: "El peso debe ser mayor a 0" });
      await storage.updateTicketShippingData(id, {
        weightKg: weight_kg != null ? Number(weight_kg) : null,
        lengthCm: length_cm != null ? Number(length_cm) : null,
        widthCm: width_cm != null ? Number(width_cm) : null,
        heightCm: height_cm != null ? Number(height_cm) : null,
        packageCount: package_count != null ? Number(package_count) : null,
        serviceLevel: service_level ?? null
      });
      res.status(204).send();
    } catch (e) {
      res.status(400).json({ message: e?.message || "No se pudo actualizar los datos de env\xEDo" });
    }
  });
  app.patch("/api/tickets/:id/status", requiereAutenticacion, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { status } = req.body || {};
      const allowed = new Set(Object.values(TICKET_STATUS).concat(["open", "closed"]));
      if (!status || !allowed.has(String(status))) return res.status(400).json({ message: "Estado inv\xE1lido" });
      await storage.updateTicketStatus(id, String(status));
      res.status(204).send();
    } catch (e) {
      res.status(400).json({ message: e?.message || "No se pudo actualizar el estado" });
    }
  });
  app.patch("/api/tickets/:id/tracking", requiereAutenticacion, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { tracking_number, label_url, carrierId } = req.body || {};
      await storage.updateTicketTracking(id, {
        trackingNumber: typeof tracking_number !== "undefined" ? String(tracking_number || "") || null : void 0,
        labelUrl: typeof label_url !== "undefined" ? String(label_url || "") || null : void 0,
        carrierId: typeof carrierId !== "undefined" ? carrierId != null ? Number(carrierId) : null : void 0
      });
      res.status(204).send();
    } catch (e) {
      res.status(400).json({ message: e?.message || "No se pudo actualizar el tracking" });
    }
  });
  app.get("/api/catalogo/search", requiereAutenticacion, async (req, res) => {
    try {
      const q = String(req.query.q || "").trim();
      if (!q) return res.json([]);
      const pattern = `%${q.toLowerCase()}%`;
      const r = await db.execute(sql5`
        SELECT sku, sku_interno, nombre, costo, stock
        FROM articulos
        WHERE lower(sku) LIKE ${pattern}
           OR lower(sku_interno) LIKE ${pattern}
           OR lower(nombre) LIKE ${pattern}
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
    (async () => {
      try {
        const r = await seedLogisticsIfEmpty();
        if (r.seeded) {
          console.info(`[Boot] Cat\xE1logos log\xEDsticos sembrados. Servicios=${r.services}, Paqueter\xEDas=${r.carriers}, V\xEDnculos=${r.mappings}`);
        } else {
          console.info(`[Boot] Cat\xE1logos log\xEDsticos ya presentes. Servicios=${r.services}, Paqueter\xEDas=${r.carriers}, V\xEDnculos=${r.mappings}`);
        }
      } catch (e) {
        console.warn("[Boot] No se pudo completar el seeding log\xEDstico:", e?.message || e);
      }
    })();
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
