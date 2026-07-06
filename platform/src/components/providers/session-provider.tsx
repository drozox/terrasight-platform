"use client";

// =============================================================================
// SessionProvider wrapper — expone `useSession` de next-auth/react al árbol.
// =============================================================================

import { SessionProvider } from "next-auth/react";

export function AuthSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SessionProvider refetchOnWindowFocus={false}>{children}</SessionProvider>;
}
