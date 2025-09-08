// src/components/modals/OrderDetailsModalNew.tsx
import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Loader2, Package, User, Calendar, DollarSign, MapPin, Phone, Mail,
  Store, Ticket, CheckCircle2, AlertTriangle, Barcode, ShoppingCart, Link as LinkIcon, Warehouse,
} from "lucide-react";

/* ===================== Tipos ===================== */
type OrderDetailsModalProps = {
  orderId: number | null;
  isOpen: boolean;
  onClose: () => void;
};

type ComboComponent = {
  sku: string;
  nombre: string | null;
  costo: number | null;
  stock: number | null;      // Catálogo (articulos.stock)
  stock_a?: number | null;   // Almacén (articulos.stock_a)
  cantidad: number;
  subtotal: number;
};

// ⚠️ Tipos flexibles para soportar transición de catalogo_productos → articulos
type OrderItemEnriched = {
  orderItemId: number;

  // Shopify / Canal
  skuCanal: string | null;        // order_items.sku (lo que ve el cliente)
  title: string | null;           // products.title (Shopify)
  vendor: string | null;          // products.vendor
  productType: string | null;     // products.product_type
  barcode: string | null;         // variants.barcode
  stockShopify: number | null;    // variants.inventory_qty
  priceVenta: string | null;      // order_items.price
  compareAtPrice?: string | null; // variants.compare_at_price
  fotoShopify?: string | null;    // opcional si tu backend lo manda

  // Catálogo (Artículos)
  skuMarca?: string | null;       // (antes) catalogo_productos.sku
  skuInterno?: string | null;     // articulos.sku_interno (match clave)
  skuArticulo?: string | null;    // articulos.sku (si lo incorporas)
  nombreProducto: string | null;  // (antes) catalogo_productos.nombre_producto | (ahora) articulos.nombre
  stockMarca: number | null;      // Catálogo (articulos.stock)
  stockAlmacen?: number | null;   // Almacén  (articulos.stock_a)
  unitPrice?: string | number | null; // costo (articulos.costo)
  enAlmacen?: boolean | null;     // articulos.en_almacen
  foto?: string | null;           // imagen desde catálogo si la tienes

  quantity: number;
  mappingStatus?: "matched" | "unmapped";
  matchSource?: "interno" | "externo" | null;

  isCombo?: boolean;
  comboTotalCosto?: number | null;
  comboComponents?: ComboComponent[];
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

/* ===================== Componente principal ===================== */
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

            {/* ===================== A) ITEMS: Del canal (arriba) y Artículos (abajo) ===================== */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <ShoppingCart className="w-5 h-5 text-green-600" />
                  Productos del pedido
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {items.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No se encontraron productos para este pedido.</p>
                  </div>
                )}

                {items.map((it) => {
                  const unitPriceVenta = it.priceVenta != null ? String(it.priceVenta) : null;
                  const totalVenta = calculateItemTotal(unitPriceVenta, it.quantity, order.currency);
                  const unitCosto = it.unitPrice != null ? String(it.unitPrice) : null;

                  return (
                    <div key={String(it.orderItemId)} className="border rounded-xl p-3 space-y-3">
                      {/* Sección Shopify - SIEMPRE ARRIBA */}
                      <div className="border rounded-lg">
                        <div className="px-3 py-2 border-b flex items-center gap-2">
                          <Package className="w-4 h-4 text-green-600" />
                          <span className="font-semibold">Del canal (Shopify)</span>
                        </div>
                        <div className="p-3">
                          <div className="flex items-start gap-3">
                            {(it.fotoShopify || it.foto) ? (
                              <img
                                src={it.fotoShopify || it.foto || ""}
                                alt={it.title || "foto"}
                                className="w-16 h-16 rounded object-cover border"
                                onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                              />
                            ) : null}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 text-sm text-gray-600 flex-wrap">
                                <span className="font-mono">{it.skuCanal || "-"}</span>
                                {it.vendor && <Badge variant="outline">{it.vendor}</Badge>}
                                {it.productType && <Badge variant="outline">{it.productType}</Badge>}
                              </div>
                              <div className="font-medium truncate">{it.title || "Producto"}</div>
                              <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                                <div>
                                  <div className="text-xs text-gray-500">Cantidad</div>
                                  <Badge variant="secondary">{it.quantity}</Badge>
                                </div>
                                <div className="text-right">
                                  <div className="text-xs text-gray-500">Precio</div>
                                  <div className="font-mono">{formatCurrency(unitPriceVenta, order.currency ?? "MXN")}</div>
                                </div>
                                <div className="text-right">
                                  <div className="text-xs text-gray-500">Total</div>
                                  <div className="font-mono font-semibold">{totalVenta}</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Sección Artículos - SIEMPRE ABAJO */}
                      <div className="border rounded-lg">
                        <div className="px-3 py-2 border-b flex items-center gap-2">
                          <LinkIcon className="w-4 h-4 text-blue-600" />
                          <span className="font-semibold">Del catálogo (Artículos)</span>
                        </div>
                        <div className="p-3">
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2 text-sm flex-wrap">
                              <span className="font-mono">{it.skuArticulo || it.skuMarca || "-"}</span>
                              {it.skuInterno && (
                                <span className="font-mono text-gray-500">/ {it.skuInterno}</span>
                              )}
                              {it.enAlmacen ? (
                                <Badge className="gap-1 bg-emerald-50 text-emerald-700 border-emerald-200">
                                  <Warehouse className="w-3.5 h-3.5" />
                                  En nuestro almacén
                                </Badge>
                              ) : null}
                              {it.mappingStatus === "unmapped" && (
                                <Badge variant="destructive">Sin mapeo</Badge>
                              )}
                            </div>

                            <div className="truncate">{it.nombreProducto || "—"}</div>

                            {/* Grid sin "Total Costo"; se agregan Catálogo y Almacén */}
                            <div className="grid grid-cols-4 gap-2 text-sm">
                              <div>
                                <div className="text-xs text-gray-500">Catálogo</div>
                                {it.stockMarca === 0 ? (
                                  <Badge variant="destructive">Sin stock</Badge>
                                ) : (
                                  <Badge variant="secondary">{it.stockMarca ?? "-"}</Badge>
                                )}
                              </div>
                              <div>
                                <div className="text-xs text-gray-500">Almacén</div>
                                {it.stockAlmacen != null ? (
                                  <Badge variant="secondary">{it.stockAlmacen}</Badge>
                                ) : (
                                  <Badge variant="secondary">-</Badge>
                                )}
                              </div>
                              <div>
                                <div className="text-xs text-gray-500">Cantidad</div>
                                <Badge variant="secondary">{it.quantity}</Badge>
                              </div>
                              <div className="text-right">
                                <div className="text-xs text-gray-500">Costo</div>
                                <div className="font-mono">
                                  {formatCurrency(it.unitPrice != null ? String(it.unitPrice) : null, order.currency ?? "MXN")}
                                </div>
                              </div>
                            </div>

                            {/* Si es combo, mostrar sus componentes con Catálogo y Almacén */}
                            {it.isCombo && Array.isArray(it.comboComponents) && it.comboComponents.length > 0 && (
                              <div className="mt-3">
                                <div className="text-sm font-medium mb-2">Componentes del combo</div>
                                <div className="border rounded-md overflow-x-auto">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>SKU</TableHead>
                                        <TableHead>Nombre</TableHead>
                                        <TableHead className="text-center">Catálogo</TableHead>
                                        <TableHead className="text-center">Almacén</TableHead>
                                        <TableHead className="text-center">Cantidad</TableHead>
                                        <TableHead className="text-right">Costo</TableHead>
                                        <TableHead className="text-right">Subtotal</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {it.comboComponents.map((c, idx) => (
                                        <TableRow key={`${c.sku}-${idx}`}>
                                          <TableCell className="font-mono text-xs">{c.sku}</TableCell>
                                          <TableCell className="text-sm">{c.nombre ?? "—"}</TableCell>
                                          <TableCell className="text-center">
                                            {c.stock === 0 ? (
                                              <Badge variant="destructive">Sin stock</Badge>
                                            ) : (
                                              <Badge variant="secondary">{c.stock ?? "-"}</Badge>
                                            )}
                                          </TableCell>
                                          <TableCell className="text-center">
                                            {c.stock_a != null ? (
                                              <Badge variant="secondary">{c.stock_a}</Badge>
                                            ) : (
                                              <Badge variant="secondary">-</Badge>
                                            )}
                                          </TableCell>
                                          <TableCell className="text-center">{c.cantidad}</TableCell>
                                          <TableCell className="text-right font-mono text-xs">
                                            {formatCurrency(String(c.costo ?? 0), order.currency ?? "MXN")}
                                          </TableCell>
                                          <TableCell className="text-right font-mono text-xs">
                                            {formatCurrency(String(c.subtotal ?? 0), order.currency ?? "MXN")}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* ===================== B) CLIENTE (compacto) ===================== */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="w-5 h-5 text-blue-600" />
                  Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                <div>
                  <div className="text-xs text-gray-500">ID pedido</div>
                  <div className="font-mono">{order.orderId}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Canal</div>
                  <div className="flex items-center gap-2">
                    <Store className="w-4 h-4 text-purple-600" />
                    <span>{getChannelName(order.shopId)}</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Cliente</div>
                  <div>{order.customerName || "No especificado"}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Fecha</div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-green-600" />
                    <span>{new Date(order.shopifyCreatedAt || order.createdAt).toLocaleString("es-MX")}</span>
                  </div>
                </div>
                <div className="lg:col-span-2">
                  <div className="text-xs text-gray-500">Dirección</div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-red-600 mt-0.5" />
                    <span className="text-sm">{formatAddress(order)}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  {order.shipPhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-orange-600" />
                      <span>{order.shipPhone}</span>
                    </div>
                  )}
                  {order.customerEmail && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-blue-600" />
                      <span>{order.customerEmail}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* ===================== C) PAGO + ESTADO (unificado) ===================== 
            (Sin cambios visuales en esta petición) */}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
