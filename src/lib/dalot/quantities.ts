/**
 * Nomenclature des aciers (repères, façonnage, longueurs, poids) et métré de l'ouvrage.
 */

import { barMass, type BarChoice, type Materials } from "./ba";
import type { GroupDesign, GroupId } from "./design";
import type { DalotInput } from "./fields";
import type { HeadsResult } from "./heads";

export type BarShape = "droite" | "U" | "L" | "gousset";

export type BarMark = {
  rep: number;
  element: string;
  designation: string;
  phi: number;
  s: number;
  shape: BarShape;
  /** Cotes de façonnage (m) : droite [a], U [jambe, base, jambe], L [a, b]. */
  dims: number[];
  length: number; // longueur développée d'une barre (m), recouvrements compris
  count: number;
  totalLength: number;
  mass: number; // kg
};

export type QuantityLine = { lot: string; designation: string; unit: string; quantity: number };

export type Quantities = { bars: BarMark[]; lines: QuantityLine[]; steelMass: number; concrete: number; ratio: number };

const COMMERCIAL = 12;

export function computeQuantities(inp: DalotInput, mat: Materials, groups: GroupDesign[], heads: HeadsResult): Quantities {
  const g = (id: GroupId) => groups.find((x) => x.id === id);
  const c = inp.cover;
  const n = inp.openings.length;
  const B = inp.eExt * 2 + inp.openings.reduce((s, o) => s + o, 0) + inp.eInt * (n - 1);
  const Hout = inp.er + inp.hInt + inp.es;
  const L = inp.L;
  const nAlong = (s: number, len = L) => Math.floor((len - 2 * c) / s + 1e-9) + 1;
  const nAcross = (len: number, s: number) => Math.floor(len / s + 1e-9) + 1;
  const lap = (len: number, phi: number) => {
    const laps = Math.max(0, Math.ceil(len / COMMERCIAL) - 1);
    return len + (laps * mat.ls * phi) / 1000;
  };
  const anchor = (phi: number) => (mat.ls * phi) / 1000;

  const bars: BarMark[] = [];
  const add = (element: string, designation: string, b: BarChoice | { phi: number; s: number }, shape: BarShape, dims: number[], count: number) => {
    if (count <= 0) return;
    const raw = dims.reduce((s, x) => s + x, 0);
    const length = lap(raw, b.phi);
    bars.push({
      rep: bars.length + 1, element, designation, phi: b.phi, s: b.s, shape, dims, length, count,
      totalLength: length * count, mass: length * count * barMass(b.phi),
    });
  };

  const de = g("dalle_ext"), di = g("dalle_int"), re = g("radier_ext"), ri = g("radier_int");
  const pe = g("pext_ext"), pi = g("pext_int"), pn = g("pint");
  if (de) {
    const leg = Math.min(anchor(de.bars.phi), Hout - 2 * c);
    add("Dalle", "Nappe supérieure — cadre extérieur retourné dans les piédroits", de.bars, "U", [leg, B - 2 * c, leg], nAlong(de.bars.s));
  }
  if (di) add("Dalle", "Nappe inférieure — barres filantes", di.bars, "droite", [B - 2 * c], nAlong(di.bars.s));
  if (re) {
    const leg = Math.min(anchor(re.bars.phi), Hout - 2 * c);
    add("Radier", "Nappe inférieure — cadre extérieur retourné dans les piédroits", re.bars, "U", [leg, B - 2 * c, leg], nAlong(re.bars.s));
  }
  if (ri) add("Radier", "Nappe supérieure — barres filantes", ri.bars, "droite", [B - 2 * c], nAlong(ri.bars.s));
  if (pe) add("Piédroits extérieurs", "Face extérieure — barres verticales", pe.bars, "droite", [Hout - 2 * c], 2 * nAlong(pe.bars.s));
  if (pi) add("Piédroits extérieurs", "Face intérieure — barres verticales", pi.bars, "droite", [Hout - 2 * c], 2 * nAlong(pi.bars.s));
  if (pn && n > 1) add("Piédroits intermédiaires", "Deux faces — barres verticales", pn.bars, "droite", [Hout - 2 * c], 2 * (n - 1) * nAlong(pn.bars.s));
  if (inp.gousset > 0 && di) {
    const gb = { phi: 10, s: di.bars.s };
    add("Goussets", "Barres de gousset à 45°", gb, "gousset", [0.3, inp.gousset * Math.SQRT2, 0.3], 4 * n * nAlong(gb.s));
  }
  // Répartitions longitudinales.
  const repLen = L - 2 * c;
  if (de) add("Dalle", "Répartition nappe supérieure", de.rep, "droite", [repLen], nAcross(B - 2 * c, de.rep.s));
  if (di) add("Dalle", "Répartition nappe inférieure", di.rep, "droite", [repLen], nAcross(B - 2 * c, di.rep.s));
  if (re) add("Radier", "Répartition nappe inférieure", re.rep, "droite", [repLen], nAcross(B - 2 * c, re.rep.s));
  if (ri) add("Radier", "Répartition nappe supérieure", ri.rep, "droite", [repLen], nAcross(B - 2 * c, ri.rep.s));
  if (pe) add("Piédroits extérieurs", "Répartition face extérieure", pe.rep, "droite", [repLen], 2 * nAcross(Hout - 2 * c, pe.rep.s));
  if (pi) add("Piédroits extérieurs", "Répartition face intérieure", pi.rep, "droite", [repLen], 2 * nAcross(inp.hInt, pi.rep.s));
  if (pn && n > 1) add("Piédroits intermédiaires", "Répartition deux faces", pn.rep, "droite", [repLen], 2 * (n - 1) * nAcross(inp.hInt, pn.rep.s));

  // Ouvrages de tête (deux extrémités).
  const t = inp.tetes;
  const hw = heads.headWall;
  add("Murs de tête", "Face côté remblai — barres en attente dans la dalle", hw.bars, "L", [hw.H - c, anchor(hw.bars.phi)], 2 * nAcross(B - 2 * c, hw.bars.s));
  add("Murs de tête", "Face vue — barres verticales", { phi: 10, s: 0.2 }, "L", [hw.H - c, anchor(10)], 2 * nAcross(B - 2 * c, 0.2));
  add("Murs de tête", "Répartition horizontale deux faces", hw.rep, "droite", [B - 2 * c], 2 * 2 * nAcross(hw.H - c, hw.rep.s));
  const tanA = Math.tan((t.angle * Math.PI) / 180);
  const Wrt = t.murs ? B + t.radierLong * tanA : B;
  if (heads.wing) {
    const w = heads.wing;
    const Havg = (w.Htot + w.Hend) / 2;
    add("Murs en aile", "Voile — face côté remblai, barres verticales", w.bars, "L", [Havg - c, anchor(w.bars.phi)], 4 * nAcross(t.long - 2 * c, w.bars.s));
    add("Murs en aile", "Voile — face vue, barres verticales", { phi: 10, s: 0.2 }, "L", [Havg - c, anchor(10)], 4 * nAcross(t.long - 2 * c, 0.2));
    add("Murs en aile", "Voile — répartition horizontale deux faces", w.rep, "droite", [t.long - 2 * c], 4 * 2 * nAcross(Havg, w.rep.s));
    add("Murs en aile", "Semelle — barres transversales deux nappes", w.footBars, "droite", [t.semelle - 2 * c], 4 * 2 * nAcross(t.long - 2 * c, w.footBars.s));
    add("Murs en aile", "Semelle — barres longitudinales deux nappes", { phi: 10, s: 0.2 }, "droite", [t.long - 2 * c], 4 * 2 * nAcross(t.semelle - 2 * c, 0.2));
  }
  if (t.radierLong > 0) {
    add("Radiers de tête", "Barres transversales deux nappes", { phi: 10, s: 0.2 }, "droite", [Wrt - 2 * c], 2 * 2 * nAcross(t.radierLong - 2 * c, 0.2));
    add("Radiers de tête", "Barres longitudinales deux nappes", { phi: 10, s: 0.2 }, "droite", [t.radierLong - 2 * c], 2 * 2 * nAcross(Wrt - 2 * c, 0.2));
  }
  if (t.becheProf > 0) {
    add("Bêches", "Cadres verticaux", { phi: 10, s: 0.2 }, "U", [t.becheProf + inp.er - c, t.becheEp - 2 * c, t.becheProf + inp.er - c], 2 * nAcross(Wrt - 2 * c, 0.2));
    add("Bêches", "Filants horizontaux", { phi: 10, s: 0.2 }, "droite", [Wrt - 2 * c], 2 * 2 * nAcross(t.becheProf, 0.2));
  }

  const steelMass = bars.reduce((s, b) => s + b.mass, 0);

  // ── Volumes, surfaces ──
  const cells = inp.openings.reduce((s, o) => s + o * inp.hInt, 0);
  const vBody = (B * Hout - cells + 4 * n * (inp.gousset ** 2 / 2)) * L;
  const vHead = 2 * B * hw.H * t.murTeteEp + (t.guideRoues ? 2 * B * 0.25 * 0.25 : 0);
  const Havg = heads.wing ? (heads.wing.Htot + heads.wing.Hend) / 2 : 0;
  const vWing = heads.wing ? 4 * t.long * (Havg * t.ep + t.semelle * t.semEp) : 0;
  const vRad = 2 * Wrt * t.radierLong * inp.er;
  const vBeche = 2 * Wrt * t.becheProf * t.becheEp;
  const concrete = vBody + vHead + vWing + vRad + vBeche;
  const proprete = 0.05 * ((B + 0.2) * (L + 0.2) + 2 * Wrt * t.radierLong + (heads.wing ? 4 * t.long * (t.semelle + 0.2) : 0));
  const coffrage =
    inp.openings.reduce((s, o) => s + 2 * (o + inp.hInt), 0) * L + 2 * Hout * L + 2 * (B * Hout - cells)
    + 2 * 2 * B * hw.H
    + (heads.wing ? 4 * (2 * t.long * Havg + 2 * (t.long + t.semelle) * t.semEp) : 0)
    + 2 * 2 * Wrt * t.becheProf;
  const deblai = (B + 2) * (L + 2 * t.radierLong + 2) * (inp.Df + 0.05 + 0.3);
  const remblai = Math.max(0, (B + 4) * (Hout + inp.hr) * L - B * Hout * L);
  const etanch = (B + 2 * Hout) * L;

  const lines: QuantityLine[] = [
    { lot: "Terrassements", designation: "Déblai en terrain de toute nature pour fouille de l'ouvrage", unit: "m³", quantity: deblai },
    { lot: "Terrassements", designation: "Remblai latéritique sélectionné compacté à 95 % OPM autour et au-dessus de l'ouvrage", unit: "m³", quantity: remblai },
    { lot: "Béton", designation: "Béton de propreté dosé à 150 kg/m³ (ép. 5 cm)", unit: "m³", quantity: proprete },
    { lot: "Béton", designation: `Béton armé B${inp.fc28} pour corps du dalot (radier, piédroits, dalle)`, unit: "m³", quantity: vBody },
    { lot: "Béton", designation: `Béton armé B${inp.fc28} pour murs de tête et guide-roues`, unit: "m³", quantity: vHead },
    ...(heads.wing ? [{ lot: "Béton", designation: `Béton armé B${inp.fc28} pour murs en aile et semelles`, unit: "m³", quantity: vWing }] : []),
    { lot: "Béton", designation: `Béton armé B${inp.fc28} pour radiers de tête et bêches parafouilles`, unit: "m³", quantity: vRad + vBeche },
    { lot: "Aciers", designation: `Aciers HA FeE${inp.fe} façonnés et posés (nomenclature)`, unit: "kg", quantity: steelMass },
    { lot: "Coffrages", designation: "Coffrage ordinaire pour parements cachés et vus", unit: "m²", quantity: coffrage },
    { lot: "Finitions", designation: "Badigeon bitumineux (2 couches) sur parements enterrés", unit: "m²", quantity: etanch },
  ];
  return { bars, lines, steelMass, concrete, ratio: steelMass / concrete };
}

export function barsToCsv(bars: BarMark[]) {
  const head = ["Repère", "Élément", "Désignation", "Ø (mm)", "Espacement (cm)", "Forme", "Cotes (m)", "Longueur unitaire (m)", "Nombre", "Longueur totale (m)", "Masse (kg)"];
  const f = (x: number, d = 2) => x.toFixed(d).replace(".", ",");
  const rows = bars.map((b) => [
    b.rep, b.element, b.designation, b.phi, f(b.s * 100, 1), b.shape, b.dims.map((x) => f(x)).join(" + "),
    f(b.length), b.count, f(b.totalLength), f(b.mass, 1),
  ].map((x) => `"${String(x).replace(/"/g, '""')}"`).join(";"));
  const total = bars.reduce((s, b) => s + b.mass, 0);
  return "﻿" + [head.join(";"), ...rows, `;;;;;;;;;Total;${f(total, 1)}`].join("\r\n");
}
