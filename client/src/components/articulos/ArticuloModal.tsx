import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Image as ImageIcon, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  fetchArticulo,
  type Articulo,
  updateArticulo,
  uploadArticuloImages,
  getShopifyProductBySkuInterno,
  updateShopifyProduct,
} from "@/lib/api/articulos";

type Props = { open: boolean; onOpenChange: (b: boolean) => void; sku: string };

function fmt(dt?: string | null) {
  if (!dt) return "-";
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("es-ES");
}

export default function ArticuloModal({ open, onOpenChange, sku }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState("general");

  const { data, isLoading, isError, refetch } = useQuery<Articulo>({
    queryKey: ["/api/articulos", sku],
    queryFn: () => fetchArticulo(sku),
    enabled: open && !!sku,
  });

  const [form, setForm] = useState<Partial<Articulo>>({});
  useEffect(() => {
    if (data) setForm({ ...data });
  }, [data]);

  const onChange = (k: keyof Articulo, v: any) =>
    setForm((f) => ({ ...f, [k]: v }));

  const mSave = useMutation({
    mutationFn: async () => {
      const updates: Partial<Articulo> = {
        sku_interno: form.sku_interno ?? null,
        nombre: form.nombre ?? null,
        descripcion: form.descripcion ?? null,
        proveedor: form.proveedor ?? null,
        status: form.status ?? null,
        categoria: form.categoria ?? null,
        marca_producto: form.marca_producto ?? null,
        codigo_barras: form.codigo_barras ?? null,
        garantia_meses: form.garantia_meses ?? null,
        tipo_variante: form.tipo_variante ?? null,
        variante: form.variante ?? null,
        stock: typeof form.stock === "number" ? form.stock : 0,
        costo: form.costo ?? null,
        alto_cm: form.alto_cm ?? null,
        largo_cm: form.largo_cm ?? null,
        ancho_cm: form.ancho_cm ?? null,
        peso_kg: form.peso_kg ?? null,
        peso_volumetrico: form.peso_volumetrico ?? null,
        clave_producto_sat: form.clave_producto_sat ?? null,
        unidad_medida_sat: form.unidad_medida_sat ?? null,
        clave_unidad_medida_sat: form.clave_unidad_medida_sat ?? null,
      };
      if (
        updates.status &&
        !["activo", "inactivo"].includes(updates.status as any)
      ) {
        throw new Error("status inválido");
      }
      return updateArticulo(sku, updates);
    },
    onSuccess: () => {
      toast({ title: "Artículo actualizado" });
      qc.invalidateQueries({ queryKey: ["/api/articulos"] });
      qc.invalidateQueries({ queryKey: ["/api/articulos", sku] });
      onOpenChange(false);
    },
    onError: (e: any) =>
      toast({
        variant: "destructive",
        title: "Error",
        description: e?.message || "",
      }),
  });

  // Imágenes
  const [files, setFiles] = useState<File[]>([]);
  const images = useMemo(
    () =>
      [form.imagen1, form.imagen2, form.imagen3, form.imagen4].filter(
        Boolean
      ) as string[],
    [form.imagen1, form.imagen2, form.imagen3, form.imagen4]
  );
  const [order, setOrder] = useState<string[]>([]);
  useEffect(() => {
    setOrder(images.map((p) => p.split("/").pop() || p));
  }, [images.join("|")]);

  const move = (idx: number, dir: -1 | 1) => {
    setOrder((arr) => {
      const a = [...arr];
      const j = idx + dir;
      if (j < 0 || j >= a.length) return a;
      const tmp = a[idx];
      a[idx] = a[j];
      a[j] = tmp;
      return a;
    });
  };

  const mImages = useMutation({
    mutationFn: async () => uploadArticuloImages(sku, files, order),
    onSuccess: (r) => {
      toast({ title: "Imágenes actualizadas" });
      setForm((f) => ({
        ...f,
        imagen1: r.imagenes[0] || null,
        imagen2: r.imagenes[1] || null,
        imagen3: r.imagenes[2] || null,
        imagen4: r.imagenes[3] || null,
      }));
      setFiles([]);
    },
    onError: (e: any) =>
      toast({
        variant: "destructive",
        title: "Error subiendo imágenes",
        description: e?.message || "",
      }),
  });

  // Shopify
  const [shopifyInfo, setShopifyInfo] = useState<any | null>(null);
  const [shopifyLoading, setShopifyLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [vendor, setVendor] = useState("");
  const [pstatus, setPstatus] = useState<"active" | "draft">("active");

  const checkShopify = async () => {
    if (!form.sku_interno) return;
    setShopifyLoading(true);
    try {
      const info = await getShopifyProductBySkuInterno(form.sku_interno);
      setShopifyInfo(info);
      setTitle(info?.title || "");
      setVendor(info?.vendor || "");
      setPstatus((info?.status as any) || "active");
    } catch {
      setShopifyInfo(null);
    } finally {
      setShopifyLoading(false);
    }
  };

  const mShopify = useMutation({
    mutationFn: async () =>
      updateShopifyProduct({
        sku_interno: form.sku_interno || "",
        updates: { title, vendor, status: pstatus },
      }),
    onSuccess: () => toast({ title: "Producto Shopify actualizado" }),
    onError: (e: any) =>
      toast({
        variant: "destructive",
        title: "Error Shopify",
        description: e?.message || "",
      }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">Editar artículo - {sku}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 flex items-center justify-center">
            <Loader2 className="h-5 w-5 mr-2 animate-spin" /> Cargando...
          </div>
        ) : isError || !data ? (
          <Alert>
            <AlertDescription>
              No se pudo cargar.
              <Button
                variant="link"
                className="ml-2 p-0 h-auto"
                onClick={() => refetch()}
              >
                <RefreshCw className="h-3 w-3 mr-1" /> Reintentar
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-5">
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="sat">SAT</TabsTrigger>
                <TabsTrigger value="imagenes">Imágenes</TabsTrigger>
                <TabsTrigger value="shopify">Shopify</TabsTrigger>
              </TabsList>

              {/* ========== GENERAL ========== */}
              <TabsContent value="general" className="pt-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Resumen</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="border rounded p-3">
                      <div className="text-xs text-muted-foreground">SKU</div>
                      <div className="font-mono">{sku}</div>
                      <div className="mt-2 flex gap-2">
                        <Badge
                          variant={
                            form.status === "inactivo" ? "destructive" : "secondary"
                          }
                        >
                          {form.status || "—"}
                        </Badge>
                        <Badge variant="outline">
                          {form.en_almacen ? "En almacén" : "Sin almacén"}
                        </Badge>
                      </div>
                    </div>
                    <div className="border rounded p-3">
                      <div className="text-xs text-muted-foreground">Stock</div>
                      <div className="text-lg">{form.stock ?? 0}</div>
                      <div className="text-xs text-muted-foreground mt-2">
                        Proveedor
                      </div>
                      <div>{form.proveedor || "—"}</div>
                    </div>
                    <div className="border rounded p-3">
                      <div className="text-xs text-muted-foreground">Fechas</div>
                      <div className="text-sm">
                        Creado: {fmt(form.created_at)}
                      </div>
                      <div className="text-sm mt-1">
                        Actualizado: {fmt(form.updated_at)}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Separator className="my-4" />

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Información básica</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label>SKU Interno</Label>
                        <Input
                          value={form.sku_interno ?? ""}
                          onChange={(e) => onChange("sku_interno", e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Nombre</Label>
                        <Input
                          value={form.nombre ?? ""}
                          onChange={(e) => onChange("nombre", e.target.value)}
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Descripción</Label>
                        <Input
                          value={form.descripcion ?? ""}
                          onChange={(e) => onChange("descripcion", e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Proveedor</Label>
                        <Input
                          value={form.proveedor ?? ""}
                          onChange={(e) => onChange("proveedor", e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Estado</Label>
                        <Select
                          value={form.status ?? ""}
                          onValueChange={(v) => onChange("status", v as any)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="activo">activo</SelectItem>
                            <SelectItem value="inactivo">inactivo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Categoría</Label>
                        <Input
                          value={form.categoria ?? ""}
                          onChange={(e) => onChange("categoria", e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Marca</Label>
                        <Input
                          value={form.marca_producto ?? ""}
                          onChange={(e) =>
                            onChange("marca_producto", e.target.value)
                          }
                        />
                      </div>
                      <div>
                        <Label>Código de barras</Label>
                        <Input
                          value={form.codigo_barras ?? ""}
                          onChange={(e) =>
                            onChange("codigo_barras", e.target.value)
                          }
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Separator className="my-4" />

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Inventario y Medidas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      <div>
                        <Label>Stock</Label>
                        <Input
                          type="number"
                          value={form.stock ?? 0}
                          onChange={(e) =>
                            onChange(
                              "stock",
                              e.target.value === ""
                                ? 0
                                : Math.max(0, Math.floor(Number(e.target.value) || 0))
                            )
                          }
                        />
                      </div>
                      <div>
                        <Label>Costo</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={form.costo ?? ""}
                          onChange={(e) =>
                            onChange(
                              "costo",
                              e.target.value === "" ? null : Number(e.target.value)
                            )
                          }
                        />
                      </div>
                      <div>
                        <Label>Garantía (meses)</Label>
                        <Input
                          type="number"
                          value={form.garantia_meses ?? ""}
                          onChange={(e) =>
                            onChange(
                              "garantia_meses",
                              e.target.value === "" ? null : Number(e.target.value)
                            )
                          }
                        />
                      </div>
                      <div>
                        <Label>Tipo de variante</Label>
                        <Input
                          value={form.tipo_variante ?? ""}
                          onChange={(e) =>
                            onChange("tipo_variante", e.target.value)
                          }
                        />
                      </div>
                      <div>
                        <Label>Variante</Label>
                        <Input
                          value={form.variante ?? ""}
                          onChange={(e) => onChange("variante", e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Alto (cm)</Label>
                        <Input
                          type="number"
                          value={form.alto_cm ?? ""}
                          onChange={(e) =>
                            onChange(
                              "alto_cm",
                              e.target.value === "" ? null : Number(e.target.value)
                            )
                          }
                        />
                      </div>
                      <div>
                        <Label>Largo (cm)</Label>
                        <Input
                          type="number"
                          value={form.largo_cm ?? ""}
                          onChange={(e) =>
                            onChange(
                              "largo_cm",
                              e.target.value === "" ? null : Number(e.target.value)
                            )
                          }
                        />
                      </div>
                      <div>
                        <Label>Ancho (cm)</Label>
                        <Input
                          type="number"
                          value={form.ancho_cm ?? ""}
                          onChange={(e) =>
                            onChange(
                              "ancho_cm",
                              e.target.value === "" ? null : Number(e.target.value)
                            )
                          }
                        />
                      </div>
                      <div>
                        <Label>Peso (kg)</Label>
                        <Input
                          type="number"
                          value={form.peso_kg ?? ""}
                          onChange={(e) =>
                            onChange(
                              "peso_kg",
                              e.target.value === "" ? null : Number(e.target.value)
                            )
                          }
                        />
                      </div>
                      <div>
                        <Label>Peso volumétrico</Label>
                        <Input
                          type="number"
                          value={form.peso_volumetrico ?? ""}
                          onChange={(e) =>
                            onChange(
                              "peso_volumetrico",
                              e.target.value === "" ? null : Number(e.target.value)
                            )
                          }
                        />
                      </div>
                    </div>
                    <div className="flex justify-end mt-4">
                      <Button
                        onClick={() => mSave.mutate()}
                        disabled={mSave.isPending || isLoading}
                      >
                        {mSave.isPending && (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        )}
                        Guardar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ========== SAT ========== */}
              <TabsContent value="sat" className="pt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Datos SAT</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <Label>Clave producto SAT</Label>
                        <Input
                          value={form.clave_producto_sat ?? ""}
                          onChange={(e) =>
                            onChange("clave_producto_sat", e.target.value)
                          }
                        />
                      </div>
                      <div>
                        <Label>Unidad medida SAT</Label>
                        <Input
                          value={form.unidad_medida_sat ?? ""}
                          onChange={(e) =>
                            onChange("unidad_medida_sat", e.target.value)
                          }
                        />
                      </div>
                      <div>
                        <Label>Clave unidad medida SAT</Label>
                        <Input
                          value={form.clave_unidad_medida_sat ?? ""}
                          onChange={(e) =>
                            onChange("clave_unidad_medida_sat", e.target.value)
                          }
                        />
                      </div>
                    </div>
                    <div className="flex justify-end mt-4">
                      <Button
                        onClick={() => mSave.mutate()}
                        disabled={mSave.isPending || isLoading}
                      >
                        {mSave.isPending && (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        )}
                        Guardar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ========== IMÁGENES ========== */}
              <TabsContent value="imagenes" className="pt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Imágenes del artículo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 mb-4">
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => setFiles(Array.from(e.target.files || []))}
                      />
                      <Button
                        variant="outline"
                        onClick={() => mImages.mutate()}
                        disabled={mImages.isPending || files.length === 0}
                      >
                        {mImages.isPending && (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        )}
                        Subir / Guardar
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {images.length === 0 ? (
                        <div className="col-span-full h-40 border rounded flex items-center justify-center text-sm text-muted-foreground">
                          <ImageIcon className="h-4 w-4 mr-2" /> Sin imágenes
                        </div>
                      ) : (
                        images.map((p, i) => (
                          <div
                            key={p}
                            className="border rounded p-2 flex flex-col items-center gap-2"
                          >
                            {/* eslint-disable-next-line */}
                            <img
                              src={p}
                              alt="img"
                              className="h-28 object-contain"
                            />
                            <div className="text-xs break-all">
                              {p.split("/").pop()}
                            </div>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => move(i, -1)}
                                disabled={i === 0}
                              >
                                ◀
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => move(i, 1)}
                                disabled={i === images.length - 1}
                              >
                                ▶
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ========== SHOPIFY ========== */}
              <TabsContent value="shopify" className="pt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Integración Shopify</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                      <div>
                        <Label>SKU Interno</Label>
                        <Input
                          value={form.sku_interno ?? ""}
                          onChange={(e) => onChange("sku_interno", e.target.value)}
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          onClick={checkShopify}
                          disabled={!form.sku_interno || shopifyLoading}
                        >
                          {shopifyLoading && (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          )}
                          Verificar
                        </Button>
                      </div>
                    </div>

                    {shopifyInfo ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <Label>Título</Label>
                            <Input
                              value={title}
                              onChange={(e) => setTitle(e.target.value)}
                            />
                          </div>
                          <div>
                            <Label>Proveedor</Label>
                            <Input
                              value={vendor}
                              onChange={(e) => setVendor(e.target.value)}
                            />
                          </div>
                          <div>
                            <Label>Status</Label>
                            <Select
                              value={pstatus}
                              onValueChange={(v) => setPstatus(v as any)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="active">active</SelectItem>
                                <SelectItem value="draft">draft</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <Button
                            onClick={() => mShopify.mutate()}
                            disabled={mShopify.isPending}
                          >
                            {mShopify.isPending && (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            )}
                            Actualizar Shopify
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        Sin información Shopify
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}