/*
 * PLANS ET FERRAILLAGE — Dalot Pro CI
 * Auteur : Moulo Jean Claude — Technicien génie civil BTP, Abidjan
 * Dossier d'exécution en 8 planches A3, sur le modèle des dossiers de dalots AGEROUTE
 * (coffrage, têtes, ferraillage du module, du tablier et du radier, nomenclatures, murs en aile, garde-corps) :
 *   - nomenclatures des aciers (positions, nombre par élément, façonnage coté, longueurs, masses, récapitulatifs) ;
 *   - dessins sous forme de primitives (lignes, polylignes, cercles, textes) indépendantes du rendu ;
 *   - rendus SVG (écran, impression) et DXF R12 (AutoCAD).
 * Aucune équation de résistance ici : seules des règles de façonnage et de dessin.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./moteur-dalot.cjs'));
  else root.DalotPlans = factory(root.DalotMoteur);
})(typeof self !== 'undefined' ? self : this, function (M) {
  'use strict';
  const BARRE_COMMERCIALE = 12; // m
  const A3 = { w: 420, h: 297 };
  const ECHELLES = [10, 20, 25, 30, 40, 50, 60, 75, 80, 100, 125, 150, 200, 250, 300, 500];
  const RAD = Math.PI / 180;

  function fr(v, d) { return Number(v).toFixed(d).replace('.', ','); }
  function cm(v) { return Math.ceil(v * 100 - 1e-6) / 100; }
  function cinq(v) { return Math.ceil(v * 20 - 1e-6) / 20; }
  function nbBarres(long, e) { return Math.floor((Math.max(0, long) + 1e-9) / e) + 1; }
  function masseLineique(phi) { return Math.PI * phi * phi / 4 * 1e-6 * 7850; }
  function c0(v) { return fr(v * 100, 0); } // m -> texte en cm
  function espTxt(e) { const v = e * 100; return fr(v, v % 1 ? 1 : 0); }
  function designation(p) { return 'Dalot ' + p.geo.n + 'x' + p.geo.L.toFixed(2) + 'x' + p.geo.H.toFixed(2) + ', L=' + fr(p.geo.longueur, p.geo.longueur % 1 ? 2 : 0) + 'm'; }

  /* ------------------------------------------------------------------ */
  /* 1. Nomenclatures                                                    */
  /* ------------------------------------------------------------------ */
  function Liste(R, debut) {
    const lignes = [];
    return {
      lignes: lignes,
      // o : { id, element, role, phi, esp (m ou null), nElem, nPar, forme, segments | segMin + segMax, principale, constructif }
      ajout: function (o) {
        if (!o.phi || !(o.nElem * o.nPar > 0)) return null;
        const lr = M.ancrage(o.phi, R.mat).lr;
        function longueur(segs) {
          let L = segs.map(cm).reduce(function (a, b) { return a + b; }, 0), n = 0;
          if (L > BARRE_COMMERCIALE) { n = Math.ceil((L - BARRE_COMMERCIALE) / (BARRE_COMMERCIALE - lr)); L = cm(L + n * lr); }
          return { L: L, n: n };
        }
        let Lu, nrec, segs = o.segments, varie = false;
        if (o.segMin) {
          const a = longueur(o.segMin), b = longueur(o.segMax);
          Lu = cm((a.L + b.L) / 2); nrec = Math.max(a.n, b.n); segs = o.segMax; varie = true;
        } else { const a = longueur(o.segments); Lu = a.L; nrec = a.n; }
        const nbre = o.nElem * o.nPar, kgm = masseLineique(o.phi);
        const l = { pos: (debut || 1) + lignes.length, id: o.id, element: o.element, role: o.role, phi: o.phi, esp: o.esp || null,
          nElem: o.nElem, nPar: o.nPar, nbre: nbre, forme: o.forme, segments: segs.map(cm), segMin: o.segMin ? o.segMin.map(cm) : null,
          varie: varie, Lunit: Lu, recouvrements: nrec, Ltot: Lu * nbre, kgm: kgm, masse: Lu * nbre * kgm,
          principale: !!o.principale, constructif: !!o.constructif };
        lignes.push(l);
        return l;
      }
    };
  }
  function recapitulatif(lignes, beton, majoration) {
    const parPhi = {};
    lignes.forEach(function (l) {
      const r = parPhi[l.phi] || (parPhi[l.phi] = { phi: l.phi, Ltot: 0, masse: 0, kgm: l.kgm });
      r.Ltot += l.Ltot; r.masse += l.masse;
    });
    const recap = Object.keys(parPhi).map(Number).sort(function (a, b) { return a - b; }).map(function (k) { return parPhi[k]; });
    const masse = lignes.reduce(function (a, l) { return a + l.masse; }, 0), chutes = masse * majoration / 100;
    return { recap: recap, masse: masse, chutes: chutes, total: masse + chutes, beton: beton, ratio: beton > 0 ? (masse + chutes) / beton : 0 };
  }

  function nomenclature(p, R) {
    const g = p.geo, geo = R.geo, B = geo.B, He = geo.Hext, H = g.H, n = geo.n;
    const cE = p.mat.enrobageExt, cI = p.mat.enrobageInt, Lg = g.longueur;
    const F = function (id) { return R.ferraillage.find(function (f) { return f.id === id; }); };
    const L = Liste(R, 1);
    const nL = function (e) { return nbBarres(Lg - 2 * cE, e); };
    const ds = F('ds_sup'), di = F('ds_inf'), ru = F('rd_inf'), rs = F('rd_sup'), pe = F('pd_ext'), pi = F('pd_int'), cl = F('cl');
    const lr = function (f) { return f && f.barres ? M.ancrage(f.barres.phi, R.mat).lr : 0; };
    function princ(f, o) { if (f && f.barres) L.ajout(Object.assign({ phi: f.barres.phi, esp: f.barres.esp, principale: true }, o)); }
    princ(ds, { id: 'ds_sup', element: 'Dalle supérieure', role: 'nappe supérieure, chapeaux d\'angle en U', nElem: 1, nPar: ds && ds.barres ? nL(ds.barres.esp) : 0, forme: 'U-bas',
      segments: [cinq(Math.max(lr(ds), g.es)), B - 2 * cE, cinq(Math.max(lr(ds), g.es))] });
    princ(di, { id: 'ds_inf', element: 'Dalle supérieure', role: 'nappe inférieure, barres filantes', nElem: 1, nPar: di && di.barres ? nL(di.barres.esp) : 0, forme: 'droit', segments: [B - 2 * cE] });
    princ(ru, { id: 'rd_inf', element: 'Radier', role: 'nappe inférieure, chapeaux d\'angle en U', nElem: 1, nPar: ru && ru.barres ? nL(ru.barres.esp) : 0, forme: 'U-haut',
      segments: [cinq(Math.max(lr(ru), g.er)), B - 2 * cE, cinq(Math.max(lr(ru), g.er))] });
    princ(rs, { id: 'rd_sup', element: 'Radier', role: 'nappe supérieure, barres filantes', nElem: 1, nPar: rs && rs.barres ? nL(rs.barres.esp) : 0, forme: 'droit', segments: [B - 2 * cE] });
    princ(pe, { id: 'pd_ext', element: 'Piédroits', role: 'face extérieure, côté terre', nElem: 2, nPar: pe && pe.barres ? nL(pe.barres.esp) : 0, forme: 'vertical', segments: [He - 2 * cE] });
    princ(pi, { id: 'pd_int', element: 'Piédroits', role: 'face intérieure, côté eau', nElem: 2, nPar: pi && pi.barres ? nL(pi.barres.esp) : 0, forme: 'vertical', segments: [He - 2 * cE] });
    if (n > 1) princ(cl, { id: 'cl', element: 'Cloisons', role: 'deux faces', nElem: 2 * (n - 1), nPar: cl && cl.barres ? nL(cl.barres.esp) : 0, forme: 'vertical', segments: [He - 2 * cE] });
    if (g.gousset > 0) {
      const phiG = Math.max(10, pi && pi.barres ? pi.barres.phi : 10), ls = M.ancrage(phiG, R.mat).ls;
      L.ajout({ id: 'gousset', element: 'Goussets', role: 'barres pliées', principale: true, phi: phiG, esp: 0.2, nElem: 4 * n, nPar: nL(0.2), forme: 'gousset',
        segments: [cinq(ls), g.gousset * Math.SQRT2 + 2 * cI, cinq(ls)] });
    }
    const longRep = Lg - 2 * cE;
    function rep(id, f, element, role, largeur, nElem) {
      if (!f || !f.rep) return;
      L.ajout({ id: id, element: element, role: role, phi: f.rep.phi, esp: f.rep.esp, nElem: nElem, nPar: nbBarres(largeur, f.rep.esp), forme: 'longitudinal', segments: [longRep] });
    }
    rep('rep_ds_sup', ds, 'Dalle supérieure', 'répartition, nappe supérieure', B - 2 * cE, 1);
    rep('rep_ds_inf', di, 'Dalle supérieure', 'répartition, nappe inférieure', B - 2 * cE, 1);
    rep('rep_rd_inf', ru, 'Radier', 'répartition, nappe inférieure', B - 2 * cE, 1);
    rep('rep_rd_sup', rs, 'Radier', 'répartition, nappe supérieure', B - 2 * cE, 1);
    rep('rep_pd_ext', pe, 'Piédroits', 'répartition, face extérieure', H, 2);
    rep('rep_pd_int', pi, 'Piédroits', 'répartition, face intérieure', H, 2);
    if (n > 1) rep('rep_cl', cl, 'Cloisons', 'répartition, deux faces', H, 2 * (n - 1));
    // aciers constructifs : chaises de maintien des nappes supérieures, épingles des voiles (3 par m², pratique courante)
    const hc = function (e) { return Math.max(0.05, e - 2 * cE - 0.03); };
    L.ajout({ id: 'chaise', element: 'Dalle et radier', role: 'chaises de maintien des nappes, 3 par m²', constructif: true, phi: 8, esp: null,
      nElem: 2, nPar: Math.ceil(3 * B * Lg), forme: 'chaise', segments: [0.25, hc(Math.min(g.es, g.er)), 0.25, hc(Math.min(g.es, g.er)), 0.25] });
    L.ajout({ id: 'epingle', element: 'Piédroits et cloisons', role: 'épingles, 3 par m²', constructif: true, phi: 8, esp: null,
      nElem: n + 1, nPar: Math.ceil(3 * H * Lg), forme: 'epingle', segments: [0.06, Math.max(g.ep, g.ec || g.ep) - 2 * cE, 0.06] });
    return Object.assign({ lignes: L.lignes }, recapitulatif(L.lignes, R.metre.beton, p.metre.majorationAcier));
  }

  /* Têtes : murs en aile, radier de tête et bêche, ou semelles */
  function nomenclatureTetes(p, R, T, debut) {
    if (!T) return null;
    const t = p.tetes, G = T.G, c = p.mat.enrobageExt, L = Liste(R, debut), nA = G.nAiles;
    const ls = function (phi) { return M.ancrage(phi, R.mat).ls; };
    const lgH = function (z) { // longueur d'aile où la hauteur dépasse z
      if (z >= G.H0) return 0;
      if (z <= t.hFin) return G.La;
      return Math.min(G.La, t.plat + (G.H0 - z) / (G.H0 - t.hFin) * (G.La - t.plat));
    };
    if (t.type === 'radier') {
      const v = T.troncons[0].voile, rd = T.radier, eR = t.eRadier;
      const ancr = function (phi) { return cinq(Math.max(0.15, ls(phi) - (eR - 2 * c))); };
      const vert = function (b, face) {
        if (!b) return;
        L.ajout({ id: 'aile_v_' + face, element: 'Murs en aile', role: 'verticales ' + (face === 'ext' ? 'côté terre' : 'côté eau') + ', ancrées dans le radier de tête',
          phi: b.phi, esp: b.esp, nElem: nA, nPar: nbBarres(G.La - c, b.esp), forme: 'L', principale: true,
          segMin: [t.hFin + eR - 2 * c, ancr(b.phi)], segMax: [G.H0 + eR - 2 * c, ancr(b.phi)] });
      };
      vert(v.continu.barres, 'ext'); vert(v.avant.barres, 'int');
      if (v.horiz) ['ext', 'int'].forEach(function (face) {
        const nh = nbBarres(G.H0 - c, v.horiz.esp), zs = [];
        for (let i = 0; i < nh; i++) zs.push(c + i * v.horiz.esp);
        const longs = zs.map(lgH).filter(function (x) { return x > 0.1; });
        L.ajout({ id: 'aile_h_' + face, element: 'Murs en aile', role: 'horizontales ' + (face === 'ext' ? 'côté terre' : 'côté eau') + ', retour de 15 cm dans le piédroit',
          phi: v.horiz.phi, esp: v.horiz.esp, nElem: nA, nPar: longs.length, forme: 'crosse',
          segMin: [0.15, Math.min.apply(null, longs) - c], segMax: [0.15, Math.max.apply(null, longs) - c] });
      });
      const larg0 = rd.largeurDebut - 2 * c, larg1 = rd.largeurFin - 2 * c;
      [['inf', rd.inf.barres], ['sup', rd.sup.barres]].forEach(function (q) {
        if (!q[1]) return;
        L.ajout({ id: 'rt_t_' + q[0], element: 'Radier de tête', role: 'transversales, nappe ' + (q[0] === 'inf' ? 'inférieure' : 'supérieure'),
          phi: q[1].phi, esp: q[1].esp, nElem: 2, nPar: nbBarres(rd.Lr - 2 * c, q[1].esp), forme: 'crosse2', principale: true,
          segMin: [0.15, larg0, 0.15], segMax: [0.15, larg1, 0.15] });
      });
      if (rd.longi) L.ajout({ id: 'rt_l', element: 'Radier de tête', role: 'longitudinales, deux nappes, ancrées dans le radier du module',
        phi: rd.longi.phi, esp: rd.longi.esp, nElem: 2 * 2, nPar: nbBarres((larg0 + larg1) / 2, rd.longi.esp), forme: 'droit',
        segments: [rd.Lr - c + cinq(ls(rd.longi.phi))] });
      // bêche : cadres et filantes
      const bl = t.becheLarg, bp = t.becheProf;
      L.ajout({ id: 'beche_c', element: 'Bêches', role: 'cadres', phi: 10, esp: 0.20, nElem: 2, nPar: nbBarres(larg1, 0.20), forme: 'cadre',
        segments: [bl - 2 * c, bp - 2 * c, bl - 2 * c, bp - 2 * c, 0.10], constructif: true });
      L.ajout({ id: 'beche_f', element: 'Bêches', role: 'filantes d\'angle', phi: 10, esp: null, nElem: 2, nPar: 4, forme: 'droit', segments: [larg1], constructif: true });
    } else {
      T.troncons.forEach(function (o) {
        const tr = o.tr, v = o.voile, s = o.semelle, es = t.eSemelle, nom = 'Mur en aile, tronçon ' + tr.i;
        const ancr = function (phi) { return cinq(Math.max(0.15, ls(phi) - (es - 2 * c))); };
        const vert = function (b, role, h) {
          if (!b) return;
          L.ajout({ id: 't' + tr.i + '_' + role, element: nom, role: role, phi: b.phi, esp: b.esp, nElem: nA, nPar: nbBarres(tr.L - c, b.esp), forme: 'L', principale: true,
            segMin: [Math.min(h, tr.Hfin) + es - 2 * c, ancr(b.phi)], segMax: [h + es - 2 * c, ancr(b.phi)] });
        };
        vert(v.continu.barres, 'verticales arrière (côté terre)', tr.H);
        if (v.renfort) L.ajout({ id: 't' + tr.i + '_renfort', element: nom, role: 'renforts verticaux arrière, h = ' + fr(v.renfort.h, 2) + ' m',
          phi: v.renfort.barres.phi, esp: v.renfort.barres.esp, nElem: nA, nPar: nbBarres(tr.L - c, v.renfort.barres.esp), forme: 'L', principale: true,
          segments: [v.renfort.h + es - 2 * c, ancr(v.renfort.barres.phi)] });
        vert(v.avant.barres, 'verticales avant', tr.H);
        if (v.horiz) L.ajout({ id: 't' + tr.i + '_h', element: nom, role: 'horizontales, deux faces', phi: v.horiz.phi, esp: v.horiz.esp, nElem: 2 * nA,
          nPar: nbBarres(tr.H - c, v.horiz.esp), forme: 'droit', segments: [tr.L + cinq(M.ancrage(v.horiz.phi, R.mat).lr)] });
        const B = s.stab.B;
        if (s.inf.barres) L.ajout({ id: 't' + tr.i + '_si', element: nom, role: 'semelle, transversales inférieures', phi: s.inf.barres.phi, esp: s.inf.barres.esp,
          nElem: nA, nPar: nbBarres(tr.L - 2 * c, s.inf.barres.esp), forme: 'crosse2', principale: true, segments: [cinq(12 * s.inf.barres.phi / 1000), B - 2 * c, cinq(12 * s.inf.barres.phi / 1000)] });
        if (s.sup.barres) L.ajout({ id: 't' + tr.i + '_ss', element: nom, role: 'semelle, transversales supérieures', phi: s.sup.barres.phi, esp: s.sup.barres.esp,
          nElem: nA, nPar: nbBarres(tr.L - 2 * c, s.sup.barres.esp), forme: 'crosse2', principale: true, segments: [cinq(12 * s.sup.barres.phi / 1000), B - 2 * c, cinq(12 * s.sup.barres.phi / 1000)] });
        if (s.longi) L.ajout({ id: 't' + tr.i + '_sl', element: nom, role: 'semelle, longitudinales, deux nappes', phi: s.longi.phi, esp: s.longi.esp,
          nElem: 2 * nA, nPar: nbBarres(B - 2 * c, s.longi.esp), forme: 'droit', segments: [tr.L + cinq(M.ancrage(s.longi.phi, R.mat).lr)] });
      });
    }
    return Object.assign({ lignes: L.lignes }, recapitulatif(L.lignes, T.beton, p.metre.majorationAcier));
  }

  /* Garde-corps en béton armé : ferraillage constructif */
  function nomenclatureGC(p, R, T) {
    if (!T || !T.gc) return null;
    const gc = p.tetes.gc, Gc = T.gc, c = 0.025, L = Liste(R, 1), B = Gc.longueur, nG = Gc.nombre;
    const nP = Gc.poteaux.filter(function (x) { return x.b >= gc.poteau - 1e-9; }).length, nI = Gc.poteaux.length - nP;
    L.ajout({ id: 'gc_l', element: 'Longrine (poutre de tête)', role: '4 filantes', phi: 12, nElem: nG, nPar: 4, forme: 'droit', segments: [B - 2 * c], constructif: true });
    L.ajout({ id: 'gc_lc', element: 'Longrine (poutre de tête)', role: 'cadres', phi: 8, esp: 0.20, nElem: nG, nPar: nbBarres(B - 2 * c, 0.20), forme: 'cadre',
      segments: [gc.epaisseur - 2 * c, gc.longrine + 0.10 - 2 * c, gc.epaisseur - 2 * c, gc.longrine + 0.10 - 2 * c, 0.08], constructif: true });
    L.ajout({ id: 'gc_s', element: 'Lisse haute', role: '4 filantes', phi: 8, nElem: nG, nPar: 4, forme: 'droit', segments: [B - 2 * c], constructif: true });
    L.ajout({ id: 'gc_sc', element: 'Lisse haute', role: 'cadres', phi: 6, esp: 0.15, nElem: nG, nPar: nbBarres(B - 2 * c, 0.15), forme: 'cadre',
      segments: [gc.epaisseur - 2 * c, gc.lisse - 2 * c, gc.epaisseur - 2 * c, gc.lisse - 2 * c, 0.06], constructif: true });
    const hp = gc.longrine + gc.vide + gc.lisse - c + 0.20; // ancrage de 20 cm dans le tablier
    L.ajout({ id: 'gc_p', element: 'Poteaux principaux', role: '4 barres, crosse en tête', phi: 8, nElem: nG * nP, nPar: 4, forme: 'L-haut', segments: [hp, 0.20], constructif: true });
    if (nI) L.ajout({ id: 'gc_pi', element: 'Poteaux intermédiaires', role: '4 barres, crosse en tête', phi: 8, nElem: nG * nI, nPar: 4, forme: 'L-haut', segments: [hp, 0.14], constructif: true });
    L.ajout({ id: 'gc_pc', element: 'Poteaux', role: 'cadres', phi: 6, esp: 0.15, nElem: nG * Gc.poteaux.length, nPar: nbBarres(gc.vide, 0.15), forme: 'cadre',
      segments: [gc.poteau - 2 * c, gc.epaisseur - 2 * c, gc.poteau - 2 * c, gc.epaisseur - 2 * c, 0.06], constructif: true });
    return Object.assign({ lignes: L.lignes }, recapitulatif(L.lignes, T.betonGC, p.metre.majorationAcier));
  }
  function repere(l) { return 'P' + l.pos + '. Ø' + l.phi + (l.esp ? '/ e=' + espTxt(l.esp) + 'cm' : ''); }

  /* ------------------------------------------------------------------ */
  /* 2. Primitives graphiques (dessin en m ; texte et décalages en mm papier) */
  /* ------------------------------------------------------------------ */
  function Dessin(k) {
    const P = [];
    const d = {
      k: k, prims: P,
      ligne: function (x1, y1, x2, y2, c) { P.push({ t: 'l', x1: x1, y1: y1, x2: x2, y2: y2, c: c }); },
      poly: function (pts, c, ferme) { P.push({ t: 'p', pts: pts, c: c, ferme: !!ferme }); },
      rond: function (x, y, rMm, c, plein) { P.push({ t: 'c', x: x, y: y, r: rMm * k, c: c, plein: !!plein }); },
      texte: function (x, y, s, hMm, o) {
        o = o || {};
        P.push({ t: 't', x: x, y: y, s: String(s), h: hMm * k, a: o.a || 'g', rot: o.rot || 0, c: o.c || 'TEXTE', gras: !!o.gras });
      },
      cote: function (x1, y1, x2, y2, decMm, s) {
        const dec = decMm * k, t = 1.0 * k, vert = Math.abs(x2 - x1) < 1e-9;
        if (Math.abs(vert ? y2 - y1 : x2 - x1) < 1e-6) return;
        if (vert) {
          const x = x1 + dec, sg = Math.sign(dec) || 1;
          d.ligne(x1 + sg * 0.8 * k, y1, x + sg * 1.2 * k, y1, 'COTES'); d.ligne(x2 + sg * 0.8 * k, y2, x + sg * 1.2 * k, y2, 'COTES');
          d.ligne(x, y1, x, y2, 'COTES');
          d.ligne(x - t, y1 - t, x + t, y1 + t, 'COTES'); d.ligne(x - t, y2 - t, x + t, y2 + t, 'COTES');
          d.texte(x - 0.8 * k, (y1 + y2) / 2, s, 2.0, { a: 'm', rot: 90, c: 'COTES' });
        } else {
          const y = y1 + dec, sg = Math.sign(dec) || 1;
          d.ligne(x1, y1 + sg * 0.8 * k, x1, y + sg * 1.2 * k, 'COTES'); d.ligne(x2, y2 + sg * 0.8 * k, x2, y + sg * 1.2 * k, 'COTES');
          d.ligne(x1, y, x2, y, 'COTES');
          d.ligne(x1 - t, y - t, x1 + t, y + t, 'COTES'); d.ligne(x2 - t, y - t, x2 + t, y + t, 'COTES');
          d.texte((x1 + x2) / 2, y + 0.8 * k, s, 2.0, { a: 'm', c: 'COTES' });
        }
      },
      // chaîne de cotes horizontale ou verticale (liste de positions)
      chaine: function (pos, fixe, decMm, vert) {
        for (let i = 0; i < pos.length - 1; i++) {
          if (vert) d.cote(fixe, pos[i], fixe, pos[i + 1], decMm, c0(pos[i + 1] - pos[i]));
          else d.cote(pos[i], fixe, pos[i + 1], fixe, decMm, c0(pos[i + 1] - pos[i]));
        }
      },
      rappel: function (xa, ya, xt, yt, s, cote, calque) {
        d.rond(xa, ya, 0.5, 'ACIER', true);
        const larg = s.length * 2.3 * 0.55 * k, xFin = cote === 'd' ? xt + larg : xt - larg;
        d.ligne(xa, ya, xt, yt, 'RAPPEL'); d.ligne(xt, yt, xFin, yt, 'RAPPEL');
        d.texte(cote === 'd' ? xt + 0.4 * k : xFin + 0.4 * k, yt + 0.7 * k, s, 2.3, { c: calque || 'TEXTE_ACIER' });
      },
      etiquette: function (xa, ya, xt, yt, s, cote) { // rappel de nomenclature de coffrage (texte noir souligné)
        const larg = s.length * 2.4 * 0.55 * k, xFin = cote === 'd' ? xt + larg : xt - larg;
        d.rond(xa, ya, 0.45, 'REPERE', true);
        d.ligne(xa, ya, xt, yt, 'REPERE'); d.ligne(xt, yt, xFin, yt, 'REPERE');
        d.texte(cote === 'd' ? xt + 0.4 * k : xFin + 0.4 * k, yt + 0.7 * k, s, 2.4, { c: 'TEXTE' });
      },
      bulle: function (x, y, s) { d.rond(x, y, 2.6, 'TEXTE', false); d.rond(x, y, 2.2, 'TEXTE', false); d.texte(x, y - 0.9 * k, s, 2.4, { a: 'm', gras: true }); },
      // hachures à 45° dans un polygone convexe, pas en mm papier
      hachure: function (pts, pasMm, c) {
        const pas = pasMm * k;
        let lo = Infinity, hi = -Infinity;
        pts.forEach(function (q) { lo = Math.min(lo, q[1] - q[0]); hi = Math.max(hi, q[1] - q[0]); });
        for (let cc = lo + pas / 2; cc < hi; cc += pas) { // droites y = x + cc
          const xs = [];
          for (let i = 0; i < pts.length; i++) {
            const a = pts[i], b = pts[(i + 1) % pts.length];
            const fa = a[1] - a[0] - cc, fb = b[1] - b[0] - cc;
            if ((fa <= 0 && fb > 0) || (fa > 0 && fb <= 0)) { const tt = fa / (fa - fb); xs.push(a[0] + (b[0] - a[0]) * tt); }
          }
          if (xs.length >= 2) { xs.sort(function (u, v) { return u - v; }); d.ligne(xs[0], xs[0] + cc, xs[xs.length - 1], xs[xs.length - 1] + cc, c || 'HACHURE'); }
        }
      }
    };
    d.proprete = function (x1, x2, y) { // béton de propreté de 10 cm sous le niveau y
      d.poly([[x1, y], [x2, y], [x2, y - 0.10], [x1, y - 0.10]], 'PROPRETE', true);
      for (let x = x1 + 0.08; x < x2; x += 0.22) d.ligne(x, y - 0.02, x + 0.05, y - 0.08, 'PROPRETE');
    };
    return d;
  }
  function etendue(prims) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    function pt(x, y) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    prims.forEach(function (q) {
      if (q.t === 'l') { pt(q.x1, q.y1); pt(q.x2, q.y2); }
      else if (q.t === 'p') q.pts.forEach(function (v) { pt(v[0], v[1]); });
      else if (q.t === 'c') { pt(q.x - q.r, q.y - q.r); pt(q.x + q.r, q.y + q.r); }
      else if (q.t === 't') {
        const L = q.s.length * q.h * 0.56, dx = q.a === 'm' ? L / 2 : (q.a === 'd' ? L : 0);
        if (q.rot === 90) { pt(q.x - q.h, q.y - dx); pt(q.x + 0.3 * q.h, q.y - dx + L); }
        else if (q.rot) { const ca = Math.cos(q.rot * RAD), sa = Math.sin(q.rot * RAD); pt(q.x - dx * ca, q.y - dx * sa); pt(q.x + (L - dx) * ca - q.h * sa, q.y + (L - dx) * sa + q.h * ca); }
        else { pt(q.x - dx, q.y - 0.3 * q.h); pt(q.x - dx + L, q.y + q.h); }
      }
    });
    return { x0: x0, y0: y0, x1: x1, y1: y1, w: x1 - x0, h: y1 - y0 };
  }

  /* ------------------------------------------------------------------ */
  /* 3. Géométrie commune                                                */
  /* ------------------------------------------------------------------ */
  function cellules(p, geo) {
    const g = p.geo, out = [];
    let x = g.ep;
    for (let i = 0; i < geo.n; i++) { out.push({ x1: x, x2: x + g.L, y1: g.er, y2: g.er + g.H }); x += g.L + (i < geo.n - 1 ? g.ec : g.ep); }
    return out;
  }
  function polyCellule(c, k) {
    return k > 0 ? [[c.x1 + k, c.y1], [c.x2 - k, c.y1], [c.x2, c.y1 + k], [c.x2, c.y2 - k], [c.x2 - k, c.y2], [c.x1 + k, c.y2], [c.x1, c.y2 - k], [c.x1, c.y1 + k]]
      : [[c.x1, c.y1], [c.x2, c.y1], [c.x2, c.y2], [c.x1, c.y2]];
  }
  /* Ailes en plan : x selon l'axe de l'ouvrage (0 = extrémité amont des têtes), y transversal (0 à B) */
  function ailesPlan(p, R, T) {
    const g = p.geo, B = R.geo.B, G = T.G, Lr = G.La * G.cosA, ew = G.ep, out = [];
    const xm0 = Lr, xm1 = Lr + g.longueur;
    [-1, 1].forEach(function (e) {
      [-1, 1].forEach(function (s) {
        const x0 = e < 0 ? xm0 : xm1, y0 = s < 0 ? g.ep : B - g.ep;
        const u = [e * G.cosA, s * G.sinA];
        // normale vers les terres : perpendiculaire à u, composante transversale du signe de s
        let nx = -u[1], ny = u[0]; if (ny * s < 0) { nx = -nx; ny = -ny; }
        const P0 = [x0, y0], P1 = [x0 + u[0] * G.La, y0 + u[1] * G.La];
        out.push({ e: e, s: s, P0: P0, P1: P1, P2: [P1[0] + nx * ew, P1[1] + ny * ew], P3: [P0[0] + nx * ew, P0[1] + ny * ew], u: u, n: [nx, ny],
          nom: (e < 0 ? 'Aile d\'entrée ' : 'Aile de sortie ') + (s > 0 ? 'gauche' : 'droite') });
      });
    });
    return { ailes: out, Lr: Lr, xm0: xm0, xm1: xm1, L: Lg(p) + 2 * Lr };
  }
  function Lg(p) { return p.geo.longueur; }

  /* ------------------------------------------------------------------ */
  /* 4. Dessins de coffrage                                              */
  /* ------------------------------------------------------------------ */
  function dessinVueEnPlan(p, R, T, k) {
    const d = Dessin(k), g = p.geo, B = R.geo.B, cel = cellules(p, R.geo), t = p.tetes;
    const A = T ? ailesPlan(p, R, T) : { ailes: [], Lr: 0, xm0: 0, xm1: g.longueur, L: g.longueur };
    const xm0 = A.xm0, xm1 = A.xm1;
    // module
    d.poly([[xm0, 0], [xm1, 0], [xm1, B], [xm0, B]], 'COFFRAGE', true);
    d.ligne(xm0, g.ep, xm1, g.ep, 'CACHE'); d.ligne(xm0, B - g.ep, xm1, B - g.ep, 'CACHE');
    for (let i = 1; i < cel.length; i++) { d.ligne(xm0, cel[i - 1].x2, xm1, cel[i - 1].x2, 'CACHE'); d.ligne(xm0, cel[i].x1, xm1, cel[i].x1, 'CACHE'); }
    if (t && t.gc && t.gc.actif) { const w = t.gc.epaisseur; d.ligne(xm0 + w, 0, xm0 + w, B, 'COFFRAGE'); d.ligne(xm1 - w, 0, xm1 - w, B, 'COFFRAGE'); }
    cel.forEach(function (c) { d.bulle((xm0 + xm1) / 2 - 0.12 * g.longueur, (c.x1 + c.x2) / 2, c0(g.es)); });
    if (T) {
      A.ailes.forEach(function (a) {
        d.poly([a.P0, a.P1, a.P2, a.P3], 'COFFRAGE', true);
        // repère de l'aile
        const m = [(a.P0[0] + a.P1[0]) / 2 + a.n[0] * 0.6, (a.P0[1] + a.P1[1]) / 2 + a.n[1] * 0.6];
        d.etiquette((a.P0[0] + a.P1[0]) / 2, (a.P0[1] + a.P1[1]) / 2, m[0] - a.e * 1.5 * k, m[1] + a.s * 10 * k, a.nom, a.e < 0 ? 'd' : 'g');
      });
      if (t.type === 'radier') [-1, 1].forEach(function (e) {
        const ex = A.ailes.filter(function (a) { return a.e === e; });
        const xe = ex[0].P2[0], yb = Math.min(ex[0].P2[1], ex[1].P2[1]), yh = Math.max(ex[0].P2[1], ex[1].P2[1]);
        d.ligne(xe, yb, xe, yh, 'COFFRAGE'); // bord du radier de tête
        const xb = xe - e * t.becheLarg;
        d.ligne(xb, yb + 0.05, xb, yh - 0.05, 'CACHE');
        d.texte(xe - e * 4 * k, (yb + yh) / 2, 'Radier de tête ' + c0(t.eRadier) + ' cm', 2.2, { a: 'm', rot: 90 });
        d.etiquette(xe, yh - 0.3, xe + e * 6 * k, yh + 4 * k, 'Bêche', e < 0 ? 'g' : 'd');
        d.bulle(xe - e * (A.Lr * 0.55), (yb + yh) / 2, c0(t.eRadier));
      });
      const a0 = A.ailes.find(function (a) { return a.e < 0 && a.s > 0; });
      d.texte(a0.P0[0] - 9 * k, a0.P0[1] + 2.2 * k, fr(t.angle, 0) + '°', 2.2, { c: 'COTES' });
      d.texte(xm0 - A.Lr - 2 * k, B + A.Lr * Math.tan(t.angle * RAD) + 8 * k, 'AMONT', 3.2, { gras: true, a: 'd' });
      d.texte(xm1 + A.Lr + 2 * k, B + A.Lr * Math.tan(t.angle * RAD) + 8 * k, 'AVAL', 3.2, { gras: true });
    }
    // flèche d'écoulement
    const yf = cel[0].x1 + (cel[0].x2 - cel[0].x1) * 0.3;
    d.ligne(xm0 + 0.15 * g.longueur, yf, xm1 - 0.15 * g.longueur, yf, 'TEXTE');
    d.poly([[xm1 - 0.15 * g.longueur - 3 * k, yf + 1.1 * k], [xm1 - 0.15 * g.longueur, yf], [xm1 - 0.15 * g.longueur - 3 * k, yf - 1.1 * k]], 'TEXTE', false);
    d.texte((xm0 + xm1) / 2, yf + 1.2 * k, 'Écoulement', 2.2, { a: 'm' });
    // repères de coupes
    const yA = (cel[0].x1 + cel[0].x2) / 2, xmin = T ? xm0 - A.Lr - 0.3 : xm0 - 0.5, xmax = T ? xm1 + A.Lr + 0.3 : xm1 + 0.5;
    d.texte(xmin - 3 * k, yA, 'A', 3, { c: 'COUPE', gras: true, a: 'd' }); d.texte(xmax + 3 * k, yA, 'A', 3, { c: 'COUPE', gras: true });
    d.ligne(xmin - 2 * k, yA - 2 * k, xmin - 2 * k, yA + 2 * k, 'COUPE'); d.ligne(xmax + 2 * k, yA - 2 * k, xmax + 2 * k, yA + 2 * k, 'COUPE');
    const xB = xm0 + 0.5 * g.longueur;
    d.texte(xB, -6 * k, 'B', 3, { c: 'COUPE', gras: true, a: 'm' }); d.texte(xB, B + 3 * k, 'B', 3, { c: 'COUPE', gras: true, a: 'm' });
    d.ligne(xB - 2 * k, -2 * k, xB + 2 * k, -2 * k, 'COUPE'); d.ligne(xB - 2 * k, B + 2 * k, xB + 2 * k, B + 2 * k, 'COUPE');
    // cotes
    const yc = T ? Math.min(0, Math.min.apply(null, A.ailes.map(function (a) { return Math.min(a.P1[1], a.P2[1]); }))) : 0;
    const xs = T ? [xm0 - A.Lr, xm0, xm1, xm1 + A.Lr] : [xm0, xm1];
    d.chaine(xs, yc, -7, false);
    if (T) d.cote(xs[0], yc, xs[3], yc, -14, c0(xs[3] - xs[0]));
    const ys = [0, g.ep]; cel.forEach(function (c, i) { if (i) ys.push(cel[i - 1].x2 + g.ec); ys.push(c.x2); }); ys.push(B);
    const ys2 = [0]; cel.forEach(function (c, i) { ys2.push(c.x1); ys2.push(c.x2); }); ys2.push(B);
    d.chaine(ys2.filter(function (v, i, a) { return i === 0 || v - a[i - 1] > 1e-6; }), xs[xs.length - 1], 14, true);
    d.cote(xs[xs.length - 1], 0, xs[xs.length - 1], B, 21, c0(B));
    return d;
  }

  /* Coupe longitudinale A-A dans l'axe d'une cellule */
  function dessinCoupeAA(p, R, T, k) {
    const d = Dessin(k), g = p.geo, He = R.geo.Hext, t = p.tetes;
    const A = T ? ailesPlan(p, R, T) : { Lr: 0, xm0: 0, xm1: g.longueur };
    const x0 = A.xm0, x1 = A.xm1;
    // radier, dalle, vide de la cellule
    d.poly([[x0, 0], [x1, 0], [x1, g.er], [x0, g.er]], 'COFFRAGE', true);
    d.poly([[x0, He - g.es], [x1, He - g.es], [x1, He], [x0, He]], 'COFFRAGE', true);
    d.ligne(x0, g.er, x0, He - g.es, 'CACHE'); d.ligne(x1, g.er, x1, He - g.es, 'CACHE');
    d.proprete(x0, x1, 0);
    const gc = t && t.gc && t.gc.actif ? t.gc : null;
    if (gc) [x0, x1 - gc.epaisseur].forEach(function (x) {
      d.poly([[x, He], [x + gc.epaisseur, He], [x + gc.epaisseur, He + gc.longrine], [x, He + gc.longrine]], 'COFFRAGE', true);
      d.poly([[x, He + gc.longrine + gc.vide], [x + gc.epaisseur, He + gc.longrine + gc.vide], [x + gc.epaisseur, He + gc.longrine + gc.vide + gc.lisse], [x, He + gc.longrine + gc.vide + gc.lisse]], 'COFFRAGE', true);
    });
    d.bulle((x0 + x1) / 2, He - g.es / 2 + 4 * k, c0(g.es));
    if (T) {
      const G = T.G;
      [-1, 1].forEach(function (e) {
        const xr = e < 0 ? x0 : x1, xe = xr + e * A.Lr;
        if (t.type === 'radier') {
          const zt = g.er, zb = g.er - t.eRadier, zbe = g.er - t.becheProf, xb = xe - e * t.becheLarg;
          d.poly([[xr, zt], [xe, zt], [xe, zbe], [xb, zbe], [xb, zb], [xr, zb]], 'COFFRAGE', true);
          d.proprete(Math.min(xr, xb), Math.max(xr, xb), zb); d.proprete(Math.min(xe, xb), Math.max(xe, xb), zbe);
          const top = [[xr, zt], [xr, zt + G.H0], [xr + e * t.plat * G.cosA, zt + G.H0], [xe, zt + t.hFin], [xe, zt]];
          d.poly(top, 'VU', true);
          d.bulle(xr + e * A.Lr * 0.45, zt + G.H0 * 0.35, c0(G.ep));
          d.texte(xe + e * 2 * k, zt + 1 * k, 'Bêche', 2.2, { a: e < 0 ? 'd' : 'g' });
          d.cote(xe, zbe, xe, zt, e * 6, c0(t.becheProf));
        } else {
          const zt = t.eSemelle;
          d.poly([[xr, zt], [xr, zt + G.H0], [xr + e * t.plat * G.cosA, zt + G.H0], [xe, zt + t.hFin], [xe, zt]], 'VU', true);
          d.poly([[xr, 0], [xe, 0], [xe, zt], [xr, zt]], 'VU', true);
          d.bulle(xr + e * A.Lr * 0.45, zt + G.H0 * 0.35, c0(G.ep));
        }
      });
      d.texte(x0 - A.Lr, He + 8 * k, 'AMONT', 3.0, { gras: true }); d.texte(x1 + A.Lr, He + 8 * k, 'AVAL', 3.0, { gras: true, a: 'd' });
    }
    const xc = x1 + (T ? A.Lr : 0);
    d.chaine([0, g.er, He - g.es, He], xc, 10, true);
    if (gc) d.chaine([He, He + gc.longrine, He + gc.longrine + gc.vide, He + gc.longrine + gc.vide + gc.lisse], xc, 10, true);
    const xs = T ? [x0 - A.Lr, x0, x1, x1 + A.Lr] : [x0, x1];
    d.chaine(xs, T && t.type === 'radier' ? g.er - t.becheProf - 0.1 : -0.1, -7, false);
    d.cote(xs[0], -0.1, xs[xs.length - 1], -0.1, T && t.type === 'radier' ? -(t.becheProf / k) - 14 : -14, c0(xs[xs.length - 1] - xs[0]));
    d.etiquette(x0 + 0.25 * g.longueur, -0.05, x0 + 0.25 * g.longueur + 5 * k, -9 * k, 'Béton de propreté', 'd');
    return d;
  }

  /* Coupe transversale B-B : module et garde-corps en élévation */
  function dessinCoupeBB(p, R, T, k) {
    const d = Dessin(k), g = p.geo, geo = R.geo, B = geo.B, He = geo.Hext, cel = cellules(p, geo);
    d.poly([[0, 0], [B, 0], [B, He], [0, He]], 'COFFRAGE', true);
    cel.forEach(function (c) { d.poly(polyCellule(c, g.gousset), 'COFFRAGE', true); });
    d.proprete(-0.1, B + 0.1, 0);
    const xs = [0]; cel.forEach(function (c) { xs.push(c.x1, c.x2); }); xs.push(B);
    d.chaine(xs, 0, -7, false); d.cote(0, 0, B, 0, -14, c0(B));
    const zs = [0, g.er, g.er + g.H, He];
    const gcT = T && T.gc ? p.tetes.gc : null;
    if (gcT) {
      const z0 = He, z1 = He + gcT.longrine, z2 = z1 + gcT.vide, z3 = z2 + gcT.lisse;
      d.poly([[0, z0], [B, z0], [B, z1], [0, z1]], 'COFFRAGE', true);
      d.poly([[0, z2], [B, z2], [B, z3], [0, z3]], 'COFFRAGE', true);
      T.gc.poteaux.forEach(function (q) { d.poly([[q.x - q.b / 2, z1], [q.x + q.b / 2, z1], [q.x + q.b / 2, z2], [q.x - q.b / 2, z2]], 'COFFRAGE', true); });
      zs.push(z1, z2, z3);
    }
    d.chaine(zs, 0, -7, true); d.cote(0, 0, 0, zs[zs.length - 1], -14, c0(zs[zs.length - 1]));
    cel.forEach(function (c) { d.texte((c.x1 + c.x2) / 2, (c.y1 + c.y2) / 2, c0(g.L) + ' × ' + c0(g.H), 2.4, { a: 'm' }); });
    return d;
  }

  /* Coupe C-C : aile en vraie grandeur (élévation développée) */
  function dessinCoupeCC(p, R, T, k, miroir) {
    const d = Dessin(k), t = p.tetes, G = T.G, s = miroir ? -1 : 1, X = function (x) { return s * x; };
    const zb = t.type === 'radier' ? 0 : t.eSemelle;
    const pts = [[X(0), zb], [X(0), zb + G.H0], [X(t.plat), zb + G.H0], [X(G.La), zb + t.hFin], [X(G.La), zb]];
    d.poly(pts, 'COFFRAGE', true);
    d.hachure(pts.map(function (q) { return q; }), 3.2, 'HACHURE');
    d.bulle(X(G.La * 0.35), zb + G.H0 * 0.3, c0(G.ep));
    if (t.type === 'radier') {
      d.poly([[X(0), 0], [X(G.La), 0], [X(G.La), -(t.becheProf - t.eRadier)], [X(G.La - t.becheLarg), -(t.becheProf - t.eRadier)], [X(G.La - t.becheLarg), -t.eRadier], [X(0), -t.eRadier]], 'COFFRAGE', true);
      d.proprete(Math.min(X(0), X(G.La - t.becheLarg)), Math.max(X(0), X(G.La - t.becheLarg)), -t.eRadier);
      d.chaine([-(t.becheProf - t.eRadier) - 0, -t.eRadier, 0, t.hFin], X(G.La), 7 * s, true);
      d.chaine([0, G.H0], X(0), -7 * s, true);
    } else {
      d.poly([[X(0), 0], [X(G.La), 0], [X(G.La), t.eSemelle], [X(0), t.eSemelle]], 'COFFRAGE', true);
      d.proprete(Math.min(X(0), X(G.La)), Math.max(X(0), X(G.La)), 0);
      T.troncons.forEach(function (o) { if (o.tr.x0 > 0) d.ligne(X(o.tr.x0), 0, X(o.tr.x0), zb + G.hauteur(o.tr.x0) + 2 * k, 'AXES'); d.texte(X((o.tr.x0 + o.tr.x1) / 2), zb + G.H0 + 6 * k, String(o.tr.i), 2.6, { a: 'm', gras: true }); });
      d.chaine([0, zb, zb + G.H0], X(0), -7 * s, true);
    }
    const xs = [0]; if (t.plat > 0) xs.push(t.plat); if (t.type === 'radier') xs.push(G.La - t.becheLarg); xs.push(G.La);
    d.chaine(xs.map(X).sort(function (a, b) { return a - b; }), t.type === 'radier' ? -(t.becheProf - t.eRadier) - 0.1 : -0.1, -7, false);
    d.cote(Math.min(X(0), X(G.La)), -0.1, Math.max(X(0), X(G.La)), -0.1, t.type === 'radier' ? -14 - (t.becheProf - t.eRadier) / k : -14, c0(G.La));
    const ang = Math.atan2(G.H0 - t.hFin, G.La - t.plat) / RAD;
    d.texte(X((t.plat + G.La) / 2) - s * 2 * k, zb + (G.H0 + t.hFin) / 2 + 3 * k, c0(Math.hypot(G.La - t.plat, G.H0 - t.hFin)), 2.2, { a: 'm', rot: -s * ang, c: 'COTES' });
    return d;
  }

  function dessinDetailA(p, R, T, k) {
    const d = Dessin(k), g = p.geo, G = T.G, t = p.tetes, ep = g.ep;
    // angle amont, côté y = B : piédroit, longrine, départ de l'aile
    const lw = 0.9;
    d.poly([[0, 0], [lw, 0], [lw, ep], [0, ep]], 'COFFRAGE', true); // piédroit (plan)
    d.texte(lw + 2 * k, ep / 2 - 1 * k, 'Piédroit', 2.4, { c: 'TEXTE' });
    const u = [-G.cosA, G.sinA]; let nx = -u[1], ny = u[0]; if (ny < 0) { nx = -nx; ny = -ny; }
    const P0 = [0, ep], L = 0.9;
    d.poly([P0, [P0[0] + u[0] * L, P0[1] + u[1] * L], [P0[0] + u[0] * L + nx * G.ep, P0[1] + u[1] * L + ny * G.ep], [P0[0] + nx * G.ep, P0[1] + ny * G.ep]], 'COFFRAGE', true);
    d.texte(P0[0] + u[0] * L * 0.6 + nx * G.ep + 3 * k, P0[1] + u[1] * L * 0.6 + ny * G.ep + 2 * k, 'Mur en aile', 2.4);
    if (t.gc && t.gc.actif) { d.ligne(t.gc.epaisseur, 0, t.gc.epaisseur, ep, 'CACHE'); d.texte(0.05, -5 * k, 'Longrine ' + c0(t.gc.epaisseur), 2.2); }
    d.cote(0, 0, 0, ep, 6, c0(ep));
    d.texte(-0.25, ep + 0.12, fr(t.angle, 0) + '°', 2.4, { c: 'COTES' });
    d.ligne(0, ep, -0.5, ep, 'AXES');
    d.texte(P0[0] + u[0] * L + nx * G.ep / 2 - 2 * k, P0[1] + u[1] * L + ny * G.ep / 2 + 3 * k, c0(G.ep), 2.2, { c: 'COTES' });
    return d;
  }

  function dessinCoffrageGC(p, R, T, k) {
    const d = Dessin(k), gc = p.tetes.gc, Gc = T.gc, B = Gc.longueur;
    const z1 = gc.longrine, z2 = z1 + gc.vide, z3 = z2 + gc.lisse;
    d.poly([[0, 0], [B, 0], [B, z1], [0, z1]], 'COFFRAGE', true);
    d.poly([[0, z2], [B, z2], [B, z3], [0, z3]], 'COFFRAGE', true);
    const xs = [0];
    Gc.poteaux.forEach(function (q) { d.poly([[q.x - q.b / 2, z1], [q.x + q.b / 2, z1], [q.x + q.b / 2, z2], [q.x - q.b / 2, z2]], 'COFFRAGE', true); xs.push(q.x - q.b / 2, q.x + q.b / 2); });
    xs.push(B);
    d.chaine(xs.filter(function (v, i, a) { return i === 0 || v - a[i - 1] > 1e-6; }).sort(function (a, b) { return a - b; }), z3, 6, false);
    d.cote(0, z3, B, z3, 12, c0(B));
    d.chaine([0, z1, z2, z3], 0, -6, true); d.cote(0, 0, 0, z3, -12, c0(z3));
    return d;
  }

  /* Vue de face d'une tête (depuis l'amont) */
  function dessinVueFaceTete(p, R, T, k) {
    const d = Dessin(k), g = p.geo, geo = R.geo, B = geo.B, He = geo.Hext, t = p.tetes, G = T.G, cel = cellules(p, geo);
    const w = G.La * G.sinA + G.ep / G.cosA; // emprise transversale d'une aile
    const zb = t.type === 'radier' ? g.er : t.eSemelle, gcH = t.gc && t.gc.actif ? t.gc.longrine : 0;
    // tablier et longrine
    d.poly([[0, He - g.es], [B, He - g.es], [B, He + gcH], [0, He + gcH]], 'COFFRAGE', true);
    d.hachure([[0, He - g.es], [B, He - g.es], [B, He + gcH], [0, He + gcH]], 1.6, 'HACHURE');
    cel.forEach(function (c) { d.poly(polyCellule(c, g.gousset), 'COFFRAGE', true); });
    d.ligne(0, g.er, 0, He - g.es, 'COFFRAGE'); d.ligne(B, g.er, B, He - g.es, 'COFFRAGE');
    // ailes (projection)
    [-1, 1].forEach(function (s) {
      const xr = s < 0 ? g.ep : B - g.ep, xe = xr + s * w;
      const pts = [[xr, zb], [xr, zb + G.H0], [xe, zb + t.hFin], [xe, zb]];
      d.poly(pts, 'COFFRAGE', true); d.hachure(pts, 3.2, 'HACHURE');
      d.bulle(xr + s * w * 0.35, zb + G.H0 * 0.3, c0(G.ep));
      d.etiquette(xr + s * w * 0.5, zb + G.H0 * 0.55, xr + s * w * 0.5 + s * 10 * k, zb + G.H0 * 0.8, s < 0 ? 'Aile droite' : 'Aile gauche', s < 0 ? 'g' : 'd');
    });
    const x0 = g.ep - w, x1 = B - g.ep + w;
    if (t.type === 'radier') {
      d.poly([[x0, g.er - t.eRadier], [x1, g.er - t.eRadier], [x1, g.er], [x0, g.er]], 'COFFRAGE', true);
      d.poly([[x0, g.er - t.becheProf], [x1, g.er - t.becheProf], [x1, g.er - t.eRadier], [x0, g.er - t.eRadier]], 'CACHE', true);
      d.proprete(x0 - 0.05, x1 + 0.05, g.er - t.becheProf);
      d.etiquette(x0 + 0.4, g.er - t.becheProf / 2, x0 + 0.4 + 8 * k, g.er - t.becheProf / 2 - 6 * k, 'Bêche (vue en arrière-plan)', 'd');
      d.chaine([g.er - t.becheProf, g.er - t.eRadier, g.er, zb + G.H0], x1, 8, true);
    } else {
      d.poly([[x0, 0], [x1, 0], [x1, t.eSemelle], [x0, t.eSemelle]], 'COFFRAGE', true);
      d.proprete(x0, x1, 0);
      d.chaine([0, t.eSemelle, zb + G.H0], x1, 8, true);
    }
    d.chaine([He - g.es, He, He + gcH].filter(function (v, i, a) { return i === 0 || v - a[i - 1] > 1e-6; }), x1, 8, true);
    const xs = [x0, g.ep, B - g.ep, x1];
    d.chaine(xs, t.type === 'radier' ? g.er - t.becheProf - 0.1 : -0.1, -7, false);
    d.cote(x0, t.type === 'radier' ? g.er - t.becheProf - 0.1 : -0.1, x1, t.type === 'radier' ? g.er - t.becheProf - 0.1 : -0.1, -14, c0(x1 - x0));
    d.etiquette(B * 0.35, He + gcH / 2, B * 0.35 - 6 * k, He + gcH + 8 * k, 'Longrine', 'g');
    d.etiquette(B * 0.55, He - g.es / 2, B * 0.55 + 6 * k, He + gcH + 8 * k, 'Tablier', 'd');
    return d;
  }

  /* Vue en plan d'un radier de tête ou des semelles d'une tête */
  function dessinPlanTete(p, R, T, k, nomen) {
    const d = Dessin(k), g = p.geo, B = R.geo.B, t = p.tetes, G = T.G, A = ailesPlan(p, R, T);
    const ex = A.ailes.filter(function (a) { return a.e < 0; });
    // repère local : y transversal horizontal, x (axe) vertical vers l'amont
    const T2 = function (pt) { return [pt[1], A.xm0 - pt[0]]; };
    ex.forEach(function (a) { d.poly([a.P0, a.P1, a.P2, a.P3].map(T2), 'COFFRAGE', true); });
    d.ligne(0, 0, B, 0, 'COFFRAGE');
    const yL = Math.min(ex[0].P2[1], ex[1].P2[1]), yH = Math.max(ex[0].P2[1], ex[1].P2[1]);
    if (t.type === 'radier') {
      d.ligne(yL, A.Lr, yH, A.Lr, 'COFFRAGE');
      d.ligne(yL, A.Lr - t.becheLarg, yH, A.Lr - t.becheLarg, 'CACHE');
      d.bulle(B / 2, A.Lr * 0.5, c0(t.eRadier));
      d.chaine([yL, 0, B, yH], A.Lr, 7, false); d.cote(yL, A.Lr, yH, A.Lr, 14, c0(yH - yL));
      if (nomen) {
        const L = {}; nomen.lignes.forEach(function (l) { L[l.id] = l; });
        const c = p.mat.enrobageExt, wy = function (x) { return [g.ep - x * Math.tan(t.angle * RAD) + c, B - g.ep + x * Math.tan(t.angle * RAD) - c]; };
        [[L.rt_t_inf, 0.35, 'ACIER_INF', 'Inf.'], [L.rt_t_sup, 0.62, 'ACIER', 'Sup.']].forEach(function (q) {
          if (!q[0]) return; const x = A.Lr * q[1], w = wy(x);
          d.ligne(w[0], x, w[1], x, q[2]); d.texte(B * 0.72, x + 1.0 * k, repere(q[0]) + ' (' + q[3] + ')', 2.3, { c: 'TEXTE_ACIER' });
        });
        if (L.rt_l) [0.38, 0.62].forEach(function (f, i) { const y = B * f; d.ligne(y, c, y, A.Lr - c, i ? 'ACIER' : 'ACIER_INF'); if (!i) d.texte(y - 1.0 * k, A.Lr * 0.2, repere(L.rt_l) + ' (Inf. et Sup.)', 2.3, { rot: 90, c: 'TEXTE_ACIER' }); });
        if (L.beche_c) d.texte(B * 0.5, A.Lr + 3 * k, repere(L.beche_c) + ' cadres de bêche, ' + repere(L.beche_f) + ' filantes', 2.2, { a: 'm', c: 'TEXTE_ACIER' });
        d.texte(B * 0.5, -6 * k, 'Aciers en attente : barres du radier du module prolongées dans le radier de tête', 2.2, { a: 'm' });
      }
      d.chaine([0, A.Lr - t.becheLarg, A.Lr], B / 2, 0, true);
    } else {
      T.troncons.forEach(function (o) {
        ex.forEach(function (a) {
          const st = o.semelle.stab, av = st.av, ar = st.ar;
          // semelle du tronçon : rectangle en repère de l'aile, avant côté canal (-n), arrière côté terre (+n)
          const P = function (s, nn) { return T2([a.P0[0] + a.u[0] * s + a.n[0] * nn, a.P0[1] + a.u[1] * s + a.n[1] * nn]); };
          d.poly([P(o.tr.x0, -av), P(o.tr.x1, -av), P(o.tr.x1, G.ep + ar), P(o.tr.x0, G.ep + ar)], 'CACHE', true);
        });
      });
      d.cote(yL, A.Lr, yH, A.Lr, 10, c0(yH - yL));
    }
    d.texte(ex[0].s > 0 ? T2(ex[0].P0)[0] + 2 * k : T2(ex[1].P0)[0] + 2 * k, 4 * k, fr(t.angle, 0) + '°', 2.4, { c: 'COTES' });
    d.cote(-0.3, 0, -0.3, A.Lr, -8, c0(A.Lr));
    d.chaine([0, B], -0.1, -7, false);
    return d;
  }

  /* ------------------------------------------------------------------ */
  /* 5. Dessins de ferraillage                                           */
  /* ------------------------------------------------------------------ */
  /* Développé d'une barre (forme, cotes en cm, longueur) dessiné à l'échelle du dessin */
  function developpe(d, l, x, y, opts) {
    opts = opts || {};
    const k = d.k, s = l.segments, rot = opts.vertical;
    const P = function (u, v) { return rot ? [x + v, y + u] : [x + u, y + v]; };
    let pts;
    switch (l.forme) {
      case 'U-bas': pts = [P(0, -s[0]), P(0, 0), P(s[1], 0), P(s[1], -s[2])]; break;
      case 'U-haut': pts = [P(0, s[0]), P(0, 0), P(s[1], 0), P(s[1], s[2])]; break;
      case 'L': pts = [P(s[1], 0), P(0, 0), P(0, s[0])]; break;
      case 'crosse2': pts = [P(0, s[0]), P(0, 0), P(s[1], 0), P(s[1], s[2])]; break;
      default: pts = [P(0, 0), P(s.reduce(function (a, b) { return a + b; }, 0), 0)];
    }
    d.poly(pts, 'ACIER', false);
    const long = l.forme === 'U-bas' || l.forme === 'U-haut' || l.forme === 'crosse2' ? s[1] : s.reduce(function (a, b) { return a + b; }, 0);
    const mid = P(long / 2, 0);
    const txt = repere(l) + '   ' + c0(long) + '   L = ' + c0(l.Lunit);
    if (rot) d.texte(mid[0] - 1.2 * k, mid[1], txt, 2.2, { a: 'm', rot: 90, c: 'TEXTE_ACIER' });
    else d.texte(mid[0], mid[1] + 1.0 * k, txt, 2.2, { a: 'm', c: 'TEXTE_ACIER' });
    if (s.length > 1 && (l.forme === 'U-bas' || l.forme === 'U-haut')) {
      const q = P(0, l.forme === 'U-bas' ? -s[0] / 2 : s[0] / 2);
      d.texte(q[0] - (rot ? 0 : 1.2 * k), q[1], c0(s[0]), 2.0, { a: 'd', c: 'TEXTE_ACIER' });
    }
  }

  function dessinFerraillageCoupe(p, R, nomen, k, avecDeveloppes) {
    const d = Dessin(k), g = p.geo, geo = R.geo, B = geo.B, He = geo.Hext, cel = cellules(p, geo);
    const cE = p.mat.enrobageExt, cI = p.mat.enrobageInt;
    d.poly([[0, 0], [B, 0], [B, He], [0, He]], 'COFFRAGE', true);
    cel.forEach(function (c) { d.poly(polyCellule(c, g.gousset), 'COFFRAGE', true); });
    const L = {}; nomen.lignes.forEach(function (l) { L[l.id] = l; });
    const c0c = cel[0], xm0 = (c0c.x1 + c0c.x2) / 2, Lc = c0c.x2 - c0c.x1;
    const off = function (l) { return l ? l.phi / 1000 : 0; };
    if (L.ds_sup) { const l = L.ds_sup, b = l.segments[0], y = He - cE; d.poly([[cE, y - b], [cE, y], [B - cE, y], [B - cE, y - b]], 'ACIER'); d.rappel(B * 0.3, y, B * 0.3 + 3 * k, He + 5 * k, repere(l), 'd'); }
    if (L.ds_inf) { const l = L.ds_inf, y = He - g.es + cI; d.ligne(cE, y, B - cE, y, 'ACIER'); d.rappel(xm0 + 0.15 * Lc, y, xm0, y - 8 * k, repere(l), 'd'); }
    if (L.rd_inf) { const l = L.rd_inf, b = l.segments[0], y = cE; d.poly([[cE, y + b], [cE, y], [B - cE, y], [B - cE, y + b]], 'ACIER'); d.rappel(B * 0.3, y, B * 0.3 + 3 * k, -7 * k, repere(l), 'd'); }
    if (L.rd_sup) { const l = L.rd_sup, y = g.er - cI; d.ligne(cE, y, B - cE, y, 'ACIER'); d.rappel(xm0 + 0.15 * Lc, y, xm0, y + 8 * k, repere(l), 'd'); }
    if (L.pd_ext) { const l = L.pd_ext, x = cE + off(L.ds_sup); d.ligne(x, cE, x, He - cE, 'ACIER'); d.ligne(B - x, cE, B - x, He - cE, 'ACIER'); d.rappel(x, He * 0.6, -5 * k, He * 0.6 + 5 * k, repere(l), 'g'); }
    if (L.pd_int) { const l = L.pd_int, x = g.ep - cI; d.ligne(x, cE, x, He - cE, 'ACIER'); d.ligne(B - x, cE, B - x, He - cE, 'ACIER'); d.rappel(x, He * 0.4, -5 * k, He * 0.4 - 5 * k, repere(l), 'g'); }
    if (L.cl) {
      const l = L.cl;
      for (let i = 1; i < cel.length; i++) { const xa = cel[i - 1].x2 + cI, xb = cel[i].x1 - cI; d.ligne(xa, cE, xa, He - cE, 'ACIER'); d.ligne(xb, cE, xb, He - cE, 'ACIER'); }
      d.rappel(cel[0].x2 + cI, He * 0.5, cel[0].x2 - 0.3 * Lc, He * 0.5 + 4 * k, repere(l), 'g');
    }
    if (L.gousset && g.gousset > 0) {
      const l = L.gousset, ls = l.segments[0], s2 = Math.SQRT1_2, kg = g.gousset;
      cel.forEach(function (c, i) {
        [[c.x1, c.y2, 1, 1], [c.x2, c.y2, -1, 1], [c.x1, c.y1, 1, -1], [c.x2, c.y1, -1, -1]].forEach(function (q) {
          const kx = q[2], ky = q[3], ox = -kx * cI * s2, oy = ky * cI * s2, ux = kx * s2, uy = ky * s2;
          const W = [q[0] + ox - ux * cI, q[1] - ky * kg + oy - uy * cI], S = [q[0] + kx * kg + ox + ux * cI, q[1] + oy + uy * cI];
          d.poly([[W[0], W[1] - ky * ls], W, S, [S[0] + kx * ls, S[1]]], 'ACIER', false);
        });
        if (i === 0) d.rappel(c.x1 + kg / 2 - cI * s2, c.y2 - kg / 2 - cI * s2, xm0 - 0.1 * Lc, c.y2 - kg - 6 * k, repere(l), 'd');
      });
    }
    function points(x1, y1, x2, y2, e) {
      const long = Math.hypot(x2 - x1, y2 - y1), nb = nbBarres(long, e);
      for (let i = 0; i < nb; i++) { const t = nb > 1 ? i / (nb - 1) : 0.5; d.rond(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, 0.4, 'ACIER_REP', true); }
    }
    const dr = function (l) { return l ? l.phi / 1000 : 0.01; };
    if (L.rep_ds_sup) points(cE, He - cE - dr(L.ds_sup), B - cE, He - cE - dr(L.ds_sup), L.rep_ds_sup.esp);
    if (L.rep_ds_inf) points(cE, He - g.es + cI + dr(L.ds_inf), B - cE, He - g.es + cI + dr(L.ds_inf), L.rep_ds_inf.esp);
    if (L.rep_rd_inf) points(cE, cE + dr(L.rd_inf), B - cE, cE + dr(L.rd_inf), L.rep_rd_inf.esp);
    if (L.rep_rd_sup) points(cE, g.er - cI - dr(L.rd_sup), B - cE, g.er - cI - dr(L.rd_sup), L.rep_rd_sup.esp);
    if (L.rep_pd_ext) { const x = cE + off(L.ds_sup) + dr(L.pd_ext); points(x, g.er, x, g.er + g.H, L.rep_pd_ext.esp); points(B - x, g.er, B - x, g.er + g.H, L.rep_pd_ext.esp); }
    if (L.rep_pd_int) { const x = g.ep - cI - dr(L.pd_int); points(x, g.er, x, g.er + g.H, L.rep_pd_int.esp); points(B - x, g.er, B - x, g.er + g.H, L.rep_pd_int.esp); }
    if (L.rep_cl) for (let i = 1; i < cel.length; i++) {
      points(cel[i - 1].x2 + cI + dr(L.cl), g.er, cel[i - 1].x2 + cI + dr(L.cl), g.er + g.H, L.rep_cl.esp);
      points(cel[i].x1 - cI - dr(L.cl), g.er, cel[i].x1 - cI - dr(L.cl), g.er + g.H, L.rep_cl.esp);
    }
    if (avecDeveloppes) {
      // développés : dalle au-dessus, radier au-dessous, voiles à gauche, répartitions listées
      let y = He + 16 * k;
      ['ds_inf', 'ds_sup'].forEach(function (id) { if (L[id]) { developpe(d, L[id], cE, y + (L[id].forme === 'U-bas' ? L[id].segments[0] : 0)); y += (L[id].forme === 'U-bas' ? L[id].segments[0] : 0) + 9 * k; } });
      let yb = -16 * k;
      ['rd_sup', 'rd_inf'].forEach(function (id) { if (L[id]) { const hU = L[id].forme === 'U-haut' ? L[id].segments[0] : 0; developpe(d, L[id], cE, yb - hU); yb -= hU + 9 * k; } });
      let x = -48 * k;
      ['pd_ext', 'pd_int', 'cl'].forEach(function (id) { if (L[id]) { developpe(d, L[id], x, cE, { vertical: true }); x -= 9 * k; } });
      if (L.gousset) d.texte(B + 6 * k, He * 0.5, repere(L.gousset) + '  barre pliée ' + L.gousset.segments.map(c0).join(' / ') + '  L = ' + c0(L.gousset.Lunit), 2.2, { c: 'TEXTE_ACIER', rot: 90, a: 'm' });
    }
    const reps = nomen.lignes.filter(function (l) { return !l.principale && !l.constructif; });
    let yl = (avecDeveloppes ? -60 : -18) * k;
    d.texte(0, yl, 'Armatures de répartition (points), parallèles à l\'axe de l\'ouvrage :', 2.4, { gras: true });
    reps.forEach(function (l) { yl -= 3.8 * k; d.texte(0, yl, repere(l) + ' — ' + l.element.toLowerCase() + ', ' + l.role.replace('répartition, ', '') + ', L = ' + c0(l.Lunit), 2.2, { c: 'TEXTE_ACIER' }); });
    return d;
  }

  /* Ferraillage en plan du tablier ou du radier (axe de l'ouvrage horizontal), amorces des ailes aux angles */
  function dessinFerraillagePlan(p, R, nomen, k, quelle, T) {
    const d = Dessin(k), g = p.geo, B = R.geo.B, Lg = g.longueur, cE = p.mat.enrobageExt;
    const L = {}; nomen.lignes.forEach(function (l) { L[l.id] = l; });
    const sup = quelle === 'dalle' ? L.ds_sup : L.rd_sup, inf = quelle === 'dalle' ? L.ds_inf : L.rd_inf;
    const rSup = quelle === 'dalle' ? L.rep_ds_sup : L.rep_rd_sup, rInf = quelle === 'dalle' ? L.rep_ds_inf : L.rep_rd_inf;
    d.poly([[0, 0], [Lg, 0], [Lg, B], [0, B]], 'COFFRAGE', true);
    const cel = cellules(p, R.geo);
    cel.forEach(function (c) { d.ligne(0, c.x1, Lg, c.x1, 'CACHE'); d.ligne(0, c.x2, Lg, c.x2, 'CACHE'); });
    if (T) { // amorces des ailes
      const G = T.G;
      [[0, 0, -1, -1], [0, B, -1, 1], [Lg, 0, 1, -1], [Lg, B, 1, 1]].forEach(function (q) {
        d.ligne(q[0], q[1], q[0] + q[2] * 0.9 * G.cosA, q[1] + q[3] * 0.9 * G.sinA, 'COFFRAGE');
      });
    }
    // barres transversales (selon la largeur B) : une barre type par nappe + étendue
    function transv(l, x, calque, tag) {
      if (!l) return;
      d.ligne(x, cE, x, B - cE, calque);
      d.ligne(cE, B * 0.5 + (tag === 'Sup.' ? 0.08 : -0.08), Lg - cE, B * 0.5 + (tag === 'Sup.' ? 0.08 : -0.08), 'RAPPEL');
      d.texte(x + 1.2 * k, B * 0.78, tag, 2.2, { rot: 90 });
      d.texte(x - 1.0 * k, B * 0.25, repere(l), 2.3, { rot: 90, c: 'TEXTE_ACIER' });
    }
    function longi(l, y, calque, tag) {
      if (!l) return;
      d.ligne(cE, y, Lg - cE, y, calque);
      d.texte(Lg * 0.62, y + 1.0 * k, repere(l) + '  (' + tag + ')', 2.3, { c: 'TEXTE_ACIER' });
    }
    transv(sup, Lg * 0.40, 'ACIER', 'Sup.');
    transv(inf, Lg * 0.52, 'ACIER_INF', 'Inf.');
    longi(rSup, B * 0.82, 'ACIER', 'Sup.');
    longi(rInf, B * 0.18, 'ACIER_INF', 'Inf.');
    d.cote(0, 0, Lg, 0, -7, c0(Lg));
    d.chaine([0, g.ep].concat(cel.slice(1).map(function (c) { return c.x1; })).concat([B - g.ep, B]).filter(function (v, i, a) { return i === 0 || v - a[i - 1] > 1e-6; }), Lg, 7, true);
    d.texte(0, -15 * k, 'Trait continu : nappe supérieure — Tirets : nappe inférieure', 2.1);
    return d;
  }

  /* Têtes : ferraillage de l'aile en élévation */
  function dessinFerraillageAile(p, R, T, nomen, k) {
    const d = Dessin(k), t = p.tetes, G = T.G, c = p.mat.enrobageExt;
    const zb = t.type === 'radier' ? 0 : t.eSemelle;
    const pts = [[0, zb], [0, zb + G.H0], [t.plat, zb + G.H0], [G.La, zb + t.hFin], [G.La, zb]];
    d.poly(pts, 'COFFRAGE', true);
    const L = {}; if (nomen) nomen.lignes.forEach(function (l) { L[l.id] = l; });
    if (t.type === 'radier') {
      d.poly([[0, 0], [G.La, 0], [G.La, -(t.becheProf - t.eRadier)], [G.La - t.becheLarg, -(t.becheProf - t.eRadier)], [G.La - t.becheLarg, -t.eRadier], [0, -t.eRadier]], 'COFFRAGE', true);
      const lv = L.aile_v_ext, lh = L.aile_h_ext;
      if (lv) {
        for (let x = c; x <= G.La - c + 1e-9; x += lv.esp) d.ligne(x, -t.eRadier + c, x, zb + G.hauteur(x) - c, 'ACIER_FIN');
        d.rappel(G.La * 0.3, zb + G.hauteur(G.La * 0.3) * 0.5, -6 * k, zb + G.H0 * 0.7, repere(lv) + ' (ext.)', 'g');
      }
      if (lh) {
        for (let z = c; z < G.H0 - c; z += lh.esp) { let xl = G.La; for (let x = 0; x <= G.La; x += 0.01) if (G.hauteur(x) < z + c) { xl = x; break; } d.ligne(-0.15, zb + z, xl - c, zb + z, 'ACIER_FIN'); }
        d.rappel(G.La * 0.15, zb + G.H0 * 0.2, G.La + 6 * k, zb + G.H0 * 0.55, repere(lh) + ' (ext.)', 'd');
      }
      ['aile_v_int', 'aile_h_int'].forEach(function (id, i) { if (L[id]) d.texte(G.La + 6 * k, zb + G.H0 * 0.55 - (i + 1) * 4 * k, repere(L[id]) + ' (int.) : même tracé', 2.2, { c: 'TEXTE_ACIER' }); });
      ['rt_t_inf', 'rt_t_sup', 'rt_l', 'beche_c', 'beche_f'].forEach(function (id, i) { if (L[id]) d.texte(0, -(t.becheProf - t.eRadier) - (12 + 4 * i) * k, repere(L[id]) + ' — ' + L[id].element.toLowerCase() + ', ' + L[id].role, 2.2, { c: 'TEXTE_ACIER' }); });
    } else {
      d.poly([[0, 0], [G.La, 0], [G.La, t.eSemelle], [0, t.eSemelle]], 'COFFRAGE', true);
      T.troncons.forEach(function (o) {
        if (o.tr.x0 > 0) d.ligne(o.tr.x0, 0, o.tr.x0, zb + G.hauteur(o.tr.x0) + 3 * k, 'AXES');
        d.texte((o.tr.x0 + o.tr.x1) / 2, zb + G.H0 + 7 * k, String(o.tr.i), 2.8, { a: 'm', gras: true });
        const v = o.voile;
        const b = v.continu.barres;
        if (b) for (let x = o.tr.x0 + c; x <= o.tr.x1 - c + 1e-9; x += b.esp) d.ligne(x, c, x, zb + G.hauteur(x) - c, 'ACIER_FIN');
        if (v.renfort) d.ligne(o.tr.x0 + c, zb + v.renfort.h, o.tr.x1 - c, zb + v.renfort.h, 'ACIER_INF');
      });
      d.texte(0, -10 * k, 'Tirets rouges : limite haute des renforts verticaux de chaque tronçon. Détail des barres : coupes et nomenclature.', 2.2);
    }
    d.chaine([0, G.La], t.type === 'radier' ? -(t.becheProf - t.eRadier) - 0.05 : -0.05, -6, false);
    d.chaine([zb, zb + G.H0], 0, -16, true);
    return d;
  }

  /* Coupe D-D : section transversale de l'aile et de sa base */
  function dessinCoupeDD(p, R, T, k, troncon, nomen) {
    const d = Dessin(k), t = p.tetes, G = T.G, c = p.mat.enrobageExt, ew = G.ep;
    const L = {}; if (nomen) nomen.lignes.forEach(function (l) { L[l.id] = l; });
    if (t.type === 'radier') {
      const H = G.H0, eR = t.eRadier, w = 0.9; // radier montré sur 0,90 m côté canal
      d.poly([[0, 0], [ew, 0], [ew, H], [0, H]], 'COFFRAGE', true);
      d.poly([[-w, -eR], [ew, -eR], [ew, 0], [0, 0], [0, 0.0001], [-w, 0]], 'COFFRAGE', true);
      d.ligne(ew + 0.05, H, ew + 0.6, H, 'TERRAIN');
      const lv = L.aile_v_ext, li = L.aile_v_int;
      if (lv) { d.poly([[ew - c, H - c], [ew - c, -eR + c], [ew - c - lv.segments[1], -eR + c]], 'ACIER'); d.rappel(ew - c, H * 0.6, ew + 8 * k, H * 0.75, repere(lv), 'd'); }
      if (li) { d.poly([[c, H - c], [c, -eR + c + 0.02], [c - li.segments[1], -eR + c + 0.02]], 'ACIER'); d.rappel(c, H * 0.45, -8 * k, H * 0.6, repere(li), 'g'); }
      if (L.rt_t_inf) { d.ligne(-w, -eR + c, ew - c, -eR + c, 'ACIER'); d.rappel(-w * 0.6, -eR + c, -w * 0.6 - 4 * k, -eR - 6 * k, repere(L.rt_t_inf), 'g'); }
      if (L.rt_t_sup) { d.ligne(-w, -c, -c, -c, 'ACIER'); d.rappel(-w * 0.4, -c, -w * 0.4 - 4 * k, 6 * k, repere(L.rt_t_sup), 'g'); }
      d.chaine([-eR, 0, H], ew, 10, true); d.cote(0, H, ew, H, 6, c0(ew));
    } else {
      const o = T.troncons[troncon || 0], st = o.semelle.stab, H = o.tr.H, es = t.eSemelle, av = st.av, ar = st.ar;
      d.poly([[av, es], [av + ew, es], [av + ew, es + H], [av, es + H]], 'COFFRAGE', true);
      d.poly([[0, 0], [st.B, 0], [st.B, es], [0, es]], 'COFFRAGE', true);
      d.proprete(-0.05, st.B + 0.05, 0);
      d.ligne(av + ew, es + H, st.B + 0.3, es + H + 0.3 * Math.tan(Math.min(t.betaPoussee, p.sol.phi) * RAD), 'TERRAIN');
      d.texte(av - 2 * k, es + H + 3 * k, 'AVANT', 2.8, { gras: true, a: 'd' }); d.texte(av + ew + 2 * k, es + H + 3 * k, 'ARRIÈRE', 2.8, { gras: true });
      const v = o.voile, s = o.semelle;
      const ar_ = v.continu.barres, rf = v.renfort, avb = v.avant.barres;
      if (ar_) { d.poly([[av + ew - c, es + H - c], [av + ew - c, c + 0.02], [av + ew - c + 0.25, c + 0.02]], 'ACIER'); d.rappel(av + ew - c, es + H * 0.8, st.B + 4 * k, es + H * 0.9, 'HA' + ar_.phi + ' e=' + espTxt(ar_.esp), 'd'); }
      if (rf) { d.poly([[av + ew - c - 0.02, es + rf.h], [av + ew - c - 0.02, c + 0.04], [av + ew - c + 0.25, c + 0.04]], 'ACIER'); d.rappel(av + ew - c - 0.02, es + rf.h * 0.5, st.B + 4 * k, es + Math.min(H * 0.55, rf.h * 0.5 + 8 * k), 'renfort HA' + rf.barres.phi + ' e=' + espTxt(rf.barres.esp), 'd'); d.chaine([es, es + rf.h], av + ew, -6, true); }
      if (avb) { d.poly([[av + c, es + H - c], [av + c, c + 0.02], [av + c - 0.25, c + 0.02]], 'ACIER'); d.rappel(av + c, es + H * 0.6, -4 * k, es + H * 0.65, 'HA' + avb.phi + ' e=' + espTxt(avb.esp), 'g'); }
      if (s.inf.barres) { d.poly([[c, c + 0.12], [c, c], [st.B - c, c], [st.B - c, c + 0.12]], 'ACIER'); d.rappel(st.B * 0.2, c, -4 * k, -6 * k, 'HA' + s.inf.barres.phi + ' e=' + espTxt(s.inf.barres.esp), 'g'); }
      if (s.sup.barres) { d.poly([[c, es - c - 0.12], [c, es - c], [st.B - c, es - c], [st.B - c, es - c - 0.12]], 'ACIER'); d.rappel(st.B * 0.85, es - c, st.B + 4 * k, es + 5 * k, 'HA' + s.sup.barres.phi + ' e=' + espTxt(s.sup.barres.esp), 'd'); }
      d.chaine([0, av, av + ew, st.B], 0, -7, false); d.cote(0, 0, st.B, 0, -13, c0(st.B));
      d.chaine([0, es, es + H], st.B, 10, true);
    }
    return d;
  }

  /* Garde-corps : élévation ferraillée et coupes */
  function dessinFerraillageGC(p, R, T, k, nomen) {
    const d = Dessin(k), gc = p.tetes.gc, Gc = T.gc, B = Gc.longueur, c = 0.025;
    const z1 = gc.longrine, z2 = z1 + gc.vide, z3 = z2 + gc.lisse;
    d.poly([[0, 0], [B, 0], [B, z1], [0, z1]], 'COFFRAGE', true);
    d.poly([[0, z2], [B, z2], [B, z3], [0, z3]], 'COFFRAGE', true);
    Gc.poteaux.forEach(function (q) {
      d.poly([[q.x - q.b / 2, z1], [q.x + q.b / 2, z1], [q.x + q.b / 2, z2], [q.x - q.b / 2, z2]], 'COFFRAGE', true);
      d.ligne(q.x - q.b / 2 + c, -0.2, q.x - q.b / 2 + c, z3 - c, 'ACIER'); d.ligne(q.x + q.b / 2 - c, -0.2, q.x + q.b / 2 - c, z3 - c, 'ACIER');
    });
    [c, z1 - c, z2 + c, z3 - c].forEach(function (z) { d.ligne(c, z, B - c, z, 'ACIER'); });
    d.cote(0, 0, B, 0, -6, c0(B));
    d.chaine([0, z1, z2, z3], B, 6, true);
    if (nomen) {
      const L = {}; nomen.lignes.forEach(function (l) { L[l.id] = l; });
      const q0 = Gc.poteaux[0], q1 = Gc.poteaux.find(function (q) { return q.b < gc.poteau - 1e-9; });
      if (L.gc_s) d.rappel(B * 0.3, z3 - c, B * 0.3 - 4 * k, z3 + 6 * k, repere(L.gc_s) + ' + cadres ' + repere(L.gc_sc), 'g');
      if (L.gc_l) d.rappel(B * 0.3, c, B * 0.3 - 4 * k, -10 * k, repere(L.gc_l) + ' + cadres ' + repere(L.gc_lc), 'g');
      if (L.gc_p) d.rappel(q0.x + q0.b / 2 - c, z2 - 0.2, q0.x + 8 * k, z2 - 8 * k, repere(L.gc_p) + ' + cadres ' + repere(L.gc_pc), 'd');
      if (L.gc_pi && q1) d.rappel(q1.x + q1.b / 2 - c, z1 + 0.3, q1.x + 6 * k, z1 + 8 * k, repere(L.gc_pi), 'd');
      // coupes 1-1 (lisse), 2-2 (longrine), 3-3 (poteau)
      const ep = gc.epaisseur, yc = -26 * k;
      [['COUPE 1-1', ep, gc.lisse], ['COUPE 2-2', ep, gc.longrine + 0.10], ['COUPE 3-3', gc.poteau, ep]].forEach(function (q, i) {
        const x0 = B * 0.15 + i * B * 0.3, w = q[1], h = q[2];
        d.poly([[x0, yc - h], [x0 + w, yc - h], [x0 + w, yc], [x0, yc]], 'COFFRAGE', true);
        d.poly([[x0 + c, yc - h + c], [x0 + w - c, yc - h + c], [x0 + w - c, yc - c], [x0 + c, yc - c]], 'ACIER', true);
        [[x0 + c + 0.006, yc - h + c + 0.006], [x0 + w - c - 0.006, yc - h + c + 0.006], [x0 + w - c - 0.006, yc - c - 0.006], [x0 + c + 0.006, yc - c - 0.006]].forEach(function (pt) { d.rond(pt[0], pt[1], 0.5, 'ACIER', true); });
        d.texte(x0 + w / 2, yc + 4 * k, q[0], 2.6, { a: 'm', gras: true });
        d.texte(x0 + w / 2, yc - h - 4 * k, c0(w) + ' × ' + c0(h), 2.2, { a: 'm', c: 'COTES' });
      });
    }
    return d;
  }

  /* ------------------------------------------------------------------ */
  /* 6. Feuilles, cartouche, tableaux                                    */
  /* ------------------------------------------------------------------ */
  function Feuille() {
    const P = [];
    const f = {
      prims: P,
      ligne: function (x1, y1, x2, y2, c) { P.push({ t: 'l', x1: x1, y1: y1, x2: x2, y2: y2, c: c || 'CADRE' }); },
      rect: function (x, y, w, h, c) { P.push({ t: 'p', pts: [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], c: c || 'CADRE', ferme: true }); },
      texte: function (x, y, s, h, o) { o = o || {}; P.push({ t: 't', x: x, y: y, s: String(s), h: h, a: o.a || 'g', rot: o.rot || 0, c: o.c || 'TEXTE', gras: !!o.gras }); },
      // texte réduit pour tenir dans une largeur donnée
      texteAjuste: function (x, y, s, h, largeur, o) { const hh = Math.min(h, largeur / Math.max(1, String(s).length * 0.55)); f.texte(x, y, s, hh, o); },
      titre: function (x, y, s, sous) {
        const L = s.length * 3.4 * 0.56;
        f.texte(x, y, s, 3.4, { a: 'm', c: 'TITRE' }); f.ligne(x - L / 2, y - 0.8, x + L / 2, y - 0.8, 'TITRE');
        if (sous) f.texte(x + L / 2, y - 4.6, sous, 2.4, { a: 'd', c: 'TEXTE_GRIS' });
      },
      placer: function (dessin, zone, ech, haut) {
        const e = etendue(dessin.prims), s = 1000 / ech;
        const ox = zone.x + (zone.w - e.w * s) / 2 - e.x0 * s, oy = haut ? zone.y + zone.h - e.h * s - e.y0 * s : zone.y + (zone.h - e.h * s) / 2 - e.y0 * s;
        const X = function (x) { return ox + x * s; }, Y = function (y) { return oy + y * s; };
        dessin.prims.forEach(function (q) {
          if (q.t === 'l') P.push({ t: 'l', x1: X(q.x1), y1: Y(q.y1), x2: X(q.x2), y2: Y(q.y2), c: q.c });
          else if (q.t === 'p') P.push({ t: 'p', pts: q.pts.map(function (v) { return [X(v[0]), Y(v[1])]; }), c: q.c, ferme: q.ferme });
          else if (q.t === 'c') P.push({ t: 'c', x: X(q.x), y: Y(q.y), r: q.r * s, c: q.c, plein: q.plein });
          else if (q.t === 't') P.push({ t: 't', x: X(q.x), y: Y(q.y), s: q.s, h: q.h * s, a: q.a, rot: q.rot, c: q.c, gras: q.gras });
        });
        return { haut: oy + (e.y1) * s };
      }
    };
    return f;
  }
  function echelleAdaptee(fabrique, zone) {
    for (let i = 0; i < ECHELLES.length; i++) {
      const ech = ECHELLES[i], dd = fabrique(ech / 1000), e = etendue(dd.prims), s = 1000 / ech;
      if (e.w * s <= zone.w && e.h * s <= zone.h) return { ech: ech, dessin: dd };
    }
    const ech = ECHELLES[ECHELLES.length - 1];
    return { ech: ech, dessin: fabrique(ech / 1000) };
  }
  /* Place un dessin titré dans une zone : titre souligné et échelle au-dessus */
  function vue(f, fabrique, zone, titre) {
    const z = { x: zone.x, y: zone.y, w: zone.w, h: zone.h - 9 };
    const a = echelleAdaptee(fabrique, z);
    f.placer(a.dessin, z, a.ech);
    f.titre(zone.x + zone.w / 2, zone.y + zone.h - 3.5, titre, 'Echelle 1:' + a.ech);
    return a.ech;
  }

  const CART_H = 34;
  function cartouche(f, p, titrePlan, echelle, num, total) {
    const pr = p.projet, x = 10, y = 10, W = A3.w - 20, H = CART_H;
    const w1 = 80, w2 = 128, w4 = 48, w3 = W - w1 - w2 - w4;
    f.rect(x, y, W, H, 'CADRE');
    f.ligne(x + w1, y, x + w1, y + H); f.ligne(x + w1 + w2, y, x + w1 + w2, y + H); f.ligne(x + w1 + w2 + w3, y, x + w1 + w2 + w3, y + H);
    // colonne 1 : en-tête administratif
    f.texteAjuste(x + w1 / 2, y + H - 5, (pr.pays || 'REPUBLIQUE DE COTE D\'IVOIRE').toUpperCase(), 2.6, w1 - 4, { a: 'm', gras: true });
    f.texteAjuste(x + w1 / 2, y + H - 9, pr.devise || 'Union - Discipline - Travail', 2.2, w1 - 4, { a: 'm', gras: true });
    f.texteAjuste(x + w1 / 2, y + 3, pr.ministere || 'Ministère de l\'Equipement et de l\'Entretien Routier', 2.2, w1 - 4, { a: 'm' });
    // colonne 2 : marché et intervenants
    const x2 = x + w1;
    f.ligne(x2, y + H - 9, x2 + w2, y + H - 9);
    f.texteAjuste(x2 + w2 / 2, y + H - 6, pr.marche || (pr.nom || ''), 2.4, w2 - 4, { a: 'm', gras: true });
    f.ligne(x2, y + H - 15, x2 + w2, y + H - 15);
    const cw = w2 / 3;
    [['Maître d\'Ouvrage Délégué', pr.maitre], ['Mission de contrôle', pr.controle], ['Entreprise', pr.entreprise]].forEach(function (q, i) {
      if (i) f.ligne(x2 + i * cw, y, x2 + i * cw, y + H - 9);
      f.texteAjuste(x2 + i * cw + cw / 2, y + H - 13.2, q[0], 2.2, cw - 3, { a: 'm', gras: true });
      f.texteAjuste(x2 + i * cw + cw / 2, y + 8, q[1] || '—', 2.6, cw - 3, { a: 'm' });
    });
    // colonne 3 : phase et titre du plan
    const x3 = x2 + w2;
    f.ligne(x3, y + H - 9, x3 + w3, y + H - 9);
    f.texteAjuste(x3 + w3 / 2, y + H - 6.5, 'Phase : ' + (pr.phase || 'Etude d\'exécution'), 3.4, w3 - 4, { a: 'm', c: 'TITRE_CART' });
    f.texteAjuste(x3 + w3 / 2, y + 10, titrePlan, 5.0, w3 - 6, { a: 'm', c: 'TITRE_CART' });
    // colonne 4 : échelle, date, planche, auteur
    const x4 = x3 + w3;
    [26, 18, 9].forEach(function (h) { f.ligne(x4, y + h, x4 + w4, y + h); });
    f.texte(x4 + 2, y + 29, 'Echelle : ' + echelle, 2.5);
    f.texte(x4 + 2, y + 21, 'Date : ' + (pr.date || ''), 2.5);
    f.texte(x4 + 2, y + 12.5, 'Planche ' + num + ' / ' + total + '  —  Indice A', 2.4, { gras: true });
    f.texteAjuste(x4 + 2, y + 5, 'Dessiné : ' + (pr.auteur || 'Moulo Jean Claude'), 2.2, w4 - 4);
    f.texte(x4 + 2, y + 1.6, 'Dalot Pro CI ' + M.VERSION, 1.6, { c: 'TEXTE_GRIS' });
  }
  function cadre(f) { f.rect(6, 6, A3.w - 12, A3.h - 12, 'CADRE'); }

  /* Tableau de nomenclature au format des plans d'exécution : Pos | Ø | Nombre (élément, total) | Espacement | Schéma | Longueur | Longueur totale */
  const COLS = [['Pos.', 11], ['Diamètre\n(mm)', 14], ['dans un\nélément', 22], ['total', 14], ['Espacement\n(cm)', 18], ['Schéma', 66], ['Longueur\n(m)', 16], ['Longueur\ntotale (m)', 18]];
  const LARG_TAB = COLS.reduce(function (a, c) { return a + c[1]; }, 0);
  function enTeteTable(f, x0, y) {
    f.rect(x0, y - 12, LARG_TAB, 12, 'CADRE');
    let x = x0;
    COLS.forEach(function (c, i) {
      if (i) f.ligne(x, y - 12, x, y - (i === 2 || i === 3 ? 12 : 12));
      if (i === 2) { f.ligne(x, y - 6, x + COLS[2][1] + COLS[3][1], y - 6); f.texte(x + (COLS[2][1] + COLS[3][1]) / 2, y - 4.4, 'Nombre', 2.2, { a: 'm' }); }
      const lignes = c[0].split('\n'), y0 = (i === 2 || i === 3) ? y - 8.6 : y - 5 - (lignes.length - 1) * 1.4;
      lignes.forEach(function (t, j) { f.texte(x + c[1] / 2, y0 - j * 2.8, t, 2.0, { a: 'm' }); });
      x += c[1];
    });
  }
  function ligneTable(f, l, x0, y, h) {
    f.rect(x0, y - h, LARG_TAB, h, 'CADRE_FIN');
    let x = x0;
    const cells = [String(l.pos), String(l.phi), l.nElem + 'x' + l.nPar, String(l.nbre), l.esp ? espTxt(l.esp) : (l.constructif && /m²/.test(l.role) ? '3/m²' : '-'), null,
      fr(l.Lunit, 2) + (l.varie ? '\nmoyen' : ''), fr(l.Ltot, 2)];
    cells.forEach(function (s, i) {
      const w = COLS[i][1];
      if (i) f.ligne(x, y - h, x, y, 'CADRE_FIN');
      if (s === null) schema(f, l, x + 2, y - h + 1.2, w - 4, h - 2.4);
      else s.split('\n').forEach(function (t, j, a) { f.texte(x + w / 2, y - h / 2 - 0.8 + (a.length - 1) * 1.3 - j * 2.6, t, 2.2, { a: 'm' }); });
      x += w;
    });
  }
  function schema(f, l, x, y, w, h) {
    const s = l.segments.map(c0), sm = l.segMin ? l.segMin.map(c0) : null;
    const v = function (i) { return sm && sm[i] !== s[i] ? sm[i] + ' à ' + s[i] : s[i]; };
    const xm = x + w / 2, ym = y + h / 2, poly = function (pts) { f.prims.push({ t: 'p', pts: pts, c: 'ACIER', ferme: false }); };
    switch (l.forme) {
      case 'U-bas': poly([[x + 12, y + 1], [x + 12, y + h - 1.5], [x + w - 12, y + h - 1.5], [x + w - 12, y + 1]]); f.texte(xm, y + h - 3.6, v(1), 2.0, { a: 'm' }); f.texte(x + 11, ym - 0.8, v(0), 2.0, { a: 'd' }); f.texte(x + w - 11, ym - 0.8, v(2), 2.0); break;
      case 'U-haut': case 'crosse2': poly([[x + 12, y + h - 1], [x + 12, y + 1.5], [x + w - 12, y + 1.5], [x + w - 12, y + h - 1]]); f.texte(xm, y + 2.3, v(1), 2.0, { a: 'm' }); f.texte(x + 11, ym - 0.8, v(0), 2.0, { a: 'd' }); f.texte(x + w - 11, ym - 0.8, v(2), 2.0); break;
      case 'L': poly([[x + 14, y + h - 1], [x + 14, y + 1.2], [x + 28, y + 1.2]]); f.texte(x + 13, ym - 0.8, v(0), 2.0, { a: 'd' }); f.texte(x + 21, y + 2.2, v(1), 2.0, { a: 'm' }); break;
      case 'L-haut': poly([[x + 20, y + 1], [x + 20, y + h - 1.2], [x + 30, y + h - 1.2]]); f.texte(x + 19, ym - 0.8, v(0), 2.0, { a: 'd' }); f.texte(x + 25, y + h - 3.6, v(1), 2.0, { a: 'm' }); break;
      case 'crosse': poly([[x + 6, ym - 1], [x + w - 12, ym - 1], [x + w - 8, ym + 2.5]]); f.texte(xm - 3, ym + 0.2, v(1), 2.0, { a: 'm' }); f.texte(x + w - 6, ym + 1.5, v(0), 1.8); break;
      case 'gousset': poly([[x + 12, y + h - 0.8], [x + w / 2 - 5, y + h - 0.8], [x + w / 2 + 5, y + 0.8], [x + w - 12, y + 0.8]]); f.texte(x + 11, y + h - 2.6, v(0), 2.0, { a: 'd' }); f.texte(xm + 3, ym - 0.6, v(1), 2.0); f.texte(x + w - 11, y + 0.2, v(2), 2.0); break;
      case 'cadre': { const bw = Math.min(16, w / 3), bh = h - 2.4; f.prims.push({ t: 'p', pts: [[xm - bw / 2, y + 1.2], [xm + bw / 2, y + 1.2], [xm + bw / 2, y + 1.2 + bh], [xm - bw / 2, y + 1.2 + bh]], c: 'ACIER', ferme: true }); f.texte(xm, y + bh + 1.6, s[0], 1.9, { a: 'm' }); f.texte(xm - bw / 2 - 1, ym - 0.8, s[1], 1.9, { a: 'd' }); break; }
      case 'chaise': poly([[x + 10, y + 1.2], [x + 22, y + 1.2], [x + 22, y + h - 1.2], [x + w - 22, y + h - 1.2], [x + w - 22, y + 1.2], [x + w - 10, y + 1.2]]); f.texte(xm, y + h - 3.5, s[2], 2.0, { a: 'm' }); f.texte(x + 21, ym - 0.8, s[1], 1.9, { a: 'd' }); f.texte(x + 16, y + 2, s[0], 1.9, { a: 'm' }); break;
      case 'epingle': poly([[x + 16, ym + 1.5], [x + 14, ym - 1], [x + w - 14, ym - 1], [x + w - 16, ym + 1.5]]); f.texte(xm, ym - 0.2, s[1], 2.0, { a: 'm' }); f.texte(x + 12, ym + 0.8, s[0], 1.8, { a: 'd' }); break;
      default: poly([[x + 6, ym - 1], [x + w - 6, ym - 1]]); f.texte(xm, ym + 0.2, v(0), 2.0, { a: 'm' });
    }
  }
  function tableRecap(f, nm, x0, yTop, titreBeton, propreté) {
    f.texte(x0 + 70, yTop + 2, 'RÉCAPITULATION', 3.0, { a: 'm' });
    const n = nm.recap.length, wl = 30, wc = Math.min(18, 120 / Math.max(1, n)), W = wl + wc * n, rh = 8;
    const rows = [['DIAMETRES Ø', nm.recap.map(function (r) { return String(r.phi); })],
      ['Longueur totale [m]', nm.recap.map(function (r) { return fr(r.Ltot, 2); })],
      ['Poids au ml [kg]', nm.recap.map(function (r) { return fr(r.kgm, 3); })],
      ['Poids total [kg]', nm.recap.map(function (r) { return fr(r.masse, 2); })]];
    let y = yTop - 3;
    rows.forEach(function (r) {
      f.rect(x0, y - rh, W, rh, 'CADRE_FIN'); f.ligne(x0 + wl, y - rh, x0 + wl, y, 'CADRE_FIN');
      f.texteAjuste(x0 + 1.5, y - rh / 2 - 0.8, r[0], 2.1, wl - 2);
      r[1].forEach(function (s, i) { if (i) f.ligne(x0 + wl + i * wc, y - rh, x0 + wl + i * wc, y, 'CADRE_FIN'); f.texte(x0 + wl + i * wc + wc / 2, y - rh / 2 - 0.8, s, 2.1, { a: 'm' }); });
      y -= rh;
    });
    y -= 5;
    const lignes = [['Masse des positions', fr(nm.masse, 2) + ' kg'], ['Chutes et attentes', fr(nm.chutes, 2) + ' kg'], ['TOTAL ACIER Fe ' + (nm.fe || 500), fr(nm.total, 2) + ' kg'],
      [titreBeton, fr(nm.beton, 2) + ' m³'], ['Ratio', fr(nm.ratio, 2) + ' kg/m³']];
    if (propreté != null) lignes.push(['Béton de propreté', fr(propreté, 2) + ' m³']);
    lignes.forEach(function (q) {
      f.rect(x0, y - 6, 74, 6, 'CADRE_FIN'); f.ligne(x0 + 44, y - 6, x0 + 44, y, 'CADRE_FIN');
      f.texte(x0 + 1.5, y - 4.4, q[0], 2.1, { gras: /TOTAL/.test(q[0]) }); f.texte(x0 + 72.5, y - 4.4, q[1], 2.1, { a: 'd', gras: /TOTAL/.test(q[0]) });
      y -= 6;
    });
    return y;
  }
  /* Planche de nomenclature : une ou deux colonnes de tableau, récapitulatif à droite */
  function planNomenclature(f, titre, nm, titreBeton, proprete) {
    const yTop = A3.h - 18, yBas = CART_H + 16, n = nm.lignes.length;
    f.texte(A3.w / 2, yTop + 4, titre, 4.0, { a: 'm', gras: true });
    const dispo = yTop - 12 - yBas;
    let h = Math.min(12, dispo / Math.max(1, n));
    const deux = h < 7.5;
    if (deux) h = Math.min(12, dispo / Math.ceil(n / 2));
    const parCol = deux ? Math.ceil(n / 2) : n;
    const cols = deux ? [14, 14 + LARG_TAB + 6] : [14];
    cols.forEach(function (x0, ci) {
      const part = nm.lignes.slice(ci * parCol, (ci + 1) * parCol);
      if (!part.length) return;
      enTeteTable(f, x0, yTop); let y = yTop - 12;
      part.forEach(function (l) { ligneTable(f, l, x0, y, h); y -= h; });
    });
    const xr = deux ? 14 + LARG_TAB + 6 : 14 + LARG_TAB + 12;
    const yr = deux ? yTop - 12 - Math.ceil(n - parCol) * h - 14 : yTop - 8;
    if (yr - 70 > yBas || !deux) tableRecap(f, nm, xr, yr, titreBeton, proprete);
    else tableRecap(f, nm, xr, yBas + 72, titreBeton, proprete);
  }

  /* ------------------------------------------------------------------ */
  /* 7. Dossier de planches                                              */
  /* ------------------------------------------------------------------ */
  function planches(p, R) {
    const T = R.tetes || null, nm = nomenclature(p, R);
    const nmT = T ? nomenclatureTetes(p, R, T, nm.lignes.length + 1) : null, nmG = T ? nomenclatureGC(p, R, T) : null;
    [nm, nmT, nmG].forEach(function (x) { if (x) x.fe = R.mat.fe; });
    const des = designation(p), liste = [], zH = A3.h - 12 - (CART_H + 14); // hauteur utile
    const Y0 = CART_H + 14;
    const proprete = (R.geo.B + 0.2) * 0.1 * p.geo.longueur + (T && p.tetes.type === 'radier' && T.radier ? 2 * T.radier.surface * 0.1 : 0);
    function planche(titrePlan, fabrique) {
      const f = Feuille(); cadre(f);
      const ech = fabrique(f) || 'X';
      liste.push({ titre: titrePlan, prims: f.prims, ech: ech });
      return f;
    }
    const total = T ? (T.gc ? 8 : 7) : 4;
    let num = 0;
    // 1. Coffrage général
    planche('Plan de coffrage ' + des, function (f) {
      const e1 = vue(f, function (k) { return dessinVueEnPlan(p, R, T, k); }, { x: 12, y: Y0 + zH * 0.42, w: 228, h: zH * 0.58 }, 'VUE EN PLAN');
      vue(f, function (k) { return dessinCoupeAA(p, R, T, k); }, { x: 12, y: Y0, w: 228, h: zH * 0.42 }, 'COUPE A-A');
      vue(f, function (k) { return dessinCoupeBB(p, R, T, k); }, { x: 244, y: Y0 + zH * 0.42, w: 164, h: zH * 0.58 * (T ? 0.62 : 1) }, 'COUPE B-B');
      if (T) {
        vue(f, function (k) { return dessinDetailA(p, R, T, k); }, { x: 244, y: Y0 + zH * 0.42 + zH * 0.58 * 0.62, w: 70, h: zH * 0.58 * 0.38 }, 'DETAIL A');
        if (T.gc) vue(f, function (k) { return dessinCoffrageGC(p, R, T, k); }, { x: 316, y: Y0 + zH * 0.42 + zH * 0.58 * 0.62, w: 92, h: zH * 0.58 * 0.38 }, 'COFFRAGE GARDE-CORPS');
        vue(f, function (k) { const a = dessinCoupeCC(p, R, T, k, false), b = dessinCoupeCC(p, R, T, k, true), dd = Dessin(k);
          const ea = etendue(a.prims), eb = etendue(b.prims), dx = ea.x0 - eb.x1 - 18 * k;
          dd.prims.push.apply(dd.prims, a.prims); b.prims.forEach(function (q) { dd.prims.push(decaler(q, dx)); }); return dd; },
          { x: 244, y: Y0, w: 164, h: zH * 0.42 }, 'COUPE C-C : AILE D\'ENTREE ET DE SORTIE');
      }
      cartouche(f, p, 'Plan de coffrage ' + des, 'X', ++num, total);
      return e1;
    });
    if (T) planche('Plan de coffrage des têtes ' + des, function (f) {
      vue(f, function (k) { return dessinVueFaceTete(p, R, T, k); }, { x: 20, y: Y0 + zH * 0.48, w: 380, h: zH * 0.52 }, 'VUE DE FACE TETE D\'ENTREE ET SORTIE');
      vue(f, function (k) { return dessinPlanTete(p, R, T, k); }, { x: 20, y: Y0, w: 380, h: zH * 0.48 }, p.tetes.type === 'radier' ? 'VUE EN PLAN RADIER ENTREE ET SORTIE' : 'VUE EN PLAN SEMELLES DES MURS EN AILE');
      cartouche(f, p, 'Plan de coffrage têtes ' + des, 'X', ++num, total);
    });
    planche('Plan de ferraillage ' + des, function (f) {
      vue(f, function (k) { return dessinFerraillageCoupe(p, R, nm, k, true); }, { x: 12, y: Y0, w: 396, h: zH }, 'FERRAILLAGE SECTION MODULE');
      cartouche(f, p, 'Plan de ferraillage ' + des, 'X', ++num, total);
    });
    planche('Plan de ferraillage tablier et radier ' + des, function (f) {
      vue(f, function (k) { return dessinFerraillagePlan(p, R, nm, k, 'radier', T); }, { x: 30, y: Y0 + zH / 2, w: 360, h: zH / 2 }, 'FERRAILLAGE DU RADIER');
      vue(f, function (k) { return dessinFerraillagePlan(p, R, nm, k, 'dalle', T); }, { x: 30, y: Y0, w: 360, h: zH / 2 }, 'FERRAILLAGE DU TABLIER');
      cartouche(f, p, 'Plan de ferraillage ' + des, 'X', ++num, total);
    });
    planche('Tableau de nomenclature ' + des, function (f) {
      planNomenclature(f, 'NOMENCLATURE DES ACIERS DU MODULE', nm, 'BÉTON Q' + (p.mat.dosage || 400), proprete);
      cartouche(f, p, 'Tableau de nomenclature ' + des, '—', ++num, total);
    });
    if (T) {
      planche('Plan de ferraillage tête ' + des, function (f) {
        if (p.tetes.type === 'radier') {
          vue(f, function (k) { return dessinFerraillageAile(p, R, T, nmT, k); }, { x: 12, y: Y0 + zH * 0.45, w: 270, h: zH * 0.55 }, 'FERRAILLAGE MUR EN AILE');
          vue(f, function (k) { return dessinCoupeDD(p, R, T, k, 0, nmT); }, { x: 286, y: Y0 + zH * 0.45, w: 122, h: zH * 0.55 }, 'COUPE D-D');
          vue(f, function (k) { return dessinPlanTete(p, R, T, k, nmT); }, { x: 12, y: Y0, w: 396, h: zH * 0.45 }, 'VUE EN PLAN RADIER DU MUR EN AILE');
        } else {
          vue(f, function (k) { return dessinFerraillageAile(p, R, T, nmT, k); }, { x: 12, y: Y0 + zH * 0.48, w: 262, h: zH * 0.52 }, 'FERRAILLAGE MUR EN AILE');
          vue(f, function (k) { return dessinPlanTete(p, R, T, k, nmT); }, { x: 278, y: Y0 + zH * 0.48, w: 130, h: zH * 0.52 }, 'VUE EN PLAN SEMELLES');
          const nt = Math.min(4, T.troncons.length), wz = 396 / nt;
          T.troncons.slice(0, nt).forEach(function (o, i) {
            vue(f, function (k) { return dessinCoupeDD(p, R, T, k, i, nmT); }, { x: 12 + i * wz, y: Y0, w: wz - 2, h: zH * 0.48 }, 'COUPE TRONÇON ' + o.tr.i);
          });
        }
        cartouche(f, p, 'Plan de ferraillage tête ' + des, 'X', ++num, total);
      });
      planche('Nomenclature tête ' + des, function (f) {
        planNomenclature(f, 'NOMENCLATURE DES ACIERS DES MURS EN AILES', nmT, 'BÉTON Q' + (p.mat.dosage || 400), null);
        cartouche(f, p, 'Nomenclature tête ' + des, '—', ++num, total);
      });
      if (T.gc) planche('Plan de ferraillage et nomenclature garde-corps ' + des, function (f) {
        const yTop = A3.h - 18;
        f.texte(14 + LARG_TAB / 2, yTop + 4, 'NOMENCLATURE DES ACIERS DU GARDE-CORPS', 4.0, { a: 'm', gras: true });
        enTeteTable(f, 14, yTop); let y = yTop - 12; const h = Math.min(14, (yTop - 12 - (CART_H + 16)) / nmG.lignes.length);
        nmG.lignes.forEach(function (l) { ligneTable(f, l, 14, y, h); y -= h; });
        tableRecap(f, nmG, 14 + LARG_TAB + 14, yTop - 8, 'BÉTON Q' + (p.mat.dosage || 400), null);
        vue(f, function (k) { return dessinFerraillageGC(p, R, T, k, nmG); }, { x: 14 + LARG_TAB + 10, y: Y0 + 6, w: A3.w - 14 - LARG_TAB - 22, h: zH * 0.55 }, 'FERRAILLAGE DU GARDE-CORPS');
        f.texte(14 + LARG_TAB + 12, Y0 + 1, 'Ferraillage constructif, non calculé : à adapter au cahier des charges.', 2.2, { c: 'TEXTE_GRIS' });
        cartouche(f, p, 'Plan de ferraillage et nomenclature garde-corps ' + des, '—', ++num, total);
      });
    }
    return { nomenclature: nm, nomenclatureTetes: nmT, nomenclatureGC: nmG, planches: liste };
  }
  function decaler(q, dx) {
    if (q.t === 'l') return Object.assign({}, q, { x1: q.x1 + dx, x2: q.x2 + dx });
    if (q.t === 'p') return Object.assign({}, q, { pts: q.pts.map(function (v) { return [v[0] + dx, v[1]]; }) });
    return Object.assign({}, q, { x: q.x + dx });
  }

  /* ------------------------------------------------------------------ */
  /* 8. Rendus SVG et DXF                                                */
  /* ------------------------------------------------------------------ */
  const STYLE = {
    CADRE: { w: 0.45, col: '#111' }, CADRE_FIN: { w: 0.15, col: '#444' }, COFFRAGE: { w: 0.4, col: '#111' }, VU: { w: 0.25, col: '#333' },
    VIDE: { w: 0.01, col: '#ffffff' }, PROPRETE: { w: 0.15, col: '#777' }, TERRAIN: { w: 0.25, col: '#6b4a2b' }, CACHE: { w: 0.2, col: '#555', dash: '2 1.2' },
    AXES: { w: 0.18, col: '#555', dash: '6 1.2 1 1.2' }, COTES: { w: 0.13, col: '#111' }, RAPPEL: { w: 0.13, col: '#333' }, REPERE: { w: 0.15, col: '#c0261c' },
    HACHURE: { w: 0.1, col: '#666' }, COUPE: { w: 0.5, col: '#c0261c' },
    ACIER: { w: 0.45, col: '#d01c12' }, ACIER_FIN: { w: 0.2, col: '#d01c12' }, ACIER_INF: { w: 0.45, col: '#d01c12', dash: '3 1.5' }, ACIER_REP: { w: 0.2, col: '#d01c12' },
    TEXTE: { col: '#111' }, TEXTE_GRIS: { col: '#666' }, TEXTE_ACIER: { col: '#111' }, TITRE: { col: '#555' }, TITRE_CART: { col: '#111' }
  };
  const COULEUR_DXF = { CADRE: 7, CADRE_FIN: 8, COFFRAGE: 7, VU: 8, VIDE: 7, PROPRETE: 8, TERRAIN: 32, CACHE: 8, AXES: 8, COTES: 7, RAPPEL: 7, REPERE: 1,
    HACHURE: 8, COUPE: 1, ACIER: 1, ACIER_FIN: 1, ACIER_INF: 1, ACIER_REP: 1, TEXTE: 7, TEXTE_GRIS: 8, TEXTE_ACIER: 7, TITRE: 8, TITRE_CART: 7 };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function versSVG(planche) {
    const H = A3.h, o = [];
    o.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + A3.w + ' ' + H + '" class="planche-svg" role="img" aria-label="' + esc(planche.titre) + '">');
    o.push('<rect x="0" y="0" width="' + A3.w + '" height="' + H + '" fill="#fff"/>');
    planche.prims.forEach(function (q) {
      if (q.c === 'VIDE') return;
      const st = STYLE[q.c] || STYLE.CADRE, trait = ' stroke="' + st.col + '" stroke-width="' + (st.w || 0.2) + '"' + (st.dash ? ' stroke-dasharray="' + st.dash + '"' : '');
      if (q.t === 'l') o.push('<line x1="' + q.x1.toFixed(2) + '" y1="' + (H - q.y1).toFixed(2) + '" x2="' + q.x2.toFixed(2) + '" y2="' + (H - q.y2).toFixed(2) + '"' + trait + ' stroke-linecap="round"/>');
      else if (q.t === 'p') o.push('<' + (q.ferme ? 'polygon' : 'polyline') + ' points="' + q.pts.map(function (v) { return v[0].toFixed(2) + ',' + (H - v[1]).toFixed(2); }).join(' ') + '" fill="none"' + trait + ' stroke-linejoin="round"/>');
      else if (q.t === 'c') o.push('<circle cx="' + q.x.toFixed(2) + '" cy="' + (H - q.y).toFixed(2) + '" r="' + q.r.toFixed(2) + '"' + (q.plein ? ' fill="' + st.col + '"' : ' fill="none"' + trait) + '/>');
      else if (q.t === 't') {
        const anc = q.a === 'm' ? 'middle' : (q.a === 'd' ? 'end' : 'start');
        const tr = q.rot ? ' transform="rotate(' + (-q.rot) + ' ' + q.x.toFixed(2) + ' ' + (H - q.y).toFixed(2) + ')"' : '';
        o.push('<text x="' + q.x.toFixed(2) + '" y="' + (H - q.y).toFixed(2) + '" font-size="' + q.h.toFixed(2) + '" text-anchor="' + anc + '" fill="' + st.col + '"' + (q.gras ? ' font-weight="700"' : '') + tr + '>' + esc(q.s) + '</text>');
      }
    });
    o.push('</svg>');
    return o.join('');
  }

  function versDXF(liste) {
    const o = [];
    function c(code, val) { o.push(String(code)); o.push(String(val)); }
    function texteDxf(s) { return String(s).replace(/[^\x20-\x7e]/g, function (ch) { return '\\U+' + ch.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0'); }); }
    function n(v) { return (Math.round(v * 1000) / 1000).toString(); }
    c(0, 'SECTION'); c(2, 'HEADER'); c(9, '$ACADVER'); c(1, 'AC1009'); c(9, '$INSUNITS'); c(70, 4); c(0, 'ENDSEC');
    c(0, 'SECTION'); c(2, 'TABLES');
    c(0, 'TABLE'); c(2, 'LTYPE'); c(70, 3);
    c(0, 'LTYPE'); c(2, 'CONTINUOUS'); c(70, 0); c(3, 'Continu'); c(72, 65); c(73, 0); c(40, 0);
    c(0, 'LTYPE'); c(2, 'TIRETS'); c(70, 0); c(3, 'Tirets'); c(72, 65); c(73, 2); c(40, 3.5); c(49, 2.5); c(49, -1);
    c(0, 'LTYPE'); c(2, 'AXE'); c(70, 0); c(3, 'Axe'); c(72, 65); c(73, 4); c(40, 9.4); c(49, 6); c(49, -1.2); c(49, 1); c(49, -1.2);
    c(0, 'ENDTAB');
    const calques = Object.keys(COULEUR_DXF);
    c(0, 'TABLE'); c(2, 'LAYER'); c(70, calques.length);
    calques.forEach(function (k) { c(0, 'LAYER'); c(2, k); c(70, 0); c(62, COULEUR_DXF[k]); c(6, (k === 'CACHE' || k === 'ACIER_INF') ? 'TIRETS' : (k === 'AXES' ? 'AXE' : 'CONTINUOUS')); });
    c(0, 'ENDTAB'); c(0, 'ENDSEC');
    c(0, 'SECTION'); c(2, 'ENTITIES');
    liste.forEach(function (pl, i) {
      const dx = i * (A3.w + 20);
      pl.prims.forEach(function (q) {
        if (q.c === 'VIDE') return;
        if (q.t === 'l') { c(0, 'LINE'); c(8, q.c); c(10, n(q.x1 + dx)); c(20, n(q.y1)); c(30, 0); c(11, n(q.x2 + dx)); c(21, n(q.y2)); c(31, 0); }
        else if (q.t === 'p') {
          const pts = q.ferme ? q.pts.concat([q.pts[0]]) : q.pts;
          for (let j = 0; j < pts.length - 1; j++) { c(0, 'LINE'); c(8, q.c); c(10, n(pts[j][0] + dx)); c(20, n(pts[j][1])); c(30, 0); c(11, n(pts[j + 1][0] + dx)); c(21, n(pts[j + 1][1])); c(31, 0); }
        } else if (q.t === 'c') { c(0, 'CIRCLE'); c(8, q.c); c(10, n(q.x + dx)); c(20, n(q.y)); c(30, 0); c(40, n(q.r)); }
        else if (q.t === 't') {
          c(0, 'TEXT'); c(8, q.c); c(10, n(q.x + dx)); c(20, n(q.y)); c(30, 0); c(40, n(q.h)); c(1, texteDxf(q.s));
          if (q.rot) c(50, q.rot);
          const j = q.a === 'm' ? 1 : (q.a === 'd' ? 2 : 0);
          if (j) { c(72, j); c(11, n(q.x + dx)); c(21, n(q.y)); c(31, 0); }
        }
      });
    });
    c(0, 'ENDSEC'); c(0, 'EOF');
    return o.join('\r\n') + '\r\n';
  }

  return { nomenclature: nomenclature, nomenclatureTetes: nomenclatureTetes, nomenclatureGC: nomenclatureGC, planches: planches,
    dessinFerraillageCoupe: function (p, R, nm, k) { return dessinFerraillageCoupe(p, R, nm, k, false); },
    versSVG: versSVG, versDXF: versDXF, repere: repere, masseLineique: masseLineique, etendue: etendue, A3: A3, designation: designation };
});
