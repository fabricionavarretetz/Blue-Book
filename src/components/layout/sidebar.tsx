import Link from "next/link";

/**
 * Sidebar vertical persistente en desktop. Mobile lo colapsa (Día 12).
 *
 * Estructura:
 *   - Background: gradient azul nocturno + imagen `/sidebar-ambient.png`
 *     anclada al pie. La imagen es el crop directo del mockup, garantiza
 *     fidelidad 1:1 con la dirección visual diseñada.
 *   - Contenido (z-10): marca, tagline, nav links, avatar al pie.
 *
 * Width 192px = ancho exacto del sidebar en el mockup original.
 */

type SidebarProps = {
  activeKey?: "diary" | "explore" | "people" | "stories" | "timeline" | "saved";
  user?: {
    displayName?: string | null;
    username?: string | null;
    avatarUrl?: string | null;
  };
};

const ICONS = {
  diary: (
    <svg viewBox="0 0 24 24" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5a2 2 0 0 1 2-2h11v18H6a2 2 0 0 1-2-2V5z" />
      <path d="M9 7h5M9 11h4" />
    </svg>
  ),
  explore: (
    <svg viewBox="0 0 24 24" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4.35-4.35" />
    </svg>
  ),
  people: (
    <svg viewBox="0 0 24 24" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3 20c0-3 3-5 6-5s6 2 6 5" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M16 14c2.5 0 5 1.5 5 4" />
    </svg>
  ),
  stories: (
    <svg viewBox="0 0 24 24" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4z" />
      <path d="M5 17h14" />
    </svg>
  ),
  timeline: (
    <svg viewBox="0 0 24 24" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="6" width="16" height="14" rx="2" />
      <path d="M4 10h16M9 3v4M15 3v4" />
    </svg>
  ),
  saved: (
    <svg viewBox="0 0 24 24" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  ),
};

export function Sidebar({ activeKey = "diary", user }: SidebarProps) {
  const items: Array<{
    key: keyof typeof ICONS;
    href: string;
    label: string;
    enabled: boolean;
  }> = [
    { key: "diary", href: "/diary", label: "Mi diario", enabled: true },
    { key: "explore", href: "/explore", label: "Explorar", enabled: false },
    { key: "people", href: "/people", label: "Personas", enabled: false },
    { key: "stories", href: "/stories", label: "Historias", enabled: false },
    { key: "timeline", href: "/timeline", label: "Timeline", enabled: false },
    { key: "saved", href: "/saved", label: "Guardado", enabled: false },
  ];

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

        {/* Nav */}
        <nav className="flex flex-col gap-1 px-3">
          {items.map((item) => {
            const isActive = item.key === activeKey;
            const baseClasses =
              "flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-[14px] transition-colors";
            const stateClasses = isActive
              ? "bg-white/10 text-white"
              : item.enabled
                ? "text-white/65 hover:bg-white/5 hover:text-white"
                : "text-white/40 cursor-not-allowed";

            const content = (
              <>
                <span className="h-[18px] w-[18px] flex-shrink-0">{ICONS[item.key]}</span>
                <span>{item.label}</span>
              </>
            );

            return item.enabled ? (
              <Link key={item.key} href={item.href} className={`${baseClasses} ${stateClasses}`}>
                {content}
              </Link>
            ) : (
              <div key={item.key} className={`${baseClasses} ${stateClasses}`}>
                {content}
              </div>
            );
          })}
        </nav>

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
              <Link
                href="/profile"
                className="text-[10px] text-white/65 hover:text-white"
              >
                ver perfil
              </Link>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
