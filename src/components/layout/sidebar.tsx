import Link from "next/link";
import { signOut } from "@/auth";
import { SidebarNav } from "./sidebar-nav";

/**
 * Sidebar vertical persistente en desktop. Mobile lo colapsa (Día 12).
 *
 * Estructura:
 *   - Background: gradient azul nocturno + imagen `/sidebar-ambient.png`
 *     anclada al pie. La imagen es el crop directo del mockup, garantiza
 *     fidelidad 1:1 con la dirección visual diseñada.
 *   - Contenido (z-10): marca, tagline, nav links (cliente, ver SidebarNav),
 *     avatar al pie con signOut.
 *
 * Width 192px = ancho exacto del sidebar en el mockup original.
 */

type SidebarProps = {
  user?: {
    displayName?: string | null;
    username?: string | null;
    avatarUrl?: string | null;
  };
};

export function Sidebar({ user }: SidebarProps) {
  return (
    <aside
      className="relative hidden w-[192px] flex-shrink-0 overflow-hidden md:block"
      style={{
        background:
          "linear-gradient(180deg, var(--color-night) 0%, var(--color-night-deep) 50%, var(--color-night-darker) 100%)",
      }}
    >
      {/*
        Imagen ambient del mockup, anclada al pie del sidebar.
        - `bottom-0 inset-x-0`: pegada al pie y a los lados.
        - `w-full`: ocupa el ancho del sidebar (192px = ancho de la imagen).
        - height auto via aspect ratio: imagen 192×875, mantiene proporción.
      */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/sidebar-ambient.png"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-0 w-full select-none"
      />

      <div className="relative z-10 flex min-h-screen flex-col py-9">
        {/* Marca */}
        <div className="px-6">
          <h2 className="font-hand text-[40px] leading-[0.95] text-white">
            Blue
            <br />
            Book
          </h2>
          <p className="font-hand mt-3 text-[15px] leading-snug text-white/55">
            un diario.
            <br />
            tu música.
            <br />
            tu historia.
          </p>
        </div>

        <hr className="mx-6 my-6 border-white/10" />

        <SidebarNav />

        {/* Spacer empuja el avatar al pie sobre la imagen ambient */}
        <div className="flex-1" />

        {/* Avatar — encima de la imagen, con backdrop sutil para legibilidad */}
        {user && (
          <div className="relative z-20 mx-3 mb-3 flex items-center gap-3 rounded-xl bg-black/30 px-3 py-2.5 backdrop-blur-sm">
            <div className="relative h-9 w-9 flex-shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-orange-300 via-amber-700 to-stone-900 ring-2 ring-white/30">
              {user.avatarUrl && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={user.avatarUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              )}
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-[12px] font-medium text-white">
                {user.displayName || user.username || "Tu cuenta"}
                <span className="ml-1 text-[var(--color-spark)]">✦</span>
              </p>
              <div className="flex items-center gap-2 text-[10px] text-white/65">
                <Link href="/profile" className="hover:text-white">
                  perfil
                </Link>
                <span className="text-white/30">·</span>
                <form
                  action={async () => {
                    "use server";
                    await signOut({ redirectTo: "/" });
                  }}
                >
                  <button
                    type="submit"
                    className="text-white/65 hover:text-white"
                  >
                    salir
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
