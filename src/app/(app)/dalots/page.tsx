import Link from "next/link";
import { requireSessionWithContext } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createDalotAction, createDalotSeriesAction, deleteDalotSeriesAction } from "@/lib/actions/dalots";
import { NewDalotForm, NewSeriesForm } from "./new-dalot-forms";
import { seriesTable } from "./series";

const STATUS_STYLES: Record<string, { label: string; cls: string }> = {
  conforme: { label: "Conforme", cls: "bg-green-100 text-green-700" },
  non_conforme: { label: "Non conforme", cls: "bg-red-100 text-red-700" },
  non_verifie: { label: "Non vérifié", cls: "bg-amber-100 text-amber-700" },
};

const fr = (x: number, d = 2) => x.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });

export default async function DalotsPage({ searchParams }: { searchParams: Promise<{ serie?: string }> }) {
  const { organization } = await requireSessionWithContext();
  const { serie } = await searchParams;
  const studies = await prisma.dalotStudy.findMany({
    where: { organizationId: organization.id },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, seriesName: true, status: true, updatedAt: true },
  });
  const groups = new Map<string, typeof studies>();
  for (const s of studies) {
    const k = s.seriesName ?? "";
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(s);
  }
  const table = serie ? await seriesTable(organization.id, serie) : null;

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-gradient-to-r from-slate-900 to-blue-900 p-6 text-white">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-orange-500 text-lg font-bold">▣</span>
          <div>
            <h1 className="text-xl font-semibold">Dalot<span className="text-orange-400">Pro</span> — calcul des dalots cadres</h1>
            <p className="text-sm text-blue-100">
              Hydrologie et hydraulique, portique par bande de 1 m sur sol élastique, convois du Fascicule 61 titre II promenés pas à pas,
              ferraillage BAEL 91 mod. 99 avec contrôle Eurocode 2, note Word, plans DXF, nomenclature, vue 3D et devis.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 font-semibold text-slate-900">Nouvelle étude</h2>
          <NewDalotForm action={createDalotAction} />
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-1 font-semibold text-slate-900">Générateur de série</h2>
          <p className="mb-3 text-xs text-slate-500">Plusieurs dalots d&apos;un même gabarit, à 2, 3, 4 compartiments ou plus, pour plusieurs longueurs (7 ml, 8 ml…), calculés en une fois.</p>
          <NewSeriesForm action={createDalotSeriesAction} />
        </section>
      </div>

      {table && serie && (
        <section className="rounded-xl border border-orange-200 bg-white p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold text-slate-900">Tableau comparatif — {serie}</h2>
            <div className="flex items-center gap-3 text-sm">
              <a href={`/dalots/series-csv?serie=${encodeURIComponent(serie)}`} className="font-medium text-blue-700 hover:underline">Exporter en CSV</a>
              <form action={deleteDalotSeriesAction}>
                <input type="hidden" name="seriesName" value={serie} />
                <button className="font-medium text-red-600 hover:underline">Supprimer la série</button>
              </form>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Ouvrage</th><th className="px-3 py-2">Cellules</th><th className="px-3 py-2">Longueur</th>
                  <th className="px-3 py-2">Statut</th><th className="px-3 py-2 text-right">Béton corps (m³)</th><th className="px-3 py-2 text-right">Béton total (m³)</th>
                  <th className="px-3 py-2 text-right">Acier (kg)</th><th className="px-3 py-2 text-right">Ratio (kg/m³)</th><th className="px-3 py-2 text-right">Coffrage (m²)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {table.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2"><Link href={`/dalots/${r.id}`} className="font-medium text-blue-800 hover:underline">{r.name}</Link></td>
                    <td className="px-3 py-2">{r.cells}</td>
                    <td className="px-3 py-2">{fr(r.L)} ml</td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[r.status]?.cls}`} title={r.nonConformes.join("\n")}>
                        {STATUS_STYLES[r.status]?.label}{r.nonConformes.length ? ` (${r.nonConformes.length})` : ""}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">{fr(r.concreteBody)}</td>
                    <td className="px-3 py-2 text-right">{fr(r.concrete)}</td>
                    <td className="px-3 py-2 text-right">{fr(r.steel, 0)}</td>
                    <td className="px-3 py-2 text-right">{fr(r.ratio, 0)}</td>
                    <td className="px-3 py-2 text-right">{fr(r.coffrage, 1)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-slate-200 font-semibold">
                <tr>
                  <td className="px-3 py-2" colSpan={4}>Total de la série ({table.length} ouvrages)</td>
                  <td className="px-3 py-2 text-right">{fr(table.reduce((s, r) => s + r.concreteBody, 0))}</td>
                  <td className="px-3 py-2 text-right">{fr(table.reduce((s, r) => s + r.concrete, 0))}</td>
                  <td className="px-3 py-2 text-right">{fr(table.reduce((s, r) => s + r.steel, 0), 0)}</td>
                  <td className="px-3 py-2" />
                  <td className="px-3 py-2 text-right">{fr(table.reduce((s, r) => s + r.coffrage, 0), 1)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="mt-2 text-xs text-slate-500">Survolez un statut pour voir les vérifications non conformes. Ouvrez un ouvrage pour l&apos;optimiser, compléter son étude hydraulique et produire sa note et ses plans.</p>
        </section>
      )}

      <section className="space-y-4">
        {studies.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
            Aucune étude pour l&apos;instant. Partez d&apos;un modèle ou générez une série.
          </div>
        )}
        {Array.from(groups.entries()).map(([name, list]) => (
          <div key={name || "_"}>
            <div className="mb-2 flex items-center gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{name ? `Série : ${name}` : "Études individuelles"}</h3>
              {name && <Link href={`/dalots?serie=${encodeURIComponent(name)}`} className="text-xs font-medium text-orange-700 hover:underline">Tableau comparatif</Link>}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((s) => (
                <Link key={s.id} href={`/dalots/${s.id}`} className="rounded-xl border border-slate-200 bg-white p-4 hover:border-blue-300 hover:shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-medium text-slate-900">{s.name}</div>
                    <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[s.status]?.cls ?? ""}`}>{STATUS_STYLES[s.status]?.label ?? s.status}</span>
                  </div>
                  <div className="mt-2 text-xs text-slate-400">Modifiée le {s.updatedAt.toLocaleDateString("fr-FR")}</div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
