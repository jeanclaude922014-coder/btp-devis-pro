// Tests du moteur Dalot Pro CI — exécution : node --test outils/dalot/
// Chaque valeur attendue provient d'une solution analytique ou d'un calcul manuel
// détaillé dans docs/validation/FICHE_VALIDATION_DALOT.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const M = createRequire(import.meta.url)('./moteur-dalot.cjs');

const proche = (v, ref, tol, nom) => assert.ok(Math.abs(v - ref) <= tol, `${nom} : obtenu ${v}, attendu ${ref} ± ${tol}`);

test('Poutre bi-encastrée sous charge répartie : qL²/12 aux appuis, qL²/24 en travée', () => {
  const L = 4, q = 10, n = 10, noeuds = [], elements = [];
  for (let i = 0; i <= n; i++) noeuds.push({ x: L * i / n, y: 0 });
  for (let i = 0; i < n; i++) elements.push({ i, j: i + 1, EA: 1e7, EI: 5e4 });
  const pf = M.creerPortique(noeuds, elements, { fixes: [0, 1, 2, n * 3, n * 3 + 1, n * 3 + 2] });
  const r = pf.calculerCas({ qy: new Array(n).fill(-q) });
  proche(r.M[0], -q * L * L / 12, 1e-3, 'M appui gauche');
  proche(r.M[2 * n - 1], -q * L * L / 12, 1e-3, 'M appui droit');
  proche(r.M[2 * (n / 2)], q * L * L / 24, 1e-3, 'M mi-travée');
  proche(r.V[0], q * L / 2, 1e-3, 'V appui');
});

test('Cadre fermé symétrique : moment d\'angle = qL²/12 / (1 + (Is/L)/(Iw/H))', () => {
  const L = 3, H = 2, q = 50, E = 3e7, Is = 0.3 ** 3 / 12, Iw = 0.2 ** 3 / 12, n = 12;
  const noeuds = [], elements = [];
  const coins = [[0, H], [L, H], [L, 0], [0, 0]];
  const idCoin = coins.map(([x, y]) => noeuds.push({ x, y }) - 1);
  const charges = [];
  for (let c = 0; c < 4; c++) {
    const a = idCoin[c], b = idCoin[(c + 1) % 4], A = noeuds[a], B = noeuds[b];
    let prev = a;
    for (let k = 1; k <= n; k++) {
      const nd = k === n ? b : noeuds.push({ x: A.x + (B.x - A.x) * k / n, y: A.y + (B.y - A.y) * k / n }) - 1;
      elements.push({ i: prev, j: nd, EA: 1e12, EI: E * (c % 2 === 0 ? Is : Iw) });
      charges.push(c === 0 ? -q : c === 2 ? q : 0);
      prev = nd;
    }
  }
  const pf = M.creerPortique(noeuds, elements, { fixes: [idCoin[3] * 3, idCoin[3] * 3 + 1, idCoin[2] * 3 + 1] });
  const r = pf.calculerCas({ qy: charges });
  const attendu = q * L * L / 12 / (1 + (Is / L) / (Iw / H));
  proche(-r.M[0], attendu, attendu * 0.002, 'Moment d\'angle');
  proche(r.M[n], q * L * L / 8 - attendu, attendu * 0.002, 'Moment à mi-travée de la dalle');
});

test('Dalot par défaut : équilibre vertical, symétrie, cohérence ELU ≥ ELS', () => {
  const p = M.parametresDefaut();
  const res = M.calculer(p);
  assert.equal(res.ok, true);
  const { mod, geo } = res, g = p.geo;
  const reaction = mod.noeudsRadier.reduce((s, nd, i) => s + res.env.perm.sol.max[i] * mod.trib[nd], 0);
  const poids = 25 * (g.es * geo.W + g.er * geo.W + 2 * g.ep * geo.Hc + (geo.n - 1) * g.ec * geo.Hc) + res.qRem * (geo.W + g.ep);
  proche(reaction, poids, poids * 1e-4, 'Somme des réactions du sol sous charges permanentes');
  const dalles = mod.membres.filter(m => m.type === 'dalle');
  const premier = dalles[0].elems[0], dernier = dalles[dalles.length - 1].elems.at(-1);
  proche(res.env.perm.M.max[2 * premier], res.env.perm.M.max[2 * dernier + 1], 1e-6, 'Symétrie des moments d\'angle');
  for (const f of res.ferraillage) {
    assert.ok(f.Melu >= f.Mels - 1e-9, `${f.nom} : M ELU ≥ M ELS`);
    assert.ok(f.AsP >= f.AsReq - 1e-12, `${f.nom} : section mise en place ≥ section requise`);
  }
});

test('Flexion simple BAEL à l\'ELU : calcul manuel Mu = 100 kN.m, d = 0,25 m, fc28 = 25, FeE500', () => {
  const mat = M.materiaux({ norme: 'BAEL', mat: { fc: 25, fe: 500, fissuration: 'prejudiciable' } });
  const r = M.flexionELU(100, 0.25, mat);
  proche(r.mu, 0.1129, 2e-4, 'µ');
  proche(r.alpha, 0.1501, 2e-4, 'α');
  proche(r.As * 1e4, 9.79, 0.01, 'As (cm²)');
  proche(mat.sigmaS, 250, 1e-9, 'Contrainte limite de l\'acier, fissuration préjudiciable');
  proche(M.materiaux({ norme: 'BAEL', mat: { fc: 25, fe: 500, fissuration: 'tres' } }).sigmaS, 200, 1e-9, 'Très préjudiciable');
});

test('Contraintes ELS en section fissurée : calcul manuel M = 60 kN.m, As = 10 cm², d = 0,25 m, n = 15', () => {
  const r = M.contraintesELS(60, 10e-4, 0.25);
  proche(r.x, 0.07289, 2e-5, 'Axe neutre');
  proche(r.sc, 7.29, 0.01, 'σbc');
  proche(r.ss, 265.8, 0.2, 'σs');
  const mat = M.materiaux({ norme: 'BAEL', mat: { fc: 25, fe: 500, fissuration: 'prejudiciable' } });
  const s = M.sectionELS(60, 0.25, mat);
  proche(M.contraintesELS(60, s.As, 0.25).ss, 250, 0.01, 'Section ELS : σs ramenée à la limite');
});

test('Charges et hydraulique : A(l), majoration dynamique, poussée au repos, Strickler', () => {
  proche(M.coefA(10), 2.3 + 360 / 22, 1e-12, 'A(10 m)');
  proche(M.majorationDynamique(10, 1000, 500), 1.2, 1e-12, 'δ');
  proche(M.coefPoussee({ phi: 30, modeK: 'K0' }), 0.5, 1e-12, 'K0 pour φ = 30°');
  proche(M.coefPoussee({ phi: 30, modeK: 'Ka' }), 1 / 3, 1e-12, 'Ka pour φ = 30°');
  proche(M.debitStrickler(67, 2, 1, 0.005), 5.969, 0.002, 'Débit Strickler');
  proche(M.intensiteLigne([{ y: 0, P: 60 }, { y: 2, P: 60 }, { y: 2.5, P: 60 }, { y: 4.5, P: 60 }], 1), 120 / 1.5, 1e-9, 'Regroupement de roues');
});

test('Les deux règlements et les cas limites tournent sans erreur', () => {
  for (const norme of ['BAEL', 'EC2']) for (const reglement of ['F61', 'LM1']) for (const n of [1, 3]) {
    const p = M.parametresDefaut();
    p.norme = norme; p.coef = M.coefficientsDefaut(norme); p.charges.reglement = reglement; p.geo.n = n;
    const res = M.calculer(p);
    assert.equal(res.ok, true, `${norme} ${reglement} ${n} cellule(s)`);
    assert.ok(res.ferraillage.every(f => Number.isFinite(f.AsReq)));
  }
  const p = M.parametresDefaut(); p.geo.es = 0;
  assert.equal(M.calculer(p).ok, false);
});

test('Règle de prédimensionnement de l\'assistant CYPE et cas de charge ajoutés', () => {
  const e = M.predimensionner(2, 1.5);
  proche(e.dalle, 0.18, 1e-12, 'Dalle pour L = 2 m');
  proche(e.pied, 0.145, 1e-12, 'Piédroit pour G = 1,5 m');
  assert.equal(M.predimensionner(6, 5).dalle, 0.5);
  assert.equal(M.predimensionner(8, 2).dalle, null);
  // la surcharge sur radier ne peut qu'augmenter (ou laisser égal) le moment enveloppe du radier
  const p0 = M.parametresDefaut(); p0.charges.eau = false;
  const p1 = M.parametresDefaut(); p1.charges.eau = false; p1.charges.fond = true; p1.charges.qFond = 50;
  const m = (r, id) => r.ferraillage.find(f => f.id === id).Melu;
  const r0 = M.calculer(p0), r1 = M.calculer(p1);
  assert.ok(m(r1, 'rd_inf') >= m(r0, 'rd_inf') - 1e-9 && m(r1, 'rd_sup') >= m(r0, 'rd_sup') - 1e-9);
  // enrobage extérieur plus grand : hauteur utile plus faible sur les nappes extérieures seulement
  const p2 = M.parametresDefaut(); p2.mat.enrobageExt = 0.05;
  const r2 = M.calculer(p2);
  proche(r2.ferraillage.find(f => f.id === 'pd_ext').d, 0.25 - 0.05 - 0.007, 1e-12, 'd face extérieure');
  proche(r2.ferraillage.find(f => f.id === 'pd_int').d, 0.25 - 0.04 - 0.007, 1e-12, 'd face intérieure');
});
