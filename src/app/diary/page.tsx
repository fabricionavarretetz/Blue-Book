import Link from "next/link";
import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/card";

export default async function DiaryPage() {
  const session = await requireAuth("/diary");

  const entries = await prisma.entry.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-stone-900">Tu diario</h1>
          <p className="mt-1 text-sm text-stone-600">
            @{session.user.username} · {entries.length} momento{entries.length === 1 ? "" : "s"}
          </p>
        </div>
        <Link href="/" className="text-sm text-stone-600 hover:text-stone-900">
          ← Inicio
        </Link>
      </header>

      {entries.length === 0 ? (
        <Card variant="dashed" className="p-12 text-center">
          <p className="text-stone-600">Aún no has registrado ningún momento.</p>
          <p className="mt-2 text-sm text-stone-500">
            En próximos días podrás buscar canciones y empezar tu diario.
          </p>
        </Card>
      ) : (
        <ul className="space-y-3">
          {entries.map((e) => (
            <li key={e.id}>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{e.reaction}</span>
                  <span className="text-stone-700">spotify:{e.spotifyId}</span>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
