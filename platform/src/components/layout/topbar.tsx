import { PartnerLogo } from "@/components/icons";

export function TopBar() {
  return (
    <header
      className="
        z-50 flex h-16 w-full flex-shrink-0 items-center justify-between
        border-b border-outline-variant bg-surface px-margin-edge
      "
    >
      <div className="flex items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-primary">Plataforma SIG Integrada</h2>
          <p className="text-label-lg text-on-surface-variant">
            Monitoreo Ambiental y Gestión Territorial
          </p>
        </div>
      </div>
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-6">
          <PartnerLogo name="wwf"   className="h-8" />
          <PartnerLogo name="car"   className="h-8" />
          <PartnerLogo name="natura" className="h-8" />
        </div>
        <div className="flex items-center gap-4 border-l border-outline-variant pl-4">
          <button className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-surface-container-low">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <button className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-surface-container-low">
            <span className="material-symbols-outlined">help</span>
          </button>
          <div className="hidden items-center gap-3 sm:flex">
            <div className="text-right">
              <p className="text-label-lg font-bold text-on-surface">Ana María</p>
              <p className="text-[11px] text-on-surface-variant">Administrador</p>
            </div>
            <div className="h-8 w-8 rounded-full border border-outline-variant bg-primary/20" />
          </div>
        </div>
      </div>
    </header>
  );
}
