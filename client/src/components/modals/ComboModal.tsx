// client/src/pages/ComboModal.tsx
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { X, Save, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

type Item = {
  id?: number;
  sku: string;
  cantidad: number;
  nombreProducto?: string | null;
  costo?: number | null;
};

type ComboDetail = {
  id: number;
  nombre: string;
  descripcion: string;
  activo: boolean;
  createdAt: string;
  items: Item[];
};

async function fetchCombo(id: number) {
  const res = await fetch(`/api/combos/${id}`);
  if (!res.ok) throw new Error("Error al cargar combo");
  return res.json() as Promise<ComboDetail>;
}

async function createCombo(payload: {
  nombre: string; descripcion?: string; activo?: boolean; items?: Item[];
}) {
  const res = await fetch(`/api/combos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Error al crear combo");
  return res.json();
}

async function updateCombo(id: number, payload: Partial<{ nombre: string; descripcion: string; activo: boolean }>) {
  const res = await fetch(`/api/combos/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Error al actualizar combo");
  return res.json();
}

async function replaceItems(id: number, items: Item[]) {
  const res = await fetch(`/api/combos/${id}/items`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items: items.map(i => ({ sku: i.sku, cantidad: Number(i.cantidad) })) }),
  });
  if (!res.ok) throw new Error("Error al guardar items");
  return res.json();
}

export function ComboModal({
  comboId,
  onClose,
  onSaved,
}: {
  comboId: number | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = comboId == null;

  const { data, isLoading } = useQuery({
    queryKey: ["combo", comboId],
    queryFn: () => fetchCombo(comboId!),
    enabled: !isNew && !!comboId,
  });

  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [activo, setActivo] = useState(true);
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    if (data && !isNew) {
      setNombre(data.nombre ?? "");
      setDescripcion(data.descripcion ?? "");
      setActivo(!!data.activo);
      setItems(data.items ?? []);
    } else if (isNew) {
      setNombre("");
      setDescripcion("");
      setActivo(true);
      setItems([]);
    }
  }, [data, isNew]);

  const mCreate = useMutation({ mutationFn: createCombo });
  const mUpdate = useMutation({ mutationFn: (payload: any) => updateCombo(comboId!, payload) });
  const mReplace = useMutation({ mutationFn: (it: Item[]) => replaceItems(comboId!, it) });

  const canSave = useMemo(() => nombre.trim().length > 0, [nombre]);

  const handleSave = async () => {
    if (!canSave) return;
    if (isNew) {
      await mCreate.mutateAsync({ nombre, descripcion, activo, items });
      onSaved();
    } else {
      await mUpdate.mutateAsync({ nombre, descripcion, activo });
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
          <DialogTitle>{isNew ? "Nuevo combo" : `Combo #${comboId}`}</DialogTitle>
        </DialogHeader>

        {!isNew && isLoading ? (
          <div className="p-6">Cargando…</div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label>Nombre</Label>
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
                    <th className="px-3 py-2">SKU</th>
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
                          placeholder="SKU"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <span className="opacity-70">
                          {row.nombreProducto ?? "—"}
                        </span>
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
              <Button onClick={handleSave} disabled={!canSave || mCreate.isPending || mUpdate.isPending || mReplace.isPending}>
                <Save className="h-4 w-4 mr-1" /> Guardar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
