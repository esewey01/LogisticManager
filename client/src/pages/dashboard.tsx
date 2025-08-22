import React from 'react';
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import Calendar from "@/components/Calendar";
import type { DashboardMetrics, NoteDTO } from "@shared/schema";
import {
  FaClipboardList,
  FaCheckCircle,
  FaExclamationTriangle,
  FaStore,
  FaChartPie,
  FaStickyNote,
} from 'react-icons/fa';

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

  const { data: todayOrders } = useQuery<{ count: number; totalAmount: number }>({
    queryKey: ["/api/dashboard/today-orders"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/dashboard/today-orders");
      return res.json();
    },
    refetchInterval: 30000,
  });

  const [weekOffset, setWeekOffset] = useState(0);
  const { data: weeklyData } = useQuery<Array<{ day: string; count: number }>>({
    queryKey: ["/api/dashboard/orders-by-weekday", weekOffset],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/dashboard/orders-by-weekday?week=${weekOffset}`);
      return res.json();
    },
    refetchInterval: 30000,
  });


  // Quitamos el gráfico de ventas según las instrucciones del usuario
  const { data: channelData } = useQuery<Array<{ channelCode: string; channelName: string; orders: number }>>({
    queryKey: ["/api/dashboard/orders-by-channel"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/dashboard/orders-by-channel");
      return res.json();
    },
    refetchInterval: 30000,
  });

  const { data: cancelledData } = useQuery<{ count: number; percentage: number }>({
    queryKey: ["/api/dashboard/cancelled-orders"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/dashboard/cancelled-orders");
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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Dashboard de Órdenes</h1>
          <p className="text-gray-600 mt-1">Resumen de órdenes, canales y tareas</p>
        </header>

        {/* Métricas principales */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex items-center space-x-4 hover:shadow-md transition-shadow">
            <div className="p-3 bg-blue-100 rounded-full">
              <FaClipboardList className="text-blue-600 text-2xl" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Órdenes Totales</p>
              <p className="text-2xl font-bold text-gray-800">{metrics?.totalOrders ?? 0}</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex items-center space-x-4 hover:shadow-md transition-shadow">
            <div className="p-3 bg-green-100 rounded-full">
              <FaCheckCircle className="text-green-600 text-2xl" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Gestionadas</p>
              <p className="text-2xl font-bold text-gray-800">{metrics?.managed ?? 0}</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex items-center space-x-4 hover:shadow-md transition-shadow">
            <div className="p-3 bg-yellow-100 rounded-full">
              <FaExclamationTriangle className="text-yellow-600 text-2xl" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Pendientes</p>
              <p className="text-2xl font-bold text-gray-800">{metrics?.unmanaged ?? 0}</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex items-center space-x-4 hover:shadow-md transition-shadow">
            <div className="p-3 bg-purple-100 rounded-full">
              <FaStore className="text-purple-600 text-2xl" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Canales Activos</p>
              <p className="text-2xl font-bold text-gray-800">{metrics?.activeChannels ?? 0}</p>
            </div>
          </div>
        </div>

        {/* Nueva sección para órdenes del día */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Órdenes del Día</h3>
              <div className="p-2 bg-blue-100 rounded-full">
                <FaClipboardList className="text-blue-600 text-lg" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Cantidad:</span>
                <span className="text-xl font-bold text-blue-600">{todayOrders?.count || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total vendido:</span>
                <span className="text-xl font-bold text-green-600">
                  ${(todayOrders?.totalAmount || 0).toLocaleString()} MXN
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Órdenes por Día</h3>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setWeekOffset(prev => prev + 1)}
                  disabled={!weeklyData}
                  data-testid="button-previous-week"
                >
                  ← Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setWeekOffset(prev => Math.max(0, prev - 1))}
                  disabled={weekOffset === 0}
                  data-testid="button-next-week"
                >
                  Siguiente →
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              {weeklyData?.map((item) => (
                <div key={item.day} className="flex justify-between items-center">
                  <span className="text-gray-600">{item.day}:</span>
                  <span className="font-semibold text-gray-800">{item.count}</span>
                </div>
              ))}
              {!weeklyData && <div className="text-center text-gray-500">Cargando...</div>}
            </div>
          </div>
        </div>

        {/* Gráficos de análisis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Gráfico de órdenes por canal */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <FaChartPie className="mr-2 text-blue-600" />
              Órdenes por Canal de Venta
            </h3>
            {channelData && channelData.length > 0 ? (
              <div className="space-y-3">
                {channelData.map((item, index) => (
                  <div key={item.channelCode} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <div className="flex items-center">
                      <div 
                        className="w-4 h-4 rounded mr-3"
                        style={{ 
                          backgroundColor: index === 0 ? '#3B82F6' : index === 1 ? '#10B981' : '#F59E0B'
                        }}
                      ></div>
                      <span className="font-medium text-gray-700">{item.channelName}</span>
                    </div>
                    <span className="font-bold text-gray-800">{item.orders} órdenes</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500">Cargando datos de canales...</div>
            )}
          </div>

          {/* Estadísticas adicionales */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Resumen de Estados</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-green-50 rounded">
                <div className="flex items-center">
                  <FaCheckCircle className="text-green-600 mr-3" />
                  <span className="text-gray-700">Gestionadas</span>
                </div>
                <span className="font-bold text-green-600">{metrics?.managed || 0}</span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-yellow-50 rounded">
                <div className="flex items-center">
                  <FaExclamationTriangle className="text-yellow-600 mr-3" />
                  <span className="text-gray-700">Sin Gestionar</span>
                </div>
                <span className="font-bold text-yellow-600">{metrics?.unmanaged || 0}</span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-red-50 rounded">
                <div className="flex items-center">
                  <RotateCcw className="text-red-600 mr-3" />
                  <span className="text-gray-700">Canceladas/Restock</span>
                </div>
                <span className="font-bold text-red-600">{cancelledData?.count || 0}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Notas rápidas */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Notas Rápidas</h3>
              <div className="p-2 bg-yellow-100 rounded-full">
                <FaStickyNote className="text-yellow-600 text-lg" />
              </div>
            </div>
            <div className="space-y-3">
              <Textarea
                placeholder="Agregar nota rápida..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="min-h-[80px]"
                data-testid="textarea-new-note"
              />
              <Button
                onClick={handleAddNote}
                disabled={!newNote.trim() || addNoteMutation.isPending}
                className="w-full"
                data-testid="button-add-note"
              >
                {addNoteMutation.isPending ? "Guardando..." : "Agregar Nota"}
              </Button>
              {notes.length > 0 && (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {notes.slice(0, 3).map((note: NoteDTO) => (
                    <div
                      key={note.id}
                      className="text-sm p-3 bg-yellow-50 border border-yellow-200 rounded flex justify-between items-start"
                    >
                      <p className="flex-1">{note.text}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 ml-2"
                        onClick={() => deleteNoteMutation.mutate(note.id)}
                        data-testid={`button-delete-note-${note.id}`}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Distribución por Canal */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Distribución por Canal</h3>
              <div className="p-2 bg-purple-100 rounded-full">
                <FaChartPie className="text-purple-600 text-lg" />
              </div>
            </div>
            <div className="space-y-4">
              {metrics?.byChannel?.map((c: any) => (
                <div key={c.channelId} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div className="flex items-center space-x-3">
                    <span className="block w-4 h-4 rounded-full bg-indigo-500"></span>
                    <span className="text-sm font-medium text-gray-700">{c.channelName}</span>
                  </div>
                  <span className="text-sm text-gray-600 font-semibold">{c.count} órdenes</span>
                </div>
              ))}
              <div className="mt-4 pt-4 border-t border-gray-200 text-sm text-gray-500">
                <strong>Total:</strong> {metrics?.totalOrders ?? 0} órdenes distribuidas
              </div>
            </div>
          </div>
        </div>

        {/* Progreso de Gestión */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Progreso de Gestión</h3>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div
              className="bg-green-500 h-4 rounded-full transition-all duration-500"
              style={{
                width: `${metrics && metrics.totalOrders > 0
                  ? (metrics.managed / metrics.totalOrders) * 100
                  : 0}%`
              }}
            ></div>
          </div>
          <div className="flex justify-between mt-2 text-sm text-gray-600">
            <span>
              ✅ {metrics?.managed ?? 0} gestionadas (
              {metrics && metrics.totalOrders > 0
                ? Math.round((metrics.managed / metrics.totalOrders) * 100)
                : 0}%)
            </span>
            <span>
              ⚠️ {metrics?.unmanaged ?? 0} pendientes
            </span>
          </div>
        </div>

        {/* Calendario */}
        <div className="mb-8">
          <Calendar />
        </div>
      </div>
    </div>
  );
}