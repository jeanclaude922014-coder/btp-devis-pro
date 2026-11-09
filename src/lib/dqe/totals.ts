// Montants, avancement et taxes d'un DQE importé — moteur de calcul unique.
//
// Utilisé par l'écran de suivi (dqe-workspace.tsx), l'export CSV, l'export Word et la
// description des lots. L'outil hors ligne outils/DQE_Lots_et_Suivi.html en contient une
// copie JavaScript (bloc « DQE-TOTALS ») vérifiée par src/lib/dqe/totals.test.ts.
//
// Règles (STD-GC-001 : explicables et reproductibles) :
//  1. Montant d'un article = Qté × P.U., arrondi au franc. Les totaux de lots, d'ouvrages et
//     du marché sont des sommes de montants d'articles déjà arrondis.
//  2. Montant réalisé d'un article = min(Qté exécutée, Qté du marché) × P.U., arrondi au
//     franc. Un dépassement de quantité n'est pas valorisé (il relève d'un avenant).
//  3. TVA = taux × total HT, arrondie au franc UNE seule fois sur le total. TTC = HT + TVA.
//  4. La TVA du « reste à réaliser » est la TVA du marché moins la TVA du réalisé :
//     réalisé + reste = marché, en HT, en TVA et en TTC, au franc près.
import { roundToUnit } from "@/lib/pricing";
import type { DqeAttachment, DqeData, DqeItem } from "./types";

/** Valeur numérique positive ou nulle (les saisies vides, négatives ou invalides valent 0). */
const pos = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/** Montant HT d'un article, arrondi au franc. */
export function lineAmount(item: Pick<DqeItem, "q" | "pu">): number {
  return roundToUnit(pos(item.q) * pos(item.pu));
}

/** Montant HT réalisé d'un article (quantité exécutée plafonnée à la quantité du marché). */
export function executedAmount(item: Pick<DqeItem, "q" | "pu">, executedQty: number): number {
  return roundToUnit(Math.min(pos(executedQty), pos(item.q)) * pos(item.pu));
}

/** Montant HT d'un attachement (quantité du jour × P.U.), arrondi au franc. */
export function attachmentAmount(att: Pick<DqeAttachment, "q">, item: Pick<DqeItem, "pu"> | undefined): number {
  return item ? roundToUnit(pos(att.q) * pos(item.pu)) : 0;
}

/** Quantité exécutée cumulée d'un article jusqu'à une date (incluse, format AAAA-MM-JJ). */
export function executedQty(att: DqeAttachment[], k: number, upto?: string | null): number {
  return att.filter((a) => a.k === k && (!upto || a.d <= upto)).reduce((s, a) => s + (Number(a.q) || 0), 0);
}

/** Taux de TVA valide (entre 0 et 1) ; toute autre valeur est ramenée dans cet intervalle. */
export function normalizeRate(rate: unknown): number {
  const r = Number(rate);
  if (!Number.isFinite(r) || r < 0) return 0;
  return Math.min(r, 1);
}

export type TaxAmounts = { ht: number; tva: number; ttc: number };

/** TVA arrondie au franc sur le total HT, TTC = HT + TVA. */
export function taxes(ht: number, rate: number): TaxAmounts {
  const tva = roundToUnit(ht * normalizeRate(rate));
  return { ht, tva, ttc: ht + tva };
}

/** Marché, réalisé et reste à réaliser, dont les colonnes s'additionnent exactement. */
export function splitTaxes(totalHt: number, executedHt: number, rate: number) {
  const total = taxes(totalHt, rate);
  const executed = taxes(executedHt, rate);
  const remainingHt = totalHt - executedHt;
  const remainingTva = total.tva - executed.tva;
  return {
    total,
    executed,
    remaining: { ht: remainingHt, tva: remainingTva, ttc: remainingHt + remainingTva } as TaxAmounts,
  };
}

/** Libellé du taux : « 18 % », « 9,5 % », « 0 % ». */
export function formatRate(rate: number): string {
  const pct = Math.round(normalizeRate(rate) * 10000) / 100;
  return `${pct.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} %`;
}

/** Libellé de la ligne de taxe : « TVA 18 % » ou « TVA (exonéré) » pour un taux nul. */
export function taxLabel(rate: number): string {
  return normalizeRate(rate) === 0 ? "TVA (exonéré)" : `TVA ${formatRate(rate)}`;
}

/** Total HT d'un ensemble d'articles (somme des montants arrondis). */
export function sumHt(items: Pick<DqeItem, "q" | "pu">[]): number {
  return items.reduce((s, i) => s + lineAmount(i), 0);
}

export type DqeSummary = {
  ht: number;
  ex: number;
  nArt: number;
  nDone: number;
  /** Écart entre le total HT actuel et celui du DQE importé d'origine. */
  diff: number;
};

/** Indicateurs du marché (ou d'un ouvrage) à une date de situation. */
export function summarizeDqe(data: DqeData, opts: { site?: string; upto?: string | null } = {}): DqeSummary {
  const { site, upto } = opts;
  const lotSite = new Map(data.lots.map((l) => [l.id, l.site]));
  const origLotSite = new Map(data.orig.lots.map((l) => [l.id, l.site]));
  const inScope = (map: Map<string, string>, lot: string) => map.has(lot) && (!site || map.get(lot) === site);
  let ht = 0;
  let ex = 0;
  let nArt = 0;
  let nDone = 0;
  for (const i of data.items) {
    if (!inScope(lotSite, i.lot)) continue;
    const e = executedQty(data.att, i.k, upto);
    ht += lineAmount(i);
    ex += executedAmount(i, e);
    nArt++;
    if (pos(i.q) > 0 && e >= pos(i.q)) nDone++;
  }
  const origHt = sumHt(data.orig.items.filter((i) => inScope(origLotSite, i.lot)));
  return { ht, ex, nArt, nDone, diff: ht - origHt };
}
