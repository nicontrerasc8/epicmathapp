import Navbar from "@/components/navbar-student";
import { EnvVarWarning } from "@/components/env-var-warning";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { hasEnvVars } from "@/utils/supabase/check-env-vars";
import { Geist, Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import Link from "next/link";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { cn } from "@/lib/utils";

const geistSans = Geist({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-sans",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Ludus · Aprende, juega y aprueba",
  description:
    "La plataforma lúdica que transforma el aprendizaje en logros reales. Tecnología, pedagogía y diversión en un solo lugar.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      className={cn(geistSans.variable, inter.variable, "scroll-smooth")}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background text-foreground antialiased selection:bg-primary/10 selection:text-primary">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <main className="flex flex-col min-h-screen">
            <Toaster position="top-center" reverseOrder={false} />

            {/* NAVBAR */}
            <nav className="sticky top-0 z-50 bg-white/80 dark:bg-background/80 backdrop-blur-xl border-b border-border shadow-sm">
              <div className="max-w-6xl mx-auto flex justify-between items-center px-6 py-3">
                {/* Brand */}
                <Link
                  href="/"
                  className="text-xl md:text-2xl font-extrabold tracking-tight text-primary hover:opacity-90 transition-opacity"
                >
                  Ludus
                </Link>

                {/* Right side */}
                <div className="flex items-center gap-4">
                  {!hasEnvVars ? <EnvVarWarning /> : <Navbar />}
                </div>
              </div>
            </nav>

            {/* MAIN CONTENT */}
            <div className="flex-1 w-full flex justify-center bg-gradient-to-b from-background via-background to-muted/20">
              <div className="w-full max-w-6xl px-6 py-12 md:py-16">{children}</div>
            </div>

            {/* FOOTER */}
            <footer className="border-t border-border bg-card text-muted-foreground py-10">
              <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 px-6 text-sm">
                <p className="text-center md:text-left leading-relaxed">
                  © {new Date().getFullYear()} <strong>Ludus</strong>. 
                </p>
               
              </div>
            </footer>
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
