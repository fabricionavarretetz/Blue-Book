import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { UserList } from "@/components/people/user-list";

export default async function FollowersPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true, displayName: true, username: true },
  });

  if (!user) notFound();

  // Followers = filas Follow donde followeeId = user.id
  const follows = await prisma.follow.findMany({
    where: { followeeId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      follower: {
        select: { username: true, displayName: true, avatarUrl: true, bio: true },
      },
    },
  });

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <header className="mb-6">
        <Link
          href={`/u/${user.username}`}
          className="text-sm text-ink-soft hover:text-ink"
        >
          ← {user.displayName}
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-ink">Seguidores</h1>
        <p className="text-sm text-ink-soft">
          Personas que siguen a @{user.username}
        </p>
      </header>

      <UserList
        users={follows.map((f) => f.follower)}
        emptyMsg={`@${user.username} aún no tiene seguidores.`}
      />
    </main>
  );
}
