// server/services/OrderSyncService.ts
import { ShopifyAdminClient } from "./ShopifyAdminClient";
import { storage } from "../storage";

import { orders } from "@shared/schema";
import type { InsertOrder, InsertOrderItem } from "@shared/schema";

interface ShopifyOrder {
  id: string | number;
  name: string | null;
  order_number: number | string | null;
  email: string | null;
  phone?: string | null;
  created_at: string | null;
  updated_at: string | null;
  processed_at?: string | null;
  closed_at?: string | null;
  financial_status: string | null;
  fulfillment_status: string | null;
  currency: string | null;
  total_price: string | null;
  subtotal_price: string | null;
  tags: string | null;
  note?: string | null;
  customer?: {
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    phone?: string | null;
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
  billing_address?: {
    phone?: string | null;
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

/* ===================== Helpers ===================== */

function toTextArrayFromTags(tags?: string | null): string[] | undefined {
  if (!tags) return undefined;
  const arr = tags.split(",").map(s => s.trim()).filter(Boolean);
  return arr.length ? arr : [];
}

function pickPhone(o: ShopifyOrder): string | null {
  return (
    (o as any).phone ??
    o?.shipping_address?.phone ??
    o?.billing_address?.phone ??
    o?.customer?.phone ??
    null
  );
}

/* =================================================== */

export class OrderSyncService {
  private client: ShopifyAdminClient;
  private storeNumber: number;
  private channelId: number;

  constructor(storeParam: string = "1") {
    this.client = new ShopifyAdminClient(storeParam);
    this.storeNumber = parseInt(storeParam, 10);
    // Si luego quieres mapear canal desde BD, cámbialo aquí
    this.channelId = this.storeNumber;
  }

  /** Mapea orden REST de Shopify → InsertOrder (tu schema) */
  private convertShopifyOrder(o: ShopifyOrder): InsertOrder {
    const idStr = String(o.id);

    const first = o.customer?.first_name ?? null;
    const last = o.customer?.last_name ?? null;
    const ship = o.shipping_address ?? undefined;

    const contactPhone = pickPhone(o);
    const customerEmail = o.email ?? o.customer?.email ?? null;

    return {
      // Identificadores básicos
      orderId: idStr,                       // si lo usas aparte de idShopify
      idShopify: idStr,
      shopId: this.storeNumber,
      channelId: this.channelId,

      // Nombres / UI
      name: o.name ?? null,
      orderNumber: o.order_number != null ? String(o.order_number) : null,
      customerFirstName: first,
      customerLastName: last,
      customerName:
        (first || last) ? `${first ?? ""} ${last ?? ""}`.trim() : (customerEmail || "Sin nombre"),

      // Estados & dinero
      financialStatus: o.financial_status ?? null,
      fulfillmentStatus: o.fulfillment_status ?? null,
      currency: o.currency ?? null,
      subtotalPrice: o.subtotal_price ?? null,
      totalAmount: o.total_price ?? null,

      // Fechas nativas Shopify
      shopifyCreatedAt: o.created_at ? new Date(o.created_at) : null,
      shopifyUpdatedAt: o.updated_at ? new Date(o.updated_at) : null,
      shopifyProcessedAt: o.processed_at ? new Date(o.processed_at) : null,
      shopifyClosedAt: o.closed_at ? new Date(o.closed_at) : null,
      shopifyCancelledAt: o.cancelled_at ? new Date(o.cancelled_at) : null,

      // Cancelación / notas / contacto
      cancelReason: o.cancel_reason ?? null,
      orderNote: o.note ?? null,
      contactPhone,
      customerEmail,
      tags: toTextArrayFromTags(o.tags),

      // Envío (útil en tu UI)
      shipName: ship?.name ?? null,
      shipPhone: ship?.phone ?? null,
      shipAddress1: ship?.address1 ?? null,
      shipCity: ship?.city ?? null,
      shipProvince: ship?.province ?? null,
      shipCountry: ship?.country ?? null,
      shipZip: ship?.zip ?? null,

      // Flags internos
      isManaged: false,
      hasTicket: false,
      status: "pending",
    } as InsertOrder;
  }

  /** Convierte line items Shopify → InsertOrderItem[] (tu schema) */
  private convertOrderItems(shopifyOrder: ShopifyOrder, localOrderId: number): InsertOrderItem[] {
    return (shopifyOrder.line_items || []).map(item => ({
      orderId: localOrderId,          // FK local a orders.id
      productId: null,                // resolverás luego vs tu catálogo
      variantId: null,
      sku: item.sku,
      quantity: item.quantity,
      price: item.price,
      shopifyProductId: item.product_id != null ? String(item.product_id) : null,
      shopifyVariantId: item.variant_id != null ? String(item.variant_id) : null,
      title: item.title ?? null,
    }));
  }

  /** Upsert sin tocar storage: busca por (shopId, idShopify) y actualiza o crea */
  private async upsertOrder(orderData: InsertOrder, items: InsertOrderItem[]) {
    const existing = await storage.getOrderByShopifyId(orderData.idShopify!, this.storeNumber);

    if (existing) {
      // Actualiza orden
      await storage.updateOrder(existing.id, orderData);

      // (Opcional) Re-sincronizar items:
      // Si quieres refrescar items, puedes borrar y recrear:
      // await storage.deleteOrderItemsByOrderId(existing.id);
      // for (const it of this.convertOrderItems(shopifyOrder, existing.id)) await storage.createOrderItem(it);

      return existing.id;
    } else {
      // Crea orden + items
      const newOrder = await storage.createOrder(orderData);
      if (items.length > 0) {
        for (const it of items) {
          await storage.createOrderItem({ ...it, orderId: newOrder.id });
        }
      }
      return newOrder.id;
    }
  }

  /** Backfill de órdenes (histórico) */
  async backfillOrders(sinceDate?: string, cursor?: string, limit = 50): Promise<SyncResult> {
    console.log(`Iniciando backfill tienda ${this.storeNumber}${sinceDate ? ` desde ${sinceDate}` : ""}`);

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
          // Campos REST que necesitamos para mapear todo:
          fields:
            "id,name,order_number,email,phone,created_at,updated_at,processed_at,closed_at,financial_status,fulfillment_status,currency,total_price,subtotal_price,tags,note,line_items,customer,shipping_address,billing_address,cancel_reason,cancelled_at",
        };
        if (sinceDate) params.created_at_min = sinceDate;
      } else {
        // Con page_info, Shopify pide no mezclar campos/filtros conflictivos
        params = {
          limit: Math.min(limit, 250),
          page_info: cursor,
          // puedes incluir 'fields' igual que arriba; si algún store falla, quítalo aquí
          fields:
            "id,name,order_number,email,phone,created_at,updated_at,processed_at,closed_at,financial_status,fulfillment_status,currency,total_price,subtotal_price,tags,note,line_items,customer,shipping_address,billing_address,cancel_reason,cancelled_at",
        };
      }

      const response = await this.client.getOrders(params);
      const list: ShopifyOrder[] = response.orders || [];
      console.log(`Órdenes obtenidas: ${list.length} (tienda ${this.storeNumber})`);

      for (const shopifyOrder of list) {
        try {
          const orderData = this.convertShopifyOrder(shopifyOrder);
          const items = this.convertOrderItems(shopifyOrder, 0 /* se reemplaza al crear */);
          await this.upsertOrder(orderData, items);
          result.ordersProcessed++;
        } catch (e) {
          const msg = `Error procesando ${shopifyOrder.name ?? shopifyOrder.id}: ${e}`;
          console.log("error", msg);
          result.errors.push(msg);
        }
      }

      // Paginación real desde tu ShopifyAdminClient
      result.hasNextPage = !!response.hasNextPage;
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

  /** Sync incremental (actualizadas desde X fecha/hora) */
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
          "id,name,order_number,email,phone,created_at,updated_at,processed_at,closed_at,financial_status,fulfillment_status,currency,total_price,subtotal_price,tags,note,line_items,customer,shipping_address,billing_address,cancel_reason,cancelled_at",
      };

      const response = await this.client.getOrders(params);
      const list: ShopifyOrder[] = response.orders || [];
      console.log(`📦 Sync incremental: ${list.length} órdenes`);

      for (const shopifyOrder of list) {
        try {
          const orderData = this.convertShopifyOrder(shopifyOrder);
          const items = this.convertOrderItems(shopifyOrder, 0);
          await this.upsertOrder(orderData, items);
          result.ordersProcessed++;
        } catch (e) {
          const msg = `Error incremental ${shopifyOrder.name ?? shopifyOrder.id}: ${e}`;
          console.log("error", msg);
          result.errors.push(msg);
        }
      }

      result.hasNextPage = !!response.hasNextPage;
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
