/*
 * PLANS ET FERRAILLAGE — Dalot Pro CI
 * Auteur : Moulo Jean Claude — Technicien génie civil BTP, Abidjan
 * Produit, à partir des résultats du moteur de calcul :
 *   - la nomenclature des aciers (positions, façonnage, longueurs, masses) ;
 *   - les planches A3 (coffrage, ferraillage en coupe, ferraillage en plan, nomenclature) sous forme
 *     de primitives graphiques indépendantes du rendu ;
 *   - leur rendu SVG (écran, impression) et DXF (AutoCAD, R12).
 * Organisation inspirée du dossier de plans de CYPE « Ponts-cadres » (composition de plans, cartouche, nomenclature).
 * Aucune équation de résistance ici : seules des règles de façonnage et de dessin.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./moteur-dalot.cjs'));
  else root.DalotPlans = factory(root.DalotMoteur);
})(typeof self !== 'undefined' ? self : this, function (M) {
  'use strict';
  const BARRE_COMMERCIALE = 12; // m
  const A3 = { w: 420, h: 297 };
  const ECHELLES = [10, 20, 25, 50, 75, 100, 125, 150, 200, 250, 500];

  function fr(v, d) { return Number(v).toFixed(d).replace('.', ','); }
  function cm(v) { return Math.ceil(v * 100 - 1e-6) / 100; } // arrondi au cm supérieur, en m
  function cinq(v) { return Math.ceil(v * 20 - 1e-6) / 20; } // arrondi aux 5 cm supérieurs
  function nbBarres(long, e) { return Math.floor((long + 1e-9) / e) + 1; }
  function masseLineique(phi) { return Math.PI * phi * phi / 4 * 1e-6 * 7850; } // kg/m

  /* ------------------------------------------------------------------ */
  /* 1. Nomenclature des aciers                                          */
  /* ------------------------------------------------------------------ */
  function nomenclature(p, R) {
    const g = p.geo, geo = R.geo, B = geo.B, He = geo.Hext, H = g.H;
    const cE = p.mat.enrobageExt, cI = p.mat.enrobageInt, Lg = g.longueur, n = geo.n;
    const F = function (id) { return R.ferraillage.find(function (f) { return f.id === id; }); };
    const lignes = [];
    function ajout(o) {
      if (!o.phi || !o.esp || !(o.nbre > 0)) return;
      const segs = o.segments.map(cm);
      let L = segs.reduce(function (a, b) { return a + b; }, 0), nrec = 0;
      const lr = M.ancrage(o.phi, R.mat).lr;
      if (L > BARRE_COMMERCIALE) { nrec = Math.ceil((L - BARRE_COMMERCIALE) / (BARRE_COMMERCIALE - lr)); L = cm(L + nrec * lr); }
      const kgm = masseLineique(o.phi);
      lignes.push({ pos: lignes.length + 1, id: o.id, element: o.element, role: o.role, phi: o.phi, esp: o.esp, nbre: o.nbre,
        forme: o.forme, segments: segs, Lunit: L, recouvrements: nrec, Ltot: L * o.nbre, kgm: kgm, masse: L * o.nbre * kgm,
        principale: !!o.principale });
    }
    const nL = function (e) { return nbBarres(Lg - 2 * cE, e); };
    const ds = F('ds_sup'), di = F('ds_inf'), ru = F('rd_inf'), rs = F('rd_sup'), pe = F('pd_ext'), pi = F('pd_int'), cl = F('cl');
    const lr = function (f) { return f && f.barres ? M.ancrage(f.barres.phi, R.mat).lr : 0; };
    // Armatures principales (dans le plan de la coupe), réparties sur la longueur de l'ouvrage
    if (ds && ds.barres) ajout({ id: 'ds_sup', element: 'Dalle supérieure', role: 'nappe supérieure, chapeaux d\'angle en U', principale: true,
      phi: ds.barres.phi, esp: ds.barres.esp, nbre: nL(ds.barres.esp), forme: 'U-bas',
      segments: [cinq(Math.max(lr(ds), g.es)), B - 2 * cE, cinq(Math.max(lr(ds), g.es))] });
    if (di && di.barres) ajout({ id: 'ds_inf', element: 'Dalle supérieure', role: 'nappe inférieure, barres filantes', principale: true,
      phi: di.barres.phi, esp: di.barres.esp, nbre: nL(di.barres.esp), forme: 'droit', segments: [B - 2 * cE] });
    if (ru && ru.barres) ajout({ id: 'rd_inf', element: 'Radier', role: 'nappe inférieure, chapeaux d\'angle en U', principale: true,
      phi: ru.barres.phi, esp: ru.barres.esp, nbre: nL(ru.barres.esp), forme: 'U-haut',
      segments: [cinq(Math.max(lr(ru), g.er)), B - 2 * cE, cinq(Math.max(lr(ru), g.er))] });
    if (rs && rs.barres) ajout({ id: 'rd_sup', element: 'Radier', role: 'nappe supérieure, barres filantes', principale: true,
      phi: rs.barres.phi, esp: rs.barres.esp, nbre: nL(rs.barres.esp), forme: 'droit', segments: [B - 2 * cE] });
    if (pe && pe.barres) ajout({ id: 'pd_ext', element: 'Piédroits', role: 'face extérieure, côté terre', principale: true,
      phi: pe.barres.phi, esp: pe.barres.esp, nbre: 2 * nL(pe.barres.esp), forme: 'vertical', segments: [He - 2 * cE] });
    if (pi && pi.barres) ajout({ id: 'pd_int', element: 'Piédroits', role: 'face intérieure, côté eau', principale: true,
      phi: pi.barres.phi, esp: pi.barres.esp, nbre: 2 * nL(pi.barres.esp), forme: 'vertical', segments: [He - 2 * cE] });
    if (cl && cl.barres && n > 1) ajout({ id: 'cl', element: 'Cloisons', role: 'deux faces', principale: true,
      phi: cl.barres.phi, esp: cl.barres.esp, nbre: 2 * (n - 1) * nL(cl.barres.esp), forme: 'vertical', segments: [He - 2 * cE] });
    if (g.gousset > 0) {
      const phiG = Math.max(10, pi && pi.barres ? pi.barres.phi : 10), ls = M.ancrage(phiG, R.mat).ls;
      ajout({ id: 'gousset', element: 'Goussets', role: 'barres pliées, 4 angles par cellule', principale: true,
        phi: phiG, esp: 0.2, nbre: 4 * n * nL(0.2), forme: 'gousset', segments: [cinq(ls), g.gousset * Math.SQRT2 + 2 * cI, cinq(ls)] });
    }
    // Armatures de répartition (parallèles à l'axe de l'ouvrage)
    const longRep = Lg - 2 * cE;
    function rep(id, f, element, role, largeur, faces) {
      if (!f || !f.rep) return;
      ajout({ id: id, element: element, role: role, phi: f.rep.phi, esp: f.rep.esp, nbre: faces * nbBarres(largeur, f.rep.esp),
        forme: 'longitudinal', segments: [longRep] });
    }
    rep('rep_ds_sup', ds, 'Dalle supérieure', 'répartition, nappe supérieure', B - 2 * cE, 1);
    rep('rep_ds_inf', di, 'Dalle supérieure', 'répartition, nappe inférieure', B - 2 * cE, 1);
    rep('rep_rd_inf', ru, 'Radier', 'répartition, nappe inférieure', B - 2 * cE, 1);
    rep('rep_rd_sup', rs, 'Radier', 'répartition, nappe supérieure', B - 2 * cE, 1);
    rep('rep_pd_ext', pe, 'Piédroits', 'répartition, face extérieure', H, 2);
    rep('rep_pd_int', pi, 'Piédroits', 'répartition, face intérieure', H, 2);
    if (n > 1) rep('rep_cl', cl, 'Cloisons', 'répartition, deux faces', H, 2 * (n - 1));

    const parPhi = {};
    lignes.forEach(function (l) {
      const r = parPhi[l.phi] || (parPhi[l.phi] = { phi: l.phi, Ltot: 0, masse: 0, kgm: l.kgm });
      r.Ltot += l.Ltot; r.masse += l.masse;
    });
    const recap = Object.keys(parPhi).map(Number).sort(function (a, b) { return a - b; }).map(function (k) { return parPhi[k]; });
    const masse = lignes.reduce(function (a, l) { return a + l.masse; }, 0);
    const chutes = masse * p.metre.majorationAcier / 100;
    return { lignes: lignes, recap: recap, masse: masse, chutes: chutes, total: masse + chutes,
      ratio: (masse + chutes) / R.metre.beton, barreCommerciale: BARRE_COMMERCIALE };
  }
  function repere(l) { return 'P' + l.pos + ' : ' + l.nbre + ' HA' + l.phi + ' e=' + fr(l.esp * 100, l.esp * 100 % 1 ? 1 : 0); }

  /* ------------------------------------------------------------------ */
  /* 2. Primitives graphiques (unités du dessin : m ; texte : mm papier)  */
  /* ------------------------------------------------------------------ */
  function Dessin(k) { // k = mètres réels par mm de papier (échelle / 1000)
    const P = [];
    const d = {
      k: k, prims: P,
      ligne: function (x1, y1, x2, y2, c) { P.push({ t: 'l', x1: x1, y1: y1, x2: x2, y2: y2, c: c }); },
      poly: function (pts, c, ferme) { P.push({ t: 'p', pts: pts, c: c, ferme: !!ferme }); },
      rond: function (x, y, rMm, c, plein) { P.push({ t: 'c', x: x, y: y, r: rMm * k, c: c, plein: !!plein }); },
      texte: function (x, y, s, hMm, opts) {
        opts = opts || {};
        P.push({ t: 't', x: x, y: y, s: String(s), h: hMm * k, a: opts.a || 'g', rot: opts.rot || 0, c: opts.c || 'TEXTE', gras: !!opts.gras });
      },
      // Cote horizontale ou verticale ; dec en mm papier (signe : côté)
      cote: function (x1, y1, x2, y2, decMm, s) {
        const dec = decMm * k, t = 1.2 * k, vert = Math.abs(x2 - x1) < 1e-9;
        if (Math.abs(vert ? y2 - y1 : x2 - x1) < 1e-6) return;
        if (vert) {
          const x = x1 + dec;
          d.ligne(x1, y1, x + Math.sign(dec) * 1.5 * k, y1, 'COTES'); d.ligne(x2, y2, x + Math.sign(dec) * 1.5 * k, y2, 'COTES');
          d.ligne(x, y1, x, y2, 'COTES');
          d.ligne(x - t, y1 - t, x + t, y1 + t, 'COTES'); d.ligne(x - t, y2 - t, x + t, y2 + t, 'COTES');
          d.texte(x - 1.0 * k, (y1 + y2) / 2, s, 2.2, { a: 'm', rot: 90, c: 'COTES' });
        } else {
          const y = y1 + dec;
          d.ligne(x1, y1, x1, y + Math.sign(dec) * 1.5 * k, 'COTES'); d.ligne(x2, y2, x2, y + Math.sign(dec) * 1.5 * k, 'COTES');
          d.ligne(x1, y, x2, y, 'COTES');
          d.ligne(x1 - t, y - t, x1 + t, y + t, 'COTES'); d.ligne(x2 - t, y - t, x2 + t, y + t, 'COTES');
          d.texte((x1 + x2) / 2, y + 1.0 * k, s, 2.2, { a: 'm', c: 'COTES' });
        }
      },
      // Étiquette avec ligne de rappel : point d'ancrage (m) -> texte (m)
      rappel: function (xa, ya, xt, yt, s, cote) {
        d.rond(xa, ya, 0.6, 'ACIER', true);
        const largeur = s.length * 2.5 * 0.62 * k;
        const xFin = cote === 'd' ? xt + largeur : xt - largeur;
        d.ligne(xa, ya, xt, yt, 'RAPPEL');
        d.ligne(xt, yt, xFin, yt, 'RAPPEL');
        d.texte(cote === 'd' ? xt + 0.5 * k : xFin + 0.5 * k, yt + 0.8 * k, s, 2.5, { c: 'TEXTE_ACIER' });
      }
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
        const L = q.s.length * q.h * 0.62, hz = q.rot === 90;
        const dx = q.a === 'm' ? L / 2 : (q.a === 'd' ? L : 0);
        if (hz) { pt(q.x - q.h, q.y - dx); pt(q.x + 0.3 * q.h, q.y - dx + L); }
        else { pt(q.x - dx, q.y - 0.3 * q.h); pt(q.x - dx + L, q.y + q.h); }
      }
    });
    return { x0: x0, y0: y0, x1: x1, y1: y1, w: x1 - x0, h: y1 - y0 };
  }

  /* Contour béton de la coupe (avec goussets) */
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

  /* ------------------------------------------------------------------ */
  /* 3. Dessins                                                          */
  /* ------------------------------------------------------------------ */
  function dessinCoffrage(p, R, k) {
    const d = Dessin(k), g = p.geo, geo = R.geo, B = geo.B, He = geo.Hext, cel = cellules(p, geo);
    const deb = Math.max(0.3, 0.08 * B);
    // terrain : remblai et chaussée
    const ys = He + g.Hr + g.ech;
    d.ligne(-deb, ys, B + deb, ys, 'TERRAIN');
    if (g.ech > 0) d.ligne(-deb, He + g.Hr, B + deb, He + g.Hr, 'TERRAIN');
    d.texte(-deb, ys + 1.2 * k, 'Chaussée' + (g.ech > 0 ? ' (' + fr(g.ech * 100, 0) + ' cm)' : ''), 2.2, { c: 'TEXTE' });
    // béton de propreté
    d.poly([[-0.1, 0], [B + 0.1, 0], [B + 0.1, -0.1], [-0.1, -0.1]], 'PROPRETE', true);
    d.poly([[0, 0], [B, 0], [B, He], [0, He]], 'COFFRAGE', true);
    cel.forEach(function (c) { d.poly(polyCellule(c, g.gousset), 'COFFRAGE', true); });
    // cotes horizontales
    const xs = [0];
    cel.forEach(function (c) { xs.push(c.x1, c.x2); });
    xs.push(B);
    for (let i = 0; i < xs.length - 1; i++) d.cote(xs[i], 0, xs[i + 1], 0, -7, fr((xs[i + 1] - xs[i]) * 100, 0));
    d.cote(0, 0, B, 0, -14, fr(B * 100, 0));
    // cotes verticales
    d.cote(0, 0, 0, g.er, -7, fr(g.er * 100, 0)); d.cote(0, g.er, 0, g.er + g.H, -7, fr(g.H * 100, 0));
    d.cote(0, g.er + g.H, 0, He, -7, fr(g.es * 100, 0)); d.cote(0, 0, 0, He, -14, fr(He * 100, 0));
    if (g.Hr + g.ech > 0) d.cote(B, He, B, ys, 7, fr((g.Hr + g.ech) * 100, 0));
    if (g.gousset > 0) d.texte(cel[0].x1 + g.gousset + 0.05, cel[0].y2 - g.gousset - 0.02, 'gousset ' + fr(g.gousset * 100, 0) + '×' + fr(g.gousset * 100, 0), 2.0, { c: 'COTES' });
    d.texte(0, -21 * k, 'Béton de propreté dosé à 150 kg/m³, épaisseur 10 cm, débord 10 cm', 2.0, { c: 'TEXTE' });
    return d;
  }

  function dessinPlanMasse(p, R, k) {
    const d = Dessin(k), g = p.geo, geo = R.geo, B = geo.B, Lg = g.longueur, cel = cellules(p, geo);
    d.poly([[0, 0], [B, 0], [B, Lg], [0, Lg]], 'COFFRAGE', true);
    cel.forEach(function (c) { d.ligne(c.x1, 0, c.x1, Lg, 'CACHE'); d.ligne(c.x2, 0, c.x2, Lg, 'CACHE'); });
    // chaussée
    const Lr = Math.min(p.charges.largeurRoulable || 0, Lg);
    if (Lr > 0) {
      const y1 = (Lg - Lr) / 2;
      d.ligne(-0.8, y1, B + 0.8, y1, 'AXES'); d.ligne(-0.8, y1 + Lr, B + 0.8, y1 + Lr, 'AXES');
      d.texte(B + 1.0, Lg / 2, 'Chaussée ' + fr(Lr, 2) + ' m', 2.2, { a: 'm', rot: 90 });
    }
    d.ligne(-0.8, Lg / 2, B + 0.8, Lg / 2, 'AXES');
    // sens d'écoulement
    const xf = cel[0].x1 + (cel[0].x2 - cel[0].x1) / 2;
    d.ligne(xf, 0.15 * Lg, xf, 0.85 * Lg, 'TEXTE');
    d.poly([[xf - 1.2 * k, 0.85 * Lg - 3 * k], [xf, 0.85 * Lg], [xf + 1.2 * k, 0.85 * Lg - 3 * k]], 'TEXTE', false);
    d.texte(xf + 1.2 * k, 0.6 * Lg, 'Écoulement', 2.2, { rot: 90 });
    d.cote(0, 0, B, 0, -7, fr(B * 100, 0));
    d.cote(0, 0, 0, Lg, -7, fr(Lg * 100, 0));
    return d;
  }

  function dessinFerraillageCoupe(p, R, nomen, k) {
    const d = Dessin(k), g = p.geo, geo = R.geo, B = geo.B, He = geo.Hext, cel = cellules(p, geo);
    const cE = p.mat.enrobageExt, cI = p.mat.enrobageInt;
    d.poly([[0, 0], [B, 0], [B, He], [0, He]], 'COFFRAGE', true);
    cel.forEach(function (c) { d.poly(polyCellule(c, g.gousset), 'COFFRAGE', true); });
    const L = {}; nomen.lignes.forEach(function (l) { L[l.id] = l; });
    const c0 = cel[0], xm0 = (c0.x1 + c0.x2) / 2;
    const off = function (l) { return l ? l.phi / 1000 : 0; };
    const lignesTexte = 4.2 * k; // pas vertical des étiquettes
    // nappes et étiquettes
    if (L.ds_sup) {
      const l = L.ds_sup, b = l.segments[0], y = He - cE;
      d.poly([[cE, y - b], [cE, y], [B - cE, y], [B - cE, y - b]], 'ACIER');
      d.rappel(B * 0.3, y, B * 0.3 + 3 * k, He + 6 * k, repere(l), 'd');
    }
    if (L.ds_inf) {
      const l = L.ds_inf, y = He - g.es + cI;
      d.ligne(cE, y, B - cE, y, 'ACIER');
      d.rappel(xm0 + 0.15 * (c0.x2 - c0.x1), y, xm0, y - 8 * k, repere(l), 'd');
    }
    if (L.rd_inf) {
      const l = L.rd_inf, b = l.segments[0], y = cE;
      d.poly([[cE, y + b], [cE, y], [B - cE, y], [B - cE, y + b]], 'ACIER');
      d.rappel(B * 0.3, y, B * 0.3 + 3 * k, -8 * k, repere(l), 'd');
    }
    if (L.rd_sup) {
      const l = L.rd_sup, y = g.er - cI;
      d.ligne(cE, y, B - cE, y, 'ACIER');
      d.rappel(xm0 + 0.15 * (c0.x2 - c0.x1), y, xm0, y + 8 * k, repere(l), 'd');
    }
    if (L.pd_ext) {
      const l = L.pd_ext, x = cE + off(L.ds_sup);
      d.ligne(x, cE, x, He - cE, 'ACIER'); d.ligne(B - x, cE, B - x, He - cE, 'ACIER');
      d.rappel(x, He * 0.55, -6 * k, He * 0.55 + 6 * k, repere(l), 'g');
    }
    if (L.pd_int) {
      const l = L.pd_int, x = g.ep - cI;
      d.ligne(x, cE, x, He - cE, 'ACIER'); d.ligne(B - x, cE, B - x, He - cE, 'ACIER');
      d.rappel(x, He * 0.42, -6 * k, He * 0.42 - 6 * k, repere(l), 'g');
    }
    if (L.cl) {
      const l = L.cl;
      for (let i = 1; i < cel.length; i++) {
        const xa = cel[i - 1].x2 + cI, xb = cel[i].x1 - cI;
        d.ligne(xa, cE, xa, He - cE, 'ACIER'); d.ligne(xb, cE, xb, He - cE, 'ACIER');
      }
      d.rappel(cel[0].x2 + cI, He * 0.5, cel[0].x2 - 0.35 * (c0.x2 - c0.x1), He * 0.5 + lignesTexte, repere(l), 'g');
    }
    if (L.gousset && g.gousset > 0) {
      const l = L.gousset, ls = l.segments[0], s2 = Math.SQRT1_2, kg = g.gousset;
      cel.forEach(function (c, i) {
        // quatre angles : partie inclinée parallèle au gousset (décalée de cI vers le béton), pattes de longueur ls
        // l'une dans la paroi verticale, l'autre dans la dalle ou le radier
        [[c.x1, c.y2, 1, 1], [c.x2, c.y2, -1, 1], [c.x1, c.y1, 1, -1], [c.x2, c.y1, -1, -1]].forEach(function (q) {
          const kx = q[2], ky = q[3], ox = -kx * cI * s2, oy = ky * cI * s2, ux = kx * s2, uy = ky * s2;
          const W = [q[0] + ox - ux * cI, q[1] - ky * kg + oy - uy * cI], S = [q[0] + kx * kg + ox + ux * cI, q[1] + oy + uy * cI];
          d.poly([[W[0], W[1] - ky * ls], W, S, [S[0] + kx * ls, S[1]]], 'ACIER', false);
        });
        if (i === 0) d.rappel(c.x1 + g.gousset / 2 - cI * s2, c.y2 - g.gousset / 2 - cI * s2, xm0 - 0.1 * (c0.x2 - c0.x1), c.y2 - g.gousset - 6 * k, repere(l), 'd');
      });
    }
    // armatures de répartition : points le long des faces
    function points(x1, y1, x2, y2, e) {
      const long = Math.hypot(x2 - x1, y2 - y1), nb = nbBarres(long, e);
      for (let i = 0; i < nb; i++) { const t = nb > 1 ? i / (nb - 1) : 0.5; d.rond(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, 0.45, 'ACIER_REP', true); }
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
    // légende des répartitions sous le dessin
    const reps = nomen.lignes.filter(function (l) { return !l.principale; });
    let y = -18 * k;
    d.texte(0, y, 'Armatures de répartition (points), parallèles à l\'axe de l\'ouvrage :', 2.5, { gras: true });
    reps.forEach(function (l) { y -= lignesTexte; d.texte(0, y, repere(l) + ' — ' + l.element.toLowerCase() + ', ' + l.role.replace('répartition, ', ''), 2.3, { c: 'TEXTE_ACIER' }); });
    return d;
  }

  /* Vue en plan d'une dalle (dalle supérieure ou radier) : une barre type par nappe et par direction */
  function dessinFerraillagePlan(p, R, nomen, k, quelle) {
    const d = Dessin(k), g = p.geo, B = R.geo.B, Lg = g.longueur, cE = p.mat.enrobageExt;
    const L = {}; nomen.lignes.forEach(function (l) { L[l.id] = l; });
    const sup = quelle === 'dalle' ? L.ds_sup : L.rd_sup, inf = quelle === 'dalle' ? L.ds_inf : L.rd_inf;
    const rSup = quelle === 'dalle' ? L.rep_ds_sup : L.rep_rd_sup, rInf = quelle === 'dalle' ? L.rep_ds_inf : L.rep_rd_inf;
    d.poly([[0, 0], [B, 0], [B, Lg], [0, Lg]], 'COFFRAGE', true);
    const cel = cellules(p, R.geo);
    cel.forEach(function (c) { d.ligne(c.x1, 0, c.x1, Lg, 'CACHE'); d.ligne(c.x2, 0, c.x2, Lg, 'CACHE'); });
    function principale(l, y, calque, cote) {
      if (!l) return;
      d.ligne(cE, y, B - cE, y, calque);
      d.ligne(B - cE, y, B + 3 * k, y, 'RAPPEL');
      d.texte(B + 4 * k, y - 0.9 * k, repere(l) + (cote === 'h' ? ' (sup.)' : ' (inf.)'), 2.5, { c: 'TEXTE_ACIER' });
    }
    function repartition(l, x, calque) {
      if (!l) return;
      d.ligne(x, cE, x, Lg - cE, calque);
      d.ligne(x, Lg - cE, x, Lg + 3 * k, 'RAPPEL');
      d.texte(x + 0.9 * k, Lg + 4 * k, repere(l), 2.5, { rot: 90, c: 'TEXTE_ACIER' });
    }
    principale(sup, Lg * 0.62, 'ACIER', 'h');
    principale(inf, Lg * 0.38, 'ACIER_INF', 'b');
    repartition(rSup, B * 0.66, 'ACIER');
    repartition(rInf, B * 0.34, 'ACIER_INF');
    d.cote(0, 0, B, 0, -7, fr(B * 100, 0));
    d.cote(0, 0, 0, Lg, -7, fr(Lg * 100, 0));
    d.texte(0, -15 * k, 'Trait continu : nappe supérieure — Tirets : nappe inférieure', 2.2);
    return d;
  }

  /* ------------------------------------------------------------------ */
  /* 4. Planches A3 : cadre, cartouche, mise à l'échelle                 */
  /* ------------------------------------------------------------------ */
  function Feuille() {
    const P = [];
    return {
      prims: P,
      ligne: function (x1, y1, x2, y2, c) { P.push({ t: 'l', x1: x1, y1: y1, x2: x2, y2: y2, c: c || 'CADRE' }); },
      rect: function (x, y, w, h, c) { P.push({ t: 'p', pts: [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], c: c || 'CADRE', ferme: true }); },
      texte: function (x, y, s, h, o) { o = o || {}; P.push({ t: 't', x: x, y: y, s: String(s), h: h, a: o.a || 'g', rot: o.rot || 0, c: o.c || 'TEXTE', gras: !!o.gras }); },
      // place un dessin (en m) dans un rectangle papier (mm), à l'échelle 1/ech, cadré au centre
      placer: function (dessin, zone, ech) {
        const e = etendue(dessin.prims), s = 1000 / ech;
        const ox = zone.x + (zone.w - e.w * s) / 2 - e.x0 * s, oy = zone.y + (zone.h - e.h * s) / 2 - e.y0 * s;
        const X = function (x) { return ox + x * s; }, Y = function (y) { return oy + y * s; };
        dessin.prims.forEach(function (q) {
          if (q.t === 'l') P.push({ t: 'l', x1: X(q.x1), y1: Y(q.y1), x2: X(q.x2), y2: Y(q.y2), c: q.c });
          else if (q.t === 'p') P.push({ t: 'p', pts: q.pts.map(function (v) { return [X(v[0]), Y(v[1])]; }), c: q.c, ferme: q.ferme });
          else if (q.t === 'c') P.push({ t: 'c', x: X(q.x), y: Y(q.y), r: q.r * s, c: q.c, plein: q.plein });
          else if (q.t === 't') P.push({ t: 't', x: X(q.x), y: Y(q.y), s: q.s, h: q.h * s, a: q.a, rot: q.rot, c: q.c, gras: q.gras });
        });
      }
    };
  }
  /* Choisit la plus grande échelle normalisée pour laquelle le dessin (y compris textes) tient dans la zone */
  function echelleAdaptee(fabrique, zone) {
    for (let i = 0; i < ECHELLES.length; i++) {
      const ech = ECHELLES[i], d = fabrique(ech / 1000), e = etendue(d.prims), s = 1000 / ech;
      if (e.w * s <= zone.w && e.h * s <= zone.h) return { ech: ech, dessin: d };
    }
    const ech = ECHELLES[ECHELLES.length - 1];
    return { ech: ech, dessin: fabrique(ech / 1000) };
  }

  function cartouche(f, p, titre, echelles, num, total) {
    const W = 190, Hc = 54, x = A3.w - 10 - W, y = 10, pr = p.projet;
    f.rect(x, y, W, Hc);
    // colonnes : 120 | 70 ; lignes de 9 mm
    f.ligne(x + 120, y, x + 120, y + Hc);
    [9, 18, 27, 36, 45].forEach(function (h) { f.ligne(x, y + h, x + 120, y + h); });
    f.ligne(x + 120, y + 18, x + W, y + 18); f.ligne(x + 120, y + 36, x + W, y + 36);
    function champ(yy, nom, val, gras) { f.texte(x + 2, yy + 5.6, nom, 1.9, { c: 'TEXTE_GRIS' }); f.texte(x + 30, yy + 5.6, val, gras ? 3.0 : 2.5, { gras: !!gras }); }
    champ(y + 45, 'Projet', pr.nom || '', true);
    champ(y + 36, 'Route / PK', [pr.route, pr.pk].filter(Boolean).join(' — ') || '—');
    champ(y + 27, 'Localisation', pr.lieu || '—');
    champ(y + 18, 'Maître d\'ouvrage', pr.maitre || '—');
    champ(y + 9, 'Plan', titre, true);
    champ(y, 'Échelle', echelles);
    f.texte(x + 122, y + 49, 'Établi par', 1.9, { c: 'TEXTE_GRIS' });
    f.texte(x + 122, y + 43.5, pr.auteur || 'Moulo Jean Claude', 2.6, { gras: true });
    f.texte(x + 122, y + 39, 'Technicien génie civil BTP — Abidjan', 1.9);
    f.texte(x + 122, y + 31, 'Visa ingénieur structure', 1.9, { c: 'TEXTE_GRIS' });
    f.texte(x + 122, y + 13, 'Date : ' + (pr.date || ''), 2.2);
    f.texte(x + 122, y + 6.5, 'Planche ' + num + ' / ' + total + '   Indice A', 2.2, { gras: true });
    f.texte(x + 122, y + 2, 'Dalot Pro CI ' + M.VERSION + ' — format A3', 1.7, { c: 'TEXTE_GRIS' });
    return { x: x, y: y, w: W, h: Hc };
  }
  function cadre(f) {
    f.rect(5, 5, A3.w - 10, A3.h - 10, 'CADRE');
    f.rect(10, 10, A3.w - 20, A3.h - 20, 'CADRE');
  }
  function notesGenerales(f, p, R, x, y, w) {
    const m = R.mat, b = R.mat.norme === 'BAEL', an12 = M.ancrage(12, m);
    const fis = { peu: 'peu préjudiciable', prejudiciable: 'préjudiciable', tres: 'très préjudiciable' }[p.mat.fissuration];
    const lignes = [
      'NOTES',
      'Béton : ' + (b ? 'fc28' : 'fck') + ' = ' + fr(m.fc, 0) + ' MPa, dosage ≥ 350 kg/m³, granulat ≤ ' + fr(p.mat.dmax, 0) + ' mm.',
      'Aciers : HA Fe E' + m.fe + '. Enrobages : ' + fr(p.mat.enrobageExt * 100, 1) + ' cm côté terre, ' + fr(p.mat.enrobageInt * 100, 1) + ' cm côté eau.',
      'Calcul : ' + (b ? 'BAEL 91 rév. 99, fissuration ' + fis : 'Eurocode 2, wmax = ' + fr(p.mat.wmax, 2) + ' mm') + '.',
      'Recouvrements : ' + fr(an12.lr / 0.012, 0) + ' Ø (HA12 : ' + fr(an12.lr * 100, 0) + ' cm). Barres commerciales de 12 m.',
      'Cotes en cm. Cure humide 7 jours minimum, bétonnage aux heures fraîches.',
      'Plans à faire viser par un ingénieur structure avant exécution.'];
    lignes.forEach(function (s, i) { f.texte(x, y - i * 4.6, s, i ? 2.3 : 2.8, { gras: !i }); });
  }

  function planches(p, R) {
    const nomen = nomenclature(p, R), total = 4, liste = [];
    // 1. Coffrage
    (function () {
      const f = Feuille(); cadre(f);
      const z1 = { x: 15, y: 72, w: 235, h: 205 }, z2 = { x: 258, y: 120, w: 147, h: 157 };
      const a = echelleAdaptee(function (k) { return dessinCoffrage(p, R, k); }, z1);
      const b = echelleAdaptee(function (k) { return dessinPlanMasse(p, R, k); }, z2);
      f.placer(a.dessin, z1, a.ech); f.placer(b.dessin, z2, b.ech);
      f.texte(z1.x, z1.y + z1.h + 4, 'COUPE TRANSVERSALE — COFFRAGE  1/' + a.ech, 3.5, { gras: true });
      f.texte(z2.x, z2.y + z2.h + 4, 'VUE EN PLAN  1/' + b.ech, 3.5, { gras: true });
      notesGenerales(f, p, R, 15, 62, 220);
      cartouche(f, p, 'Coffrage', '1/' + a.ech + ' et 1/' + b.ech, 1, total);
      liste.push({ titre: 'Coffrage', prims: f.prims });
    })();
    // 2. Ferraillage en coupe
    (function () {
      const f = Feuille(); cadre(f);
      const z = { x: 15, y: 70, w: 390, h: 205 };
      const a = echelleAdaptee(function (k) { return dessinFerraillageCoupe(p, R, nomen, k); }, z);
      f.placer(a.dessin, z, a.ech);
      f.texte(z.x, z.y + z.h + 6, 'COUPE TRANSVERSALE — FERRAILLAGE  1/' + a.ech + '  (par mètre de longueur : voir nomenclature)', 3.5, { gras: true });
      notesGenerales(f, p, R, 15, 62, 220);
      cartouche(f, p, 'Ferraillage — coupe transversale', '1/' + a.ech, 2, total);
      liste.push({ titre: 'Ferraillage — coupe', prims: f.prims });
    })();
    // 3. Ferraillage en plan (dalle et radier)
    (function () {
      const f = Feuille(); cadre(f);
      const z1 = { x: 15, y: 75, w: 192, h: 195 }, z2 = { x: 213, y: 75, w: 192, h: 195 };
      const fab = function (q) { return function (k) { return dessinFerraillagePlan(p, R, nomen, k, q); }; };
      const ech = Math.max(echelleAdaptee(fab('dalle'), z1).ech, echelleAdaptee(fab('radier'), z2).ech);
      f.placer(fab('dalle')(ech / 1000), z1, ech); f.placer(fab('radier')(ech / 1000), z2, ech);
      f.texte(z1.x, z1.y + z1.h + 4, 'DALLE SUPÉRIEURE — VUE EN PLAN  1/' + ech, 3.5, { gras: true });
      f.texte(z2.x, z2.y + z2.h + 4, 'RADIER — VUE EN PLAN  1/' + ech, 3.5, { gras: true });
      notesGenerales(f, p, R, 15, 62, 220);
      cartouche(f, p, 'Ferraillage — dalle et radier', '1/' + ech, 3, total);
      liste.push({ titre: 'Ferraillage — dalle et radier', prims: f.prims });
    })();
    // 4. Nomenclature
    (function () {
      const f = Feuille(); cadre(f);
      tableNomenclature(f, nomen, 15, 282, R, p.geo.longueur);
      cartouche(f, p, 'Nomenclature des aciers', 'sans objet', 4, total);
      liste.push({ titre: 'Nomenclature des aciers', prims: f.prims });
    })();
    return { nomenclature: nomen, planches: liste };
  }

  /* Tableau de nomenclature (positions, façonnage coté, longueurs, masses) */
  function tableNomenclature(f, nomen, x0, yTop, R, longueur) {
    const cols = [['Pos.', 11], ['Élément', 62], ['Ø', 9], ['Nbre', 13], ['Façonnage (cotes en cm)', 74], ['L unit. (m)', 18], ['L totale (m)', 21], ['kg/m', 13], ['Masse (kg)', 19]];
    const W = cols.reduce(function (a, c) { return a + c[1]; }, 0), hT = 9, hL = 10.5;
    f.texte(x0, yTop - 1, 'NOMENCLATURE DES ACIERS — ouvrage complet, longueur ' + fr(longueur, 2) + ' m', 3.5, { gras: true });
    yTop -= 5;
    let y = yTop;
    f.rect(x0, y - hT, W, hT, 'CADRE');
    let x = x0;
    cols.forEach(function (c) { f.texte(x + c[1] / 2, y - 6, c[0], 2.2, { a: 'm', gras: true }); x += c[1]; });
    y -= hT;
    nomen.lignes.forEach(function (l) {
      const yb = y - hL; f.rect(x0, yb, W, hL, 'CADRE_FIN');
      let xc = x0; const cells = [String(l.pos), l.element + ' — ' + l.role, String(l.phi), String(l.nbre), null,
        fr(l.Lunit, 2) + (l.recouvrements ? ' *' : ''), fr(l.Ltot, 1), fr(l.kgm, 3), fr(l.masse, 1)];
      cells.forEach(function (s, i) {
        const w = cols[i][1];
        if (s === null) faconnage(f, l, xc + 3, yb + 2, w - 6, hL - 4);
        else if (i === 1) {
          const mots = s.split(' '), lignes = ['']; mots.forEach(function (m) { if ((lignes[lignes.length - 1] + ' ' + m).length > 46) lignes.push(m); else lignes[lignes.length - 1] = (lignes[lignes.length - 1] + ' ' + m).trim(); });
          lignes.slice(0, 2).forEach(function (t, j) { f.texte(xc + 1.5, yb + hL - 4 - j * 3.4, t, 2.0); });
        } else f.texte(xc + w - 1.5, yb + hL / 2 - 1, s, 2.3, { a: 'd' });
        xc += w;
      });
      y = yb;
    });
    // séparateurs de colonnes
    x = x0; cols.slice(0, -1).forEach(function (c) { x += c[1]; f.ligne(x, yTop, x, y, 'CADRE_FIN'); });
    // récapitulatif
    y -= 8;
    f.texte(x0, y, 'RÉCAPITULATIF PAR DIAMÈTRE', 2.8, { gras: true });
    y -= 3;
    const cr = [['Ø (mm)', 22], ['Longueur (m)', 30], ['kg/m', 22], ['Masse (kg)', 30]];
    const Wr = 104;
    f.rect(x0, y - 7, Wr, 7, 'CADRE'); let xr = x0;
    cr.forEach(function (c) { f.texte(xr + c[1] / 2, y - 5, c[0], 2.2, { a: 'm', gras: true }); xr += c[1]; });
    y -= 7;
    nomen.recap.forEach(function (r) {
      f.rect(x0, y - 6, Wr, 6, 'CADRE_FIN'); xr = x0;
      ['HA' + r.phi, fr(r.Ltot, 1), fr(r.kgm, 3), fr(r.masse, 1)].forEach(function (s, i) { f.texte(xr + cr[i][1] - 1.5, y - 4.3, s, 2.3, { a: 'd' }); xr += cr[i][1]; });
      y -= 6;
    });
    [['Masse des positions', nomen.masse], ['Chutes et attentes', nomen.chutes], ['Masse totale à commander', nomen.total]].forEach(function (t, i) {
      f.rect(x0, y - 6, Wr, 6, i === 2 ? 'CADRE' : 'CADRE_FIN');
      f.texte(x0 + 1.5, y - 4.3, t[0], 2.3, { gras: i === 2 }); f.texte(x0 + Wr - 1.5, y - 4.3, fr(t[1], 0) + ' kg', 2.3, { a: 'd', gras: i === 2 });
      y -= 6;
    });
    f.texte(x0 + Wr + 8, y + 22, 'Ratio : ' + fr(nomen.ratio, 0) + ' kg d\'acier par m³ de béton', 2.5, { gras: true });
    f.texte(x0 + Wr + 8, y + 16, '* barre de plus de 12 m : longueur augmentée des recouvrements', 2.1);
    f.texte(x0 + Wr + 8, y + 11, 'Repère sur les plans : P<position> : <nombre> HA<Ø> e=<espacement cm>', 2.1);
  }
  function faconnage(f, l, x, y, w, h) {
    const s = l.segments.map(function (v) { return fr(v * 100, 0); });
    const xm = x + w / 2;
    if (l.forme === 'U-bas' || l.forme === 'U-haut') {
      const haut = l.forme === 'U-bas', ya = haut ? y + h - 1 : y + 1, yb = haut ? y + 1.5 : y + h - 1.5;
      f.prims.push({ t: 'p', pts: [[x + 10, yb], [x + 10, ya], [x + w - 10, ya], [x + w - 10, yb]], c: 'ACIER', ferme: false });
      f.texte(xm, haut ? ya - 2.8 : ya + 0.8, s[1], 2.1, { a: 'm' });
      f.texte(x + 9, (ya + yb) / 2 - 0.8, s[0], 2.1, { a: 'd' });
      f.texte(x + w - 9, (ya + yb) / 2 - 0.8, s[2], 2.1);
    } else if (l.forme === 'gousset') {
      const a = [x + 14, y + h - 0.8], b = [x + w / 2 - 6, y + h - 0.8], c = [x + w / 2 + 6, y + 0.8], e = [x + w - 14, y + 0.8];
      f.prims.push({ t: 'p', pts: [a, b, c, e], c: 'ACIER', ferme: false });
      f.texte(x + 13, y + h - 2.2, s[0], 2.1, { a: 'd' }); f.texte(xm + 4, y + h / 2 - 0.5, s[1], 2.1); f.texte(x + w - 13, y + 0.2, s[2], 2.1);
    } else {
      f.ligne(x + 6, y + h / 2 - 1, x + w - 6, y + h / 2 - 1, 'ACIER');
      f.texte(xm, y + h / 2 + 0.5, s[0], 2.1, { a: 'm' });
    }
  }

  /* ------------------------------------------------------------------ */
  /* 5. Rendus SVG et DXF                                                 */
  /* ------------------------------------------------------------------ */
  const STYLE = {
    CADRE: { w: 0.5, col: '#111' }, CADRE_FIN: { w: 0.15, col: '#555' }, COFFRAGE: { w: 0.45, col: '#111' },
    PROPRETE: { w: 0.2, col: '#666', dash: '1.5 1' }, TERRAIN: { w: 0.25, col: '#6b4a2b' }, CACHE: { w: 0.2, col: '#666', dash: '2 1.2' },
    AXES: { w: 0.18, col: '#555', dash: '6 1.2 1 1.2' }, COTES: { w: 0.15, col: '#1d5c8c' }, RAPPEL: { w: 0.15, col: '#333' },
    ACIER: { w: 0.55, col: '#c0261c' }, ACIER_INF: { w: 0.55, col: '#c0261c', dash: '3 1.5' }, ACIER_REP: { w: 0.2, col: '#c0261c' },
    TEXTE: { col: '#111' }, TEXTE_GRIS: { col: '#666' }, TEXTE_ACIER: { col: '#9b1c14' }
  };
  const COULEUR_DXF = { CADRE: 7, CADRE_FIN: 8, COFFRAGE: 7, PROPRETE: 8, TERRAIN: 32, CACHE: 8, AXES: 8, COTES: 5, RAPPEL: 7,
    ACIER: 1, ACIER_INF: 1, ACIER_REP: 1, TEXTE: 7, TEXTE_GRIS: 8, TEXTE_ACIER: 1 };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function versSVG(planche) {
    const H = A3.h, o = [];
    o.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + A3.w + ' ' + H + '" class="planche-svg" role="img" aria-label="' + esc(planche.titre) + '">');
    o.push('<rect x="0" y="0" width="' + A3.w + '" height="' + H + '" fill="#fff"/>');
    planche.prims.forEach(function (q) {
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

  /* DXF R12 (AC1009) en millimètres ; les planches sont placées côte à côte. Accents codés en \U+XXXX. */
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
    calques.forEach(function (k) {
      c(0, 'LAYER'); c(2, k); c(70, 0); c(62, COULEUR_DXF[k]);
      c(6, (k === 'CACHE' || k === 'PROPRETE' || k === 'ACIER_INF') ? 'TIRETS' : (k === 'AXES' ? 'AXE' : 'CONTINUOUS'));
    });
    c(0, 'ENDTAB'); c(0, 'ENDSEC');
    c(0, 'SECTION'); c(2, 'ENTITIES');
    liste.forEach(function (pl, i) {
      const dx = i * (A3.w + 20);
      pl.prims.forEach(function (q) {
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

  return { nomenclature: nomenclature, planches: planches, dessinFerraillageCoupe: dessinFerraillageCoupe, versSVG: versSVG, versDXF: versDXF, repere: repere,
    masseLineique: masseLineique, etendue: etendue, A3: A3 };
});
