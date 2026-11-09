"use client";

import { signOut } from "next-auth/react";

export function SignOut() {
  return (
    <button className="text-sm text-stone-400 hover:text-white" onClick={() => signOut({ callbackUrl: "/login" })}>
      Sign out
    </button>
  );
}
