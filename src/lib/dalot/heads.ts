/**
 * Ouvrages de tête : murs en aile (murs cantilever sur semelle), mur de tête (garde-grève sur
 * la dalle), radiers de tête, bêches parafouilles et guide-roues.
 *
 * Les deux têtes et les quatre ailes peuvent être réglées une à une (rubrique « Ouvrages annexes
 * par position ») : chaque tête est alors vérifiée avec ses deux ailes, éventuellement
 * dissymétriques. Quand tout est identique, une seule tête est calculée, comme sur les plans types.
 */

import { asELS, asELU, asMinBAEL, barArea, chooseBars, stressesELS, type BarChoice, type Materials } from "./ba";
import type { Check } from "./checks";
import type { DalotInput, HeadId, Imposed, Side, WingPos } from "./fields";
import { qLimit } from "./geotech";
import { headCfgDims, headLayout, wingEndHeight, type HeadCfg, type Tetes } from "./head-dims";

const rad = (d: number) => (d * Math.PI) / 180;
const f2 = (x: number) => x.toFixed(2).replace(".", ",");

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
  imposed: boolean;
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
  /** Résultante transversale non équilibrée (ailes dissymétriques), kN. */
  Fy: number;
  N: number;
  encAsReq: number; // cm²/m
};

export type ChocResult = { F: number; l: number; h: number; b: number; Mu: number; AsReq: number; bars: BarChoice; tau: number };

export type HeadWing = { side: Side; pos: WingPos; label: string; tv: Tetes; res: WingResult };
export type HeadResult = {
  id: HeadId; label: string; tv: Tetes;
  headWall: WallDesign;
  /** Cadres du guide-roue (dimensionnés au choc). */
  grBars: BarChoice;
  choc: ChocResult | null;
  wings: HeadWing[];
};

export type HeadsResult = {
  /** Aile de référence (tête amont, rive gauche) : plans, note et métré des têtes identiques. */
  wing: WingResult | null;
  headWall: WallDesign;
  checks: Check[];
  /** Têtes et ailes identiques. */
  uniform: boolean;
  perHead: HeadResult[];
};

function cantilever(name: string, H: number, e: number, Ka: number, gamma: number, q: number, mat: Materials, imp?: Imposed) {
  const Mg = (Ka * gamma * H ** 3) / 6;
  const Mq = (Ka * q * H ** 2) / 2;
  const M = 1.35 * Mg + 1.5 * Mq;
  const Ms = Mg + Mq;
  const V = 1.35 * (Ka * gamma * H ** 2) / 2 + 1.5 * Ka * q * H;
  // Hauteur utile recalculée avec le diamètre effectivement retenu.
  const req = (d: number) => Math.max(asELU(M / 1000, d, mat).As, asELS(Ms / 1000, d, mat).As, asMinBAEL(d, mat));
  let AsReq = req(e - mat.cover - 0.006);
  let bars = imp ? { phi: imp.phi, s: imp.s, As: barArea(imp.phi) / imp.s } : chooseBars(AsReq, e, mat);
  if (imp) AsReq = req(e - mat.cover - imp.phi / 2000);
  else {
    for (let k = 0; k < 3; k++) {
      AsReq = req(e - mat.cover - bars.phi / 2000);
      if (bars.As >= AsReq) break;
      bars = chooseBars(AsReq, e, mat);
    }
  }
  const rep = imp?.phiR && imp.sR
    ? { phi: imp.phiR, s: imp.sR, As: barArea(imp.phiR) / imp.sR }
    : chooseBars(Math.max(bars.As / 4, barArea(8) / 0.25), e, mat, 8);
  const st = stressesELS(Ms / 1000, bars.As, e - mat.cover - bars.phi / 2000);
  return { name, H, e, Ka, M, Ms, V, bars, rep, sigmaS: st.sigmaS, AsReq: AsReq * 1e4, imposed: !!imp };
}

/** Dimensionne et vérifie une tête (ou les deux têtes identiques quand `named` est faux). */
function designHead(inp: DalotInput, mat: Materials, h: HeadCfg, named: boolean, checks: Check[]): HeadResult {
  const t = h.tv;
  const Ka = Math.tan(rad(45 - inp.talus.phi / 2)) ** 2;
  const Hext = inp.er + inp.hInt + inp.es;
  const dom = "Ouvrages de tête";
  const st = (ok: boolean) => (ok ? "conforme" : "non_conforme") as Check["status"];
  const sfx = named ? (h.id === "amont" ? "-AM" : "-AV") : "";
  const of = named ? ` ${h.id}` : "";
  const imp = inp.imposed;

  // Guide-roue sur l'about de la dalle (20 cm sur les plans types) ; au-delà de 0,30 m, calculé en mur de tête.
  const hHead = t.guideRoues ? t.grH : 0;
  const headWall = cantilever(`Mur de tête${of}`, hHead, hHead > 0.3 ? t.murTeteEp : t.grL, Ka, inp.gammaR, inp.qRemblai, mat, hHead > 0.3 ? imp.mt_v : undefined);
  checks.push({
    id: `T-MT-F${sfx}`, domain: dom, element: `Mur de tête${of}`,
    label: `Flexion à l'encastrement sur la dalle (h = ${hHead.toFixed(2)} m) : As fournie ≥ As requise`,
    value: headWall.bars.As * 1e4, limit: headWall.AsReq, unit: "cm²/m",
    status: st(headWall.bars.As * 1e4 >= headWall.AsReq - 1e-6), ref: "BAEL 91 A.4.3 / A.4.5 — poussée de Rankine Ka",
  });
  checks.push({
    id: `T-MT-S${sfx}`, domain: dom, element: `Mur de tête${of}`,
    label: "Contrainte des aciers ELS σs ≤ σ̄s", value: headWall.sigmaS, limit: mat.sigmaS, unit: "MPa",
    status: st(headWall.sigmaS <= mat.sigmaS + 1e-6), ref: "BAEL 91 A.4.5,33",
  });

  // ── Choc sur le guide-roue (ou le mur de tête) ──
  let choc: ChocResult | null = null;
  let grBars: BarChoice = { phi: 8, s: 0.2, As: barArea(8) / 0.2 };
  const eGr = hHead > 0.3 ? t.murTeteEp : t.grL;
  if (t.guideRoues && hHead > 0 && inp.choc.F > 0) {
    // Diffusion à 45° de la longueur d'application jusqu'à l'encastrement sur la dalle ; ELU γQ = 1,5 (sécuritaire).
    const b = inp.choc.l + 2 * hHead;
    const Mu = (1.5 * inp.choc.F * hHead) / b;
    const d = eGr - mat.cover - 0.005;
    const AsReq = Math.max(asELU(Mu / 1000, d, mat).As, asMinBAEL(d, mat));
    if (hHead > 0.3) grBars = headWall.bars;
    else grBars = imp.gr ? { phi: imp.gr.phi, s: imp.gr.s, As: barArea(imp.gr.phi) / imp.gr.s } : chooseBars(Math.max(AsReq, barArea(8) / 0.2), eGr, mat, 8);
    const As = hHead > 0.3 ? Math.max(headWall.bars.As, 0) : grBars.As;
    const tau = (1.5 * inp.choc.F) / b / 1000 / d;
    choc = { F: inp.choc.F, l: inp.choc.l, h: hHead, b, Mu, AsReq: AsReq * 1e4, bars: grBars, tau };
    checks.push({
      id: `ANX-CHOC-F${sfx}`, domain: dom, element: `${hHead > 0.3 ? "Mur de tête" : "Guide-roue"}${of}`,
      label: `Choc de ${inp.choc.F.toFixed(0)} kN en tête (h = ${f2(hHead)} m, diffusion sur ${f2(b)} m) : As fournie ≥ As requise`,
      value: As * 1e4, limit: AsReq * 1e4, unit: "cm²/m", status: st(As >= AsReq - 1e-9),
      ref: "Effort de choc sur dispositif de retenue (Fascicule 61 titre II) — BAEL 91 A.4.3",
      detail: `Mu = 1,5 × F × h / (l + 2h) = ${Mu.toFixed(1).replace(".", ",")} kN·m/m.`,
    });
    checks.push({
      id: `ANX-CHOC-V${sfx}`, domain: dom, element: `${hHead > 0.3 ? "Mur de tête" : "Guide-roue"}${of}`,
      label: "Effort tranchant dû au choc τu ≤ 0,07·fc28/γb", value: tau, limit: mat.tauLim, unit: "MPa", status: st(tau <= mat.tauLim),
      ref: "BAEL 91 A.5.2,2",
    });
  } else if (t.guideRoues && hHead > 0) {
    checks.push({
      id: `ANX-CHOC${sfx}`, domain: dom, element: `Guide-roue${of}`, label: "Résistance au choc d'un véhicule", status: "non_verifie",
      ref: "Fascicule 61 titre II", detail: "Aucun effort de choc déclaré (rubrique Ouvrages de tête › Contrôles des équipements).",
    });
  }

  const wings: HeadWing[] = [];
  const sides = h.sides.filter((s) => s.tv.murs);
  if (sides.length > 0) {
    // L'aile s'accroche au sommet du guide-roue (ou du mur de tête) posé sur l'about de la dalle supérieure,
    // comme sur les plans types : hauteur à l'enracinement = cadre + mur de tête ou guide-roue.
    const Htot = Hext + hHead;
    const hd = headCfgDims(inp, h);
    const hs = t.semEp, heel = Math.max(0, t.patin);
    const Lr = t.radierLong;
    // Les deux ailes sont encastrées dans le radier de tête continu (plans types, section 2-2) :
    // la tête forme un U. Les composantes transversales des poussées (P·cos α) s'équilibrent dans le
    // radier de tête quand les ailes sont symétriques ; sinon leur différence Fy s'ajoute au glissement.
    // La résultante le long de l'axe (Σ P·sin α), qui pousse la tête vers l'aval, sollicite le sol :
    // stabilité vérifiée sur la tête complète (ailes + radier de tête + bêche d'extrémité), sans compter
    // la liaison avec le radier du corps (sécuritaire).
    let Fx = 0, Fy = 0, Mo = 0, N = 0, Mr = 0;
    const weight = (W: number, x: number) => { N += W; Mr += W * (Lr - x); };
    const perSide = sides.map((s) => {
      const a = rad(s.tv.angle), sinA = Math.sin(a), cosA = Math.cos(a);
      const Hend = wingEndHeight(inp, s.tv, Htot);
      // Hauteur le long de l'aile : celle du talus (fruit m/1) bornée par la hauteur d'extrémité, ou
      // variation linéaire jusqu'à la hauteur d'extrémité imposée.
      const Hat = (sAl: number) => s.tv.hEnd !== null && s.tv.hEnd > 0
        ? Htot - ((Htot - Hend) * sAl) / Math.max(s.tv.long, 1e-6)
        : Math.max(Hend, Htot - (sAl * cosA) / inp.talus.pente);
      const nSeg = 40, ds = s.tv.long / nSeg;
      let Pw = 0;
      for (let i = 0; i < nSeg; i++) {
        const sAl = (i + 0.5) * ds, H = Hat(sAl), x = sAl * cosA, Hw = Math.max(0, H - hs);
        const pa = 0.5 * Ka * inp.gammaR * H ** 2, pq = Ka * inp.qRemblai * H;
        Pw += (pa + pq) * ds;
        Fx += (pa + pq) * sinA * ds;
        Fy += (s.side === "g" ? 1 : -1) * (pa + pq) * cosA * ds;
        Mo += (pa * H / 3 + pq * H / 2) * sinA * ds;
        weight(inp.gammaBA * s.tv.ep * Hw * ds, x); // voile
        weight((inp.gammaBA * hs + inp.gammaR * Hw) * heel * ds, x); // talon et remblai sur talon
      }
      // Ferraillage du voile au tiers de sa longueur : près de l'enracinement, le voile est tenu par
      // le mur de tête et le corps (fonctionnement en dalle sur deux côtés). La stabilité, elle,
      // reste vérifiée à l'enracinement, à la hauteur maximale.
      const Hd = Htot - (Htot - Hend) / 3;
      const base = cantilever(`Mur en aile ${s.label} (tiers de la longueur)`, Hd, s.tv.ep, Ka, inp.gammaR, inp.qRemblai, mat, imp.aile_v);
      const enc = cantilever(`Radier de tête — encastrement de l'aile ${s.label}`, Hd, hs, Ka, inp.gammaR, inp.qRemblai, mat, imp.rt_enc);
      return { s, Hend, Hd, Pw, base, enc };
    });
    // Une seule aile : la poussée transversale n'est équilibrée que par le frottement du radier de tête.
    if (sides.length === 1) Fy = Math.abs(Fy);
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
    const Fres = Math.hypot(Fx, Math.abs(Fy) < 1e-9 ? 0 : Fy);
    const FSg = Fres > 0 ? resist / Fres : Infinity;
    // Contrainte sous le radier de tête (trapèze assimilé à un rectangle de largeur moyenne).
    const bm = Lr > 0 ? S / Lr : 1;
    const xR = (Mr - Mo) / N; // depuis l'arête aval
    const e0 = (Lr - xg) - xR;
    const sigmaMax = Math.abs(e0) <= Lr / 6 ? (N / S) * (1 + (6 * Math.abs(e0)) / Lr) : (2 * N) / (3 * Math.max(xR, 0.01) * bm);
    const ql = qLimit(Math.min(Lr, bm), Math.max(Lr, bm), inp.phiSol, inp.cSol, inp.gammaSol, Math.max(inp.Df, hs), inp.nappe);
    const qAllow = Math.min(ql.q0 + (ql.qu - ql.q0) / 3, inp.qadm !== null ? inp.qadm * 1000 : Infinity);
    const worstEnc = perSide.reduce((a, b) => (b.enc.AsReq > a.enc.AsReq ? b : a));
    const footBars = worstEnc.enc.bars;
    for (const p of perSide) {
      wings.push({
        side: p.s.side, pos: p.s.pos, label: p.s.label, tv: p.s.tv,
        res: { ...p.base, H: Htot, Htot, Hend: p.Hend, B: Lr, FSr, FSg, e0, sigmaMax, qAllow, footBars, Pw: p.Pw, Fx, Fy, N, encAsReq: worstEnc.enc.AsReq },
      });
    }

    const headEl = named ? `${h.label} (ailes + radier de tête)` : "Tête (ailes + radier de tête)";
    const radEl = `Radier de tête${of}`;
    checks.push({
      id: `T-RT-L${sfx}`, domain: dom, element: radEl,
      label: "Le radier de tête porte les ailes sur toute leur projection : L ≥ longueur d'aile × cos α", value: Lr, limit: hd.along, unit: "m",
      status: st(Lr >= hd.along - 0.05), ref: "Dispositions des plans types (section 2-2)",
      detail: Lr >= hd.along - 0.05 ? undefined : `Allonger le radier de tête à ${(Math.ceil(hd.along * 10) / 10).toFixed(2).replace(".", ",")} m : au-delà, l'aile n'est plus portée que par son talon.`,
    });
    checks.push({
      id: `T-MA-RENV${sfx}`, domain: dom, element: headEl,
      label: "Renversement de la tête vers l'aval : FS = Ms/Mr ≥ 1,5", value: FSr, limit: 1.5, status: st(FSr >= 1.5),
      ref: "Stabilité des murs de soutènement (Fascicule 62 titre V)",
      detail: h.symmetric ? "Poussées transversales équilibrées dans le radier de tête ; moment de la résultante Σ P·sin α autour de l'arête aval." : "Ailes dissymétriques : moment de la résultante Σ P·sin α autour de l'arête aval.",
    });
    checks.push({
      id: `T-MA-GLIS${sfx}`, domain: dom, element: headEl,
      label: Math.abs(Fy) > 1e-6
        ? "Glissement : FS = (N·tan(2φ'/3) + c'·S/2 + Pp/2) / √(Fx² + Fy²) ≥ 1,5"
        : "Glissement : FS = (N·tan(2φ'/3) + c'·S/2 + Pp/2)/(2·P·sin α) ≥ 1,5",
      value: FSg, limit: 1.5, status: st(FSg >= 1.5),
      ref: "Fascicule 62 titre V",
      detail: [
        Math.abs(Fy) > 1e-6 ? `Résultante transversale non équilibrée Fy = ${Math.abs(Fy).toFixed(1).replace(".", ",")} kN (ailes différentes).` : "",
        FSg < 1.5 ? "Approfondir la bêche d'extrémité ou allonger le radier de tête." : "",
      ].filter(Boolean).join(" ") || undefined,
    });
    checks.push({
      id: `T-MA-EXC${sfx}`, domain: dom, element: headEl,
      label: "Résultante dans le tiers central du radier de tête : |e| ≤ L/6", value: Math.abs(e0), limit: Lr / 6, unit: "m", status: st(Math.abs(e0) <= Lr / 6),
      ref: "Règle du tiers central (ELS)",
    });
    checks.push({
      id: `T-MA-PORT${sfx}`, domain: dom, element: radEl,
      label: "Contrainte maximale sous le radier de tête ≤ contrainte admissible", value: sigmaMax, limit: qAllow, unit: "kPa", status: st(sigmaMax <= qAllow),
      ref: "Fascicule 62 titre V / rapport géotechnique",
    });
    checks.push({
      id: `T-MA-ENC${sfx}`, domain: dom, element: radEl,
      label: `Encastrement des ailes dans le radier de tête (nappe inférieure transversale) : As fournie ≥ As requise`,
      value: footBars.As * 1e4, limit: worstEnc.enc.AsReq, unit: "cm²/m", status: st(footBars.As * 1e4 >= worstEnc.enc.AsReq - 1e-6),
      ref: "BAEL 91 A.4.3 / A.4.5",
    });
    // Voiles : une série de contrôles par aile quand les ailes d'une tête diffèrent.
    const voiles = h.symmetric || perSide.length === 1 ? [perSide[0]] : perSide;
    for (const p of voiles) {
      const wsfx = sfx + (voiles.length > 1 ? (p.s.side === "g" ? "G" : "D") : "");
      const el = !named ? "Voile du mur en aile" : voiles.length > 1 || perSide.length === 1 ? `Voile du mur en aile ${p.s.label}` : `Voiles des murs en aile${of}`;
      checks.push({
        id: `T-MA-F${wsfx}`, domain: dom, element: el,
        label: `Flexion à la base du voile, au tiers de la longueur (H = ${p.Hd.toFixed(2)} m) : As fournie ≥ As requise`, value: p.base.bars.As * 1e4, limit: p.base.AsReq, unit: "cm²/m",
        status: st(p.base.bars.As * 1e4 >= p.base.AsReq - 1e-6), ref: "BAEL 91 A.4.3 / A.4.5",
      });
      checks.push({
        id: `T-MA-S${wsfx}`, domain: dom, element: el,
        label: "Contrainte des aciers ELS σs ≤ σ̄s", value: p.base.sigmaS, limit: mat.sigmaS, unit: "MPa", status: st(p.base.sigmaS <= mat.sigmaS + 1e-6),
        ref: "BAEL 91 A.4.5,33",
      });
      const tau = p.base.V / 1000 / (p.s.tv.ep - mat.cover - 0.006);
      checks.push({
        id: `T-MA-V${wsfx}`, domain: dom, element: el,
        label: "Effort tranchant à l'encastrement τu ≤ 0,07·fc28/γb", value: tau, limit: mat.tauLim, unit: "MPa", status: st(tau <= mat.tauLim),
        ref: "BAEL 91 A.5.2,2",
      });
    }
  } else {
    checks.push({
      id: `T-MA${sfx}`, domain: dom, element: `Murs en aile${of}`, label: "Murs en aile", status: "non_applicable", ref: "—",
      detail: "Pas de murs en aile déclarés.",
    });
  }
  checks.push({
    id: `T-RT${sfx}`, domain: dom, element: `Radiers de tête${of}`,
    label: "Radiers de tête : dalle sur sol hors passage des véhicules", status: "non_applicable", ref: "Dispositions constructives",
    detail: sides.length > 0
      ? "Nappe inférieure transversale dimensionnée pour l'encastrement des ailes (T-MA-ENC) ; autres nappes HA10 e = 20 cm."
      : "Élément non sollicité en flexion : ferraillage minimal HA10 e = 20 cm en deux nappes.",
  });
  checks.push({
    id: `T-BECHE${sfx}`, domain: dom, element: `Bêches parafouilles${of}`,
    label: "Bêches : protection contre l'affouillement", status: t.becheProf > 0 ? "non_applicable" : "non_verifie", ref: "Guide SETRA « Ouvrages hydrauliques »",
    detail: t.becheProf > 0
      ? `Élément de protection (profondeur ${t.becheProf.toFixed(2)} m), ferraillage minimal ; la profondeur d'affouillement est à confirmer par l'étude hydraulique.`
      : "Aucune bêche prévue : vérifier le risque d'affouillement à l'aval.",
  });
  if (t.guideRoues) {
    checks.push({
      id: `T-GR${sfx}`, domain: dom, element: `Guide-roues${of}`, label: "Guide-roues (équipement)", status: "non_applicable", ref: "Dispositions constructives",
      detail: choc ? `Élément d'équipement non porteur ; cadres HA${grBars.phi} e = ${(grBars.s * 100).toFixed(1).replace(".", ",")} cm justifiés au choc (ANX-CHOC).` : "Élément d'équipement non porteur, coffré et ferraillé forfaitairement.",
    });
  }
  return { id: h.id, label: h.label, tv: t, headWall, grBars, choc, wings };
}

export function designHeads(inp: DalotInput, mat: Materials): HeadsResult {
  const layout = headLayout(inp);
  const checks: Check[] = [];
  const dom = "Ouvrages de tête";
  let perHead: HeadResult[];
  if (layout.uniform) {
    const r = designHead(inp, mat, layout.heads[0], false, checks);
    perHead = [r, { ...r, id: "aval", label: "Tête aval" }];
  } else {
    perHead = layout.heads.map((h) => designHead(inp, mat, h, true, checks));
  }
  const t = inp.tetes;
  checks.push({
    id: "T-GC", domain: dom, element: "Garde-corps",
    label: "Garde-corps de 1,00 m sur les deux rives de la dalle", status: t.gardeCorps ? "conforme" : "non_verifie",
    ref: "Sécurité des usagers — pratique des marchés AGEROUTE / BNETD",
    detail: t.gardeCorps ? "Garde-corps en béton armé posé sur le guide-roue (poteaux 20 × 20, lisse 20 × 15)." : "Garde-corps supprimé : à justifier (dispositif de retenue de remplacement).",
  });
  const first = perHead[0];
  return { wing: first.wings[0]?.res ?? perHead[1].wings[0]?.res ?? null, headWall: first.headWall, checks, uniform: layout.uniform, perHead };
}
