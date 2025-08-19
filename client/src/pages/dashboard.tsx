import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import MetricCard from "@/components/MetricCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import OrdersChart from "@/components/charts/OrdersChart";
import type { DashboardMetrics, NoteDTO } from "@shared/schema";

export default function Dashboard() {
  const [newNote, setNewNote] = useState("");
  const queryClient = useQueryClient();

  const { data: metrics, isLoading: metricsLoading } = useQuery<DashboardMetrics>({
    queryKey: ["/api/dashboard/metrics"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/dashboard/metrics");
      return res.json();
    },
    refetchInterval: 30000,
  });

  const { data: notesResp } = useQuery<{ notes: NoteDTO[] }>({
    queryKey: ["/api/notes"],
    queryFn: async () => {
      const today = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(today.getDate() - 30);
      const res = await apiRequest(
        "GET",
        `/api/notes?from=${thirtyDaysAgo.toISOString()}&to=${today.toISOString()}`,
      );
      return res.json();
    },
  });
  const notes = notesResp?.notes ?? [];

  const addNoteMutation = useMutation({
    mutationFn: async (text: string) => {
      await apiRequest("POST", "/api/notes", { text });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      setNewNote("");
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/notes/${id}`);
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
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Resumen general del sistema de gestión logística</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <MetricCard title="Total de órdenes" value={metrics?.totalOrders ?? 0} />
        <MetricCard title="Gestionadas / Sin gestionar" value="">
          <div className="flex space-x-2 mt-1">
            <Badge variant="default">Gestionadas: {metrics?.managed ?? 0}</Badge>
            <Badge variant="destructive">Sin gestionar: {metrics?.unmanaged ?? 0}</Badge>
          </div>
        </MetricCard>
        <MetricCard
          title="Ventas totales"
          value={`$${(metrics?.totalSales ?? 0).toFixed(2)}`}
        />
      </div>

      {metrics?.byChannel?.length ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {metrics.byChannel.map((c) => (
            <MetricCard key={c.channelId} title={c.channelName} value={c.count} />
          ))}
        </div>
      ) : (
        <div className="mb-8 text-sm text-gray-500">No hay datos por canal.</div>
      )}

      {metrics?.byShop?.length ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {metrics.byShop.map((s) => (
            <MetricCard
              key={s.shopId}
              title={s.shopName ?? `Tienda ${s.shopId}`}
              value={s.count}
            />
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <OrdersChart />
        </div>
        <div className="space-y-6">
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
                  notes.map((note) => (
                    <div key={note.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-start justify-between">
                        <p className="text-sm text-gray-700 flex-1">{note.text}</p>
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
