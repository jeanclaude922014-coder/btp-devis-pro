/**
 * Modèle de portique fermé par bande de 1 m (méthode des déplacements, poutres de Bernoulli).
 *
 * Les barres sont tracées sur les fibres moyennes : dalle, radier, piédroits. Chaque barre est
 * découpée en éléments courts ; les charges réparties sont ramenées aux nœuds (erreur en
 * q·h²/12 négligeable pour h ≈ 0,12 m). Le radier repose soit sur des ressorts de Winkler,
 * soit sur une réaction linéaire (radier rigide) qui équilibre chaque cas de charge.
 */

import type { DalotInput } from "./fields";

export type MemberKind = "dalle" | "radier" | "piedroit_ext" | "piedroit_int";

export type Face = {
  /** Libellé de la face (« inférieure (intérieure) », « extérieure »…). */
  label: string;
  /** +1 si un moment positif (convention poutre) tend cette face, -1 sinon. */
  sign: 1 | -1;
  /** Face côté terre/extérieur (enrobage et fissuration identiques ici, utile au dessin). */
  exterior: boolean;
};

export type Member = {
  id: string;
  kind: MemberKind;
  label: string;
  /** Indice de travée (dalle/radier) ou de piédroit. */
  index: number;
  nodes: number[];
  /** Abscisse curviligne de chaque nœud depuis l'origine de la barre (m). */
  s: number[];
  length: number;
  thickness: number;
  /** Demi-épaisseur des barres d'appui à chaque extrémité (nu d'appui). */
  supportStart: number;
  supportEnd: number;
  faces: [Face, Face];
  /** Premier indice de station de la barre dans les vecteurs de résultats. */
  station0: number;
};

export type FrameModel = {
  nodes: { x: number; y: number }[];
  elems: { i: number; j: number; member: number; L: number; c: number; s: number; EA: number; EI: number }[];
  members: Member[];
  /** Positions des axes des piédroits. */
  xs: number[];
  yTop: number;
  yBot: number;
  /** Bord extérieur gauche/droit (faces extérieures). */
  xLeft: number;
  xRight: number;
  topNodes: number[];
  raftNodes: number[];
  /** Largeur tributaire de chaque nœud du radier (pression de sol). */
  raftTrib: number[];
  /** Largeur tributaire de chaque nœud de la dalle supérieure (y compris débords). */
  topTrib: number[];
  nStations: number;
  E: number; // kPa
  input: DalotInput;
  ndof: number;
  /** Facteur de Cholesky (stockage dense). */
  chol: Float64Array;
  springs: { node: number; kv: number; kh: number }[];
  linearSupport: boolean;
};

export type LoadVector = Float64Array; // taille ndof : [Fx, Fy, Mz] par nœud (kN, kN·m)

export type Response = {
  M: Float64Array; // par station (kN·m), convention poutre
  V: Float64Array; // kN
  N: Float64Array; // kN, traction positive
  /** Pression de sol sous chaque nœud du radier (kPa, compression positive). */
  p: Float64Array;
};

const TARGET_ELEM = 0.125;

export function buildFrame(inp: DalotInput): FrameModel {
  const n = inp.openings.length;
  const wallT = (k: number) => (k === 0 || k === n ? inp.eExt : inp.eInt);
  const xs: number[] = [0];
  for (let k = 0; k < n; k++) xs.push(xs[k] + wallT(k) / 2 + inp.openings[k] + wallT(k + 1) / 2);
  const yBot = 0;
  const yTop = inp.er / 2 + inp.hInt + inp.es / 2;

  const nodes: { x: number; y: number }[] = [];
  const key = new Map<string, number>();
  const node = (x: number, y: number) => {
    const k = `${x.toFixed(6)}|${y.toFixed(6)}`;
    const found = key.get(k);
    if (found !== undefined) return found;
    nodes.push({ x, y });
    key.set(k, nodes.length - 1);
    return nodes.length - 1;
  };

  const members: Member[] = [];
  const addMember = (
    kind: MemberKind, index: number, label: string,
    a: { x: number; y: number }, b: { x: number; y: number },
    thickness: number, supportStart: number, supportEnd: number, faces: [Face, Face]
  ) => {
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    const count = Math.max(6, Math.ceil(length / TARGET_ELEM));
    const ids: number[] = [];
    const s: number[] = [];
    for (let k = 0; k <= count; k++) {
      const t = k / count;
      ids.push(node(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t));
      s.push(length * t);
    }
    members.push({
      id: `${kind}-${index}`, kind, label, index, nodes: ids, s, length, thickness,
      supportStart, supportEnd, faces, station0: 0,
    });
  };

  // Dalle et radier : barres orientées de gauche à droite (y local vers le haut).
  for (let k = 0; k < n; k++) {
    const lab = n > 1 ? ` — travée ${k + 1}` : "";
    addMember("dalle", k, `Dalle supérieure${lab}`, { x: xs[k], y: yTop }, { x: xs[k + 1], y: yTop },
      inp.es, wallT(k) / 2, wallT(k + 1) / 2,
      [{ label: "inférieure (intérieure)", sign: 1, exterior: false }, { label: "supérieure (extérieure)", sign: -1, exterior: true }]);
  }
  for (let k = 0; k < n; k++) {
    const lab = n > 1 ? ` — travée ${k + 1}` : "";
    addMember("radier", k, `Radier${lab}`, { x: xs[k], y: yBot }, { x: xs[k + 1], y: yBot },
      inp.er, wallT(k) / 2, wallT(k + 1) / 2,
      [{ label: "inférieure (extérieure)", sign: 1, exterior: true }, { label: "supérieure (intérieure)", sign: -1, exterior: false }]);
  }
  // Piédroits : barres orientées du bas vers le haut (y local vers -x).
  for (let k = 0; k <= n; k++) {
    const ext = k === 0 || k === n;
    const label = ext ? (k === 0 ? "Piédroit extérieur gauche" : "Piédroit extérieur droit") : `Piédroit intermédiaire ${k}`;
    // Face local -y = côté +x (droite). M > 0 tend la face droite.
    const right: Face = { label: k === n ? "extérieure (droite)" : k === 0 ? "intérieure (droite)" : "droite", sign: 1, exterior: k === n };
    const left: Face = { label: k === 0 ? "extérieure (gauche)" : k === n ? "intérieure (gauche)" : "gauche", sign: -1, exterior: k === 0 };
    addMember(ext ? "piedroit_ext" : "piedroit_int", k, label, { x: xs[k], y: yBot }, { x: xs[k], y: yTop },
      wallT(k), inp.er / 2, inp.es / 2, k === 0 ? [right, left] : [right, left]);
  }

  // Module instantané BAEL : Eij = 11 000 fcj^(1/3) (MPa) → kPa.
  const E = 11000 * Math.cbrt(inp.fc28) * 1000;
  const elems: FrameModel["elems"] = [];
  let station = 0;
  members.forEach((m, mi) => {
    m.station0 = station;
    station += m.nodes.length;
    for (let k = 0; k < m.nodes.length - 1; k++) {
      const a = nodes[m.nodes[k]];
      const b = nodes[m.nodes[k + 1]];
      const L = Math.hypot(b.x - a.x, b.y - a.y);
      elems.push({
        i: m.nodes[k], j: m.nodes[k + 1], member: mi, L,
        c: (b.x - a.x) / L, s: (b.y - a.y) / L,
        EA: E * m.thickness, EI: (E * m.thickness ** 3) / 12,
      });
    }
  });

  const xLeft = xs[0] - inp.eExt / 2;
  const xRight = xs[n] + inp.eExt / 2;

  const sortedUnique = (ids: number[]) =>
    Array.from(new Set(ids)).sort((p, q) => nodes[p].x - nodes[q].x);
  const topNodes = sortedUnique(members.filter((m) => m.kind === "dalle").flatMap((m) => m.nodes));
  const raftNodes = sortedUnique(members.filter((m) => m.kind === "radier").flatMap((m) => m.nodes));
  const trib = (ids: number[]) =>
    ids.map((id, k) => {
      const x = nodes[id].x;
      const left = k === 0 ? xLeft : (nodes[ids[k - 1]].x + x) / 2;
      const right = k === ids.length - 1 ? xRight : (nodes[ids[k + 1]].x + x) / 2;
      return right - left;
    });
  const raftTrib = trib(raftNodes);
  const topTrib = trib(topNodes);

  const ndof = nodes.length * 3;
  const K = new Float64Array(ndof * ndof);
  for (const e of elems) assembleElement(K, ndof, e);

  const springs: FrameModel["springs"] = [];
  const linearSupport = inp.modeleSol === "lineaire";
  if (!linearSupport) {
    raftNodes.forEach((id, k) => {
      const kv = inp.ks * raftTrib[k];
      springs.push({ node: id, kv, kh: kv * 0.05 });
    });
  } else {
    // Appuis isostatiques : la réaction linéaire équilibre chaque cas, ils ne travaillent pas.
    const stiff = E * 10;
    springs.push({ node: raftNodes[0], kv: stiff, kh: stiff });
    springs.push({ node: raftNodes[raftNodes.length - 1], kv: stiff, kh: 0 });
  }
  for (const sp of springs) {
    K[(sp.node * 3) * ndof + sp.node * 3] += sp.kh;
    K[(sp.node * 3 + 1) * ndof + sp.node * 3 + 1] += sp.kv;
  }

  cholesky(K, ndof);

  return {
    nodes, elems, members, xs, yTop, yBot, xLeft, xRight, topNodes, raftNodes, raftTrib, topTrib,
    nStations: station, E, input: inp, ndof, chol: K, springs, linearSupport,
  };
}

function assembleElement(K: Float64Array, n: number, e: FrameModel["elems"][number]) {
  const { L, c, s, EA, EI } = e;
  const a = EA / L, b = (12 * EI) / L ** 3, d = (6 * EI) / L ** 2, f = (4 * EI) / L, g = (2 * EI) / L;
  const kl = [
    [a, 0, 0, -a, 0, 0],
    [0, b, d, 0, -b, d],
    [0, d, f, 0, -d, g],
    [-a, 0, 0, a, 0, 0],
    [0, -b, -d, 0, b, -d],
    [0, d, g, 0, -d, f],
  ];
  const T = rotation(c, s);
  // kg = Tᵀ kl T
  const tmp = mul6(kl, T);
  const kg = mul6(transpose6(T), tmp);
  const dofs = [e.i * 3, e.i * 3 + 1, e.i * 3 + 2, e.j * 3, e.j * 3 + 1, e.j * 3 + 2];
  for (let r = 0; r < 6; r++) for (let q = 0; q < 6; q++) K[dofs[r] * n + dofs[q]] += kg[r][q];
}

function rotation(c: number, s: number) {
  return [
    [c, s, 0, 0, 0, 0],
    [-s, c, 0, 0, 0, 0],
    [0, 0, 1, 0, 0, 0],
    [0, 0, 0, c, s, 0],
    [0, 0, 0, -s, c, 0],
    [0, 0, 0, 0, 0, 1],
  ];
}
function mul6(A: number[][], B: number[][]) {
  const R = Array.from({ length: 6 }, () => new Array(6).fill(0));
  for (let i = 0; i < 6; i++) for (let k = 0; k < 6; k++) {
    const v = A[i][k];
    if (v !== 0) for (let j = 0; j < 6; j++) R[i][j] += v * B[k][j];
  }
  return R;
}
function transpose6(A: number[][]) {
  return A[0].map((_, j) => A.map((row) => row[j]));
}

/** Factorisation de Cholesky en place (triangle inférieur). */
function cholesky(A: Float64Array, n: number) {
  for (let j = 0; j < n; j++) {
    let sum = A[j * n + j];
    for (let k = 0; k < j; k++) sum -= A[j * n + k] ** 2;
    if (sum <= 0) throw new Error("Modèle instable : matrice de rigidité non définie positive.");
    const d = Math.sqrt(sum);
    A[j * n + j] = d;
    for (let i = j + 1; i < n; i++) {
      let s = A[i * n + j];
      for (let k = 0; k < j; k++) s -= A[i * n + k] * A[j * n + k];
      A[i * n + j] = s / d;
    }
  }
  // Annule le triangle supérieur (non utilisé, mais évite toute confusion à la relecture).
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) A[i * n + j] = 0;
}

function solveChol(L: Float64Array, n: number, b: Float64Array): Float64Array {
  const y = new Float64Array(b);
  for (let i = 0; i < n; i++) {
    let s = y[i];
    const row = i * n;
    for (let k = 0; k < i; k++) s -= L[row + k] * y[k];
    y[i] = s / L[row + i];
  }
  for (let i = n - 1; i >= 0; i--) {
    let s = y[i];
    for (let k = i + 1; k < n; k++) s -= L[k * n + i] * y[k];
    y[i] = s / L[i * n + i];
  }
  return y;
}

export function emptyLoad(model: FrameModel): LoadVector {
  return new Float64Array(model.ndof);
}

/**
 * Ajoute une pression répartie le long d'une barre (intensité linéaire de q0 à q1 entre les
 * abscisses s0 et s1), dans la direction globale (dx, dy) (kN/m²·1 m = kN/m).
 */
export function addMemberLoad(
  model: FrameModel, f: LoadVector, memberIdx: number,
  s0: number, s1: number, q0: number, q1: number, dx: number, dy: number
) {
  const m = model.members[memberIdx];
  if (s1 <= s0) return;
  const q = (s: number) => q0 + ((q1 - q0) * (s - s0)) / (s1 - s0);
  for (let k = 0; k < m.nodes.length - 1; k++) {
    const a = Math.max(s0, m.s[k]);
    const b = Math.min(s1, m.s[k + 1]);
    if (b <= a) continue;
    const h = m.s[k + 1] - m.s[k];
    // Intégration exacte des fonctions de forme linéaires sur [a, b] (charge trapézoïdale).
    const qa = q(a), qb = q(b);
    const N1 = (s: number) => (m.s[k + 1] - s) / h;
    const fa = ((b - a) / 6) * (qa * (2 * N1(a) + N1(b)) + qb * (N1(a) + 2 * N1(b)));
    const total = ((qa + qb) / 2) * (b - a);
    const fb = total - fa;
    f[m.nodes[k] * 3] += fa * dx;
    f[m.nodes[k] * 3 + 1] += fa * dy;
    f[m.nodes[k + 1] * 3] += fb * dx;
    f[m.nodes[k + 1] * 3 + 1] += fb * dy;
  }
}

/**
 * Charge verticale répartie sur la face supérieure de l'ouvrage, entre les abscisses globales
 * xa et xb (kN/m, vers le bas). Les débords au-delà des axes extrêmes vont aux nœuds d'angle.
 */
export function addTopLoad(model: FrameModel, f: LoadVector, xa: number, xb: number, q: number) {
  addHorizontalLineLoad(model, f, model.topNodes, xa, xb, q);
}

function addHorizontalLineLoad(model: FrameModel, f: LoadVector, ids: number[], xa: number, xb: number, q: number) {
  const a = Math.max(xa, model.xLeft);
  const b = Math.min(xb, model.xRight);
  if (b <= a || q === 0) return;
  const xsN = ids.map((id) => model.nodes[id].x);
  const x0 = xsN[0], xn = xsN[xsN.length - 1];
  // Débords (au droit des piédroits extérieurs) : directement sur le nœud d'angle.
  if (a < x0) f[ids[0] * 3 + 1] -= q * (Math.min(b, x0) - a);
  if (b > xn) f[ids[ids.length - 1] * 3 + 1] -= q * (b - Math.max(a, xn));
  const ia = Math.max(a, x0), ib = Math.min(b, xn);
  if (ib <= ia) return;
  for (let k = 0; k < ids.length - 1; k++) {
    const l = xsN[k], r = xsN[k + 1];
    const s = Math.max(ia, l), e = Math.min(ib, r);
    if (e <= s) continue;
    const h = r - l;
    const mid = (s + e) / 2;
    const P = q * (e - s);
    f[ids[k] * 3 + 1] -= (P * (r - mid)) / h;
    f[ids[k + 1] * 3 + 1] -= (P * (mid - l)) / h;
  }
}

/** Ajoute la réaction linéaire du sol (radier rigide) équilibrant les charges de `f`. */
function addLinearReaction(model: FrameModel, f: LoadVector): { p0: number; p1: number } {
  let V = 0, Mo = 0;
  const xc = (model.xLeft + model.xRight) / 2;
  for (let i = 0; i < model.nodes.length; i++) {
    const fy = f[i * 3 + 1];
    const fx = f[i * 3];
    V += fy;
    Mo += fy * (model.nodes[i].x - xc) - fx * (model.nodes[i].y - model.yBot) + f[i * 3 + 2];
  }
  // Pression p(x) = p_m + p_g·(x - xc), vers le haut, telle que ∫p = -V et ∫p·(x - xc) = -Mo.
  const B = model.xRight - model.xLeft;
  const pm = -V / B;
  const pg = (-Mo * 12) / B ** 3;
  const p0 = pm + pg * (model.xLeft - xc);
  const p1 = pm + pg * (model.xRight - xc);
  // Sur le radier : charge « négative » vers le bas = poussée vers le haut.
  addHorizontalLinearRaft(model, f, p0, p1);
  return { p0, p1 };
}

function addHorizontalLinearRaft(model: FrameModel, f: LoadVector, p0: number, p1: number) {
  const ids = model.raftNodes;
  const B = model.xRight - model.xLeft;
  const p = (x: number) => p0 + ((p1 - p0) * (x - model.xLeft)) / B;
  const fine = 200;
  for (let k = 0; k < fine; k++) {
    const a = model.xLeft + (B * k) / fine;
    const b = a + B / fine;
    addHorizontalLineLoad(model, f, ids, a, b, -p((a + b) / 2));
  }
}

export function solve(model: FrameModel, load: LoadVector): Response {
  const f = new Float64Array(load);
  let lin: { p0: number; p1: number } | null = null;
  if (model.linearSupport) lin = addLinearReaction(model, f);
  const u = solveChol(model.chol, model.ndof, f);
  return postProcess(model, u, lin);
}

function postProcess(model: FrameModel, u: Float64Array, lin: { p0: number; p1: number } | null): Response {
  const ns = model.nStations;
  const M = new Float64Array(ns), V = new Float64Array(ns), N = new Float64Array(ns);
  const cnt = new Float64Array(ns);
  let ei = 0;
  model.members.forEach((m) => {
    for (let k = 0; k < m.nodes.length - 1; k++, ei++) {
      const e = model.elems[ei];
      const ug = [u[e.i * 3], u[e.i * 3 + 1], u[e.i * 3 + 2], u[e.j * 3], u[e.j * 3 + 1], u[e.j * 3 + 2]];
      const { c, s, L, EA, EI } = e;
      const ul = [c * ug[0] + s * ug[1], -s * ug[0] + c * ug[1], ug[2], c * ug[3] + s * ug[4], -s * ug[3] + c * ug[4], ug[5]];
      const a = EA / L, b = (12 * EI) / L ** 3, d = (6 * EI) / L ** 2, g4 = (4 * EI) / L, g2 = (2 * EI) / L;
      const Fx1 = a * (ul[0] - ul[3]);
      const Fy1 = b * (ul[1] - ul[4]) + d * (ul[2] + ul[5]);
      const Mz1 = d * (ul[1] - ul[4]) + g4 * ul[2] + g2 * ul[5];
      const Mz2 = d * (ul[1] - ul[4]) + g2 * ul[2] + g4 * ul[5];
      const s0 = m.station0 + k, s1 = s0 + 1;
      // Efforts internes (N traction +, M tend la fibre y- si positif).
      M[s0] += -Mz1; V[s0] += Fy1; N[s0] += -Fx1; cnt[s0]++;
      M[s1] += Mz2; V[s1] += Fy1; N[s1] += -Fx1; cnt[s1]++;
    }
  });
  for (let k = 0; k < ns; k++) {
    if (cnt[k] > 1) { M[k] /= cnt[k]; V[k] /= cnt[k]; N[k] /= cnt[k]; }
  }
  const p = new Float64Array(model.raftNodes.length);
  if (lin) {
    const B = model.xRight - model.xLeft;
    model.raftNodes.forEach((id, k) => {
      p[k] = lin!.p0 + ((lin!.p1 - lin!.p0) * (model.nodes[id].x - model.xLeft)) / B;
    });
  } else {
    model.raftNodes.forEach((id, k) => {
      p[k] = -model.input.ks * u[id * 3 + 1];
    });
  }
  return { M, V, N, p };
}

/** Réponses aux charges unitaires (1 kN vers le bas) sur chaque nœud de la dalle supérieure. */
export function influence(model: FrameModel): Response[] {
  return model.topNodes.map((id) => {
    const f = emptyLoad(model);
    f[id * 3 + 1] = -1;
    return solve(model, f);
  });
}

export function addResponses(target: Response, r: Response, factor: number) {
  for (let k = 0; k < target.M.length; k++) {
    target.M[k] += factor * r.M[k];
    target.V[k] += factor * r.V[k];
    target.N[k] += factor * r.N[k];
  }
  for (let k = 0; k < target.p.length; k++) target.p[k] += factor * r.p[k];
}

export function zeroResponse(model: FrameModel): Response {
  return {
    M: new Float64Array(model.nStations), V: new Float64Array(model.nStations),
    N: new Float64Array(model.nStations), p: new Float64Array(model.raftNodes.length),
  };
}
