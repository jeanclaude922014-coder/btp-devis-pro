import { requireSessionWithContext } from "@/lib/auth";
import { seriesTable } from "../series";

export async function GET(request: Request) {
  const { organization } = await requireSessionWithContext();
  const serie = new URL(request.url).searchParams.get("serie") ?? "";
  const rows = await seriesTable(organization.id, serie);
  const f = (x: number, d = 2) => x.toFixed(d).replace(".", ",");
  const head = ["Ouvrage", "Cellules", "Longueur (ml)", "Statut", "Béton corps (m3)", "Béton total (m3)", "Acier (kg)", "Ratio (kg/m3)", "Coffrage (m2)", "Non-conformités"];
  const lines = rows.map((r) => [r.name, r.cells, f(r.L), r.status, f(r.concreteBody), f(r.concrete), f(r.steel, 0), f(r.ratio, 0), f(r.coffrage, 1), r.nonConformes.join(" | ")]
    .map((x) => `"${String(x).replace(/"/g, '""')}"`).join(";"));
  const csv = "﻿" + [head.join(";"), ...lines].join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="serie-dalots.csv"`,
    },
  });
}
