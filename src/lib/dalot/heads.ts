/**
 * Ouvrages de tête : murs en aile (murs cantilever sur semelle), mur de tête (garde-grève sur
 * la dalle), radiers de tête, bêches parafouilles et guide-roues.
 */

import { asELS, asELU, asMinBAEL, barArea, chooseBars, stressesELS, type BarChoice, type Materials } from "./ba";
import type { Check } from "./checks";
import type { DalotInput } from "./fields";
import { qLimit } from "./geotech";
import { headDimensions } from "./head-dims";

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
  /** Poussée sur une aile (kN), résultante longitudinale des deux ailes (kN), poids de la tête (kN). */
  Pw: number;
  Fx: number;
  N: number;
  encAsReq: number; // cm²/m
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
    // Les deux ailes sont encastrées dans le radier de tête continu (plans types, section 2-2) :
    // la tête forme un U. Les composantes transversales des poussées (P·cos α) sont égales et
    // opposées et s'équilibrent dans le radier de tête, qui reprend le moment d'encastrement des
    // voiles. Seule la résultante le long de l'axe (2·P·sin α), qui pousse la tête vers l'aval,
    // sollicite le sol : stabilité vérifiée sur la tête complète (ailes + radier de tête + bêche
    // d'extrémité), sans compter la liaison avec le radier du corps (sécuritaire).
    const hd = headDimensions(inp);
    const hs = t.semEp, heel = Math.max(0, t.patin);
    const a = rad(t.angle), sinA = Math.sin(a), cosA = Math.cos(a);
    const Lr = t.radierLong;
    const Hat = (sAl: number) => Math.max(hd.Hend, Htot - (sAl * cosA) / inp.talus.pente);
    // Intégration le long de chaque aile (moments pris autour de l'arête aval du radier de tête).
    const nSeg = 40, ds = t.long / nSeg;
    let Pw = 0, Fx = 0, Mo = 0, N = 0, Mr = 0;
    const weight = (W: number, x: number) => { N += W; Mr += W * (Lr - x); };
    for (let i = 0; i < nSeg; i++) {
      const sAl = (i + 0.5) * ds, H = Hat(sAl), x = sAl * cosA, Hw = Math.max(0, H - hs);
      const pa = 0.5 * Ka * inp.gammaR * H ** 2, pq = Ka * inp.qRemblai * H;
      Pw += (pa + pq) * ds;
      Fx += 2 * (pa + pq) * sinA * ds;
      Mo += 2 * (pa * H / 3 + pq * H / 2) * sinA * ds;
      weight(2 * inp.gammaBA * t.ep * Hw * ds, x); // voiles
      weight(2 * (inp.gammaBA * hs + inp.gammaR * Hw) * heel * ds, x); // talons et remblai sur talons
    }
    const S = hd.surfaceRadier;
    const xg = Lr > 0 ? (Lr * (hd.pb + 2 * hd.gb)) / (3 * (hd.pb + hd.gb)) : 0; // centre du trapèze depuis l'about
    weight(inp.gammaBA * hs * S, xg);
    weight(inp.gammaBA * t.becheEp * t.becheProf * hd.gb, Lr);
    const FSr = Mo > 0 ? Mr / Mo : Infinity;
    // Frottement sol/béton δ = 2φ'/3, adhérence c'/2 sous le radier de tête, butée devant la bêche
    // d'extrémité prise à 50 %.
    const Kp = Math.tan(rad(45 + inp.phiSol / 2)) ** 2;
    const hp = hs + t.becheProf;
    const Pp = (0.5 * Kp * inp.gammaSol * hp ** 2 + 2 * inp.cSol * Math.sqrt(Kp) * hp) * hd.gb;
    const resist = N * Math.tan(rad((2 / 3) * inp.phiSol)) + (inp.cSol / 2) * S + (t.becheProf > 0 ? 0.5 * Pp : 0);
    const FSg = Fx > 0 ? resist / Fx : Infinity;
    // Contrainte sous le radier de tête (trapèze assimilé à un rectangle de largeur moyenne).
    const bm = Lr > 0 ? S / Lr : 1;
    const xR = (Mr - Mo) / N; // depuis l'arête aval
    const e0 = (Lr - xg) - xR;
    const sigmaMax = Math.abs(e0) <= Lr / 6 ? (N / S) * (1 + (6 * Math.abs(e0)) / Lr) : (2 * N) / (3 * Math.max(xR, 0.01) * bm);
    const ql = qLimit(Math.min(Lr, bm), Math.max(Lr, bm), inp.phiSol, inp.cSol, inp.gammaSol, Math.max(inp.Df, hs), inp.nappe);
    const qAllow = Math.min(ql.q0 + (ql.qu - ql.q0) / 3, inp.qadm !== null ? inp.qadm * 1000 : Infinity);
    // Radier de tête : nappe inférieure transversale dimensionnée pour le moment d'encastrement des voiles.
    const enc = cantilever("Radier de tête — encastrement des ailes", Hd, hs, Ka, inp.gammaR, inp.qRemblai, mat);
    const footBars = enc.bars;
    wing = { ...base, Htot, Hend, B: Lr, FSr, FSg, e0, sigmaMax, qAllow, footBars, Pw, Fx, N, encAsReq: enc.AsReq };

    checks.push({
      id: "T-RT-L", domain: dom, element: "Radier de tête",
      label: "Le radier de tête porte les ailes sur toute leur projection : L ≥ longueur d'aile × cos α", value: Lr, limit: hd.along, unit: "m",
      status: st(Lr >= hd.along - 0.05), ref: "Dispositions des plans types (section 2-2)",
      detail: Lr >= hd.along - 0.05 ? undefined : `Allonger le radier de tête à ${(Math.ceil(hd.along * 10) / 10).toFixed(2).replace(".", ",")} m : au-delà, l'aile n'est plus portée que par son talon.`,
    });
    checks.push({
      id: "T-MA-RENV", domain: dom, element: "Tête (ailes + radier de tête)",
      label: "Renversement de la tête vers l'aval : FS = Ms/Mr ≥ 1,5", value: FSr, limit: 1.5, status: st(FSr >= 1.5),
      ref: "Stabilité des murs de soutènement (Fascicule 62 titre V)",
      detail: "Poussées transversales équilibrées dans le radier de tête ; moment de la résultante 2·P·sin α autour de l'arête aval.",
    });
    checks.push({
      id: "T-MA-GLIS", domain: dom, element: "Tête (ailes + radier de tête)",
      label: "Glissement : FS = (N·tan(2φ'/3) + c'·S/2 + Pp/2)/(2·P·sin α) ≥ 1,5", value: FSg, limit: 1.5, status: st(FSg >= 1.5),
      ref: "Fascicule 62 titre V", detail: FSg < 1.5 ? "Approfondir la bêche d'extrémité ou allonger le radier de tête." : undefined,
    });
    checks.push({
      id: "T-MA-EXC", domain: dom, element: "Tête (ailes + radier de tête)",
      label: "Résultante dans le tiers central du radier de tête : |e| ≤ L/6", value: Math.abs(e0), limit: Lr / 6, unit: "m", status: st(Math.abs(e0) <= Lr / 6),
      ref: "Règle du tiers central (ELS)",
    });
    checks.push({
      id: "T-MA-PORT", domain: dom, element: "Radier de tête",
      label: "Contrainte maximale sous le radier de tête ≤ contrainte admissible", value: sigmaMax, limit: qAllow, unit: "kPa", status: st(sigmaMax <= qAllow),
      ref: "Fascicule 62 titre V / rapport géotechnique",
    });
    checks.push({
      id: "T-MA-ENC", domain: dom, element: "Radier de tête",
      label: `Encastrement des ailes dans le radier de tête (nappe inférieure transversale) : As fournie ≥ As requise`,
      value: footBars.As * 1e4, limit: enc.AsReq, unit: "cm²/m", status: st(footBars.As * 1e4 >= enc.AsReq - 1e-6),
      ref: "BAEL 91 A.4.3 / A.4.5",
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
    id: "T-GC", domain: dom, element: "Garde-corps",
    label: "Garde-corps de 1,00 m sur les deux rives de la dalle", status: t.gardeCorps ? "conforme" : "non_verifie",
    ref: "Sécurité des usagers — pratique des marchés AGEROUTE / BNETD",
    detail: t.gardeCorps ? "Garde-corps en béton armé posé sur le guide-roue (poteaux 20 × 20, lisse 20 × 15)." : "Garde-corps supprimé : à justifier (dispositif de retenue de remplacement).",
  });
  checks.push({
    id: "T-RT", domain: dom, element: "Radiers de tête",
    label: "Radiers de tête : dalle sur sol hors passage des véhicules", status: "non_applicable", ref: "Dispositions constructives",
    detail: t.murs
      ? "Nappe inférieure transversale dimensionnée pour l'encastrement des ailes (T-MA-ENC) ; autres nappes HA10 e = 20 cm."
      : "Élément non sollicité en flexion : ferraillage minimal HA10 e = 20 cm en deux nappes.",
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
