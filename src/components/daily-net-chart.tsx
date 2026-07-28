// Graphique du solde net par jour — SVG maison, sans librairie de charts.
// Ligne de zéro, barres positives (olive) / négatives (braise), axes lisibles.
export function DailyNetChart({ data }: { data: { day: number; net: number }[] }) {
  if (data.length === 0) return <p className="text-sm text-muted">Aucune donnée.</p>;

  const W = 720;
  const H = 200;
  const padX = 28;
  const padY = 20;
  const plotW = W - padX * 2;
  const plotH = H - padY * 2;

  const maxAbs = Math.max(1, ...data.map((d) => Math.abs(d.net)));
  const zeroY = padY + plotH / 2;
  const barW = plotW / data.length;
  const scale = (v: number) => (v / maxAbs) * (plotH / 2);

  const eur = (v: number) =>
    new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(v);

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-48 w-full min-w-[560px]"
        role="img"
        aria-label="Solde net par jour du mois"
      >
        <line x1={padX} y1={padY} x2={padX} y2={H - padY} stroke="var(--line)" strokeWidth="1" />
        <line x1={padX} y1={zeroY} x2={W - padX} y2={zeroY} stroke="var(--muted)" strokeWidth="1" />
        <text x={4} y={padY + 4} className="fill-[var(--muted)] text-[10px]">
          +{eur(maxAbs)}
        </text>
        <text x={4} y={H - padY} className="fill-[var(--muted)] text-[10px]">
          −{eur(maxAbs)}
        </text>

        {data.map((d, i) => {
          const x = padX + i * barW + barW * 0.15;
          const w = barW * 0.7;
          const h = Math.abs(scale(d.net));
          const y = d.net >= 0 ? zeroY - h : zeroY;
          const positive = d.net >= 0;
          return (
            <g key={d.day}>
              <rect
                x={x}
                y={y}
                width={w}
                height={Math.max(h, d.net === 0 ? 0 : 1)}
                fill={positive ? "var(--positive)" : "var(--accent)"}
              >
                <title>{`Jour ${d.day} : ${positive ? "+" : "−"}${eur(Math.abs(d.net))} €`}</title>
              </rect>
              {(d.day === 1 || d.day % 5 === 0) && (
                <text
                  x={x + w / 2}
                  y={H - padY + 12}
                  textAnchor="middle"
                  className="fill-[var(--muted)] text-[9px]"
                >
                  {d.day}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
