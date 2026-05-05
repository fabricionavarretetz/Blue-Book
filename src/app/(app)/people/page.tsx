import { requireAuth } from "@/lib/auth-guard";
import { PeopleSearch } from "./people-search";

/**
 * /people — descubrir y buscar usuarios. Punto de entrada al loop social.
 */
export default async function PeoplePage() {
  await requireAuth("/people");

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-ink">Personas</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Encuentra a otros que también guardan momentos con música.
        </p>
      </header>

      <PeopleSearch />
    </main>
  );
}
