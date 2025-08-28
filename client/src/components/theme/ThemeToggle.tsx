import { useTheme } from "./ThemeProvider";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";
  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 border border-border bg-card shadow-soft hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      aria-label="Cambiar tema"
      title="Cambiar tema"
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
      <span className="text-sm">{isDark ? "Claro" : "Oscuro"}</span>
    </button>
  );
}
