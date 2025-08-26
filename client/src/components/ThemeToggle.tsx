// REFACTOR: Theme toggle component for navbar
import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "@/providers/ThemeProvider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ThemeToggle() {
  const { theme, setTheme, actualTheme } = useTheme();

  const getIcon = () => {
    if (actualTheme === "dark") return <Moon className="h-4 w-4" />;
    return <Sun className="h-4 w-4" />;
  };

  const getThemeLabel = (themeValue: string) => {
    switch (themeValue) {
      case "light": return "Claro";
      case "dark": return "Oscuro";  
      case "system": return "Sistema";
      default: return themeValue;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 w-9 px-0"
          data-testid="button-theme-toggle"
        >
          {getIcon()}
          <span className="sr-only">Cambiar tema</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => setTheme("light")}
          className="flex items-center gap-2"
          data-testid="button-theme-light"
        >
          <Sun className="h-4 w-4" />
          <span>Claro</span>
          {theme === "light" && <span className="ml-auto">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("dark")}
          className="flex items-center gap-2"
          data-testid="button-theme-dark"
        >
          <Moon className="h-4 w-4" />
          <span>Oscuro</span>
          {theme === "dark" && <span className="ml-auto">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("system")}
          className="flex items-center gap-2"
          data-testid="button-theme-system"
        >
          <Monitor className="h-4 w-4" />
          <span>Sistema</span>
          {theme === "system" && <span className="ml-auto">✓</span>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}