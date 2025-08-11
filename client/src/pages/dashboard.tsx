import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import OrdersChart from "@/components/charts/OrdersChart";

export default function Dashboard() {
  const [newNote, setNewNote] = useState("");
  const queryClient = useQueryClient();

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["/api/dashboard/metrics"],
    refetchInterval: 30000,
  });

  const { data: notes = [] } = useQuery({
    queryKey: ["/api/notes"],
  });

  const addNoteMutation = useMutation({
    mutationFn: async (content: string) => {
      await apiRequest("POST", "/api/notes", { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      setNewNote("");
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      await apiRequest("DELETE", `/api/notes/${noteId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
    },
  });

  const handleAddNote = () => {
    if (newNote.trim()) {
      addNoteMutation.mutate(newNote.trim());
    }
  };

  if (metricsLoading) {
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
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Resumen general del sistema de gestión logística</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Órdenes</p>
                <p className="text-3xl font-bold text-gray-900">{metrics?.totalOrders || 0}</p>
                <p className="text-sm text-success">Sistema en línea</p>
              </div>
              <div className="w-12 h-12 bg-primary bg-opacity-10 rounded-lg flex items-center justify-center">
                <i className="fas fa-shopping-bag text-primary text-xl"></i>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Sin Gestionar</p>
                <p className="text-3xl font-bold text-error">{metrics?.unmanaged || 0}</p>
                <p className="text-sm text-gray-500">Requieren atención</p>
              </div>
              <div className="w-12 h-12 bg-error bg-opacity-10 rounded-lg flex items-center justify-center">
                <i className="fas fa-exclamation-triangle text-error text-xl"></i>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Ventas Totales</p>
                <p className="text-3xl font-bold text-gray-900">
                  ${Number(metrics?.totalSales || 0).toLocaleString()}
                </p>
                <p className="text-sm text-success">Operativo</p>
              </div>
              <div className="w-12 h-12 bg-success bg-opacity-10 rounded-lg flex items-center justify-center">
                <i className="fas fa-dollar-sign text-success text-xl"></i>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">En PREVIO</p>
                <p className="text-3xl font-bold text-warning">{metrics?.delayed || 0}</p>
                <p className="text-sm text-gray-500">Órdenes retrasadas</p>
              </div>
              <div className="w-12 h-12 bg-warning bg-opacity-10 rounded-lg flex items-center justify-center">
                <i className="fas fa-clock text-warning text-xl"></i>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Channel Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {metrics?.channelStats?.map((channel) => (
          <Card key={channel.channelId}>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div 
                  className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${getChannelColor(channel.channelCode)}20` }}
                >
                  <i 
                    className={`${getChannelIcon(channel.channelCode)} text-xl`}
                    style={{ color: getChannelColor(channel.channelCode) }}
                  ></i>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{channel.channelName}</h3>
                  <p className="text-sm text-gray-600">Canal {channel.channelCode}</p>
                  <div className="flex items-center space-x-4 mt-2">
                    <span className="text-lg font-bold text-gray-900">{channel.orders}</span>
                    <span className="text-sm text-gray-500">órdenes</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Orders Chart */}
        <div className="lg:col-span-2">
          <OrdersChart />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Quick Notes */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Notas Rápidas</CardTitle>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={handleAddNote}
                  disabled={!newNote.trim() || addNoteMutation.isPending}
                >
                  <i className="fas fa-plus mr-2"></i>
                  Agregar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Textarea
                  placeholder="Escribe una nota rápida..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>

              <div className="space-y-3">
                {notes.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No hay notas. Agrega una nueva nota arriba.
                  </p>
                ) : (
                  notes.map((note: any) => (
                    <div key={note.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-start justify-between">
                        <p className="text-sm text-gray-700 flex-1">{note.content}</p>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="ml-2 p-1 h-auto"
                          onClick={() => deleteNoteMutation.mutate(note.id)}
                          disabled={deleteNoteMutation.isPending}
                        >
                          <i className="fas fa-times text-gray-400 text-xs"></i>
                        </Button>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(note.createdAt).toLocaleString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function getChannelColor(code: string): string {
  switch (code) {
    case "WW": return "#4CAF50";
    case "CT": return "#FF9800";
    case "MGL": return "#2196F3";
    default: return "#6B7280";
  }
}

function getChannelIcon(code: string): string {
  switch (code) {
    case "WW": return "fas fa-globe";
    case "CT": return "fas fa-store";
    case "MGL": return "fas fa-shopping-cart";
    default: return "fas fa-circle";
  }
}
