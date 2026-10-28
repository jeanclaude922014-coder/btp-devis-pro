/**
 * Convois du Fascicule 61 titre II (charges civiles et militaires), convoi D240 et convoi
 * personnalisé. Chaque convoi est décrit par des empreintes rectangulaires (roues, chenilles,
 * essieux) placées dans un repère lié au véhicule : x dans le sens de circulation (qui est
 * aussi le sens de la portée du dalot), y en travers de la chaussée.
 */

import type { ConvoyId, DalotInput } from "./fields";

export type Patch = { x: number; y: number; P: number; ax: number; ay: number };

export type ConvoyConfig = {
  /** Libellé de la configuration (ex. « 2 files de camions »). */
  label: string;
  patches: Patch[];
  /** Coefficient réglementaire (bc, bt…) appliqué aux charges. */
  coef: number;
};

export type ConvoyDef = {
  id: ConvoyId;
  label: string;
  family: "A" | "B" | "M" | "D" | "custom";
  gammaU: number;
  gammaS: number;
  /** Majoration dynamique δ applicable. */
  dynamic: boolean;
  configs: ConvoyConfig[];
  /** Raison de non-application (convoi non autorisé pour la classe du pont). */
  notApplicable?: string;
  description: string;
};

export type TrafficContext = {
  nv: number;
  V: number;
  V0: number;
  a1: number;
  a2: number;
  classe: 1 | 2 | 3;
};

export function trafficContext(inp: DalotInput): TrafficContext {
  const Lc = inp.Lc;
  const nv = Lc >= 6 ? Math.floor(Lc / 3) : Lc >= 5 ? 2 : 1;
  const classe = inp.classe;
  const V0 = classe === 1 ? 3.5 : classe === 2 ? 3.0 : 2.75;
  const V = Lc / nv;
  const a1Table: Record<number, number[]> = { 1: [1, 1, 0.9, 0.75, 0.7], 2: [1, 0.9], 3: [0.9, 0.8] };
  const t = a1Table[classe];
  const a1 = t[Math.min(nv, t.length) - 1] ?? t[t.length - 1];
  return { nv, V, V0, a1, a2: V0 / V, classe };
}

/** A(l) en kN/m² (Fascicule 61 titre II, art. 4.2), coefficients a1 et a2 inclus. */
export function aOfL(l: number, ctx: TrafficContext) {
  const base = 2.3 + 360 / (l + 12);
  const withA1 = Math.max(ctx.a1 * base, 4 - 0.002 * l);
  return withA1 * ctx.a2;
}

const BC_COEF: Record<number, number[]> = { 1: [1.2, 1.1, 0.95, 0.8, 0.7], 2: [1, 1], 3: [1, 0.8] };

function bcTruck(x0: number, y0: number): Patch[] {
  // Camion Bc de 30 t : essieu avant 6 t, deux essieux arrière 12 t ; roues à 2,00 m.
  const axles = [
    { x: 0, P: 60, a: 0.2 },
    { x: 4.5, P: 120, a: 0.25 },
    { x: 6.0, P: 120, a: 0.25 },
  ];
  return axles.flatMap((ax) => [
    { x: x0 + ax.x, y: y0, P: ax.P / 2, ax: ax.a, ay: ax.a },
    { x: x0 + ax.x, y: y0 + 2, P: ax.P / 2, ax: ax.a, ay: ax.a },
  ]);
}

export function convoyLibrary(inp: DalotInput, ctx: TrafficContext): ConvoyDef[] {
  const defs: ConvoyDef[] = [];
  const want = new Set(inp.convoys);

  if (want.has("A")) {
    defs.push({
      id: "A", label: "A(l)", family: "A", gammaU: 1.605, gammaS: 1.2, dynamic: false, configs: [],
      description: `A(l) = a1·a2·(2,30 + 360/(l+12)) kN/m², a1 = ${ctx.a1.toFixed(2)}, a2 = V0/V = ${ctx.a2.toFixed(3)} ; chargé sur les zones défavorables des lignes d'influence.`,
    });
  }
  if (want.has("Bc")) {
    const coefs = BC_COEF[ctx.classe];
    const configs: ConvoyConfig[] = [];
    for (let nf = 1; nf <= Math.min(ctx.nv, 3); nf++) {
      const patches: Patch[] = [];
      for (let f = 0; f < nf; f++) {
        const y0 = f * 2.5; // 0,50 m entre roues de deux camions voisins
        patches.push(...bcTruck(0, y0), ...bcTruck(10.5, y0)); // deux camions par file, 4,50 m mini
      }
      configs.push({ label: `${nf} file${nf > 1 ? "s" : ""} de 2 camions`, patches, coef: coefs[Math.min(nf, coefs.length) - 1] });
    }
    defs.push({
      id: "Bc", label: "Bc", family: "B", gammaU: 1.605, gammaS: 1.2, dynamic: true, configs,
      description: "Camions de 30 t (essieux 6 + 12 + 12 t, entraxes 4,50 et 1,50 m), deux camions par file, coefficient bc selon la classe et le nombre de files.",
    });
  }
  if (want.has("Bt")) {
    const bt = ctx.classe === 1 ? 1 : ctx.classe === 2 ? 0.9 : 0;
    const tandem = (y0: number): Patch[] => [0, 1.35].flatMap((x) => [
      { x, y: y0, P: 80, ax: 0.25, ay: 0.6 },
      { x, y: y0 + 2, P: 80, ax: 0.25, ay: 0.6 },
    ]);
    const configs: ConvoyConfig[] = [{ label: "1 tandem", patches: tandem(0), coef: bt }];
    if (ctx.nv >= 2) configs.push({ label: "2 tandems", patches: [...tandem(0), ...tandem(3)], coef: bt });
    defs.push({
      id: "Bt", label: "Bt", family: "B", gammaU: 1.605, gammaS: 1.2, dynamic: true, configs,
      notApplicable: ctx.classe === 3 ? "Le système Bt ne s'applique pas aux ponts de 3e classe (Fascicule 61 titre II, art. 5.4)." : undefined,
      description: "Tandems de deux essieux de 16 t distants de 1,35 m, roues de 0,60 × 0,25 m, coefficient bt selon la classe.",
    });
  }
  if (want.has("Br")) {
    defs.push({
      id: "Br", label: "Br", family: "B", gammaU: 1.605, gammaS: 1.2, dynamic: true,
      configs: [{ label: "Roue isolée", patches: [{ x: 0, y: 0, P: 100, ax: 0.3, ay: 0.6 }], coef: 1 }],
      description: "Roue isolée de 10 t, rectangle d'impact de 0,60 × 0,30 m.",
    });
  }
  const track = (P: number, ax: number, ay: number, e: number): Patch[] => [
    { x: 0, y: 0, P: P / 2, ax, ay },
    { x: 0, y: e, P: P / 2, ax, ay },
  ];
  if (want.has("Mc80")) defs.push({
    id: "Mc80", label: "Mc80", family: "M", gammaU: 1.35, gammaS: 1, dynamic: true,
    configs: [{ label: "Char", patches: track(720, 4.9, 0.85, 1.95), coef: 1 }],
    description: "Char de 72 t sur deux chenilles de 4,90 × 0,85 m, entraxe 1,95 m.",
  });
  if (want.has("Mc120")) defs.push({
    id: "Mc120", label: "Mc120", family: "M", gammaU: 1.35, gammaS: 1, dynamic: true,
    configs: [{ label: "Char", patches: track(1100, 6.1, 1.0, 2.3), coef: 1 }],
    description: "Char de 110 t sur deux chenilles de 6,10 × 1,00 m, entraxe 2,30 m.",
  });
  if (want.has("Me80")) defs.push({
    id: "Me80", label: "Me80", family: "M", gammaU: 1.35, gammaS: 1, dynamic: true,
    configs: [{ label: "2 essieux", patches: [0, 1.5].map((x) => ({ x, y: 0, P: 220, ax: 0.12, ay: 3.5 })), coef: 1 }],
    description: "Deux essieux de 22 t distants de 1,50 m, rectangle d'impact de 3,50 × 0,12 m.",
  });
  if (want.has("Me120")) defs.push({
    id: "Me120", label: "Me120", family: "M", gammaU: 1.35, gammaS: 1, dynamic: true,
    configs: [{ label: "2 essieux", patches: [0, 1.8].map((x) => ({ x, y: 0, P: 330, ax: 0.15, ay: 4 })), coef: 1 }],
    description: "Deux essieux de 33 t distants de 1,80 m, rectangle d'impact de 4,00 × 0,15 m.",
  });
  if (want.has("D240")) defs.push({
    id: "D240", label: "D240", family: "D", gammaU: 1.35, gammaS: 1, dynamic: false,
    configs: [{ label: "Remorque", patches: [{ x: 0, y: 0, P: 2400, ax: 18.6, ay: 3.2 }], coef: 1 }],
    description: "Convoi exceptionnel de 240 t uniformément réparti sur 18,60 × 3,20 m (sans majoration dynamique).",
  });
  if (want.has("custom") && inp.custom.axles.length > 0) {
    let x = 0;
    const patches: Patch[] = [];
    inp.custom.axles.forEach((a, k) => {
      if (k > 0) x += a.d;
      patches.push(
        { x, y: 0, P: a.P / 2, ax: inp.custom.roue, ay: inp.custom.roue },
        { x, y: inp.custom.voie, P: a.P / 2, ax: inp.custom.roue, ay: inp.custom.roue }
      );
    });
    defs.push({
      id: "custom", label: inp.custom.name, family: "custom", gammaU: inp.custom.gU, gammaS: inp.custom.gS, dynamic: true,
      configs: [{ label: "1 véhicule", patches, coef: 1 }],
      description: `Convoi défini par l'utilisateur : ${inp.custom.axles.map((a) => `${a.P} kN`).join(" + ")}.`,
    });
  }
  return defs;
}

/** Profondeur de diffusion jusqu'au plan moyen de la dalle (remblai + chaussée, puis 45° dans le béton). */
export function diffusionDepth(inp: DalotInput) {
  return inp.tanDiff * (inp.hr + inp.ech) + inp.es / 2;
}

export type StripBlock = { x0: number; x1: number; q: number };

/**
 * Charge par mètre de bande (kN/m) au plan moyen de la dalle pour une configuration.
 * En travers, chaque empreinte diffusée b' est étalée sur la largeur de répartition d'une
 * dalle portant dans un sens sous charge localisée, b = b' + 0,5·L (L : portée de la cellule),
 * puis on retient la bande de 1 m la plus chargée. Sans cet étalement, une roue de petite
 * empreinte (faible remblai) serait comptée sur 1 m entier, ce qui surestime la charge.
 */
export function stripBlocks(cfg: ConvoyConfig, D: number, spread = 0): { blocks: StripBlock[]; yStar: number; footprint: Patch[] } {
  const footprint = cfg.patches.map((p) => ({ ...p, ax: p.ax + 2 * D, ay: p.ay + 2 * D }));
  const diffused = footprint.map((p) => ({ ...p, ay: p.ay + spread }));
  const candidates = diffused.flatMap((p) => [p.y - p.ay / 2 + 1e-6, p.y, p.y + p.ay / 2 - 1e-6]);
  let yStar = candidates[0];
  let best = -Infinity;
  for (const y of candidates) {
    let g = 0;
    for (const p of diffused) if (Math.abs(y - p.y) <= p.ay / 2) g += p.P / p.ay;
    if (g > best) { best = g; yStar = y; }
  }
  const blocks = diffused
    .filter((p) => Math.abs(yStar - p.y) <= p.ay / 2)
    .map((p) => ({ x0: p.x - p.ax / 2, x1: p.x + p.ax / 2, q: (cfg.coef * p.P) / (p.ax * p.ay) }));
  return { blocks, yStar, footprint };
}

/** Coefficient de majoration dynamique δ = 1 + 0,4/(1 + 0,2 L) + 0,6/(1 + 4 G/S). */
export function dynamicCoef(L: number, G: number, S: number) {
  if (S <= 0) return 1;
  return 1 + 0.4 / (1 + 0.2 * L) + 0.6 / (1 + (4 * G) / S);
}

/** Charge maximale S du convoi pouvant être placée sur une longueur L (toutes files comprises). */
export function maxLoadOnLength(cfg: ConvoyConfig, L: number) {
  const xs = cfg.patches.flatMap((p) => [p.x - p.ax / 2, p.x + p.ax / 2 - L]);
  let best = 0;
  for (const start of xs) {
    const end = start + L;
    let sum = 0;
    for (const p of cfg.patches) {
      const a = p.x - p.ax / 2, b = p.x + p.ax / 2;
      const overlap = Math.max(0, Math.min(b, end) - Math.max(a, start));
      sum += (p.P * overlap) / p.ax;
    }
    best = Math.max(best, sum);
  }
  return best * cfg.coef;
}
