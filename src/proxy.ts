import NextAuth from "next-auth";
import authConfig from "@/auth.config";

/**
 * Proxy de Next.js (renombre de "middleware" en Next 16) — corre en edge
 * runtime antes de que la request llegue al server component / API route.
 *
 * Usamos SOLO authConfig (edge-safe), NO el auth completo de @/auth, porque
 * el proxy no puede importar Prisma ni bcrypt (no son edge-compatible).
 *
 * La lógica real de redirect vive en authConfig.callbacks.authorized.
 */
const { auth } = NextAuth(authConfig);

export default auth;

/**
 * Matcher: el proxy se ejecuta en TODAS las rutas excepto:
 *   - /api/* (los endpoints API hacen su propia validación con auth())
 *   - /_next/static, /_next/image (assets de Next)
 *   - favicon, archivos públicos (cualquier ruta con extensión)
 *
 * Sintaxis: regex con negative lookahead.
 */
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
