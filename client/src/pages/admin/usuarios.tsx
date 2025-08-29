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
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function AdminUsuarios() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect if not admin
  useEffect(() => {
    if (user && user.role !== "admin") {
      setLocation("/");
    }
  }, [user, setLocation]);

  const { data: users = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/users"],
    enabled: user?.role === "admin",
  });

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
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Gestión de Usuarios</h1>
        <p className="text-gray-600">Administra usuarios del sistema y sus permisos</p>
      </div>

      {/* User Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary bg-opacity-10 rounded-lg flex items-center justify-center">
                <i className="fas fa-users text-primary"></i>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Usuarios</p>
                <p className="text-xl font-bold">{users.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-success bg-opacity-10 rounded-lg flex items-center justify-center">
                <i className="fas fa-user-check text-success"></i>
              </div>
              <div>
                <p className="text-sm text-gray-600">Usuarios Activos</p>
                <p className="text-xl font-bold text-success">
                  {users.filter((u: any) => u.isActive).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-warning bg-opacity-10 rounded-lg flex items-center justify-center">
                <i className="fas fa-user-shield text-warning"></i>
              </div>
              <div>
                <p className="text-sm text-gray-600">Administradores</p>
                <p className="text-xl font-bold text-warning">
                  {users.filter((u: any) => u.role === "admin").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-info bg-opacity-10 rounded-lg flex items-center justify-center">
                <i className="fas fa-user text-info"></i>
              </div>
              <div>
                <p className="text-sm text-gray-600">Usuarios Estándar</p>
                <p className="text-xl font-bold text-info">
                  {users.filter((u: any) => u.role === "user").length}
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
              <h3 className="font-medium">Gestión de Usuarios:</h3>
            </div>
            <div className="flex space-x-2">
              <Button>
                <i className="fas fa-user-plus mr-2"></i>
                Agregar Usuario
              </Button>
              <Button variant="outline">
                <i className="fas fa-download mr-2"></i>
                Exportar Lista
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuarios</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Último Acceso</TableHead>
                <TableHead>Fecha Registro</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((userItem: any) => (
                <TableRow key={userItem.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                        <i className="fas fa-user text-white text-xs"></i>
                      </div>
                      <span>{userItem.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {userItem.firstName || userItem.lastName 
                      ? `${userItem.firstName || ""} ${userItem.lastName || ""}`.trim()
                      : "Sin nombre"
                    }
                  </TableCell>
                  <TableCell>
                    <Badge variant={userItem.role === "admin" ? "default" : "secondary"}>
                      <i className={`fas ${userItem.role === "admin" ? "fa-user-shield" : "fa-user"} mr-1`}></i>
                      {userItem.role === "admin" ? "Administrador" : "Usuario"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={userItem.isActive ? "default" : "secondary"}>
                      {userItem.isActive ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {userItem.lastLogin 
                      ? new Date(userItem.lastLogin).toLocaleDateString()
                      : "Nunca"
                    }
                  </TableCell>
                  <TableCell>
                    {new Date(userItem.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline">
                        <i className="fas fa-edit mr-1"></i>
                        Editar
                      </Button>
                      {userItem.id !== user.id && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          className={userItem.isActive ? "text-error hover:text-error" : "text-success hover:text-success"}
                        >
                          <i className={`fas ${userItem.isActive ? "fa-user-slash" : "fa-user-check"} mr-1`}></i>
                          {userItem.isActive ? "Desactivar" : "Activar"}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {users.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No hay usuarios registrados en el sistema.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity Chart Placeholder */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Actividad de Usuarios</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
            <div className="text-center">
              <i className="fas fa-chart-bar text-gray-300 text-4xl mb-4"></i>
              <p className="text-gray-500">Gráfico de actividad por usuario</p>
              <p className="text-sm text-gray-400 mt-2">
                Próximamente: estadísticas de uso y órdenes gestionadas por usuario
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
