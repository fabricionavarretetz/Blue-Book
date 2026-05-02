import Link from "next/link";
import { RegisterForm } from "./register-form";

export default function RegisterPage() {
  return (
    <>
      <h1 className="mb-6 text-xl font-semibold text-stone-900">Crear cuenta</h1>
      <RegisterForm />
      <p className="mt-6 text-center text-sm text-stone-600">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="text-stone-900 underline hover:text-stone-700">
          Iniciar sesión
        </Link>
      </p>
    </>
  );
}
