# -*- coding: utf-8 -*-
"""Calcul d'un portique plan (une ou plusieurs nefs) par la méthode des déplacements.

- éléments poutres 2D (3 ddl par nœud : u, v, θ), petites déformations, élasticité linéaire ;
- jarrets modélisés par un tronçon de traverse à inertie et aire majorées ;
- cas de charges : G (poids propre + couverture + pannes), Q (toiture), vent (4 cas : gauche / droite,
  surpression / dépression intérieure) ;
- combinaisons EC0 (bâtiments, Q de toiture catégorie H : ψ0 = 0).

Unités internes : m, kN, kN·m.
"""
import math
from dataclasses import dataclass, field
import numpy as np

from .sections import section

G_ACIER = 81000.0  # MPa


@dataclass
class Element:
    i: int
    j: int
    sec: object
    groupe: str          # poteau_rive / poteau_interieur / traverse
    barre: str           # identifiant de barre (ex. P1, T1g)
    kI: float = 1.0      # majoration d'inertie (jarret)
    kA: float = 1.0
    jarret: bool = False

    def geom(self, X):
        (x1, y1), (x2, y2) = X[self.i], X[self.j]
        L = math.hypot(x2 - x1, y2 - y1)
        return L, (x2 - x1) / L, (y2 - y1) / L


@dataclass
class Modele:
    X: list = field(default_factory=list)          # coordonnées des nœuds
    el: list = field(default_factory=list)
    appuis: list = field(default_factory=list)     # (nœud, [bloque u, v, θ])
    barres: dict = field(default_factory=dict)     # barre -> dict(groupe, longueur, elements)
    noeuds_tete: list = field(default_factory=list)
    nb_nefs: int = 1

    def noeud(self, x, y):
        for k, (a, b) in enumerate(self.X):
            if abs(a - x) < 1e-6 and abs(b - y) < 1e-6:
                return k
        self.X.append((x, y))
        return len(self.X) - 1


def construire(p, profils):
    """Construit le modèle à partir de la fiche projet et du dictionnaire des profilés retenus."""
    m = Modele(nb_nefs=len(p.nefs))
    H = p.hauteur
    xs = [0.0]
    for n in p.nefs:
        xs.append(xs[-1] + n.portee)
    ncol = 6

    def barre(nom, groupe, pts, sec, jarrets=()):
        ids = []
        for k in range(len(pts) - 1):
            a, b = m.noeud(*pts[k]), m.noeud(*pts[k + 1])
            j = k in jarrets
            e = Element(a, b, sec, groupe, nom, kI=(p.jarret_hauteur ** 2 if j else 1.0),
                        kA=((1 + p.jarret_hauteur) / 2 if j else 1.0), jarret=j)
            m.el.append(e)
            ids.append(len(m.el) - 1)
        L = sum(math.hypot(pts[k + 1][0] - pts[k][0], pts[k + 1][1] - pts[k][1]) for k in range(len(pts) - 1))
        m.barres[nom] = dict(groupe=groupe, longueur=L, elements=ids, sec=sec.nom)

    # poteaux
    for c, x in enumerate(xs):
        rive = c in (0, len(xs) - 1)
        grp = "poteau_rive" if rive else "poteau_interieur"
        sec = section(profils[grp])
        barre(f"P{c + 1}", grp, [(x, H * k / ncol) for k in range(ncol + 1)], sec)
        base = m.noeud(x, 0.0)
        m.appuis.append((base, [1, 1, 1 if p.appuis.startswith("encastr") else 0]))
        m.noeuds_tete.append(m.noeud(x, H))
    # traverses (2 versants par nef) + poteaux de faîtage éventuels
    sec_t = section(profils["traverse"])
    for k, n in enumerate(p.nefs):
        x0, B, pe = xs[k], n.portee, n.pente / 100
        Hf = H + pe * B / 2
        lj = min(p.jarret_ratio * B, B / 2 * 0.45)
        nseg = 7

        def versant(xa, xb):
            # premier tronçon = jarret (côté poteau), puis découpage régulier
            pts = [(xa, H)]
            sgn = 1 if xb > xa else -1
            dist = [lj] + [lj + (B / 2 - lj) * t / (nseg - 1) for t in range(1, nseg)]
            for dd in dist:
                x = xa + sgn * dd
                pts.append((x, H + pe * min(x - x0, x0 + B - x)))
            return pts
        pg = versant(x0, x0 + B / 2)
        pd = versant(x0 + B, x0 + B / 2)
        barre(f"T{k + 1}g", "traverse", pg, sec_t, jarrets=(0,))
        barre(f"T{k + 1}d", "traverse", pd, sec_t, jarrets=(0,))
        if n.poteau_faitage:
            grp = "poteau_interieur"
            sec = section(profils[grp])
            xm = x0 + B / 2
            barre(f"PF{k + 1}", grp, [(xm, Hf * kk / ncol) for kk in range(ncol + 1)], sec)
            base = m.noeud(xm, 0.0)
            m.appuis.append((base, [1, 1, 1 if p.appuis.startswith("encastr") else 0]))
    return m


# ============================================================================ charges
def cas_de_charges(p, m):
    """Renvoie {cas: [(élément, qx, qy) en kN/m le long de l'élément, repère global]}."""
    e = p.entraxe_reel
    X = m.X
    cas = {"G": [], "Q": []}
    for k, el in enumerate(m.el):
        L, c, s = el.geom(X)
        pp = el.sec.kg * 9.81 / 1000 * el.kA
        cas["G"].append((k, 0.0, -pp))
        if el.groupe == "traverse":
            cas["G"].append((k, 0.0, -(p.G_couverture + p.G_pannes) * e))
            cas["Q"].append((k, 0.0, -p.Q_toiture * e * abs(c)))
    v = p.vent
    qp = v.qp
    xmin, xmax = min(x for x, _ in X), max(x for x, _ in X)
    for sens in ("gauche", "droite"):
        for cpi, lab in ((v.cpi_surpression, "cpi+"), (v.cpi_depression, "cpi-")):
            nom = f"W {sens} {lab}"
            L_ = []
            for k, el in enumerate(m.el):
                Lk, c, s = el.geom(X)
                (x1, y1), (x2, y2) = X[el.i], X[el.j]
                if el.groupe.startswith("poteau") and abs(x1 - x2) < 1e-9:
                    if abs(x1 - xmin) < 1e-6:
                        n_out, au_vent = (-1.0, 0.0), sens == "gauche"
                    elif abs(x1 - xmax) < 1e-6:
                        n_out, au_vent = (1.0, 0.0), sens == "droite"
                    else:
                        continue
                    cpe = v.cpe_mur_au_vent if au_vent else v.cpe_mur_sous_vent
                elif el.groupe == "traverse":
                    # normale extérieure du versant
                    dx, dy = (x2 - x1), (y2 - y1)
                    if dx < 0:
                        dx, dy = -dx, -dy
                    t = (dx / Lk, dy / Lk)
                    n_out = (-t[1], t[0])            # vers le haut
                    xm = (x1 + x2) / 2
                    nef = _nef_de(p, xm)
                    premier = (nef == 0 and sens == "gauche") or (nef == len(p.nefs) - 1 and sens == "droite")
                    monte_vers_vent = (t[1] > 0 and sens == "gauche") or (t[1] < 0 and sens == "droite")
                    cpe = v.cpe_toit_au_vent if (premier and monte_vers_vent) else v.cpe_toit_sous_vent
                else:
                    continue
                w = -(cpe - cpi) * qp * e
                L_.append((k, w * n_out[0], w * n_out[1]))
            cas[nom] = L_
    return cas


def _nef_de(p, x):
    acc = 0.0
    for k, n in enumerate(p.nefs):
        if x <= acc + n.portee + 1e-9:
            return k
        acc += n.portee
    return len(p.nefs) - 1


def combinaisons(cas):
    vents = [c for c in cas if c.startswith("W")]
    elu = {"ELU 1,35G + 1,5Q": {"G": 1.35, "Q": 1.5}}
    for w in vents:
        elu[f"ELU 1,35G + 1,5{w}"] = {"G": 1.35, w: 1.5}
        elu[f"ELU 1,0G + 1,5{w}"] = {"G": 1.0, w: 1.5}
    els = {"ELS G + Q": {"G": 1.0, "Q": 1.0}}
    for w in vents:
        els[f"ELS G + {w}"] = {"G": 1.0, w: 1.0}
    return elu, els


# ============================================================================ résolution
def _k_local(E, A, I, L):
    a, b = E * A / L, E * I / L ** 3
    return np.array([[a, 0, 0, -a, 0, 0],
                     [0, 12 * b, 6 * b * L, 0, -12 * b, 6 * b * L],
                     [0, 6 * b * L, 4 * b * L * L, 0, -6 * b * L, 2 * b * L * L],
                     [-a, 0, 0, a, 0, 0],
                     [0, -12 * b, -6 * b * L, 0, 12 * b, -6 * b * L],
                     [0, 6 * b * L, 2 * b * L * L, 0, -6 * b * L, 4 * b * L * L]])


def _T(c, s):
    t = np.zeros((6, 6))
    for k in (0, 3):
        t[k:k + 2, k:k + 2] = [[c, s], [-s, c]]
        t[k + 2, k + 2] = 1
    return t


def resoudre(p, m, charges):
    """Résout un chargement {élément: (qx, qy)} → déplacements, efforts aux extrémités, réactions."""
    E = p.E * 1000  # kN/m²
    n = len(m.X)
    K = np.zeros((3 * n, 3 * n))
    F = np.zeros(3 * n)
    data = []
    q_el = {}
    for k, qx, qy in charges:
        a, b = q_el.get(k, (0.0, 0.0))
        q_el[k] = (a + qx, b + qy)
    for k, el in enumerate(m.el):
        L, c, s = el.geom(m.X)
        A = el.sec.A * 1e-4 * el.kA
        I = el.sec.Iy * 1e-8 * el.kI
        kl = _k_local(E, A, I, L)
        T = _T(c, s)
        kg = T.T @ kl @ T
        dofs = [3 * el.i, 3 * el.i + 1, 3 * el.i + 2, 3 * el.j, 3 * el.j + 1, 3 * el.j + 2]
        K[np.ix_(dofs, dofs)] += kg
        qx, qy = q_el.get(k, (0.0, 0.0))
        qa, qpp = c * qx + s * qy, -s * qx + c * qy
        Peq = np.array([qa * L / 2, qpp * L / 2, qpp * L * L / 12, qa * L / 2, qpp * L / 2, -qpp * L * L / 12])
        F[dofs] += T.T @ Peq
        data.append((dofs, kl, T, Peq, L, qa, qpp))
    fixe = []
    for nd, bl in m.appuis:
        for d in range(3):
            if bl[d]:
                fixe.append(3 * nd + d)
    libres = [d for d in range(3 * n) if d not in fixe]
    U = np.zeros(3 * n)
    U[libres] = np.linalg.solve(K[np.ix_(libres, libres)], F[libres])
    R = K @ U - F
    efforts = []
    for (dofs, kl, T, Peq, L, qa, qpp) in data:
        f = kl @ (T @ U[dofs]) - Peq
        Ni, Vi, Mi = -f[0], f[1], -f[2]
        Nj, Vj, Mj = f[3], -f[4], f[5]
        Mmid = (Mi + Mj) / 2 - qpp * L * L / 8
        efforts.append(dict(Ni=Ni, Vi=Vi, Mi=Mi, Nj=Nj, Vj=Vj, Mj=Mj, Mmid=Mmid))
    reac = {nd: R[3 * nd:3 * nd + 3].copy() for nd, _ in m.appuis}
    return dict(U=U, efforts=efforts, reactions=reac)


def analyser(p, profils):
    m = construire(p, profils)
    cas = cas_de_charges(p, m)
    res_cas = {c: resoudre(p, m, ch) for c, ch in cas.items()}
    elu, els = combinaisons(cas)

    def combiner(coefs):
        U = sum(f * res_cas[c]["U"] for c, f in coefs.items())
        eff = []
        for k in range(len(m.el)):
            eff.append({key: sum(f * res_cas[c]["efforts"][k][key] for c, f in coefs.items())
                        for key in ("Ni", "Vi", "Mi", "Nj", "Vj", "Mj", "Mmid")})
        reac = {nd: sum(f * res_cas[c]["reactions"][nd] for c, f in coefs.items()) for nd, _ in m.appuis}
        return dict(U=U, efforts=eff, reactions=reac)
    return dict(modele=m, cas=cas, res_cas=res_cas,
                elu={k: combiner(v) for k, v in elu.items()}, els={k: combiner(v) for k, v in els.items()},
                def_elu=elu, def_els=els)
