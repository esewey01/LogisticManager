// src/components/modals/OrderDetailsModalNew.tsx
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Loader2, Package, User, Calendar, DollarSign, MapPin, Phone, Mail,
  Store, Ticket, CheckCircle2, AlertTriangle, Barcode,
} from "lucide-react";

/* ===================== Tipos ===================== */
type OrderDetailsModalProps = {
  orderId: number | null;
  isOpen: boolean;
  onClose: () => void;
};

type OrderItemEnriched = {
  orderItemId: number;
  skuCanal: string | null;     // order_items.sku (lo que ve el cliente / Shopify)
  skuMarca: string | null;     // catalogo_productos.sku
  skuInterno: string | null;   // catalogo_productos.sku_interno (match clave)
  quantity: number;
  priceVenta: string | null;   // order_items.price

  title: string | null;        // products.title (Shopify)
  vendor: string | null;       // products.vendor
  productType: string | null;  // products.product_type

  barcode: string | null;      // variants.barcode
  compareAtPrice: string | null; // variants.compare_at_price
  stockShopify: number | null; // variants.inventory_qty

  nombreProducto: string | null; // catalogo_productos.nombre_producto
  categoria: string | null;
  condicion: string | null;
  marca: string | null;
  variante: string | null;
  largo: string | null;
  ancho: string | null;
  alto: string | null;
  peso: string | null;
  foto: string | null;
  costo: string | null;
  stockMarca: number | null;
};

type OrderDetails = {
  id: number;
  shopId: number;
  orderId: string;
  name: string | null;
  orderNumber: string | null;

  customerName: string | null;
  customerEmail: string | null;

  subtotalPrice: string | null;
  totalAmount: string | null;
  currency: string | null;
  financialStatus: string | null;
  fulfillmentStatus: string | null;
  tags?: string[];
  orderNote?: string | null;

  createdAt: string;
  shopifyCreatedAt: string | null;

  shipName?: string | null;
  shipPhone?: string | null;
  shipAddress1?: string | null;
  shipCity?: string | null;
  shipProvince?: string | null;
  shipCountry?: string | null;
  shipZip?: string | null;

  items: OrderItemEnriched[];
  // Opcionales para flags
  hasTicket?: boolean;
  ticketNumber?: string | null;
};

/* ===================== Helpers ===================== */
const getChannelName = (shopId: number) => {
  switch (shopId) {
    case 1: return "WordWide";
    case 2: return "Creditienda";
    default: return `Tienda ${shopId}`;
  }
};

const getStatusBadge = (fulfillmentStatus?: string | null) => {
  const status = (fulfillmentStatus ?? "").toLowerCase();
  if (status === "fulfilled") {
    return (
      <Badge className="bg-green-100 text-green-800 gap-1">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Gestionado
      </Badge>
    );
  }
  if (status === "restocked") {
    return <Badge className="bg-blue-100 text-blue-800">Devuelto</Badge>;
  }
  if (status === "" || status === "unfulfilled") {
    return (
      <Badge variant="secondary" className="text-yellow-800 bg-yellow-100">
        Sin gestionar
      </Badge>
    );
  }
  return <Badge className="bg-red-100 text-red-800">Error</Badge>;
};

const formatAddress = (o?: OrderDetails) => {
  if (!o) return "No especificada";
  const parts = [o.shipAddress1, o.shipCity, o.shipProvince, o.shipCountry, o.shipZip].filter(Boolean);
  return parts.length ? parts.join(", ") : "No especificada";
};

const formatCurrency = (amount?: string | null, currency: string | null = "MXN") => {
  const num = amount != null ? Number(amount) : 0;
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: currency || "MXN",
  }).format(Number.isFinite(num) ? num : 0);
};

const calculateItemTotal = (price: string | null, quantity: number, currency?: string | null) => {
  const unit = price != null ? Number(price) : 0;
  const total = (Number.isFinite(unit) ? unit : 0) * (Number.isFinite(quantity) ? quantity : 0);
  return formatCurrency(String(total), currency ?? "MXN");
};

/* ===================== Componente ===================== */
export default function OrderDetailsModalNew({ orderId, isOpen, onClose }: OrderDetailsModalProps) {
  const {
    data: order,
    isLoading,
    error,
  } = useQuery<OrderDetails>({
    queryKey: ["/api/orders", orderId, "details"],
    queryFn: async () => {
      if (orderId == null) throw new Error("No order ID");
      const res = await apiRequest("GET", `/api/orders/${orderId}/details`);
      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || "No se pudo obtener la orden (detalles)");
      }
      return res.json();
    },
    enabled: isOpen && orderId != null,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const items = order?.items ?? [];
  const skuChips = items.slice(0, 6);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 min-w-0">
              <Package className="w-6 h-6 shrink-0" />
              <span className="truncate">
                Pedido #{order?.name || order?.orderId || orderId}
              </span>
            </div>
            {order && (
              <div className="flex items-center gap-3 text-sm">
                <Badge variant="outline" className="gap-1">
                  <Store className="h-3.5 w-3.5" />
                  {getChannelName(order.shopId)}
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(order.shopifyCreatedAt || order.createdAt).toLocaleString("es-MX")}
                </Badge>
                <Badge className="gap-1 bg-emerald-50 text-emerald-700">
                  <DollarSign className="h-3.5 w-3.5" />
                  {formatCurrency(order.totalAmount, order.currency ?? "MXN")}
                </Badge>
              </div>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* LOADERS / ERRORES */}
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

        {/* CONTENIDO */}
        {order && (
          <div className="space-y-6">
            {/* ===================== 1) PRODUCTOS ===================== */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xl">
                    <Package className="w-5 h-5 text-green-600" />
                    Productos del pedido
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {skuChips.map((it, idx) => (
                      <Badge key={String(it.orderItemId ?? idx)} variant="secondary">
                        {(it.skuInterno || it.skuCanal || "SKU") +
                          (it.skuMarca ? ` / ${it.skuMarca}` : "")}
                      </Badge>
                    ))}
                    {items.length > skuChips.length && (
                      <Badge variant="outline">+{items.length - skuChips.length} más</Badge>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {items.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-semibold">SKU Interno / Marca / Shopify</TableHead>
                        <TableHead className="font-semibold">Producto</TableHead>
                        <TableHead className="font-semibold text-center">Cantidad</TableHead>
                        <TableHead className="font-semibold text-right">Precio unit.</TableHead>
                        <TableHead className="font-semibold text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((it) => (
                        <TableRow key={String(it.orderItemId)}>
                          <TableCell className="font-mono text-sm">
                            {(it.skuInterno || "—")}
                            {it.skuMarca ? <span className="text-gray-500"> / {it.skuMarca}</span> : null}
                            {it.skuCanal ? <span className="text-gray-500"> / {it.skuCanal}</span> : null}
                          </TableCell>
                          <TableCell className="max-w-[420px]">
                            <div className="flex items-start gap-3">
                              {it.foto ? (
                                <img
                                  src={it.foto}
                                  alt={it.title || it.nombreProducto || "foto"}
                                  className="w-12 h-12 rounded object-cover border"
                                  onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                                />
                              ) : null}
                              <div className="flex flex-col min-w-0">
                                <span className="font-medium truncate">
                                  {it.title || it.nombreProducto || "Producto"}
                                </span>
                                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-600">
                                  {it.vendor && <Badge variant="outline">{it.vendor}</Badge>}
                                  {it.productType && <Badge variant="outline">{it.productType}</Badge>}
                                  {it.barcode && (
                                    <span className="inline-flex items-center gap-1">
                                      <Barcode className="w-3 h-3" /> {it.barcode}
                                    </span>
                                  )}
                                  {(it.stockShopify != null || it.stockMarca != null) && (
                                    <span className="inline-flex items-center gap-2">
                                      <Badge variant="secondary">Stock SF: {it.stockShopify ?? "—"}</Badge>
                                      <Badge variant="secondary">Stock Marca: {it.stockMarca ?? "—"}</Badge>
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary">{it.quantity}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(it.priceVenta, order.currency ?? "MXN")}
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold">
                            {calculateItemTotal(it.priceVenta, it.quantity, order.currency)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No se encontraron productos para este pedido.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ===================== 2) INFORMACIÓN DEL CLIENTE ===================== */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <User className="w-5 h-5 text-blue-600" />
                  Información del cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <span className="font-semibold text-gray-600">ID pedido:</span>
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
                  <p className="text-gray-900">{order.customerName || "No especificado"}</p>
                </div>
                <div className="space-y-1">
                  <span className="font-semibold text-gray-600">Fecha:</span>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-green-600" />
                    <span>{new Date(order.shopifyCreatedAt || order.createdAt).toLocaleString("es-MX")}</span>
                  </div>
                </div>
                <div className="space-y-1 lg:col-span-2">
                  <span className="font-semibold text-gray-600">Dirección:</span>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-red-600 mt-0.5" />
                    <span className="text-sm">
                      {formatAddress(order)}
                    </span>
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

            {/* ===================== 3) ESTADO DEL PEDIDO ===================== */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <DollarSign className="w-5 h-5 text-emerald-600" />
                    Resumen de pago
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {order.subtotalPrice && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-mono">
                        {formatCurrency(order.subtotalPrice, order.currency ?? "MXN")}
                      </span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">Total:</span>
                    <span className="text-2xl font-bold text-green-600">
                      {formatCurrency(order.totalAmount, order.currency ?? "MXN")}
                    </span>
                  </div>
                  {order.currency && <p className="text-sm text-gray-500">Moneda: {order.currency}</p>}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    {order.fulfillmentStatus?.toLowerCase() === "fulfilled"
                      ? <CheckCircle2 className="w-5 h-5 text-green-600" />
                      : <AlertTriangle className="w-5 h-5 text-yellow-600" />}
                    Estado del pedido
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <span className="font-semibold text-gray-600 block mb-2">Estado de gestión:</span>
                    {getStatusBadge(order.fulfillmentStatus)}
                  </div>
                  {order.financialStatus && (
                    <div>
                      <span className="font-semibold text-gray-600 block mb-2">Estado financiero:</span>
                      <Badge variant="outline">{order.financialStatus}</Badge>
                    </div>
                  )}
                  {(order.hasTicket || order.ticketNumber) && (
                    <div>
                      <span className="font-semibold text-gray-600 block mb-2">Ticket:</span>
                      <Badge className="gap-1 bg-indigo-50 text-indigo-700">
                        <Ticket className="h-3.5 w-3.5" />
                        {order.ticketNumber || "Registrado"}
                      </Badge>
                    </div>
                  )}
                  {order.tags && order.tags.length > 0 && (
                    <div>
                      <span className="font-semibold text-gray-600 block mb-2">Etiquetas:</span>
                      <div className="flex flex-wrap gap-1">
                        {order.tags.map((tag, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {order.orderNote && (
                    <div>
                      <span className="font-semibold text-gray-600 block mb-2">Nota:</span>
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
