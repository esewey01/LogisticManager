import React from 'react';
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import MetricCard from "@/components/MetricCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import OrdersChart from "@/components/charts/OrdersChart";
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
              <p className="text-sm font-medium text-gray-600">Canales</p>
              <p className="text-2xl font-bold text-gray-800">{metrics?.byChannel?.length ?? 0}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <Card className="p-6">
            <CardHeader className="p-0 mb-4">
              <CardTitle className="text-xl font-semibold text-gray-800 flex items-center">
                <FaChartPie className="mr-2" /> Distribución por Canal
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
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
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200 text-sm text-gray-500">
                <strong>Total:</strong> {metrics?.totalOrders ?? 0} órdenes distribuidas
              </div>
            </CardContent>
          </Card>

          <Card className="p-6">
            <CardHeader className="p-0 mb-4">
              <CardTitle className="text-xl font-semibold text-gray-800 flex items-center">
                <FaStickyNote className="mr-2" /> Mis Notas
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-3">
                {notes.length > 0 ? (
                  notes.map((note: NoteDTO) => (
                    <div
                      key={note.id}
                      className="text-sm text-gray-700 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded"
                    >
                      <div className="flex justify-between items-start">
                        <p>{note.text}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => deleteNoteMutation.mutate(note.id)}
                        >
                          ×
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(note.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 italic">No hay notas por ahora.</p>
                )}
              </div>
              <div className="mt-4 flex gap-2">
                <Textarea
                  placeholder="Escribe una nueva nota..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={handleAddNote}
                  disabled={!newNote.trim() || addNoteMutation.isPending}
                >
                  Agregar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="p-6 mb-8">
          <CardHeader className="p-0 mb-4">
            <CardTitle className="text-xl font-semibold text-gray-800">
              Progreso de Gestión
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
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
          </CardContent>
        </Card>

        {/* Añadir Calendario */}
        <div className="mb-8">
          <Calendar />
        </div>

        <Card className="p-6">
          <CardHeader className="p-0 mb-4">
            <CardTitle className="text-xl font-semibold text-gray-800">
              Gráfico de Órdenes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <OrdersChart />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}