import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { UserList } from "@/components/people/user-list";

export default async function FollowingPage({
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

  // Following = filas Follow donde followerId = user.id
  const follows = await prisma.follow.findMany({
    where: { followerId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      followee: {
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
        <h1 className="mt-2 text-2xl font-bold text-ink">Siguiendo</h1>
        <p className="text-sm text-ink-soft">
          Personas a las que sigue @{user.username}
        </p>
      </header>

      <UserList
        users={follows.map((f) => f.followee)}
        emptyMsg={`@${user.username} aún no sigue a nadie.`}
      />
    </main>
  );
}
