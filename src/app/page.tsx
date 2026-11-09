import Link from "next/link";
import { env } from "@/lib/env";

// Marketing placeholder. Phase 2: pricing + signup CTA go here.
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-stone-50 px-6 text-center">
      <h1 className="text-4xl font-bold tracking-tight text-stone-900">LinkDeck</h1>
      <p className="max-w-md text-stone-600">One link for everything your customers need. Pages built and managed by our team.</p>
      <div className="flex gap-3">
        {env.selfSignup ? (
          <Link href="/signup" className="btn-primary">Create your page</Link>
        ) : (
          <a href="mailto:support@example.com" className="btn-primary">Contact us</a>
        )}
        <Link href="/login" className="btn">Staff login</Link>
      </div>
    </main>
  );
}
