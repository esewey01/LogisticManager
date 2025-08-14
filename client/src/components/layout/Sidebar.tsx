import { Link, useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";

export default function Sidebar() {
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
      path: "/paqueteria",
      icon: "fas fa-truck",
      label: "Paquetería",
      badge: null,
    },
    {
      path: "/shopify",
      icon: "fas fa-store",
      label: "Shopify",
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
        <a
          className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
            isActive
              ? "bg-primary text-white font-medium"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <i className={`${item.icon} w-5`}></i>
          <span>{item.label}</span>
          {item.badge && item.badge > 0 && (
            <Badge
              variant={isActive ? "secondary" : "destructive"}
              className="ml-auto text-xs"
            >
              {item.badge}
            </Badge>
          )}
        </a>
      </Link>
    );
  };

  return (
    <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-60 bg-surface shadow-lg z-40">
      <div className="p-6">
        <nav className="space-y-2">
          {navItems.map((item) => (
            <NavItem key={item.path} item={item} />
          ))}
          
          {user?.role === "admin" && (
            <>
              <div className="pt-4 border-t border-gray-200">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-4">
                  Administración
                </div>
                {adminItems.map((item) => (
                  <NavItem key={item.path} item={item} />
                ))}
              </div>
            </>
          )}
        </nav>
      </div>
    </aside>
  );
}
