import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-4xl" aria-hidden>
        🔍
      </p>
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        Page introuvable
      </h1>
      <p className="max-w-sm text-sm text-zinc-500">
        Cette page n&apos;existe pas ou a été déplacée.
      </p>
      <Link
        href="/"
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-zinc-900"
      >
        Retour à l&apos;accueil
      </Link>
    </div>
  );
}
