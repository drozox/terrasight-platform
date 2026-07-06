// =============================================================================
// Middleware global de protección de rutas.
//
// Sólo chequea el JWT de la cookie — NO toca la BD. Esto lo vuelve compatible
// con el Edge runtime donde `postgres-js` no funciona.
//
// Rutas excluidas (siempre accesibles sin login):
//   - /login (form de autenticación)
//   - /api/auth/* (handlers de NextAuth)
//   - /_next/*   (assets de Next.js)
//   - /favicon.ico, /partners/* (assets estáticos públicos)
// =============================================================================

import { auth } from "@/lib/auth";

// Reexporta directamente el middleware de NextAuth. Por defecto `authorized`
// retorna true si hay sesión, false si no. Personalizamos abajo.
export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname, search } = req.nextUrl;

  // Paths públicos
  const isPublic =
    pathname === "/login" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/partners") ||
    pathname.startsWith("/images");

  if (isPublic) {
    // Si ya está logueado y entra a /login, lo mandamos al dashboard.
    if (isLoggedIn && pathname === "/login") {
      const url = req.nextUrl.clone();
      url.pathname = "/dashboard";
      url.search = "";
      return Response.redirect(url);
    }
    return; // deja pasar
  }

  // Resto: requiere sesión
  if (!isLoggedIn) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?callbackUrl=${encodeURIComponent(pathname + search)}`;
    return Response.redirect(url);
  }
});

// Matcher: aplicamos a todo EXCEPTO assets y handlers de auth.
// Mantener sincronizado con los paths públicos arriba.
export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|partners|images).*)",
  ],
};
