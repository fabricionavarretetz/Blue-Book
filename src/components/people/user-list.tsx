import Link from "next/link";

/**
 * Lista de usuarios para vistas /u/:username/followers y /following.
 * Componente compartido entre ambas; la diferencia es solo el title.
 */
type UserListItem = {
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
};

export function UserList({ users, emptyMsg }: { users: UserListItem[]; emptyMsg: string }) {
  if (users.length === 0) {
    return <p className="text-sm text-ink-muted">{emptyMsg}</p>;
  }

  return (
    <ul className="space-y-2">
      {users.map((u) => (
        <li key={u.username}>
          <Link
            href={`/u/${u.username}`}
            className="flex items-center gap-3 rounded-xl border border-line bg-paper-card p-4 transition-shadow hover:shadow-md"
          >
            <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-amber-300 via-amber-700 to-stone-900 ring-2 ring-paper-card">
              {u.avatarUrl && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={u.avatarUrl} alt="" className="h-full w-full object-cover" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-ink">{u.displayName}</p>
              <p className="truncate text-sm text-ink-soft">@{u.username}</p>
              {u.bio && <p className="mt-0.5 truncate text-xs text-ink-muted">{u.bio}</p>}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
