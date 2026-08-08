import type { SVGProps } from "react";

// Jeu d'icônes maison (stroke, 24×24, currentColor) — aucune dépendance.
const paths: Record<string, React.ReactNode> = {
  home: <path d="M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5M9.5 21v-6h5v6" />,
  box: (
    <>
      <path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5v-9Z" />
      <path d="M3 7.5 12 12l9-4.5M12 12v9" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="4.5" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 3v3M16 3v3" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  book: (
    <>
      <path d="M5 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 0-2 2V4Z" />
      <path d="M5 20a2 2 0 0 1 2-2h11" />
    </>
  ),
  share: (
    <>
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="17" cy="6" r="2.5" />
      <circle cx="17" cy="18" r="2.5" />
      <path d="M8.2 10.8 14.8 7.2M8.2 13.2l6.6 3.6" />
    </>
  ),
  euro: (
    <>
      <path d="M17 6.5A7 7 0 1 0 17 17.5" />
      <path d="M4 10h9M4 14h9" />
    </>
  ),
  note: (
    <>
      <path d="M5 3h9l5 5v13H5V3Z" />
      <path d="M14 3v5h5M8 13h8M8 17h5" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20a6 6 0 0 1 12 0M16 5.5a3 3 0 0 1 0 5.5M21 20a6 6 0 0 0-4-5.6" />
    </>
  ),
  plus: <path d="M4 7h16M4 12h16M4 17h10" />,
  logout: <path d="M15 4h4v16h-4M11 8l-4 4 4 4M7 12h9" />,
  chart: <path d="M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-8" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
};

export function Icon({ name, ...props }: { name: keyof typeof paths } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
