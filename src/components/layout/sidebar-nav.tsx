"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Nav del sidebar. Es client porque resaltar el item activo según la URL
 * requiere `usePathname()`. El resto del sidebar (marca, avatar, signOut)
 * sigue siendo server.
 */

type ItemKey = "diary" | "explore" | "people" | "stories" | "timeline" | "saved";

const ICONS: Record<ItemKey, React.ReactNode> = {
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

const ITEMS: Array<{ key: ItemKey; href: string; label: string; enabled: boolean }> = [
  { key: "diary", href: "/diary", label: "Mi diario", enabled: true },
  { key: "explore", href: "/explore", label: "Explorar", enabled: true },
  { key: "people", href: "/people", label: "Personas", enabled: true },
  { key: "stories", href: "/stories", label: "Historias", enabled: false },
  { key: "timeline", href: "/timeline", label: "Timeline", enabled: false },
  { key: "saved", href: "/saved", label: "Guardado", enabled: false },
];

function activeKeyFromPath(pathname: string): ItemKey | null {
  // Match más específico primero — `/diary/new` cuenta como diary.
  for (const item of ITEMS) {
    if (pathname === item.href || pathname.startsWith(item.href + "/")) {
      return item.key;
    }
  }
  return null;
}

export function SidebarNav() {
  const pathname = usePathname();
  const activeKey = activeKeyFromPath(pathname);

  return (
    <nav className="flex flex-col gap-1 px-3">
      {ITEMS.map((item) => {
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
  );
}
