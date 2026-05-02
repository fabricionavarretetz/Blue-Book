import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-stone-50 px-4 py-12">
      <Link href="/" className="mb-8 text-3xl font-semibold tracking-tight text-stone-900">
        Blue Book
      </Link>
      <div className="w-full max-w-sm rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
        {children}
      </div>
    </main>
  );
}
