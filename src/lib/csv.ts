// Génère un CSV (séparateur ';' pour Excel FR) à partir d'un en-tête et de lignes.
function escapeCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[";\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(headers: string[], rows: (unknown[])[]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCell).join(";"));
  // BOM UTF-8 pour qu'Excel reconnaisse les accents.
  return "﻿" + lines.join("\r\n");
}

export function csvResponse(filename: string, body: string): Response {
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
