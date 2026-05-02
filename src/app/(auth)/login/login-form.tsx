"use client";

import { useActionState } from "react";
import { loginAction, type AuthFormState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { InputField } from "@/components/ui/input-field";

export function LoginForm({ from }: { from?: string }) {
  const [state, formAction, pending] = useActionState<AuthFormState | undefined, FormData>(
    loginAction,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {from && <input type="hidden" name="from" value={from} />}

      <InputField
        label="Email"
        type="email"
        name="email"
        autoComplete="email"
        required
        error={state?.fieldErrors?.email?.[0]}
      />

      <InputField
        label="Contraseña"
        type="password"
        name="password"
        autoComplete="current-password"
        required
        error={state?.fieldErrors?.password?.[0]}
      />

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <Button type="submit" block disabled={pending} className="mt-2">
        {pending ? "Entrando…" : "Iniciar sesión"}
      </Button>
    </form>
  );
}
