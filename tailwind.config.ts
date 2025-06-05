import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        background: "#F9FAFB", // gris claro
        foreground: "#111827", // casi negro
        border: "#E5E7EB",     // gris claro
        input: "#F3F4F6",      // gris clarito
        ring: "#93C5FD",       // azul claro
        primary: {
          DEFAULT: "#3B82F6", // azul
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "#F472B6", // rosado lúdico
          foreground: "#ffffff",
        },
        destructive: {
          DEFAULT: "#EF4444", // rojo error
          foreground: "#ffffff",
        },
        accent: {
          DEFAULT: "#FACC15", // amarillo
          foreground: "#78350F", // texto oscuro
        },
        muted: {
          DEFAULT: "#E5E7EB",
          foreground: "#6B7280",
        },
        popover: {
          DEFAULT: "#ffffff",
          foreground: "#1f1f1f",
        },
        card: {
          DEFAULT: "#ffffff",
          foreground: "#1f1f1f",
        },
      },
      borderRadius: {
        lg: "1rem",
        md: "0.5rem",
        sm: "0.25rem",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
