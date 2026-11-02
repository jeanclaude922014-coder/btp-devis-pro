/**
 * Étude hydrologique (débit de crue de projet) et hydraulique (écoulement à surface libre dans
 * les cellules), selon la démarche usuelle des notes de calcul de dalots en Côte d'Ivoire :
 * Kirpich → Montana → méthode rationnelle (petits bassins) ou méthode ORSTOM de Rodier-Auvray
 * (crue décennale des bassins de quelques km² à 200 km², pratique ouest-africaine) →
 * Manning-Strickler → revanche, Froude, vitesse.
 */

import type { Check } from "./checks";
import type { DalotInput } from "./fields";

export type HydroResult = {
  method: "rationnelle" | "orstom" | "impose";
  /** Méthode ORSTOM : abattement de Vuillaume, débit de ruissellement et crue décennales, indice de pente. */
  orstom?: { Aab: number; Qr10: number; Q10: number; Ig: number };
  tcH: number; // h
  tcMin: number;
  I: number; // mm/h
  Qp: number; // m³/s
  Qcell: number;
  h: number; // tirant d'eau normal (m)
  S: number;
  P: number;
  R: number;
  V: number;
  Fr: number;
  revanche: number;
  revanchePct: number;
  enCharge: boolean;
};

/** Temps de concentration de Kirpich, en heures (L en km, ΔH en m). */
export const kirpich = (Lkm: number, dH: number) => 0.945 * Math.pow(Lkm ** 3 / dH, 0.385);

/** Tirant d'eau normal (Manning-Strickler) dans une cellule rectangulaire de largeur b. */
export function normalDepth(Q: number, b: number, K: number, I: number, hMax = 50) {
  const q = (h: number) => { const S = b * h, P = b + 2 * h; return K * S * Math.pow(S / P, 2 / 3) * Math.sqrt(I); };
  let lo = 0, hi = hMax;
  if (q(hi) < Q) return hi;
  for (let k = 0; k < 80; k++) { const m = (lo + hi) / 2; if (q(m) < Q) lo = m; else hi = m; }
  return hi;
}

export function hydroStudy(inp: DalotInput): { result: HydroResult | null; checks: Check[] } {
  const hy = inp.hydro;
  const dom = "Hydrologie et hydraulique";
  if (!hy.actif) {
    return {
      result: null,
      checks: [{
        id: "H-OFF", domain: dom, element: "Ouvrage", label: "Capacité hydraulique de l'ouvrage", status: "non_verifie",
        ref: "Guide SETRA « Ouvrages hydrauliques »", detail: "Étude hydraulique désactivée : la section d'écoulement n'est pas justifiée par la présente note.",
      }],
    };
  }
  let tcH = 0, I = 0, Qp = hy.Qimpose;
  if (hy.methode === "rationnelle") {
    tcH = kirpich(hy.L, hy.dH);
    I = hy.montanaA / Math.pow(tcH * 60, hy.montanaB);
    Qp = (hy.C * I * hy.A) / 3.6;
  }
  let orstom: HydroResult["orstom"];
  if (hy.methode === "orstom") {
    // Rodier-Auvray : Qr10 = A·P10·Kr10·α10·S / Tb10 ; Q10 = m·Qr10 ; abattement de Vuillaume
    // A = 1 − (161 − 0,042·Pan)/1000 · log10(S). P10 en mm, S en km² (1 mm·km² = 1000 m³), Tb10 en s.
    const o = hy.orstom;
    const Aab = Math.min(1, 1 - ((161 - 0.042 * o.Pan) / 1000) * Math.log10(Math.max(hy.A, 1e-6)));
    const Qr10 = (Aab * o.P10 * (o.Kr10 / 100) * o.alpha * hy.A * 1000) / (o.Tb10 * 60);
    const Q10 = o.m * Qr10;
    Qp = o.kT * Q10;
    orstom = { Aab, Qr10, Q10, Ig: hy.dH / hy.L };
  }
  const n = inp.openings.length;
  const bTot = inp.openings.reduce((s, o) => s + o, 0);
  // Débit réparti au prorata des ouvertures (cellules identiques : Q/n).
  const b = Math.min(...inp.openings);
  const Qcell = (Qp * b) / bTot;
  const Ir = hy.pente / 100;
  const h = normalDepth(Qcell, b, hy.K, Ir);
  const S = b * h, P = b + 2 * h, R = S / P, V = Qcell / S;
  const Fr = V / Math.sqrt(9.81 * h);
  const revanche = inp.hInt - h;
  const enCharge = h >= inp.hInt;
  const result: HydroResult = {
    method: hy.methode, orstom, tcH, tcMin: tcH * 60, I, Qp, Qcell, h, S, P, R, V, Fr,
    revanche, revanchePct: (revanche / inp.hInt) * 100, enCharge,
  };
  const st = (ok: boolean) => (ok ? "conforme" : "non_conforme") as Check["status"];
  const checks: Check[] = [
    {
      id: "H-CHARGE", domain: dom, element: `Cellule${n > 1 ? "s" : ""} (Q = ${Qcell.toFixed(2)} m³/s chacune)`,
      label: "Écoulement à surface libre : tirant d'eau normal < hauteur libre", value: h, limit: inp.hInt, unit: "m",
      status: st(!enCharge), ref: "Manning-Strickler", detail: enCharge ? "Ouvrage en charge : augmenter l'ouverture ou le nombre de cellules." : undefined,
    },
    {
      id: "H-REV", domain: dom, element: "Revanche",
      label: `Revanche ≥ ${Math.round(hy.revanchePct)} % de la hauteur libre et ≥ ${hy.revancheMin.toFixed(2)} m`,
      value: revanche, limit: Math.max((hy.revanchePct / 100) * inp.hInt, hy.revancheMin), unit: "m",
      status: st(revanche >= Math.max((hy.revanchePct / 100) * inp.hInt, hy.revancheMin) - 1e-9),
      ref: "Pratique usuelle (revanche ≥ h0/4, minimum 20 à 30 cm)",
    },
    {
      id: "H-V", domain: dom, element: "Sortie d'ouvrage",
      label: `Vitesse d'écoulement V ≤ vitesse admissible du lit (${hy.vAdm.toFixed(1)} m/s) ou protection prévue`,
      value: V, limit: hy.vAdm, unit: "m/s",
      status: V <= hy.vAdm || hy.protection ? "conforme" : "non_conforme",
      ref: "Guide SETRA « Ouvrages hydrauliques »",
      detail: V > hy.vAdm
        ? (hy.protection ? "Vitesse supérieure à l'admissible : avant-radier, bêches et perré / enrochement aval prévus (2 à 3 fois la hauteur d'eau)." : "Prévoir avant-radier, bêches et perré ou enrochement à l'aval.")
        : undefined,
    },
    {
      id: "H-FR", domain: dom, element: "Régime d'écoulement",
      label: `Nombre de Froude Fr = V/√(g·h) = ${Fr.toFixed(2)} (${Fr > 1 ? "torrentiel" : "fluvial"})`,
      value: Fr, limit: 1,
      status: Fr <= 1 || hy.protection ? "conforme" : "non_conforme", ref: "Hydraulique à surface libre",
      detail: Fr > 1 ? (hy.protection ? "Régime torrentiel : dissipation d'énergie et protection aval prévues." : "Régime torrentiel : prévoir une dissipation d'énergie à l'aval.") : undefined,
    },
  ];
  if (hy.methode !== "impose") {
    // Domaine d'emploi usuel en Afrique de l'Ouest : rationnelle pour les petits bassins (≤ 4 km²),
    // ORSTOM / CIEH au-delà, ORSTOM limitée à 200 km² environ.
    const rat = hy.methode === "rationnelle";
    const okDom = rat ? hy.A <= 4 : hy.A <= 200;
    checks.unshift({
      id: "H-METH", domain: dom, element: "Débit de projet",
      label: rat ? "Méthode rationnelle employée sur un petit bassin : A ≤ 4 km²" : "Méthode ORSTOM employée dans son domaine : A ≤ 200 km²",
      value: hy.A, limit: rat ? 4 : 200, unit: "km²", status: okDom ? "conforme" : "non_verifie",
      ref: "Pratique ouest-africaine (ORSTOM, CIEH)",
      detail: okDom ? undefined : rat
        ? "Bassin de plus de 4 km² : la méthode rationnelle tend à surestimer la crue ; retenir la méthode ORSTOM (ou CIEH) et comparer."
        : "Bassin de plus de 200 km² : la méthode ORSTOM n'est plus applicable telle quelle ; débit à justifier par une étude hydrologique.",
    });
    const kTmissing = hy.methode === "orstom" && Math.abs(hy.T - 10) > 1e-9 && Math.abs(hy.orstom.kT - 1) < 1e-9;
    checks.unshift({
      id: "H-SRC", domain: dom, element: "Données de pluie et de bassin",
      label: "Origine des données hydrologiques indiquée (station SODEXAM, carte, étude)",
      status: hy.source && !kTmissing ? "conforme" : "non_verifie", ref: "Données SODEXAM / étude hydrologique",
      detail: kTmissing
        ? `Période de retour ${hy.T} ans avec QT/Q10 = 1 : le rapport de passage doit être justifié.`
        : hy.source || "Coefficients de pluie génériques, non rattachés à une station : indiquer la station SODEXAM et l'origine des données.",
    });
  }
  return { result, checks };
}
