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
  fetchMarcas,
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
  const { data: marcas } = useQuery({ queryKey: ["/api/marcas"], queryFn: fetchMarcas });

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
        stock: Math.max(0, Math.floor(Number(form.stock ?? 0) || 0)),
        stock_a: Math.max(0, Math.floor(Number((form as any).stock_a ?? 0) || 0)),
        en_almacen: form.en_almacen ?? null,
        costo: (form.costo === null || form.costo === undefined || (form.costo as any) === "") ? null : Number(form.costo),
        alto_cm: form.alto_cm ?? null,
        largo_cm: form.largo_cm ?? null,
        ancho_cm: form.ancho_cm ?? null,
        peso_kg: form.peso_kg ?? null,
        peso_volumetrico: form.peso_volumetrico ?? null,
        clave_producto_sat: form.clave_producto_sat ?? null,
        unidad_medida_sat: form.unidad_medida_sat ?? null,
        clave_unidad_medida_sat: form.clave_unidad_medida_sat ?? null,
      };
      if ((updates.stock_a ?? 0) > 0 && updates.en_almacen !== true) {
        updates.en_almacen = true;
      }
      // incluir es_combo si existe en el formulario (protegido por servidor)
      (updates as any).es_combo = (form as any).es_combo ?? null;
      if (
        updates.status &&
        !["activo", "inactivo"].includes(updates.status as any)
      ) {
        throw new Error("status inválido");
      }
      const payload = { ...updates } as any;
      // backend actual puede no aceptar es_combo en PUT; filtramos defensivamente
      if ('es_combo' in payload) delete payload.es_combo;
      return updateArticulo(sku, payload);
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
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center justify-between">
            <span>Editar artículo - {sku}</span>
            <div className="text-sm font-normal">
              <span className="text-muted-foreground">Creado:</span> {fmt(form.created_at)} • 
              <span className="text-muted-foreground"> Actualizado:</span> {fmt(form.updated_at)}
            </div>
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="py-12 flex items-center justify-center">
            <Loader2 className="h-6 w-6 mr-3 animate-spin" /> 
            <span className="text-lg">Cargando información...</span>
          </div>
        ) : isError || !data ? (
          <Alert variant="destructive">
            <AlertDescription className="flex items-center">
              <span>No se pudo cargar la información del artículo.</span>
              <Button
                variant="outline"
                size="sm"
                className="ml-3"
                onClick={() => refetch()}
              >
                <RefreshCw className="h-4 w-4 mr-2" /> Reintentar
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-6">
            <Tabs value={tab} onValueChange={setTab} className="w-full">
              <TabsList className="grid grid-cols-6 w-full mb-6">
                <TabsTrigger value="general" className="text-sm py-2">
                  General
                </TabsTrigger>
                <TabsTrigger value="medidas" className="text-sm py-2">
                  Medidas
                </TabsTrigger>
                <TabsTrigger value="combo" className="text-sm py-2">
                  Combo
                </TabsTrigger>
                <TabsTrigger value="sat" className="text-sm py-2">
                  SAT
                </TabsTrigger>
                <TabsTrigger value="imagenes" className="text-sm py-2">
                  Imágenes
                </TabsTrigger>
                <TabsTrigger value="shopify" className="text-sm py-2">
                  Shopify
                </TabsTrigger>
              </TabsList>

              {/* ========== GENERAL ========== */}
              <TabsContent value="general" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Panel de Resumen - Izquierda */}
                  <div className="lg:col-span-1 space">
                    <Card className="bg-muted/30">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Resumen del Artículo</CardTitle>
                      </CardHeader>
                      <CardContent className="space">
                        <div className="flex flex-wrap gap-2">
                          <Badge
                            variant={
                              form.status === "inactivo" ? "destructive" : "default"
                            }
                            className="text-sm"
                          >
                            {form.status || "Sin estado"}
                          </Badge>
                          <Badge 
                            variant={form.en_almacen ? "default" : "secondary"}
                            className="text-sm"
                          >
                            {form.en_almacen ? "En almacén" : "Externo"}
                          </Badge>
                        </div>
                        
                        <div className="space-y-3">
                          <div>
                            <Label className="text-xs text-muted-foreground">SKU</Label>
                            <div className="font-mono text-sm p-2 bg-background rounded border">
                              {sku}
                            </div>
                          </div>
                          
                          <div>
                            <Label className="text-xs text-muted-foreground">SKU Interno</Label>
                            <Input
                              value={form.sku_interno ?? ""}
                              onChange={(e) => onChange("sku_interno", e.target.value)}
                              className="text-sm"
                            />
                          </div>
                          
                          <div>
                            <Label className="text-xs text-muted-foreground">Proveedor</Label>
                            <div className="text-sm p-2 bg-background rounded border">
                              {form.proveedor || "No especificado"}
                            </div>
                          </div>
                        </div>
                        
                        <Separator />
                        
                        <div className="space-y-3">
                          <div>
                            <Label className="text-xs text-muted-foreground">Stock Catálogo</Label>
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
                              className="text-sm"
                            />
                          </div>
                          
                          <div>
                            <Label className="text-xs text-muted-foreground">Stock Almacén</Label>
                            <Input
                              type="number"
                              value={(form as any).stock_a ?? 0}
                              onChange={(e) => {
                                const raw = e.target.value;
                                const v = raw === "" ? 0 : Math.max(0, Math.floor(Number(raw) || 0));
                                onChange("stock_a" as any, v as any);
                                if (Number(raw) > 0) onChange("en_almacen" as any, true as any);
                              }}
                              className="text-sm"
                            />
                          </div>
                          
                          <div>
                            <Label className="text-xs text-muted-foreground">Costo</Label>
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
                              className="text-sm"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  {/* Panel de Información - Derecha */}
                  <div className="lg:col-span-2 space-y-6">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Información Básica</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="md:col-span-2">
                            <Label>Nombre del Artículo</Label>
                            <Input
                              value={form.nombre ?? ""}
                              onChange={(e) => onChange("nombre", e.target.value)}
                              placeholder="Nombre del producto"
                            />
                          </div>
                          
                          <div className="md:col-span-2">
                            <Label>Descripción</Label>
                            <Input
                              value={form.descripcion ?? ""}
                              onChange={(e) => onChange("descripcion", e.target.value)}
                              placeholder="Descripción detallada del producto"
                            />
                          </div>
                          
                          <div>
                            <Label>Proveedor</Label>
                            <Select
                              value={form.proveedor ?? ""}
                              onValueChange={(v) => onChange("proveedor", v)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar proveedor" />
                              </SelectTrigger>
                              <SelectContent>
                                {(marcas || []).map((m: any) => (
                                  <SelectItem key={m.codigo} value={m.nombre}>
                                    {m.nombre}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label>Estado</Label>
                            <Select
                              value={form.status ?? ""}
                              onValueChange={(v) => onChange("status", v as any)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar estado" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Activo">Activo</SelectItem>
                                <SelectItem value="Inactivo">Inactivo</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label>Categoría</Label>
                            <Input
                              value={form.categoria ?? ""}
                              onChange={(e) => onChange("categoria", e.target.value)}
                              placeholder="Categoría del producto"
                            />
                          </div>
                          
                          <div>
                            <Label>Marca</Label>
                            <Input
                              value={form.marca_producto ?? ""}
                              onChange={(e) =>
                                onChange("marca_producto", e.target.value)
                              }
                              placeholder="Marca del producto"
                            />
                          </div>
                          
                          <div>
                            <Label>Código de Barras</Label>
                            <Input
                              value={form.codigo_barras ?? ""}
                              onChange={(e) =>
                                onChange("codigo_barras", e.target.value)
                              }
                              placeholder="Código EAN/UPC"
                            />
                          </div>
                          
                          <div>
                            <Label>Garantía (meses)</Label>
                            <Input
                              type="number"
                              value={form.garantia_meses ?? ""}
                              onChange={(e) =>
                                onChange("garantia_meses", e.target.value === "" ? null : Number(e.target.value))
                              }
                              placeholder="Meses de garantía"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <div className="flex justify-end">
                      <Button 
                        onClick={() => mSave.mutate()} 
                        disabled={mSave.isPending || isLoading}
                        size="lg"
                      >
                        {mSave.isPending && (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        )}
                        Guardar Cambios
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* ========== MEDIDAS ========== */}
              <TabsContent value="medidas" className="space-y-6">
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg">Dimensiones y Peso</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <Label>Tipo de Variante</Label>
                        <Input
                          value={form.tipo_variante ?? ""}
                          onChange={(e) => onChange("tipo_variante", e.target.value)}
                          placeholder="Color, Talla, etc."
                        />
                      </div>
                      <div>
                        <Label>Variante</Label>
                        <Input
                          value={form.variante ?? ""}
                          onChange={(e) => onChange("variante", e.target.value)}
                          placeholder="Rojo, M, etc."
                        />
                      </div>
                      <div>
                        <Label>Alto (cm)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={form.alto_cm ?? ""}
                          onChange={(e) => onChange("alto_cm", e.target.value === "" ? null : Number(e.target.value))}
                          placeholder="Altura"
                        />
                      </div>
                      <div>
                        <Label>Largo (cm)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={form.largo_cm ?? ""}
                          onChange={(e) => onChange("largo_cm", e.target.value === "" ? null : Number(e.target.value))}
                          placeholder="Longitud"
                        />
                      </div>
                      <div>
                        <Label>Ancho (cm)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={form.ancho_cm ?? ""}
                          onChange={(e) => onChange("ancho_cm", e.target.value === "" ? null : Number(e.target.value))}
                          placeholder="Anchura"
                        />
                      </div>
                      <div>
                        <Label>Peso (kg)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={form.peso_kg ?? ""}
                          onChange={(e) => onChange("peso_kg", e.target.value === "" ? null : Number(e.target.value))}
                          placeholder="Peso físico"
                        />
                      </div>
                      <div>
                        <Label>Peso Volumétrico</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={form.peso_volumetrico ?? ""}
                          onChange={(e) => onChange("peso_volumetrico", e.target.value === "" ? null : Number(e.target.value))}
                          placeholder="Peso para envío"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end mt-6">
                      <Button 
                        onClick={() => mSave.mutate()} 
                        disabled={mSave.isPending || isLoading}
                        size="lg"
                      >
                        {mSave.isPending && (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        )}
                        Guardar Medidas
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ========== COMBO ========== */}
              <TabsContent value="combo" className="space-y-6">
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg">Configuración de Combo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3 mb-4">
                      <input
                        id="es_combo"
                        type="checkbox"
                        checked={Boolean((form as any).es_combo)}
                        onChange={(e) => onChange("es_combo" as any, e.target.checked as any)}
                        className="rounded"
                      />
                      <Label htmlFor="es_combo">¿Es combo?</Label>
                    </div>

                    {Boolean((form as any).es_combo) ? (
                      <div className="border rounded p-4 text-sm text-muted-foreground">
                        Sin items de combo
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        Este artículo no es combo
                      </div>
                    )}

                    <div className="flex justify-end mt-6">
                      <Button onClick={() => mSave.mutate()} disabled={mSave.isPending || isLoading}>
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
              <TabsContent value="sat" className="space-y-6">
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg">Datos para Facturación SAT</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label>Clave Producto SAT</Label>
                        <Input
                          value={form.clave_producto_sat ?? ""}
                          onChange={(e) =>
                            onChange("clave_producto_sat", e.target.value)
                          }
                          placeholder="Clave del producto según SAT"
                        />
                      </div>
                      <div>
                        <Label>Unidad Medida SAT</Label>
                        <Input
                          value={form.unidad_medida_sat ?? ""}
                          onChange={(e) =>
                            onChange("unidad_medida_sat", e.target.value)
                          }
                          placeholder="Unidad de medida"
                        />
                      </div>
                      <div>
                        <Label>Clave Unidad Medida SAT</Label>
                        <Input
                          value={form.clave_unidad_medida_sat ?? ""}
                          onChange={(e) =>
                            onChange("clave_unidad_medida_sat", e.target.value)
                          }
                          placeholder="Clave de unidad"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end mt-6">
                      <Button
                        onClick={() => mSave.mutate()}
                        disabled={mSave.isPending || isLoading}
                        size="lg"
                      >
                        {mSave.isPending && (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        )}
                        Guardar Datos SAT
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ========== IMÁGENES ========== */}
              <TabsContent value="imagenes" className="space-y-6">
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg">Galería de Imágenes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap items-center gap-3 mb-6 p-4 bg-muted/20 rounded-lg">
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => setFiles(Array.from(e.target.files || []))}
                        className="flex-1 min-w-[200px]"
                      />
                      <Button
                        onClick={() => mImages.mutate()}
                        disabled={mImages.isPending || files.length === 0}
                        className="whitespace-nowrap"
                      >
                        {mImages.isPending && (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        )}
                        Subir y Guardar
                      </Button>
                    </div>

                    {images.length === 0 ? (
                      <div className="text-center py-12 border-2 border-dashed rounded-lg">
                        <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                        <p className="text-muted-foreground">No hay imágenes cargadas</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Sube imágenes usando el botón superior
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {images.map((p, i) => (
                          <div
                            key={p}
                            className="border rounded-lg overflow-hidden bg-background shadow-sm hover:shadow-md transition-shadow"
                          >
                            <div className="aspect-square flex items-center justify-center bg-muted">
                              {/* eslint-disable-next-line */}
                              <img
                                src={p}
                                alt={`Imagen ${i + 1}`}
                                className="object-contain w-full h-full"
                              />
                            </div>
                            <div className="p-3">
                              <div className="text-xs text-muted-foreground truncate mb-2">
                                {p.split("/").pop()}
                              </div>
                              <div className="flex justify-between gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => move(i, -1)}
                                  disabled={i === 0}
                                  className="flex-1 text-xs"
                                >
                                  ←
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => move(i, 1)}
                                  disabled={i === images.length - 1}
                                  className="flex-1 text-xs"
                                >
                                  →
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ========== SHOPIFY ========== */}
              <TabsContent value="shopify" className="space-y-6">
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg">Integración con Shopify</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div>
                        <Label>SKU Interno (para Shopify)</Label>
                        <Input
                          value={form.sku_interno ?? ""}
                          onChange={(e) => onChange("sku_interno", e.target.value)}
                          placeholder="SKU interno para sincronización"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          onClick={checkShopify}
                          disabled={!form.sku_interno || shopifyLoading}
                          className="w-full"
                        >
                          {shopifyLoading && (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          )}
                          {shopifyLoading ? "Buscando..." : "Verificar en Shopify"}
                        </Button>
                      </div>
                    </div>

                    {shopifyInfo ? (
                      <div className="border rounded-lg p-4 bg-muted/10">
                        <h3 className="font-medium mb-3">Información de Producto Shopify</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <Label>Título del Producto</Label>
                            <Input
                              value={title}
                              onChange={(e) => setTitle(e.target.value)}
                              placeholder="Nombre en Shopify"
                            />
                          </div>
                          <div>
                            <Label>Proveedor/Vendor</Label>
                            <Input
                              value={vendor}
                              onChange={(e) => setVendor(e.target.value)}
                              placeholder="Marca en Shopify"
                            />
                          </div>
                          <div>
                            <Label>Estado en Shopify</Label>
                            <Select
                              value={pstatus}
                              onValueChange={(v) => setPstatus(v as any)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="active">Activo (Visible)</SelectItem>
                                <SelectItem value="draft">Borrador (Oculto)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="flex justify-end mt-4">
                          <Button
                            onClick={() => mShopify.mutate()}
                            disabled={mShopify.isPending}
                            size="lg"
                          >
                            {mShopify.isPending && (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            )}
                            Actualizar en Shopify
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 border-2 border-dashed rounded-lg">
                        <div className="text-muted-foreground mb-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                          </svg>
                        </div>
                        <p className="text-muted-foreground">
                          No se encontró información en Shopify
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Verifica el SKU interno y haz clic en "Verificar en Shopify"
                        </p>
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
