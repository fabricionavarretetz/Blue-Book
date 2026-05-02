"use client";

import { useActionState } from "react";
import { loginAction, type AuthFormState } from "@/lib/actions/auth";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<AuthFormState | undefined, FormData>(
    loginAction,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-stone-700">Email</span>
        <input
          type="email"
          name="email"
          autoComplete="email"
          required
          className="rounded border border-stone-300 px-3 py-2 focus:border-stone-500 focus:outline-none"
        />
        {state?.fieldErrors?.email && (
          <span className="text-xs text-red-600">{state.fieldErrors.email[0]}</span>
        )}
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-stone-700">Contraseña</span>
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          className="rounded border border-stone-300 px-3 py-2 focus:border-stone-500 focus:outline-none"
        />
        {state?.fieldErrors?.password && (
          <span className="text-xs text-red-600">{state.fieldErrors.password[0]}</span>
        )}
      </label>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded bg-stone-900 px-4 py-2 text-sm text-white hover:bg-stone-800 disabled:opacity-50"
      >
        {pending ? "Entrando…" : "Iniciar sesión"}
      </button>
    </form>
  );
}
