import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Search, Download, Upload, X } from "lucide-react";
import { CatalogoResponse, exportCatalogo, fetchCatalogo, importCatalogo, downloadCatalogTemplate } from "@/lib/api/catalogo";
import { debounce } from "lodash";

export default function Catalogo() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [q, setQ] = useState("");
  const [campo, setCampo] = useState<"sku" | "sku_interno" | "nombre">("sku_interno");
  const [marca, setMarca] = useState<string>("");
  const [categoria, setCategoria] = useState<string>("");
  const [stockEq0, setStockEq0] = useState(false);
  const [stockGte, setStockGte] = useState<number | undefined>(undefined);
  const [sortField, setSortField] = useState<string>("nombre_producto");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Debounce for search input
  const [searchInput, setSearchInput] = useState("");
  const debounced = useMemo(() => debounce((v: string) => setQ(v), 400), []);
  useEffect(() => { debounced(searchInput); }, [searchInput]);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [q, campo, marca, categoria, stockEq0, stockGte, pageSize, sortField, sortOrder]);

  // Persist filters in URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (campo) params.set("campo", campo);
    if (marca) params.set("marca", marca);
    if (categoria) params.set("categoria", categoria);
    if (stockEq0) params.set("stock_eq0", "1");
    if (typeof stockGte === 'number') params.set("stock_gte", String(stockGte));
    if (page > 1) params.set("page", String(page));
    if (pageSize !== 50) params.set("pageSize", String(pageSize));
    if (sortField) params.set("sort", `${sortField}:${sortOrder}`);
    const qs = params.toString();
    const url = qs ? `/catalogo?${qs}` : "/catalogo";
    window.history.replaceState(null, "", url);
  }, [q, campo, marca, categoria, stockEq0, stockGte, page, pageSize, sortField, sortOrder]);

  // Init from URL
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setQ(p.get("q") || "");
    const c = p.get("campo") as any; if (c) setCampo(c);
    const m = p.get("marca"); if (m) setMarca(m);
    const cat = p.get("categoria"); if (cat) setCategoria(cat);
    const eq0 = p.get("stock_eq0"); if (eq0) setStockEq0(true);
    const gte = p.get("stock_gte"); if (gte) setStockGte(Number(gte));
    const pg = p.get("page"); if (pg) setPage(Number(pg));
    const ps = p.get("pageSize"); if (ps) setPageSize(Number(ps));
    const srt = p.get("sort"); if (srt) { const [f, d] = srt.split(":"); if (f) setSortField(f); if (d === 'desc' || d === 'asc') setSortOrder(d); }
    setSearchInput(p.get("q") || "");
  }, []);

  const { data, isLoading } = useQuery<CatalogoResponse>({
    queryKey: ["/api/catalogo", { page, pageSize, q, campo, marca, categoria, stockEq0, stockGte, sortField, sortOrder }],
    queryFn: () => fetchCatalogo({
      page, pageSize, q, campo,
      marca: marca || undefined,
      categoria: categoria || undefined,
      stock_eq0: stockEq0 || undefined,
      stock_gte: typeof stockGte === 'number' ? stockGte : undefined,
      sort: `${sortField}:${sortOrder}`,
    }),
    refetchInterval: 30000,
  });

  const items = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? Math.max(1, Math.ceil(total / pageSize));

  const clearFilters = () => {
    setSearchInput("");
    setQ("");
    setCampo("sku_interno");
    setMarca("");
    setCategoria("");
    setStockEq0(false);
    setStockGte(undefined);
    setSortField("nombre_producto");
    setSortOrder("asc");
  };

  const handleExport = async (format: "csv" | "xlsx") => {
    try {
      const blob = await exportCatalogo({ q, campo, marca: marca || undefined, categoria: categoria || undefined, stock_eq0: stockEq0 || undefined, stock_gte: stockGte, sort: `${sortField}:${sortOrder}`, format });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `catalogo_${new Date().toISOString().slice(0,10)}.${format}`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      a.remove();
      toast({ title: "Exportación lista" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error al exportar", description: e?.message || "" });
    }
  };

  const importMutation = useMutation({
    mutationFn: async (file: File) => importCatalogo(file),
    onSuccess: (resp) => {
      queryClient.invalidateQueries({ queryKey: ["/api/catalogo"] });
      toast({ title: "Importación completada", description: `Insertados: ${resp.inserted} • Actualizados: ${resp.updated} • Errores: ${resp.errors}` });
      if (resp.reportBase64) {
        const a = document.createElement('a');
        a.href = `data:text/csv;base64,${resp.reportBase64}`;
        a.download = `catalogo_import_errores_${new Date().toISOString().slice(0,10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    },
  });

  const onFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 20 * 1024 * 1024) { toast({ variant: 'destructive', title: 'Archivo demasiado grande (máx 20MB)' }); e.currentTarget.value = ""; return; }
    const ok = ["text/csv","application/csv","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","application/vnd.ms-excel"].includes(f.type);
    if (!ok) { toast({ variant: 'destructive', title: 'Tipo no soportado', description: 'Usa CSV o XLSX' }); e.currentTarget.value = ""; return; }
    importMutation.mutate(f);
    e.currentTarget.value = "";
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Catálogo de productos</h1>
        </div>

        {/* Toolbar */}
        <Card>
          <CardContent className="p-4 flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Buscar..."
                  className="pl-9 w-64"
                />
              </div>
              <Select value={campo} onValueChange={(v: any) => setCampo(v)}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Campo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sku_interno">SKU Interno</SelectItem>
                  <SelectItem value="sku">SKU Externo</SelectItem>
                  <SelectItem value="nombre">Producto</SelectItem>
                </SelectContent>
              </Select>

              <Input placeholder="Marca" value={marca} onChange={(e) => setMarca(e.target.value)} className="w-40" />
              <Input placeholder="Categoría" value={categoria} onChange={(e) => setCategoria(e.target.value)} className="w-40" />

              <div className="flex items-center gap-2">
                <Label htmlFor="stk0" className="text-sm">Stock=0</Label>
                <input id="stk0" type="checkbox" checked={stockEq0} onChange={(e) => { setStockEq0(e.target.checked); if (e.target.checked) setStockGte(undefined); }} />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="stkg" className="text-sm">Stock ≥</Label>
                <Input id="stkg" type="number" className="w-24"
                  value={stockGte ?? ""}
                  onChange={(e) => { const v = e.target.value === '' ? undefined : Number(e.target.value); setStockGte(Number.isFinite(v as any) ? v as any : undefined); if (v !== undefined) setStockEq0(false); }} />
              </div>

              <Select value={`${sortField}:${sortOrder}`} onValueChange={(v) => { const [f, d] = v.split(":"); setSortField(f); setSortOrder(d as any); }}>
                <SelectTrigger className="w-44"><SelectValue placeholder="Ordenar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nombre_producto:asc">Producto ↑</SelectItem>
                  <SelectItem value="nombre_producto:desc">Producto ↓</SelectItem>
                  <SelectItem value="sku:asc">SKU Externo ↑</SelectItem>
                  <SelectItem value="sku:desc">SKU Externo ↓</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={clearFilters}>Limpiar</Button>

              <div className="ml-auto flex items-center gap-2">
                <input id="file-catalogo" type="file" className="hidden" onChange={onFilePick} />
                <Button variant="outline" onClick={() => document.getElementById('file-catalogo')?.click()} disabled={importMutation.isPending}>
                  <Upload className="h-4 w-4 mr-1" /> Importar
                </Button>
                <Button variant="outline" onClick={() => handleExport('csv')}><Download className="h-4 w-4 mr-1" />CSV</Button>
                <Button variant="outline" onClick={() => handleExport('xlsx')}>XLSX</Button>
                <Button variant="ghost" onClick={() => downloadCatalogTemplate('csv')}>Plantilla</Button>
              </div>
            </div>

            {/* Badges de filtros activos */}
            <div className="flex flex-wrap gap-2">
              {q && (
                <Badge variant="secondary">Buscar: {q}<button className="ml-2" onClick={() => { setSearchInput(""); setQ(""); }}><X className="h-3 w-3" /></button></Badge>
              )}
              {marca && (<Badge variant="secondary">Marca: {marca}<button className="ml-2" onClick={() => setMarca("") }><X className="h-3 w-3" /></button></Badge>)}
              {categoria && (<Badge variant="secondary">Categoría: {categoria}<button className="ml-2" onClick={() => setCategoria("") }><X className="h-3 w-3" /></button></Badge>)}
              {stockEq0 && (<Badge variant="secondary">Stock=0<button className="ml-2" onClick={() => setStockEq0(false)}><X className="h-3 w-3" /></button></Badge>)}
              {typeof stockGte === 'number' && (<Badge variant="secondary">Stock ≥ {stockGte}<button className="ml-2" onClick={() => setStockGte(undefined)}><X className="h-3 w-3" /></button></Badge>)}
            </div>
          </CardContent>
        </Card>

        {/* Tabla */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Productos ({total})</span>
              <div className="text-sm text-muted-foreground">Página {page} de {totalPages}</div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sku Externo</TableHead>
                    <TableHead>Sku Interno</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead>Costo</TableHead>
                    <TableHead>Inventario</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={7} className="p-6 text-center text-muted-foreground">Cargando...</TableCell></TableRow>
                  ) : items.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="p-6 text-center text-muted-foreground">Sin resultados</TableCell></TableRow>
                  ) : items.map((p) => (
                    <TableRow key={`${p.sku || ''}-${p.sku_interno || ''}`}>
                      <TableCell className="font-mono text-sm">{p.sku}</TableCell>
                      <TableCell className="font-mono text-sm">{p.sku_interno}</TableCell>
                      <TableCell className="max-w-xs truncate">{p.nombre_producto}</TableCell>
                      <TableCell>${typeof p.costo === 'number' ? p.costo.toFixed(2) : '0.00'}</TableCell>
                      <TableCell><Badge variant={(p.stock ?? 0) > 0 ? 'default' : 'destructive'}>{p.stock ?? 0}</Badge></TableCell>
                      <TableCell>
                        {((p.estado ?? ((p.stock ?? 0) > 0 ? 'ACTIVO' : 'INACTIVO')) === 'ACTIVO') ? (
                          <Badge variant="default">ACTIVO</Badge>
                        ) : (
                          <Badge variant="secondary">INACTIVO</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost">Ver</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Paginación */}
            <div className="flex items-center justify-between p-4">
              <div className="text-sm text-muted-foreground">Mostrando {items.length === 0 ? 0 : Math.min((page-1)*pageSize + 1, total)} - {Math.min(page*pageSize, total)} de {total}</div>
              <div className="flex items-center gap-2">
                <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                  <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="150">150</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p-1))} disabled={page === 1}>Prev</Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p+1))} disabled={page >= totalPages}>Next</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

