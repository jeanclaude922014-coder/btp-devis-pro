/**
 * Nomenclature des aciers (repères, façonnage, longueurs, poids) et métré de l'ouvrage.
 */

import { barMass, type Materials } from "./ba";
import type { GroupDesign, GroupId } from "./design";
import type { DalotInput } from "./fields";
import type { HeadResult, HeadsResult, WingResult } from "./heads";
import type { Tetes } from "./head-dims";

export type BarShape = "droite" | "crochets" | "U" | "L" | "equerre" | "chaise" | "epingle" | "gousset" | "cadre";

export type BarPart = "CORPS DU DALOT" | "OUVRAGE DE TÊTE" | "GARDE-CORPS";

export const BAR_PARTS: BarPart[] = ["CORPS DU DALOT", "OUVRAGE DE TÊTE", "GARDE-CORPS"];

export type BarMark = {
  rep: number;
  /** Élément de la nomenclature (RADIER, DALLE, PIÉDROITS, GUIDE-ROUES, MUR EN L…). */
  element: string;
  part: BarPart;
  designation: string;
  phi: number;
  s: number;
  /** Espacement tel qu'écrit sur la nomenclature (« 14 », « 3/m² »). */
  spacingLabel: string;
  shape: BarShape;
  /** Cotes de façonnage (m), dans l'ordre du croquis. */
  dims: number[];
  /** Cote variable (barres des ouvrages de tête), ex. « var (619/989) ». */
  varLabel?: string;
  length: number; // longueur développée moyenne d'une barre (m), recouvrements compris
  count: number;
  /** Nombre d'éléments identiques (2 têtes, 4 murs en aile…) : count = nElem × barres par élément. */
  nElem: number;
  totalLength: number;
  mass: number; // kg
};

export type QuantityLine = { lot: string; designation: string; unit: string; quantity: number };

export type Quantities = { bars: BarMark[]; lines: QuantityLine[]; steelMass: number; concrete: number; ratio: number };

const COMMERCIAL = 12;

/** Garde-corps en béton armé : poteaux carrés et lisse, sur les deux rives de la dalle. */
/**
 * Garde-corps des plans types (planche « Ferraillage des garde-corps » du dalot 3 × 4,00 × 4,00) :
 * poteaux principaux 20 × 20 de 1,20 m, dépassant la lisse de 20 cm, alternés avec des poteaux
 * intermédiaires 15 × 20 de 1,00 m arasés au-dessus de la lisse ; lisse 20 × 15 entre les poteaux
 * principaux ; entraxe des poteaux ≈ 0,83 m (poteau principal à chaque extrémité).
 */
export const GARDE_CORPS = { h: 1.0, hMain: 1.2, post: 0.2, postInt: 0.15, ep: 0.2, lisseW: 0.2, lisseH: 0.15, sMax: 0.85, ancrage: 0.35 };

/** Poteau de garde-corps : abscisse de l'axe, type, largeur le long de la lisse et hauteur. */
export type GcPost = { x: number; main: boolean; w: number; h: number };

/** Guide-roues sur les rives de la dalle (le garde-corps, s'il existe, est posé dessus). */
export const GUIDE_ROUE = { w: 0.25, h: 0.2 };

/** Abscisses (axe des poteaux) des poteaux de garde-corps sur la largeur B de l'ouvrage. */
export function gardeCorpsPosts(B: number): GcPost[] {
  const g = GARDE_CORPS;
  // Nombre d'intervalles pair : poteaux principaux aux extrémités, un poteau intermédiaire entre deux.
  let m = Math.max(2, Math.ceil((B - g.post) / g.sMax));
  if (m % 2 === 1) m++;
  const sp = (B - g.post) / m;
  return Array.from({ length: m + 1 }, (_, i) => {
    const main = i % 2 === 0;
    return { x: g.post / 2 + i * sp, main, w: main ? g.post : g.postInt, h: main ? g.hMain : g.h };
  });
}

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
  const add = (
    part: BarPart, element: string, designation: string, b: { phi: number; s: number }, shape: BarShape, dims: number[], count: number,
    opts: { spacingLabel?: string; varLabel?: string; length?: number; nElem?: number } = {}
  ) => {
    if (count <= 0 || dims.some((d) => !(d > 0))) return;
    const raw = opts.length ?? dims.reduce((acc, x) => acc + x, 0);
    const length = lap(raw, b.phi);
    bars.push({
      rep: bars.length + 1, element, part, designation, phi: b.phi, s: b.s,
      spacingLabel: opts.spacingLabel ?? String(Math.round(b.s * 1000) / 10).replace(".", ","),
      shape, dims, varLabel: opts.varLabel, length, count, nElem: opts.nElem && count % opts.nElem === 0 ? opts.nElem : 1, totalLength: length * count, mass: length * count * barMass(b.phi),
    });
  };
  const CORPS: BarPart = "CORPS DU DALOT", TETE: BarPart = "OUVRAGE DE TÊTE";
  const hook = 0.15; // crochets des barres transversales (cm 15, comme sur les plans types)
  const retour = Math.max(0.12, Math.min(inp.es, inp.er) - 2 * c); // retours des barres de piédroits dans dalle et radier
  const chaise = { phi: 12, s: 0 };
  const perM2 = (area: number, k: number) => Math.ceil(area * k);
  const legEq = (phi: number) => Math.min(0.9, Math.max(0.5, Math.round((40 * phi) / 1000 / 0.05) * 0.05));

  const de = g("dalle_ext"), di = g("dalle_int"), re = g("radier_ext"), ri = g("radier_int");
  const pe = g("pext_ext"), pi = g("pext_int"), pn = g("pint");
  const wallsRep = Math.max(pe?.rep.phi ?? 8, pi?.rep.phi ?? 8);

  // ── RADIER ──
  if (re) add(CORPS, "RADIER", "Nappe inférieure — barres transversales à crochets", re.bars, "crochets", [hook, B - 2 * c, hook], nAlong(re.bars.s));
  if (ri) add(CORPS, "RADIER", "Nappe supérieure — barres transversales à crochets", ri.bars, "crochets", [hook, B - 2 * c, hook], nAlong(ri.bars.s));
  if (re && ri) {
    const rp = re.rep.phi >= ri.rep.phi ? re.rep : ri.rep;
    add(CORPS, "RADIER", "Répartition longitudinale deux nappes", rp, "droite", [L - 2 * c], 2 * nAcross(B - 2 * c, rp.s), { nElem: 2 });
  }
  add(CORPS, "RADIER", "Chaises de maintien des nappes", chaise, "chaise", [0.24, 0.25, 0.2], perM2(B * L, 3), { spacingLabel: "3/m²" });
  if (pe) {
    const lg = legEq(pe.bars.phi);
    add(CORPS, "RADIER", "Équerres d'angle radier / piédroits", pe.bars, "equerre", [0.1, lg, lg, 0.1], 2 * nAlong(pe.bars.s), { nElem: 2 });
  }
  // ── DALLE ──
  if (de) add(CORPS, "DALLE", "Nappe supérieure — barres transversales à crochets", de.bars, "crochets", [hook, B - 2 * c, hook], nAlong(de.bars.s));
  if (di) add(CORPS, "DALLE", "Nappe inférieure — barres transversales à crochets", di.bars, "crochets", [hook, B - 2 * c, hook], nAlong(di.bars.s));
  if (de && di) {
    const rp = de.rep.phi >= di.rep.phi ? de.rep : di.rep;
    add(CORPS, "DALLE", "Répartition longitudinale deux nappes", rp, "droite", [L - 2 * c], 2 * nAcross(B - 2 * c, rp.s), { nElem: 2 });
  }
  add(CORPS, "DALLE", "Chaises de maintien des nappes", chaise, "chaise", [0.24, 0.25, 0.2], perM2(B * L, 3), { spacingLabel: "3/m²" });
  if (pe) {
    const lg = legEq(pe.bars.phi);
    add(CORPS, "DALLE", "Équerres d'angle dalle / piédroits", pe.bars, "equerre", [0.1, lg, lg, 0.1], 2 * nAlong(pe.bars.s), { nElem: 2 });
  }
  if (inp.gousset > 0 && di) {
    add(CORPS, "DALLE", "Barres de goussets à 45° (dalle et radier)", { phi: 10, s: di.bars.s }, "gousset", [0.3, inp.gousset * Math.SQRT2, 0.3], 4 * n * nAlong(di.bars.s), { nElem: 4 });
  }
  // ── PIÉDROITS ──
  const hv = Hout - 2 * c;
  add(CORPS, "PIÉDROITS", "Répartition horizontale (toutes faces)", { phi: wallsRep, s: pe?.rep.s ?? 0.2 }, "droite", [L - 2 * c],
    (2 * 2 + 2 * (n - 1)) * nAcross(inp.hInt, pe?.rep.s ?? 0.2));
  if (pe) add(CORPS, "PIÉDROITS", "Piédroits extérieurs — face extérieure, barres verticales", pe.bars, "U", [retour, hv, retour], 2 * nAlong(pe.bars.s), { nElem: 2 });
  if (pi) add(CORPS, "PIÉDROITS", "Piédroits extérieurs — face intérieure, barres verticales", pi.bars, "U", [retour, hv, retour], 2 * nAlong(pi.bars.s), { nElem: 2 });
  if (pn && n > 1) add(CORPS, "PIÉDROITS", "Piédroits intermédiaires — deux faces, barres verticales", pn.bars, "U", [retour, hv, retour], 2 * (n - 1) * nAlong(pn.bars.s), { nElem: 2 });
  const tWall = Math.min(inp.eExt, n > 1 ? inp.eInt : inp.eExt) - 2 * c;
  add(CORPS, "PIÉDROITS", "Épingles", { phi: 8, s: 0 }, "epingle", [0.05, tWall, 0.05], perM2((n + 1) * inp.hInt * L, 3), { spacingLabel: "3/m²" });

  // ── Têtes : identiques (un seul jeu compté deux fois, ailes comptées quatre fois) ou tête par tête.
  const t = inp.tetes;
  type HeadPart = {
    k: number; tv: Tetes; hr: HeadResult; tag: string;
    wings: { res: WingResult; tv: Tetes; k: number; tag: string }[];
  };
  const parts: HeadPart[] = heads.uniform
    ? [{ k: 2, tv: t, hr: heads.perHead[0], tag: "", wings: heads.perHead[0].wings.slice(0, 1).map((w) => ({ res: w.res, tv: w.tv, k: 4, tag: "" })) }]
    : heads.perHead.map((h) => {
      const sym = h.wings.length === 2 && h.wings[0].tv.angle === h.wings[1].tv.angle && h.wings[0].tv.long === h.wings[1].tv.long
        && h.wings[0].tv.ep === h.wings[1].tv.ep && h.wings[0].tv.hEnd === h.wings[1].tv.hEnd;
      return {
        k: 1, tv: h.tv, hr: h, tag: ` — ${h.id}`,
        wings: sym ? [{ res: h.wings[0].res, tv: h.wings[0].tv, k: 2, tag: ` — ${h.id}` }] : h.wings.map((w) => ({ res: w.res, tv: w.tv, k: 1, tag: ` — ${w.label}` })),
      };
    });
  const tanOf = (tv: Tetes) => (tv.murs ? Math.tan((tv.angle * Math.PI) / 180) : 0);
  /** Somme des tan α des deux ailes d'une tête (évasement du radier de tête). */
  const tanSum = (hp: HeadPart) => heads.uniform ? 2 * tanOf(t) : hp.hr.wings.reduce((acc, w) => acc + tanOf(w.tv), 0);

  // ── GUIDE-ROUES ── (deux, sur les bords libres de la dalle)
  for (const hp of parts) {
    // Avec un mur de tête (remblai sur la dalle), le guide-roue est son couronnement : pas d'élément distinct.
    if (hp.tv.guideRoues && !(hp.hr.headWall.H > 0.3)) {
      const gw = hp.tv.grL, gh = hp.tv.grH;
      add(CORPS, "GUIDE-ROUES", `Cadres ouverts ancrés dans la dalle${hp.tag}`, hp.hr.grBars, "U", [gh - c + 0.19, gw - 2 * c, gh - c + 0.19], hp.k * nAcross(B - 2 * c, hp.hr.grBars.s), { nElem: hp.k });
      add(CORPS, "GUIDE-ROUES", `Filants${hp.tag}`, { phi: 10, s: 0.2 }, "droite", [B - 2 * c], hp.k * 4, { nElem: hp.k });
    }
  }

  // ── GARDE-CORPS ── (deux rives)
  let vGc = 0;
  if (t.gardeCorps) {
    const gc = GARDE_CORPS;
    const GC: BarPart = "GARDE-CORPS";
    const c = t.gcCover; // enrobage propre au garde-corps
    const posts = gardeCorpsPosts(B);
    const nM = posts.filter((p) => p.main).length, nI = posts.length - nM;
    const bay = posts.length > 2 ? 2 * (posts[1].x - posts[0].x) - gc.post : B - 2 * gc.post; // lisse entre poteaux principaux
    const aM = gc.post - 2 * c, aI = gc.postInt - 2 * c, aE = gc.ep - 2 * c;
    add(GC, "POTEAUX PRINCIPAUX", "Barres verticales, ancrées dans la dalle", { phi: 10, s: 0 }, "L", [gc.hMain - c + gc.ancrage, 0.15], 2 * 4 * nM, { nElem: 2, spacingLabel: "—" });
    add(GC, "POTEAUX PRINCIPAUX", "Cadres", { phi: 6, s: 0.15 }, "cadre", [aM, aE], 2 * nM * (Math.ceil(gc.hMain / 0.15) + 1), { nElem: 2, length: 2 * (aM + aE) + 0.2 });
    if (nI > 0) {
      add(GC, "POTEAUX INTERMÉDIAIRES", "Barres verticales, ancrées dans la dalle", { phi: 10, s: 0 }, "L", [gc.h - c + gc.ancrage, 0.1], 2 * 4 * nI, { nElem: 2, spacingLabel: "—" });
      add(GC, "POTEAUX INTERMÉDIAIRES", "Cadres", { phi: 6, s: 0.15 }, "cadre", [aI, aE], 2 * nI * (Math.ceil((gc.h - gc.lisseH) / 0.15) + 1), { nElem: 2, length: 2 * (aI + aE) + 0.2 });
    }
    // Lisse : filants HA8 par travée entre poteaux principaux, barres de liaison à travers les poteaux principaux.
    add(GC, "LISSE", "Filants de la lisse, par travée", { phi: 8, s: 0 }, "droite", [bay], 2 * 4 * (nM - 1), { nElem: 2, spacingLabel: "—" });
    if (nM > 2) add(GC, "LISSE", "Barres de liaison à travers les poteaux principaux", { phi: 8, s: 0 }, "droite", [gc.post + 2 * 0.24], 2 * 4 * (nM - 2), { nElem: 2, spacingLabel: "—" });
    add(GC, "LISSE", "Barres d'about coudées dans les poteaux d'extrémité", { phi: 8, s: 0 }, "L", [0.41, 0.12], 2 * 4 * 2, { nElem: 2, spacingLabel: "—" });
    add(GC, "LISSE", "Cadres de la lisse", { phi: 6, s: 0.2 }, "cadre", [gc.lisseW - 2 * c, gc.lisseH - 2 * c], 2 * (nM - 1) * nAcross(bay, 0.2), { nElem: 2, length: 2 * (gc.lisseW + gc.lisseH - 4 * c) + 0.2 });
    // Béton : poteaux principaux sur toute leur hauteur hors lisse, intermédiaires sous la lisse, lisse entre principaux.
    vGc = 2 * (nM * gc.post * gc.ep * (gc.hMain - gc.lisseH) + nI * gc.postInt * gc.ep * (gc.h - gc.lisseH) + (nM - 1) * bay * gc.lisseW * gc.lisseH);
  }

  // ── OUVRAGE DE TÊTE (deux extrémités) ──
  const cm = (x: number) => Math.round(x * 100);
  let vHead = 0, vWing = 0, vRad = 0, vBeche = 0, propHeads = 0, coffHeads = 0, radLong = 0;
  for (const hp of parts) {
    const tv = hp.tv, hw = hp.hr.headWall, k = hp.k, tag = hp.tag;
    // Mur de tête sur la largeur de l'ouvrage (plus le débord du radier) : les ailes prolongent les voiles.
    const Bmt = B + 2 * tv.debord;
    const ts = tanSum(hp);
    // Radier de tête trapézoïdal : petite base B + 2·débord, grande base + L·Σ tan(angle) ; Wrt = largeur moyenne.
    const Wrt = B + 2 * tv.debord + tv.radierLong * ts / 2;
    if (hw.H > 0.3) {
      add(TETE, "MUR DE TÊTE", `Face côté remblai — barres en attente dans la dalle${tag}`, hw.bars, "L", [hw.H - c, anchor(hw.bars.phi)], k * nAcross(Bmt - 2 * c, hw.bars.s), { nElem: k });
      add(TETE, "MUR DE TÊTE", `Face vue — barres verticales${tag}`, { phi: 10, s: 0.2 }, "L", [hw.H - c, anchor(10)], k * nAcross(Bmt - 2 * c, 0.2), { nElem: k });
      add(TETE, "MUR DE TÊTE", `Répartition horizontale deux faces${tag}`, hw.rep, "droite", [Bmt - 2 * c], k * 2 * nAcross(hw.H - c, hw.rep.s), { nElem: k });
    }
    const foot = hp.hr.wings[0]?.res.footBars;
    if (tv.radierLong > 0) {
      const wMin = B + 2 * tv.debord - 2 * c, wMax = B + 2 * tv.debord + tv.radierLong * ts - 2 * c;
      const vl = `var (${cm(wMin)}/${cm(wMax)})`;
      const rows = nAcross(tv.radierLong - 2 * c, 0.2);
      add(TETE, "RADIER DE TÊTE", `Nappe inférieure — barres transversales${tag}`, foot ?? { phi: 10, s: 0.2 }, "crochets", [hook, (wMin + wMax) / 2, hook], k * nAcross(tv.radierLong - 2 * c, foot?.s ?? 0.2), { nElem: k, varLabel: vl });
      add(TETE, "RADIER DE TÊTE", `Nappe supérieure — barres transversales${tag}`, { phi: 10, s: 0.2 }, "crochets", [hook, (wMin + wMax) / 2, hook], k * rows, { nElem: k, varLabel: vl });
      add(TETE, "RADIER DE TÊTE", `Barres longitudinales deux nappes${tag}`, { phi: 10, s: 0.2 }, "droite", [tv.radierLong - 2 * c], k * 2 * nAcross(Wrt - 2 * c, 0.2), { nElem: k });
      add(TETE, "RADIER DE TÊTE", `Chaises${tag}`, chaise, "chaise", [0.24, 0.25, 0.2], perM2(k * Wrt * tv.radierLong, 3), { spacingLabel: "3/m²" });
    }
    for (const wg of hp.wings) {
      const w = wg.res, wt = wg.tv, kw = wg.k, wtag = wg.tag;
      const Havg = (w.Htot + w.Hend) / 2;
      const vl = `var (${cm(w.Hend - c)}/${cm(w.Htot - c)})`;
      const nv = nAcross(wt.long - 2 * c, w.bars.s);
      add(TETE, "MUR EN L", `Voile — barres verticales côté remblai, ancrées dans la semelle${wtag}`, w.bars, "L", [Havg - c, anchor(w.bars.phi)], kw * nv, { nElem: kw, varLabel: vl });
      add(TETE, "MUR EN L", `Voile — barres verticales face vue${wtag}`, { phi: 10, s: 0.2 }, "L", [Havg - c, anchor(10)], kw * nAcross(wt.long - 2 * c, 0.2), { nElem: kw, varLabel: vl });
      add(TETE, "MUR EN L", `Voile — barres horizontales deux faces${wtag}`, w.rep, "droite", [wt.long - 2 * c], kw * 2 * nAcross(Havg, w.rep.s), { nElem: kw });
      add(TETE, "MUR EN L", `Barres en ciseau au raccord avec le piédroit${wtag}`, { phi: 12, s: 0.2 }, "crochets", [0.05, 0.5 + 1.0, 0.05], kw * nAcross(w.Htot, 0.25), { nElem: kw, varLabel: "50 / 100" });
      add(TETE, "MUR EN L", `Couronnement${wtag}`, { phi: 10, s: 0.2 }, "droite", [Math.hypot(wt.long, w.Htot - w.Hend)], kw * 2, { nElem: kw });
      add(TETE, "MUR EN L", `Semelle — cadres transversaux (deux nappes liées)${wtag}`, w.footBars, "U", [wt.semEp - 2 * c, wt.semelle - 2 * c, wt.semEp - 2 * c], kw * nAcross(wt.long - 2 * c, w.footBars.s), { nElem: kw });
      add(TETE, "MUR EN L", `Semelle — filants deux nappes${wtag}`, { phi: 10, s: 0.2 }, "droite", [wt.long - 2 * c], kw * 2 * nAcross(wt.semelle - 2 * c, 0.2), { nElem: kw });
      // Voile au-dessus du radier ; semelle comptée sur le talon et l'épaisseur du voile (le reste est le radier de tête).
      vWing += kw * wt.long * (Math.max(0, Havg - wt.semEp) * wt.ep + Math.min(wt.semelle, wt.patin + wt.ep) * wt.semEp);
      propHeads += 0.05 * kw * wt.long * (wt.semelle + 0.2);
      coffHeads += kw * (2 * wt.long * Havg + 2 * (wt.long + wt.semelle) * wt.semEp);
    }
    // Bêche sous l'about du radier de tête, d'un about d'aile à l'autre (grande base).
    const Wb = B + 2 * tv.debord + tv.radierLong * ts;
    if (tv.becheProf > 0) {
      const nb = nAcross(Wb - 2 * c, 0.2);
      add(TETE, "BÊCHE", `Cadres verticaux${tag}`, { phi: 8, s: 0.2 }, "U", [tv.becheEp - 2 * c, tv.becheProf + inp.er - 2 * c, tv.becheEp - 2 * c], k * nb, { nElem: k });
      add(TETE, "BÊCHE", `Filants horizontaux${tag}`, { phi: 10, s: 0.2 }, "droite", [Wb - 2 * c], k * 2 * nAcross(tv.becheProf, 0.25), { nElem: k });
      add(TETE, "BÊCHE", `Épingles${tag}`, { phi: 8, s: 0.2 }, "epingle", [0.05, tv.becheEp - 2 * c, 0.05], k * nb, { nElem: k });
    }
    vHead += k * Bmt * hw.H * tv.murTeteEp + (tv.guideRoues && !(hw.H > 0.3) ? k * Bmt * tv.grL * tv.grH : 0);
    vRad += k * Wrt * tv.radierLong * inp.er;
    vBeche += k * Wb * tv.becheProf * tv.becheEp;
    propHeads += 0.05 * k * Wrt * tv.radierLong;
    coffHeads += k * 2 * B * hw.H + k * 2 * Wb * tv.becheProf;
    radLong += k * tv.radierLong;
  }

  const steelMass = bars.reduce((s, b) => s + b.mass, 0);

  // ── Volumes, surfaces ──
  const cells = inp.openings.reduce((s, o) => s + o * inp.hInt, 0);
  const vBody = (B * Hout - cells + 4 * n * (inp.gousset ** 2 / 2)) * L;
  const concrete = vBody + vHead + vWing + vRad + vBeche + vGc;
  const proprete = 0.05 * ((B + 0.2) * (L + 0.2)) + propHeads;
  const coffrage =
    inp.openings.reduce((s, o) => s + 2 * (o + inp.hInt), 0) * L + 2 * Hout * L + 2 * (B * Hout - cells)
    + coffHeads
    + (vGc > 0 ? 2 * (gardeCorpsPosts(B).reduce((s, q) => s + 2 * (q.w + GARDE_CORPS.ep) * q.h, 0) + 2 * B * GARDE_CORPS.lisseH + B * GARDE_CORPS.lisseW) : 0);
  const deblai = (B + 2) * (L + radLong + 2) * (inp.Df + 0.05 + 0.3);
  const remblai = Math.max(0, (B + 4) * (Hout + inp.hr) * L - B * Hout * L);
  const etanch = (B + 2 * Hout) * L;

  const lines: QuantityLine[] = [
    { lot: "Terrassements", designation: "Déblai en terrain de toute nature pour fouille de l'ouvrage", unit: "m³", quantity: deblai },
    { lot: "Terrassements", designation: "Remblai latéritique sélectionné compacté à 95 % OPM autour et au-dessus de l'ouvrage", unit: "m³", quantity: remblai },
    { lot: "Béton", designation: "Béton de propreté dosé à 150 kg/m³ (ép. 5 cm)", unit: "m³", quantity: proprete },
    { lot: "Béton", designation: `Béton armé B${inp.fc28} pour corps du dalot (radier, piédroits, dalle)`, unit: "m³", quantity: vBody },
    { lot: "Béton", designation: `Béton armé B${inp.fc28} pour murs de tête et guide-roues`, unit: "m³", quantity: vHead },
    ...(vWing > 0 ? [{ lot: "Béton", designation: `Béton armé B${inp.fc28} pour murs en aile et semelles`, unit: "m³", quantity: vWing }] : []),
    { lot: "Béton", designation: `Béton armé B${inp.fc28} pour radiers de tête et bêches parafouilles`, unit: "m³", quantity: vRad + vBeche },
    ...(vGc > 0 ? [{ lot: "Béton", designation: `Béton armé B${inp.fc28} pour garde-corps (poteaux et lisses)`, unit: "m³", quantity: vGc }] : []),
    { lot: "Aciers", designation: `Aciers HA FeE${inp.fe} façonnés et posés (nomenclature)`, unit: "kg", quantity: steelMass },
    { lot: "Coffrages", designation: "Coffrage ordinaire pour parements cachés et vus", unit: "m²", quantity: coffrage },
    { lot: "Finitions", designation: "Badigeon bitumineux (2 couches) sur parements enterrés", unit: "m²", quantity: etanch },
  ];
  return { bars, lines, steelMass, concrete, ratio: steelMass / concrete };
}

/** Récapitulatif par diamètre (barres commerciales de 12 m). */
export function steelSummary(bars: BarMark[]) {
  const by = new Map<number, { length: number; mass: number }>();
  for (const b of bars) {
    const r = by.get(b.phi) ?? { length: 0, mass: 0 };
    r.length += b.totalLength;
    r.mass += b.mass;
    by.set(b.phi, r);
  }
  return Array.from(by.entries()).sort((a, b) => a[0] - b[0])
    .map(([phi, r]) => ({ phi, unitMass: barMass(phi), length: r.length, bars12: r.length / COMMERCIAL, mass: r.mass }));
}

export function barsToCsv(bars: BarMark[]) {
  const head = ["Partie", "Élément", "N°", "Désignation", "Diamètre", "Espacement (cm)", "Forme", "Cotes (cm)", "Longueur (m)", "Nombre", "Longueur totale (m)", "Poids unitaire (kg/m)", "Poids total (kg)"];
  const f = (x: number, d = 2) => x.toFixed(d).replace(".", ",");
  const rows = bars.map((b) => [
    b.part, b.element, b.rep, b.designation, `HA ${b.phi}`, b.spacingLabel, b.shape, b.varLabel ?? b.dims.map((x) => Math.round(x * 100)).join(" + "),
    f(b.length), b.count, f(b.totalLength), f(barMass(b.phi), 3), f(b.mass, 2),
  ].map((x) => `"${String(x).replace(/"/g, '""')}"`).join(";"));
  const total = bars.reduce((s, b) => s + b.mass, 0);
  const recap = steelSummary(bars).map((r) => `;;;;HA ${r.phi};;;;;;${f(r.length)};${f(r.unitMass, 3)};${f(r.mass)}`);
  return "\uFEFF" + [head.join(";"), ...rows, "", ...recap, `;;;;;;;;;;;POIDS TOTAL (kg);${f(total, 2)}`].join("\r\n");
}
