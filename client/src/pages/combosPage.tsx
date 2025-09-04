// client/src/pages/CombosPage.tsx
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ComboModal } from "@/components/modals/ComboModal";

type ComboRow = {
  id: number;
  nombre: string;
  descripcion: string;
  activo: boolean;
  createdAt: string;
  itemsCount: number;
};

async function fetchCombos(params: { search: string; limit: number; offset: number }) {
  const qs = new URLSearchParams({
    search: params.search,
    limit: String(params.limit),
    offset: String(params.offset),
  });
  const res = await fetch(`/api/combos?${qs.toString()}`);
  if (!res.ok) throw new Error("Error al cargar combos");
  return res.json() as Promise<{ data: ComboRow[]; total: number; limit: number; offset: number }>;
}

export default function CombosPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const limit = 20;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["combos", { search, page }],
    queryFn: () => fetchCombos({ search, limit, offset: page * limit }),
    keepPreviousData: true,
  });

  const [openModal, setOpenModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const rows = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-60" />
          <Input
            placeholder="Buscar combos…"
            className="pl-9"
            value={search}
            onChange={(e) => {
              setPage(0);
              setSearch(e.target.value);
            }}
          />
        </div>
        <Button
          onClick={() => {
            setEditingId(null);
            setOpenModal(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nuevo combo
        </Button>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Combos ({total})</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-muted/40 text-left">
                <th className="px-4 py-2">ID</th>
                <th className="px-4 py-2">Nombre</th>
                <th className="px-4 py-2">Descripción</th>
                <th className="px-4 py-2">Items</th>
                <th className="px-4 py-2">Activo</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td className="px-4 py-6" colSpan={6}>Cargando…</td></tr>
              ) : isError ? (
                <tr><td className="px-4 py-6" colSpan={6}>Error al cargar.</td></tr>
              ) : rows.length === 0 ? (
                <tr><td className="px-4 py-6" colSpan={6}>Sin resultados</td></tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-4 py-2">{r.id}</td>
                    <td className="px-4 py-2">{r.nombre}</td>
                    <td className="px-4 py-2">{r.descripcion}</td>
                    <td className="px-4 py-2">{r.itemsCount}</td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${r.activo ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                        {r.activo ? "Sí" : "No"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setEditingId(r.id);
                          setOpenModal(true);
                        }}
                      >
                        Ver / Editar
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          disabled={page === 0}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
        >
          Anterior
        </Button>
        <span className="text-sm opacity-70">Página {page + 1} de {totalPages}</span>
        <Button
          variant="outline"
          disabled={page + 1 >= totalPages}
          onClick={() => setPage((p) => p + 1)}
        >
          Siguiente
        </Button>
      </div>

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
