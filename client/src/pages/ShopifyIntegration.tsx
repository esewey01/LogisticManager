import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface ShopifyPingResponse {
  ok: boolean;
  store: string;
  shop: string;
  count: number;
  apiVersion: string;
  error?: string;
}

interface SyncResult {
  ok: boolean;
  message: string;
  ordersProcessed?: number;
  productsProcessed?: number;
  hasNextPage?: boolean;
  errors?: string[];
}

// Helper function for API requests
const apiRequest = async (url: string, options?: RequestInit) => {
  const response = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || `Error ${response.status}`);
  }
  
  return response.json();
};

export default function ShopifyIntegration() {
  const [selectedStore, setSelectedStore] = useState('1');
  const [syncParams, setSyncParams] = useState({
    limit: 50,
    updatedSince: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // últimas 24h
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query para ping de Shopify
  const { data: pingData, isLoading: pingLoading, refetch: refetchPing } = useQuery<ShopifyPingResponse>({
    queryKey: ['/api/integrations/shopify/ping-count', selectedStore],
    queryFn: () => apiRequest(`/api/integrations/shopify/ping-count?store=${selectedStore}`),
    retry: false,
  });

  // Query para productos
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['/api/integrations/shopify/products', selectedStore],
    queryFn: () => apiRequest(`/api/integrations/shopify/products?store=${selectedStore}`),
    enabled: pingData?.ok === true,
  });

  // Mutación para backfill de órdenes
  const backfillMutation = useMutation({
    mutationFn: (params: { since?: string; limit: number }) =>
      apiRequest(`/api/integrations/shopify/orders/backfill?store=${selectedStore}&limit=${params.limit}${params.since ? `&since=${params.since}` : ''}`, {
        method: 'POST',
      }),
    onSuccess: (data: SyncResult) => {
      toast({
        title: "Backfill completado",
        description: `${data.ordersProcessed} órdenes procesadas para tienda ${selectedStore}`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error en backfill",
        description: error.message || "No se pudo completar el backfill",
        variant: "destructive",
      });
    },
  });

  // Mutación para sync incremental
  const incrementalSyncMutation = useMutation({
    mutationFn: (updatedSince: string) =>
      apiRequest(`/api/integrations/shopify/orders/sync?store=${selectedStore}&updatedSince=${updatedSince}`, {
        method: 'POST',
      }),
    onSuccess: (data: SyncResult) => {
      toast({
        title: "Sync incremental completado",
        description: `${data.ordersProcessed} órdenes procesadas`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error en sync incremental",
        description: error.message || "No se pudo completar la sincronización",
        variant: "destructive",
      });
    },
  });

  // Mutación para sync de productos
  const productSyncMutation = useMutation({
    mutationFn: (limit: number) =>
      apiRequest(`/api/integrations/shopify/products/sync?store=${selectedStore}&limit=${limit}`, {
        method: 'POST',
      }),
    onSuccess: (data: SyncResult) => {
      toast({
        title: "Productos sincronizados",
        description: `${data.productsProcessed} productos procesados`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/integrations/shopify/products', selectedStore] });
    },
    onError: (error: any) => {
      toast({
        title: "Error sincronizando productos",
        description: error.message || "No se pudieron sincronizar los productos",
        variant: "destructive",
      });
    },
  });

  const handleBackfill = () => {
    backfillMutation.mutate({
      limit: syncParams.limit,
      since: undefined, // Backfill completo
    });
  };

  const handleIncrementalSync = () => {
    incrementalSyncMutation.mutate(syncParams.updatedSince);
  };

  const handleProductSync = () => {
    productSyncMutation.mutate(syncParams.limit);
  };

  return (
    <div className="p-6 space-y-6" data-testid="shopify-integration-page">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold" data-testid="page-title">Integración Shopify</h1>
        <div className="flex items-center gap-4">
          <Label htmlFor="store-select">Tienda:</Label>
          <select
            id="store-select"
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
            className="px-3 py-2 border rounded-md"
            data-testid="store-selector"
          >
            <option value="1">Tienda 1</option>
            <option value="2">Tienda 2</option>
          </select>
        </div>
      </div>

      {/* Estado de conexión */}
      <Card data-testid="connection-status-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {pingLoading ? (
              <i className="fas fa-sync-alt animate-spin" />
            ) : pingData?.ok ? (
              <i className="fas fa-check-circle text-green-600" />
            ) : (
              <i className="fas fa-exclamation-circle text-red-600" />
            )}
            Estado de Conexión - Tienda {selectedStore}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {pingData && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-sm text-muted-foreground">Tienda</Label>
                <p className="font-medium" data-testid="shop-domain">{pingData.shop || 'No disponible'}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">API Version</Label>
                <p className="font-medium">{pingData.apiVersion}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Total Órdenes</Label>
                <p className="font-medium" data-testid="orders-count">{pingData.count || 0}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Estado</Label>
                <Badge variant={pingData.ok ? "default" : "destructive"} data-testid="connection-status">
                  {pingData.ok ? "Conectado" : "Error"}
                </Badge>
              </div>
            </div>
          )}
          
          {pingData?.error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800" data-testid="connection-error">{pingData.error}</p>
            </div>
          )}

          <Button
            onClick={() => refetchPing()}
            disabled={pingLoading}
            variant="outline"
            data-testid="button-refresh-connection"
          >
            {pingLoading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
            Verificar Conexión
          </Button>
        </CardContent>
      </Card>

      {/* Sincronización de órdenes */}
      <Card data-testid="orders-sync-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Sincronización de Órdenes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="limit-input">Límite por lote</Label>
              <Input
                id="limit-input"
                type="number"
                value={syncParams.limit}
                onChange={(e) => setSyncParams(prev => ({ ...prev, limit: parseInt(e.target.value) || 50 }))}
                min="1"
                max="250"
                data-testid="input-sync-limit"
              />
            </div>
            <div>
              <Label htmlFor="updated-since-input">Actualizado desde</Label>
              <Input
                id="updated-since-input"
                type="datetime-local"
                value={syncParams.updatedSince.slice(0, 16)}
                onChange={(e) => setSyncParams(prev => ({ 
                  ...prev, 
                  updatedSince: new Date(e.target.value).toISOString() 
                }))}
                data-testid="input-updated-since"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <Button
              onClick={handleBackfill}
              disabled={backfillMutation.isPending || !pingData?.ok}
              data-testid="button-backfill-orders"
            >
              {backfillMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
              Backfill Completo
            </Button>
            
            <Button
              onClick={handleIncrementalSync}
              disabled={incrementalSyncMutation.isPending || !pingData?.ok}
              variant="outline"
              data-testid="button-incremental-sync"
            >
              {incrementalSyncMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
              Sync Incremental
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Gestión de productos */}
      <Card data-testid="products-management-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Gestión de Productos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Productos en BD local: <span className="font-medium" data-testid="local-products-count">
                  {productsData?.count || 0}
                </span>
              </p>
            </div>
            <Button
              onClick={handleProductSync}
              disabled={productSyncMutation.isPending || !pingData?.ok}
              data-testid="button-sync-products"
            >
              {productSyncMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
              Sincronizar Productos
            </Button>
          </div>

          {productsLoading && (
            <div className="flex justify-center py-4">
              <RefreshCw className="h-6 w-6 animate-spin" />
            </div>
          )}

          {productsData?.products && productsData.products.length > 0 && (
            <div className="max-h-40 overflow-y-auto border rounded-md">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-2">Título</th>
                    <th className="text-left p-2">Vendor</th>
                    <th className="text-left p-2">Estado</th>
                    <th className="text-left p-2">ID Shopify</th>
                  </tr>
                </thead>
                <tbody>
                  {productsData.products.slice(0, 10).map((product: any) => (
                    <tr key={product.id} className="border-t">
                      <td className="p-2" data-testid={`product-title-${product.id}`}>{product.title}</td>
                      <td className="p-2">{product.vendor || '-'}</td>
                      <td className="p-2">
                        <Badge variant={product.status === 'active' ? 'default' : 'secondary'}>
                          {product.status}
                        </Badge>
                      </td>
                      <td className="p-2 font-mono text-xs">{product.idShopify}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {productsData.products.length > 10 && (
                <div className="p-2 text-center text-xs text-muted-foreground border-t">
                  ... y {productsData.products.length - 10} productos más
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}