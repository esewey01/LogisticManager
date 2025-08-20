import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Search, Package, Plus, Edit3, Trash2, Download, Upload, Filter } from "lucide-react";

// Tipos para el catálogo
interface ProductCatalog {
  id: number;
  nombre: string;
  sku: string;
  descripcion?: string;
  precio?: number;
  categoria?: string;
  marca?: string;
  activo: boolean;
  inventario?: number;
  fechaCreacion: string;
  fechaActualizacion: string;
}

interface ProductVariant {
  id: number;
  productId: number;
  sku: string;
  titulo?: string;
  precio?: number;
  inventario?: number;
  activo: boolean;
}

export default function Catalogo() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [selectedProduct, setSelectedProduct] = useState<ProductCatalog | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Query para obtener productos con paginación y filtros
  const { data: productsData, isLoading } = useQuery({
    queryKey: ["/api/products", { page, pageSize, search, categoryFilter, statusFilter }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        ...(search && { search }),
        ...(categoryFilter !== "all" && { categoria: categoryFilter }),
        ...(statusFilter !== "all" && { activo: statusFilter }),
      });

      const res = await apiRequest("GET", `/api/products?${params}`);
      return res.json();
    },
    refetchInterval: 30000,
  });

  const products = productsData?.rows || [];
  const totalProducts = productsData?.total || 0;

  // Query para obtener categorías disponibles
  const { data: categories = [] } = useQuery({
    queryKey: ["/api/products/categories"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/products/categories");
      return res.json();
    },
  });

  // Mutación para crear producto
  const createProductMutation = useMutation({
    mutationFn: async (productData: Partial<ProductCatalog>) => {
      const res = await apiRequest("POST", "/api/products", productData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Producto creado",
        description: "El producto se agregó exitosamente al catálogo",
      });
      setIsCreateModalOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error al crear producto",
        description: error?.message || "No se pudo crear el producto",
        variant: "destructive",
      });
    },
  });

  // Mutación para actualizar producto
  const updateProductMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<ProductCatalog> }) => {
      const res = await apiRequest("PATCH", `/api/products/${id}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Producto actualizado",
        description: "Los cambios se guardaron correctamente",
      });
      setIsEditModalOpen(false);
      setSelectedProduct(null);
    },
  });

  // Mutación para eliminar producto
  const deleteProductMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Producto eliminado",
        description: "El producto se eliminó del catálogo",
      });
    },
  });

  const handleEditProduct = (product: ProductCatalog) => {
    setSelectedProduct(product);
    setIsEditModalOpen(true);
  };

  const handleDeleteProduct = async (product: ProductCatalog) => {
    if (confirm(`¿Estás seguro de eliminar el producto "${product.nombre}"?`)) {
      deleteProductMutation.mutate(product.id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Catálogo de Productos</h1>
          <p className="text-gray-600 mt-1">Gestiona productos, variantes e inventario</p>
        </div>

        {/* Filtros y acciones */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4">
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 flex-1">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre, SKU o descripción..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-products"
                  />
                </div>

                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full sm:w-56">
                    <SelectValue placeholder="Filtrar por categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las categorías</SelectItem>
                    {categories.map((category: string) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="true">Activos</SelectItem>
                    <SelectItem value="false">Inactivos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex space-x-2">
                <Button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                  data-testid="button-create-product"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo Producto
                </Button>

                <Button variant="outline">
                  <Upload className="mr-2 h-4 w-4" />
                  Importar CSV
                </Button>

                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Exportar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabla de productos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Productos ({totalProducts})</span>
              <div className="text-sm text-gray-500">
                Página {page} de {Math.ceil(totalProducts / pageSize) || 1}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Inventario</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product: ProductCatalog) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{product.nombre}</div>
                        {product.descripcion && (
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {product.descripcion}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{product.sku}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{product.categoria || "Sin categoría"}</Badge>
                    </TableCell>
                    <TableCell>
                      {product.precio ? `$${product.precio.toLocaleString()} MXN` : "No definido"}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          !product.inventario ? "destructive" : 
                          product.inventario < 10 ? "outline" : "default"
                        }
                      >
                        {product.inventario || 0}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={product.activo ? "default" : "secondary"}>
                        {product.activo ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditProduct(product)}
                          data-testid={`button-edit-${product.id}`}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteProduct(product)}
                          className="text-red-600 hover:text-red-700"
                          data-testid={`button-delete-${product.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Paginación */}
            {totalProducts > pageSize && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-gray-500">
                  Mostrando {((page - 1) * pageSize) + 1} a {Math.min(page * pageSize, totalProducts)} de {totalProducts} productos
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setPage(page - 1)}
                    disabled={page <= 1}
                    data-testid="button-prev-page"
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setPage(page + 1)}
                    disabled={page >= Math.ceil(totalProducts / pageSize)}
                    data-testid="button-next-page"
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal de creación/edición */}
        <ProductModal
          isOpen={isCreateModalOpen || isEditModalOpen}
          onClose={() => {
            setIsCreateModalOpen(false);
            setIsEditModalOpen(false);
            setSelectedProduct(null);
          }}
          product={selectedProduct}
          onSubmit={(data) => {
            if (selectedProduct) {
              updateProductMutation.mutate({ id: selectedProduct.id, updates: data });
            } else {
              createProductMutation.mutate(data);
            }
          }}
          isLoading={createProductMutation.isPending || updateProductMutation.isPending}
        />
      </div>
    </div>
  );
}

// Componente del modal para crear/editar productos
interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: ProductCatalog | null;
  onSubmit: (data: Partial<ProductCatalog>) => void;
  isLoading: boolean;
}

function ProductModal({ isOpen, onClose, product, onSubmit, isLoading }: ProductModalProps) {
  const [formData, setFormData] = useState<Partial<ProductCatalog>>({
    nombre: "",
    sku: "",
    descripcion: "",
    precio: 0,
    categoria: "",
    marca: "",
    activo: true,
    inventario: 0,
  });

  React.useEffect(() => {
    if (product) {
      setFormData(product);
    } else {
      setFormData({
        nombre: "",
        sku: "",
        descripcion: "",
        precio: 0,
        categoria: "",
        marca: "",
        activo: true,
        inventario: 0,
      });
    }
  }, [product]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {product ? "Editar Producto" : "Nuevo Producto"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="nombre">Nombre *</Label>
            <Input
              id="nombre"
              value={formData.nombre || ""}
              onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
              required
              data-testid="input-product-name"
            />
          </div>

          <div>
            <Label htmlFor="sku">SKU *</Label>
            <Input
              id="sku"
              value={formData.sku || ""}
              onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
              required
              data-testid="input-product-sku"
            />
          </div>

          <div>
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea
              id="descripcion"
              value={formData.descripcion || ""}
              onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
              rows={3}
              data-testid="textarea-product-description"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="precio">Precio</Label>
              <Input
                id="precio"
                type="number"
                step="0.01"
                value={formData.precio || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, precio: parseFloat(e.target.value) || 0 }))}
                data-testid="input-product-price"
              />
            </div>

            <div>
              <Label htmlFor="inventario">Inventario</Label>
              <Input
                id="inventario"
                type="number"
                value={formData.inventario || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, inventario: parseInt(e.target.value) || 0 }))}
                data-testid="input-product-inventory"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="categoria">Categoría</Label>
              <Input
                id="categoria"
                value={formData.categoria || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, categoria: e.target.value }))}
                data-testid="input-product-category"
              />
            </div>

            <div>
              <Label htmlFor="marca">Marca</Label>
              <Input
                id="marca"
                value={formData.marca || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, marca: e.target.value }))}
                data-testid="input-product-brand"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="activo"
              checked={formData.activo || false}
              onChange={(e) => setFormData(prev => ({ ...prev, activo: e.target.checked }))}
              data-testid="checkbox-product-active"
            />
            <Label htmlFor="activo">Producto activo</Label>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Guardando..." : product ? "Actualizar" : "Crear"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}