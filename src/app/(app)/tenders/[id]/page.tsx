import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSessionWithContext } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatXof } from "@/lib/pricing";
import {
  computeTenderSummary,
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_STATUS_STYLES,
  RECOMMENDATION_STYLES,
} from "@/lib/tenders";
import {
  deleteTenderAction,
  updateTenderIdentificationAction,
  updateTenderGarantiesAction,
  updateTenderDecisionAction,
  addDocumentAction,
  updateDocumentAction,
  deleteDocumentAction,
  addPersonnelAction,
  updatePersonnelAction,
  deletePersonnelAction,
  addMaterielAction,
  updateMaterielAction,
  deleteMaterielAction,
  addQualificationAction,
  updateQualificationAction,
  deleteQualificationAction,
} from "@/lib/actions/tenders";
import { AutoSubmitForm } from "../../_components/auto-submit-form";

const inputCls =
  "mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600";
const cellInputCls =
  "w-full rounded border border-transparent px-1 py-1 text-sm hover:border-slate-300 focus:border-blue-500 focus:outline-none";

function toDateInputValue(d: Date | null): string {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

export default async function TenderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { organization } = await requireSessionWithContext();

  const tender = await prisma.tenderAnalysis.findFirst({
    where: { id, organizationId: organization.id },
    include: {
      documents: { orderBy: { position: "asc" } },
      personnel: { orderBy: { position: "asc" } },
      materiels: { orderBy: { position: "asc" } },
      qualifications: { orderBy: { position: "asc" } },
    },
  });
  if (!tender) notFound();

  const summary = computeTenderSummary({
    documents: tender.documents,
    personnel: tender.personnel,
    materiels: tender.materiels,
    qualifications: tender.qualifications,
    dateLimiteDepot: tender.dateLimiteDepot,
  });

  const updateIdentification = updateTenderIdentificationAction.bind(null, tender.id);
  const updateGaranties = updateTenderGarantiesAction.bind(null, tender.id);
  const updateDecision = updateTenderDecisionAction.bind(null, tender.id);

  return (
    <div className="max-w-5xl space-y-6 pb-20">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/tenders" className="text-sm text-blue-700 hover:underline">
            ← Appels d&rsquo;offres
          </Link>
          <h1 className="mt-1 text-xl font-semibold text-slate-900">{tender.name}</h1>
        </div>
        <form action={deleteTenderAction}>
          <input type="hidden" name="tenderId" value={tender.id} />
          <button type="submit" className="text-sm font-medium text-red-600 hover:underline">
            Supprimer le dossier
          </button>
        </form>
      </div>

      {/* Synthèse Go/No-Go (sticky, toujours visible) */}
      <div
        className={`sticky top-0 z-10 rounded-xl border p-5 shadow-sm ${RECOMMENDATION_STYLES[summary.recommendation]}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="font-semibold">{summary.recommendationLabel}</div>
          <div className="flex flex-wrap gap-4 text-sm">
            <span>Documents : {summary.docFournis}/{summary.docTotal} ({Math.round(summary.docProgress * 100)}%)</span>
            <span>Personnel manquant : {summary.personnelGaps}</span>
            <span>Matériel manquant : {summary.materielGaps}</span>
            <span>Critères non conformes : {summary.qualificationNonConformes}</span>
            <span>
              {summary.joursRestants !== null
                ? `${summary.joursRestants} j avant dépôt`
                : "Date limite non fixée"}
            </span>
          </div>
        </div>
      </div>

      {/* 1. Identification */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-slate-700">1. Identification du marché</h2>
        <AutoSubmitForm action={updateIdentification} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-500">Nom du dossier</label>
            <input name="name" defaultValue={tender.name} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500">Maître d&rsquo;ouvrage</label>
            <input name="maitreOuvrage" defaultValue={tender.maitreOuvrage ?? ""} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500">Maître d&rsquo;ouvrage délégué</label>
            <input name="maitreOuvrageDelegue" defaultValue={tender.maitreOuvrageDelegue ?? ""} className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-500">Objet des travaux</label>
            <textarea name="objet" defaultValue={tender.objet ?? ""} rows={2} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500">Financement</label>
            <input name="financement" defaultValue={tender.financement ?? ""} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500">Mode de passation</label>
            <input name="modePassation" defaultValue={tender.modePassation ?? ""} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500">Référence AAO</label>
            <input name="referenceAao" defaultValue={tender.referenceAao ?? ""} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500">Nombre de lots</label>
            <input name="nombreLots" type="number" min="0" defaultValue={tender.nombreLots ?? ""} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500">Montant estimé (FCFA)</label>
            <input name="montantEstime" type="number" min="0" defaultValue={tender.montantEstime ?? ""} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500">Prix du dossier (FCFA)</label>
            <input name="prixDossier" type="number" min="0" defaultValue={tender.prixDossier ?? ""} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500">Plateforme de dépôt</label>
            <input name="plateformeDepot" defaultValue={tender.plateformeDepot ?? ""} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500">Contact</label>
            <input name="contactNom" defaultValue={tender.contactNom ?? ""} className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-500">Téléphone du contact</label>
            <input name="contactTelephone" defaultValue={tender.contactTelephone ?? ""} className={inputCls} />
          </div>
        </AutoSubmitForm>
      </section>

      {/* 2. Documents */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">
            2. Documents administratifs ({summary.docFournis}/{summary.docTotal})
          </h2>
          <div className="h-2 w-40 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full bg-green-500"
              style={{ width: `${Math.round(summary.docProgress * 100)}%` }}
            />
          </div>
        </div>

        <div className="mt-4 divide-y divide-slate-100">
          {tender.documents.map((doc) => (
            <AutoSubmitForm
              key={doc.id}
              action={updateDocumentAction}
              className="grid grid-cols-12 items-center gap-2 py-2"
            >
              <input type="hidden" name="documentId" value={doc.id} />
              <div className="col-span-6 text-sm text-slate-700">{doc.label}</div>
              <select
                name="status"
                defaultValue={doc.status}
                className={`col-span-2 rounded-full px-2 py-1 text-xs font-medium ${DOCUMENT_STATUS_STYLES[doc.status] ?? ""}`}
              >
                <option value="manquant">{DOCUMENT_STATUS_LABELS.manquant}</option>
                <option value="en_cours">{DOCUMENT_STATUS_LABELS.en_cours}</option>
                <option value="fourni">{DOCUMENT_STATUS_LABELS.fourni}</option>
              </select>
              <input
                name="comment"
                placeholder="Commentaire"
                defaultValue={doc.comment ?? ""}
                className={`col-span-3 ${cellInputCls}`}
              />
              <button
                type="submit"
                formAction={deleteDocumentAction}
                formNoValidate
                className="col-span-1 justify-self-end text-xs text-red-500 hover:underline"
              >
                ✕
              </button>
            </AutoSubmitForm>
          ))}
        </div>

        <form action={addDocumentAction} className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
          <input type="hidden" name="tenderId" value={tender.id} />
          <input
            name="label"
            placeholder="Ajouter une pièce à fournir"
            required
            className="flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
          <button type="submit" className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-900">
            Ajouter
          </button>
        </form>
      </section>

      {/* 3. Personnel */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-slate-700">
          3. Personnel clé exigé {summary.personnelGaps > 0 && (
            <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
              {summary.personnelGaps} poste(s) à recruter
            </span>
          )}
        </h2>

        {tender.personnel.length > 0 && (
          <table className="mt-4 w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="py-1 pr-2">Poste</th>
                <th className="py-1 pr-2">Nb exigé</th>
                <th className="py-1 pr-2">Formation exigée</th>
                <th className="py-1 pr-2">Expérience exigée</th>
                <th className="py-1 pr-2">Nb disponible</th>
                <th className="py-1" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tender.personnel.map((p) => {
                const gap = p.nbDisponible < p.nbExige;
                return (
                  <tr key={p.id}>
                    <td colSpan={6} className="p-0">
                      <AutoSubmitForm
                        action={updatePersonnelAction}
                        className={`grid grid-cols-12 items-center gap-1 py-1.5 ${gap ? "bg-red-50" : ""}`}
                      >
                        <input type="hidden" name="personnelId" value={p.id} />
                        <input name="poste" defaultValue={p.poste} className={`col-span-3 ${cellInputCls}`} />
                        <input
                          name="nbExige"
                          type="number"
                          min="0"
                          defaultValue={p.nbExige}
                          className={`col-span-1 ${cellInputCls}`}
                        />
                        <input
                          name="formationExigee"
                          defaultValue={p.formationExigee ?? ""}
                          className={`col-span-3 ${cellInputCls}`}
                        />
                        <input
                          name="experienceExigee"
                          defaultValue={p.experienceExigee ?? ""}
                          className={`col-span-3 ${cellInputCls}`}
                        />
                        <input
                          name="nbDisponible"
                          type="number"
                          min="0"
                          defaultValue={p.nbDisponible}
                          className={`col-span-1 ${cellInputCls}`}
                        />
                        <button
                          type="submit"
                          formAction={deletePersonnelAction}
                          formNoValidate
                          className="col-span-1 justify-self-end text-xs text-red-500 hover:underline"
                        >
                          ✕
                        </button>
                      </AutoSubmitForm>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <form action={addPersonnelAction} className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
          <input type="hidden" name="tenderId" value={tender.id} />
          <input name="poste" placeholder="Poste (ex: Conducteur des travaux)" required className="flex-1 min-w-[200px] rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
          <input name="nbExige" type="number" min="1" defaultValue={1} placeholder="Nb" className="w-20 rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
          <input name="formationExigee" placeholder="Formation exigée" className="flex-1 min-w-[180px] rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
          <input name="experienceExigee" placeholder="Expérience exigée" className="flex-1 min-w-[180px] rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
          <button type="submit" className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-900">
            Ajouter
          </button>
        </form>
      </section>

      {/* 4. Matériel */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-slate-700">
          4. Matériel minimum exigé {summary.materielGaps > 0 && (
            <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
              {summary.materielGaps} manquant(s)
            </span>
          )}
        </h2>

        {tender.materiels.length > 0 && (
          <table className="mt-4 w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="py-1 pr-2">Matériel</th>
                <th className="py-1 pr-2">Nb exigé</th>
                <th className="py-1 pr-2">Propre</th>
                <th className="py-1 pr-2">Location</th>
                <th className="py-1" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tender.materiels.map((m) => {
                const gap = m.nbPropre + m.nbLocation < m.nbExige;
                return (
                  <tr key={m.id}>
                    <td colSpan={5} className="p-0">
                      <AutoSubmitForm
                        action={updateMaterielAction}
                        className={`grid grid-cols-12 items-center gap-1 py-1.5 ${gap ? "bg-red-50" : ""}`}
                      >
                        <input type="hidden" name="materielId" value={m.id} />
                        <input name="designation" defaultValue={m.designation} className={`col-span-6 ${cellInputCls}`} />
                        <input name="nbExige" type="number" min="0" defaultValue={m.nbExige} className={`col-span-2 ${cellInputCls}`} />
                        <input name="nbPropre" type="number" min="0" defaultValue={m.nbPropre} className={`col-span-1 ${cellInputCls}`} />
                        <input name="nbLocation" type="number" min="0" defaultValue={m.nbLocation} className={`col-span-2 ${cellInputCls}`} />
                        <button
                          type="submit"
                          formAction={deleteMaterielAction}
                          formNoValidate
                          className="col-span-1 justify-self-end text-xs text-red-500 hover:underline"
                        >
                          ✕
                        </button>
                      </AutoSubmitForm>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <form action={addMaterielAction} className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
          <input type="hidden" name="tenderId" value={tender.id} />
          <input name="designation" placeholder="Matériel (ex: Camion benne 12m3)" required className="flex-1 min-w-[200px] rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
          <input name="nbExige" type="number" min="1" defaultValue={1} placeholder="Nb" className="w-20 rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
          <button type="submit" className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-900">
            Ajouter
          </button>
        </form>
      </section>

      {/* 5. Qualification financière */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-slate-700">
          5. Capacités financières et références techniques {summary.qualificationNonConformes > 0 && (
            <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
              {summary.qualificationNonConformes} non conforme(s)
            </span>
          )}
        </h2>

        {tender.qualifications.length > 0 && (
          <table className="mt-4 w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="py-1 pr-2">Critère</th>
                <th className="py-1 pr-2">Exigence (texte)</th>
                <th className="py-1 pr-2">Exigence (valeur num.)</th>
                <th className="py-1 pr-2">Valeur réelle</th>
                <th className="py-1" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tender.qualifications.map((q) => {
                const nonConforme =
                  q.exigenceValeur !== null && q.valeurReelle !== null && q.valeurReelle < q.exigenceValeur;
                return (
                  <tr key={q.id}>
                    <td colSpan={5} className="p-0">
                      <AutoSubmitForm
                        action={updateQualificationAction}
                        className={`grid grid-cols-12 items-center gap-1 py-1.5 ${nonConforme ? "bg-red-50" : ""}`}
                      >
                        <input type="hidden" name="qualificationId" value={q.id} />
                        <input name="critere" defaultValue={q.critere} className={`col-span-4 ${cellInputCls}`} />
                        <input name="exigenceLabel" defaultValue={q.exigenceLabel ?? ""} className={`col-span-3 ${cellInputCls}`} />
                        <input
                          name="exigenceValeur"
                          type="number"
                          defaultValue={q.exigenceValeur ?? ""}
                          className={`col-span-2 ${cellInputCls}`}
                        />
                        <input
                          name="valeurReelle"
                          type="number"
                          defaultValue={q.valeurReelle ?? ""}
                          className={`col-span-2 ${cellInputCls}`}
                        />
                        <button
                          type="submit"
                          formAction={deleteQualificationAction}
                          formNoValidate
                          className="col-span-1 justify-self-end text-xs text-red-500 hover:underline"
                        >
                          ✕
                        </button>
                      </AutoSubmitForm>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <form action={addQualificationAction} className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
          <input type="hidden" name="tenderId" value={tender.id} />
          <input name="critere" placeholder="Critère (ex: Chiffre d'affaires annuel moyen)" required className="flex-1 min-w-[240px] rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
          <button type="submit" className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-900">
            Ajouter
          </button>
        </form>
      </section>

      {/* 6. Garanties et délais */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-slate-700">6. Garanties, cautions et délais clés</h2>
        <AutoSubmitForm action={updateGaranties} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-xs font-medium text-slate-500">Date limite de dépôt</label>
            <input type="date" name="dateLimiteDepot" defaultValue={toDateInputValue(tender.dateLimiteDepot)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500">Date d&rsquo;ouverture des plis</label>
            <input type="date" name="dateOuverturePlis" defaultValue={toDateInputValue(tender.dateOuverturePlis)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500">Validité de l&rsquo;offre (jours)</label>
            <input type="number" min="0" name="delaiValiditeOffreJours" defaultValue={tender.delaiValiditeOffreJours ?? ""} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500">Délai d&rsquo;exécution (jours)</label>
            <input type="number" min="0" name="delaiExecutionJours" defaultValue={tender.delaiExecutionJours ?? ""} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500">Garantie de soumission (FCFA)</label>
            <input type="number" min="0" name="garantieSoumissionXof" defaultValue={tender.garantieSoumissionXof ?? ""} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500">Garantie de bonne exécution (%)</label>
            <input type="number" min="0" step="0.1" name="garantieBonneExecutionPct" defaultValue={tender.garantieBonneExecutionPct ?? ""} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500">Retenue de garantie (%)</label>
            <input type="number" min="0" step="0.1" name="retenueGarantiePct" defaultValue={tender.retenueGarantiePct ?? ""} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500">Avance de démarrage (%)</label>
            <input type="number" min="0" step="0.1" name="avanceDemarragePct" defaultValue={tender.avanceDemarragePct ?? ""} className={inputCls} />
          </div>
        </AutoSubmitForm>
      </section>

      {/* 7. Décision Go/No-Go */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-slate-700">7. Décision Go / No-Go</h2>
        <p className="mt-1 text-xs text-slate-500">
          Recommandation automatique : <strong>{summary.recommendationLabel}</strong>. Vous pouvez confirmer ou ajuster la décision finale ci-dessous.
        </p>
        <AutoSubmitForm action={updateDecision} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-medium text-slate-500">Décision finale</label>
            <select name="decision" defaultValue={tender.decision ?? ""} className={inputCls}>
              <option value="">— Non tranché —</option>
              <option value="GO">GO — Soumissionner</option>
              <option value="GO_CONDITIONNEL">GO conditionnel</option>
              <option value="NO_GO">NO-GO — Ne pas soumissionner</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-500">Note / justification</label>
            <input name="decisionNote" defaultValue={tender.decisionNote ?? ""} className={inputCls} />
          </div>
        </AutoSubmitForm>
      </section>

      {tender.montantEstime ? (
        <div className="rounded-xl border border-slate-300 bg-white p-5 text-sm text-slate-600">
          Montant estimé du marché : <strong className="text-slate-900">{formatXof(tender.montantEstime)} FCFA</strong>
        </div>
      ) : null}
    </div>
  );
}
