/**
 * Plans d'exécution : chaque planche est une liste de primitives (lignes, polylignes, cercles,
 * textes) en vraie grandeur (m), encadrée d'un cadre A3 à l'échelle. Les mêmes primitives
 * alimentent l'export DXF et l'aperçu SVG.
 */

import type { GroupDesign, GroupId } from "./design";
import type { Study } from "./engine";

export type Pt = [number, number];
export type Layer = "CADRE" | "COFFRAGE" | "AXES" | "COTATION" | "ACIERS" | "REPARTITION" | "TEXTE" | "TERRAIN";

export type Prim =
  | { t: "line"; a: Pt; b: Pt; layer: Layer }
  | { t: "poly"; pts: Pt[]; closed?: boolean; layer: Layer }
  | { t: "circle"; c: Pt; r: number; layer: Layer }
  | { t: "text"; p: Pt; h: number; s: string; layer: Layer; align?: "left" | "center" | "right"; rot?: number };

export type Sheet = { id: string; title: string; scale: number; origin: Pt; width: number; height: number; prims: Prim[] };

export const LAYER_COLORS: Record<Layer, { aci: number; css: string }> = {
  CADRE: { aci: 7, css: "#0f172a" },
  COFFRAGE: { aci: 7, css: "#0f172a" },
  AXES: { aci: 8, css: "#94a3b8" },
  COTATION: { aci: 3, css: "#15803d" },
  ACIERS: { aci: 1, css: "#dc2626" },
  REPARTITION: { aci: 5, css: "#2563eb" },
  TEXTE: { aci: 7, css: "#0f172a" },
  TERRAIN: { aci: 32, css: "#a16207" },
};

const A3: Pt = [0.42, 0.297];
const fmt = (x: number, d = 2) => x.toFixed(d).replace(".", ",");

class Pen {
  prims: Prim[] = [];
  constructor(public ox: number, public oy: number, public scale: number) {}
  /** Hauteur de texte en mm papier → mètres modèle. */
  th(mm: number) { return (mm / 1000) * this.scale; }
  P(x: number, y: number): Pt { return [this.ox + x, this.oy + y]; }
  line(a: Pt, b: Pt, layer: Layer) { this.prims.push({ t: "line", a: this.P(...a), b: this.P(...b), layer }); }
  poly(pts: Pt[], layer: Layer, closed = false) { this.prims.push({ t: "poly", pts: pts.map((p) => this.P(...p)), closed, layer }); }
  rect(x: number, y: number, w: number, h: number, layer: Layer) { this.poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], layer, true); }
  circle(c: Pt, r: number, layer: Layer) { this.prims.push({ t: "circle", c: this.P(...c), r, layer }); }
  text(p: Pt, mm: number, s: string, layer: Layer = "TEXTE", align: "left" | "center" | "right" = "left", rot = 0) {
    this.prims.push({ t: "text", p: this.P(...p), h: this.th(mm), s, layer, align, rot });
  }
  /** Cote linéaire horizontale (y = niveau de la ligne de cote). */
  dimH(x0: number, x1: number, yRef: number, y: number, label?: string) {
    const tick = this.th(1.2);
    this.line([x0, yRef], [x0, y + (y > yRef ? tick : -tick)], "COTATION");
    this.line([x1, yRef], [x1, y + (y > yRef ? tick : -tick)], "COTATION");
    this.line([x0, y], [x1, y], "COTATION");
    for (const x of [x0, x1]) this.line([x - tick / 2, y - tick / 2], [x + tick / 2, y + tick / 2], "COTATION");
    this.text([(x0 + x1) / 2, y + this.th(0.8)], 2, label ?? fmt(x1 - x0), "COTATION", "center");
  }
  dimV(y0: number, y1: number, xRef: number, x: number, label?: string) {
    const tick = this.th(1.2);
    this.line([xRef, y0], [x + (x > xRef ? tick : -tick), y0], "COTATION");
    this.line([xRef, y1], [x + (x > xRef ? tick : -tick), y1], "COTATION");
    this.line([x, y0], [x, y1], "COTATION");
    for (const y of [y0, y1]) this.line([x - tick / 2, y - tick / 2], [x + tick / 2, y + tick / 2], "COTATION");
    this.text([x - this.th(0.8), (y0 + y1) / 2], 2, label ?? fmt(y1 - y0), "COTATION", "center", 90);
  }
}

function frame(pen: Pen, study: Study, title: string, num: number, total: number) {
  const W = A3[0] * pen.scale, H = A3[1] * pen.scale;
  const m = pen.th(10), mr = pen.th(5);
  pen.rect(0, 0, W, H, "CADRE");
  pen.rect(m, mr, W - m - mr, H - 2 * mr, "CADRE");
  // Cartouche (180 × 40 mm) en bas à droite.
  const cw = pen.th(180), ch = pen.th(42);
  const x0 = W - mr - cw, y0 = mr;
  pen.rect(x0, y0, cw, ch, "CADRE");
  const id = study.input.ident;
  const rows: [string, string][] = [
    ["Projet", id.projet],
    ["Ouvrage", `${id.ouvrage} — ${id.localisation}`],
    ["Maître d'ouvrage", `${id.maitreOuvrage} / ${id.maitreOeuvre}`],
    ["Planche", title],
    ["Échelle", `1/${pen.scale}`],
    ["Auteur", id.auteur],
  ];
  const rh = ch / (rows.length + 1);
  rows.forEach(([k, v], i) => {
    const y = y0 + ch - (i + 1) * rh;
    pen.line([x0, y], [x0 + cw, y], "CADRE");
    pen.text([x0 + pen.th(2), y + rh * 0.3], 2, k);
    pen.text([x0 + pen.th(36), y + rh * 0.3], i === 3 ? 2.6 : 2.2, v);
  });
  pen.line([x0 + pen.th(34), y0 + rh], [x0 + pen.th(34), y0 + ch], "CADRE");
  const today = new Date().toLocaleDateString("fr-FR");
  pen.text([x0 + pen.th(2), y0 + rh * 0.3], 2,
    `Planche ${num}/${total}  —  Indice ${id.indice || "A"}  —  ${today}  —  Dossier ${id.dossier}  —  Empreinte ${study.fingerprint}  —  DalotPro`);
}

function geometry(study: Study) {
  const inp = study.input;
  const n = inp.openings.length;
  const B = study.analysis.model.xRight - study.analysis.model.xLeft;
  const Hout = inp.er + inp.hInt + inp.es;
  const cells: { x0: number; x1: number }[] = [];
  let x = inp.eExt;
  for (let k = 0; k < n; k++) {
    cells.push({ x0: x, x1: x + inp.openings[k] });
    x += inp.openings[k] + (k < n - 1 ? inp.eInt : 0);
  }
  return { B, Hout, cells, n };
}

function cellOutline(x0: number, x1: number, yb: number, yt: number, g: number): Pt[] {
  if (g <= 0) return [[x0, yb], [x1, yb], [x1, yt], [x0, yt]];
  return [[x0 + g, yb], [x1 - g, yb], [x1, yb + g], [x1, yt - g], [x1 - g, yt], [x0 + g, yt], [x0, yt - g], [x0, yb + g]];
}

/** Planche 1 : coffrage, coupe transversale cotée. */
function sheetCoffrage(study: Study, origin: Pt, num: number, total: number): Sheet {
  const scale = 20;
  const pen = new Pen(origin[0], origin[1], scale);
  frame(pen, study, "Coffrage — coupe transversale", num, total);
  const inp = study.input;
  const { B, Hout, cells } = geometry(study);
  const W = A3[0] * scale, H = A3[1] * scale;
  const fillH = Math.min(inp.hr + inp.ech, 1.6);
  const ox = Math.max(pen.th(30), (W - B) / 2 - pen.th(45)), oy = pen.th(100);
  const p = new Pen(origin[0] + ox, origin[1] + oy, scale);
  p.rect(0, 0, B, Hout, "COFFRAGE");
  for (const c of cells) p.poly(cellOutline(c.x0, c.x1, inp.er, inp.er + inp.hInt, inp.gousset), "COFFRAGE", true);
  // Remblai, chaussée, béton de propreté.
  p.line([-0.6, Hout + fillH], [B + 0.6, Hout + fillH], "TERRAIN");
  p.text([B + 0.65, Hout + fillH], 2.2, inp.ech > 0 ? `Chaussée ép. ${fmt(inp.ech)}` : "Terrain fini");
  p.text([0.1, Hout + fillH / 2], 2.2, `Remblai latéritique compacté, h = ${fmt(inp.hr)} m${inp.hr + inp.ech > 1.6 ? " (coupé)" : ""}`);
  p.rect(-0.1, -0.05, B + 0.2, 0.05, "TERRAIN");
  p.text([B + 0.15, -0.06], 2, "Béton de propreté ép. 5 cm");
  // Axes des cellules
  for (const c of cells) {
    const xm = (c.x0 + c.x1) / 2;
    p.line([xm, -0.4], [xm, Hout + 0.3], "AXES");
    p.text([xm, inp.er + inp.hInt / 2], 2.5, `${fmt(c.x1 - c.x0)} × ${fmt(inp.hInt)}`, "TEXTE", "center");
  }
  // Cotes horizontales
  const xsDim: number[] = [0];
  cells.forEach((c) => xsDim.push(c.x0, c.x1));
  xsDim.push(B);
  for (let k = 0; k < xsDim.length - 1; k++) p.dimH(xsDim[k], xsDim[k + 1], 0, -0.35);
  p.dimH(0, B, 0, -0.65, `${fmt(B)} (largeur extérieure)`);
  // Cotes verticales
  p.dimV(0, inp.er, B, B + 0.35);
  p.dimV(inp.er, inp.er + inp.hInt, B, B + 0.35);
  p.dimV(inp.er + inp.hInt, Hout, B, B + 0.35);
  p.dimV(0, Hout, B, B + 0.7, `${fmt(Hout)} (hauteur extérieure)`);
  if (inp.gousset > 0) p.text([cells[0].x0 + inp.gousset + 0.05, inp.er + inp.hInt - inp.gousset - 0.1], 2, `Goussets ${fmt(inp.gousset * 100, 0)} × ${fmt(inp.gousset * 100, 0)} cm`);
  // Notes
  const nx = pen.th(15), ny = H - pen.th(15);
  const notes = [
    "NOTES",
    `Béton B${inp.fc28} (fc28 = ${inp.fc28} MPa), CPJ 42,5 — cure humide 7 jours minimum (climat tropical).`,
    `Aciers HA FeE${inp.fe}, enrobage ${fmt(inp.cover * 100, 0)} cm. Longueur de l'ouvrage entre têtes : ${fmt(inp.L)} m.`,
    "Remblai latéritique sélectionné (CBR ≥ 30) compacté à 95 % de l'OPM par couches de 20 cm, symétriquement des deux côtés.",
    "Parements enterrés badigeonnés de deux couches de produit bitumineux.",
    "Cotes en mètres.",
  ];
  notes.forEach((s, i) => pen.text([nx, ny - i * pen.th(5)], i === 0 ? 3 : 2.2, s));
  return { id: "coffrage", title: "Coffrage — coupe transversale", scale, origin, width: W, height: H, prims: [...pen.prims, ...p.prims] };
}

export type BarDraw = { group: GroupId; pts: Pt[]; label: string; anchor: Pt; dir: Pt };

export function bodyBars(study: Study, rep: Map<GroupId, number>): BarDraw[] {
  const inp = study.input;
  const c = inp.cover;
  const { B, Hout, cells } = geometry(study);
  const gd = (id: GroupId) => study.design.groups.find((g) => g.id === id);
  const ls = study.design.mat.ls;
  const name = (g: GroupDesign) => `R${rep.get(g.id) ?? "?"} HA${g.bars.phi} e=${fmt(g.bars.s * 100, 1)}`;
  const out: BarDraw[] = [];
  const de = gd("dalle_ext"), di = gd("dalle_int"), re = gd("radier_ext"), ri = gd("radier_int");
  const pe = gd("pext_ext"), pi = gd("pext_int"), pn = gd("pint");
  if (de) {
    const leg = Math.min((ls * de.bars.phi) / 1000, Hout - 2 * c);
    out.push({ group: "dalle_ext", pts: [[c, Hout - c - leg], [c, Hout - c], [B - c, Hout - c], [B - c, Hout - c - leg]], label: name(de), anchor: [B * 0.3, Hout - c], dir: [0, 1] });
  }
  const mid0 = (cells[0].x0 + cells[0].x1) / 2;
  if (di) out.push({ group: "dalle_int", pts: [[c, Hout - inp.es + c], [B - c, Hout - inp.es + c]], label: name(di), anchor: [mid0 + 0.2, Hout - inp.es + c], dir: [0, -1] });
  if (re) {
    const leg = Math.min((ls * re.bars.phi) / 1000, Hout - 2 * c);
    out.push({ group: "radier_ext", pts: [[c, c + leg], [c, c], [B - c, c], [B - c, c + leg]], label: name(re), anchor: [B * 0.3, c], dir: [0, -1] });
  }
  if (ri) out.push({ group: "radier_int", pts: [[c, inp.er - c], [B - c, inp.er - c]], label: name(ri), anchor: [mid0 + 0.2, inp.er - c], dir: [0, 1] });
  const off = 0.012;
  if (pe) {
    out.push({ group: "pext_ext", pts: [[c + off, c + off], [c + off, Hout - c - off]], label: name(pe), anchor: [c + off, Hout * 0.55], dir: [-1, 0] });
    out.push({ group: "pext_ext", pts: [[B - c - off, c + off], [B - c - off, Hout - c - off]], label: "", anchor: [0, 0], dir: [0, 0] });
  }
  if (pi) {
    out.push({ group: "pext_int", pts: [[inp.eExt - c, c + off], [inp.eExt - c, Hout - c - off]], label: name(pi), anchor: [inp.eExt - c, Hout * 0.5], dir: [1, 0] });
    out.push({ group: "pext_int", pts: [[B - inp.eExt + c, c + off], [B - inp.eExt + c, Hout - c - off]], label: "", anchor: [0, 0], dir: [0, 0] });
  }
  if (pn) {
    for (let k = 0; k < cells.length - 1; k++) {
      const xl = cells[k].x1, xr = cells[k + 1].x0;
      out.push({ group: "pint", pts: [[xl + c, c + off], [xl + c, Hout - c - off]], label: k === 0 ? name(pn) : "", anchor: [xl + c, Hout * 0.5], dir: [1, 0] });
      out.push({ group: "pint", pts: [[xr - c, c + off], [xr - c, Hout - c - off]], label: "", anchor: [0, 0], dir: [0, 0] });
    }
  }
  return out;
}

/** Planche 2 : ferraillage de la section courante. */
function sheetFerraillage(study: Study, origin: Pt, num: number, total: number): Sheet {
  const scale = 20;
  const pen = new Pen(origin[0], origin[1], scale);
  frame(pen, study, "Ferraillage — section courante", num, total);
  const inp = study.input;
  const { B, Hout, cells } = geometry(study);
  const W = A3[0] * scale, H = A3[1] * scale;
  const p = new Pen(origin[0] + Math.max(pen.th(40), (W - B) / 2 - pen.th(30)), origin[1] + pen.th(80), scale);
  p.rect(0, 0, B, Hout, "COFFRAGE");
  for (const c of cells) p.poly(cellOutline(c.x0, c.x1, inp.er, inp.er + inp.hInt, inp.gousset), "COFFRAGE", true);
  const rep = repMap(study);
  for (const bar of bodyBars(study, rep)) {
    p.poly(bar.pts, "ACIERS");
    if (bar.label) {
      const [ax, ay] = bar.anchor;
      const L = 0.45;
      const tx = ax + bar.dir[0] * L + (bar.dir[0] === 0 ? 0.25 : 0);
      const ty = ay + bar.dir[1] * L + (bar.dir[1] === 0 ? 0.15 : 0);
      p.line([ax, ay], [tx, ty], "COTATION");
      p.text([tx + (bar.dir[0] < 0 ? -0.02 : 0.02), ty + 0.02], 2.4, bar.label, "ACIERS", bar.dir[0] < 0 ? "right" : "left");
    }
  }
  // Répartitions (points), une sur deux pour la lisibilité.
  const c = inp.cover;
  const dots = (x0: number, x1: number, y: number, s: number, dy: number) => {
    for (let x = x0; x <= x1 + 1e-9; x += s * 2) p.circle([x, y + dy], 0.008, "REPARTITION");
  };
  const gd = (id: GroupId) => study.design.groups.find((g) => g.id === id);
  const dEx = gd("dalle_ext"), dIn = gd("dalle_int"), rEx = gd("radier_ext"), rIn = gd("radier_int");
  if (dEx) dots(c + 0.05, B - c - 0.05, Hout - c, dEx.rep.s, -0.02);
  if (dIn) dots(c + 0.05, B - c - 0.05, Hout - inp.es + c, dIn.rep.s, 0.02);
  if (rEx) dots(c + 0.05, B - c - 0.05, c, rEx.rep.s, 0.02);
  if (rIn) dots(c + 0.05, B - c - 0.05, inp.er - c, rIn.rep.s, -0.02);
  if (inp.gousset > 0) {
    for (const cl of cells) {
      const yb = inp.er, yt = inp.er + inp.hInt, g = inp.gousset + 0.05;
      p.line([cl.x0 + 0.02, yt - g], [cl.x0 + g, yt - 0.02], "ACIERS");
      p.line([cl.x1 - 0.02, yt - g], [cl.x1 - g, yt - 0.02], "ACIERS");
      p.line([cl.x0 + 0.02, yb + g], [cl.x0 + g, yb + 0.02], "ACIERS");
      p.line([cl.x1 - 0.02, yb + g], [cl.x1 - g, yb + 0.02], "ACIERS");
    }
  }
  // Légende des nappes.
  const lx = pen.th(15);
  let ly = H - pen.th(15);
  pen.text([lx, ly], 3, "FERRAILLAGE DU CORPS — par mètre linéaire d'ouvrage");
  ly -= pen.th(6);
  for (const g of study.design.groups) {
    pen.text([lx, ly], 2.2, `R${rep.get(g.id)} : ${g.label} — HA${g.bars.phi} e = ${fmt(g.bars.s * 100, 1)} cm (${fmt(g.bars.As * 1e4)} cm²/m)  |  répartition HA${g.rep.phi} e = ${fmt(g.rep.s * 100, 1)} cm${g.imposed ? "  [imposé]" : ""}`);
    ly -= pen.th(4.5);
  }
  pen.text([lx, ly - pen.th(2)], 2.2, `Enrobage ${fmt(c * 100, 0)} cm. Recouvrements et ancrages droits : ls = ${study.design.mat.ls} Ø (BAEL A.6.1,23).`);
  return { id: "ferraillage", title: "Ferraillage — section courante", scale, origin, width: W, height: H, prims: [...pen.prims, ...p.prims] };
}

/** Planche 3 : vue en plan (corps, têtes, murs en aile). */
function sheetPlan(study: Study, origin: Pt, num: number, total: number): Sheet {
  const inp = study.input;
  const { B } = geometry(study);
  const t = inp.tetes;
  const extent = inp.L + 2 * (t.radierLong + (t.murs ? t.long : 0)) + 2;
  const scale = [50, 75, 100, 150, 200].find((s) => extent < A3[0] * s * 0.7) ?? 250;
  const pen = new Pen(origin[0], origin[1], scale);
  frame(pen, study, "Vue en plan — coffrage général", num, total);
  const W = A3[0] * scale, H = A3[1] * scale;
  // Axe de l'ouvrage horizontal sur la planche : x = long de l'ouvrage, y = largeur B.
  const cx = W / 2 - pen.th(20), cy = H / 2 + pen.th(15);
  const p = new Pen(origin[0] + cx - inp.L / 2, origin[1] + cy - B / 2, scale);
  p.rect(0, 0, inp.L, B, "COFFRAGE");
  const { cells } = geometry(study);
  for (const cl of cells) {
    p.line([0, cl.x0], [inp.L, cl.x0], "AXES");
    p.line([0, cl.x1], [inp.L, cl.x1], "AXES");
  }
  p.line([-2, B / 2], [inp.L + 2, B / 2], "AXES");
  p.text([inp.L + 2.1, B / 2], 2.5, "Axe hydraulique");
  const a = (t.angle * Math.PI) / 180;
  for (const side of [0, 1] as const) {
    const x = side === 0 ? 0 : inp.L;
    const s = side === 0 ? -1 : 1;
    p.rect(x + (side === 0 ? -t.murTeteEp : 0), 0, t.murTeteEp, B, "COFFRAGE");
    if (t.radierLong > 0) {
      const w = t.radierLong * Math.tan(a);
      p.poly([[x, 0], [x + s * t.radierLong, -w], [x + s * t.radierLong, B + w], [x, B]], "COFFRAGE", true);
      p.line([x + s * (t.radierLong - t.becheEp), -w], [x + s * (t.radierLong - t.becheEp), B + w], "COFFRAGE");
    }
    if (t.murs) {
      for (const edge of [0, B]) {
        const sy = edge === 0 ? -1 : 1;
        const dx = s * Math.cos(a), dy = sy * Math.sin(a);
        const ex = x + t.long * dx, ey = edge + t.long * dy;
        // Normale au voile, orientée vers l'extérieur de l'ouvrage.
        let nx = -dy, ny = dx;
        if (Math.sign(ny || nx) !== sy && Math.abs(ny) > 1e-9) { nx = -nx; ny = -ny; }
        p.line([x, edge], [ex, ey], "COFFRAGE");
        p.line([x + nx * t.ep, edge + ny * t.ep], [ex + nx * t.ep, ey + ny * t.ep], "COFFRAGE");
        p.line([ex, ey], [ex + nx * t.ep, ey + ny * t.ep], "COFFRAGE");
      }
    }
  }
  p.dimH(0, inp.L, 0, -1.2, `${fmt(inp.L)} (longueur entre têtes)`);
  p.dimV(0, B, 0, -(t.murs ? t.long * Math.cos((t.angle * Math.PI) / 180) : 0) - t.radierLong - 0.6, fmt(B));
  p.text([inp.L / 2, B + 1.2], 3, "SENS DE L'ÉCOULEMENT  →", "TEXTE", "center");
  pen.text([pen.th(15), H - pen.th(15)], 3, "VUE EN PLAN");
  pen.text([pen.th(15), H - pen.th(21)], 2.2, t.murs
    ? `Murs en aile à ${fmt(t.angle, 0)}° de longueur ${fmt(t.long)} m, ép. ${fmt(t.ep)} m ; radiers de tête ${fmt(t.radierLong)} m ; bêches ${fmt(t.becheProf)} m.`
    : `Radiers de tête ${fmt(t.radierLong)} m ; bêches ${fmt(t.becheProf)} m.`);
  return { id: "plan", title: "Vue en plan — coffrage général", scale, origin, width: W, height: H, prims: [...pen.prims, ...p.prims] };
}

/** Planche 4 : ouvrages de tête (coupe du mur en aile et du mur de tête). */
function sheetTetes(study: Study, origin: Pt, num: number, total: number): Sheet {
  const scale = 25;
  const pen = new Pen(origin[0], origin[1], scale);
  frame(pen, study, "Ouvrages de tête — coupes", num, total);
  const W = A3[0] * scale, H = A3[1] * scale;
  const inp = study.input;
  const t = inp.tetes;
  const c = inp.cover;
  const w = study.heads.wing;
  const extra: Prim[] = [];
  if (w) {
    const p = new Pen(origin[0] + pen.th(40), origin[1] + pen.th(70), scale);
    const Hs = w.Htot;
    // Semelle, voile, bêche (coupe perpendiculaire au mur).
    p.rect(0, 0, t.semelle, t.semEp, "COFFRAGE");
    p.rect(t.patin, t.semEp, t.ep, Hs, "COFFRAGE");
    if (t.beche > 0) p.rect(t.patin, -t.beche, t.ep, t.beche, "COFFRAGE");
    p.line([t.patin + t.ep, t.semEp + Hs], [t.semelle + 1, t.semEp + Hs], "TERRAIN");
    p.text([t.semelle + 0.1, t.semEp + Hs + 0.1], 2.2, "Remblai");
    p.line([-0.6, t.semEp], [t.patin, t.semEp], "TERRAIN");
    // Aciers du voile (face côté remblai) et de la semelle.
    const xr = t.patin + t.ep - c;
    p.poly([[xr, t.semEp + Hs - c], [xr, c], [t.semelle - c, c]], "ACIERS");
    p.poly([[t.patin + c, t.semEp + Hs - c], [t.patin + c, c + 0.02], [c, c + 0.02]], "ACIERS");
    p.line([c, t.semEp - c], [t.semelle - c, t.semEp - c], "ACIERS");
    p.text([xr + 0.6, t.semEp + Hs * 0.6], 2.4, `HA${w.bars.phi} e=${fmt(w.bars.s * 100, 1)} (côté remblai)`, "ACIERS");
    p.line([xr, t.semEp + Hs * 0.6], [xr + 0.58, t.semEp + Hs * 0.6], "COTATION");
    p.text([-0.1, t.semEp + Hs * 0.4], 2.4, "HA10 e=20 (face vue)", "ACIERS", "right");
    p.text([t.semelle / 2, -0.35 - t.beche], 2.4, `Semelle : HA${w.footBars.phi} e=${fmt(w.footBars.s * 100, 1)} deux nappes`, "ACIERS", "center");
    p.dimH(0, t.semelle, 0, -0.6 - t.beche);
    p.dimV(0, t.semEp, 0, -0.5);
    p.dimV(t.semEp, t.semEp + Hs, 0, -0.5);
    p.text([t.semelle / 2, t.semEp + Hs + 0.5], 3, "COUPE DU MUR EN AILE (à l'enracinement)", "TEXTE", "center");
    extra.push(...p.prims);
  }
  {
    const hw = study.heads.headWall;
    const p = new Pen(origin[0] + W * 0.55, origin[1] + pen.th(110), scale);
    p.rect(0, 0, 1.2, inp.es, "COFFRAGE");
    p.rect(1.2 - t.murTeteEp, inp.es, t.murTeteEp, hw.H, "COFFRAGE");
    p.line([-0.6, inp.es + inp.hr + inp.ech], [1.2 - t.murTeteEp, inp.es + inp.hr + inp.ech], "TERRAIN");
    p.text([-0.6, inp.es + inp.hr + inp.ech + 0.08], 2.2, "Chaussée");
    const xb = 1.2 - t.murTeteEp + c;
    p.poly([[xb, inp.es + hw.H - c], [xb, c + 0.02], [xb - 0.5, c + 0.02]], "ACIERS");
    p.text([xb - 0.6, inp.es + hw.H * 0.6], 2.4, `HA${hw.bars.phi} e=${fmt(hw.bars.s * 100, 1)}`, "ACIERS", "right");
    p.dimV(inp.es, inp.es + hw.H, 1.2, 1.6);
    p.dimH(1.2 - t.murTeteEp, 1.2, inp.es + hw.H, inp.es + hw.H + 0.3);
    p.text([0.6, inp.es + hw.H + 0.7], 3, "COUPE DU MUR DE TÊTE", "TEXTE", "center");
    extra.push(...p.prims);
  }
  pen.text([pen.th(15), H - pen.th(15)], 3, "OUVRAGES DE TÊTE");
  pen.text([pen.th(15), H - pen.th(21)], 2.2, "Radiers de tête et bêches : HA10 e = 20 cm en deux nappes, cadres HA10 e = 20 cm dans les bêches.");
  return { id: "tetes", title: "Ouvrages de tête — coupes", scale, origin, width: W, height: H, prims: [...pen.prims, ...extra] };
}

/** Planche 5 : nomenclature des aciers. */
function sheetNomenclature(study: Study, origin: Pt, num: number, total: number): Sheet {
  const scale = 20;
  const pen = new Pen(origin[0], origin[1], scale);
  frame(pen, study, "Nomenclature des aciers", num, total);
  const W = A3[0] * scale, H = A3[1] * scale;
  const cols = [12, 34, 92, 12, 18, 46, 22, 16, 26, 22];
  const head = ["Rep.", "Élément", "Désignation", "Ø", "Esp.", "Forme / cotes (m)", "L unit.", "Nb", "L tot. (m)", "kg"];
  const x0 = pen.th(15);
  let y = H - pen.th(18);
  const rowH = pen.th(4.4);
  const tableW = cols.reduce((s, v) => s + pen.th(v), 0);
  pen.text([x0, y + pen.th(3)], 3, "NOMENCLATURE DES ACIERS — ensemble de l'ouvrage");
  const drawRow = (cells: string[], bold = false) => {
    let x = x0;
    pen.line([x0, y - rowH], [x0 + tableW, y - rowH], "CADRE");
    cells.forEach((s, i) => {
      pen.text([x + pen.th(1), y - rowH + pen.th(1.3)], bold ? 2.2 : 1.9, s);
      x += pen.th(cols[i]);
    });
    y -= rowH;
  };
  pen.line([x0, y], [x0 + tableW, y], "CADRE");
  drawRow(head, true);
  const maxRows = Math.floor((y - pen.th(60)) / rowH);
  const bars = study.quantities.bars;
  bars.slice(0, maxRows).forEach((b) => drawRow([
    String(b.rep), b.element, b.designation.slice(0, 58), String(b.phi), fmt(b.s * 100, 1),
    `${b.shape} ${b.dims.map((d) => fmt(d)).join("+")}`, fmt(b.length), String(b.count), fmt(b.totalLength, 1), fmt(b.mass, 1),
  ]));
  drawRow(["", "", "TOTAL", "", "", "", "", "", "", fmt(study.quantities.steelMass, 0)], true);
  let x = x0;
  const yTop = H - pen.th(18);
  for (const cw of [0, ...cols]) {
    x += pen.th(cw);
    pen.line([x, yTop], [x, y], "CADRE");
  }
  if (bars.length > maxRows) pen.text([x0, y - pen.th(5)], 2, `… ${bars.length - maxRows} repères supplémentaires dans le fichier CSV.`);
  pen.text([x0, y - pen.th(10)], 2.2,
    `Béton : ${fmt(study.quantities.concrete)} m³ — Acier : ${fmt(study.quantities.steelMass, 0)} kg — Ratio : ${fmt(study.quantities.ratio, 0)} kg/m³ (masse linéique 0,00617·Ø² kg/m).`);
  return { id: "nomenclature", title: "Nomenclature des aciers", scale, origin, width: W, height: H, prims: pen.prims };
}

export function repMap(study: Study) {
  // Repère de chaque groupe : celui de sa barre principale dans la nomenclature.
  const map = new Map<GroupId, number>();
  const order: [GroupId, string][] = [
    ["dalle_ext", "Nappe supérieure — cadre"], ["dalle_int", "Nappe inférieure — barres"],
    ["radier_ext", "Nappe inférieure — cadre"], ["radier_int", "Nappe supérieure — barres"],
    ["pext_ext", "Face extérieure — barres"], ["pext_int", "Face intérieure — barres"], ["pint", "Deux faces — barres"],
  ];
  for (const [g, prefix] of order) {
    const b = study.quantities.bars.find((x) => x.designation.startsWith(prefix));
    if (b) map.set(g, b.rep);
  }
  return map;
}

export function buildSheets(study: Study): Sheet[] {
  const makers = [sheetCoffrage, sheetFerraillage, sheetPlan, sheetTetes, sheetNomenclature];
  const out: Sheet[] = [];
  let x = 0;
  makers.forEach((mk, i) => {
    const s = mk(study, [x, 0], i + 1, makers.length);
    out.push(s);
    x += s.width + 2;
  });
  return out;
}
