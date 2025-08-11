import {
  users,
  brands,
  catalogProducts,
  channels,
  carriers,
  orders,
  tickets,
  shippingRules,
  notes,
  type User,
  type InsertUser,
  type Brand,
  type InsertBrand,
  type CatalogProduct,
  type InsertCatalogProduct,
  type Channel,
  type InsertChannel,
  type Carrier,
  type InsertCarrier,
  type Order,
  type InsertOrder,
  type Ticket,
  type InsertTicket,
  type ShippingRule,
  type InsertShippingRule,
  type Note,
  type InsertNote,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, like, sql, count } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User>;
  getAllUsers(): Promise<User[]>;

  // Brand operations
  getBrands(): Promise<Brand[]>;
  getBrand(id: string): Promise<Brand | undefined>;
  createBrand(brand: InsertBrand): Promise<Brand>;
  updateBrand(id: string, updates: Partial<InsertBrand>): Promise<Brand>;

  // Catalog operations
  getCatalogProducts(brandId?: string): Promise<CatalogProduct[]>;
  createCatalogProduct(product: InsertCatalogProduct): Promise<CatalogProduct>;
  updateCatalogProduct(id: string, updates: Partial<InsertCatalogProduct>): Promise<CatalogProduct>;

  // Channel operations
  getChannels(): Promise<Channel[]>;
  getChannel(id: string): Promise<Channel | undefined>;
  createChannel(channel: InsertChannel): Promise<Channel>;

  // Carrier operations
  getCarriers(): Promise<Carrier[]>;
  getCarrier(id: string): Promise<Carrier | undefined>;
  createCarrier(carrier: InsertCarrier): Promise<Carrier>;

  // Order operations
  getOrders(filters?: { channelId?: string; managed?: boolean; hasTicket?: boolean }): Promise<Order[]>;
  getOrder(id: string): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: string, updates: Partial<InsertOrder>): Promise<Order>;
  getOrdersByCustomer(customerName: string): Promise<Order[]>;

  // Ticket operations
  getTickets(): Promise<Ticket[]>;
  getTicket(id: string): Promise<Ticket | undefined>;
  createTicket(ticket: InsertTicket): Promise<Ticket>;
  updateTicket(id: string, updates: Partial<InsertTicket>): Promise<Ticket>;

  // Shipping rules
  getShippingRules(): Promise<ShippingRule[]>;
  createShippingRule(rule: InsertShippingRule): Promise<ShippingRule>;

  // Notes operations
  getNotes(userId?: string): Promise<Note[]>;
  createNote(note: InsertNote): Promise<Note>;
  deleteNote(id: string): Promise<void>;

  // Dashboard metrics
  getDashboardMetrics(): Promise<{
    totalOrders: number;
    unmanaged: number;
    totalSales: number;
    delayed: number;
    channelStats: { channelId: string; orders: number; channelName: string; channelCode: string }[];
  }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(asc(users.email));
  }

  async getBrands(): Promise<Brand[]> {
    return await db.select().from(brands).where(eq(brands.isActive, true)).orderBy(asc(brands.name));
  }

  async getBrand(id: string): Promise<Brand | undefined> {
    const [brand] = await db.select().from(brands).where(eq(brands.id, id));
    return brand;
  }

  async createBrand(brand: InsertBrand): Promise<Brand> {
    const [newBrand] = await db.insert(brands).values(brand).returning();
    return newBrand;
  }

  async updateBrand(id: string, updates: Partial<InsertBrand>): Promise<Brand> {
    const [brand] = await db
      .update(brands)
      .set(updates)
      .where(eq(brands.id, id))
      .returning();
    return brand;
  }

  async getCatalogProducts(brandId?: string): Promise<CatalogProduct[]> {
    const query = db.select().from(catalogProducts);
    if (brandId) {
      return await query.where(eq(catalogProducts.brandId, brandId)).orderBy(asc(catalogProducts.sku));
    }
    return await query.orderBy(asc(catalogProducts.sku));
  }

  async createCatalogProduct(product: InsertCatalogProduct): Promise<CatalogProduct> {
    const [newProduct] = await db.insert(catalogProducts).values(product).returning();
    return newProduct;
  }

  async updateCatalogProduct(id: string, updates: Partial<InsertCatalogProduct>): Promise<CatalogProduct> {
    const [product] = await db
      .update(catalogProducts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(catalogProducts.id, id))
      .returning();
    return product;
  }

  async getChannels(): Promise<Channel[]> {
    return await db.select().from(channels).where(eq(channels.isActive, true)).orderBy(asc(channels.name));
  }

  async getChannel(id: string): Promise<Channel | undefined> {
    const [channel] = await db.select().from(channels).where(eq(channels.id, id));
    return channel;
  }

  async createChannel(channel: InsertChannel): Promise<Channel> {
    const [newChannel] = await db.insert(channels).values(channel).returning();
    return newChannel;
  }

  async getCarriers(): Promise<Carrier[]> {
    return await db.select().from(carriers).where(eq(carriers.isActive, true)).orderBy(asc(carriers.name));
  }

  async getCarrier(id: string): Promise<Carrier | undefined> {
    const [carrier] = await db.select().from(carriers).where(eq(carriers.id, id));
    return carrier;
  }

  async createCarrier(carrier: InsertCarrier): Promise<Carrier> {
    const [newCarrier] = await db.insert(carriers).values(carrier).returning();
    return newCarrier;
  }

  async getOrders(filters?: { channelId?: string; managed?: boolean; hasTicket?: boolean }): Promise<Order[]> {
    let query = db.select().from(orders);
    const conditions = [];
    
    if (filters?.channelId) {
      conditions.push(eq(orders.channelId, filters.channelId));
    }
    if (filters?.managed !== undefined) {
      conditions.push(eq(orders.isManaged, filters.managed));
    }
    if (filters?.hasTicket !== undefined) {
      conditions.push(eq(orders.hasTicket, filters.hasTicket));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return await query.orderBy(desc(orders.createdAt));
  }

  async getOrder(id: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order;
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const [newOrder] = await db.insert(orders).values(order).returning();
    return newOrder;
  }

  async updateOrder(id: string, updates: Partial<InsertOrder>): Promise<Order> {
    const [order] = await db
      .update(orders)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    return order;
  }

  async getOrdersByCustomer(customerName: string): Promise<Order[]> {
    return await db
      .select()
      .from(orders)
      .where(eq(orders.customerName, customerName))
      .orderBy(desc(orders.createdAt));
  }

  async getTickets(): Promise<Ticket[]> {
    return await db.select().from(tickets).orderBy(desc(tickets.createdAt));
  }

  async getTicket(id: string): Promise<Ticket | undefined> {
    const [ticket] = await db.select().from(tickets).where(eq(tickets.id, id));
    return ticket;
  }

  async createTicket(ticket: InsertTicket): Promise<Ticket> {
    const [newTicket] = await db.insert(tickets).values(ticket).returning();
    return newTicket;
  }

  async updateTicket(id: string, updates: Partial<InsertTicket>): Promise<Ticket> {
    const [ticket] = await db
      .update(tickets)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(tickets.id, id))
      .returning();
    return ticket;
  }

  async getShippingRules(): Promise<ShippingRule[]> {
    return await db.select().from(shippingRules).where(eq(shippingRules.isActive, true));
  }

  async createShippingRule(rule: InsertShippingRule): Promise<ShippingRule> {
    const [newRule] = await db.insert(shippingRules).values(rule).returning();
    return newRule;
  }

  async getNotes(userId?: string): Promise<Note[]> {
    const query = db.select().from(notes);
    if (userId) {
      return await query.where(eq(notes.userId, userId)).orderBy(desc(notes.createdAt));
    }
    return await query.orderBy(desc(notes.createdAt));
  }

  async createNote(note: InsertNote): Promise<Note> {
    const [newNote] = await db.insert(notes).values(note).returning();
    return newNote;
  }

  async deleteNote(id: string): Promise<void> {
    await db.delete(notes).where(eq(notes.id, id));
  }

  async getDashboardMetrics(): Promise<{
    totalOrders: number;
    unmanaged: number;
    totalSales: number;
    delayed: number;
    channelStats: { channelId: string; orders: number; channelName: string; channelCode: string }[];
  }> {
    // Total orders
    const [totalOrdersResult] = await db.select({ count: count() }).from(orders);
    const totalOrders = totalOrdersResult.count;

    // Unmanaged orders
    const [unmanagedResult] = await db
      .select({ count: count() })
      .from(orders)
      .where(eq(orders.isManaged, false));
    const unmanaged = unmanagedResult.count;

    // Total sales
    const [salesResult] = await db
      .select({ total: sql`COALESCE(SUM(${orders.totalAmount}), 0)` })
      .from(orders);
    const totalSales = Number(salesResult.total) || 0;

    // Delayed orders (using status = 'unmanaged' as proxy for delayed)
    const [delayedResult] = await db
      .select({ count: count() })
      .from(orders)
      .where(eq(orders.status, "unmanaged"));
    const delayed = delayedResult.count;

    // Channel stats
    const channelStats = await db
      .select({
        channelId: orders.channelId,
        orders: count(),
        channelName: channels.name,
        channelCode: channels.code,
      })
      .from(orders)
      .innerJoin(channels, eq(orders.channelId, channels.id))
      .groupBy(orders.channelId, channels.name, channels.code);

    return {
      totalOrders,
      unmanaged,
      totalSales,
      delayed,
      channelStats,
    };
  }
}

export const storage = new DatabaseStorage();
