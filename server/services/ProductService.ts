// server/services/ProductService.ts
// Servicio para gestión de productos con sincronización bidireccional Shopify

import { ShopifyAdminClient } from './ShopifyAdminClient';
import { storage } from '../storage';
import type { InsertProduct, InsertVariant, Product, Variant } from '@shared/schema';
// por (lookup directo):
import { db } from "../db";
import { variants } from "@shared/schema";
import { eq } from "drizzle-orm";



interface ShopifyProduct {
  id: string;
  title: string;
  vendor: string;
  product_type: string;
  status: string;
  tags: string;
  created_at: string;
  updated_at: string;
  variants: Array<{
    id: string;
    product_id: string;
    sku: string;
    price: string;
    compare_at_price: string;
    barcode: string;
    inventory_quantity: number;
  }>;
}

interface ShopifyVariant {
  id: string | number;
  product_id: string | number;
  sku: string | null;
  price: string | null;
  compare_at_price: string | null;
  barcode: string | null;
  inventory_quantity: number | null;
}

interface ProductUpdateResult {
  success: boolean;
  product?: Product;
  error?: string;
  shopifyUpdated?: boolean;
}
interface SyncResult {
  success: boolean;
  productsProcessed: number;
  errors: string[];
}

export class ProductService {
  private client: ShopifyAdminClient;
  private storeNumber: number;

  constructor(storeParam: string = "1") {
    this.client = new ShopifyAdminClient(storeParam);
    this.storeNumber = parseInt(storeParam, 10);
  }

  private convertShopifyProduct(sp: ShopifyProduct): InsertProduct {
    // Mapea archived → draft para que pase tu schema
    const statusNorm =
      sp.status === "active" ? "active" :
        sp.status === "draft" ? "draft" : "draft";

    return {
      idShopify: String(sp.id),
      shopId: this.storeNumber,
      title: sp.title,
      vendor: sp.vendor ?? null,
      productType: sp.product_type ?? null,
      status: statusNorm, // 'active' | 'draft'
      tags: sp.tags ? sp.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
    };
  }

  private convertShopifyVariant(sv: ShopifyVariant, localProductId: number): InsertVariant {
    return {
      idShopify: String(sv.id),
      productId: localProductId,
      sku: sv.sku ?? null,
      price: sv.price ?? null,
      compareAtPrice: sv.compare_at_price ?? null,
      barcode: sv.barcode ?? null,
      inventoryQty: sv.inventory_quantity ?? 0,
    };
  }

  // Upsert de un producto + variantes
  private async upsertOne(sp: ShopifyProduct): Promise<void> {
    const existing = await storage.getProductByShopifyId(String(sp.id), this.storeNumber);
    const productData = this.convertShopifyProduct(sp);

    let local: Product;
    if (existing) {
      local = await storage.updateProduct(existing.id, productData);
      // console.log(`🔄 Producto actualizado: ${sp.title}`);
    } else {
      local = await storage.createProduct(productData);
      // console.log(`➕ Nuevo producto: ${sp.title}`);
    }

    // Variantes: upsert por idShopify
    if (sp.variants && sp.variants.length > 0) {
      for (const sv of sp.variants) {
        const vData = this.convertShopifyVariant(sv, local.id);
        const [vExisting] = await db
          .select()
          .from(variants)
          .where(eq(variants.idShopify, String(sv.id)))
          .limit(1);
        if (vExisting) {
          await storage.updateVariant(vExisting.id, vData);
        } else {
          await storage.createVariant(vData);
        }
      }
      // (Opcional) Prune variantes que ya no existan en Shopify:
      // await storage.deleteVariantsNotInList(local.id, sp.variants.map(v => String(v.id)));
    }
  }

  /**
   * Sincroniza productos con soporte opcional de incremental por fecha y paginación completa.
   * - updatedSince: ISO8601 para traer solo productos actualizados desde esa fecha
   * - limit: tamaño de página (<=250)
   */
  async syncProductsFromShopify(limit: number = 250, updatedSince?: string): Promise<SyncResult> {
    console.log(`🔄 Sincronizando productos tienda ${this.storeNumber} (limit=${limit}${updatedSince ? `, updated>=${updatedSince}` : ""})`);

    const result: SyncResult = { success: false, productsProcessed: 0, errors: [] };

    try {
      let cursor: string | undefined = undefined;
      let firstPage = true;

      while (true) {
        let params: Record<string, any>;
        if (firstPage) {
          params = { limit: Math.min(limit, 250) };
          if (updatedSince) params.updated_at_min = updatedSince;
          // Puedes añadir fields si quieres acotar, pero Shopify devuelve variantes por default
          firstPage = false;
        } else {
          // Con page_info no mandes otros filtros
          params = { limit: Math.min(limit, 250), page_info: cursor };
        }

        const resp = await this.client.getProducts(params);
        const prods: ShopifyProduct[] = resp.products || [];
        // console.log(`📦 Página productos: ${prods.length}`);

        for (const sp of prods) {
          try {
            await this.upsertOne(sp);
            result.productsProcessed++;
          } catch (e: any) {
            const msg = `Producto "${sp.title}" error: ${e?.message || e}`;
            console.log("❌", msg);
            result.errors.push(msg);
          }
        }

        if (!resp.hasNextPage) break;
        cursor = resp.nextPageInfo!;
        // Respeta rate limit
        await new Promise(r => setTimeout(r, 500));
      }

      result.success = result.errors.length === 0;
      return result;
    } catch (e: any) {
      const msg = `Error general sync productos: ${e?.message || e}`;
      console.log("❌", msg);
      result.errors.push(msg);
      return result;
    }
  }

  // Mantén este método para el script de backfill por chunks
  async syncProductsChunk(shopifyProducts: ShopifyProduct[]): Promise<SyncResult> {
    const result: SyncResult = { success: false, productsProcessed: 0, errors: [] };
    for (const sp of shopifyProducts) {
      try {
        await this.upsertOne(sp);
        result.productsProcessed++;
      } catch (e: any) {
        result.errors.push(`Producto "${sp.title}" error: ${e?.message || e}`);
      }
    }
    result.success = result.errors.length === 0;
    return result;
  }

  async updateProductInShopify(
    productId: number,
    updates: {
      title?: string;
      vendor?: string;
      status?: 'active' | 'draft';
      tags?: string[];
    }
  ): Promise<ProductUpdateResult> {
    console.log(`🔄 Actualizando producto ${productId} en Shopify tienda ${this.storeNumber}`);

    try {
      // Obtener producto local
      const localProduct = await storage.getProduct(productId);
      if (!localProduct) {
        return { success: false, error: 'Producto no encontrado en BD local' };
      }

      // Preparar datos para Shopify
      const shopifyData: any = {};
      if (updates.title) shopifyData.title = updates.title;
      if (updates.vendor) shopifyData.vendor = updates.vendor;
      if (updates.status) shopifyData.status = updates.status;
      if (updates.tags) shopifyData.tags = updates.tags.join(', ');

      // Actualizar en Shopify primero
      await this.client.updateProduct(localProduct.idShopify, shopifyData);
      console.log(`✅ Shopify actualizado para producto ${localProduct.idShopify}`);

      // Si Shopify se actualiza exitosamente, actualizar BD local
      const updatedProduct = await storage.updateProduct(productId, {
        title: updates.title || localProduct.title,
        vendor: updates.vendor || localProduct.vendor,
        status: updates.status || localProduct.status,
        tags: updates.tags || localProduct.tags,
      });

      console.log(`✅ BD local actualizada para producto ${productId}`);

      return {
        success: true,
        product: updatedProduct,
        shopifyUpdated: true,
      };

    } catch (error) {
      console.log(`❌ Error actualizando producto ${productId}: ${error}`);
      return {
        success: false,
        error: String(error),
        shopifyUpdated: false,
      };
    }
  }

  async updateVariantInShopify(
    variantId: number,
    updates: {
      price?: string;
      compareAtPrice?: string;
      sku?: string;
      inventoryQty?: number;
    }
  ): Promise<ProductUpdateResult> {
    console.log(`🔄 Actualizando variante ${variantId} en Shopify tienda ${this.storeNumber}`);

    try {
      // Obtener variante local
      const localVariant = await storage.getVariant(variantId);
      if (!localVariant) {
        return { success: false, error: 'Variante no encontrada en BD local' };
      }

      // Preparar datos para Shopify
      const shopifyData: any = {};
      if (updates.price) shopifyData.price = updates.price;
      if (updates.compareAtPrice) shopifyData.compare_at_price = updates.compareAtPrice;
      if (updates.sku) shopifyData.sku = updates.sku;
      if (updates.inventoryQty !== undefined) shopifyData.inventory_quantity = updates.inventoryQty;

      // Actualizar en Shopify primero
      await this.client.updateVariant(localVariant.idShopify, shopifyData);
      console.log(`✅ Shopify actualizado para variante ${localVariant.idShopify}`);

      // Si Shopify se actualiza exitosamente, actualizar BD local
      const updatedVariant = await storage.updateVariant(variantId, {
        price: updates.price || localVariant.price,
        compareAtPrice: updates.compareAtPrice || localVariant.compareAtPrice,
        sku: updates.sku || localVariant.sku,
        inventoryQty: updates.inventoryQty ?? localVariant.inventoryQty,
      });

      console.log(`✅ BD local actualizada para variante ${variantId}`);

      return {
        success: true,
        shopifyUpdated: true,
      };

    } catch (error) {
      console.log(`❌ Error actualizando variante ${variantId}: ${error}`);
      return {
        success: false,
        error: String(error),
        shopifyUpdated: false,
      };
    }
  }

  async getProductsForStore(shopId: number): Promise<Product[]> {
    return await storage.getProducts(shopId);
  }

  async getVariantsForProduct(productId: number): Promise<Variant[]> {
    return await storage.getVariants(productId);
  }

  getStoreInfo() {
    return this.client.getStoreInfo();
  }
}