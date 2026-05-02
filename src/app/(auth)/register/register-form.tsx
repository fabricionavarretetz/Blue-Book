"use client";

import { useActionState } from "react";
import { registerAction, type AuthFormState } from "@/lib/actions/auth";

export function RegisterForm() {
  const [state, formAction, pending] = useActionState<AuthFormState | undefined, FormData>(
    registerAction,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-stone-700">Nombre para mostrar</span>
        <input
          type="text"
          name="displayName"
          required
          maxLength={50}
          className="rounded border border-stone-300 px-3 py-2 focus:border-stone-500 focus:outline-none"
        />
        {state?.fieldErrors?.displayName && (
          <span className="text-xs text-red-600">{state.fieldErrors.displayName[0]}</span>
        )}
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-stone-700">Username (handle público)</span>
        <input
          type="text"
          name="username"
          required
          minLength={2}
          maxLength={20}
          pattern="[a-z0-9_]+"
          autoComplete="username"
          placeholder="anita"
          className="rounded border border-stone-300 px-3 py-2 focus:border-stone-500 focus:outline-none"
        />
        {state?.fieldErrors?.username && (
          <span className="text-xs text-red-600">{state.fieldErrors.username[0]}</span>
        )}
      </label>

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
        <span className="text-stone-700">Contraseña (mín. 8)</span>
        <input
          type="password"
          name="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={128}
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
        {pending ? "Creando cuenta…" : "Crear cuenta"}
      </button>
    </form>
  );
}
