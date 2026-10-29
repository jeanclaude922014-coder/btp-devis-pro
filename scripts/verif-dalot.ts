/**
 * Contrôle de non-régression du moteur DalotPro : `npm run verif:dalot`.
 * 1. Solveur de portique contre un cas analytique (cadre carré symétrique : M appui = qL²/24).
 * 2. Hydrologie / hydraulique contre les notes de calcul Bangolo – Bloléquin (REV 001).
 * 3. Calcul complet des modèles et d'une série 2, 3, 4 cellules × 7 et 8 ml.
 */
import { defaultSpec, seriesSpec, specFromPreset, toInput } from "../src/lib/dalot/fields";
import { addMemberLoad, addTopLoad, buildFrame, emptyLoad, solve } from "../src/lib/dalot/frame";
import { runStudy } from "../src/lib/dalot/engine";
import { buildSheets } from "../src/lib/dalot/plans";

let failed = 0;
const check = (label: string, got: number, want: number, tol: number) => {
  const ok = Math.abs(got - want) <= tol;
  if (!ok) failed++;
  console.log(`${ok ? "OK " : "ÉCHEC"}  ${label} : ${got.toFixed(3)} (attendu ${want} ± ${tol})`);
};

// 1. Cadre carré 3 m entre axes, q = 10 kN/m en haut et en bas.
const s = defaultSpec();
Object.assign(s.values, { nCells: 1, opening: 2.75, hInt: 2.75, es: 0.25, er: 0.25, eExt: 0.25, modeleSol: "lineaire" });
const m = buildFrame(toInput(s));
const f = emptyLoad(m);
addTopLoad(m, f, m.xs[0], m.xs[1], 10);
addMemberLoad(m, f, 1, 0, 3, 10, 10, 0, 1);
const r = solve(m, f);
const slab = m.members[0];
check("Portique : moment d'appui de la dalle (kN·m/m)", r.M[slab.station0], -3.75, 0.02);
check("Portique : moment en travée de la dalle (kN·m/m)", r.M[slab.station0 + Math.floor(slab.nodes.length / 2)], 7.5, 0.02);

// 2. Notes de calcul de référence.
const refs: [string, { Qp: number; h: number; V: number; Fr: number }][] = [
  ["r200x200", { Qp: 9.93, h: 1.33, V: 3.73, Fr: 1.03 }],
  ["r300x200", { Qp: 17.16, h: 1.42, V: 4.02, Fr: 1.07 }],
  ["r2x300x200", { Qp: 31.81, h: 1.46, V: 3.62, Fr: 0.96 }],
];
for (const [id, want] of refs) {
  const res = runStudy(specFromPreset(id));
  if (!res.ok || !res.study.hydro) { failed++; console.log(`ÉCHEC  ${id} : calcul impossible`); continue; }
  const h = res.study.hydro;
  check(`${id} : Qp (m³/s)`, h.Qp, want.Qp, 0.01);
  check(`${id} : tirant d'eau (m)`, h.h, want.h, 0.01);
  check(`${id} : vitesse (m/s)`, h.V, want.V, 0.02);
  check(`${id} : Froude`, h.Fr, want.Fr, 0.01);
}

// 3. Calculs complets.
for (const n of [2, 3, 4]) for (const L of [7, 8]) {
  const res = runStudy(seriesSpec("200x200", n, L));
  if (!res.ok) { failed++; console.log(`ÉCHEC  série ${n} cellules L = ${L} : calcul impossible`); continue; }
  console.log(`OK   série ${n} × 2,00 × 2,00, L = ${L} ml : ${res.study.checks.length} vérifications, statut ${res.study.status}, ${res.study.quantities.steelMass.toFixed(0)} kg d'acier`);
}
const demo = runStudy(defaultSpec());
if (!demo.ok || demo.study.status !== "conforme") { failed++; console.log("ÉCHEC  l'ouvrage de démonstration doit être conforme"); }
else console.log("OK   ouvrage de démonstration conforme");

// 4. Dossiers de plans sur les modèles types : 8 planches et perspectives 3D, cotes de la vue en plan.
for (const [id, model, ids] of [
  ["r200x200", "cafe", ["garde", "vue-plan", "coupes", "ferraillage", "nomenclature", "ferraillage-tete", "mur-aile", "grille-tete", "perspectives-3d", "perspectives-charges"]],
  ["r3x400x400", "paia", ["titre", "coffrage", "corps", "nomenclature-corps", "garde-corps", "nomenclature-gc", "tetes", "nomenclature-tetes", "perspectives-3d", "perspectives-charges"]],
] as const) {
  const res = runStudy(specFromPreset(id));
  if (!res.ok) { failed++; console.log(`ÉCHEC  ${id} : calcul impossible`); continue; }
  const sheets = buildSheets(res.study);
  const okIds = sheets.length === ids.length && ids.every((x, i) => sheets[i].id.startsWith(x));
  const txt = sheets[1].prims.filter((p) => p.t === "text").map((p) => (p.t === "text" ? p.s : ""));
  const cotes = id === "r200x200" ? ["340", "650", "381"] : ["660", "850", "741"];
  const okCotes = cotes.every((c) => txt.includes(c));
  if (!okIds || !okCotes) { failed++; console.log(`ÉCHEC  modèle ${model} (${id}) : ${sheets.map((s) => s.id).join(", ")}`); }
  else console.log(`OK   modèle ${model} (${id}) : ${sheets.length} planches, cotes ${cotes.join(" / ")} présentes`);
}

if (failed) { console.log(`\n${failed} contrôle(s) en échec`); process.exit(1); }
console.log("\nTous les contrôles sont satisfaits.");
