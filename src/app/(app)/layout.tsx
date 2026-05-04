import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";

/**
 * Layout compartido para rutas autenticadas (Mi diario, Explorar, etc.).
 * Incluye sidebar persistente en desktop y aplica el fondo cálido global.
 *
 * Protección: si no hay sesión, redirige a /login conservando la URL pedida.
 * El proxy de Next ya hace esta misma comprobación a nivel edge — esto es
 * defensa en profundidad por si se desactivara el proxy.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar
        activeKey="diary"
        user={{
          displayName: session.user.displayName ?? null,
          username: session.user.username ?? null,
          avatarUrl: session.user.image ?? null,
        }}
      />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
