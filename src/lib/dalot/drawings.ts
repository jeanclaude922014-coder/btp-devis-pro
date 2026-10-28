/**
 * Primitives de dessin communes aux plans (DXF et aperçu SVG) et à la vue 3D : calques,
 * crayon à l'échelle, géométrie de la section et tracé des armatures du corps.
 * Les planches elles-mêmes sont dans plans.ts.
 */

import type { GroupId } from "./design";
import type { Study } from "./engine";

export type Pt = [number, number];
export type Layer = "CADRE" | "COFFRAGE" | "AXES" | "COTATION" | "ACIERS" | "REPARTITION" | "TEXTE" | "TERRAIN" | "HACHURES";

export type Prim =
  | { t: "line"; a: Pt; b: Pt; layer: Layer }
  | { t: "poly"; pts: Pt[]; closed?: boolean; layer: Layer; fill?: boolean }
  | { t: "circle"; c: Pt; r: number; layer: Layer; hollow?: boolean }
  | { t: "text"; p: Pt; h: number; s: string; layer: Layer; align?: "left" | "center" | "right"; rot?: number; bold?: boolean };

export type Sheet = { id: string; title: string; scale: number; origin: Pt; width: number; height: number; prims: Prim[] };

export const LAYER_COLORS: Record<Layer, { aci: number; css: string }> = {
  CADRE: { aci: 7, css: "#0f172a" },
  COFFRAGE: { aci: 7, css: "#0f172a" },
  AXES: { aci: 8, css: "#94a3b8" },
  COTATION: { aci: 5, css: "#1d4ed8" },
  ACIERS: { aci: 1, css: "#dc2626" },
  REPARTITION: { aci: 5, css: "#1d4ed8" },
  TEXTE: { aci: 7, css: "#0f172a" },
  TERRAIN: { aci: 32, css: "#78350f" },
  HACHURES: { aci: 8, css: "#475569" },
};

export const fmt = (x: number, d = 2) => x.toFixed(d).replace(".", ",");
export const cmTxt = (m: number) => String(Math.round(m * 100));

/**
 * Crayon : coordonnées en mètres réels, tailles de texte en mm papier.
 * `scale` est l'échelle de la planche ; `k` le facteur de la vue (k = échelle planche / échelle
 * de la vue), pour dessiner une vue à sa propre échelle sur la planche.
 */
export class Pen {
  prims: Prim[] = [];
  constructor(public ox: number, public oy: number, public scale: number, public k = 1) {}
  /** Longueur en unités de la vue correspondant à `mm` sur le papier. */
  th(mm: number) { return (mm / 1000) * (this.scale / this.k); }
  P(x: number, y: number): Pt { return [this.ox + this.k * x, this.oy + this.k * y]; }
  line(a: Pt, b: Pt, layer: Layer) { this.prims.push({ t: "line", a: this.P(...a), b: this.P(...b), layer }); }
  poly(pts: Pt[], layer: Layer, closed = false, fill = false) { this.prims.push({ t: "poly", pts: pts.map((p) => this.P(...p)), closed, layer, fill }); }
  rect(x: number, y: number, w: number, h: number, layer: Layer, fill = false) {
    this.poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], layer, true, fill);
  }
  circle(c: Pt, r: number, layer: Layer, hollow = false) { this.prims.push({ t: "circle", c: this.P(...c), r: r * this.k, layer, hollow }); }
  text(p: Pt, mm: number, s: string, layer: Layer = "TEXTE", align: "left" | "center" | "right" = "left", rot = 0, bold = false) {
    this.prims.push({ t: "text", p: this.P(...p), h: this.th(mm) * this.k, s, layer, align, rot, bold });
  }
  /** Repère cerclé (n° de barre ou épaisseur), diamètre en mm papier. */
  bubble(c: Pt, label: string, mm = 5, layer: Layer = "TEXTE") {
    this.circle(c, this.th(mm / 2), layer, true);
    this.text([c[0], c[1] - this.th(1.1)], mm * 0.48, label, layer, "center");
  }
  /** Repère cerclé relié à un point par une ligne de rappel. */
  callout(from: Pt, to: Pt, label: string, mm = 5) {
    const r = this.th(mm / 2);
    const d = Math.hypot(to[0] - from[0], to[1] - from[1]) || 1;
    this.line(from, [to[0] - ((to[0] - from[0]) * r) / d, to[1] - ((to[1] - from[1]) * r) / d], "COTATION");
    this.circle(from, this.th(0.5), "ACIERS");
    this.bubble(to, label, mm);
  }
  /** Cote horizontale en cm. */
  dimH(x0: number, x1: number, yRef: number, y: number, label?: string) {
    const tick = this.th(1.2);
    this.line([x0, yRef], [x0, y + (y > yRef ? tick : -tick)], "COTATION");
    this.line([x1, yRef], [x1, y + (y > yRef ? tick : -tick)], "COTATION");
    this.line([x0, y], [x1, y], "COTATION");
    for (const x of [x0, x1]) this.line([x - tick / 2, y - tick / 2], [x + tick / 2, y + tick / 2], "COTATION");
    this.text([(x0 + x1) / 2, y + this.th(0.8)], 2, label ?? cmTxt(x1 - x0), "COTATION", "center");
  }
  dimV(y0: number, y1: number, xRef: number, x: number, label?: string) {
    const tick = this.th(1.2);
    this.line([xRef, y0], [x + (x > xRef ? tick : -tick), y0], "COTATION");
    this.line([xRef, y1], [x + (x > xRef ? tick : -tick), y1], "COTATION");
    this.line([x, y0], [x, y1], "COTATION");
    for (const y of [y0, y1]) this.line([x - tick / 2, y - tick / 2], [x + tick / 2, y + tick / 2], "COTATION");
    this.text([x - this.th(0.8), (y0 + y1) / 2], 2, label ?? cmTxt(y1 - y0), "COTATION", "center", 90);
  }
  /** Chaîne de cotes horizontales et cote totale en dessous. */
  chainH(xs: number[], yRef: number, y: number, total = true) {
    for (let k = 0; k < xs.length - 1; k++) if (xs[k + 1] - xs[k] > 1e-6) this.dimH(xs[k], xs[k + 1], yRef, y);
    if (total && xs.length > 2) this.dimH(xs[0], xs[xs.length - 1], yRef, y - this.th(6) * Math.sign(yRef - y || 1));
  }
  chainV(ys: number[], xRef: number, x: number, total = true) {
    for (let k = 0; k < ys.length - 1; k++) if (ys[k + 1] - ys[k] > 1e-6) this.dimV(ys[k], ys[k + 1], xRef, x);
    if (total && ys.length > 2) this.dimV(ys[0], ys[ys.length - 1], xRef, x + this.th(6) * Math.sign(x - xRef || 1));
  }
  /** Terrain naturel : trait et hachures en croix sous la ligne. */
  terrain(x0: number, x1: number, y: number) {
    this.line([x0, y], [x1, y], "TERRAIN");
    const step = this.th(2.2), h = this.th(2);
    for (let x = x0; x < x1 - step / 2; x += step) {
      this.line([x, y], [x + step, y - h], "HACHURES");
      this.line([x + step, y], [x, y - h], "HACHURES");
    }
    this.text([x0, y + this.th(1)], 2, "TN", "TERRAIN");
  }
}

export function geometry(study: Study) {
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

export function cellOutline(x0: number, x1: number, yb: number, yt: number, g: number): Pt[] {
  if (g <= 0) return [[x0, yb], [x1, yb], [x1, yt], [x0, yt]];
  return [[x0 + g, yb], [x1 - g, yb], [x1, yb + g], [x1, yt - g], [x1 - g, yt], [x0 + g, yt], [x0, yt - g], [x0, yb + g]];
}

/** Type de barre tracée, pour retrouver son repère dans la nomenclature. */
export type BarKind = GroupId | "equerre";

export type BarDraw = { group: GroupId; kind: BarKind; pts: Pt[]; anchor: Pt; dir: Pt; label: boolean };

/**
 * Armatures du corps dans la section transversale (repère x = 0 sur la face extérieure gauche,
 * y = 0 sous le radier) : barres transversales à crochets dans le radier et la dalle, barres
 * de piédroits en U à retours, équerres aux quatre angles extérieurs.
 */
export function bodyBars(study: Study): BarDraw[] {
  const inp = study.input;
  const c = inp.cover;
  const { B, Hout, cells } = geometry(study);
  const gd = (id: GroupId) => study.design.groups.find((g) => g.id === id);
  const h = 0.15 / Math.SQRT2;
  const out: BarDraw[] = [];
  const mid0 = (cells[0].x0 + cells[0].x1) / 2;
  const hz = (group: GroupId, y: number, up: boolean, anchor: Pt, dir: Pt) => {
    if (!gd(group)) return;
    const s = up ? 1 : -1;
    out.push({ group, kind: group, pts: [[c + h, y + s * h], [c, y], [B - c, y], [B - c - h, y + s * h]], anchor, dir, label: true });
  };
  hz("radier_ext", c, true, [B * 0.3, c], [0, -1]);
  hz("radier_int", inp.er - c, false, [mid0 + 0.2, inp.er - c], [0, 1]);
  hz("dalle_ext", Hout - c, false, [B * 0.3, Hout - c], [0, 1]);
  hz("dalle_int", Hout - inp.es + c, true, [mid0 + 0.2, Hout - inp.es + c], [0, -1]);
  const ret = Math.max(0.12, Math.min(inp.es, inp.er) - 2 * c);
  const off = 0.015;
  const vert = (group: GroupId, x: number, toward: 1 | -1, yb: number, yt: number, label: boolean, ay: number) => {
    if (!gd(group)) return;
    out.push({
      group, kind: group, pts: [[x + toward * ret, yb], [x, yb], [x, yt], [x + toward * ret, yt]],
      anchor: [x, ay], dir: [toward === 1 ? -1 : 1, 0], label,
    });
  };
  // Faces extérieures : retours vers l'intérieur, dans les nappes extérieures.
  vert("pext_ext", c + off, 1, c + off, Hout - c - off, true, Hout * 0.55);
  vert("pext_ext", B - c - off, -1, c + off, Hout - c - off, false, 0);
  // Faces intérieures des piédroits extérieurs : retours vers l'extérieur.
  vert("pext_int", inp.eExt - c, -1, c + 2 * off, Hout - c - 2 * off, true, Hout * 0.45);
  vert("pext_int", B - inp.eExt + c, 1, c + 2 * off, Hout - c - 2 * off, false, 0);
  for (let k = 0; k < cells.length - 1; k++) {
    const xl = cells[k].x1, xr = cells[k + 1].x0;
    vert("pint", xl + c, 1, c + 2 * off, Hout - c - 2 * off, k === 0, Hout * 0.5);
    vert("pint", xr - c, -1, c + 2 * off, Hout - c - 2 * off, false, 0);
  }
  // Équerres aux angles extérieurs.
  const pe = gd("pext_ext");
  if (pe) {
    const lg = Math.min(0.9, Math.max(0.5, Math.round((40 * pe.bars.phi) / 1000 / 0.05) * 0.05));
    const e = c + 3 * off;
    const corners: [Pt, Pt][] = [[[e, e], [1, 1]], [[B - e, e], [-1, 1]], [[e, Hout - e], [1, -1]], [[B - e, Hout - e], [-1, -1]]];
    corners.forEach(([p, [sx, sy]], i) => {
      out.push({
        group: "pext_ext", kind: "equerre", pts: [[p[0], p[1] + sy * lg], p, [p[0] + sx * lg, p[1]]],
        anchor: [p[0] + sx * lg * 0.6, p[1]], dir: [0, -sy], label: i === 0,
      });
    });
  }
  return out;
}

/** Repère de nomenclature de chaque type de barre tracée. */
export function repMap(study: Study): Map<BarKind, number> {
  const map = new Map<BarKind, number>();
  const find = (element: string, prefix: string) => study.quantities.bars.find((b) => b.element === element && b.designation.startsWith(prefix))?.rep;
  const set = (k: BarKind, v: number | undefined) => { if (v !== undefined) map.set(k, v); };
  set("radier_ext", find("RADIER", "Nappe inférieure"));
  set("radier_int", find("RADIER", "Nappe supérieure"));
  set("dalle_ext", find("DALLE", "Nappe supérieure"));
  set("dalle_int", find("DALLE", "Nappe inférieure"));
  set("pext_ext", find("PIÉDROITS", "Piédroits extérieurs — face extérieure"));
  set("pext_int", find("PIÉDROITS", "Piédroits extérieurs — face intérieure"));
  set("pint", find("PIÉDROITS", "Piédroits intermédiaires"));
  set("equerre", find("RADIER", "Équerres"));
  return map;
}

export { buildSheets } from "./plans";
