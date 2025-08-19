import { Link, useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export default function Sidebar({ collapsed, mobileOpen, onCloseMobile }: SidebarProps) {
  const [location] = useLocation();
  const { user } = useAuth();

  const { data: metrics } = useQuery({
    queryKey: ["/api/dashboard/metrics"],
    refetchInterval: 30000,
  });

  const navItems = [
    { path: "/", icon: "fas fa-chart-pie", label: "Dashboard", badge: null },
    { path: "/pedidos", icon: "fas fa-shopping-bag", label: "Pedidos", badge: metrics?.unmanaged },
    { path: "/tickets", icon: "fas fa-ticket-alt", label: "Tickets", badge: null },
    { path: "/paqueteria", icon: "fas fa-truck", label: "Paquetería", badge: null },
    { path: "/productos", icon: "fas fa-boxes", label: "Productos", badge: null },
  ];

  const adminItems = [
    { path: "/admin/usuarios", icon: "fas fa-users", label: "Usuarios", badge: null },
    { path: "/config", icon: "fas fa-cog", label: "Configuración", badge: null },
  ];

  const NavItem = ({ item }: { item: typeof navItems[0] }) => {
    const isActive = location === item.path;
    return (
      <Link href={item.path} title={collapsed ? item.label : undefined}>
        <div
          className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors cursor-pointer ${isActive ? "bg-primary text-white font-medium" : "text-gray-600 hover:bg-gray-100"}`}
        >
          <i className={`${item.icon} w-5 text-center`}></i>
          <span className={collapsed ? "hidden" : ""}>{item.label}</span>
          {item.badge && item.badge > 0 && !collapsed && (
            <Badge variant={isActive ? "secondary" : "destructive"} className="ml-auto text-xs">
              {item.badge}
            </Badge>
          )}
        </div>
      </Link>
    );
  };

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/50 z-40 md:hidden ${mobileOpen ? "block" : "hidden"}`}
        onClick={onCloseMobile}
      ></div>
      <aside
        className={`fixed left-0 top-0 md:top-16 h-full md:h-[calc(100vh-4rem)] bg-surface shadow-lg z-50 transform transition-all ${mobileOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 ${collapsed ? "w-16" : "w-60"}`}
      >
        <div className="p-6">
          <nav className="space-y-2">
            {navItems.map((item) => (
              <NavItem key={item.path} item={item} />
            ))}

            {user?.role === "admin" && (
              <>
                <div className="pt-4 border-t border-gray-200">
                  <div className={`text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-4 ${collapsed ? "hidden" : ""}`}>
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
    </>
  );
}
