import type { Role } from "@prisma/client";
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: { id: string; email?: string | null; name?: string | null; image?: string | null; role: Role };
  }
}
