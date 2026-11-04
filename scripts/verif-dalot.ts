/**
 * Contrôle de non-régression du moteur DalotPro : `npm run verif:dalot`.
 * 1. Solveur de portique contre un cas analytique (cadre carré symétrique : M appui = qL²/24).
 * 2. Hydrologie / hydraulique contre les notes de calcul types (REV 001).
 * 3. Calcul complet des modèles et d'une série 2, 3, 4 cellules × 7 et 8 ml.
 */
import { defaultSpec, seriesSpec, specFromPreset, toInput } from "../src/lib/dalot/fields";
import { addMemberLoad, addTopLoad, buildFrame, emptyLoad, solve } from "../src/lib/dalot/frame";
import { runStudy } from "../src/lib/dalot/engine";
import { buildSheets } from "../src/lib/dalot/plans";
import { studyToXlsx } from "../src/lib/dalot/excel";
import { sectionSpec } from "../src/lib/dalot/fields";
import { headDimensions } from "../src/lib/dalot/head-dims";

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
// Seule réserve admise : l'origine des données de pluie, non renseignée sur l'ouvrage de démonstration.
const demoOpen = demo.ok ? demo.study.checks.filter((c) => c.status === "non_conforme" || (c.status === "non_verifie" && c.id !== "H-SRC")) : [];
if (!demo.ok || demoOpen.length > 0) { failed++; console.log(`ÉCHEC  l'ouvrage de démonstration doit être conforme (${demoOpen.map((c) => c.id).join(", ")})`); }
else console.log("OK   ouvrage de démonstration conforme (hors origine des données de pluie)");

// 4. Dossiers de plans sur les modèles types : 8 planches et perspectives 3D, cotes de la vue en plan.
for (const [id, model, ids] of [
  // Garde-corps sur tous les dalots : planche de ferraillage et nomenclature en fin de dossier du modèle cafe.
  ["r200x200", "cafe", ["garde", "vue-plan", "coupes", "ferraillage", "nomenclature", "ferraillage-tete", "mur-aile", "grille-tete", "garde-corps", "nomenclature-gc", "perspectives-3d", "perspectives-charges"]],
  ["r3x400x400", "paia", ["titre", "coffrage", "corps", "nomenclature-corps", "garde-corps", "nomenclature-gc", "tetes", "nomenclature-tetes", "perspectives-3d", "perspectives-charges"]],
] as const) {
  const res = runStudy(specFromPreset(id));
  if (!res.ok) { failed++; console.log(`ÉCHEC  ${id} : calcul impossible`); continue; }
  const sheets = buildSheets(res.study);
  const okIds = sheets.length === ids.length && ids.every((x, i) => sheets[i].id.startsWith(x));
  const txt = sheets[1].prims.filter((p) => p.t === "text").map((p) => (p.t === "text" ? p.s : ""));
  // Radier de tête arrêté au bout des ailes (v21) : 3,81 × cos 27° = 3,39 m (le plan d'origine portait 3,40 m, 1 cm de décalage).
  const cotes = id === "r200x200" ? ["339", "650", "381"] : ["660", "850", "741"];
  const okCotes = cotes.every((c) => txt.includes(c));
  if (!okIds || !okCotes) { failed++; console.log(`ÉCHEC  modèle ${model} (${id}) : ${sheets.map((s) => s.id).join(", ")}`); }
  else console.log(`OK   modèle ${model} (${id}) : ${sheets.length} planches, cotes ${cotes.join(" / ")} présentes`);
}

// 5. Export Excel, nouvelle section et dimensions des têtes calculées.
{
  const res = runStudy(specFromPreset("r200x200"));
  if (!res.ok) { failed++; console.log("ÉCHEC  r200x200 : calcul impossible"); }
  else {
    const x = studyToXlsx(res.study);
    if (x[0] !== 0x50 || x[1] !== 0x4b || x.length < 5000) { failed++; console.log("ÉCHEC  export Excel"); }
    else console.log(`OK   export Excel : ${(x.length / 1024).toFixed(0)} Ko`);
  }
  const sp = sectionSpec(null, { projet: "", nCells: 3, opening: 3, hInt: 2.5, es: 0.3, er: 0.3, eExt: 0.25, eInt: 0.25, L: 8, hr: 0.6 }, true);
  const rs = runStudy(sp);
  if (!rs.ok) { failed++; console.log("ÉCHEC  nouvelle section : calcul impossible"); }
  else {
    const dm = headDimensions(rs.study.input);
    check("nouvelle section 3 × 3,00 × 2,50 : largeur B", dm.B, 10, 1e-9);
    check("nouvelle section : hauteur d'aile en extrémité (talus 3/2)", dm.Hend, 0.6, 0.02);
  }
}

// 6. Version 21 (Expert CI) : têtes différenciées, coupe de sol, situations hydrauliques, choc, optimisation.
{
  const base = specFromPreset("r200x200");
  const r0 = runStudy(base);
  if (!r0.ok) { failed++; console.log("ÉCHEC  r200x200 : calcul impossible"); }
  else {
    // Réglage « position par position » identique aux valeurs générales : même ouvrage, même acier.
    const same = specFromPreset("r200x200");
    same.values.annexes = JSON.stringify({ wings: { amont_g: { angle: Number(same.values.aileAngle), long: Number(same.values.aileLong) } } });
    const r1 = runStudy(same);
    if (!r1.ok || !r1.study.heads.uniform || Math.abs(r1.study.quantities.steelMass - r0.study.quantities.steelMass) > 1e-6) { failed++; console.log("ÉCHEC  annexes identiques aux valeurs générales : résultat différent"); }
    else console.log("OK   annexes identiques aux valeurs générales : têtes uniformes, même acier");
    // Aile aval rive droite supprimée, aile amont rive gauche à 45° : têtes vérifiées séparément.
    const diff = specFromPreset("r200x200");
    diff.values.annexes = JSON.stringify({ heads: { aval: { radierLong: 4 } }, wings: { amont_g: { angle: 45, long: 4.5 }, aval_d: { actif: false } } });
    const r2 = runStudy(diff);
    const ids = r2.ok ? r2.study.checks.map((c) => c.id) : [];
    const ok2 = r2.ok && !r2.study.heads.uniform && ids.includes("T-MA-GLIS-AM") && ids.includes("T-MA-GLIS-AV") && ids.includes("T-MA-F-AMG")
      && r2.study.heads.perHead[1].wings.length === 1 && r2.study.quantities.bars.some((b) => b.designation.endsWith("— amont, rive gauche"));
    if (!ok2) { failed++; console.log("ÉCHEC  têtes différenciées"); }
    else console.log(`OK   têtes différenciées : ${ids.filter((x) => /-(AM|AV)/.test(x)).length} vérifications propres aux têtes amont et aval, une seule aile à l'aval`);
    // Choc sur guide-roue présent par défaut.
    if (!ids.includes("ANX-CHOC-F-AM")) { failed++; console.log("ÉCHEC  choc sur guide-roue"); } else console.log("OK   choc sur guide-roue vérifié tête par tête");
    // Coupe de sol : une couche élastique unique = formule élastique Δσ·h/E.
    const geo = specFromPreset("r200x200");
    geo.values.couchesSol = JSON.stringify([{ nom: "Argile", ep: 3, gamma: 18, methode: "oedometrique", Cc: 0.3, Cr: 0.05, e0: 1, sigP: null }]);
    geo.values.situationsHydro = JSON.stringify([{ nom: "Vidange", nappe: 2.5, eauInt: 0, type: "transitoire", actif: true }]);
    const r3 = runStudy(geo);
    if (!r3.ok) { failed++; console.log("ÉCHEC  coupe de sol : calcul impossible"); }
    else {
      const L0 = r3.study.geo.layers[0];
      check("coupe de sol : tassement œdométrique NC h·Cc/(1+e0)·log((σ0+Δσ)/σ0) (cm)", L0.s, (3 * 0.3) / 2 * Math.log10((L0.s0 + L0.ds) / L0.s0) * 100, 1e-9);
      const fl = r3.study.checks.find((c) => c.id === "G-SIT-FLOT-1");
      if (!fl || fl.value === undefined) { failed++; console.log("ÉCHEC  situation hydraulique : flottaison absente"); }
      else console.log(`OK   situation hydraulique « Vidange » : flottaison FS = ${fl.value.toFixed(2)}`);
    }
  }
}

if (failed) { console.log(`\n${failed} contrôle(s) en échec`); process.exit(1); }
console.log("\nTous les contrôles sont satisfaits.");
