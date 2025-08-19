import { useState } from "react";
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

export default function CancelOrderModal({ orderId, onClose, onCancelled }: CancelOrderModalProps) {
  const [reason, setReason] = useState("OTHER");
  const [staffNote, setStaffNote] = useState("");
  const [notifyCustomer, setNotifyCustomer] = useState(false);
  const [restock, setRestock] = useState(false);
  const [refundToOriginal, setRefundToOriginal] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      await apiRequest("POST", `/api/orders/${orderId}/cancel`, {
        reason,
        staffNote,
        notifyCustomer,
        restock,
        refundToOriginal,
      }).then((r) => r.json());
      onCancelled();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Cancelar pedido</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Motivo</label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CUSTOMER">Cliente</SelectItem>
                <SelectItem value="DECLINED">Rechazado</SelectItem>
                <SelectItem value="FRAUD">Fraude</SelectItem>
                <SelectItem value="INVENTORY">Inventario</SelectItem>
                <SelectItem value="STAFF">Personal</SelectItem>
                <SelectItem value="OTHER">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Nota interna</label>
            <Input value={staffNote} onChange={(e) => setStaffNote(e.target.value)} />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox checked={notifyCustomer} onCheckedChange={(v) => setNotifyCustomer(!!v)} id="notify" />
            <label htmlFor="notify" className="text-sm">Notificar al cliente</label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox checked={restock} onCheckedChange={(v) => setRestock(!!v)} id="restock" />
            <label htmlFor="restock" className="text-sm">Reabastecer inventario</label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox checked={refundToOriginal} onCheckedChange={(v) => setRefundToOriginal(!!v)} id="refund" />
            <label htmlFor="refund" className="text-sm">Reembolsar al método original</label>
          </div>
        </div>
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Cancelando..." : "Cancelar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
