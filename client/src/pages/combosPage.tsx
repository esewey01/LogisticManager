import { useMemo, useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Package, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ComboModal } from "@/components/modals/ComboModal";

type ComboRow = {
  id: string;
  nombre: string;
  activo: boolean;
  createdAt: string | null;
  itemsCount: number;
  marcaNombre: string | null;
  categoria: string | null;
  costoTotal: number;
};

type ListResp = { data: ComboRow[]; total: number; limit: number; offset: number };

async function fetchCombos(params: { search: string; limit: number; offset: number }): Promise<ListResp> {
  const qs = new URLSearchParams({
    search: params.search ?? "",
    limit: String(params.limit ?? 20),
    offset: String(params.offset ?? 0),
  });
  const res = await fetch(`/api/combos?${qs.toString()}`);
  if (!res.ok) {
    const msg = (await res.json().catch(() => null))?.message ?? `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return res.json();
}

// ✨ Paleta de colores por categoría
const categoriaColors: Record<string, string> = {
  "Electrónica": "bg-blue-100 text-blue-800 border-blue-200",
  "Hogar": "bg-green-100 text-green-800 border-green-200",
  "Ropa": "bg-purple-100 text-purple-800 border-purple-200",
  "Deportes": "bg-orange-100 text-orange-800 border-orange-200",
  "Alimentos": "bg-amber-100 text-amber-800 border-amber-200",
  "default": "bg-gray-100 text-gray-800 border-gray-200",
};

export default function CombosPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [committedSearch, setCommittedSearch] = useState("");
  const [page, setPage] = useState(0);
  const [openModal, setOpenModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const limit = 20;

  const { data, isLoading, isError, error } = useQuery<ListResp>({
    queryKey: ["combos", { search: committedSearch, page }],
    queryFn: () => fetchCombos({ search: committedSearch, limit, offset: page * limit }),
    placeholderData: keepPreviousData,
  });

  const rows: ComboRow[] = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total]);

  const getCategoriaBadgeClass = (categoria: string | null) => {
    if (!categoria) return categoriaColors.default;
    return categoriaColors[categoria] || categoriaColors.default;
  };

  const exportData = (format: "csv" | "xlsx") => {
    const qs = new URLSearchParams({
      format,
      search: committedSearch,
      limit: String(limit),
      offset: String(page * limit),
    });
    window.location.href = `/api/combos/export?${qs.toString()}`;
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-800 dark:text-gray-100">
          <Package className="h-5 w-5 text-blue-600" />
          Gestión de Combos
        </h1>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => { setEditingId(null); setOpenModal(true); }} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Combo
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-60" />
              <Input
                placeholder="Buscar combos..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setCommittedSearch(search);
                    setPage(0);
                  }
                }}
              />
            </div>
            <Button variant="secondary" onClick={() => { setCommittedSearch(search); setPage(0); }}>
              Buscar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de combos */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Combos ({total})</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => exportData("csv")}>
              <Download className="h-4 w-4 mr-1" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportData("xlsx")}>
              <Download className="h-4 w-4 mr-1" /> Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-left">
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Marca</th>
                <th className="px-4 py-3 font-medium">Categoría</th>
                <th className="px-4 py-3 font-medium text-center">Items</th>
                <th className="px-4 py-3 font-medium text-right">Costo</th>
                <th className="px-4 py-3 font-medium text-center">Estado</th>
                <th className="px-4 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-4 py-3 text-center"><Skeleton className="h-4 w-8 mx-auto" /></td>
                    <td className="px-4 py-3 text-right"><Skeleton className="h-4 w-16 ml-auto" /></td>
                    <td className="px-4 py-3 text-center"><Skeleton className="h-4 w-12 mx-auto" /></td>
                    <td className="px-4 py-3 text-right"><Skeleton className="h-8 w-20 ml-auto" /></td>
                  </tr>
                ))
              ) : isError ? (
                <tr>
                  <td className="px-4 py-6 text-red-600 text-center" colSpan={8}>
                    Error: {(error as Error)?.message}
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-12 text-center text-muted-foreground" colSpan={8}>
                    No se encontraron combos. Intenta ajustar tu búsqueda.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-t hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs">{r.id}</td>
                    <td className="px-4 py-3 font-medium">{r.nombre}</td>
                    <td className="px-4 py-3">{r.marcaNombre ?? '-'}</td>
                    <td className="px-4 py-3">
                      <Badge className={getCategoriaBadgeClass(r.categoria)} variant="outline">
                        {r.categoria ?? 'Sin categoría'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center">{r.itemsCount}</td>
                    <td className="px-4 py-3 text-right font-mono">${Number(r.costoTotal ?? 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={r.activo ? "default" : "destructive"}>
                        {r.activo ? "Activo" : "Inactivo"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingId(r.id);
                          setOpenModal(true);
                        }}
                      >
                        Editar
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Paginación */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-sm text-muted-foreground">
          Mostrando {Math.min(rows.length, limit)} de {total} combos
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Anterior
          </Button>
          <span className="text-sm px-3 py-1 bg-muted rounded">
            Página {page + 1} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page + 1 >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Siguiente
          </Button>
        </div>
      </div>

      {/* Modal */}
      {openModal && (
        <ComboModal
          comboId={editingId}
          onClose={() => setOpenModal(false)}
          onSaved={() => {
            setOpenModal(false);
            qc.invalidateQueries({ queryKey: ["combos"] });
          }}
        />
      )}
    </div>
  );
}