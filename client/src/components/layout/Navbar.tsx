import { useState } from "react";
import { Menu, User, Settings, Truck, ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import ThemeToggle from "@/components/theme/ThemeToggle"; // REFACTOR: Dark mode
import { HealthStatusIndicators } from "@/components/HealthStatusIndicator"; // REFACTOR: Health checks
import { useLocation } from "wouter";

interface NavbarProps {
  onToggleSidebar?: () => void;
}

export default function Navbar({ onToggleSidebar }: NavbarProps) {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-card border-b border-border shadow-soft h-16">
      <div className="flex items-center justify-between h-full px-6">
        <div className="flex items-center space-x-4">
          {/* Botón para colapsar sidebar */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleSidebar}
            className="p-2 hover:bg-accent/10"
            data-testid="button-toggle-sidebar"
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-2xl flex items-center justify-center">
              <Truck className="text-primary-foreground h-4 w-4" />
            </div>
            <h1 className="text-xl font-semibold text-primary leading-7">ULUM PLUS</h1>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* REFACTOR: Real-time health status indicators */}
          <HealthStatusIndicators />
          
          {/* REFACTOR: Theme toggle */}
          <ThemeToggle />
          
          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="font-medium text-foreground text-sm">{user?.email}</span>
                <ChevronDown className="h-4 w-4 text-muted" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>
                <div className="font-medium">{user?.email}</div>
                <div className="text-xs text-muted capitalize">{user?.role}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setLocation('/profile')} data-testid="link-profile">
                <User className="mr-2 h-4 w-4" />
                Mi Perfil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLocation('/config')} data-testid="link-config">
                <Settings className="mr-2 h-4 w-4" />
                Configuración
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => logout()} className="text-destructive">
                <i className="fas fa-sign-out-alt mr-2"></i>
                Cerrar Sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}
