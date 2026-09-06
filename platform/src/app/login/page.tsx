// =============================================================================
// Página de login (HU-AD-01)
// Server Component — solo arma el layout. La UI interactiva vive en
// `login-form.tsx` (Client Component) para usar `signIn` de next-auth/react.
// =============================================================================

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LoginForm } from "./login-form";
import { SigTerritorioLogo, PartnerLogo } from "@/components/icons";

export const metadata = { title: "Iniciar sesión — SIG TERRITORIO" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  // Si ya hay sesión → al dashboard (el middleware también lo hace, pero
  // server-side evita el redirect-loop si llegan con cookie válida).
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const sp = await searchParams;
  const callbackUrl = sp?.callbackUrl && sp.callbackUrl.startsWith("/") ? sp.callbackUrl : "/dashboard";
  const error = sp?.error ? decodeURIComponent(sp.error) : null;

  return (
    <main className="flex h-screen w-full flex-col items-center justify-center gap-6 bg-surface-container-lowest px-4 py-6 sm:flex-row sm:gap-10 sm:py-0">
      <div className="w-full max-w-md rounded-2xl border border-outline-variant bg-surface-container-lowest p-8 shadow-lg">
        <div className="mb-6 flex items-center gap-3">
          <SigTerritorioLogo className="h-12 w-12 rounded-xl" />
          <div>
            <h1 className="text-xl font-bold text-primary">SIG TERRITORIO</h1>
            <p className="text-body-sm text-on-surface-variant">
              Plataforma SIG Integrada · CAR · WWF · Natura
            </p>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-lg font-semibold text-on-surface">Iniciar sesión</h2>
          <p className="text-body-sm text-on-surface-variant">
            Ingresá con tu cuenta del convenio para acceder a la plataforma.
          </p>
        </div>

        <LoginForm callbackUrl={callbackUrl} initialError={error} />

        <p className="mt-6 text-[11px] text-on-surface-variant">
          Si necesitás una cuenta nueva, contactá al administrador del sistema de tu
          entidad (CAR / WWF / Fundación Natura).
        </p>
      </div>

      {/* UX-14/UX-59 (audit 2026-07-24): logos aliados debajo del form. Antes
         el login no mostraba los aliados del convenio — primera impresion
         sin contexto institucional. Ahora un panel vertical de aliados al
         lado del card, hidden en mobile (prioridad: que entre el form). */}
      <div className="hidden w-full max-w-xs flex-col items-center gap-4 rounded-2xl border border-outline-variant bg-surface-container-low p-6 shadow-sm sm:flex">
        <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
          Alianza del convenio
        </p>
        <div className="flex flex-col items-center gap-4">
          <PartnerLogo name="wwf"    src="/partners/wwf-panda.png"  className="h-10" />
          <PartnerLogo name="car"    src="/partners/car.png"         className="h-10" />
          <PartnerLogo name="natura" src="/partners/natura-2018.png" className="h-10" />
        </div>
        <p className="mt-2 text-center text-[11px] leading-relaxed text-on-surface-variant">
          Plataforma desarrollada en el marco del convenio CAR · WWF · Fundación Natura
          para el monitoreo ambiental del territorio.
        </p>
      </div>
    </main>
  );
}
