import type { NextAuthConfig } from "next-auth";

/**
 * Configuración edge-safe de Auth.js: cosas que no requieren Node APIs ni
 * librerías pesadas (Prisma, bcrypt). Esta config es la que carga el
 * middleware de Next.js (que corre en edge runtime).
 *
 * El config completo (con Prisma adapter + providers con bcrypt) vive en
 * src/auth.ts y extiende este.
 */

/** Rutas que requieren sesión activa. Match por prefijo. */
const PROTECTED_PATHS = ["/diary", "/profile", "/settings", "/people"];

/** Rutas de auth (login/register) — si hay sesión, redirigir a home. */
const AUTH_PATHS = ["/login", "/register"];

export default {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    /**
     * Llamado por el middleware en cada request. Decide si la request continúa,
     * se redirige a login, o se redirige a home (si ya logueado en /login).
     */
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = nextUrl;

      const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));
      const isAuthRoute = AUTH_PATHS.some((p) => pathname.startsWith(p));

      if (isProtected && !isLoggedIn) {
        // Redirect a /login con ?from=<ruta original> para volver tras autenticar.
        const loginUrl = new URL("/login", nextUrl);
        loginUrl.searchParams.set("from", pathname + nextUrl.search);
        return Response.redirect(loginUrl);
      }

      if (isAuthRoute && isLoggedIn) {
        // Ya estás logueado, no tiene sentido entrar a /login o /register.
        return Response.redirect(new URL("/", nextUrl));
      }

      return true;
    },
    /**
     * Incluye `username` en el token JWT y la session.
     * (Definido también en auth.ts para mantener tipos consistentes.)
     */
    async jwt({ token, user }) {
      if (user) {
        // En el primer login, copiamos username/displayName al token
        token.username = (user as { username?: string }).username;
        token.displayName = (user as { displayName?: string }).displayName;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? session.user.id;
        session.user.username = token.username as string | undefined;
        session.user.displayName = token.displayName as string | undefined;
      }
      return session;
    },
  },
  providers: [], // se añaden en src/auth.ts (no edge-safe)
} satisfies NextAuthConfig;
