// Módulo separado para manejo del catálogo de productos
import { db as baseDatos } from "./db";
import { sql } from "drizzle-orm";

export class CatalogStorage {
  /** Obtiene productos del catálogo paginados con filtros. */
  async getProductsPaginated(params: {
    page: number;
    pageSize: number;
    search?: string;
    categoria?: string;
    activo?: boolean;
  }): Promise<{ rows: any[]; total: number; page: number; pageSize: number }> {
    const { page, pageSize, search, categoria, activo } = params;

    try {
      const offset = Math.max(0, (page - 1) * pageSize);
      
      let whereConditions = ["1=1"];
      let params_array: any[] = [];
      let paramIndex = 1;

      if (search) {
        whereConditions.push(`(
          LOWER(COALESCE(nombre_producto, '')) LIKE LOWER($${paramIndex}) OR
          LOWER(COALESCE(sku, '')) LIKE LOWER($${paramIndex + 1}) OR
          LOWER(COALESCE(marca_producto, '')) LIKE LOWER($${paramIndex + 2})
        )`);
        const searchPattern = `%${search}%`;
        params_array.push(searchPattern, searchPattern, searchPattern);
        paramIndex += 3;
      }

      if (categoria) {
        whereConditions.push(`categoria = $${paramIndex}`);
        params_array.push(categoria);
        paramIndex++;
      }

      if (activo !== undefined) {
        whereConditions.push(`situacion = $${paramIndex}`);
        params_array.push(activo ? 'activo' : 'inactivo');
        paramIndex++;
      }

      const whereClause = whereConditions.join(' AND ');

      // Obtener productos usando SQL directo
      const productos = await baseDatos.execute(sql`
        SELECT sku, marca, nombre_producto, categoria, marca_producto, 
               stock, costo, situacion, sku_interno, codigo_barras
        FROM catalogo_productos 
        WHERE nombre_producto IS NOT NULL
        ORDER BY nombre_producto
        LIMIT ${pageSize} OFFSET ${offset}
      `);

      // Contar total
      const totalResult = await baseDatos.execute(sql`
        SELECT COUNT(*) as total 
        FROM catalogo_productos 
        WHERE nombre_producto IS NOT NULL
      `);

      const total = Number(totalResult.rows[0]?.total ?? 0);

      return {
        rows: productos.rows.map((p: any) => ({
          id: p.sku, // Usar SKU como ID único
          nombre: p.nombre_producto,
          sku: p.sku,
          categoria: p.categoria,
          marca: p.marca_producto,
          precio: p.costo ? Number(p.costo) : null,
          inventario: p.stock || 0,
          activo: p.situacion === 'activo',
          sku_interno: p.sku_interno,
          codigo_barras: p.codigo_barras,
        })),
        total,
        page,
        pageSize
      };
    } catch (error) {
      console.error("Error getting products paginated:", error);
      return { rows: [], total: 0, page, pageSize };
    }
  }

  /** Obtiene las categorías únicas de productos del catálogo. */
  async getProductCategories(): Promise<string[]> {
    try {
      const result = await baseDatos.execute(sql`
        SELECT DISTINCT categoria 
        FROM catalogo_productos 
        WHERE categoria IS NOT NULL 
        ORDER BY categoria
      `);

      return result.rows
        .map((r: any) => r.categoria)
        .filter(Boolean);
    } catch (error) {
      console.error("Error getting product categories:", error);
      return [];
    }
  }

  /** Crea un nuevo producto en el catálogo. */
  async createProduct(datos: any): Promise<any> {
    try {
      await baseDatos.execute(sql`
        INSERT INTO catalogo_productos (
          sku, nombre_producto, categoria, marca_producto, stock, costo, situacion
        ) VALUES (
          ${datos.sku}, 
          ${datos.nombre}, 
          ${datos.categoria || null}, 
          ${datos.marca || null}, 
          ${datos.inventario || 0}, 
          ${datos.precio || null}, 
          ${datos.activo ? 'activo' : 'inactivo'}
        )
      `);

      return {
        id: datos.sku,
        nombre: datos.nombre,
        sku: datos.sku,
        categoria: datos.categoria,
        marca: datos.marca,
        precio: datos.precio,
        inventario: datos.inventario || 0,
        activo: datos.activo ?? true,
      };
    } catch (error) {
      console.error("Error creating product:", error);
      throw error;
    }
  }

  /** Actualiza un producto del catálogo. */
  async updateProduct(id: string, datos: any): Promise<any> {
    try {
      await baseDatos.execute(sql`
        UPDATE catalogo_productos 
        SET 
          nombre_producto = ${datos.nombre || null},
          categoria = ${datos.categoria || null},
          marca_producto = ${datos.marca || null},
          stock = ${datos.inventario || 0},
          costo = ${datos.precio || null},
          situacion = ${datos.activo ? 'activo' : 'inactivo'}
        WHERE sku = ${id}
      `);

      return {
        id,
        nombre: datos.nombre,
        sku: id,
        categoria: datos.categoria,
        marca: datos.marca,
        precio: datos.precio,
        inventario: datos.inventario || 0,
        activo: datos.activo ?? true,
      };
    } catch (error) {
      console.error("Error updating product:", error);
      throw error;
    }
  }

  /** Elimina un producto del catálogo. */
  async deleteProduct(id: string): Promise<void> {
    try {
      await baseDatos.execute(sql`
        DELETE FROM catalogo_productos WHERE sku = ${id}
      `);
    } catch (error) {
      console.error("Error deleting product:", error);
      throw error;
    }
  }
}

// Exportar instancia única
export const catalogStorage = new CatalogStorage();