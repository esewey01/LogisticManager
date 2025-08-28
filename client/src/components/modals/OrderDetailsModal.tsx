import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Ticket, Package } from "lucide-react";

interface OrderDetailsModalProps {
  order: any;
  onClose: () => void;
  channels: any[];
}
interface OrderItem {
  id: number;
  sku: string;
  quantity: number;
  price: string | number;
  title: string | null;
  vendor: string | null;
}

export default function OrderDetailsModal({ order, onClose, channels }: OrderDetailsModalProps) {
  const isOpen = !!order; // El modal está abierto si hay una orden
  const channel = channels.find((c) => c.id === order?.channelId);

  // ID del pedido (interno) para usar en la API
  const orderId = order?.id;

  // 🔁 Cargar los ítems del pedido desde el backend
  const { data: itemsResp, isLoading: itemsLoading, error: itemsError } = useQuery<{
    items: OrderItem[];
  }>({
    queryKey: ["order", "items", orderId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/orders/${orderId}/items`);
      return res.json();
    },
    enabled: isOpen && !!orderId,
  });

  const items = itemsResp?.items ?? [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-4xl max-h-[90vh] overflow-y-auto"
        aria-describedby="order-dialog-desc"
      >
        <DialogHeader>
          <DialogTitle>Detalles del Pedido</DialogTitle>
          <DialogDescription id="order-dialog-desc">
            Visualización de los detalles del pedido seleccionado, incluyendo productos, cliente, dirección y estado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Header */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted">ID Pedido</label>
              <p className="text-lg font-semibold text-foreground">
                {order?.externalId || order?.id}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted">Canal</label>
              <div className="flex items-center space-x-2">
                {channel && (
                  <Badge
                    style={{ backgroundColor: `${channel.color}20`, color: channel.color }}
                    className="border-0"
                  >
                    <i className={`${channel.icon} mr-1`}></i>
                    {channel.code}
                  </Badge>
                )}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted">Cliente</label>
              <p className="text-foreground">{order?.customerName}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted">Fecha</label>
              <p className="text-foreground">
                {order?.createdAt ? new Date(order.createdAt).toLocaleDateString() : "—"}
              </p>
            </div>
          </div>

          {/* Customer Info */}
          <div className="bg-card border border-border rounded-2xl p-4">
            <h4 className="font-medium text-foreground mb-3">Información de Contacto</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted">Dirección</label>
                <p className="text-foreground">{order?.shippingAddress}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted">Teléfono</label>
                <p className="text-foreground">{order?.customerPhone || "No disponible"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted">Email</label>
                <p className="text-foreground">{order?.customerEmail || "No disponible"}</p>
              </div>
            </div>
          </div>

          {/* Products */}
          <div>
            <h4 className="font-medium text-foreground mb-3">Productos</h4>

            {itemsLoading && <p className="text-sm text-muted-foreground">Cargando artículos…</p>}
            {itemsError && (
              <p className="text-sm text-destructive">
                No se pudieron cargar los artículos. Intenta nuevamente más tarde.
              </p>
            )}

            {!itemsLoading && !itemsError && (
              <>
                <div className="border border-border rounded-2xl overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SKU</TableHead>
                        <TableHead>Producto</TableHead>
                        <TableHead>Cantidad</TableHead>
                        <TableHead>Precio</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((it) => (
                        <TableRow key={it.id}>
                          <TableCell className="font-medium">{it.sku}</TableCell>
                          <TableCell>{it.title ?? "—"}</TableCell>
                          <TableCell>{it.quantity}</TableCell>
                          <TableCell>${Number(it.price ?? 0).toFixed(2)}</TableCell>
                          <TableCell>
                            ${(Number(it.price ?? 0) * Number(it.quantity ?? 0)).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="mt-4 text-right">
                  <p className="text-lg font-semibold">
                    Total: ${Number(order?.totalAmount ?? 0).toFixed(2)}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Order Status */}
          <div>
            <h4 className="font-medium text-foreground mb-3">Estado del Pedido</h4>
            <div className="flex items-center space-x-4">
              <Badge variant={order?.isManaged ? "default" : "destructive"}>
                {order?.isManaged ? "Gestionado" : "Sin gestionar"}
              </Badge>
              {order?.hasTicket && (
                <Badge variant="secondary">
                  <Ticket className="mr-1 h-3.5 w-3.5" />
                  Tiene Ticket
                </Badge>
              )}
              {order?.isCombo && (
                <Badge variant="outline">
                  <Package className="mr-1 h-3.5 w-3.5" />
                  Combo
                </Badge>
              )}
            </div>
          </div>

          {/* Notes */}
          {order?.notes && (
            <div>
              <h4 className="font-medium text-foreground mb-3">Notas</h4>
              <p className="text-foreground/80 bg-card border border-border p-3 rounded-2xl">{order.notes}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-4 pt-4 border-t border-border">
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
            {!order?.hasTicket && (
              <Button>
                <Ticket className="mr-2 h-4 w-4" />
                Crear Ticket
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
