import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  /** Extiende la sesión cliente para incluir campos custom. */
  interface Session {
    user: {
      id: string;
      username?: string;
      displayName?: string;
    } & DefaultSession["user"];
  }

  /** Lo que retorna `authorize()` y se pasa al JWT en el primer login. */
  interface User {
    username?: string;
    displayName?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    username?: string;
    displayName?: string;
  }
}
