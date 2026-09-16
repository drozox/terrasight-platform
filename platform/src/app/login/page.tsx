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
import { SigTerritorioLogo, PartnerLogo } from "@/components/icons";

export const metadata = { title: "Iniciar sesión — SIG TERRITORIO" };

// Líneas topográficas decorativas (SVG) del panel hero.
const TOPO_PATHS = [
  "M-60 90 C 120 30, 260 170, 430 110 S 660 40, 720 130",
  "M-60 170 C 130 110, 280 250, 440 190 S 670 120, 730 210",
  "M-60 250 C 140 190, 300 330, 450 270 S 680 200, 740 290",
  "M-60 330 C 150 270, 310 410, 460 350 S 690 280, 750 370",
  "M-60 410 C 160 350, 320 490, 470 430 S 700 360, 760 450",
  "M120 -40 C 60 120, 200 260, 140 420 S 60 620, 150 760",
  "M260 -40 C 200 120, 340 260, 280 420 S 200 620, 290 760",
  "M400 -40 C 340 120, 480 260, 420 420 S 340 620, 430 760",
];

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
          className="absolute inset-0 bg-gradient-to-b from-[#04301b]/70 via-[#0a5c30]/50 to-[#042415]/90"
          aria-hidden="true"
        />
        <svg
          className="absolute inset-0 h-full w-full text-white/15"
          viewBox="0 0 600 800"
          preserveAspectRatio="xMidYMid slice"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          aria-hidden="true"
        >
          {TOPO_PATHS.map((d) => (
            <path key={d} d={d} />
          ))}
        </svg>

        <div className="relative z-10 p-10 xl:p-14">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
              <SigTerritorioLogo className="h-10 w-10" />
            </span>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white xl:text-4xl">
                SIG TERRITORIO
              </h1>
              <p className="text-body-sm text-white/85">
                Plataforma SIG integrada · CAR · WWF · Natura
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Panel derecho: tarjeta de login */}
      <section className="flex flex-1 items-center justify-center bg-surface-container-lowest px-4 py-10 sm:px-8">
        <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-xl">
          <div className="grid md:grid-cols-[1fr_260px]">
            {/* Formulario */}
            <div className="p-8 sm:p-10">
              {/* Marca compacta (solo móvil, donde no se ve el hero) */}
              <div className="mb-6 flex items-center gap-3 lg:hidden">
                <SigTerritorioLogo className="h-10 w-10" />
                <div>
                  <p className="text-lg font-bold text-primary">SIG TERRITORIO</p>
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

            {/* Alianza del convenio */}
            <aside className="hidden flex-col items-center border-outline-variant p-6 md:flex md:border-l">
              <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                Alianza del convenio
              </p>
              <div className="mt-6 flex flex-col items-center gap-6">
                <PartnerLogo name="car" src="/logos/car.png" className="h-12" />
                <PartnerLogo name="wwf" src="/logos/wwf.png" className="h-12" />
                <PartnerLogo
                  name="natura"
                  src="/logos/fundacion-natura.jpg"
                  className="h-12"
                />
              </div>
              <p className="mt-auto pt-6 text-center text-[11px] leading-relaxed text-on-surface-variant">
                Plataforma desarrollada en el marco del convenio CAR · WWF ·
                Fundación Natura para el monitoreo ambiental del territorio.
              </p>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}
