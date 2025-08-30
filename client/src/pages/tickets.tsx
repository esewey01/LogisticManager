import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Eye, Undo2, Trash2, Copy, ExternalLink } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";

/** Estructura que devuelve GET /api/tickets (getTicketsView) */
type TicketRow = {
  id: number | string;
  ticketNumber: string;
  status: string;                 // ABIERTO, ETIQUETA_GENERADA, ... | open (compat)
  // Logística
  serviceId?: number | null;
  serviceName?: string | null;
  carrierId?: number | null;
  carrierName?: string | null;
  trackingNumber?: string | null;
  labelUrl?: string | null;
  serviceLevel?: string | null;
  packageCount?: number | null;
  weightKg?: string | number | null;
  lengthCm?: string | number | null;
  widthCm?: string | number | null;
  heightCm?: string | number | null;
  stockStatus?: string | null;    // ok | apart | stock_out (legacy, puede omitirse)
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

  // Servicios logísticos
  const { data: services = [] } = useQuery<Array<{ id: number; name: string }>>({
    queryKey: ["/api/logistic-services"],
    queryFn: async () => {
      const r = await apiRequest("GET", "/api/logistic-services");
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    staleTime: 60_000,
  });

  // Paqueterías
  const { data: carriers = [] } = useQuery<Array<{ id: number; name: string }>>({
    queryKey: ["/api/carriers"],
    queryFn: async () => {
      const r = await apiRequest("GET", "/api/carriers");
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    staleTime: 60_000,
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

  // Actualizar servicio/carrier
  const setServiceMutation = useMutation({
    mutationFn: async ({ ticketId, serviceId, carrierId }: { ticketId: number; serviceId: number; carrierId?: number | null }) => {
      const r = await apiRequest("PATCH", `/api/tickets/${ticketId}/service`, { serviceId, carrierId: carrierId ?? null });
      if (!r.ok) throw new Error(await r.text());
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      toast({ title: "Servicio actualizado" });
    },
    onError: async (e: any) => toast({ variant: "destructive", title: "Error", description: String(e?.message || e) }),
  });

  // Actualizar datos de envío
  const shippingDataMutation = useMutation({
    mutationFn: async ({ ticketId, payload }: { ticketId: number; payload: any }) => {
      const r = await apiRequest("PATCH", `/api/tickets/${ticketId}/shipping-data`, payload);
      if (!r.ok) throw new Error(await r.text());
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      toast({ title: "Datos de envío actualizados" });
    },
    onError: async (e: any) => toast({ variant: "destructive", title: "Error", description: String(e?.message || e) }),
  });

  // Actualizar tracking
  const trackingMutation = useMutation({
    mutationFn: async ({ ticketId, payload }: { ticketId: number; payload: any }) => {
      const r = await apiRequest("PATCH", `/api/tickets/${ticketId}/tracking`, payload);
      if (!r.ok) throw new Error(await r.text());
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      toast({ title: "Tracking actualizado" });
    },
    onError: async (e: any) => toast({ variant: "destructive", title: "Error", description: String(e?.message || e) }),
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

  // badge para estado del ticket (mapa extendido)
  const ticketStatusBadgeClass = (status?: string) => {
    const s = (status || "").toUpperCase();
    if (s === "ABIERTO" || s === "OPEN") return "bg-yellow-100 text-yellow-800";
    if (s === "ETIQUETA_GENERADA") return "bg-blue-100 text-blue-800";
    if (s === "EN_TRÁNSITO" || s === "EN_TRANSITO") return "bg-indigo-100 text-indigo-800";
    if (s === "ENTREGADO" || s === "CLOSED") return "bg-green-100 text-green-800";
    if (s === "CANCELADO") return "bg-red-100 text-red-800";
    if (s === "FALLIDO") return "bg-orange-100 text-orange-800";
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
                {/* Producto debe mostrar el SKU */}
                <TableHead>Producto (SKU)</TableHead>
                <TableHead>Servicio logístico</TableHead>
                <TableHead>Paquetería</TableHead>
                <TableHead>Tracking</TableHead>
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
                    {/* PRODUCTO (SKU) */}
                    <TableCell>
                      <span className="font-mono">{skuLabel}</span>
                    </TableCell>

                    {/* SERVICIO LOGÍSTICO */}
                    <TableCell>{(t as any).serviceName || "—"}</TableCell>

                    {/* PAQUETERÍA */}
                    <TableCell>{(t as any).carrierName || "—"}</TableCell>

                    {/* TRACKING */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs">{(t as any).trackingNumber || "—"}</span>
                        {(t as any).trackingNumber && (
                          <Button variant="ghost" size="icon" onClick={() => navigator.clipboard.writeText(String((t as any).trackingNumber))} aria-label="Copiar tracking">
                            <Copy className="h-4 w-4" />
                          </Button>
                        )}
                        {(t as any).labelUrl && (
                          <Button variant="outline" size="icon" asChild aria-label="Ver etiqueta">
                            <a href={(t as any).labelUrl} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </div>
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
              </div>
            </div>

            <Separator />

            {/* Servicio logístico y Paquetería */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Servicio logístico</p>
                <Select
                  value={String(selected?.serviceId ?? "")}
                  onValueChange={(v) => selected && setServiceMutation.mutate({ ticketId: Number(selected.id), serviceId: Number(v) })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona servicio" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Paquetería</p>
                <CarrierSelect ticket={selected} onSet={(carrierId) => selected && setServiceMutation.mutate({ ticketId: Number(selected.id), serviceId: Number(selected.serviceId), carrierId })} />
              </div>
            </div>

            <Separator />

            {/* Datos de envío */}
            <ShippingDataEditor ticket={selected} onSave={(payload) => selected && shippingDataMutation.mutate({ ticketId: Number(selected.id), payload })} />

            <Separator />

            {/* Tracking */}
            <TrackingEditor ticket={selected} onSave={(payload) => selected && trackingMutation.mutate({ ticketId: Number(selected.id), payload })} />
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

// --- Componentes auxiliares para edición logística ---
function CarrierSelect({ ticket, onSet }: { ticket: TicketRow | null; onSet: (carrierId: number | null) => void }) {
  const serviceId = ticket?.serviceId ? Number(ticket.serviceId) : undefined;
  const enabled = !!serviceId;
  const { data: carriers = [], isFetching } = useQuery<Array<{ id: number; name: string }>>({
    queryKey: ["/api/service-carriers", serviceId],
    queryFn: async () => {
      if (!serviceId) return [] as any;
      const r = await apiRequest("GET", `/api/service-carriers?serviceId=${serviceId}`);
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    enabled,
    staleTime: 30_000,
  });

  return (
    <Select
      value={String(ticket?.carrierId ?? "")}
      onValueChange={(v) => onSet(v ? Number(v) : null)}
      disabled={!enabled || isFetching}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder={enabled ? (isFetching ? "Cargando..." : "Selecciona paquetería") : "Selecciona servicio primero"} />
      </SelectTrigger>
      <SelectContent>
        {carriers.map((c) => (
          <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ShippingDataEditor({ ticket, onSave }: { ticket: TicketRow | null; onSave: (payload: any) => void }) {
  const { toast } = useToast();
  const [pkg, setPkg] = React.useState<number | string>(ticket?.packageCount ?? 1);
  const [w, setW] = React.useState<number | string>(ticket?.weightKg ?? "");
  const [l, setL] = React.useState<number | string>(ticket?.lengthCm ?? "");
  const [wi, setWi] = React.useState<number | string>(ticket?.widthCm ?? "");
  const [h, setH] = React.useState<number | string>(ticket?.heightCm ?? "");
  const [lvl, setLvl] = React.useState<string>(ticket?.serviceLevel ?? "");

  React.useEffect(() => {
    setPkg(ticket?.packageCount ?? 1);
    setW(ticket?.weightKg ?? "");
    setL(ticket?.lengthCm ?? "");
    setWi(ticket?.widthCm ?? "");
    setH(ticket?.heightCm ?? "");
    setLvl(ticket?.serviceLevel ?? "");
  }, [ticket?.id]);

  const handleSave = () => {
    const package_count = Number(pkg);
    const weight_kg = w === "" ? null : Number(w);
    const length_cm = l === "" ? null : Number(l);
    const width_cm = wi === "" ? null : Number(wi);
    const height_cm = h === "" ? null : Number(h);
    const service_level = lvl || null;
    if (Number.isFinite(package_count) && package_count < 1) {
      toast({ variant: "destructive", title: "Validación", description: "El número de paquetes debe ser ≥ 1" });
      return;
    }
    if (weight_kg != null && !(Number(weight_kg) > 0)) {
      toast({ variant: "destructive", title: "Validación", description: "El peso debe ser mayor a 0" });
      return;
    }
    onSave({ package_count, weight_kg, length_cm, width_cm, height_cm, service_level });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
      <div className="md:col-span-2">
        <p className="text-xs text-muted-foreground mb-1">Nivel de servicio</p>
        <Input value={lvl} onChange={(e) => setLvl(e.target.value)} placeholder="E.g. Express, Ground" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-1">Paquetes</p>
        <Input type="number" value={pkg as any} onChange={(e) => setPkg(e.target.value)} min={1} />
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-1">Peso (kg)</p>
        <Input type="number" step="0.01" value={w as any} onChange={(e) => setW(e.target.value)} />
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-1">Largo (cm)</p>
        <Input type="number" step="0.1" value={l as any} onChange={(e) => setL(e.target.value)} />
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-1">Ancho (cm)</p>
        <Input type="number" step="0.1" value={wi as any} onChange={(e) => setWi(e.target.value)} />
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-1">Alto (cm)</p>
        <Input type="number" step="0.1" value={h as any} onChange={(e) => setH(e.target.value)} />
      </div>
      <div className="md:col-span-6">
        <Button onClick={handleSave}>Guardar datos de envío</Button>
      </div>
    </div>
  );
}

function TrackingEditor({ ticket, onSave }: { ticket: TicketRow | null; onSave: (payload: any) => void }) {
  const [tracking, setTracking] = React.useState<string>(ticket?.trackingNumber ?? "");
  const [url, setUrl] = React.useState<string>(ticket?.labelUrl ?? "");
  React.useEffect(() => {
    setTracking(ticket?.trackingNumber ?? "");
    setUrl(ticket?.labelUrl ?? "");
  }, [ticket?.id]);
  const handleSave = () => onSave({ tracking_number: tracking || null, label_url: url || null });
  return (
    <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
      <div className="md:col-span-2">
        <p className="text-xs text-muted-foreground mb-1">Tracking</p>
        <Input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="Número de guía" />
      </div>
      <div className="md:col-span-3">
        <p className="text-xs text-muted-foreground mb-1">URL de etiqueta</p>
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
      </div>
      <div className="md:col-span-1 flex gap-2">
        <Button variant="secondary" onClick={() => navigator.clipboard.writeText(tracking)} disabled={!tracking}>Copiar</Button>
        {url && (
          <Button variant="outline" asChild>
            <a href={url} target="_blank" rel="noopener noreferrer">Ver etiqueta</a>
          </Button>
        )}
        <Button onClick={handleSave}>Guardar</Button>
      </div>
    </div>
  );
}
