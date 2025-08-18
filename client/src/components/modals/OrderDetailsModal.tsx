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
              <label className="text-sm font-medium text-gray-600">ID Pedido</label>
              <p className="text-lg font-semibold text-gray-900">
                {order?.externalId || order?.id}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Canal</label>
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
              <label className="text-sm font-medium text-gray-600">Cliente</label>
              <p className="text-gray-900">{order?.customerName}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Fecha</label>
              <p className="text-gray-900">
                {order?.createdAt ? new Date(order.createdAt).toLocaleDateString() : "—"}
              </p>
            </div>
          </div>

          {/* Customer Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">Información de Contacto</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Dirección</label>
                <p className="text-gray-900">{order?.shippingAddress}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Teléfono</label>
                <p className="text-gray-900">{order?.customerPhone || "No disponible"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Email</label>
                <p className="text-gray-900">{order?.customerEmail || "No disponible"}</p>
              </div>
            </div>
          </div>

          {/* Products */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Productos</h4>

            {itemsLoading && <p className="text-sm text-muted-foreground">Cargando artículos…</p>}
            {itemsError && (
              <p className="text-sm text-red-600">
                No se pudieron cargar los artículos. Intenta nuevamente más tarde.
              </p>
            )}

            {!itemsLoading && !itemsError && (
              <>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
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
            <h4 className="font-medium text-gray-900 mb-3">Estado del Pedido</h4>
            <div className="flex items-center space-x-4">
              <Badge variant={order?.isManaged ? "default" : "destructive"}>
                {order?.isManaged ? "Gestionado" : "Sin gestionar"}
              </Badge>
              {order?.hasTicket && (
                <Badge variant="secondary">
                  <i className="fas fa-ticket-alt mr-1"></i>
                  Tiene Ticket
                </Badge>
              )}
              {order?.isCombo && (
                <Badge variant="outline">
                  <i className="fas fa-box mr-1"></i>
                  Combo
                </Badge>
              )}
            </div>
          </div>

          {/* Notes */}
          {order?.notes && (
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Notas</h4>
              <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{order.notes}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-4 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
            {!order?.hasTicket && (
              <Button>
                <i className="fas fa-ticket-alt mr-2"></i>
                Crear Ticket
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}