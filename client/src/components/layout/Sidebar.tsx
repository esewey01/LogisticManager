import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";

type SidebarProps = {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
};

export default function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }: SidebarProps) {
  const [location] = useLocation();
  const { user } = useAuth();

  const { data: metrics } = useQuery({
    queryKey: ["/api/dashboard/metrics"],
    refetchInterval: 30000,
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setMobileOpen]);

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
      <Link href={item.path} title={item.label} aria-label={item.label}>
        <div
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors cursor-pointer ${
            isActive ? "bg-primary text-white" : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <i className={`${item.icon} w-5 text-center`}></i>
          <span
            className={`whitespace-nowrap transition-opacity duration-200 ${
              collapsed ? "opacity-0 pointer-events-none" : "opacity-100"
            }`}
          >
            {item.label}
          </span>
          {item.badge && item.badge > 0 && (
            <Badge
              variant={isActive ? "secondary" : "destructive"}
              className="ml-auto text-xs"
            >
              {item.badge}
            </Badge>
          )}
        </div>
      </Link>
    );
  };

  const sidebarClasses = `${collapsed ? "w-16" : "w-64"} ${mobileOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 fixed left-0 top-16 h-[calc(100vh-4rem)] bg-surface shadow-lg overflow-hidden transition-[width] duration-300 z-40`;

  return (
    <>
      <aside className={sidebarClasses} role={mobileOpen ? "dialog" : undefined} aria-modal={mobileOpen ? "true" : undefined}>
        <button
          onClick={() => setCollapsed(!collapsed)}
          aria-pressed={collapsed}
          className="m-2 p-2 rounded focus:outline-none focus-visible:ring"
        >
          <i className="fas fa-bars"></i>
        </button>
        <nav className="space-y-2">
          {navItems.map((item) => (
            <NavItem key={item.path} item={item} />
          ))}
          {user?.role === "admin" && (
            <div className="pt-4 border-t border-gray-200">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-4">
                Administración
              </div>
              {adminItems.map((item) => (
                <NavItem key={item.path} item={item} />
              ))}
            </div>
          )}
        </nav>
      </aside>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </>
  );
}
