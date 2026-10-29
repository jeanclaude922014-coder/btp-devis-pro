/**
 * Ouvrages de tête : murs en aile (murs cantilever sur semelle), mur de tête (garde-grève sur
 * la dalle), radiers de tête, bêches parafouilles et guide-roues.
 */

import { asELS, asELU, asMinBAEL, barArea, chooseBars, stressesELS, type BarChoice, type Materials } from "./ba";
import type { Check } from "./checks";
import type { DalotInput } from "./fields";
import { qLimit } from "./geotech";

const rad = (d: number) => (d * Math.PI) / 180;

export type WallDesign = {
  name: string;
  H: number; // hauteur retenue (m)
  e: number;
  Ka: number;
  M: number; // kN·m/m ELU à l'encastrement
  Ms: number;
  V: number;
  bars: BarChoice;
  rep: BarChoice;
  sigmaS: number;
  AsReq: number; // cm²/m
};

export type WingResult = WallDesign & {
  Htot: number;
  Hend: number;
  B: number;
  FSr: number;
  FSg: number;
  e0: number; // excentricité (m)
  sigmaMax: number;
  qAllow: number;
  footBars: BarChoice;
};

export type HeadsResult = { wing: WingResult | null; headWall: WallDesign; checks: Check[] };

function cantilever(name: string, H: number, e: number, Ka: number, gamma: number, q: number, mat: Materials) {
  const Mg = (Ka * gamma * H ** 3) / 6;
  const Mq = (Ka * q * H ** 2) / 2;
  const M = 1.35 * Mg + 1.5 * Mq;
  const Ms = Mg + Mq;
  const V = 1.35 * (Ka * gamma * H ** 2) / 2 + 1.5 * Ka * q * H;
  // Hauteur utile recalculée avec le diamètre effectivement retenu.
  const req = (d: number) => Math.max(asELU(M / 1000, d, mat).As, asELS(Ms / 1000, d, mat).As, asMinBAEL(d, mat));
  let AsReq = req(e - mat.cover - 0.006);
  let bars = chooseBars(AsReq, e, mat);
  for (let k = 0; k < 3; k++) {
    AsReq = req(e - mat.cover - bars.phi / 2000);
    if (bars.As >= AsReq) break;
    bars = chooseBars(AsReq, e, mat);
  }
  const rep = chooseBars(Math.max(bars.As / 4, barArea(8) / 0.25), e, mat, 8);
  const st = stressesELS(Ms / 1000, bars.As, e - mat.cover - bars.phi / 2000);
  return { name, H, e, Ka, M, Ms, V, bars, rep, sigmaS: st.sigmaS, AsReq: AsReq * 1e4 };
}

export function designHeads(inp: DalotInput, mat: Materials): HeadsResult {
  const t = inp.tetes;
  const Ka = Math.tan(rad(45 - inp.talus.phi / 2)) ** 2;
  const Hext = inp.er + inp.hInt + inp.es;
  const checks: Check[] = [];
  const dom = "Ouvrages de tête";
  const st = (ok: boolean) => (ok ? "conforme" : "non_conforme") as Check["status"];

  // Guide-roue sur l'about de la dalle (20 cm sur les plans types) ; au-delà de 0,30 m, calculé en mur de tête.
  const hHead = t.guideRoues ? t.grH : 0;
  const headWall = cantilever("Mur de tête", hHead, hHead > 0.3 ? t.murTeteEp : t.grL, Ka, inp.gammaR, inp.qRemblai, mat);
  checks.push({
    id: "T-MT-F", domain: dom, element: "Mur de tête",
    label: `Flexion à l'encastrement sur la dalle (h = ${hHead.toFixed(2)} m) : As fournie ≥ As requise`,
    value: headWall.bars.As * 1e4, limit: headWall.AsReq, unit: "cm²/m",
    status: st(headWall.bars.As * 1e4 >= headWall.AsReq - 1e-6), ref: "BAEL 91 A.4.3 / A.4.5 — poussée de Rankine Ka",
  });
  checks.push({
    id: "T-MT-S", domain: dom, element: "Mur de tête",
    label: "Contrainte des aciers ELS σs ≤ σ̄s", value: headWall.sigmaS, limit: mat.sigmaS, unit: "MPa",
    status: st(headWall.sigmaS <= mat.sigmaS + 1e-6), ref: "BAEL 91 A.4.5,33",
  });

  let wing: WingResult | null = null;
  if (t.murs) {
    // L'aile s'accroche au sommet du guide-roue (ou du mur de tête) posé sur l'about de la dalle supérieure,
    // comme sur les plans types : hauteur à l'enracinement = cadre + mur de tête ou guide-roue.
    const Htot = Hext + hHead;
    const Hend = Math.max(0.6, Htot - (t.long * Math.cos(rad(t.angle))) / inp.talus.pente);
    // Ferraillage du voile au tiers de sa longueur : près de l'enracinement, le voile est tenu par
    // le mur de tête et le corps (fonctionnement en dalle sur deux côtés). La stabilité, elle,
    // reste vérifiée à l'enracinement, à la hauteur maximale.
    const Hd = Htot - (Htot - Hend) / 3;
    const base = { ...cantilever("Mur en aile (tiers de la longueur)", Hd, t.ep, Ka, inp.gammaR, inp.qRemblai, mat), H: Htot };
    // Stabilité du mur en aile au droit de l'enracinement (sécuritaire), par mètre.
    const Bf = t.semelle, hs = t.semEp, toe = t.patin;
    const heel = Math.max(0, Bf - toe - t.ep);
    const Ht = Htot + hs;
    const Pa = 0.5 * Ka * inp.gammaR * Ht ** 2;
    const Pq = Ka * inp.qRemblai * Ht;
    const Mo = (Pa * Ht) / 3 + (Pq * Ht) / 2;
    const Wst = inp.gammaBA * t.ep * Htot, xst = toe + t.ep / 2;
    const Wf = inp.gammaBA * Bf * hs, xf = Bf / 2;
    const Ws = inp.gammaR * Htot * heel, xs = toe + t.ep + heel / 2;
    const N = Wst + Wf + Ws;
    const Mr = Wst * xst + Wf * xf + Ws * xs;
    const FSr = Mr / Mo;
    // Frottement sol/béton δ = 2φ'/3, adhérence c'/2 sur la semelle, butée devant la bêche à 50 %.
    const Kp = Math.tan(rad(45 + inp.phiSol / 2)) ** 2;
    const hp = hs + t.beche;
    const Pp = 0.5 * Kp * inp.gammaSol * hp ** 2 + 2 * inp.cSol * Math.sqrt(Kp) * hp;
    const resist = N * Math.tan(rad((2 / 3) * inp.phiSol)) + (inp.cSol / 2) * Bf + (t.beche > 0 ? 0.5 * Pp : 0);
    const FSg = resist / (Pa + Pq);
    const xR = (Mr - Mo) / N;
    const e0 = Bf / 2 - xR;
    const sigmaMax = Math.abs(e0) <= Bf / 6 ? (N / Bf) * (1 + (6 * Math.abs(e0)) / Bf) : (2 * N) / (3 * Math.max(xR, 0.01));
    const ql = qLimit(Bf, Math.max(Bf, t.long), inp.phiSol, inp.cSol, inp.gammaSol, Math.max(inp.Df, hs), inp.nappe);
    const qAllow = Math.min(ql.q0 + (ql.qu - ql.q0) / 3, inp.qadm !== null ? inp.qadm * 1000 : Infinity);
    const footBars = chooseBars(Math.max(base.bars.As, asMinBAEL(hs - mat.cover - 0.006, mat)), hs, mat);
    wing = { ...base, Htot, Hend, B: Bf, FSr, FSg, e0, sigmaMax, qAllow, footBars };

    checks.push({
      id: "T-MA-RENV", domain: dom, element: "Mur en aile",
      label: "Renversement : FS = Ms/Mr ≥ 1,5", value: FSr, limit: 1.5, status: st(FSr >= 1.5),
      ref: "Stabilité des murs de soutènement (Fascicule 62 titre V)",
    });
    checks.push({
      id: "T-MA-GLIS", domain: dom, element: "Mur en aile",
      label: "Glissement : FS = (N·tan(2φ'/3) + c'·B/2 + Pp/2)/(Pa + Pq) ≥ 1,5", value: FSg, limit: 1.5, status: st(FSg >= 1.5),
      ref: "Fascicule 62 titre V", detail: FSg < 1.5 ? "Approfondir la bêche sous semelle ou élargir le talon." : undefined,
    });
    checks.push({
      id: "T-MA-EXC", domain: dom, element: "Mur en aile",
      label: "Résultante dans le tiers central : |e| ≤ B/6", value: Math.abs(e0), limit: Bf / 6, unit: "m", status: st(Math.abs(e0) <= Bf / 6),
      ref: "Règle du tiers central (ELS)",
    });
    checks.push({
      id: "T-MA-PORT", domain: dom, element: "Semelle du mur en aile",
      label: "Contrainte maximale sous semelle ≤ contrainte admissible", value: sigmaMax, limit: qAllow, unit: "kPa", status: st(sigmaMax <= qAllow),
      ref: "Fascicule 62 titre V / rapport géotechnique",
    });
    checks.push({
      id: "T-MA-F", domain: dom, element: "Voile du mur en aile",
      label: `Flexion à la base du voile, au tiers de la longueur (H = ${Hd.toFixed(2)} m) : As fournie ≥ As requise`, value: base.bars.As * 1e4, limit: base.AsReq, unit: "cm²/m",
      status: st(base.bars.As * 1e4 >= base.AsReq - 1e-6), ref: "BAEL 91 A.4.3 / A.4.5",
    });
    checks.push({
      id: "T-MA-S", domain: dom, element: "Voile du mur en aile",
      label: "Contrainte des aciers ELS σs ≤ σ̄s", value: base.sigmaS, limit: mat.sigmaS, unit: "MPa", status: st(base.sigmaS <= mat.sigmaS + 1e-6),
      ref: "BAEL 91 A.4.5,33",
    });
    const tau = base.V / 1000 / (t.ep - mat.cover - 0.006);
    checks.push({
      id: "T-MA-V", domain: dom, element: "Voile du mur en aile",
      label: "Effort tranchant à l'encastrement τu ≤ 0,07·fc28/γb", value: tau, limit: mat.tauLim, unit: "MPa", status: st(tau <= mat.tauLim),
      ref: "BAEL 91 A.5.2,2",
    });
  } else {
    checks.push({
      id: "T-MA", domain: dom, element: "Murs en aile", label: "Murs en aile", status: "non_applicable", ref: "—",
      detail: "Pas de murs en aile déclarés.",
    });
  }
  checks.push({
    id: "T-RT", domain: dom, element: "Radiers de tête",
    label: "Radiers de tête : dalle sur sol hors passage des véhicules", status: "non_applicable", ref: "Dispositions constructives",
    detail: "Élément non sollicité en flexion : ferraillage minimal HA10 e = 20 cm en deux nappes.",
  });
  checks.push({
    id: "T-BECHE", domain: dom, element: "Bêches parafouilles",
    label: "Bêches : protection contre l'affouillement", status: t.becheProf > 0 ? "non_applicable" : "non_verifie", ref: "Guide SETRA « Ouvrages hydrauliques »",
    detail: t.becheProf > 0
      ? `Élément de protection (profondeur ${t.becheProf.toFixed(2)} m), ferraillage minimal ; la profondeur d'affouillement est à confirmer par l'étude hydraulique.`
      : "Aucune bêche prévue : vérifier le risque d'affouillement à l'aval.",
  });
  if (t.guideRoues) {
    checks.push({
      id: "T-GR", domain: dom, element: "Guide-roues", label: "Guide-roues (équipement)", status: "non_applicable", ref: "Dispositions constructives",
      detail: "Élément d'équipement non porteur, coffré et ferraillé forfaitairement.",
    });
  }
  return { wing, headWall, checks };
}
