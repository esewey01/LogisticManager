import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import OrderDetailsModalNew from "@/components/modals/OrderDetailsModalNew";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Row = {
  id: number;
  name: string | null;
  orderNumber: string | null;
  customerName: string | null;
  customerEmail: string | null;
  totalAmount: number | null;
  fulfillmentStatus: string | null;
  createdAt: string;
};

export default function MarketplacesPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [subOrderId, setSubOrderId] = useState<number | null>(null);
  const [subForm, setSubForm] = useState({ source: "amazon", url: "", title: "", external_ref: "", quantity: 1, unit_cost: "", proposed_price: "", notes: "" });
  const [subsForOrder, setSubsForOrder] = useState<{ [k: number]: any[] }>({});

  const { data, isLoading, refetch } = useQuery<{ rows: Row[]; total: number; page: number; pageSize: number }>({
    queryKey: ["/api/marketplaces", { page, pageSize }],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      const res = await apiRequest("GET", `/api/marketplaces?${params}`);
      return res.json();
    },
    refetchInterval: 30000,
  });

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Marketplaces</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Fulfillment</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Cargando…</TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Sin pendientes de marketplace</TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.id}</TableCell>
                    <TableCell>{r.name || r.orderNumber || "-"}</TableCell>
                    <TableCell>{r.customerName || "-"}</TableCell>
                    <TableCell>{r.customerEmail || "-"}</TableCell>
                    <TableCell>{r.totalAmount != null ? `$${Number(r.totalAmount).toFixed(2)}` : "-"}</TableCell>
                    <TableCell>{r.fulfillmentStatus || "-"}</TableCell>
                    <TableCell>{new Date(r.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedOrderId(r.id)}>Ver</Button>
                      <Button variant="outline" size="sm" onClick={() => { setSubOrderId(r.id); setSubForm({ source: "amazon", url: "", title: "", external_ref: "", quantity: 1, unit_cost: "", proposed_price: "", notes: "" }); }}>Sustituto</Button>
                      <Button variant="ghost" size="sm" onClick={async () => { await apiRequest('POST', `/api/orders/${r.id}/mark-pending`); refetch(); }}>Regresar a pending</Button>
                      <Button variant="ghost" size="sm" onClick={async () => { const res = await apiRequest('GET', `/api/orders/${r.id}/substitutions`); const s = await res.json(); setSubsForOrder((prev) => ({ ...prev, [r.id]: s })); }}>Ver sustituciones</Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {/* Panel de sustituciones para order seleccionada */}
          {Object.keys(subsForOrder).length > 0 && (
            <div className="p-3">
              {rows.map((r) => (
                subsForOrder[r.id] && (
                  <Card key={r.id} className="mb-3">
                    <CardHeader><CardTitle className="text-sm">Sustituciones · Orden {r.id}</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                      {(subsForOrder[r.id] || []).map((s: any) => (
                        <div key={s.id} className="flex items-center justify-between border rounded p-2 text-sm">
                          <div className="min-w-0">
                            <div className="font-medium truncate">{s.title || s.url}</div>
                            <div className="text-xs text-muted-foreground">{s.source} · Qty {s.quantity} · Costo ${Number(s.unit_cost || 0).toFixed(2)} · Precio ${Number(s.proposed_price || 0).toFixed(2)} · Estado: {s.status}</div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                await apiRequest("POST", `/api/marketplace-substitutions/${s.id}/approve`);
                                const res = await apiRequest("GET", `/api/orders/${r.id}/substitutions`);
                                const list = await res.json();
                                setSubsForOrder((p) => ({ ...p, [r.id]: list }));
                              }}
                            >
                              Aprobar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                await apiRequest("POST", `/api/marketplace-substitutions/${s.id}/reject`);
                                const res = await apiRequest("GET", `/api/orders/${r.id}/substitutions`);
                                const list = await res.json();
                                setSubsForOrder((p) => ({ ...p, [r.id]: list }));
                              }}
                            >
                              Rechazar
                            </Button>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )
              ))}
            </div>
          )}
          {/* Paginación simple */}
          <div className="flex items-center justify-between p-3">
            <div className="text-sm text-muted-foreground">Total: {total} · Página {page} / {totalPages}</div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}>Anterior</Button>
              <Button variant="outline" size="sm" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}>Siguiente</Button>
            </div>
          </div>
        </CardContent>
      </Card>
      {selectedOrderId != null && (
        <OrderDetailsModalNew orderId={selectedOrderId} isOpen={selectedOrderId != null} onClose={() => setSelectedOrderId(null)} />
      )}
      {/* Modal de sustituto */}
      <Dialog open={subOrderId != null} onOpenChange={(o) => { if (!o) setSubOrderId(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nueva sustitución</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <Label>Origen</Label>
              <Select value={subForm.source} onValueChange={(v) => setSubForm((f) => ({ ...f, source: v }))}>
                <SelectTrigger aria-label="Origen de sustitución"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="amazon">Amazon</SelectItem>
                  <SelectItem value="ml">Mercado Libre</SelectItem>
                  <SelectItem value="kliena">Kliena</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>URL</Label>
              <Input value={subForm.url} onChange={(e) => setSubForm((f) => ({ ...f, url: e.target.value }))} placeholder="https://..." />
            </div>
            <div className="md:col-span-2">
              <Label>Título</Label>
              <Input value={subForm.title} onChange={(e) => setSubForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <Label>Ref externa</Label>
              <Input value={subForm.external_ref} onChange={(e) => setSubForm((f) => ({ ...f, external_ref: e.target.value }))} placeholder="ASIN/ML-ID" />
            </div>
            <div>
              <Label>Cantidad</Label>
              <Input type="number" inputMode="numeric" value={subForm.quantity} onChange={(e) => setSubForm((f) => ({ ...f, quantity: Number(e.target.value || 1) }))} />
            </div>
            <div>
              <Label>Costo unitario</Label>
              <Input type="number" step="0.01" inputMode="decimal" value={subForm.unit_cost} onChange={(e) => setSubForm((f) => ({ ...f, unit_cost: e.target.value }))} />
            </div>
            <div>
              <Label>Precio propuesto</Label>
              <Input type="number" step="0.01" inputMode="decimal" value={subForm.proposed_price} onChange={(e) => setSubForm((f) => ({ ...f, proposed_price: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <Label>Notas</Label>
              <Input value={subForm.notes} onChange={(e) => setSubForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Notas..." />
            </div>
          </div>
          <div className="flex items-center justify-between mt-2">
            {(() => {
              const m = Number(subForm.proposed_price || 0) - Number(subForm.unit_cost || 0);
              const bad = !Number.isFinite(m) || m <= 0;
              return (
                <span className={`text-xs px-2 py-0.5 rounded ${bad ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  Margen: ${Number.isFinite(m) ? m.toFixed(2) : '0.00'}
                </span>
              );
            })()}
            <Button
              onClick={async () => {
                if (!subOrderId) return;
                const payload = {
                  source: subForm.source,
                  url: subForm.url,
                  title: subForm.title || undefined,
                  external_ref: subForm.external_ref || undefined,
                  unit_cost: Number(subForm.unit_cost),
                  proposed_price: Number(subForm.proposed_price),
                  quantity: Number(subForm.quantity || 1),
                  notes: subForm.notes || undefined,
                };
                await apiRequest('POST', `/api/orders/${subOrderId}/substitutions`, payload);
                setSubOrderId(null);
              }}
            >
              Guardar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
