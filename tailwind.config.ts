import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./client/index.html", "./client/src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Base tokens
        bg: "rgb(var(--bg))",
        fg: "rgb(var(--fg))",
        muted: "rgb(var(--muted))",
        card: "rgb(var(--card))",
        border: "rgb(var(--border))",
        primary: "rgb(var(--primary))",
        accent: "rgb(var(--accent))",
        danger: "rgb(var(--danger))",

        // shadcn/ui compatible aliases
        background: "rgb(var(--bg))",
        foreground: "rgb(var(--fg))",
        popover: "rgb(var(--card))",
        "popover-foreground": "rgb(var(--fg))",
        "card-foreground": "rgb(var(--fg))",
        input: "rgb(var(--border))",
        ring: "rgb(var(--primary))",
        secondary: "rgb(var(--card))",
        "secondary-foreground": "rgb(var(--fg))",
        destructive: "rgb(var(--danger))",
        "destructive-foreground": "rgb(255 255 255)",
        "muted-foreground": "rgb(var(--muted))",
        "primary-foreground": "rgb(255 255 255)",
        "accent-foreground": "rgb(255 255 255)",
      },
      zIndex: {
        60: "60",
        70: "70",
      },
      boxShadow: {
        soft: "var(--shadow)",
      },
      borderRadius: {
        xl: "0.9rem",
        "2xl": "1.2rem",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
