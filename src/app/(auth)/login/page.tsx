import Link from "next/link";
import { LoginForm } from "./login-form";

type Props = {
  searchParams: Promise<{ from?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const { from } = await searchParams;

  return (
    <>
      <h1 className="mb-6 text-xl font-semibold text-stone-900">Iniciar sesión</h1>
      {from && (
        <p className="mb-4 rounded bg-stone-100 px-3 py-2 text-xs text-stone-600">
          Inicia sesión para continuar.
        </p>
      )}
      <LoginForm from={from} />
      <p className="mt-6 text-center text-sm text-stone-600">
        ¿No tienes cuenta?{" "}
        <Link href="/register" className="text-stone-900 underline hover:text-stone-700">
          Crear cuenta
        </Link>
      </p>
    </>
  );
}
