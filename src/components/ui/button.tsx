import { forwardRef, type ButtonHTMLAttributes } from "react";

/**
 * Botón primitivo con 3 variantes: primary | secondary | ghost.
 * Estilos placeholder — se reemplazan cuando integremos Claude Design.
 */

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  block?: boolean;
};

const VARIANTS: Record<Variant, string> = {
  primary: "bg-stone-900 text-white hover:bg-stone-800 disabled:opacity-50",
  secondary:
    "border border-stone-300 bg-white text-stone-900 hover:bg-stone-100 disabled:opacity-50",
  ghost: "text-stone-500 hover:text-stone-900 disabled:opacity-50",
};

const SIZES: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "primary", size = "md", block = false, className = "", ...rest },
  ref,
) {
  const cls = [
    "rounded transition-colors",
    VARIANTS[variant],
    SIZES[size],
    block && "w-full",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <button ref={ref} className={cls} {...rest} />;
});
