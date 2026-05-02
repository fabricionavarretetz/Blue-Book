import "server-only";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import type { Session } from "next-auth";

/**
 * Helpers de protección de rutas a usar en server components / API routes.
 * El middleware ya hace la primera capa de protección, pero estos helpers
 * son **defensa en profundidad**: si el middleware se desactiva o falla,
 * la ruta sigue protegida.
 */

/**
 * Para usar en **server components / pages** que requieren sesión.
 * Si no hay sesión, redirige a /login conservando la URL original en `?from=`.
 *
 * Uso:
 * ```tsx
 * export default async function DiaryPage() {
 *   const session = await requireAuth();
 *   // session.user.id está garantizado
 * }
 * ```
 */
export async function requireAuth(currentPath?: string): Promise<Session> {
  const session = await auth();
  if (!session?.user?.id) {
    const params = new URLSearchParams();
    if (currentPath) params.set("from", currentPath);
    redirect(`/login${params.size ? `?${params}` : ""}`);
  }
  return session;
}

/**
 * Para usar en **API routes**. Devuelve `{session, error}`:
 *   - Si hay sesión: `{session, error: null}`
 *   - Si no: `{session: null, error: NextResponse 401}`
 *
 * Uso:
 * ```ts
 * export async function GET() {
 *   const { session, error } = await requireAuthApi();
 *   if (error) return error;
 *   // session.user.id está garantizado
 * }
 * ```
 */
export async function requireAuthApi(): Promise<
  { session: Session; error: null } | { session: null; error: NextResponse }
> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      session: null,
      error: NextResponse.json({ error: "No autorizado" }, { status: 401 }),
    };
  }
  return { session, error: null };
}
