import Link from "next/link";
import { requireSessionWithContext } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createTenderAction, seedExampleTenderAction } from "@/lib/actions/tenders";
import { computeTenderSummary, RECOMMENDATION_STYLES } from "@/lib/tenders";

export default async function TendersPage() {
  const { organization } = await requireSessionWithContext();

  const tenders = await prisma.tenderAnalysis.findMany({
    where: { organizationId: organization.id },
    include: { documents: true, personnel: true, materiels: true, qualifications: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Appels d&rsquo;offres</h1>
          <p className="mt-1 text-sm text-slate-500">
            Analyse rapide d&rsquo;un DAO : documents, personnel, matériel, qualification, garanties et décision Go/No-Go.
            {" "}{tenders.length} dossier(s) au total.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-4">
        <form action={createTenderAction} className="flex flex-1 min-w-[280px] items-end gap-2 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-500">
              Nouveau dossier d&rsquo;analyse
            </label>
            <input
              name="name"
              required
              placeholder="Ex : AO Bacs à traille - Lot 1"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-blue-800 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900"
          >
            + Créer
          </button>
        </form>

        <form action={seedExampleTenderAction} className="flex items-end rounded-xl border border-dashed border-slate-300 bg-white p-4">
          <button
            type="submit"
            className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900"
          >
            Charger l&rsquo;exemple : Bacs à traille (AGEROUTE)
          </button>
        </form>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tenders.length === 0 ? (
          <div className="col-span-full rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
            Aucun dossier. Créez un dossier ou chargez l&rsquo;exemple pour découvrir l&rsquo;outil.
          </div>
        ) : (
          tenders.map((t) => {
            const summary = computeTenderSummary({
              documents: t.documents,
              personnel: t.personnel,
              materiels: t.materiels,
              qualifications: t.qualifications,
              dateLimiteDepot: t.dateLimiteDepot,
            });
            return (
              <Link
                key={t.id}
                href={`/tenders/${t.id}`}
                className="rounded-xl border border-slate-200 bg-white p-5 hover:border-blue-300 hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold text-slate-900">{t.name}</div>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${RECOMMENDATION_STYLES[summary.recommendation]}`}
                  >
                    {summary.recommendation === "INCOMPLET" ? "À compléter" : summary.recommendation.replace("_", " ")}
                  </span>
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  {t.maitreOuvrage || "Maître d'ouvrage non renseigné"}
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-slate-600">
                    Documents : {summary.docFournis}/{summary.docTotal}
                  </span>
                  <span className="font-medium text-slate-900">
                    {summary.joursRestants !== null
                      ? `${summary.joursRestants} j avant dépôt`
                      : "Date limite non fixée"}
                  </span>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
