/**
 * Calcul des sections rectangulaires en flexion simple (bande b = 1 m).
 * Dimensionnement : BAEL 91 révisé 99. Contre-vérification : Eurocode 2 (NF EN 1992-1-1).
 * Unités internes : MN, m, MPa.
 */

import type { DalotInput } from "./fields";

export const ES = 200000; // MPa
export const N_EQ = 15; // coefficient d'équivalence BAEL

export type Materials = {
  fc28: number; ft28: number; fbu: number; fe: number; fsu: number;
  sigmaBc: number; sigmaS: number; muL: number; alphaL: number; tauLim: number;
  fck: number; fcd: number; fctm: number; fyd: number; Ecm: number;
  fissuration: DalotInput["fissuration"];
  cover: number;
  ls: number; // longueur de scellement droit (multiple de Ø)
};

export function materials(inp: DalotInput): Materials {
  const fc28 = inp.fc28, fe = inp.fe;
  const ft28 = 0.6 + 0.06 * fc28;
  const fbu = (0.85 * fc28) / 1.5;
  const fsu = fe / 1.15;
  const epsL = fsu / ES;
  const alphaL = 3.5 / (3.5 + 1000 * epsL);
  const muL = 0.8 * alphaL * (1 - 0.4 * alphaL);
  const eta = 1.6;
  const sPrej = Math.min((2 / 3) * fe, Math.max(0.5 * fe, 110 * Math.sqrt(eta * ft28)));
  const sigmaS = inp.fissuration === "tres_prejudiciable" ? 0.8 * sPrej : sPrej;
  // Scellement droit : ls = Ø·fe / (4·τs), τs = 0,6·ψs²·ft28 (ψs = 1,5 pour HA).
  const tauS = 0.6 * 1.5 ** 2 * ft28;
  const fck = fc28;
  return {
    fc28, ft28, fbu, fe, fsu, sigmaBc: 0.6 * fc28, sigmaS, muL, alphaL,
    tauLim: (0.07 * fc28) / 1.5,
    fck, fcd: fck / 1.5, fctm: 0.3 * fck ** (2 / 3), fyd: fe / 1.15,
    Ecm: 22000 * ((fck + 8) / 10) ** 0.3,
    fissuration: inp.fissuration, cover: inp.cover,
    ls: Math.ceil(fe / (4 * tauS)),
  };
}

/** Aire d'acier ELU (m²/m) — BAEL A.4.3. `overLimit` si μ > μl (aciers comprimés nécessaires). */
export function asELU(Mu: number, d: number, m: Materials) {
  if (Mu <= 0) return { As: 0, mu: 0, overLimit: false };
  const mu = Mu / (d * d * m.fbu);
  const overLimit = mu > m.muL;
  const muC = Math.min(mu, m.muL);
  const alpha = 1.25 * (1 - Math.sqrt(1 - 2 * muC));
  const z = d * (1 - 0.4 * alpha);
  // Au-delà de μl la section est signalée insuffisante ; As est calculée au bras de levier limite.
  const As = Mu / (z * m.fsu);
  return { As, mu, overLimit };
}

/** Contraintes ELS en section fissurée sans aciers comprimés (b = 1 m). */
export function stressesELS(Ms: number, As: number, d: number) {
  if (Ms <= 0 || As <= 0) return { sigmaBc: 0, sigmaS: Ms > 0 ? Infinity : 0, y: 0, I: 0 };
  const b = 1;
  const y = (-N_EQ * As + Math.sqrt((N_EQ * As) ** 2 + 2 * b * N_EQ * As * d)) / b;
  const I = (b * y ** 3) / 3 + N_EQ * As * (d - y) ** 2;
  return { sigmaBc: (Ms * y) / I, sigmaS: (N_EQ * Ms * (d - y)) / I, y, I };
}

/** Aire d'acier satisfaisant les contraintes limites ELS (recherche par dichotomie). */
export function asELS(Ms: number, d: number, m: Materials) {
  if (Ms <= 0) return { As: 0, concreteLimited: false };
  let lo = 1e-7, hi = 0.08 * d;
  const ok = (As: number) => stressesELS(Ms, As, d).sigmaS <= m.sigmaS;
  if (!ok(hi)) return { As: hi, concreteLimited: false };
  for (let k = 0; k < 60; k++) {
    const mid = (lo + hi) / 2;
    if (ok(mid)) hi = mid; else lo = mid;
  }
  const s = stressesELS(Ms, hi, d);
  return { As: hi, concreteLimited: s.sigmaBc > m.sigmaBc };
}

/** Moment résistant ELU (BAEL, diagramme rectangulaire simplifié). */
export function muCapacity(As: number, d: number, m: Materials) {
  const y = (As * m.fsu) / (0.8 * m.fbu);
  if (y / d <= m.alphaL) return As * m.fsu * (d - 0.4 * y);
  return m.muL * d * d * m.fbu;
}

export function asMinBAEL(d: number, m: Materials) {
  return (0.23 * d * m.ft28) / m.fe;
}

// ── Eurocode 2 ──────────────────────────────────────────────

export function mRdEC2(As: number, d: number, m: Materials) {
  const x = (As * m.fyd) / (0.8 * m.fcd);
  return { MRd: As * m.fyd * (d - 0.4 * x), xd: x / d };
}

export function asMinEC2(d: number, m: Materials) {
  return Math.max((0.26 * m.fctm) / m.fe, 0.0013) * d;
}

export function vRdcEC2(As: number, d: number, m: Materials) {
  const k = Math.min(2, 1 + Math.sqrt(0.2 / d));
  const rho = Math.min(0.02, As / d);
  const v = Math.max(0.12 * k * Math.cbrt(100 * rho * m.fck), 0.035 * k ** 1.5 * Math.sqrt(m.fck));
  return v * d; // MN/m
}

/** Ouverture de fissure wk (EC2 §7.3.4), en mm. */
export function crackWidthEC2(Ms: number, As: number, d: number, h: number, phi: number, m: Materials) {
  if (Ms <= 0 || As <= 0) return 0;
  const { sigmaS, y } = stressesELS(Ms, As, d);
  const acEff = Math.min(2.5 * (h - d), (h - y) / 3, h / 2);
  const rho = As / acEff;
  const alphaE = ES / m.Ecm;
  const kt = 0.4;
  const de = Math.max((sigmaS - (kt * m.fctm * (1 + alphaE * rho)) / rho) / ES, (0.6 * sigmaS) / ES);
  const c = m.cover;
  const srMax = 3.4 * c + (0.425 * 0.8 * 0.5 * phi) / rho;
  return srMax * de * 1000;
}

// ── Choix des armatures ─────────────────────────────────────

export const DIAMETERS = [8, 10, 12, 14, 16, 20, 25, 32];
export const SPACINGS = [0.1, 0.125, 0.15, 0.175, 0.2, 0.25];

export const barArea = (phiMm: number) => (Math.PI * (phiMm / 1000) ** 2) / 4;
export const barMass = (phiMm: number) => 0.00617 * phiMm * phiMm; // kg/m

export function sMax(h: number, m: Materials) {
  return m.fissuration === "tres_prejudiciable" ? Math.min(0.2, 1.5 * h) : Math.min(0.25, 2 * h);
}

export type BarChoice = { phi: number; s: number; As: number };

/** Plus petite section fournie ≥ As requise, Ø ≤ h/10, espacement ≤ smax. */
export function chooseBars(AsReq: number, h: number, m: Materials, phiMin = 10): BarChoice {
  const smax = sMax(h, m);
  const phiMax = Math.max(phiMin, Math.floor((h * 1000) / 10));
  let best: BarChoice | null = null;
  for (const phi of DIAMETERS) {
    if (phi < phiMin || phi > phiMax) continue;
    for (const s of SPACINGS) {
      if (s > smax + 1e-9) continue;
      const As = barArea(phi) / s;
      if (As + 1e-12 < AsReq) continue;
      // Les espacements serrés (< 12,5 cm) gênent le bétonnage : légère pénalité.
      const cost = As * (s < 0.125 ? 1.05 : 1);
      const bestCost = best ? best.As * (best.s < 0.125 ? 1.05 : 1) : Infinity;
      if (cost < bestCost - 1e-12 || (Math.abs(cost - bestCost) < 1e-12 && s > best!.s)) best = { phi, s, As };
    }
  }
  if (best) return best;
  // Aucune solution dans les limites : plus gros diamètre admissible au plus petit espacement.
  const phi = DIAMETERS.filter((p) => p <= Math.max(phiMax, 12)).pop() ?? 12;
  return { phi, s: SPACINGS[0], As: barArea(phi) / SPACINGS[0] };
}
