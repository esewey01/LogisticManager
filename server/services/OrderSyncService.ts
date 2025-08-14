// server/services/OrderSyncService.ts
// Servicio de sincronización de órdenes con cursor pagination y manejo de errores

import { ShopifyAdminClient } from './ShopifyAdminClient';
import { storage } from '../storage';
import type { InsertOrder, InsertOrderItem } from '@shared/schema';

interface ShopifyOrder {
  id: string;
  name: string;
  order_number: string;
  email: string;
  created_at: string;
  updated_at: string;
  financial_status: string;
  fulfillment_status: string;
  currency: string;
  total_price: string;
  subtotal_price: string;
  tags: string;
  line_items: Array<{
    id: string;
    product_id: string;
    variant_id: string;
    sku: string;
    quantity: number;
    price: string;
    title: string;
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

  constructor(storeParam: string = '1') {
    this.client = new ShopifyAdminClient(storeParam);
    this.storeNumber = parseInt(storeParam);
    
    // Mapear tienda a canal (asumiendo que shop 1 = channel 1, shop 2 = channel 2)
    // TODO: Hacer esto configurable desde la base de datos
    this.channelId = this.storeNumber;
  }

  private convertShopifyOrder(shopifyOrder: ShopifyOrder): InsertOrder {
    return {
      // Campos originales para compatibilidad
      orderId: shopifyOrder.id,
      channelId: this.channelId,
      customerName: shopifyOrder.email || 'Sin nombre',
      totalAmount: shopifyOrder.total_price,
      isManaged: false,
      hasTicket: false,
      status: 'pending',
      
      // Nuevos campos Shopify
      idShopify: shopifyOrder.id,
      shopId: this.storeNumber,
      name: shopifyOrder.name,
      orderNumber: shopifyOrder.order_number.toString(),
      financialStatus: shopifyOrder.financial_status,
      fulfillmentStatus: shopifyOrder.fulfillment_status || null,
      currency: shopifyOrder.currency,
      subtotalPrice: shopifyOrder.subtotal_price,
      customerEmail: shopifyOrder.email,
      tags: shopifyOrder.tags ? shopifyOrder.tags.split(', ').filter(Boolean) : [],
    };
  }

  private convertOrderItems(shopifyOrder: ShopifyOrder, localOrderId: number): InsertOrderItem[] {
    return shopifyOrder.line_items.map(item => ({
      orderId: localOrderId,
      productId: null, // Se establecerá después si existe en la DB
      variantId: null, // Se establecerá después si existe en la DB
      sku: item.sku || '',
      quantity: item.quantity,
      price: item.price,
    }));
  }

  async backfillOrders(
    sinceDate?: string,
    cursor?: string,
    limit: number = 50
  ): Promise<SyncResult> {
    console.log(`🔄 Iniciando backfill para tienda ${this.storeNumber}${sinceDate ? ` desde ${sinceDate}` : ''}`);
    
    const result: SyncResult = {
      success: false,
      ordersProcessed: 0,
      errors: [],
      hasNextPage: false,
    };

    try {
      // Construir parámetros de consulta
      const params: Record<string, any> = {
        limit: Math.min(limit, 250), // Shopify máximo es 250
        status: 'any',
        fields: 'id,name,order_number,email,created_at,updated_at,financial_status,fulfillment_status,currency,total_price,subtotal_price,tags',
      };

      if (sinceDate) {
        params.created_at_min = sinceDate;
      }

      if (cursor) {
        params.page_info = cursor;
      }

      // Obtener órdenes de Shopify
      const response = await this.client.getOrders(params);
      const orders: ShopifyOrder[] = response.orders || [];
      
      console.log(`📦 Obtenidas ${orders.length} órdenes de tienda ${this.storeNumber}`);

      // Procesar cada orden
      for (const shopifyOrder of orders) {
        try {
          // Verificar si la orden ya existe
          const existingOrder = await storage.getOrderByShopifyId(shopifyOrder.id, this.storeNumber);
          
          if (existingOrder) {
            console.log(`⏭️ Orden ${shopifyOrder.name} ya existe, actualizando...`);
            
            // Actualizar orden existente
            const orderData = this.convertShopifyOrder(shopifyOrder);
            await storage.updateOrder(existingOrder.id, orderData);
            
          } else {
            console.log(`➕ Creando nueva orden ${shopifyOrder.name}`);
            
            // Crear nueva orden
            const orderData = this.convertShopifyOrder(shopifyOrder);
            const newOrder = await storage.createOrder(orderData);
            
            // Crear items de la orden
            if (shopifyOrder.line_items && shopifyOrder.line_items.length > 0) {
              const orderItems = this.convertOrderItems(shopifyOrder, newOrder.id);
              for (const item of orderItems) {
                await storage.createOrderItem(item);
              }
            }
          }

          result.ordersProcessed++;

        } catch (error) {
          const errorMsg = `Error procesando orden ${shopifyOrder.name}: ${error}`;
          console.log(`❌ ${errorMsg}`);
          result.errors.push(errorMsg);
        }
      }

      // Verificar si hay más páginas
      result.hasNextPage = orders.length === params.limit;
      result.success = result.errors.length === 0;

      console.log(`✅ Backfill completado para tienda ${this.storeNumber}: ${result.ordersProcessed} órdenes procesadas`);
      if (result.errors.length > 0) {
        console.log(`⚠️ ${result.errors.length} errores durante el backfill`);
      }

      return result;

    } catch (error) {
      const errorMsg = `Error en backfill para tienda ${this.storeNumber}: ${error}`;
      console.log(`❌ ${errorMsg}`);
      result.errors.push(errorMsg);
      return result;
    }
  }

  async incrementalSync(updatedSince: string): Promise<SyncResult> {
    console.log(`🔄 Sync incremental para tienda ${this.storeNumber} desde ${updatedSince}`);
    
    const result: SyncResult = {
      success: false,
      ordersProcessed: 0,
      errors: [],
      hasNextPage: false,
    };

    try {
      const params = {
        updated_at_min: updatedSince,
        status: 'any',
        limit: 100,
        fields: 'id,name,order_number,email,created_at,updated_at,financial_status,fulfillment_status,currency,total_price,subtotal_price,tags',
      };

      const response = await this.client.getOrders(params);
      const orders: ShopifyOrder[] = response.orders || [];

      console.log(`📦 Sync incremental: ${orders.length} órdenes actualizadas`);

      for (const shopifyOrder of orders) {
        try {
          const existingOrder = await storage.getOrderByShopifyId(shopifyOrder.id, this.storeNumber);
          
          if (existingOrder) {
            // Actualizar orden existente
            const orderData = this.convertShopifyOrder(shopifyOrder);
            await storage.updateOrder(existingOrder.id, orderData);
            console.log(`🔄 Actualizada orden ${shopifyOrder.name}`);
          } else {
            // Crear nueva orden (puede ser una orden nueva)
            const orderData = this.convertShopifyOrder(shopifyOrder);
            const newOrder = await storage.createOrder(orderData);
            
            if (shopifyOrder.line_items && shopifyOrder.line_items.length > 0) {
              const orderItems = this.convertOrderItems(shopifyOrder, newOrder.id);
              for (const item of orderItems) {
                await storage.createOrderItem(item);
              }
            }
            console.log(`➕ Nueva orden en sync incremental: ${shopifyOrder.name}`);
          }

          result.ordersProcessed++;

        } catch (error) {
          const errorMsg = `Error en sync incremental orden ${shopifyOrder.name}: ${error}`;
          console.log(`❌ ${errorMsg}`);
          result.errors.push(errorMsg);
        }
      }

      result.success = result.errors.length === 0;
      result.hasNextPage = orders.length === 100; // Si vienen 100, probablemente hay más

      console.log(`✅ Sync incremental completado: ${result.ordersProcessed} órdenes procesadas`);
      return result;

    } catch (error) {
      const errorMsg = `Error en sync incremental tienda ${this.storeNumber}: ${error}`;
      console.log(`❌ ${errorMsg}`);
      result.errors.push(errorMsg);
      return result;
    }
  }

  async getOrdersCount(): Promise<{ count: number; error?: string }> {
    try {
      const response = await this.client.getOrdersCount();
      return { count: response.count || 0 };
    } catch (error) {
      return { count: 0, error: String(error) };
    }
  }

  getStoreInfo() {
    return this.client.getStoreInfo();
  }
}