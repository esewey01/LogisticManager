// Módulo de almacenamiento unificado para productos (Catálogo, Shopify y Conciliación)
import { db as baseDatos } from "./db";
import { sql, SQL } from "drizzle-orm";
import { eq, and, or, isNull, isNotNull, desc, asc, count } from "drizzle-orm";
import {
  productLinks,
  shopifyJobs,
  variants,
  products,
  type ProductLink,
  type InsertProductLink,
  type ShopifyJob,
  type InsertShopifyJob
} from "@shared/schema";

export class ProductStorage {

  // ================== CATÁLOGO ==================

  /** 
   * Obtiene productos del catálogo con paginación y filtros avanzados
   * Corrección: Implementa búsqueda y filtros dinámicos correctamente
   */
  async getCatalogProducts(params: {
    page: number;
    pageSize: number;
    search?: string;
    searchField?: 'sku' | 'sku_interno' | 'codigo_barras' | 'nombre_producto';
    marca?: string;
    categoria?: string;
    condicion?: string;
    marca_producto?: string;
    orderBy?: string;
    orderDir?: 'asc' | 'desc';
  }) {
    const {
      page, pageSize, search, searchField,
      marca, categoria, condicion, marca_producto,
      orderBy = 'nombre_producto', orderDir = 'asc'
    } = params;

    if (page < 1 || pageSize < 1 || pageSize > 1000) {
      throw new Error("Parámetros de paginación inválidos");
    }
    const offset = (page - 1) * pageSize;

    // columnas permitidas para ORDER BY / searchField
    const validCols = ['sku', 'sku_interno', 'codigo_barras', 'nombre_producto', 'categoria', 'marca', 'marca_producto'] as const;
    const orderCol = validCols.includes(orderBy as any) ? orderBy : 'nombre_producto';
    const orderDirection = orderDir === 'desc' ? sql.raw('DESC') : sql.raw('ASC');

    // WHERE dinámico
    const whereParts: SQL[] = [sql`1=1`];

    if (search) {
      if (searchField && (validCols as readonly string[]).includes(searchField)) {
        // LOWER(COALESCE(col,'')) LIKE LOWER(%term%)
        whereParts.push(
          sql`LOWER(COALESCE(${sql.raw(searchField)}, '')) LIKE LOWER(${`%${search.toLowerCase()}%`})`
        );
      } else {
        const s = `%${search.toLowerCase()}%`;
        whereParts.push(sql`(
        LOWER(COALESCE(sku,'')) LIKE LOWER(${s})
        OR LOWER(COALESCE(sku_interno,'')) LIKE LOWER(${s})
        OR LOWER(COALESCE(codigo_barras,'')) LIKE LOWER(${s})
        OR LOWER(COALESCE(nombre_producto,'')) LIKE LOWER(${s})
      )`);
      }
    }
    if (marca) whereParts.push(sql`marca = ${marca}`);
    if (categoria) whereParts.push(sql`categoria = ${categoria}`);
    if (condicion) whereParts.push(sql`condicion = ${condicion}`);
    if (marca_producto) whereParts.push(sql`marca_producto = ${marca_producto}`);

    const whereSQL = sql.join(whereParts, sql` AND `);

    // Consulta principal
    const productos = await baseDatos.execute(sql`
    SELECT
      sku, marca, sku_interno, codigo_barras, nombre_producto, modelo, categoria,
      condicion, marca_producto, variante, largo, ancho, alto, peso, foto, costo, stock
    FROM ${sql.raw('catalogo_productos')}
    WHERE ${whereSQL}
    ORDER BY ${sql.raw(orderCol)} ${orderDirection}
    LIMIT ${pageSize} OFFSET ${offset}
  `);

    // Conteo
    const totalRes = await baseDatos.execute(sql`
    SELECT COUNT(*)::int AS total
    FROM ${sql.raw('catalogo_productos')}
    WHERE ${whereSQL}
  `);

    const total = Number(totalRes.rows[0]?.total ?? 0);

    return {
      rows: productos.rows.map((p: any) => ({
        sku: p.sku,
        marca: p.marca,
        sku_interno: p.sku_interno,
        codigo_barras: p.codigo_barras,
        nombre_producto: p.nombre_producto,
        modelo: p.modelo,
        categoria: p.categoria,
        condicion: p.condicion,
        marca_producto: p.marca_producto,
        variante: p.variante,
        largo: p.largo ? Number(p.largo) : null,
        ancho: p.ancho ? Number(p.ancho) : null,
        alto: p.alto ? Number(p.alto) : null,
        peso: p.peso ? Number(p.peso) : null,
        foto: p.foto,
        costo: p.costo ? Number(p.costo) : null,
        stock: p.stock ? Number(p.stock) : 0,
      })),
      total, page, pageSize
    };
  }

  async createCatalogProduct(product: any) {
    const cols = Object.keys(product);
    if (cols.length === 0) throw new Error("Datos insuficientes");

    const colNodes = cols.map((c) => sql.raw(c));      // identificadores seguros porque vienen de tu UI/whitelist
    const valNodes = cols.map((c) => sql`${product[c]}`);

    const result = await baseDatos.execute(sql`
    INSERT INTO ${sql.raw('catalogo_productos')}
      (${sql.join(colNodes, sql`, `)})
    VALUES
      (${sql.join(valNodes, sql`, `)})
    RETURNING *
  `);

    return result.rows[0];
  }

  async deleteCatalogProduct(sku: string) {
    await baseDatos.execute(sql`DELETE FROM catalogo_productos WHERE sku = ${sku}`);
    return { success: true };
  }

  /** Actualiza un producto del catálogo */
  async updateCatalogProduct(sku: string, updates: any) {
    try {
      const fields = Object.keys(updates);
      if (fields.length === 0) return { success: true };

      // lista de "col = valor"
      const setNodes = fields.map((f) => sql`${sql.raw(f)} = ${updates[f]}`);

      await baseDatos.execute(sql`
      UPDATE ${sql.raw('catalogo_productos')}
      SET ${sql.join(setNodes, sql`, `)}
      WHERE sku = ${sku}
    `);

      return { success: true };
    } catch (error) {
      console.error("Error updating catalog product:", error);
      throw error;
    }
  }


  /** Obtiene facetas únicas para filtros */
  async getCatalogFacets() {
    try {
      const [marcas, categorias, condiciones, marcasProducto] = await Promise.all([
        baseDatos.execute(sql`SELECT DISTINCT marca FROM catalogo_productos WHERE marca IS NOT NULL ORDER BY marca`),
        baseDatos.execute(sql`SELECT DISTINCT categoria FROM catalogo_productos WHERE categoria IS NOT NULL ORDER BY categoria`),
        baseDatos.execute(sql`SELECT DISTINCT condicion FROM catalogo_productos WHERE condicion IS NOT NULL ORDER BY condicion`),
        baseDatos.execute(sql`SELECT DISTINCT marca_producto FROM catalogo_productos WHERE marca_producto IS NOT NULL ORDER BY marca_producto`)
      ]);

      return {
        marcas: marcas.rows.map((r: any) => r.marca),
        categorias: categorias.rows.map((r: any) => r.categoria),
        condiciones: condiciones.rows.map((r: any) => r.condicion),
        marcasProducto: marcasProducto.rows.map((r: any) => r.marca_producto)
      };
    } catch (error) {
      console.error("Error getting catalog facets:", error);
      return { marcas: [], categorias: [], condiciones: [], marcasProducto: [] };
    }
  }

  // ================== SHOPIFY ==================

  /** Obtiene productos Shopify con variantes paginados */
  async getShopifyProducts(params: {
    page: number; pageSize: number; search?: string;
    shopId?: number; status?: string; vendor?: string; productType?: string; syncStatus?: string;
  }) {
    const { page, pageSize, search, shopId, status, vendor, productType } = params;
    const offset = (page - 1) * pageSize;

    const whereParts: SQL[] = [sql`1=1`];

    if (search) {
      const s = `%${search}%`;
      whereParts.push(sql`(
      LOWER(COALESCE(p.title,'')) LIKE LOWER(${s})
      OR LOWER(COALESCE(v.sku,'')) LIKE LOWER(${s})
      OR LOWER(COALESCE(v.barcode,'')) LIKE LOWER(${s})
    )`);
    }
    if (shopId) whereParts.push(sql`p.shop_id = ${shopId}`);
    if (status) whereParts.push(sql`p.status = ${status}`);
    if (vendor) whereParts.push(sql`p.vendor = ${vendor}`);
    if (productType) whereParts.push(sql`p.product_type = ${productType}`);

    const whereSQL = sql.join(whereParts, sql` AND `);

    const productos = await baseDatos.execute(sql`
    SELECT 
      p.id as product_id,
      p.id_shopify as shopify_product_id,
      p.shop_id,
      p.title,
      p.vendor,
      p.product_type,
      p.status as product_status,
      v.id as variant_id,
      v.id_shopify as shopify_variant_id,
      v.sku,
      v.price,
      v.compare_at_price,
      v.barcode,
      v.inventory_qty,
      CASE 
        WHEN p.shop_id = 1 THEN 'WordWide'
        WHEN p.shop_id = 2 THEN 'CrediTienda'
        ELSE 'Tienda ' || p.shop_id::text
      END as shop_name
    FROM products p
    LEFT JOIN variants v ON v.product_id = p.id
    WHERE ${whereSQL}
    ORDER BY p.title, v.sku
    LIMIT ${pageSize} OFFSET ${offset}
  `);

    const totalRes = await baseDatos.execute(sql`
    SELECT COUNT(DISTINCT p.id) as total
    FROM products p
    LEFT JOIN variants v ON v.product_id = p.id
    WHERE ${whereSQL}
  `);

    const total = Number(totalRes.rows[0]?.total ?? 0);

    return {
      rows: productos.rows.map((row: any) => ({
        product_id: row.product_id,
        shopify_product_id: row.shopify_product_id,
        shop_id: row.shop_id,
        shop_name: row.shop_name,
        title: row.title,
        vendor: row.vendor,
        product_type: row.product_type,
        product_status: row.product_status,
        variant_id: row.variant_id,
        shopify_variant_id: row.shopify_variant_id,
        sku: row.sku,
        price: row.price ? Number(row.price) : null,
        compare_at_price: row.compare_at_price ? Number(row.compare_at_price) : null,
        barcode: row.barcode,
        inventory_qty: row.inventory_qty || 0,
      })),
      total, page, pageSize
    };
  }

  /** Actualiza una variante Shopify */
  async updateShopifyVariant(variantId: number, updates: any, userId: number) {
    try {
      const [variant] = await baseDatos
        .update(variants)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(eq(variants.id, variantId))
        .returning();

      // Encolar job para sincronizar con Shopify
      if (variant) {
        await this.enqueueShopifyJob({
          shopId: await this.getShopIdByVariant(variantId),
          jobType: 'update_variant',
          shopifyVariantId: variant.idShopify,
          payload: updates
        });
      }

      return variant;
    } catch (error) {
      console.error("Error updating Shopify variant:", error);
      throw error;
    }
  }

  // ================== CONCILIACIÓN ==================

  /** Obtiene estadísticas de conciliación */
  async getReconciliationStats() {
    try {
      const [emparejados, faltantes, conflictos] = await Promise.all([
        baseDatos.execute(sql`
          SELECT COUNT(*) as count 
          FROM product_links 
          WHERE match_status = 'matched'
        `),
        baseDatos.execute(sql`
          SELECT COUNT(*) as count 
          FROM catalogo_productos cp
          LEFT JOIN product_links pl ON cp.sku = pl.catalogo_sku
          WHERE pl.id IS NULL
        `),
        baseDatos.execute(sql`
          SELECT COUNT(*) as count 
          FROM product_links 
          WHERE match_status = 'conflict'
        `)
      ]);

      return {
        emparejados: Number(emparejados.rows[0]?.count ?? 0),
        faltantes: Number(faltantes.rows[0]?.count ?? 0),
        conflictos: Number(conflictos.rows[0]?.count ?? 0)
      };
    } catch (error) {
      console.error("Error getting reconciliation stats:", error);
      return { emparejados: 0, faltantes: 0, conflictos: 0 };
    }
  }

  /** Obtiene productos sin vincular */
  async getUnlinkedProducts(type: 'catalog' | 'shopify', params: { page: number; pageSize: number }) {
    const { page, pageSize } = params;
    const offset = Math.max(0, (page - 1) * pageSize);

    try {
      if (type === 'catalog') {
        // Productos en catálogo sin link
        const result = await baseDatos.execute(sql`
          SELECT cp.sku, cp.nombre_producto, cp.marca_producto, cp.categoria
          FROM catalogo_productos cp
          LEFT JOIN product_links pl ON cp.sku = pl.catalogo_sku
          WHERE pl.id IS NULL
          ORDER BY cp.nombre_producto
          LIMIT ${pageSize} OFFSET ${offset}
        `);

        const totalResult = await baseDatos.execute(sql`
          SELECT COUNT(*) as total
          FROM catalogo_productos cp
          LEFT JOIN product_links pl ON cp.sku = pl.catalogo_sku
          WHERE pl.id IS NULL
        `);

        return {
          rows: result.rows,
          total: Number(totalResult.rows[0]?.total ?? 0),
          page,
          pageSize
        };
      } else {
        // Variantes Shopify sin link
        const result = await baseDatos.execute(sql`
          SELECT 
            v.id as variant_id,
            v.sku,
            v.barcode,
            p.title,
            p.shop_id,
            CASE 
              WHEN p.shop_id = 1 THEN 'WordWide'
              WHEN p.shop_id = 2 THEN 'CrediTienda'
              ELSE 'Tienda ' || p.shop_id::text
            END as shop_name
          FROM variants v
          JOIN products p ON v.product_id = p.id
          LEFT JOIN product_links pl ON v.id = pl.variant_id
          WHERE pl.id IS NULL AND v.sku IS NOT NULL
          ORDER BY p.title, v.sku
          LIMIT ${pageSize} OFFSET ${offset}
        `);

        const totalResult = await baseDatos.execute(sql`
          SELECT COUNT(*) as total
          FROM variants v
          JOIN products p ON v.product_id = p.id
          LEFT JOIN product_links pl ON v.id = pl.variant_id
          WHERE pl.id IS NULL AND v.sku IS NOT NULL
        `);

        return {
          rows: result.rows,
          total: Number(totalResult.rows[0]?.total ?? 0),
          page,
          pageSize
        };
      }
    } catch (error) {
      console.error(`Error getting unlinked ${type} products:`, error);
      return { rows: [], total: 0, page, pageSize };
    }
  }

  /** Crea vínculo entre catálogo y Shopify */
  async createProductLink(link: Omit<InsertProductLink, 'id' | 'createdAt' | 'updatedAt'>) {
    try {
      const [productLink] = await baseDatos
        .insert(productLinks)
        .values({
          ...link,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      return productLink;
    } catch (error) {
      console.error("Error creating product link:", error);
      throw error;
    }
  }

  /** Elimina vínculo */
  async deleteProductLink(id: number) {
    try {
      await baseDatos
        .delete(productLinks)
        .where(eq(productLinks.id, id));

      return { success: true };
    } catch (error) {
      console.error("Error deleting product link:", error);
      throw error;
    }
  }

  // ================== JOBS DE SHOPIFY ==================

  /** Encola job para Shopify */
  async enqueueShopifyJob(job: Omit<InsertShopifyJob, 'id' | 'createdAt'>) {
    try {
      const [shopifyJob] = await baseDatos
        .insert(shopifyJobs)
        .values({
          ...job,
          createdAt: new Date()
        })
        .returning();

      return shopifyJob;
    } catch (error) {
      console.error("Error enqueuing Shopify job:", error);
      throw error;
    }
  }

  // ================== UTILIDADES ==================

  /** Obtiene shop_id por variant_id */
  private async getShopIdByVariant(variantId: number): Promise<number> {
    try {
      const result = await baseDatos.execute(sql`
        SELECT p.shop_id 
        FROM variants v 
        JOIN products p ON v.product_id = p.id 
        WHERE v.id = ${variantId}
      `);

      return Number(result.rows[0]?.shop_id ?? 1);
    } catch (error) {
      console.error("Error getting shop_id by variant:", error);
      return 1;
    }
  }
}

// Exportar instancia única
export const productStorage = new ProductStorage();