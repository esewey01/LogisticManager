import React, { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { 
  Search, 
  Filter, 
  Download, 
  Upload, 
  Edit3, 
  Check, 
  X, 
  ChevronLeft,
  ChevronRight,
  Package,
  Layers,
  Link2,
  AlertCircle
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { debounce } from 'lodash';

interface CatalogProduct {
  sku: string;
  marca?: string;
  sku_interno?: string;
  codigo_barras?: string;
  nombre_producto?: string;
  modelo?: string;
  categoria?: string;
  condicion?: string;
  marca_producto?: string;
  variante?: string;
  largo?: number;
  ancho?: number;
  alto?: number;
  peso?: number;
  foto?: string;
  costo?: number;
  stock?: number;
}

interface ShopifyProduct {
  product_id: number;
  shopify_product_id: string;
  shop_id: number;
  shop_name: string;
  title: string;
  vendor?: string;
  product_type?: string;
  product_status: string;
  variant_id: number;
  shopify_variant_id: string;
  sku?: string;
  price?: number;
  compare_at_price?: number;
  barcode?: string;
  inventory_qty: number;
}

interface ReconciliationStats {
  emparejados: number;
  faltantes: number;
  conflictos: number;
}

export default function ProductosPage() {
  const [activeTab, setActiveTab] = useState('catalogo');
  const [catalogPage, setCatalogPage] = useState(1);
  const [shopifyPage, setShopifyPage] = useState(1);
  const [reconciliationPage, setReconciliationPage] = useState(1);
  const [pageSize] = useState(300);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchField, setSearchField] = useState<string>('');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});
  
  // Filtros para cada pestaña
  const [catalogFilters, setCatalogFilters] = useState({
    marca: '',
    categoria: '',
    condicion: '',
    marca_producto: ''
  });
  
  const [shopifyFilters, setShopifyFilters] = useState({
    shopId: '',
    status: '',
    vendor: '',
    productType: ''
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((term: string) => {
      setSearchTerm(term);
    }, 500),
    []
  );

  // ================ CATÁLOGO QUERIES ================

  const { data: catalogData, isLoading: catalogLoading } = useQuery({
    queryKey: ['/api/unified-products/catalog', catalogPage, searchTerm, searchField, catalogFilters],
    queryFn: () => apiRequest({
      url: '/api/unified-products/catalog',
      params: {
        page: catalogPage,
        pageSize,
        search: searchTerm,
        searchField: searchField || undefined,
        ...catalogFilters
      }
    }),
    enabled: activeTab === 'catalogo'
  });

  const { data: catalogFacets } = useQuery({
    queryKey: ['/api/unified-products/catalog/facets'],
    queryFn: () => apiRequest({ url: '/api/unified-products/catalog/facets' }),
    enabled: activeTab === 'catalogo'
  });

  const updateCatalogMutation = useMutation({
    mutationFn: ({ sku, updates }: { sku: string; updates: any }) =>
      apiRequest({
        url: `/api/unified-products/catalog/${sku}`,
        method: 'PATCH',
        data: updates
      }),
    onSuccess: () => {
      toast({ description: "Producto actualizado correctamente" });
      queryClient.invalidateQueries({ queryKey: ['/api/unified-products/catalog'] });
      setEditingRow(null);
      setEditData({});
    },
    onError: () => {
      toast({ variant: "destructive", description: "Error al actualizar producto" });
    }
  });

  // ================ SHOPIFY QUERIES ================

  const { data: shopifyData, isLoading: shopifyLoading } = useQuery({
    queryKey: ['/api/unified-products/shopify', shopifyPage, searchTerm, shopifyFilters],
    queryFn: () => apiRequest({
      url: '/api/unified-products/shopify',
      params: {
        page: shopifyPage,
        pageSize,
        search: searchTerm,
        ...shopifyFilters
      }
    }),
    enabled: activeTab === 'shopify'
  });

  const updateShopifyMutation = useMutation({
    mutationFn: ({ variantId, updates }: { variantId: number; updates: any }) =>
      apiRequest({
        url: `/api/unified-products/shopify/variant/${variantId}`,
        method: 'PATCH',
        data: updates
      }),
    onSuccess: () => {
      toast({ description: "Variante actualizada correctamente" });
      queryClient.invalidateQueries({ queryKey: ['/api/unified-products/shopify'] });
      setEditingRow(null);
      setEditData({});
    },
    onError: () => {
      toast({ variant: "destructive", description: "Error al actualizar variante" });
    }
  });

  // ================ CONCILIACIÓN QUERIES ================

  const { data: reconciliationStats } = useQuery({
    queryKey: ['/api/unified-products/reconciliation/stats'],
    queryFn: () => apiRequest({ url: '/api/unified-products/reconciliation/stats' }),
    enabled: activeTab === 'conciliacion'
  });

  const { data: unlinkedCatalog } = useQuery({
    queryKey: ['/api/unified-products/reconciliation/unlinked/catalog', reconciliationPage],
    queryFn: () => apiRequest({
      url: '/api/unified-products/reconciliation/unlinked/catalog',
      params: { page: reconciliationPage, pageSize }
    }),
    enabled: activeTab === 'conciliacion'
  });

  // ================ HANDLERS ================

  const handleCatalogEdit = (sku: string, field: string, value: any) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  const handleCatalogSave = (sku: string) => {
    if (Object.keys(editData).length === 0) {
      setEditingRow(null);
      return;
    }
    updateCatalogMutation.mutate({ sku, updates: editData });
  };

  const handleShopifyEdit = (variantId: number, field: string, value: any) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  const handleShopifySave = (variantId: number) => {
    if (Object.keys(editData).length === 0) {
      setEditingRow(null);
      return;
    }
    updateShopifyMutation.mutate({ variantId, updates: editData });
  };

  const handleRowSelection = (id: string, checked: boolean) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  };

  const handleBulkEdit = () => {
    if (selectedRows.size === 0) {
      toast({ variant: "destructive", description: "Selecciona al menos un producto" });
      return;
    }
    // Implementar edición masiva
    toast({ description: `Editando ${selectedRows.size} productos seleccionados` });
  };

  // ================ RENDER COMPONENTS ================

  const renderCatalogTable = () => {
    if (catalogLoading) {
      return <div className="p-8 text-center">Cargando productos del catálogo...</div>;
    }

    const products = catalogData?.rows || [];
    const total = catalogData?.total || 0;

    return (
      <div className="space-y-4">
        {/* Barra de herramientas compacta */}
        <div className="flex flex-wrap gap-2 items-center justify-between bg-muted/30 p-3 rounded-lg">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar productos..."
                className="w-48 h-8"
                onChange={(e) => debouncedSearch(e.target.value)}
                data-testid="input-search-catalog"
              />
            </div>
            
            <Select value={searchField} onValueChange={setSearchField}>
              <SelectTrigger className="w-40 h-8" data-testid="select-search-field">
                <SelectValue placeholder="Campo de búsqueda" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos los campos</SelectItem>
                <SelectItem value="sku">SKU</SelectItem>
                <SelectItem value="sku_interno">SKU Interno</SelectItem>
                <SelectItem value="codigo_barras">Código de Barras</SelectItem>
                <SelectItem value="nombre_producto">Nombre</SelectItem>
              </SelectContent>
            </Select>

            <Select 
              value={catalogFilters.categoria} 
              onValueChange={(value) => setCatalogFilters(prev => ({ ...prev, categoria: value }))}
            >
              <SelectTrigger className="w-32 h-8" data-testid="select-categoria">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas</SelectItem>
                {catalogFacets?.categorias?.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select 
              value={catalogFilters.marca} 
              onValueChange={(value) => setCatalogFilters(prev => ({ ...prev, marca: value }))}
            >
              <SelectTrigger className="w-32 h-8" data-testid="select-marca">
                <SelectValue placeholder="Marca" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas</SelectItem>
                {catalogFacets?.marcas?.map(marca => (
                  <SelectItem key={marca} value={marca}>{marca}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 items-center">
            {selectedRows.size > 0 && (
              <Button size="sm" variant="outline" onClick={handleBulkEdit} data-testid="button-bulk-edit">
                <Edit3 className="w-4 h-4 mr-1" />
                Editar ({selectedRows.size})
              </Button>
            )}
            <Button size="sm" variant="outline" data-testid="button-export">
              <Download className="w-4 h-4 mr-1" />
              Exportar
            </Button>
            <Button size="sm" variant="outline" data-testid="button-import">
              <Upload className="w-4 h-4 mr-1" />
              Importar
            </Button>
          </div>
        </div>

        {/* Tabla virtualizada */}
        <div className="border rounded-lg bg-background">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedRows.size === products.length && products.length > 0}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedRows(new Set(products.map(p => p.sku)));
                      } else {
                        setSelectedRows(new Set());
                      }
                    }}
                    data-testid="checkbox-select-all"
                  />
                </TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Marca</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Costo</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product: CatalogProduct) => (
                <TableRow key={product.sku} className="hover:bg-muted/30">
                  <TableCell>
                    <Checkbox
                      checked={selectedRows.has(product.sku)}
                      onCheckedChange={(checked) => handleRowSelection(product.sku, checked as boolean)}
                      data-testid={`checkbox-select-${product.sku}`}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                  <TableCell>
                    {editingRow === product.sku ? (
                      <Input
                        value={editData.nombre_producto || product.nombre_producto || ''}
                        onChange={(e) => handleCatalogEdit(product.sku, 'nombre_producto', e.target.value)}
                        className="h-8"
                        data-testid={`input-edit-nombre-${product.sku}`}
                      />
                    ) : (
                      <span className="truncate max-w-xs">{product.nombre_producto}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {product.categoria || 'Sin categoría'}
                    </Badge>
                  </TableCell>
                  <TableCell>{product.marca_producto}</TableCell>
                  <TableCell>
                    <Badge variant={product.stock > 0 ? "default" : "destructive"}>
                      {product.stock || 0}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {editingRow === product.sku ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={editData.costo || product.costo || ''}
                        onChange={(e) => handleCatalogEdit(product.sku, 'costo', parseFloat(e.target.value))}
                        className="h-8 w-24"
                        data-testid={`input-edit-costo-${product.sku}`}
                      />
                    ) : (
                      <span>${product.costo?.toFixed(2) || '0.00'}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingRow === product.sku ? (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCatalogSave(product.sku)}
                          disabled={updateCatalogMutation.isPending}
                          data-testid={`button-save-${product.sku}`}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingRow(null);
                            setEditData({});
                          }}
                          data-testid={`button-cancel-${product.sku}`}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingRow(product.sku);
                          setEditData({});
                        }}
                        data-testid={`button-edit-${product.sku}`}
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Paginación */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div>
            Mostrando {((catalogPage - 1) * pageSize) + 1} a {Math.min(catalogPage * pageSize, total)} de {total} productos
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCatalogPage(p => Math.max(1, p - 1))}
              disabled={catalogPage === 1}
              data-testid="button-prev-page"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCatalogPage(p => p + 1)}
              disabled={catalogPage * pageSize >= total}
              data-testid="button-next-page"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderShopifyTable = () => {
    if (shopifyLoading) {
      return <div className="p-8 text-center">Cargando productos de Shopify...</div>;
    }

    const products = shopifyData?.rows || [];
    const total = shopifyData?.total || 0;

    return (
      <div className="space-y-4">
        {/* Barra de herramientas Shopify */}
        <div className="flex flex-wrap gap-2 items-center justify-between bg-muted/30 p-3 rounded-lg">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar en Shopify..."
                className="w-48 h-8"
                onChange={(e) => debouncedSearch(e.target.value)}
                data-testid="input-search-shopify"
              />
            </div>
            
            <Select 
              value={shopifyFilters.shopId} 
              onValueChange={(value) => setShopifyFilters(prev => ({ ...prev, shopId: value }))}
            >
              <SelectTrigger className="w-32 h-8" data-testid="select-shop">
                <SelectValue placeholder="Tienda" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas</SelectItem>
                <SelectItem value="1">WordWide</SelectItem>
                <SelectItem value="2">CrediTienda</SelectItem>
              </SelectContent>
            </Select>

            <Select 
              value={shopifyFilters.status} 
              onValueChange={(value) => setShopifyFilters(prev => ({ ...prev, status: value }))}
            >
              <SelectTrigger className="w-32 h-8" data-testid="select-status">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                <SelectItem value="active">Activo</SelectItem>
                <SelectItem value="draft">Borrador</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button size="sm" variant="outline" data-testid="button-sync-shopify">
              <Package className="w-4 h-4 mr-1" />
              Sincronizar
            </Button>
            <Button size="sm" variant="outline" data-testid="button-export-shopify">
              <Download className="w-4 h-4 mr-1" />
              Exportar
            </Button>
          </div>
        </div>

        {/* Tabla Shopify */}
        <div className="border rounded-lg bg-background">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Tienda</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Precio Comparación</TableHead>
                <TableHead>Inventario</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product: ShopifyProduct) => (
                <TableRow key={`${product.product_id}-${product.variant_id}`} className="hover:bg-muted/30">
                  <TableCell>
                    <Badge variant="outline">
                      {product.shop_name}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium truncate max-w-xs">{product.title}</div>
                      {product.vendor && (
                        <div className="text-xs text-muted-foreground">{product.vendor}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                  <TableCell>
                    {editingRow === `${product.variant_id}` ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={editData.price || product.price || ''}
                        onChange={(e) => handleShopifyEdit(product.variant_id, 'price', parseFloat(e.target.value))}
                        className="h-8 w-24"
                        data-testid={`input-edit-price-${product.variant_id}`}
                      />
                    ) : (
                      <span>${product.price?.toFixed(2) || '0.00'}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingRow === `${product.variant_id}` ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={editData.compare_at_price || product.compare_at_price || ''}
                        onChange={(e) => handleShopifyEdit(product.variant_id, 'compare_at_price', parseFloat(e.target.value))}
                        className="h-8 w-24"
                        data-testid={`input-edit-compare-price-${product.variant_id}`}
                      />
                    ) : (
                      <span>${product.compare_at_price?.toFixed(2) || '—'}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={product.inventory_qty > 0 ? "default" : "destructive"}>
                      {product.inventory_qty || 0}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={product.product_status === 'active' ? "default" : "secondary"}>
                      {product.product_status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {editingRow === `${product.variant_id}` ? (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleShopifySave(product.variant_id)}
                          disabled={updateShopifyMutation.isPending}
                          data-testid={`button-save-shopify-${product.variant_id}`}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingRow(null);
                            setEditData({});
                          }}
                          data-testid={`button-cancel-shopify-${product.variant_id}`}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingRow(`${product.variant_id}`);
                          setEditData({});
                        }}
                        data-testid={`button-edit-shopify-${product.variant_id}`}
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Paginación Shopify */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div>
            Mostrando {((shopifyPage - 1) * pageSize) + 1} a {Math.min(shopifyPage * pageSize, total)} de {total} productos
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShopifyPage(p => Math.max(1, p - 1))}
              disabled={shopifyPage === 1}
              data-testid="button-prev-page-shopify"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShopifyPage(p => p + 1)}
              disabled={shopifyPage * pageSize >= total}
              data-testid="button-next-page-shopify"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderReconciliationTab = () => {
    const stats = reconciliationStats as ReconciliationStats;
    const unlinked = unlinkedCatalog?.rows || [];

    return (
      <div className="space-y-6">
        {/* KPIs de conciliación */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Productos Emparejados</CardDescription>
              <CardTitle className="text-2xl text-green-600">
                {stats?.emparejados || 0}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Sin Vincular</CardDescription>
              <CardTitle className="text-2xl text-yellow-600">
                {stats?.faltantes || 0}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Conflictos</CardDescription>
              <CardTitle className="text-2xl text-red-600">
                {stats?.conflictos || 0}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Productos sin vincular del catálogo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              Productos en Catálogo sin Vincular
            </CardTitle>
            <CardDescription>
              Estos productos existen en el catálogo pero no están vinculados con Shopify
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Marca</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unlinked.map((product: any) => (
                    <TableRow key={product.sku}>
                      <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                      <TableCell>{product.nombre_producto}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{product.categoria || 'Sin categoría'}</Badge>
                      </TableCell>
                      <TableCell>{product.marca_producto}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" data-testid={`button-link-${product.sku}`}>
                          <Link2 className="w-4 h-4 mr-1" />
                          Vincular
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // ================ MAIN RENDER ================

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header compacto */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestión de Productos</h1>
          <p className="text-muted-foreground text-sm">
            Catálogo, Shopify y Conciliación en una sola vista
          </p>
        </div>
      </div>

      {/* Pestañas principales */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="catalogo" className="flex items-center gap-2" data-testid="tab-catalogo">
            <Package className="w-4 h-4" />
            Catálogo
          </TabsTrigger>
          <TabsTrigger value="shopify" className="flex items-center gap-2" data-testid="tab-shopify">
            <Layers className="w-4 h-4" />
            Shopify
          </TabsTrigger>
          <TabsTrigger value="conciliacion" className="flex items-center gap-2" data-testid="tab-conciliacion">
            <Link2 className="w-4 h-4" />
            Conciliación
          </TabsTrigger>
        </TabsList>

        <TabsContent value="catalogo" className="space-y-4">
          {renderCatalogTable()}
        </TabsContent>

        <TabsContent value="shopify" className="space-y-4">
          {renderShopifyTable()}
        </TabsContent>

        <TabsContent value="conciliacion" className="space-y-4">
          {renderReconciliationTab()}
        </TabsContent>
      </Tabs>
    </div>
  );
}