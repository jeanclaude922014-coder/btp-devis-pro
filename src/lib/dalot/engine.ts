/**
 * Point d'entrée du calcul : données → analyse → ferraillage → vérifications → métré.
 */

import { modelControls } from "./controls";
import { runAnalysis, type Analysis } from "./analysis";
import { globalStatus, type Check, type CheckStatus } from "./checks";
import { designSections, type Design } from "./design";
import { defaultSpec, fingerprint, missingFields, toInput, type DalotInput, type DalotSpec } from "./fields";
import { geotechChecks, type GeoResult } from "./geotech";
import { designHeads, type HeadsResult } from "./heads";
import { hydroStudy, type HydroResult } from "./hydro";
import { computeQuantities, type Quantities } from "./quantities";

export type Study = {
  input: DalotInput;
  /** Valeurs saisies (pour la liste des valeurs par défaut de la note). */
  values: DalotSpec["values"];
  analysis: Analysis;
  design: Design;
  geo: GeoResult;
  heads: HeadsResult;
  hydro: HydroResult | null;
  quantities: Quantities;
  checks: Check[];
  status: CheckStatus;
  fingerprint: string;
  defaultsInPlace: string[];
  durationMs: number;
};

export type RunOutcome = { ok: true; study: Study } | { ok: false; missing: string[]; error?: string };

export function runStudy(spec: DalotSpec): RunOutcome {
  const missing = missingFields(spec.values);
  if (missing.length > 0) return { ok: false, missing: missing.map((f) => f.label) };
  const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
  try {
    const input = toInput(spec);
    if (input.openings.some((o) => !(o > 0))) return { ok: false, missing: [], error: "Ouverture de cellule invalide." };
    const analysis = runAnalysis(input);
    const design = designSections(input, analysis);
    const geo = geotechChecks(input, analysis);
    const heads = designHeads(input, design.mat);
    const quantities = computeQuantities(input, design.mat, design.groups, heads);
    const hydro = hydroStudy(input);
    const checks = [...hydro.checks, ...design.checks, ...geo.checks, ...heads.checks, ...modelControls(input, analysis)];
    if (input.convoys.length === 0) {
      checks.push({
        id: "C-TRAFIC", domain: "Dimensionnement des sections", element: "Ouvrage", label: "Charges d'exploitation routières",
        status: "non_verifie", ref: "Fascicule 61 titre II", detail: "Aucun convoi sélectionné : l'ouvrage n'est justifié que sous charges permanentes.",
      });
    }
    const t1 = typeof performance !== "undefined" ? performance.now() : Date.now();
    return {
      ok: true,
      study: {
        input, values: spec.values, analysis, design, geo: geo.result, heads, hydro: hydro.result, quantities, checks,
        status: globalStatus(checks), fingerprint: fingerprint(spec),
        defaultsInPlace: spec.defaulted, durationMs: t1 - t0,
      },
    };
  } catch (e) {
    return { ok: false, missing: [], error: e instanceof Error ? e.message : String(e) };
  }
}

export type OptimizeProposal = { key: string; label: string; from: number; to: number }[];

/**
 * « Optimiser » : recherche locale sur les épaisseurs (pas de 5 cm, minimum 20 cm).
 * 1. Tant qu'une vérification du corps est non conforme, on épaissit l'élément concerné.
 * 2. On amincit ensuite chaque élément de 5 cm tant que tout reste conforme (gain de béton).
 * La recherche balaie les convois au pas de 0,20 m au moins ; le résultat est revérifié au
 * pas réel et ré-épaissi si besoin.
 */
export function optimizeThicknesses(spec: DalotSpec): { proposal: OptimizeProposal; status: CheckStatus } | null {
  const keys: { key: string; label: string }[] = [
    { key: "es", label: "Épaisseur de la dalle" },
    { key: "er", label: "Épaisseur du radier" },
    { key: "eExt", label: "Piédroits extérieurs" },
  ];
  const multi = Number(spec.values.nCells) > 1;
  if (multi) keys.push({ key: "eInt", label: "Piédroits intermédiaires" });
  const MIN = 0.2, MAX = 1, STEP = 0.05;
  const round = (x: number) => Math.round(x * 100) / 100;
  const failing = (values: DalotSpec["values"], coarse: boolean) => {
    const r = runStudy({ ...spec, values: coarse ? { ...values, pas: Math.max(0.2, Number(values.pas) || 0.1) } : values });
    if (!r.ok) return null;
    return r.study.checks.filter((c) => c.status === "non_conforme" && c.domain !== "Ouvrages de tête" && c.domain !== "Hydrologie et hydraulique"
      && !["G-TALUS", "G-QADM", "G-CONTACT"].includes(c.id));
  };
  const keysFor = (fails: Check[]) => {
    const out = new Set<string>();
    for (const c of fails) {
      const e = c.element;
      if (e.startsWith("Dalle")) out.add("es");
      else if (e.startsWith("Radier") || e.startsWith("Sol") || e.startsWith("Interface")) out.add("er");
      else if (e.includes("intermédiaire") && multi) out.add("eInt");
      else if (e.includes("extérieur") || e.startsWith("Piédroit")) out.add("eExt");
      else out.add("es");
    }
    return out;
  };
  const values = { ...spec.values };
  // 1. Mise en conformité.
  for (let it = 0; it < 30; it++) {
    const fails = failing(values, true);
    if (!fails) return null;
    if (fails.length === 0) break;
    let moved = false;
    for (const k of keysFor(fails)) {
      if (Number(values[k]) < MAX - 1e-9) { values[k] = round(Number(values[k]) + STEP); moved = true; }
    }
    if (!moved) break;
  }
  // 2. Réduction tant que tout reste conforme.
  if ((failing(values, true) ?? [null]).length === 0) {
    let improved = true;
    while (improved) {
      improved = false;
      for (const { key } of keys) {
        const cur = Number(values[key]);
        if (cur - STEP < MIN - 1e-9) continue;
        const trial = { ...values, [key]: round(cur - STEP) };
        if ((failing(trial, true) ?? [null]).length === 0) { Object.assign(values, trial); improved = true; }
      }
    }
  }
  // 3. Revérification au pas réel.
  for (let it = 0; it < 6; it++) {
    const fails = failing(values, false);
    if (!fails || fails.length === 0) break;
    for (const k of keysFor(fails)) values[k] = Math.min(MAX, round(Number(values[k]) + STEP));
  }
  const proposal: OptimizeProposal = keys
    .map(({ key, label }) => ({ key, label, from: Number(spec.values[key]), to: Number(values[key]) }))
    .filter((p) => Math.abs(p.from - p.to) > 1e-6);
  const final = runStudy({ ...spec, values });
  return { proposal, status: final.ok ? final.study.status : "non_verifie" };
}

export { defaultSpec };
