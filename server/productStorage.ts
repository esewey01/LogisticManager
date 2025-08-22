// Módulo de almacenamiento unificado para productos (Catálogo, Shopify y Conciliación)
import { db as baseDatos } from "./db";
import { sql } from "drizzle-orm";
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
      page, 
      pageSize, 
      search, 
      searchField, 
      marca, 
      categoria, 
      condicion, 
      marca_producto,
      orderBy = 'nombre_producto',
      orderDir = 'asc'
    } = params;

    // Validación de parámetros de entrada
    if (page < 1 || pageSize < 1 || pageSize > 1000) {
      throw new Error("Parámetros de paginación inválidos");
    }

    const offset = Math.max(0, (page - 1) * pageSize);

    try {
      // Construir consulta usando SQL directo para simplificar
      let sqlQuery = `
        SELECT sku, marca, sku_interno, codigo_barras, nombre_producto, modelo, categoria, 
               condicion, marca_producto, variante, largo, ancho, alto, peso, foto, costo, stock
        FROM catalogo_productos
        WHERE 1=1
      `;
      const queryParams: any[] = [];
      let paramCount = 0;

      // Aplicar filtros dinámicos usando SQL nativo
      if (search) {
        if (searchField && ['sku', 'sku_interno', 'codigo_barras', 'nombre_producto'].includes(searchField)) {
          sqlQuery += ` AND LOWER(COALESCE(${searchField}, '')) LIKE LOWER($${++paramCount})`;
          queryParams.push(`%${search.toLowerCase()}%`);
        } else {
          sqlQuery += ` AND (
            LOWER(COALESCE(sku, '')) LIKE LOWER($${++paramCount}) OR
            LOWER(COALESCE(sku_interno, '')) LIKE LOWER($${paramCount + 1}) OR
            LOWER(COALESCE(codigo_barras, '')) LIKE LOWER($${paramCount + 2}) OR
            LOWER(COALESCE(nombre_producto, '')) LIKE LOWER($${paramCount + 3})
          )`;
          const searchTerm = `%${search.toLowerCase()}%`;
          queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
          paramCount += 4;
        }
      }

      if (marca) {
        sqlQuery += ` AND marca = $${++paramCount}`;
        queryParams.push(marca);
      }
      if (categoria) {
        sqlQuery += ` AND categoria = $${++paramCount}`;
        queryParams.push(categoria);
      }
      if (condicion) {
        sqlQuery += ` AND condicion = $${++paramCount}`;
        queryParams.push(condicion);
      }
      if (marca_producto) {
        sqlQuery += ` AND marca_producto = $${++paramCount}`;
        queryParams.push(marca_producto);
      }

      // Aplicar ordenamiento (validar columna)
      const validColumns = ['sku', 'nombre_producto', 'categoria', 'marca', 'marca_producto'];
      const orderColumn = validColumns.includes(orderBy) ? orderBy : 'nombre_producto';
      const orderDirection = orderDir === 'desc' ? 'DESC' : 'ASC';
      
      sqlQuery += ` ORDER BY ${orderColumn} ${orderDirection}`;
      sqlQuery += ` LIMIT $${++paramCount} OFFSET $${++paramCount}`;
      queryParams.push(pageSize, offset);

      // Ejecutar consulta principal
      const productos = await baseDatos.execute(sql.raw(sqlQuery, queryParams));

      // Contar total con los mismos filtros
      let countQuery = 'SELECT COUNT(*) as total FROM catalogo_productos WHERE 1=1';
      const countParams: any[] = [];
      let countParamCount = 0;

      // Aplicar los mismos filtros para el conteo
      if (search) {
        if (searchField && ['sku', 'sku_interno', 'codigo_barras', 'nombre_producto'].includes(searchField)) {
          countQuery += ` AND LOWER(COALESCE(${searchField}, '')) LIKE LOWER($${++countParamCount})`;
          countParams.push(`%${search.toLowerCase()}%`);
        } else {
          countQuery += ` AND (
            LOWER(COALESCE(sku, '')) LIKE LOWER($${++countParamCount}) OR
            LOWER(COALESCE(sku_interno, '')) LIKE LOWER($${countParamCount + 1}) OR
            LOWER(COALESCE(codigo_barras, '')) LIKE LOWER($${countParamCount + 2}) OR
            LOWER(COALESCE(nombre_producto, '')) LIKE LOWER($${countParamCount + 3})
          )`;
          const searchTerm = `%${search.toLowerCase()}%`;
          countParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
          countParamCount += 4;
        }
      }
      if (marca) {
        countQuery += ` AND marca = $${++countParamCount}`;
        countParams.push(marca);
      }
      if (categoria) {
        countQuery += ` AND categoria = $${++countParamCount}`;
        countParams.push(categoria);
      }
      if (condicion) {
        countQuery += ` AND condicion = $${++countParamCount}`;
        countParams.push(condicion);
      }
      if (marca_producto) {
        countQuery += ` AND marca_producto = $${++countParamCount}`;
        countParams.push(marca_producto);
      }

      const totalResult = await baseDatos.execute(sql.raw(countQuery, countParams));
      const total = Number(totalResult.rows[0]?.total ?? 0);

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
        total,
        page,
        pageSize,
        // Metadatos útiles para debugging
        debug: process.env.NODE_ENV === 'development' ? {
          appliedFilters: { search, searchField, marca, categoria, condicion, marca_producto },
          orderBy: orderColumn,
          orderDir
        } : undefined
      };
    } catch (error: any) {
      console.error("Error getting catalog products:", error);
      
      // Manejo de errores específicos
      if (error.message?.includes('column') && error.message?.includes('does not exist')) {
        throw new Error(`Campo de ordenamiento inválido: ${orderBy}`);
      }
      
      throw new Error(`Error al obtener productos del catálogo: ${error.message}`);
    }
  }

  /** Actualiza un producto del catálogo */
  async updateCatalogProduct(sku: string, updates: any) {
    try {
      // Construir update dinámico usando SQL template
      const updateFields = Object.keys(updates);
      if (updateFields.length === 0) return { success: true };

      // Usar SQL directo para la actualización
      await baseDatos.execute(sql`
        UPDATE catalogo_productos 
        SET nombre_producto = ${updates.nombre_producto || null}
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
    page: number;
    pageSize: number;
    search?: string;
    shopId?: number;
    status?: string;
    vendor?: string;
    productType?: string;
    syncStatus?: string;
  }) {
    const { page, pageSize, search, shopId, status, vendor, productType, syncStatus } = params;
    const offset = Math.max(0, (page - 1) * pageSize);

    try {
      let whereConditions = ["1=1"];
      let queryParams: any[] = [];
      let paramIndex = 1;

      if (search) {
        whereConditions.push(`(
          LOWER(COALESCE(p.title, '')) LIKE LOWER($${paramIndex}) OR
          LOWER(COALESCE(v.sku, '')) LIKE LOWER($${paramIndex + 1}) OR
          LOWER(COALESCE(v.barcode, '')) LIKE LOWER($${paramIndex + 2})
        )`);
        const searchPattern = `%${search}%`;
        queryParams.push(searchPattern, searchPattern, searchPattern);
        paramIndex += 3;
      }

      if (shopId) {
        whereConditions.push(`p.shop_id = $${paramIndex}`);
        queryParams.push(shopId);
        paramIndex++;
      }

      if (status) {
        whereConditions.push(`p.status = $${paramIndex}`);
        queryParams.push(status);
        paramIndex++;
      }

      if (vendor) {
        whereConditions.push(`p.vendor = $${paramIndex}`);
        queryParams.push(vendor);
        paramIndex++;
      }

      if (productType) {
        whereConditions.push(`p.product_type = $${paramIndex}`);
        queryParams.push(productType);
        paramIndex++;
      }

      const whereClause = whereConditions.join(' AND ');

      // Obtener productos con variantes usando SQL simple
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
        ORDER BY p.title, v.sku
        LIMIT ${pageSize} OFFSET ${offset}
      `);

      // Contar total
      const totalResult = await baseDatos.execute(sql`
        SELECT COUNT(DISTINCT p.id) as total 
        FROM products p
        LEFT JOIN variants v ON v.product_id = p.id
      `);

      const total = Number(totalResult.rows[0]?.total ?? 0);

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
        total,
        page,
        pageSize
      };
    } catch (error) {
      console.error("Error getting Shopify products:", error);
      return { rows: [], total: 0, page, pageSize };
    }
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