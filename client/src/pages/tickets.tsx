import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function Tickets() {
  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["/api/tickets"],
  });

  const { data: brands = [] } = useQuery({
    queryKey: ["/api/brands"],
  });

  const getBrandInfo = (brandId: string) => {
    return brands.find((b: any) => b.id === brandId) || { name: "Desconocida", code: "N/A" };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ok": return "bg-success text-white";
      case "apart": return "bg-warning text-white";
      case "stock_out": return "bg-error text-white";
      default: return "bg-gray-500 text-white";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "ok": return "OK";
      case "apart": return "APARTAR";
      case "stock_out": return "STOCK OUT";
      default: return "PENDIENTE";
    }
  };

  const handleSearchInML = (sku: string) => {
    const searchUrl = `https://listado.mercadolibre.com.mx/${encodeURIComponent(sku)}`;
    window.open(searchUrl, '_blank');
  };

  const handleNotifyBrand = (customerName: string, ticketNumber: string) => {
    const message = `Hola, necesito información sobre el ticket ${ticketNumber} para el cliente ${customerName}. ¿Podrían ayudarme?`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleExportStockOut = () => {
    // Simulate Excel export for stock out items
    alert("Exportando productos en STOCK OUT a Excel...");
  };

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
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Gestión de Tickets</h1>
        <p className="text-gray-600">Administra tickets generados y validación de stock</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary bg-opacity-10 rounded-lg flex items-center justify-center">
                <i className="fas fa-ticket-alt text-primary"></i>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Tickets</p>
                <p className="text-xl font-bold">{tickets.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-success bg-opacity-10 rounded-lg flex items-center justify-center">
                <i className="fas fa-check text-success"></i>
              </div>
              <div>
                <p className="text-sm text-gray-600">Stock OK</p>
                <p className="text-xl font-bold text-success">
                  {tickets.filter((t: any) => t.stockStatus === "ok").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-warning bg-opacity-10 rounded-lg flex items-center justify-center">
                <i className="fas fa-exclamation-triangle text-warning"></i>
              </div>
              <div>
                <p className="text-sm text-gray-600">Apartar</p>
                <p className="text-xl font-bold text-warning">
                  {tickets.filter((t: any) => t.stockStatus === "apart").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-error bg-opacity-10 rounded-lg flex items-center justify-center">
                <i className="fas fa-times text-error"></i>
              </div>
              <div>
                <p className="text-sm text-gray-600">Stock Out</p>
                <p className="text-xl font-bold text-error">
                  {tickets.filter((t: any) => t.stockStatus === "stock_out").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions Bar */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h3 className="font-medium">Acciones rápidas:</h3>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={handleExportStockOut}>
                <i className="fas fa-download mr-2"></i>
                Exportar Stock Out
              </Button>
              <Button variant="outline">
                <i className="fas fa-sync mr-2"></i>
                Validar Stock
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tickets Table */}
      <Card>
        <CardHeader>
          <CardTitle>Tickets de Productos</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticket</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Marca</TableHead>
                <TableHead>Productos</TableHead>
                <TableHead>Estado Stock</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map((ticket: any) => {
                const brand = getBrandInfo(ticket.brandId);
                const products = Array.isArray(ticket.products) ? ticket.products : [];
                
                return (
                  <TableRow key={ticket.id}>
                    <TableCell className="font-medium">
                      {ticket.ticketNumber}
                    </TableCell>
                    <TableCell>{ticket.customerName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {brand.name}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">
                        {products.length} items
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(ticket.stockStatus)}>
                        {getStatusLabel(ticket.stockStatus)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(ticket.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        {products.length > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSearchInML(products[0]?.sku || "")}
                          >
                            <i className="fas fa-search mr-1"></i>
                            Buscar ML
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleNotifyBrand(ticket.customerName, ticket.ticketNumber)}
                        >
                          <i className="fab fa-whatsapp mr-1"></i>
                          WhatsApp
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {tickets.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No hay tickets generados aún.</p>
              <p className="text-sm text-gray-400 mt-2">
                Los tickets se crean automáticamente desde la gestión de pedidos.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
