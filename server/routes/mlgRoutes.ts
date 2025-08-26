// MLG-INTEGRATION: Complete MLG API endpoints
import type { Express } from "express";
import { z } from "zod";
import { mlgRequest } from "../services/MlgClient";

const MLG_PROVIDER_ID = process.env.MLG_PROVIDER_ID!;

// ========== Validation Schemas ==========
const CategorySchema = z.object({
  id: z.number(),
  valor: z.string(),
});

const SubcategorySchema = z.object({
  idSubCategoria: z.number(),
  idCategoria: z.number(),
  subCategoria: z.string(),
});

const BrandSchema = z.object({
  id: z.number(),
  valor: z.string(),
});

const BulkProductsRequestSchema = z.object({
  products: z.array(z.object({}).passthrough()), // Allow any product structure
});

const BulkProductsResponseSchema = z.object({
  isSuccess: z.boolean(),
  totalProductos: z.number().optional(),
  folioLote: z.string().optional(),
  errorList: z.array(z.string()).optional(),
});

const UpdateStockRequestSchema = z.object({
  idProducto: z.number(),
  stock: z.number(),
});

const UpdateStockResponseSchema = z.object({
  isSuccess: z.boolean(),
  description: z.string().optional(),
});

const ProductsRequestSchema = z.object({
  idProveedor: z.number(),
  pagina: z.number().default(1),
  registros: z.number().default(10),
  campoOrden: z.string().default(""),
  esDesc: z.boolean().default(false),
  filtroProducto: z.string().default(""),
});

const SalesRequestSchema = z.object({
  page: z.number().default(1),
  totalRows: z.number().default(10),
  providerId: z.number(),
  orderBy: z.string().default(""),
  orderType: z.string().default(""),
  filter: z.string().default(""),
  dateMin: z.string().optional(),
  dateMax: z.string().optional(),
});

const GenerateShippingLabelRequestSchema = z.object({
  idProveedor: z.number(),
  idCanje: z.number(),
  productos: z.array(z.object({}).passthrough()),
});

// Helper function for error handling
const handleMlgError = (res: any, error: any, endpoint: string) => {
  console.error(`[MLG] ${endpoint} error:`, error.message);
  return res.status(500).json({ 
    message: `MLG ${endpoint} failed`, 
    error: error.message 
  });
};

export function registerMlgRoutes(app: Express) {
  // ========== Obtener Categorías ==========
  app.get("/api/mlg/categories", async (_req, res) => {
    try {
      const upstream = await mlgRequest("/api/Productos/ObtenerCategorias", { method: "GET" });
      
      if (!upstream.ok) {
        const text = await upstream.text();
        console.error(`[MLG] categories error: HTTP ${upstream.status}`);
        return res.status(502).json({ 
          message: "MLG categories upstream error", 
          statusCode: upstream.status,
          body: text 
        });
      }

      const data = await upstream.json();
      
      // Validate response structure
      const categoriesData = data.categorias || data;
      const validatedCategories = z.array(CategorySchema).parse(categoriesData);
      
      console.log(`[MLG] categories ok - ${validatedCategories.length} categories`);
      res.json(validatedCategories);
    } catch (error: any) {
      handleMlgError(res, error, "categories");
    }
  });

  // ========== Obtener Subcategorías ==========
  app.get("/api/mlg/subcategories", async (_req, res) => {
    try {
      const upstream = await mlgRequest("/api/Productos/ObtenerCatalogoSubCategorias", { method: "GET" });
      
      if (!upstream.ok) {
        const text = await upstream.text();
        console.error(`[MLG] subcategories error: HTTP ${upstream.status}`);
        return res.status(502).json({ 
          message: "MLG subcategories upstream error", 
          statusCode: upstream.status,
          body: text 
        });
      }

      const data = await upstream.json();
      const subcategoriesData = data.subCategorias || data;
      const validatedSubcategories = z.array(SubcategorySchema).parse(subcategoriesData);
      
      console.log(`[MLG] subcategories ok - ${validatedSubcategories.length} subcategories`);
      res.json(validatedSubcategories);
    } catch (error: any) {
      handleMlgError(res, error, "subcategories");
    }
  });

  // ========== Obtener Marcas ==========
  app.get("/api/mlg/brands", async (_req, res) => {
    try {
      const upstream = await mlgRequest("/api/Productos/ObtenerMarcas", { method: "GET" });
      
      if (!upstream.ok) {
        const text = await upstream.text();
        console.error(`[MLG] brands error: HTTP ${upstream.status}`);
        return res.status(502).json({ 
          message: "MLG brands upstream error", 
          statusCode: upstream.status,
          body: text 
        });
      }

      const data = await upstream.json();
      const brandsData = data.marcas || data;
      const validatedBrands = z.array(BrandSchema).parse(brandsData);
      
      console.log(`[MLG] brands ok - ${validatedBrands.length} brands`);
      res.json(validatedBrands);
    } catch (error: any) {
      handleMlgError(res, error, "brands");
    }
  });

  // ========== Carga Masiva de Productos ==========
  app.post("/api/mlg/products/bulk", async (req, res) => {
    try {
      const { products } = BulkProductsRequestSchema.parse(req.body);
      
      const upstream = await mlgRequest("/api/Productos/CargaMasivaProductos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products }),
      });
      
      if (!upstream.ok) {
        const text = await upstream.text();
        console.error(`[MLG] products/bulk error: HTTP ${upstream.status}`);
        return res.status(502).json({ 
          message: "MLG bulk products upstream error", 
          statusCode: upstream.status,
          body: text 
        });
      }

      const data = await upstream.json();
      const validatedResponse = BulkProductsResponseSchema.parse(data);
      
      console.log(`[MLG] products/bulk ok - ${validatedResponse.totalProductos || 0} products processed`);
      res.json(validatedResponse);
    } catch (error: any) {
      handleMlgError(res, error, "products/bulk");
    }
  });

  // ========== Actualizar Inventario ==========
  app.post("/api/mlg/products/update-stock", async (req, res) => {
    try {
      const stockData = UpdateStockRequestSchema.parse(req.body);
      
      const upstream = await mlgRequest("/api/Productos/ActualizarInventarioProducto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(stockData),
      });
      
      if (!upstream.ok) {
        const text = await upstream.text();
        console.error(`[MLG] products/update-stock error: HTTP ${upstream.status}`);
        return res.status(502).json({ 
          message: "MLG update stock upstream error", 
          statusCode: upstream.status,
          body: text 
        });
      }

      const data = await upstream.json();
      const validatedResponse = UpdateStockResponseSchema.parse(data);
      
      console.log(`[MLG] products/update-stock ok - Product ${stockData.idProducto}`);
      res.json(validatedResponse);
    } catch (error: any) {
      handleMlgError(res, error, "products/update-stock");
    }
  });

  // ========== Obtener Comisiones ==========
  app.get("/api/mlg/commissions", async (_req, res) => {
    try {
      if (!MLG_PROVIDER_ID) {
        return res.status(400).json({ message: "MLG_PROVIDER_ID not configured" });
      }

      const upstream = await mlgRequest(`/api/Productos/ObtenerComisiones?IdProveedor=${MLG_PROVIDER_ID}`, { 
        method: "GET" 
      });
      
      if (!upstream.ok) {
        const text = await upstream.text();
        console.error(`[MLG] commissions error: HTTP ${upstream.status}`);
        return res.status(502).json({ 
          message: "MLG commissions upstream error", 
          statusCode: upstream.status,
          body: text 
        });
      }

      const data = await upstream.json();
      
      console.log(`[MLG] commissions ok`);
      res.json(data); // Return raw data as structure may vary
    } catch (error: any) {
      handleMlgError(res, error, "commissions");
    }
  });

  // ========== Obtener Productos del Proveedor ==========
  app.post("/api/mlg/products", async (req, res) => {
    try {
      const productsRequest = ProductsRequestSchema.parse(req.body);
      
      const upstream = await mlgRequest("/api/Productos/ObtenerMisProductos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productsRequest),
      });
      
      if (!upstream.ok) {
        const text = await upstream.text();
        console.error(`[MLG] products error: HTTP ${upstream.status}`);
        return res.status(502).json({ 
          message: "MLG products upstream error", 
          statusCode: upstream.status,
          body: text 
        });
      }

      const data = await upstream.json();
      
      console.log(`[MLG] products ok - page ${productsRequest.pagina}`);
      res.json(data); // Return raw data as structure may vary
    } catch (error: any) {
      handleMlgError(res, error, "products");
    }
  });

  // ========== Obtener Ventas ==========
  app.post("/api/mlg/sales", async (req, res) => {
    try {
      const salesRequest = SalesRequestSchema.parse(req.body);
      
      const upstream = await mlgRequest("/api/Ventas/ObtenerVentasProveedor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(salesRequest),
      });
      
      if (!upstream.ok) {
        const text = await upstream.text();
        console.error(`[MLG] sales error: HTTP ${upstream.status}`);
        return res.status(502).json({ 
          message: "MLG sales upstream error", 
          statusCode: upstream.status,
          body: text 
        });
      }

      const data = await upstream.json();
      
      console.log(`[MLG] sales ok - page ${salesRequest.page}`);
      res.json(data); // Return raw data as structure may vary
    } catch (error: any) {
      handleMlgError(res, error, "sales");
    }
  });

  // ========== Generar Guía de Envío ==========
  app.post("/api/mlg/sales/generate-shipping-label", async (req, res) => {
    try {
      const shippingRequest = GenerateShippingLabelRequestSchema.parse(req.body);
      
      const upstream = await mlgRequest("/api/Ventas/GeneracionGuia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(shippingRequest),
      });
      
      if (!upstream.ok) {
        const text = await upstream.text();
        console.error(`[MLG] sales/generate-shipping-label error: HTTP ${upstream.status}`);
        return res.status(502).json({ 
          message: "MLG generate shipping label upstream error", 
          statusCode: upstream.status,
          body: text 
        });
      }

      const data = await upstream.json();
      
      console.log(`[MLG] sales/generate-shipping-label ok - Canje ${shippingRequest.idCanje}`);
      res.json(data); // Return raw data as structure may vary
    } catch (error: any) {
      handleMlgError(res, error, "sales/generate-shipping-label");
    }
  });
}