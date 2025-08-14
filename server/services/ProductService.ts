// server/services/ProductService.ts
// Servicio para gestión de productos con sincronización bidireccional Shopify

import { ShopifyAdminClient } from './ShopifyAdminClient';
import { storage } from '../storage';
import type { InsertProduct, InsertVariant, Product, Variant } from '@shared/schema';

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

interface ProductUpdateResult {
  success: boolean;
  product?: Product;
  error?: string;
  shopifyUpdated?: boolean;
}

export class ProductService {
  private client: ShopifyAdminClient;
  private storeNumber: number;

  constructor(storeParam: string = '1') {
    this.client = new ShopifyAdminClient(storeParam);
    this.storeNumber = parseInt(storeParam);
  }

  private convertShopifyProduct(shopifyProduct: ShopifyProduct): InsertProduct {
    return {
      idShopify: shopifyProduct.id,
      shopId: this.storeNumber,
      title: shopifyProduct.title,
      vendor: shopifyProduct.vendor || null,
      productType: shopifyProduct.product_type || null,
      status: shopifyProduct.status as 'active' | 'draft',
      tags: shopifyProduct.tags ? shopifyProduct.tags.split(', ').filter(Boolean) : [],
    };
  }

  private convertShopifyVariant(shopifyVariant: any, localProductId: number): InsertVariant {
    return {
      idShopify: shopifyVariant.id,
      productId: localProductId,
      sku: shopifyVariant.sku || null,
      price: shopifyVariant.price || null,
      compareAtPrice: shopifyVariant.compare_at_price || null,
      barcode: shopifyVariant.barcode || null,
      inventoryQty: shopifyVariant.inventory_quantity || 0,
    };
  }

  async syncProductsFromShopify(limit: number = 50): Promise<{
    success: boolean;
    productsProcessed: number;
    errors: string[];
  }> {
    console.log(`🔄 Sincronizando productos desde Shopify tienda ${this.storeNumber}`);
    
    const result = {
      success: false,
      productsProcessed: 0,
      errors: [] as string[],
    };

    try {
      const response = await this.client.getProducts({ limit });
      const products: ShopifyProduct[] = response.products || [];

      console.log(`📦 Obtenidos ${products.length} productos de Shopify`);

      for (const shopifyProduct of products) {
        try {
          // Verificar si el producto ya existe
          const existingProduct = await storage.getProductByShopifyId(
            shopifyProduct.id,
            this.storeNumber
          );

          let localProduct: Product;

          if (existingProduct) {
            // Actualizar producto existente
            const productData = this.convertShopifyProduct(shopifyProduct);
            localProduct = await storage.updateProduct(existingProduct.id, productData);
            console.log(`🔄 Producto actualizado: ${shopifyProduct.title}`);
          } else {
            // Crear nuevo producto
            const productData = this.convertShopifyProduct(shopifyProduct);
            localProduct = await storage.createProduct(productData);
            console.log(`➕ Nuevo producto: ${shopifyProduct.title}`);
          }

          // Sincronizar variantes
          if (shopifyProduct.variants && shopifyProduct.variants.length > 0) {
            for (const shopifyVariant of shopifyProduct.variants) {
              const variantData = this.convertShopifyVariant(shopifyVariant, localProduct.id);
              
              // Por simplicidad, crear siempre nueva variante (en prod, verificar existencia)
              await storage.createVariant(variantData);
            }
          }

          result.productsProcessed++;

        } catch (error) {
          const errorMsg = `Error procesando producto ${shopifyProduct.title}: ${error}`;
          console.log(`❌ ${errorMsg}`);
          result.errors.push(errorMsg);
        }
      }

      result.success = result.errors.length === 0;
      return result;

    } catch (error) {
      const errorMsg = `Error sincronizando productos: ${error}`;
      console.log(`❌ ${errorMsg}`);
      result.errors.push(errorMsg);
      return result;
    }
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