/**
 * Dossier de plans d'exécution, sur le modèle des plans types ivoiriens (D07.1 / D07.2) :
 *  1. Plan de coffrage : vue en plan, coupe A-A (longitudinale), coupe B-B (transversale),
 *     vue de face ; cotes en centimètres, épaisseurs cerclées, terrain naturel hachuré.
 *  2. Plan de ferraillage : coupe B-B et coupe A-A repérées, mur en L, ferraillage du radier
 *     et de la dalle en vue en plan, tableaux « Aciers » et « Indications générales ».
 *  3. Nomenclature des armatures (A4) : par élément, croquis de façonnage cotés, totaux et
 *     récapitulatif par diamètre.
 * Chaque planche porte un cartouche PROJET / ENTREPRISE – CONCEPTEUR / PK, TITRE, N°, ÉCH, DATE.
 */

import { barMass } from "./ba";
import {
  bodyBars, cellOutline, cmTxt, fmt, geometry, Pen, repMap, type BarKind, type Pt, type Sheet,
} from "./drawings";
import type { Study } from "./engine";
import { BAR_PARTS, steelSummary, type BarMark } from "./quantities";
import { buildModelSheets } from "./plans-modeles";

export const A3: Pt = [0.42, 0.297];
const A4: Pt = [0.21, 0.297];
export const SCALES = [20, 25, 30, 40, 50, 75, 100, 125, 150, 200, 250];

export function headGeom(study: Study) {
  const inp = study.input;
  const t = inp.tetes;
  const a = (t.angle * Math.PI) / 180;
  const w = study.heads.wing;
  const hHead = study.heads.headWall.H > 0.3 ? study.heads.headWall.H : t.guideRoues ? 0.4 : 0;
  const Hend = w ? w.Hend : 0;
  return { t, a, w, hHead, Hend, along: t.murs ? t.long * Math.cos(a) : 0, across: t.murs ? t.long * Math.sin(a) : 0 };
}

/** Cartouche en bandeau bas, comme sur les plans types. */
function cartouche(pen: Pen, study: Study, W: number, title: string, num: string, scaleTxt: string) {
  const id = study.input.ident;
  const m = pen.th(8);
  const h = pen.th(36);
  const x0 = m, y0 = m, w = W - 2 * m;
  pen.rect(x0, y0, w, h, "CADRE");
  const c1 = x0 + w * 0.34, c2 = x0 + w * 0.58;
  pen.line([c1, y0], [c1, y0 + h], "CADRE");
  pen.line([c2, y0], [c2, y0 + h], "CADRE");
  pen.line([x0, y0 + h - pen.th(9)], [x0 + w, y0 + h - pen.th(9)], "CADRE");
  pen.text([(x0 + c1) / 2, y0 + h - pen.th(6.5)], 3.6, "PROJET", "TEXTE", "center", 0, true);
  pen.text([(c1 + c2) / 2, y0 + h - pen.th(6.5)], 3.6, "ENTREPRISE / CONCEPTEUR", "TEXTE", "center", 0, true);
  pen.text([(c2 + x0 + w) / 2, y0 + h - pen.th(6.5)], 3.6, "OUVRAGE", "TEXTE", "center", 0, true);
  const wrap = (s: string, n: number) => {
    const words = s.split(/\s+/);
    const lines: string[] = [];
    let cur = "";
    for (const wd of words) {
      if ((cur + " " + wd).trim().length > n) { lines.push(cur.trim()); cur = wd; } else cur += " " + wd;
    }
    if (cur.trim()) lines.push(cur.trim());
    return lines.slice(0, 4);
  };
  wrap(`${id.projet} — ${id.localisation}`, 52).forEach((l, i) => pen.text([(x0 + c1) / 2, y0 + h - pen.th(15 + i * 4.5)], 2.6, l, "TEXTE", "center"));
  pen.text([(x0 + c1) / 2, y0 + pen.th(3)], 2.2, `Maître d'ouvrage : ${id.maitreOuvrage}${id.maitreOeuvre ? ` — Contrôle : ${id.maitreOeuvre}` : ""}`, "TEXTE", "center");
  pen.text([(c1 + c2) / 2, y0 + h - pen.th(16)], 3.4, id.entreprise || "—", "TEXTE", "center", 0, true);
  pen.text([(c1 + c2) / 2, y0 + h - pen.th(23)], 2.6, `Conception : ${id.auteur}`, "TEXTE", "center");
  pen.text([(c1 + c2) / 2, y0 + pen.th(3)], 2, `Empreinte ${study.fingerprint} — DalotPro`, "TEXTE", "center");
  // Sous-tableau PK | TITRE | N° | ÉCH | DATE
  const cols = [0.12, 0.52, 0.12, 0.1, 0.14];
  const heads = ["PK", "TITRE", "N°", "ÉCH", "DATE"];
  const r = x0 + w - c2;
  const yMid = y0 + h - pen.th(15);
  pen.line([c2, yMid], [x0 + w, yMid], "CADRE");
  let x = c2;
  const date = new Date().toLocaleDateString("fr-FR");
  const vals = [id.pk || "—", "", num, scaleTxt, date];
  cols.forEach((f, i) => {
    const cw = r * f;
    if (i > 0) pen.line([x, y0], [x, yMid + pen.th(6)], "CADRE");
    pen.text([x + cw / 2, yMid + pen.th(1.8)], 2.4, heads[i], "TEXTE", "center", 0, true);
    if (i === 1) {
      wrap(title, 34).forEach((l, k) => pen.text([x + cw / 2, yMid - pen.th(5 + k * 4)], 2.6, l, "TEXTE", "center", 0, k === 0));
      pen.text([x + cw / 2, y0 + pen.th(2.5)], 2.2, `${study.input.ident.ouvrage} — indice ${id.indice || "A"}`, "TEXTE", "center");
    } else {
      pen.text([x + cw / 2, yMid - pen.th(9)], 2.6, vals[i], "TEXTE", "center");
    }
    x += cw;
  });
  return y0 + h; // haut du cartouche
}

function sheetFrame(pen: Pen, W: number, H: number) {
  pen.rect(0, 0, W, H, "CADRE");
  pen.rect(pen.th(5), pen.th(5), W - pen.th(10), H - pen.th(10), "CADRE");
}

function title(pen: Pen, x: number, y: number, s: string) {
  pen.text([x, y], 4, s, "TEXTE", "center", 0, true);
  pen.line([x - pen.th(s.length * 1.15), y - pen.th(1.2)], [x + pen.th(s.length * 1.15), y - pen.th(1.2)], "TEXTE");
}

function pickScale(views: { w: number; h: number }[], boxW: number, boxH: number) {
  for (const s of SCALES) {
    if (views.every((v) => v.w / s <= boxW && v.h / s <= boxH)) return s;
  }
  return SCALES[SCALES.length - 1];
}

// ── 1. Plan de coffrage ────────────────────────────────────

function sheetCoffrage(study: Study, origin: Pt, num: string): Sheet {
  const inp = study.input;
  const { B, Hout, cells } = geometry(study);
  const hg = headGeom(study);
  const { t, hHead } = hg;
  const L = inp.L;
  const Lt = L + 2 * t.radierLong;
  const yTop = Hout + hHead;
  // Gabarits des quatre vues (m), marges de cotation comprises.
  const plan = { w: L + 2 * Math.max(t.radierLong, hg.along) + 1.6, h: B + 2 * hg.across + 1.6 };
  const coupeA = { w: Lt + 1.6, h: yTop + t.becheProf + 1.4 };
  const coupeB = { w: B + 2 * hg.across + 1.8, h: yTop + 1.4 };
  const scale = pickScale([plan, coupeA, coupeB], 0.19, 0.105);
  const W = A3[0] * scale, H = A3[1] * scale;
  const pen = new Pen(origin[0], origin[1], scale);
  sheetFrame(pen, W, H);
  const top = cartouche(pen, study, W, "PLAN DE COFFRAGE — vue en plan, coupes A-A et B-B, vue de face", `${num}.1`, `1/${scale}`);
  const qW = (W - pen.th(20)) / 2, qH = (H - top - pen.th(14)) / 2;
  const qx = (i: number) => pen.th(10) + (i % 2) * qW;
  const qy = (i: number) => top + pen.th(4) + (i < 2 ? qH : 0);
  const subs: Pen[] = [];
  const at = (i: number, w: number, h: number, dx = 0, dy = 0) => {
    const p = new Pen(origin[0] + qx(i) + (qW - w) / 2 + dx, origin[1] + qy(i) + (qH - h) / 2 + dy, scale);
    subs.push(p);
    return p;
  };
  const bub = (p: Pen, c: Pt, m: number) => p.bubble(c, cmTxt(m), 5.5);

  // Vue en plan : x le long de l'écoulement, y en travers.
  {
    const p = at(0, L, B, 0, pen.th(2));
    const x0 = 0, x1 = L;
    p.rect(x0, 0, L, B, "COFFRAGE");
    for (const c of cells) {
      p.line([x0, c.x0], [x1, c.x0], "AXES");
      p.line([x0, c.x1], [x1, c.x1], "AXES");
    }
    for (const side of [-1, 1] as const) {
      const xe = side < 0 ? 0 : L;
      if (hHead > 0) p.rect(side < 0 ? -t.murTeteEp : L, 0, t.murTeteEp, B, "COFFRAGE");
      if (t.radierLong > 0) {
        const wl = hg.across > 0 ? t.radierLong * Math.tan(hg.a) : 0;
        p.poly([[xe, -t.debord], [xe + side * t.radierLong, -t.debord - wl], [xe + side * t.radierLong, B + t.debord + wl], [xe, B + t.debord]], "COFFRAGE", true);
      }
      if (t.murs) {
        for (const edge of [0, B]) {
          const sy = edge === 0 ? -1 : 1;
          const ex = xe + side * hg.along, ey = edge + sy * hg.across;
          p.line([xe, edge], [ex, ey], "COFFRAGE");
          p.line([xe, edge + sy * t.ep], [ex, ey + sy * t.ep], "COFFRAGE");
          p.line([ex, ey], [ex, ey + sy * t.ep], "COFFRAGE");
          bub(p, [(xe + ex) / 2 + side * 0.15, (edge + ey) / 2 + sy * 0.45], t.ep);
          p.text([xe + side * 0.5, edge + sy * 0.15], 2, `${Math.round(t.angle)}°`, "COTATION", "center");
        }
      }
    }
    bub(p, [L / 2, B / 2], inp.es);
    p.line([-0.8 - hg.along, B / 2], [L + 0.8 + hg.along, B / 2], "AXES");
    p.text([-0.6 - hg.along, B / 2 + 0.1], 2.4, "AMONT", "TEXTE");
    p.text([L + 0.6 + hg.along, B / 2 + 0.1], 2.4, "AVAL", "TEXTE", "right");
    p.chainH([-hg.along || -t.radierLong, 0, L, L + (hg.along || t.radierLong)], 0, -hg.across - p.th(6));
    p.chainV([0, ...cells.flatMap((c) => [c.x0, c.x1]), B], L + Math.max(hg.along, t.radierLong), L + Math.max(hg.along, t.radierLong) + p.th(6));
    title(pen, qx(0) + qW / 2, qy(0) + qH - pen.th(3), "VUE EN PLAN");
  }

  // Coupe B-B (transversale) avec les murs en aile vus en arrière-plan.
  {
    const p = at(1, B + 2 * hg.across, yTop, hg.across, pen.th(3));
    p.rect(0, 0, B, Hout, "COFFRAGE");
    for (const c of cells) p.poly(cellOutline(c.x0, c.x1, inp.er, inp.er + inp.hInt, inp.gousset), "COFFRAGE", true);
    if (hHead > 0) p.rect(0, Hout, B, hHead, "COFFRAGE");
    if (t.murs) {
      p.poly([[0, yTop], [-hg.across, inp.er + hg.Hend], [-hg.across, 0]], "COFFRAGE");
      p.poly([[B, yTop], [B + hg.across, inp.er + hg.Hend], [B + hg.across, 0]], "COFFRAGE");
      bub(p, [-hg.across * 0.45, inp.er + hg.Hend * 0.8], t.ep);
      bub(p, [B + hg.across * 0.45, inp.er + hg.Hend * 0.8], t.ep);
    }
    p.rect(-hg.across - 0.1, -0.1, B + 2 * hg.across + 0.2, 0.1, "TERRAIN");
    p.terrain(-hg.across - 0.8, -hg.across - 0.1, inp.er);
    p.terrain(B + hg.across + 0.1, B + hg.across + 0.8, inp.er);
    bub(p, [B / 2, Hout - inp.es / 2], inp.es);
    bub(p, [B / 2, inp.er / 2], inp.er);
    bub(p, [cells[0].x0 / 2 || inp.eExt / 2, Hout / 2], inp.eExt);
    p.chainH([0, ...cells.flatMap((c) => [c.x0, c.x1]), B], 0, -p.th(8));
    p.chainV([0, inp.er, inp.er + inp.hInt, Hout, ...(hHead > 0 ? [yTop] : [])], B + hg.across, B + hg.across + p.th(8));
    title(pen, qx(1) + qW / 2, qy(1) + qH - pen.th(3), "COUPE B-B");
  }

  // Coupe A-A (longitudinale, dans une cellule).
  {
    const p = at(2, Lt, yTop + t.becheProf, 0, pen.th(6));
    const xb = t.radierLong, xe = t.radierLong + L;
    p.rect(0, 0, Lt, inp.er, "COFFRAGE");
    if (t.becheProf > 0) {
      p.rect(0, -t.becheProf, t.becheEp, t.becheProf, "COFFRAGE");
      p.rect(Lt - t.becheEp, -t.becheProf, t.becheEp, t.becheProf, "COFFRAGE");
    }
    p.rect(xb, inp.er + inp.hInt, L, inp.es, "COFFRAGE");
    if (hHead > 0) {
      p.rect(xb, Hout, Math.min(0.25, t.murTeteEp), hHead, "COFFRAGE");
      p.rect(xe - Math.min(0.25, t.murTeteEp), Hout, Math.min(0.25, t.murTeteEp), hHead, "COFFRAGE");
    }
    if (t.murs) {
      p.line([xb, yTop], [Math.max(0, xb - hg.along), inp.er + hg.Hend], "COFFRAGE");
      p.line([xe, yTop], [Math.min(Lt, xe + hg.along), inp.er + hg.Hend], "COFFRAGE");
      p.line([xb, inp.er], [xb, yTop], "COFFRAGE");
      p.line([xe, inp.er], [xe, yTop], "COFFRAGE");
      bub(p, [xb - hg.along * 0.45, inp.er + hg.Hend * 0.6], t.ep);
      bub(p, [xe + hg.along * 0.45, inp.er + hg.Hend * 0.6], t.ep);
    }
    p.rect(t.becheEp, -0.1, Lt - 2 * t.becheEp, 0.1, "TERRAIN");
    p.text([Lt / 2, -0.35], 2.2, "Béton de propreté ép. 10 cm", "TEXTE", "center");
    p.terrain(-0.8, 0, inp.er);
    p.terrain(Lt, Lt + 0.8, inp.er);
    bub(p, [Lt / 2, inp.er / 2], inp.er);
    bub(p, [Lt / 2, inp.er + inp.hInt / 2], study.input.eExt);
    p.text([Lt / 2 + 0.5, inp.er + 0.08], 2, "0,5 %", "COTATION");
    p.chainH([0, t.becheEp, xb, xe, Lt - t.becheEp, Lt], -t.becheProf, -t.becheProf - p.th(6));
    p.chainV([-t.becheProf, 0, inp.er, inp.er + inp.hInt, Hout, ...(hHead > 0 ? [yTop] : [])], 0, -p.th(8));
    p.text([0.1, yTop + 0.25], 2.6, "AMONT", "TEXTE");
    p.text([Lt - 0.1, yTop + 0.25], 2.6, "AVAL", "TEXTE", "right");
    title(pen, qx(2) + qW / 2, qy(2) + qH - pen.th(3), "COUPE A-A");
  }

  // Vue de face (tête amont).
  {
    const p = at(3, B + 2 * hg.across, yTop, hg.across, pen.th(6));
    p.rect(0, 0, B, yTop, "COFFRAGE");
    for (const c of cells) p.rect(c.x0, inp.er, c.x1 - c.x0, inp.hInt, "COFFRAGE", true);
    if (t.murs) {
      p.poly([[0, yTop], [-hg.across, inp.er + hg.Hend], [-hg.across, 0], [0, 0]], "COFFRAGE");
      p.poly([[B, yTop], [B + hg.across, inp.er + hg.Hend], [B + hg.across, 0], [B, 0]], "COFFRAGE");
      bub(p, [-hg.across * 0.4, inp.er + hg.Hend * 0.5], t.ep);
      bub(p, [B + hg.across * 0.4, inp.er + hg.Hend * 0.5], t.ep);
    }
    p.terrain(-hg.across - 0.8, B + hg.across + 0.8, inp.er);
    p.chainH([-hg.across, 0, ...cells.flatMap((c) => [c.x0, c.x1]), B, B + hg.across], 0, -p.th(8));
    p.chainV([0, inp.er, inp.er + inp.hInt, yTop], B + hg.across, B + hg.across + p.th(8));
    title(pen, qx(3) + qW / 2, qy(3) + qH - pen.th(3), "VUE DE FACE");
  }
  return { id: "coffrage", title: "Plan de coffrage", role: "coffrage", scale, origin, width: W, height: H, prims: [...pen.prims, ...subs.flatMap((s) => s.prims)] };
}

// ── 2. Plan de ferraillage ─────────────────────────────────

export type Region = { x: number; y: number; w: number; h: number }; // mm papier, origine en bas à gauche
export type Pad = { l: number; r: number; b: number; t: number };

/** Place une vue dans une zone de la planche, à la plus grande échelle normalisée qui tient. */
export function fitView(origin: Pt, sheetScale: number, r: Region, ext: { x0: number; y0: number; w: number; h: number }, pad: Pad) {
  let s = SCALES[SCALES.length - 1];
  for (const c of SCALES) {
    if ((ext.w * 1000) / c + pad.l + pad.r <= r.w && (ext.h * 1000) / c + pad.b + pad.t <= r.h) { s = c; break; }
  }
  const dw = (ext.w * 1000) / s, dh = (ext.h * 1000) / s;
  const px = r.x + pad.l + (r.w - pad.l - pad.r - dw) / 2 - (ext.x0 * 1000) / s;
  const py = r.y + pad.b + (r.h - pad.b - pad.t - dh) / 2 - (ext.y0 * 1000) / s;
  const pen = new Pen(origin[0] + (px / 1000) * sheetScale, origin[1] + (py / 1000) * sheetScale, sheetScale, sheetScale / s);
  return { pen, s };
}

function sheetFerraillage(study: Study, origin: Pt, num: string): Sheet {
  const inp = study.input;
  const { B, Hout, cells } = geometry(study);
  const hg = headGeom(study);
  const t = hg.t;
  const c = inp.cover;
  const rep = repMap(study);
  const bars = bodyBars(study);
  const L = inp.L;
  const scale = 50;
  const W = A3[0] * scale, H = A3[1] * scale;
  const pen = new Pen(origin[0], origin[1], scale);
  sheetFrame(pen, W, H);
  cartouche(pen, study, W, "PLAN DE FERRAILLAGE — coupes A-A et B-B, mur en L, radier et dalle", `${num}.2`, "VAR");
  const subs: Pen[] = [];
  const gd = (id: string) => study.design.groups.find((g) => g.id === id);
  const repOf = (k: BarKind) => String(rep.get(k) ?? "?");
  const findBar = (el: string, prefix: string) => study.quantities.bars.find((b) => b.element === el && b.designation.startsWith(prefix));
  const mmTitle = (r: Region, txt: string, sc: number) => {
    pen.text([((r.x + r.w / 2) / 1000) * scale, ((r.y + r.h - 5) / 1000) * scale], 3.6, `${txt} (1/${sc})`, "TEXTE", "center", 0, true);
  };
  const dotR = (p: Pen) => p.th(0.45);

  // Coupe B-B : zone haut gauche.
  {
    const r: Region = { x: 10, y: 160, w: 205, h: 127 };
    const { pen: p, s } = fitView(origin, scale, r, { x0: 0, y0: 0, w: B, h: Hout }, { l: 22, r: 10, b: 24, t: 20 });
    subs.push(p);
    mmTitle(r, "COUPE B-B", s);
    p.rect(0, 0, B, Hout, "COFFRAGE");
    for (const cl of cells) p.poly(cellOutline(cl.x0, cl.x1, inp.er, inp.er + inp.hInt, inp.gousset), "COFFRAGE", true);
    for (const b of bars) {
      p.poly(b.pts, "ACIERS");
      if (b.label) {
        const [ax, ay] = b.anchor;
        const d = p.th(13);
        p.callout([ax, ay], [ax + b.dir[0] * d, ay + b.dir[1] * d], repOf(b.kind), 5);
      }
    }
    const dots = (x0: number, x1: number, y: number, sp: number) => { for (let x = x0; x <= x1 + 1e-9; x += sp) p.circle([x, y], dotR(p), "REPARTITION"); };
    const re = gd("radier_ext"), ri = gd("radier_int"), de = gd("dalle_ext"), di = gd("dalle_int"), pe = gd("pext_ext");
    if (re) dots(c + 0.06, B - c - 0.06, c + 0.02, re.rep.s);
    if (ri) dots(c + 0.06, B - c - 0.06, inp.er - c - 0.02, ri.rep.s);
    if (de) dots(c + 0.06, B - c - 0.06, Hout - c - 0.02, de.rep.s);
    if (di) dots(c + 0.06, B - c - 0.06, Hout - inp.es + c + 0.02, di.rep.s);
    if (pe) for (const x of [c + 0.035, B - c - 0.035]) for (let y = inp.er; y <= inp.er + inp.hInt + 1e-9; y += pe.rep.s) p.circle([x, y], dotR(p), "REPARTITION");
    const callBar = (b: { rep: number } | undefined, from: Pt, to: Pt) => { if (b) p.callout(from, to, String(b.rep), 5); };
    callBar(findBar("RADIER", "Répartition"), [B * 0.62, c + 0.02], [B * 0.62, -p.th(12)]);
    callBar(findBar("RADIER", "Chaises"), [B * 0.82, inp.er / 2], [B * 0.82, -p.th(12)]);
    callBar(findBar("DALLE", "Répartition"), [B * 0.62, Hout - c - 0.02], [B * 0.62, Hout + p.th(12)]);
    callBar(findBar("PIÉDROITS", "Épingles"), [inp.eExt / 2, Hout * 0.3], [-p.th(13), Hout * 0.3]);
    callBar(findBar("PIÉDROITS", "Répartition"), [c + 0.035, Hout * 0.7], [-p.th(13), Hout * 0.7]);
    p.chainH([0, ...cells.flatMap((cl) => [cl.x0, cl.x1]), B], 0, -p.th(20), false);
  }

  // Coupe A-A : zone bas gauche (radier et dalle sur la longueur de l'ouvrage).
  {
    const r: Region = { x: 10, y: 50, w: 205, h: 108 };
    const { pen: p, s } = fitView(origin, scale, r, { x0: 0, y0: 0, w: L, h: Hout }, { l: 10, r: 10, b: 20, t: 18 });
    subs.push(p);
    mmTitle(r, "COUPE A-A", s);
    p.rect(0, 0, L, inp.er, "COFFRAGE");
    p.rect(0, inp.er + inp.hInt, L, inp.es, "COFFRAGE");
    p.line([0, inp.er], [0, inp.er + inp.hInt], "AXES");
    p.line([L, inp.er], [L, inp.er + inp.hInt], "AXES");
    const layer = (y: number, sp: number, up: boolean) => {
      p.line([c, y], [L - c, y], "REPARTITION");
      for (let x = c; x <= L - c + 1e-9; x += sp) p.circle([x, y + (up ? 0.015 : -0.015)], dotR(p) * 1.3, "ACIERS");
    };
    const re = gd("radier_ext"), ri = gd("radier_int"), de = gd("dalle_ext"), di = gd("dalle_int");
    if (re) layer(c, re.bars.s, true);
    if (ri) layer(inp.er - c, ri.bars.s, false);
    if (de) layer(Hout - c, de.bars.s, false);
    if (di) layer(Hout - inp.es + c, di.bars.s, true);
    const lab = (k: BarKind, x: number, y: number, dy: number) => { if (rep.get(k)) p.callout([x, y], [x, y + dy], repOf(k), 5); };
    lab("radier_ext", L * 0.2, c, -p.th(10));
    lab("radier_int", L * 0.35, inp.er - c, p.th(10));
    lab("dalle_ext", L * 0.2, Hout - c, p.th(10));
    lab("dalle_int", L * 0.35, Hout - inp.es + c, -p.th(10));
    p.dimH(0, L, 0, -p.th(16));
  }

  // Mur en L : zone haut, au centre droit.
  if (hg.w) {
    const w = hg.w;
    const lg = t.long;
    const r: Region = { x: 220, y: 150, w: 100, h: 137 };
    const { pen: p, s } = fitView(origin, scale, r, { x0: 0, y0: -t.semEp, w: lg, h: w.Htot + t.semEp }, { l: 6, r: 14, b: 22, t: 20 });
    subs.push(p);
    mmTitle(r, "MUR EN L", s);
    p.poly([[0, 0], [lg, 0], [lg, w.Hend], [0, w.Htot]], "COFFRAGE", true);
    p.rect(-0.05, -t.semEp, lg + 0.1, t.semEp, "COFFRAGE");
    for (let x = c; x <= lg - c + 1e-9; x += w.bars.s) {
      const hTop = w.Htot + ((w.Hend - w.Htot) * x) / lg - c;
      p.line([x, -t.semEp + c], [x, hTop], "ACIERS");
    }
    for (let y = c; y <= w.Htot - c + 1e-9; y += w.rep.s) {
      const xMax = y <= w.Hend ? lg - c : (lg * (w.Htot - y)) / (w.Htot - w.Hend) - c;
      if (xMax > c) p.line([c, y], [xMax, y], "REPARTITION");
    }
    const wb = study.quantities.bars.filter((b) => b.element === "MUR EN L");
    if (wb[0]) p.callout([lg * 0.3, w.Htot * 0.45], [lg * 0.3, w.Htot + p.th(10)], String(wb[0].rep), 5);
    if (wb[2]) p.callout([lg * 0.7, w.Hend * 0.5], [lg + p.th(10), w.Hend * 0.5], String(wb[2].rep), 5);
    if (wb[5]) p.callout([lg * 0.5, -t.semEp / 2], [lg * 0.5, -t.semEp - p.th(9)], String(wb[5].rep), 5);
    p.text([lg / 2, -t.semEp - p.th(17)], 2.2, `Voile ép. ${cmTxt(t.ep)} : HA${w.bars.phi} e=${cmTxt(w.bars.s)} côté remblai, HA10 e=20 face vue`, "TEXTE", "center");
  }

  // Radier en vue en plan : zone haut droite.
  {
    const r: Region = { x: 322, y: 150, w: 90, h: 137 };
    const { pen: p, s } = fitView(origin, scale, r, { x0: 0, y0: 0, w: B, h: L }, { l: 6, r: 6, b: 20, t: 20 });
    subs.push(p);
    mmTitle(r, "RADIER — VUE EN PLAN", s);
    p.rect(0, 0, B, L, "COFFRAGE");
    for (const cl of cells.slice(0, -1)) p.rect(cl.x1, 0, inp.eInt, L, "AXES");
    const re = gd("radier_ext");
    if (re) {
      for (let y = c; y <= L - c + 1e-9; y += re.bars.s) p.line([c, y], [B - c, y], "ACIERS");
      for (let x = c; x <= B - c + 1e-9; x += re.rep.s) p.line([x, c], [x, L - c], "REPARTITION");
      p.callout([B * 0.3, L * 0.5], [B * 0.3, -p.th(9)], repOf("radier_ext"), 5);
      const rr = findBar("RADIER", "Répartition");
      if (rr) p.callout([B * 0.7, L * 0.6], [B * 0.7, -p.th(9)], String(rr.rep), 5);
    }
    p.dimH(0, B, L, L + p.th(6));
    p.dimV(0, L, B, B + p.th(5));
  }

  // Tableaux : zone bas droite.
  {
    const p = new Pen(origin[0] + (222 / 1000) * scale, origin[1] + (50 / 1000) * scale, scale);
    subs.push(p);
    const w = p.th(188), hh = p.th(96);
    p.rect(0, 0, w, hh, "CADRE");
    let y = hh - p.th(6);
    const row = (txt: string, mm = 2.2, bold = false, x = 2) => { p.text([p.th(x), y], mm, txt, "TEXTE", "left", 0, bold); y -= p.th(mm * 1.7); };
    row("ACIERS", 3, true);
    row(`Aciers à haute adhérence nuance FeE${inp.fe} (HA), conformes aux fiches d'identification du Fascicule 4 titre 1.`);
    row(`Enrobage ${cmTxt(c)} cm. Recouvrements et ancrages droits : ls = ${study.design.mat.ls} Ø. Mandrins : 10 Ø (cadres, crochets : 5 Ø).`);
    y -= p.th(1.5);
    p.line([0, y + p.th(3)], [w, y + p.th(3)], "CADRE");
    row("INDICATIONS GÉNÉRALES", 3, true);
    const tb = [
      ["Type de béton", "Partie d'ouvrage", "Dosage"],
      ["Gros béton Q250", "Calage, enrochements", "250 kg/m³"],
      ["Béton de propreté C150", "Sous radiers et semelles", "150 kg/m³"],
      [`Béton armé Q350 (fc28 = ${inp.fc28} MPa)`, "Corps et ouvrages de tête", "350 kg/m³"],
    ];
    const colX = [p.th(2), p.th(70), p.th(140)];
    for (const rw of tb) {
      rw.forEach((v, i) => p.text([colX[i], y], 2.1, v, "TEXTE", "left", 0, rw === tb[0]));
      p.line([0, y - p.th(1.4)], [w, y - p.th(1.4)], "CADRE");
      y -= p.th(4.4);
    }
    row(`BÉTON ARMÉ dosé à 350 kg/m³ de ciment CPJ 42,5, sauf indication particulière précisée sur le plan.`);
    const prej = inp.fissuration === "prejudiciable";
    row(`Fissuration : peu préjudiciable [ ]   préjudiciable [${prej ? "X" : " "}]   très préjudiciable [${prej ? " " : "X"}]`);
    y -= p.th(1.5);
    p.line([0, y + p.th(3)], [w, y + p.th(3)], "CADRE");
    row("COFFRAGE", 3, true);
    row("Parements vus : coffrage soigné. Parements cachés : coffrage ordinaire.");
    row("Cure humide 7 jours au moins (climat tropical). Badigeon bitumineux sur les parements enterrés.");
  }

  return { id: "ferraillage", title: "Plan de ferraillage", role: "ferraillage", scaleLabel: "VAR", scale, origin, width: W, height: H, prims: [...pen.prims, ...subs.flatMap((x) => x.prims)] };
}

// ── 3. Nomenclature des armatures (A4) ─────────────────────

type Row = { kind: "bar"; bar: BarMark } | { kind: "total"; label: string; mass: number; big?: boolean };

export function sketch(p: Pen, b: BarMark, cx: number, cy: number, w: number, h: number) {
  const cm = (x: number) => String(Math.round(x * 100));
  const d = b.dims;
  const txt = (x: number, y: number, s: string, align: "left" | "center" | "right" = "center") => p.text([x, y], 1.7, s, "TEXTE", align);
  const x0 = cx - w / 2, x1 = cx + w / 2;
  const main = b.varLabel ?? cm(d.length === 1 ? d[0] : d[1]);
  switch (b.shape) {
    case "droite":
      p.line([x0, cy], [x1, cy], "ACIERS");
      txt(cx, cy + p.th(0.8), b.varLabel ?? cm(d[0]));
      break;
    case "crochets": {
      const k = h * 0.35;
      p.poly([[x0 + k, cy + k], [x0, cy], [x1, cy], [x1 - k, cy + k]], "ACIERS");
      txt(cx, cy + p.th(0.8), main);
      txt(x0 - p.th(0.5), cy + k * 0.4, cm(d[0]), "right");
      txt(x1 + p.th(0.5), cy + k * 0.4, cm(d[2]), "left");
      break;
    }
    case "U": {
      const k = h * 0.6;
      p.poly([[x0, cy + k / 2], [x0, cy - k / 2], [x1, cy - k / 2], [x1, cy + k / 2]], "ACIERS");
      txt(cx, cy - k / 2 + p.th(0.8), main);
      txt(x0 - p.th(0.5), cy, cm(d[0]), "right");
      txt(x1 + p.th(0.5), cy, cm(d[2]), "left");
      break;
    }
    case "L": {
      const k = h * 0.7;
      p.poly([[x0, cy + k / 2], [x0, cy - k / 2], [x1, cy - k / 2]], "ACIERS");
      txt(x0 - p.th(0.5), cy, b.varLabel ?? cm(d[0]), "right");
      txt(cx, cy - k / 2 + p.th(0.8), cm(d[1]));
      break;
    }
    case "equerre": {
      const k = h * 0.7, xm = cx;
      p.poly([[xm - k * 0.25, cy + k / 2 - k * 0.25], [xm, cy + k / 2], [xm, cy - k / 2], [xm + k, cy - k / 2], [xm + k - k * 0.25, cy - k / 2 + k * 0.25]], "ACIERS");
      txt(xm - p.th(0.6), cy, cm(d[1]), "right");
      txt(xm + k / 2, cy - k / 2 + p.th(0.8), cm(d[2]));
      txt(xm - p.th(0.6), cy + k / 2, cm(d[0]), "right");
      break;
    }
    case "chaise": {
      const k = h * 0.6;
      p.poly([[x0, cy - k / 2], [cx - w * 0.15, cy - k / 2], [cx - w * 0.15, cy + k / 2], [cx + w * 0.15, cy + k / 2], [cx + w * 0.15, cy - k / 2], [x1, cy - k / 2]], "ACIERS");
      txt(cx, cy + k / 2 + p.th(0.6), cm(d[1]));
      txt(cx - w * 0.15 - p.th(0.6), cy, cm(d[0]), "right");
      txt(x1, cy - k / 2 + p.th(0.6), cm(d[2]), "right");
      break;
    }
    case "epingle": {
      const k = h * 0.35;
      p.poly([[x0 + k, cy + k], [x0, cy], [x1, cy], [x1 - k, cy + k]], "ACIERS");
      txt(cx, cy + p.th(0.8), cm(d[1]));
      txt(x0 - p.th(0.5), cy + k * 0.4, cm(d[0]), "right");
      txt(x1 + p.th(0.5), cy + k * 0.4, cm(d[2]), "left");
      break;
    }
    case "cadre": {
      const k = h * 0.7, ww = Math.min(w * 0.4, k * 1.6);
      p.poly([[cx - ww / 2 + k * 0.25, cy + k / 2 - k * 0.25], [cx - ww / 2, cy + k / 2], [cx - ww / 2, cy - k / 2], [cx + ww / 2, cy - k / 2], [cx + ww / 2, cy + k / 2], [cx - ww / 2 + k * 0.3, cy + k / 2]], "ACIERS");
      txt(cx - ww / 2 - p.th(0.6), cy, cm(d[1]), "right");
      txt(cx, cy - k / 2 - p.th(2.2), cm(d[0]));
      break;
    }
    case "gousset": {
      const k = h * 0.6;
      p.poly([[x0, cy - k / 2], [cx - w * 0.15, cy - k / 2], [cx + w * 0.15, cy + k / 2], [x1, cy + k / 2]], "ACIERS");
      txt(cx, cy + p.th(0.6), cm(d[1]));
      break;
    }
  }
}

function sheetsNomenclature(study: Study, origin: Pt, num: string): Sheet[] {
  const bars = study.quantities.bars;
  const scale = 10; // A4 au 1/10 : simple support de mise en page
  const W = A4[0] * scale, H = A4[1] * scale;
  const rows: { part: string; element: string; row: Row }[] = [];
  for (const part of BAR_PARTS) {
    const pb = bars.filter((b) => b.part === part);
    if (!pb.length) continue;
    const elements = Array.from(new Set(pb.map((b) => b.element)));
    for (const el of elements) {
      const eb = pb.filter((b) => b.element === el);
      eb.forEach((bar) => rows.push({ part, element: el, row: { kind: "bar", bar } }));
      rows.push({ part, element: el, row: { kind: "total", label: `TOTAL ${el}`, mass: eb.reduce((s, b) => s + b.mass, 0) } });
    }
    rows.push({ part, element: "", row: { kind: "total", label: `TOTAL ${part}`, mass: pb.reduce((s, b) => s + b.mass, 0), big: true } });
  }
  const total = bars.reduce((s, b) => s + b.mass, 0);
  const colsMm = [6, 8, 8, 15, 11, 52, 13, 10, 15, 15, 20];
  const heads = ["", "", "N°", "Diamètre", "esp.", "Forme", "Long", "Nbre", "Long total", "Poids unit", "Poids total"];
  const rowH = 11;
  const perPage = 19;
  const pages: (typeof rows)[] = [];
  for (let i = 0; i < rows.length; i += perPage) pages.push(rows.slice(i, i + perPage));
  const out: Sheet[] = [];
  const nPages = pages.length + 1;
  pages.forEach((pageRows, pi) => {
    const o: Pt = [origin[0] + pi * (W + 0.6), origin[1]];
    const pen = new Pen(o[0], o[1], scale);
    pen.rect(0, 0, W, H, "CADRE");
    pen.text([W / 2, H - pen.th(14)], 3.4, "NOMENCLATURE DES ARMATURES", "TEXTE", "center", 0, true);
    pen.text([pen.th(12), H - pen.th(22)], 2.8, `DALOT : ${study.input.ident.projet}`, "TEXTE", "left", 0, true);
    const x0 = pen.th(12);
    let y = H - pen.th(28);
    const xs = [x0];
    for (const cw of colsMm) xs.push(xs[xs.length - 1] + pen.th(cw));
    pen.rect(x0, y - pen.th(8), xs[xs.length - 1] - x0, pen.th(8), "CADRE");
    heads.forEach((h, i) => { if (h) pen.text([(xs[i] + xs[i + 1]) / 2, y - pen.th(5.2)], 2, h, "TEXTE", "center", 0, true); });
    pen.text([(xs[0] + xs[2]) / 2, y - pen.th(5.2)], 1.9, "Désignation", "TEXTE", "center", 0, true);
    y -= pen.th(8);
    const yStart = y;
    // Bandes verticales : partie et élément.
    let elStart = y, elName = pageRows[0]?.element ?? "", partStart = y, partName = pageRows[0]?.part ?? "";
    const closeEl = (yEnd: number) => {
      if (!elName) return;
      pen.rect(xs[1], yEnd, pen.th(colsMm[1]), elStart - yEnd, "CADRE");
      pen.text([(xs[1] + xs[2]) / 2 + pen.th(0.8), (elStart + yEnd) / 2], 1.9, elName, "TEXTE", "center", 90, true);
    };
    const closePart = (yEnd: number) => {
      pen.rect(xs[0], yEnd, pen.th(colsMm[0]), partStart - yEnd, "CADRE");
      pen.text([(xs[0] + xs[1]) / 2 + pen.th(0.8), (partStart + yEnd) / 2], 2, partName, "TEXTE", "center", 90, true);
    };
    for (const r of pageRows) {
      if (r.element !== elName) { closeEl(y); elName = r.element; elStart = y; }
      if (r.part !== partName) { closePart(y); partName = r.part; partStart = y; }
      const h = pen.th(r.row.kind === "bar" ? rowH : 7);
      if (r.row.kind === "bar") {
        const b = r.row.bar;
        const cells = [String(b.rep), `HA ${b.phi}`, b.spacingLabel, "", fmt(b.length), String(b.count), fmt(b.totalLength, 1), fmt(barMass(b.phi), 3), fmt(b.mass, 2)];
        for (let i = 2; i < xs.length - 1; i++) pen.rect(xs[i], y - h, xs[i + 1] - xs[i], h, "CADRE");
        cells.forEach((v, k) => { if (v) pen.text([(xs[k + 2] + xs[k + 3]) / 2, y - h / 2 - pen.th(1)], 2, v, "TEXTE", "center"); });
        sketch(pen, b, (xs[5] + xs[6]) / 2, y - h / 2, pen.th(colsMm[5] - 22), pen.th(rowH - 3));
      } else {
        const xL = r.row.big ? xs[0] : xs[2];
        pen.rect(xL, y - h, xs[xs.length - 2] - xL, h, "CADRE");
        pen.rect(xs[xs.length - 2], y - h, xs[xs.length - 1] - xs[xs.length - 2], h, "CADRE");
        pen.text([(xL + xs[xs.length - 2]) / 2, y - h / 2 - pen.th(1)], r.row.big ? 2.6 : 2.3, r.row.label, "TEXTE", "center", 0, true);
        pen.text([(xs[xs.length - 2] + xs[xs.length - 1]) / 2, y - h / 2 - pen.th(1)], 2.4, fmt(r.row.mass, 2), "TEXTE", "center", 0, true);
        if (r.row.big) { closeEl(y); elName = ""; elStart = y - h; }
      }
      y -= h;
    }
    closeEl(y);
    closePart(y);
    void yStart;
    pen.text([pen.th(12), pen.th(10)], 2.2, `DALOT : ${study.input.ident.projet} — ${study.input.ident.auteur}`, "TEXTE");
    pen.text([W - pen.th(12), pen.th(10)], 2.2, `${num}.3 — Page ${pi + 1}/${nPages}`, "TEXTE", "right");
    out.push({ id: `nomenclature-${pi + 1}`, title: `Nomenclature des armatures (${pi + 1}/${nPages})`, scale, origin: o, width: W, height: H, prims: pen.prims });
  });

  // Dernière page : récapitulatif des aciers.
  {
    const o: Pt = [origin[0] + pages.length * (W + 0.6), origin[1]];
    const pen = new Pen(o[0], o[1], scale);
    pen.rect(0, 0, W, H, "CADRE");
    pen.text([W / 2, H - pen.th(14)], 3.4, "RÉCAPITULATIF DES ACIERS", "TEXTE", "center", 0, true);
    pen.text([pen.th(12), H - pen.th(22)], 2.8, `DALOT : ${study.input.ident.projet}`, "TEXTE", "left", 0, true);
    const parts = BAR_PARTS.filter((pt) => bars.some((b) => b.part === pt)).map((pt) => ({ pt, m: bars.filter((b) => b.part === pt).reduce((s, b) => s + b.mass, 0) }));
    const cols = [30, 35, 35, 40];
    const x0 = (W - pen.th(cols.reduce((s, v) => s + v, 0))) / 2;
    const xs = [x0];
    for (const cw of cols) xs.push(xs[xs.length - 1] + pen.th(cw));
    let y = H - pen.th(36);
    const line = (vals: string[], bold = false) => {
      vals.forEach((v, i) => {
        pen.rect(xs[i], y - pen.th(8), xs[i + 1] - xs[i], pen.th(8), "CADRE");
        pen.text([(xs[i] + xs[i + 1]) / 2, y - pen.th(5.2)], 2.4, v, "TEXTE", "center", 0, bold);
      });
      y -= pen.th(8);
    };
    line(["TYPE", "LINÉAIRE (m)", "Nbr de barres 12 m (u)", "POIDS TOTAL (kg)"], true);
    for (const r of steelSummary(bars)) line([`HA ${r.phi}`, fmt(r.length, 0), fmt(r.bars12, 2), fmt(r.mass, 2)]);
    line(["POIDS TOTAL", "", "", fmt(total, 0)], true);
    y -= pen.th(10);
    for (const { pt, m } of parts) { pen.text([x0, y], 2.6, `${pt} : ${fmt(m, 2)} kg`, "TEXTE"); y -= pen.th(6); }
    pen.text([x0, y], 2.6, `Béton armé : ${fmt(study.quantities.concrete)} m³ — ratio ${fmt(study.quantities.ratio, 0)} kg/m³`, "TEXTE");
    pen.text([pen.th(12), pen.th(10)], 2.2, `DALOT : ${study.input.ident.projet} — ${study.input.ident.auteur}`, "TEXTE");
    pen.text([W - pen.th(12), pen.th(10)], 2.2, `${num}.3 — Page ${nPages}/${nPages}`, "TEXTE", "right");
    out.push({ id: "recapitulatif", title: "Récapitulatif des aciers", scale, origin: o, width: W, height: H, prims: pen.prims });
  }
  return out;
}

export function buildSheets(study: Study): Sheet[] {
  const model = study.input.ident.modelePlans;
  if (model === "cafe" || model === "paia") return buildModelSheets(study, model);
  const num = study.input.ident.numPlan || "D01";
  const out: Sheet[] = [];
  let x = 0;
  const push = (s: Sheet) => { out.push(s); x = Math.max(x, s.origin[0] + s.width + 2); };
  push(sheetCoffrage(study, [0, 0], num));
  push(sheetFerraillage(study, [x, 0], num));
  for (const s of sheetsNomenclature(study, [x, 0], num)) push(s);
  return out;
}
