/**
 * Dimensions des ouvrages de tête déduites des données du projet : hauteurs des ailes, projections,
 * longueur d'aile recommandée pour que le talus (fruit m/1) vienne mourir à 0,60 m en bout d'aile,
 * petite et grande bases du radier de tête. Affichées dans l'écran de saisie, la synthèse et la note.
 */

import type { DalotInput, HeadId, Side, WingPos } from "./fields";

export const H_END_MIN = 0.6;

export function headDimensions(inp: DalotInput) {
  const t = inp.tetes;
  const n = inp.openings.length;
  const B = 2 * inp.eExt + inp.openings.reduce((s, o) => s + o, 0) + (n - 1) * inp.eInt;
  const Hext = inp.er + inp.hInt + inp.es;
  // L'aile s'accroche au sommet du guide-roue (ou du mur de tête) sur l'about de la dalle supérieure.
  const Htot = Hext + (t.guideRoues ? t.grH : 0);
  const m = inp.talus.pente;
  const a = (t.angle * Math.PI) / 180;
  const cos = Math.cos(a), tan = Math.tan(a);
  const along = t.murs ? t.long * cos : 0;
  const across = t.murs ? t.long * Math.sin(a) : 0;
  const Hend = t.murs ? Math.max(H_END_MIN, Htot - along / m) : 0;
  // Longueur d'aile pour que le talus atteigne H_END_MIN en bout d'aile.
  const alongRec = Math.max(0, (Htot - H_END_MIN) * m);
  const longRec = cos > 1e-6 ? alongRec / cos : alongRec;
  const pb = B + 2 * t.debord;
  const gb = pb + (t.murs ? 2 * t.radierLong * tan : 0);
  return {
    B, Hext, Htot, Hend, m, along, across, longRec, alongRec,
    radierRec: alongRec,
    pb, gb, gbRec: pb + (t.murs ? 2 * alongRec * tan : 0),
    surfaceRadier: ((pb + gb) / 2) * t.radierLong,
    emprise: { long: inp.L + 2 * Math.max(t.radierLong, along), larg: Math.max(gb, pb + 2 * across) },
  };
}

// ── Ouvrages annexes position par position ─────────────────────


export type Tetes = DalotInput["tetes"];

/** Paramètres d'une tête (et, si `side` est donné, de l'aile de cette rive) : valeurs générales + réglages propres. */
export function tetesFor(inp: DalotInput, head: HeadId, side: Side = "g"): Tetes {
  const t = inp.tetes;
  const ho = inp.annexes.heads[head] ?? {};
  const wo = inp.annexes.wings[`${head}_${side}` as WingPos] ?? {};
  return {
    ...t,
    murTeteEp: ho.murTeteEp ?? t.murTeteEp, grH: ho.grH ?? t.grH, grL: ho.grL ?? t.grL,
    radierLong: ho.radierLong ?? t.radierLong, becheProf: ho.becheProf ?? t.becheProf, becheEp: ho.becheEp ?? t.becheEp,
    murs: t.murs && wo.actif !== false,
    angle: wo.angle ?? t.angle, long: wo.long ?? t.long, ep: wo.ep ?? t.ep,
    hEnd: wo.hEnd ?? t.hEnd,
  };
}

const KEYS: (keyof Tetes)[] = ["murTeteEp", "grH", "grL", "radierLong", "becheProf", "becheEp", "murs", "angle", "long", "ep", "hEnd"];
const same = (a: Tetes, b: Tetes) => KEYS.every((k) => a[k] === b[k]);

export type HeadSide = { side: Side; pos: WingPos; label: string; tv: Tetes };
export type HeadCfg = { id: HeadId; label: string; tv: Tetes; sides: HeadSide[]; symmetric: boolean };

/**
 * Têtes amont et aval avec leurs ailes. `uniform` : les deux têtes et les quatre ailes sont identiques
 * (cas des plans types) — le calcul garde alors une seule tête, comme les versions précédentes.
 */
export function headLayout(inp: DalotInput): { uniform: boolean; heads: HeadCfg[] } {
  const heads: HeadCfg[] = (["amont", "aval"] as HeadId[]).map((id) => {
    const tv = tetesFor(inp, id, "g");
    const sides: HeadSide[] = (["g", "d"] as Side[]).map((side) => ({
      side, pos: `${id}_${side}` as WingPos, label: `${id === "amont" ? "amont" : "aval"}, rive ${side === "g" ? "gauche" : "droite"}`,
      tv: tetesFor(inp, id, side),
    }));
    return { id, label: id === "amont" ? "Tête amont" : "Tête aval", tv, sides, symmetric: same(sides[0].tv, sides[1].tv) };
  });
  const uniform = heads.every((h) => h.sides.every((s) => same(s.tv, inp.tetes)));
  return { uniform, heads };
}

/** Hauteur en bout d'aile : imposée, ou déduite du talus (au moins H_END_MIN). */
export function wingEndHeight(inp: DalotInput, tv: Tetes, Htot: number) {
  if (tv.hEnd !== null && tv.hEnd > 0) return Math.min(Htot, tv.hEnd);
  const along = tv.long * Math.cos((tv.angle * Math.PI) / 180);
  return Math.max(H_END_MIN, Htot - along / inp.talus.pente);
}

/** Dimensions d'une tête dont les deux ailes peuvent différer (radier de tête trapézoïdal dissymétrique). */
export function headCfgDims(inp: DalotInput, h: HeadCfg) {
  const base = headDimensions({ ...inp, tetes: h.tv });
  const tanOf = (s: HeadSide) => (s.tv.murs ? Math.tan((s.tv.angle * Math.PI) / 180) : 0);
  const pb = base.pb;
  const gb = pb + h.tv.radierLong * (tanOf(h.sides[0]) + tanOf(h.sides[1]));
  const along = Math.max(...h.sides.map((s) => (s.tv.murs ? s.tv.long * Math.cos((s.tv.angle * Math.PI) / 180) : 0)));
  return { ...base, gb, along, surfaceRadier: ((pb + gb) / 2) * h.tv.radierLong, Htot: base.Htot };
}
