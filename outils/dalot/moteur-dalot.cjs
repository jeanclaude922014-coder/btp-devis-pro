/*
 * MOTEUR DE CALCUL — Dalot Pro CI
 * Auteur : Moulo Jean Claude — Technicien génie civil BTP, Abidjan
 * Dalot cadre fermé en béton armé, bande de 1 m, portique plan sur appuis élastiques (Winkler).
 * Unités internes : kN, m, kPa. Résistances des matériaux saisies en MPa.
 * Ce fichier ne contient aucune interface : il s'exécute dans Node (tests) et dans le navigateur.
 * Statut STD-GC-001 : niveau 2 « contrôlé manuellement » sur les cas listés dans
 * docs/validation/FICHE_VALIDATION_DALOT.md. Pas de comparaison à un logiciel tiers à ce jour.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.DalotMoteur = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const VERSION = '0.1.0';
  const G_BETON = 25; // kN/m3, béton armé
  const G_EAU = 10; // kN/m3
  const ES = 200000; // MPa
  function fr(v, d) { return v.toFixed(d).replace('.', ','); } // nombre au format français

  /* ------------------------------------------------------------------ */
  /* 1. Paramètres par défaut (contexte ivoirien)                        */
  /* ------------------------------------------------------------------ */
  function coefficientsDefaut(norme) {
    if (norme === 'EC2') {
      // EN 1990 annexe A2 (ponts routiers), valeurs recommandées
      return { Gsup: 1.35, Ginf: 1.0, eluRoute: 1.35, eluMc: 1.35, eluLat: 1.35, eluEau: 1.5,
        elsRoute: 1.0, elsMc: 1.0, elsLat: 1.0, elsEau: 1.0, psi1: 0.75 };
    }
    // BAEL 91 rév. 99 + Fascicule 61 titre II : 1,5 x 1,07 = 1,605 arrondi 1,6 ; ELS 1,2
    return { Gsup: 1.35, Ginf: 1.0, eluRoute: 1.6, eluMc: 1.35, eluLat: 1.6, eluEau: 1.35,
      elsRoute: 1.2, elsMc: 1.0, elsLat: 1.2, elsEau: 1.0, psi1: 0.75 };
  }

  function parametresDefaut() {
    return {
      projet: { nom: 'Dalot 2 x 2,00 x 1,50', lieu: 'Abidjan', route: '', pk: '', maitre: 'AGEROUTE',
        auteur: 'Moulo Jean Claude', date: '' },
      hydro: { Q: 12, K: 67, pente: 0.5, tauxMax: 0.8, vMin: 0.5, vMax: 4.0,
        C: 0.6, I: 100, A: 0.5 },
      norme: 'BAEL', // 'BAEL' | 'EC2'
      mat: { fc: 25, fe: 500, enrobageExt: 0.04, enrobageInt: 0.04, dmax: 25, env: 'humide', fissuration: 'prejudiciable',
        wmax: 0.3, phiEst: 14 },
      geo: { n: 2, L: 2.0, H: 1.5, es: 0.25, er: 0.25, ep: 0.25, ec: 0.25, gousset: 0.15,
        longueur: 10, Hr: 0.6, ech: 0.05 },
      sol: { gammaR: 20, phi: 30, modeK: 'K0', Kmanuel: 0.5, gammaCh: 22, ks: 40000, sigmaAdm: 200,
        qRemblai: 10, angleDiff: 30 },
      charges: { reglement: 'F61', classe: 1, largeurRoulable: 7, nFiles: 2,
        A: true, Bc: true, Bt: true, Br: true, Mc120: true,
        deltaAuto: true, deltaManuel: 1.2, alphaQ: 1, alphaq: 1,
        eau: true, hEau: 1.5, surface: true, qSurface: 10, fond: false, qFond: 10 },
      coef: coefficientsDefaut('BAEL'),
      metre: { majorationAcier: 10 }
    };
  }

  /* ------------------------------------------------------------------ */
  /* 2. Solveur de portique plan (méthode des déplacements)              */
  /* ------------------------------------------------------------------ */
  function creerPortique(noeuds, elements, appuis) {
    const n = noeuds.length * 3;
    const K = new Float64Array(n * n);
    const el = elements.map(function (e) {
      const a = noeuds[e.i], b = noeuds[e.j];
      const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy), c = dx / L, s = dy / L;
      const ea = e.EA / L, t = e.EI / (L * L * L);
      const k = [
        [ea, 0, 0, -ea, 0, 0],
        [0, 12 * t, 6 * t * L, 0, -12 * t, 6 * t * L],
        [0, 6 * t * L, 4 * t * L * L, 0, -6 * t * L, 2 * t * L * L],
        [-ea, 0, 0, ea, 0, 0],
        [0, -12 * t, -6 * t * L, 0, 12 * t, -6 * t * L],
        [0, 6 * t * L, 2 * t * L * L, 0, -6 * t * L, 4 * t * L * L]];
      const T = [
        [c, s, 0, 0, 0, 0], [-s, c, 0, 0, 0, 0], [0, 0, 1, 0, 0, 0],
        [0, 0, 0, c, s, 0], [0, 0, 0, -s, c, 0], [0, 0, 0, 0, 0, 1]];
      const ddl = [e.i * 3, e.i * 3 + 1, e.i * 3 + 2, e.j * 3, e.j * 3 + 1, e.j * 3 + 2];
      // kg = Tt k T
      const kT = k.map(function (row) {
        return T[0].map(function (_, q) { let v = 0; for (let m = 0; m < 6; m++) v += row[m] * T[m][q]; return v; });
      });
      for (let p = 0; p < 6; p++) for (let q = 0; q < 6; q++) {
        let v = 0; for (let m = 0; m < 6; m++) v += T[m][p] * kT[m][q];
        K[ddl[p] * n + ddl[q]] += v;
      }
      return { L: L, c: c, s: s, k: k, T: T, ddl: ddl };
    });
    let kmax = 0; for (let i = 0; i < n; i++) kmax = Math.max(kmax, K[i * n + i]);
    (appuis.ressorts || []).forEach(function (r) { K[r.ddl * n + r.ddl] += r.k; });
    (appuis.fixes || []).forEach(function (d) { K[d * n + d] += kmax * 1e8; });
    // Factorisation de Cholesky K = L Lt (en place, triangle inférieur)
    for (let j = 0; j < n; j++) {
      let d = K[j * n + j];
      for (let k2 = 0; k2 < j; k2++) d -= K[j * n + k2] * K[j * n + k2];
      if (!(d > 0)) throw new Error('Structure instable : vérifier les appuis (pivot ' + j + ').');
      d = Math.sqrt(d); K[j * n + j] = d;
      for (let i = j + 1; i < n; i++) {
        let v = K[i * n + j];
        const ri = i * n, rj = j * n;
        for (let k2 = 0; k2 < j; k2++) v -= K[ri + k2] * K[rj + k2];
        K[ri + j] = v / d;
      }
    }
    function resoudre(F) {
      const u = Float64Array.from(F);
      for (let i = 0; i < n; i++) {
        let v = u[i]; const ri = i * n;
        for (let k2 = 0; k2 < i; k2++) v -= K[ri + k2] * u[k2];
        u[i] = v / K[ri + i];
      }
      for (let i = n - 1; i >= 0; i--) {
        let v = u[i];
        for (let k2 = i + 1; k2 < n; k2++) v -= K[k2 * n + i] * u[k2];
        u[i] = v / K[i * n + i];
      }
      return u;
    }
    /* cas = { qx:[], qy:[] charges réparties en repère GLOBAL par élément (kN/m), nodal:[...] } */
    function calculerCas(cas) {
      const F = new Float64Array(n);
      if (cas.nodal) for (let i = 0; i < n; i++) F[i] = cas.nodal[i] || 0;
      const feqs = [];
      el.forEach(function (e, idx) {
        const gx = cas.qx ? cas.qx[idx] || 0 : 0, gy = cas.qy ? cas.qy[idx] || 0 : 0;
        const qx = gx * e.c + gy * e.s, qy = -gx * e.s + gy * e.c, L = e.L;
        const f = [qx * L / 2, qy * L / 2, qy * L * L / 12, qx * L / 2, qy * L / 2, -qy * L * L / 12];
        feqs.push(f);
        if (gx || gy) for (let p = 0; p < 6; p++) {
          let v = 0; for (let m = 0; m < 6; m++) v += e.T[m][p] * f[m];
          F[e.ddl[p]] += v;
        }
      });
      const u = resoudre(F);
      const ne = el.length;
      const M = new Float64Array(2 * ne), V = new Float64Array(2 * ne), N = new Float64Array(2 * ne);
      el.forEach(function (e, idx) {
        const ul = [0, 0, 0, 0, 0, 0];
        for (let m = 0; m < 6; m++) { let v = 0; for (let p = 0; p < 6; p++) v += e.T[m][p] * u[e.ddl[p]]; ul[m] = v; }
        const f = [0, 0, 0, 0, 0, 0];
        for (let m = 0; m < 6; m++) { let v = 0; for (let p = 0; p < 6; p++) v += e.k[m][p] * ul[p]; f[m] = v - feqs[idx][m]; }
        // Convention : M > 0 = fibre tendue du côté -y local ; N > 0 = traction
        N[2 * idx] = -f[0]; N[2 * idx + 1] = f[3];
        V[2 * idx] = f[1]; V[2 * idx + 1] = -f[4];
        M[2 * idx] = -f[2]; M[2 * idx + 1] = f[5];
      });
      return { u: u, M: M, V: V, N: N };
    }
    return { n: n, elements: el, calculerCas: calculerCas };
  }

  /* ------------------------------------------------------------------ */
  /* 3. Matériaux                                                        */
  /* ------------------------------------------------------------------ */
  function materiaux(p) {
    const fc = p.mat.fc, fe = p.mat.fe;
    if (p.norme === 'EC2') {
      const fctm = 0.3 * Math.pow(fc, 2 / 3);
      return { norme: 'EC2', fc: fc, fe: fe, fcu: fc / 1.5, fsu: fe / 1.15, ft: fctm,
        E: 22000 * Math.pow((fc + 8) / 10, 0.3), sigmaC: 0.6 * fc, sigmaS: 0.8 * fe, muLim: 0.372 };
    }
    const ft = 0.6 + 0.06 * fc;
    let sig = fe;
    if (p.mat.fissuration !== 'peu') {
      sig = Math.min(2 / 3 * fe, Math.max(0.5 * fe, 110 * Math.sqrt(1.6 * ft)));
      if (p.mat.fissuration === 'tres') sig *= 0.8;
    }
    return { norme: 'BAEL', fc: fc, fe: fe, fcu: 0.85 * fc / 1.5, fsu: fe / 1.15, ft: ft,
      E: 11000 * Math.pow(fc, 1 / 3), sigmaC: 0.6 * fc, sigmaS: sig, muLim: fe >= 500 ? 0.372 : 0.392 };
  }

  /* ------------------------------------------------------------------ */
  /* 4. Géométrie et maillage                                            */
  /* ------------------------------------------------------------------ */
  function geometrie(p) {
    const g = p.geo, n = Math.max(1, Math.round(g.n));
    const xs = [0];
    for (let k = 0; k < n; k++) {
      const eg = k === 0 ? g.ep : g.ec, ed = k === n - 1 ? g.ep : g.ec;
      xs.push(xs[k] + eg / 2 + g.L + ed / 2);
    }
    return { n: n, xs: xs, W: xs[n], Hc: g.H + g.es / 2 + g.er / 2,
      B: n * g.L + 2 * g.ep + (n - 1) * g.ec, Hext: g.H + g.es + g.er };
  }

  function construireModele(p) {
    const g = p.geo, geo = geometrie(p), mat = materiaux(p), E = mat.E * 1000;
    const noeuds = [], elements = [], membres = [];
    const T = [], Bn = [];
    for (let k = 0; k <= geo.n; k++) { T.push(noeuds.push({ x: geo.xs[k], y: geo.Hc }) - 1); }
    for (let k = 0; k <= geo.n; k++) { Bn.push(noeuds.push({ x: geo.xs[k], y: 0 }) - 1); }
    function membre(type, idx, a, b, ep) {
      const A = noeuds[a], Bb = noeuds[b], len = Math.hypot(Bb.x - A.x, Bb.y - A.y);
      let ne = Math.min(32, Math.max(8, Math.ceil(len / 0.125))); if (ne % 2) ne++;
      const m = { type: type, idx: idx, ep: ep, long: len, elems: [], noeuds: [a] };
      let prev = a;
      for (let q = 1; q <= ne; q++) {
        const nd = q === ne ? b : noeuds.push({ x: A.x + (Bb.x - A.x) * q / ne, y: A.y + (Bb.y - A.y) * q / ne }) - 1;
        m.elems.push(elements.push({ i: prev, j: nd, EA: E * ep, EI: E * ep * ep * ep / 12, ep: ep, membre: membres.length }) - 1);
        m.noeuds.push(nd); prev = nd;
      }
      membres.push(m);
    }
    // Sens de parcours choisi pour que M > 0 tende toujours la face INTÉRIEURE du cadre
    for (let k = 0; k < geo.n; k++) membre('dalle', k, T[k], T[k + 1], g.es);
    membre('pied', 1, T[geo.n], Bn[geo.n], g.ep);
    for (let k = geo.n - 1; k >= 0; k--) membre('radier', k, Bn[k + 1], Bn[k], g.er);
    membre('pied', 0, Bn[0], T[0], g.ep);
    for (let k = 1; k < geo.n; k++) membre('cloison', k, Bn[k], T[k], g.ec);

    // Appuis élastiques verticaux sous le radier (Winkler), blocage horizontal au milieu du radier
    const trib = {};
    membres.filter(function (m) { return m.type === 'radier'; }).forEach(function (m) {
      m.elems.forEach(function (ie) {
        const e = elements[ie], l = Math.abs(noeuds[e.j].x - noeuds[e.i].x);
        trib[e.i] = (trib[e.i] || 0) + l / 2; trib[e.j] = (trib[e.j] || 0) + l / 2;
      });
    });
    trib[Bn[0]] += g.ep / 2; trib[Bn[geo.n]] += g.ep / 2;
    const noeudsRadier = Object.keys(trib).map(Number).sort(function (a, b) { return noeuds[a].x - noeuds[b].x; });
    const ressorts = noeudsRadier.map(function (nd) { return { ddl: nd * 3 + 1, k: p.sol.ks * trib[nd] }; });
    let milieu = noeudsRadier[0];
    noeudsRadier.forEach(function (nd) { if (Math.abs(noeuds[nd].x - geo.W / 2) < Math.abs(noeuds[milieu].x - geo.W / 2)) milieu = nd; });
    const portique = creerPortique(noeuds, elements, { ressorts: ressorts, fixes: [milieu * 3] });
    return { p: p, geo: geo, mat: mat, noeuds: noeuds, elements: elements, membres: membres, T: T, Bn: Bn,
      noeudsRadier: noeudsRadier, trib: trib, portique: portique };
  }

  /* ------------------------------------------------------------------ */
  /* 5. Cas de charges                                                   */
  /* ------------------------------------------------------------------ */
  function coefPoussee(sol) {
    const r = sol.phi * Math.PI / 180;
    if (sol.modeK === 'Ka') return Math.pow(Math.tan(Math.PI / 4 - r / 2), 2);
    if (sol.modeK === 'manuel') return sol.Kmanuel;
    return 1 - Math.sin(r); // Jaky, poussée des terres au repos
  }

  function casVide(mod) {
    const ne = mod.elements.length;
    return { qx: new Float64Array(ne), qy: new Float64Array(ne), nodal: new Float64Array(mod.portique.n) };
  }
  function milieuElem(mod, ie) {
    const e = mod.elements[ie], a = mod.noeuds[e.i], b = mod.noeuds[e.j];
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  function casPermanents(mod) {
    const p = mod.p, g = p.geo, s = p.sol, geo = mod.geo;
    const pp = casVide(mod), rem = casVide(mod), terre = casVide(mod), latG = casVide(mod), latD = casVide(mod), eau = casVide(mod), surf = casVide(mod), fond = casVide(mod);
    const qS = p.charges.qSurface;
    const qRem = s.gammaR * g.Hr + s.gammaCh * g.ech;
    const K = coefPoussee(s);
    const ySurf = geo.Hc + g.es / 2 + g.Hr + g.ech;
    const hEau = Math.min(Math.max(p.charges.hEau, 0), g.H), yEau = g.er / 2 + hEau;
    mod.membres.forEach(function (m) {
      m.elems.forEach(function (ie) {
        const c = milieuElem(mod, ie);
        if (m.type === 'dalle') { pp.qy[ie] = -G_BETON * m.ep; rem.qy[ie] = -qRem; surf.qy[ie] = -qS; }
        else if (m.type === 'radier') { pp.qy[ie] = -G_BETON * m.ep; eau.qy[ie] = -G_EAU * hEau; fond.qy[ie] = -p.charges.qFond; }
        else {
          pp.qy[ie] = -G_BETON * m.ep; // poids des voiles, charge axiale répartie
          if (m.type === 'pied') {
            const z = ySurf - c.y;
            const sv = z <= g.ech ? s.gammaCh * z : s.gammaCh * g.ech + s.gammaR * (z - g.ech);
            const sens = m.idx === 0 ? 1 : -1; // poussée vers l'intérieur
            terre.qx[ie] = sens * K * sv;
            (m.idx === 0 ? latG : latD).qx[ie] = sens * K * s.qRemblai;
            surf.qx[ie] = sens * K * qS; // surcharge uniforme d'extension infinie : dalle et deux piédroits
            if (c.y < yEau) eau.qx[ie] = -sens * G_EAU * (yEau - c.y); // eau intérieure, vers l'extérieur
          }
        }
      });
    });
    // débords de demi-épaisseur des piédroits : remblai reporté aux nœuds d'angle
    rem.nodal[mod.T[0] * 3 + 1] -= qRem * g.ep / 2; rem.nodal[mod.T[geo.n] * 3 + 1] -= qRem * g.ep / 2;
    surf.nodal[mod.T[0] * 3 + 1] -= qS * g.ep / 2; surf.nodal[mod.T[geo.n] * 3 + 1] -= qS * g.ep / 2;
    return { pp: pp, rem: rem, terre: terre, latG: latG, latD: latD, eau: eau, surf: surf, fond: fond, K: K, qRem: qRem };
  }

  /* Intensité linéique maximale (kN par mètre de longueur de dalot) d'une rangée de roues diffusées */
  function intensiteLigne(roues, bp) {
    let best = 0;
    for (let i = 0; i < roues.length; i++) {
      let somme = 0;
      for (let j = i; j < roues.length; j++) {
        somme += roues[j].P;
        best = Math.max(best, somme / (roues[j].y - roues[i].y + bp));
      }
    }
    return best;
  }

  /* Diffusion d'une empreinte : 3/4 de l'épaisseur dans la chaussée (37°), angle saisi dans le remblai,
     45° dans le béton jusqu'au feuillet moyen de la dalle. */
  function diffusion(p, dim) {
    const g = p.geo;
    return dim + 2 * 0.75 * g.ech + 2 * Math.tan(p.sol.angleDiff * Math.PI / 180) * g.Hr + g.es;
  }

  function coefA(l) { return Math.max(2.3 + 360 / (l + 12), 4 - 0.002 * l); } // kN/m2, A(l) fascicule 61 titre II
  const TAB_BC = { 1: [1.2, 1.1, 0.95, 0.8, 0.7], 2: [1.0, 1.0], 3: [1.0, 0.8] };
  const TAB_A1 = { 1: [1, 1, 0.9, 0.75, 0.7], 2: [1, 0.9], 3: [0.9, 0.8] };
  const V0 = { 1: 3.5, 2: 3.0, 3: 2.75 };
  function val(tab, k) { return tab[Math.min(k, tab.length) - 1]; }

  function majorationDynamique(L, G, S) { return 1 + 0.4 / (1 + 0.2 * L) + 0.6 / (1 + 4 * G / S); }

  /* Retourne les « groupes » de charges routières : au plus une charge par groupe dans une combinaison. */
  function convoisRoutiers(p, geo) {
    const ch = p.charges, g = p.geo, cl = ch.classe;
    const nF = Math.max(1, Math.round(ch.nFiles));
    const Lr = ch.largeurRoulable;
    const G = (G_BETON * g.es + p.sol.gammaR * g.Hr + p.sol.gammaCh * g.ech) * geo.W * Lr;
    const details = [];
    function fenetre(essieux, L) { // somme maximale des charges d'essieux dans une fenêtre de longueur L
      let best = 0;
      essieux.forEach(function (e0) {
        let sum = 0; essieux.forEach(function (e) { if (e.x >= e0.x && e.x <= e0.x + L + 1e-9) sum += e.P; });
        best = Math.max(best, sum);
      });
      return best;
    }
    function delta(S) { return ch.deltaAuto ? majorationDynamique(geo.W, G, S) : ch.deltaManuel; }

    if (ch.reglement === 'LM1') {
      const Qi = [300, 200, 100], roues = [];
      for (let i = 0; i < Math.min(nF, 3); i++) {
        roues.push({ y: 3 * i + 0.5, P: ch.alphaQ * Qi[i] / 2 }, { y: 3 * i + 2.5, P: ch.alphaQ * Qi[i] / 2 });
      }
      const lin = intensiteLigne(roues, diffusion(p, 0.4));
      details.push({ nom: 'LM1 — tandem TS', lin: lin, a: diffusion(p, 0.4), b: diffusion(p, 0.4), delta: 1, coef: ch.alphaQ });
      details.push({ nom: 'LM1 — charge répartie UDL', q: ch.alphaq * 9, delta: 1, coef: ch.alphaq });
      return { details: details, groupes: [
        [{ nom: 'LM1 TS', type: 'civil', a: diffusion(p, 0.4), essieux: [{ x: 0, lin: lin }, { x: 1.2, lin: lin }] }],
        [{ nom: 'LM1 UDL', type: 'civil', uniforme: function () { return ch.alphaq * 9; } }]] };
    }

    const groupe = [];
    if (ch.A) {
      const a1 = val(TAB_A1[cl], nF), a2 = V0[cl] / (Lr / nF);
      details.push({ nom: 'A(l)', q: coefA(geo.W) * a1 * a2, delta: 1, coef: a1 * a2, note: 'a1 = ' + a1 + ' ; a2 = ' + fr(a2, 3) });
      groupe.push({ nom: 'A(l)', type: 'civil', uniforme: function (l) { return coefA(l) * a1 * a2; } });
    }
    if (ch.Bc) {
      const camion = [{ x: 0, P: 60 }, { x: 4.5, P: 120 }, { x: 6, P: 120 }, { x: 10.5, P: 60 }, { x: 15, P: 120 }, { x: 16.5, P: 120 }];
      const bp = diffusion(p, 0.25);
      let best = 0, kBest = 1;
      for (let k = 1; k <= nF; k++) {
        const roues = []; for (let f = 0; f < k; f++) roues.push({ y: 2.5 * f, P: 1 }, { y: 2.5 * f + 2, P: 1 });
        const v = val(TAB_BC[cl], k) * intensiteLigne(roues, bp);
        if (v > best) { best = v; kBest = k; }
      }
      const S = fenetre(camion, geo.W) * nF * val(TAB_BC[cl], nF), d = delta(S);
      details.push({ nom: 'Bc', lin: best * 60 * d, a: diffusion(p, 0.25), b: bp, delta: d, coef: val(TAB_BC[cl], kBest), S: S,
        note: kBest + ' file(s) déterminante(s), roue arrière 60 kN' });
      // charge par roue = moitié de l'essieu ; « best » est l'intensité pour une roue unitaire
      groupe.push({ nom: 'Bc', type: 'civil', a: diffusion(p, 0.25),
        essieux: camion.map(function (e) { return { x: e.x, lin: best * e.P / 2 * d }; }) });
    }
    if (ch.Bt && cl !== 3) {
      const bt = cl === 1 ? 1.0 : 0.9, k = Math.min(nF, 2), roues = [];
      for (let f = 0; f < k; f++) roues.push({ y: 3 * f, P: 80 }, { y: 3 * f + 2, P: 80 });
      const bp = diffusion(p, 0.6);
      const S = fenetre([{ x: 0, P: 160 }, { x: 1.35, P: 160 }], geo.W) * k * bt, d = delta(S);
      const lin = bt * d * intensiteLigne(roues, bp);
      details.push({ nom: 'Bt', lin: lin, a: diffusion(p, 0.25), b: bp, delta: d, coef: bt, S: S, note: 'roue 80 kN, 0,60 x 0,25 m' });
      groupe.push({ nom: 'Bt', type: 'civil', a: diffusion(p, 0.25), essieux: [{ x: 0, lin: lin }, { x: 1.35, lin: lin }] });
    }
    if (ch.Br) {
      const bp = diffusion(p, 0.6), d = delta(100), lin = d * 100 / bp;
      details.push({ nom: 'Br', lin: lin, a: diffusion(p, 0.3), b: bp, delta: d, coef: 1, S: 100, note: 'roue isolée 100 kN, 0,60 x 0,30 m' });
      groupe.push({ nom: 'Br', type: 'civil', a: diffusion(p, 0.3), essieux: [{ x: 0, lin: lin }] });
    }
    if (ch.Mc120) {
      const bp = diffusion(p, 1.0), a = diffusion(p, 6.1);
      const S = 1100 * Math.min(1, geo.W / 6.1), d = delta(S);
      const lin = d * intensiteLigne([{ y: 0, P: 550 }, { y: 3.3, P: 550 }], bp);
      details.push({ nom: 'Mc120', lin: lin, a: a, b: bp, delta: d, coef: 1, S: S, note: '2 chenilles de 550 kN, 6,10 x 1,00 m' });
      groupe.push({ nom: 'Mc120', type: 'militaire', a: a, essieux: [{ x: 0, lin: lin }] });
    }
    return { details: details, groupes: [groupe] };
  }

  /* Génère les cas de charge de la dalle supérieure pour un convoi */
  function casRoutiers(mod, convoi) {
    const geo = mod.geo, W = geo.W, liste = [];
    const dalles = mod.membres.filter(function (m) { return m.type === 'dalle'; });
    function appliquer(patches) { // patches : [{x1,x2,q}] charge verticale kN/m
      const cas = casVide(mod); let total = 0;
      dalles.forEach(function (m) {
        m.elems.forEach(function (ie) {
          const e = mod.elements[ie], xa = mod.noeuds[e.i].x, xb = mod.noeuds[e.j].x;
          patches.forEach(function (pt) {
            const rec = Math.min(xb, pt.x2) - Math.max(xa, pt.x1);
            if (rec > 0) { cas.qy[ie] -= pt.q * rec / (xb - xa); total += pt.q * rec; }
          });
        });
      });
      return total > 1e-9 ? cas : null;
    }
    if (convoi.uniforme) {
      for (let i = 0; i < geo.n; i++) for (let j = i; j < geo.n; j++) {
        const l = geo.xs[j + 1] - geo.xs[i];
        const cas = appliquer([{ x1: geo.xs[i], x2: geo.xs[j + 1], q: convoi.uniforme(l) }]);
        if (cas) liste.push({ nom: convoi.nom + ' travées ' + (i + 1) + '-' + (j + 1), type: convoi.type, cas: cas });
      }
      return liste;
    }
    const xmax = Math.max.apply(null, convoi.essieux.map(function (e) { return e.x; }));
    const pas = Math.max(0.1, Math.min(0.25, W / 40));
    [1, -1].forEach(function (sens) {
      if (sens === -1 && convoi.essieux.length === 1) return;
      for (let x0 = -xmax - convoi.a / 2; x0 <= W + convoi.a / 2 + 1e-9; x0 += pas) {
        const patches = convoi.essieux.map(function (e) {
          const xc = x0 + (sens === 1 ? e.x : xmax - e.x);
          return { x1: xc - convoi.a / 2, x2: xc + convoi.a / 2, q: e.lin / convoi.a };
        });
        const cas = appliquer(patches);
        if (cas) liste.push({ nom: convoi.nom + ' x0 = ' + fr(x0, 2) + ' m', type: convoi.type, cas: cas });
      }
    });
    return liste;
  }

  /* ------------------------------------------------------------------ */
  /* 6. Enveloppes                                                       */
  /* ------------------------------------------------------------------ */
  function resultatCas(mod, cas) {
    const r = mod.portique.calculerCas(cas);
    r.sol = Float64Array.from(mod.noeudsRadier.map(function (nd) { return -r.u[nd * 3 + 1] * mod.p.sol.ks; }));
    return r;
  }
  function somme(a, b) {
    const o = {}; ['M', 'V', 'N', 'sol'].forEach(function (k) { o[k] = a[k].map(function (v, i) { return v + b[k][i]; }); });
    return o;
  }
  /* groupes : [{ optionnel, options:[{f, r}] }] — produit cartésien, donc max de la somme = somme des max */
  function enveloppe(groupes) {
    const env = {};
    ['M', 'V', 'N', 'sol'].forEach(function (k) {
      const n = groupes[0].options[0].r[k].length;
      const mx = new Float64Array(n), mn = new Float64Array(n);
      groupes.forEach(function (gr) {
        if (!gr.options.length) return;
        for (let i = 0; i < n; i++) {
          let a = gr.optionnel ? 0 : -Infinity, b = gr.optionnel ? 0 : Infinity;
          for (let o = 0; o < gr.options.length; o++) {
            const v = gr.options[o].f * gr.options[o].r[k][i];
            if (v > a) a = v; if (v < b) b = v;
          }
          mx[i] += a; mn[i] += b;
        }
      });
      env[k] = { max: mx, min: mn };
    });
    return env;
  }

  /* ------------------------------------------------------------------ */
  /* 7. Béton armé : section rectangulaire b = 1 m en flexion simple     */
  /* ------------------------------------------------------------------ */
  function flexionELU(Mu, d, mat) { // Mu kN.m/m, d m -> As m2/m
    if (Mu <= 0) return { mu: 0, alpha: 0, z: d, As: 0, ok: true };
    const mu = Mu / (d * d * mat.fcu * 1000);
    if (mu > mat.muLim) return { mu: mu, alpha: NaN, z: NaN, As: NaN, ok: false };
    const alpha = 1.25 * (1 - Math.sqrt(1 - 2 * mu)), z = d * (1 - 0.4 * alpha);
    return { mu: mu, alpha: alpha, z: z, As: Mu / (z * mat.fsu * 1000), ok: true };
  }
  function contraintesELS(M, As, d, nEq) { // section fissurée, n = 15
    const n = nEq || 15;
    if (M <= 0 || As <= 0) return { x: 0, I: 0, sc: 0, ss: 0 };
    const x = n * As * (-1 + Math.sqrt(1 + 2 * d / (n * As)));
    const I = x * x * x / 3 + n * As * (d - x) * (d - x);
    return { x: x, I: I, sc: M * x / I / 1000, ss: n * M * (d - x) / I / 1000 };
  }
  function sectionELS(M, d, mat) { // section d'acier minimale respectant les contraintes limites
    if (M <= 0) return { As: 0, ok: true };
    const ok = function (As) { const c = contraintesELS(M, As, d); return c.ss <= mat.sigmaS && c.sc <= mat.sigmaC; };
    let lo = 1e-7, hi = 0.04 * d;
    if (!ok(hi)) return { As: NaN, ok: false };
    for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (ok(mid)) hi = mid; else lo = mid; }
    return { As: hi, ok: true };
  }
  function sectionMin(d, h, mat) {
    if (mat.norme === 'EC2') return Math.max(0.26 * mat.ft / mat.fe * d, 0.0013 * d);
    return 0.23 * d * mat.ft / mat.fe; // condition de non-fragilité BAEL A.4.2.1
  }
  /* Ouverture de fissure EN 1992-1-1 § 7.3.4, chargement de longue durée (kt = 0,4) */
  function ouvertureFissure(M, As, d, h, c, phi, esp, mat) {
    if (M <= 0 || As <= 0) return 0;
    const ct = contraintesELS(M, As, d), ae = ES / mat.E;
    const hcef = Math.min(2.5 * (h - d), (h - ct.x) / 3, h / 2), rho = As / hcef;
    const dEps = Math.max(ct.ss - 0.4 * mat.ft / rho * (1 + ae * rho), 0.6 * ct.ss) / ES;
    const sr = esp <= 5 * (c + phi / 2) ? 3.4 * c + 0.8 * 0.5 * 0.425 * phi / rho : 1.3 * (h - ct.x);
    return sr * dEps * 1000; // mm
  }
  const DIAMS = [10, 12, 14, 16, 20, 25];
  const ESPACEMENTS = [0.2, 0.15, 0.125, 0.1];
  function catalogueBarres() {
    const cat = [];
    DIAMS.forEach(function (phi) { ESPACEMENTS.forEach(function (e) { cat.push({ phi: phi, esp: e, As: Math.PI * phi * phi / 4 * 1e-6 / e }); }); });
    return cat.sort(function (a, b) { return a.As - b.As || b.esp - a.esp; });
  }
  function choisirBarres(AsReq, test) {
    const cat = catalogueBarres();
    for (let i = 0; i < cat.length; i++) if (cat[i].As >= AsReq - 1e-9 && (!test || test(cat[i]))) return cat[i];
    return null;
  }
  function texteBarres(b) { return b ? 'HA' + b.phi + ' e = ' + (b.esp * 100).toLocaleString('fr-FR') + ' cm' : '—'; }

  function dimensionnerNappe(p, mat, h, c, Melu, Mels, Mfreq) {
    const d = h - c - p.mat.phiEst / 2000;
    const elu = flexionELU(Melu, d, mat), els = sectionELS(Mels, d, mat), AsMin = sectionMin(d, h, mat);
    const alertes = [];
    if (!elu.ok) alertes.push('Moment réduit µ = ' + fr(elu.mu, 3) + ' > µ limite : augmenter l\'épaisseur.');
    if (!els.ok) alertes.push('Contraintes limites de service impossibles à respecter : augmenter l\'épaisseur.');
    const AsReq = Math.max(elu.ok ? elu.As : 0, els.ok ? els.As : 0, AsMin);
    let barres = null;
    if (elu.ok && els.ok) {
      barres = choisirBarres(AsReq, mat.norme === 'EC2' ? function (b) {
        return ouvertureFissure(Mfreq, b.As, d, h, c, b.phi / 1000, b.esp, mat) <= p.mat.wmax + 1e-9;
      } : null);
      if (!barres) alertes.push('Aucune disposition courante (HA10 à HA25, e ≥ 10 cm) ne convient : augmenter l\'épaisseur.');
    }
    const AsP = barres ? barres.As : 0, ct = contraintesELS(Mels, AsP, d);
    const wk = mat.norme === 'EC2' && barres ? ouvertureFissure(Mfreq, AsP, d, h, c, barres.phi / 1000, barres.esp, mat) : null;
    const ratioRep = mat.norme === 'EC2' ? 0.2 : 1 / 3; // EC2 § 9.3.1.1 ; BAEL A.8.2.41 (charges concentrées)
    const rep = choisirBarres(Math.max(ratioRep * AsP, 3.9e-4)); // plancher usuel HA10 e = 20 cm
    const gouverne = AsReq === AsMin ? 'section minimale' : (els.ok && AsReq === els.As ? 'ELS' : 'ELU');
    return { h: h, d: d, c: c, Melu: Melu, Mels: Mels, Mfreq: Mfreq, elu: elu, AsElu: elu.As, AsEls: els.As, AsMin: AsMin,
      AsReq: AsReq, gouverne: gouverne, barres: barres, AsP: AsP, sc: ct.sc, ss: ct.ss, wk: wk, rep: rep, alertes: alertes,
      ok: alertes.length === 0 };
  }

  function verifierTranchant(p, mat, h, Vu, AsTendu) {
    const d = h - Math.max(p.mat.enrobageExt, p.mat.enrobageInt) - p.mat.phiEst / 2000;
    if (mat.norme === 'EC2') {
      const k = Math.min(2, 1 + Math.sqrt(0.2 / d)), rho = Math.min(0.02, AsTendu / d);
      const v = Math.max(0.18 / 1.5 * k * Math.pow(100 * rho * mat.fc, 1 / 3), 0.035 * Math.pow(k, 1.5) * Math.sqrt(mat.fc));
      const VRd = v * d * 1000;
      return { d: d, Vu: Vu, tau: Vu / d / 1000, limite: v, VRd: VRd, ok: Vu <= VRd, texte: 'VRd,c' };
    }
    const tau = Vu / d / 1000, lim = 0.07 * mat.fc / 1.5; // BAEL A.5.2.2, dalle sans armature d'effort tranchant
    return { d: d, Vu: Vu, tau: tau, limite: lim, VRd: lim * d * 1000, ok: tau <= lim, texte: 'τu limite' };
  }

  /* ------------------------------------------------------------------ */
  /* 8. Hydraulique : écoulement à surface libre, Manning-Strickler      */
  /* ------------------------------------------------------------------ */
  function debitStrickler(K, L, y, pente) { // pente en m/m, par cellule
    if (y <= 0) return 0;
    const S = L * y, R = S / (L + 2 * y);
    return K * S * Math.pow(R, 2 / 3) * Math.sqrt(pente);
  }
  function hydraulique(p) {
    const h = p.hydro, g = p.geo, n = Math.max(1, Math.round(g.n)), I = h.pente / 100;
    const qCell = h.Q / n;
    const Qmax = n * debitStrickler(h.K, g.L, h.tauxMax * g.H, I);
    const Qplein = n * debitStrickler(h.K, g.L, g.H, I);
    let y = NaN;
    if (qCell <= debitStrickler(h.K, g.L, g.H, I)) {
      let lo = 0, hi = g.H;
      for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (debitStrickler(h.K, g.L, m, I) < qCell) lo = m; else hi = m; }
      y = hi;
    }
    const V = isNaN(y) ? NaN : qCell / (g.L * y);
    const yc = Math.pow(Math.pow(qCell / g.L, 2) / 9.81, 1 / 3);
    const alertes = [];
    if (isNaN(y)) alertes.push('Le débit de projet dépasse la capacité à surface libre : l\'ouvrage se met en charge. Augmenter l\'ouverture, la hauteur ou le nombre de cellules.');
    else {
      if (y / g.H > h.tauxMax + 1e-9) alertes.push('Taux de remplissage ' + fr((100 * y / g.H), 0) + ' % supérieur au maximum fixé (' + fr((100 * h.tauxMax), 0) + ' %).');
      if (V < h.vMin) alertes.push('Vitesse inférieure à ' + h.vMin + ' m/s : risque d\'ensablement et de dépôts.');
      if (V > h.vMax) alertes.push('Vitesse supérieure à ' + h.vMax + ' m/s : prévoir une protection contre l\'affouillement (enrochements, parafouille).');
    }
    return { y: y, V: V, taux: y / g.H, Qmax: Qmax, Qplein: Qplein, yc: yc, froude: isNaN(y) ? NaN : V / Math.sqrt(9.81 * y),
      revanche: g.H - y, Qrationnel: h.C * h.I * h.A / 3.6, ok: alertes.length === 0, alertes: alertes };
  }

  /* ------------------------------------------------------------------ */
  /* 9. Métré                                                            */
  /* ------------------------------------------------------------------ */
  function metre(p, geo, ferraillage) {
    const g = p.geo, Lg = g.longueur;
    const aire = geo.B * geo.Hext - geo.n * g.L * g.H + geo.n * 4 * g.gousset * g.gousset / 2;
    const beton = aire * Lg;
    const proprete = (geo.B + 0.2) * 0.1 * Lg;
    const coffrage = (2 * geo.Hext + geo.n * (2 * g.H + g.L)) * Lg;
    const dev = { dalle: geo.B, radier: geo.B, pied: 2 * geo.Hext, cloison: (geo.n - 1) * geo.Hext };
    let acier = 0;
    ferraillage.forEach(function (f) {
      const l = dev[f.membre] * (f.face === 'both' ? 2 : 1);
      acier += ((f.barres ? f.barres.As : 0) + (f.rep ? f.rep.As : 0)) * l * Lg * 7850;
    });
    acier *= 1 + p.metre.majorationAcier / 100;
    return { aire: aire, beton: beton, proprete: proprete, coffrage: coffrage, acier: acier, ratio: acier / beton,
      fouille: (geo.B + 1) * (geo.Hext + 0.1) * Lg };
  }

  /* Épaisseurs de départ : règle de l'assistant de StruBIM Box Culverts (manuel CYPE, § 3.2).
     Dalle et radier : 0,02 L² + 0,10 pour L ≤ 5 m, 0,50 m entre 5 et 7 m.
     Piédroits : 0,02 G² + 0,10 pour G ≤ 4,5 m, 0,50 m entre 4,5 et 7 m. Au-delà de 7 m : hors périmètre (null). */
  function predimensionner(L, G) {
    const dalle = L <= 5 ? 0.02 * L * L + 0.1 : (L < 7 ? 0.5 : null);
    const pied = G <= 4.5 ? 0.02 * G * G + 0.1 : (G < 7 ? 0.5 : null);
    return { dalle: dalle, radier: dalle, pied: pied };
  }

  /* ------------------------------------------------------------------ */
  /* 10. Calcul complet                                                  */
  /* ------------------------------------------------------------------ */
  const NAPPES = [
    { id: 'ds_inf', membre: 'dalle', face: 'int', nom: 'Dalle supérieure — nappe inférieure (travées)' },
    { id: 'ds_sup', membre: 'dalle', face: 'ext', nom: 'Dalle supérieure — nappe supérieure (angles et appuis)' },
    { id: 'rd_sup', membre: 'radier', face: 'int', nom: 'Radier — nappe supérieure (travées)' },
    { id: 'rd_inf', membre: 'radier', face: 'ext', nom: 'Radier — nappe inférieure (angles et appuis)' },
    { id: 'pd_int', membre: 'pied', face: 'int', nom: 'Piédroits — face intérieure' },
    { id: 'pd_ext', membre: 'pied', face: 'ext', nom: 'Piédroits — face extérieure (côté terre)' },
    { id: 'cl', membre: 'cloison', face: 'both', nom: 'Cloisons intermédiaires — chaque face' }];

  function controlerDonnees(p) {
    const e = [], g = p.geo;
    function pos(v, nom) { if (!(v > 0) || !isFinite(v)) e.push(nom + ' doit être strictement positif.'); }
    pos(g.L, 'L\'ouverture'); pos(g.H, 'La hauteur libre'); pos(g.es, 'L\'épaisseur de la dalle');
    pos(g.er, 'L\'épaisseur du radier'); pos(g.ep, 'L\'épaisseur des piédroits'); pos(g.longueur, 'La longueur de l\'ouvrage');
    pos(p.mat.fc, 'La résistance du béton'); pos(p.mat.fe, 'La limite élastique de l\'acier'); pos(p.sol.ks, 'Le module de réaction du sol');
    if (g.n > 1) pos(g.ec, 'L\'épaisseur des cloisons');
    if (g.n < 1 || g.n > 6) e.push('Le nombre de cellules doit être compris entre 1 et 6.');
    if (g.Hr < 0 || g.ech < 0) e.push('Les hauteurs de remblai et de chaussée ne peuvent pas être négatives.');
    [g.es, g.er, g.ep].forEach(function (h) {
      if (h - Math.max(p.mat.enrobageExt, p.mat.enrobageInt) - p.mat.phiEst / 2000 < 0.05) e.push('Épaisseur trop faible par rapport à l\'enrobage (hauteur utile < 5 cm).');
    });
    return e.filter(function (v, i) { return e.indexOf(v) === i; });
  }

  function calculer(p) {
    const erreurs = controlerDonnees(p);
    if (erreurs.length) return { ok: false, erreurs: erreurs };
    const mod = construireModele(p), geo = mod.geo, mat = mod.mat, c = p.coef;
    const perm = casPermanents(mod);
    const R = {};
    ['pp', 'rem', 'terre', 'latG', 'latD', 'eau', 'surf', 'fond'].forEach(function (k) { R[k] = resultatCas(mod, perm[k]); });
    const Gv = somme(R.pp, R.rem), lat2 = somme(R.latG, R.latD);
    const conv = convoisRoutiers(p, geo);
    let nbCas = 0;
    const groupesRoute = conv.groupes.map(function (gr) {
      const opts = [];
      gr.forEach(function (cv) {
        casRoutiers(mod, cv).forEach(function (cr) { opts.push({ type: cr.type, nom: cr.nom, r: resultatCas(mod, cr.cas) }); nbCas++; });
      });
      return opts;
    });
    // surcharge uniforme en surface : incompatible avec les autres charges de chaussée (même groupe)
    if (p.charges.surface && p.charges.qSurface > 0) groupesRoute[0].push({ type: 'civil', nom: 'Surcharge uniforme en surface', r: R.surf });
    function groupes(fG1, fG2, fRoute, fMc, fLat, fEau) {
      const gs = [
        { options: [{ f: fG1, r: Gv }, { f: fG2, r: Gv }] },
        { options: [{ f: fG1, r: R.terre }, { f: fG2, r: R.terre }] },
        { optionnel: true, options: [{ f: fLat, r: R.latG }, { f: fLat, r: R.latD }, { f: fLat, r: lat2 }] }];
      groupesRoute.forEach(function (opts) {
        gs.push({ optionnel: true, options: opts.map(function (o) { return { f: o.type === 'militaire' ? fMc : fRoute, r: o.r }; }) });
      });
      // eau intérieure et surcharge sur radier : incompatibles entre elles
      const bas = [];
      if (p.charges.eau) bas.push({ f: fEau, r: R.eau });
      if (p.charges.fond && p.charges.qFond > 0) bas.push({ f: fRoute, r: R.fond });
      if (bas.length) gs.push({ optionnel: true, options: bas });
      return gs;
    }
    const env = {
      elu: enveloppe(groupes(c.Gsup, c.Ginf, c.eluRoute, c.eluMc, c.eluLat, c.eluEau)),
      els: enveloppe(groupes(1, 1, c.elsRoute, c.elsMc, c.elsLat, c.elsEau)),
      freq: enveloppe(groupes(1, 1, c.psi1, c.psi1, c.psi1, c.psi1)),
      perm: enveloppe(groupes(1, 1, 0, 0, 0, 0).slice(0, 2))
    };
    // extrêmes par type de membre
    function extremes(e, type) {
      let mInt = 0, mExt = 0, v = 0, nMin = 0, nMax = 0;
      mod.membres.forEach(function (m) {
        if (m.type !== type) return;
        m.elems.forEach(function (ie) {
          for (let q = 0; q < 2; q++) {
            const i = 2 * ie + q;
            mInt = Math.max(mInt, e.M.max[i]); mExt = Math.max(mExt, -e.M.min[i]);
            v = Math.max(v, e.V.max[i], -e.V.min[i]);
            nMin = Math.min(nMin, e.N.min[i]); nMax = Math.max(nMax, e.N.max[i]);
          }
        });
      });
      return { int: mInt, ext: mExt, both: Math.max(mInt, mExt), V: v, Nmin: nMin, Nmax: nMax };
    }
    const epais = { dalle: p.geo.es, radier: p.geo.er, pied: p.geo.ep, cloison: p.geo.ec };
    const ferraillage = NAPPES.filter(function (nq) { return nq.membre !== 'cloison' || geo.n > 1; }).map(function (nq) {
      const d = dimensionnerNappe(p, mat, epais[nq.membre], nq.face === 'ext' ? p.mat.enrobageExt : p.mat.enrobageInt, extremes(env.elu, nq.membre)[nq.face],
        extremes(env.els, nq.membre)[nq.face], extremes(env.freq, nq.membre)[nq.face]);
      d.id = nq.id; d.membre = nq.membre; d.face = nq.face; d.nom = nq.nom;
      return d;
    });
    const tranchant = ['dalle', 'radier', 'pied', 'cloison'].filter(function (t) { return t !== 'cloison' || geo.n > 1; }).map(function (t) {
      const x = extremes(env.elu, t);
      const As = Math.min.apply(null, ferraillage.filter(function (f) { return f.membre === t; }).map(function (f) { return f.AsP; }));
      const r = verifierTranchant(p, mat, epais[t], x.V, As);
      r.membre = t; r.Nmin = x.Nmin; r.Nmax = x.Nmax;
      return r;
    });
    const solMax = Math.max.apply(null, env.els.sol.max), solMin = Math.min.apply(null, env.els.sol.min);
    const sol = { max: solMax, min: solMin, adm: p.sol.sigmaAdm, ok: solMax <= p.sol.sigmaAdm && solMin >= 0,
      moyennePerm: Array.from(env.perm.sol.max).reduce(function (a, b) { return a + b; }, 0) / env.perm.sol.max.length };
    const hyd = hydraulique(p);
    const met = metre(p, geo, ferraillage);
    const alertes = [];
    ferraillage.forEach(function (f) { f.alertes.forEach(function (a) { alertes.push(f.nom + ' : ' + a); }); });
    tranchant.forEach(function (t) { if (!t.ok) alertes.push('Effort tranchant (' + t.membre + ') : ' + fr(t.Vu, 1) + ' kN/m dépasse la résistance sans armature transversale (' + fr(t.VRd, 1) + ' kN/m). Augmenter l\'épaisseur ou prévoir des goussets et des armatures d\'effort tranchant.'); });
    if (solMax > p.sol.sigmaAdm) alertes.push('Contrainte sur le sol ' + fr(solMax, 0) + ' kPa supérieure à la contrainte admissible ' + p.sol.sigmaAdm + ' kPa.');
    if (solMin < 0) alertes.push('Décollement du radier détecté (pression négative) : le modèle élastique sans traction n\'est plus valable localement.');
    return { ok: true, version: VERSION, geo: geo, mat: mat, mod: mod, K: perm.K, qRem: perm.qRem, convois: conv.details, nbCas: nbCas,
      env: env, ferraillage: ferraillage, tranchant: tranchant, sol: sol, hydro: hyd, metre: met, alertes: alertes,
      conforme: alertes.length === 0 };
  }

  return { VERSION: VERSION, parametresDefaut: parametresDefaut, coefficientsDefaut: coefficientsDefaut, calculer: calculer, predimensionner: predimensionner,
    creerPortique: creerPortique, materiaux: materiaux, geometrie: geometrie, flexionELU: flexionELU, contraintesELS: contraintesELS,
    sectionELS: sectionELS, sectionMin: sectionMin, ouvertureFissure: ouvertureFissure, verifierTranchant: verifierTranchant,
    choisirBarres: choisirBarres, texteBarres: texteBarres, coefA: coefA, coefPoussee: coefPoussee, intensiteLigne: intensiteLigne,
    majorationDynamique: majorationDynamique, debitStrickler: debitStrickler, hydraulique: hydraulique, diffusion: diffusion,
    convoisRoutiers: convoisRoutiers };
});
