import { apiRequest } from "@/lib/queryClient";

export type CatalogoItem = {
  sku: string | null;
  sku_interno: string | null;
  nombre_producto: string | null;
  costo: number | null;
  stock: number | null;
  estado?: string | null;
  marca?: string | null;
  categoria?: string | null;
};

export type CatalogoProductoFull = {
  sku: string | null;
  marca: string | null;
  sku_interno: string | null;
  codigo_barras: string | null;
  nombre_producto: string | null;
  modelo: string | null;
  categoria: string | null;
  condicion: string | null;
  marca_producto: string | null;
  variante: string | null;
  largo: number | null;
  ancho: number | null;
  alto: number | null;
  peso: number | null;
  foto: string | null;
  costo: number | null;
  stock: number | null;
};

export type CatalogoResponse = {
  data: CatalogoItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export const fetchCatalogo = async (params: {
  q?: string;
  campo?: "sku_interno" | "sku" | "nombre";
  marca?: string;
  categoria?: string;
  stock_eq0?: boolean;
  stock_gte?: number;
  page?: number;
  pageSize?: number;
  sort?: string; // campo:asc|desc
}): Promise<CatalogoResponse> => {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.campo) qs.set("campo", params.campo);
  if (params.marca) qs.set("marca", params.marca);
  if (params.categoria) qs.set("categoria", params.categoria);
  if (params.stock_eq0) qs.set("stock_eq0", "true");
  if (typeof params.stock_gte === "number") qs.set("stock_gte", String(params.stock_gte));
  if (params.page) qs.set("page", String(params.page));
  if (params.pageSize) qs.set("pageSize", String(params.pageSize));
  if (params.sort) qs.set("sort", params.sort);
  const res = await apiRequest("GET", `/api/catalogo?${qs.toString()}`);
  return res.json();
};

export const exportCatalogo = async (params: Parameters<typeof fetchCatalogo>[0] & { format: "csv" | "xlsx" }) => {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.campo) qs.set("campo", params.campo);
  if (params.marca) qs.set("marca", params.marca);
  if (params.categoria) qs.set("categoria", params.categoria);
  if (params.stock_eq0) qs.set("stock_eq0", "true");
  if (typeof params.stock_gte === "number") qs.set("stock_gte", String(params.stock_gte));
  if (params.sort) qs.set("sort", params.sort);
  qs.set("format", params.format);
  const res = await apiRequest("GET", `/api/catalogo/export?${qs.toString()}`);
  return res.blob();
};

export const importCatalogo = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/catalogo/import", { method: "POST", body: formData, credentials: "include" });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || `${res.status}`);
  }
  return res.json() as Promise<{ inserted: number; updated: number; errors: number; errorRows?: any[]; reportBase64?: string }>;
};

export const downloadCatalogTemplate = (format: "csv" | "xlsx" = "csv") => {
  const headers = [
    "sku",
    "sku_interno",
    "nombre_producto",
    "costo",
    "stock",
    "estado",
    "marca",
    "categoria",
  ];
  if (format === "csv") {
    const blob = new Blob([headers.join(",") + "\n"], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla_catalogo.csv";
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    a.remove();
    return;
  }
  // Lazy-generate XLSX on client without extra deps: use a minimal CSV renamed
  const blob = new Blob([headers.join(",") + "\n"], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "plantilla_catalogo.xlsx";
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(url);
  a.remove();
};

export const fetchCatalogItem = async (skuInterno: string): Promise<CatalogoProductoFull> => {
  const res = await apiRequest("GET", `/api/catalogo/${encodeURIComponent(skuInterno)}`);
  return res.json();
};

export const updateCatalogItem = async (
  skuInterno: string,
  updates: Partial<CatalogoProductoFull>
): Promise<CatalogoProductoFull> => {
  const res = await apiRequest("PUT", `/api/catalogo/${encodeURIComponent(skuInterno)}` , updates);
  return res.json();
};

export const fetchCatalogShopifyLink = async (
  skuInterno: string
): Promise<{ connected: boolean; store?: string }> => {
  const qs = new URLSearchParams({ sku_interno: skuInterno });
  const res = await apiRequest("GET", `/api/catalogo/shopify-link?${qs.toString()}`);
  return res.json();
};
