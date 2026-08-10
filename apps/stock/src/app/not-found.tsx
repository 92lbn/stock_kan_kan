import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-4xl" aria-hidden>
        🔍
      </p>
      <h1 className="text-xl font-semibold text-ink">
        Page introuvable
      </h1>
      <p className="max-w-sm text-sm text-muted">
        Cette page n&apos;existe pas ou a été déplacée.
      </p>
      <Link
        href="/"
        className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-surface"
      >
        Retour à l&apos;accueil
      </Link>
    </div>
  );
}
