import { Link, useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import type { DashboardMetrics } from "@shared/schema";
import { PieChart, ShoppingBag, Ticket, Package, Truck, Boxes, Layers, Users, Settings } from "lucide-react";

interface SidebarProps {
  collapsed: boolean;
}

export default function Sidebar({ collapsed }: SidebarProps) {
  const [location] = useLocation();
  const { user } = useAuth();

  // Fetch dashboard metrics for badges
  const { data: metrics } = useQuery<DashboardMetrics>({
    queryKey: ["/api/dashboard/metrics"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const navItems = [
    {
      path: "/",
      icon: "fas fa-chart-pie",
      label: "Dashboard",
      badge: null,
    },
    {
      path: "/pedidos",
      icon: "fas fa-shopping-bag",
      label: "Pedidos",
      badge: metrics?.unmanaged,
    },
    {
      path: "/tickets",
      icon: "fas fa-ticket-alt",
      label: "Tickets",
      badge: null,
    },
    {
      path: "/catalogo",
      icon: "fas fa-cube",
      label: "Catálogo",
      badge: null,
    },
    {
      path: "/paqueteria",
      icon: "fas fa-truck",
      label: "Paquetería",
      badge: null,
    },
    {
      path: "/productos",
      icon: "fas fa-boxes",
      label: "Productos",
      badge: null,
    },
    {
      path: "/productos-unificada",
      icon: "fas fa-layer-group",
      label: "Productos Pro",
      badge: null,
    },
  ];

  const adminItems = [
    {
      path: "/admin/usuarios",
      icon: "fas fa-users",
      label: "Usuarios",
      badge: null,
    },
    {
      path: "/config",
      icon: "fas fa-cog",
      label: "Configuración",
      badge: null,
    },
  ];

  const NavItem = ({ item }: { item: typeof navItems[0] }) => {
    const isActive = location === item.path;

    return (
      <Link href={item.path}>
        <div
          className={`flex items-center ${collapsed ? 'justify-center px-2' : 'space-x-3 px-4'} py-3 rounded-2xl transition-all cursor-pointer ${isActive
              ? "bg-primary text-primary-foreground font-medium"
              : "text-muted hover:bg-accent/10 hover:text-foreground"
            }`}
          title={collapsed ? item.label : undefined}
        >
          <span className={`w-5 ${collapsed ? 'text-center' : ''}`}>
            {item.path === '/' && <PieChart className="h-5 w-5" />}
            {item.path === '/pedidos' && <ShoppingBag className="h-5 w-5" />}
            {item.path === '/tickets' && <Ticket className="h-5 w-5" />}
            {item.path === '/catalogo' && <Package className="h-5 w-5" />}
            {item.path === '/paqueteria' && <Truck className="h-5 w-5" />}
            {item.path === '/productos' && <Boxes className="h-5 w-5" />}
            {item.path === '/productos-unificada' && <Layers className="h-5 w-5" />}
            {item.path === '/admin/usuarios' && <Users className="h-5 w-5" />}
            {item.path === '/config' && <Settings className="h-5 w-5" />}
          </span>
          {!collapsed && (
            <>
              <span>{item.label}</span>
              {item.badge && item.badge > 0 && (
                <Badge
                  variant={isActive ? "secondary" : "destructive"}
                  className="ml-auto text-xs"
                >
                  {item.badge}
                </Badge>
              )}
            </>
          )}
        </div>
      </Link>
    );
  };

  return (
    <aside className={`fixed left-0 top-16 h-[calc(100vh-4rem)] bg-card border-r border-border shadow-soft z-40 transition-all duration-300 ${
      collapsed ? 'w-16' : 'w-60'
    }`}>
      <div className={`${collapsed ? 'p-2' : 'p-6'}`}>
        <nav className="space-y-2">
          {navItems.map((item) => (
            <NavItem key={item.path} item={item} />
          ))}

          {user?.role === "admin" && !collapsed && (
            <div className="pt-4 border-t border-border">
              <div className="text-xs font-semibold text-muted uppercase tracking-wider mb-2 px-4">
                Administración
              </div>
              {adminItems.map((item) => (
                <NavItem key={item.path} item={item} />
              ))}
            </div>
          )}
          
          {/* Admin items en modo colapsado */}
          {user?.role === "admin" && collapsed && (
            <div className="pt-4 border-t border-border space-y-2">
              {adminItems.map((item) => (
                <NavItem key={item.path} item={item} />
              ))}
            </div>
          )}
        </nav>
      </div>
    </aside>
  );
}
