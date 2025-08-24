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
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { RotateCcw } from "lucide-react"; // ya lo usas
import { cn } from "@/lib/utils"; // si no lo tienes, quita cn() y usa clases directas


// Tarjeta de KPI compacta
function StatCard({
  icon,
  label,
  value,
  hint,
  color = "bg-blue-100 text-blue-600",
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  color?: string;
}) {
  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 flex items-center gap-3 hover:shadow-sm transition-shadow">
      <div className={cn("p-2 rounded-full shrink-0", color)}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500 truncate">{label}</p>
        <div className="flex items-baseline gap-2">
          <p className="text-xl font-semibold text-gray-900">{value}</p>
          {hint && <span className="text-xs text-gray-500">{hint}</span>}
        </div>
      </div>
    </div>
  );
}

// Barra micro para conteos (sparkbar simple)
// This is your corrected MicroBar component file
function MicroBar({ value, max, className }: { value: number; max: number; className?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    // Combine the new 'className' prop with the existing styles
    <div className={`h-2 bg-gray-200 rounded-full overflow-hidden ${className}`}>
      <div className="h-2 bg-gray-900/80" style={{ width: `${pct}%` }} />
    </div>
  );
}

// Ítem de nota
function NoteItem({
  note,
  onDelete,
}: {
  note: { id: number; text: string; createdAt?: string | Date };
  onDelete: (id: number) => void;
}) {
  const created =
    note?.createdAt ? new Date(note.createdAt).toLocaleString() : null;
  return (
    <div className="group relative p-3 bg-amber-50 border border-amber-200 rounded">
      <p className="text-sm text-gray-800 pr-6 whitespace-pre-wrap">{note.text}</p>
      <div className="mt-1 flex items-center gap-2">
        {created && (
          <span className="text-[11px] text-gray-500">Creada: {created}</span>
        )}
        <Badge variant="secondary" className="h-5 text-[10px]">Nota</Badge>
      </div>
      <button
        aria-label="Eliminar"
        onClick={() => onDelete(note.id)}
        className="absolute top-2 right-2 h-6 w-6 rounded hover:bg-amber-100 text-gray-600"
      >
        ×
      </button>
    </div>
  );
}


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
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header compacto */}
        <header className="mb-4 sm:mb-6 flex items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-600">Resumen de órdenes y canal</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // fuerza refetch de lo clave
              queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
              queryClient.invalidateQueries({ queryKey: ["/api/dashboard/today-orders"] });
              queryClient.invalidateQueries({ queryKey: ["/api/dashboard/orders-by-weekday"] });
              queryClient.invalidateQueries({ queryKey: ["/api/dashboard/orders-by-channel"] });
              queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
            }}
            title="Actualizar"
          >
            <RotateCcw className="h-4 w-4 mr-2" /> Actualizar
          </Button>
        </header>

        {/* KPIs en grid auto-fit (denso) */}
        <section className="mb-6">
          <div className="grid gap-3 sm:gap-4"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            <StatCard
              icon={<FaClipboardList className="text-blue-600" />}
              label="Órdenes del Mes"
              value={metrics?.totalOrders ?? 0}
              color="bg-blue-100"
            />
            <StatCard
              icon={<FaCheckCircle className="text-green-600" />}
              label="Gestionadas"
              value={metrics?.managed ?? 0}
              hint={
                metrics && metrics.totalOrders > 0
                  ? `${Math.round((metrics.managed / metrics.totalOrders) * 100)}%`
                  : "0%"
              }
              color="bg-green-100"
            />
            <StatCard
              icon={<FaExclamationTriangle className="text-yellow-600" />}
              label="Pendientes"
              value={metrics?.unmanaged ?? 0}
              color="bg-yellow-100"
            />
            <StatCard
              icon={<FaStore className="text-purple-600" />}
              label="Canales Activos"
              value={metrics?.byChannel?.length ?? 0}
              color="bg-purple-100"
            />
          </div>
        </section>

        {/* Dos columnas: Hoy + Por día (micro-barras) */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
          {/* Órdenes del día */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-gray-900">Hoy</h3>
              <FaClipboardList className="text-blue-600" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded bg-gray-50">
                <p className="text-xs text-gray-500">Cantidad</p>
                <p className="text-xl font-semibold text-gray-900">
                  {todayOrders?.count ?? 0}
                </p>
              </div>
              <div className="p-3 rounded bg-gray-50">
                <p className="text-xs text-gray-500">Total vendido</p>
                <p className="text-xl font-semibold text-green-600">
                  ${(todayOrders?.totalAmount ?? 0).toLocaleString()} MXN
                </p>
              </div>
            </div>
          </div>

          {/* Órdenes por día (semana) */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-secmibold text-gray-900">Órdenes por día</h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setWeekOffset((prev) => prev + 1)}
                  disabled={!weeklyData}
                >
                  ← Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setWeekOffset((prev) => Math.max(0, prev - 1))}
                  disabled={weekOffset === 0}
                >
                  Siguiente →
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              {weeklyData?.length ? (
                weeklyData.map((item) => (
                  <div key={item.day} className="flex items-center justify-between gap-3">
                    <span className="text-sm text-gray-700 w-24">{item.day}</span>
                    {/* Use flex-1 on the container, and also give the MicroBar a full width */}
                    <div className="flex-1">
                      <MicroBar
                        value={item.count}
                        max={Math.max(...weeklyData.map((d) => d.count))}
                        className="w-full"
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-10 text-right">
                      {item.count}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-sm text-gray-500 text-center">Cargando...</div>
              )}
            </div>
          </div>
        </section>

        {/* Dos columnas: Canal + Resumen estados */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
          {/* Órdenes por Canal (lista con barra de progreso) */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center">
              <FaChartPie className="mr-2 text-blue-600" /> Órdenes por canal
            </h3>
            {Array.isArray(channelData) && channelData.length > 0 ? (
              <div className="space-y-2">
                {channelData.map((item) => {
                  const max = Math.max(...channelData.map(c => c.orders));
                  const pct = max ? Math.round((item.orders / max) * 100) : 0;
                  return (
                    <div key={item.channelCode} className="p-3 rounded bg-gray-50">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-800">{item.channelName}</span>
                        <span className="text-sm text-gray-700">{item.orders} órdenes</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-2 bg-blue-600" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-gray-500 text-center">Cargando datos...</div>
            )}
          </div>

          {/* Resumen de estados + Progreso */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-base font-semibold text-gray-900 mb-3">Resumen de estados</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded">
                <div className="flex items-center gap-2">
                  <FaCheckCircle className="text-green-600" />
                  <span className="text-sm text-gray-800">Gestionadas</span>
                </div>
                <span className="font-semibold text-green-700">{metrics?.managed ?? 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded">
                <div className="flex items-center gap-2">
                  <FaExclamationTriangle className="text-yellow-600" />
                  <span className="text-sm text-gray-800">Sin gestionar</span>
                </div>
                <span className="font-semibold text-yellow-700">{metrics?.unmanaged ?? 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-red-50 rounded">
                <div className="flex items-center gap-2">
                  <RotateCcw className="text-red-600" />
                  <span className="text-sm text-gray-800">Canceladas/Restock</span>
                </div>
                <span className="font-semibold text-red-700">{cancelledData?.count ?? 0}</span>
              </div>
            </div>

            <Separator className="my-4" />

            {/* Progreso global */}
            <div>
              <p className="text-sm text-gray-700 mb-2">Progreso de gestión</p>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-green-600 h-3 rounded-full transition-all"
                  style={{
                    width: `${metrics && metrics.totalOrders > 0
                      ? (metrics.managed / metrics.totalOrders) * 100
                      : 0
                      }%`,
                  }}
                />
              </div>
              <div className="flex justify-between mt-1 text-xs text-gray-600">
                <span>
                  ✅ {metrics?.managed ?? 0} (
                  {metrics && metrics.totalOrders > 0
                    ? Math.round((metrics.managed / metrics.totalOrders) * 100)
                    : 0}
                  %)
                </span>
                <span>⚠️ {metrics?.unmanaged ?? 0}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Notas + Calendario (denso) */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-8">
          {/* Notas rápidas (rediseño compacto) */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-gray-900">Notas</h3>
              <div className="flex gap-2">
                <Badge variant="secondary" className="hidden sm:inline">Últimos 30 días</Badge>
              </div>
            </div>

            <div className="space-y-2">
              <Textarea
                placeholder="Agregar nota…"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="min-h-[60px]"
              />
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-2">
                  {["Prioridad", "Cliente", "Stock", "Envios"].map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setNewNote(prev => (prev ? `${prev} #${t}` : `#${t}`))}
                      className="text-xs px-2 py-1 rounded border border-gray-200 hover:bg-gray-50"
                    >
                      #{t}
                    </button>
                  ))}
                </div>
                <Button
                  onClick={() => newNote.trim() && addNoteMutation.mutate(newNote.trim())}
                  disabled={!newNote.trim() || addNoteMutation.isPending}
                  size="sm"
                >
                  {addNoteMutation.isPending ? "Guardando…" : "Agregar"}
                </Button>
              </div>

              {/* Lista densa de notas */}
              {notes?.length ? (
                <div className="mt-3 max-h-56 overflow-auto space-y-2 pr-1">
                  {notes.slice(0, 10).map((n: any) => (
                    <NoteItem
                      key={n.id}
                      note={n}
                      onDelete={(id) => deleteNoteMutation.mutate(id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500">Sin notas recientes.</div>
              )}
            </div>
          </div>

          {/* Calendario (contenedor compacto) */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-base font-semibold text-gray-900 mb-3">Calendario</h3>
            <div className="rounded border border-dashed">
              <Calendar />
            </div>
          </div>
        </section>
      </div>
    </div>
  );

}