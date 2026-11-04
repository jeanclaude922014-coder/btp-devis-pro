/**
 * Optimisation globale (bouton « Optimiser » de la barre du haut).
 *
 * Chaque itération est un calcul complet de l'ouvrage modifié. Dans l'ordre :
 *  1. les nappes imposées qui échouent reviennent au choix automatique des barres ;
 *  2. les épaisseurs du corps en cause sont portées de 5 cm en 5 cm jusqu'à conformité ;
 *  3. les autres non-conformités (têtes, sol, talus…) sont levées par la plus petite correction
 *     trouvée par « Corriger » ;
 *  4. chaque épaisseur du corps est ensuite réduite de 5 cm tant que tout reste conforme (gain de béton).
 * Rien n'est appliqué : le résultat est une proposition que l'utilisateur accepte ou non.
 */

import type { Check, CheckStatus } from "./checks";
import { runStudy, runStudyAsync, type Study } from "./engine";
import { FIELD_BY_KEY, type DalotSpec, type FieldValue } from "./fields";
import { applyFix, proposeFixes } from "./fixes";
import { GROUP_LABELS, type GroupId } from "./design";

export type OptimizeChange = { key: string; label: string; from: string; to: string };
export type OptimizeResult = {
  spec: DalotSpec;
  changes: OptimizeChange[];
  log: string[];
  before: { status: CheckStatus; nc: number };
  after: { status: CheckStatus; nc: number };
  iterations: number;
};

const pause = () => new Promise<void>((r) => setTimeout(r, 0));
const fr = (x: number, d = 3) => x.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
const MIN = 0.2, MAX = 1, STEP = 0.05;
const round = (x: number) => Math.round(x * 100) / 100;

/** Non-conformités sur lesquelles l'épaisseur du corps agit. */
const bodyFails = (s: Study) => s.checks.filter((c) => c.status === "non_conforme" && c.domain !== "Ouvrages de tête" && c.domain !== "Hydrologie et hydraulique"
  && !c.id.startsWith("G-TALUS") && !c.id.startsWith("G-QADM") && !c.id.startsWith("G-CONTACT") && !c.id.startsWith("G-SIT") && c.id !== "G-TASS");

function thicknessKey(c: Check, linked: boolean, multi: boolean): string {
  const e = c.element;
  if (e.startsWith("Dalle")) return "es";
  if (e.startsWith("Radier") || e.startsWith("Sol") || e.startsWith("Interface")) return linked ? "es" : "er";
  if (e.includes("intermédiaire") && multi) return "eInt";
  if (e.includes("extérieur") || e.startsWith("Piédroit")) return "eExt";
  return "es";
}

const THICK_LABEL: Record<string, string> = {
  es: "épaisseur de la dalle", er: "épaisseur du radier", eExt: "épaisseur des piédroits extérieurs", eInt: "épaisseur des piédroits intermédiaires",
};

export async function optimizeAll(spec0: DalotSpec, onLog: (line: string) => void, isCancelled: () => boolean = () => false): Promise<OptimizeResult | null> {
  const log: string[] = [];
  const say = (l: string) => { log.push(l); onLog(l); };
  const coarse = (s: DalotSpec): DalotSpec => ({ ...s, values: { ...s.values, pas: Math.max(0.2, Number(s.values.pas) || 0.1) } });
  const run = async (s: DalotSpec, fast = true) => { await pause(); const r = runStudy(fast ? coarse(s) : s); return r.ok ? r.study : null; };
  const nc = (s: Study) => s.checks.filter((c) => c.status === "non_conforme").length;

  const first = await run(spec0, false);
  if (!first) return null;
  const before = { status: first.status, nc: nc(first) };
  let spec: DalotSpec = JSON.parse(JSON.stringify(spec0));
  const linked = spec.values.radierEgalDalle !== false;
  const multi = Number(spec.values.nCells) > 1;
  let it = 0;

  // 1. Nappes imposées en défaut → choix automatique.
  const failingGroups = new Set(first.checks.filter((c) => c.status === "non_conforme").map((c) => /-([a-z_]+)$/.exec(c.id)?.[1]).filter((g): g is string => !!g && !!spec.imposed[g]));
  for (const c of first.checks.filter((x) => x.status === "non_conforme" && /^(T-MA-(F|S)|T-MA-ENC|T-MT-|ANX-CHOC)/.test(x.id))) {
    for (const k of ["aile_v", "rt_enc", "mt_v", "gr"]) if (spec.imposed[k] && ((k === "aile_v" && c.id.startsWith("T-MA-F")) || (k === "rt_enc" && c.id.startsWith("T-MA-ENC")) || (k === "mt_v" && c.id.startsWith("T-MT")) || (k === "gr" && c.id.startsWith("ANX-CHOC")))) failingGroups.add(k);
  }
  if (failingGroups.size) {
    it++;
    const imposed = { ...spec.imposed };
    for (const g of failingGroups) delete imposed[g];
    spec = { ...spec, imposed };
    say(`Itération ${it} : ${failingGroups.size} nappe(s) imposée(s) en défaut rendue(s) au choix automatique des barres.`);
  }

  // 2. Épaisseurs du corps.
  for (let k = 0; k < 25 && !isCancelled(); k++) {
    const s = await run(spec);
    if (!s) return null;
    const fails = bodyFails(s);
    if (fails.length === 0) break;
    const keys = new Map<string, number>();
    for (const c of fails) { const key = thicknessKey(c, linked, multi); keys.set(key, (keys.get(key) ?? 0) + 1); }
    let moved = false;
    for (const [key, n] of keys) {
      const cur = Number(spec.values[key]);
      if (!(cur < MAX - 1e-9)) continue;
      const to = round(cur + STEP);
      spec = { ...spec, values: { ...spec.values, [key]: to } };
      it++;
      say(`Itération ${it} : ${THICK_LABEL[key]}${key === "es" && linked ? " (et du radier)" : ""} portée à ${fr(to)} m (${n} vérification(s) en cause).`);
      moved = true;
    }
    if (!moved) { say("Épaisseurs au maximum admis (1,00 m) : les vérifications restantes demandent une autre correction."); break; }
  }

  // 3. Autres non-conformités : plus petite correction trouvée par « Corriger ».
  const tried = new Set<string>();
  for (let k = 0; k < 10 && !isCancelled(); k++) {
    const s = await run(spec);
    if (!s) break;
    const target = s.checks.find((c) => c.status === "non_conforme" && !tried.has(c.id));
    if (!target) break;
    tried.add(target.id);
    const opts = await proposeFixes(coarse(spec), target);
    const best = opts.find((o) => o.resolves && o.remaining >= 0);
    if (!best) { say(`${target.element} — ${target.label} : aucune correction automatique trouvée.`); continue; }
    spec = applyFix(spec, best);
    it++;
    say(`Itération ${it} : ${best.label} ${best.change} (${target.element}).`);
  }

  // 4. Réduction des épaisseurs tant que tout reste conforme.
  const s3 = await run(spec);
  if (s3 && nc(s3) === 0 && !isCancelled()) {
    const keys = ["es", ...(linked ? [] : ["er"]), "eExt", ...(multi ? ["eInt"] : [])];
    let improved = true;
    while (improved && !isCancelled()) {
      improved = false;
      for (const key of keys) {
        const cur = Number(spec.values[key]);
        if (cur - STEP < MIN - 1e-9) continue;
        const trial: DalotSpec = { ...spec, values: { ...spec.values, [key]: round(cur - STEP) } };
        const s = await run(trial);
        if (s && nc(s) === 0) {
          spec = trial;
          it++;
          say(`Itération ${it} : ${THICK_LABEL[key]} réduite à ${fr(round(cur - STEP))} m, tout reste conforme.`);
          improved = true;
        }
      }
    }
  }

  // 5. Revérification au pas réel du balayage des convois.
  for (let k = 0; k < 6 && !isCancelled(); k++) {
    const s = await run(spec, false);
    if (!s) break;
    const fails = bodyFails(s);
    if (fails.length === 0) break;
    for (const key of new Set(fails.map((c) => thicknessKey(c, linked, multi)))) {
      const to = Math.min(MAX, round(Number(spec.values[key]) + STEP));
      spec = { ...spec, values: { ...spec.values, [key]: to } };
      it++;
      say(`Itération ${it} : revérification au pas réel — ${THICK_LABEL[key]} portée à ${fr(to)} m.`);
    }
  }

  const fin = await runStudyAsync(spec);
  if (!fin.ok) return null;
  const after = { status: fin.study.status, nc: nc(fin.study) };

  // Liste des modifications proposées.
  const changes: OptimizeChange[] = [];
  const show = (v: FieldValue) => (typeof v === "number" ? fr(v, v % 1 === 0 ? 0 : 2) : typeof v === "boolean" ? (v ? "oui" : "non") : String(v ?? "—"));
  for (const key of Object.keys(spec.values)) {
    const a = spec0.values[key], b = spec.values[key];
    if (a === b || (key === "er" && linked)) continue;
    changes.push({ key, label: FIELD_BY_KEY[key]?.label ?? key, from: show(a), to: show(b) });
  }
  for (const g of Object.keys(spec0.imposed)) {
    if (spec0.imposed[g] && !spec.imposed[g]) {
      const label = (GROUP_LABELS as Record<string, string>)[g as GroupId] ?? ({ aile_v: "Voiles des murs en aile", rt_enc: "Radier de tête (encastrement)", mt_v: "Mur de tête", gr: "Guide-roues" } as Record<string, string>)[g] ?? g;
      changes.push({ key: `imposed.${g}`, label: `Ferraillage — ${label}`, from: "imposé", to: "automatique" });
    }
  }
  say(changes.length === 0
    ? "Aucune modification : l'ouvrage est déjà au plus juste sur la grille de 5 cm."
    : `Terminé : ${changes.length} modification(s) proposée(s), statut ${after.status === "conforme" ? "Conforme" : after.status === "non_conforme" ? `Non conforme (${after.nc})` : "Non vérifié"}.`);
  return { spec, changes, log, before, after, iterations: it };
}
