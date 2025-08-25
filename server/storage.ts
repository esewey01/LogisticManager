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
  orders as tablaOrdenes,
  tickets as tablaTickets,
  shippingRules as tablaReglasEnvio,
  notes as tablaNotas,
  products as tablaProductos,
  variants as tablaVariantes,
  orderItems as tablaItemsOrden,
  productComboItems as tablaItemsCombo,
  externalProducts as tablaProductosExternos,
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
  type Order as Orden,
  type InsertOrder as InsertarOrden,
  type Ticket as Ticket,
  type InsertTicket as InsertarTicket,
  type ShippingRule as ReglaEnvio,
  type InsertShippingRule as InsertarReglaEnvio,
  type Note as Nota,
  type InsertNote as InsertarNota,
  type DashboardMetrics,
  type Product as Producto,
  type InsertProduct as InsertarProducto,
  type Variant as Variante,
  type InsertVariant as InsertarVariante,
  type OrderItem as ItemOrden,
  type InsertOrderItem as InsertarItemOrden,
  type ProductComboItem as ItemCombo,
  type InsertProductComboItem as InsertarItemCombo,
  type ExternalProduct as ProductoExterno,
  type InsertExternalProduct as InsertarProductoExterno,
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
} from "drizzle-orm";
//Shopify fulfillment
import { fulfillOrderInShopify } from "./shopifyFulfillment";

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
  getOrdersByChannel(): Promise<
    { channelCode: string; channelName: string; orders: number }[]
  >;

  // Tickets
  getTickets(): Promise<Ticket[]>;
  getTicket(id: number): Promise<Ticket | undefined>;
  createTicket(ticket: InsertarTicket): Promise<Ticket>;
  updateTicket(id: number, updates: Partial<InsertarTicket>): Promise<Ticket>;
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

  /** 
   * Obtiene una orden por ID con detalles completos 
   * Corrección: Manejo correcto de bigint IDs y campos de la DB real
   */
  async getOrder(idParam: unknown) {
    try {
      const idNum = Number(idParam);
      if (!Number.isInteger(idNum) || idNum <= 0) return undefined;

      const idBig = BigInt(idNum); // ✅ nunca BigInt(NaN)
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
      .where(eq(tablaOrdenes.id, BigInt(id)))
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

  async getOrdersByChannel(): Promise<
    { channelCode: string; channelName: string; orders: number }[]
  > {
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
    WHERE o.created_at >= NOW() - INTERVAL '30 days'
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
    const result = await baseDatos.execute(sql`
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

        // 3) Si Shopify fue exitoso, crear ticket y actualizar BD local
        const ticketTx = await baseDatos.transaction(async (tx) => {
          const [ticketNuevo] = await tx.insert(tablaTickets).values({
            ticketNumber: sql`nextval('public.ticket_number_seq')::text`,
            orderId: BigInt(orderIdNum),
            status: "open",
            notes: notes || `Ticket creado masivamente para orden ${shopifyOrderId}`,
          }).returning();

          // Actualizar fulfillment status en BD local
          await tx.update(tablaOrdenes)
            .set({
              fulfillmentStatus: "fulfilled",
              shopifyUpdatedAt: new Date()
            })
            .where(eq(tablaOrdenes.id, BigInt(orderIdNum)));

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
      .where(eq(tablaOrdenes.id, BigInt(orderId)));

    if (!orden) throw new Error(`Orden ${orderId} no encontrada`);

    const shopifyOrderId = orden.orderId;
    if (!shopifyOrderId) throw new Error(`La orden ${orderId} no tiene order_id de Shopify`);

    const storeNumber = orden.shopId ?? parseInt(process.env.DEFAULT_SHOPIFY_STORE || "1", 10);

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
            orderId: BigInt(orderId),
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
          .where(eq(tablaOrdenes.id, BigInt(orderId)));

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
        .where(eq(tablaOrdenes.id, typeof orderPk === 'bigint' ? orderPk : BigInt(orderPk)));
    });

    return { ok: true, changedLocal: true, cancelledRemote };
  }



  ///==== REGLAS DE ENVÍO ====

  /** Devuelve reglas de envío activas. */
  async getShippingRules(): Promise<ReglaEnvio[]> {
    return await baseDatos
      .select()
      .from(tablaReglasEnvio)
      .where(eq(tablaReglasEnvio.isActive, true));
  }

  /** Crea una regla de envío. */
  async createShippingRule(regla: InsertarReglaEnvio): Promise<ReglaEnvio> {
    const [nuevaRegla] = await baseDatos
      .insert(tablaReglasEnvio)
      .values(regla)
      .returning();
    return nuevaRegla;
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
          orderId: BigInt(numericOrderId),
          ticketNumber: numeroTicket,
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
        ORDER BY o.shopify_created_at DESC
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
    } = params;

    const conds: any[] = [];

    // Estado
    if (statusFilter === "unmanaged") {
      conds.push(sql`LOWER(COALESCE(o.fulfillment_status, '')) IN ('', 'unfulfilled')`);
    } else if (statusFilter === "managed") {
      conds.push(sql`LOWER(COALESCE(o.fulfillment_status, '')) = 'fulfilled'`);
    }

    // Canal
    if (channelId !== undefined && channelId !== null) {
      // usa shop_id como ya lo hacías
      conds.push(sql`o.shop_id = ${channelId}`);
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

      const idBig = BigInt(idNum);
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
    const offset = (page - 1) * pageSize;
    const rows = await baseDatos
      .select()
      .from(tablaProductosExternos)
      .orderBy(asc(tablaProductosExternos.prod))
      .limit(pageSize)
      .offset(offset);
    const totalRes = await baseDatos
      .select({ count: count() })
      .from(tablaProductosExternos);
    return { rows, total: Number(totalRes[0]?.count ?? 0), page, pageSize };
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
  const results: Array<{
    rowIndex: number;
    status: "ok" | "skipped" | "error";
    message?: string;
    field?: string;
    value?: unknown;
    orderId?: number | string;
  }> = [];

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
          message: "Faltan columnas obligatorias: shopId y/o orderId",
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
          message: "Valores inválidos en shopId/orderId",
          field: !Number.isInteger(shopId) ? "shopId" : "orderId",
          value: !Number.isInteger(shopId) ? shopIdRaw : orderIdRaw,
        });
        continue;
      }

      // Buscar si existe
      const existente = await this.getOrderByShopifyId(orderId, shopId);

      // Normalizaciones opcionales
      const toDecimal = (v: unknown) =>
        v == null || v === "" ? null : (typeof v === "number" ? v : Number(String(v).replace(/,/g, "")));
      const toDate = (v: unknown) => (v ? new Date(String(v)) : null);
      const toArray = (v: unknown) =>
        Array.isArray(v) ? v : (typeof v === "string" ? v.split(",").map(s => s.trim()).filter(Boolean) : null);

      const payload: Partial<InsertarOrden> = {
        shopId,
        orderId,
        name: (row["name"] as string) ?? null,
        orderNumber: (row["orderNumber"] as string) ?? null,
        customerName: (row["customerName"] as string) ?? null,
        customerEmail: (row["customerEmail"] as string) ?? null,
        subtotalPrice: toDecimal(row["subtotalPrice"]) as any,
        totalAmount: toDecimal(row["totalAmount"]) as any,
        currency: (row["currency"] as string) ?? null,
        financialStatus: (row["financialStatus"] as string) ?? null,
        fulfillmentStatus: (row["fulfillmentStatus"] as string) ?? null,
        tags: toArray(row["tags"]) as any,
        createdAt: toDate(row["createdAt"]) ?? undefined,
        shopifyCreatedAt: toDate(row["shopifyCreatedAt"]) ?? undefined,
      };

      if (existente) {
        // update
        await this.updateOrder(Number(existente.id), payload as any);
      } else {
        // create
        await this.createOrder(payload as InsertarOrden);
      }

      ok++;
      results.push({ rowIndex: i, status: "ok", orderId });

    } catch (e: any) {
      errors++;
      results.push({
        rowIndex: i,
        status: "error",
        message: e?.message || "Error no identificado",
      });
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
