import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";


import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";





import { apiRequest } from "@/lib/queryClient";
import OrderDetailsModal from "@/components/modals/OrderDetailsModal";

export default function Pedidos() {
  const [search, setSearch] = useState("");
  const [channelFilter, setChannelFilter] = useState("all");
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["/api/orders"],
  });

  const { data: channels = [] } = useQuery({
    queryKey: ["/api/channels"],
  });



  const updateOrderMutation = useMutation({
    mutationFn: async ({ orderId, updates }: { orderId: string; updates: any }) => {
      await apiRequest("PATCH", `/api/orders/${orderId}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
    },
  });

  const filteredOrders = orders.filter((order: any) => {
    const matchesSearch = 
      order.customerName.toLowerCase().includes(search.toLowerCase()) ||
      order.externalId?.toLowerCase().includes(search.toLowerCase()) ||
      JSON.stringify(order.products).toLowerCase().includes(search.toLowerCase());
    
    const matchesChannel = channelFilter === "all" || order.channelId === channelFilter;
    
    return matchesSearch && matchesChannel;
  });

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

  const getChannelInfo = (channelId: string) => {
    const channel = channels.find((c: any) => c.id === channelId);
    return channel || { code: "N/A", name: "Desconocido", color: "#6B7280", icon: "fas fa-circle" };
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
            Pedidos ({filteredOrders.length})
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
                <TableHead>ID</TableHead>
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
                  <TableRow key={order.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedOrders.includes(order.id)}
                        onCheckedChange={(checked) => handleSelectOrder(order.id, checked as boolean)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {order.externalId || (order.orderId ? String(order.orderId).slice(-6) : String(order.id).slice(-6))}
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
                        <span>{products.length} items</span>
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
                      <Badge variant={order.isManaged ? "default" : "destructive"}>
                        {order.isManaged ? "Gestionado" : "Sin gestionar"}
                      </Badge>
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
                            Gestionar
                          </Button>
                        )}
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
