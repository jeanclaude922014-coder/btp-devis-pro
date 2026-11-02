// Description automatique des lots d'un DQE : contenu, poids financier, quantités clés,
// ratios de contrôle et points de vigilance (BAEL / EC2, contexte ivoirien).

import { categoryByKey, normalizeText } from "./categories";
import type { DqeData, DqeItem, DqeLot } from "./types";

export type LotDescription = {
  lotId: string;
  title: string;
  site: string;
  category: string;
  articles: number;
  amount: number;
  share: number; // part du montant total HT (0-1)
  summary: string; // phrase de synthèse
  mainItems: Array<{ n: string; d: string; amount: number }>;
  quantities: string[]; // quantités clés lisibles
  ratios: string[]; // ratios de contrôle
  note: string; // vigilance technique
};

const F = (n: number) => Math.round(n).toLocaleString("fr-FR").replace(/[  ]/g, " ");
const Q = (n: number) =>
  (Math.round(n * 100) / 100).toLocaleString("fr-FR", { maximumFractionDigits: 2 }).replace(/[  ]/g, " ");
const M = (n: number) =>
  n >= 1e6 ? `${(n / 1e6).toFixed(n >= 1e7 ? 1 : 2).replace(".", ",")} M F` : `${F(n)} F`;

const amountOf = (i: DqeItem) => (+i.q || 0) * (+i.pu || 0);

function sumWhere(items: DqeItem[], unit: RegExp, text?: RegExp): number {
  return items
    .filter((i) => unit.test(i.u.trim()) && (!text || text.test(normalizeText(i.d))))
    .reduce((s, i) => s + (+i.q || 0), 0);
}

function keyQuantities(items: DqeItem[], category: string): { quantities: string[]; ratios: string[] } {
  const quantities: string[] = [];
  const ratios: string[] = [];
  const beton = sumWhere(items, /^m(³|3)$/i, /beton|semelle|poteau|chainage|poutre|dalle|linteau|longrine|radier|voile/);
  const betonArme = sumWhere(items, /^m(³|3)$/i, /(semelle|poteau|chainage|poutre|dalle|linteau|longrine|radier|voile|raidisseur|amorce)/);
  const acier = sumWhere(items, /^kg$/i, /acier|armature|ha\b|fer/);
  const coffrage = sumWhere(items, /^m(²|2)$/i, /coffrage/);
  const maconnerie = sumWhere(items, /^m(²|2)$/i, /agglo|maconnerie|mur/);
  const enduit = sumWhere(items, /^m(²|2)$/i, /enduit/);
  const fouilles = sumWhere(items, /^m(³|3)$/i, /fouille|deblai/);
  const remblai = sumWhere(items, /^m(³|3)$/i, /remblai/);
  const surfaces = sumWhere(items, /^m(²|2)$/i);
  const lineaire = sumWhere(items, /^ml$/i);
  const unites = sumWhere(items, /^(u|ens|ff|fft)$/i);

  if (category === "gros_oeuvre") {
    if (beton) quantities.push(`${Q(beton)} m³ de béton`);
    if (acier) quantities.push(`${F(acier)} kg d'acier HA`);
    if (coffrage) quantities.push(`${Q(coffrage)} m² de coffrage`);
    if (maconnerie) quantities.push(`${Q(maconnerie)} m² de maçonnerie`);
    if (enduit) quantities.push(`${Q(enduit)} m² d'enduit`);
    if (acier && betonArme) {
      const r = acier / betonArme;
      ratios.push(
        `Ratio acier / béton armé ≈ ${F(r)} kg/m³ ${
          r < 60
            ? "(sous la plage usuelle 60–130 kg/m³ : vérifier les quantités d'acier)"
            : r > 130
              ? "(au-dessus de la plage usuelle 60–130 kg/m³ : vérifier les sections)"
              : "(dans la plage usuelle 60–130 kg/m³)"
        }`
      );
    }
    if (coffrage && betonArme) ratios.push(`Ratio coffrage / béton armé ≈ ${Q(coffrage / betonArme)} m²/m³`);
  } else if (category === "terrassement") {
    if (fouilles) quantities.push(`${Q(fouilles)} m³ de fouilles`);
    if (remblai) quantities.push(`${Q(remblai)} m³ de remblais`);
    if (surfaces) quantities.push(`${Q(surfaces)} m² de surfaces traitées`);
    if (fouilles && remblai) ratios.push(`Remblais / fouilles = ${Math.round((remblai / fouilles) * 100)} %`);
  } else {
    if (surfaces) quantities.push(`${Q(surfaces)} m²`);
    if (lineaire) quantities.push(`${Q(lineaire)} ml`);
    if (unites) quantities.push(`${Q(unites)} unité(s) / ensemble(s)`);
    const kg = sumWhere(items, /^kg$/i);
    if (kg) quantities.push(`${F(kg)} kg`);
    const m3 = sumWhere(items, /^m(³|3)$/i);
    if (m3) quantities.push(`${Q(m3)} m³`);
  }
  return { quantities, ratios };
}

export function describeLot(data: DqeData, lot: DqeLot, grandTotal: number): LotDescription {
  const items = data.items.filter((i) => i.lot === lot.id);
  const amount = items.reduce((s, i) => s + amountOf(i), 0);
  const cat = categoryByKey(lot.category);
  const site = data.sites.find((s) => s.id === lot.site)?.name ?? "";
  const main = [...items]
    .sort((a, b) => amountOf(b) - amountOf(a))
    .slice(0, 3)
    .filter((i) => amountOf(i) > 0)
    .map((i) => ({ n: i.n, d: i.d, amount: amountOf(i) }));
  const { quantities, ratios } = keyQuantities(items, lot.category);
  const share = grandTotal ? amount / grandTotal : 0;
  const sections = [...new Set(items.map((i) => i.sec).filter(Boolean))] as string[];

  let summary = `${lot.name} — ${cat.label.toLowerCase()} : ${items.length} article${items.length > 1 ? "s" : ""} pour ${M(amount)} HT, soit ${(share * 100)
    .toFixed(1)
    .replace(".", ",")} % du montant total.`;
  if (sections.length) summary += ` Sous-parties : ${sections.slice(0, 4).join(" ; ")}${sections.length > 4 ? "…" : ""}.`;
  if (main.length) {
    const first = main[0];
    const p = amount ? Math.round((first.amount / amount) * 100) : 0;
    summary += ` Poste principal : « ${first.d} » (${p} % du lot).`;
  }

  return {
    lotId: lot.id,
    title: lot.name,
    site,
    category: cat.label,
    articles: items.length,
    amount,
    share,
    summary,
    mainItems: main,
    quantities,
    ratios,
    note: cat.note,
  };
}

export function describeAll(data: DqeData): LotDescription[] {
  const total = data.items.reduce((s, i) => s + amountOf(i), 0);
  return data.lots.map((l) => describeLot(data, l, total));
}
