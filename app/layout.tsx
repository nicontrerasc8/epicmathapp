import NavbarStudent from "@/components/navbar-student";
import { EnvVarWarning } from "@/components/env-var-warning";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { hasEnvVars } from "@/utils/supabase/check-env-vars";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import Link from "next/link";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata = {
  metadataBase: new URL(defaultUrl),
  title: "EpicMathApp",
  description: "La forma más divertida y personalizada para aprender matemáticas en primaria.",
};

const geistSans = Geist({
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={geistSans.className} suppressHydrationWarning>
      <body className="bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <main className="min-h-screen flex flex-col">
            {/* Navbar */}
            <nav className="bg-primary text-primary-foreground shadow-md">
              <div className="w-full max-w-5xl mx-auto flex justify-between items-center p-4">
                <div className="flex items-center gap-4">
                  <Link href="/" className="text-xl font-bold hover:underline">
                    EpicMathApp
                  </Link>
                </div>
                <div className="flex items-center gap-4">
                  {!hasEnvVars ? <EnvVarWarning /> : <NavbarStudent />}
                </div>
              </div>
            </nav>

            {/* Contenido principal */}
            <div className="flex-1 flex flex-col items-center bg-background">
              <div className="w-full max-w-5xl p-6 md:p-10 flex flex-col gap-12">
                {children}
              </div>
            </div>

            {/* Footer */}
            <footer className="bg-secondary text-secondary-foreground border-t border-border py-8">
              <div className="w-full max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs px-6">
                <p>
                  Creado con 💙 para estudiantes de primaria en Lima Metropolitana.
                </p>
                <ThemeSwitcher />
              </div>
            </footer>
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
