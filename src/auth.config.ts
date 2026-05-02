import type { NextAuthConfig } from "next-auth";

/**
 * Configuración edge-safe de Auth.js: cosas que no requieren Node APIs ni
 * librerías pesadas (Prisma, bcrypt). Esta config es la que carga el
 * middleware de Next.js (que corre en edge runtime).
 *
 * El config completo (con Prisma adapter + providers con bcrypt) vive en
 * src/auth.ts y extiende este.
 */
export default {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    /**
     * Llamado por el middleware cuando alguien intenta acceder a una ruta.
     * Se usará en Día 4 cuando añadamos protección de rutas.
     * Por ahora deja todo público; el guard real lo haremos a nivel de página.
     */
    authorized() {
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
