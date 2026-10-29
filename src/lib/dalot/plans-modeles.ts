/**
 * Dossiers de plans d'exécution reproduisant les plans types reçus (A3 paysage) :
 *
 *  « cafe » — modèle type 1 (Dalot 2,00 × 2,00, 3,00 × 2,00, 2 × 3,00 × 2,00) :
 *    1. page de garde ; 2. vue en plan et détail ; 3. coupes A-A, B-B et élévation de la tête ;
 *    4. plan de ferraillage du corps et hypothèses de calcul ; 5. nomenclature du corps ;
 *    6. ferraillage de la tête et détail de l'aile ; 7. ferraillage du mur en aile et section 2-2 ;
 *    8. « grille tête » (nomenclature des têtes). Cartouche en bandeau bas, repères des têtes « 1a, 2a… ».
 *
 *  « paia » — modèle type 2 (Dalot 3 × 4,00 × 4,00) :
 *    1. titre ; 2. ensemble coffrage (coupes AA, BB, vue en plan, détail 1) ; 3. corps d'ouvrage ;
 *    4. nomenclature du corps ; 5-6. garde-corps et nomenclature ; 7. ferraillage des ouvrages de
 *    tête (vue en plan, élévation, détail 1, coupe A-A) ; 8. nomenclature des têtes.
 *
 * Mises en page en millimètres papier ; chaque vue est placée à la plus grande échelle normalisée
 * qui tient dans sa zone. Les logos des plans d'origine ne sont pas repris : les cases portent le
 * nom des intervenants saisis dans les données générales.
 */

import { barMass } from "./ba";
import { bodyBars, cellOutline, cmTxt, fmt, geometry, Pen, repMap, type Layer, type Pt, type Sheet } from "./drawings";
import type { Study } from "./engine";
import { fitView, headGeom, sketch, type Pad, type Region } from "./plans";
import { BAR_PARTS, GARDE_CORPS, GUIDE_ROUE, gardeCorpsPosts, type BarMark, type BarPart } from "./quantities";
import * as THREE from "three";
import { buildScene, governing, type Scene3DOptions } from "./scene3d";

type Model = "cafe" | "paia";
type Align = "left" | "center" | "right";
type Ext = { x0: number; y0: number; w: number; h: number };
type View = { ext: Ext; pad: Pad; draw: (p: Pen) => void };

const PW = 420, PH = 297; // A3 paysage (mm)
const S = 100; // échelle de mise en page des planches

// ── Contexte commun ────────────────────────────────────────

type Ctx = {
  study: Study;
  model: Model;
  name: string; // « DALOT 2,00 × 2,00 »
  date: string;
  label: (b: BarMark | undefined) => string;
  rep: (rep: number | undefined) => string;
  mark: (rep: number | undefined) => BarMark | undefined;
  bar: (element: string, prefix: string) => BarMark | undefined;
};

function dalotName(study: Study) {
  const inp = study.input;
  const o = inp.openings;
  const same = o.every((x) => Math.abs(x - o[0]) < 1e-6);
  const h = fmt(inp.hInt);
  if (same) return `DALOT ${o.length > 1 ? `${o.length} × ` : ""}${fmt(o[0])} × ${h}`;
  return `DALOT ${o.map((x) => fmt(x)).join(" + ")} × ${h}`;
}

function planDate(raw: string) {
  if (raw.trim()) return raw.trim();
  const s = new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function makeCtx(study: Study, model: Model): Ctx {
  const bars = study.quantities.bars;
  const labels = new Map<BarMark, string>();
  const suffix: Record<BarPart, string> = model === "cafe"
    ? { "CORPS DU DALOT": "", "OUVRAGE DE TÊTE": "a", "GARDE-CORPS": "g" }
    : { "CORPS DU DALOT": "", "OUVRAGE DE TÊTE": "", "GARDE-CORPS": "" };
  for (const part of BAR_PARTS) {
    bars.filter((b) => b.part === part).forEach((b, i) => labels.set(b, `${i + 1}${suffix[part]}`));
  }
  const byRep = new Map(bars.map((b) => [b.rep, b]));
  const label = (b: BarMark | undefined) => (b ? labels.get(b) ?? String(b.rep) : "?");
  return {
    study, model, name: dalotName(study), date: planDate(study.input.ident.datePlan),
    label,
    rep: (r) => label(r === undefined ? undefined : byRep.get(r)),
    mark: (r) => (r === undefined ? undefined : byRep.get(r)),
    bar: (element, prefix) => bars.find((b) => b.element === element && b.designation.startsWith(prefix)),
  };
}

function wrap(s: string, n: number, max = 4) {
  const words = s.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > n && cur) { lines.push(cur.trim()); cur = w; } else cur += " " + w;
  }
  if (cur.trim()) lines.push(cur.trim());
  return lines.slice(0, max);
}

const up = (s: string) => s.toLocaleUpperCase("fr-FR");

/** Angle des ailes : en grades quand la valeur ronde y est (27° = 30 gr, comme sur les plans types). */
function angTxt(deg: number) {
  const gr = (deg * 10) / 9;
  const roundGr = Math.abs(gr - Math.round(gr)) < 0.15 && Math.round(gr) % 5 === 0;
  const roundDeg = Math.abs(deg - Math.round(deg)) < 0.05 && Math.round(deg) % 5 === 0;
  return roundGr && !roundDeg ? `${Math.round(gr)} gr` : `${Math.round(deg)}°`;
}

// ── Planche : crayon papier (mm) et vues à l'échelle ─────────

class Page {
  pen: Pen;
  subs: Pen[] = [];
  scales: number[] = [];
  constructor(public origin: Pt) { this.pen = new Pen(origin[0], origin[1], S); }
  u(mm: number) { return (mm / 1000) * S; }
  line(x1: number, y1: number, x2: number, y2: number, layer: Layer = "CADRE") { this.pen.line([this.u(x1), this.u(y1)], [this.u(x2), this.u(y2)], layer); }
  rect(x: number, y: number, w: number, h: number, layer: Layer = "CADRE", fill = false) { this.pen.rect(this.u(x), this.u(y), this.u(w), this.u(h), layer, fill); }
  text(x: number, y: number, size: number, s: string, align: Align = "left", bold = false, rot = 0, layer: Layer = "TEXTE") {
    this.pen.text([this.u(x), this.u(y)], size, s, layer, align, rot, bold);
  }
  /** Titre souligné, centré en x. */
  title(x: number, y: number, size: number, s: string, bold = false) {
    this.text(x, y, size, s, "center", bold);
    const w = s.length * size * 0.56;
    this.line(x - w / 2, y - size * 0.3, x + w / 2, y - size * 0.3, "TEXTE");
  }
  /** Place une vue dans une zone ; le titre (souligné, avec l'échelle) se met dessous ou dessus. */
  place(r: Region, v: View, title?: { text: string; pos: "below" | "above"; size?: number; scale?: boolean }) {
    const tH = title ? (title.size ?? 4) + 6 : 0;
    const pad = { ...v.pad, b: v.pad.b + (title?.pos === "below" ? tH : 0), t: v.pad.t + (title?.pos === "above" ? tH : 0) };
    const { pen, s } = fitView(this.origin, S, r, v.ext, pad);
    v.draw(pen);
    this.subs.push(pen);
    this.scales.push(s);
    if (title) {
      const txt = title.scale === false ? title.text : `${title.text} (ÉCH. 1/${s})`;
      const y = title.pos === "below" ? r.y + 3 : r.y + r.h - (title.size ?? 4) - 1;
      this.title(r.x + r.w / 2, y, title.size ?? 4, txt);
    }
    return s;
  }
  scaleLabel() {
    const u = Array.from(new Set(this.scales));
    return u.length === 0 ? "—" : u.length === 1 ? `1/${u[0]}` : "VAR";
  }
  sheet(id: string, title: string, role?: Sheet["role"]): Sheet {
    return {
      id, title, role, scale: S, scaleLabel: this.scaleLabel(), origin: this.origin, width: this.u(PW), height: this.u(PH),
      prims: [...this.pen.prims, ...this.subs.flatMap((p) => p.prims)],
    };
  }
}

/** Zone utile de dessin de chaque modèle (au-dessus du cartouche). */
const AREA: Record<Model, Region> = {
  cafe: { x: 10, y: 44, w: 400, h: 243 },
  paia: { x: 9, y: 37, w: 402, h: 251 },
};

// ── Cartouches ─────────────────────────────────────────────

function cartoucheCafe(pg: Page, ctx: Ctx, title: string, idx: number, total: number) {
  const id = ctx.study.input.ident;
  // Cadre double du dessin, puis bandeau du cartouche.
  pg.rect(4, 38, 412, 255);
  pg.rect(8, 42, 404, 247, "CADRE");
  const y0 = 4, h = 30;
  const cols = [70, 42, 150, 64, 54, 28];
  const xs = [4];
  for (const c of cols) xs.push(xs[xs.length - 1] + c);
  pg.rect(4, y0, 412, h);
  pg.line(4, y0 + h + 0.8, 416, y0 + h + 0.8);
  for (let i = 1; i < xs.length - 1; i++) pg.line(xs[i], y0, xs[i], y0 + h);
  // 1. République / ministère
  const c1 = (xs[0] + xs[1]) / 2;
  pg.text(c1, y0 + 24, 2.5, "RÉPUBLIQUE DE CÔTE D'IVOIRE", "center", true);
  pg.text(c1, y0 + 20.5, 1.5, "Union – Discipline – Travail", "center");
  wrap(up(id.ministere || "Ministère de tutelle"), 44, 3).forEach((l, i) => pg.text(c1, y0 + 13 - i * 3, 1.9, l, "center", true));
  // 2. Maître d'ouvrage délégué
  const c2 = (xs[1] + xs[2]) / 2;
  pg.text(c2, y0 + 26, 1.8, "MAÎTRE D'OUVRAGE DÉLÉGUÉ", "center", true);
  wrap(id.maitreOuvrage || "—", 18, 3).forEach((l, i) => pg.text(c2, y0 + 16 - i * 4.2, 3, l, "center", true));
  // 3. Marché, itinéraire, titre de la planche
  const c3 = (xs[2] + xs[3]) / 2;
  pg.line(xs[2], y0 + 16, xs[3], y0 + 16);
  const m = wrap(up(id.marche || id.projet), 62, 2);
  m.forEach((l, i) => pg.text(c3, y0 + 24.5 - (m.length - 1) * 1.8 - i * 3.6 + (m.length - 1) * 1.8 * 0, 2.6, l, "center", true));
  const xi = xs[2] + 34;
  pg.line(xi, y0, xi, y0 + 16);
  pg.text((xs[2] + xi) / 2, y0 + 11, 2.4, "Itinéraire :", "center");
  wrap(id.itineraire || id.localisation, 16, 2).forEach((l, i) => pg.text((xs[2] + xi) / 2, y0 + 6.5 - i * 3.2, 2.3, l, "center"));
  pg.text((xi + xs[3]) / 2, y0 + 9.5, 2.2, `PLAN D'EXÉCUTION : ${ctx.name}`, "center", true);
  pg.text((xi + xs[3]) / 2, y0 + 4.5, 2.2, up(title), "center");
  // 4. Entreprise
  const c4 = (xs[3] + xs[4]) / 2;
  pg.text(c4, y0 + 25.5, 1.9, "ENTREPRISE DE TRAVAUX", "center", true);
  pg.line(c4 - 13, y0 + 24.8, c4 + 13, y0 + 24.8, "TEXTE");
  wrap(id.entreprise || "—", 24, 2).forEach((l, i) => pg.text(c4, y0 + 17 - i * 4, 2.8, l, "center", true));
  pg.text(c4, y0 + 3.5, 1.7, `Conception : ${id.auteur}`, "center");
  // 5. Indice, date
  const x5 = xs[4];
  pg.rect(x5 + 2, y0 + 17, 50, 11);
  pg.line(x5 + 38, y0 + 17, x5 + 38, y0 + 28);
  pg.text(x5 + 20, y0 + 19.5, 5.5, "INDICE", "center");
  pg.text(x5 + 45, y0 + 19.5, 5.5, id.indice || "A", "center");
  pg.text(x5 + 27, y0 + 10.5, 3.6, "Date :", "center");
  pg.text(x5 + 27, y0 + 4, 2.8, ctx.date, "center");
  // 6. Format, n° de planche
  const c6 = (xs[5] + xs[6]) / 2;
  pg.line(xs[5], y0 + 14, xs[6], y0 + 14);
  pg.text(c6, y0 + 23, 3, "Format :", "center");
  pg.text(c6, y0 + 16, 2, `${id.numPlan}-${String(idx).padStart(2, "0")}`, "center");
  pg.text(c6, y0 + 6, 5.5, "A3", "center", true);
  pg.text(c6, y0 + 1.6, 1.6, `Pl. ${idx}/${total}`, "center");
}

function cartouchePaia(pg: Page, ctx: Ctx, title: string, idx: number, scaleTxt: string) {
  const id = ctx.study.input.ident;
  pg.rect(4, 4, 412, 289);
  pg.line(4, 34, 416, 34);
  const y0 = 5, h = 27;
  const cols = [83, 178, 38, 40, 30, 37];
  const xs = [6];
  for (const c of cols) xs.push(xs[xs.length - 1] + c);
  for (let i = 0; i < cols.length; i++) pg.rect(xs[i], y0, cols[i] - 1.2, h);
  // 1. République
  const c1 = xs[0] + (cols[0] - 1.2) / 2;
  pg.text(c1, y0 + 20.5, 2.4, "RÉPUBLIQUE DE CÔTE D'IVOIRE", "center", true);
  pg.text(c1, y0 + 17.2, 2, "------------------", "center");
  wrap(up(id.ministere || "Ministère"), 40, 2).forEach((l, i) => pg.text(c1, y0 + 13.5 - i * 2.8, 2.1, l, "center", true));
  pg.text(c1, y0 + 7.4, 2, "------------------", "center");
  pg.text(c1, y0 + 3.5, 2.1, up(id.maitreOuvrage || "—"), "center", true);
  // 2. Marché, département, ouvrage, itinéraire
  const x2 = xs[1], w2 = cols[1] - 1.2;
  pg.line(x2, y0 + 16.5, x2 + w2, y0 + 16.5);
  wrap(up(id.marche || id.projet), 95, 2).forEach((l, i) => pg.text(x2 + w2 / 2, y0 + 22.5 - i * 3.3, 2.3, l, "center", true));
  const xa = x2 + 55, xb = x2 + 125;
  pg.line(xa, y0, xa, y0 + 16.5);
  pg.line(xb, y0, xb, y0 + 16.5);
  pg.text(xa + 2, y0 + 12.5, 2.2, `DÉPARTEMENT DE : ${up(id.departement || "—")}`, "left", true);
  pg.text(xa + 2, y0 + 7, 1.8, "OUVRAGE :", "left");
  pg.text(xa + 17, y0 + 7, 3, ctx.name.replace(/^DALOT /, "DALOT : "), "left");
  pg.text((xa + xb) / 2, y0 + 2, 1.8, up(title), "center");
  pg.line((xa + xb) / 2 - up(title).length * 0.5, y0 + 1.5, (xa + xb) / 2 + up(title).length * 0.5, y0 + 1.5, "TEXTE");
  pg.text((xb + x2 + w2) / 2, y0 + 12.5, 3, "ITINÉRAIRE", "center");
  wrap(id.itineraire || id.localisation, 26, 2).forEach((l, i) => pg.text((xb + x2 + w2) / 2, y0 + 8 - i * 2.6, 1.9, l, "center"));
  if (id.pk) pg.text((xb + x2 + w2) / 2, y0 + 2, 1.9, id.pk, "center");
  // 3. Entreprise
  const c3 = xs[2] + (cols[2] - 1.2) / 2;
  pg.text(c3, y0 + 20, 3, "ENTREPRISE", "center");
  wrap(up(id.entreprise || "—"), 12, 3).forEach((l, i) => pg.text(c3, y0 + 12.5 - i * 4, 3, l, "center", true));
  // 4. Maître d'œuvre
  const c4 = xs[3] + (cols[3] - 1.2) / 2;
  pg.text(c4, y0 + 20, 3, "MAÎTRE D'ŒUVRE", "center");
  wrap(up(id.maitreOeuvre || "—"), 10, 2).forEach((l, i) => pg.text(c4, y0 + 10 - i * 5, 4.4, l, "center", true));
  // 5. Date
  const x5 = xs[4];
  pg.rect(x5 + 1, y0 + 0.8, cols[4] - 3.2, 8);
  pg.text(x5 + (cols[4] - 1.2) / 2, y0 + 5.6, 1.8, "DATE", "center", true);
  pg.text(x5 + (cols[4] - 1.2) / 2, y0 + 1.9, 1.8, ctx.date, "center");
  pg.text(x5 + (cols[4] - 1.2) / 2, y0 + 18, 1.6, `Conception :`, "center");
  pg.text(x5 + (cols[4] - 1.2) / 2, y0 + 15, 1.6, id.auteur, "center");
  // 6. Échelle et n°
  const x6 = xs[5];
  pg.line(x6, y0 + 13.5, x6 + cols[5] - 1.2, y0 + 13.5);
  pg.text(x6 + 1.5, y0 + 22, 2.4, "ÉCHELLE :", "left", true);
  pg.text(x6 + cols[5] - 3, y0 + 16.5, 2.6, scaleTxt, "right");
  pg.text(x6 + 1.5, y0 + 9, 2.4, "N°.", "left", true);
  pg.text(x6 + cols[5] - 4, y0 + 4, 3.2, `${id.numPlan}-${String(idx).padStart(2, "0")}`, "right");
}

// ── Petits outils de dessin ────────────────────────────────

/** Hachures à 45° dans un rectangle (béton coupé). */
function hatch(p: Pen, x: number, y: number, w: number, h: number, stepMm = 1.6) {
  const st = p.th(stepMm);
  for (let t = -h + st / 2; t < w; t += st) {
    const xa = Math.max(x, x + t), ya = y + (xa - (x + t));
    const xb = Math.min(x + w, x + t + h), yb = y + (xb - (x + t));
    if (xb > xa) p.line([xa, ya], [xb, yb], "HACHURES");
  }
}

/** Peigne de répartition le long d'une face (barres vues en bout), à `off` mm de la face côté `n`. */
function comb(p: Pen, a: Pt, b: Pt, n: Pt, sp: number, off = 3) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  if (len <= 0 || sp <= 0) return;
  const d: Pt = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
  const o1 = p.th(off), o2 = p.th(off + 4);
  const at = (s: number, o: number): Pt => [a[0] + d[0] * s + n[0] * o, a[1] + d[1] * s + n[1] * o];
  p.line(at(0, o1), at(len, o1), "HACHURES");
  p.line(at(0, o2), at(len, o2), "HACHURES");
  for (let s = 0; s <= len + 1e-9; s += sp) p.line(at(s, o1), at(s, o2), "HACHURES");
}

function dots(p: Pen, a: Pt, b: Pt, sp: number) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  if (len <= 0 || sp <= 0) return;
  const k = Math.floor(len / sp + 1e-9);
  const r = p.th(0.45);
  for (let i = 0; i <= k; i++) {
    const s = k === 0 ? 0 : (len * i) / k;
    p.circle([a[0] + ((b[0] - a[0]) * s) / len, a[1] + ((b[1] - a[1]) * s) / len], r, "ACIERS");
  }
}

/** Repère de coupe : trait épais, flèche de visée et lettre. */
function cutMark(p: Pen, at: Pt, dir: Pt, letter: string) {
  const l = p.th(6);
  p.line(at, [at[0] + dir[1] * l, at[1] - dir[0] * l], "COFFRAGE");
  p.line(at, [at[0] + dir[0] * l * 0.8, at[1] + dir[1] * l * 0.8], "COFFRAGE");
  p.text([at[0] + dir[0] * l * 1.1 + p.th(1), at[1] + dir[1] * l * 1.1 - p.th(1.2)], 3.4, letter, "TEXTE", "left");
}

/** Cote de niveau : petit triangle et valeur. */
function level(p: Pen, at: Pt, value: number, right = true) {
  const s = p.th(1.4);
  p.poly([[at[0], at[1]], [at[0] - s, at[1] + s * 1.4], [at[0] + s, at[1] + s * 1.4]], "COTATION", true);
  const txt = `${value >= 0 ? "+" : ""}${value.toFixed(3).replace(".", ",")}`;
  p.line([at[0], at[1] + s * 1.4], [at[0] + (right ? 1 : -1) * p.th(12), at[1] + s * 1.4], "COTATION");
  p.text([at[0] + (right ? 1 : -1) * p.th(1), at[1] + s * 1.8], 2, txt, "COTATION", right ? "left" : "right");
}

/** Désignation d'une barre comme sur les plans DXF : « 53HA10 esp=15cm ». */
function barText(b: BarMark) {
  const n = Math.round(b.count / b.nElem);
  return `${n}HA${b.phi}${b.s > 0 ? ` esp=${Math.round(b.s * 100)}cm` : ""}`;
}

/** Repère cerclé relié à la barre, suivi de sa désignation (nombre, diamètre, espacement). */
function tag(p: Pen, ctx: Ctx, from: Pt, to: Pt, b: BarMark | undefined, mm = 6) {
  if (!b) return;
  p.callout(from, to, ctx.label(b), mm);
  const right = to[0] >= from[0] - 1e-9;
  p.text([to[0] + (right ? 1 : -1) * p.th(mm / 2 + 1), to[1] - p.th(0.8)], 1.9, barText(b), "TEXTE", right ? "left" : "right");
}

/** Étiquette reliée par une ligne brisée. */
function leader(p: Pen, from: Pt, to: Pt, txt: string, size = 2.6) {
  p.line(from, to, "TEXTE");
  const right = to[0] >= from[0];
  p.line(to, [to[0] + (right ? 1 : -1) * p.th(3), to[1]], "TEXTE");
  p.text([to[0] + (right ? 1 : -1) * p.th(4), to[1] - p.th(size * 0.35)], size, txt, "TEXTE", right ? "left" : "right");
}

// ── Géométrie partagée ─────────────────────────────────────

function geo(study: Study) {
  const inp = study.input;
  const { B, Hout, cells, n } = geometry(study);
  const hg = headGeom(study);
  const t = hg.t;
  const ept = hg.hHead > 0 ? Math.min(t.murTeteEp, 0.4) : 0;
  const yTop = Hout + hg.hHead;
  const radL = t.radierLong;
  const tanA = Math.tan(hg.a);
  const xl = Math.max(radL, hg.along);
  const gc = t.gardeCorps;
  return { inp, B, Hout, cells, n, hg, t, ept, yTop, radL, tanA, xl, gc, L: inp.L, a: hg.a, d: t.debord };
}

// ── Vues de coffrage ───────────────────────────────────────

function vuePlan(study: Study, detail: boolean): View {
  const g = geo(study);
  const { B, L, t, hg, xl, ept, radL, cells, d } = g;
  const acr = hg.across + (t.murs ? t.ep : 0) + d;
  return {
    ext: { x0: -xl, y0: -acr, w: L + 2 * xl, h: B + 2 * acr },
    pad: { l: 22, r: 22, b: 12, t: 24 },
    draw: (p) => {
      p.rect(0, 0, L, B, "COFFRAGE");
      for (const c of cells) { p.line([0, c.x0], [L, c.x0], "COFFRAGE"); p.line([0, c.x1], [L, c.x1], "COFFRAGE"); }
      // Mur de tête (guide-roue) dans la longueur de l'ouvrage, prolongé jusqu'aux racines des ailes.
      if (ept > 0) {
        const yw = d;
        p.rect(0, -yw, ept, B + 2 * yw, "COFFRAGE");
        p.rect(L - ept, -yw, ept, B + 2 * yw, "COFFRAGE");
      }
      for (const side of [-1, 1] as const) {
        const xe = side < 0 ? 0 : L;
        if (radL > 0) {
          const wl = t.murs ? radL * g.tanA : 0;
          const xr = xe + side * radL;
          p.poly([[xe, -d], [xr, -d - wl], [xr, B + d + wl], [xe, B + d]], "COFFRAGE", true);
          if (t.becheProf > 0) {
            const xb = xr - side * t.becheEp;
            p.line([xb, -d - (radL - t.becheEp) * (t.murs ? g.tanA : 0)], [xb, B + d + (radL - t.becheEp) * (t.murs ? g.tanA : 0)], "AXES");
            p.text([xr - side * (t.becheEp / 2) - p.th(1), B / 2], 2.4, `BÊCHE ${cmTxt(t.becheEp)} × ${cmTxt(t.becheProf)} (cachée)`, "TEXTE", "center", 90);
          }
          p.bubble([xe + side * radL * 0.55, B / 2], cmTxt(g.inp.er), 6);
          p.text([xe + side * radL * 0.5, B / 2 + p.th(6)], 2.2, `Radier de tête ép. ${cmTxt(g.inp.er)}`, "TEXTE", "center");
        }
        if (t.murs) {
          for (const edge of [0, B]) {
            const sy = edge === 0 ? -1 : 1;
            const d: Pt = [side * Math.cos(g.a), sy * Math.sin(g.a)];
            // Aile dans le prolongement du voile : face extérieure depuis l'angle, épaisseur vers l'intérieur.
            const nn: Pt = [side * Math.sin(g.a), -sy * Math.cos(g.a)];
            const A: Pt = [xe, edge + sy * g.d];
            const Bw: Pt = [A[0] + d[0] * t.long, A[1] + d[1] * t.long];
            const Ri: Pt = [A[0] + nn[0] * t.ep, A[1] + nn[1] * t.ep];
            p.poly([A, Bw, [Bw[0] + nn[0] * t.ep, Bw[1] + nn[1] * t.ep], Ri], "COFFRAGE");
            // Pli en onglet : la face intérieure de l'aile rejoint celle du voile.
            if (g.d === 0) p.line(Ri, [xe, edge - sy * g.inp.eExt], "COFFRAGE");
            const mid: Pt = [xe + d[0] * t.long * 0.5 - nn[0] * p.th(3), edge + d[1] * t.long * 0.5 - nn[1] * p.th(3)];
            let rot = (Math.atan2(d[1], d[0]) * 180) / Math.PI;
            if (rot > 90) rot -= 180;
            if (rot < -90) rot += 180;
            p.text(mid, 2.2, cmTxt(t.long), "COTATION", "center", rot);
            p.text([xe + d[0] * 0.9 - side * p.th(1), edge - sy * p.th(3.5)], 2.2, angTxt(t.angle), "COTATION", "center");
            p.line([xe, edge], [xe + side * 1.2, edge], "AXES");
          }
        }
      }
      p.bubble([L / 2 - p.th(10), B / 2], cmTxt(g.inp.es), 6);
      // Axes, coupes
      p.line([-xl - p.th(8), B / 2], [L + xl + p.th(8), B / 2], "AXES");
      cutMark(p, [-xl - p.th(6), B / 2], [1, 0], "A");
      cutMark(p, [L + xl + p.th(6), B / 2], [-1, 0], "A");
      p.line([L / 2, -hg.across - p.th(6)], [L / 2, B + hg.across + p.th(6)], "AXES");
      p.text([L / 2 - p.th(1.5), B / 2 + p.th(3)], 2.6, "AXE CHAUSSÉE", "TEXTE", "left", 90);
      cutMark(p, [L / 2, B + hg.across + p.th(4)], [0, -1], "B");
      cutMark(p, [L / 2, -hg.across - p.th(4)], [0, 1], "B");
      p.text([-xl + p.th(2), B + p.th(2)], 2.6, "AMONT", "TEXTE");
      p.text([L + xl - p.th(2), B + p.th(2)], 2.6, "AVAL", "TEXTE", "right");
      // Cotes
      const yD = B + acr;
      p.chainH([-xl, 0, L, L + xl], yD, yD + p.th(14), false);
      const xs2 = ept > 0 ? [-xl, 0, ept, L - ept, L, L + xl] : [-xl, 0, L, L + xl];
      p.chainH(xs2, yD, yD + p.th(8), false);
      const ys = [-hg.across - d, -d, 0, ...cells.flatMap((c) => [c.x0, c.x1]), B, B + d, B + d + hg.across].filter((v, i, arr) => i === 0 || v - arr[i - 1] > 1e-6);
      p.chainV(ys, L + xl, L + xl + p.th(8), false);
      if (hg.across + d > 0) p.dimV(-hg.across - d, B + hg.across + d, -xl, -xl - p.th(8));
      if (detail) {
        p.circle([L, 0], p.th(8), "COFFRAGE", true);
        leader(p, [L + p.th(5), -p.th(6)], [L + p.th(4), -hg.across - p.th(4)], "Détail", 3.2);
      }
    },
  };
}

/**
 * Détail du raccord voile / aile en vue en plan, à l'angle aval : l'aile prolonge le voile (face extérieure
 * depuis l'angle, épaisseur vers l'intérieur, pli en onglet sur la face intérieure), le mur de tête ou
 * guide-roue barre l'about de l'ouvrage. Origine à l'angle extérieur, x le long de l'axe (x < 0 dans
 * l'ouvrage), y en travers (y < 0 côté remblai).
 */
function detailRaccord(study: Study): View {
  const g = geo(study);
  const { t, ept, d } = g;
  const e = g.inp.eExt;
  const ew = ept || GUIDE_ROUE.w;
  const R = Math.max(0.8, 2.8 * Math.max(e, t.ep, ew));
  const clip = (a: Pt, b: Pt): [Pt, Pt] | null => {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const A = dx * dx + dy * dy, Bq = 2 * (a[0] * dx + a[1] * dy), C = a[0] * a[0] + a[1] * a[1] - R * R;
    const disc = Bq * Bq - 4 * A * C;
    if (A === 0 || disc <= 0) return null;
    const s0 = Math.max(0, (-Bq - Math.sqrt(disc)) / (2 * A)), s1 = Math.min(1, (-Bq + Math.sqrt(disc)) / (2 * A));
    return s1 > s0 ? [[a[0] + dx * s0, a[1] + dy * s0], [a[0] + dx * s1, a[1] + dy * s1]] : null;
  };
  return {
    ext: { x0: -R, y0: -R, w: 2 * R, h: 2 * R },
    pad: { l: 4, r: 4, b: 4, t: 4 },
    draw: (p) => {
      const L = (a: Pt, b: Pt, layer: "COFFRAGE" | "AXES" = "COFFRAGE") => { const c = clip(a, b); if (c) p.line(c[0], c[1], layer); };
      p.circle([0, 0], R, "COFFRAGE", true);
      // Voile : face extérieure vue jusqu'à l'about, face intérieure (cachée sous la dalle).
      L([-2 * R, 0], [0, 0]);
      L([-2 * R, e], [-ew, e], "AXES");
      // Mur de tête / guide-roue en about, sur la largeur de l'ouvrage.
      L([-ew, -d], [-ew, 2 * R]);
      L([0, -d], [0, 2 * R]);
      if (d > 0) L([-ew, -d], [0, -d]);
      hatch(p, -ew, -d, ew, Math.min(R * 0.9, d + R * 0.6), 1.2);
      if (t.murs) {
        const dw: Pt = [Math.cos(g.a), -Math.sin(g.a)];
        const ni: Pt = [Math.sin(g.a), Math.cos(g.a)];
        const A: Pt = [0, -d];
        const Ri: Pt = [A[0] + ni[0] * t.ep, A[1] + ni[1] * t.ep];
        L(A, [A[0] + dw[0] * 2 * R, A[1] + dw[1] * 2 * R]);
        L(Ri, [Ri[0] + dw[0] * 2 * R, Ri[1] + dw[1] * 2 * R]);
        if (d === 0) L(Ri, [0, e]);
        // Angle de l'aile sur l'axe.
        L([0, -d], [R, -d], "AXES");
        const ra = R * 0.5;
        const arc: Pt[] = [];
        for (let k = 0; k <= 12; k++) { const th = (-g.a * k) / 12; arc.push([ra * Math.cos(th), -d + ra * Math.sin(th)]); }
        p.poly(arc, "COTATION");
        p.text([ra * 1.05 * Math.cos(-g.a / 2) + p.th(1), -d + ra * Math.sin(-g.a / 2)], 2.4, angTxt(t.angle), "COTATION", "left");
        const m: Pt = [A[0] + dw[0] * R * 0.6, A[1] + dw[1] * R * 0.6];
        p.line(m, [m[0] + ni[0] * t.ep, m[1] + ni[1] * t.ep], "COTATION");
        p.text([m[0] + ni[0] * t.ep + p.th(1.5), m[1] + ni[1] * t.ep], 2.2, cmTxt(t.ep), "COTATION", "left");
        p.text([A[0] + dw[0] * R * 0.62 - ni[0] * p.th(3), A[1] + dw[1] * R * 0.62 - ni[1] * p.th(3)], 2, "Mur en aile", "TEXTE", "center", (-g.a * 180) / Math.PI);
      }
      p.dimV(0, e, -R * 0.55, -R * 0.55 - p.th(4));
      p.dimH(-ew, 0, R * 0.5, R * 0.5 + p.th(3));
      p.text([-R * 0.6, -p.th(3)], 2, "Voile", "TEXTE", "center");
      p.text([-ew / 2 - p.th(1.5), R * 0.25], 2, ept > 0 ? "Mur de tête (guide-roue)" : "Guide-roue", "TEXTE", "center", 90);
      p.text([R * 0.45, R * 0.3], 2, "Radier de tête", "TEXTE", "center");
    },
  };
}

/** Coupe longitudinale A-A dans une cellule. */
function coupeLong(study: Study): View {
  const g = geo(study);
  const { inp, L, t, hg, xl, ept, radL, Hout, yTop } = g;
  const x0 = -radL, x1 = L + radL;
  const slope = 0.005;
  return {
    ext: { x0: -xl, y0: -t.becheProf, w: L + 2 * xl, h: yTop + t.becheProf },
    pad: { l: 26, r: 14, b: 14, t: 26 },
    draw: (p) => {
      // Radier continu (corps et radiers de tête) et bêches.
      p.rect(x0, 0, x1 - x0, inp.er, "COFFRAGE");
      hatch(p, x0, 0, x1 - x0, inp.er);
      if (t.becheProf > 0) {
        p.rect(x0, -t.becheProf, t.becheEp, t.becheProf, "COFFRAGE");
        p.rect(x1 - t.becheEp, -t.becheProf, t.becheEp, t.becheProf, "COFFRAGE");
        hatch(p, x0, -t.becheProf, t.becheEp, t.becheProf);
        hatch(p, x1 - t.becheEp, -t.becheProf, t.becheEp, t.becheProf);
      }
      p.rect(x0 + t.becheEp, -0.1, x1 - x0 - 2 * t.becheEp, 0.1, "TERRAIN");
      // Tablier
      p.rect(0, inp.er + inp.hInt, L, inp.es, "COFFRAGE");
      hatch(p, 0, inp.er + inp.hInt, L, inp.es);
      p.line([0, inp.er], [0, inp.er + inp.hInt], "COFFRAGE");
      p.line([L, inp.er], [L, inp.er + inp.hInt], "COFFRAGE");
      if (yTop > Hout + 1e-6) {
        const w = ept || 0.2;
        p.rect(0, Hout, w, yTop - Hout, "COFFRAGE");
        p.rect(L - w, Hout, w, yTop - Hout, "COFFRAGE");
      }
      if (t.murs) {
        const hEnd = inp.er + hg.Hend;
        // L'aile s'accroche au sommet du guide-roue (ou du mur de tête), sur l'about de la dalle.
        p.line([0, yTop], [-hg.along, hEnd], "COFFRAGE");
        p.line([L, yTop], [L + hg.along, hEnd], "COFFRAGE");
        p.line([-hg.along, inp.er], [-hg.along, hEnd], "COFFRAGE");
        p.line([L + hg.along, inp.er], [L + hg.along, hEnd], "COFFRAGE");
        p.bubble([-hg.along * 0.4, inp.er + hg.Hend * 0.5 + (yTop - hEnd) * 0.2], cmTxt(t.ep), 6);
        p.bubble([L + hg.along * 0.4, inp.er + hg.Hend * 0.5 + (yTop - hEnd) * 0.2], cmTxt(t.ep), 6);
      }
      p.bubble([L / 2 + p.th(9), inp.er + inp.hInt / 2], cmTxt(inp.eExt), 6);
      // Axe de la chaussée, niveaux, pente
      p.line([L / 2, -p.th(6)], [L / 2, yTop + p.th(10)], "AXES");
      level(p, [L / 2, Hout], Hout - inp.er, false);
      level(p, [L / 2, inp.er], 0, false);
      level(p, [x0 + p.th(6), inp.er], (L / 2 + radL) * slope, true);
      level(p, [x1 - p.th(6), inp.er], -(L / 2 + radL) * slope, false);
      p.line([L * 0.7, inp.er + p.th(3)], [L * 0.7 + p.th(14), inp.er + p.th(3)], "COTATION");
      p.poly([[L * 0.7 + p.th(10), inp.er + p.th(3)], [L * 0.7 + p.th(14), inp.er + p.th(3)], [L * 0.7 + p.th(10), inp.er + p.th(4.6)]], "COTATION");
      p.text([L * 0.7 + p.th(5), inp.er + p.th(4)], 2, "0,50 %", "COTATION", "center");
      p.text([-xl + p.th(4), yTop - p.th(6)], 4, "Amont", "TEXTE");
      p.text([L + xl - p.th(4), yTop - p.th(6)], 4, "Aval", "TEXTE", "right");
      leader(p, [L * 0.6, Hout], [L * 0.62, yTop + p.th(6)], "Tablier", 3);
      leader(p, [L * 0.8, inp.er * 0.5], [L * 0.85, -p.th(7)], "Radier", 3);
      leader(p, [L * 0.25, -0.05], [L * 0.27, -t.becheProf - p.th(1)], "Béton de propreté, 10 cm", 2.6);
      // Cotes
      p.chainH([-xl, 0, L, L + xl], yTop, yTop + p.th(16), false);
      if (ept > 0) p.chainH([-xl, 0, ept, L - ept, L, L + xl], yTop, yTop + p.th(10), false);
      const ys = [-t.becheProf, 0, inp.er].filter((v, i, a) => i === 0 || v - a[i - 1] > 1e-6);
      p.chainV(ys, x0, -xl - p.th(8), false);
      p.chainV([inp.er, inp.er + inp.hInt, Hout, ...(yTop > Hout + 1e-6 ? [yTop] : [])], ept || 0.2, ept + p.th(6), false);
    },
  };
}

/** Coupe transversale B-B (avec garde-corps éventuels). */
function coupeTrans(study: Study): View {
  const g = geo(study);
  const { inp, B, Hout, cells, gc } = g;
  // Support du garde-corps : couronnement du mur de tête (s'il existe) ou guide-roue en rive.
  const gr = g.hg.hHead;
  const murT = study.heads.headWall.H > 0.3;
  const hTop = gr + (gc ? GARDE_CORPS.h : 0);
  return {
    ext: { x0: 0, y0: -0.1, w: B, h: Hout + hTop + 0.1 },
    pad: { l: 26, r: 10, b: 14, t: 22 },
    draw: (p) => {
      p.rect(0, 0, B, Hout, "COFFRAGE");
      for (const c of cells) p.poly(cellOutline(c.x0, c.x1, inp.er, inp.er + inp.hInt, inp.gousset), "COFFRAGE", true);
      p.rect(-0.05, -0.1, B + 0.1, 0.1, "TERRAIN");
      hatch(p, -0.05, -0.1, B + 0.1, 0.1, 0.8);
      leader(p, [B * 0.5, -0.05], [B * 0.3, -p.th(9)], "Béton de propreté, 10 cm", 2.4);
      if (gr > 0) p.rect(0, Hout, B, gr, "AXES");
      if (gc) {
        // Garde-corps posé sur le guide-roue.
        const G = GARDE_CORPS;
        for (const x of gardeCorpsPosts(B)) p.rect(x - G.post / 2, Hout + gr, G.post, G.h - G.lisseH, "COFFRAGE");
        p.rect(0, Hout + gr + G.h - G.lisseH, B, G.lisseH, "COFFRAGE");
        p.text([B + p.th(2), Hout + gr + G.h / 2], 2.2, murT ? "Garde-corps sur mur de tête (guide-roue)" : gr > 0 ? "Garde-corps sur guide-roue" : "Garde-corps", "TEXTE");
      }
      p.chainH([0, ...cells.flatMap((c) => [c.x0, c.x1]), B], Hout + hTop, Hout + hTop + p.th(8), false);
      p.dimH(0, B, Hout + hTop, Hout + hTop + p.th(14));
      p.chainV([0, inp.er, inp.er + inp.hInt, Hout], 0, -p.th(8), false);
      p.dimV(0, Hout, 0, -p.th(15));
    },
  };
}

/** Élévation de la tête (vue de face côté amont). */
function elevationTete(study: Study): View {
  const g = geo(study);
  const { inp, B, cells, hg, t, yTop } = g;
  const acr = hg.across + g.d;
  return {
    ext: { x0: -acr, y0: -t.becheProf, w: B + 2 * acr, h: yTop + t.becheProf },
    pad: { l: 22, r: 10, b: 14, t: 18 },
    draw: (p) => {
      p.rect(0, inp.er, B, yTop - inp.er, "COFFRAGE");
      for (const c of cells) p.rect(c.x0, inp.er, c.x1 - c.x0, inp.hInt, "COFFRAGE");
      p.rect(-acr, 0, B + 2 * acr, inp.er, "COFFRAGE");
      if (t.becheProf > 0) {
        p.rect(-acr, -t.becheProf, B + 2 * acr, t.becheProf, "AXES");
        leader(p, [B / 2, -t.becheProf / 2], [B / 2 + p.th(4), -t.becheProf - p.th(6)], `BÊCHE ${cmTxt(t.becheEp)} × ${cmTxt(t.becheProf)}`, 2.2);
      }
      if (t.murs) {
        const hEnd = inp.er + hg.Hend;
        const k = p.th(2.2);
        p.poly([[0, yTop], [-acr, hEnd], [-acr, inp.er]], "COFFRAGE");
        p.poly([[B, yTop], [B + acr, hEnd], [B + acr, inp.er]], "COFFRAGE");
        p.line([0, yTop - k], [-acr + k, hEnd - k * 0.3], "COFFRAGE");
        p.line([B, yTop - k], [B + acr - k, hEnd - k * 0.3], "COFFRAGE");
        p.bubble([-acr * 0.45, inp.er + (hEnd - inp.er) * 0.6], cmTxt(t.ep), 6);
        p.bubble([B + acr * 0.45, inp.er + (hEnd - inp.er) * 0.6], cmTxt(t.ep), 6);
      }
      p.chainH([-acr, 0, B, B + acr].filter((v, i, a) => i === 0 || v - a[i - 1] > 1e-6), yTop, yTop + p.th(8), false);
      const ys = [-t.becheProf, 0, inp.er, ...(t.murs ? [inp.er + hg.Hend] : [])].filter((v, i, a) => i === 0 || v - a[i - 1] > 1e-6);
      p.chainV(ys, -acr, -acr - p.th(8), false);
    },
  };
}

// ── Ferraillage du corps ───────────────────────────────────

function sectionFerraillage(ctx: Ctx, withDims: boolean, column = false): View {
  const study = ctx.study;
  const g = geo(study);
  const { inp, B, Hout, cells } = g;
  const c = inp.cover;
  const rep = repMap(study);
  const bars = bodyBars(study);
  const gd = (id: string) => study.design.groups.find((x) => x.id === id);
  return {
    ext: { x0: 0, y0: 0, w: B, h: Hout },
    pad: { l: column ? 84 : 30, r: column ? 84 : 30, b: withDims ? 44 : 30, t: 30 },
    draw: (p) => {
      // Repères : autour de la coupe, ou en colonnes latérales avec désignation et croquis coté.
      const items: { from: Pt; b: BarMark }[] = [];
      const T = (from: Pt, to: Pt, b: BarMark | undefined) => {
        if (!b) return;
        if (column) items.push({ from, b }); else tag(p, ctx, from, to, b, 6);
      };
      p.rect(0, 0, B, Hout, "COFFRAGE");
      for (const cl of cells) p.poly(cellOutline(cl.x0, cl.x1, inp.er, inp.er + inp.hInt, inp.gousset), "COFFRAGE", true);
      for (const b of bars) {
        p.poly(b.pts, "ACIERS");
        if (b.label) {
          const [ax, ay] = b.anchor;
          const d = p.th(21);
          T([ax, ay], [ax + b.dir[0] * d, ay + b.dir[1] * d], ctx.mark(rep.get(b.kind)));
        }
      }
      const re = gd("radier_ext"), ri = gd("radier_int"), de = gd("dalle_ext"), di = gd("dalle_int"), pe = gd("pext_ext"), pi = gd("pext_int");
      const sR = re?.rep.s ?? 0.2, sD = de?.rep.s ?? 0.2, sW = pe?.rep.s ?? 0.2;
      // Barres de répartition vues en bout et peignes sur toutes les faces.
      if (re) dots(p, [c + 0.05, c + 0.02], [B - c - 0.05, c + 0.02], sR);
      if (ri) dots(p, [c + 0.05, inp.er - c - 0.02], [B - c - 0.05, inp.er - c - 0.02], ri.rep.s);
      if (de) dots(p, [c + 0.05, Hout - c - 0.02], [B - c - 0.05, Hout - c - 0.02], sD);
      if (di) dots(p, [c + 0.05, Hout - inp.es + c + 0.02], [B - c - 0.05, Hout - inp.es + c + 0.02], di.rep.s);
      if (pe) for (const x of [c + 0.035, B - c - 0.035]) dots(p, [x, inp.er], [x, inp.er + inp.hInt], sW);
      if (pi) for (const x of [inp.eExt - c - 0.035, B - inp.eExt + c + 0.035]) dots(p, [x, inp.er], [x, inp.er + inp.hInt], pi.rep.s);
      comb(p, [0, Hout], [B, Hout], [0, 1], sD);
      comb(p, [0, 0], [B, 0], [0, -1], sR);
      comb(p, [0, inp.er * 0.4], [0, Hout - inp.es * 0.4], [-1, 0], sW);
      comb(p, [B, inp.er * 0.4], [B, Hout - inp.es * 0.4], [1, 0], sW);
      for (const cl of cells) {
        comb(p, [cl.x0, Hout - inp.es], [cl.x1, Hout - inp.es], [0, -1], di?.rep.s ?? sD, 1.5);
        comb(p, [cl.x0, inp.er], [cl.x1, inp.er], [0, 1], ri?.rep.s ?? sR, 1.5);
        comb(p, [cl.x0, inp.er], [cl.x0, inp.er + inp.hInt], [1, 0], pi?.rep.s ?? sW, 1.5);
        comb(p, [cl.x1, inp.er], [cl.x1, inp.er + inp.hInt], [-1, 0], pi?.rep.s ?? sW, 1.5);
      }
      const call = (b: BarMark | undefined, from: Pt, to: Pt) => T(from, to, b);
      call(ctx.bar("RADIER", "Répartition"), [B * 0.62, c + 0.02], [B * 0.62, -p.th(21)]);
      call(ctx.bar("RADIER", "Chaises"), [B * 0.8, inp.er / 2], [B * 0.8, -p.th(21)]);
      call(ctx.bar("DALLE", "Répartition"), [B * 0.62, Hout - c - 0.02], [B * 0.62, Hout + p.th(21)]);
      call(ctx.bar("DALLE", "Chaises"), [B * 0.8, Hout - inp.es / 2], [B * 0.8, Hout + p.th(21)]);
      call(ctx.bar("PIÉDROITS", "Répartition"), [c + 0.035, Hout * 0.68], [-p.th(21), Hout * 0.68]);
      call(ctx.bar("PIÉDROITS", "Épingles"), [inp.eExt / 2, Hout * 0.32], [-p.th(21), Hout * 0.32]);
      const eq = ctx.bar("DALLE", "Équerres");
      T([B - c - 0.12, Hout - c - 0.04], [B + p.th(21), Hout - c - 0.04], eq);
      if (column) {
        for (const side of [-1, 1] as const) {
          const list = items.filter((it) => (side < 0 ? it.from[0] <= B / 2 : it.from[0] > B / 2)).sort((u, v) => v.from[1] - u.from[1]);
          const step = p.th(13);
          const y0 = Hout / 2 + ((list.length - 1) * step) / 2;
          const xb = side < 0 ? -p.th(46) : B + p.th(46);
          list.forEach((it, i) => {
            const y = y0 - i * step;
            const xk = side < 0 ? -p.th(10) - i * p.th(1.6) : B + p.th(10) + i * p.th(1.6);
            p.bubble([xb, y], ctx.label(it.b), 6);
            p.poly([[xb - side * p.th(3), y], [xk, y], [xk, it.from[1]], it.from], "COTATION");
            p.circle(it.from, p.th(0.5), "ACIERS");
            const xt = xb + side * p.th(5);
            p.text([xt, y + p.th(1)], 2.2, barText(it.b), "TEXTE", side < 0 ? "right" : "left", 0, true);
            sketch(p, it.b, xt + side * p.th(15), y - p.th(4.2), p.th(18), p.th(4.5));
          });
        }
      }
      if (withDims) {
        p.chainH([0, ...cells.flatMap((cl) => [cl.x0, cl.x1]), B], 0, -p.th(32), false);
        p.dimH(0, B, 0, -p.th(39));
        p.chainV([0, inp.er, inp.er + inp.hInt, Hout], B, B + p.th(27), false);
      }
    },
  };
}

function hypotheses(pg: Page, ctx: Ctx, r: Region) {
  const inp = ctx.study.input;
  const mat = ctx.study.design.mat;
  pg.rect(r.x, r.y, r.w, r.h);
  pg.title(r.x + r.w / 2, r.y + r.h - 8, 4.4, "HYPOTHÈSES DE CALCUL", true);
  pg.text(r.x + r.w - 3, r.y + r.h - 8, 3.2, `RC ≥ ${mat.ls} Ø`, "right", true);
  const col1 = [`Matériau : Acier FeE${inp.fe}`, `Béton : C${inp.fc28}/${inp.fc28 + 5}`, `Fissuration ${inp.fissuration === "prejudiciable" ? "préjudiciable" : "très préjudiciable"}`];
  const col2 = [`Enrobage : ${cmTxt(inp.cover)} cm`, `Longueur de recouvrement : ${mat.ls} Ø`, "BAEL 91 mod. 99 — Fasc. 61 titre II — contrôle EC2"];
  if (r.w >= 150) {
    col1.forEach((s, i) => pg.text(r.x + 4, r.y + r.h - 17 - i * 6, 3.2, s, "left", true));
    col2.forEach((s, i) => pg.text(r.x + r.w * 0.45, r.y + r.h - 17 - i * 6, i === 2 ? 2.4 : 3.2, s, "left", i < 2));
  } else {
    [...col1, ...col2].forEach((s, i) => pg.text(r.x + 3, r.y + r.h - 16 - i * 5, i === 5 ? 1.9 : 2.6, s, "left", i !== 5));
  }
}

/** Bloc NOTES des plans de coffrage. */
function notesBox(pg: Page, ctx: Ctx, r: Region) {
  const inp = ctx.study.input;
  pg.rect(r.x, r.y, r.w, r.h);
  pg.text(r.x + 2, r.y + r.h - 4.5, 2.8, "NOTES :", "left", true);
  pg.line(r.x + 2, r.y + r.h - 5.3, r.x + 17, r.y + r.h - 5.3, "TEXTE");
  const lines = [
    "Cotes en centimètres, niveaux en mètres (± 0,000 = dessus du radier).",
    "Béton de propreté dosé à 150 kg/m³, épaisseur 10 cm.",
    `Béton armé C${inp.fc28}/${inp.fc28 + 5} dosé à 350 kg/m³ (CPJ 42,5) ; enrobage ${cmTxt(inp.cover)} cm.`,
    `Aciers HA FeE${inp.fe} ; recouvrements ${ctx.study.design.mat.ls} Ø.`,
    "Remblai latéritique compacté à 95 % OPM par couches de 20 cm.",
    "Cure humide 7 jours minimum ; badigeon bitumineux sur parements enterrés.",
  ];
  const size = r.w < 120 ? 1.8 : 2.1;
  lines.forEach((l, i) => pg.text(r.x + 3, r.y + r.h - 10 - i * (size * 1.75), size, `– ${l}`, "left"));
}

/**
 * Perspective axonométrique vectorielle de la maquette 3D (arêtes du béton, aciers barre par barre,
 * convoi et diffusion, enveloppe des moments) : elle passe telle quelle dans le DXF, le SVG et le PDF.
 */
function perspective(study: Study, o: Scene3DOptions, az = -0.7, el = 0.52, withLabels: false | "all" | "effort" = false): View {
  const gov = o.convoy ? governing(study, o.convoy) : null;
  const { scene, labels } = buildScene(study, o, gov);
  scene.updateMatrixWorld(true);
  const R = [Math.cos(az), 0, -Math.sin(az)];
  const U = [-Math.sin(el) * Math.sin(az), Math.cos(el), -Math.sin(el) * Math.cos(az)];
  const v = new THREE.Vector3();
  const pr = (): Pt => [v.x * R[0] + v.y * R[1] + v.z * R[2], v.x * U[0] + v.y * U[1] + v.z * U[2]];
  const segs: { a: Pt; b: Pt; layer: Layer }[] = [];
  scene.traverse((obj) => {
    const ud = obj.userData.layer as string | undefined;
    let geo: THREE.BufferGeometry | undefined;
    let layer: Layer | undefined;
    if ((obj as THREE.LineSegments).isLineSegments) {
      geo = (obj as THREE.LineSegments).geometry as THREE.BufferGeometry;
      layer = ud === "ACIERS" || ud === "MOMENTS_MAX" ? "ACIERS" : ud === "REPARTITION" ? "REPARTITION" : ud === "MOMENTS_MIN" ? "COTATION" : "COFFRAGE";
      if (ud === "PRESSIONS") layer = "TERRAIN";
    } else if ((obj as THREE.Mesh).isMesh && (ud === "DIFFUSION" || ud === "CONVOI")) {
      geo = new THREE.EdgesGeometry((obj as THREE.Mesh).geometry as THREE.BufferGeometry);
      layer = "TERRAIN";
    }
    const pos = geo?.getAttribute("position");
    if (!pos || !layer) return;
    for (let i = 0; i + 1 < pos.count; i += 2) {
      v.fromBufferAttribute(pos, i).applyMatrix4(obj.matrixWorld);
      const a = pr();
      v.fromBufferAttribute(pos, i + 1).applyMatrix4(obj.matrixWorld);
      segs.push({ a, b: pr(), layer });
    }
  });
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const sg of segs) for (const q of [sg.a, sg.b]) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); }
  if (!segs.length) { x0 = y0 = 0; x1 = y1 = 1; }
  return {
    ext: { x0, y0, w: x1 - x0, h: y1 - y0 },
    pad: { l: 4, r: 4, b: 4, t: 4 },
    draw: (p) => {
      for (const sg of segs) p.line(sg.a, sg.b, sg.layer);
      if (!withLabels) return;
      // Étiquettes de la maquette : texte encadré, rappel vers le point annoté.
      for (const l of labels.filter((x) => withLabels === "all" || x.kind === "effort")) {
        v.copy(l.p);
        const q = pr();
        const w = p.th(l.text.length * 1.18 + 2), h = p.th(3.2);
        const at: Pt = [q[0] + p.th(4), q[1] + p.th(4)];
        p.line(q, [at[0], at[1]], "COTATION");
        p.rect(at[0], at[1] - h / 2, w, h, l.kind === "effort" ? "COTATION" : l.kind === "load" ? "TERRAIN" : "CADRE");
        p.text([at[0] + w / 2, at[1] - p.th(0.75)], 1.9, l.text, l.kind === "effort" ? "COTATION" : l.kind === "load" ? "TERRAIN" : "TEXTE", "center", 0, true);
      }
    },
  };
}

const P3D_BASE: Scene3DOptions = { concrete: "transparent", fill: false, convoy: "", rebar: false, cut: false, efforts: false };

/** Planche « Perspectives 3D » 1/2 : maquette ferraillée pleine page. */
function perspectiveRebarSheet(pg: Page, ctx: Ctx, area: Region, below: boolean) {
  pg.place(area, perspective(ctx.study, { ...P3D_BASE, rebar: true }), { text: "MAQUETTE 3D FERRAILLÉE — TOUT LE FERRAILLAGE, BARRE PAR BARRE", pos: below ? "below" : "above", scale: false, size: 4 });
  pg.text(area.x + 3, below ? area.y + area.h - 5 : area.y + 3, 2, "Rouge : aciers principaux ; bleu : aciers de répartition. Corps, murs et radiers de tête, bêches, murs en aile, semelles et garde-corps. Perspective axonométrique, sans échelle.", "left");
}

/** Planche « Perspectives 3D » 2/2 : convoi, pressions et enveloppes d'efforts annotées. */
function perspectiveLoadsSheet(pg: Page, ctx: Ctx, area: Region, below: boolean) {
  const study = ctx.study;
  const cv = study.analysis.traffic.find((x) => x.positions.length)?.def.id ?? "";
  const cvLabel = study.analysis.traffic.find((x) => x.def.id === cv)?.def.label ?? "";
  const pos = below ? "below" : "above";
  const xm = area.x + area.w * 0.6;
  pg.line(xm, area.y, xm, area.y + area.h, "CADRE");
  pg.line(xm, area.y + area.h / 2, area.x + area.w, area.y + area.h / 2, "CADRE");
  pg.place({ x: area.x, y: area.y, w: xm - area.x, h: area.h }, perspective(study, { ...P3D_BASE, convoy: cv, pressures: true }, -0.7, 0.52, "all"),
    { text: cv ? `CONVOI ${cvLabel} À SA POSITION LA PLUS DÉFAVORABLE — CHARGES ET PRESSIONS` : "MAQUETTE 3D ANNOTÉE — PRESSIONS", pos, scale: false, size: 3.2 });
  pg.place({ x: xm, y: area.y + area.h / 2, w: area.x + area.w - xm, h: area.h / 2 }, perspective(study, { ...P3D_BASE, efforts: true }, -0.45, 0.35, "effort"),
    { text: "ENVELOPPE DES MOMENTS ELU", pos, scale: false, size: 3 });
  pg.place({ x: xm, y: area.y, w: area.x + area.w - xm, h: area.h / 2 }, perspective(study, { ...P3D_BASE, efforts: true, effortKind: "V" }, -0.45, 0.35, "effort"),
    { text: "ENVELOPPE DES EFFORTS TRANCHANTS ELU", pos, scale: false, size: 3 });
  const ly = (top: number, bottom: number) => (below ? top - 5 : bottom + 3);
  pg.text(area.x + 3, ly(area.y + area.h, area.y), 1.8, "Brun : roues et volumes de diffusion jusqu'au feuillet moyen, poussée des terres (Kmax, surcharge incluse), pression du sol (ELS). Bleu : valeurs d'efforts.", "left");
  pg.text(xm + 3, ly(area.y + area.h, area.y + area.h / 2), 1.8, "Rouge : moments positifs ; bleu : moments négatifs (kN·m/m).", "left");
  pg.text(xm + 3, ly(area.y + area.h / 2, area.y), 1.8, "Vert : efforts tranchants max / min (kN/m).", "left");
}

// ── Ouvrages de tête ───────────────────────────────────────

/** Vue en plan d'une tête (amont) : radier de tête, murs en aile, mur de tête, ferraillage. */
function vuePlanTete(ctx: Ctx, detail: boolean): View {
  const g = geo(ctx.study);
  const { inp, B, t, hg, radL, ept, d: db } = g;
  const c = inp.cover;
  const tan = t.murs ? g.tanA : 0;
  const acr = hg.across + (t.murs ? t.ep : 0) + 0.1 + db;
  const yMax = Math.max(radL, hg.along) + 0.1;
  const em = Math.max(ept, 0.2);
  return {
    ext: { x0: -acr, y0: -em - 0.5, w: B + 2 * acr, h: yMax + em + 0.5 },
    pad: { l: 26, r: 26, b: 8, t: 26 },
    draw: (p) => {
      // Corps coupé, mur de tête
      p.line([0, -em - 0.5], [0, -em], "COFFRAGE");
      p.line([B, -em - 0.5], [B, -em], "COFFRAGE");
      p.line([-p.th(4), -em - 0.5], [B + p.th(4), -em - 0.5], "AXES");
      const yw = db;
      p.rect(-yw, -em, B + 2 * yw, em, "COFFRAGE");
      const mt = ctx.bar("MUR DE TÊTE", "Face côté remblai");
      const mr = ctx.bar("MUR DE TÊTE", "Répartition");
      p.line([c, -c], [B - c, -c], "ACIERS");
      p.line([c, -em + c], [B - c, -em + c], "ACIERS");
      if (mt) tag(p, ctx, [B * 0.3, -c], [B * 0.3, yMax + p.th(14)], mt, 6);
      if (mr) tag(p, ctx, [B * 0.7, -em + c], [B * 0.7, yMax + p.th(14)], mr, 6);
      // Radier de tête
      if (radL > 0) {
        const xl = (y: number) => -db - y * tan, xr = (y: number) => B + db + y * tan;
        p.poly([[-db, 0], [B + db, 0], [xr(radL), radL], [xl(radL), radL]], "COFFRAGE", true);
        if (t.becheProf > 0) p.line([xl(radL - t.becheEp), radL - t.becheEp], [xr(radL - t.becheEp), radL - t.becheEp], "AXES");
        // Barres transversales arrêtées à la face intérieure des ailes (largeur d'aile en travers ép./cos α).
        const wW = t.murs ? t.ep / Math.cos(g.a) : 0;
        for (let y = c; y <= radL - c + 1e-9; y += 0.2) p.line([xl(y) + wW + c, y], [xr(y) - wW - c, y], "ACIERS");
        for (let x = xl(radL) + c; x <= xr(radL) - c + 1e-9; x += 0.2) {
          const y0 = x < -db && tan > 0 ? (-db - x) / tan : x > B + db && tan > 0 ? (x - B - db) / tan : 0;
          if (y0 < radL - c) p.line([x, y0 + c], [x, radL - c], "REPARTITION");
        }
        const ti = ctx.bar("RADIER DE TÊTE", "Nappe inférieure"), ts = ctx.bar("RADIER DE TÊTE", "Nappe supérieure"), tl = ctx.bar("RADIER DE TÊTE", "Barres longitudinales");
        const yb = Math.min(radL - c, 0.2 * Math.floor(radL * 0.5 / 0.2) + c);
        if (ti) tag(p, ctx, [xl(yb) + 0.3, yb], [B * 0.25, radL + p.th(10)], ti, 6);
        if (ts) tag(p, ctx, [xr(yb) - 0.3, yb], [B * 0.75, radL + p.th(10)], ts, 6);
        if (tl) tag(p, ctx, [B * 0.5 + 0.1, radL * 0.7], [B * 0.5 + 0.1, yMax + p.th(14)], tl, 6);
        const bc = ctx.bar("BÊCHE", "Cadres");
        if (bc) tag(p, ctx, [B * 0.15, radL - t.becheEp / 2], [B * 0.15, yMax + p.th(14)], bc, 6);
        p.dimV(0, radL, xr(radL), xr(radL) + p.th(6));
      }
      // Murs en aile : deux nappes et barres verticales vues en bout
      if (t.murs) {
        for (const side of [-1, 1] as const) {
          const x0 = side < 0 ? -db : B + db;
          const d: Pt = [side * Math.sin(g.a), Math.cos(g.a)];
          // Épaisseur vers l'intérieur : l'aile prolonge le voile.
          const nn: Pt = [-side * Math.cos(g.a), Math.sin(g.a)];
          const A: Pt = [x0, 0], E: Pt = [x0 + d[0] * t.long, d[1] * t.long];
          p.poly([A, E, [E[0] + nn[0] * t.ep, E[1] + nn[1] * t.ep], [A[0] + nn[0] * t.ep, A[1] + nn[1] * t.ep]], "COFFRAGE");
          if (db === 0) p.line([A[0] + nn[0] * t.ep, A[1] + nn[1] * t.ep], [side < 0 ? inp.eExt : B - inp.eExt, 0], "COFFRAGE");
          for (const o of [c, t.ep - c]) {
            p.line([A[0] + nn[0] * o, A[1] + nn[1] * o], [E[0] + nn[0] * o - d[0] * c, E[1] + nn[1] * o - d[1] * c], "REPARTITION");
          }
          const wv = ctx.bar("MUR EN L", "Voile — barres verticales côté remblai");
          const wh = ctx.bar("MUR EN L", "Voile — barres horizontales");
          dots(p, [A[0] + nn[0] * (t.ep - c - 0.015), A[1] + nn[1] * (t.ep - c - 0.015)], [E[0] + nn[0] * (t.ep - c - 0.015) - d[0] * c, E[1] + nn[1] * (t.ep - c - 0.015) - d[1] * c], wv?.s || 0.2);
          dots(p, [A[0] + nn[0] * (c + 0.015), A[1] + nn[1] * (c + 0.015)], [E[0] + nn[0] * (c + 0.015) - d[0] * c, E[1] + nn[1] * (c + 0.015) - d[1] * c], 0.2);
          const m: Pt = [A[0] + d[0] * t.long * 0.55 + nn[0] * t.ep, A[1] + d[1] * t.long * 0.55 + nn[1] * t.ep];
          if (wv) tag(p, ctx, m, [m[0] + side * p.th(16), m[1] + p.th(4)], wv, 6);
          const m2: Pt = [A[0] + d[0] * t.long * 0.3, A[1] + d[1] * t.long * 0.3];
          if (wh) tag(p, ctx, m2, [m2[0] + side * p.th(20), m2[1] - p.th(2)], wh, 6);
        }
        if (detail) {
          p.circle([0, 0], p.th(9), "COFFRAGE", true);
          leader(p, [-p.th(6), p.th(6)], [-acr - p.th(2), radL * 0.3 + p.th(10)], "Détail", 4);
        }
      }
      p.chainH([-hg.across - db, -db, 0, B, B + db, B + db + hg.across].filter((v, i, a) => i === 0 || v - a[i - 1] > 1e-6), -em - 0.5, -em - 0.5 - p.th(6), false);
    },
  };
}

/**
 * Détail de l'aile (ferraillage) en vue en plan : l'aile prolonge le voile, ses barres horizontales sont la
 * continuation, pliée, de celles du voile (deux faces), avec barres en ciseau dans l'angle rentrant. Repère
 * de la vue en plan de la tête : x en travers (x = 0 au nu extérieur du voile gauche), y le long de l'axe
 * (y = 0 à l'about de l'ouvrage, y > 0 vers le radier de tête) ; guide-roue / mur de tête sur y ∈ [−ép, 0].
 */
function detailAile(ctx: Ctx): View {
  const g = geo(ctx.study);
  const { inp, t } = g;
  const c = inp.cover;
  const e = inp.eExt;
  const db = g.d;
  const em = Math.max(g.ept, GUIDE_ROUE.w);
  const lw = Math.max(0.9, 4 * t.ep), lp = Math.max(0.6, 2.5 * e), lr = Math.max(0.6, 2 * e);
  const d: Pt = [-Math.sin(g.a), Math.cos(g.a)];
  const ni: Pt = [Math.cos(g.a), Math.sin(g.a)];
  const A: Pt = [-db, 0];
  const at = (s0: number, o: number): Pt => [A[0] + d[0] * s0 + ni[0] * o, A[1] + d[1] * s0 + ni[1] * o];
  const E = at(lw, 0);
  const x0 = Math.min(-db, E[0]) - 0.1;
  // Pli d'une barre de voile (x = xb) dans la nappe de l'aile décalée de o vers l'intérieur.
  const fold = (xb: number, o: number): Pt => {
    const sn = Math.sin(g.a);
    const s0 = sn > 1e-6 ? (A[0] + ni[0] * o - xb) / sn : 0;
    return at(s0, o);
  };
  return {
    ext: { x0, y0: -em - lp, w: e + lr - x0, h: em + lp + E[1] + 0.1 },
    pad: { l: 22, r: 26, b: 10, t: 6 },
    draw: (p) => {
      // ── Coffrage ──
      p.line([0, -em - lp], [0, db > 0 ? -em : 0], "COFFRAGE");
      p.line([e, -em - lp], [e, -em], "COFFRAGE");
      p.line([-p.th(3), -em - lp], [e + p.th(3), -em - lp], "AXES");
      p.poly([[e + lr, 0], [-db, 0], [-db, -em], [e + lr, -em]], "COFFRAGE");
      p.line([e + lr, p.th(2)], [e + lr, -em - p.th(2)], "AXES");
      hatch(p, -db, -em, db + e + lr, em, 1.6);
      p.line(A, E, "COFFRAGE");
      p.line(at(0, t.ep), at(lw, t.ep), "COFFRAGE");
      if (db === 0) p.line(at(0, t.ep), [e, 0], "COFFRAGE");
      p.line(E, at(lw, t.ep), "AXES");
      // ── Aciers ──
      const pe = ctx.study.design.groups.find((x) => x.id === "pext_ext");
      const pi = ctx.study.design.groups.find((x) => x.id === "pext_int");
      const hw = ctx.study.heads.headWall;
      const wing = g.hg.w;
      // Barres horizontales des deux faces : du voile, pliées dans l'aile (continuité).
      const ko = fold(c, c), ki = fold(e - c, t.ep - c);
      p.poly([[c, -em - lp], ko, at(lw - c, c)], "REPARTITION");
      p.poly([[e - c, -em - lp], ki, at(lw - c, t.ep - c)], "REPARTITION");
      // Barres verticales vues en bout.
      dots(p, [c + 0.015, -em - lp + 0.05], [c + 0.015, ko[1] - 0.05], pe?.bars.s ?? 0.15);
      dots(p, [e - c - 0.015, -em - lp + 0.05], [e - c - 0.015, Math.min(ki[1], -em) - 0.05], pi?.bars.s ?? 0.15);
      dots(p, at(Math.max(0.1, 0), c + 0.015), at(lw - 0.1, c + 0.015), wing?.bars.s ?? 0.15);
      dots(p, at(0.15, t.ep - c - 0.015), at(lw - 0.1, t.ep - c - 0.015), wing?.rep.s ?? 0.2);
      // Barres en ciseau dans l'angle rentrant (face intérieure voile / aile).
      p.poly([[e - c - 0.035, -0.55], [e - c - 0.035, ki[1] - 0.02], at(0.55, t.ep - c - 0.035)], "ACIERS");
      p.poly([[c + 0.035, -0.45], [c + 0.035, ko[1]], at(0.45, c + 0.035)], "ACIERS");
      // Mur de tête / guide-roue : deux nappes en about.
      p.line([c, -c], [e + lr, -c], "ACIERS");
      p.line([c, -em + c], [e + lr, -em + c], "ACIERS");
      dots(p, [c + 0.05, -c - 0.015], [e + lr - 0.05, -c - 0.015], hw.H > 0.3 ? hw.bars.s : 0.2);
      // ── Repères ──
      const B = (el: string, pre: string) => ctx.bar(el, pre);
      tag(p, ctx, at(lw * 0.75, c + 0.015), [at(lw * 0.75, 0)[0] - p.th(14), at(lw * 0.75, 0)[1]], B("MUR EN L", "Voile — barres verticales côté remblai"), 6);
      tag(p, ctx, at(lw * 0.5, t.ep - c - 0.015), [at(lw * 0.5, t.ep)[0] + p.th(16), at(lw * 0.5, t.ep)[1]], B("MUR EN L", "Voile — barres verticales face vue"), 6);
      tag(p, ctx, at(lw * 0.88, t.ep - c), [at(lw * 0.88, t.ep)[0] + p.th(16), at(lw * 0.88, t.ep)[1] + p.th(5)], B("MUR EN L", "Voile — barres horizontales"), 6);
      tag(p, ctx, at(0.4, t.ep - c - 0.035), [at(0.4, t.ep)[0] + p.th(34), at(0.4, t.ep)[1] - p.th(16)], B("MUR EN L", "Barres en ciseau"), 6);
      tag(p, ctx, [e + lr * 0.6, -c], [e + lr * 0.6, p.th(10)], B("MUR DE TÊTE", "Répartition") ?? B("GUIDE-ROUES", "Filants"), 6);
      tag(p, ctx, [c + 0.015, -em - lp * 0.6], [-p.th(16), -em - lp * 0.6], ctx.mark(repMap(ctx.study).get("pext_ext")), 6);
      tag(p, ctx, [e - c - 0.015, -em - lp * 0.45], [e + p.th(16), -em - lp * 0.45], ctx.mark(repMap(ctx.study).get("pext_int")), 6);
      // ── Cotes et noms ──
      p.dimH(0, e, -em - lp, -em - lp - p.th(4));
      p.dimV(-em, 0, e + lr, e + lr + p.th(4));
      const m = at(lw * 0.3, 0);
      p.line(m, at(lw * 0.3, t.ep), "COTATION");
      p.text([at(lw * 0.3, t.ep / 2)[0] + p.th(1.5), at(lw * 0.3, t.ep / 2)[1]], 2, cmTxt(t.ep), "COTATION", "left");
      p.text([e / 2, -em - lp * 0.25], 1.9, "Voile", "TEXTE", "center", 90);
      p.text([e + lr * 0.5, -em / 2 - p.th(0.7)], 1.9, g.ept > 0 ? "Mur de tête (guide-roue)" : "Guide-roue", "TEXTE", "center");
      p.text([e + lr * 0.55, lw * 0.75], 1.9, "Radier de tête", "TEXTE", "center");
    },
  };
}

/** Élévation du mur en aile (racine à gauche) avec son ferraillage. */
function elevationAile(ctx: Ctx): View | null {
  const g = geo(ctx.study);
  const { inp, t, hg } = g;
  const w = hg.w;
  if (!w || !t.murs) return null;
  const c = inp.cover;
  const lg = t.long;
  const se = t.semEp;
  const top = (x: number) => w.Htot + ((w.Hend - w.Htot) * x) / lg;
  return {
    ext: { x0: -0.3, y0: -se, w: lg + 0.3, h: w.Htot + se },
    pad: { l: 34, r: 26, b: 22, t: 22 },
    draw: (p) => {
      // Piédroit du corps à la racine, mur, semelle
      p.rect(-0.3, -se, 0.3, w.Htot + se, "COFFRAGE");
      p.line([-0.3, -se], [-0.3 - p.th(4), -se], "AXES");
      p.poly([[0, 0], [lg, 0], [lg, w.Hend], [0, w.Htot]], "COFFRAGE", true);
      p.rect(0, -se, lg, se, "COFFRAGE");
      hatch(p, 0, -se, lg, se, 2.2);
      const wv = ctx.bar("MUR EN L", "Voile — barres verticales côté remblai");
      const wf = ctx.bar("MUR EN L", "Voile — barres verticales face vue");
      const wh = ctx.bar("MUR EN L", "Voile — barres horizontales");
      const cis = ctx.bar("MUR EN L", "Barres en ciseau");
      const cou = ctx.bar("MUR EN L", "Couronnement");
      const sc = ctx.bar("MUR EN L", "Semelle — cadres");
      const sf = ctx.bar("MUR EN L", "Semelle — filants");
      for (let x = c; x <= lg - c + 1e-9; x += w.bars.s) p.line([x, -se + c], [x, top(x) - c], "ACIERS");
      for (let y = c; y <= w.Htot - c + 1e-9; y += w.rep.s) {
        const xMax = y <= w.Hend ? lg - c : (lg * (w.Htot - y)) / (w.Htot - w.Hend) - c;
        if (xMax > c) p.line([c, y], [xMax, y], "REPARTITION");
      }
      p.line([c, w.Htot - c], [lg - c, w.Hend - c], "ACIERS");
      p.line([c, -c], [lg - c, -c], "REPARTITION");
      p.line([c, -se + c], [lg - c, -se + c], "REPARTITION");
      for (let y = c; y <= Math.min(w.Htot, 1.5); y += 0.25) p.line([-0.3 + c, y], [0.6, y + 0.12], "ACIERS");
      if (wv) tag(p, ctx, [lg * 0.35, top(lg * 0.35) * 0.6], [lg * 0.35, w.Htot + p.th(14)], wv, 6);
      if (wf) tag(p, ctx, [lg * 0.55, top(lg * 0.55) * 0.5], [lg * 0.55, w.Htot + p.th(14)], wf, 6);
      if (wh) tag(p, ctx, [c + 0.1, w.Htot * 0.55], [-0.3 - p.th(16), w.Htot * 0.55], wh, 6);
      if (cis) tag(p, ctx, [0.3, 0.4], [-0.3 - p.th(16), 0.4], cis, 6);
      if (cou) tag(p, ctx, [lg * 0.2, top(lg * 0.2) - c], [lg * 0.2 - p.th(4), w.Htot + p.th(14)], cou, 6);
      if (sc) tag(p, ctx, [lg * 0.7, -se / 2], [lg * 0.7, -se - p.th(12)], sc, 6);
      if (sf) tag(p, ctx, [lg * 0.85, -c], [lg + p.th(14), -se * 0.2], sf, 6);
      // Repère de coupe 2-2
      const xs = lg * 0.45;
      p.line([xs, -se - p.th(6)], [xs, top(xs) + p.th(6)], "AXES");
      cutMark(p, [xs, top(xs) + p.th(6)], [-1, 0], "2");
      cutMark(p, [xs, -se - p.th(6)], [-1, 0], "2");
      p.dimH(0, lg, -se, -se - p.th(18));
      p.dimV(0, w.Hend, lg, lg + p.th(6));
      p.dimV(-se, 0, lg, lg + p.th(6));
      p.dimV(0, w.Htot, -0.3, -0.3 - p.th(26));
    },
  };
}

/** Section 2-2 du mur en aile (voile et semelle). */
function section22(ctx: Ctx): View | null {
  const g = geo(ctx.study);
  const { inp, t, hg } = g;
  const w = hg.w;
  if (!w || !t.murs) return null;
  const c = inp.cover;
  const H = w.Htot - (w.Htot - w.Hend) * 0.45;
  // Semelle côté ouvrage (sous le radier de tête), débord côté remblai = patin, comme la section 2-2 des plans types.
  const xa = t.ep + t.patin - t.semelle, xb = t.ep + t.patin;
  const se = t.semEp;
  return {
    ext: { x0: xa, y0: -se, w: t.semelle, h: H + se },
    pad: { l: 26, r: 26, b: 22, t: 16 },
    draw: (p) => {
      p.poly([[xa, -se], [xb, -se], [xb, 0], [t.ep, 0], [t.ep, H], [0, H], [0, 0], [xa, 0]], "COFFRAGE", true);
      p.rect(xa - 0.05, -se - 0.05, t.semelle + 0.1, 0.05, "TERRAIN");
      // Voile : barres verticales en L ancrées dans la semelle, horizontales vues en bout
      p.poly([[t.ep - c, H - c], [t.ep - c, -se + c + 0.02], [Math.min(xb - c, t.ep + 0.4), -se + c + 0.02]], "ACIERS");
      p.poly([[c, H - c], [c, -se + c + 0.02], [Math.max(xa + c, -0.4), -se + c + 0.02]], "ACIERS");
      p.line([c, H - c], [t.ep - c, H - c], "ACIERS");
      dots(p, [c + 0.015, c], [c + 0.015, H - c - 0.02], w.rep.s);
      dots(p, [t.ep - c - 0.015, c], [t.ep - c - 0.015, H - c - 0.02], w.rep.s);
      // Semelle : cadre et filants
      p.rect(xa + c, -se + c, t.semelle - 2 * c, se - 2 * c, "ACIERS");
      dots(p, [xa + c + 0.03, -c - 0.015], [xb - c - 0.03, -c - 0.015], 0.2);
      dots(p, [xa + c + 0.03, -se + c + 0.015], [xb - c - 0.03, -se + c + 0.015], 0.2);
      comb(p, [0, 0], [0, H], [-1, 0], w.rep.s);
      comb(p, [t.ep, 0], [t.ep, H], [1, 0], w.rep.s);
      comb(p, [xa, -se], [xb, -se], [0, -1], 0.2);
      const L = (pre: string) => ctx.bar("MUR EN L", pre);
      tag(p, ctx, [t.ep - c, H * 0.7], [t.ep + p.th(18), H * 0.7], L("Voile — barres verticales côté remblai"), 6);
      tag(p, ctx, [c, H * 0.7], [-p.th(18), H * 0.7], L("Voile — barres verticales face vue"), 6);
      tag(p, ctx, [t.ep - c - 0.015, H * 0.45], [t.ep + p.th(18), H * 0.45], L("Voile — barres horizontales"), 6);
      tag(p, ctx, [(xa + xb) / 2 + 0.2, -se + c], [(xa + xb) / 2 + 0.2, -se - p.th(14)], L("Semelle — cadres"), 6);
      tag(p, ctx, [xb - c - 0.1, -c - 0.015], [xb + p.th(14), -c], L("Semelle — filants"), 6);
      if (ctx.bar("MUR EN L", "Couronnement")) tag(p, ctx, [t.ep / 2, H - c], [t.ep / 2, H + p.th(10)], L("Couronnement"), 6);
      p.dimH(xa, xb, -se, -se - p.th(20));
      p.dimH(0, t.ep, H, H + p.th(4));
    },
  };
}

// ── Garde-corps ────────────────────────────────────────────

function elevationGC(ctx: Ctx): View {
  const g = geo(ctx.study);
  const { inp, B, Hout, cells, t } = g;
  const gr = g.hg.hHead;
  const murT = ctx.study.heads.headWall.H > 0.3;
  const Hb = Hout + gr;
  const G = GARDE_CORPS;
  const c = inp.cover;
  const posts = gardeCorpsPosts(B);
  const yb = Hout - inp.es - 0.6;
  return {
    ext: { x0: 0, y0: yb, w: B, h: Hb + G.h - yb },
    pad: { l: 22, r: 10, b: 30, t: 22 },
    draw: (p) => {
      p.rect(0, Hout - inp.es, B, inp.es, "COFFRAGE");
      for (const x of [0, ...cells.flatMap((cl) => [cl.x0, cl.x1]), B]) p.line([x, yb], [x, Hout - inp.es], "COFFRAGE");
      p.line([-p.th(3), yb], [B + p.th(3), yb], "AXES");
      if (gr > 0) {
        p.rect(0, Hout, B, gr, "COFFRAGE");
        p.text([B + p.th(2), Hout + gr / 2], 2, murT ? `Mur de tête ép. ${cmTxt(t.murTeteEp)} (guide-roue)` : `Guide-roue ${cmTxt(GUIDE_ROUE.w)} × ${cmTxt(GUIDE_ROUE.h)}`, "TEXTE");
      }
      for (const x of posts) {
        p.rect(x - G.post / 2, Hb, G.post, G.h - G.lisseH, "COFFRAGE");
        for (const s of [-1, 1]) p.poly([[x + s * (G.post / 2 - c), Hb - G.ancrage + 0.1], [x + s * (G.post / 2 - c), Hb + G.h - c]], "ACIERS");
        for (let y = Hb + 0.05; y <= Hb + G.h - G.lisseH; y += 0.15) p.line([x - G.post / 2 + c, y], [x + G.post / 2 - c, y], "REPARTITION");
      }
      const yl = Hb + G.h - G.lisseH;
      p.rect(0, yl, B, G.lisseH, "COFFRAGE");
      p.line([c, Hb + G.h - c], [B - c, Hb + G.h - c], "ACIERS");
      p.line([c, yl + c], [B - c, yl + c], "ACIERS");
      for (let x = c; x <= B - c + 1e-9; x += 0.2) p.line([x, yl + c], [x, Hb + G.h - c], "REPARTITION");
      const L = (el: string, pre: string) => ctx.bar(el, pre);
      const x1 = posts[1] ?? posts[0];
      tag(p, ctx, [x1 - G.post / 2 + c, Hb + 0.4], [x1 - G.post / 2 + c - p.th(3), Hb + G.h + p.th(14)], L("POTEAUX", "Barres verticales"), 6);
      tag(p, ctx, [x1, Hb + 0.2], [x1 + p.th(10), Hb + G.h + p.th(14)], L("POTEAUX", "Cadres"), 6);
      tag(p, ctx, [B * 0.5, Hb + G.h - c], [B * 0.5, Hb + G.h + p.th(14)], L("LISSE", "Filants"), 6);
      tag(p, ctx, [B * 0.5 + 0.3, yl + G.lisseH / 2], [B * 0.5 + 0.3 + p.th(10), Hb + G.h + p.th(14)], L("LISSE", "Cadres"), 6);
      const xm = (posts[0] + (posts[1] ?? B)) / 2;
      cutMark(p, [xm, yl + G.lisseH + p.th(3)], [0, -1], "1");
      cutMark(p, [posts[0] + 0.05, Hb + 0.3], [-1, 0], "2");
      p.chainH([0, ...cells.flatMap((cl) => [cl.x0, cl.x1]), B], yb, yb - p.th(10), false);
      p.dimH(0, B, yb, yb - p.th(18));
      p.dimV(Hb, Hb + G.h, 0, -p.th(8));
    },
  };
}

function coupeGC(ctx: Ctx, which: "lisse" | "poteau"): View {
  const G = GARDE_CORPS;
  const c = ctx.study.input.cover;
  const w = which === "lisse" ? G.lisseW : G.post, h = which === "lisse" ? G.lisseH : G.post;
  const L = (el: string, pre: string) => ctx.bar(el, pre);
  return {
    ext: { x0: 0, y0: 0, w, h },
    pad: { l: 8, r: 24, b: 16, t: 16 },
    draw: (p) => {
      p.rect(0, 0, w, h, "COFFRAGE");
      p.rect(c, c, w - 2 * c, h - 2 * c, "ACIERS");
      const r = p.th(1.3);
      for (const [x, y] of [[c + 0.012, c + 0.012], [w - c - 0.012, c + 0.012], [c + 0.012, h - c - 0.012], [w - c - 0.012, h - c - 0.012]] as Pt[]) p.circle([x, y], r, "ACIERS");
      const el = which === "lisse" ? "LISSE" : "POTEAUX";
      tag(p, ctx, [w - c - 0.012, h - c - 0.012], [w + p.th(16), h + p.th(8)], L(el, which === "lisse" ? "Filants" : "Barres verticales"), 7);
      tag(p, ctx, [w / 2, c], [w + p.th(16), -p.th(8)], L(el, "Cadres"), 7);
      p.dimH(0, w, 0, -p.th(5));
      p.dimV(0, h, 0, -p.th(4));
    },
  };
}

// ── Nomenclatures ──────────────────────────────────────────

type Col = { head: string; sub?: string; w: number };

function partVolume(study: Study, part: BarPart) {
  const lines = study.quantities.lines.filter((l) => l.lot === "Béton" && /^Béton armé/.test(l.designation));
  const isCorps = (d: string) => /corps du dalot/i.test(d);
  const isGc = (d: string) => /garde-corps/i.test(d);
  return lines.filter((l) => (part === "CORPS DU DALOT" ? isCorps(l.designation) : part === "GARDE-CORPS" ? isGc(l.designation) : !isCorps(l.designation) && !isGc(l.designation)))
    .reduce((s, l) => s + l.quantity, 0);
}

function byDiameter(bars: BarMark[]) {
  const m = new Map<number, { len: number; mass: number }>();
  for (const b of bars) {
    const r = m.get(b.phi) ?? { len: 0, mass: 0 };
    r.len += b.totalLength;
    r.mass += b.mass;
    m.set(b.phi, r);
  }
  return m;
}

/** Tableau de nomenclature (une ou deux colonnes de tableau sur la planche). Rend la hauteur occupée. */
function nomenclatureTable(pg: Page, ctx: Ctx, bars: BarMark[], r: Region, titleTxt: string, reserveB: number) {
  const cafe = ctx.model === "cafe";
  // La désignation (élément et rôle de la barre) précède le schéma coté, comme sur les nomenclatures types.
  const cols: Col[] = cafe
    ? [
      { head: "Pos.", w: 10 }, { head: "Nuance", sub: "d'acier", w: 13 }, { head: "Ø", w: 9 },
      { head: "Nombre", sub: "dans un élém.", w: 13 }, { head: "", sub: "élément", w: 11 }, { head: "", sub: "total", w: 11 },
      { head: "Esp", sub: "(m)", w: 10 }, { head: "Long.", sub: "(m)", w: 12 }, { head: "Long.", sub: "total (m)", w: 14 },
      { head: "Désignation", w: 50 }, { head: "Schéma (cm)", w: 42 },
    ]
    : [
      { head: "Repère", w: 11 }, { head: "Désignation", w: 50 }, { head: "HA", w: 9 }, { head: "Nombre", sub: "élém. × barres", w: 18 },
      { head: "Long.", sub: "1 barre (cm)", w: 15 }, { head: "Écart.", sub: "(cm)", w: 12 }, { head: "Nbre total", sub: "barres", w: 14 },
      { head: "Longueur", sub: "totale (m)", w: 15 }, { head: "CROQUIS", w: 42 },
    ];
  const tw = cols.reduce((s, c) => s + c.w, 0);
  const headH = 12, rowH = 10.5;
  const avail = r.h - 14 - headH - reserveB;
  const perCol = Math.max(1, Math.floor(avail / rowH));
  const nCols = bars.length > perCol && r.w >= 2 * tw + 6 ? 2 : 1;
  const per = nCols === 2 ? Math.ceil(bars.length / 2) : bars.length;
  const gap = nCols === 2 ? (r.w - 2 * tw) / 3 : (r.w - tw) / 2;
  pg.title(r.x + r.w / 2, r.y + r.h - 7, cafe ? 3.6 : 4.4, titleTxt, !cafe);
  let usedH = 0;
  for (let k = 0; k < nCols; k++) {
    const chunk = bars.slice(k * per, (k + 1) * per);
    const x0 = r.x + gap + k * (tw + gap);
    let y = r.y + r.h - 14;
    const xs = [x0];
    for (const c of cols) xs.push(xs[xs.length - 1] + c.w);
    pg.rect(x0, y - headH, tw, headH);
    cols.forEach((c, i) => {
      if (i > 0 && !(cafe && (i === 4 || i === 5))) pg.line(xs[i], y - headH, xs[i], y);
      else if (i > 0) pg.line(xs[i], y - headH, xs[i], y - headH / 2);
      const cx = (xs[i] + xs[i + 1]) / 2;
      if (c.head) pg.text(cafe && i === 3 ? (xs[3] + xs[6]) / 2 : cx, y - (c.sub ? 4.4 : 7.2), 2.1, c.head, "center", true);
      if (c.sub) pg.text(cx, y - 9.6, 1.8, c.sub, "center");
    });
    if (cafe) pg.line(xs[3], y - headH / 2, xs[6], y - headH / 2);
    y -= headH;
    for (const b of chunk) {
      const per1 = b.count / b.nElem;
      const desig = `${b.element.charAt(0)}${b.element.slice(1).toLocaleLowerCase("fr-FR")} : ${b.designation.charAt(0).toLocaleLowerCase("fr-FR")}${b.designation.slice(1)}`;
      const vals = cafe
        ? [ctx.label(b), `FeE${ctx.study.input.fe}`, String(b.phi), fmt(per1, 0), b.nElem > 1 ? `1x${b.nElem}` : "1", String(b.count),
          b.s > 0 ? fmt(b.s, 2) : b.spacingLabel, fmt(b.length), fmt(b.totalLength), ""]
        : [ctx.label(b), "", String(b.phi), b.nElem > 1 ? `${b.nElem}x${fmt(per1, 0)}` : fmt(per1, 0), String(Math.round(b.length * 100)),
          b.s > 0 ? String(Math.round(b.s * 100)) : b.spacingLabel, String(b.count), fmt(b.totalLength)];
      const di = cols.findIndex((c) => c.head === "Désignation");
      for (let i = 0; i < cols.length; i++) pg.rect(xs[i], y - rowH, cols[i].w, rowH);
      vals.forEach((v, i) => { if (v) pg.text((xs[i] + xs[i + 1]) / 2, y - rowH / 2 - 1, i === 0 ? 2.6 : 2.2, v, "center", i === 0); });
      const dl = wrap(desig, 34, 3);
      dl.forEach((l, k) => pg.text(xs[di] + 1.2, y - rowH / 2 + (dl.length - 1) * 1.5 - k * 3 - 0.6, 1.6, l, "left"));
      const last = cols.length - 1;
      sketch(pg.pen, b, pg.u((xs[last] + xs[last + 1]) / 2), pg.u(y - rowH / 2 - 0.5), pg.u(cols[last].w - 22), pg.u(rowH - 3.5));
      y -= rowH;
    }
    usedH = Math.max(usedH, 14 + headH + chunk.length * rowH);
  }
  return { usedH, x0: r.x + gap, tw: nCols === 2 ? 2 * tw + gap : tw };
}

/** Récapitulatif par diamètre (style du modèle). */
function recapTable(pg: Page, ctx: Ctx, bars: BarMark[], part: BarPart, x0: number, yTop: number, width: number) {
  const cafe = ctx.model === "cafe";
  const by = byDiameter(bars);
  const phis = cafe ? Array.from(by.keys()).sort((a, b) => a - b) : [6, 8, 10, 12, 14, 16, 20, 25];
  const total = bars.reduce((s, b) => s + b.mass, 0);
  const vol = partVolume(ctx.study, part);
  const labW = cafe ? 70 : 58;
  const cw = Math.min(18, (width - labW) / Math.max(phis.length, 1));
  const rh = 6;
  const w = labW + cw * phis.length;
  let y = yTop;
  pg.text(x0 + w / 2, y - 4.5, cafe ? 3 : 3.6, cafe ? "RÉCAPITULATIFS" : "RÉCAPITULATION", "center", true);
  y -= 7;
  const row = (lab: string, vals: string[], bold = false) => {
    pg.rect(x0, y - rh, labW, rh);
    pg.text(x0 + 1.5, y - rh + 1.8, 2, lab, "left", bold);
    vals.forEach((v, i) => {
      pg.rect(x0 + labW + i * cw, y - rh, cw, rh);
      pg.text(x0 + labW + (i + 0.5) * cw, y - rh + 1.8, 2, v, "center", bold);
    });
    y -= rh;
  };
  const merged = (lab: string, v: string, bold = true) => {
    pg.rect(x0, y - rh, labW, rh);
    pg.rect(x0 + labW, y - rh, cw * phis.length, rh);
    pg.text(x0 + 1.5, y - rh + 1.8, 2, lab, "left", bold);
    pg.text(x0 + labW + (cw * phis.length) / 2, y - rh + 1.8, 2.2, v, "center", bold);
    y -= rh;
  };
  const get = (phi: number) => by.get(phi);
  if (cafe) {
    row("Diamètres (HA)", phis.map((p) => `HA ${p}`), true);
    row("Longueur par diamètre (m)", phis.map((p) => fmt(get(p)?.len ?? 0)));
    row("Masse unitaire de la barre (kg/m)", phis.map((p) => fmt(barMass(p), 3)));
    row("Poids total par diamètre (kg)", phis.map((p) => fmt(get(p)?.mass ?? 0)));
    merged(`Masse totale par nuance d'acier FeE${ctx.study.input.fe} (kg)`, fmt(total));
    merged("Total d'acier (kg)", fmt(total));
    if (vol > 0) {
      merged("Volume béton (m³)", fmt(vol));
      merged("Ratio acier / béton (kg/m³)", fmt(total / vol, 1), false);
    }
  } else {
    row("DIAMÈTRES Ø", phis.map((p) => String(p)), true);
    row("Longueur totale HA (m)", phis.map((p) => (get(p) ? fmt(get(p)!.len) : "—")));
    row("Poids au ml (kg)", phis.map((p) => fmt(barMass(p), 3)));
    row("Poids total (kg)", phis.map((p) => (get(p) ? fmt(get(p)!.mass) : "—")));
    y -= 2;
    pg.text(x0, y - 5, 3, `TONNAGE TOTAL ACIER HA : ${fmt(total)} kg`, "left", true);
    if (vol > 0) pg.text(x0, y - 11, 2.4, `Volume béton : ${fmt(vol)} m³ — ratio ${fmt(total / vol, 1)} kg/m³`, "left");
    y -= 12;
  }
  return yTop - y;
}

/** Planches de nomenclature d'une partie (scindées si la liste est trop longue). */
function nomenclaturePages(ctx: Ctx, part: BarPart, titleTxt: string): ((pg: Page) => void)[] {
  const bars = ctx.study.quantities.bars.filter((b) => b.part === part);
  if (!bars.length) return [];
  const area = AREA[ctx.model];
  const recapH = ctx.model === "cafe" ? 60 : 44;
  const perPage = 2 * Math.floor((area.h - 14 - 12 - 4) / 10.5);
  const lastCap = 2 * Math.floor((area.h - 14 - 12 - recapH - 6) / 10.5);
  const chunks: BarMark[][] = [];
  let rest = bars.slice();
  while (rest.length > lastCap) { chunks.push(rest.slice(0, perPage)); rest = rest.slice(perPage); }
  chunks.push(rest);
  return chunks.map((chunk, i) => (pg: Page) => {
    const last = i === chunks.length - 1;
    const t = chunks.length > 1 ? `${titleTxt} (${i + 1}/${chunks.length})` : titleTxt;
    const { usedH, x0, tw } = nomenclatureTable(pg, ctx, chunk, area, t, last ? recapH + 6 : 0);
    if (last) recapTable(pg, ctx, bars, part, x0, area.y + area.h - usedH - 6, Math.max(tw, 180));
  });
}

// ── Pages de garde ─────────────────────────────────────────

function gardeCafe(pg: Page, ctx: Ctx, scaleTxt: string) {
  const id = ctx.study.input.ident;
  pg.rect(4, 4, 412, 289);
  const x0 = 12, w = 200, cx = x0 + w / 2;
  pg.rect(x0, 10, w, 277);
  let y = 280;
  pg.text(cx, y, 2.6, "RÉPUBLIQUE DE CÔTE D'IVOIRE", "center", true); y -= 3.5;
  pg.text(cx, y, 1.7, "Union – Discipline – Travail", "center"); y -= 9;
  wrap(up(id.ministere || "Ministère de tutelle"), 52, 3).forEach((l) => { pg.text(cx, y, 2.8, l, "center"); y -= 4; });
  y -= 5;
  pg.text(cx, y, 2.8, "MAÎTRE D'OUVRAGE", "center"); y -= 4;
  pg.text(cx, y, 2.4, up(id.maitreOuvrage || "—"), "center"); y -= 9;
  pg.text(cx, y, 2.8, "PROJET", "center"); y -= 4.5;
  wrap(up(id.marche || id.projet), 50, 4).forEach((l) => { pg.text(cx, y, 2.8, l, "center"); y -= 4; });
  y -= 4;
  pg.line(x0, y, x0 + w, y); y -= 14;
  pg.text(cx, y, 6.5, ctx.name, "center", true); y -= 8;
  pg.text(cx, y, 2.4, `ITINÉRAIRE : ${up(id.itineraire || id.localisation)}`, "center"); y -= 4;
  if (id.pk) { pg.text(cx, y, 2.4, `${id.ouvrage ? id.ouvrage + " — " : ""}${id.pk}`, "center"); y -= 4; }
  y -= 12;
  pg.text(cx, y, 6, "PLAN D'EXÉCUTION", "center", true); y -= 8;
  // Tableau des indices
  const tx = [x0, x0 + 26, x0 + 52, x0 + w];
  const rows = 9, rh = 4.4;
  pg.rect(x0, y - rh * (rows + 1), w, rh * (rows + 1));
  pg.line(x0, y - rh, x0 + w, y - rh);
  for (let i = 1; i < 3; i++) pg.line(tx[i], y - rh * (rows + 1), tx[i], y);
  pg.text((tx[0] + tx[1]) / 2, y - rh + 1.2, 2, "Date", "center");
  pg.text((tx[1] + tx[2]) / 2, y - rh + 1.2, 2, "Indices", "center");
  pg.text((tx[2] + tx[3]) / 2, y - rh + 1.2, 2, "Objet des modifications", "center");
  for (let i = 2; i <= rows; i++) pg.line(x0, y - rh * i, x0 + w, y - rh * i);
  pg.text((tx[0] + tx[1]) / 2, y - rh * (rows + 1) + 1.2, 1.9, up(ctx.date), "center");
  pg.text((tx[1] + tx[2]) / 2, y - rh * (rows + 1) + 1.2, 1.9, id.indice || "A", "center");
  pg.text((tx[2] + tx[3]) / 2, y - rh * (rows + 1) + 1.2, 1.9, "CRÉATION DU DOCUMENT", "center");
  y -= rh * (rows + 1) + 8;
  pg.text(cx, y, 2.4, `Échelle : ${scaleTxt}`, "center"); y -= 4;
  pg.line(x0, y, x0 + w, y);
  pg.line(cx, 10, cx, y);
  pg.text((x0 + cx) / 2, y - 5, 2.3, "ENTREPRISE D'EXÉCUTION", "center");
  pg.text((cx + x0 + w) / 2, y - 5, 2.3, "BUREAU DE CONTRÔLE", "center");
  wrap(id.entreprise || "—", 26, 3).forEach((l, i) => pg.text((x0 + cx) / 2, y - 16 - i * 4, 3, l, "center", true));
  wrap(id.maitreOeuvre || "—", 26, 3).forEach((l, i) => pg.text((cx + x0 + w) / 2, y - 16 - i * 4, 3, l, "center", true));
  pg.text((x0 + cx) / 2, 14, 1.8, `Conception : ${id.auteur}`, "center");
  // Sommaire à droite
  const sx = 232;
  pg.text(sx, 270, 4, "SOMMAIRE DU DOSSIER", "left", true);
  pg.line(sx, 268.5, sx + 90, 268.5, "TEXTE");
  return { sx, y: 260 };
}

// ── Assemblage ─────────────────────────────────────────────

type Builder = { id: string; title: string; role?: Sheet["role"]; draw: (pg: Page, idx: number, total: number) => void; cover?: boolean };

export function buildModelSheets(study: Study, model: Model): Sheet[] {
  const ctx = makeCtx(study, model);
  const g = geo(study);
  const nm = ctx.name;
  const area = AREA[model];
  const list: Builder[] = [];
  const wing = !!g.hg.w && g.t.murs;
  const tete = study.quantities.bars.some((b) => b.part === "OUVRAGE DE TÊTE");
  const gcBars = study.quantities.bars.some((b) => b.part === "GARDE-CORPS");

  if (model === "cafe") {
    list.push({ id: "garde", title: "Page de garde", cover: true, draw: () => undefined });
    list.push({
      id: "vue-plan", title: "Vue en plan", role: "coffrage",
      draw: (pg) => {
        const xd = area.x + area.w * 0.74;
        pg.line(xd, 42, xd, 289);
        pg.place({ x: area.x, y: area.y, w: xd - area.x - 2, h: area.h }, vuePlan(study, true), { text: `VUE EN PLAN DU ${nm}`, pos: "below" });
        pg.place({ x: xd + 2, y: area.y + 56, w: area.x + area.w - xd - 4, h: area.h - 62 }, detailRaccord(study), { text: "Détail", pos: "below", scale: true });
        notesBox(pg, ctx, { x: xd + 3, y: area.y + 3, w: area.x + area.w - xd - 6, h: 48 });
      },
    });
    list.push({
      id: "coupes", title: "Coupes A-A, B-B et élévation de la tête",
      draw: (pg) => {
        const xd = area.x + area.w * 0.58;
        pg.line(xd, 42, xd, 289);
        pg.line(8, area.y + area.h * 0.45, xd, area.y + area.h * 0.45);
        pg.place({ x: area.x, y: area.y + area.h * 0.45, w: xd - area.x, h: area.h * 0.55 }, coupeLong(study), { text: `Coupe A-A du ${nm}`, pos: "below" });
        pg.place({ x: area.x, y: area.y, w: xd - area.x, h: area.h * 0.45 }, coupeTrans(study), { text: `Coupe B-B du ${nm}`, pos: "below" });
        pg.place({ x: xd, y: area.y + 30, w: area.x + area.w - xd, h: area.h - 50 }, elevationTete(study), { text: "ÉLÉVATION DE LA TÊTE", pos: "below", size: 4.4 });
      },
    });
    list.push({
      id: "ferraillage", title: "Plan de ferraillage du corps", role: "ferraillage",
      draw: (pg) => {
        pg.place({ x: area.x, y: area.y + 16, w: area.w * 0.74, h: area.h - 16 }, sectionFerraillage(ctx, false, true));
        hypotheses(pg, ctx, { x: area.x + area.w * 0.75, y: area.y + area.h * 0.45, w: area.w * 0.25 - 2, h: 46 });
        pg.title(area.x + area.w * 0.5, area.y + 7, 6, `PLAN DE FERRAILLAGE_${nm}`);
        pg.text(area.x + area.w * 0.875, area.y + area.h * 0.45 - 8, 2.4, `Longueur de l'ouvrage L = ${fmt(study.input.L)} m`, "center");
      },
    });
    for (const f of nomenclaturePages(ctx, "CORPS DU DALOT", `Nomenclature des aciers _ corps du ${nm}`)) {
      list.push({ id: `nomenclature-corps-${list.length}`, title: "Nomenclature du corps", draw: (pg) => f(pg) });
    }
    if (tete) {
      list.push({
        id: "ferraillage-tete", title: "Ferraillage de la tête",
        draw: (pg) => {
          const xd = area.x + area.w * 0.68;
          pg.line(xd, 42, xd, 289);
          pg.place({ x: area.x, y: area.y, w: xd - area.x - 2, h: area.h }, vuePlanTete(ctx, wing), { text: `FERRAILLAGE TÊTE ${nm}`, pos: "below" });
          if (wing) pg.place({ x: xd + 2, y: area.y, w: area.x + area.w - xd - 4, h: area.h }, detailAile(ctx), { text: "Détail Aile", pos: "below", size: 3.4 });
        },
      });
    }
    if (wing) {
      list.push({
        id: "mur-aile", title: "Ferraillage du mur en aile",
        draw: (pg) => {
          const xd = area.x + area.w * 0.6;
          pg.line(xd, 42, xd, 289);
          pg.place({ x: area.x, y: area.y, w: xd - area.x - 2, h: area.h }, elevationAile(ctx)!, { text: `FERRAILLAGE MUR EN AILE ${nm}`, pos: "below" });
          pg.place({ x: xd + 2, y: area.y, w: area.x + area.w - xd - 4, h: area.h }, section22(ctx)!, { text: "SECTION 2-2", pos: "below", size: 4.4 });
        },
      });
    }
    for (const f of nomenclaturePages(ctx, "OUVRAGE DE TÊTE", `GRILLE TÊTE _ ${nm}`)) {
      list.push({ id: `grille-tete-${list.length}`, title: "Grille tête (nomenclature)", draw: (pg) => f(pg) });
    }
  } else {
    list.push({ id: "titre", title: "Titre", cover: true, draw: () => undefined });
    list.push({
      id: "coffrage", title: "Ensemble coffrage", role: "coffrage",
      draw: (pg) => {
        const top = area.y + area.h * 0.66;
        pg.place({ x: area.x, y: top, w: area.w * 0.58, h: area.y + area.h - top }, coupeLong(study), { text: "COUPE AA", pos: "above" });
        pg.place({ x: area.x + area.w * 0.58, y: top, w: area.w * 0.42, h: area.y + area.h - top }, coupeTrans(study), { text: "COUPE BB", pos: "above" });
        pg.place({ x: area.x, y: area.y, w: area.w * 0.58, h: top - area.y }, vuePlan(study, false), { text: "VUE EN PLAN", pos: "above" });
        pg.place({ x: area.x + area.w * 0.6, y: area.y + 40, w: area.w * 0.36, h: top - area.y - 44 }, detailRaccord(study), { text: 'DÉTAIL "1"', pos: "above" });
        notesBox(pg, ctx, { x: area.x + area.w * 0.6, y: area.y + 2, w: area.w * 0.38, h: 34 });
      },
    });
    list.push({
      id: "corps", title: "Ferraillage du corps", role: "ferraillage",
      draw: (pg) => {
        pg.title(area.x + area.w / 2, area.y + area.h - 12, 7, "CORPS D'OUVRAGE", true);
        pg.text(area.x + area.w / 2, area.y + area.h - 20, 3, `Longueur = ${fmt(study.input.L)} m`, "center", true);
        pg.place({ x: area.x, y: area.y, w: area.w, h: area.h - 24 }, sectionFerraillage(ctx, true));
      },
    });
    for (const f of nomenclaturePages(ctx, "CORPS DU DALOT", "NOMENCLATURE DES ACIERS DU CORPS")) {
      list.push({ id: `nomenclature-corps-${list.length}`, title: "Nomenclature du corps", draw: (pg) => f(pg) });
    }
    if (gcBars) {
      list.push({
        id: "garde-corps", title: "Ferraillage des garde-corps",
        draw: (pg) => {
          pg.title(area.x + area.w / 2, area.y + area.h - 10, 6, "FERRAILLAGE DES GARDE-CORPS");
          pg.place({ x: area.x, y: area.y + area.h * 0.4, w: area.w, h: area.h * 0.6 - 16 }, elevationGC(ctx), { text: "COUPE B-B", pos: "above" });
          pg.place({ x: area.x + area.w * 0.1, y: area.y, w: area.w * 0.35, h: area.h * 0.38 }, coupeGC(ctx, "lisse"), { text: "COUPE 1-1", pos: "above" });
          pg.place({ x: area.x + area.w * 0.55, y: area.y, w: area.w * 0.35, h: area.h * 0.38 }, coupeGC(ctx, "poteau"), { text: "COUPE 2-2", pos: "above" });
        },
      });
      for (const f of nomenclaturePages(ctx, "GARDE-CORPS", "NOMENCLATURE DES ACIERS DU GARDE-CORPS")) {
        list.push({ id: `nomenclature-gc-${list.length}`, title: "Nomenclature du garde-corps", draw: (pg) => f(pg) });
      }
    }
    if (tete) {
      list.push({
        id: "tetes", title: "Ferraillage des ouvrages de tête",
        draw: (pg) => {
          const mid = area.y + area.h * 0.5;
          pg.place({ x: area.x + area.w * 0.12, y: mid, w: area.w * 0.76, h: area.h * 0.5 }, vuePlanTete(ctx, wing), { text: "VUE EN PLAN", pos: "above" });
          if (wing) {
            pg.place({ x: area.x, y: area.y, w: area.w * 0.46, h: mid - area.y }, elevationAile(ctx)!, { text: "ÉLÉVATION", pos: "above" });
            pg.place({ x: area.x + area.w * 0.46, y: area.y, w: area.w * 0.27, h: mid - area.y }, detailAile(ctx), { text: 'DÉTAIL "1"', pos: "above" });
            pg.place({ x: area.x + area.w * 0.73, y: area.y, w: area.w * 0.27, h: mid - area.y }, section22(ctx)!, { text: "COUPE A-A", pos: "above" });
          }
        },
      });
      for (const f of nomenclaturePages(ctx, "OUVRAGE DE TÊTE", "NOMENCLATURE DES ACIERS DES OUVRAGES DE TÊTE")) {
        list.push({ id: `nomenclature-tetes-${list.length}`, title: "Nomenclature des têtes", draw: (pg) => f(pg) });
      }
    }
  }
  // Garde-corps dans le modèle Bangolo (absents des plans d'origine) : mêmes planches, en fin de dossier.
  if (model === "cafe" && gcBars) {
    list.push({
      id: "garde-corps", title: "Ferraillage des garde-corps",
      draw: (pg) => {
        pg.place({ x: area.x, y: area.y + area.h * 0.4, w: area.w, h: area.h * 0.6 }, elevationGC(ctx), { text: `FERRAILLAGE DES GARDE-CORPS ${nm}`, pos: "below" });
        pg.place({ x: area.x + area.w * 0.1, y: area.y, w: area.w * 0.35, h: area.h * 0.38 }, coupeGC(ctx, "lisse"), { text: "COUPE 1-1", pos: "below" });
        pg.place({ x: area.x + area.w * 0.55, y: area.y, w: area.w * 0.35, h: area.h * 0.38 }, coupeGC(ctx, "poteau"), { text: "COUPE 2-2", pos: "below" });
      },
    });
    for (const f of nomenclaturePages(ctx, "GARDE-CORPS", `Nomenclature des aciers _ garde-corps du ${nm}`)) {
      list.push({ id: `nomenclature-gc-${list.length}`, title: "Nomenclature du garde-corps", draw: (pg) => f(pg) });
    }
  }

  // Perspectives 3D (maquette ferraillée, convoi, moments), en fin de dossier.
  list.push({ id: "perspectives-3d", title: "Perspectives 3D — maquette ferraillée", draw: (pg) => perspectiveRebarSheet(pg, ctx, area, model === "cafe") });
  list.push({ id: "perspectives-charges", title: "Perspectives 3D — charges et sollicitations", draw: (pg) => perspectiveLoadsSheet(pg, ctx, area, model === "cafe") });

  // Rendu : chaque planche à droite de la précédente, cartouche selon le modèle.
  const total = list.length;
  const out: Sheet[] = [];
  const pages: { b: Builder; pg: Page }[] = [];
  list.forEach((b, i) => {
    const pg = new Page([i * ((PW + 20) / 1000) * S, 0]);
    if (!b.cover) b.draw(pg, i + 1, total);
    pages.push({ b, pg });
  });
  const s0 = pages.find((x) => x.b.role === "coffrage")?.pg.scales[0];
  const mainScale = s0 ? `1/${s0}` : "VAR";
  pages.forEach(({ b, pg }, i) => {
    const idx = i + 1;
    if (b.cover) {
      if (model === "cafe") {
        const { sx, y } = gardeCafe(pg, ctx, mainScale);
        pages.slice(1).forEach(({ b: o }, k) => pg.text(sx, y - k * 6, 3, `${study.input.ident.numPlan}-${String(k + 2).padStart(2, "0")}   ${o.title}`, "left"));
      } else {
        pg.rect(4, 4, 412, 289);
        pg.rect(80, 125, 260, 40);
        pg.text(210, 141, 9, `PLAN ${nm} : L = ${fmt(study.input.L)} m`, "center");
        pg.text(210, 110, 3, `${study.input.ident.ouvrage}${study.input.ident.pk ? " — " + study.input.ident.pk : ""}`, "center");
        pages.slice(1).forEach(({ b: o }, k) => pg.text(130, 90 - k * 5.5, 2.8, `${study.input.ident.numPlan}-${String(k + 2).padStart(2, "0")}   ${o.title}`, "left"));
        pg.text(210, 12, 2, `Conception : ${study.input.ident.auteur} — ${ctx.date}`, "center");
      }
    } else if (model === "cafe") {
      cartoucheCafe(pg, ctx, b.title, idx, total);
    } else {
      cartouchePaia(pg, ctx, b.title, idx, pg.scaleLabel());
    }
    out.push(pg.sheet(b.id, b.title, b.role));
  });
  return out;
}
