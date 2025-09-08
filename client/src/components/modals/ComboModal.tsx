import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { X, Save, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Item = {
  id?: number;
  sku: string;
  cantidad: number;
  nombreProducto?: string | null;
  costo?: number | null;
};

type ComboDetail = {
  id: string;               // sku_combo
  nombre: string | null;
  descripcion: string | null;
  activo: boolean;
  createdAt: string | null;
  codigoMarca: string;
  categoria: "compuesto" | "permisivo";
  items: Item[];
};

async function fetchCombo(id: string) {
  const res = await fetch(`/api/combos/${encodeURIComponent(id)}`);
  if (!res.ok) {
    const msg = (await res.json().catch(() => null))?.message ?? `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<ComboDetail>;
}

async function createCombo(payload: {
  id: string; codigoMarca: string; categoria: "compuesto" | "permisivo";
  nombre?: string; descripcion?: string; activo?: boolean; items?: Item[];
}) {
  const items = (payload.items ?? [])
    .filter(i => (i?.sku ?? "").trim() !== "" && Number(i?.cantidad) > 0)
    .map(i => ({ sku: i.sku.trim(), cantidad: Number(i.cantidad) }));

  const res = await fetch(`/api/combos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, items }),
  });
  if (!res.ok) {
    const msg = (await res.json().catch(() => null))?.message ?? `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return res.json();
}

async function updateCombo(id: string, payload: Partial<{
  nombre: string; descripcion: string; activo: boolean; codigoMarca: string; categoria: "compuesto" | "permisivo";
}>) {
  const res = await fetch(`/api/combos/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const msg = (await res.json().catch(() => null))?.message ?? `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return res.json();
}

async function replaceItems(id: string, items: Item[]) {
  const res = await fetch(`/api/combos/${encodeURIComponent(id)}/items`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: items
        .filter(i => (i?.sku ?? "").trim() !== "" && Number(i?.cantidad) > 0)
        .map(i => ({ sku: i.sku.trim(), cantidad: Number(i.cantidad) })),
    }),
  });
  if (!res.ok) {
    const msg = (await res.json().catch(() => null))?.message ?? `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return res.json();
}

export function ComboModal({
  comboId,
  onClose,
  onSaved,
}: {
  comboId: string | null;        // <--- string|null
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = comboId == null;

  const { data, isLoading } = useQuery({
    queryKey: ["combo", comboId],
    queryFn: () => fetchCombo(comboId!),
    enabled: !isNew && !!comboId,
  });

  // Campos del formulario
  const [id, setId] = useState(""); // sku_combo
  const [codigoMarca, setCodigoMarca] = useState("");
  const [categoria, setCategoria] = useState<"compuesto" | "permisivo">("compuesto");

  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [activo, setActivo] = useState(true);
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    if (!isNew && data) {
      setId(data.id ?? "");
      setCodigoMarca(data.codigoMarca ?? "");
      setCategoria((data.categoria as "compuesto" | "permisivo") ?? "compuesto");
      setNombre(data.nombre ?? "");
      setDescripcion(data.descripcion ?? "");
      setActivo(!!data.activo);
      setItems(data.items ?? []);
    } else if (isNew) {
      setId("");
      setCodigoMarca("");
      setCategoria("compuesto");
      setNombre("");
      setDescripcion("");
      setActivo(true);
      setItems([]);
    }
  }, [data, isNew]);

  const mCreate = useMutation({ mutationFn: createCombo });
  const mUpdate = useMutation({ mutationFn: (payload: any) => updateCombo(id, payload) });
  const mReplace = useMutation({ mutationFn: (it: Item[]) => replaceItems(id, it) });

  const canSave = useMemo(() => {
    if (isNew) {
      return id.trim().length > 0 && codigoMarca.trim().length > 0 && !!categoria && nombre.trim().length >= 0;
    }
    return true;
  }, [isNew, id, codigoMarca, categoria, nombre]);

  const handleSave = async () => {
    if (!canSave) return;
    if (isNew) {
      await mCreate.mutateAsync({ id, codigoMarca, categoria, nombre, descripcion, activo, items });
      onSaved();
    } else {
      await mUpdate.mutateAsync({ nombre, descripcion, activo, codigoMarca, categoria });
      await mReplace.mutateAsync(items);
      onSaved();
    }
  };

  const addRow = () => setItems((prev) => [...prev, { sku: "", cantidad: 1 }]);
  const delRow = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));
  const patchRow = (idx: number, patch: Partial<Item>) =>
    setItems((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{isNew ? "Nuevo combo" : `Combo ${id}`}</DialogTitle>
        </DialogHeader>

        {!isNew && isLoading ? (
          <div className="p-6">Cargando…</div>
        ) : (
          <div className="space-y-4">
            {/* Datos del combo */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label>ID (sku_combo)</Label>
                <Input
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  placeholder="p.ej. COMBO-ABC"
                  disabled={!isNew}   // no editable en edición
                />
              </div>
              <div>
                <Label>Código de marca</Label>
                <Input
                  value={codigoMarca}
                  onChange={(e) => setCodigoMarca(e.target.value)}
                  placeholder="p.ej. ULM"
                />
              </div>
              <div>
                <Label>Categoría</Label>
                <Select value={categoria} onValueChange={(v) => setCategoria(v as any)}>
                  <SelectTrigger><SelectValue placeholder="Selecciona…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="compuesto">compuesto</SelectItem>
                    <SelectItem value="permisivo">permisivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Nombre (título)</Label>
                <Input value={nombre} onChange={(e) => setNombre(e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <Label>Descripción</Label>
                <Input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="activo"
                  type="checkbox"
                  checked={activo}
                  onChange={(e) => setActivo(e.target.checked)}
                />
                <Label htmlFor="activo" className="cursor-pointer">Activo</Label>
              </div>
            </div>

            {/* Items del combo */}
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Productos del combo</h3>
              <Button variant="secondary" size="sm" onClick={addRow}>
                <Plus className="h-4 w-4 mr-1" /> Agregar producto
              </Button>
            </div>

            <div className="border rounded-lg overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-muted/40 text-left">
                    <th className="px-3 py-2">SKU (marca)</th>
                    <th className="px-3 py-2">Nombre</th>
                    <th className="px-3 py-2">Cantidad</th>
                    <th className="px-3 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr><td className="px-3 py-3" colSpan={4}>Sin productos</td></tr>
                  ) : items.map((row, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="px-3 py-2">
                        <Input
                          value={row.sku}
                          onChange={(e) => patchRow(idx, { sku: e.target.value })}
                          placeholder="SKU de la marca"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <span className="opacity-70">{row.nombreProducto ?? "—"}</span>
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min={1}
                          value={row.cantidad}
                          onChange={(e) => patchRow(idx, { cantidad: Number(e.target.value) || 1 })}
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button variant="ghost" size="icon" onClick={() => delRow(idx)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                <X className="h-4 w-4 mr-1" /> Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={
                  !canSave ||
                  mCreate.isPending ||
                  mUpdate.isPending ||
                  mReplace.isPending
                }
              >
                <Save className="h-4 w-4 mr-1" /> Guardar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
