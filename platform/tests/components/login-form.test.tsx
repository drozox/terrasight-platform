// =============================================================================
// Tests para LoginForm — cliente con signIn() de next-auth/react.
//
// NOTA: por simplicidad mockeamos next/navigation y next-auth/react.
// Solo cubrimos los caminos basicos (render, type, submit, error display).
// Flujos complejos de next-auth (CSRF token fetch, session refresh) quedan
// fuera de scope para este sprint — ver TODO al final.
// =============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

const { mockSignIn, mockRouterReplace, mockRouterRefresh, mockSearchGet } = vi.hoisted(() => ({
  mockSignIn: vi.fn(),
  mockRouterReplace: vi.fn(),
  mockRouterRefresh: vi.fn(),
  mockSearchGet: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockRouterReplace,
    refresh: mockRouterRefresh,
    push: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
  useSearchParams: () => ({
    get: mockSearchGet,
  }),
}));

vi.mock("next-auth/react", () => ({
  signIn: mockSignIn,
}));

import { LoginForm } from "@/app/login/login-form";

beforeEach(() => {
  mockSignIn.mockReset();
  mockRouterReplace.mockReset();
  mockRouterRefresh.mockReset();
  mockSearchGet.mockReset();
  mockSearchGet.mockReturnValue(null);
  mockSignIn.mockResolvedValue({ ok: true, error: null, status: 200, url: "/dashboard" });
});

afterEach(() => {
  cleanup();
});

describe("LoginForm — render inicial", () => {
  it("renderiza los inputs de email y password", () => {
    render(<LoginForm callbackUrl="/dashboard" initialError={null} />);
    expect(screen.getByLabelText(/correo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument();
  });

  it("el boton Ingresar arranca disabled si email y password están vacios", () => {
    render(<LoginForm callbackUrl="/dashboard" initialError={null} />);
    const submit = screen.getByRole("button", { name: /ingresar/i }) as HTMLButtonElement;
    expect(submit).toBeDisabled();
  });

  it("no muestra el banner de error si initialError=null", () => {
    render(<LoginForm callbackUrl="/dashboard" initialError={null} />);
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("LoginForm — input controlado", () => {
  it("typear email y password → boton Ingresar se habilita", async () => {
    const user = userEvent.setup();
    render(<LoginForm callbackUrl="/dashboard" initialError={null} />);
    await user.type(screen.getByLabelText(/correo/i), "user@example.com");
    await user.type(screen.getByLabelText(/contraseña/i), "secret123");
    const submit = screen.getByRole("button", { name: /ingresar/i }) as HTMLButtonElement;
    expect(submit).not.toBeDisabled();
  });

  it("el input tiene type=email y autoComplete=email", () => {
    render(<LoginForm callbackUrl="/dashboard" initialError={null} />);
    const emailInput = screen.getByLabelText(/correo/i) as HTMLInputElement;
    expect(emailInput.type).toBe("email");
    expect(emailInput.autocomplete).toBe("email");
  });

  it("el input de password tiene type=password", () => {
    render(<LoginForm callbackUrl="/dashboard" initialError={null} />);
    const pwdInput = screen.getByLabelText(/contraseña/i) as HTMLInputElement;
    expect(pwdInput.type).toBe("password");
  });
});

describe("LoginForm — submit y loading state", () => {
  it("submit → llama a signIn con 'credentials' y los valores", async () => {
    const user = userEvent.setup();
    render(<LoginForm callbackUrl="/dashboard" initialError={null} />);
    await user.type(screen.getByLabelText(/correo/i), "user@example.com");
    await user.type(screen.getByLabelText(/contraseña/i), "secret123");
    await user.click(screen.getByRole("button", { name: /ingresar/i }));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledTimes(1);
    });
    expect(mockSignIn).toHaveBeenCalledWith("credentials", {
      email: "user@example.com",
      password: "secret123",
      redirect: false,
      callbackUrl: "/dashboard",
    });
  });

  it("submit → muestra estado 'Ingresando…' mientras signIn está pending", async () => {
    // Hacemos que signIn nunca se resuelva para mantener el loading
    let resolveSignIn: (v: unknown) => void = () => {};
    mockSignIn.mockImplementation(
      () => new Promise((resolve) => { resolveSignIn = resolve; }),
    );
    const user = userEvent.setup();
    render(<LoginForm callbackUrl="/dashboard" initialError={null} />);
    await user.type(screen.getByLabelText(/correo/i), "user@example.com");
    await user.type(screen.getByLabelText(/contraseña/i), "secret123");
    await user.click(screen.getByRole("button", { name: /ingresar/i }));

    // Durante el loading: el botón muestra "Ingresando…" y está disabled
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /ingresando/i })).toBeInTheDocument();
    });
    const submit = screen.getByRole("button", { name: /ingresando/i }) as HTMLButtonElement;
    expect(submit).toBeDisabled();

    // Liberamos el signIn
    resolveSignIn({ ok: true, error: null, status: 200, url: "/dashboard" });
  });

  it("submit con email con espacios → los recorta (trim) antes de signIn", async () => {
    const user = userEvent.setup();
    render(<LoginForm callbackUrl="/dashboard" initialError={null} />);
    await user.type(screen.getByLabelText(/correo/i), "  user@example.com  ");
    await user.type(screen.getByLabelText(/contraseña/i), "secret123");
    await user.click(screen.getByRole("button", { name: /ingresar/i }));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalled();
    });
    const args = mockSignIn.mock.calls[0][1];
    expect(args.email).toBe("user@example.com");
    // password NO se trimea (puede tener espacios intencionalmente)
    expect(args.password).toBe("secret123");
  });
});

describe("LoginForm — error display", () => {
  it("signIn con error: 'CredentialsSignin' → muestra mensaje amigable en espanol", async () => {
    mockSignIn.mockResolvedValue({
      ok: false,
      error: "CredentialsSignin",
      status: 401,
      url: null,
    });
    const user = userEvent.setup();
    render(<LoginForm callbackUrl="/dashboard" initialError={null} />);
    await user.type(screen.getByLabelText(/correo/i), "user@example.com");
    await user.type(screen.getByLabelText(/contraseña/i), "wrong");
    await user.click(screen.getByRole("button", { name: /ingresar/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/email o contraseña incorrectos/i);
    });
  });

  it("signIn con error: 'Configuration' → muestra mensaje de configuracion", async () => {
    mockSignIn.mockResolvedValue({
      ok: false,
      error: "Configuration",
      status: 500,
      url: null,
    });
    const user = userEvent.setup();
    render(<LoginForm callbackUrl="/dashboard" initialError={null} />);
    await user.type(screen.getByLabelText(/correo/i), "user@example.com");
    await user.type(screen.getByLabelText(/contraseña/i), "secret");
    await user.click(screen.getByRole("button", { name: /ingresar/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/configuración/i);
    });
  });

  it("signIn devuelve null → muestra error generico", async () => {
    mockSignIn.mockResolvedValue(null as unknown as { ok: boolean; error: string | null; status: number; url: string | null });
    const user = userEvent.setup();
    render(<LoginForm callbackUrl="/dashboard" initialError={null} />);
    await user.type(screen.getByLabelText(/correo/i), "user@example.com");
    await user.type(screen.getByLabelText(/contraseña/i), "secret");
    await user.click(screen.getByRole("button", { name: /ingresar/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/inesperado/i);
    });
  });

  it("initialError = 'AccessDenied' → muestra el mensaje en el render inicial", () => {
    render(<LoginForm callbackUrl="/dashboard" initialError="AccessDenied" />);
    expect(screen.getByRole("alert")).toHaveTextContent(/no tiene acceso/i);
  });

  it("initialError = 'AccountLocked' → muestra mensaje de cuenta bloqueada (15 min)", () => {
    render(<LoginForm callbackUrl="/dashboard" initialError="AccountLocked" />);
    expect(screen.getByRole("alert")).toHaveTextContent(/cuenta bloqueada/i);
    expect(screen.getByRole("alert")).toHaveTextContent(/15 minutos/i);
  });

  it("initialError = 'AccountInactive' → muestra mensaje de cuenta desactivada", () => {
    render(<LoginForm callbackUrl="/dashboard" initialError="AccountInactive" />);
    expect(screen.getByRole("alert")).toHaveTextContent(/cuenta está desactivada/i);
  });

  it("signIn con error: 'AccountLocked' → muestra mensaje de cuenta bloqueada", async () => {
    mockSignIn.mockResolvedValue({
      ok: false,
      error: "AccountLocked",
      status: 401,
      url: null,
    });
    const user = userEvent.setup();
    render(<LoginForm callbackUrl="/dashboard" initialError={null} />);
    await user.type(screen.getByLabelText(/correo/i), "user@example.com");
    await user.type(screen.getByLabelText(/contraseña/i), "wrong");
    await user.click(screen.getByRole("button", { name: /ingresar/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/cuenta bloqueada/i);
    });
    expect(screen.getByRole("alert")).toHaveTextContent(/15 minutos/i);
  });

  it("signIn con error: 'AccountInactive' → muestra mensaje de cuenta desactivada", async () => {
    mockSignIn.mockResolvedValue({
      ok: false,
      error: "AccountInactive",
      status: 403,
      url: null,
    });
    const user = userEvent.setup();
    render(<LoginForm callbackUrl="/dashboard" initialError={null} />);
    await user.type(screen.getByLabelText(/correo/i), "user@example.com");
    await user.type(screen.getByLabelText(/contraseña/i), "any");
    await user.click(screen.getByRole("button", { name: /ingresar/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/desactivada/i);
    });
  });

  it("initialError desconocido → fallback 'No se pudo iniciar sesión.'", () => {
    render(<LoginForm callbackUrl="/dashboard" initialError="AlgoRaro" />);
    expect(screen.getByRole("alert")).toHaveTextContent(/no se pudo iniciar sesión/i);
  });
});

describe("LoginForm — exito y redirect", () => {
  it("signIn ok → llama router.replace(url) y router.refresh()", async () => {
    mockSignIn.mockResolvedValue({
      ok: true,
      error: null,
      status: 200,
      url: "/dashboard",
    });
    const user = userEvent.setup();
    render(<LoginForm callbackUrl="/dashboard" initialError={null} />);
    await user.type(screen.getByLabelText(/correo/i), "user@example.com");
    await user.type(screen.getByLabelText(/contraseña/i), "secret123");
    await user.click(screen.getByRole("button", { name: /ingresar/i }));

    await waitFor(() => {
      expect(mockRouterReplace).toHaveBeenCalledWith("/dashboard");
    });
    expect(mockRouterRefresh).toHaveBeenCalledTimes(1);
  });

  it("signIn ok sin url → fallback a callbackUrl", async () => {
    mockSignIn.mockResolvedValue({
      ok: true,
      error: null,
      status: 200,
      url: null,
    });
    const user = userEvent.setup();
    render(<LoginForm callbackUrl="/fallback" initialError={null} />);
    await user.type(screen.getByLabelText(/correo/i), "user@example.com");
    await user.type(screen.getByLabelText(/contraseña/i), "secret123");
    await user.click(screen.getByRole("button", { name: /ingresar/i }));

    await waitFor(() => {
      expect(mockRouterReplace).toHaveBeenCalledWith("/fallback");
    });
  });
});

// =============================================================================
// TODO (no implementado en este sprint):
// - Test del flujo CSRF (next-auth fetch a /api/auth/csrf) — requiere mockear
//   fetch global y responder tokens.
// - Test de "preservar callbackUrl" desde useSearchParams cuando está presente.
// - Test de a11y: labels asociados a inputs, role=alert, foco inicial.
// - Test de integración con next-auth session provider real.
// =============================================================================
