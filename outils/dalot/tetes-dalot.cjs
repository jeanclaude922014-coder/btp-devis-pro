/*
 * TÊTES D'OUVRAGE — Dalot Pro CI
 * Auteur : Moulo Jean Claude — Technicien génie civil BTP, Abidjan
 * Murs en aile (voiles en console soumis à la poussée des terres), deux dispositions :
 *   - 'radier' : ailes de faible hauteur sur radier de tête avec bêche ;
 *     les deux ailes et le radier forment un U ouvert : les poussées s'équilibrent, le radier reprend
 *     le moment d'encastrement des ailes.
 *   - 'semelle' : murs en T sur semelle filante découpés en tronçons de longueur minimale,
 *     avec renforts verticaux, stabilité au renversement et au glissement, contrainte sur le sol.
 * Poussée : formule de Coulomb, talus arrière d'inclinaison β limitée à φ,
 * surcharge sur remblai pondérée par sin(angle de l'aile).
 * Garde-corps en béton armé : ferraillage constructif, non calculé.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./moteur-dalot.cjs'));
  else root.DalotTetes = factory(root.DalotMoteur);
})(typeof self !== 'undefined' ? self : this, function (M) {
  'use strict';
  const RAD = Math.PI / 180, GB = 25;
  function fr(v, d) { return Number(v).toFixed(d).replace('.', ','); }
  function cinq(v) { return Math.ceil(v * 20 - 1e-6) / 20; }

  function parametresDefaut() {
    return {
      actif: true,
      type: 'radier',          // 'radier' | 'semelle'
      angle: 27,               // angle de l'aile avec l'axe de l'ouvrage (°)
      longueurAuto: true, longueur: 3.76, // longueur de l'aile en plan (m)
      plat: 0,                 // longueur horizontale en tête avant la pente (m)
      hFin: 0.20,              // hauteur de l'aile en bout, au-dessus de sa base (m)
      talus: 33.7,             // pente du talus de remblai le long de l'aile (3/2 = 33,7°) : fixe la longueur proposée
      betaPoussee: 0,          // inclinaison du remblai derrière le voile, dans sa section (0 si le talus suit l'aile)
      deltaPct: 0,             // frottement terre-mur en % de φ
      epAuto: true, ep: 0.20,  // épaisseur du voile
      qAuto: true, q: 4.5,     // surcharge sur le remblai des ailes (kPa)
      // radier de tête
      eRadier: 0.25, becheProf: 1.00, becheLarg: 0.25,
      // murs en T sur semelle
      eSemelle: 0.50, tronconMin: 3.0, mu: 0.58, FSr: 1.5, FSg: 1.5, renforts: true, renfortMin: 1.5,
      // garde-corps
      gc: { actif: true, vide: 1.00, lisse: 0.20, longrine: 0.20, poteau: 0.20, poteauInter: 0.15, ouvertureMax: 0.70, epaisseur: 0.20 }
    };
  }

  /* Coefficient de poussée active de Coulomb, parement vertical, talus β, frottement δ (radians) */
  function kaCoulomb(phi, beta, delta) {
    const b = Math.min(beta, phi);
    const r = Math.sqrt(Math.sin(phi + delta) * Math.sin(phi - b) / (Math.cos(delta) * Math.cos(b)));
    return Math.pow(Math.cos(phi), 2) / (Math.cos(delta) * Math.pow(1 + r, 2));
  }

  /* Géométrie des ailes et des tronçons */
  function geometrie(p, R) {
    const t = p.tetes, g = p.geo, geo = R.geo, gc = t.gc;
    const longrine = gc.actif ? gc.longrine : 0;
    const base = t.type === 'semelle' ? t.eSemelle : g.er; // la base de l'aile est la semelle, ou le radier de tête au niveau du radier
    const H0 = t.type === 'semelle' ? geo.Hext - t.eSemelle + longrine : g.H + g.es + longrine;
    const ep = t.epAuto ? (t.type === 'semelle' ? Math.max(0.25, Math.round(H0 / 10 * 20) / 20) : Math.max(0.20, Math.round(H0 / 12 * 20) / 20)) : t.ep;
    const tb = Math.tan(Math.min(t.talus, 60) * RAD);
    const La = t.longueurAuto ? cinq(t.plat + Math.max(0, H0 - t.hFin) / tb + g.ep) : t.longueur;
    const hauteur = function (x) { // hauteur de l'aile au-dessus de sa base, x mesuré depuis le module
      if (x <= t.plat) return H0;
      return Math.max(t.hFin, H0 - (H0 - t.hFin) * (x - t.plat) / Math.max(1e-6, La - t.plat));
    };
    const nT = t.type === 'semelle' ? Math.max(1, Math.floor(La / t.tronconMin + 1e-9)) : 1;
    const troncons = [];
    for (let i = 0; i < nT; i++) {
      const x0 = La * i / nT, x1 = La * (i + 1) / nT;
      troncons.push({ i: i + 1, x0: x0, x1: x1, L: x1 - x0, H: hauteur(x0), Hfin: hauteur(x1) });
    }
    return { H0: H0, ep: ep, La: La, hauteur: hauteur, troncons: troncons, base: base, longrine: longrine,
      sinA: Math.sin(t.angle * RAD), cosA: Math.cos(t.angle * RAD), nAiles: 4 };
  }

  /* Ferraillage d'une face de voile ou de semelle (bande de 1 m) */
  function nappe(p, mat, h, c, Mu, Ms, AsMin) {
    const d = h - c - p.mat.phiEst / 2000;
    const elu = M.flexionELU(Mu, d, mat), els = M.sectionELS(Ms, d, mat);
    const AsReq = Math.max(elu.ok ? elu.As : Infinity, els.ok ? els.As : Infinity, AsMin, M.sectionMin(d, h, mat) * (Mu > 0 ? 1 : 0));
    const lim = M.limitesArmatures(p, mat, h);
    const barres = isFinite(AsReq) ? M.choisirBarres(AsReq, function (b) { return b.esp <= lim.eMax + 1e-9 && b.phi <= lim.phiMax + 1e-9; }) : null;
    const ct = M.contraintesELS(Ms, barres ? barres.As : 0, d);
    return { h: h, d: d, Mu: Mu, Ms: Ms, AsElu: elu.As, AsEls: els.As, AsMin: AsMin, AsReq: AsReq, barres: barres,
      sc: ct.sc, ss: ct.ss, ok: !!barres && elu.ok && els.ok, mu: elu.mu };
  }
  function tranchant(mat, d, Vu) {
    const tau = Vu / d / 1000, lim = 0.07 * mat.fc / 1.5; // BAEL A.5.2.2 (même borne prise en EC2 par prudence)
    return { Vu: Vu, tau: tau, limite: lim, ok: tau <= lim };
  }

  /* Calcul d'un tronçon de voile : efforts à la base, ferraillage des deux faces, renfort, horizontales */
  function voile(p, mat, G, tr, Ka, q) {
    const s = p.sol, c = p.mat.enrobageExt, co = p.coef, ep = G.ep, H = tr.H;
    const MG = function (h) { return Ka * s.gammaR * h * h * h / 6; }, MQ = function (h) { return Ka * q * h * h / 2; };
    const VG = function (h) { return Ka * s.gammaR * h * h / 2; }, VQ = function (h) { return Ka * q * h; };
    const Mu = function (h) { return co.Gsup * MG(h) + co.eluLat * MQ(h); }, Ms = function (h) { return MG(h) + co.elsLat * MQ(h); };
    const minFace = 0.001 * ep; // 0,1 % par face (vertical : EC2 § 9.6.2 ; horizontal : 0,1 % par face)
    const base = nappe(p, mat, ep, c, Mu(H), Ms(H), minFace);
    const avant = nappe(p, mat, ep, c, 0, 0, Math.max(minFace, mat.norme === 'BAEL' ? 4e-4 : 0)); // BAEL A.8.1,21 : 4 cm²/m
    let continu = base, renfort = null, hRenfort = 0;
    if (p.tetes.type === 'semelle' && p.tetes.renforts) {
      const mini = nappe(p, mat, ep, c, 0, 0, minFace);
      if (base.barres && mini.barres && base.barres.As > mini.barres.As + 1e-9) {
        // profondeur depuis le haut où les barres continues ne suffisent plus
        let lo = 0, hi = H;
        for (let k = 0; k < 50; k++) { const m = (lo + hi) / 2; const n = nappe(p, mat, ep, c, Mu(m), Ms(m), minFace); if (n.AsReq <= mini.barres.As + 1e-12) lo = m; else hi = m; }
        const AsR = base.AsReq - mini.barres.As;
        const lim = M.limitesArmatures(p, mat, ep);
        const b = M.choisirBarres(AsR, function (x) { return Math.abs(x.esp - mini.barres.esp) < 1e-9 && x.phi <= lim.phiMax + 1e-9; }) ||
          M.choisirBarres(AsR, function (x) { return x.esp <= lim.eMax + 1e-9; });
        if (b) {
          hRenfort = Math.min(H, cinq(Math.max(p.tetes.renfortMin, H - lo + M.ancrage(b.phi, mat).ls)));
          continu = mini; renfort = { barres: b, As: b.As, h: hRenfort };
        }
      }
    }
    const horiz = M.choisirBarres(minFace, function (b) { return b.esp <= M.limitesArmatures(p, mat, ep).eMaxRep + 1e-9; });
    const d = ep - c - p.mat.phiEst / 2000, hv = Math.max(0, H - d);
    const T = tranchant(mat, d, co.Gsup * VG(hv) + co.eluLat * VQ(hv));
    return { H: H, Mu: Mu(H), Ms: Ms(H), Vu: T.Vu, Nd: GB * ep * H, base: base, continu: continu, renfort: renfort, avant: avant,
      horiz: horiz, tranchant: T, AsTotal: (continu.barres ? continu.barres.As : 0) + (renfort ? renfort.As : 0),
      MG: MG, MQ: MQ };
  }

  /* Semelle d'un tronçon (type 'semelle') : dimensionnement des débords et vérifications */
  function semelle(p, mat, G, tr, Ka, delta, q) {
    const t = p.tetes, s = p.sol, co = p.coef, ep = G.ep, es = t.eSemelle, H = tr.H, Ht = H + es;
    const beta = Math.min(t.betaPoussee, s.phi) * RAD;
    function etat(av, ar) {
      const B = av + ep + ar;
      const hsol = H + ar * Math.tan(beta) / 2; // hauteur moyenne de terre sur le talon
      const W = [ // [force verticale kN/m, bras de levier depuis l'arête avant]
        [GB * ep * H, av + ep / 2], [GB * B * es, B / 2], [s.gammaR * hsol * ar, av + ep + ar / 2]];
      const Pa = Ka * s.gammaR * Ht * Ht / 2, Pq = Ka * q * Ht;
      const PaH = Pa * Math.cos(delta), PaV = Pa * Math.sin(delta), PqH = Pq * Math.cos(delta);
      const Ms = W.reduce(function (a, w) { return a + w[0] * w[1]; }, 0) + PaV * B;
      const Mr = PaH * Ht / 3 + PqH * Ht / 2;
      const N = W.reduce(function (a, w) { return a + w[0]; }, 0) + PaV;
      const Nq = N + q * ar; // surcharge sur le talon : défavorable pour la portance
      const Mq = Ms + q * ar * (av + ep + ar / 2) - Mr;
      const xr = Mq / Nq, e = B / 2 - xr;
      let smax, smin;
      if (Math.abs(e) <= B / 6) { smax = Nq / B * (1 + 6 * Math.abs(e) / B); smin = Nq / B * (1 - 6 * Math.abs(e) / B); }
      else { smax = xr > 0 && xr < B ? 2 * Nq / (3 * Math.min(xr, B - xr)) : Infinity; smin = 0; }
      const sref = (3 * smax + smin) / 4;
      return { B: B, av: av, ar: ar, W: W, N: N, Nq: Nq, Ms: Ms, Mr: Mr, FSr: Mr > 0 ? Ms / Mr : Infinity,
        FSg: (PaH + PqH) > 0 ? N * t.mu / (PaH + PqH) : Infinity, e: e, xr: xr, smax: smax, smin: smin, sref: sref,
        HT: PaH + PqH, okR: Ms / Mr >= t.FSr, okG: N * t.mu / (PaH + PqH) >= t.FSg, okS: sref <= s.sigmaAdm && xr > 0 && xr < B };
    }
    // recherche du plus petit débord total (pas de 5 cm), débord avant ≈ 1/3 du total
    let best = null;
    for (let tot = 0.30; tot <= 4 * Ht; tot += 0.05) {
      const av = Math.max(0.15, cinq(tot / 3 - 0.0249)), ar = Math.max(0.15, Math.round((tot - av) * 20) / 20);
      const st = etat(av, ar);
      if (st.okR && st.okG && st.okS) { best = st; break; }
    }
    const st = best || etat(Math.max(0.15, cinq(Ht / 3)), cinq(Ht));
    // flexion de la semelle à l'ELU : sections de référence à 0,15 × épaisseur du voile à l'intérieur du voile
    const B = st.B, av = st.av, ar = st.ar, c = p.mat.enrobageExt;
    const kG = co.Gsup, kQ = co.eluLat, kS = co.elsLat;
    function reaction(k1, k2) { // pression linéaire sous la semelle pour des charges pondérées
      const Pa = Ka * s.gammaR * Ht * Ht / 2, Pq = Ka * q * Ht;
      const N = k1 * st.N + k2 * q * ar, Mt = k1 * (st.Ms - Pa * Math.cos(delta) * Ht / 3) - k2 * Pq * Math.cos(delta) * Ht / 2 + k2 * q * ar * (av + ep + ar / 2);
      const xr = Mt / N, e = B / 2 - xr;
      if (Math.abs(e) <= B / 6) { const s1 = N / B * (1 + 6 * e / B), s2 = N / B * (1 - 6 * e / B); return function (x) { return s1 + (s2 - s1) * x / B; }; }
      const Lc = 3 * xr; return function (x) { return x < Lc ? 2 * N / Lc * (1 - x / Lc) : 0; };
    }
    function moments(k1, k2) {
      const sig = reaction(k1, k2), n = 60;
      const xa = av + 0.15 * ep, xb = av + ep - 0.15 * ep; // sections de référence
      let Mav = 0, Mar = 0;
      for (let i = 0; i < n; i++) { // patin avant : réaction vers le haut moins poids propre
        const x = xa * (i + 0.5) / n; Mav += (sig(x) - k1 * GB * es) * (xa - x) * xa / n;
      }
      const hsol = H + ar * Math.tan(beta) / 2;
      for (let i = 0; i < n; i++) { // talon : terre, semelle et surcharge vers le bas moins réaction
        const x = xb + (B - xb) * (i + 0.5) / n, w = x > av + ep ? k1 * (s.gammaR * hsol) + k2 * q : 0;
        Mar += (w + k1 * GB * es - sig(x)) * (x - xb) * (B - xb) / n;
      }
      return { av: Math.max(0, Mav), ar: Math.max(0, Mar) };
    }
    const mU = moments(kG, kQ), mS = moments(1, kS);
    const minS = 0.001 * es; // Fascicule 62 titre V, art. B.4.3 : 0,1 %
    const inf = nappe(p, mat, es, c, mU.av, mS.av, minS), sup = nappe(p, mat, es, c, mU.ar, mS.ar, minS);
    const longi = M.choisirBarres(Math.max(minS, (Math.max(inf.barres ? inf.barres.As : 0, sup.barres ? sup.barres.As : 0)) / 4),
      function (b) { return b.esp <= M.limitesArmatures(p, mat, es).eMaxRep + 1e-9; });
    const d = es - c - p.mat.phiEst / 2000;
    return { stab: st, trouve: !!best, inf: inf, sup: sup, longi: longi, Mav: mU.av, Mar: mU.ar,
      // effort tranchant estimé par V ≈ 2 M / l (console sous charge répartie), section à l'encastrement : majorant
      tranchant: tranchant(mat, d, Math.max(mU.av / Math.max(0.01, av), mU.ar / Math.max(0.01, ar)) * 2) };
  }

  /* Radier de tête (type 'radier') : reprend le moment d'encastrement des ailes */
  function radierTete(p, mat, G, v, R) {
    const t = p.tetes, c = p.mat.enrobageExt, e = t.eRadier;
    const largeurDebut = R.geo.B, largeurFin = R.geo.B + 2 * G.La * G.sinA;
    const Lr = G.La * G.cosA; // longueur du radier de tête selon l'axe
    const minR = 0.001 * e;
    const inf = nappe(p, mat, e, c, v.Mu, v.Ms, minR); // face inférieure tendue sous le moment d'encastrement des ailes
    const sup = nappe(p, mat, e, c, 0, 0, minR);
    const longi = M.choisirBarres(minR, function (b) { return b.esp <= M.limitesArmatures(p, mat, e).eMaxRep + 1e-9; });
    const surf = Lr * (largeurDebut + largeurFin) / 2;
    const poids = GB * (surf * e + 2 * G.ep * G.La * (G.H0 + t.hFin) / 2 + t.becheLarg * (t.becheProf - e) * largeurFin);
    const sol = poids / surf;
    return { inf: inf, sup: sup, longi: longi, Lr: Lr, largeurDebut: largeurDebut, largeurFin: largeurFin, surface: surf, sol: sol,
      okSol: sol <= p.sol.sigmaAdm };
  }

  /* Garde-corps : géométrie et ferraillage constructif */
  function gardeCorps(p, R) {
    const gc = p.tetes.gc, g = p.geo, geo = R.geo;
    if (!gc.actif) return null;
    // poteaux : aux extrémités et au droit de chaque piédroit et cloison, intermédiaires pour que l'ouverture ≤ ouvertureMax
    const principaux = [gc.poteau / 2];
    let cur = g.ep;
    for (let i = 0; i < geo.n; i++) { cur += g.L; principaux.push(i < geo.n - 1 ? cur + g.ec / 2 : geo.B - gc.poteau / 2); cur += i < geo.n - 1 ? g.ec : 0; }
    const poteaux = [];
    for (let i = 0; i < principaux.length; i++) {
      poteaux.push({ x: principaux[i], b: gc.poteau });
      if (i < principaux.length - 1) {
        const a = principaux[i] + gc.poteau / 2, b = principaux[i + 1] - gc.poteau / 2;
        const nOuv = Math.max(1, Math.ceil((b - a + gc.poteauInter) / (gc.ouvertureMax + gc.poteauInter) - 1e-9));
        const ouv = (b - a - (nOuv - 1) * gc.poteauInter) / nOuv;
        for (let k = 1; k < nOuv; k++) poteaux.push({ x: a + k * ouv + (k - 0.5) * gc.poteauInter, b: gc.poteauInter });
      }
    }
    poteaux.sort(function (u, v) { return u.x - v.x; });
    return { poteaux: poteaux, longueur: geo.B, hauteur: gc.longrine + gc.vide + gc.lisse, nombre: 2 };
  }

  function calculerTetes(p, R) {
    if (!p.tetes || !p.tetes.actif || !R || !R.ok) return null;
    const t = p.tetes, mat = R.mat, G = geometrie(p, R);
    const delta = t.deltaPct / 100 * p.sol.phi * RAD;
    const Ka = kaCoulomb(p.sol.phi * RAD, t.betaPoussee * RAD, delta), KaH = Ka * Math.cos(delta);
    const q = t.qAuto ? p.sol.qRemblai * G.sinA : t.q;
    const alertes = [];
    const troncons = G.troncons.map(function (tr) {
      const v = voile(p, mat, G, tr, KaH, q);
      const o = { tr: tr, voile: v };
      if (t.type === 'semelle') o.semelle = semelle(p, mat, G, tr, Ka, delta, q);
      if (!v.base.ok) alertes.push('Mur en aile, tronçon ' + tr.i + ' : ferraillage du voile impossible, augmenter l\'épaisseur.');
      if (!v.tranchant.ok) alertes.push('Mur en aile, tronçon ' + tr.i + ' : effort tranchant trop élevé à la base du voile.');
      if (o.semelle && !o.semelle.trouve) alertes.push('Mur en aile, tronçon ' + tr.i + ' : aucune semelle jusqu\'à 4 fois la hauteur ne vérifie la stabilité.');
      if (o.semelle && (!o.semelle.inf.ok || !o.semelle.sup.ok)) alertes.push('Mur en aile, tronçon ' + tr.i + ' : ferraillage de la semelle impossible, augmenter son épaisseur.');
      return o;
    });
    let radier = null;
    if (t.type === 'radier') {
      radier = radierTete(p, mat, G, troncons[0].voile, R);
      if (!radier.inf.ok) alertes.push('Radier de tête : ferraillage impossible, augmenter son épaisseur.');
      if (!radier.okSol) alertes.push('Radier de tête : contrainte sur le sol ' + fr(radier.sol, 0) + ' kPa supérieure à l\'admissible.');
    }
    // volumes de béton des têtes (deux têtes, quatre ailes)
    let beton = 0;
    const vAile = G.ep * G.La * (G.H0 + t.hFin) / 2 * (t.plat > 0 ? 1 : 1);
    beton += G.nAiles * vAile;
    if (radier) beton += 2 * (radier.surface * t.eRadier + t.becheLarg * (t.becheProf - t.eRadier) * radier.largeurFin);
    if (t.type === 'semelle') troncons.forEach(function (o) { beton += G.nAiles * o.semelle.stab.B * t.eSemelle * o.tr.L; });
    const gc = gardeCorps(p, R);
    let betonGC = 0;
    if (gc) {
      const g2 = t.gc;
      betonGC = gc.nombre * g2.epaisseur * (gc.longueur * (g2.longrine + g2.lisse) + gc.poteaux.reduce(function (a, x) { return a + x.b; }, 0) * g2.vide);
    }
    return { G: G, Ka: Ka, KaH: KaH, q: q, delta: delta, troncons: troncons, radier: radier, gc: gc, beton: beton, betonGC: betonGC,
      alertes: alertes, ok: alertes.length === 0 };
  }

  return { parametresDefaut: parametresDefaut, calculerTetes: calculerTetes, kaCoulomb: kaCoulomb, geometrie: geometrie };
});
