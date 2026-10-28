/**
 * Écriture DXF R12 (AC1009) : format ASCII lu par AutoCAD, BricsCAD, ZWCAD, LibreCAD et la
 * plupart des visionneuses. Les accents sont encodés en \U+XXXX pour rester lisibles quelle
 * que soit la page de code.
 */

import { LAYER_COLORS, type Layer, type Prim, type Sheet } from "./drawings";

function enc(s: string) {
  let out = "";
  for (const ch of s) {
    const code = ch.codePointAt(0)!;
    out += code < 128 ? ch : `\\U+${code.toString(16).toUpperCase().padStart(4, "0")}`;
  }
  return out;
}

const n = (x: number) => (Math.abs(x) < 1e-12 ? "0" : x.toFixed(6));

function entity(p: Prim, out: string[]) {
  switch (p.t) {
    case "line":
      out.push("0", "LINE", "8", p.layer, "10", n(p.a[0]), "20", n(p.a[1]), "30", "0", "11", n(p.b[0]), "21", n(p.b[1]), "31", "0");
      break;
    case "circle":
      out.push("0", "CIRCLE", "8", p.layer, "10", n(p.c[0]), "20", n(p.c[1]), "30", "0", "40", n(p.r));
      break;
    case "poly":
      out.push("0", "POLYLINE", "8", p.layer, "66", "1", "10", "0", "20", "0", "30", "0", "70", p.closed ? "1" : "0");
      for (const v of p.pts) out.push("0", "VERTEX", "8", p.layer, "10", n(v[0]), "20", n(v[1]), "30", "0");
      out.push("0", "SEQEND", "8", p.layer);
      break;
    case "text": {
      const h = p.align === "center" ? 1 : p.align === "right" ? 2 : 0;
      out.push("0", "TEXT", "8", p.layer, "10", n(p.p[0]), "20", n(p.p[1]), "30", "0", "40", n(p.h), "1", enc(p.s));
      if (p.rot) out.push("50", n(p.rot));
      if (h) out.push("72", String(h), "11", n(p.p[0]), "21", n(p.p[1]), "31", "0");
      break;
    }
  }
}

export function sheetsToDxf(sheets: Sheet[]): string {
  const out: string[] = [];
  const all = sheets.flatMap((s) => s.prims);
  const xs = sheets.flatMap((s) => [s.origin[0], s.origin[0] + s.width]);
  const ys = sheets.flatMap((s) => [s.origin[1], s.origin[1] + s.height]);
  out.push(
    "0", "SECTION", "2", "HEADER",
    "9", "$ACADVER", "1", "AC1009",
    "9", "$INSBASE", "10", "0", "20", "0", "30", "0",
    "9", "$EXTMIN", "10", n(Math.min(...xs)), "20", n(Math.min(...ys)), "30", "0",
    "9", "$EXTMAX", "10", n(Math.max(...xs)), "20", n(Math.max(...ys)), "30", "0",
    "0", "ENDSEC",
    "0", "SECTION", "2", "TABLES",
    "0", "TABLE", "2", "LTYPE", "70", "2",
    "0", "LTYPE", "2", "CONTINUOUS", "70", "0", "3", "Solid line", "72", "65", "73", "0", "40", "0",
    "0", "LTYPE", "2", "AXE", "70", "0", "3", "Axe __ . __", "72", "65", "73", "4", "40", "0.5",
    "49", "0.3", "49", "-0.08", "49", "0.04", "49", "-0.08",
    "0", "ENDTAB",
  );
  const layers = Object.keys(LAYER_COLORS) as Layer[];
  out.push("0", "TABLE", "2", "LAYER", "70", String(layers.length));
  for (const l of layers) {
    out.push("0", "LAYER", "2", l, "70", "0", "62", String(LAYER_COLORS[l].aci), "6", l === "AXES" ? "AXE" : "CONTINUOUS");
  }
  out.push("0", "ENDTAB", "0", "ENDSEC", "0", "SECTION", "2", "ENTITIES");
  for (const p of all) entity(p, out);
  out.push("0", "ENDSEC", "0", "EOF");
  return out.join("\r\n") + "\r\n";
}
