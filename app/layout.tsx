import Navbar from "@/components/navbar";
import { EnvVarWarning } from "@/components/env-var-warning";
import { hasEnvVars } from "@/utils/supabase/check-env-vars";
import RouteChangeIndicator from "@/components/loading/RouteChangeIndicator";
import { Geist, Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import Link from "next/link";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { cn } from "@/lib/utils";
import { getInstitutionContext } from "@/lib/institution";
import { InstitutionProvider } from "@/components/institution-provider";

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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const institution = await getInstitutionContext();
  const brandLabel = institution?.name || "Ludus";

  return (
    <html
      lang="es"
      className={cn(geistSans.variable, inter.variable, "scroll-smooth")}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background text-foreground antialiased selection:bg-primary/10 selection:text-primary">
        <InstitutionProvider institution={institution}>
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
                <div
                  className="flex items-center gap-3 text-xl md:text-2xl font-extrabold tracking-tight text-primary hover:opacity-90 transition-opacity"
                >
                  {institution?.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={institution.logo_url}
                      alt={`${brandLabel} logo`}
                      className="h-8 w-8 rounded-md object-contain"
                    />
                  ) : (
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground text-base font-bold">
                      {brandLabel.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <span className="text-foreground">{brandLabel}</span>
                </div>

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
                  (c) {new Date().getFullYear()} <strong>{brandLabel}</strong>.
                </p>
               
              </div>
            </footer>
          </main>
          </ThemeProvider>
        </InstitutionProvider>
      </body>
    </html>
  );
}


