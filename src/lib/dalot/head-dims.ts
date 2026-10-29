/**
 * Dimensions des ouvrages de tête déduites des données du projet : hauteurs des ailes, projections,
 * longueur d'aile recommandée pour que le talus (fruit m/1) vienne mourir à 0,60 m en bout d'aile,
 * petite et grande bases du radier de tête. Affichées dans l'écran de saisie, la synthèse et la note.
 */

import type { DalotInput } from "./fields";

export const H_END_MIN = 0.6;

export function headDimensions(inp: DalotInput) {
  const t = inp.tetes;
  const n = inp.openings.length;
  const B = 2 * inp.eExt + inp.openings.reduce((s, o) => s + o, 0) + (n - 1) * inp.eInt;
  const Hext = inp.er + inp.hInt + inp.es;
  // L'aile s'arrête au raccord avec la dalle supérieure.
  const Htot = Hext;
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
