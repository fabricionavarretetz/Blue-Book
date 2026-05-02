import type { HTMLAttributes } from "react";

/**
 * Wrapper visual con borde, sombra suave y padding consistente.
 * Variante `dashed` para empty states.
 */

type Props = HTMLAttributes<HTMLDivElement> & {
  variant?: "solid" | "dashed";
};

export function Card({ variant = "solid", className = "", ...rest }: Props) {
  const cls = [
    "rounded-lg p-6",
    variant === "solid"
      ? "border border-stone-200 bg-white shadow-sm"
      : "border border-dashed border-stone-300 bg-white",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <div className={cls} {...rest} />;
}
