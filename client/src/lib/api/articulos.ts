import { apiRequest } from "@/lib/queryClient";

export type ArticuloListItem = {
  sku: string;
  nombre: string | null;
  sku_interno: string | null;
  proveedor: string | null;
  stock: number | null;
  status: 'activo' | 'inactivo' | null;

  // ✅ NUEVOS CAMPOS QUE DEVUELVE EL API DE /api/articulos
  en_almacen?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
  // extensiones para UI de tabla
  stock_a?: number | null;
  es_combo?: boolean | null;
};

export type Articulo = {
  sku: string;
  sku_interno: string | null;
  nombre: string | null;
  descripcion: string | null;
  proveedor: string | null;
  status: 'activo' | 'inactivo' | null;
  categoria: string | null;
  marca_producto: string | null;
  codigo_barras: string | null;
  garantia_meses: number | null;
  tipo_variante: string | null;
  variante: string | null;
  stock: number | null;
  costo: number | null;
  alto_cm: number | null;
  largo_cm: number | null;
  ancho_cm: number | null;
  peso_kg: number | null;
  peso_volumetrico: number | null;
  clave_producto_sat: string | null;
  unidad_medida_sat: string | null;
  clave_unidad_medida_sat: string | null;
  imagen1?: string | null;
  imagen2?: string | null;
  imagen3?: string | null;
  imagen4?: string | null;

  // ✅ NUEVOS (SOLO LECTURA EN UI)
  en_almacen?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
  // extensiones para UI/modal
  stock_a?: number | null;
  es_combo?: boolean | null;
};

export async function fetchArticulos(params: {
  sku?: string;
  sku_interno?: string;
  producto?: string;
  proveedor?: string;
  categoria?: string;
  solo_sin_stock?: boolean;

  // ✅ NUEVOS FILTROS
  en_almacen?: '1' | '0'; // como lo mandas desde la UI
  status?: 'activo' | 'inactivo';

  limit?: number;
  offset?: number;

  // ✅ ORDENAMIENTOS EXTENDIDOS
  order_by?: 'sku' | 'nombre' | 'created_at' | 'updated_at' | 'stock';
  order_dir?: 'asc' | 'desc';
}): Promise<{ data: ArticuloListItem[]; limit: number; offset: number; total: number }> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (typeof v === 'undefined' || v === null) continue;
    if (typeof v === 'boolean') qs.set(k, v ? 'true' : 'false');
    else qs.set(k, String(v));
  }
  const res = await apiRequest('GET', `/api/articulos?${qs.toString()}`);
  return res.json();
}

export async function fetchMarcas(): Promise<Array<{ codigo: string; nombre: string }>> {
  const res = await apiRequest('GET', '/api/marcas');
  return res.json();
}

export async function fetchCategorias(): Promise<string[]> {
  const res = await apiRequest('GET', '/api/articulos/categorias');
  return res.json();
}

export async function fetchArticulo(sku: string): Promise<Articulo> {
  const res = await apiRequest('GET', `/api/articulos/${encodeURIComponent(sku)}`);
  return res.json();
}

export async function updateArticulo(sku: string, updates: Partial<Articulo>): Promise<Articulo> {
  const res = await apiRequest('PUT', `/api/articulos/${encodeURIComponent(sku)}`, updates);
  return res.json();
}

export async function uploadArticuloImages(sku: string, files: File[], order?: string[]): Promise<{ imagenes: string[] }> {
  const form = new FormData();
  for (const f of files) form.append('images', f);
  if (order && order.length) form.append('order', JSON.stringify(order));
  const res = await fetch(`/api/articulos/${encodeURIComponent(sku)}/images`, {
    method: 'POST',
    body: form,
    credentials: 'include',
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getShopifyProductBySkuInterno(sku_interno: string) {
  const qs = new URLSearchParams({ sku_interno });
  const res = await apiRequest('GET', `/api/shopify/product?${qs.toString()}`);
  return res.json();
}

export async function updateShopifyProduct(payload: { sku_interno: string; updates: { title?: string; vendor?: string; status?: 'active' | 'draft'; tags?: string[] }; store?: '1' | '2' }) {
  const res = await apiRequest('PUT', '/api/shopify/product', payload as any);
  return res.json();
}
