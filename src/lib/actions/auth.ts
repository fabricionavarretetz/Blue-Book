"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { signIn } from "@/auth";
import { AuthError } from "next-auth";

/**
 * Schemas de validación para los formularios de auth.
 * Se aplican en el servidor; nunca confiamos en validación cliente.
 */

const registerSchema = z.object({
  email: z.string().email("Email inválido").toLowerCase(),
  password: z.string().min(8, "Mínimo 8 caracteres").max(128),
  username: z
    .string()
    .min(2, "Mínimo 2 caracteres")
    .max(20, "Máximo 20")
    .regex(/^[a-z0-9_]+$/, "Solo minúsculas, números y guion bajo"),
  displayName: z.string().min(1, "Requerido").max(50),
});

const loginSchema = z.object({
  email: z.string().email("Email inválido").toLowerCase(),
  password: z.string().min(1, "Requerido"),
  // Ruta a la que volver tras login (viene del query param ?from=).
  from: z.string().optional(),
});

/** Solo permitir paths internos como destino post-login (evita open redirect). */
function safeRedirectTo(from: string | undefined): string {
  if (!from) return "/";
  if (!from.startsWith("/") || from.startsWith("//")) return "/";
  return from;
}

export type AuthFormState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

/**
 * Crea un User con email + password (hash bcrypt) y abre sesión.
 */
export async function registerAction(
  _prev: AuthFormState | undefined,
  formData: FormData,
): Promise<AuthFormState> {
  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
    username: formData.get("username"),
    displayName: formData.get("displayName"),
  };

  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { email, password, username, displayName } = parsed.data;

  // Comprobar duplicados antes del insert para dar error legible.
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });
  if (existing) {
    return {
      ok: false,
      error:
        existing.email === email
          ? "Ya existe una cuenta con ese email."
          : "Ese username ya está tomado.",
    };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: { email, passwordHash, username, displayName },
  });

  // Auto-login después de registrar.
  // signIn en server action redirige automáticamente; en su callback acepta `redirectTo`.
  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/",
    });
  } catch (err) {
    // signIn lanza un NEXT_REDIRECT internamente cuando va bien — Next.js
    // lo captura. Si llegamos aquí con AuthError, fue fallo real.
    if (err instanceof AuthError) {
      return { ok: false, error: "Cuenta creada, pero falló el login automático." };
    }
    throw err;
  }

  return { ok: true };
}

/**
 * Inicia sesión con email + password.
 */
export async function loginAction(
  _prev: AuthFormState | undefined,
  formData: FormData,
): Promise<AuthFormState> {
  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
    from: formData.get("from")?.toString(),
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: safeRedirectTo(parsed.data.from),
    });
  } catch (err) {
    if (err instanceof AuthError) {
      // CredentialsSignin = credenciales malas
      if (err.type === "CredentialsSignin") {
        return { ok: false, error: "Credenciales incorrectas." };
      }
      return { ok: false, error: "Error al iniciar sesión." };
    }
    throw err;
  }

  return { ok: true };
}
