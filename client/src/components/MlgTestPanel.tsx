// MLG-INTEGRATION: Comprehensive test panel for all MLG endpoints
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  useMlgCategories, 
  useMlgSubcategories, 
  useMlgBrands, 
  useMlgCommissions,
  useMlgProducts,
  useMlgSales,
  useMlgBulkProducts,
  useMlgUpdateStock,
  useMlgGenerateShippingLabel,
  type ProductsRequest,
  type SalesRequest
} from "@/hooks/mlg";
import { useToast } from "@/hooks/use-toast";

export function MlgTestPanel() {
  const [providerId, setProviderId] = useState("123"); // Default provider ID
  const [stockProductId, setStockProductId] = useState("");
  const [stockAmount, setStockAmount] = useState("");
  const { toast } = useToast();

  // Queries
  const categories = useMlgCategories();
  const subcategories = useMlgSubcategories();
  const brands = useMlgBrands();
  const commissions = useMlgCommissions();
  
  const productsRequest: ProductsRequest = {
    idProveedor: Number(providerId) || 1,
    pagina: 1,
    registros: 5
  };
  const products = useMlgProducts(productsRequest);

  const salesRequest: SalesRequest = {
    providerId: Number(providerId) || 1,
    page: 1,
    totalRows: 5
  };
  const sales = useMlgSales(salesRequest);

  // Mutations
  const bulkProducts = useMlgBulkProducts({
    onSuccess: () => toast({ title: "Bulk products", description: "Success!" }),
    onError: (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" })
  });

  const updateStock = useMlgUpdateStock({
    onSuccess: () => toast({ title: "Stock updated", description: "Success!" }),
    onError: (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" })
  });

  const generateLabel = useMlgGenerateShippingLabel({
    onSuccess: () => toast({ title: "Shipping label", description: "Success!" }),
    onError: (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" })
  });

  const handleBulkProducts = () => {
    bulkProducts.mutate({
      products: [
        { 
          nombre: "Producto Test", 
          precio: 100, 
          descripcion: "Test product from bulk upload" 
        }
      ]
    });
  };

  const handleUpdateStock = () => {
    if (!stockProductId || !stockAmount) {
      toast({ title: "Error", description: "Product ID and stock amount required", variant: "destructive" });
      return;
    }
    updateStock.mutate({
      idProducto: Number(stockProductId),
      stock: Number(stockAmount)
    });
  };

  const handleGenerateLabel = () => {
    generateLabel.mutate({
      idProveedor: Number(providerId),
      idCanje: 123,
      productos: [{ id: 1, cantidad: 1 }]
    });
  };

  const DataDisplay = ({ title, data, isLoading, error }: any) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">{title}</h4>
        {isLoading && <Badge variant="secondary">Loading...</Badge>}
        {error && <Badge variant="destructive">Error</Badge>}
      </div>
      {error ? (
        <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
          {error.message}
        </div>
      ) : (
        <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-32">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>MLG API Test Panel</span>
          <Badge variant="outline">Integration Complete</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="queries" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="queries">Queries</TabsTrigger>
            <TabsTrigger value="mutations">Mutations</TabsTrigger>
            <TabsTrigger value="config">Config</TabsTrigger>
          </TabsList>

          <TabsContent value="queries" className="space-y-4">
            <DataDisplay 
              title="Categories" 
              data={categories.data} 
              isLoading={categories.isLoading} 
              error={categories.error} 
            />
            
            <Separator />
            
            <DataDisplay 
              title="Subcategories" 
              data={subcategories.data} 
              isLoading={subcategories.isLoading} 
              error={subcategories.error} 
            />
            
            <Separator />
            
            <DataDisplay 
              title="Brands" 
              data={brands.data} 
              isLoading={brands.isLoading} 
              error={brands.error} 
            />
            
            <Separator />
            
            <DataDisplay 
              title="Commissions" 
              data={commissions.data} 
              isLoading={commissions.isLoading} 
              error={commissions.error} 
            />
            
            <Separator />
            
            <DataDisplay 
              title="Products" 
              data={products.data} 
              isLoading={products.isLoading} 
              error={products.error} 
            />
            
            <Separator />
            
            <DataDisplay 
              title="Sales" 
              data={sales.data} 
              isLoading={sales.isLoading} 
              error={sales.error} 
            />
          </TabsContent>

          <TabsContent value="mutations" className="space-y-4">
            <div className="space-y-3">
              <h4 className="font-medium">Bulk Products Upload</h4>
              <Button 
                onClick={handleBulkProducts} 
                disabled={bulkProducts.isPending}
                data-testid="button-bulk-products"
              >
                {bulkProducts.isPending ? "Uploading..." : "Test Bulk Upload"}
              </Button>
            </div>

            <Separator />

            <div className="space-y-3">
              <h4 className="font-medium">Update Stock</h4>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Product ID"
                  value={stockProductId}
                  onChange={(e) => setStockProductId(e.target.value)}
                  data-testid="input-product-id"
                />
                <Input
                  placeholder="Stock Amount"
                  value={stockAmount}
                  onChange={(e) => setStockAmount(e.target.value)}
                  data-testid="input-stock-amount"
                />
              </div>
              <Button 
                onClick={handleUpdateStock} 
                disabled={updateStock.isPending}
                data-testid="button-update-stock"
              >
                {updateStock.isPending ? "Updating..." : "Update Stock"}
              </Button>
            </div>

            <Separator />

            <div className="space-y-3">
              <h4 className="font-medium">Generate Shipping Label</h4>
              <Button 
                onClick={handleGenerateLabel} 
                disabled={generateLabel.isPending}
                data-testid="button-generate-label"
              >
                {generateLabel.isPending ? "Generating..." : "Generate Test Label"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="config" className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">Provider Configuration</h4>
              <Input
                placeholder="Provider ID"
                value={providerId}
                onChange={(e) => setProviderId(e.target.value)}
                data-testid="input-provider-id"
              />
              <p className="text-sm text-muted-foreground">
                Change the Provider ID to test different provider contexts
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <h4 className="font-medium">Available Endpoints</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Badge variant="outline">GET /api/mlg/categories</Badge>
                <Badge variant="outline">GET /api/mlg/subcategories</Badge>
                <Badge variant="outline">GET /api/mlg/brands</Badge>
                <Badge variant="outline">GET /api/mlg/commissions</Badge>
                <Badge variant="outline">POST /api/mlg/products</Badge>
                <Badge variant="outline">POST /api/mlg/sales</Badge>
                <Badge variant="outline">POST /api/mlg/products/bulk</Badge>
                <Badge variant="outline">POST /api/mlg/products/update-stock</Badge>
                <Badge variant="outline">POST /api/mlg/sales/generate-shipping-label</Badge>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}