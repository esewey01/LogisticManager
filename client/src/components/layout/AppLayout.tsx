import { ReactNode, useState } from "react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("sidebar:collapsed") === "true");
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleSidebar = () => {
    if (window.innerWidth < 768) {
      setMobileOpen((o) => !o);
    } else {
      setCollapsed((c) => {
        const n = !c;
        localStorage.setItem("sidebar:collapsed", String(n));
        return n;
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar onToggleSidebar={toggleSidebar} />
      <Sidebar collapsed={collapsed} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <main className={`${collapsed ? "md:ml-16" : "md:ml-60"} mt-16 min-h-screen transition-all`}>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
