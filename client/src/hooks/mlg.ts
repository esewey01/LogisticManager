// MLG-INTEGRATION: React Query hooks for MLG API endpoints
import { useQuery, useMutation, type UseQueryOptions, type UseMutationOptions } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

// ========== Types ==========
export type MlgCategory = {
  id: number;
  valor: string;
};

export type MlgSubcategory = {
  idSubCategoria: number;
  idCategoria: number;
  subCategoria: string;
};

export type MlgBrand = {
  id: number;
  valor: string;
};

export type BulkProductsRequest = {
  products: any[];
};

export type BulkProductsResponse = {
  isSuccess: boolean;
  totalProductos?: number;
  folioLote?: string;
  errorList?: string[];
};

export type UpdateStockRequest = {
  idProducto: number;
  stock: number;
};

export type UpdateStockResponse = {
  isSuccess: boolean;
  description?: string;
};

export type ProductsRequest = {
  idProveedor: number;
  pagina?: number;
  registros?: number;
  campoOrden?: string;
  esDesc?: boolean;
  filtroProducto?: string;
};

export type SalesRequest = {
  page?: number;
  totalRows?: number;
  providerId: number;
  orderBy?: string;
  orderType?: string;
  filter?: string;
  dateMin?: string;
  dateMax?: string;
};

export type GenerateShippingLabelRequest = {
  idProveedor: number;
  idCanje: number;
  productos: any[];
};

// ========== Query Hooks ==========

/**
 * Hook para obtener categorías de MLG
 */
export const useMlgCategories = (options?: UseQueryOptions<MlgCategory[]>) => {
  return useQuery<MlgCategory[]>({
    queryKey: ["/api/mlg/categories"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/mlg/categories");
      return res.json();
    },
    ...options,
  });
};

/**
 * Hook para obtener subcategorías de MLG
 */
export const useMlgSubcategories = (options?: UseQueryOptions<MlgSubcategory[]>) => {
  return useQuery<MlgSubcategory[]>({
    queryKey: ["/api/mlg/subcategories"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/mlg/subcategories");
      return res.json();
    },
    ...options,
  });
};

/**
 * Hook para obtener marcas de MLG
 */
export const useMlgBrands = (options?: UseQueryOptions<MlgBrand[]>) => {
  return useQuery<MlgBrand[]>({
    queryKey: ["/api/mlg/brands"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/mlg/brands");
      return res.json();
    },
    ...options,
  });
};

/**
 * Hook para obtener comisiones de MLG
 */
export const useMlgCommissions = (options?: UseQueryOptions<any>) => {
  return useQuery<any>({
    queryKey: ["/api/mlg/commissions"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/mlg/commissions");
      return res.json();
    },
    ...options,
  });
};

/**
 * Hook para obtener productos del proveedor
 */
export const useMlgProducts = (
  request: ProductsRequest,
  options?: UseQueryOptions<any>
) => {
  return useQuery<any>({
    queryKey: ["/api/mlg/products", request],
    queryFn: async () => {
      const res = await apiRequest("POST", "/api/mlg/products", request);
      return res.json();
    },
    enabled: !!request.idProveedor,
    ...options,
  });
};

/**
 * Hook para obtener ventas
 */
export const useMlgSales = (
  request: SalesRequest,
  options?: UseQueryOptions<any>
) => {
  return useQuery<any>({
    queryKey: ["/api/mlg/sales", request],
    queryFn: async () => {
      const res = await apiRequest("POST", "/api/mlg/sales", request);
      return res.json();
    },
    enabled: !!request.providerId,
    ...options,
  });
};

// ========== Mutation Hooks ==========

/**
 * Hook para carga masiva de productos
 */
export const useMlgBulkProducts = (
  options?: UseMutationOptions<BulkProductsResponse, Error, BulkProductsRequest>
) => {
  return useMutation<BulkProductsResponse, Error, BulkProductsRequest>({
    mutationFn: async (data: BulkProductsRequest) => {
      const res = await apiRequest("POST", "/api/mlg/products/bulk", data);
      return res.json();
    },
    ...options,
  });
};

/**
 * Hook para actualizar inventario
 */
export const useMlgUpdateStock = (
  options?: UseMutationOptions<UpdateStockResponse, Error, UpdateStockRequest>
) => {
  return useMutation<UpdateStockResponse, Error, UpdateStockRequest>({
    mutationFn: async (data: UpdateStockRequest) => {
      const res = await apiRequest("POST", "/api/mlg/products/update-stock", data);
      return res.json();
    },
    ...options,
  });
};

/**
 * Hook para generar guía de envío
 */
export const useMlgGenerateShippingLabel = (
  options?: UseMutationOptions<any, Error, GenerateShippingLabelRequest>
) => {
  return useMutation<any, Error, GenerateShippingLabelRequest>({
    mutationFn: async (data: GenerateShippingLabelRequest) => {
      const res = await apiRequest("POST", "/api/mlg/sales/generate-shipping-label", data);
      return res.json();
    },
    ...options,
  });
};