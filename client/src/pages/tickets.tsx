import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Eye, Undo2, Trash2 } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

/** Estructura que devuelve GET /api/tickets (getTicketsView) */
type TicketRow = {
  id: number | string;
  ticketNumber: string;
  status: string;                 // open | closed (estado del ticket)
  stockStatus?: string | null;    // ok | apart | stock_out (estado de stock)
  notes?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;

  orderPk?: string;         // id de orders como texto
  orderId?: string;         // Shopify order_id
  orderName?: string | null;
  customerName?: string | null;
  shopId?: number | null;

  itemsCount?: number;
  skus?: string[] | null;    // de order_items
  brands?: string[] | null;  // de catalogo_productos.marca
};

export default function Tickets() {
  const queryClient = useQueryClient();

  // ====== DATA ======
  const { data: tickets = [], isLoading } = useQuery<TicketRow[]>({
    queryKey: ["/api/tickets"],
    queryFn: async () => {
      const r = await apiRequest("GET", "/api/tickets");
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  // ====== MUTATIONS ======
  const revertMutation = useMutation({
    mutationFn: async ({ ticketId, revertShopify = true }: { ticketId: number; revertShopify?: boolean }) => {
      const r = await apiRequest("POST", `/api/tickets/${ticketId}/revert?revertShopify=${revertShopify ? 1 : 0}`);
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (ticketId: number) => {
      const r = await apiRequest("DELETE", `/api/tickets/${ticketId}`);
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
    },
  });

  // ====== UI STATE (Modal) ======
  const [selected, setSelected] = React.useState<TicketRow | null>(null);
  const [isModalOpen, setModalOpen] = React.useState(false);

  const openModal = (t: TicketRow) => {
    setSelected(t);
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false);
    setSelected(null);
  };

  // ====== HELPERS ======
  const channelName = (shopId?: number | null) =>
    shopId === 1 ? "Tienda 1" : shopId === 2 ? "Tienda 2" : (shopId ? `Tienda ${shopId}` : "—");

  const formatDateTime = (v?: string | null) =>
    v ? new Date(v).toLocaleString("es-MX") : "—";

  const first = <T,>(arr?: T[] | null) => (Array.isArray(arr) && arr.length > 0 ? arr[0] : undefined);

  const getBrandLabel = (t?: TicketRow | null) => {
    const brands = Array.isArray(t?.brands) ? t!.brands! : [];
    return first(brands) ?? "—";
  };

  const getSkuLabel = (t?: TicketRow | null) => {
    const skus = Array.isArray(t?.skus) ? t!.skus! : [];
    return first(skus) ?? "—";
  };

  // badge para estado del ticket (open/closed)
  const ticketStatusBadgeClass = (status?: string) => {
    const s = (status || "").toLowerCase();
    if (s === "open") return "bg-yellow-100 text-yellow-800";
    if (s === "closed") return "bg-green-100 text-green-800";
    return "bg-gray-100 text-gray-800";
  };

  // badge para estado de stock (ok/apart/stock_out)
  const stockBadgeClass = (stock?: string | null) => {
    const s = (stock || "").toLowerCase();
    if (s === "ok") return "bg-green-100 text-green-800";
    if (s === "apart") return "bg-yellow-100 text-yellow-800";
    if (s === "stock_out") return "bg-red-100 text-red-800";
    return "bg-gray-100 text-gray-800";
  };

  const stockLabel = (stock?: string | null) => {
    const s = (stock || "").toLowerCase();
    if (s === "ok") return "OK";
    if (s === "apart") return "APARTAR";
    if (s === "stock_out") return "STOCK OUT";
    return "—";
  };

  // contadores para los cuadros de stock
  const okCount = tickets.filter((t) => (t?.stockStatus || "").toLowerCase() === "ok").length;
  const apartCount = tickets.filter((t) => (t?.stockStatus || "").toLowerCase() === "apart").length;
  const outCount = tickets.filter((t) => (t?.stockStatus || "").toLowerCase() === "stock_out").length;

  // ====== LOADER ======
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" />
      </div>
    );
  }

  // ====== RENDER ======
  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Gestión de Tickets</h1>
        <p className="text-gray-600">Administra tickets generados, relación con pedidos y deshacer acciones.</p>
      </div>

      {/* Summary Cards (restaurados: Stock OK / Apartar / Stock Out) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Total Tickets</p>
            <p className="text-2xl font-bold">{tickets.filter(Boolean).length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Stock OK</p>
            <p className="text-2xl font-bold text-green-700">{okCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Apartar</p>
            <p className="text-2xl font-bold text-yellow-700">{apartCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Stock Out</p>
            <p className="text-2xl font-bold text-red-700">{outCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabla */}
      <Card>
        <CardHeader>
          <CardTitle>Tickets</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticket</TableHead>
                {/* Cliente → Pedido (nombre del pedido) */}
                <TableHead>Pedido</TableHead>
                <TableHead>Marca</TableHead>
                {/* Producto debe mostrar el SKU */}
                <TableHead>Producto (SKU)</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Estado Stock</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.filter(Boolean).map((t) => {
                const brandLabel = getBrandLabel(t);
                const skuLabel = getSkuLabel(t);
                return (
                  <TableRow key={String(t!.id)}>
                    <TableCell className="font-medium">{t!.ticketNumber}</TableCell>

                    {/* PEDIDO: usa orderName; si no, cae a orderId */}
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{t!.orderName || "—"}</span>
                        <span className="text-xs text-muted-foreground font-mono">
                          {t!.orderId ? `#${t!.orderId}` : "—"}
                        </span>
                      </div>
                    </TableCell>

                    {/* MARCA (del catálogo) */}
                    <TableCell>
                      <Badge variant="outline">{brandLabel}</Badge>
                    </TableCell>

                    {/* PRODUCTO (SKU) */}
                    <TableCell>
                      <span className="font-mono">{skuLabel}</span>
                    </TableCell>

                    {/* ITEMS */}
                    <TableCell>{t!.itemsCount ?? 0}</TableCell>

                    {/* ESTADO STOCK */}
                    <TableCell>
                      <Badge className={stockBadgeClass(t!.stockStatus)}>{stockLabel(t!.stockStatus)}</Badge>
                    </TableCell>

                    {/* ESTADO TICKET */}
                    <TableCell>
                      <Badge className={ticketStatusBadgeClass(t!.status)}>
                        {(t!.status || "").toUpperCase()}
                      </Badge>
                    </TableCell>

                    {/* FECHA */}
                    <TableCell>{formatDateTime(t!.createdAt)}</TableCell>

                    {/* ACCIONES (iconos + tooltip) */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        {/* Ver */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openModal(t as TicketRow)}
                              aria-label="Ver ticket"
                              data-testid={`button-view-ticket-${t!.id}`}
                            >
                              <Eye className="h-4 w-4" />
                              <span className="sr-only">Ver</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Ver</TooltipContent>
                        </Tooltip>

                        {/* Deshacer */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() =>
                                revertMutation.mutate({ ticketId: Number(t!.id), revertShopify: true })
                              }
                              disabled={revertMutation.isPending}
                              aria-label="Deshacer ticket"
                              data-testid={`button-revert-ticket-${t!.id}`}
                            >
                              <Undo2 className="h-4 w-4" />
                              <span className="sr-only">Deshacer</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Deshacer</TooltipContent>
                        </Tooltip>

                        {/* Eliminar */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteMutation.mutate(Number(t!.id))}
                              disabled={deleteMutation.isPending}
                              className="text-red-600 hover:text-red-700"
                              aria-label="Eliminar ticket"
                              data-testid={`button-delete-ticket-${t!.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Eliminar</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Eliminar</TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {tickets.filter(Boolean).length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No hay tickets generados aún.
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== MODAL DETALLE ===== */}
      <Dialog open={isModalOpen} onOpenChange={(open) => (open ? null : closeModal())}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl">
              Ticket #{selected?.ticketNumber || "—"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Info principal */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Pedido</p>
                <p className="text-sm font-medium">{selected?.orderName || "—"}</p>
                <p className="text-xs font-mono text-muted-foreground">
                  {selected?.orderId ? `#${selected.orderId}` : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Canal</p>
                <p className="text-sm font-medium">{channelName(selected?.shopId ?? undefined)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Cliente</p>
                <p className="text-sm font-medium">{selected?.customerName || "—"}</p>
              </div>
              <div className="flex items-center gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">Estado ticket</p>
                  <Badge className={ticketStatusBadgeClass(selected?.status)}>
                    {(selected?.status || "").toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Estado stock</p>
                  <Badge className={stockBadgeClass(selected?.stockStatus)}>
                    {stockLabel(selected?.stockStatus)}
                  </Badge>
                </div>
              </div>
            </div>

            <Separator />

            {/* Marca y SKUs */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Marca</p>
              <Badge variant="outline">{getBrandLabel(selected)}</Badge>

              <p className="text-xs text-muted-foreground mt-3">Productos (SKUs)</p>
              <div className="flex flex-wrap gap-2">
                {(selected?.skus && selected.skus.length > 0) ? (
                  selected.skus.map((sku, idx) => (
                    <Badge key={`${sku}-${idx}`} variant="secondary" className="font-mono">
                      {sku}
                    </Badge>
                  ))
                ) : (
                  <span>—</span>
                )}
              </div>
            </div>

            <Separator />

            {/* Notas y fechas */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Notas</p>
              <p className="text-sm">{selected?.notes || "—"}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Creado</p>
                <p className="text-sm">{formatDateTime(selected?.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Actualizado</p>
                <p className="text-sm">{formatDateTime(selected?.updatedAt)}</p>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => selected && revertMutation.mutate({ ticketId: Number(selected.id), revertShopify: true })}
              disabled={revertMutation.isPending || !selected}
            >
              <Undo2 className="h-4 w-4 mr-1" /> Deshacer
            </Button>
            <Button
              variant="outline"
              onClick={() => selected && deleteMutation.mutate(Number(selected.id))}
              disabled={deleteMutation.isPending || !selected}
            >
              <Trash2 className="h-4 w-4 mr-1" /> Eliminar
            </Button>
            <Button onClick={closeModal}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
