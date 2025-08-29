import React, { useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQueryClient } from "@tanstack/react-query";

type Mode = "A" | "B";

type ImportOrdersModalProps = {
  open: boolean;
  onClose: () => void;
};

type ImportSummary = {
  processed: number;
  ok: number;
  skipped: number;
  errors: Array<{ rowIndex: number; message?: string; field?: string; value?: unknown }> | number;
};

const MAX_BYTES = 10 * 1024 * 1024;

export default function ImportOrdersModal({ open, onClose }: ImportOrdersModalProps) {
  const qc = useQueryClient();
  const [mode, setMode] = useState<Mode>("A");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "validating" | "uploading" | "processing" | "done">("idle");
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  const requiredCols = useMemo(() => mode === "A"
    ? ["shopId", "orderId", "items"]
    : ["shopId", "orderId", "sku", "quantity"], [mode]);

  const onFileChange = async (f: File | null) => {
    setFile(f);
    setError(null);
    setSummary(null);
    if (!f) return;
    if (f.size > MAX_BYTES) {
      setError("El archivo excede 10 MB");
      return;
    }
    setStatus("validating");
    try {
      const name = f.name.toLowerCase();
      if (!(name.endsWith(".csv") || name.endsWith(".xlsx") || name.endsWith(".xls"))) {
        setError("Tipo de archivo no soportado. Sube CSV o Excel (.xlsx/.xls). ");
        setStatus("idle");
        return;
      }
      const headers = await readHeaders(f);
      const missing = requiredCols.filter(c => !headers.includes(c));
      if (missing.length) {
        setError(`Faltan columnas: ${missing.join(", ")}`);
        setStatus("idle");
        return;
      }
      setStatus("idle");
    } catch (e: any) {
      setStatus("idle");
      setError(e?.message || "No se pudo leer el archivo. Revisa el formato o vuelve a exportarlo como CSV/XLSX (UTF-8).");
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Selecciona un archivo primero");
      return;
    }
    setStatus("uploading");
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/orders/import", { method: "POST", body: fd, credentials: "include" });
      if (res.status === 415) {
        const msg = await res.json().catch(() => ({ message: "Tipo de archivo no soportado" }));
        throw new Error(msg?.message || "Tipo de archivo no soportado. Sube CSV o Excel (.xlsx/.xls). ");
      }
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Error ${res.status}`);
      }
      setStatus("processing");
      const data = await res.json();
      setSummary({
        processed: data?.summary?.processed ?? data?.processed ?? 0,
        ok: data?.summary?.ok ?? data?.ok ?? 0,
        skipped: data?.summary?.skipped ?? data?.skipped ?? 0,
        errors: data?.errors ?? 0,
      });
      setStatus("done");
      // Invalida vistas
      await qc.invalidateQueries({ queryKey: ["/api/orders"] });
      await qc.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
    } catch (e: any) {
      setStatus("idle");
      setError(e?.message || "Error inesperado al importar");
    }
  };

  const downloadTemplate = async (fmt: "csv" | "xlsx") => {
    const headersA = [
      "shopId","orderId","name","orderNumber","customerName","customerEmail",
      "subtotalPrice","totalAmount","currency","financialStatus","fulfillmentStatus",
      "tags","createdAt","shopifyCreatedAt","items",
    ];
    const headersB = [
      "shopId","orderId","name","orderNumber","customerName","customerEmail",
      "subtotalPrice","totalAmount","currency","financialStatus","fulfillmentStatus",
      "tags","createdAt","shopifyCreatedAt",
      "sku","title","quantity","price","cost","itemCurrency",
    ];
    const headers = mode === "A" ? headersA : headersB;
    if (fmt === "csv") {
      const sample = mode === "A"
        ? `1,ORDER-001,,,,,,MXN,,,,,,"[{\"sku\":\"ABC-123\",\"quantity\":2,\"price\":199.99}]"\n`
        : `1,ORDER-001,,,,,,MXN,,,,,,ABC-123,Item ejemplo,2,199.99,120,MXN\n`;
      const csv = headers.join(",") + "\n" + sample;
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = mode === "A" ? "plantilla_orders_items_json.csv" : "plantilla_orders_items_flat.csv";
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      return;
    }
    // XLSX
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();
    const wsName = mode === "A" ? "Orders" : "OrdersItemsFlat";
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    XLSX.utils.book_append_sheet(wb, ws, wsName);
    // README
    const notes = mode === "A"
      ? [
          ["Obligatorios: shopId, orderId, items (JSON array no vacío)."],
          ["items: cada objeto debe incluir sku (string) y quantity (entero positivo)."],
          ["Fechas ISO (YYYY-MM-DD o YYYY-MM-DDTHH:mm:ssZ). Decimales con punto."],
        ]
      : [
          ["Obligatorios: shopId, orderId, sku, quantity."],
          ["Agrupa por shopId+orderId para construir los ítems."],
          ["Fechas ISO (YYYY-MM-DD o YYYY-MM-DDTHH:mm:ssZ). Decimales con punto."],
        ];
    const wsReadme = XLSX.utils.aoa_to_sheet([["Guía"], [], ...notes]);
    XLSX.utils.book_append_sheet(wb, wsReadme, "Readme");
    const wbout = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    const blob = new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = mode === "A" ? "plantilla_orders_items_json.xlsx" : "plantilla_orders_items_flat.xlsx";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Importar órdenes (archivo único CSV/XLSX)</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Sube un solo archivo que contenga tus órdenes y sus ítems. Recomendamos el formato con items en JSON.
          </div>

          <div className="space-y-2">
            <Label>Formato de ítems</Label>
            <RadioGroup value={mode} onValueChange={(v) => setMode(v as Mode)} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="flex items-center space-x-2 border rounded p-2">
                <RadioGroupItem value="A" id="modeA" />
                <Label htmlFor="modeA" className="cursor-pointer">Modo A (recomendado): items en JSON</Label>
              </div>
              <div className="flex items-center space-x-2 border rounded p-2">
                <RadioGroupItem value="B" id="modeB" />
                <Label htmlFor="modeB" className="cursor-pointer">Modo B: filas repetidas por ítem</Label>
              </div>
            </RadioGroup>
            <div className="text-xs text-muted-foreground">
              Tipos soportados: CSV/XLSX. Límite: 10 MB. Fechas ISO. Decimales con punto.
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => downloadTemplate("csv")}>Descargar plantilla (CSV)</Button>
            <Button variant="outline" onClick={() => downloadTemplate("xlsx")}>Descargar plantilla (XLSX)</Button>
          </div>

          <div className="border rounded-md p-4 bg-muted/30">
            <Label className="block mb-2">Archivo</Label>
            <Input type="file" accept=".csv,.xlsx,.xls" onChange={(e) => onFileChange(e.target.files?.[0] ?? null)} />
            {file && (
              <div className="mt-2 text-sm">
                <span className="font-medium">Seleccionado:</span> {file.name} ({(file.size/1024/1024).toFixed(2)} MB)
              </div>
            )}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {summary && (
            <div className="space-y-3">
              <div className="text-sm">Importación completada.</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                <div><span className="font-medium">Procesadas:</span> {summary.processed}</div>
                <div><span className="font-medium">OK:</span> {summary.ok}</div>
                <div><span className="font-medium">Saltadas:</span> {summary.skipped}</div>
                <div><span className="font-medium">Errores:</span> {Array.isArray(summary.errors) ? summary.errors.length : summary.errors}</div>
              </div>
              {Array.isArray(summary.errors) && summary.errors.length > 0 && (
                <div className="border rounded">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fila</TableHead>
                        <TableHead>Campo</TableHead>
                        <TableHead>Mensaje</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summary.errors.map((e, i) => (
                        <TableRow key={i}>
                          <TableCell>{e.rowIndex}</TableCell>
                          <TableCell>{e.field || "-"}</TableCell>
                          <TableCell>{e.message || "Error"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleUpload} disabled={!file || status === "validating" || status === "uploading"}>
              {status === "validating" ? "Validando archivo…" : status === "uploading" ? "Subiendo…" : status === "processing" ? "Procesando…" : "Importar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

async function readHeaders(file: File): Promise<string[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv")) {
    const text = await file.text();
    const firstLine = text.split(/\r?\n/)[0] || "";
    return firstLine.split(",").map(s => s.trim());
  }
  const XLSX = await import("xlsx");
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });
  const header = (rows[0] || []).map((s: any) => String(s || "").trim());
  return header;
}

