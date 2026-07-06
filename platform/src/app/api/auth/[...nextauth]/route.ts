// =============================================================================
// NextAuth v5 — Route Handler.
// Solo reexportamos los handlers generados por NextAuth desde `@/lib/auth`.
// =============================================================================

import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
