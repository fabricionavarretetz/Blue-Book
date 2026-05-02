import { forwardRef, type InputHTMLAttributes } from "react";

/**
 * Campo de input con label opcional y mensaje de error opcional.
 * Wrapper simple alrededor de <input> para evitar duplicar estilos en
 * cada form. Usar con `name` para forms con server actions.
 */

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

export const InputField = forwardRef<HTMLInputElement, Props>(function InputField(
  { label, error, className = "", id, name, ...rest },
  ref,
) {
  const inputId = id ?? name;
  return (
    <label htmlFor={inputId} className="flex flex-col gap-1 text-sm">
      {label && <span className="text-stone-700">{label}</span>}
      <input
        ref={ref}
        id={inputId}
        name={name}
        className={[
          "rounded border border-stone-300 px-3 py-2 focus:border-stone-500 focus:outline-none",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...rest}
      />
      {error && <span className="text-xs text-red-600">{error}</span>}
    </label>
  );
});
