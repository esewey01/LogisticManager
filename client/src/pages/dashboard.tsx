import React from "react";
import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RotateCcw } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { DashboardMetrics, NoteDTO } from "@shared/schema";

import {
  FaClipboardList,
  FaCheckCircle,
  FaExclamationTriangle,
  FaStore,
  FaChartPie,
} from 'react-icons/fa';

import { cn } from "@/lib/utils";

// ----------------------------------------------------------------
// UTILS: Fechas
// ----------------------------------------------------------------

type RangePreset = "semana" | "quincena" | "mes" | "Año";

function startOfWeekSunday(d: Date) {
  const dt = new Date(d);
  const day = dt.getDay();
  dt.setDate(dt.getDate() - day);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

function endOfDay(d: Date) {
  const e = new Date(d);
  e.setHours(23, 59, 59, 999);
  return e;
}

function getRange(preset: RangePreset) {
  const now = new Date();
  let from: Date, to: Date;

  if (preset === "semana") {
    from = startOfWeekSunday(now);
    to = endOfDay(now);
  } else if (preset === "quincena") {
    const y = now.getFullYear();
    const m = now.getMonth();
    const day = now.getDate();
    if (day <= 15) {
      from = new Date(y, m, 1);
      to = endOfDay(new Date(y, m, 15));
    } else {
      from = new Date(y, m, 16);
      to = endOfDay(new Date(y, m + 1, 0));
    }
  } else if (preset === "mes") {
    const y = now.getFullYear();
    const m = now.getMonth();
    from = new Date(y, m, 1);
    to = endOfDay(new Date(y, m + 1, 0));
  } else {
    const y = now.getFullYear();
    from = new Date(y, 0, 1);
    to = endOfDay(new Date(y, 11, 31));
  }
  return { from, to };
}

// ----------------------------------------------------------------
// COMPONENTE: MicroBar (barra de progreso pequeña)
// ----------------------------------------------------------------
function MicroBar({ value, max, className }: { value: number; max: number; className?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className={`h-2 bg-gray-200 rounded-full overflow-hidden ${className}`}>
      <div className="h-full bg-blue-600" style={{ width: `${pct}%` }} />
    </div>
  );
}

// ----------------------------------------------------------------
// COMPONENTE: StatCard (KPI)
// ----------------------------------------------------------------
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
    <Card className="hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 p-4">
        <div className={cn("p-2 rounded-full", color)}>{icon}</div>
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <div className="flex items-baseline gap-1">
            <p className="text-xl font-bold text-gray-900">{value}</p>
            {hint && <span className="text-sm text-gray-500">{hint}</span>}
          </div>
        </div>
      </div>
    </Card>
  );
}

// ----------------------------------------------------------------
// COMPONENTE: DateRangeSelector
// ----------------------------------------------------------------
function DateRangeSelector({
  preset,
  onPresetChange,
}: {
  preset: RangePreset;
  onPresetChange: (p: RangePreset) => void;
}) {
  return (
    <div className="flex rounded-md border overflow-hidden">
      {(["semana", "quincena", "mes", "Año"] as const).map((key) => (
        <button
          key={key}
          onClick={() => onPresetChange(key)}
          className={`px-3 py-1.5 text-sm transition-colors ${preset === key
            ? "bg-primary text-white"
            : "bg-white hover:bg-gray-50 text-gray-700"
            }`}
        >
          {key.charAt(0).toUpperCase() + key.slice(1)}
        </button>
      ))}
    </div>
  );
}

// ----------------------------------------------------------------
// COMPONENTE: NoteItemEditable
// ----------------------------------------------------------------
function NoteItemEditable({ note }: { note: NoteDTO & { createdAt?: string | Date } }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(note.text);
  const queryClient = useQueryClient();

  const handleSave = async () => {
    if (!text.trim()) return;
    await apiRequest("PUT", `/api/notes/${note.id}`, { text: text.trim() });
    setEditing(false);
    queryClient.invalidateQueries({ queryKey: ["notes"] });
  };

  const handleDelete = async () => {
    await apiRequest("DELETE", `/api/notes/${note.id}`);
    queryClient.invalidateQueries({ queryKey: ["notes"] });
  };

  const created = note.createdAt ? new Date(note.createdAt).toLocaleString() : null;

  return (
    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg relative group hover:shadow-sm transition-shadow">
      {editing ? (
        <div className="space-y-2">
          <Textarea value={text} onChange={(e) => setText(e.target.value)} className="min-h-16" />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSave}>
              Guardar
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-800 whitespace-pre-wrap">{note.text}</p>
          <div className="mt-2 flex items-center justify-between">
            {created && <span className="text-xs text-gray-500">Creada: {created}</span>}
            <Badge variant="secondary" className="text-xs">Nota</Badge>
          </div>
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>Editar</Button>
            <Button variant="ghost" size="sm" onClick={handleDelete}>×</Button>
          </div>
        </>
      )}
    </div>
  );
}

// ----------------------------------------------------------------
// COMPONENTE PRINCIPAL: Dashboard
// ----------------------------------------------------------------
export default function Dashboard() {
  const [preset, setPreset] = useState<RangePreset>("mes");
  const queryClient = useQueryClient();
  // Agregar estados para las fechas
  const { from, to } = useMemo(() => getRange(preset), [preset]);
  const fromISO = from.toISOString();
  const toISO = to.toISOString();



  // Métricas principales (rango)
  const { data: metrics, isLoading } = useQuery<DashboardMetrics>({
  queryKey: ["dashboard/metrics", fromISO, toISO],
  queryFn: () =>
    apiRequest("GET", `/api/dashboard/metrics?from=${encodeURIComponent(fromISO)}&to=${encodeURIComponent(toISO)}`).then((res) => res.json()),
  refetchInterval: 30000,
});

  // Órdenes de hoy
  const { data: todayOrders } = useQuery<{ count: number; totalAmount: number }>({
    queryKey: ["dashboard/today-orders"],
    queryFn: () =>
      apiRequest("GET", "/api/dashboard/today-orders").then((res) => res.json()),
    refetchInterval: 30000,
  });

  // Datos semanales
  const [weekOffset, setWeekOffset] = useState(0);
  const { data: weeklyData } = useQuery<Array<{ day: string; count: number }>>({
    queryKey: ["dashboard/orders-by-weekday", weekOffset],
    queryFn: () =>
      apiRequest("GET", `/api/dashboard/orders-by-weekday?week=${weekOffset}`).then((res) => res.json()),
    refetchInterval: 30000,
  });

  // Por canal
  const {
    data: channelData,
    isLoading: channelLoading,
    isError: channelError,
    error: channelErrorDetail,
  } = useQuery<
    Array<{ channelCode: string; channelName: string; orders: number }>
  >({
    queryKey: ["/api/dashboard/orders-by-channel", fromISO, toISO],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/dashboard/orders-by-channel?from=${encodeURIComponent(
          fromISO
        )}&to=${encodeURIComponent(toISO)}`
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text || "Request failed"}`);
      }
      return res.json();
    },
    refetchInterval: 30000,
    enabled: Boolean(fromISO && toISO),
  });

  // Top SKUs
  const { data: topSkusResp } = useQuery<{
    topSkus: Array<{ sku: string | null; totalQty: number; revenue: number }>
  }>({
    queryKey: ["dashboard/top-skus", fromISO, toISO],
    queryFn: () =>
      apiRequest("GET", `/api/dashboard/top-skus?from=${fromISO}&to=${toISO}&limit=5`).then((res) => res.json()),
    refetchInterval: 30000,
  });
  const topSkus = topSkusResp?.topSkus ?? [];

  // Notas (últimos 30 días)
  const { data: notesResp } = useQuery<{ notes: NoteDTO[] }>({
    queryKey: ["notes"],
    queryFn: () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return apiRequest(
        "GET",
        `/api/notes?from=${thirtyDaysAgo.toISOString()}&to=${new Date().toISOString()}`
      ).then((res) => res.json());
    },
  });
  const notes = notesResp?.notes ?? [];

  const [newNote, setNewNote] = useState("");

  const addNote = async () => {
    if (!newNote.trim()) return;
    await apiRequest("POST", "/api/notes", { text: newNote.trim() });
    setNewNote("");
    queryClient.invalidateQueries({ queryKey: ["notes"] });
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["notes"] });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-80">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const totalOrders = metrics?.totalOrders || 1;
  const managedPct = Math.round((metrics?.managed || 0) / totalOrders * 100);

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-600">
              Rango:{" "}
              <span className="font-medium">{from.toLocaleDateString()}</span> –{" "}
              <span className="font-medium">{to.toLocaleDateString()}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <DateRangeSelector preset={preset} onPresetChange={setPreset} />
            <Button variant="outline" size="sm" onClick={handleRefresh} title="Actualizar">
              <RotateCcw className="h-4 w-4 mr-2" /> Actualizar
            </Button>
          </div>
        </header>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<FaClipboardList className="text-blue-600" />}
            label="Órdenes (rango)"
            value={metrics?.totalOrders ?? 0}
          />
          <StatCard
            icon={<FaCheckCircle className="text-green-600" />}
            label="Gestionadas"
            value={metrics?.managed ?? 0}
            hint={`${managedPct}%`}
          />
          <StatCard
            icon={<FaExclamationTriangle className="text-yellow-600" />}
            label="Pendientes"
            value={metrics?.unmanaged ?? 0}
          />
          <StatCard
            icon={<FaStore className="text-purple-600" />}
            label="Canales Activos"
            value={metrics?.byChannel?.length || 0}
          />
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top SKUs */}
          <Card>
            <CardHeader>
              <CardTitle>Top 5 SKUs más vendidos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-0">
                {topSkus.length > 0 ? (
                  topSkus.map((s, idx) => {
                    const maxQty = Math.max(...topSkus.map((t) => t.totalQty), 1);
                    const pct = (s.totalQty / maxQty) * 100;
                    return (
                      <div key={idx} className="p-2 bg-gray-50 rounded-lg">
                        <div className="flex justify-between mb-1">
                          <span className="font-medium text-gray-800">{s.sku || "SIN SKU"}</span>

                          <p className="mt-1 text-xs text-gray-600">
                            Ingresos: ${s.revenue.toLocaleString()} MXN
                          </p>
                          <span className="text-gray-700">{s.totalQty} veces</span>
                        </div>
                        <MicroBar value={s.totalQty} max={maxQty} className="w-full h-2" />

                      </div>
                    );
                  })
                ) : (
                  <p className="text-gray-500 text-center py-4">Sin datos</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Órdenes por día */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Órdenes por día</CardTitle>
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
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {weeklyData?.length ? (
                  weeklyData.map((item) => {
                    const max = Math.max(...weeklyData.map((d) => d.count));
                    return (
                      <div key={item.day} className="flex items-center gap-3">
                        <span className="text-sm text-gray-700 w-20">{item.day}</span>
                        <div className="flex-1">
                          <MicroBar value={item.count} max={max} className="w-full" />
                        </div>
                        <span className="text-sm font-medium text-gray-900 w-10 text-right">
                          {item.count}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-gray-500 text-center">Cargando...</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Hoy + Canal */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Hoy */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Hoy
                <FaClipboardList className="text-blue-600" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg text-center">
                  <p className="text-sm text-gray-500">Cantidad</p>
                  <p className="text-2xl font-bold text-gray-900">{todayOrders?.count ?? 0}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg text-center">
                  <p className="text-sm text-gray-500">Total vendido</p>
                  <p className="text-2xl font-bold text-green-600">
                    ${(todayOrders?.totalAmount ?? 0).toLocaleString()} MXN
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Canal */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FaChartPie className="text-blue-600" />
                Órdenes por canal
              </CardTitle>
            </CardHeader>
            <CardContent>
              {channelLoading ? (
                <p className="text-gray-500 text-center py-2">Cargando...</p>
              ) : channelError ? (
                <p className="text-red-500 text-center py-2">
                  Error: {(channelErrorDetail as Error).message}
                </p>
              ) : Array.isArray(channelData) && channelData.length > 0 ? (
                <div className="space-y-0">
                  {channelData.map((item) => {
                    const max = Math.max(...channelData.map((c) => c.orders));
                    return (
                      <div key={item.channelCode} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex justify-between mb-1">
                          <span className="font-medium text-gray-800">{item.channelName}</span>
                          <span className="text-gray-700">{item.orders} en total</span>
                        </div>
                        <MicroBar value={item.orders} max={max} className="w-full h-2" />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-2">No hay datos</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Notas */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Notas</CardTitle>
            <Badge variant="secondary">Últimos 30 días</Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Textarea
                placeholder="Añadir una nota..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="min-h-12"
              />
              <div className="flex flex-wrap gap-1">
                {["Prioridad", "Cliente", "Stock", "Envios"].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() =>
                      setNewNote((prev) => (prev ? `${prev} #${tag}` : `#${tag}`))
                    }
                    className="text-xs px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 text-gray-700"
                  >
                    #{tag}
                  </button>
                ))}
              </div>
              <Button onClick={addNote} disabled={!newNote.trim()} size="sm">
                Agregar nota
              </Button>

              <Separator className="my-4" />

              <div className="max-h-60 overflow-y-auto space-y-2">
                {notes.slice(0, 10).map((note) => (
                  <NoteItemEditable key={note.id} note={note} />
                ))}
                {notes.length === 0 && (
                  <p className="text-gray-500 text-center py-2">Sin notas recientes</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}