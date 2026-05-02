"use client";

import { useActionState } from "react";
import { registerAction, type AuthFormState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { InputField } from "@/components/ui/input-field";

export function RegisterForm() {
  const [state, formAction, pending] = useActionState<AuthFormState | undefined, FormData>(
    registerAction,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <InputField
        label="Nombre para mostrar"
        type="text"
        name="displayName"
        required
        maxLength={50}
        error={state?.fieldErrors?.displayName?.[0]}
      />

      <InputField
        label="Username (handle público)"
        type="text"
        name="username"
        required
        minLength={2}
        maxLength={20}
        pattern="[a-z0-9_]+"
        autoComplete="username"
        placeholder="anita"
        error={state?.fieldErrors?.username?.[0]}
      />

      <InputField
        label="Email"
        type="email"
        name="email"
        autoComplete="email"
        required
        error={state?.fieldErrors?.email?.[0]}
      />

      <InputField
        label="Contraseña (mín. 8)"
        type="password"
        name="password"
        autoComplete="new-password"
        required
        minLength={8}
        maxLength={128}
        error={state?.fieldErrors?.password?.[0]}
      />

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <Button type="submit" block disabled={pending} className="mt-2">
        {pending ? "Creando cuenta…" : "Crear cuenta"}
      </Button>
    </form>
  );
}
