// Capa de acceso a datos (Data Access Layer) — Versión comentada en español
// Mantiene compatibilidad exportando `storage` con los mismos métodos
// y agrega alias `almacenamiento` por legibilidad en español.

import {
  // Tablas
  users as tablaUsuarios,
  brands as tablaMarcas,
  catalogProducts as tablaProductosCatalogo,
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
  type CatalogProduct as ProductoCatalogo,
  type InsertCatalogProduct as InsertarProductoCatalogo,
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
  type NoteRow as Nota,
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
  mapOrderUiStatus,
} from "@shared/schema";

import { db as baseDatos } from "./db";
import { eq, and, or, isNull, desc, asc, sql, count, gte, lte } from "drizzle-orm";

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
  createCatalogProduct(product: InsertarProductoCatalogo): Promise<ProductoCatalogo>;
  updateCatalogProduct(id: number, updates: Partial<InsertarProductoCatalogo>): Promise<ProductoCatalogo>;

  // Canales
  getChannels(): Promise<Canal[]>;
  getChannel(id: number): Promise<Canal | undefined>;
  createChannel(channel: InsertarCanal): Promise<Canal>;

  // Paqueterías
  getCarriers(): Promise<Paqueteria[]>;
  getCarrier(id: number): Promise<Paqueteria | undefined>;
  createCarrier(carrier: InsertarPaqueteria): Promise<Paqueteria>;

  // Órdenes
  getOrders(filters?: { channelId?: number; managed?: boolean; hasTicket?: boolean }): Promise<Orden[]>;
  getOrder(id: number): Promise<Orden | undefined>;
  getOrderByShopifyId(shopifyId: string, shopId: number): Promise<Orden | undefined>;
  createOrder(order: InsertarOrden): Promise<Orden>;
  updateOrder(id: number, updates: Partial<InsertarOrden>): Promise<Orden>;
  getOrdersByCustomer(customerName: string): Promise<Orden[]>;
  getOrdersByChannel(): Promise<{ channelCode: string; channelName: string; orders: number }[]>;

  // Tickets
  getTickets(): Promise<Ticket[]>;
  getTicket(id: number): Promise<Ticket | undefined>;
  createTicket(ticket: InsertarTicket): Promise<Ticket>;
  updateTicket(id: number, updates: Partial<InsertarTicket>): Promise<Ticket>;

  // Reglas de envío
  getShippingRules(): Promise<ReglaEnvio[]>;
  createShippingRule(rule: InsertarReglaEnvio): Promise<ReglaEnvio>;

  // Notas
  getNotes(): Promise<Nota[]>;
  createNote(note: InsertarNota): Promise<Nota>;
  updateNote(id: number, updates: Partial<InsertarNota>): Promise<Nota>;
  deleteNote(id: number): Promise<void>;

  // Nuevos métodos Shopify
  createOrderItem(item: InsertarItemOrden): Promise<ItemOrden>;
  getProducts(shopId?: number): Promise<Producto[]>;
  getProduct(id: number): Promise<Producto | undefined>;
  getProductByShopifyId(shopifyId: string, shopId: number): Promise<Producto | undefined>;
  createProduct(product: InsertarProducto): Promise<Producto>;
  updateProduct(id: number, updates: Partial<InsertarProducto>): Promise<Producto>;

  getVariants(productId?: number): Promise<Variante[]>;
  getVariant(id: number): Promise<Variante | undefined>;
  createVariant(variant: InsertarVariante): Promise<Variante>;
  updateVariant(id: number, updates: Partial<InsertarVariante>): Promise<Variante>;

  // Métricas de dashboard
  getDashboardMetrics(): Promise<DashboardMetrics>;

  getOrdersPaginated(params: {
    statusFilter: "unmanaged" | "managed" | "all";
    channelId?: number;
    page: number;
    pageSize: number;
    search?: string;
  }): Promise<{ rows: any[]; total: number; page: number; pageSize: number }>;

  getOrderItems(orderId: number): Promise<any[]>;

  getProductsPaginated(shopId: number, page: number, pageSize: number): Promise<{ rows: any[]; total: number; page: number; pageSize: number }>;
  getCatalogProductsPaginated(page: number, pageSize: number): Promise<{ rows: any[]; total: number; page: number; pageSize: number }>;
  getExternalProductsPaginated(page: number, pageSize: number): Promise<{ rows: any[]; total: number; page: number; pageSize: number }>;
}

/**
 * Implementación concreta utilizando Drizzle ORM y PostgreSQL.
 * Todos los métodos están comentados en español para claridad.
 */
export class DatabaseStorage implements IStorage {
  // ==== USUARIOS ====

  /** Obtiene un usuario por su ID. */
  async getUser(id: number): Promise<Usuario | undefined> {
    const [usuario] = await baseDatos.select().from(tablaUsuarios).where(eq(tablaUsuarios.id, id));
    return usuario;
  }

  /** Busca un usuario por correo electrónico. */
  async getUserByEmail(email: string): Promise<Usuario | undefined> {
    const [usuario] = await baseDatos.select().from(tablaUsuarios).where(eq(tablaUsuarios.email, email));
    return usuario;
  }

  /** Crea un nuevo usuario. */
  async createUser(datos: InsertarUsuario): Promise<Usuario> {
    const [usuario] = await baseDatos.insert(tablaUsuarios).values(datos).returning();
    return usuario;
  }

  /** Actualiza campos de un usuario existente. */
  async updateUser(id: number, updates: Partial<InsertarUsuario>): Promise<Usuario> {
    const [usuario] = await baseDatos
      .update(tablaUsuarios)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(tablaUsuarios.id, id))
      .returning();
    return usuario;
  }

  /** Lista todos los usuarios ordenados por correo. */
  async getAllUsers(): Promise<Usuario[]> {
    return await baseDatos.select().from(tablaUsuarios).orderBy(asc(tablaUsuarios.email));
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
    const [marca] = await baseDatos.select().from(tablaMarcas).where(eq(tablaMarcas.id, id));
    return marca;
  }

  /** Crea una nueva marca. */
  async createBrand(datos: InsertarMarca): Promise<Marca> {
    const [marcaNueva] = await baseDatos.insert(tablaMarcas).values(datos).returning();
    return marcaNueva;
  }

  /** Actualiza una marca. */
  async updateBrand(id: number, updates: Partial<InsertarMarca>): Promise<Marca> {
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
    if (brandId) {
      return await consulta
        .where(eq(tablaProductosCatalogo.brandId, brandId))
        .orderBy(asc(tablaProductosCatalogo.sku));
    }
    return await consulta.orderBy(asc(tablaProductosCatalogo.sku));
  }

  /** Crea un producto de catálogo. */
  async createCatalogProduct(datos: InsertarProductoCatalogo): Promise<ProductoCatalogo> {
    const [productoNuevo] = await baseDatos.insert(tablaProductosCatalogo).values(datos).returning();
    return productoNuevo;
  }

  /** Actualiza un producto de catálogo. */
  async updateCatalogProduct(id: number, updates: Partial<InsertarProductoCatalogo>): Promise<ProductoCatalogo> {
    const [producto] = await baseDatos
      .update(tablaProductosCatalogo)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(tablaProductosCatalogo.id, id))
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
    const [canal] = await baseDatos.select().from(tablaCanales).where(eq(tablaCanales.id, id));
    return canal;
  }

  /** Crea un canal. */
  async createChannel(datos: InsertarCanal): Promise<Canal> {
    const [canalNuevo] = await baseDatos.insert(tablaCanales).values(datos).returning();
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
    const [paq] = await baseDatos.select().from(tablaPaqueterias).where(eq(tablaPaqueterias.id, id));
    return paq;
  }

  /** Crea una paquetería. */
  async createCarrier(datos: InsertarPaqueteria): Promise<Paqueteria> {
    const [paqueteriaNueva] = await baseDatos.insert(tablaPaqueterias).values(datos).returning();
    return paqueteriaNueva;
  }

  // ==== ÓRDENES ====

  /** Lista órdenes con filtros opcionales (canal, gestionada, con ticket). */
  async getOrders(filtros?: { channelId?: number; managed?: boolean; hasTicket?: boolean }): Promise<Orden[]> {
    const condiciones: any[] = [];

    if (filtros?.channelId !== undefined) condiciones.push(eq(tablaOrdenes.channelId, filtros.channelId));
    if (filtros?.managed !== undefined) condiciones.push(eq(tablaOrdenes.isManaged, filtros.managed));
    if (filtros?.hasTicket !== undefined) condiciones.push(eq(tablaOrdenes.hasTicket, filtros.hasTicket));

    if (condiciones.length > 0) {
      return await baseDatos
        .select()
        .from(tablaOrdenes)
        .where(and(...condiciones))
        .orderBy(desc(createdAtEff(tablaOrdenes)))

    }

    return await baseDatos
      .select()
      .from(tablaOrdenes)
      .orderBy(desc(createdAtEff(tablaOrdenes)))

  }


  /** Obtiene una orden por ID. */
  async getOrder(id: number): Promise<Orden | undefined> {
    const [orden] = await baseDatos.select().from(tablaOrdenes).where(eq(tablaOrdenes.id, id));
    return orden;
  }

  /** Crea una orden. */
  async createOrder(datos: InsertarOrden): Promise<Orden> {
    const [ordenNueva] = await baseDatos.insert(tablaOrdenes).values(datos).returning();
    return ordenNueva;
  }

  /** Actualiza una orden. */
  async updateOrder(id: number, updates: Partial<InsertarOrden>): Promise<Orden> {
    const [orden] = await baseDatos
      .update(tablaOrdenes)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(tablaOrdenes.id, id))
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

  async getOrdersByChannel(): Promise<{ channelCode: string; channelName: string; orders: number }[]> {
    const result = await baseDatos.execute<{ channel_code: string; channel_name: string; orders: number }>(sql`
    SELECT 
      c.code as channel_code,
      c.name as channel_name,
      COUNT(o.id)::int as orders
    FROM orders o
    JOIN channels c ON o.channel_id = c.id
    WHERE o.created_at >= NOW() - INTERVAL '30 days'
    GROUP BY c.code, c.name
    ORDER BY orders DESC
  `);

    return result.rows.map(row => ({
      channelCode: row.channel_code,
      channelName: row.channel_name,
      orders: row.orders
    }));
  }

  /** Obtiene una orden por ID de Shopify y tienda. */
  async getOrderByShopifyId(shopifyId: string, shopId: number): Promise<Orden | undefined> {
    const [orden] = await baseDatos
      .select()
      .from(tablaOrdenes)
      .where(and(eq(tablaOrdenes.idShopify, shopifyId), eq(tablaOrdenes.shopId, shopId)));
    return orden;
  }

  // ==== TICKETS ====

  /** Lista tickets ordenados por fecha de creación descendente. */
  async getTickets(): Promise<Ticket[]> {
    return await baseDatos.select().from(tablaTickets).orderBy(desc(tablaTickets.createdAt));
  }

  /** Obtiene un ticket por ID. */
  async getTicket(id: number): Promise<Ticket | undefined> {
    const [ticket] = await baseDatos.select().from(tablaTickets).where(eq(tablaTickets.id, id));
    return ticket;
  }

  /** Crea un ticket. */
  async createTicket(datos: InsertarTicket): Promise<Ticket> {
    const [ticketNuevo] = await baseDatos.insert(tablaTickets).values(datos).returning();
    return ticketNuevo;
  }

  /** Actualiza un ticket. */
  async updateTicket(id: number, updates: Partial<InsertarTicket>): Promise<Ticket> {
    const [ticket] = await baseDatos
      .update(tablaTickets)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(tablaTickets.id, id))
      .returning();
    return ticket;
  }

  // ==== REGLAS DE ENVÍO ====

  /** Devuelve reglas de envío activas. */
  async getShippingRules(): Promise<ReglaEnvio[]> {
    return await baseDatos.select().from(tablaReglasEnvio).where(eq(tablaReglasEnvio.isActive, true));
  }

  /** Crea una regla de envío. */
  async createShippingRule(regla: InsertarReglaEnvio): Promise<ReglaEnvio> {
    const [nuevaRegla] = await baseDatos.insert(tablaReglasEnvio).values(regla).returning();
    return nuevaRegla;
  }

  // ==== NOTAS ====

  /** Lista notas; si se pasa userId, filtra por usuario. */
  async getNotes(): Promise<Nota[]> {
    return await baseDatos
      .select()
      .from(tablaNotas)
      .orderBy(desc(tablaNotas.createdAt));
  }

  /** Crea una nota. */
  async createNote(nota: InsertarNota): Promise<Nota> {
    const now = new Date();
    const [nuevaNota] = await baseDatos
      .insert(tablaNotas)
      .values({ ...nota, createdAt: now, updatedAt: now })
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
    const [item] = await baseDatos.insert(tablaItemsOrden).values(datos).returning();
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
    return await baseDatos.select().from(tablaProductos).orderBy(asc(tablaProductos.title));
  }

  /** Obtiene un producto por ID. */
  async getProduct(id: number): Promise<Producto | undefined> {
    const [producto] = await baseDatos.select().from(tablaProductos).where(eq(tablaProductos.id, id));
    return producto;
  }

  /** Obtiene un producto por ID de Shopify y tienda. */
  async getProductByShopifyId(shopifyId: string, shopId: number): Promise<Producto | undefined> {
    const [producto] = await baseDatos
      .select()
      .from(tablaProductos)
      .where(and(eq(tablaProductos.idShopify, shopifyId), eq(tablaProductos.shopId, shopId)));
    return producto;
  }

  /** Crea un producto. */
  async createProduct(datos: InsertarProducto): Promise<Producto> {
    const [producto] = await baseDatos.insert(tablaProductos).values(datos).returning();
    return producto;
  }

  /** Actualiza un producto. */
  async updateProduct(id: number, updates: Partial<InsertarProducto>): Promise<Producto> {
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
    return await baseDatos.select().from(tablaVariantes).orderBy(asc(tablaVariantes.sku));
  }

  /** Obtiene una variante por ID. */
  async getVariant(id: number): Promise<Variante | undefined> {
    const [variante] = await baseDatos.select().from(tablaVariantes).where(eq(tablaVariantes.id, id));
    return variante;
  }

  /** Crea una variante. */
  async createVariant(datos: InsertarVariante): Promise<Variante> {
    const [variante] = await baseDatos.insert(tablaVariantes).values(datos).returning();
    return variante;
  }

  /** Actualiza una variante. */
  async updateVariant(id: number, updates: Partial<InsertarVariante>): Promise<Variante> {
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
  async getDashboardMetrics(): Promise<{
    totalOrders: number;
    totalSales: number;
    managed: number;
    unmanaged: number;
    returned: number;
    byChannel: { channelId: number; channelName: string; count: number }[];
    byShop: { shopId: number; shopName: string | null; count: number }[];
  }> {
    const totalOrdersRes = await baseDatos
      .select({ count: count() })
      .from(tablaOrdenes);

    const totalSalesRes = await baseDatos
      .select({ sum: sql<number>`COALESCE(SUM(${tablaOrdenes.totalAmount}),0)` })
      .from(tablaOrdenes);

    const managedRes = await baseDatos
      .select({ count: count() })
      .from(tablaOrdenes)
      .where(eq(tablaOrdenes.fulfillmentStatus, "FULFILLED"));

    const unmanagedRes = await baseDatos
      .select({ count: count() })
      .from(tablaOrdenes)
      .where(or(eq(tablaOrdenes.fulfillmentStatus, "UNFULFILLED"), isNull(tablaOrdenes.fulfillmentStatus)));

    const returnedRes = await baseDatos
      .select({ count: count() })
      .from(tablaOrdenes)
      .where(or(eq(tablaOrdenes.fulfillmentStatus, "RESTOCKED"), eq(tablaOrdenes.status, "RESTOCKED")));

    const byChannelRes = await baseDatos
      .select({
        channelId: tablaOrdenes.channelId,
        channelName: tablaCanales.name,
        count: sql<number>`COUNT(*)`,
      })
      .from(tablaOrdenes)
      .leftJoin(tablaCanales, eq(tablaCanales.id, tablaOrdenes.channelId))
      .groupBy(tablaOrdenes.channelId, tablaCanales.name);

    const byShopRes = await baseDatos
      .select({
        shopId: tablaOrdenes.shopId,
        count: sql<number>`COUNT(*)`,
      })
      .from(tablaOrdenes)
      .groupBy(tablaOrdenes.shopId);

    return {
      totalOrders: Number(totalOrdersRes[0]?.count ?? 0),
      totalSales: Number(totalSalesRes[0]?.sum ?? 0),
      managed: Number(managedRes[0]?.count ?? 0),
      unmanaged: Number(unmanagedRes[0]?.count ?? 0),
      returned: Number(returnedRes[0]?.count ?? 0),
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

  // ==== ÓRDENES PAGINADAS ====
  async getOrdersPaginated(params: {
    statusFilter: "unmanaged" | "managed" | "all";
    channelId?: number;
    page: number;
    pageSize: number;
    search?: string;
  }): Promise<{ rows: any[]; total: number; page: number; pageSize: number }> {
    const { statusFilter, channelId, page, pageSize, search } = params;

    const conds: any[] = [];
    if (statusFilter === "unmanaged") {
      conds.push(
        or(isNull(tablaOrdenes.fulfillmentStatus), eq(tablaOrdenes.fulfillmentStatus, "UNFULFILLED")),
      );
    } else if (statusFilter === "managed") {
      conds.push(eq(tablaOrdenes.fulfillmentStatus, "FULFILLED"));
    }
    if (channelId !== undefined) {
      conds.push(eq(tablaOrdenes.channelId, channelId));
    }
    if (search) {
      const like = `%${search.toLowerCase()}%`;
      conds.push(
        or(
          sql`LOWER(${tablaOrdenes.name}) LIKE ${like}`,
          sql`LOWER(${tablaOrdenes.customerName}) LIKE ${like}`,
          sql`LOWER(${tablaItemsOrden.sku}) LIKE ${like}`,
        ),
      );
    }

    const whereClause = conds.length ? and(...conds) : undefined;
    const offset = Math.max(0, (page - 1) * pageSize);

    // SELECT base
    const baseSelect = baseDatos
      .select({
        id: tablaOrdenes.id,
        name: tablaOrdenes.name,
        customerName: tablaOrdenes.customerName,
        channelId: tablaOrdenes.channelId,
        totalAmount: tablaOrdenes.totalAmount,
        fulfillmentStatus: tablaOrdenes.fulfillmentStatus,
        status: tablaOrdenes.status,
        isManaged: tablaOrdenes.isManaged,
        hasTicket: tablaOrdenes.hasTicket,
        createdAt: tablaOrdenes.shopifyCreatedAt,
        itemsCount: sql<number>`COUNT(${tablaItemsOrden.id})`.as("items_count"),
        skus: sql<string[]>`ARRAY_AGG(${tablaItemsOrden.sku})`.as("skus"),
      })
      .from(tablaOrdenes)
      .leftJoin(tablaItemsOrden, eq(tablaItemsOrden.orderId, tablaOrdenes.id));

    const dataQ = whereClause ? baseSelect.where(whereClause) : baseSelect;
    const rowsRaw = await dataQ
      .groupBy(
        tablaOrdenes.id,
        tablaOrdenes.name,
        tablaOrdenes.customerName,
        tablaOrdenes.channelId,
        tablaOrdenes.totalAmount,
        tablaOrdenes.fulfillmentStatus,
        tablaOrdenes.status,
        tablaOrdenes.isManaged,
        tablaOrdenes.hasTicket,
        tablaOrdenes.shopifyCreatedAt,
      )
      .orderBy(desc(tablaOrdenes.shopifyCreatedAt))
      .limit(pageSize)
      .offset(offset);

    const rows = rowsRaw.map((r) => ({
      ...r,
      uiStatus: mapOrderUiStatus(r.fulfillmentStatus, r.status),
    }));

    const countQ = baseDatos
      .select({ count: sql<number>`COUNT(DISTINCT ${tablaOrdenes.id})` })
      .from(tablaOrdenes)
      .leftJoin(tablaItemsOrden, eq(tablaItemsOrden.orderId, tablaOrdenes.id));
    const countWhere = whereClause ? countQ.where(whereClause) : countQ;
    const totalRes = await countWhere;

    return { rows, page, pageSize, total: Number(totalRes[0]?.count ?? 0) };
  }


  // Items de una orden
  async getOrderItems(orderId: number) {
    return await baseDatos
      .select({
        id: tablaItemsOrden.id,
        sku: tablaItemsOrden.sku,
        quantity: tablaItemsOrden.quantity,
        price: tablaItemsOrden.price,
        title: tablaProductos.title,
        vendor: tablaProductos.vendor,
      })
      .from(tablaItemsOrden)
      .leftJoin(tablaProductos, eq(tablaProductos.id, tablaItemsOrden.productId))
      .where(eq(tablaItemsOrden.orderId, orderId))
      .orderBy(asc(tablaItemsOrden.id));
  }

  // Productos paginados por tienda
  async getProductsPaginated(shopId: number, page: number, pageSize: number) {
    const offset = (page - 1) * pageSize;
    const rows = await baseDatos
      .select()
      .from(tablaProductos)
      .where(eq(tablaProductos.shopId, shopId))
      .orderBy(asc(tablaProductos.title))
      .limit(pageSize)
      .offset(offset);
    const totalRes = await baseDatos
      .select({ count: count() })
      .from(tablaProductos)
      .where(eq(tablaProductos.shopId, shopId));
    return { rows, total: Number(totalRes[0]?.count ?? 0), page, pageSize };
  }

  async getCatalogProductsPaginated(page: number, pageSize: number) {
    const offset = (page - 1) * pageSize;
    const rows = await baseDatos
      .select()
      .from(tablaProductosCatalogo)
      .orderBy(asc(tablaProductosCatalogo.nombreProducto))
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
}

// Instancia lista para usar (compatibilidad y alias en español)
export const storage = new DatabaseStorage();
export const almacenamiento = storage;
