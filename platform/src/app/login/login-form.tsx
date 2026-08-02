"use client";

// =============================================================================
// Form de login (Client Component) — usa `signIn` de next-auth/react.
// =============================================================================

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const FRIENDLY_ERROR: Record<string, string> = {
  CredentialsSignin: "Email o contraseña incorrectos.",
  Configuration:      "Error de configuración de autenticación. Avisá al admin.",
  AccessDenied:       "Tu cuenta no tiene acceso a esta plataforma.",
};

export function LoginForm({
  callbackUrl,
  initialError,
}: {
  callbackUrl: string;
  initialError: string | null;
}) {
  const router = useRouter();
  const search = useSearchParams();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(() => {
    if (!initialError) return null;
    return FRIENDLY_ERROR[initialError] ?? "No se pudo iniciar sesión.";
  });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    const res = await signIn("credentials", {
      email: email.trim(),
      password,
      redirect: false,
      callbackUrl,
    });

    setSubmitting(false);

    if (!res) {
      setErrorMsg("Error inesperado. Probá de nuevo.");
      return;
    }
    if (res.error) {
      setErrorMsg(FRIENDLY_ERROR[res.error] ?? "No se pudo iniciar sesión.");
      return;
    }
    // Éxito: refrescamos router para que el middleware vea la sesión y nos
    // deje pasar; caemos al callbackUrl por defecto.
    router.replace(res.url ?? callbackUrl);
    router.refresh();
  }

  // Preservar el callbackUrl original para el caso "olvidé password" futuro.
  const preservedCallback = search?.get("callbackUrl") ?? callbackUrl;

  return (
    // UX-60 (audit 2026-07-24): aria-busy durante el submit para que los
    // screen readers anuncien que la app esta procesando. disabled solo
    // afecta interaccion, no semantica.
    <form
      onSubmit={onSubmit}
      className="space-y-4"
      noValidate
      aria-busy={submitting}
    >
      <div>
        <label
          htmlFor="email"
          className="mb-1 block text-label-lg font-medium text-on-surface"
        >
          Correo electrónico
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nombre@entidad.gov.co"
          disabled={submitting}
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="mb-1 block text-label-lg font-medium text-on-surface"
        >
          Contraseña
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          disabled={submitting}
        />
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-error/40 bg-error/5 px-3 py-2 text-body-sm text-error"
        >
          <AlertCircle className="mt-0.5 size-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <Button
        type="submit"
        disabled={submitting || !email || !password}
        className="w-full"
      >
        {submitting ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Ingresando…
          </>
        ) : (
          "Ingresar"
        )}
      </Button>

      {/* TODO (post-MVP): enlace "¿Olvidaste tu contraseña?"
          Requiere implementar flujo de reset con email y token firmado. */}
      <input type="hidden" name="callbackUrl" value={preservedCallback} />
    </form>
  );
}
