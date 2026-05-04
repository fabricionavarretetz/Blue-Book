import { requireAuth } from "@/lib/auth-guard";
import { NewEntryForm } from "./new-entry-form";

/**
 * /diary/new — pantalla de creación de entry.
 *
 * Por ahora es page completa. Cuando arranquemos polish visual (Día 13+),
 * se promueve a modal/drawer para que el flow sea más rápido.
 */
export default async function NewEntryPage() {
  await requireAuth("/diary/new");

  return (
    <main className="mx-auto max-w-xl px-6 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-ink">Nueva entrada</h1>
        <p className="mt-1 text-sm text-ink-soft">Captura un momento.</p>
      </header>
      <NewEntryForm />
    </main>
  );
}
