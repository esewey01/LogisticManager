import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Search, Upload, Download, X, Filter, LayoutList } from "lucide-react";
import { debounce } from "lodash";
import { fetchArticulos, fetchCategorias, fetchMarcas, type ArticuloListItem } from "@/lib/api/articulos";
import ArticuloModal from "@/components/articulos/ArticuloModal";

// ✨ helper para formatear fecha
function fmt(dt?: string | null) {
  if (!dt) return "-";
  try {
    const d = new Date(dt);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("es-ES");
  } catch {
    return "-";
  }
}

export default function ArticulosPage() {
  const [sku, setSku] = useState("");
  const [skuInterno, setSkuInterno] = useState("");
  const [producto, setProducto] = useState("");
  const [proveedor, setProveedor] = useState<string>("all");
  const [categoria, setCategoria] = useState<string>("all");
  const [soloSinStock, setSoloSinStock] = useState(false);
  const [enAlmacen, setEnAlmacen] = useState<"all" | "1" | "0">("all");
  const [status, setStatus] = useState<"all" | "activo" | "inactivo">("all");
  const [orderBy, setOrderBy] = useState<'sku' | 'nombre' | 'created_at' | 'updated_at' | 'stock'>("nombre");
  const [orderDir, setOrderDir] = useState<'asc' | 'desc'>("asc");
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);

  // Estados para el modal
  const [open, setOpen] = useState(false);
  const [selSku, setSelSku] = useState<string>("");

  // Sincronización con URL
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setSku(p.get('sku') || "");
    setSkuInterno(p.get('sku_interno') || "");
    setProducto(p.get('producto') || "");
    setProveedor(p.get('proveedor') || "all");
    setCategoria(p.get('categoria') || "all");
    setSoloSinStock(p.get('solo_sin_stock') === '1');
    setEnAlmacen(["1", "0"].includes(p.get('en_almacen') || "") ? (p.get('en_almacen') as "1"|"0") : "all");
    setStatus(["activo", "inactivo"].includes(p.get('status') || "") ? (p.get('status') as "activo"|"inactivo") : "all");

    const ob = p.get('order_by');
    setOrderBy(['sku','nombre','created_at','updated_at','stock'].includes(ob || "") ? (ob as any) : 'nombre');
    setOrderDir(p.get('order_dir') === 'desc' ? 'desc' : 'asc');
    setLimit(Number(p.get('limit')) || 50);
    setOffset(Number(p.get('offset')) || 0);
  }, []);

  useEffect(() => {
    const qs = new URLSearchParams();
    if (sku) qs.set('sku', sku);
    if (skuInterno) qs.set('sku_interno', skuInterno);
    if (producto) qs.set('producto', producto);
    if (proveedor !== "all") qs.set('proveedor', proveedor);
    if (categoria !== "all") qs.set('categoria', categoria);
    if (soloSinStock) qs.set('solo_sin_stock', '1');
    if (enAlmacen !== "all") qs.set('en_almacen', enAlmacen);
    if (status !== "all") qs.set('status', status);
    if (orderBy) qs.set('order_by', orderBy);
    if (orderDir) qs.set('order_dir', orderDir);
    if (limit !== 50) qs.set('limit', String(limit));
    if (offset) qs.set('offset', String(offset));

    const url = qs.toString() ? `/articulos?${qs.toString()}` : '/articulos';
    window.history.replaceState(null, '', url);
  }, [sku, skuInterno, producto, proveedor, categoria, soloSinStock, enAlmacen, status, orderBy, orderDir, limit, offset]);

  // Debounced inputs
  const [skuInput, setSkuInput] = useState("");
  const [skuIntInput, setSkuIntInput] = useState("");
  const [prodInput, setProdInput] = useState("");

  const debSku = useMemo(() => debounce((v: string) => { setSku(v); setOffset(0); }, 400), []);
  const debSkuInt = useMemo(() => debounce((v: string) => { setSkuInterno(v); setOffset(0); }, 400), []);
  const debProd = useMemo(() => debounce((v: string) => { setProducto(v); setOffset(0); }, 400), []);

  useEffect(() => { debSku(skuInput); }, [skuInput, debSku]);
  useEffect(() => { debSkuInt(skuIntInput); }, [skuIntInput, debSkuInt]);
  useEffect(() => { debProd(prodInput); }, [prodInput, debProd]);

  // Consultas
  const { data: lista, isLoading } = useQuery({
    queryKey: ["/api/articulos", {
      sku, skuInterno, producto, proveedor, categoria, soloSinStock,
      enAlmacen, status, limit, offset, orderBy, orderDir
    }],
    queryFn: () => fetchArticulos({
      sku,
      sku_interno: skuInterno,
      producto,
      proveedor: proveedor === "all" ? undefined : proveedor,
      categoria: categoria === "all" ? undefined : categoria,
      solo_sin_stock: soloSinStock,
      en_almacen: enAlmacen === "all" ? undefined : enAlmacen,
      status: status === "all" ? undefined : status,
      limit, offset,
      order_by: orderBy,
      order_dir: orderDir
    }),
    refetchInterval: 30000,
  });

  const { data: marcas } = useQuery({ queryKey: ["/api/marcas"], queryFn: fetchMarcas });
  const { data: categorias } = useQuery({ queryKey: ["/api/articulos/categorias"], queryFn: fetchCategorias });

  const items = (lista?.data as ArticuloListItem[]) || [];
  const total = lista?.total || 0;

  const abrir = (sku: string) => {
    setSelSku(sku);
    setOpen(true);
  };

  const clearFilters = () => {
    setSkuInput(""); setSku("");
    setSkuIntInput(""); setSkuInterno("");
    setProdInput(""); setProducto("");
    setProveedor("all"); setCategoria("all"); setSoloSinStock(false);
    setEnAlmacen("all"); setStatus("all");
    setOrderBy('nombre'); setOrderDir('asc'); setLimit(50); setOffset(0);
  };

  return (
    <div className="container mx-auto px-2 py-4 space-y-6">
      {/* Encabezado principal */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-800 dark:text-gray-100">
          <Search className="h-5 w-5 text-blue-600" />
          Gestión de Artículos
        </h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => alert('Importar')}>
            <Upload className="h-4 w-4 mr-1" /> Importar
          </Button>
          <Button variant="outline" size="sm" onClick={() => alert('Exportar')}>
            <Download className="h-4 w-4 mr-1" /> Exportar
          </Button>
          <Button
            size="sm"
            onClick={() => alert('Nuevo artículo')}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            + Nuevo Artículo
          </Button>
        </div>
      </div>

      {/* Filtros principales */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
            <Filter className="h-4 w-4" /> Filtros de Búsqueda
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Fila 1: Campos de búsqueda */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <div>
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                placeholder="Buscar por SKU"
                value={skuInput}
                onChange={(e) => setSkuInput(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="sku-interno">SKU Interno</Label>
              <Input
                id="sku-interno"
                placeholder="SKU interno"
                value={skuIntInput}
                onChange={(e) => setSkuIntInput(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="producto">Producto</Label>
              <Input
                id="producto"
                placeholder="Nombre del producto"
                value={prodInput}
                onChange={(e) => setProdInput(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Proveedor</Label>
              <Select value={proveedor} onValueChange={(v) => { setProveedor(v); setOffset(0); }}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Seleccionar proveedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los proveedores</SelectItem>
                  {(marcas || []).map((m) => (
                    <SelectItem key={m.codigo} value={m.nombre}>
                      {m.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Fila 2: Filtros avanzados */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 mt-2">
            <div>
              <Label>Categoría</Label>
              <Select value={categoria} onValueChange={(v) => { setCategoria(v); setOffset(0); }}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {(categorias || []).map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Almacén</Label>
              <Select value={enAlmacen} onValueChange={(v: "all"|"1"|"0") => { setEnAlmacen(v); setOffset(0); }}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="1">En almacén</SelectItem>
                  <SelectItem value="0">Externo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Estado</Label>
              <Select value={status} onValueChange={(v: "all"|"activo"|"inactivo") => { setStatus(v); setOffset(0); }}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="activo">Activo</SelectItem>
                  <SelectItem value="inactivo">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <div className="flex items-center gap-2">
                <input
                  id="sinstock"
                  type="checkbox"
                  checked={soloSinStock}
                  onChange={(e) => { setSoloSinStock(e.target.checked); setOffset(0); }}
                  className="rounded"
                />
                <Label htmlFor="sinstock" className="text-sm">Sin stock</Label>
              </div>
            </div>

            <div className="flex items-end">
              <Select
                value={`${orderBy}:${orderDir}`}
                onValueChange={(v) => {
                  const [f, d] = v.split(":");
                  setOrderBy(f as any);
                  setOrderDir(d as any);
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nombre:asc">Nombre ↑</SelectItem>
                  <SelectItem value="nombre:desc">Nombre ↓</SelectItem>
                  <SelectItem value="sku:asc">SKU ↑</SelectItem>
                  <SelectItem value="sku:desc">SKU ↓</SelectItem>
                  <SelectItem value="stock:desc">Stock ↓</SelectItem>
                  <SelectItem value="stock:asc">Stock ↑</SelectItem>
                  <SelectItem value="created_at:desc">Recientes</SelectItem>
                  <SelectItem value="updated_at:desc">Actualizados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Filtros activos */}
          <div className="flex flex-wrap gap-2 mt-3 pt-2 border-t dark:border-gray-700">
            {sku && (
              <Badge variant="secondary" className="px-2 py-1">
                SKU: {sku}
                <button onClick={() => { setSkuInput(""); setSku(""); }} className="ml-1">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {skuInterno && (
              <Badge variant="secondary" className="px-2 py-1">
                SKU Interno: {skuInterno}
                <button onClick={() => { setSkuIntInput(""); setSkuInterno(""); }} className="ml-1">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {producto && (
              <Badge variant="secondary" className="px-2 py-1">
                Producto: {producto}
                <button onClick={() => { setProdInput(""); setProducto(""); }} className="ml-1">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {proveedor !== "all" && (
              <Badge variant="secondary" className="px-2 py-1">
                Proveedor: {proveedor}
                <button onClick={() => setProveedor("all")} className="ml-1">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {categoria !== "all" && (
              <Badge variant="secondary" className="px-2 py-1">
                Categoría: {categoria}
                <button onClick={() => setCategoria("all")} className="ml-1">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {soloSinStock && (
              <Badge variant="destructive" className="px-2 py-1">
                Sin stock
                <button onClick={() => setSoloSinStock(false)} className="ml-1">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {enAlmacen !== "all" && (
              <Badge variant="outline" className="px-2 py-1">
                Almacén: {enAlmacen === "1" ? "Sí" : "No"}
                <button onClick={() => setEnAlmacen("all")} className="ml-1">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {status !== "all" && (
              <Badge variant="secondary" className="px-2 py-1">
                Estado: {status}
                <button onClick={() => setStatus("all")} className="ml-1">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {(sku || skuInterno || producto || proveedor !== "all" || categoria !== "all" || soloSinStock || enAlmacen !== "all" || status !== "all") && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs">
                Limpiar todos
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabla de resultados */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <LayoutList className="h-5 w-5 text-blue-600" />
            Artículos ({total})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">SKU</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead className="w-32">SKU Interno</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead className="w-20">Almacén</TableHead>
                <TableHead className="w-20">Stock</TableHead>
                <TableHead className="w-20">Estado</TableHead>
                <TableHead className="w-28">Creado</TableHead>
                <TableHead className="w-28">Actualizado</TableHead>
                <TableHead className="w-20">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-10 text-gray-500">
                    Cargando artículos...
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-10 text-gray-500">
                    No se encontraron artículos. Intenta ajustar los filtros.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((it) => (
                  <TableRow key={it.sku}>
                    <TableCell className="font-mono text-xs">{it.sku}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{it.nombre || '-'}</span>
                        {it.en_almacen && (
                          <span className="mt-1 text-xs text-emerald-600 dark:text-emerald-400 flex items-center">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1"></span>
                            En almacén
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{it.sku_interno || '-'}</TableCell>
                    <TableCell>{it.proveedor || '-'}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          it.en_almacen
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {it.en_almacen ? "Sí" : "No"}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">{it.stock ?? 0}</TableCell>
                    <TableCell>
                      <Badge
                        variant={it.status === "activo" ? "default" : "secondary"}
                        className={it.status === "inactivo" ? "bg-gray-200 text-gray-700" : ""}
                      >
                        {it.status || "n/a"}
                      </Badge>
                    </TableCell>
                    <TableCell>{fmt(it.created_at)}</TableCell>
                    <TableCell>{fmt(it.updated_at)}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={() => abrir(it.sku)}>
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal */}
      <ArticuloModal open={open} onOpenChange={setOpen} sku={selSku} />
    </div>
  );
}