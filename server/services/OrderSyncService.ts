// server/services/OrderSyncService.ts
import { ShopifyAdminClient } from "./ShopifyAdminClient";
import { storage } from "../storage";
import type { InsertOrder, InsertOrderItem } from "@shared/schema";

interface ShopifyOrder {
  id: string | number;
  name: string | null;
  order_number: number | string | null;
  email: string | null;
  created_at: string | null;
  updated_at: string | null;
  financial_status: string | null;
  fulfillment_status: string | null;
  currency: string | null;
  total_price: string | null;
  subtotal_price: string | null;
  tags: string | null;
  customer?: {
    first_name?: string | null;
    last_name?: string | null;
  } | null;
  shipping_address?: {
    name?: string | null;
    phone?: string | null;
    address1?: string | null;
    city?: string | null;
    province?: string | null;
    country?: string | null;
    zip?: string | null;
  } | null;
  cancel_reason?: string | null;
  cancelled_at?: string | null;
  line_items: Array<{
    id: string | number;
    product_id: string | number | null;
    variant_id: string | number | null;
    sku: string | null;
    quantity: number;
    price: string;
    title: string | null;
  }>;
}

interface SyncResult {
  success: boolean;
  ordersProcessed: number;
  errors: string[];
  lastCursor?: string;
  hasNextPage: boolean;
}

export class OrderSyncService {
  private client: ShopifyAdminClient;
  private storeNumber: number;
  private channelId: number;

  constructor(storeParam: string = "1") {
    this.client = new ShopifyAdminClient(storeParam);
    this.storeNumber = parseInt(storeParam, 10);
    // TODO: mapear desde BD; por ahora = número de tienda
    this.channelId = this.storeNumber;
  }

  private convertShopifyOrder(shopifyOrder: ShopifyOrder): InsertOrder {
    const o = shopifyOrder;
    const idStr = String(o.id);

    const first = o.customer?.first_name ?? null;
    const last = o.customer?.last_name ?? null;
    const ship = o.shipping_address ?? undefined;

    return {
      // Campos básicos existentes
      orderId: idStr,
      channelId: this.channelId,
      customerName:
        (first || last) ? `${first ?? ""} ${last ?? ""}`.trim() :
          (o.email || "Sin nombre"),
      totalAmount: o.total_price ?? null,
      isManaged: false,
      hasTicket: false,
      status: "pending",

      // Shopify
      idShopify: idStr,
      shopId: this.storeNumber,
      name: o.name ?? null,
      orderNumber: o.order_number != null ? String(o.order_number) : null,
      financialStatus: o.financial_status ?? null,
      fulfillmentStatus: o.fulfillment_status ?? null,
      currency: o.currency ?? null,
      subtotalPrice: o.subtotal_price ?? null,
      customerEmail: o.email ?? null,
      tags: o.tags
        ? o.tags.split(",").map(t => t.trim()).filter(Boolean)
        : [],

      // 👇 Estos 4 requieren columnas en tu schema (ver sección 2)
      // Si aún no agregas esas columnas, comenta estas líneas.
      createdAtShopify: o.created_at ? new Date(o.created_at) : null,
      updatedAtShopify: o.updated_at ? new Date(o.updated_at) : null,
      cancelReason: o.cancel_reason ?? null,
      cancelledAt: o.cancelled_at ? new Date(o.cancelled_at) : null,

      // Ya tienes estas columnas en tu schema:
      customerFirstName: first,
      customerLastName: last,
      shipName: ship?.name ?? null,
      shipPhone: ship?.phone ?? null,
      shipAddress1: ship?.address1 ?? null,
      shipCity: ship?.city ?? null,
      shipProvince: ship?.province ?? null,
      shipCountry: ship?.country ?? null,
      shipZip: ship?.zip ?? null,
    } as InsertOrder;
  }

  private convertOrderItems(shopifyOrder: ShopifyOrder, localOrderId: number): InsertOrderItem[] {
    return shopifyOrder.line_items.map(item => ({
      orderId: localOrderId,          // FK local a orders.id (numérico)
      productId: null,                // resolverás luego contra tu catálogo
      variantId: null,
      sku: item.sku,
      quantity: item.quantity,
      price: item.price,
      // 👇 ya tienes estas columnas en order_items
      shopifyProductId: item.product_id != null ? String(item.product_id) : null,
      shopifyVariantId: item.variant_id != null ? String(item.variant_id) : null,
      title: item.title ?? null,
    }));
  }

  async backfillOrders(sinceDate?: string, cursor?: string, limit = 50): Promise<SyncResult> {
    console.log(`Iniciando backfill para tienda ${this.storeNumber}${sinceDate ? ` desde ${sinceDate}` : ""}`);

    const result: SyncResult = {
      success: false,
      ordersProcessed: 0,
      errors: [],
      hasNextPage: false,
      lastCursor: undefined,
    };

    try {
      const firstPage = !cursor;
      let params: Record<string, any>;

      if (firstPage) {
        params = {
          limit: Math.min(limit, 250),
          status: "any",
          fields:
            "id,name,order_number,email,created_at,updated_at,financial_status,fulfillment_status,currency,total_price,subtotal_price,tags,line_items,customer,shipping_address,cancel_reason,cancelled_at",
        };
        if (sinceDate) params.created_at_min = sinceDate;
      } else {
        // Con page_info NO mandes status ni otros filtros
        params = {
          limit: Math.min(limit, 250),
          page_info: cursor,
          // opcional: podrías omitir fields también (más seguro con Shopify REST)
        };
      }

      const response = await this.client.getOrders(params);
      const orders: ShopifyOrder[] = response.orders || [];
      console.log(`Ordenes Obtenidas ${orders.length} órdenes de tienda ${this.storeNumber}`);

      for (const shopifyOrder of orders) {
        try {
          const existing = await storage.getOrderByShopifyId(String(shopifyOrder.id), this.storeNumber);

          if (existing) {
            const orderData = this.convertShopifyOrder(shopifyOrder);
            await storage.updateOrder(existing.id, orderData);
            console.log(`Actualizada ${shopifyOrder.name}`);
          } else {
            const orderData = this.convertShopifyOrder(shopifyOrder);
            const newOrder = await storage.createOrder(orderData);
            const items = shopifyOrder.line_items ?? [];
            console.log(`> ${shopifyOrder.name}: items=${items.length}`);
            if (items.length > 0) {
              const orderItems = this.convertOrderItems(shopifyOrder, newOrder.id);
              for (const it of orderItems) await storage.createOrderItem(it);
            }
          }

          result.ordersProcessed++;
        } catch (e) {
          const msg = `Error procesando ${shopifyOrder.name}: ${e}`;
          console.log("error", msg);
          result.errors.push(msg);
        }
      }

      // ✅ CORREGIDO: Usa los valores reales de la respuesta
      result.hasNextPage = response.hasNextPage;
      result.lastCursor = response.nextPageInfo || undefined;
      result.success = result.errors.length === 0;

      console.log(`✅ Backfill tienda ${this.storeNumber}: ${result.ordersProcessed} órdenes`);
      if (result.errors.length) console.log(`⚠️ ${result.errors.length} errores`);
      return result;
    } catch (e) {
      const msg = `Error en backfill tienda ${this.storeNumber}: ${e}`;
      console.log("❌", msg);
      result.errors.push(msg);
      return result;
    }
  }

  async incrementalSync(updatedSince: string): Promise<SyncResult> {
    console.log(`🔄 Sync incremental tienda ${this.storeNumber} desde ${updatedSince}`);

    const result: SyncResult = {
      success: false,
      ordersProcessed: 0,
      errors: [],
      hasNextPage: false,
      lastCursor: undefined,
    };

    try {
      const params = {
        updated_at_min: updatedSince,
        status: "any",
        limit: 100,
        fields:
          "id,name,order_number,email,created_at,updated_at,financial_status,fulfillment_status,currency,total_price,subtotal_price,tags,line_items,customer,shipping_address,cancel_reason,cancelled_at",
      };

      const response = await this.client.getOrders(params);
      const orders: ShopifyOrder[] = response.orders || [];
      console.log(`📦 Sync incremental: ${orders.length} órdenes`);

      for (const shopifyOrder of orders) {
        try {
          const existing = await storage.getOrderByShopifyId(String(shopifyOrder.id), this.storeNumber);

          const orderData = this.convertShopifyOrder(shopifyOrder);
          if (existing) {
            await storage.updateOrder(existing.id, orderData);
            console.log(`🔄 Actualizada ${shopifyOrder.name}`);
          } else {
            const newOrder = await storage.createOrder(orderData);
            const items = shopifyOrder.line_items ?? [];
            if (items.length > 0) {
              const orderItems = this.convertOrderItems(shopifyOrder, newOrder.id);
              for (const it of orderItems) await storage.createOrderItem(it);
            }
            console.log(`Nueva ${shopifyOrder.name}`);
          }
          result.ordersProcessed++;
        } catch (e) {
          const msg = `Error incremental ${shopifyOrder.name}: ${e}`;
          console.log("error", msg);
          result.errors.push(msg);
        }
      }

      // ✅ CORREGIDO
      result.hasNextPage = response.hasNextPage;
      result.lastCursor = response.nextPageInfo || undefined;
      result.success = result.errors.length === 0;

      console.log(`Sync incremental ok: ${result.ordersProcessed}`);
      return result;
    } catch (e) {
      const msg = `Error incremental tienda ${this.storeNumber}: ${e}`;
      console.log("error", msg);
      result.errors.push(msg);
      return result;
    }
  }

  async getOrdersCount(): Promise<{ count: number; error?: string }> {
    try {
      const response = await this.client.getOrdersCount();
      return { count: response.count || 0 };
    } catch (e) {
      return { count: 0, error: String(e) };
    }
  }

  getStoreInfo() {
    return this.client.getStoreInfo();
  }
}
