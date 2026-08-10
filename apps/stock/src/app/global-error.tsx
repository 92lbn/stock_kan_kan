"use client";

// Remplace le layout racine si une erreur remonte jusqu'au sommet : doit donc
// fournir ses propres <html> et <body>.
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fr">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          minHeight: "100dvh",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          textAlign: "center",
          padding: "2rem",
        }}
      >
        <h1 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Erreur critique</h1>
        <p style={{ color: "#71717a", maxWidth: "24rem" }}>
          L&apos;application a rencontré un problème inattendu.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            borderRadius: "0.375rem",
            background: "#18181b",
            color: "#fff",
            padding: "0.5rem 1rem",
            fontSize: "0.875rem",
          }}
        >
          Recharger
        </button>
      </body>
    </html>
  );
}
