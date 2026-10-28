/**
 * Ferraillage du corps du dalot, face par face, et vérifications des sections.
 * Les faces symétriques sont regroupées pour obtenir des nappes identiques (même Ø, même
 * espacement), ce qui simplifie le façonnage et la pose.
 */

import type { Analysis } from "./analysis";
import {
  asELS, asELU, asMinBAEL, asMinEC2, barArea, chooseBars, crackWidthEC2, materials, mRdEC2, muCapacity,
  sMax, stressesELS, vRdcEC2, type BarChoice, type Materials,
} from "./ba";
import type { Check } from "./checks";
import type { DalotInput } from "./fields";
import type { Member } from "./frame";

export type GroupId = "dalle_int" | "dalle_ext" | "radier_int" | "radier_ext" | "pext_int" | "pext_ext" | "pint";

export const GROUP_LABELS: Record<GroupId, string> = {
  dalle_int: "Dalle — nappe inférieure (intérieure)",
  dalle_ext: "Dalle — nappe supérieure (extérieure)",
  radier_int: "Radier — nappe supérieure (intérieure)",
  radier_ext: "Radier — nappe inférieure (extérieure)",
  pext_int: "Piédroits extérieurs — face intérieure",
  pext_ext: "Piédroits extérieurs — face extérieure",
  pint: "Piédroits intermédiaires — deux faces",
};

export type FaceRef = { member: number; face: 0 | 1 };

export type GroupDesign = {
  id: GroupId;
  label: string;
  h: number;
  d: number;
  faces: FaceRef[];
  Mu: number; // kN·m/m
  Ms: number;
  /** Moment de contrôle EC2 (combinaisons EN 1990). */
  MEd: number;
  comboU: string;
  comboS: string;
  governing: string;
  AsELU: number; // cm²/m
  AsELS: number;
  AsMin: number;
  AsReq: number;
  overLimit: boolean;
  concreteLimited: boolean;
  bars: BarChoice;
  imposed: boolean;
  rep: BarChoice;
  sigmaBc: number;
  sigmaS: number;
  MuCap: number;
  MRd: number;
  wk: number;
};

export type ShearDesign = {
  member: string;
  h: number;
  d: number;
  VuFace: number; // kN/m
  VuD: number;
  /** Effort tranchant de contrôle EC2 à d du nu (combinaisons EN 1990). */
  VEd: number;
  tau: number; // MPa
  VRdc: number; // kN/m
  combo: string;
};

export type Design = { mat: Materials; groups: GroupDesign[]; shear: ShearDesign[]; checks: Check[] };

function groupOf(m: Member, face: 0 | 1): GroupId {
  const f = m.faces[face];
  if (m.kind === "dalle") return f.exterior ? "dalle_ext" : "dalle_int";
  if (m.kind === "radier") return f.exterior ? "radier_ext" : "radier_int";
  if (m.kind === "piedroit_int") return "pint";
  return f.exterior ? "pext_ext" : "pext_int";
}

export function designSections(inp: DalotInput, an: Analysis): Design {
  const mat = materials(inp);
  const { model, elu, els, ec2, combos } = an;
  const ns = an.quantities.ns;
  const groups = new Map<GroupId, FaceRef[]>();
  model.members.forEach((m, mi) => {
    ([0, 1] as const).forEach((face) => {
      const g = groupOf(m, face);
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g)!.push({ member: mi, face });
    });
  });

  const comboName = (ci: number) => combos[ci]?.id ?? "—";
  const checks: Check[] = [];
  const out: GroupDesign[] = [];

  for (const id of Object.keys(GROUP_LABELS) as GroupId[]) {
    const faces = groups.get(id);
    if (!faces) continue;
    let Mu = 0, Ms = 0, MEd = 0, cu = -1, cs = -1, gov = "", h = 0;
    for (const { member, face } of faces) {
      const m = model.members[member];
      h = Math.max(h, m.thickness);
      const sign = m.faces[face].sign;
      m.nodes.forEach((_, k) => {
        const s = m.s[k];
        if (s < m.supportStart - 1e-9 || s > m.length - m.supportEnd + 1e-9) return; // au nu des appuis
        const q = m.station0 + k;
        const u = sign > 0 ? elu.max[q] : -elu.min[q];
        const v = sign > 0 ? els.max[q] : -els.min[q];
        if (u > Mu) { Mu = u; cu = sign > 0 ? elu.cMax[q] : elu.cMin[q]; gov = `${m.label}, face ${m.faces[face].label}, x = ${s.toFixed(2)} m`; }
        if (v > Ms) { Ms = v; cs = sign > 0 ? els.cMax[q] : els.cMin[q]; }
        MEd = Math.max(MEd, sign > 0 ? ec2.max[q] : -ec2.min[q]);
      });
    }
    const imposed = inp.imposed[id];
    // Hauteur utile : itération sur le diamètre retenu.
    let phi = imposed?.phi ?? 12;
    let d = h - mat.cover - phi / 2000;
    let res = computeGroup(Mu, Ms, d, mat);
    let bars = imposed ? { phi: imposed.phi, s: imposed.s, As: barArea(imposed.phi) / imposed.s } : chooseBars(res.AsReq, h, mat);
    if (!imposed && bars.phi !== phi) {
      phi = bars.phi;
      d = h - mat.cover - phi / 2000;
      res = computeGroup(Mu, Ms, d, mat);
      bars = chooseBars(res.AsReq, h, mat);
      d = h - mat.cover - bars.phi / 2000;
    }
    // Maîtrise de la fissuration (EC2 §7.3.4) : on renforce la nappe tant que wk > wmax.
    if (!imposed && Ms > 0) {
      let target = bars.As;
      for (let k = 0; k < 20 && crackWidthEC2(Ms / 1000, bars.As, h - mat.cover - bars.phi / 2000, h, bars.phi / 1000, mat) > inp.wkMax; k++) {
        target *= 1.06;
        bars = chooseBars(target, h, mat);
      }
      d = h - mat.cover - bars.phi / 2000;
    }
    // Répartition : A/4 (BAEL A.8.2,41) avec un minimum constructif HA8 e = 25 cm.
    const rep = chooseBars(Math.max(bars.As / 4, barArea(8) / 0.25), h, mat, 8);
    const st = stressesELS(Ms / 1000, bars.As, d);
    const g: GroupDesign = {
      id, label: GROUP_LABELS[id], h, d, faces, Mu, Ms, MEd,
      comboU: cu >= 0 ? comboName(cu) : "—", comboS: cs >= 0 ? comboName(cs) : "—", governing: gov || "—",
      AsELU: res.AsELU * 1e4, AsELS: res.AsELS * 1e4, AsMin: res.AsMin * 1e4, AsReq: res.AsReq * 1e4,
      overLimit: res.overLimit, concreteLimited: res.concreteLimited,
      bars, imposed: !!imposed, rep,
      sigmaBc: st.sigmaBc, sigmaS: st.sigmaS,
      MuCap: muCapacity(bars.As, d, mat) * 1000,
      MRd: mRdEC2(bars.As, d, mat).MRd * 1000,
      wk: crackWidthEC2(Ms / 1000, bars.As, d, h, bars.phi / 1000, mat),
    };
    out.push(g);
    checks.push(...groupChecks(g, mat, inp));
  }

  const shear = shearDesign(an, mat, out);
  for (const s of shear) {
    checks.push({
      id: `V-BAEL-${s.member}`, domain: "Effort tranchant", element: s.member,
      label: "Contrainte tangente au nu de l'appui, sans armatures d'effort tranchant", value: s.tau, limit: mat.tauLim, unit: "MPa",
      status: s.tau <= mat.tauLim ? "conforme" : "non_conforme", combo: s.combo,
      ref: "BAEL 91 A.5.2,2 : τu = Vu/(b·d) ≤ 0,07·fc28/γb",
    });
    checks.push({
      id: `V-EC2-${s.member}`, domain: "Contrôle Eurocode 2", element: s.member,
      label: "Effort tranchant à d du nu de l'appui : VEd ≤ VRd,c (sans armatures d'effort tranchant)", value: s.VEd, limit: s.VRdc, unit: "kN/m",
      status: s.VEd <= s.VRdc ? "conforme" : "non_conforme",
      ref: "EC2 §6.2.2 (6.2.a/b), §6.2.1(8) / EN 1990 (6.10)",
    });
  }

  // Compression des piédroits (ELU).
  model.members.forEach((m) => {
    if (!m.kind.startsWith("piedroit")) return;
    let Nmin = 0, ci = -1;
    m.nodes.forEach((_, k) => {
      const q = 2 * ns + m.station0 + k;
      if (elu.min[q] < Nmin) { Nmin = elu.min[q]; ci = elu.cMin[q]; }
    });
    const sigma = -Nmin / 1000 / m.thickness;
    checks.push({
      id: `N-${m.id}`, domain: "Dimensionnement des sections", element: m.label,
      label: "Compression centrée du piédroit Nu/(b·h) ≤ fbu", value: sigma, limit: mat.fbu, unit: "MPa",
      status: sigma <= mat.fbu ? "conforme" : "non_conforme", combo: ci >= 0 ? combos[ci].id : undefined,
      ref: "BAEL 91 A.4.3,41",
    });
  });

  return { mat, groups: out, shear, checks };
}

function computeGroup(MuKN: number, MsKN: number, d: number, mat: Materials) {
  const u = asELU(MuKN / 1000, d, mat);
  const s = asELS(MsKN / 1000, d, mat);
  // Minimum le plus exigeant des deux règlements de référence (BAEL A.4.2 et EC2 §9.2.1.1).
  const AsMin = Math.max(asMinBAEL(d, mat), asMinEC2(d, mat));
  const AsReq = Math.max(u.As, s.As, AsMin);
  return { AsELU: u.As, AsELS: s.As, AsMin, AsReq, overLimit: u.overLimit, concreteLimited: s.concreteLimited };
}

function groupChecks(g: GroupDesign, mat: Materials, inp: DalotInput): Check[] {
  const el = g.label;
  const c: Check[] = [];
  const st = (ok: boolean) => (ok ? "conforme" : "non_conforme") as Check["status"];
  c.push({
    id: `F-ELU-${g.id}`, domain: "Dimensionnement des sections", element: el,
    label: "Flexion ELU : Mu ≤ Mu,résistant (aciers fournis)", value: g.Mu, limit: g.MuCap, unit: "kN·m/m",
    status: g.overLimit ? "non_conforme" : st(g.Mu <= g.MuCap + 1e-6), combo: g.comboU,
    ref: "BAEL 91 A.4.3 (pivots A/B, μ ≤ μl)", detail: g.overLimit ? "μ > μl : aciers comprimés nécessaires, augmenter l'épaisseur." : undefined,
  });
  c.push({
    id: `F-MIN-${g.id}`, domain: "Dimensionnement des sections", element: el,
    label: "Condition de non-fragilité : As ≥ 0,23·b·d·ft28/fe", value: g.bars.As * 1e4, limit: asMinBAEL(g.d, mat) * 1e4, unit: "cm²/m",
    status: st(g.bars.As >= asMinBAEL(g.d, mat) - 1e-9), ref: "BAEL 91 A.4.2",
  });
  c.push({
    id: `F-REQ-${g.id}`, domain: "Dimensionnement des sections", element: el,
    label: "Section d'acier fournie ≥ section requise (ELU, ELS, minimum)", value: g.bars.As * 1e4, limit: g.AsReq, unit: "cm²/m",
    status: st(g.bars.As * 1e4 >= g.AsReq - 1e-6), ref: "BAEL 91 A.4.3 / A.4.5",
  });
  if (g.Ms > 0) {
    c.push({
      id: `S-BC-${g.id}`, domain: "Contraintes de service (ELS)", element: el,
      label: "Compression du béton σbc ≤ 0,6·fc28", value: g.sigmaBc, limit: mat.sigmaBc, unit: "MPa",
      status: st(g.sigmaBc <= mat.sigmaBc + 1e-6), combo: g.comboS, ref: "BAEL 91 A.4.5,2",
    });
    c.push({
      id: `S-S-${g.id}`, domain: "Contraintes de service (ELS)", element: el,
      label: `Traction des aciers σs ≤ σ̄s (fissuration ${mat.fissuration === "tres_prejudiciable" ? "très préjudiciable" : "préjudiciable"})`,
      value: g.sigmaS, limit: mat.sigmaS, unit: "MPa",
      status: st(g.sigmaS <= mat.sigmaS + 1e-6), combo: g.comboS, ref: mat.fissuration === "tres_prejudiciable" ? "BAEL 91 A.4.5,34" : "BAEL 91 A.4.5,33",
    });
  } else {
    c.push({
      id: `S-${g.id}`, domain: "Contraintes de service (ELS)", element: el, label: "Contraintes de service",
      status: "non_applicable", ref: "BAEL 91 A.4.5", detail: "Face jamais tendue sous les combinaisons ELS.",
    });
  }
  const smax = sMax(g.h, mat);
  c.push({
    id: `D-S-${g.id}`, domain: "Dispositions constructives", element: el,
    label: "Espacement des barres principales ≤ smax", value: g.bars.s * 100, limit: smax * 100, unit: "cm",
    status: st(g.bars.s <= smax + 1e-9), ref: "BAEL 91 A.4.5,33/34 et A.8.2,42",
  });
  c.push({
    id: `D-PHI-${g.id}`, domain: "Dispositions constructives", element: el,
    label: "Diamètre des barres ≤ h/10", value: g.bars.phi, limit: (g.h * 1000) / 10, unit: "mm",
    status: st(g.bars.phi <= (g.h * 1000) / 10 + 1e-9), ref: "BAEL 91 A.7.2,1",
  });
  c.push({
    id: `D-REP-${g.id}`, domain: "Dispositions constructives", element: el,
    label: "Armatures de répartition ≥ A/4", value: g.rep.As * 1e4, limit: (g.bars.As * 1e4) / 4, unit: "cm²/m",
    status: st(g.rep.As >= g.bars.As / 4 - 1e-9), ref: "BAEL 91 A.8.2,41",
  });
  const cmin = mat.fissuration === "tres_prejudiciable" ? 0.05 : 0.03;
  c.push({
    id: `D-C-${g.id}`, domain: "Dispositions constructives", element: el,
    label: "Enrobage ≥ enrobage minimal (ouvrage exposé aux eaux)", value: inp.cover * 100, limit: cmin * 100, unit: "cm",
    status: st(inp.cover >= cmin - 1e-9), ref: "BAEL 91 A.7.1",
  });
  // Eurocode 2
  c.push({
    id: `EC-M-${g.id}`, domain: "Contrôle Eurocode 2", element: el,
    label: "Moment résistant MRd ≥ MEd (combinaisons EN 1990)", value: g.MEd, limit: g.MRd, unit: "kN·m/m",
    status: g.MEd > 0 ? st(g.MEd <= g.MRd + 1e-6) : "non_applicable", ref: "EC2 §6.1 / EN 1990 (6.10)",
    detail: g.MEd > 0 ? undefined : "Face jamais tendue aux ELU.",
  });
  c.push({
    id: `EC-MIN-${g.id}`, domain: "Contrôle Eurocode 2", element: el,
    label: "Section minimale As,min = max(0,26·fctm/fyk ; 0,0013)·b·d", value: g.bars.As * 1e4, limit: asMinEC2(g.d, mat) * 1e4, unit: "cm²/m",
    status: st(g.bars.As >= asMinEC2(g.d, mat) - 1e-9), ref: "EC2 §9.2.1.1 (9.1N)",
  });
  c.push({
    id: `EC-W-${g.id}`, domain: "Contrôle Eurocode 2", element: el,
    label: "Ouverture des fissures wk ≤ wmax (sous ELS caractéristique, sécuritaire)", value: g.wk, limit: inp.wkMax, unit: "mm",
    status: g.Ms > 0 ? st(g.wk <= inp.wkMax + 1e-9) : "non_applicable", combo: g.comboS, ref: "EC2 §7.3.4 (7.8) à (7.11)",
    detail: g.Ms > 0 ? undefined : "Face jamais tendue aux ELS.",
  });
  return c;
}

function shearDesign(an: Analysis, mat: Materials, groups: GroupDesign[]): ShearDesign[] {
  const { model, elu, ec2, combos } = an;
  const ns = an.quantities.ns;
  const asFor = (m: Member) => {
    const ids: GroupId[] = m.kind === "dalle" ? ["dalle_int", "dalle_ext"] : m.kind === "radier" ? ["radier_int", "radier_ext"] : m.kind === "piedroit_int" ? ["pint"] : ["pext_int", "pext_ext"];
    return Math.min(...groups.filter((g) => ids.includes(g.id)).map((g) => g.bars.As));
  };
  const out: ShearDesign[] = [];
  model.members.forEach((m) => {
    const d = m.thickness - mat.cover - 0.006;
    let vFace = 0, vD = 0, vEc = 0, ci = -1;
    m.nodes.forEach((_, k) => {
      const s = m.s[k];
      const q = ns + m.station0 + k;
      const v = Math.max(Math.abs(elu.max[q]), Math.abs(elu.min[q]));
      const c = Math.abs(elu.max[q]) >= Math.abs(elu.min[q]) ? elu.cMax[q] : elu.cMin[q];
      const fromStart = s - m.supportStart, fromEnd = m.length - m.supportEnd - s;
      if (fromStart >= -1e-9 && fromEnd >= -1e-9) {
        if (v > vFace) { vFace = v; ci = c; }
        if (fromStart >= d && fromEnd >= d) {
          vD = Math.max(vD, v);
          vEc = Math.max(vEc, Math.abs(ec2.max[q]), Math.abs(ec2.min[q]));
        }
      }
    });
    // Barre trop courte pour qu'une station soit à d du nu : on garde la valeur au nu.
    if (vD === 0) {
      vD = vFace;
      m.nodes.forEach((_, k) => { const q = ns + m.station0 + k; vEc = Math.max(vEc, Math.abs(ec2.max[q]), Math.abs(ec2.min[q])); });
    }
    out.push({
      member: m.label, h: m.thickness, d, VuFace: vFace, VuD: vD, VEd: vEc,
      tau: vFace / 1000 / d, VRdc: vRdcEC2(asFor(m), d, mat) * 1000, combo: ci >= 0 ? combos[ci].id : "—",
    });
  });
  return out;
}
