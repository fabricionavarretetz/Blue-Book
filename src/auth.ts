import NextAuth, { type NextAuthConfig } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Spotify from "next-auth/providers/spotify";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import authConfig from "./auth.config";

/**
 * Auth.js v5 — configuración runtime completa.
 *
 * Strategy: JWT (stateless). Forzoso al usar Credentials provider.
 * Adapter: Prisma para CRUD de User/Account (Spotify OAuth se vincula aquí).
 *
 * Providers:
 *   - Credentials: login con email + password (bcrypt comparison)
 *   - Spotify: OAuth opcional con vinculación por email
 */

const credentialsSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(8).max(128),
});

// Scopes que pedimos a Spotify desde el primer momento, para no tener que
// re-autorizar cuando integremos features de feed personalizado.
const SPOTIFY_SCOPES = [
  "user-read-email",
  "user-top-read",
  "user-read-recently-played",
].join(" ");

// Lista de providers construida condicionalmente. Spotify solo se incluye
// si las env vars están presentes (en prod, mientras no configuremos OAuth
// con HTTPS en el dashboard de Spotify, dejamos las vars fuera y el provider
// no se carga — la app funciona con email/password sin crashear).
const providers: NextAuthConfig["providers"] = [
  Credentials({
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    authorize: async (raw) => {
      const parsed = credentialsSchema.safeParse(raw);
      if (!parsed.success) return null;

      const user = await prisma.user.findUnique({
        where: { email: parsed.data.email },
      });
      if (!user || !user.passwordHash) return null;

      const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
      if (!ok) return null;

      return {
        id: user.id,
        email: user.email,
        name: user.displayName,
        username: user.username,
        displayName: user.displayName,
        image: user.avatarUrl ?? undefined,
      };
    },
  }),
];

if (process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET && process.env.AUTH_URL) {
  providers.push(
    Spotify({
      clientId: process.env.SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
      authorization: `https://accounts.spotify.com/authorize?scope=${encodeURIComponent(SPOTIFY_SCOPES)}`,
      // Fuerza la redirect_uri exacta independientemente del host del request.
      // IMPORTANTE: termina en `/api/auth`. Auth.js anexa `/callback/<provider>`
      // automáticamente para construir la redirect_uri final.
      redirectProxyUrl: `${process.env.AUTH_URL}/api/auth`,
      // Vincula cuentas OAuth a un User existente cuando el email coincide.
      // Es seguro porque Spotify nos da un email verificado.
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  // PrismaAdapter espera un cliente que implemente la interfaz estándar.
  // Nuestro generated client en TS es compatible.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adapter: PrismaAdapter(prisma as any),
  session: { strategy: "jwt" },
  ...authConfig,
  providers,
});

/** Indica si Spotify OAuth está habilitado en este entorno. La home y otras
 *  páginas pueden usar esto para mostrar/ocultar el botón "Conectar Spotify". */
export const SPOTIFY_OAUTH_ENABLED = providers.length > 1;
