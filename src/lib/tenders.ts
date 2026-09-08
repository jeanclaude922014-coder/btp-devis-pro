/**
 * Analyse d'Appel d'Offres (DAO) — calculs de synthèse.
 *
 * Reprend la logique du classeur Excel "Outil d'analyse d'Appel d'Offres BTP" :
 * taux d'avancement des documents, écarts personnel/matériel, conformité
 * financière, jours restants avant dépôt, et recommandation Go/No-Go.
 */

export type TenderDocumentLike = { status: string };
export type TenderPersonnelLike = { nbExige: number; nbDisponible: number };
export type TenderMaterielLike = { nbExige: number; nbPropre: number; nbLocation: number };
export type TenderQualificationLike = {
  exigenceValeur: number | null;
  valeurReelle: number | null;
};

export type TenderSummaryInput = {
  documents: TenderDocumentLike[];
  personnel: TenderPersonnelLike[];
  materiels: TenderMaterielLike[];
  qualifications: TenderQualificationLike[];
  dateLimiteDepot: Date | null;
};

export type TenderSummary = {
  docTotal: number;
  docFournis: number;
  docProgress: number; // 0..1
  docManquants: number;
  personnelGaps: number;
  materielGaps: number;
  qualificationNonConformes: number;
  joursRestants: number | null;
  recommendation: "GO" | "GO_CONDITIONNEL" | "NO_GO" | "INCOMPLET";
  recommendationLabel: string;
};

export function computeTenderSummary(input: TenderSummaryInput): TenderSummary {
  const docTotal = input.documents.length;
  const docFournis = input.documents.filter((d) => d.status === "fourni").length;
  const docManquants = input.documents.filter((d) => d.status === "manquant").length;
  const docProgress = docTotal > 0 ? docFournis / docTotal : 0;

  const personnelGaps = input.personnel.filter((p) => p.nbDisponible < p.nbExige).length;
  const materielGaps = input.materiels.filter(
    (m) => m.nbPropre + m.nbLocation < m.nbExige
  ).length;
  const qualificationNonConformes = input.qualifications.filter(
    (q) =>
      q.exigenceValeur !== null &&
      q.valeurReelle !== null &&
      q.valeurReelle < q.exigenceValeur
  ).length;

  let joursRestants: number | null = null;
  if (input.dateLimiteDepot) {
    const ms = input.dateLimiteDepot.getTime() - Date.now();
    joursRestants = Math.ceil(ms / (1000 * 60 * 60 * 24));
  }

  const gapSum = personnelGaps + materielGaps + qualificationNonConformes + docManquants;

  let recommendation: TenderSummary["recommendation"];
  let recommendationLabel: string;

  if (docTotal === 0) {
    recommendation = "INCOMPLET";
    recommendationLabel = "Compléter les onglets ci-dessus (aucun document renseigné)";
  } else if (gapSum === 0 && docProgress === 1) {
    recommendation = "GO";
    recommendationLabel = "GO — Dossier conforme, prêt à soumissionner";
  } else if (gapSum <= 2) {
    recommendation = "GO_CONDITIONNEL";
    recommendationLabel = "GO CONDITIONNEL — Lever les écarts identifiés avant dépôt";
  } else {
    recommendation = "NO_GO";
    recommendationLabel = "NO-GO — Trop d'écarts à ce stade, revoir la faisabilité";
  }

  return {
    docTotal,
    docFournis,
    docProgress,
    docManquants,
    personnelGaps,
    materielGaps,
    qualificationNonConformes,
    joursRestants,
    recommendation,
    recommendationLabel,
  };
}

export const DOCUMENT_STATUS_LABELS: Record<string, string> = {
  manquant: "Manquant",
  en_cours: "En cours",
  fourni: "Fourni",
};

export const DOCUMENT_STATUS_STYLES: Record<string, string> = {
  manquant: "bg-red-100 text-red-700",
  en_cours: "bg-amber-100 text-amber-700",
  fourni: "bg-green-100 text-green-700",
};

export const RECOMMENDATION_STYLES: Record<TenderSummary["recommendation"], string> = {
  GO: "bg-green-100 text-green-800 border-green-300",
  GO_CONDITIONNEL: "bg-amber-100 text-amber-800 border-amber-300",
  NO_GO: "bg-red-100 text-red-800 border-red-300",
  INCOMPLET: "bg-slate-100 text-slate-600 border-slate-300",
};

// ── Modèle générique (documents habituellement exigés sur un DAO BTP) ──

export const DEFAULT_DOCUMENTS: string[] = [
  "Lettre de soumission de l'offre",
  "Bordereau des prix unitaires (BPU) et détail quantitatif estimatif (DQE)",
  "Cautionnement provisoire / garantie de soumission",
  "Confirmation écrite habilitant le signataire de l'offre",
  "Formulaire de renseignements sur le candidat",
  "Formulaire de renseignements sur les membres du groupement (si applicable)",
  "Accord de groupement signé par tous les membres (si applicable)",
  "Attestations de régularité fiscale et sociale (CNPS, DGI)",
  "Registre de commerce (RCCM)",
  "Déclaration fiscale d'existence (DFE)",
  "Proposition technique (méthodologie, planning, personnel, matériel)",
  "Attestations de bonne exécution (ABE) / PV de réception",
  "États financiers / bilans des 5 dernières années",
  "CV signés du personnel clé + copies certifiées des diplômes (< 6 mois)",
  "Preuve de disponibilité du matériel (factures d'achat ou contrats de location)",
  "Preuve de capacité de financement (avoirs liquides / ligne de crédit)",
  "Formulaires de qualification (FIN, EXP, PER, MAT selon le DAO)",
];
