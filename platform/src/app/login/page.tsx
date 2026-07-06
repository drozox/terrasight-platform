// =============================================================================
// Página de login (HU-AD-01)
// Server Component — solo arma el layout. La UI interactiva vive en
// `login-form.tsx` (Client Component) para usar `signIn` de next-auth/react.
// =============================================================================

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LoginForm } from "./login-form";
import { TerraSightLogo } from "@/components/icons";

export const metadata = { title: "Iniciar sesión — TerraSight" };

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
    <main className="flex h-screen w-full items-center justify-center bg-surface-container-lowest px-4">
      <div className="w-full max-w-md rounded-2xl border border-outline-variant bg-surface-container-lowest p-8 shadow-lg">
        <div className="mb-6 flex items-center gap-3">
          <TerraSightLogo className="h-12 w-12 rounded-xl" />
          <div>
            <h1 className="text-xl font-bold text-primary">TerraSight</h1>
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
    </main>
  );
}
