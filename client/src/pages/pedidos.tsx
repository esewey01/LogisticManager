import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, ChevronLeft, ChevronRight, MoreHorizontal, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import OrderDetailsModal from "@/components/modals/OrderDetailsModal";
import OrderDetailsModalNew from "@/components/modals/OrderDetailsModalNew";
import CancelOrderModal from "@/components/modals/CancelOrderModal";
import * as React from "react";
import { Filter, Search, X } from "lucide-react";
import { Eye, Ticket, Trash2 } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type OrderRow = {
  id: number | string
  name: string
  customerName: string | null
  channelId: number | null
  totalAmount: number | null
  fulfillmentStatus: "FULFILLED" | "UNFULFILLED" | string | null
  createdAt: string
  uiStatus: "SIN_GESTIONAR" | "GESTIONADA" | "ERROR"
  itemsCount: number
  skus: string[]
};

type OrdersResp = {
  rows: OrderRow[]
  total: number
  page: number
  pageSize: number
};

type Channel = { id: number | string; name: string; code?: string; color?: string; icon?: string };

// =================== Paginación ===================
const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  pageSize,
  onPageSizeChange,
  totalItems
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  totalItems: number;
}) => {
  const getPageNumbers = () => {
    if (totalPages <= 1) return [1];
    const delta = 2;
    const range: number[] = [];
    const rangeWithDots: (number | string)[] = [];

    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-700">
          Mostrando {totalItems === 0 ? 0 : Math.min((currentPage - 1) * pageSize + 1, totalItems)} - {Math.min(currentPage * pageSize, totalItems)} de {totalItems} resultados
        </span>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-700">Filas por página:</span>
          <Select value={pageSize.toString()} onValueChange={(value) => onPageSizeChange(Number(value))}>
            <SelectTrigger className="w-[80px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
              <SelectItem value="150">150</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {getPageNumbers().map((page, index) => (
            typeof page === 'number' ? (
              <Button
                key={index}
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
                onClick={() => onPageChange(page)}
                className="h-8 w-8 p-0"
              >
                {page}
              </Button>
            ) : (
              <div key={index} className="h-8 w-8 flex items-center justify-center text-gray-500">
                <MoreHorizontal className="h-4 w-4" />
              </div>
            )
          ))}

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

// =================== Vista principal ===================
export default function Pedidos() {
  const [search, setSearch] = useState("");
  const [searchType, setSearchType] = useState<"all" | "sku" | "customer" | "product">("all");
  const [statusFilter, setStatusFilter] = useState<"unmanaged" | "managed" | "all">("unmanaged");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [selectedOrders, setSelectedOrders] = useState<Array<number | string>>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderRow | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [cancelOrderId, setCancelOrderId] = useState<number | string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [sortField, setSortField] = useState<keyof OrderRow | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // reset página y selección al cambiar filtros/busqueda
  useEffect(() => {
    setPage(1);
    setSelectedOrders([]);
  }, [search, searchType, statusFilter, channelFilter, pageSize, sortField, sortOrder]);

  // ======= DATA =======
  const { data: ordersResp, isLoading } = useQuery<OrdersResp>({
    queryKey: ["/api/orders", { page, pageSize, search, searchType, statusFilter, channelFilter, sortField, sortOrder }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        ...(search && { search }),
        ...(searchType !== 'all' && { searchType }),
        // ✅ siempre envía el statusFilter para que no haya ambigüedad
        ...(statusFilter && { statusFilter }),
        // ✅ enviar 'channelId' que es lo que el backend espera
        ...(channelFilter !== 'all' && { channelId: String(channelFilter) }),
        ...(sortField && { sortField: String(sortField), sortOrder }),
      });

      const res = await apiRequest("GET", `/api/orders?${params}`);
      return res.json();
    },
    refetchInterval: 30000,
  });

  const orders = ordersResp?.rows ?? [];
  const total = ordersResp?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const { data: channels = [] } = useQuery<Channel[]>({
    queryKey: ["/api/channels"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/channels");
      return res.json();
    }
  });

  //
  // ======= MUTATIONS =======

  const updateOrderMutation = useMutation({
    mutationFn: async ({ orderId, updates }: { orderId: number | string; updates: Partial<OrderRow> }) => {
      await apiRequest("PATCH", `/api/orders/${orderId}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
    },
  });

  const filteredOrders = orders;

  const getChannelInfo = (channelId: number | string) => {
    const channel = channels.find((c: Channel) => String(c.id) === String(channelId));
    return channel || { code: "N/A", name: "Desconocido", color: "#6B7280", icon: "fas fa-circle" };
  };

  const handleSelectOrder = (orderId: number | string, checked: boolean) => {
    setSelectedOrders(prev =>
      checked
        ? Array.from(new Set([...prev, orderId]))
        : prev.filter(id => id !== orderId)
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrders(filteredOrders.map((order: any) => order.id));
    } else {
      setSelectedOrders([]);
    }
  };

  // ======= TICKETS =======
  // 1) Masivo
  const createBulkTicketsMutation = useMutation({
    mutationFn: async (orderIds: (number | string)[]) => {
      const response = await apiRequest("POST", "/api/tickets/bulk", {
        orderIds,
        notes: `Tickets creados masivamente el ${new Date().toLocaleDateString()}`,
      });
      return response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Resultado de tickets masivos",
        description: data?.message || `Se crearon ${data?.tickets?.length ?? 0} tickets`,
      });
      setSelectedOrders([]);
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error al crear tickets",
        description: error?.message || "No se pudieron crear los tickets",
        variant: "destructive",
      });
    },
  });

  const handleCreateTickets = () => {
    if (selectedOrders.length === 0) return;
    createBulkTicketsMutation.mutate(selectedOrders);
  };

  // 2) Individual
  const createTicketMutation = useMutation({
    mutationFn: async ({ orderId, notes }: { orderId: number | string; notes?: string }) => {
      const response = await apiRequest("POST", "/api/tickets", { orderId, notes });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Ticket creado", description: "Se creó el ticket y se actualizó la orden." });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error al crear ticket",
        description: error?.message || "No se pudo crear el ticket",
        variant: "destructive",
      });
    }
  });

  // ======= SYNC / EXPORT / IMPORT =======
  const syncOrdersMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/integrations/shopify/sync-now");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sincronización completada",
        description: `Se sincronizaron correctamente los pedidos de Shopify`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error en sincronización",
        description: error?.message || "No se pudo sincronizar con Shopify",
        variant: "destructive",
      });
    },
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      const filters = {
        statusFilter, // ✅ explícito
        channelId: channelFilter !== 'all' ? String(channelFilter) : undefined, // ✅ unificado
        search: search.trim() || undefined,
        searchType: searchType !== 'all' ? searchType : undefined,
      };
      const response = await apiRequest("POST", "/api/orders/export", filters);
      return response.blob();
    },
    onSuccess: (blob: Blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ordenes_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({ title: "Exportación Completada", description: "Archivo Excel descargado exitosamente" });
    },
    onError: (error: any) => {
      toast({
        title: "Error de Exportación",
        description: error.message || "No se pudo exportar el archivo",
        variant: "destructive",
      });
    },
  });

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/orders/import', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Error en la importación');

      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      toast({
        title: "Importación Completada",
        description: `${data.processed} órdenes procesadas. ${data.errors > 0 ? `${data.errors} errores encontrados.` : ''}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error de Importación",
        description: error.message || "No se pudo importar el archivo",
        variant: "destructive",
      });
    },
  });

  const handleExportClick = () => exportMutation.mutate();
  const handleImportClick = () => fileInputRef.current?.click();
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      importMutation.mutate(file);
      event.target.value = '';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <div>
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Gestión de Pedidos</h1>
          <p className="text-gray-600">Administra y procesa los pedidos del sistema</p>
        </div>

        {/* Filters and Actions */}
        <Card className="mb-6">
          <CardContent className="p-4 sm:p-6">
            {/* Toolbar principal */}
            <div className="flex flex-col gap-3">
              {/* Search + Filtros avanzados */}
              <div className="flex w-full items-center gap-2">
                {/* Barra de búsqueda unificada */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por número, cliente, SKU o producto..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 pr-10"
                    data-testid="input-search"
                  />
                  {/* Icono de filtros dentro del input */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        aria-label="Abrir filtros"
                        className="absolute right-1 top-1/2 -translate-y-1/2 inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted"
                      >
                        <Filter className="h-4 w-4" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[320px] p-3 sm:w-[420px]" align="end">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-semibold text-sm">Filtros avanzados</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSearchType("all");
                            setStatusFilter("unmanaged");  // ✅ respeta “sin gestionar” por defecto
                            setChannelFilter("all");
                          }}
                        >
                          Limpiar
                        </Button>

                      </div>

                      <Separator className="my-2" />

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Tipo de búsqueda */}
                        <div className="space-y-1.5">
                          <Label className="text-xs">Tipo de búsqueda</Label>
                          <Select
                            value={searchType}
                            onValueChange={(value) => setSearchType(value as any)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Tipo de búsqueda" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Buscar en todo</SelectItem>
                              <SelectItem value="sku">Por SKU</SelectItem>
                              <SelectItem value="customer">Por cliente</SelectItem>
                              <SelectItem value="product">Por producto</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Estado */}
                        <div className="space-y-1.5">
                          <Label className="text-xs">Estado</Label>
                          <Select
                            value={statusFilter}
                            onValueChange={(value) => setStatusFilter(value as any)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Filtrar por estado" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todos</SelectItem>
                              <SelectItem value="unmanaged">Sin gestionar</SelectItem>
                              <SelectItem value="managed">Gestionadas</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Canal */}
                        <div className="space-y-1.5 sm:col-span-2">
                          <Label className="text-xs">Canal</Label>
                          <Select value={channelFilter} onValueChange={setChannelFilter}>
                            <SelectTrigger>
                              <SelectValue placeholder="Filtrar por canal" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todos los canales</SelectItem>
                              {channels.map((channel: any) => (
                                <SelectItem key={channel.id} value={String(channel.id)}>
                                  {channel.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Acciones rápidas (compactas) */}
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => syncOrdersMutation.mutate()}
                    disabled={syncOrdersMutation.isPending}
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    title="Sincronizar ahora"
                    data-testid="button-sync-orders"
                  >
                    <RefreshCw className={`h-4 w-4 ${syncOrdersMutation.isPending ? 'animate-spin' : ''}`} />
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handleImportClick}
                    disabled={importMutation.isPending}
                    className="hidden sm:inline-flex"
                    data-testid="button-import-excel"
                  >
                    <i className={`fas fa-upload mr-2 ${importMutation.isPending ? 'animate-pulse' : ''}`} />
                    {importMutation.isPending ? 'Importando...' : 'Importar'}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handleExportClick}
                    disabled={exportMutation.isPending}
                    className="hidden sm:inline-flex"
                    data-testid="button-export-excel"
                  >
                    <i className={`fas fa-download mr-2 ${exportMutation.isPending ? 'animate-pulse' : ''}`} />
                    {exportMutation.isPending ? 'Exportando...' : 'Exportar'}
                  </Button>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                />
              </div>

              {/* Barra de selección masiva */}
              {selectedOrders.length > 0 && (
                <div className="flex items-center justify-between rounded-md border p-2 bg-muted/40">
                  <div className="text-sm text-gray-700">
                    {selectedOrders.length} seleccionado(s)
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={handleCreateTickets}
                      disabled={createBulkTicketsMutation.isPending}
                      data-testid="button-create-bulk-tickets"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      {createBulkTicketsMutation.isPending ? 'Creando...' : `Crear Tickets (${selectedOrders.length})`}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedOrders([])}>
                      Limpiar selección
                    </Button>
                  </div>
                </div>
              )}

              {/* Chips de filtros activos */}
              <div className="flex flex-wrap gap-2 mt-2">
                {!!search && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Buscar: "{search}"
                    <button
                      aria-label="Quitar búsqueda"
                      onClick={() => setSearch("")}
                      className="ml-1 hover:opacity-70"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </Badge>
                )}
                {searchType !== "all" && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Tipo: {searchType}
                    <button
                      aria-label="Quitar tipo"
                      onClick={() => setSearchType("all")}
                      className="ml-1 hover:opacity-70"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </Badge>
                )}
                {statusFilter !== "all" && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Estado: {statusFilter === "unmanaged" ? "Sin gestionar" : "Gestionadas"}
                    <button
                      aria-label="Quitar estado"
                      onClick={() => setStatusFilter("all")}
                      className="ml-1 hover:opacity-70"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </Badge>
                )}
                {channelFilter !== "all" && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Canal: {channels.find((c: Channel) => String(c.id) === String(channelFilter))?.name ?? channelFilter}
                    <button
                      aria-label="Quitar canal"
                      onClick={() => setChannelFilter("all")}
                      className="ml-1 hover:opacity-70"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </Badge>
                )}

                {(search || searchType !== "all" || statusFilter !== "all" || channelFilter !== "all") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => {
                      setSearch("");
                      setSearchType("all");
                      setStatusFilter("unmanaged");  // ✅
                      setChannelFilter("all");
                    }}
                  >
                    Limpiar todo
                  </Button>

                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              Pedidos Cargados ({total})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={filteredOrders.length > 0 && selectedOrders.length === filteredOrders.length}
                      onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                    />
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      className="hover:bg-transparent p-0 h-auto font-semibold"
                      onClick={() => {
                        if (sortField === "name") {
                          setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                        } else {
                          setSortField("name");
                          setSortOrder("asc");
                        }
                      }}
                    >
                      Orden
                      {sortField === "name" && (
                        <span className="ml-1">
                          {sortOrder === "asc" ? " 🔼" : " 🔽"}
                        </span>
                      )}
                    </Button>
                  </TableHead>
                  <TableHead>SKU's del Canal</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead>Productos</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order: any) => {
                  const channel = getChannelInfo(order.channelId);

                  return (
                    <TableRow key={order.id} className={order.status === 'DELETED' ? 'opacity-60 line-through' : ''}>
                      <TableCell>
                        <Checkbox
                          checked={selectedOrders.includes(order.id)}
                          onCheckedChange={(checked) => handleSelectOrder(order.id, Boolean(checked))}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {order.name ?? String(order.id)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {order.skus.slice(0, 4).map((sku: string) => (
                            <Badge key={sku} variant="outline">
                              {sku}
                            </Badge>
                          ))}
                          {order.skus.length > 4 && (
                            <Badge variant="secondary">+{order.skus.length - 4} más</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: channel.color }}
                          />
                          <span className="font-medium">{channel.code}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium">{order.itemsCount}</span>
                        <span className="text-xs text-gray-500 ml-1">productos</span>
                      </TableCell>
                      <TableCell>
                        {order.totalAmount != null ? (
                          <span className="font-medium">
                            ${Number(order.totalAmount).toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-gray-400">--</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            order.uiStatus === "GESTIONADA"
                              ? "default"
                              : order.uiStatus === "SIN_GESTIONAR"
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {order.uiStatus === "GESTIONADA"
                            ? "Gestionada"
                            : order.uiStatus === "SIN_GESTIONAR"
                              ? "Sin gestionar"
                              : "Error"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1.5">
                          {/* Ver (ojo) */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setSelectedOrderId(Number(order.id))}
                                aria-label="Ver pedido"
                                data-testid={`button-view-order-${order.id}`}
                              >
                                <Eye className="h-4 w-4" />
                                <span className="sr-only">Ver</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Ver</TooltipContent>
                          </Tooltip>

                          {/* Crear Ticket */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() =>
                                  createTicketMutation.mutate({ orderId: Number(order.id) })}
                                disabled={createTicketMutation.isPending || order.isManaged || order.hasTicket}
                                aria-label="Crear ticket"
                              >
                                <Ticket className="h-4 w-4" />
                                <span className="sr-only">Crear ticket</span>
                              </Button>

                            </TooltipTrigger>
                            <TooltipContent>Crear ticket</TooltipContent>
                          </Tooltip>

                          {/* Cancelar (basura) */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setCancelOrderId(order.id)}
                                className="text-red-600 hover:text-red-800"
                                aria-label="Cancelar pedido"
                                data-testid={`button-cancel-order-${order.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Cancelar</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Cancelar</TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>

                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {filteredOrders.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">No se encontraron pedidos que coincidan con los filtros.</p>
              </div>
            )}

            {/* Paginación */}
            {total > 0 && (
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={(p) => setPage(p)}
                pageSize={pageSize}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPage(1);
                }}
                totalItems={total}
              />
            )}
          </CardContent>
        </Card>

        {selectedOrder && (
          <OrderDetailsModal
            order={selectedOrder}
            onClose={() => setSelectedOrder(null)}
            channels={channels}
          />
        )}

        {selectedOrderId != null && (
          <OrderDetailsModalNew
            orderId={selectedOrderId}      // ✅ ahora es number
            isOpen={selectedOrderId != null}
            onClose={() => setSelectedOrderId(null)}
          />
        )}
      </div>
      {cancelOrderId && (
        <CancelOrderModal
          orderId={cancelOrderId}
          onClose={() => setCancelOrderId(null)}
          onCancelled={() => {
            setCancelOrderId(null);
            queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
          }}
        />
      )}
    </>
  );
}
