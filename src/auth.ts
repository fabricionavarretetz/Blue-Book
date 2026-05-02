import NextAuth from "next-auth";
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

export const { handlers, signIn, signOut, auth } = NextAuth({
  // PrismaAdapter espera un cliente que implemente la interfaz estándar.
  // Nuestro generated client en TS es compatible.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adapter: PrismaAdapter(prisma as any),
  session: { strategy: "jwt" },
  ...authConfig,
  providers: [
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
    Spotify({
      clientId: process.env.SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
      authorization: {
        params: { scope: SPOTIFY_SCOPES },
      },
      // Vincula cuentas OAuth a un User existente cuando el email coincide.
      // Es seguro porque Spotify nos da un email verificado (controlamos el
      // flujo de redirect, sabemos que el token vino de Spotify).
      allowDangerousEmailAccountLinking: true,
    }),
  ],
});
