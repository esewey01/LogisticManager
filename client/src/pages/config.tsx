import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Config() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // Form states
  const [newBrand, setNewBrand] = useState({ name: "", code: "" });
  const [newCarrier, setNewCarrier] = useState({ name: "", code: "", apiEndpoint: "" });
  const [newChannel, setNewChannel] = useState({ code: "", name: "", color: "#4CAF50", icon: "fas fa-circle" });
  const [catalogFile, setCatalogFile] = useState<File | null>(null);
  const [isAddBrandOpen, setIsAddBrandOpen] = useState(false);
  const [isAddCarrierOpen, setIsAddCarrierOpen] = useState(false);
  const [isAddChannelOpen, setIsAddChannelOpen] = useState(false);

  // Redirect if not admin
  useEffect(() => {
    if (user && user.role !== "admin") {
      setLocation("/");
    }
  }, [user, setLocation]);

  // Queries
  const { data: brands = [], isLoading: brandsLoading } = useQuery({
    queryKey: ["/api/brands"],
    enabled: user?.role === "admin",
  });

  const { data: carriers = [], isLoading: carriersLoading } = useQuery({
    queryKey: ["/api/carriers"],
    enabled: user?.role === "admin",
  });

  const { data: channels = [], isLoading: channelsLoading } = useQuery({
    queryKey: ["/api/channels"],
    enabled: user?.role === "admin",
  });

  const { data: shippingRules = [], isLoading: rulesLoading } = useQuery({
    queryKey: ["/api/shipping-rules"],
    enabled: user?.role === "admin",
  });

  // Mutations
  const addBrandMutation = useMutation({
    mutationFn: async (brand: { name: string; code: string }) => {
      await apiRequest("POST", "/api/brands", brand);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/brands"] });
      setNewBrand({ name: "", code: "" });
      setIsAddBrandOpen(false);
    },
  });

  const addCarrierMutation = useMutation({
    mutationFn: async (carrier: { name: string; code: string; apiEndpoint: string }) => {
      await apiRequest("POST", "/api/carriers", carrier);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/carriers"] });
      setNewCarrier({ name: "", code: "", apiEndpoint: "" });
      setIsAddCarrierOpen(false);
    },
  });

  const addChannelMutation = useMutation({
    mutationFn: async (channel: { code: string; name: string; color: string; icon: string }) => {
      await apiRequest("POST", "/api/channels", channel);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/channels"] });
      setNewChannel({ code: "", name: "", color: "#4CAF50", icon: "fas fa-circle" });
      setIsAddChannelOpen(false);
    },
  });

  const uploadCatalogMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/catalog/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!response.ok) throw new Error("Upload failed");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/catalog-products"] });
      setCatalogFile(null);
    },
  });

  const handleAddBrand = (e: React.FormEvent) => {
    e.preventDefault();
    if (newBrand.name && newBrand.code) {
      addBrandMutation.mutate(newBrand);
    }
  };

  const handleAddCarrier = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCarrier.name && newCarrier.code) {
      addCarrierMutation.mutate(newCarrier);
    }
  };

  const handleAddChannel = (e: React.FormEvent) => {
    e.preventDefault();
    if (newChannel.code && newChannel.name) {
      addChannelMutation.mutate(newChannel);
    }
  };

  const handleCatalogUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (catalogFile) {
      const formData = new FormData();
      formData.append("catalog", catalogFile);
      uploadCatalogMutation.mutate(formData);
    }
  };

  if (user?.role !== "admin") {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <i className="fas fa-lock text-gray-300 text-4xl mb-4"></i>
          <p className="text-gray-500">Acceso restringido para administradores</p>
        </div>
      </div>
    );
  }

  const isLoading = brandsLoading || carriersLoading || channelsLoading || rulesLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Configuración del Sistema</h1>
        <p className="text-gray-600">Gestiona marcas, proveedores, canales y reglas de negocio</p>
      </div>

      <Tabs defaultValue="brands" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="brands">Marcas</TabsTrigger>
          <TabsTrigger value="carriers">Paqueterías</TabsTrigger>
          <TabsTrigger value="channels">Canales</TabsTrigger>
          <TabsTrigger value="rules">Reglas</TabsTrigger>
        </TabsList>

        {/* Brands Tab */}
        <TabsContent value="brands" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Gestión de Marcas</CardTitle>
                <Dialog open={isAddBrandOpen} onOpenChange={setIsAddBrandOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <i className="fas fa-plus mr-2"></i>
                      Agregar Marca
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Agregar Nueva Marca</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddBrand} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="brand-name">Nombre de la Marca</Label>
                        <Input
                          id="brand-name"
                          value={newBrand.name}
                          onChange={(e) => setNewBrand({ ...newBrand, name: e.target.value })}
                          placeholder="Ej: ELEGATE"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="brand-code">Código</Label>
                        <Input
                          id="brand-code"
                          value={newBrand.code}
                          onChange={(e) => setNewBrand({ ...newBrand, code: e.target.value.toUpperCase() })}
                          placeholder="Ej: ELG"
                          required
                        />
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={() => setIsAddBrandOpen(false)}>
                          Cancelar
                        </Button>
                        <Button type="submit" disabled={addBrandMutation.isPending}>
                          {addBrandMutation.isPending ? "Guardando..." : "Guardar"}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha Creación</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {brands.map((brand: any) => (
                    <TableRow key={brand.id}>
                      <TableCell className="font-medium">{brand.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{brand.code}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={brand.isActive ? "default" : "secondary"}>
                          {brand.isActive ? "Activa" : "Inactiva"}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(brand.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline">
                            <i className="fas fa-edit mr-1"></i>
                            Editar
                          </Button>
                          <Button size="sm" variant="outline">
                            <i className="fas fa-upload mr-1"></i>
                            Subir Catálogo
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {brands.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">No hay marcas registradas</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Catalog Upload */}
          <Card>
            <CardHeader>
              <CardTitle>Subir Catálogo de Productos</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCatalogUpload} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="catalog-file">Archivo Excel (.xlsx)</Label>
                  <Input
                    id="catalog-file"
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => setCatalogFile(e.target.files?.[0] || null)}
                  />
                  <p className="text-sm text-gray-500">
                    El archivo debe contener las columnas: marca, sku, producto, precio, stock_disponible
                  </p>
                </div>
                <Button
                  type="submit"
                  disabled={!catalogFile || uploadCatalogMutation.isPending}
                >
                  {uploadCatalogMutation.isPending ? "Subiendo..." : "Subir Catálogo"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Carriers Tab */}
        <TabsContent value="carriers" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Gestión de Paqueterías</CardTitle>
                <Dialog open={isAddCarrierOpen} onOpenChange={setIsAddCarrierOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <i className="fas fa-plus mr-2"></i>
                      Agregar Paquetería
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Agregar Nueva Paquetería</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddCarrier} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="carrier-name">Nombre</Label>
                        <Input
                          id="carrier-name"
                          value={newCarrier.name}
                          onChange={(e) => setNewCarrier({ ...newCarrier, name: e.target.value })}
                          placeholder="Ej: Estafeta"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="carrier-code">Código</Label>
                        <Input
                          id="carrier-code"
                          value={newCarrier.code}
                          onChange={(e) => setNewCarrier({ ...newCarrier, code: e.target.value.toUpperCase() })}
                          placeholder="Ej: ESTAFETA"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="carrier-api">Endpoint API</Label>
                        <Input
                          id="carrier-api"
                          value={newCarrier.apiEndpoint}
                          onChange={(e) => setNewCarrier({ ...newCarrier, apiEndpoint: e.target.value })}
                          placeholder="https://api.ejemplo.com"
                        />
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={() => setIsAddCarrierOpen(false)}>
                          Cancelar
                        </Button>
                        <Button type="submit" disabled={addCarrierMutation.isPending}>
                          {addCarrierMutation.isPending ? "Guardando..." : "Guardar"}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Endpoint API</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {carriers.map((carrier: any) => (
                    <TableRow key={carrier.id}>
                      <TableCell className="font-medium">{carrier.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{carrier.code}</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {carrier.apiEndpoint || "No configurado"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={carrier.isActive ? "default" : "secondary"}>
                          {carrier.isActive ? "Activa" : "Inactiva"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline">
                            <i className="fas fa-edit mr-1"></i>
                            Editar
                          </Button>
                          <Button size="sm" variant="outline">
                            <i className="fas fa-plug mr-1"></i>
                            Probar API
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Channels Tab */}
        <TabsContent value="channels" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Gestión de Canales</CardTitle>
                <Dialog open={isAddChannelOpen} onOpenChange={setIsAddChannelOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <i className="fas fa-plus mr-2"></i>
                      Agregar Canal
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Agregar Nuevo Canal</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddChannel} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="channel-code">Código</Label>
                        <Input
                          id="channel-code"
                          value={newChannel.code}
                          onChange={(e) => setNewChannel({ ...newChannel, code: e.target.value.toUpperCase() })}
                          placeholder="Ej: WW"
                          maxLength={10}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="channel-name">Nombre</Label>
                        <Input
                          id="channel-name"
                          value={newChannel.name}
                          onChange={(e) => setNewChannel({ ...newChannel, name: e.target.value })}
                          placeholder="Ej: WW Channel"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="channel-color">Color</Label>
                        <div className="flex items-center space-x-2">
                          <Input
                            id="channel-color"
                            type="color"
                            value={newChannel.color}
                            onChange={(e) => setNewChannel({ ...newChannel, color: e.target.value })}
                            className="w-16 h-10"
                          />
                          <span className="text-sm text-gray-500">{newChannel.color}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="channel-icon">Icono (Font Awesome)</Label>
                        <Select 
                          value={newChannel.icon} 
                          onValueChange={(value) => setNewChannel({ ...newChannel, icon: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un icono" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fas fa-globe">
                              <i className="fas fa-globe mr-2"></i>
                              Globo (WW)
                            </SelectItem>
                            <SelectItem value="fas fa-store">
                              <i className="fas fa-store mr-2"></i>
                              Tienda (CT)
                            </SelectItem>
                            <SelectItem value="fas fa-shopping-cart">
                              <i className="fas fa-shopping-cart mr-2"></i>
                              Carrito (MGL)
                            </SelectItem>
                            <SelectItem value="fas fa-circle">
                              <i className="fas fa-circle mr-2"></i>
                              Círculo
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={() => setIsAddChannelOpen(false)}>
                          Cancelar
                        </Button>
                        <Button type="submit" disabled={addChannelMutation.isPending}>
                          {addChannelMutation.isPending ? "Guardando..." : "Guardar"}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Canal</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {channels.map((channel: any) => (
                    <TableRow key={channel.id}>
                      <TableCell>
                        <Badge 
                          style={{ backgroundColor: `${channel.color}20`, color: channel.color }}
                          className="border-0"
                        >
                          <i className={`${channel.icon} mr-1`}></i>
                          {channel.code}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{channel.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <div 
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: channel.color }}
                          ></div>
                          <span className="text-sm text-gray-600">{channel.color}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={channel.isActive ? "default" : "secondary"}>
                          {channel.isActive ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline">
                          <i className="fas fa-edit mr-1"></i>
                          Editar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Shipping Rules Tab */}
        <TabsContent value="rules" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Reglas de Asignación de Paqueterías</CardTitle>
                <Button>
                  <i className="fas fa-plus mr-2"></i>
                  Agregar Regla
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Define qué paquetería se asigna automáticamente según la marca del producto.
                </p>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Marca</TableHead>
                      <TableHead>Paquetería</TableHead>
                      <TableHead>Prioridad</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shippingRules.map((rule: any) => (
                      <TableRow key={rule.id}>
                        <TableCell>
                          <Badge variant="outline">
                            {brands.find((b: any) => b.id === rule.brandId)?.name || "Desconocida"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {carriers.find((c: any) => c.id === rule.carrierId)?.name || "Desconocida"}
                        </TableCell>
                        <TableCell>{rule.priority}</TableCell>
                        <TableCell>
                          <Badge variant={rule.isActive ? "default" : "secondary"}>
                            {rule.isActive ? "Activa" : "Inactiva"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline">
                              <i className="fas fa-edit mr-1"></i>
                              Editar
                            </Button>
                            <Button size="sm" variant="outline">
                              <i className="fas fa-trash mr-1"></i>
                              Eliminar
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {shippingRules.length === 0 && (
                  <div className="text-center py-8">
                    <i className="fas fa-route text-gray-300 text-4xl mb-4"></i>
                    <p className="text-gray-500">No hay reglas de asignación configuradas</p>
                    <p className="text-sm text-gray-400 mt-2">
                      Las reglas permiten asignar automáticamente paqueterías según la marca del producto.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Default Rules Info */}
          <Card>
            <CardHeader>
              <CardTitle>Configuración Predeterminada</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">ELEGATE → Estafeta</p>
                    <p className="text-sm text-gray-600">Regla por defecto para productos ELEGATE</p>
                  </div>
                  <Badge variant="default">Activa</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">Alto valor → DHL</p>
                    <p className="text-sm text-gray-600">Productos con valor mayor a $1,000 MXN</p>
                  </div>
                  <Badge variant="secondary">Futura implementación</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">Local → Express PL</p>
                    <p className="text-sm text-gray-600">Envíos dentro de la ciudad</p>
                  </div>
                  <Badge variant="secondary">Futura implementación</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
