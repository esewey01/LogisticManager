import { Link, useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";

interface SidebarProps {
  collapsed: boolean;
}

export default function Sidebar({ collapsed }: SidebarProps) {
  const [location] = useLocation();
  const { user } = useAuth();

  // Fetch dashboard metrics for badges
  const { data: metrics } = useQuery({
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
          className={`flex items-center ${collapsed ? 'justify-center px-2' : 'space-x-3 px-4'} py-3 rounded-lg transition-all cursor-pointer ${isActive
              ? "bg-primary text-white font-medium"
              : "text-gray-600 hover:bg-gray-100"
            }`}
          title={collapsed ? item.label : undefined}
        >
          <i className={`${item.icon} w-5 ${collapsed ? 'text-center' : ''}`}></i>
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
    <aside className={`fixed left-0 top-16 h-[calc(100vh-4rem)] bg-surface shadow-lg z-40 transition-all duration-300 ${
      collapsed ? 'w-16' : 'w-60'
    }`}>
      <div className={`${collapsed ? 'p-2' : 'p-6'}`}>
        <nav className="space-y-2">
          {navItems.map((item) => (
            <NavItem key={item.path} item={item} />
          ))}

          {user?.role === "admin" && !collapsed && (
            <div className="pt-4 border-t border-gray-200">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-4">
                Administración
              </div>
              {adminItems.map((item) => (
                <NavItem key={item.path} item={item} />
              ))}
            </div>
          )}
          
          {/* Admin items en modo colapsado */}
          {user?.role === "admin" && collapsed && (
            <div className="pt-4 border-t border-gray-200 space-y-2">
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
