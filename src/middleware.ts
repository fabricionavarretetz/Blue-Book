import NextAuth from "next-auth";
import authConfig from "@/auth.config";

/**
 * Middleware de Next.js — corre en edge runtime antes de que la request
 * llegue al server component / API route.
 *
 * Usamos SOLO authConfig (edge-safe), no el auth completo de @/auth, porque
 * el middleware no puede importar Prisma ni bcrypt (no son edge-compatible).
 *
 * La lógica real de redirect vive en authConfig.callbacks.authorized.
 */
export const { auth: middleware } = NextAuth(authConfig);

/**
 * Matcher: el middleware se ejecuta en TODAS las rutas excepto:
 *   - /api/* (los endpoints API hacen su propia validación con auth())
 *   - /_next/static, /_next/image (assets de Next)
 *   - favicon, archivos públicos
 *
 * Sintaxis de matcher: regex negative lookahead.
 */
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
