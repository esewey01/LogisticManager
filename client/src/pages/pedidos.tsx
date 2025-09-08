import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import LocalOrderModal from "@/components/modals/LocalOrderModal"; // ⬅️ Import agregado
import {
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Plus,
  Filter,
  Search,
  X,
  Eye,
  Ticket,
  ArrowRight,
  Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useLastSyncToast } from "@/hooks/useLastSyncToast";
import { apiRequest } from "@/lib/queryClient";
import OrderDetailsModalNew from "@/components/modals/OrderDetailsModalNew";
import CancelOrderModal from "@/components/modals/CancelOrderModal";
import ImportOrdersModal from "@/components/modals/ImportOrdersModal";
import SearchAlternativesModal from "@/components/modals/SearchAlternativesModal";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// =================== Tipos ===================
type OrderItemEnriched = {
  sku?: string | null;
  price?: number | null;
  quantity?: number | null;
  vendorFromShop?: string | null;
  catalogBrand?: string | null;
  stockFromCatalog?: number | null;
  stockState?: "Stock Out" | "Apartar" | "OK" | "Desconocido";
  enAlmacen?: boolean | null; // ← NUEVO
};
type OrderRow = {
  id: number | string;
  name: string;
  customerName: string | null;
  channelId: number | string | null;
  totalAmount: number | null;
  fulfillmentStatus: string | null; // "FULFILLED" | "UNFULFILLED" | "restocked" | ...
  createdAt: string;
  items?: OrderItemEnriched[] | string;
  uiStatus?: "SIN_GESTIONAR" | "GESTIONADA" | "ERROR";
};
type OrdersResp = {
  rows: OrderRow[];
  total: number;
  page: number;
  pageSize: number;
};
type Channel = { id: number | string; name: string; code?: string; color?: string; icon?: string };

// =================== Paginación ===================
const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  pageSize,
  onPageSizeChange,
  totalItems,
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
    if (currentPage - delta > 2) rangeWithDots.push(1, "...");
    else rangeWithDots.push(1);
    rangeWithDots.push(...range);
    if (currentPage + delta < totalPages - 1) rangeWithDots.push("...", totalPages);
    else if (totalPages > 1) rangeWithDots.push(totalPages);
    return rangeWithDots;
  };
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-700">
          Mostrando {totalItems === 0 ? 0 : Math.min((currentPage - 1) * pageSize + 1, totalItems)} -{" "}
          {Math.min(currentPage * pageSize, totalItems)} de {totalItems} resultados
        </span>
      </div>
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-700">Filas por página:</span>
          <Select value={pageSize.toString()} onValueChange={(value) => onPageSizeChange(Number(value))}>
            <SelectTrigger className="h-8 w-[80px]">
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
          {getPageNumbers().map((p, index) =>
            typeof p === "number" ? (
              <Button
                key={index}
                variant={currentPage === p ? "default" : "outline"}
                size="sm"
                onClick={() => onPageChange(p)}
                className="h-8 w-8 p-0"
              >
                {p}
              </Button>
            ) : (
              <div key={index} className="h-8 w-8 flex items-center justify-center text-gray-500">
                <MoreHorizontal className="h-4 w-4" />
              </div>
            )
          )}
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
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState(""); // <- este es el que viaja al backend
  const [searchType, setSearchType] = useState<"all" | "order" | "sku">("all");
  function handleSearchExecute() {
    // (opcional) mínimo de caracteres para no saturar: 2
    if (searchDraft.trim().length === 0) {
      setSearch("");
    } else if (searchDraft.trim().length >= 2) {
      setSearch(searchDraft.trim());
    } else {
      return;
    }
    setPage(1);
  }
  const [statusFilter, setStatusFilter] = useState<"unmanaged" | "managed" | "all" | "cancelled">("unmanaged");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [stockFilter, setStockFilter] = useState<"all" | "out" | "apartar" | "ok">("all");
  const [selectedOrders, setSelectedOrders] = useState<Array<number | string>>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [cancelOrderId, setCancelOrderId] = useState<number | string | null>(null);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchSeed, setSearchSeed] = useState<string>("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [sortField, setSortField] = useState<keyof OrderRow | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showImportModal, setShowImportModal] = useState(false);
  const [showLocalModal, setShowLocalModal] = useState(false); // ⬅️ Estado agregado
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canCreateLocalOrder = true; // ⬅️ Permiso (ajusta si tienes uno real)

  // React Query
  const queryClient = useQueryClient();
  const { toast } = useToast();
  // Poll de último resultado de sync para toasts automáticos
  useLastSyncToast(60_000);
  // reset página y selección al cambiar filtros/búsqueda
  useEffect(() => {
    setPage(1);
    setSelectedOrders([]);
  }, [search, searchType, statusFilter, channelFilter, brandFilter, stockFilter, pageSize, sortField, sortOrder]);
  // ======= DATA =======
  const { data: ordersResp, isLoading, refetch, isFetching } = useQuery<OrdersResp>({
    queryKey: [
      "/api/orders",
      { page, pageSize, search, searchType, statusFilter, channelFilter, brandFilter, stockFilter, sortField, sortOrder },
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        ...(search && search.trim().length >= 2 ? { search } : {}), // solo manda search si cumple mínimo
        ...(searchType !== "all" && { searchType }),
        ...(statusFilter && { statusFilter }),
        ...(channelFilter !== "all" && { channelId: String(channelFilter) }),
        ...(brandFilter !== "all" && brandFilter ? { brand: brandFilter } : {}),
        ...(stockFilter !== "all" ? { stock_state: stockFilter } : {}),
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
    },
  });
  const { data: brands = [] } = useQuery<string[]>({
    queryKey: ["/api/orders/brands", { channelFilter }],
    queryFn: async () => {
      const params = new URLSearchParams({
        ...(channelFilter !== "all" ? { shopId: String(channelFilter) } : {}),
      });
      const res = await apiRequest("GET", `/api/orders/brands?${params}`);
      return res.json();
    },
  });
  // ======= MUTATIONS =======
  const updateOrderMutation = useMutation({
    mutationFn: async ({ orderId, updates }: { orderId: number | string; updates: Partial<OrderRow> }) => {
      await apiRequest("PATCH", `/api/orders/${orderId}`, updates);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
    },
  });
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
    },
  });
  const syncOrdersMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/integrations/shopify/sync-now");
      return response.json();
    },
    onSuccess: (data: any) => {
      const total = data?.totalUpserted ?? data?.resultado?.totalUpserted ?? 0;
      toast({
        title: "Sincronización completada",
        description: `Pedidos actualizados: ${total}`,
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
        statusFilter,
        channelId: channelFilter !== "all" ? String(channelFilter) : undefined,
        search: search.trim() || undefined,
        searchType: searchType !== "all" ? searchType : undefined,
      };
      const response = await apiRequest("POST", "/api/orders/export", filters);
      return response.blob();
    },
    onSuccess: (blob: Blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ordenes_${new Date().toISOString().split("T")[0]}.xlsx`;
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
      formData.append("file", file);
      const response = await fetch("/api/orders/import", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Error en la importación");
      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      toast({
        title: "Importación Completada",
        description: `${data.processed} órdenes procesadas. ${data.errors > 0 ? `${data.errors} errores encontrados.` : ""}`,
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
  const handleImportClick = () => setShowImportModal(true);
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      importMutation.mutate(file);
      event.target.value = "";
    }
  };
  const filteredOrders = orders;
  const getChannelInfo = (channelId: number | string) => {
    const channel = (channels as Channel[]).find((c) => String(c.id) === String(channelId));
    return channel || { code: "N/A", name: "Desconocido", color: "#6B7280", icon: "fas fa-circle" };
  };
  const handleSelectOrder = (orderId: number | string, checked: boolean) => {
    setSelectedOrders((prev) => (checked ? Array.from(new Set([...prev, orderId])) : prev.filter((id) => id !== orderId)));
  };
  const handleSelectAll = (checked: boolean) => {
    if (checked) setSelectedOrders(filteredOrders.map((order: any) => order.id));
    else setSelectedOrders([]);
  };
  const parseItems = (raw: any): OrderItemEnriched[] => {
    if (Array.isArray(raw)) return raw as OrderItemEnriched[];
    if (typeof raw === "string") {
      try { return JSON.parse(raw) as OrderItemEnriched[]; } catch { return []; }
    }
    return [];
  };
  // === NUEVO: obtener estado de cumplimiento desde 3 fuentes (camel, snake, uiStatus)
  const getFulfillmentFromOrder = (o: OrderRow): string | null => {
    const camel = o?.fulfillmentStatus ?? null;
    const snake = (o as any)?.fulfillment_status ?? null;
    if (camel) return camel;
    if (snake) return snake;
    if (o?.uiStatus === "GESTIONADA") return "FULFILLED";
    if (o?.uiStatus === "SIN_GESTIONAR") return "UNFULFILLED";
    return null;
  };
  // === Totales mini-cards (por orden)
  const { todayCount, pendingCount, outCount, apartarCount, okCount } = React.useMemo(() => {
    const today = new Date();
    const isSameDay = (a: Date, b: Date) =>
      a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    let _today = 0;
    let _pending = 0;
    let _out = 0;
    let _apartar = 0;
    let _ok = 0;
    for (const o of orders) {
      const d = new Date(o.createdAt);
      if (isSameDay(d, today)) _today++;
      const f =
        getFulfillmentFromOrder?.(o as any) ??
        (o as any)?.fulfillmentStatus ??
        (o as any)?.fulfillment_status ??
        null;
      if (!f || String(f).toUpperCase() === "UNFULFILLED") _pending++;
      const items = parseItems?.((o as any).items) ?? (Array.isArray((o as any).items) ? (o as any).items : []);
      let hasOut = false;
      let hasApartar = false;
      let hasOk = false;
      for (const it of items) {
        const n = (it as any)?.stockFromCatalog;
        if (typeof n === "number") {
          if (n === 0) hasOut = true;
          if (n > 0 && n <= 15) hasApartar = true;
          if (n > 15) hasOk = true;
        }
      }
      if (hasOut) _out++;
      if (hasApartar) _apartar++;
      if (hasOk) _ok++;
    }
    return { todayCount: _today, pendingCount: _pending, outCount: _out, apartarCount: _apartar, okCount: _ok };
  }, [orders]);
  const renderStatusBadge = (status?: string | null) => {
    const raw = (status ?? "").toString();
    const s = raw.toUpperCase();
    if (raw.toLowerCase() === "restocked") {
      return (
        <Badge variant="outline" className="text-xs px-2 py-0.5 bg-orange-100 text-orange-800 border-orange-200">
          Cancelada
        </Badge>
      );
    }
    if (s === "FULFILLED") {
      return (
        <Badge variant="outline" className="text-xs px-2 py-0.5 bg-green-100 text-green-800 border-green-200">
          Gestionada
        </Badge>
      );
    }
    if (s === "UNFULFILLED" || !raw) {
      return (
        <Badge variant="outline" className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 border-blue-200">
          Sin gestionar
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-xs px-2 py-0.5 bg-gray-100 text-gray-800 border-gray-200">
        {raw}
      </Badge>
    );
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
          <h1 className="text-2xl font-semibold mb-2">Gestión de Pedidos</h1>
          <p className="text">Administra y procesa los pedidos del sistema</p>
        </div>
        {/* Mini Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          <Card className="border-muted">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Órdenes de hoy</p>
              <p className="text-xl font-bold">{todayCount}</p>
            </CardContent>
          </Card>
          <Card className="border-muted">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Pendientes</p>
              <p className="text-xl font-bold text-blue-700">{pendingCount}</p>
            </CardContent>
          </Card>
          <Card className="border-muted">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Stock Out (=0)</p>
              <p className="text-xl font-bold text-red-700">{outCount}</p>
            </CardContent>
          </Card>
          <Card className="border-muted">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Apartar (1–15)</p>
              <p className="text-xl font-bold text-yellow-700">{apartarCount}</p>
            </CardContent>
          </Card>
          <Card className="border-muted">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">OK (&gt;15)</p>
              <p className="text-xl font-bold text-green-700">{okCount}</p>
            </CardContent>
          </Card>
        </div>
        {/* Filters and Actions */}
        <Card className="mb-6">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col gap-3">
              {/* Search + Filtros avanzados */}
              <div className="flex w-full items-center gap-2">
                {/* Barra de búsqueda */}
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por número de orden nombre o SKU…"
                    value={searchDraft}
                    onChange={(e) => setSearchDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSearchExecute();
                    }}
                    className="pl-9 pr-24"
                    data-testid="input-search"
                  />
                  {/* Botón Buscar dentro del input (derecha) */}
                  <button
                    onClick={handleSearchExecute}
                    className="absolute right-1 top-1/2 -translate-y-1/2 inline-flex items-center justify-center h-8 px-3 rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-60"
                    disabled={isFetching}
                    aria-label="Buscar"
                  >
                    {isFetching ? "Buscando…" : "Buscar"}
                  </button>
                </div>
                {/* Botón/Filtro como HERMANO, NO superpuesto */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="inline-flex items-center gap-2"
                      aria-label="Abrir filtros"
                      title="Filtros avanzados"
                    >
                      <Filter className="h-4 w-4" />
                      Filtros
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[320px] p-3 sm:w-[420px]" align="end">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-semibold text-sm">Filtros avanzados</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSearchDraft("");
                          setSearch("");
                          setSearchType("all");
                          setStatusFilter("unmanaged");
                          setChannelFilter("all");
                          setBrandFilter("all");
                          setStockFilter("all");
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
                        <Select value={searchType} onValueChange={(value) => setSearchType(value as "all" | "order" | "sku")}>
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Tipo de búsqueda" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            <SelectItem value="order">Por orden</SelectItem>
                            <SelectItem value="sku">Por SKU</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {/* Estado */}
                      <div className="space-y-1.5">
                        <Label className="text-xs">Estado</Label>
                        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Filtrar por estado" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            <SelectItem value="unmanaged">Sin gestionar</SelectItem>
                            <SelectItem value="managed">Gestionadas</SelectItem>
                            <SelectItem value="cancelled">Canceladas</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {/* Canal */}
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label className="text-xs">Canal</Label>
                        <Select value={channelFilter} onValueChange={setChannelFilter}>
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Filtrar por canal" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos los canales</SelectItem>
                            {(channels as Channel[]).map((channel) => (
                              <SelectItem key={channel.id} value={String(channel.id)}>
                                {channel.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {/* Marca */}
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label className="text-xs">Marca</Label>
                        <Select value={brandFilter} onValueChange={setBrandFilter}>
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Todas las marcas" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todas</SelectItem>
                            {brands.map((b: string) => (
                              <SelectItem key={b} value={b}>
                                {b}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {/* Stock */}
                      <div className="space-y-1.5">
                        <Label className="text-xs">Stock</Label>
                        <Select value={stockFilter} onValueChange={(v) => setStockFilter(v as any)}>
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Todos" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            <SelectItem value="out">Stock Out</SelectItem>
                            <SelectItem value="apartar">Apartar</SelectItem>
                            <SelectItem value="ok">OK</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                {/* Acciones rápidas */}
                <div className="flex items-center gap-2">
                  {/* ⬇️ NUEVO: Crear orden local */}
                  {canCreateLocalOrder && (
                    <Button
                      onClick={() => setShowLocalModal(true)}
                      className="hidden sm:inline-flex"
                      data-testid="button-create-local-order"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Venta Directa
                    </Button>
                  )}
                  <Button
                    onClick={() => syncOrdersMutation.mutate()}
                    disabled={syncOrdersMutation.isPending}
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    title="Sincronizar ahora"
                    data-testid="button-sync-orders"
                  >
                    <RefreshCw className={`h-4 w-4 ${syncOrdersMutation.isPending ? "animate-spin" : ""}`} />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleImportClick}
                    disabled={importMutation.isPending}
                    className="hidden sm:inline-flex"
                    data-testid="button-import-excel"
                  >
                    <i className={`fas fa-upload mr-2 ${importMutation.isPending ? "animate-pulse" : ""}`} />
                    {importMutation.isPending ? "Importando..." : "Importar"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleExportClick}
                    disabled={exportMutation.isPending}
                    className="hidden sm:inline-flex"
                    data-testid="button-export-excel"
                  >
                    <i className={`fas fa-download mr-2 ${exportMutation.isPending ? "animate-pulse" : ""}`} />
                    {exportMutation.isPending ? "Exportando..." : "Exportar"}
                  </Button>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                />
              </div>
              {/* Barra de selección masiva */}
              {selectedOrders.length > 0 && (
                <div className="flex items-center justify-between rounded-md border p-2 bg-muted/40">
                  <div className="text-sm text-gray-700">{selectedOrders.length} seleccionado(s)</div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => {
                        if (selectedOrders.length === 0) return;
                        createBulkTicketsMutation.mutate(selectedOrders);
                      }}
                      disabled={createBulkTicketsMutation.isPending}
                      data-testid="button-create-bulk-tickets"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      {createBulkTicketsMutation.isPending ? "Creando..." : `Crear Tickets (${selectedOrders.length})`}
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
                  <Badge variant="secondary" className="flex items-center gap-1 text-xs px-2 py-0.5">
                    Buscar: "{search}"
                    <button aria-label="Quitar búsqueda" onClick={() => { setSearch(""); setSearchDraft(""); }} className="ml-1 hover:opacity-70">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </Badge>
                )}
                {searchType !== "all" && (
                  <Badge variant="secondary" className="flex items-center gap-1 text-xs px-2 py-0.5">
                    Tipo: {searchType}
                    <button aria-label="Quitar tipo" onClick={() => setSearchType("all")} className="ml-1 hover:opacity-70">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </Badge>
                )}
                {statusFilter !== "all" && (
                  <Badge variant="secondary" className="flex items-center gap-1 text-xs px-2 py-0.5">
                    Estado: {statusFilter === "unmanaged" ? "Sin gestionar" : statusFilter === "managed" ? "Gestionadas" : "Canceladas"}
                    <button aria-label="Quitar estado" onClick={() => setStatusFilter("all")} className="ml-1 hover:opacity-70">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </Badge>
                )}
                {channelFilter !== "all" && (
                  <Badge variant="secondary" className="flex items-center gap-1 text-xs px-2 py-0.5">
                    Canal: {(channels as Channel[]).find((c) => String(c.id) === String(channelFilter))?.name ?? channelFilter}
                    <button aria-label="Quitar canal" onClick={() => setChannelFilter("all")} className="ml-1 hover:opacity-70">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </Badge>
                )}
                {brandFilter !== "all" && (
                  <Badge variant="secondary" className="flex items-center gap-1 text-xs px-2 py-0.5">
                    Marca: {brandFilter}
                    <button aria-label="Quitar marca" onClick={() => setBrandFilter("all")} className="ml-1 hover:opacity-70">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </Badge>
                )}
                {stockFilter !== "all" && (
                  <Badge variant="secondary" className="flex items-center gap-1 text-xs px-2 py-0.5">
                    Stock: {stockFilter === "out" ? "Stock Out" : stockFilter === "apartar" ? "Apartar" : "OK"}
                    <button aria-label="Quitar stock" onClick={() => setStockFilter("all")} className="ml-1 hover:opacity-70">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </Badge>
                )}
                {(search || searchType !== "all" || statusFilter !== "all" || channelFilter !== "all" || brandFilter !== "all" || stockFilter !== "all") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => {
                      setSearchDraft("");
                      setSearch("");
                      setSearchType("all");
                      setStatusFilter("unmanaged");
                      setChannelFilter("all");
                      setBrandFilter("all");
                      setStockFilter("all");
                    }}
                  >
                    Limpiar filtros
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        {/* Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle>Pedidos Cargados ({total})</CardTitle>
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
                      {sortField === "name" && <span className="ml-1">{sortOrder === "asc" ? " 🔼" : " 🔽"}</span>}
                    </Button>
                  </TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead>Marca Canal / Marca Catálogo</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order: OrderRow) => {
                  const channel = order.channelId != null ? getChannelInfo(order.channelId) : getChannelInfo("N/A");
                  const items = parseItems(order.items);
                  const fulfillment = getFulfillmentFromOrder(order);
                  return (
                    <TableRow key={order.id} className={(order as any).status === "DELETED" ? "opacity-60 line-through" : ""}>
                      {/* Select */}
                      <TableCell>
                        <Checkbox
                          checked={selectedOrders.includes(order.id)}
                          onCheckedChange={(checked) => handleSelectOrder(order.id, Boolean(checked))}
                        />
                      </TableCell>
                      {/* Orden */}
                      <TableCell className="font-medium">{order.name ?? String(order.id)}</TableCell>
                      {/* Canal */}
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: (channel as any).color }} />
                          <span className="font-medium">{(channel as any).code ?? "N/A"}</span>
                        </div>
                      </TableCell>
                      {/* Marca (vendor / catálogo) */}
                      <TableCell>
                        {items.length === 0 ? (
                          <span className="text-gray-400">—</span>
                        ) : (
                          <div className="flex flex-col gap-1">
                            {items.map((it, idx) => {
                              const vendor = (it?.vendorFromShop ?? "").trim();
                              const catBrand = (it?.catalogBrand ?? "").trim();
                              const hasVendor = vendor.length > 0;
                              const hasCat = catBrand.length > 0;
                              if (!hasVendor && !hasCat) {
                                return (
                                  <span key={idx} className="text-gray-400">
                                    —
                                  </span>
                                );
                              }
                              return (
                                <div key={idx} className="text-sm">
                                  {hasVendor && <span className="font-medium">{vendor}</span>}
                                  {hasVendor && hasCat && <span> · </span>}
                                  {hasCat && <span className="text-gray-600">{catBrand}</span>}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </TableCell>
                      {/* Stock (badge por ítem, con tooltip del número) */}
                      <TableCell>
                        {items.length === 0 ? (
                          <span className="text-gray-400">—</span>
                        ) : (
                          <div className="flex flex-col gap-1">
                            {items.map((it, idx) => {
                              const stock = it?.stockFromCatalog ?? null;
                              let label = "Desconocido";
                              let cls = "text-xs px-2 py-0.5 bg-gray-100 text-gray-800 border-gray-200";
                              if (stock === 0) {
                                label = "Stock Out";
                                cls = "text-xs px-2 py-0.5 bg-red-100 text-red-800 border-red-200";
                              } else if (typeof stock === "number" && stock > 0 && stock <= 15) {
                                label = "Apartar";
                                cls = "text-xs px-2 py-0.5 bg-yellow-100 text-yellow-800 border-yellow-200";
                              } else if (typeof stock === "number" && stock > 15) {
                                label = "OK";
                                cls = "text-xs px-2 py-0.5 bg-green-100 text-green-800 border-green-200";
                              }
                              return (
                                <div key={idx} className="flex items-center gap-2">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div>
                                        <Badge variant="outline" className={cls}>
                                          {label}
                                        </Badge>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>Stock: {stock ?? "N/D"}</TooltipContent>
                                  </Tooltip>
                                  {/* Botón antiguo de 'Buscar' eliminado según nuevo flujo */}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </TableCell>
                      {/* Monto */}
                      <TableCell>
                        {order.totalAmount != null ? (
                          <span className="font-medium">${Number(order.totalAmount).toLocaleString()}</span>
                        ) : (
                          <span className="text-gray-400">--</span>
                        )}
                      </TableCell>
                      {/* Estado (restaurado + cancelada) */}
                      <TableCell>{renderStatusBadge(fulfillment)}</TableCell>
                      {/* Fecha */}
                      <TableCell className="text-sm">{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                      {/* Acciones */}
                      <TableCell>
                        <div className="flex items-center space-x-1.5">
                          {/* Ver */}
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
                          {/* Búsqueda marketplace */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={async () => {
                                  await apiRequest('POST', `/api/orders/${order.id}/mark-marketplace-pending`);
                                  queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
                                }}
                                aria-label="Búsqueda marketplace"
                              >
                                Búsqueda marketplace
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Búsqueda marketplace</TooltipContent>
                          </Tooltip>
                          {/* Crear Ticket */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => createTicketMutation.mutate({ orderId: Number(order.id) })}
                                disabled={(createTicketMutation as any).isPending || (order as any).isManaged || (order as any).hasTicket}
                                aria-label="Crear ticket"
                              >
                                <Ticket className="h-4 w-4" />
                                <span className="sr-only">Crear ticket</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Crear ticket</TooltipContent>
                          </Tooltip>
                          {/* Sustituto */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={async () => {
                                  await apiRequest('POST', `/api/orders/${order.id}/mark-marketplace-pending`);
                                  queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
                                }}
                                aria-label="Sustituto"
                              >
                                <ArrowRight className="h-4 w-4" />
                                <span className="sr-only">Sustituto</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Sustituto</TooltipContent>
                          </Tooltip>
                          {/* Cancelar */}
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
        {/* Modales */}
        {selectedOrderId != null && (
          <OrderDetailsModalNew
            orderId={selectedOrderId}
            isOpen={selectedOrderId != null}
            onClose={() => setSelectedOrderId(null)}
          />
        )}
        {/* Modal: Nueva Orden Local */}
                {/* Modal: Nueva Orden Local */}
        {showLocalModal && (
          <LocalOrderModal
            show={showLocalModal}
            handleClose={() => {
              setShowLocalModal(false);
            }}
            handleSubmit={(data: any) => {
              console.log('Datos del formulario:', data);
              setShowLocalModal(false);
              // Invalidar queries después de crear
              queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
              queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
            }}
          />
        )}
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
        {showImportModal && <ImportOrdersModal open={showImportModal} onClose={() => setShowImportModal(false)} />}
        <SearchAlternativesModal
          open={showSearchModal}
          onClose={() => setShowSearchModal(false)}
          seedQuery={searchSeed}
        />
      </div>
    </>
  );
}
