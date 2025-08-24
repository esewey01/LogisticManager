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
  catalogProducts: () => catalogProducts,
  catalogoProductos: () => catalogoProductos,
  channels: () => channels,
  createBulkTicketsSchema: () => createBulkTicketsSchema,
  externalProducts: () => externalProducts,
  insertNoteSchema: () => insertNoteSchema,
  insertOrderSchema: () => insertOrderSchema,
  insertProductSchema: () => insertProductSchema,
  insertTicketSchema: () => insertTicketSchema,
  insertVariantSchema: () => insertVariantSchema,
  marcas: () => brands,
  notas: () => notes,
  notes: () => notes,
  ordenes: () => orders,
  orderItems: () => orderItems,
  orders: () => orders,
  paqueterias: () => carriers,
  productComboItems: () => productComboItems,
  productLinks: () => productLinks,
  productosCatalogo: () => catalogProducts,
  products: () => products,
  reglasEnvio: () => shippingRules,
  shippingRules: () => shippingRules,
  shopifyJobs: () => shopifyJobs,
  tickets: () => tickets,
  ticketsTabla: () => tickets,
  users: () => users,
  usuarios: () => users,
  variants: () => variants
});
import { pgTable, serial, text, boolean, timestamp, integer, decimal, bigint, json, varchar, jsonb } from "drizzle-orm/pg-core";
import { z } from "zod";
var users, brands, catalogProducts, catalogoProductos, channels, carriers, orders, orderItems, tickets, shippingRules, notes, products, externalProducts, variants, productComboItems, insertOrderSchema, insertProductSchema, insertVariantSchema, insertTicketSchema, createBulkTicketsSchema, insertNoteSchema, productLinks, shopifyJobs;
var init_schema = __esm({
  "shared/schema.ts"() {
    "use strict";
    users = pgTable("users", {
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
    brands = pgTable("brands", {
      id: serial("id").primaryKey(),
      name: text("name").notNull(),
      // nombre visible
      code: text("code").notNull().unique(),
      // código corto único
      isActive: boolean("is_active").notNull().default(true),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at")
    });
    catalogProducts = pgTable("catalog_products", {
      id: serial("id").primaryKey(),
      sku: text("sku").notNull().unique(),
      // SKU único
      brandId: integer("brand_id").notNull(),
      // referencia a brands.id (no FK explícita aquí)
      nombreProducto: text("name").notNull(),
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
    catalogoProductos = pgTable("catalogo_productos", {
      skuInterno: text("sku_interno").primaryKey().unique(),
      // SKU interno único
      sku: text("sku"),
      // SKU externo
      nombreProducto: text("nombre_producto"),
      // nombre del producto
      marca: text("marca"),
      // marca
      modelo: text("modelo"),
      // modelo
      categoria: text("categoria"),
      // categoría
      marcaProducto: text("marca_producto"),
      // marca del producto
      variante: text("variante"),
      // variante
      codigoBarras: text("codigo_barras"),
      // código de barras
      foto: text("foto"),
      // URL de la foto
      peso: decimal("peso"),
      // peso
      alto: decimal("alto"),
      // altura
      ancho: decimal("ancho"),
      // ancho
      largo: decimal("largo"),
      // largo
      condicion: text("condicion"),
      // condición
      stock: integer("stock"),
      // stock disponible
      costo: decimal("costo"),
      // costo
      situacion: text("situacion")
      // situación
    });
    channels = pgTable("channels", {
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
    carriers = pgTable("carriers", {
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
    orders = pgTable("orders", {
      id: bigint("id", { mode: "bigint" }).generatedAlwaysAsIdentity().primaryKey(),
      // << AUTOGENERATED // BIGSERIAL PRIMARY KEY
      shopId: integer("shop_id").notNull(),
      // INT NOT NULL ← importante
      orderId: text("order_id").notNull(),
      // TEXT NOT NULL (ID externo de la plataforma)
      name: text("name"),
      orderNumber: text("order_number"),
      customerName: text("customer_name"),
      // TEXT
      customerEmail: text("customer_email"),
      // TEXT
      subtotalPrice: decimal("subtotal_price"),
      // NUMERIC
      totalAmount: decimal("total_amount"),
      // NUMERIC
      currency: text("currency"),
      // TEXT
      financialStatus: text("financial_status"),
      // TEXT
      fulfillmentStatus: text("fulfillment_status"),
      // TEXT
      tags: text("tags").array(),
      // TEXT[]
      noteAttributes: json("note_attributes"),
      // JSONB
      createdAt: timestamp("created_at"),
      // TIMESTAMP
      shopifyCreatedAt: timestamp("shopify_created_at", { withTimezone: true }),
      // TIMESTAMPTZ
      shopifyUpdatedAt: timestamp("shopify_updated_at", { withTimezone: true }),
      // TIMESTAMPTZ
      shopifyProcessedAt: timestamp("shopify_processed_at", { withTimezone: true }),
      // TIMESTAMPTZ
      shopifyClosedAt: timestamp("shopify_closed_at", { withTimezone: true }),
      // TIMESTAMPTZ
      shopifyCancelledAt: timestamp("shopify_cancelled_at", { withTimezone: true })
      // TIMESTAMPTZ
    });
    orderItems = pgTable("order_items", {
      id: serial("id").primaryKey(),
      // SERIAL PRIMARY KEY
      orderId: bigint("order_id", { mode: "bigint" }).notNull(),
      // BIGINT NOT NULL (FK a orders.id con ON DELETE CASCADE)
      sku: text("sku"),
      // TEXT
      quantity: integer("quantity").notNull(),
      // INT NOT NULL
      price: decimal("price"),
      // NUMERIC
      shopifyProductId: text("shopify_product_id"),
      // TEXT
      shopifyVariantId: text("shopify_variant_id")
      // TEXT
    });
    tickets = pgTable("tickets", {
      id: serial("id").primaryKey(),
      // SERIAL PRIMARY KEY
      ticketNumber: text("ticket_number").unique().notNull(),
      // TEXT UNIQUE NOT NULL
      orderId: integer("order_id").notNull(),
      // INTEGER NOT NULL (FK a orders.id con ON DELETE CASCADE)
      status: text("status").notNull().default("open"),
      // TEXT NOT NULL DEFAULT 'open'
      notes: text("notes"),
      // TEXT
      createdAt: timestamp("created_at").defaultNow(),
      // TIMESTAMP DEFAULT now()
      updatedAt: timestamp("updated_at")
      // TIMESTAMP
    });
    shippingRules = pgTable("shipping_rules", {
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
    notes = pgTable("notes", {
      id: serial("id").primaryKey(),
      userId: integer("user_id").notNull(),
      // usuario propietario de la nota
      content: text("content").notNull(),
      // contenido de la nota
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    products = pgTable("products", {
      id: serial("id").primaryKey(),
      idShopify: text("id_shopify").notNull(),
      // ID de Shopify
      shopId: integer("shop_id").notNull(),
      // 1 o 2 (tienda)
      title: text("title").notNull(),
      // título del producto
      vendor: text("vendor"),
      // proveedor/marca
      productType: text("product_type"),
      // tipo de producto
      status: text("status").notNull().default("active"),
      // active, draft
      tags: text("tags").array(),
      // etiquetas (array)
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at")
    });
    externalProducts = pgTable("external_products", {
      id: serial("id").primaryKey(),
      sku: text("sku").notNull().unique(),
      prod: text("name").notNull(),
      createdAt: timestamp("created_at").defaultNow()
    });
    variants = pgTable("variants", {
      id: serial("id").primaryKey(),
      productId: integer("product_id"),
      // referencia a products.id
      idShopify: text("id_shopify"),
      // ID de variante en Shopify
      sku: text("sku"),
      // SKU de la variante
      price: decimal("price"),
      // precio de venta
      compareAtPrice: decimal("compare_at_price"),
      // precio de comparación
      barcode: text("barcode"),
      // código de barras
      inventoryQty: integer("inventory_qty"),
      // cantidad en inventario
      createdAt: timestamp("created_at"),
      updatedAt: timestamp("updated_at")
    });
    productComboItems = pgTable("product_combo_items", {
      id: serial("id").primaryKey(),
      productComboId: integer("product_combo_id").notNull(),
      // producto que es combo
      productSimpleId: integer("product_simple_id").notNull(),
      // producto componente
      qty: integer("qty").notNull().default(1),
      // cantidad del componente
      createdAt: timestamp("created_at").defaultNow()
    });
    insertOrderSchema = z.object({
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
      shopifyCancelledAt: z.date().optional()
    }).transform((data) => {
      if (data.id && typeof data.id !== "bigint") {
        data.id = typeof data.id === "string" ? BigInt(data.id) : BigInt(data.id);
      }
      return data;
    });
    insertProductSchema = z.object({
      idShopify: z.string().min(1, "ID de Shopify requerido"),
      shopId: z.number().int().min(1).max(2, "Shop ID debe ser 1 o 2"),
      title: z.string().min(1, "T\xEDtulo requerido"),
      vendor: z.string().optional(),
      productType: z.string().optional(),
      status: z.enum(["active", "draft"]).default("active"),
      tags: z.array(z.string()).optional().default([])
    });
    insertVariantSchema = z.object({
      idShopify: z.string().min(1, "ID de Shopify requerido"),
      productId: z.number().int().positive("Product ID requerido"),
      sku: z.string().optional(),
      price: z.string().optional(),
      compareAtPrice: z.string().optional(),
      barcode: z.string().optional(),
      inventoryQty: z.number().int().optional()
    });
    insertTicketSchema = z.object({
      ticketNumber: z.string().optional(),
      orderId: z.number().int().positive("El ID de la orden debe ser un n\xFAmero positivo"),
      status: z.string().default("open"),
      notes: z.string().optional()
    });
    createBulkTicketsSchema = z.object({
      orderIds: z.array(z.union([z.number().int().positive(), z.string().min(1)])).min(1, "Debe seleccionar al menos una orden"),
      notes: z.string().optional()
    });
    insertNoteSchema = z.object({
      text: z.string().min(1, "El contenido es obligatorio"),
      date: z.string().optional()
    });
    productLinks = pgTable("product_links", {
      id: serial("id").primaryKey(),
      catalogoSku: varchar("catalogo_sku", { length: 100 }).notNull(),
      shopifyVariantId: varchar("shopify_variant_id", { length: 100 }),
      shopifyProductId: varchar("shopify_product_id", { length: 100 }),
      variantId: integer("variant_id").references(() => variants.id),
      productId: integer("product_id").references(() => products.id),
      matchStatus: varchar("match_status", { length: 20 }).default("pending"),
      // 'matched', 'conflict', 'missing'
      syncStatus: varchar("sync_status", { length: 20 }).default("pending"),
      // 'synced', 'error', 'pending'
      errorMessage: text("error_message"),
      lastSyncAt: timestamp("last_sync_at"),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow(),
      createdBy: integer("created_by").references(() => users.id),
      updatedBy: integer("updated_by").references(() => users.id)
    });
    shopifyJobs = pgTable("shopify_jobs", {
      id: serial("id").primaryKey(),
      shopId: integer("shop_id").notNull(),
      jobType: varchar("job_type", { length: 50 }).notNull(),
      // 'update_product', 'update_variant', 'create_product'
      shopifyProductId: varchar("shopify_product_id", { length: 100 }),
      shopifyVariantId: varchar("shopify_variant_id", { length: 100 }),
      payload: jsonb("payload").notNull(),
      status: varchar("status", { length: 20 }).default("pending"),
      // 'pending', 'processing', 'completed', 'failed'
      attempts: integer("attempts").default(0),
      maxAttempts: integer("max_attempts").default(3),
      errorMessage: text("error_message"),
      processedAt: timestamp("processed_at"),
      scheduledFor: timestamp("scheduled_for").defaultNow(),
      createdAt: timestamp("created_at").defaultNow()
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
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    u = new URL(process.env.DATABASE_URL);
    console.log("[DB] Conectando a:", u.hostname);
    db = drizzle(pool, { schema: schema_exports });
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
          if (activo !== void 0) {
            whereConditions.push(`situacion = $${paramIndex}`);
            params_array.push(activo ? "activo" : "inactivo");
            paramIndex++;
          }
          const whereClause = whereConditions.join(" AND ");
          const productos = await db.execute(sql2`
        SELECT sku, marca, nombre_producto, categoria, marca_producto, 
               stock, costo, situacion, sku_interno, codigo_barras
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
              activo: p.situacion === "activo",
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
          sku, nombre_producto, categoria, marca_producto, stock, costo, situacion
        ) VALUES (
          ${datos.sku}, 
          ${datos.nombre}, 
          ${datos.categoria || null}, 
          ${datos.marca || null}, 
          ${datos.inventario || 0}, 
          ${datos.precio || null}, 
          ${datos.activo ? "activo" : "inactivo"}
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
          costo = ${datos.precio || null},
          situacion = ${datos.activo ? "activo" : "inactivo"}
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
        const offset = Math.max(0, (page - 1) * pageSize);
        try {
          let sqlQuery = `
        SELECT sku, marca, sku_interno, codigo_barras, nombre_producto, modelo, categoria, 
               condicion, marca_producto, variante, largo, ancho, alto, peso, foto, costo, stock
        FROM catalogo_productos
        WHERE 1=1
      `;
          const queryParams = [];
          let paramCount = 0;
          if (search) {
            if (searchField && ["sku", "sku_interno", "codigo_barras", "nombre_producto"].includes(searchField)) {
              sqlQuery += ` AND LOWER(COALESCE(${searchField}, '')) LIKE LOWER($${++paramCount})`;
              queryParams.push(`%${search.toLowerCase()}%`);
            } else {
              sqlQuery += ` AND (
            LOWER(COALESCE(sku, '')) LIKE LOWER($${++paramCount}) OR
            LOWER(COALESCE(sku_interno, '')) LIKE LOWER($${paramCount + 1}) OR
            LOWER(COALESCE(codigo_barras, '')) LIKE LOWER($${paramCount + 2}) OR
            LOWER(COALESCE(nombre_producto, '')) LIKE LOWER($${paramCount + 3})
          )`;
              const searchTerm = `%${search.toLowerCase()}%`;
              queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
              paramCount += 4;
            }
          }
          if (marca) {
            sqlQuery += ` AND marca = $${++paramCount}`;
            queryParams.push(marca);
          }
          if (categoria) {
            sqlQuery += ` AND categoria = $${++paramCount}`;
            queryParams.push(categoria);
          }
          if (condicion) {
            sqlQuery += ` AND condicion = $${++paramCount}`;
            queryParams.push(condicion);
          }
          if (marca_producto) {
            sqlQuery += ` AND marca_producto = $${++paramCount}`;
            queryParams.push(marca_producto);
          }
          const validColumns = ["sku", "nombre_producto", "categoria", "marca", "marca_producto"];
          const orderColumn = validColumns.includes(orderBy) ? orderBy : "nombre_producto";
          const orderDirection = orderDir === "desc" ? "DESC" : "ASC";
          sqlQuery += ` ORDER BY ${orderColumn} ${orderDirection}`;
          sqlQuery += ` LIMIT $${++paramCount} OFFSET $${++paramCount}`;
          queryParams.push(pageSize, offset);
          const productos = await db.execute(sql3.raw(sqlQuery, queryParams));
          let countQuery = "SELECT COUNT(*) as total FROM catalogo_productos WHERE 1=1";
          const countParams = [];
          let countParamCount = 0;
          if (search) {
            if (searchField && ["sku", "sku_interno", "codigo_barras", "nombre_producto"].includes(searchField)) {
              countQuery += ` AND LOWER(COALESCE(${searchField}, '')) LIKE LOWER($${++countParamCount})`;
              countParams.push(`%${search.toLowerCase()}%`);
            } else {
              countQuery += ` AND (
            LOWER(COALESCE(sku, '')) LIKE LOWER($${++countParamCount}) OR
            LOWER(COALESCE(sku_interno, '')) LIKE LOWER($${countParamCount + 1}) OR
            LOWER(COALESCE(codigo_barras, '')) LIKE LOWER($${countParamCount + 2}) OR
            LOWER(COALESCE(nombre_producto, '')) LIKE LOWER($${countParamCount + 3})
          )`;
              const searchTerm = `%${search.toLowerCase()}%`;
              countParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
              countParamCount += 4;
            }
          }
          if (marca) {
            countQuery += ` AND marca = $${++countParamCount}`;
            countParams.push(marca);
          }
          if (categoria) {
            countQuery += ` AND categoria = $${++countParamCount}`;
            countParams.push(categoria);
          }
          if (condicion) {
            countQuery += ` AND condicion = $${++countParamCount}`;
            countParams.push(condicion);
          }
          if (marca_producto) {
            countQuery += ` AND marca_producto = $${++countParamCount}`;
            countParams.push(marca_producto);
          }
          const totalResult = await db.execute(sql3.raw(countQuery, countParams));
          const total = Number(totalResult.rows[0]?.total ?? 0);
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
            pageSize,
            // Metadatos útiles para debugging
            debug: process.env.NODE_ENV === "development" ? {
              appliedFilters: { search, searchField, marca, categoria, condicion, marca_producto },
              orderBy: orderColumn,
              orderDir
            } : void 0
          };
        } catch (error) {
          console.error("Error getting catalog products:", error);
          if (error.message?.includes("column") && error.message?.includes("does not exist")) {
            throw new Error(`Campo de ordenamiento inv\xE1lido: ${orderBy}`);
          }
          throw new Error(`Error al obtener productos del cat\xE1logo: ${error.message}`);
        }
      }
      /** Actualiza un producto del catálogo */
      async updateCatalogProduct(sku, updates) {
        try {
          const updateFields = Object.keys(updates);
          if (updateFields.length === 0) return { success: true };
          await db.execute(sql3`
        UPDATE catalogo_productos 
        SET nombre_producto = ${updates.nombre_producto || null}
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
        const { page, pageSize, search, shopId, status, vendor, productType, syncStatus } = params;
        const offset = Math.max(0, (page - 1) * pageSize);
        try {
          let whereConditions = ["1=1"];
          let queryParams = [];
          let paramIndex = 1;
          if (search) {
            whereConditions.push(`(
          LOWER(COALESCE(p.title, '')) LIKE LOWER($${paramIndex}) OR
          LOWER(COALESCE(v.sku, '')) LIKE LOWER($${paramIndex + 1}) OR
          LOWER(COALESCE(v.barcode, '')) LIKE LOWER($${paramIndex + 2})
        )`);
            const searchPattern = `%${search}%`;
            queryParams.push(searchPattern, searchPattern, searchPattern);
            paramIndex += 3;
          }
          if (shopId) {
            whereConditions.push(`p.shop_id = $${paramIndex}`);
            queryParams.push(shopId);
            paramIndex++;
          }
          if (status) {
            whereConditions.push(`p.status = $${paramIndex}`);
            queryParams.push(status);
            paramIndex++;
          }
          if (vendor) {
            whereConditions.push(`p.vendor = $${paramIndex}`);
            queryParams.push(vendor);
            paramIndex++;
          }
          if (productType) {
            whereConditions.push(`p.product_type = $${paramIndex}`);
            queryParams.push(productType);
            paramIndex++;
          }
          const whereClause = whereConditions.join(" AND ");
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
        ORDER BY p.title, v.sku
        LIMIT ${pageSize} OFFSET ${offset}
      `);
          const totalResult = await db.execute(sql3`
        SELECT COUNT(DISTINCT p.id) as total 
        FROM products p
        LEFT JOIN variants v ON v.product_id = p.id
      `);
          const total = Number(totalResult.rows[0]?.total ?? 0);
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
        } catch (error) {
          console.error("Error getting Shopify products:", error);
          return { rows: [], total: 0, page, pageSize };
        }
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
      /** Encola job para Shopify */
      async enqueueShopifyJob(job) {
        try {
          const [shopifyJob] = await db.insert(shopifyJobs).values({
            ...job,
            createdAt: /* @__PURE__ */ new Date()
          }).returning();
          return shopifyJob;
        } catch (error) {
          console.error("Error enqueuing Shopify job:", error);
          throw error;
        }
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

// server/syncShopifyOrders.ts
init_db();
init_schema();
import { eq } from "drizzle-orm";

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
var ShopifyAdminClient = class {
  shopDomain;
  accessToken;
  apiVersion;
  storeNumber;
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

// server/storage.ts
init_schema();
init_db();
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
var createdAtEff = (tabla) => sql`COALESCE(${tabla.shopifyCreatedAt}, ${tabla.createdAt})`;
var DatabaseStorage = class {
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
    const consulta = db.select().from(catalogProducts);
    if (brandId) {
      return await consulta.where(eq2(catalogProducts.brandId, brandId)).orderBy(asc(catalogProducts.sku));
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
    const [producto] = await db.update(catalogProducts).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq2(catalogProducts.id, id)).returning();
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
  /** 
   * Obtiene una orden por ID con detalles completos 
   * Corrección: Manejo correcto de bigint IDs y campos de la DB real
   */
  async getOrder(id) {
    try {
      console.log(`[Storage] getOrder called with ID: ${id}`);
      const [orden] = await db.select().from(orders).where(eq2(orders.id, BigInt(id)));
      console.log(`[Storage] Raw order found:`, !!orden);
      if (!orden) return void 0;
      console.log(`[Storage] Returning order with ID: ${orden.id}`);
      return orden;
    } catch (error) {
      console.error("[Storage] Error getting order:", error);
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
    const [orden] = await db.update(orders).set(updates).where(eq2(orders.id, BigInt(id))).returning();
    return orden;
  }
  /** Lista órdenes por nombre de cliente. */
  async getOrdersByCustomer(nombreCliente) {
    return await db.select().from(orders).where(eq2(orders.customerName, nombreCliente)).orderBy(desc(orders.createdAt));
  }
  async getOrdersByChannel() {
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
    WHERE o.created_at >= NOW() - INTERVAL '30 days'
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
  /** Crea tickets masivos para múltiples órdenes. */
  async createBulkTickets(orderIds, notes2) {
    const tickets2 = [];
    let updated = 0;
    for (const orderId of orderIds) {
      const numeroOrdenNumerica = typeof orderId === "string" ? parseInt(orderId) : orderId;
      const orden = await this.getOrder(numeroOrdenNumerica);
      if (!orden) {
        console.log(`\u26A0\uFE0F  Orden ${orderId} no encontrada, omitiendo...`);
        continue;
      }
      const numeroTicket = await this.getNextTicketNumber();
      const ticketNuevo = await this.createTicket({
        ticketNumber: numeroTicket,
        orderId: numeroOrdenNumerica,
        status: "open",
        notes: notes2 || `Ticket creado masivamente para orden ${orden.orderId || orderId}`
      });
      tickets2.push(ticketNuevo);
      await this.updateOrder(numeroOrdenNumerica, {
        fulfillmentStatus: "fulfilled"
      });
      updated++;
    }
    return { tickets: tickets2, updated };
  }
  /** Normaliza órdenes con fulfillment_status NULL marcándolas como fulfilled. */
  async normalizeNullFulfillmentStatus() {
    console.log("\u{1F504} Normalizando fulfillment_status NULL...");
    const resultado = await db.update(orders).set({
      fulfillmentStatus: "fulfilled"
    }).where(isNull(orders.fulfillmentStatus)).returning({ id: orders.id });
    const updated = resultado.length;
    console.log(
      `\u2705 ${updated} \xF3rdenes normalizadas con fulfillment_status FULFILLED`
    );
    return { updated };
  }
  // ==== REGLAS DE ENVÍO ====
  /** Devuelve reglas de envío activas. */
  async getShippingRules() {
    return await db.select().from(shippingRules).where(eq2(shippingRules.isActive, true));
  }
  /** Crea una regla de envío. */
  async createShippingRule(regla) {
    const [nuevaRegla] = await db.insert(shippingRules).values(regla).returning();
    return nuevaRegla;
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
      const data = dayNames.map((day, index) => {
        const found = result.rows.find((row) => Number(row.dow) === index);
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
          orderId: numericOrderId,
          ticketNumber: numeroTicket,
          status: "open",
          notes: notes2 || `Ticket creado autom\xE1ticamente para orden ${numericOrderId}`
        });
        tickets2.push(ticket);
        await this.updateOrder(numericOrderId, {
          fulfillmentStatus: "fulfilled",
          updatedAt: /* @__PURE__ */ new Date()
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
    const { statusFilter, channelId, page, pageSize, search, searchType = "all" } = params;
    console.log(`\u{1F50D} getOrdersPaginated - filtros:`, { statusFilter, channelId, page, pageSize, search });
    try {
      const conds = [];
      if (statusFilter === "unmanaged") {
        conds.push(
          sql`LOWER(COALESCE(o.fulfillment_status, '')) IN ('', 'unfulfilled')`
        );
      } else if (statusFilter === "managed") {
        conds.push(
          sql`LOWER(COALESCE(o.fulfillment_status, '')) = 'fulfilled'`
        );
      }
      if (channelId !== void 0 && channelId !== null) {
        conds.push(sql`o.shop_id = ${channelId}`);
      }
      if (search) {
        const searchPattern = `%${search.toLowerCase()}%`;
        if (searchType === "sku") {
          conds.push(
            sql`EXISTS (
            SELECT 1 FROM order_items oi2 
            WHERE oi2.order_id = o.id 
            AND LOWER(COALESCE(oi2.sku, '')) LIKE ${searchPattern}
          )`
          );
        } else if (searchType === "customer") {
          conds.push(
            sql`(
            LOWER(COALESCE(o.customer_name, '')) LIKE ${searchPattern} OR 
            LOWER(COALESCE(o.customer_email, '')) LIKE ${searchPattern}
          )`
          );
        } else if (searchType === "product") {
          conds.push(
            sql`EXISTS (
            SELECT 1 FROM order_items oi2 
            WHERE oi2.order_id = o.id 
            AND (
              LOWER(COALESCE(oi2.title, '')) LIKE ${searchPattern} OR
              LOWER(COALESCE(oi2.variant_title, '')) LIKE ${searchPattern}
            )
          )`
          );
        } else {
          conds.push(
            sql`(
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
          )`
          );
        }
      }
      const whereClause = conds.length > 0 ? sql`${conds.reduce(
        (acc, cond, i) => i === 0 ? cond : sql`${acc} AND ${cond}`
      )}` : void 0;
      const offset = Math.max(0, (page - 1) * pageSize);
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
      ORDER BY COALESCE(o.shopify_created_at, o.created_at) DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `;
      const countQuery = sql`
      SELECT COUNT(DISTINCT o.id) as count
      FROM orders o
      ${whereClause ? sql`WHERE ${whereClause}` : sql``}
    `;
      console.log(`\u{1F4CA} Ejecutando queries...`);
      const [rows, totalRes] = await Promise.all([
        db.execute(baseQuery),
        db.execute(countQuery)
      ]);
      const total = Number(totalRes.rows[0]?.count ?? 0);
      console.log(`\u2705 Resultados: ${rows.rows.length} filas, total: ${total}`);
      return {
        rows: rows.rows,
        page,
        pageSize,
        total
      };
    } catch (error) {
      console.error(`\u274C Error en getOrdersPaginated:`, error);
      throw new Error(`Error al obtener \xF3rdenes paginadas: ${error.message}`);
    }
  }
  // Items de una orden
  async getOrderItems(orderId) {
    try {
      const items = await db.select({
        id: orderItems.id,
        sku: orderItems.sku,
        quantity: orderItems.quantity,
        price: orderItems.price,
        title: products.title,
        vendor: products.vendor,
        productName: products.title,
        // Alias para el modal
        skuInterno: orderItems.sku,
        // SKU interno 
        skuExterno: orderItems.sku
        // SKU externo (mismo por ahora)
      }).from(orderItems).leftJoin(
        products,
        eq2(products.idShopify, orderItems.shopifyProductId)
      ).where(eq2(orderItems.orderId, BigInt(orderId))).orderBy(asc(orderItems.id));
      const uniqueItems = items.filter(
        (item, index, self) => index === self.findIndex((t) => t.id === item.id)
      );
      return uniqueItems;
    } catch (error) {
      console.error("Error getting order items:", error);
      return [];
    }
  }
  async getCatalogProductsPaginated(page, pageSize) {
    const offset = (page - 1) * pageSize;
    const rows = await db.select().from(catalogProducts).orderBy(asc(catalogProducts.nombreProducto)).limit(pageSize).offset(offset);
    const totalRes = await db.select({ count: count() }).from(catalogProducts);
    return { rows, total: Number(totalRes[0]?.count ?? 0), page, pageSize };
  }
  async getExternalProductsPaginated(page, pageSize) {
    const offset = (page - 1) * pageSize;
    const rows = await db.select().from(externalProducts).orderBy(asc(externalProducts.prod)).limit(pageSize).offset(offset);
    const totalRes = await db.select({ count: count() }).from(externalProducts);
    return { rows, total: Number(totalRes[0]?.count ?? 0), page, pageSize };
  }
};
var storage = new DatabaseStorage();

// server/services/ProductService.ts
init_db();
init_schema();
import { eq as eq3 } from "drizzle-orm";
var ProductService = class {
  client;
  storeNumber;
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
import { createServer } from "http";
init_schema();
import bcrypt from "bcrypt";
import session from "express-session";
import MemoryStore from "memorystore";
import { z as z2 } from "zod";
var AlmacenSesionesMemoria = MemoryStore(session);
var esquemaLogin = z2.object({
  email: z2.string().email(),
  password: z2.string().min(1)
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
      ts: Date.now()
    });
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
          visto: { shop: !!shop, token: !!token, ver }
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
      const channelId = req.query.channelId && req.query.channelId !== "all" ? Number(req.query.channelId) : void 0;
      const page = req.query.page ? Number(req.query.page) : 1;
      const pageSize = req.query.pageSize ? Number(req.query.pageSize) : 15;
      const search = req.query.search;
      const searchType = req.query.searchType;
      const data = await storage.getOrdersPaginated({
        statusFilter,
        channelId,
        page,
        pageSize,
        search,
        searchType
      });
      res.json(data);
    } catch {
      res.status(500).json({ message: "No se pudieron obtener \xF3rdenes" });
    }
  });
  app.get("/api/orders/:orderId/items", requiereAutenticacion, async (req, res) => {
    const orderId = Number(req.params.orderId);
    if (!Number.isFinite(orderId)) return res.status(400).json({ message: "orderId inv\xE1lido" });
    try {
      const items = await storage.getOrderItems(orderId);
      res.json({ items });
    } catch (e) {
      console.error("[items]", e?.message);
      res.status(500).json({ message: "No se pudieron obtener items" });
    }
  });
  app.get("/api/orders/:id", requiereAutenticacion, async (req, res) => {
    try {
      const id = Number(req.params.id);
      console.log(`[GET /api/orders/:id] Solicitando orden ID: ${id}`);
      if (Number.isNaN(id))
        return res.status(400).json({ message: "ID de orden inv\xE1lido" });
      const orden = await storage.getOrder(id);
      console.log(`[GET /api/orders/:id] Orden encontrada:`, !!orden);
      if (!orden)
        return res.status(404).json({ message: "Orden no encontrada" });
      res.json(orden);
    } catch (error) {
      console.error(`[GET /api/orders/:id] Error:`, error);
      res.status(500).json({ message: "No se pudo obtener la orden" });
    }
  });
  app.post("/api/orders/:id/cancel", requiereAutenticacion, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id))
        return res.status(400).json({ message: "ID de orden inv\xE1lido" });
      const orden = await storage.getOrder(id);
      if (!orden) return res.status(404).json({ ok: false, errors: "Orden no encontrada" });
      const { reason, staffNote, notifyCustomer, restock, refundToOriginal } = req.body;
      const { shop, token, apiVersion } = getShopifyCredentials(String(orden.shopId));
      const gid = orden.orderId && orden.orderId.startsWith("gid://") ? orden.orderId : `gid://shopify/Order/${orden.orderId || orden.id}`;
      const mutation = `mutation orderCancel($id: ID!, $reason: OrderCancelReason, $staffNote: String, $email: Boolean, $restock: Boolean, $refund: Boolean){
        orderCancel(id: $id, reason: $reason, staffNote: $staffNote, email: $email, restock: $restock, refund: $refund){
          job { id }
          userErrors { field message }
        }
      }`;
      const variables = {
        id: gid,
        reason,
        staffNote,
        email: !!notifyCustomer,
        restock: !!restock,
        refund: !!refundToOriginal
      };
      const r = await fetch(`https://${shop}/admin/api/${apiVersion}/graphql.json`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": token
        },
        body: JSON.stringify({ query: mutation, variables })
      });
      const data = await r.json();
      const userErrors = data?.data?.orderCancel?.userErrors || data?.errors;
      if (!r.ok || userErrors && userErrors.length) {
        return res.status(400).json({ ok: false, errors: userErrors });
      }
      return res.json({ ok: true, job: data?.data?.orderCancel?.job });
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
      const numeroTicket = await storage.getNextTicketNumber();
      const ticket = await storage.createTicket({
        ...datosTicket,
        ticketNumber: numeroTicket
      });
      res.status(201).json(ticket);
    } catch {
      res.status(400).json({ message: "Datos de ticket inv\xE1lidos" });
    }
  });
  app.post("/api/tickets/bulk", requiereAutenticacion, async (req, res) => {
    try {
      const { orderIds, notes: notes2 } = createBulkTicketsSchema.parse(req.body);
      console.log(`\u{1F3AB} Creando tickets masivos para ${orderIds.length} \xF3rdenes...`);
      const resultado = await storage.createBulkTickets(orderIds, notes2);
      console.log(`\u2705 ${resultado.tickets.length} tickets creados, ${resultado.updated} \xF3rdenes actualizadas`);
      res.status(201).json({
        ok: true,
        message: `Se crearon ${resultado.tickets.length} tickets exitosamente`,
        tickets: resultado.tickets,
        ordersUpdated: resultado.updated
      });
    } catch (error) {
      console.error("\u274C Error creando tickets masivos:", error);
      res.status(400).json({
        ok: false,
        message: "Error al crear tickets masivos",
        error: error?.message
      });
    }
  });
  app.post("/api/orders/normalize-fulfillment", requiereAutenticacion, async (req, res) => {
    try {
      console.log("\u{1F504} Iniciando normalizaci\xF3n de fulfillment_status...");
      const resultado = await storage.normalizeNullFulfillmentStatus();
      res.json({
        ok: true,
        message: `Se normalizaron ${resultado.updated} \xF3rdenes con fulfillment_status NULL`,
        updated: resultado.updated
      });
    } catch (error) {
      console.error("\u274C Error en normalizaci\xF3n:", error);
      res.status(500).json({
        ok: false,
        message: "Error al normalizar \xF3rdenes",
        error: error?.message
      });
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
      const { text: text2 } = insertNoteSchema.parse(req.body);
      console.log("Creando nota para usuario:", userId, "con contenido:", text2);
      const nota = await storage.createNote({
        userId,
        content: text2
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
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: "Datos de nota inv\xE1lidos", errors: error.errors });
      }
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });
  app.put("/api/notes/:id", requiereAutenticacion, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id))
        return res.status(400).json({ message: "ID de nota inv\xE1lido" });
      const nota = await storage.updateNote(id, req.body);
      res.json(nota);
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
      const data = await storage.getProductsPaginated(shopId, page, pageSize);
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
  app.get("/api/external-products", requiereAutenticacion, async (req, res) => {
    try {
      const page = req.query.page ? Number(req.query.page) : 1;
      const pageSize = req.query.pageSize ? Number(req.query.pageSize) : 15;
      const data = await storage.getExternalProductsPaginated(page, pageSize);
      res.json(data);
    } catch {
      res.status(500).json({ message: "No se pudieron obtener productos" });
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
  });
})();
