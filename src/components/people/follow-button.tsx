"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { followAction, unfollowAction } from "@/lib/actions/follow";

/**
 * Botón toggle Seguir/Siguiendo. Optimistic update: cambia visual
 * inmediato y revierte si la action falla.
 *
 * - Si no hay sesión: oculto (el padre decide si mostrar otro CTA).
 * - Si es tu propio perfil: oculto.
 * - Hover en "Siguiendo" cambia el texto a "Dejar de seguir".
 */
type Props = {
  targetUsername: string;
  initiallyFollowing: boolean;
};

export function FollowButton({ targetUsername, initiallyFollowing }: Props) {
  const [following, setFollowing] = useState(initiallyFollowing);
  const [pending, startTransition] = useTransition();
  const [hover, setHover] = useState(false);
  const router = useRouter();

  const onClick = () => {
    const next = !following;
    setFollowing(next); // optimistic
    startTransition(async () => {
      try {
        if (next) {
          await followAction(targetUsername);
        } else {
          await unfollowAction(targetUsername);
        }
        router.refresh();
      } catch {
        setFollowing(!next); // revert
      }
    });
  };

  const label = following ? (hover ? "Dejar de seguir" : "Siguiendo") : "Seguir";

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      disabled={pending}
      className={
        following
          ? "rounded-full border border-line bg-paper-card px-4 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
          : "rounded-full bg-ink px-4 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      }
    >
      {label}
    </button>
  );
}
