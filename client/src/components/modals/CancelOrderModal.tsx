import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest } from "@/lib/queryClient";

interface CancelOrderModalProps {
  orderId: number | string;
  onClose: () => void;
  onCancelled: () => void;
}

type CancelOption = "STOCK_OUT" | "BAD_ADDRESS" | "CUSTOMER_REQUEST" | "SPECIAL_CASE";

const OPTIONS: { key: CancelOption; label: string }[] = [
  { key: "STOCK_OUT",        label: "Stock Out" },
  { key: "BAD_ADDRESS",      label: "Dirección Incorrecta" },
  { key: "CUSTOMER_REQUEST", label: "Solicitado por Cliente" },
  { key: "SPECIAL_CASE",     label: "Caso especial" },
];

export default function CancelOrderModal({ orderId, onClose, onCancelled }: CancelOrderModalProps) {
  const [option, setOption] = useState<CancelOption>("STOCK_OUT");
  const [noteSpecial, setNoteSpecial] = useState("");
  const [notifyCustomer, setNotifyCustomer] = useState(true);
  const [restock, setRestock] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const payload = useMemo(() => {
    switch (option) {
      case "STOCK_OUT":
        return { reason: "INVENTORY", staffNote: "Stock Out" };
      case "BAD_ADDRESS":
        return { reason: "OTHER", staffNote: "Dirección Incorrecta" };
      case "CUSTOMER_REQUEST":
        return { reason: "CUSTOMER", staffNote: "Solicitado por WordWide" };
      case "SPECIAL_CASE":
      default:
        return { reason: "OTHER", staffNote: noteSpecial.trim() };
    }
  }, [option, noteSpecial]);

  const isSpecial = option === "SPECIAL_CASE";

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      if (isSpecial && !payload.staffNote) {
        setErrorMsg("La nota es obligatoria para 'Caso especial'.");
        return;
      }

      const r = await apiRequest("POST", `/api/orders/${orderId}/cancel`, {
        reason: payload.reason,
        staffNote: payload.staffNote,
        notifyCustomer,
        restock,
      });
      const data = await r.json();
      if (!data?.ok) {
        const msg = Array.isArray(data?.errors)
          ? data.errors.map((e: any) => e?.message || String(e)).join("; ")
          : (data?.errors || data?.message || "Error al cancelar");
        setErrorMsg(String(msg));
        return;
      }
      onCancelled();
    } catch (e) {
      setErrorMsg((e as any)?.message || "Error de red al cancelar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Cancelar pedido</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Motivo</label>
            <Select value={option} onValueChange={(v) => setOption(v as CancelOption)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una opción" />
              </SelectTrigger>
              <SelectContent className="z-[70]">
                {OPTIONS.map(o => (
                  <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Nota interna</label>
            <Input
              value={isSpecial ? noteSpecial : payload.staffNote}
              onChange={(e) => isSpecial && setNoteSpecial(e.target.value)}
              disabled={!isSpecial}
              placeholder={isSpecial ? "Describe el caso especial" : ""}
            />
            {!isSpecial && (
              <p className="text-xs text-muted-foreground">La nota se asignará automáticamente.</p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox id="notify" checked={notifyCustomer} onCheckedChange={(v) => setNotifyCustomer(!!v)} />
            <label htmlFor="notify" className="text-sm">Notificar al cliente</label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="restock" checked={restock} onCheckedChange={(v) => setRestock(!!v)} />
            <label htmlFor="restock" className="text-sm">Reabastecer inventario</label>
          </div>

          <div className="rounded border p-3 text-sm bg-muted/30">
            <div className="font-medium mb-1">Se enviará a Shopify:</div>
            <div>cancelReason: <span className="font-mono">{payload.reason}</span></div>
            <div>staffNote: <span className="font-mono">{payload.staffNote || "—"}</span></div>
            <div>notifyCustomer: <span className="font-mono">{String(notifyCustomer)}</span></div>
            <div>restock: <span className="font-mono">{String(restock)}</span></div>
          </div>
        </div>

        {errorMsg && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{errorMsg}</div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
          <Button onClick={handleSubmit} disabled={loading || (isSpecial && !payload.staffNote)}>
            {loading ? "Cancelando..." : "Cancelar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

