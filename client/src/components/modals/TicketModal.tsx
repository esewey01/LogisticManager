import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface TicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: any[];
  customer: string;
  onTicketCreated?: () => void;
}

export default function TicketModal({ 
  isOpen, 
  onClose, 
  orders, 
  customer, 
  onTicketCreated 
}: TicketModalProps) {
  const [selectedBrand, setSelectedBrand] = useState("");
  const [notes, setNotes] = useState("");
  const queryClient = useQueryClient();

  const { data: brands = [] } = useQuery<any[]>({
    queryKey: ["/api/brands"],
    enabled: isOpen,
  });

  const createTicketMutation = useMutation({
    mutationFn: async (ticketData: any) => {
      await apiRequest("POST", "/api/tickets", ticketData);
    },
    onSuccess: async () => {
      // Update orders to mark them as having tickets
      for (const order of orders) {
        await apiRequest("PATCH", `/api/orders/${order.id}`, {
          hasTicket: true,
          isManaged: true,
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      
      onTicketCreated?.();
      handleClose();
    },
  });

  const handleClose = () => {
    setSelectedBrand("");
    setNotes("");
    onClose();
  };

  const handleCreateTicket = () => {
    if (!selectedBrand) return;

    // Collect all products from orders
    const allProducts = orders.reduce((acc: any[], order: any) => {
      const orderProducts = Array.isArray(order.products) ? order.products : [];
      return [...acc, ...orderProducts.map((p: any) => ({
        ...p,
        orderId: order.id,
        orderDate: order.createdAt
      }))];
    }, []);

    const ticketData = {
      customerId: orders[0]?.id || customer,
      customerName: customer,
      brandId: selectedBrand,
      products: allProducts,
      stockStatus: "pending",
      notes,
    };

    createTicketMutation.mutate(ticketData);
  };

  // Group products by brand for better organization
  const productsByBrand = orders.reduce((acc: Record<string, any[]>, order: any) => {
    const orderProducts = Array.isArray(order.products) ? order.products : [];
    orderProducts.forEach((product: any) => {
      // Try to determine brand from SKU or product name
      const brandKey = product.sku?.split('-')[0] || 'OTHER';
      if (!acc[brandKey]) {
        acc[brandKey] = [];
      }
      acc[brandKey].push({
        ...product,
        orderId: order.id,
        orderDate: order.createdAt
      });
    });
    return acc;
  }, {} as Record<string, any[]>);

  const allProducts = orders.reduce((acc: any[], order: any) => {
    const orderProducts = Array.isArray(order.products) ? order.products : [];
    return [...acc, ...orderProducts.map((p: any) => ({
      ...p,
      orderId: order.id,
      orderDate: order.createdAt
    }))];
  }, [] as any[]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Crear Ticket - {customer}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Ticket Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customer-name">Cliente</Label>
              <Input
                id="customer-name"
                value={customer}
                disabled
                className="bg-gray-50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand-select">Marca Principal *</Label>
              <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una marca" />
                </SelectTrigger>
                <SelectContent>
                  {brands.map((brand: any) => (
                    <SelectItem key={brand.id} value={brand.id}>
                      {brand.name} ({brand.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Order Summary */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">
              Órdenes Incluidas ({orders.length})
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {orders.map((order) => (
                <div key={order.id} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">
                      {order.externalId || String(order.id).slice(0, 8)}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {Array.isArray(order.products) ? order.products.length : 0} items
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">
                    ${Number(order.totalAmount || 0).toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Products Table */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">
              Productos del Ticket ({allProducts.length} items)
            </h4>
            <div className="border border-gray-200 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky top-0 bg-white">SKU</TableHead>
                    <TableHead className="sticky top-0 bg-white">Producto</TableHead>
                    <TableHead className="sticky top-0 bg-white">Cantidad</TableHead>
                    <TableHead className="sticky top-0 bg-white">Precio</TableHead>
                    <TableHead className="sticky top-0 bg-white">Orden</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allProducts.map((product: any, index: number) => (
                    <TableRow key={`${product.orderId}-${index}`}>
                      <TableCell className="font-medium">{product.sku}</TableCell>
                      <TableCell>{product.name}</TableCell>
                      <TableCell>{product.quantity}</TableCell>
                      <TableCell>${Number(product.price || 0).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {String(product.orderId).slice(0, 8)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Brand Analysis */}
          {Object.keys(productsByBrand).length > 1 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-3">
                Análisis por Marca
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(productsByBrand).map(([brandKey, products]) => (
                  <div key={brandKey} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium">{brandKey}</h5>
                      <Badge variant="secondary">
                        {products.length} productos
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      Sugerencia: {products.length > allProducts.length / 2 ? 'Marca principal' : 'Marca secundaria'}
                    </p>
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-500 mt-2">
                <i className="fas fa-info-circle mr-1"></i>
                Se recomienda agrupar productos por marca principal para optimizar el procesamiento.
              </p>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="ticket-notes">Notas del Ticket</Label>
            <Textarea
              id="ticket-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Agregar notas sobre el ticket, instrucciones especiales, etc."
              className="min-h-[80px]"
            />
          </div>

          {/* Summary Info */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">
              <i className="fas fa-info-circle mr-2"></i>
              Información del Ticket
            </h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• El ticket se generará automáticamente con un número único</li>
              <li>• Se validará el stock contra el catálogo de la marca seleccionada</li>
              <li>• Las órdenes se marcarán como gestionadas</li>
              <li>• Se asignará una paquetería según las reglas configuradas</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-4 pt-4 border-t">
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreateTicket}
              disabled={!selectedBrand || createTicketMutation.isPending}
            >
              {createTicketMutation.isPending ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Creando Ticket...
                </>
              ) : (
                <>
                  <i className="fas fa-ticket-alt mr-2"></i>
                  Crear Ticket
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
