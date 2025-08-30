import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Image as ImageIcon, Link2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CatalogoProductoFull, fetchCatalogItem, fetchCatalogShopifyLink, updateCatalogItem } from "@/lib/api/catalogo";
import { calcChargeable, calcVolumetric, formatCurrencyMX, formatKg, isCombo, isLikelyUrl } from "@/lib/utils/product";

export type ProductDetailsModalProps = {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  skuInterno: string;
};

// Nota: sku_interno se usa como identificador natural de este flujo.
// Esto evita depender de una PK que la tabla no define explícitamente en el esquema de referencia.
export default function ProductDetailsModal({ open, onOpenChange, skuInterno }: ProductDetailsModalProps) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [tab, setTab] = useState("general");

  const { data, isLoading, isError, refetch } = useQuery<CatalogoProductoFull>({
    queryKey: ["/api/catalogo/item", skuInterno],
    queryFn: () => fetchCatalogItem(skuInterno),
    enabled: open && !!skuInterno,
  });

  const { data: shopifyLink, isLoading: shopifyLoading, isError: shopifyError, refetch: refetchShopify } = useQuery({
    queryKey: ["/api/catalogo/shopify-link", skuInterno],
    queryFn: () => fetchCatalogShopifyLink(skuInterno),
    enabled: open && !!skuInterno,
  });

  const [form, setForm] = useState<Partial<CatalogoProductoFull>>({});
  const [divisor, setDivisor] = useState<number>(5000);
  const resetForm = () => setForm({ ...(data || {}) });

  useEffect(() => {
    if (data) {
      setForm({ ...data });
    }
  }, [data]);

  const onChange = (field: keyof CatalogoProductoFull, value: any) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  const volumetric = useMemo(() => calcVolumetric(form.largo ?? 0, form.ancho ?? 0, form.alto ?? 0, divisor), [form.largo, form.ancho, form.alto, divisor]);
  const chargeable = useMemo(() => calcChargeable(form.peso ?? 0, volumetric), [form.peso, volumetric]);

  const mutation = useMutation({
    mutationFn: async () => updateCatalogItem(skuInterno, {
      sku: form.sku ?? null,
      sku_interno: form.sku_interno ?? null,
      codigo_barras: form.codigo_barras ?? null,
      nombre_producto: form.nombre_producto ?? null,
      modelo: form.modelo ?? null,
      condicion: form.condicion ?? null,
      variante: form.variante ?? null,
      marca: form.marca ?? null,
      marca_producto: form.marca_producto ?? null,
      categoria: form.categoria ?? null,
      largo: form.largo ?? null,
      ancho: form.ancho ?? null,
      alto: form.alto ?? null,
      peso: form.peso ?? null,
      foto: form.foto ?? null,
      costo: form.costo ?? null,
      stock: form.stock ?? 0,
    }),
    onSuccess: (updated) => {
      toast({ title: "Producto actualizado" });
      // Invalida lista del catálogo y el detalle
      qc.invalidateQueries({ queryKey: ["/api/catalogo"] });
      qc.invalidateQueries({ queryKey: ["/api/catalogo/item", skuInterno] });
      // Si el sku_interno cambió, también invalidar nueva key
      if (updated?.sku_interno && updated.sku_interno !== skuInterno) {
        qc.invalidateQueries({ queryKey: ["/api/catalogo/item", updated.sku_interno] });
      }
      onOpenChange(false);
    },
    onError: (e: any) => {
      toast({ variant: "destructive", title: "Error al guardar", description: e?.message || "" });
    },
  });

  const disabled = mutation.isPending || isLoading;

  const showComposition = isCombo(form.sku_interno || skuInterno);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Detalle de producto</span>
            {isCombo(skuInterno) && (
              <Badge variant="secondary">Combo</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="py-12 flex items-center justify-center text-muted-foreground"><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Cargando...</div>
        ) : isError || !data ? (
          <Alert>
            <AlertDescription>
              No se pudo cargar el producto.
              <Button variant="link" className="ml-2 p-0 h-auto" onClick={() => refetch()}><RefreshCw className="h-3 w-3 mr-1" /> Reintentar</Button>
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">SKU Interno: <span className="font-mono">{data.sku_interno || skuInterno}</span></div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={resetForm} disabled={disabled}>
                  Reset
                </Button>
              </div>
            </div>
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className={`w-full grid ${showComposition ? 'grid-cols-6' : 'grid-cols-5'}`}>
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="dimensiones">Dimensiones y Peso</TabsTrigger>
                <TabsTrigger value="imagen">Imagen</TabsTrigger>
                <TabsTrigger value="inventario">Inventario y Costo</TabsTrigger>
                <TabsTrigger value="shopify">Shopify</TabsTrigger>
                {showComposition && <TabsTrigger value="composicion">Composición</TabsTrigger>}
              </TabsList>

              <TabsContent value="general" className="space-y-3 pt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>SKU Externo</Label>
                    <Input value={form.sku ?? ""} onChange={(e) => onChange("sku", e.target.value)} placeholder="SKU externo" />
                  </div>
                  <div>
                    <Label>SKU Interno</Label>
                    <Input value={form.sku_interno ?? ""} onChange={(e) => onChange("sku_interno", e.target.value)} placeholder="SKU interno" />
                  </div>
                  <div>
                    <Label>Código de barras</Label>
                    <Input value={form.codigo_barras ?? ""} onChange={(e) => onChange("codigo_barras", e.target.value)} placeholder="Código de barras" />
                  </div>
                  <div>
                    <Label>Nombre del producto</Label>
                    <Input value={form.nombre_producto ?? ""} onChange={(e) => onChange("nombre_producto", e.target.value)} placeholder="Nombre" />
                  </div>
                  <div>
                    <Label>Modelo</Label>
                    <Input value={form.modelo ?? ""} onChange={(e) => onChange("modelo", e.target.value)} placeholder="Modelo" />
                  </div>
                  <div>
                    <Label>Condición</Label>
                    <Input value={form.condicion ?? ""} onChange={(e) => onChange("condicion", e.target.value)} placeholder="Condición" />
                  </div>
                  <div>
                    <Label>Variante</Label>
                    <Input value={form.variante ?? ""} onChange={(e) => onChange("variante", e.target.value)} placeholder="Variante" />
                  </div>
                  <div>
                    <Label>Marca (catálogo)</Label>
                    <Input value={form.marca ?? ""} onChange={(e) => onChange("marca", e.target.value)} placeholder="Marca (importación)" />
                  </div>
                  <div>
                    <Label>Marca del producto</Label>
                    <Input value={form.marca_producto ?? ""} onChange={(e) => onChange("marca_producto", e.target.value)} placeholder="Marca del producto" />
                  </div>
                  <div>
                    <Label>Categoría</Label>
                    <Input value={form.categoria ?? ""} onChange={(e) => onChange("categoria", e.target.value)} placeholder="Categoría" />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="dimensiones" className="space-y-3 pt-4">
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <Label>Largo (cm)</Label>
                    <Input type="number" min={0} value={form.largo ?? ""} onChange={(e) => onChange("largo", e.target.value === '' ? null : Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>Ancho (cm)</Label>
                    <Input type="number" min={0} value={form.ancho ?? ""} onChange={(e) => onChange("ancho", e.target.value === '' ? null : Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>Alto (cm)</Label>
                    <Input type="number" min={0} value={form.alto ?? ""} onChange={(e) => onChange("alto", e.target.value === '' ? null : Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>Peso real (kg)</Label>
                    <Input type="number" min={0} step="0.01" value={form.peso ?? ""} onChange={(e) => onChange("peso", e.target.value === '' ? null : Number(e.target.value))} />
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-4 gap-3 items-end">
                  <div>
                    <Label>Divisor volumétrico</Label>
                    <Select value={String(divisor)} onValueChange={(v) => setDivisor(Number(v))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5000">5000</SelectItem>
                        <SelectItem value="6000">6000</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Peso volumétrico (kg)</Label>
                    <div className="h-9 flex items-center px-3 rounded-md border bg-muted/50">{formatKg(volumetric)}</div>
                  </div>
                  <div>
                    <Label>Peso facturable (kg)</Label>
                    <div className="h-9 flex items-center px-3 rounded-md border bg-muted/50">{formatKg(chargeable)}</div>
                  </div>
                  <div className="flex items-center">
                    <Button variant="outline" onClick={() => onChange("peso", Number(chargeable.toFixed(2)))}>
                      Usar peso sugerido
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="imagen" className="space-y-3 pt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>URL de imagen</Label>
                    <Input value={form.foto ?? ""} onChange={(e) => onChange("foto", e.target.value)} placeholder="https://..." />
                  </div>
                </div>
                <div className="border rounded-md p-3 h-64 flex items-center justify-center bg-muted/20">
                  {form.foto && isLikelyUrl(form.foto) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={form.foto!} alt="Preview" className="max-h-60 object-contain" />
                  ) : (
                    <div className="text-muted-foreground flex items-center gap-2"><ImageIcon className="h-4 w-4" /> Sin imagen válida</div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="inventario" className="space-y-3 pt-4">
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <Label>Stock</Label>
                    <Input type="number" min={0} value={form.stock ?? 0} onChange={(e) => onChange("stock", e.target.value === '' ? 0 : Math.max(0, Math.floor(Number(e.target.value) || 0)))} />
                  </div>
                  <div>
                    <Label>Costo</Label>
                    <Input type="number" min={0} step="0.01" value={form.costo ?? 0} onChange={(e) => onChange("costo", e.target.value === '' ? null : Math.max(0, Number(e.target.value) || 0))} />
                  </div>
                  <div className="col-span-2 flex items-end text-sm text-muted-foreground">
                    Sugerencia: {formatCurrencyMX(form.costo ?? 0)}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="shopify" className="space-y-3 pt-4">
                {shopifyLoading ? (
                  <div className="py-4 text-muted-foreground flex items-center"><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Consultando vínculo...</div>
                ) : shopifyError ? (
                  <div className="text-sm text-muted-foreground">No conectado</div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Link2 className="h-4 w-4" />
                    {shopifyLink?.connected ? (
                      <Badge className="bg-green-100 text-green-800">Shopify: {shopifyLink.store}</Badge>
                    ) : (
                      <Badge variant="secondary">No conectado</Badge>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => refetchShopify()}><RefreshCw className="h-4 w-4" /></Button>
                  </div>
                )}
              </TabsContent>

              {showComposition && (
                <TabsContent value="composicion" className="space-y-3 pt-4">
                  <div className="p-3 rounded-md border bg-muted/10 text-sm text-muted-foreground">
                    Composición: Sin composición definida todavía.
                  </div>
                </TabsContent>
              )}

            </Tabs>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={disabled}>Cancelar</Button>
              <Button onClick={() => mutation.mutate()} disabled={disabled}>
                {mutation.isPending && (<Loader2 className="h-4 w-4 mr-2 animate-spin" />)}
                Guardar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
