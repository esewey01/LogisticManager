import { ReactNode, useState, useEffect } from "react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import { ChatWidget } from "../ChatWidget"; // SOCKET-INTEGRATION
import { useAuth } from "@/hooks/useAuth";

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user } = useAuth(); // SOCKET-INTEGRATION

  // Cargar estado del sidebar desde localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('sidebar-collapsed');
    if (savedState) {
      setSidebarCollapsed(JSON.parse(savedState));
    }
  }, []);

  // Guardar estado del sidebar en localStorage
  const toggleSidebar = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem('sidebar-collapsed', JSON.stringify(newState));
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar onToggleSidebar={toggleSidebar} />
      <Sidebar collapsed={sidebarCollapsed} />
      <main 
        className={`mt-16 min-h-screen transition-all duration-300 ${
          sidebarCollapsed ? 'ml-16' : 'ml-60'
        }`}
      >
        <div className="p-6">
          {children}
        </div>
      </main>
      
      {/* SOCKET-INTEGRATION: Chat widget flotante */}
      <ChatWidget currentUser={user?.email || "Usuario"} />
    </div>
  );
}
