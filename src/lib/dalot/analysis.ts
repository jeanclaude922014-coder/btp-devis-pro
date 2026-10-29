/**
 * Cas de charge, balayage des convois et combinaisons ELU/ELS.
 *
 * Les résultats sont rangés dans des vecteurs « à plat » : M, V, N à chaque station puis la
 * pression de sol sous chaque nœud du radier. Le modèle étant linéaire, les convois sont
 * déplacés pas à pas à l'aide des lignes d'influence (réponse à 1 kN sur chaque nœud de la
 * dalle), ce qui donne pour chaque station la position la plus défavorable.
 */

import {
  aOfL, convoyLibrary, diffusionDepth, dynamicCoef, maxLoadOnLength, stripBlocks, trafficContext,
  type ConvoyDef, type StripBlock, type TrafficContext,
} from "./convoys";
import type { DalotInput } from "./fields";
import {
  addMemberLoad, addTopLoad, buildFrame, emptyLoad, influence, solve,
  type FrameModel, type LoadVector, type Response,
} from "./frame";

export const GAMMA_W = 10;

export type Flat = Float64Array;

export type Position = { config: number; X: number; reversed: boolean };

export type TrafficEnvelope = {
  def: ConvoyDef;
  delta: number;
  /** Effets caractéristiques (coefficients bc/bt et δ inclus), max et min par quantité. */
  max: Flat;
  min: Flat;
  argMax: Int32Array;
  argMin: Int32Array;
  positions: Position[];
  S: number;
  /** Pour A(l) : longueur chargée retenue par quantité (max). */
  info: string;
};

export type Combo = {
  id: string;
  /** ELU/ELS : BAEL 91 et Fascicule 61. EC2 : combinaisons EN 1990 (γQ = 1,35) pour le contrôle EC2. */
  state: "ELU" | "ELS" | "EC2";
  label: string;
  gG: number;
  earth: "max" | "min";
  gP: number;
  /** Indice du convoi dans `traffic`, -1 sans trafic. */
  convoy: number;
  gQ: number;
};

export type Envelope = { max: Flat; min: Flat; cMax: Int32Array; cMin: Int32Array };

export type Analysis = {
  model: FrameModel;
  ctx: TrafficContext;
  D: number;
  nq: number;
  cases: { G: Flat; Pmax: Flat; Pmin: Flat; Qr: Flat };
  caseLoads: { gTop: number; selfTop: number; selfRaft: number; selfWalls: number[] };
  traffic: TrafficEnvelope[];
  combos: Combo[];
  elu: Envelope;
  els: Envelope;
  ec2: Envelope;
  /** Combinaisons à vide (sans trafic) pour la vérification du contact du radier. */
  quantities: { ns: number; nRaft: number };
  /** Matrice d'influence IM[q·nTop + j] (effet q d'une charge unitaire au nœud j de la dalle). */
  influence: { IM: Flat; nTop: number; xTop: number[] };
};

export function flat(r: Response): Flat {
  const ns = r.M.length;
  const out = new Float64Array(3 * ns + r.p.length);
  out.set(r.M, 0);
  out.set(r.V, ns);
  out.set(r.N, 2 * ns);
  out.set(r.p, 3 * ns);
  return out;
}

function wallMemberIndex(model: FrameModel, k: number) {
  return model.members.findIndex((m) => m.kind.startsWith("piedroit") && m.index === k);
}

/** Pression horizontale sur un piédroit extérieur, intégrée sur toute la hauteur extérieure. */
function addWallPressure(model: FrameModel, f: LoadVector, k: number, pressure: (y: number) => number) {
  const mi = wallMemberIndex(model, k);
  const m = model.members[mi];
  const dir = k === 0 ? 1 : -1; // vers l'intérieur de l'ouvrage
  const yLow = model.yBot - model.input.er / 2;
  const yHigh = model.yTop + model.input.es / 2;
  const n = 60;
  for (let i = 0; i < n; i++) {
    const y0 = yLow + ((yHigh - yLow) * i) / n;
    const y1 = yLow + ((yHigh - yLow) * (i + 1)) / n;
    const q0 = pressure(y0), q1 = pressure(y1);
    const a = Math.max(y0, model.yBot), b = Math.min(y1, model.yTop);
    if (b > a) {
      const qa = q0 + ((q1 - q0) * (a - y0)) / (y1 - y0);
      const qb = q0 + ((q1 - q0) * (b - y0)) / (y1 - y0);
      addMemberLoad(model, f, mi, a - model.yBot, b - model.yBot, qa, qb, dir, 0);
    }
    // Parties au droit du radier et de la dalle : ramenées aux nœuds d'angle.
    if (y0 < model.yBot) {
      const top = Math.min(y1, model.yBot);
      f[m.nodes[0] * 3] += dir * ((q0 + pressure(top)) / 2) * (top - y0);
    }
    if (y1 > model.yTop) {
      const bot = Math.max(y0, model.yTop);
      f[m.nodes[m.nodes.length - 1] * 3] += dir * ((pressure(bot) + q1) / 2) * (y1 - bot);
    }
  }
}

function addRaftLoad(model: FrameModel, f: LoadVector, q: number) {
  // Charge verticale uniforme sur toute la largeur du radier (vers le bas).
  const ids = model.raftNodes;
  model.raftTrib.forEach((t, k) => { f[ids[k] * 3 + 1] -= q * t; });
}

export function runAnalysis(inp: DalotInput): Analysis {
  const model = buildFrame(inp);
  const ns = model.nStations;
  const nRaft = model.raftNodes.length;
  const nq = 3 * ns + nRaft;
  const B = model.xRight - model.xLeft;

  // ── G : poids propre + remblai + chaussée ──
  const fG = emptyLoad(model);
  const selfTop = inp.gammaBA * inp.es;
  const gTop = inp.gammaR * inp.hr + inp.gammaCh * inp.ech;
  addTopLoad(model, fG, model.xLeft, model.xRight, selfTop + gTop);
  const selfRaft = inp.gammaBA * inp.er;
  addRaftLoad(model, fG, selfRaft);
  const selfWalls: number[] = [];
  for (let k = 0; k < model.xs.length; k++) {
    const mi = wallMemberIndex(model, k);
    const m = model.members[mi];
    const w = inp.gammaBA * m.thickness * inp.hInt; // kN par mètre de bande
    selfWalls.push(w);
    addMemberLoad(model, fG, mi, 0, m.length, w / m.length, w / m.length, 0, -1);
  }
  if (inp.gousset > 0) {
    const wg = (inp.gammaBA * inp.gousset ** 2) / 2;
    // Deux goussets par angle de cellule (haut et bas) : poids ramené aux nœuds d'appui.
    for (const id of [...model.topNodes, ...model.raftNodes]) {
      const x = model.nodes[id].x;
      const k = model.xs.findIndex((xx) => Math.abs(xx - x) < 1e-6);
      if (k >= 0) fG[id * 3 + 1] -= wg * (k === 0 || k === model.xs.length - 1 ? 1 : 2);
    }
  }
  const G = flat(solve(model, fG));

  // ── Poussées des terres (Kmax / Kmin), avec eau éventuelle ──
  const yTopExt = model.yTop + inp.es / 2;
  const yBotExt = model.yBot - inp.er / 2;
  const yWater = inp.nappe ? yBotExt + inp.hw : -Infinity;
  const sigmaV = (y: number) => {
    const depth = yTopExt - y;
    let s = gTop + inp.gammaR * Math.max(0, depth);
    if (inp.nappe && y < yWater) s -= GAMMA_W * (yWater - y);
    return Math.max(0, s);
  };
  const water = (y: number) => (inp.nappe && y < yWater ? GAMMA_W * (yWater - y) : 0);
  const earth = (K: number) => {
    const f = emptyLoad(model);
    for (const k of [0, model.xs.length - 1]) addWallPressure(model, f, k, (y) => K * sigmaV(y) + water(y));
    return flat(solve(model, f));
  };
  const Pmax = earth(inp.Kmax);
  const Pmin = earth(inp.Kmin);

  // ── Surcharge de remblai (trafic au voisinage), sur les deux piédroits ──
  const fQ = emptyLoad(model);
  for (const k of [0, model.xs.length - 1]) addWallPressure(model, fQ, k, () => inp.Kmax * inp.qRemblai);
  const Qr = flat(solve(model, fQ));

  // ── Trafic ──
  const ctx = trafficContext(inp);
  const D = diffusionDepth(inp);
  const defs = convoyLibrary(inp, ctx);
  const infl = influence(model).map(flat);
  const nTop = model.topNodes.length;
  // Matrice d'influence IM[q·nTop + j]
  const IM = new Float64Array(nq * nTop);
  for (let j = 0; j < nTop; j++) for (let q = 0; q < nq; q++) IM[q * nTop + j] = infl[j][q];
  const xTop = model.topNodes.map((id) => model.nodes[id].x);

  const Gcover = (selfTop + gTop) * B * inp.Lr;
  const traffic: TrafficEnvelope[] = [];
  for (const def of defs) {
    if (def.notApplicable) continue;
    if (def.family === "A") {
      traffic.push(aEnvelope(def, ctx, IM, nq, nTop, model.topTrib));
      continue;
    }
    const S = Math.max(...def.configs.map((c) => maxLoadOnLength(c, B)));
    const delta = def.dynamic ? dynamicCoef(B, Gcover, S) : 1;
    const env = convoyEnvelope(def, D, transverseSpread(inp), IM, nq, nTop, xTop, model.xLeft, model.xRight, inp.pas, delta);
    env.S = S;
    if (def.udl) {
      // Charge répartie simultanée : sur les zones de même signe des lignes d'influence.
      for (let q = 0; q < nq; q++) {
        let sp = 0, sn = 0;
        for (let j = 0; j < nTop; j++) {
          const v = IM[q * nTop + j] * model.topTrib[j];
          if (v > 0) sp += v; else sn += v;
        }
        env.max[q] += def.udl * sp;
        env.min[q] += def.udl * sn;
      }
      env.info = `TS balayé pas à pas + UDL ${def.udl} kN/m² sur les zones défavorables.`;
    }
    traffic.push(env);
  }

  // ── Combinaisons (BAEL 91 mod. 99 annexe D / Fascicule 61 titre II) ──
  const combos: Combo[] = [];
  let ce = 0, cs = 0, cc = 0;
  const conv = [-1, ...traffic.map((_, i) => i)];
  for (const c of conv) {
    const t = c >= 0 ? traffic[c] : null;
    for (const gG of [1.35, 1]) for (const [earthKind, gP] of [["max", 1.35], ["min", 1]] as const) {
      ce++;
      combos.push({
        id: `ELU-${String(ce).padStart(2, "0")}`, state: "ELU", gG, earth: earthKind, gP, convoy: c, gQ: t ? t.def.gammaU : 0,
        label: `${fmt(gG)} G + ${fmt(gP)} P${earthKind === "max" ? "max" : "min"}${t ? ` + ${fmt(t.def.gammaU)} (${t.def.label} + q remblai)` : ""}`,
      });
    }
    for (const gG of [1.35, 1]) for (const [earthKind, gP] of [["max", 1.35], ["min", 1]] as const) {
      cc++;
      combos.push({
        id: `EC-${String(cc).padStart(2, "0")}`, state: "EC2", gG, earth: earthKind, gP, convoy: c, gQ: t ? 1.35 : 0,
        label: `${fmt(gG)} G + ${fmt(gP)} P${earthKind}${t ? ` + 1,35 (${t.def.label} + q remblai)` : ""} — EN 1990`,
      });
    }
    for (const earthKind of ["max", "min"] as const) {
      cs++;
      combos.push({
        id: `ELS-${String(cs).padStart(2, "0")}`, state: "ELS", gG: 1, earth: earthKind, gP: 1, convoy: c, gQ: t ? t.def.gammaS : 0,
        label: `G + P${earthKind}${t ? ` + ${fmt(t.def.gammaS)} (${t.def.label} + q remblai)` : ""}`,
      });
    }
  }

  const envelope = (state: Combo["state"]): Envelope => {
    const max = new Float64Array(nq).fill(-Infinity), min = new Float64Array(nq).fill(Infinity);
    const cMax = new Int32Array(nq), cMin = new Int32Array(nq);
    combos.forEach((cb, ci) => {
      if (cb.state !== state) return;
      const P = cb.earth === "max" ? Pmax : Pmin;
      const t = cb.convoy >= 0 ? traffic[cb.convoy] : null;
      for (let q = 0; q < nq; q++) {
        const base = cb.gG * G[q] + cb.gP * P[q];
        const hi = t ? base + cb.gQ * (t.max[q] + Math.max(0, Qr[q])) : base;
        const lo = t ? base + cb.gQ * (t.min[q] + Math.min(0, Qr[q])) : base;
        if (hi > max[q]) { max[q] = hi; cMax[q] = ci; }
        if (lo < min[q]) { min[q] = lo; cMin[q] = ci; }
      }
    });
    return { max, min, cMax, cMin };
  };

  return {
    model, ctx, D, nq,
    cases: { G, Pmax, Pmin, Qr },
    influence: { IM, nTop, xTop },
    caseLoads: { gTop, selfTop, selfRaft, selfWalls },
    traffic, combos,
    elu: envelope("ELU"), els: envelope("ELS"), ec2: envelope("EC2"),
    quantities: { ns, nRaft },
  };
}

function fmt(x: number) {
  return x.toFixed(x === Math.round(x) ? 0 : x * 100 === Math.round(x * 100) ? 2 : 3).replace(".", ",");
}

function aEnvelope(def: ConvoyDef, ctx: TrafficContext, IM: Flat, nq: number, nTop: number, trib: number[]): TrafficEnvelope {
  const max = new Float64Array(nq), min = new Float64Array(nq);
  let lMin = Infinity, lMax = 0;
  for (let q = 0; q < nq; q++) {
    let sp = 0, sn = 0, lp = 0, ln = 0;
    for (let j = 0; j < nTop; j++) {
      const v = IM[q * nTop + j] * trib[j];
      if (v > 0) { sp += v; lp += trib[j]; } else if (v < 0) { sn += v; ln += trib[j]; }
    }
    max[q] = lp > 0 ? aOfL(lp, ctx) * sp : 0;
    min[q] = ln > 0 ? aOfL(ln, ctx) * sn : 0;
    if (lp > 0) { lMin = Math.min(lMin, lp); lMax = Math.max(lMax, lp); }
  }
  return {
    def, delta: 1, max, min, argMax: new Int32Array(nq).fill(-1), argMin: new Int32Array(nq).fill(-1), positions: [], S: 0,
    info: `Longueurs chargées de ${lMin.toFixed(2)} à ${lMax.toFixed(2)} m, A(l) de ${aOfL(lMax, ctx).toFixed(2)} à ${aOfL(lMin, ctx).toFixed(2)} kN/m².`,
  };
}

/** Répartit des blocs de charge (kN/m, vers le bas) sur les nœuds de la dalle. */
export function blocksToNodal(blocks: StripBlock[], xTop: number[], xLeft: number, xRight: number): Float64Array {
  const F = new Float64Array(xTop.length);
  const last = xTop.length - 1;
  for (const b of blocks) {
    const a = Math.max(b.x0, xLeft), e = Math.min(b.x1, xRight);
    if (e <= a) continue;
    if (a < xTop[0]) F[0] += b.q * (Math.min(e, xTop[0]) - a);
    if (e > xTop[last]) F[last] += b.q * (e - Math.max(a, xTop[last]));
    const ia = Math.max(a, xTop[0]), ib = Math.min(e, xTop[last]);
    if (ib <= ia) continue;
    for (let k = 0; k < last; k++) {
      const l = xTop[k], r = xTop[k + 1];
      const s = Math.max(ia, l), t = Math.min(ib, r);
      if (t <= s) continue;
      const P = b.q * (t - s), mid = (s + t) / 2, h = r - l;
      F[k] += (P * (r - mid)) / h;
      F[k + 1] += (P * (mid - l)) / h;
    }
  }
  return F;
}

export function placeBlocks(blocks: StripBlock[], X: number, reversed: boolean): StripBlock[] {
  return blocks.map((b) => (reversed
    ? { x0: X - b.x1, x1: X - b.x0, q: b.q }
    : { x0: X + b.x0, x1: X + b.x1, q: b.q }));
}

/** Étalement transversal des charges localisées : 0,5·L, L = plus petite ouverture (sécuritaire). */
export function transverseSpread(inp: DalotInput) {
  return 0.5 * Math.min(...inp.openings);
}

function convoyEnvelope(
  def: ConvoyDef, D: number, spread: number, IM: Flat, nq: number, nTop: number, xTop: number[],
  xLeft: number, xRight: number, pas: number, delta: number
): TrafficEnvelope {
  const max = new Float64Array(nq), min = new Float64Array(nq);
  const argMax = new Int32Array(nq).fill(-1), argMin = new Int32Array(nq).fill(-1);
  const positions: Position[] = [];
  const Q = new Float64Array(nq);
  def.configs.forEach((cfg, ci) => {
    const { blocks } = stripBlocks(cfg, D, spread);
    const lo = Math.min(...blocks.map((b) => b.x0));
    const hi = Math.max(...blocks.map((b) => b.x1));
    const symmetric = isSymmetric(blocks);
    for (const reversed of symmetric ? [false] : [false, true]) {
      const start = reversed ? xLeft + lo : xLeft - hi;
      const end = reversed ? xRight + hi : xRight - lo;
      for (let X = start; X <= end + 1e-9; X += pas) {
        const F = blocksToNodal(placeBlocks(blocks, X, reversed), xTop, xLeft, xRight);
        let any = false;
        for (let j = 0; j < nTop; j++) if (F[j] !== 0) { any = true; break; }
        if (!any) continue;
        const pi = positions.length;
        positions.push({ config: ci, X, reversed });
        for (let q = 0; q < nq; q++) {
          let s = 0;
          const row = q * nTop;
          for (let j = 0; j < nTop; j++) s += IM[row + j] * F[j];
          Q[q] = s * delta;
        }
        for (let q = 0; q < nq; q++) {
          if (Q[q] > max[q]) { max[q] = Q[q]; argMax[q] = pi; }
          if (Q[q] < min[q]) { min[q] = Q[q]; argMin[q] = pi; }
        }
      }
    }
  });
  return { def, delta, max, min, argMax, argMin, positions, S: 0, info: "" };
}

function isSymmetric(blocks: StripBlock[]) {
  const lo = Math.min(...blocks.map((b) => b.x0));
  const hi = Math.max(...blocks.map((b) => b.x1));
  const key = (b: StripBlock) => `${(b.x0 - lo).toFixed(4)}|${(b.x1 - lo).toFixed(4)}|${b.q.toFixed(4)}`;
  const mirror = (b: StripBlock) => `${(hi - b.x1).toFixed(4)}|${(hi - b.x0).toFixed(4)}|${b.q.toFixed(4)}`;
  const a = blocks.map(key).sort().join(";");
  const m = blocks.map(mirror).sort().join(";");
  return a === m;
}

/**
 * « Simulation dynamique » : effet q (moment, effort tranchant…) pendant le passage d'un convoi,
 * position par position (essieu de référence en X). Le maximum des courbes est l'enveloppe exacte.
 */
export function trafficHistory(an: Analysis, inp: DalotInput, t: TrafficEnvelope, q: number) {
  const { IM, nTop, xTop } = an.influence;
  const m = an.model;
  const spread = transverseSpread(inp);
  const blocksBy = t.def.configs.map((cfg) => stripBlocks(cfg, an.D, spread).blocks);
  const curves = new Map<string, { label: string; pts: { X: number; v: number }[] }>();
  for (const p of t.positions) {
    const F = blocksToNodal(placeBlocks(blocksBy[p.config], p.X, p.reversed), xTop, m.xLeft, m.xRight);
    let s = 0;
    for (let j = 0; j < nTop; j++) s += IM[q * nTop + j] * F[j];
    const key = `${p.config}|${p.reversed}`;
    if (!curves.has(key)) curves.set(key, { label: `${t.def.configs[p.config].label}${p.reversed ? " (sens inverse)" : ""}`, pts: [] });
    curves.get(key)!.pts.push({ X: p.X - m.xLeft, v: s * t.delta });
  }
  return Array.from(curves.values());
}
