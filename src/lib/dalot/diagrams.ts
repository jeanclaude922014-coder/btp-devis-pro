/**
 * Diagrammes d'efforts (enveloppes max/min) tracés perpendiculairement à chaque barre du
 * portique, et coupe transversale cotée « vivante » de l'écran de saisie.
 */

import { transverseSpread, type Analysis, type Envelope } from "./analysis";
import { stripBlocks } from "./convoys";
import type { DalotInput } from "./fields";

export type Quantity = "M" | "V" | "N";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const f1 = (x: number) => x.toFixed(1).replace(".", ",");

export function envelopeSvg(an: Analysis, env: Envelope, q: Quantity, opts: { width?: number; title?: string } = {}): string {
  const m = an.model;
  const ns = an.quantities.ns;
  const off = q === "M" ? 0 : q === "V" ? ns : 2 * ns;
  const B = m.xRight - m.xLeft;
  const H = m.yTop - m.yBot;
  let vmax = 1e-9;
  for (let k = 0; k < ns; k++) vmax = Math.max(vmax, Math.abs(env.max[off + k]), Math.abs(env.min[off + k]));
  const amp = Math.min(B, H) * 0.32 / vmax;
  const pad = Math.max(B, H) * 0.32;
  const vbW = B + 2 * pad, vbH = H + 2 * pad;
  const X = (x: number) => x - m.xLeft + pad;
  const Y = (y: number) => vbH - (y - m.yBot + pad);
  const fs = Math.max(B, H) * 0.028;
  const parts: string[] = [];
  // Portique
  for (const mem of m.members) {
    const a = m.nodes[mem.nodes[0]], b = m.nodes[mem.nodes[mem.nodes.length - 1]];
    parts.push(`<line x1="${X(a.x)}" y1="${Y(a.y)}" x2="${X(b.x)}" y2="${Y(b.y)}" stroke="#334155" stroke-width="${fs * 0.18}"/>`);
  }
  // Diagrammes : M tracé côté fibre tendue (convention des ingénieurs), V et N côté local +y.
  for (const mem of m.members) {
    const a = m.nodes[mem.nodes[0]], b = m.nodes[mem.nodes[mem.nodes.length - 1]];
    const L = mem.length;
    const ux = (b.x - a.x) / L, uy = (b.y - a.y) / L;
    const ny = ux, nx = -uy; // y local
    const sgn = q === "M" ? -1 : 1; // M > 0 tend la fibre y- : on dessine vers y-
    for (const [vals, color] of [[env.max, "#dc2626"], [env.min, "#2563eb"]] as const) {
      const pts: string[] = [];
      mem.nodes.forEach((id, k) => {
        const p = m.nodes[id];
        const v = vals[off + mem.station0 + k] * amp * sgn;
        pts.push(`${X(p.x + nx * v).toFixed(4)},${Y(p.y + ny * v).toFixed(4)}`);
      });
      const p0 = `${X(a.x).toFixed(4)},${Y(a.y).toFixed(4)}`, p1 = `${X(b.x).toFixed(4)},${Y(b.y).toFixed(4)}`;
      parts.push(`<polygon points="${p0} ${pts.join(" ")} ${p1}" fill="${color}" fill-opacity="0.12" stroke="${color}" stroke-width="${fs * 0.1}"/>`);
    }
    // Valeurs extrêmes de la barre
    let kMax = 0, kMin = 0;
    mem.nodes.forEach((_, k) => {
      if (env.max[off + mem.station0 + k] > env.max[off + mem.station0 + kMax]) kMax = k;
      if (env.min[off + mem.station0 + k] < env.min[off + mem.station0 + kMin]) kMin = k;
    });
    for (const [k, vals, color] of [[kMax, env.max, "#b91c1c"], [kMin, env.min, "#1d4ed8"]] as const) {
      const val = vals[off + mem.station0 + k];
      if (Math.abs(val) < vmax * 0.05) continue;
      const p = m.nodes[mem.nodes[k]];
      const v = val * amp * sgn;
      const tx = X(p.x + nx * v * 1.08), ty = Y(p.y + ny * v * 1.08);
      parts.push(`<text x="${tx.toFixed(4)}" y="${ty.toFixed(4)}" font-size="${fs}" fill="${color}" text-anchor="middle" font-family="Arial">${f1(val)}</text>`);
    }
  }
  const unit = q === "M" ? "kN·m/m" : "kN/m";
  const title = opts.title ?? `Enveloppe de ${q} (${unit})`;
  parts.push(`<text x="${fs}" y="${fs * 1.4}" font-size="${fs * 1.1}" font-family="Arial" fill="#0f172a">${esc(title)}</text>`);
  parts.push(`<text x="${fs}" y="${fs * 2.8}" font-size="${fs * 0.8}" font-family="Arial" fill="#b91c1c">— max</text>`);
  parts.push(`<text x="${fs * 4.5}" y="${fs * 2.8}" font-size="${fs * 0.8}" font-family="Arial" fill="#1d4ed8">— min</text>`);
  if (q === "M") parts.push(`<text x="${fs * 8}" y="${fs * 2.8}" font-size="${fs * 0.8}" font-family="Arial" fill="#475569">diagramme tracé côté fibre tendue</text>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vbW.toFixed(4)} ${vbH.toFixed(4)}" width="${opts.width ?? "100%"}"><rect width="100%" height="100%" fill="#ffffff"/>${parts.join("")}</svg>`;
}

/** Coupe transversale cotée de l'écran « Géométrie » (se met à jour à chaque frappe). */
export function sectionSvg(inp: Partial<DalotInput> & Pick<DalotInput, "openings" | "hInt" | "es" | "er" | "eExt" | "eInt" | "gousset" | "hr">): string {
  const n = inp.openings.length;
  const B = 2 * inp.eExt + inp.openings.reduce((s, o) => s + o, 0) + (n - 1) * inp.eInt;
  const Hout = inp.er + inp.hInt + inp.es;
  const fill = Math.min(inp.hr, 1.2);
  const pad = 0.9;
  const W = B + 2 * pad, H = Hout + fill + pad + 0.55;
  const X = (x: number) => x + pad;
  const Y = (y: number) => H - (y + 0.75);
  const fs = Math.max(B, Hout) * 0.035;
  const p: string[] = [];
  p.push(`<rect x="${X(-0.6)}" y="${Y(Hout + fill)}" width="${B + 1.2}" height="${fill + Hout}" fill="#e7dcc6"/>`);
  p.push(`<text x="${X(-0.55)}" y="${Y(Hout + fill) + fs * 1.2}" font-size="${fs * 0.8}" fill="#78350f" font-family="Arial">Remblai ${inp.hr.toFixed(2).replace(".", ",")} m${inp.hr > 1.2 ? " (coupé)" : ""}</text>`);
  p.push(`<rect x="${X(0)}" y="${Y(Hout)}" width="${B}" height="${Hout}" fill="#cbd5e1" stroke="#0f172a" stroke-width="${fs * 0.08}"/>`);
  let x = inp.eExt;
  const xs: number[] = [0];
  for (let k = 0; k < n; k++) {
    const o = inp.openings[k], g = Math.min(inp.gousset, o / 4, inp.hInt / 4);
    const x0 = x, x1 = x + o, yb = inp.er, yt = inp.er + inp.hInt;
    const pts = g > 0
      ? [[x0 + g, yb], [x1 - g, yb], [x1, yb + g], [x1, yt - g], [x1 - g, yt], [x0 + g, yt], [x0, yt - g], [x0, yb + g]]
      : [[x0, yb], [x1, yb], [x1, yt], [x0, yt]];
    p.push(`<polygon points="${pts.map(([a, b]) => `${X(a).toFixed(4)},${Y(b).toFixed(4)}`).join(" ")}" fill="#f8fafc" stroke="#0f172a" stroke-width="${fs * 0.08}"/>`);
    p.push(`<text x="${X((x0 + x1) / 2)}" y="${Y((yb + yt) / 2)}" font-size="${fs}" text-anchor="middle" font-family="Arial" fill="#334155">Cellule ${k + 1}</text>`);
    xs.push(x0, x1);
    x = x1 + (k < n - 1 ? inp.eInt : 0);
  }
  xs.push(B);
  const yd = -0.35;
  for (let k = 0; k < xs.length - 1; k++) {
    const a = xs[k], b = xs[k + 1];
    p.push(`<line x1="${X(a)}" y1="${Y(yd)}" x2="${X(b)}" y2="${Y(yd)}" stroke="#15803d" stroke-width="${fs * 0.05}"/>`);
    p.push(`<line x1="${X(a)}" y1="${Y(yd - 0.06)}" x2="${X(a)}" y2="${Y(0)}" stroke="#15803d" stroke-width="${fs * 0.04}"/>`);
    p.push(`<text x="${X((a + b) / 2)}" y="${Y(yd) - fs * 0.25}" font-size="${fs * 0.75}" text-anchor="middle" font-family="Arial" fill="#15803d">${(b - a).toFixed(2).replace(".", ",")}</text>`);
  }
  p.push(`<line x1="${X(B)}" y1="${Y(yd - 0.06)}" x2="${X(B)}" y2="${Y(0)}" stroke="#15803d" stroke-width="${fs * 0.04}"/>`);
  p.push(`<text x="${X(B / 2)}" y="${Y(yd - 0.32)}" font-size="${fs * 0.8}" text-anchor="middle" font-family="Arial" fill="#15803d">${B.toFixed(2).replace(".", ",")} — largeur extérieure</text>`);
  const xv = B + 0.3;
  for (const [a, b] of [[0, inp.er], [inp.er, inp.er + inp.hInt], [inp.er + inp.hInt, Hout]]) {
    p.push(`<line x1="${X(xv)}" y1="${Y(a)}" x2="${X(xv)}" y2="${Y(b)}" stroke="#15803d" stroke-width="${fs * 0.05}"/>`);
    p.push(`<line x1="${X(B)}" y1="${Y(a)}" x2="${X(xv + 0.06)}" y2="${Y(a)}" stroke="#15803d" stroke-width="${fs * 0.04}"/>`);
    p.push(`<text x="${X(xv + 0.08)}" y="${Y((a + b) / 2) + fs * 0.3}" font-size="${fs * 0.75}" font-family="Arial" fill="#15803d">${(b - a).toFixed(2).replace(".", ",")}</text>`);
  }
  p.push(`<line x1="${X(B)}" y1="${Y(Hout)}" x2="${X(xv + 0.06)}" y2="${Y(Hout)}" stroke="#15803d" stroke-width="${fs * 0.04}"/>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W.toFixed(4)} ${H.toFixed(4)}" width="100%">${p.join("")}</svg>`;
}

/** Position du convoi donnant le moment maximal en travée de dalle. */
export function governingPosition(study: import("./engine").Study, convoyId: string) {
  const t = study.analysis.traffic.find((x) => x.def.id === convoyId && x.positions.length);
  if (!t) return null;
  let best = -1, val = -Infinity;
  for (const m of study.analysis.model.members.filter((mm) => mm.kind === "dalle")) {
    m.nodes.forEach((_, k) => {
      const q = m.station0 + k;
      if (t.max[q] > val) { val = t.max[q]; best = q; }
    });
  }
  const pos = t.positions[t.argMax[best]];
  return pos ? { t, pos, value: val } : null;
}

/**
 * Schéma coté d'un convoi à sa position défavorable : vue en long (diffusion dans le remblai
 * jusqu'au plan moyen de la dalle) et vue en plan (empreintes diffusées, bande de calcul).
 */
export function convoySvg(study: import("./engine").Study, convoyId: string, spread: number, footprintOf: (cfgIndex: number) => { footprint: { x: number; y: number; ax: number; ay: number; P: number }[]; yStar: number }): string | null {
  const g = governingPosition(study, convoyId);
  if (!g) return null;
  const inp = study.input;
  const m = study.analysis.model;
  const B = m.xRight - m.xLeft;
  const Hout = inp.er + inp.hInt + inp.es;
  const cfg = g.t.def.configs[g.pos.config];
  const toX = (px: number) => (g.pos.reversed ? g.pos.X - px : g.pos.X + px) - m.xLeft;
  const { footprint, yStar } = footprintOf(g.pos.config);
  const fill = inp.hr + inp.ech;
  // Cadrage sur l'ouvrage et ses abords ; les charges hors cadre sont coupées.
  const xmin = -2.5, xmax = B + 2.5;
  const W = xmax - xmin;
  const fs = W * 0.022;
  const H1 = Hout + fill + 2.2;
  const ys = cfg.patches.map((p) => p.y);
  const Ymax = Math.max(inp.Lr, ...ys.map((y) => y + 2));
  const H2 = Ymax + 1.6;
  const gap = 1.2;
  const VH = H1 + gap + H2;
  const X = (x: number) => (x - xmin).toFixed(3);
  const Y1 = (y: number) => (H1 - 0.25 - y).toFixed(3);
  const Y2 = (y: number) => (H1 + gap + H2 - 0.6 - y).toFixed(3);
  const sw = fs * 0.07;
  const p: string[] = [];
  const t = (x: string, y: string, s: string, col = "#0f172a", anchor = "middle", size = fs) =>
    p.push(`<text x="${x}" y="${y}" font-size="${size.toFixed(3)}" fill="${col}" text-anchor="${anchor}" font-family="Arial">${s.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</text>`);
  // Vue en long.
  t(X(xmin + 0.1), Y1(Hout + fill + 1.55), `${g.t.def.label} — vue en long (moment maximal en travée de dalle)`, "#0f172a", "start", fs * 1.05);
  p.push(`<clipPath id="c1"><rect x="0" y="0" width="${W.toFixed(3)}" height="${H1.toFixed(3)}"/></clipPath><clipPath id="c2"><rect x="0" y="${(H1 + gap).toFixed(3)}" width="${W.toFixed(3)}" height="${H2.toFixed(3)}"/></clipPath><g clip-path="url(#c1)">`);
  p.push(`<rect x="${X(xmin)}" y="${Y1(Hout + fill)}" width="${W.toFixed(3)}" height="${(Hout + fill).toFixed(3)}" fill="#efe4cf"/>`);
  p.push(`<rect x="${X(0)}" y="${Y1(Hout)}" width="${B.toFixed(3)}" height="${Hout.toFixed(3)}" fill="#cbd5e1" stroke="#0f172a" stroke-width="${sw}"/>`);
  let x = inp.eExt;
  inp.openings.forEach((o, k) => {
    p.push(`<rect x="${X(x)}" y="${Y1(inp.er + inp.hInt)}" width="${o.toFixed(3)}" height="${inp.hInt.toFixed(3)}" fill="#f8fafc" stroke="#0f172a" stroke-width="${sw}"/>`);
    x += o + (k < n(inp) - 1 ? inp.eInt : 0);
  });
  p.push(`<line x1="${X(xmin)}" y1="${Y1(Hout + fill)}" x2="${X(xmax)}" y2="${Y1(Hout + fill)}" stroke="#374151" stroke-width="${sw * 2}"/>`);
  const ymid = Hout - inp.es / 2;
  for (const f of footprint) {
    const cx = toX(f.x);
    const src = cfg.patches.find((pp) => Math.abs(pp.x - f.x) < 1e-9 && Math.abs(pp.y - f.y) < 1e-9);
    const a0 = (src?.ax ?? 0.2) / 2, a1 = f.ax / 2;
    p.push(`<polygon points="${X(cx - a0)},${Y1(Hout + fill)} ${X(cx + a0)},${Y1(Hout + fill)} ${X(cx + a1)},${Y1(ymid)} ${X(cx - a1)},${Y1(ymid)}" fill="#f97316" fill-opacity="0.15" stroke="#f97316" stroke-width="${sw * 0.6}"/>`);
  }
  const seen = new Set<string>();
  for (const pp of cfg.patches) {
    const cx = toX(pp.x);
    const key = cx.toFixed(2);
    if (seen.has(key)) continue;
    seen.add(key);
    const P = cfg.patches.filter((q) => Math.abs(toX(q.x) - cx) < 1e-6).reduce((s, q) => s + q.P, 0) * cfg.coef;
    p.push(`<line x1="${X(cx)}" y1="${Y1(Hout + fill + 0.7)}" x2="${X(cx)}" y2="${Y1(Hout + fill + 0.05)}" stroke="#b45309" stroke-width="${sw * 1.6}"/>`);
    p.push(`<polygon points="${X(cx - 0.08)},${Y1(Hout + fill + 0.18)} ${X(cx + 0.08)},${Y1(Hout + fill + 0.18)} ${X(cx)},${Y1(Hout + fill + 0.02)}" fill="#b45309"/>`);
    t(X(cx), Y1(Hout + fill + 0.78), `${P.toFixed(0)} kN`, "#b45309", "middle", fs * 0.8);
  }
  p.push("</g>");
  t(X(B + 0.2), Y1(Hout + fill / 2), `remblai ${inp.hr.toFixed(2).replace(".", ",")} m — diffusion d = ${study.analysis.D.toFixed(2).replace(".", ",")} m`, "#78350f", "start", fs * 0.75);
  // Vue en plan.
  const o2 = H1 + gap;
  void o2;
  t(X(xmin + 0.1), Y2(Ymax + 0.75), `${g.t.def.label} — vue en plan (${cfg.label}), empreintes diffusées au plan moyen de la dalle`, "#0f172a", "start", fs * 1.05);
  p.push(`<g clip-path="url(#c2)"><rect x="${X(xmin)}" y="${Y2(inp.Lr)}" width="${W.toFixed(3)}" height="${inp.Lr.toFixed(3)}" fill="#e5e7eb"/>`);
  p.push(`<rect x="${X(0)}" y="${Y2(Ymax)}" width="${B.toFixed(3)}" height="${(Ymax + 0.3).toFixed(3)}" fill="none" stroke="#0f172a" stroke-width="${sw}" stroke-dasharray="${fs * 0.4} ${fs * 0.2}"/>`);
  for (const f of footprint) {
    const cx = toX(f.x);
    p.push(`<rect x="${X(cx - f.ax / 2)}" y="${Y2(f.y + f.ay / 2)}" width="${f.ax.toFixed(3)}" height="${f.ay.toFixed(3)}" fill="#f97316" fill-opacity="0.12" stroke="#f97316" stroke-width="${sw * 0.5}"/>`);
  }
  for (const pp of cfg.patches) {
    const cx = toX(pp.x);
    p.push(`<rect x="${X(cx - pp.ax / 2)}" y="${Y2(pp.y + pp.ay / 2)}" width="${pp.ax.toFixed(3)}" height="${pp.ay.toFixed(3)}" fill="#b45309"/>`);
  }
  p.push(`<rect x="${X(xmin)}" y="${Y2(yStar + 0.5)}" width="${W.toFixed(3)}" height="1" fill="#2563eb" fill-opacity="0.12" stroke="#2563eb" stroke-width="${sw * 0.6}"/>`);
  p.push("</g>");
  t(X(xmax - 0.1), Y2(yStar + 0.6), "bande de calcul de 1 m", "#2563eb", "end", fs * 0.75);
  t(X(B / 2), Y2(-0.5), `largeur de répartition b = b' + 0,5·L (étalement ${spread.toFixed(2).replace(".", ",")} m)`, "#475569", "middle", fs * 0.7);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W.toFixed(3)} ${VH.toFixed(3)}" width="100%"><rect width="100%" height="100%" fill="#ffffff"/>${p.join("")}</svg>`;
}

const n = (inp: { openings: number[] }) => inp.openings.length;

/** Schéma d'un convoi pour l'écran et la note. */
export function convoyFigure(study: import("./engine").Study, convoyId: string): string | null {
  const spread = transverseSpread(study.input);
  const t = study.analysis.traffic.find((x) => x.def.id === convoyId);
  if (!t) return null;
  return convoySvg(study, convoyId, spread, (ci) => stripBlocks(t.def.configs[ci], study.analysis.D, spread));
}
