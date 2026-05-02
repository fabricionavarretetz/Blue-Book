import Link from "next/link";
import { auth, signOut } from "@/auth";

export default async function Home() {
  const session = await auth();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-stone-50 px-4 py-12">
      <header className="text-center">
        <h1 className="text-5xl font-semibold tracking-tight text-stone-900">Blue Book</h1>
        <p className="mt-2 text-stone-600">Tu diario de música</p>
      </header>

      {session?.user ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
          <p className="text-stone-700">
            Hola,{" "}
            <span className="font-medium text-stone-900">
              {session.user.displayName ?? session.user.username ?? session.user.email}
            </span>
          </p>
          <p className="text-xs text-stone-500">
            @{session.user.username} · {session.user.email}
          </p>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button
              type="submit"
              className="rounded bg-stone-900 px-4 py-2 text-sm text-white hover:bg-stone-800"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <Link
            href="/login"
            className="rounded bg-stone-900 px-6 py-2 text-center text-sm text-white hover:bg-stone-800"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/register"
            className="rounded border border-stone-300 bg-white px-6 py-2 text-center text-sm text-stone-900 hover:bg-stone-100"
          >
            Crear cuenta
          </Link>
        </div>
      )}
    </main>
  );
}
