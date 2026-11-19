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

test('Règle de prédimensionnement des épaisseurs et cas de charge ajoutés', () => {
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

const PL = createRequire(import.meta.url)('./plans-dalot.cjs');

test('Ancrages et espacements : valeurs recalculées à la main', () => {
  const bael = M.materiaux({ norme: 'BAEL', mat: { fc: 25, fe: 500, fissuration: 'prejudiciable' } });
  // BAEL A.6.1.23 : ls = Ø fe / (4 × 0,6 × 1,5² × ft28) = 12 × 500 / (4 × 0,6 × 2,25 × 2,1) = 529 mm
  proche(M.ancrage(12, bael).ls * 1000, 529.1, 0.1, 'ls HA12 BAEL');
  const ec2 = M.materiaux({ norme: 'EC2', mat: { fc: 25, fe: 500 } });
  // EC2 § 8.4.3 : fbd = 2,25 × 0,7 × 2,565 / 1,5 = 2,693 MPa ; lb = 12/4 × 434,8 / 2,693 = 484 mm
  proche(M.ancrage(12, ec2).ls * 1000, 484.3, 0.5, 'lb,rqd HA12 EC2');
  const p = M.parametresDefaut();
  const lim = M.limitesArmatures(p, bael, 0.25);
  proche(lim.eMax, 0.25, 1e-12, 'Espacement maximal en fissuration préjudiciable, h = 25 cm');
  p.mat.fissuration = 'tres';
  proche(M.limitesArmatures(p, bael, 0.25).eMax, 0.2, 1e-12, 'Espacement maximal en fissuration très préjudiciable');
  // toutes les nappes du cas par défaut respectent l'espacement maximal et ont un rapport de vérification
  const r = M.calculer(M.parametresDefaut());
  for (const f of r.ferraillage) {
    assert.ok(f.barres.esp <= f.lim.eMax + 1e-9, f.nom);
    assert.ok(f.verifs.length >= 6 && f.verifs.every(v => v.ok), f.nom);
  }
});

test('Nomenclature : masses linéiques, façonnage et cohérence des totaux', () => {
  proche(PL.masseLineique(12), 0.888, 0.001, 'kg/m HA12');
  proche(PL.masseLineique(10), 0.617, 0.001, 'kg/m HA10');
  const p = M.parametresDefaut(), r = M.calculer(p), nm = PL.nomenclature(p, r);
  const B = r.geo.B, c = p.mat.enrobageExt;
  const p1 = nm.lignes.find(l => l.id === 'ds_sup');
  assert.equal(p1.forme, 'U-bas');
  proche(p1.segments[1], B - 2 * c, 0.01, 'Partie horizontale du U = B − 2 c');
  // nombre de barres : (longueur − 2 c) / e + 1, arrondi inférieur
  assert.equal(p1.nbre, Math.floor((p.geo.longueur - 2 * c) / p1.esp + 1e-9) + 1);
  const somme = nm.lignes.reduce((a, l) => a + l.nbre * l.Lunit * l.kgm, 0);
  proche(nm.masse, somme, 1e-6, 'Masse = Σ n × L × kg/m');
  proche(nm.recap.reduce((a, x) => a + x.masse, 0), nm.masse, 1e-6, 'Récapitulatif par diamètre');
  // une barre de plus de 12 m reçoit des recouvrements
  const q = M.parametresDefaut(); q.geo.longueur = 30;
  const rq = M.calculer(q), lg = PL.nomenclature(q, rq).lignes.find(l => l.forme === 'longitudinal');
  assert.ok(lg.recouvrements >= 2 && lg.Lunit > 30 - 2 * c);
});

test('Plans : armatures dans le béton, quatre planches A3, SVG et DXF bien formés', () => {
  for (const n of [1, 2, 3]) {
    const p = M.parametresDefaut(); p.geo.n = n;
    const r = M.calculer(p), d = PL.planches(p, r);
    // chaque barre dessinée en coupe reste dans le contour béton, à l'enrobage près
    const coupe = PL.dessinFerraillageCoupe(p, r, d.nomenclature, 0.05);
    const tol = 1e-6;
    for (const q of coupe.prims.filter(q => q.c === 'ACIER' && q.t !== 'c')) {
      const pts = q.t === 'l' ? [[q.x1, q.y1], [q.x2, q.y2]] : q.pts;
      for (const [x, y] of pts) assert.ok(x >= p.mat.enrobageExt - tol && x <= r.geo.B - p.mat.enrobageExt + tol && y >= p.mat.enrobageExt - tol && y <= r.geo.Hext - p.mat.enrobageExt + tol, `barre hors béton (${x.toFixed(3)} ; ${y.toFixed(3)}), ${n} cellule(s)`);
    }
    assert.equal(d.planches.length, 4);
    for (const pl of d.planches) for (const q of pl.prims) {
      const pts = q.t === 'l' ? [[q.x1, q.y1], [q.x2, q.y2]] : q.t === 'p' ? q.pts : [[q.x, q.y]];
      for (const [x, y] of pts) assert.ok(x >= 0 && x <= PL.A3.w && y >= 0 && y <= PL.A3.h, `${pl.titre} : tracé hors de la feuille A3`);
    }
    const svg = PL.versSVG(d.planches[1]);
    assert.ok(svg.startsWith('<svg') && svg.endsWith('</svg>') && !svg.includes('NaN'));
    const dxf = PL.versDXF(d.planches).split('\r\n');
    assert.equal(dxf[1], 'SECTION'); assert.equal(dxf.at(-2), 'EOF');
    assert.ok(dxf.length % 2 === 1, 'paires code / valeur');
    for (let i = 0; i < dxf.length - 1; i += 2) assert.ok(/^\s*-?\d+$/.test(dxf[i]), `code de groupe DXF invalide ligne ${i}`);
    assert.ok(dxf.every(s => /^[\x20-\x7e]*$/.test(s)), 'DXF en ASCII (accents codés \\U+XXXX)');
  }
});

const TT = createRequire(import.meta.url)('./tetes-dalot.cjs');
const RAD = Math.PI / 180;
function casReference() { // dalot 2 x 3,00 x 2,00, L = 8 m, ailes à 27° sur radier de tête
  const p = M.parametresDefaut();
  Object.assign(p.geo, { n: 2, L: 3, H: 2, es: 0.3, er: 0.3, ep: 0.25, ec: 0.25, gousset: 0, longueur: 8, Hr: 0.3, ech: 0.05 });
  p.tetes = TT.parametresDefaut();
  return p;
}

test('Têtes : coefficient de Coulomb et moment d\'encastrement des ailes recalculés à la main', () => {
  proche(TT.kaCoulomb(30 * RAD, 0, 0), 1 / 3, 1e-12, 'Ka, φ = 30°, talus horizontal');
  proche(TT.kaCoulomb(30 * RAD, 30 * RAD, 0), Math.cos(30 * RAD) ** 2, 1e-12, 'Ka, β = φ : cos² φ');
  // φ = 33°, β = 26° : cos²33 / (1 + √(sin33 sin7 / cos26))² = 0,7034 / 1,2718² = 0,4349
  proche(TT.kaCoulomb(33 * RAD, 26 * RAD, 0), 0.4349, 1e-4, 'Ka, φ = 33°, β = 26°');
  const p = casReference(), r = M.calculer(p), t = TT.calculerTetes(p, r);
  // H0 = H + es + longrine = 2,00 + 0,30 + 0,20 = 2,50 m ; q = 10 × sin 27° = 4,540 kPa
  proche(t.G.H0, 2.5, 1e-12, 'Hauteur de l\'aile au départ');
  proche(t.q, 10 * Math.sin(27 * RAD), 1e-12, 'Surcharge sur remblai');
  // Mu = 1,35 × (1/3 × 20 × 2,5³ / 6) + 1,6 × (1/3 × 4,540 × 2,5² / 2) = 23,44 + 7,57 = 31,01 kN.m/m
  proche(t.troncons[0].voile.Mu, 31.01, 0.02, 'Mu à la base de l\'aile');
  assert.equal(t.ok, true, t.alertes.join(' ; '));
  assert.ok(t.radier.inf.barres.As * 1e4 >= t.radier.inf.AsReq * 1e4 - 1e-9);
});

test('Têtes en T sur semelle : stabilité recalculée indépendamment', () => {
  const p = casReference();
  Object.assign(p.tetes, { type: 'semelle', angle: 15, longueurAuto: false, longueur: 12.8, plat: 0.7, hFin: 0.5, epAuto: false, ep: 0.5, eSemelle: 0.5 });
  const r = M.calculer(p), t = TT.calculerTetes(p, r);
  assert.equal(t.troncons.length, 4, 'tronçons de 3,20 m pour une longueur minimale de 3 m');
  for (const o of t.troncons) {
    const s = o.semelle.stab, H = o.tr.H, e = 0.5, es = 0.5, Ht = H + es, g = p.sol.gammaR, Ka = t.Ka, q = t.q;
    // moments autour de l'arête avant : voile, semelle, terre sur le talon / poussée des terres et de la surcharge
    const Ms = 25 * e * H * (s.av + e / 2) + 25 * s.B * es * s.B / 2 + g * H * s.ar * (s.av + e + s.ar / 2);
    const Mr = Ka * g * Ht * Ht / 2 * Ht / 3 + Ka * q * Ht * Ht / 2;
    proche(s.FSr, Ms / Mr, 1e-9, `renversement tronçon ${o.tr.i}`);
    const N = 25 * e * H + 25 * s.B * es + g * H * s.ar;
    proche(s.FSg, N * p.tetes.mu / (Ka * g * Ht * Ht / 2 + Ka * q * Ht), 1e-9, `glissement tronçon ${o.tr.i}`);
    assert.ok(s.FSr >= 1.5 && s.FSg >= 1.5 && s.sref <= p.sol.sigmaAdm, `tronçon ${o.tr.i} stable`);
  }
  assert.ok(t.troncons[0].semelle.stab.B >= t.troncons[3].semelle.stab.B, 'semelle plus large au tronçon le plus haut');
});

test('Dossier complet : 8 planches (têtes et garde-corps), 7 sans garde-corps, nomenclatures cohérentes', () => {
  for (const [type, gc, attendu] of [['radier', true, 8], ['semelle', false, 7]]) {
    const p = casReference(); p.tetes.type = type; p.tetes.gc.actif = gc;
    const r = M.calculer(p); r.tetes = TT.calculerTetes(p, r);
    const d = PL.planches(p, r);
    assert.equal(d.planches.length, attendu, type);
    for (const pl of d.planches) for (const q of pl.prims) {
      const pts = q.t === 'l' ? [[q.x1, q.y1], [q.x2, q.y2]] : q.t === 'p' ? q.pts : [[q.x, q.y]];
      for (const [x, y] of pts) assert.ok(Number.isFinite(x) && Number.isFinite(y) && x >= 0 && x <= PL.A3.w && y >= 0 && y <= PL.A3.h, `${pl.titre} : tracé hors de la feuille`);
    }
    for (const nm of [d.nomenclature, d.nomenclatureTetes, d.nomenclatureGC].filter(Boolean)) {
      proche(nm.masse, nm.lignes.reduce((a, l) => a + l.nbre * l.Lunit * l.kgm, 0), 1e-6, 'masse');
      assert.ok(nm.lignes.every(l => l.nbre === l.nElem * l.nPar && l.Lunit > 0));
    }
    // numérotation continue du module aux têtes
    assert.equal(d.nomenclatureTetes.lignes[0].pos, d.nomenclature.lignes.length + 1);
    const dxf = PL.versDXF(d.planches).split('\r\n');
    assert.equal(dxf.at(-2), 'EOF');
    assert.ok(dxf.every(s => /^[\x20-\x7e]*$/.test(s)));
  }
});
