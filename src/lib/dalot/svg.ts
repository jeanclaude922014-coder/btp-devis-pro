import { LAYER_COLORS, type Sheet } from "./drawings";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Rendu SVG d'une planche (aperçu à l'écran et images de la note de calcul). */
export function sheetToSvg(sheet: Sheet, opts: { background?: string } = {}): string {
  const [ox, oy] = sheet.origin;
  const W = sheet.width, H = sheet.height;
  const lw = (0.25 / 1000) * sheet.scale;
  const Y = (y: number) => (oy + H - y).toFixed(4);
  const X = (x: number) => (x - ox).toFixed(4);
  const parts: string[] = [];
  for (const p of sheet.prims) {
    const col = LAYER_COLORS[p.layer].css;
    const w = p.layer === "ACIERS" ? lw * 2.4 : p.layer === "COFFRAGE" || p.layer === "CADRE" ? lw * 1.6 : lw;
    const dash = p.layer === "AXES" ? ` stroke-dasharray="${(lw * 12).toFixed(4)} ${(lw * 4).toFixed(4)} ${(lw * 2).toFixed(4)} ${(lw * 4).toFixed(4)}"` : "";
    if (p.t === "line") {
      parts.push(`<line x1="${X(p.a[0])}" y1="${Y(p.a[1])}" x2="${X(p.b[0])}" y2="${Y(p.b[1])}" stroke="${col}" stroke-width="${w.toFixed(4)}"${dash}/>`);
    } else if (p.t === "poly") {
      const pts = p.pts.map((q) => `${X(q[0])},${Y(q[1])}`).join(" ");
      parts.push(`<${p.closed ? "polygon" : "polyline"} points="${pts}" fill="none" stroke="${col}" stroke-width="${w.toFixed(4)}" stroke-linejoin="round"${dash}/>`);
    } else if (p.t === "circle") {
      parts.push(`<circle cx="${X(p.c[0])}" cy="${Y(p.c[1])}" r="${p.r.toFixed(4)}" fill="${col}"/>`);
    } else {
      const anchor = p.align === "center" ? "middle" : p.align === "right" ? "end" : "start";
      const tr = p.rot ? ` transform="rotate(${-p.rot} ${X(p.p[0])} ${Y(p.p[1])})"` : "";
      parts.push(`<text x="${X(p.p[0])}" y="${Y(p.p[1])}" font-size="${p.h.toFixed(4)}" font-family="Arial, Helvetica, sans-serif" fill="${col}" text-anchor="${anchor}"${tr}>${esc(p.s)}</text>`);
    }
  }
  const bg = opts.background ? `<rect x="0" y="0" width="${W}" height="${H}" fill="${opts.background}"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W.toFixed(4)} ${H.toFixed(4)}" width="100%">${bg}${parts.join("")}</svg>`;
}
