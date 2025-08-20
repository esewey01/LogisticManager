import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Package, User, Calendar, DollarSign, MapPin, Phone, Mail, Store } from "lucide-react";

type OrderDetailsModalProps = {
  orderId: string | null;
  isOpen: boolean;
  onClose: () => void;
};

type OrderItem = {
  id: string;
  sku: string;
  quantity: number;
  price: string;
  shopifyProductId?: string;
  shopifyVariantId?: string;
  productName?: string;
  isVariant?: boolean;
  skuInterno?: string;
  skuExterno?: string;
};

type OrderDetails = {
  id: string;
  orderId: string;
  name: string;
  customerName: string;
  customerEmail?: string;
  totalAmount: string;
  subtotalPrice?: string;
  status: string;
  fulfillmentStatus?: string;
  createdAt: string;
  shopifyCreatedAt?: string;
  shopId: number;
  
  // Shipping address
  shipName?: string;
  shipPhone?: string;
  shipAddress1?: string;
  shipCity?: string;
  shipProvince?: string;
  shipCountry?: string;
  shipZip?: string;
  
  // Currency and financial
  currency?: string;
  financialStatus?: string;
  
  // Tags and notes
  tags?: string[];
  orderNote?: string;
  
  items?: OrderItem[];
};

export default function OrderDetailsModalNew({ orderId, isOpen, onClose }: OrderDetailsModalProps) {
  const { data: order, isLoading, error } = useQuery<OrderDetails>({
    queryKey: ["/api/orders", orderId],
    queryFn: async () => {
      if (!orderId) throw new Error("No order ID");
      const res = await apiRequest("GET", `/api/orders/${orderId}`);
      return res.json();
    },
    enabled: !!orderId && isOpen,
  });

  const { data: orderItems, isLoading: itemsLoading } = useQuery<{ items: OrderItem[] }>({
    queryKey: ["/api/orders", orderId, "items"],
    queryFn: async () => {
      if (!orderId) throw new Error("No order ID");
      const res = await apiRequest("GET", `/api/orders/${orderId}/items`);
      return res.json();
    },
    enabled: !!orderId && isOpen,
  });

  const getChannelName = (shopId: number) => {
    switch (shopId) {
      case 1: return "Tienda 1";
      case 2: return "Tienda 2";
      default: return `Tienda ${shopId}`;
    }
  };

  const getStatusBadge = (fulfillmentStatus?: string) => {
    const status = fulfillmentStatus?.toLowerCase() || '';
    if (status === 'fulfilled') {
      return <Badge className="bg-green-100 text-green-800">Gestionado</Badge>;
    } else if (status === 'restocked') {
      return <Badge className="bg-blue-100 text-blue-800">Devuelto</Badge>;
    } else if (status === '' || status === 'unfulfilled') {
      return <Badge className="bg-yellow-100 text-yellow-800">Sin Gestionar</Badge>;
    } else {
      return <Badge className="bg-red-100 text-red-800">Error</Badge>;
    }
  };

  const formatAddress = (order: OrderDetails) => {
    const parts = [
      order.shipAddress1,
      order.shipCity,
      order.shipProvince,
      order.shipCountry,
      order.shipZip
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'No especificada';
  };

  const formatCurrency = (amount: string | undefined, currency: string = 'MXN') => {
    if (!amount) return '$0.00';
    const num = parseFloat(amount);
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: currency === 'MXN' ? 'MXN' : 'USD'
    }).format(num);
  };

  const calculateItemTotal = (price: string, quantity: number) => {
    const itemPrice = parseFloat(price || '0');
    return formatCurrency((itemPrice * quantity).toFixed(2), order?.currency);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold flex items-center gap-2">
            <Package className="w-6 h-6" />
            Pedido #{order?.name || order?.orderId || orderId}
          </DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="ml-3 text-lg">Cargando detalles del pedido...</span>
          </div>
        )}

        {error && (
          <div className="text-red-600 p-6 bg-red-50 rounded-lg border border-red-200">
            <h3 className="font-semibold mb-2">Error al cargar</h3>
            <p>No se pudieron obtener los detalles del pedido. Intenta nuevamente.</p>
          </div>
        )}

        {order && (
          <div className="space-y-6">
            {/* Datos del Cliente */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-xl">
                  <User className="w-5 h-5 mr-2 text-blue-600" />
                  Datos del Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <span className="font-semibold text-gray-600">ID Pedido:</span>
                  <p className="text-gray-900 font-mono">{order.orderId}</p>
                </div>
                <div className="space-y-1">
                  <span className="font-semibold text-gray-600">Canal:</span>
                  <div className="flex items-center gap-2">
                    <Store className="w-4 h-4 text-purple-600" />
                    <span>{getChannelName(order.shopId)}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="font-semibold text-gray-600">Cliente:</span>
                  <p className="text-gray-900">{order.customerName || 'No especificado'}</p>
                </div>
                <div className="space-y-1">
                  <span className="font-semibold text-gray-600">Fecha:</span>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-green-600" />
                    <span>{new Date(order.shopifyCreatedAt || order.createdAt).toLocaleString('es-MX')}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="font-semibold text-gray-600">Dirección:</span>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-red-600 mt-0.5" />
                    <span className="text-sm">{formatAddress(order)}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {order.shipPhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-orange-600" />
                      <span className="text-sm">{order.shipPhone}</span>
                    </div>
                  )}
                  {order.customerEmail && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-blue-600" />
                      <span className="text-sm">{order.customerEmail}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Tabla de Productos */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center text-xl">
                    <Package className="w-5 h-5 mr-2 text-green-600" />
                    Productos del Pedido
                  </div>
                  {itemsLoading && <Loader2 className="w-5 h-5 animate-spin" />}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {orderItems?.items && orderItems.items.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-semibold">SKU Interno</TableHead>
                        <TableHead className="font-semibold">SKU Externo</TableHead>
                        <TableHead className="font-semibold">Producto</TableHead>
                        <TableHead className="font-semibold text-center">Cantidad</TableHead>
                        <TableHead className="font-semibold text-right">Precio Unit.</TableHead>
                        <TableHead className="font-semibold text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orderItems.items.map((item, index) => (
                        <TableRow key={item.id || index}>
                          <TableCell className="font-mono text-sm">
                            {item.skuInterno || item.sku || 'N/A'}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {item.skuExterno || 'N/A'}
                          </TableCell>
                          <TableCell>
                            <div>
                              <span className="font-medium">
                                {item.productName || `Producto ${item.sku}`}
                              </span>
                              {item.isVariant && (
                                <Badge variant="outline" className="ml-2 text-xs">
                                  Variante
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary">{item.quantity}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(item.price, order.currency)}
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold">
                            {calculateItemTotal(item.price, item.quantity)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No se encontraron productos para este pedido</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Resumen del Pedido */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center text-xl">
                    <DollarSign className="w-5 h-5 mr-2 text-green-600" />
                    Resumen del Pedido
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {order.subtotalPrice && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-mono">{formatCurrency(order.subtotalPrice, order.currency)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">Total:</span>
                    <span className="text-2xl font-bold text-green-600">
                      {formatCurrency(order.totalAmount, order.currency)}
                    </span>
                  </div>
                  {order.currency && (
                    <p className="text-sm text-gray-500">Moneda: {order.currency}</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center text-xl">
                    <Package className="w-5 h-5 mr-2 text-blue-600" />
                    Estado del Pedido
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <span className="font-semibold text-gray-600 block mb-2">Estado de Gestión:</span>
                    {getStatusBadge(order.fulfillmentStatus)}
                  </div>
                  {order.financialStatus && (
                    <div>
                      <span className="font-semibold text-gray-600 block mb-2">Estado Financiero:</span>
                      <Badge variant="outline">{order.financialStatus}</Badge>
                    </div>
                  )}
                  {order.tags && order.tags.length > 0 && (
                    <div>
                      <span className="font-semibold text-gray-600 block mb-2">Etiquetas:</span>
                      <div className="flex flex-wrap gap-1">
                        {order.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {order.orderNote && (
                    <div>
                      <span className="font-semibold text-gray-600 block mb-2">Nota del Pedido:</span>
                      <p className="text-sm bg-gray-50 p-3 rounded border">{order.orderNote}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}