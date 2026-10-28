/**
 * Corrections proposées pour les vérifications non conformes.
 *
 * Pour chaque vérification en défaut, on liste les données qui peuvent la lever (épaisseur,
 * semelle, bêche, hauteur libre…) et l'on cherche, pas à pas, la plus petite valeur qui rend
 * cette vérification conforme. Chaque option indique le statut global obtenu après
 * correction, pour que l'utilisateur choisisse en connaissance de cause.
 */

import type { Check, CheckStatus } from "./checks";
import { runStudy } from "./engine";
import { SOIL_PRESETS, type DalotSpec, type FieldValue } from "./fields";

export type FixOption = {
  label: string;
  /** Description du changement (« 0,25 → 0,35 m »). */
  change: string;
  values: Record<string, FieldValue>;
  /** Groupes de ferraillage dont l'imposition est levée (retour au calcul automatique). */
  resetImposed?: string[];
  /** La vérification visée devient conforme. */
  resolves: boolean;
  status: CheckStatus;
  remaining: number;
};

type NumCandidate = { kind: "num"; key: string; label: string; step: number; max: number; unit: string; min?: number };
type PatchCandidate = { kind: "patch"; label: string; change: string; values: Record<string, FieldValue>; resetImposed?: string[] };
type Candidate = NumCandidate | PatchCandidate;

const thick = (key: string, label: string): NumCandidate => ({ kind: "num", key, label, step: 0.05, max: 1, unit: "m" });

function memberKey(element: string): string | null {
  if (element.startsWith("Dalle")) return "es";
  if (element.startsWith("Radier")) return "er";
  if (element.includes("intermédiaire")) return "eInt";
  if (element.includes("extérieur") || element.startsWith("Piédroit")) return "eExt";
  return null;
}
const LABELS: Record<string, string> = {
  es: "Épaisseur de la dalle", er: "Épaisseur du radier", eExt: "Épaisseur des piédroits extérieurs", eInt: "Épaisseur des piédroits intermédiaires",
};
const groupKey = (g: string) => (g.startsWith("dalle") ? "es" : g.startsWith("radier") ? "er" : g === "pint" ? "eInt" : "eExt");

function candidates(spec: DalotSpec, c: Check): Candidate[] {
  const id = c.id;
  const out: Candidate[] = [];
  const fc = Number(spec.values.fc28);
  const fcUp = (): Candidate[] => [30, 35].filter((x) => x > fc).slice(0, 1).map((x) => ({
    kind: "patch", label: "Classe de béton", change: `fc28 ${fc} → ${x} MPa`, values: { fc28: x },
  }));
  const groupMatch = /^(?:F-ELU|F-MIN|F-REQ|S-BC|S-S|S|D-S|D-PHI|D-REP|D-C|EC-M|EC-MIN|EC-W)-(.+)$/.exec(id);
  if (id.startsWith("V-BAEL-") || id.startsWith("V-EC2-")) {
    const k = memberKey(c.element);
    if (k) out.push(thick(k, LABELS[k]));
    out.push(...fcUp());
  } else if (id.startsWith("D-C-")) {
    out.push({ kind: "patch", label: "Enrobage", change: `${Number(spec.values.cover) * 100} → ${(c.limit ?? 3)} cm`, values: { cover: (c.limit ?? 3) / 100 } });
  } else if (groupMatch) {
    const g = groupMatch[1];
    if (spec.imposed[g]) out.push({ kind: "patch", label: "Ferraillage de la nappe", change: "revenir au choix automatique des barres", values: {}, resetImposed: [g] });
    out.push(thick(groupKey(g), LABELS[groupKey(g)]));
    if (/^(F-ELU|S-BC|EC-M)/.test(id)) out.push(...fcUp());
  } else if (id.startsWith("N-")) {
    out.push(thick(id.includes("piedroit_int") ? "eInt" : "eExt", LABELS[id.includes("piedroit_int") ? "eInt" : "eExt"]));
  } else if (id.startsWith("G-PORT") || id === "G-QADM" || id === "G-TASS") {
    out.push({ kind: "num", key: "Df", label: "Ancrage du radier sous le terrain naturel", step: 0.1, max: 3, unit: "m" });
    const best = SOIL_PRESETS.find((s) => s.id === "laterite_compacte")!;
    if (spec.values.soilPreset !== best.id) {
      out.push({
        kind: "patch", label: "Substitution du sol d'assise", change: `${best.label} sur 0,50 m au moins (à valider par le géotechnicien)`,
        values: { soilPreset: best.id, gammaSol: best.gamma, phiSol: best.phi, cSol: best.c, ks: best.ks, EsSol: best.Es, qadm: best.qadm },
      });
    }
  } else if (id.startsWith("G-CONTACT")) {
    out.push(thick("er", LABELS.er), thick("es", LABELS.es));
  } else if (id === "G-FLOT") {
    out.push(thick("er", LABELS.er), thick("es", LABELS.es));
  } else if (id === "G-TALUS") {
    out.push({ kind: "num", key: "talusPente", label: "Fruit du talus (H/V)", step: 0.25, max: 4, unit: "" });
  } else if (id === "T-MA-GLIS") {
    out.push({ kind: "num", key: "aileBeche", label: "Bêche d'ancrage sous la semelle des murs en aile", step: 0.05, max: 1.5, unit: "m" });
    out.push({ kind: "num", key: "aileSemelle", label: "Largeur de la semelle des murs en aile", step: 0.1, max: 6, unit: "m" });
  } else if (id === "T-MA-RENV" || id === "T-MA-EXC") {
    out.push({ kind: "num", key: "aileSemelle", label: "Largeur de la semelle des murs en aile", step: 0.1, max: 6, unit: "m" });
    out.push({ kind: "num", key: "aileTalon", label: "Patin avant de la semelle", step: 0.05, max: 2, unit: "m" });
  } else if (id === "T-MA-PORT") {
    out.push({ kind: "num", key: "aileSemelle", label: "Largeur de la semelle des murs en aile", step: 0.1, max: 6, unit: "m" });
  } else if (id.startsWith("T-MA-")) {
    out.push({ kind: "num", key: "aileEp", label: "Épaisseur des murs en aile", step: 0.05, max: 0.6, unit: "m" });
  } else if (id.startsWith("T-MT-")) {
    out.push({ kind: "num", key: "murTeteEp", label: "Épaisseur du mur de tête", step: 0.05, max: 0.5, unit: "m" });
  } else if (id === "H-CHARGE" || id === "H-REV") {
    out.push({ kind: "num", key: "hInt", label: "Hauteur libre des cellules", step: 0.25, max: 6, unit: "m" });
    out.push({ kind: "num", key: "nCells", label: "Nombre de cellules", step: 1, max: 6, unit: "" });
    out.push({ kind: "num", key: "opening", label: "Ouverture libre d'une cellule", step: 0.25, max: 6, unit: "m" });
  } else if (id === "H-V" || id === "H-FR") {
    out.push({ kind: "patch", label: "Protection aval", change: "prévoir avant-radier, bêches et perré / enrochement aval", values: { hyProtection: true } });
  } else if (id === "H-OFF") {
    out.push({ kind: "patch", label: "Étude hydraulique", change: "activer (renseigner ensuite le bassin versant)", values: { hyActif: true } });
  } else if (id === "C-TRAFIC") {
    out.push({ kind: "patch", label: "Charges routières", change: "activer A(l), Bc, Bt et Br", values: { cv_A: true, cv_Bc: true, cv_Bt: true, cv_Br: true } });
  }
  return out;
}

function apply(spec: DalotSpec, values: Record<string, FieldValue>, reset?: string[]): DalotSpec {
  const imposed = { ...spec.imposed };
  for (const g of reset ?? []) delete imposed[g];
  const keys = Object.keys(values);
  return { ...spec, values: { ...spec.values, ...values }, imposed, defaulted: spec.defaulted.filter((k) => !keys.includes(k)) };
}

function evaluate(spec: DalotSpec, checkId: string) {
  const r = runStudy(spec);
  if (!r.ok) return null;
  const c = r.study.checks.find((x) => x.id === checkId);
  return {
    ok: !c || c.status === "conforme" || c.status === "non_applicable",
    status: r.study.status,
    remaining: r.study.checks.filter((x) => x.status === "non_conforme").length,
  };
}

const pause = () => new Promise<void>((res) => setTimeout(res, 0));
const fmt = (x: number, unit: string) => `${x.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}${unit ? ` ${unit}` : ""}`;

/** Options de correction d'une vérification (recherche pas à pas, sans bloquer l'affichage). */
export async function proposeFixes(spec: DalotSpec, check: Check): Promise<FixOption[]> {
  const out: FixOption[] = [];
  const coarse = (s: DalotSpec) => ({ ...s, values: { ...s.values, pas: Math.max(0.25, Number(s.values.pas) || 0.1) } });
  for (const cand of candidates(spec, check)) {
    await pause();
    if (cand.kind === "patch") {
      const next = apply(spec, cand.values, cand.resetImposed);
      const ev = evaluate(next, check.id);
      if (ev) out.push({ label: cand.label, change: cand.change, values: cand.values, resetImposed: cand.resetImposed, resolves: ev.ok, status: ev.status, remaining: ev.remaining });
      continue;
    }
    const from = Number(spec.values[cand.key]);
    if (!Number.isFinite(from)) continue;
    let v = from;
    let found: number | null = null;
    for (let k = 0; k < 40 && v < cand.max - 1e-9; k++) {
      v = Math.round((v + cand.step) * 1000) / 1000;
      const ev = evaluate(coarse(apply(spec, { [cand.key]: v })), check.id);
      if (ev?.ok) { found = v; break; }
      if (k % 3 === 2) await pause();
    }
    if (found === null) {
      out.push({ label: cand.label, change: `même à ${fmt(cand.max, cand.unit)}, la vérification reste en défaut`, values: {}, resolves: false, status: "non_conforme", remaining: -1 });
      continue;
    }
    // Revérification au pas réel du balayage des convois.
    let final = found;
    let ev = evaluate(apply(spec, { [cand.key]: final }), check.id);
    for (let k = 0; k < 4 && ev && !ev.ok && final < cand.max; k++) {
      final = Math.round((final + cand.step) * 1000) / 1000;
      ev = evaluate(apply(spec, { [cand.key]: final }), check.id);
    }
    if (!ev) continue;
    out.push({
      label: cand.label, change: `${fmt(from, cand.unit)} → ${fmt(final, cand.unit)}`, values: { [cand.key]: final },
      resolves: ev.ok, status: ev.status, remaining: ev.remaining,
    });
  }
  // Les options qui règlent la vérification d'abord, puis celles qui laissent le moins de défauts.
  return out.sort((a, b) => Number(b.resolves) - Number(a.resolves) || (a.remaining < 0 ? 1 : 0) - (b.remaining < 0 ? 1 : 0) || a.remaining - b.remaining);
}

export type AutoFixStep = { check: string; option: FixOption };

/**
 * Correction automatique : traite les non-conformités une à une avec la meilleure option,
 * jusqu'à conformité ou 12 étapes. Ne modifie rien : renvoie la spec corrigée et le journal.
 */
export async function autoFix(spec: DalotSpec, onProgress?: (msg: string) => void): Promise<{ spec: DalotSpec; steps: AutoFixStep[]; status: CheckStatus }> {
  let cur = spec;
  const steps: AutoFixStep[] = [];
  const tried = new Set<string>();
  for (let it = 0; it < 12; it++) {
    const r = runStudy(cur);
    if (!r.ok) break;
    const nc = r.study.checks.filter((c) => c.status === "non_conforme" && !tried.has(c.id));
    if (nc.length === 0) break;
    const target = nc[0];
    onProgress?.(`${target.element} — ${target.label}`);
    const opts = await proposeFixes(cur, target);
    const best = opts.find((o) => o.resolves && o.remaining >= 0);
    if (!best) { tried.add(target.id); continue; }
    cur = apply(cur, best.values, best.resetImposed);
    steps.push({ check: `${target.element} — ${target.label}`, option: best });
  }
  const fin = runStudy(cur);
  return { spec: cur, steps, status: fin.ok ? fin.study.status : "non_verifie" };
}

export function applyFix(spec: DalotSpec, fix: Pick<FixOption, "values" | "resetImposed">): DalotSpec {
  return apply(spec, fix.values, fix.resetImposed);
}
