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
  type Note as Nota,
  type InsertNote as InsertarNota,
  type Product as Producto,
  type InsertProduct as InsertarProducto,
  type Variant as Variante,
  type InsertVariant as InsertarVariante,
  type OrderItem as ItemOrden,
  type InsertOrderItem as InsertarItemOrden,
  type ProductComboItem as ItemCombo,
  type InsertProductComboItem as InsertarItemCombo,
} from "@shared/schema";

import { db as baseDatos } from "./db";
import { eq, and, desc, asc, sql, count } from "drizzle-orm";

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

  // Tickets
  getTickets(): Promise<Ticket[]>;
  getTicket(id: number): Promise<Ticket | undefined>;
  createTicket(ticket: InsertarTicket): Promise<Ticket>;
  updateTicket(id: number, updates: Partial<InsertarTicket>): Promise<Ticket>;

  // Reglas de envío
  getShippingRules(): Promise<ReglaEnvio[]>;
  createShippingRule(rule: InsertarReglaEnvio): Promise<ReglaEnvio>;

  // Notas
  getNotes(userId?: number): Promise<Nota[]>;
  createNote(note: InsertarNota): Promise<Nota>;
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
  getDashboardMetrics(): Promise<{
    totalOrders: number;
    unmanaged: number;
    totalSales: number;
    delayed: number;
    channelStats: { channelId: number; orders: number; channelName: string; channelCode: string }[];
  }>;
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
        .orderBy(desc(tablaOrdenes.createdAt));
    }

    return await baseDatos
      .select()
      .from(tablaOrdenes)
      .orderBy(desc(tablaOrdenes.createdAt));
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
  async getNotes(userId?: number): Promise<Nota[]> {
    const consulta = baseDatos.select().from(tablaNotas);
    if (userId) {
      return await consulta.where(eq(tablaNotas.userId, userId)).orderBy(desc(tablaNotas.createdAt));
    }
    return await consulta.orderBy(desc(tablaNotas.createdAt));
  }

  /** Crea una nota. */
  async createNote(nota: InsertarNota): Promise<Nota> {
    const [nuevaNota] = await baseDatos.insert(tablaNotas).values(nota).returning();
    return nuevaNota;
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
   * Calcula métricas agregadas para el dashboard.
   * - totalOrders: total de órdenes
   * - unmanaged: órdenes no gestionadas (isManaged = false)
   * - totalSales: suma de montos
   * - delayed: usa status='unmanaged' como proxy de retrasadas
   * - channelStats: totales por canal
   */
  // Métricas de dashboard
  async getDashboardMetrics(): Promise<{
    totalOrders: number;
    unmanaged: number;
    totalSales: number;
    delayed: number;
    channelStats: { channelId: number; orders: number; channelName: string; channelCode: string }[];
  }> {
    // Total de órdenes
    const [totalOrdersResult] = await baseDatos.select({ count: count() }).from(tablaOrdenes);
    const totalOrders = totalOrdersResult.count as number;

    // Órdenes no gestionadas
    const [unmanagedResult] = await baseDatos
      .select({ count: count() })
      .from(tablaOrdenes)
      .where(eq(tablaOrdenes.isManaged, false));
    const unmanaged = unmanagedResult.count as number;

    // Ventas totales (SUM)
    const [salesResult] = await baseDatos
      .select({ total: sql`COALESCE(SUM(${tablaOrdenes.totalAmount}), 0)` })
      .from(tablaOrdenes);
    const totalSales = Number(salesResult.total) || 0;

    // Retrasadas (proxy por status = 'unmanaged')
    const [delayedResult] = await baseDatos
      .select({ count: count() })
      .from(tablaOrdenes)
      .where(eq(tablaOrdenes.status, "unmanaged"));
    const delayed = delayedResult.count as number;

    // Estadísticas por canal
    const channelStats = await baseDatos
      .select({
        channelId: tablaOrdenes.channelId,
        orders: count(),
        channelName: tablaCanales.name,
        channelCode: tablaCanales.code,
      })
      .from(tablaOrdenes)
      .innerJoin(tablaCanales, eq(tablaOrdenes.channelId, tablaCanales.id))
      .groupBy(tablaOrdenes.channelId, tablaCanales.name, tablaCanales.code);

    return { totalOrders, unmanaged, totalSales, delayed, channelStats };
  }
}

// Instancia lista para usar (compatibilidad y alias en español)
export const storage = new DatabaseStorage();
export const almacenamiento = storage;
