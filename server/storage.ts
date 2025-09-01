// Capa de acceso a datos (Data Access Layer) — Versión comentada en español
// Mantiene compatibilidad exportando `storage` con los mismos métodos
// y agrega alias `almacenamiento` por legibilidad en español.

import {
  // Tablas
  users as tablaUsuarios,
  brands as tablaMarcas,
  catalogoProductos as tablaProductosCatalogo,
  channels as tablaCanales,
  carriers as tablaPaqueterias,
  logisticServices as tablaServiciosLogisticos,
  serviceCarriers as tablaServicioPaqueterias,
  orders as tablaOrdenes,
  tickets as tablaTickets,
  ticketEvents as tablaEventosTicket,
  notes as tablaNotas,
  products as tablaProductos,
  variants as tablaVariantes,
  orderItems as tablaItemsOrden,
  
  // Tipos (alias en español)
  type User as Usuario,
  type InsertUser as InsertarUsuario,
  type Brand as Marca,
  type InsertBrand as InsertarMarca,
  type CatalogoProducto as ProductoCatalogo,
  type InsertCatalogoProducto as InsertarProductoCatalogo,
  type Channel as Canal,
  type InsertChannel as InsertarCanal,
  type Carrier as Paqueteria,
  type InsertCarrier as InsertarPaqueteria,
  type LogisticService as ServicioLogistico,
  type InsertLogisticService as InsertarServicioLogistico,
  type Order as Orden,
  type InsertOrder as InsertarOrden,
  type Ticket as Ticket,
  type InsertTicket as InsertarTicket,
  type TicketEvent as EventoTicket,
  type Note as Nota,
  type InsertNote as InsertarNota,
  type DashboardMetrics,
  type Product as Producto,
  type InsertProduct as InsertarProducto,
  type Variant as Variante,
  type InsertVariant as InsertarVariante,
  type OrderItem as ItemOrden,
  type InsertOrderItem as InsertarItemOrden,
  orderItems,
} from "@shared/schema";

import { db as baseDatos } from "./db";
  import {
    eq,
    and,
    or,
    isNull,
    isNotNull,
    desc,
    asc,
    sql,
    count,
    gte,
    lte,
    inArray,
  } from "drizzle-orm";
//Shopify fulfillment
import { fulfillOrderInShopify } from "./shopifyFulfillment";

// TODO: Legacy types/tables not present in current schema; declared only to satisfy interface typings.
type ReglaEnvio = any;
type InsertarReglaEnvio = any;
const tablaReglasEnvio: any = undefined;
const tablaProductosExternos: any = undefined;

export type ExportFilters = {
  selectedIds?: (number | string)[];
  statusFilter?: "unmanaged" | "managed" | "all";
  channelId?: number;
  search?: string;
  searchType?: "all" | "sku" | "customer" | "product";
  page?: number;
  pageSize?: number;
  sortField?: string;
  sortOrder?: "asc" | "desc";
};

export type ImportRow = Record<string, unknown>;

export type ImportResult =
  | { rowIndex: number; status: "inserted" | "updated" | "skipped" }
  | { rowIndex: number; status: "error"; message: string; field?: string; value?: unknown };

export type ImportReport = {
  results: ImportResult[];
  summary: { processed: number; inserted: number; updated: number; skipped: number; errors: number };
};


const createdAtEff = (tabla: typeof tablaOrdenes) =>
  sql`COALESCE(${tabla.shopifyCreatedAt}, ${tabla.createdAt})`;

// --- Interfaz original (compatibilidad) ---
export interface IStorage {
  // Operaciones de usuario
  getUser(id: number): Promise<Usuario | undefined>;
  getUserByEmail(email: string): Promise<Usuario | undefined>;
  createUser(user: InsertarUsuario): Promise<Usuario>;
  updateUser(id: number, updates: Partial<InsertarUsuario>): Promise<Usuario>;
  getAllUsers(): Promise<Usuario[]>;

  // Marcas
  getBrands(): Promise<Marca[]>;
  getBrand(id: number): Promise<Marca | undefined>;
  createBrand(brand: InsertarMarca): Promise<Marca>;
  updateBrand(id: number, updates: Partial<InsertarMarca>): Promise<Marca>;

  // Catálogo
  getCatalogProducts(brandId?: number): Promise<ProductoCatalogo[]>;
  createCatalogProduct(
    product: InsertarProductoCatalogo,
  ): Promise<ProductoCatalogo>;
  updateCatalogProduct(
    id: number,
    updates: Partial<InsertarProductoCatalogo>,
  ): Promise<ProductoCatalogo>;

  // Canales
  getChannels(): Promise<Canal[]>;
  getChannel(id: number): Promise<Canal | undefined>;
  createChannel(channel: InsertarCanal): Promise<Canal>;

  // Paqueterías
  getCarriers(): Promise<Paqueteria[]>;
  getCarrier(id: number): Promise<Paqueteria | undefined>;
  createCarrier(carrier: InsertarPaqueteria): Promise<Paqueteria>;

  // Servicios logísticos
  getLogisticServices(): Promise<ServicioLogistico[]>;
  getServiceCarriers(serviceId: number): Promise<Paqueteria[]>;

  // Órdenes
  getOrders(filters?: {
    channelId?: number;
    managed?: boolean;
    hasTicket?: boolean;
  }): Promise<Orden[]>;
  getOrder(id: number): Promise<Orden | undefined>;
  getOrderByShopifyId(
    shopifyId: string,
    shopId: number,
  ): Promise<Orden | undefined>;
  createOrder(order: InsertarOrden): Promise<Orden>;
  updateOrder(id: number, updates: Partial<InsertarOrden>): Promise<Orden>;
  getOrdersByCustomer(customerName: string): Promise<Orden[]>;
  getOrderDetails(idParam: unknown): Promise<any>;
  getOrdersByChannel(
    from?: Date,
    to?: Date
  ): Promise<{ channelCode: string; channelName: string; orders: number }[]>;

  // Tickets
  getTickets(): Promise<Ticket[]>;
  getTicket(id: number): Promise<Ticket | undefined>;
  createTicket(ticket: InsertarTicket): Promise<Ticket>;
  updateTicket(id: number, updates: Partial<InsertarTicket>): Promise<Ticket>;
  // Nuevas operaciones de Tickets (logística)
  setTicketService(ticketId: number, params: { serviceId: number; carrierId?: number | null }): Promise<void>;
  updateTicketShippingData(ticketId: number, data: {
    weightKg?: number | null;
    lengthCm?: number | null;
    widthCm?: number | null;
    heightCm?: number | null;
    packageCount?: number | null;
    serviceLevel?: string | null;
  }): Promise<void>;
  updateTicketStatus(ticketId: number, status: string): Promise<void>;
  updateTicketTracking(ticketId: number, data: { trackingNumber?: string | null; labelUrl?: string | null; carrierId?: number | null }): Promise<void>;
  writeTicketEvent(ticketId: number, eventType: string, payload?: unknown): Promise<void>;
  createBulkTickets(
    orderIds: (number | string)[],
    notes?: string,
  ): Promise<{ tickets: Ticket[]; updated: number }>;
  getNextTicketNumber(): Promise<string>;

  //Vista de tickets
  getTicketsView(): Promise<Array<{
    id: number;
    ticketNumber: string;
    status: string;
    notes: string | null;
    createdAt: string;
    updatedAt: string | null;
    orderPk: string;        // id de orders como texto (evita BigInt en JSON)
    orderId: string;        // order_id (Shopify)
    orderName: string | null;
    customerName: string | null;
    shopId: number | null;
    itemsCount: number;
  }>>;

  //TICKETS /fulfillemnt en Shopify
  createTicketAndFulfill(params: {
    orderId: number;        // PK local de orders.id
    notes?: string;
    notifyCustomer?: boolean;
  }): Promise<Ticket>;

  // Desaher tickets
  deleteTicket(id: number): Promise<void>;
  revertTicket(id: number, opts?: { revertShopify?: boolean }): Promise<{ ok: boolean; changedLocal: boolean; cancelledRemote?: number }>;


  // Reglas de envío
  getShippingRules(): Promise<ReglaEnvio[]>;
  createShippingRule(rule: InsertarReglaEnvio): Promise<ReglaEnvio>;

  // Notas
  getNotesRange(from: Date, to: Date): Promise<Nota[]>;
  createNote(note: InsertarNota): Promise<Nota>;
  updateNote(id: number, updates: Partial<InsertarNota>): Promise<Nota>;
  deleteNote(id: number): Promise<void>;

  // Nuevos métodos Shopify
  createOrderItem(item: InsertarItemOrden): Promise<ItemOrden>;
  getProducts(shopId?: number): Promise<Producto[]>;
  getProduct(id: number): Promise<Producto | undefined>;
  getProductByShopifyId(
    shopifyId: string,
    shopId: number,
  ): Promise<Producto | undefined>;
  createProduct(product: InsertarProducto): Promise<Producto>;
  updateProduct(
    id: number,
    updates: Partial<InsertarProducto>,
  ): Promise<Producto>;

  getVariants(productId?: number): Promise<Variante[]>;
  getVariant(id: number): Promise<Variante | undefined>;
  createVariant(variant: InsertarVariante): Promise<Variante>;
  updateVariant(
    id: number,
    updates: Partial<InsertarVariante>,
  ): Promise<Variante>;

  // EXPRESSPL-INTEGRATION: Métodos para generar guías de envío
  getOrderById(orderId: number): Promise<Orden | undefined>;
  getOrderItemsForShipping(orderId: number): Promise<ItemOrden[]>;
  getCatalogoBySkuInterno(sku: string): Promise<ProductoCatalogo | undefined>;

  // Métricas de dashboard
  getDashboardMetricsRange(from: Date, to: Date): Promise<DashboardMetrics>;

  getOrdersPaginated(params: {
    statusFilter: "unmanaged" | "managed" | "all";
    channelId?: number;
    page: number;
    pageSize: number;
    search?: string;
  }): Promise<{ rows: any[]; total: number; page: number; pageSize: number }>;

  getOrderItems(orderId: number): Promise<any[]>;

  //IMPORTACION Y EXPORTACION
  getOrdersForExport(filters: ExportFilters): Promise<any[]>;
  importOrdersFromRows(
    rows: Array<Record<string, unknown>>
  ): Promise<{
    results: Array<{
      rowIndex: number;
      status: "ok" | "skipped" | "error";
      message?: string;
      field?: string;
      value?: unknown;
      orderId?: number | string;
    }>;
    summary: { processed: number; ok: number; skipped: number; errors: number };
  }>;
  importOrdersFromRows(rawRows: ImportRow[]): Promise<{
    results: Array<{
      rowIndex: number;
      status: "ok" | "skipped" | "error";
      message?: string;
      field?: string;
      value?: unknown;
      orderId?: number | string;
    }>;
    summary: { processed: number; ok: number; skipped: number; errors: number };
  }>;


  getProductsPaginated(
    params: { page: number; pageSize: number; search?: string; categoria?: string; activo?: boolean; }
  ): Promise<{ rows: any[]; total: number; page: number; pageSize: number }>;
  getCatalogProductsPaginated(
    page: number,
    pageSize: number,
  ): Promise<{ rows: any[]; total: number; page: number; pageSize: number }>;
  getExternalProductsPaginated(
    page: number,
    pageSize: number,
  ): Promise<{ rows: any[]; total: number; page: number; pageSize: number }>;
}

/**
 * Implementación concreta utilizando Drizzle ORM y PostgreSQL.
 * Todos los métodos están comentados en español para claridad.
 */
export class DatabaseStorage implements IStorage {
  // ==== USUARIOS ====

  /** Obtiene un usuario por su ID. */
  async getUser(id: number): Promise<Usuario | undefined> {
    const [usuario] = await baseDatos
      .select()
      .from(tablaUsuarios)
      .where(eq(tablaUsuarios.id, id));
    return usuario;
  }

  /** Busca un usuario por correo electrónico. */
  async getUserByEmail(email: string): Promise<Usuario | undefined> {
    const [usuario] = await baseDatos
      .select()
      .from(tablaUsuarios)
      .where(eq(tablaUsuarios.email, email));
    return usuario;
  }

  /** Crea un nuevo usuario. */
  async createUser(datos: InsertarUsuario): Promise<Usuario> {
    const [usuario] = await baseDatos
      .insert(tablaUsuarios)
      .values(datos)
      .returning();
    return usuario;
  }

  /** Actualiza campos de un usuario existente. */
  async updateUser(
    id: number,
    updates: Partial<InsertarUsuario>,
  ): Promise<Usuario> {
    const [usuario] = await baseDatos
      .update(tablaUsuarios)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(tablaUsuarios.id, id))
      .returning();
    return usuario;
  }

  /** Lista todos los usuarios ordenados por correo. */
  async getAllUsers(): Promise<Usuario[]> {
    return await baseDatos
      .select()
      .from(tablaUsuarios)
      .orderBy(asc(tablaUsuarios.email));
  }

  // ==== MARCAS ====

  /** Devuelve las marcas activas ordenadas por nombre. */
  async getBrands(): Promise<Marca[]> {
    return await baseDatos
      .select()
      .from(tablaMarcas)
      .where(eq(tablaMarcas.isActive, true))
      .orderBy(asc(tablaMarcas.name));
  }

  /** Obtiene una marca por ID. */
  async getBrand(id: number): Promise<Marca | undefined> {
    const [marca] = await baseDatos
      .select()
      .from(tablaMarcas)
      .where(eq(tablaMarcas.id, id));
    return marca;
  }

  /** Crea una nueva marca. */
  async createBrand(datos: InsertarMarca): Promise<Marca> {
    const [marcaNueva] = await baseDatos
      .insert(tablaMarcas)
      .values(datos)
      .returning();
    return marcaNueva;
  }

  /** Actualiza una marca. */
  async updateBrand(
    id: number,
    updates: Partial<InsertarMarca>,
  ): Promise<Marca> {
    const [marca] = await baseDatos
      .update(tablaMarcas)
      .set(updates)
      .where(eq(tablaMarcas.id, id))
      .returning();
    return marca;
  }

  // ==== CATÁLOGO ====

  /** Lista productos de catálogo; puede filtrar por ID de marca. */
  async getCatalogProducts(brandId?: number): Promise<ProductoCatalogo[]> {
    const consulta = baseDatos.select().from(tablaProductosCatalogo);
    // Nota: brandId no existe en la tabla real, devolvemos todos los productos
    return await consulta.orderBy(asc(tablaProductosCatalogo.sku));
  }

  /** Crea un producto de catálogo. */
  async createCatalogProduct(
    datos: InsertarProductoCatalogo,
  ): Promise<ProductoCatalogo> {
    const [productoNuevo] = await baseDatos
      .insert(tablaProductosCatalogo)
      .values(datos)
      .returning();
    return productoNuevo;
  }

  /** Actualiza un producto de catálogo. */
  async updateCatalogProduct(
    id: number,
    updates: Partial<InsertarProductoCatalogo>,
  ): Promise<ProductoCatalogo> {
    const [producto] = await baseDatos
      .update(tablaProductosCatalogo)
      .set(updates)
      .where(eq(tablaProductosCatalogo.sku_interno, String(id)))
      .returning();
    return producto;
  }

  // ==== CANALES ====

  /** Devuelve canales activos ordenados por nombre. */
  async getChannels(): Promise<Canal[]> {
    return await baseDatos
      .select()
      .from(tablaCanales)
      .where(eq(tablaCanales.isActive, true))
      .orderBy(asc(tablaCanales.name));
  }

  /** Obtiene un canal por ID. */
  async getChannel(id: number): Promise<Canal | undefined> {
    const [canal] = await baseDatos
      .select()
      .from(tablaCanales)
      .where(eq(tablaCanales.id, id));
    return canal;
  }

  /** Crea un canal. */
  async createChannel(datos: InsertarCanal): Promise<Canal> {
    const [canalNuevo] = await baseDatos
      .insert(tablaCanales)
      .values(datos)
      .returning();
    return canalNuevo;
  }

  // ==== PAQUETERÍAS ====

  /** Devuelve paqueterías activas ordenadas por nombre. */
  async getCarriers(): Promise<Paqueteria[]> {
    return await baseDatos
      .select()
      .from(tablaPaqueterias)
      .where(eq(tablaPaqueterias.isActive, true))
      .orderBy(asc(tablaPaqueterias.name));
  }

  /** Obtiene una paquetería por ID. */
  async getCarrier(id: number): Promise<Paqueteria | undefined> {
    const [paq] = await baseDatos
      .select()
      .from(tablaPaqueterias)
      .where(eq(tablaPaqueterias.id, id));
    return paq;
  }

  /** Crea una paquetería. */
  async createCarrier(datos: InsertarPaqueteria): Promise<Paqueteria> {
    const [paqueteriaNueva] = await baseDatos
      .insert(tablaPaqueterias)
      .values(datos)
      .returning();
    return paqueteriaNueva;
  }

  // ==== SERVICIOS LOGÍSTICOS ====
  /** Devuelve servicios logísticos activos. */
  async getLogisticServices(): Promise<ServicioLogistico[]> {
    return await baseDatos
      .select()
      .from(tablaServiciosLogisticos)
      .where(eq((tablaServiciosLogisticos as any).active, true as any))
      .orderBy(asc(tablaServiciosLogisticos.name));
  }

  /** Devuelve paqueterías compatibles con un servicio. */
  async getServiceCarriers(serviceId: number): Promise<Paqueteria[]> {
    const q = sql`
      SELECT c.*
      FROM carriers c
      JOIN service_carriers sc ON sc.carrier_id = c.id
      WHERE sc.service_id = ${serviceId} AND c.is_active = TRUE
      ORDER BY c.name ASC
    `;
    const r = await baseDatos.execute(q);
    return r.rows as any;
  }

  /** Devuelve todos los pares servicio-paqueterA-a (para meta de UI). */
  async getAllServiceCarriers(): Promise<Array<{ serviceId: number; carrierId: number }>> {
    const r = await baseDatos.execute(sql`
      SELECT service_id AS "serviceId", carrier_id AS "carrierId" 
      FROM service_carriers
    `);
    return r.rows as any;
  }

  // ==== ÓRDENES ====

  /** Lista órdenes con filtros opcionales (canal, gestionada, con ticket). */
  async getOrders(filtros?: {
    channelId?: number;
    managed?: boolean;
    hasTicket?: boolean;
  }): Promise<Orden[]> {
    const condiciones: any[] = [];

    if (filtros?.channelId !== undefined)
      condiciones.push(eq(tablaOrdenes.shopId, filtros.channelId));
    if (filtros?.managed !== undefined) {
      if (filtros.managed) {
        condiciones.push(sql`LOWER(COALESCE(${tablaOrdenes.fulfillmentStatus}, '')) = 'fulfilled'`);
      } else {
        condiciones.push(sql`LOWER(COALESCE(${tablaOrdenes.fulfillmentStatus}, '')) IN ('', 'unfulfilled')`);
      }
    }
    if (filtros?.hasTicket !== undefined) {
      if (filtros.hasTicket) {
        condiciones.push(sql`EXISTS(SELECT 1 FROM tickets t WHERE t.order_id = ${tablaOrdenes.id})`);
      } else {
        condiciones.push(sql`NOT EXISTS(SELECT 1 FROM tickets t WHERE t.order_id = ${tablaOrdenes.id})`);
      }
    }

    if (condiciones.length > 0) {
      return await baseDatos
        .select()
        .from(tablaOrdenes)
        .where(and(...condiciones))
        .orderBy(desc(createdAtEff(tablaOrdenes)));
    }

    return await baseDatos
      .select()
      .from(tablaOrdenes)
      .orderBy(desc(createdAtEff(tablaOrdenes)));
  }

  //INFORMACION RELEVANTE DE LA ORDEN
  // server/storage.ts
async getOrderDetails(idParam: unknown) {
  try {
    const idNum = Number(idParam);
    if (!Number.isInteger(idNum) || idNum <= 0) return undefined;

    const { rows } = await baseDatos.execute(sql`
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

    const row = (rows as any[])[0];
    return row ?? undefined;
  } catch (e) {
    console.error("[Storage] Error getOrderDetails:", (e as any)?.message || e);
    return undefined;
  }
}



  /** 
   * Obtiene una orden por ID con detalles completos 
   * Corrección: Manejo correcto de bigint IDs y campos de la DB real
   */
  async getOrder(idParam: unknown) {
    try {
      const idNum = Number(idParam);
      if (!Number.isInteger(idNum) || idNum <= 0) return undefined;

      const idBig = Number(idNum); // ✅ nunca BigInt(NaN)
      const [orden] = await baseDatos
        .select()
        .from(tablaOrdenes)
        .where(eq(tablaOrdenes.id, idBig));

      return orden ?? undefined;
    } catch (e) {
      console.error("[Storage] Error getting order:", e);
      return undefined;
    }
  }




  /** Crea una orden. */
  async createOrder(datos: InsertarOrden): Promise<Orden> {
    const [ordenNueva] = await baseDatos
      .insert(tablaOrdenes)
      .values(datos)
      .returning();
    return ordenNueva;
  }

  /** Actualiza una orden. */
  async updateOrder(
    id: number,
    updates: Partial<InsertarOrden>,
  ): Promise<Orden> {
    const [orden] = await baseDatos
      .update(tablaOrdenes)
      .set(updates)
      .where(eq(tablaOrdenes.id, Number(id)))
      .returning();
    return orden;
  }

  /** Lista órdenes por nombre de cliente. */
  async getOrdersByCustomer(nombreCliente: string): Promise<Orden[]> {
    return await baseDatos
      .select()
      .from(tablaOrdenes)
      .where(eq(tablaOrdenes.customerName, nombreCliente))
      .orderBy(desc(tablaOrdenes.createdAt));
  }

  async getOrdersByChannel(
    from?: Date,
    to?: Date
  ): Promise<{ channelCode: string; channelName: string; orders: number }[]> {
    // Condiciones seguras, paramétricas
    const fromCond = from
      ? sql`o.created_at >= ${from}`
      : sql`o.created_at >= NOW() - INTERVAL '30 days'`;
    const toCond = to ? sql`o.created_at < ${to}` : sql`TRUE`;

    const result = await baseDatos.execute<{
      channel_code: string;
      channel_name: string;
      orders: number;
    }>(sql`
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
      orders: row.orders,
    }));
  }


  /** Obtiene estadísticas de órdenes canceladas/reabastecidas */
  async getCancelledOrdersStats(): Promise<{ count: number; percentage: number }> {
    try {
      const result = await baseDatos.execute<{
        cancelled_count: number;
        total_count: number;
      }>(sql`
        SELECT 
          COUNT(CASE WHEN LOWER(COALESCE(fulfillment_status, '')) = 'restocked' THEN 1 END)::int as cancelled_count,
          COUNT(*)::int as total_count
        FROM orders
        WHERE created_at >= NOW() - INTERVAL '30 days'
      `);

      const row = result.rows[0];
      const count = row?.cancelled_count || 0;
      const total = row?.total_count || 1;
      const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

      return { count, percentage };
    } catch (error) {
      console.error("Error getting cancelled orders stats:", error);
      return { count: 0, percentage: 0 };
    }
  }

  /** Obtiene una orden por ID de Shopify y tienda. */
  async getOrderByShopifyId(
    shopifyId: string,
    shopId: number,
  ): Promise<Orden | undefined> {
    const [orden] = await baseDatos
      .select()
      .from(tablaOrdenes)
      .where(
        and(
          eq(tablaOrdenes.orderId, shopifyId),
          eq(tablaOrdenes.shopId, shopId),
        ),
      );
    return orden;
  }

  // ==== TICKETS ====
  //Vista para obtener tickets en la tabla de tickets
  // storage.ts
  async getTicketsView() {
    // Importante: evitar GROUP BY con columnas sin agregar. Usamos una subconsulta
    // agregada por order_id para contar items y juntar SKUs/marcas, y hacemos LEFT JOIN.
    const result = await baseDatos.execute(sql`
      WITH items_agg AS (
        SELECT 
          oi.order_id,
          COUNT(oi.id)::int AS items_count,
          COALESCE(ARRAY_AGG(DISTINCT oi.sku) FILTER (WHERE oi.sku IS NOT NULL), ARRAY[]::text[]) AS skus,
          COALESCE(ARRAY_AGG(DISTINCT cp.marca) FILTER (WHERE cp.marca IS NOT NULL), ARRAY[]::text[]) AS brands
        FROM order_items oi
        LEFT JOIN catalogo_productos cp ON cp.sku = oi.sku
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

    return result.rows as any[];
  }



  /** Lista tickets ordenados por fecha de creación descendente. */
  async getTickets(): Promise<Ticket[]> {
    return await baseDatos
      .select()
      .from(tablaTickets)
      .orderBy(desc(tablaTickets.createdAt));
  }

  /** Obtiene un ticket por ID. */
  async getTicket(id: number): Promise<Ticket | undefined> {
    const [ticket] = await baseDatos
      .select()
      .from(tablaTickets)
      .where(eq(tablaTickets.id, id));
    return ticket;
  }

  /** Crea un ticket. */
  async createTicket(datos: InsertarTicket): Promise<Ticket> {
    const [ticketNuevo] = await baseDatos
      .insert(tablaTickets)
      .values(datos)
      .returning();
    return ticketNuevo;
  }

  /** Actualiza un ticket. */
  async updateTicket(
    id: number,
    updates: Partial<InsertarTicket>,
  ): Promise<Ticket> {
    const [ticket] = await baseDatos
      .update(tablaTickets)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(tablaTickets.id, id))
      .returning();
    return ticket;
  }

  // === Auditoría de tickets ===
  async writeTicketEvent(ticketId: number, eventType: string, payload?: unknown): Promise<void> {
    await baseDatos.insert(tablaEventosTicket).values({
      ticketId,
      eventType,
      payload: payload as any,
    });
  }

  // === Operaciones logísticas de tickets ===
  async setTicketService(ticketId: number, params: { serviceId: number; carrierId?: number | null }): Promise<void> {
    const { serviceId, carrierId } = params;

    // Valida servicio
    const [serv] = await baseDatos
      .select()
      .from(tablaServiciosLogisticos)
      .where(and(
        eq(tablaServiciosLogisticos.id, serviceId),
        // En la BD real es "active"; en TS mapeamos a .active
        eq((tablaServiciosLogisticos as any).active, true as any)
      ));
    if (!serv || (serv as any).isActive === false) throw new Error("Servicio logístico inválido o inactivo");

    // Si hay carrier, valida compatibilidad (si existe en bridge)
    const compatRequired = (process.env.LOGISTICS_COMPAT_REQUIRED ?? "true").toLowerCase() !== "false";
    if (compatRequired && carrierId != null) {
      const [compat] = await baseDatos
        .select()
        .from(tablaServicioPaqueterias)
        .where(and(eq(tablaServicioPaqueterias.serviceId, serviceId), eq(tablaServicioPaqueterias.carrierId, carrierId)));
      if (!compat) throw new Error("La paquetería no es compatible con el servicio seleccionado");
    }

    await baseDatos.update(tablaTickets)
      .set({ serviceId, carrierId: carrierId ?? null, updatedAt: new Date() })
      .where(eq(tablaTickets.id, ticketId));

    await this.writeTicketEvent(ticketId, 'SERVICE_SET', { serviceId, carrierId: carrierId ?? null });
  }

  /**
   * Actualiza servicio y paqueterA-a de varios tickets en una sola operaciA3n.
   * Valida servicio/carrier activos y compatibilidad (si existe la tabla puente).
   */
  async bulkUpdateTicketService(params: { ids: number[]; serviceId: number; carrierId?: number | null }): Promise<{ updated: number; skipped: number; ids: number[] }> {
    const { ids, serviceId, carrierId } = params;
    if (!Array.isArray(ids) || ids.length === 0) {
      return { updated: 0, skipped: 0, ids: [] };
    }

    // Valida servicio activo
    const [serv] = await baseDatos
      .select()
      .from(tablaServiciosLogisticos)
      .where(and(eq(tablaServiciosLogisticos.id, serviceId), eq((tablaServiciosLogisticos as any).active, true as any)));
    if (!serv) throw new Error("Servicio logA-stico invA�lido o inactivo");

    // Si viene carrierId, valida activo y compatibilidad
    if (typeof carrierId !== 'undefined' && carrierId !== null) {
      const [car] = await baseDatos
        .select()
        .from(tablaPaqueterias)
        .where(and(eq(tablaPaqueterias.id, Number(carrierId)), eq(tablaPaqueterias.isActive, true)));
      if (!car) throw new Error("PaqueterA-a invA�lida o inactiva");

      // Compatibilidad segA�n tabla puente
      const compatRequired = (process.env.LOGISTICS_COMPAT_REQUIRED ?? "true").toLowerCase() !== "false";
      const [compat] = compatRequired ? await baseDatos
        .select()
        .from(tablaServicioPaqueterias)
        .where(and(eq(tablaServicioPaqueterias.serviceId, serviceId), eq(tablaServicioPaqueterias.carrierId, Number(carrierId)))) : [{ ok: true } as any];
      if (compatRequired && !compat) throw new Error("La paqueterA-a no es compatible con el servicio seleccionado.");
    }

    // Actualizar en bloque
    const updatedRows = await baseDatos
      .update(tablaTickets)
      .set({ serviceId, carrierId: typeof carrierId === 'undefined' ? null : carrierId, updatedAt: new Date() })
      .where(inArray(tablaTickets.id, ids))
      .returning({ id: tablaTickets.id });

    const updatedIds = (updatedRows || []).map((r) => Number(r.id));
    const updated = updatedIds.length;
    const skipped = Math.max(0, ids.length - updated);
    return { updated, skipped, ids: updatedIds };
  }

  async updateTicketShippingData(ticketId: number, data: {
    weightKg?: number | null;
    lengthCm?: number | null;
    widthCm?: number | null;
    heightCm?: number | null;
    packageCount?: number | null;
    serviceLevel?: string | null;
  }): Promise<void> {
    const payload: any = { updatedAt: new Date() };
    if (typeof data.weightKg !== 'undefined') payload.weightKg = data.weightKg as any;
    if (typeof data.lengthCm !== 'undefined') payload.lengthCm = data.lengthCm as any;
    if (typeof data.widthCm !== 'undefined') payload.widthCm = data.widthCm as any;
    if (typeof data.heightCm !== 'undefined') payload.heightCm = data.heightCm as any;
    if (typeof data.packageCount !== 'undefined') payload.packageCount = data.packageCount as any;
    if (typeof data.serviceLevel !== 'undefined') payload.serviceLevel = data.serviceLevel as any;

    await baseDatos.update(tablaTickets).set(payload).where(eq(tablaTickets.id, ticketId));
    await this.writeTicketEvent(ticketId, 'SHIPPING_DATA_UPDATED', data);
  }

  async updateTicketStatus(ticketId: number, status: string): Promise<void> {
    await baseDatos.update(tablaTickets).set({ status, updatedAt: new Date() }).where(eq(tablaTickets.id, ticketId));
    await this.writeTicketEvent(ticketId, 'STATUS_CHANGED', { status });
  }

  async updateTicketTracking(ticketId: number, data: { trackingNumber?: string | null; labelUrl?: string | null; carrierId?: number | null }): Promise<void> {
    const update: any = { updatedAt: new Date() };
    if (typeof data.trackingNumber !== 'undefined') update.trackingNumber = data.trackingNumber ?? null;
    if (typeof data.labelUrl !== 'undefined') update.labelUrl = data.labelUrl ?? null;
    if (typeof data.carrierId !== 'undefined') update.carrierId = data.carrierId ?? null;

    await baseDatos.update(tablaTickets).set(update).where(eq(tablaTickets.id, ticketId));

    // Si el ticket estaba ABIERTO/open y se asigna tracking/label, llevar a ETIQUETA_GENERADA
    const [t] = await baseDatos.select().from(tablaTickets).where(eq(tablaTickets.id, ticketId));
    const prevStatus = (t as any)?.status || '';
    if ((data.trackingNumber || data.labelUrl) && (/^(ABIERTO|open)$/i).test(prevStatus)) {
      await baseDatos.update(tablaTickets).set({ status: 'ETIQUETA_GENERADA', updatedAt: new Date() }).where(eq(tablaTickets.id, ticketId));
      await this.writeTicketEvent(ticketId, 'STATUS_CHANGED', { status: 'ETIQUETA_GENERADA', reason: 'tracking/label assigned' });
    }

    await this.writeTicketEvent(ticketId, 'TRACKING_UPDATED', data);
  }

  /** Obtiene el siguiente número de ticket secuencial empezando en 30000. */
  async getNextTicketNumber(): Promise<string> {
    const resultado = await baseDatos
      .select({ maxTicket: sql<string>`MAX(${tablaTickets.ticketNumber})` })
      .from(tablaTickets)
      .where(sql`${tablaTickets.ticketNumber} ~ '^[0-9]+$'`); // Solo números

    const maxTicket = resultado[0]?.maxTicket;
    let nextNumber = 30000;

    if (maxTicket && !isNaN(Number(maxTicket))) {
      nextNumber = Math.max(30000, Number(maxTicket) + 1);
    }

    return nextNumber.toString();
  }


  /** Crea tickets masivos y marca fulfilled en Shopify + BD */
  // storage.ts
  async createBulkTickets(
    orderIds: (number | string)[],
    notes?: string,
  ): Promise<{ tickets: Ticket[]; updated: number; failed: Array<{ orderId: number | string; reason: string }> }> {
    const tickets: Ticket[] = [];
    let updated = 0;
    const failed: Array<{ orderId: number | string; reason: string }> = [];

    for (const oid of orderIds) {
      const orderIdNum = typeof oid === "string" ? parseInt(oid, 10) : oid;

      try {
        // 1) Cargar orden local
        const orden = await this.getOrder(orderIdNum);
        if (!orden) {
          failed.push({ orderId: oid, reason: "Orden no encontrada" });
          continue;
        }

        const storeNumber: number =
          (orden as any).shopId ?? parseInt(process.env.DEFAULT_SHOPIFY_STORE || "1", 10);
        const shopifyOrderId = (orden as any).orderId || (orden as any).order_id;
        if (!shopifyOrderId) {
          failed.push({ orderId: oid, reason: "Orden sin order_id Shopify" });
          continue;
        }

        // 2) Primero intentar fulfill en Shopify
        let fulfillResp: any;
        // No empujar a Shopify si es MLG (shopId=3)
        if (storeNumber !== 3) {
          try {
            fulfillResp = await fulfillOrderInShopify({
              storeNumber,
              shopifyOrderId: String(shopifyOrderId),
              notifyCustomer: false,
            });
          } catch (shopifyError: any) {
            failed.push({
              orderId: oid,
              reason: `Shopify error: ${shopifyError?.message || shopifyError}`
            });
            continue; // Si Shopify falla, no continuar con esta orden
          }
        }

        // 3) Si Shopify fue exitoso, crear ticket y actualizar BD local
        const ticketTx = await baseDatos.transaction(async (tx) => {
          const [ticketNuevo] = await tx.insert(tablaTickets).values({
            ticketNumber: sql`nextval('public.ticket_number_seq')::text`,
            orderId: Number(orderIdNum),
            status: "open",
            notes: notes || `Ticket creado masivamente para orden ${shopifyOrderId}`,
          }).returning();

          // Actualizar fulfillment status en BD local
          await tx.update(tablaOrdenes)
            .set({
              fulfillmentStatus: "fulfilled",
              shopifyUpdatedAt: new Date()
            })
            .where(eq(tablaOrdenes.id, Number(orderIdNum)));

          return ticketNuevo;
        });

        tickets.push(ticketTx);
        updated++;

      } catch (error: any) {
        failed.push({
          orderId: oid,
          reason: `Error interno: ${error?.message || 'Desconocido'}`
        });
      }
    }

    return { tickets, updated, failed };
  }





  // ==== STATUS FULLFILMENT 

  async createTicketAndFulfill(params: {
    orderId: number;
    notes?: string;
    notifyCustomer?: boolean;
  }) {
    const { orderId, notes, notifyCustomer = false } = params;

    // 1) Cargar orden local
    const [orden] = await baseDatos
      .select()
      .from(tablaOrdenes)
      .where(eq(tablaOrdenes.id, Number(orderId)));

    if (!orden) throw new Error(`Orden ${orderId} no encontrada`);

    const shopifyOrderId = orden.orderId;
    if (!shopifyOrderId) throw new Error(`La orden ${orderId} no tiene order_id de Shopify`);

    const storeNumber = orden.shopId ?? parseInt(process.env.DEFAULT_SHOPIFY_STORE || "1", 10);

    // MLG: no empujar a Shopify, crear ticket y marcar fulfilled localmente
    if (storeNumber === 3) {
      const nuevoTicket = await baseDatos.transaction(async (tx) => {
        const [ticketCreado] = await tx
          .insert(tablaTickets)
          .values({
            ticketNumber: sql`nextval('public.ticket_number_seq')::text`,
            orderId: Number(orderId),
            status: "open",
            notes,
          })
          .returning();

        if (!ticketCreado) throw new Error("No se pudo crear el ticket");

        await tx
          .update(tablaOrdenes)
          .set({
            fulfillmentStatus: "fulfilled",
            shopifyUpdatedAt: new Date(),
          })
          .where(eq(tablaOrdenes.id, Number(orderId)));

        return ticketCreado;
      });

      return nuevoTicket;
    }

    try {
      // 2) Primero fulfill en Shopify
      const fulfillResp = await fulfillOrderInShopify({
        storeNumber,
        shopifyOrderId: String(shopifyOrderId),
        notifyCustomer,
      });

      console.log("🛒 Shopify fulfill response:", fulfillResp);

      // 3) Si Shopify fue exitoso, actualizar BD local
      const nuevoTicket = await baseDatos.transaction(async (tx) => {
        const [ticketCreado] = await tx
          .insert(tablaTickets)
          .values({
            ticketNumber: sql`nextval('public.ticket_number_seq')::text`,
            orderId: Number(orderId),
            status: "open",
            notes,
          })
          .returning();

        if (!ticketCreado) throw new Error("No se pudo crear el ticket");

        await tx
          .update(tablaOrdenes)
          .set({
            fulfillmentStatus: "fulfilled",
            shopifyUpdatedAt: new Date(),
          })
          .where(eq(tablaOrdenes.id, Number(orderId)));

        return ticketCreado;
      });

      return nuevoTicket;
    } catch (error) {
      // Si algo falla, no hacemos nada en BD local
      throw new Error(`Error al crear ticket y fulfill: ${error}`);
    }
  }

  /** Borra un ticket. */
  async deleteTicket(id: number): Promise<void> {
    await baseDatos.delete(tablaTickets).where(eq(tablaTickets.id, id));
  }

  //DESHACER: BORAR EL TICKET Y DEVUELVE LA ORDEN A UNFULFILLED LOCALMENTE
  async revertTicket(id: number, opts?: { revertShopify?: boolean }) {
    const ticket = await this.getTicket(id);
    if (!ticket) return { ok: true, changedLocal: false };

    const orderPk = (ticket as any).orderId as bigint | number;

    // Cargar la orden para conocer shopId y orderId de Shopify
    const orden = await this.getOrder(Number(orderPk));
    if (!orden) {
      // Igual borra el ticket, pero no podemos tocar la orden
      await this.deleteTicket(id);
      return { ok: true, changedLocal: false };
    }

    // (Opcional) cancelar fulfillments en Shopify
    let cancelledRemote = 0;
    if (opts?.revertShopify) {
      const storeNumber = (orden as any).shopId;
      const shopifyOrderId = (orden as any).orderId || (orden as any).order_id;

      try {
        // Función unfulfillOrderInShopify no está implementada
        console.log(`Should unfulfill order ${shopifyOrderId} in store ${storeNumber}`);
        cancelledRemote = 0;
      } catch (e) {
        console.warn("[RevertTicket] No se pudo cancelar en Shopify:", (e as any)?.message || e);
      }
    }

    // TX: borra ticket y regresa fulfillment_status local a 'unfulfilled'
    await baseDatos.transaction(async (tx) => {
      await tx.delete(tablaTickets).where(eq(tablaTickets.id, id));
      await tx.update(tablaOrdenes)
        .set({ fulfillmentStatus: '' as any, shopifyUpdatedAt: new Date() })
        .where(eq(tablaOrdenes.id, Number(orderPk)));
    });

    return { ok: true, changedLocal: true, cancelledRemote };
  }



  ///==== REGLAS DE ENVÍO ====

  /** Devuelve reglas de envío activas. */
  // Removed: shipping rules are not part of current schema
  async getShippingRules(): Promise<ReglaEnvio[]> {
    return [] as any[];
  }

  /** Crea una regla de envío. */
  async createShippingRule(_regla: InsertarReglaEnvio): Promise<ReglaEnvio> {
    throw new Error('Shipping rules not supported');
  }

  // ==== NOTAS ====

  /** Lista notas por usuario. */
  async getUserNotes(userId: number): Promise<Nota[]> {
    return await baseDatos
      .select()
      .from(tablaNotas)
      .where(eq(tablaNotas.userId, userId))
      .orderBy(desc(tablaNotas.createdAt));
  }

  /** Lista notas; si se pasa userId, filtra por usuario. */
  async getNotesRange(from: Date, to: Date): Promise<Nota[]> {
    return await baseDatos
      .select()
      .from(tablaNotas)
      .where(
        and(gte(tablaNotas.createdAt, from), lte(tablaNotas.createdAt, to)),
      )
      .orderBy(asc(tablaNotas.createdAt));
  }

  /** Crea una nota. */
  async createNote(nota: InsertarNota): Promise<Nota> {
    const [nuevaNota] = await baseDatos
      .insert(tablaNotas)
      .values(nota)
      .returning();
    return nuevaNota;
  }

  /** Actualiza una nota. */
  async updateNote(id: number, updates: Partial<InsertarNota>): Promise<Nota> {
    const [nota] = await baseDatos
      .update(tablaNotas)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(tablaNotas.id, id))
      .returning();
    return nota;
  }



  /** Elimina una nota por ID. */
  async deleteNote(id: number): Promise<void> {
    await baseDatos.delete(tablaNotas).where(eq(tablaNotas.id, id));
  }

  // ==== NUEVOS MÉTODOS SHOPIFY ====

  /** Crea un item de orden. */
  async createOrderItem(datos: InsertarItemOrden): Promise<ItemOrden> {
    const [item] = await baseDatos
      .insert(tablaItemsOrden)
      .values(datos)
      .returning();
    return item;
  }

  /** Lista productos por tienda (opcional). */
  async getProducts(shopId?: number): Promise<Producto[]> {
    if (shopId !== undefined) {
      return await baseDatos
        .select()
        .from(tablaProductos)
        .where(eq(tablaProductos.shopId, shopId))
        .orderBy(asc(tablaProductos.title));
    }
    return await baseDatos
      .select()
      .from(tablaProductos)
      .orderBy(asc(tablaProductos.title));
  }

  /** Obtiene un producto por ID. */
  async getProduct(id: number): Promise<Producto | undefined> {
    const [producto] = await baseDatos
      .select()
      .from(tablaProductos)
      .where(eq(tablaProductos.id, id));
    return producto;
  }

  /** Obtiene un producto por ID de Shopify y tienda. */
  async getProductByShopifyId(
    shopifyId: string,
    shopId: number,
  ): Promise<Producto | undefined> {
    const [producto] = await baseDatos
      .select()
      .from(tablaProductos)
      .where(
        and(
          eq(tablaProductos.idShopify, shopifyId),
          eq(tablaProductos.shopId, shopId),
        ),
      );
    return producto;
  }

  /** Crea un producto. */
  async createProduct(datos: InsertarProducto): Promise<Producto> {
    const [producto] = await baseDatos
      .insert(tablaProductos)
      .values(datos)
      .returning();
    return producto;
  }

  /** Actualiza un producto. */
  async updateProduct(
    id: number,
    updates: Partial<InsertarProducto>,
  ): Promise<Producto> {
    const [producto] = await baseDatos
      .update(tablaProductos)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(tablaProductos.id, id))
      .returning();
    return producto;
  }

  /** Lista variantes por producto (opcional). */
  async getVariants(productId?: number): Promise<Variante[]> {
    if (productId !== undefined) {
      return await baseDatos
        .select()
        .from(tablaVariantes)
        .where(eq(tablaVariantes.productId, productId))
        .orderBy(asc(tablaVariantes.sku));
    }
    return await baseDatos
      .select()
      .from(tablaVariantes)
      .orderBy(asc(tablaVariantes.sku));
  }

  /** Obtiene una variante por ID. */
  async getVariant(id: number): Promise<Variante | undefined> {
    const [variante] = await baseDatos
      .select()
      .from(tablaVariantes)
      .where(eq(tablaVariantes.id, id));
    return variante;
  }

  /** Crea una variante. */
  async createVariant(datos: InsertarVariante): Promise<Variante> {
    const [variante] = await baseDatos
      .insert(tablaVariantes)
      .values(datos)
      .returning();
    return variante;
  }

  /** Actualiza una variante. */
  async updateVariant(
    id: number,
    updates: Partial<InsertarVariante>,
  ): Promise<Variante> {
    const [variante] = await baseDatos
      .update(tablaVariantes)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(tablaVariantes.id, id))
      .returning();
    return variante;
  }

  // ==== MÉTRICAS DE DASHBOARD ====

  /**
   * Métricas de dashboard entre dos fechas.
   */
  async getDashboardMetricsRange(
    from: Date,
    to: Date,
  ): Promise<{
    totalOrders: number;
    totalSales: number;
    unmanaged: number;
    managed: number;
    byChannel: { channelId: number; channelName: string; count: number }[];
    byShop: { shopId: number; shopName: string | null; count: number }[];
  }> {
    const range = and(
      gte(tablaOrdenes.shopifyCreatedAt, from),
      lte(tablaOrdenes.shopifyCreatedAt, to),
      isNotNull(tablaOrdenes.shopifyCreatedAt),
      isNull(tablaOrdenes.shopifyCancelledAt)
    );

    const totalOrdersRes = await baseDatos
      .select({ count: count() })
      .from(tablaOrdenes)
      .where(range);

    const totalSalesRes = await baseDatos
      .select({
        sum: sql<number>`COALESCE(SUM(${tablaOrdenes.totalAmount}),0)`,
      })
      .from(tablaOrdenes)
      .where(range);

    const unmanagedRes = await baseDatos
      .select({ count: count() })
      .from(tablaOrdenes)
      .where(and(
        sql`LOWER(COALESCE(${tablaOrdenes.fulfillmentStatus}, '')) IN ('', 'unfulfilled')`,
        range
      ));

    const managedRes = await baseDatos
      .select({ count: count() })
      .from(tablaOrdenes)
      .where(and(
        sql`LOWER(COALESCE(${tablaOrdenes.fulfillmentStatus}, '')) = 'fulfilled'`,
        range
      ));

    // Usar shop_id como equivalente a channel para datos reales
    const byChannelRes = await baseDatos
      .select({
        channelId: tablaOrdenes.shopId,
        channelName: sql<string>`CASE 
          WHEN ${tablaOrdenes.shopId} = 1 THEN 'WordWide'
          WHEN ${tablaOrdenes.shopId} = 2 THEN 'CrediTienda'
          ELSE 'Tienda ' || ${tablaOrdenes.shopId}::text
        END`,
        count: sql<number>`COUNT(*)`,
      })
      .from(tablaOrdenes)
      .where(range)
      .groupBy(tablaOrdenes.shopId);

    const byShopRes = await baseDatos
      .select({
        shopId: tablaOrdenes.shopId,
        count: sql<number>`COUNT(*)`,
      })
      .from(tablaOrdenes)
      .where(range)
      .groupBy(tablaOrdenes.shopId);

    return {
      totalOrders: Number(totalOrdersRes[0]?.count ?? 0),
      totalSales: Number(totalSalesRes[0]?.sum ?? 0),
      unmanaged: Number(unmanagedRes[0]?.count ?? 0),
      managed: Number(managedRes[0]?.count ?? 0),
      byChannel: byChannelRes.map((r) => ({
        channelId: Number(r.channelId ?? 0),
        channelName: r.channelName ?? "",
        count: Number(r.count ?? 0),
      })),
      byShop: byShopRes.map((r) => ({
        shopId: Number(r.shopId ?? 0),
        shopName: null,
        count: Number(r.count ?? 0),
      })),
    };
  }

  //============TOP SKU EN UN RANGO DE FECHAS=============
  // TOP SKUs en un rango de fechas
  async getTopSkusRange(
    from: Date,
    to: Date,
    limit = 5
  ): Promise<Array<{ sku: string | null; totalQty: number; revenue: number }>> {
    const range = and(
      gte(tablaOrdenes.shopifyCreatedAt, from),
      lte(tablaOrdenes.shopifyCreatedAt, to),
      isNotNull(tablaOrdenes.shopifyCreatedAt),
      isNull(tablaOrdenes.shopifyCancelledAt)
    );

    // Unimos order_items con orders para filtrar por fechas de la orden
    const rows = await baseDatos
      .select({
        sku: orderItems.sku, // tu "SKU interno"
        totalQty: sql<number>`COALESCE(SUM(${orderItems.quantity}), 0)`,
        revenue: sql<number>`COALESCE(SUM(${orderItems.quantity} * COALESCE(${orderItems.price}, 0)), 0)`,
      })
      .from(orderItems)
      .innerJoin(tablaOrdenes, eq(tablaOrdenes.id, orderItems.orderId))
      .where(range)
      .groupBy(orderItems.sku)
      .orderBy(sql`COALESCE(SUM(${orderItems.quantity}), 0) DESC`)
      .limit(limit);

    return rows.map(r => ({
      sku: r.sku ?? null,
      totalQty: Number(r.totalQty ?? 0),
      revenue: Number(r.revenue ?? 0),
    }));
  }



  /** Obtiene órdenes del día actual. */
  async getTodayOrders(): Promise<{ count: number; totalAmount: number }> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const result = await baseDatos.execute(sql`
        SELECT 
          COUNT(*) as count,
          COALESCE(SUM(CAST(total_amount AS NUMERIC)), 0) as total_amount
        FROM orders 
        WHERE shopify_created_at >= ${today.toISOString()} 
          AND shopify_created_at < ${tomorrow.toISOString()}
      `);

      const stats = result.rows[0] as any;
      return {
        count: Number(stats.count) || 0,
        totalAmount: Number(stats.total_amount) || 0,
      };
    } catch (error) {
      console.error("Error getting today orders:", error);
      return { count: 0, totalAmount: 0 };
    }
  }

  /** Obtiene datos de órdenes por día de la semana para gráfico. */
  // storage.ts
  async getOrdersByWeekday(weekOffset: number = 0): Promise<Array<{ day: string; count: number }>> {
    try {
      // NOTA: todo el cálculo de fechas lo hacemos en SQL con la zona horaria de CDMX
      const result = await baseDatos.execute(sql`
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


      // Mapeo fijo para que salgan siempre los 7 días, aun si no hay datos
      const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      const data = dayNames.map((day, index) => {
        const found = result.rows.find((row: any) => Number(row.dow) === index);
        return { day, count: found ? Number(found.count) : 0 };
      });

      return data;
    } catch (error) {
      console.error("Error getting orders by weekday:", error);
      return [];
    }
  }



  /** Obtiene ventas por mes para gráfico. */
  async getSalesByMonth(): Promise<Array<{ month: string; sales: number }>> {
    try {
      const result = await baseDatos.execute(sql`
        SELECT 
          TO_CHAR(shopify_created_at, 'YYYY-MM') as month,
          COALESCE(SUM(CAST(total_amount AS NUMERIC)), 0) as sales
        FROM orders 
        WHERE shopify_created_at >= CURRENT_DATE - INTERVAL '12 months'
        GROUP BY TO_CHAR(shopify_created_at, 'YYYY-MM')
        ORDER BY month
      `);

      return result.rows.map((row: any) => ({
        month: row.month || '',
        sales: Number(row.sales) || 0
      }));
    } catch (error) {
      console.error("Error getting sales by month:", error);
      return [];
    }
  }

  // EXPRESSPL-INTEGRATION: Implementación de métodos para generar guías

  /** Obtiene una orden por ID para generación de guías. */
  async getOrderById(orderId: number): Promise<Orden | undefined> {
    try {
      const [order] = await baseDatos
        .select()
        .from(tablaOrdenes)
        .where(eq(tablaOrdenes.id, Number(orderId)))
        .limit(1);
      return order;
    } catch (error) {
      console.error("Error getting order by ID:", error);
      return undefined;
    }
  }

  /** Obtiene los items de una orden para calcular dimensiones y cantidad (EXPRESSPL). */
  async getOrderItemsForShipping(orderId: number): Promise<ItemOrden[]> {
    try {
      const items = await baseDatos
        .select()
        .from(tablaItemsOrden)
        .where(eq(tablaItemsOrden.orderId, Number(orderId)));
      return items;
    } catch (error) {
      console.error("Error getting order items for shipping:", error);
      return [];
    }
  }

  /** Obtiene un producto del catálogo por SKU interno para dimensiones. */
  async getCatalogoBySkuInterno(sku: string): Promise<ProductoCatalogo | undefined> {
    try {
      const [producto] = await baseDatos
        .select()
        .from(tablaProductosCatalogo)
        .where(eq(tablaProductosCatalogo.sku_interno, sku))
        .limit(1);
      return producto;
    } catch (error) {
      console.error("Error getting catalog product by SKU:", error);
      return undefined;
    }
  }

  // ==== CATÁLOGO DE PRODUCTOS ====

  /** Obtiene productos paginados con filtros. */
  async getProductsPaginated(params: {
    page: number;
    pageSize: number;
    search?: string;
    categoria?: string;
    activo?: boolean;
  }): Promise<{ rows: any[]; total: number; page: number; pageSize: number }> {
    const { page, pageSize, search, categoria, activo } = params;

    try {
      const conds: any[] = [];

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

      // Comentar filtros por campos que no existen en la tabla products
      // if (categoria) {
      //   conds.push(eq(tablaProductos.categoria, categoria));
      // }

      // if (activo !== undefined) {
      //   conds.push(eq(tablaProductos.activo, activo));
      // }

      const whereClause = conds.length > 0 ? and(...conds) : undefined;
      const offset = Math.max(0, (page - 1) * pageSize);

      // Obtener productos
      const productos = await baseDatos
        .select()
        .from(tablaProductos)
        .where(whereClause)
        .orderBy(desc(tablaProductos.updatedAt))
        .limit(pageSize)
        .offset(offset);

      // Contar total
      const totalResult = await baseDatos
        .select({ count: count() })
        .from(tablaProductos)
        .where(whereClause);

      const total = Number(totalResult[0]?.count ?? 0);

      return {
        rows: productos.map(p => ({
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
  async getProductCategories(): Promise<string[]> {
    try {
      // Comentar hasta implementar campo categoria en products
      const result = await baseDatos
        .selectDistinct({ productType: tablaProductos.productType })
        .from(tablaProductos)
        .where(isNotNull(tablaProductos.productType));

      return result
        .map(r => r.productType)
        .filter(Boolean)
        .sort() as string[];
    } catch (error) {
      console.error("Error getting product categories:", error);
      return [];
    }
  }



  /** Elimina un producto Shopify. */
  async deleteProduct(id: number): Promise<void> {
    await baseDatos
      .delete(tablaProductos)
      .where(eq(tablaProductos.id, id));
  }

  /** Crea tickets masivos y actualiza fulfillment_status a fulfilled */
  async createBulkTicketsAndUpdateStatus(orderIds: (string | number)[], notes?: string): Promise<{
    tickets: Ticket[];
    updated: number;
  }> {
    try {
      const tickets: Ticket[] = [];
      let updated = 0;

      for (const orderId of orderIds) {
        const numericOrderId = typeof orderId === 'string' ? parseInt(orderId) : orderId;

        // Crear ticket
        const numeroTicket = await this.getNextTicketNumber();
        const ticket = await this.createTicket({
          orderId: Number(numericOrderId) as any,
          status: 'open',
          notes: notes || `Ticket creado automáticamente para orden ${numericOrderId}`
        });

        tickets.push(ticket);

        // Actualizar orden a fulfilled
        await this.updateOrder(numericOrderId, {
          fulfillmentStatus: 'fulfilled'
        });

        updated++;
      }

      return { tickets, updated };
    } catch (error) {
      console.error("Error en createBulkTicketsAndUpdateStatus:", error);
      throw error;
    }
  }

  /** Obtiene órdenes con items para exportación */
  async getOrdersWithItemsForExport(filters: any): Promise<any[]> {
    try {
      const result = await baseDatos.execute(sql`
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
        ${filters?.statusFilter === 'managed' ? sql`AND LOWER(COALESCE(o.fulfillment_status, '')) = 'fulfilled'` : sql``}
        ${filters?.statusFilter === 'unmanaged' ? sql`AND LOWER(COALESCE(o.fulfillment_status, '')) IN ('', 'unfulfilled')` : sql``}
        ${filters?.channelId ? sql`AND o.shop_id = ${filters.channelId}` : sql``}
        GROUP BY o.id, o.order_id, o.customer_name, o.customer_email, o.total_amount, 
                 o.financial_status, o.fulfillment_status, o.shopify_created_at, o.shop_id
        ORDER BY o.shopify_created_at DESC NULLS LAST, o.id DESC
        LIMIT 1000
      `);

      return result.rows.map((row: any) => ({
        ...row,
        items: typeof row.items === 'string' ? JSON.parse(row.items) : row.items
      }));
    } catch (error) {
      console.error("Error getting orders with items for export:", error);
      return [];
    }
  }

  // ==== ÓRDENES PAGINADAS ====
  async getOrdersPaginated(params: {
    statusFilter: "unmanaged" | "managed" | "all";
    channelId?: number;
    page: number;
    pageSize: number;
    search?: string;
    searchType?: "all" | "sku" | "customer" | "product";
    sortField?: string;
    sortOrder?: "asc" | "desc";
    brand?: string;
    stockState?: "out" | "apartar" | "ok";
  }): Promise<{ rows: any[]; total: number; page: number; pageSize: number }> {
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
      stockState,
    } = params;

    const conds: any[] = [];

    // Estado
    if (statusFilter === "unmanaged") {
      conds.push(sql`LOWER(COALESCE(o.fulfillment_status, '')) IN ('', 'unfulfilled')`);
    } else if (statusFilter === "managed") {
      conds.push(sql`LOWER(COALESCE(o.fulfillment_status, '')) = 'fulfilled'`);
    } else if (statusFilter === ("cancelled" as any) || statusFilter === ("canceladas" as any)) {
      conds.push(sql`LOWER(COALESCE(o.fulfillment_status, '')) = 'restocked'`);
    }

    // Canal
    if (channelId !== undefined && channelId !== null) {
      // usa shop_id como ya lo hacías
      conds.push(sql`o.shop_id = ${channelId}`);
    }

    // Filtro por marca (union de vendor y marca catálogo)
    if (brand && brand.trim() !== "") {
      const b = brand.toLowerCase();
      conds.push(sql`(
        LOWER(COALESCE(p.vendor, '')) = ${b} OR
        LOWER(COALESCE(cp.marca, '')) = ${b}
      )`);
    }

    // Filtro por estado de stock
    if (stockState) {
      if (stockState === "out") {
        conds.push(sql`COALESCE(cp.stock, -1) = 0`);
      } else if (stockState === "apartar") {
        conds.push(sql`COALESCE(cp.stock, 0) BETWEEN 1 AND 15`);
      } else if (stockState === "ok") {
        conds.push(sql`COALESCE(cp.stock, 0) > 15`);
      }
    }

    // Búsqueda
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

    const whereClause = conds.length
      ? sql`${conds.reduce((acc, cond, i) => (i === 0 ? cond : sql`${acc} AND ${cond}`))}`
      : undefined;

    const offset = Math.max(0, (page - 1) * pageSize);
    // ✅ Whitelist de columnas para ORDER BY
    const sortMap: Record<string, string> = {
      name: `COALESCE(o.name, o.order_id, '')`,
      createdAt: `COALESCE(o.shopify_created_at, o.created_at)`,
      totalAmount: `COALESCE(o.total_amount, 0)`,
    };
    const sortCol = sortField && sortMap[sortField] ? sortMap[sortField] : `COALESCE(o.shopify_created_at, o.created_at)`;
    const sortDir = sortOrder === "asc" ? sql`ASC` : sql`DESC`;
    const orderSql = sortField
      ? sql`ORDER BY ${sql.raw(sortCol)} ${sortDir}`
      : sql`ORDER BY o.shopify_created_at DESC NULLS LAST, o.id DESC`;


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
            'catalogBrand', cp.marca,
            'stockFromCatalog', cp.stock,
            'stockState', CASE 
              WHEN cp.stock IS NULL THEN 'Desconocido'
              WHEN cp.stock = 0 THEN 'Stock Out'
              WHEN cp.stock <= 15 THEN 'Apartar'
              ELSE 'OK'
            END
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
    LEFT JOIN catalogo_productos cp ON cp.sku_interno = oi.sku
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
      baseDatos.execute(baseQuery),
      baseDatos.execute(countQuery)
    ]);

    const total = Number(totalRes.rows[0]?.count ?? 0);

    return {
      rows: rows.rows as any[],
      page,
      pageSize,
      total
    };
  }


  // Items de una orden
  async getOrderItems(orderIdParam: unknown) {
    try {
      const idNum = Number(orderIdParam);
      if (!Number.isInteger(idNum) || idNum <= 0) return [];

      const idBig = Number(idNum);
      console.log(`[DEBUG] Buscando items para order ID: ${idNum}`);

      // Primero obtenemos los items básicos
      const rawItems = await baseDatos
        .select()
        .from(tablaItemsOrden)
        .where(eq(tablaItemsOrden.orderId, idBig));

      console.log(`[DEBUG] Items encontrados:`, rawItems);

      if (rawItems.length === 0) {
        console.log(`[DEBUG] No se encontraron items para order ${idNum}`);
        return [];
      }

      // Ahora hacemos el join con el catálogo
      const items = await baseDatos
        .select({
          id: tablaItemsOrden.id,
          sku: tablaItemsOrden.sku,
          quantity: tablaItemsOrden.quantity,
          price: tablaItemsOrden.price,
          shopifyProductId: tablaItemsOrden.shopifyProductId,
          shopifyVariantId: tablaItemsOrden.shopifyVariantId,
          productName: tablaProductosCatalogo.nombre_producto,
          skuInterno: tablaProductosCatalogo.sku_interno,
          skuExterno: tablaItemsOrden.sku,
        })
        .from(tablaItemsOrden)
        .leftJoin(
          tablaProductosCatalogo,
          eq(tablaProductosCatalogo.sku, tablaItemsOrden.sku)
        )
        .where(eq(tablaItemsOrden.orderId, idBig))
        .orderBy(asc(tablaItemsOrden.id));

      console.log(`[DEBUG] Items con join:`, items);

      // Normaliza los datos
      const normalized = items.map((it) => ({
        ...it,
        productName: it.productName?.trim() || `Producto ${it.sku || 'sin SKU'}`,
        skuInterno: it.skuInterno || null,
        skuExterno: it.skuExterno || it.sku || null,
      }));

      console.log(`[DEBUG] Items normalizados:`, normalized);
      return normalized;
    } catch (e) {
      console.error("[ERROR] Error getting order items:", e);
      return [];
    }
  }


  async getCatalogProductsPaginated(page: number, pageSize: number) {
    const offset = (page - 1) * pageSize;
    const rows = await baseDatos
      .select()
      .from(tablaProductosCatalogo)
      .orderBy(asc(tablaProductosCatalogo.nombre_producto))
      .limit(pageSize)
      .offset(offset);
    const totalRes = await baseDatos
      .select({ count: count() })
      .from(tablaProductosCatalogo);
    return { rows, total: Number(totalRes[0]?.count ?? 0), page, pageSize };
  }

  async getExternalProductsPaginated(page: number, pageSize: number) {
    // Removed: external_products table is not part of current schema
    return { rows: [], total: 0, page, pageSize };
  }

  async getOrdersForExport(filters: ExportFilters): Promise<any[]> {
    const {
      selectedIds,
      statusFilter = "unmanaged",
      channelId,
      search,
      searchType = "all",
      page,
      pageSize,
      sortField,
      sortOrder = "desc",
    } = filters;

    // Si hay selección explícita, ignora filtros y trae solo esos IDs.
    if (selectedIds?.length) {
      const ids = selectedIds.map((id) => BigInt(id as any));
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
      const rows = await baseDatos.execute(q);
      return rows.rows as any[];
    }

    // Si no hay selección, reusar la paginación "visible"
    const resp = await this.getOrdersPaginated({
      statusFilter,
      channelId,
      page: page ?? 1,
      pageSize: pageSize ?? 1000,
      search,
      searchType,
      sortField,
      sortOrder,
    });

    // Normaliza a columnas exportables esperadas por el endpoint
    return resp.rows.map((r: any) => ({
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
      skus: r.skus,
    }));
  }


  // ===== Importación por filas =====
  private parseNumber(v: unknown): number | null {
    if (v == null || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  private parseDate(v: unknown): Date | null {
    if (!v) return null;
    const d = new Date(String(v));
    return isNaN(d.getTime()) ? null : d;
  }
  private normalizeRow(r: ImportRow) {
    const get = (k: string) => {
      const key = Object.keys(r).find((kk) => kk.toLowerCase() === k.toLowerCase());
      return key ? r[key] : null;
    };

    const rawTags = get("tags");
    const tags = Array.isArray(rawTags)
      ? rawTags
      : typeof rawTags === "string" && rawTags
        ? rawTags.split(",").map((s) => s.trim()).filter(Boolean)
        : null;

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
      skus: get("skus") ? String(get("skus")).split(",").map((s: string) => s.trim()).filter(Boolean) : null,
    };
  }
  private validateRow(n: ReturnType<DatabaseStorage["normalizeRow"]>) {
    if (n.shopId == null || String(n.shopId).trim() === "") {
      return { ok: false as const, field: "shopId", message: "shopId es obligatorio" };
    }
    if (n.orderId == null || String(n.orderId).trim() === "") {
      return { ok: false as const, field: "orderId", message: "orderId es obligatorio" };
    }
    if (n.customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(n.customerEmail))) {
      return { ok: false as const, field: "customerEmail", message: "Formato de email inválido" };
    }
    if (n.subtotalPrice != null && typeof n.subtotalPrice !== "number") {
      return { ok: false as const, field: "subtotalPrice", message: "subtotalPrice no es numérico" };
    }
    if (n.totalAmount != null && typeof n.totalAmount !== "number") {
      return { ok: false as const, field: "totalAmount", message: "totalAmount no es numérico" };
    }
    return { ok: true as const };
  }

  async importOrdersFromRows(rows: Array<Record<string, unknown>>) {
    // Normalizadores reutilizables
    const toDecimal = (v: unknown) =>
      v == null || v === "" ? null : (typeof v === "number" ? v : Number(String(v).replace(/,/g, "")));
    const toDate = (v: unknown) => (v ? new Date(String(v)) : null);
    const toArray = (v: unknown) =>
      Array.isArray(v) ? v : (typeof v === "string" ? v.split(",").map(s => s.trim()).filter(Boolean) : null);

    type Group = {
      shopId: number;
      orderId: string;
      rows: number[]; // índices de filas que pertenecen al grupo
      payload: Partial<InsertarOrden>;
      items: Array<{
        sku: string;
        quantity: number;
        price?: number | null;
        title?: string | null;
      }>;
    };

    const results: Array<{
      rowIndex: number;
      status: "ok" | "skipped" | "error";
      message?: string;
      field?: string;
      value?: unknown;
      orderId?: number | string;
    }> = [];

    const groups = new Map<string, Group>();
    const mark = (rowIndex: number, status: "ok" | "skipped" | "error", extra: Partial<typeof results[number]> = {}) => {
      results.push({ rowIndex, status, ...extra } as any);
    };

    // 1) Agrupar por (shopId, orderId)
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
          message: "Valores inválidos en shopId/orderId",
          field: !Number.isInteger(shopId) ? "shopId" : "orderId",
          value: !Number.isInteger(shopId) ? shopIdRaw : orderIdRaw,
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
            orderId,
          },
          items: [],
        });
      }
      const g = groups.get(key)!;
      g.rows.push(i);

      // Merge payload (primer valor no nulo gana)
      const mergeField = (k: keyof InsertarOrden, v: unknown) => {
        if (v === undefined) return;
        const cur = (g.payload as any)[k];
        if (cur === undefined || cur === null) (g.payload as any)[k] = v as any;
      };

      mergeField("name", (row["name"] as string) ?? null);
      mergeField("orderNumber", (row["orderNumber"] as string) ?? null);
      mergeField("customerName", (row["customerName"] as string) ?? null);
      mergeField("customerEmail", (row["customerEmail"] as string) ?? null);
      mergeField("subtotalPrice", toDecimal(row["subtotalPrice"]) as any);
      mergeField("totalAmount", toDecimal(row["totalAmount"]) as any);
      mergeField("currency", (row["currency"] as string) ?? null);
      mergeField("financialStatus", (row["financialStatus"] as string) ?? null);
      mergeField("fulfillmentStatus", (row["fulfillmentStatus"] as string) ?? null);
      mergeField("tags", toArray(row["tags"]) as any);
      mergeField("createdAt", toDate(row["createdAt"]) ?? undefined);
      mergeField("shopifyCreatedAt", toDate(row["shopifyCreatedAt"]) ?? undefined);

      // Items: Modo A (JSON en 'items')
      if (row.hasOwnProperty("items") && row["items"] != null && String(row["items"]).trim() !== "") {
        try {
          const arr = Array.isArray(row["items"]) ? (row["items"] as any[]) : JSON.parse(String(row["items"])) as any[];
          if (Array.isArray(arr)) {
            for (const it of arr) {
              const sku = String(it?.sku ?? "").trim();
              const qty = Number(it?.quantity ?? it?.qty ?? 0);
              if (!sku || !Number.isFinite(qty) || qty <= 0) continue; // valida mínimos
              const price = toDecimal(it?.price) as number | null;
              const title = (it?.title != null ? String(it.title) : null) as string | null;
              g.items.push({ sku, quantity: qty, price: price as any, title });
            }
          }
        } catch (e) {
          mark(i, "error", { message: "items JSON inválido" });
        }
      }

      // Items: Modo B (columnas sku, quantity, price, title)
      if (row.hasOwnProperty("sku") || row.hasOwnProperty("quantity")) {
        const sku = (row["sku"] != null ? String(row["sku"]) : "").trim();
        const qty = Number(row["quantity"] ?? 0);
        if (sku && Number.isFinite(qty) && qty > 0) {
          const price = toDecimal(row["price"]) as number | null;
          const title = (row["title"] != null ? String(row["title"]) : null) as string | null;
          g.items.push({ sku, quantity: qty, price: price as any, title });
        }
      }
    }

    let ok = 0, skipped = results.filter(r => r.status === "skipped").length, errors = results.filter(r => r.status === "error").length;

    // 2) Procesar cada grupo (transacción por orden: upsert y sincronizar ítems)
    for (const [, g] of groups) {
      try {
        const existente = await this.getOrderByShopifyId(g.orderId, g.shopId);
        let orderPk: number;
        if (existente) {
          await this.updateOrder(Number(existente.id), g.payload as any);
          orderPk = Number(existente.id);
        } else {
          const created = await this.createOrder(g.payload as InsertarOrden);
          orderPk = Number(created.id);
        }

        // Sincronizar ítems: borrar e insertar (idempotente a nivel de import)
        const run = async () => {
          await baseDatos.delete(tablaItemsOrden).where(eq(tablaItemsOrden.orderId as any, orderPk as any));
          if (g.items.length > 0) {
            const values = g.items.map((it) => ({
              orderId: orderPk,
              sku: it.sku,
              quantity: it.quantity,
              price: it.price as any,
              title: it.title ?? null,
            })) as any[];
            await baseDatos.insert(tablaItemsOrden).values(values);
          }
        };

        // Usa transacción si está disponible
        const txAny = (baseDatos as any);
        if (typeof txAny.transaction === 'function') {
          await txAny.transaction(async () => { await run(); });
        } else {
          await run();
        }

        ok += g.rows.length;
        for (const idx of g.rows) {
          // Si ya se marcó error por items JSON inválido no sobreescribir
          if (!results.find(r => r.rowIndex === idx)) {
            mark(idx, "ok", { orderId: g.orderId });
          }
        }
      } catch (e: any) {
        errors += g.rows.length;
        for (const idx of g.rows) {
          mark(idx, "error", { message: e?.message || "Error al guardar orden/ítems", orderId: g.orderId });
        }
      }
    }

    return {
      results,
      summary: { processed: rows.length, ok, skipped, errors },
    };
  }



}

// Instancia lista para usar (compatibilidad y alias en español)
export const storage = new DatabaseStorage();
export const almacenamiento = storage;

// Actualización segura de campos de cancelación (opcional según columnas existentes)
export async function markOrderCancelledSafe(idNum: number, payload: {
  cancelledAt?: string | Date | null; // Shopify order.cancelledAt (ISO) -> Date
  cancelReason?: string | null;
  staffNote?: string | null;   // map to orderNote if exists
  displayFinancialStatus?: string | null;
  displayFulfillmentStatus?: string | null;
}) {
  try {
    const updateData: Record<string, any> = {};

    // Normaliza cancelledAt -> Date | null
    let cancelledAtDate: Date | null | undefined = undefined;
    if (typeof payload.cancelledAt === "string") {
      const d = new Date(payload.cancelledAt);
      cancelledAtDate = isNaN(d.getTime()) ? null : d;
    } else if (payload.cancelledAt instanceof Date) {
      cancelledAtDate = isNaN(payload.cancelledAt.getTime()) ? null : payload.cancelledAt;
    } else if (payload.cancelledAt === null) {
      cancelledAtDate = null;
    }

    // Ajusta los nombres de columnas a tu esquema real:
    // Si tu columna se llama "shopifyCancelledAt" (timestamp), guarda el Date.
    if (typeof payload.cancelledAt !== "undefined") updateData["shopifyCancelledAt"] = cancelledAtDate;

    if (typeof payload.cancelReason !== "undefined") updateData["cancelReason"] = payload.cancelReason ?? null;
    if (typeof payload.staffNote !== "undefined") updateData["orderNote"] = payload.staffNote ?? null;
    if (typeof payload.displayFinancialStatus !== "undefined") updateData["financialStatus"] = payload.displayFinancialStatus ?? null;
    if (typeof payload.displayFulfillmentStatus !== "undefined") updateData["fulfillmentStatus"] = payload.displayFulfillmentStatus ?? null;

    if (Object.keys(updateData).length === 0) {
      return { ok: true, skipped: true } as const;
    }

    await baseDatos
      .update(tablaOrdenes)
      .set(updateData as any)
      .where(eq(tablaOrdenes.id, idNum as any));

    return { ok: true } as const;
  } catch (e) {
    console.warn("[cancel-order] markOrderCancelledSafe skipped or failed:", (e as any)?.message);
    return { ok: true, warning: "update skipped" } as const;
  }
}


