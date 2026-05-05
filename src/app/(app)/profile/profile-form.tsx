"use client";

import { useActionState } from "react";
import { updateProfileAction, type ProfileFormState } from "@/lib/actions/profile";
import { Button } from "@/components/ui/button";

type Props = {
  initial: {
    displayName: string;
    username: string;
    bio: string;
    avatarUrl: string;
  };
};

export function ProfileForm({ initial }: Props) {
  const [state, formAction, pending] = useActionState<ProfileFormState | undefined, FormData>(
    updateProfileAction,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-ink">Nombre para mostrar</span>
        <input
          type="text"
          name="displayName"
          defaultValue={initial.displayName}
          required
          maxLength={50}
          className="rounded-lg border border-line bg-paper-card px-3 py-2 focus:border-ink focus:outline-none"
        />
        {state?.fieldErrors?.displayName && (
          <span className="text-xs text-red-600">{state.fieldErrors.displayName[0]}</span>
        )}
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-ink">
          Username <span className="font-normal text-ink-muted">(handle público)</span>
        </span>
        <div className="flex items-center gap-1 rounded-lg border border-line bg-paper-card focus-within:border-ink">
          <span className="pl-3 text-ink-soft">@</span>
          <input
            type="text"
            name="username"
            defaultValue={initial.username}
            required
            minLength={2}
            maxLength={20}
            pattern="[a-z0-9_]+"
            className="flex-1 bg-transparent py-2 pr-3 focus:outline-none"
          />
        </div>
        {state?.fieldErrors?.username && (
          <span className="text-xs text-red-600">{state.fieldErrors.username[0]}</span>
        )}
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-ink">
          Bio <span className="font-normal text-ink-muted">(opcional, hasta 160)</span>
        </span>
        <textarea
          name="bio"
          defaultValue={initial.bio}
          rows={3}
          maxLength={160}
          className="resize-none rounded-lg border border-line bg-paper-card px-3 py-2 focus:border-ink focus:outline-none"
        />
        {state?.fieldErrors?.bio && (
          <span className="text-xs text-red-600">{state.fieldErrors.bio[0]}</span>
        )}
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-ink">
          Avatar URL <span className="font-normal text-ink-muted">(opcional)</span>
        </span>
        <input
          type="url"
          name="avatarUrl"
          defaultValue={initial.avatarUrl}
          placeholder="https://…"
          maxLength={500}
          className="rounded-lg border border-line bg-paper-card px-3 py-2 focus:border-ink focus:outline-none"
        />
        {state?.fieldErrors?.avatarUrl && (
          <span className="text-xs text-red-600">{state.fieldErrors.avatarUrl[0]}</span>
        )}
      </label>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.ok && <p className="text-sm text-emerald-700">Perfil actualizado.</p>}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Guardar"}
        </Button>
      </div>
    </form>
  );
}
