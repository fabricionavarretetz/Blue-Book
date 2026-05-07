import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

/**
 * Home (`/`):
 *   - Sin sesión → landing pública con CTA a login/register.
 *   - Con sesión → redirige a /feed (donde vive el hybrid feed con sidebar).
 */
export default async function Home() {
  const session = await auth();
  if (session?.user?.id) {
    redirect("/feed");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-paper px-4 py-12">
      <header className="text-center">
        <h1 className="text-5xl font-semibold tracking-tight text-ink">Blue Book</h1>
        <p className="mt-2 text-ink-soft">Tu diario de música</p>
      </header>
      <div className="flex flex-col gap-3">
        <Link
          href="/login"
          className="rounded bg-ink px-6 py-2 text-center text-sm text-white transition-colors hover:opacity-90"
        >
          Iniciar sesión
        </Link>
        <Link
          href="/register"
          className="rounded border border-line bg-paper-card px-6 py-2 text-center text-sm text-ink transition-colors hover:bg-paper-card-hover"
        >
          Crear cuenta
        </Link>
      </div>
    </main>
  );
}
