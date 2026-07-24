import type { Metadata } from "next";
import { Hanken_Grotesk } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";
import { AuthSessionProvider } from "@/components/providers/session-provider";
import { getAlertas } from "@/lib/repos";
import { getCurrentUser } from "@/lib/auth-guard";

// UX-01/UX-32 (audit 2026-07-24): Hanken Grotesk DECLARADA en globals.css:77
// pero NUNCA CARGADA. Sin esta linea, el browser cae a ui-sans-serif / Segoe
// UI en Windows. El design system (Stich/DESIGN.md) define Hanken Grotesk
// como la tipografia unica de TerraSight. Sin esta fuente se pierde el
// premium "Modern Corporate + Soft Minimalism" del design.
//
// next/font: subset latin + 5 weights + display swap. Self-hosted en
// /_next/static/media, preload automatico. Cero FOUT, sin requests externos.
const hankenGrotesk = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-hanken-grotesk",
});

export const metadata: Metadata = {
  title: "TerraSight — Plataforma SIG Integrada | Convenio CAR-WWF-Natura",
  description:
    "Plataforma de Sistemas de Información Geográfica para el monitoreo ambiental y la gestión territorial en Cundinamarca.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [alertas, usuario] = await Promise.all([
    getAlertas(5),
    getCurrentUser(),
  ]);

  // Sin sesion: NO renderizamos sidebar ni topbar. El middleware redirige a
  // /login cuando la ruta lo requiere, pero durante esa redireccion el
  // layout todavia se evalua y mostraba el sidebar+topbar sobre un form
  // que esta pensado para ocupar la pantalla completa (ver /login/page.tsx).
  // Renderizar solo children hace que el form de login tenga el ancho
  // correcto y no aparezca la navegacion.
  if (!usuario) {
    return (
      <html lang="es" className={`light ${hankenGrotesk.variable}`}>
        <body className="min-h-screen bg-background text-on-surface">
          <AuthSessionProvider>{children}</AuthSessionProvider>
        </body>
      </html>
    );
  }

  return (
    <html lang="es" className={`light ${hankenGrotesk.variable}`}>
      <body className="flex h-screen overflow-hidden bg-background text-on-surface">
        <AuthSessionProvider>
          <Sidebar rol={usuario.rol} />
          <main className="flex h-screen flex-1 flex-col overflow-hidden">
            <TopBar alertas={alertas} usuario={usuario} />
            <div className="flex-1 overflow-hidden">{children}</div>
          </main>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
