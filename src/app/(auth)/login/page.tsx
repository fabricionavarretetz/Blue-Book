import Link from "next/link";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <>
      <h1 className="mb-6 text-xl font-semibold text-stone-900">Iniciar sesión</h1>
      <LoginForm />
      <p className="mt-6 text-center text-sm text-stone-600">
        ¿No tienes cuenta?{" "}
        <Link href="/register" className="text-stone-900 underline hover:text-stone-700">
          Crear cuenta
        </Link>
      </p>
    </>
  );
}
