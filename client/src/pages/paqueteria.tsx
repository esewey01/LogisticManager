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

export default function Paqueteria() {
  const { data: carriers = [], isLoading: carriersLoading } = useQuery({
    queryKey: ["/api/carriers"],
  });

  const { data: tickets = [], isLoading: ticketsLoading } = useQuery({
    queryKey: ["/api/tickets"],
  });

  const { data: brands = [] } = useQuery({
    queryKey: ["/api/brands"],
  });

  const getCarrierInfo = (carrierId: string) => {
    return carriers.find((c: any) => c.id === carrierId) || { name: "Sin asignar", code: "N/A" };
  };

  const getBrandInfo = (brandId: string) => {
    return brands.find((b: any) => b.id === brandId) || { name: "Desconocida", code: "N/A" };
  };

  const handleGenerateGuide = (ticketId: string) => {
    // Simulate guide generation
    alert(`Generando guía para ticket ${ticketId}...`);
  };

  const handleSchedulePickup = (ticket: any) => {
    const message = `Hola, necesito agendar recolección para:\n\nTicket: ${ticket.ticketNumber}\nCliente: ${ticket.customerName}\nProductos: ${Array.isArray(ticket.products) ? ticket.products.length : 0} items\n\n¿Cuándo pueden pasar a recoger?`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleBulkGuides = () => {
    alert("Generando guías masivas...");
  };

  const isLoading = carriersLoading || ticketsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Filter tickets that need shipping
  const shippableTickets = tickets.filter((ticket: any) => 
    ticket.stockStatus === "ok" && ticket.status !== "shipped"
  );

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Gestión de Paquetería</h1>
        <p className="text-gray-600">Administra envíos y asignación de paqueterías</p>
      </div>

      {/* Carriers Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {carriers.map((carrier: any) => (
          <Card key={carrier.id}>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-primary bg-opacity-10 rounded-lg flex items-center justify-center">
                  <i className="fas fa-truck text-primary text-xl"></i>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{carrier.name}</h3>
                  <p className="text-sm text-gray-600">Código: {carrier.code}</p>
                  <div className="flex items-center space-x-2 mt-2">
                    <Badge variant={carrier.isActive ? "default" : "secondary"}>
                      {carrier.isActive ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {carriers.length === 0 && (
          <Card className="col-span-3">
            <CardContent className="p-6 text-center">
              <p className="text-gray-500">No hay paqueterías configuradas</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Actions Bar */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h3 className="font-medium">Gestión de Envíos:</h3>
              <Badge variant="outline">
                {shippableTickets.length} tickets listos para envío
              </Badge>
            </div>
            <div className="flex space-x-2">
              <Button onClick={handleBulkGuides} disabled={shippableTickets.length === 0}>
                <i className="fas fa-download mr-2"></i>
                Generar Guías Masivas
              </Button>
              <Button variant="outline">
                <i className="fas fa-calendar mr-2"></i>
                Agendar Recolecciones
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shipping Table */}
      <Card>
        <CardHeader>
          <CardTitle>Tickets para Envío</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticket</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Marca</TableHead>
                <TableHead>Paquetería</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Guía</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shippableTickets.map((ticket: any) => {
                const carrier = getCarrierInfo(ticket.carrierId);
                const brand = getBrandInfo(ticket.brandId);
                
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
                      <Badge variant={carrier.name !== "Sin asignar" ? "default" : "secondary"}>
                        {carrier.name}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {ticket.status === "pending" ? "Pendiente" : ticket.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {ticket.trackingNumber ? (
                        <Badge variant="outline">
                          {ticket.trackingNumber}
                        </Badge>
                      ) : (
                        <span className="text-gray-400">Sin generar</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          onClick={() => handleGenerateGuide(ticket.id)}
                          disabled={!!ticket.trackingNumber}
                        >
                          <i className="fas fa-receipt mr-1"></i>
                          {ticket.trackingNumber ? "Generada" : "Generar Guía"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSchedulePickup(ticket)}
                        >
                          <i className="fab fa-whatsapp mr-1"></i>
                          Agendar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {shippableTickets.length === 0 && (
            <div className="text-center py-8">
              <i className="fas fa-shipping-fast text-gray-300 text-4xl mb-4"></i>
              <p className="text-gray-500">No hay tickets listos para envío</p>
              <p className="text-sm text-gray-400 mt-2">
                Los tickets aparecerán aquí cuando tengan stock confirmado (estado OK).
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Shipping Rules Card */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Reglas de Asignación</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-600">
            <p className="mb-2">
              <strong>Configuración actual:</strong> Las paqueterías se asignan automáticamente según las reglas configuradas por marca.
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>ELEGATE → Estafeta (configuración por defecto)</li>
              <li>Productos de alto valor → DHL</li>
              <li>Envíos locales → Express PL</li>
            </ul>
            <p className="mt-3 text-xs">
              Las reglas pueden modificarse desde el panel de configuración (solo administradores).
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
