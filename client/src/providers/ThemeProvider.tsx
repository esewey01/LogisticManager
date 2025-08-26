// REFACTOR: Dark mode theme provider with system preference detection
import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  actualTheme: "light" | "dark"; // The computed theme (resolves 'system')
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "system",
  setTheme: () => {},
  actualTheme: "light"
});

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  const [actualTheme, setActualTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    // Load theme from localStorage
    try {
      const storedTheme = localStorage.getItem(storageKey) as Theme;
      if (storedTheme && ["light", "dark", "system"].includes(storedTheme)) {
        setTheme(storedTheme);
      }
    } catch (error) {
      console.warn("Failed to load theme from localStorage:", error);
    }
  }, [storageKey]);

  useEffect(() => {
    // Compute actual theme
    let computedTheme: "light" | "dark";

    if (theme === "system") {
      computedTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    } else {
      computedTheme = theme;
    }

    setActualTheme(computedTheme);

    // Apply theme to document
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(computedTheme);

    // Set data attribute for CSS variables
    root.setAttribute("data-theme", computedTheme);
  }, [theme]);

  useEffect(() => {
    // Listen for system theme changes
    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      
      const handleChange = (e: MediaQueryListEvent) => {
        setActualTheme(e.matches ? "dark" : "light");
        
        // Update document classes
        const root = document.documentElement;
        root.classList.remove("light", "dark");
        root.classList.add(e.matches ? "dark" : "light");
        root.setAttribute("data-theme", e.matches ? "dark" : "light");
      };

      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, [theme]);

  const handleSetTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    
    // Save to localStorage
    try {
      localStorage.setItem(storageKey, newTheme);
    } catch (error) {
      console.warn("Failed to save theme to localStorage:", error);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme: handleSetTheme, actualTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}