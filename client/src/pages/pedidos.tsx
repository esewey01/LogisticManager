import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest } from "@/lib/queryClient";
import OrderDetailsModal from "@/components/modals/OrderDetailsModal";


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
};

type OrdersResp = {
  rows: OrderRow[]
  total: number
  page: number
  pageSize: number
};

type Channel = { id: number | string; name: string; code?: string; color?: string; icon?: string };






export default function Pedidos() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"unmanaged" | "managed" | "all">("unmanaged");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [selectedOrders, setSelectedOrders] = useState<Array<number | string>>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderRow | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const queryClient = useQueryClient();
  const [sortField, setSortField] = useState<keyof OrderRow | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | null>(null);

  // TODO: si agregas filtros/paginación, ponlos aquí y en queryKey

  const { data: ordersResp, isLoading } = useQuery<OrdersResp>({
    queryKey: [
      "/api/orders",
      { page, pageSize, statusFilter, channelFilter, search, sortField, sortOrder },
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        statusFilter,
        ...(channelFilter !== "all" && { channelId: channelFilter }),
        ...(search && { search }),
        ...(sortField && { sortField }),
        ...(sortOrder && { sortOrder }),
      });

      const res = await apiRequest("GET", `/api/orders?${params}`);
      return res.json();
    },
  });

  const orders: OrderRow[] = ordersResp?.rows ?? [];

  const { data: channels = [] } = useQuery<Channel[]>({
    queryKey: ["/api/channels"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/channels");
      return res.json();
    },
  });

  const deleteOrderMutation = useMutation({
    mutationFn: async ({ orderId, deleted }: { orderId: number | string; deleted: boolean }) => {
      await apiRequest("PATCH", `/api/orders/${orderId}`, { status: deleted ? "DELETED" : null });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    },
  });

  const updateOrderMutation = useMutation({
    mutationFn: async ({ orderId, updates }: { orderId: number | string; updates: any }) => {
      await apiRequest("PATCH", `/api/orders/${orderId}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
    },
  });

  // filtrar sobre el array ya “normalizado”
  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      (order.customerName ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (order.name ?? "").toLowerCase().includes(search.toLowerCase());

    const matchesChannel =
      channelFilter === "all" || String(order.channelId) === String(channelFilter);

    return matchesSearch && matchesChannel;
  });

  const getChannelInfo = (channelId: number | string) => {
    const channel = channels.find((c) => String(c.id) === String(channelId));
    return channel || { code: "N/A", name: "Desconocido", color: "#6B7280", icon: "fas fa-circle" };
  };

  const handleSelectOrder = (orderId: string, checked: boolean) => {
    setSelectedOrders(prev =>
      checked
        ? [...prev, orderId]
        : prev.filter(id => id !== orderId)
    );
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedOrders(checked ? filteredOrders.map((order: any) => order.id) : []);
  };

  const handleCreateTickets = async () => {
    for (const orderId of selectedOrders) {
      await updateOrderMutation.mutateAsync({
        orderId,
        updates: { isManaged: true, hasTicket: true }
      });
    }
    setSelectedOrders([]);
  };


  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }



  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Gestión de Pedidos</h1>
        <p className="text-gray-600">Administra y procesa los pedidos del sistema</p>
      </div>

      {/* Filters and Actions */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4">
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 flex-1">
              <div className="flex-1">
                <Input
                  placeholder="Buscar por cliente, SKU, o ID de pedido..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full"
                />
              </div>

              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                <SelectTrigger className="w-full sm:w-56">
                  <SelectValue placeholder="Estado de gestión" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unmanaged">Sin Gestionar</SelectItem>
                  <SelectItem value="managed">Gestionados</SelectItem>
                  <SelectItem value="all">Todos</SelectItem>
                </SelectContent>
              </Select>


              <Select value={channelFilter} onValueChange={setChannelFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filtrar por canal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los canales</SelectItem>
                  {channels.map((channel: any) => (
                    <SelectItem key={channel.id} value={channel.id}>
                      {channel.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex space-x-2">
              {selectedOrders.length > 0 && (
                <Button onClick={handleCreateTickets} disabled={updateOrderMutation.isPending}>
                  <i className="fas fa-ticket-alt mr-2"></i>
                  Crear Tickets ({selectedOrders.length})
                </Button>
              )}
              <Button variant="outline">
                <i className="fas fa-upload mr-2"></i>
                Importar Excel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Pedidos Cargados({filteredOrders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={filteredOrders.length > 0 && selectedOrders.length === filteredOrders.length}
                    onCheckedChange={handleSelectAll}
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
                    Nombre
                    {sortField === "name" && (
                      <span className="ml-1">
                        {sortOrder === "asc" ? " 🔼" : " 🔽"}
                      </span>
                    )}
                  </Button>
                </TableHead>
                <TableHead>Cliente</TableHead>
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
                const products = Array.isArray(order.products) ? order.products : [];

                return (

                  <TableRow key={order.id} className={order.status === 'DELETED' ? 'opacity-60 line-through' : ''}>
                    <TableCell>
                      <Checkbox
                        checked={selectedOrders.includes(order.id)}
                        onCheckedChange={(checked) => handleSelectOrder(order.id, checked as boolean)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {order.name ?? String(order.id)}  {/* ✅ Nombre del pedido o ID si no existe */}
                    </TableCell>
                    <TableCell>{order.customerName}</TableCell>
                    <TableCell>
                      <Badge
                        style={{ backgroundColor: `${channel.color}20`, color: channel.color }}
                        className="border-0"
                      >
                        <i className={`${channel.icon} mr-1`}></i>
                        {channel.code}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <span>{order.itemsCount} items</span>
                        {order.isCombo && (
                          <Badge variant="secondary" className="text-xs">
                            <i className="fas fa-box mr-1"></i>
                            Combo
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>${Number(order.totalAmount).toFixed(2)}</TableCell>
                    <TableCell>
                      {order.uiStatus === "GESTIONADA" && (
                        <Badge variant="default">Gestionada</Badge>
                      )}
                      {order.uiStatus === "SIN_GESTIONAR" && (
                        <Badge variant="destructive">Sin gestionar</Badge>
                      )}
                      {order.uiStatus === "ERROR" && (
                        <Badge variant="outline" className="border-red-500 text-red-600">Error</Badge>
                      )}
                    </TableCell>

                    <TableCell>
                      {new Date(order.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedOrder(order)}
                        >
                          <i className="fas fa-eye mr-1"></i>
                          Ver
                        </Button>
                        {!order.isManaged && (
                          <Button
                            size="sm"
                            onClick={() => updateOrderMutation.mutate({
                              orderId: order.id,
                              updates: { isManaged: true }
                            })}
                            disabled={updateOrderMutation.isPending}
                          >
                            <i className="fas fa-check mr-1"></i>
                            {/* Gestionar */}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant={order.status === 'DELETED' ? 'outline' : 'destructive'}
                          onClick={() => deleteOrderMutation.mutate({ orderId: order.id, deleted: order.status !== 'DELETED' })}
                          disabled={deleteOrderMutation.isPending}
                        >
                          {order.status === 'DELETED' ? (
                            <>
                              <i className="fas fa-undo mr-1"></i>
                              {/* Restaurar */}
                            </>
                          ) : (
                            <>
                              <i className="fas fa-trash mr-1"></i>
                              {/* Borrar */}
                            </>
                          )}
                        </Button>

                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {ordersResp && (
            <div className="flex items-center justify-between mt-4 text-sm">
              <div className="text-gray-600">
                Mostrando {(page - 1) * pageSize + 1}–
                {Math.min(page * pageSize, ordersResp.total)} de {ordersResp.total} pedidos
              </div>

              <div className="flex items-center space-x-4">
                {/* Selector de tamaño */}
                <div className="flex items-center space-x-2">
                  <label htmlFor="pageSize">Filas:</label>
                  <Select
                    value={String(pageSize)}
                    onValueChange={(v) => {
                      setPageSize(Number(v));
                      setPage(1); // Reset a página 1 al cambiar tamaño
                    }}
                  >
                    <SelectTrigger id="pageSize" className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15</SelectItem>
                      <SelectItem value="30">30</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Botones de paginación */}
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Anterior
                  </Button>
                  <span className="px-2">
                    Página {page} de {Math.ceil(ordersResp.total / pageSize)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const totalPages = Math.ceil(ordersResp.total / pageSize);
                      setPage((p) => Math.min(totalPages, p + 1));
                    }}
                    disabled={page >= Math.ceil(ordersResp.total / pageSize)}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            </div>
          )}

          {filteredOrders.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No se encontraron pedidos que coincidan con los filtros.</p>
            </div>
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
    </div>
  );
}
