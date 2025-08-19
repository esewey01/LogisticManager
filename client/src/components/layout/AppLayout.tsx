import { ReactNode, useEffect, useState } from "react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const stored = typeof window !== "undefined" && localStorage.getItem("sidebar:collapsed");
    if (stored === "true") setCollapsed(true);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("sidebar:collapsed", String(collapsed));
    }
  }, [collapsed]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar
        collapsed={collapsed}
        onToggle={() => {
          if (window.innerWidth < 768) setMobileOpen(true);
          else setCollapsed((c) => !c);
        }}
      />
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />
      <main
        className={`${collapsed ? "md:ml-16" : "md:ml-64"} mt-16 min-h-screen transition-[margin-left] duration-300`}
      >
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
