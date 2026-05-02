import Link from "next/link";
import { auth, signOut, SPOTIFY_OAUTH_ENABLED } from "@/auth";
import { prisma } from "@/lib/db";
import { connectSpotifyAction } from "@/lib/actions/spotify";

export default async function Home() {
  const session = await auth();

  // Si hay sesión + Spotify OAuth habilitado en el entorno, miramos si ya
  // tiene Spotify vinculado. Si el OAuth está deshabilitado (env vars
  // ausentes en prod), saltamos la query y no mostramos el botón.
  let hasSpotify = false;
  if (session?.user?.id && SPOTIFY_OAUTH_ENABLED) {
    const acct = await prisma.account.findFirst({
      where: { userId: session.user.id, provider: "spotify" },
      select: { id: true },
    });
    hasSpotify = !!acct;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-stone-50 px-4 py-12">
      <header className="text-center">
        <h1 className="text-5xl font-semibold tracking-tight text-stone-900">Blue Book</h1>
        <p className="mt-2 text-stone-600">Tu diario de música</p>
      </header>

      {session?.user ? (
        <div className="flex w-full max-w-sm flex-col gap-4 rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
          <div className="text-center">
            <p className="text-stone-700">
              Hola,{" "}
              <span className="font-medium text-stone-900">
                {session.user.displayName ?? session.user.username ?? session.user.email}
              </span>
            </p>
            <p className="mt-1 text-xs text-stone-500">
              @{session.user.username} · {session.user.email}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Link
              href="/diary"
              className="rounded bg-stone-900 px-4 py-2 text-center text-sm text-white hover:bg-stone-800"
            >
              Ir a mi diario
            </Link>

            {SPOTIFY_OAUTH_ENABLED &&
              (hasSpotify ? (
                <p className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-center text-xs text-emerald-700">
                  Spotify conectado
                </p>
              ) : (
                <form action={connectSpotifyAction}>
                  <button
                    type="submit"
                    className="w-full rounded border border-stone-300 bg-white px-4 py-2 text-sm text-stone-900 hover:bg-stone-100"
                  >
                    Conectar Spotify
                  </button>
                </form>
              ))}

            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button
                type="submit"
                className="w-full rounded px-4 py-2 text-sm text-stone-500 hover:text-stone-900"
              >
                Cerrar sesión
              </button>
            </form>
          </div>
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
