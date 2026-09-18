// =============================================================================
// Página de login (HU-AD-01)
// Server Component — solo arma el layout. La UI interactiva vive en
// `login-form.tsx` (Client Component) para usar `signIn` de next-auth/react.
//
// Diseño (ref. cliente): panel izquierdo con foto del territorio + marca;
// panel derecho con la tarjeta de login (formulario + alianza del convenio).
// =============================================================================

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LoginForm } from "./login-form";
import { SigTerritorioLogo } from "@/components/icons";

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
  const callbackUrl =
    sp?.callbackUrl && sp.callbackUrl.startsWith("/") ? sp.callbackUrl : "/dashboard";
  const error = sp?.error ? decodeURIComponent(sp.error) : null;

  return (
    <main className="flex min-h-screen w-full flex-col lg:flex-row">
      {/* Panel izquierdo: hero con foto + marca */}
      <section className="relative hidden overflow-hidden lg:flex lg:w-1/2 lg:flex-col">
        <div
          className="absolute inset-0 bg-gradient-to-b from-[#0b3d24] via-[#0a5c30] to-[#06281a]"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/images/login-hero.jpg')" }}
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 bg-gradient-to-b from-[#04301b]/55 via-[#0a5c30]/35 to-[#042415]/80"
          aria-hidden="true"
        />

        <div className="relative z-10 p-10 xl:p-14">
          <div className="flex items-center gap-5">
            <span className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
              <SigTerritorioLogo className="h-14 w-14" />
            </span>
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight text-white xl:text-5xl">
                SIG TERRITORIO
              </h1>
              <p className="text-body-md text-white/85">Plataforma SIG Integrada</p>
              <p className="mt-1 text-[12px] text-white/70">
                Convenio 3038-2024 · CAR Cundinamarca · WWF Colombia · Fundación Natura
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Panel derecho: tarjeta de login */}
      <section className="flex flex-1 items-center justify-center bg-surface-container-lowest px-4 py-10 sm:px-8">
        <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-xl">
          <div>
            {/* Formulario */}
            <div className="p-8 sm:p-10">
              {/* Marca compacta (solo móvil, donde no se ve el hero) */}
              <div className="mb-6 flex items-center gap-3 lg:hidden">
                <SigTerritorioLogo className="h-12 w-12" />
                <div>
                  <p className="text-2xl font-extrabold text-primary">SIG TERRITORIO</p>
                  <p className="text-[11px] text-on-surface-variant">
                    CAR · WWF · Fundación Natura
                  </p>
                </div>
              </div>

              <h2 className="text-2xl font-bold text-primary">Iniciar sesión</h2>
              <p className="mt-1 text-body-sm text-on-surface-variant">
                Ingresa con tu cuenta del convenio para acceder a la plataforma.
              </p>

              <div className="mt-6">
                <LoginForm callbackUrl={callbackUrl} initialError={error} />
              </div>

              <p className="mt-6 text-[11px] leading-relaxed text-on-surface-variant">
                Si necesitás una cuenta nueva, contactá al administrador del sistema
                de tu entidad (CAR / WWF / Fundación Natura).
              </p>
            </div>

            {/* Alianza del convenio — solo texto (no usamos logos de terceros) */}
            <p className="mt-6 border-t border-outline-variant pt-4 text-center text-[11px] leading-relaxed text-on-surface-variant">
              Convenio 3038-2024 · CAR Cundinamarca · WWF Colombia · Fundación Natura
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
