import { NextResponse } from "next/server";
import { auth } from "@/auth";

/**
 * Endpoint para que el cliente sepa quién está logueado.
 *
 * Convención del producto: si no hay sesión, devolvemos { user: null } con
 * status 200 (NO 401). Esto evita ruido en consola y permite a los componentes
 * decidir el render condicionalmente sin manejar errores.
 */
export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({
    user: {
      id: session.user.id,
      email: session.user.email,
      username: session.user.username,
      displayName: session.user.displayName,
      avatarUrl: session.user.image,
    },
  });
}
