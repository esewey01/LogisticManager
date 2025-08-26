import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ChatWidget } from "@/components/ChatWidget"; // SOCKET-INTEGRATION
import { useAuth } from "@/hooks/useAuth";

import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Pedidos from "@/pages/pedidos";
import Tickets from "@/pages/tickets";
import Catalogo from "@/pages/catalogo";
import Paqueteria from "@/pages/paqueteria";
import AdminUsuarios from "@/pages/admin/usuarios";
import Config from "@/pages/config";
import ProductsView from "@/pages/ProductsView";
import ProductosUnificada from "@/pages/productos";
import AppLayout from "@/components/layout/AppLayout";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Login} />
        <Route component={Login} />
      </Switch>
    );
  }

  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/pedidos" component={Pedidos} />
        <Route path="/tickets" component={Tickets} />
        <Route path="/catalogo" component={Catalogo} />
        <Route path="/paqueteria" component={Paqueteria} />
        <Route path="/admin/usuarios" component={AdminUsuarios} />
        <Route path="/productos-unificada" component={ProductosUnificada} />
        <Route path="/productos" component={ProductsView} />
        <Route path="/config" component={Config} />
        <Route component={NotFound} />
      </Switch>
      

    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
