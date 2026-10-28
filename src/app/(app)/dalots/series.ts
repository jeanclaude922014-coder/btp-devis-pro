import "server-only";
import { prisma } from "@/lib/db";
import { runStudy } from "@/lib/dalot/engine";
import { normalizeSpec } from "@/lib/dalot/fields";

export type SeriesRow = {
  id: string;
  name: string;
  cells: number;
  L: number;
  status: string;
  nonConformes: string[];
  concreteBody: number;
  concrete: number;
  steel: number;
  ratio: number;
  coffrage: number;
};

/** Recalcule chaque ouvrage d'une série pour le tableau comparatif. */
export async function seriesTable(organizationId: string, seriesName: string): Promise<SeriesRow[]> {
  const studies = await prisma.dalotStudy.findMany({ where: { organizationId, seriesName }, orderBy: { createdAt: "asc" } });
  const rows = studies.map((s) => {
    const spec = normalizeSpec(s.spec);
    const r = runStudy(spec);
    const base = { id: s.id, name: s.name, cells: Number(spec.values.nCells), L: Number(spec.values.L) };
    if (!r.ok) return { ...base, status: "non_verifie", nonConformes: r.missing, concreteBody: 0, concrete: 0, steel: 0, ratio: 0, coffrage: 0 };
    const q = r.study.quantities;
    return {
      ...base,
      status: r.study.status,
      nonConformes: r.study.checks.filter((c) => c.status === "non_conforme").map((c) => `${c.element} : ${c.label}`),
      concreteBody: q.lines.find((l) => l.designation.includes("corps"))?.quantity ?? 0,
      concrete: q.concrete,
      steel: q.steelMass,
      ratio: q.ratio,
      coffrage: q.lines.find((l) => l.lot === "Coffrages")?.quantity ?? 0,
    };
  });
  return rows.sort((a, b) => a.cells - b.cells || a.L - b.L);
}
