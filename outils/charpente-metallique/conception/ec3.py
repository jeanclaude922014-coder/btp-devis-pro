# -*- coding: utf-8 -*-
"""Vérifications EC3 (EN 1993-1-1) des barres du portique et choix automatique des profilés.

Pour chaque barre et chaque combinaison ELU :
- résistance de section : flexion + effort normal (6.2.9.1), cisaillement (6.2.6) ;
- flambement dans le plan (y) et hors plan (z) (6.3.1) ;
- déversement, méthode générale (6.3.2.2) avec Mcr de la poutre bi-symétrique ;
- interaction flexion + compression (6.3.3, annexe B, méthode 2).
ELS : flèche des traverses (G + Q) et déplacement en tête des poteaux (G + W).
Les jarrets sont supposés dimensionnés avec une hauteur égale à jarret_hauteur × h (non vérifiés ici).
"""
import math
from .sections import section, IPE, HEA
from .portique import analyser, G_ACIER

CURVE = {"a0": 0.13, "a": 0.21, "b": 0.34, "c": 0.49, "d": 0.76}


def chi(lam, alpha):
    if lam <= 0.2:
        return 1.0
    phi = 0.5 * (1 + alpha * (lam - 0.2) + lam ** 2)
    return min(1.0, 1 / (phi + math.sqrt(max(phi ** 2 - lam ** 2, 0))))


def mcr(sec, L, C1, E):
    """Moment critique de déversement (kN·m), L en m."""
    Lm = L * 1000
    Iz, Iw, It = sec.Iz * 1e4, sec.Iw * 1e6, sec.It * 1e4
    a = math.pi ** 2 * E * Iz / Lm ** 2
    return C1 * a * math.sqrt(Iw / Iz + Lm ** 2 * G_ACIER * It / (math.pi ** 2 * E * Iz)) / 1e6


def longueurs(p, groupe, Lbarre):
    """Longueurs de flambement et de déversement d'une barre (m) + facteur C1."""
    if groupe.startswith("poteau"):
        beta = 2.0 if p.appuis.startswith("articul") else 1.2      # portique à nœuds déplaçables
        Lz = min(Lbarre, p.maintien_poteau * p.entraxe_lisses)
        return dict(Ly=beta * Lbarre, Lz=Lz, LLT=Lz, C1=1.77 if p.appuis.startswith("articul") else 1.0)
    Llt = min(Lbarre, p.maintien_traverse * p.entraxe_pannes)
    return dict(Ly=Lbarre, Lz=Llt, LLT=Llt, C1=1.0)


def verifier_barre(p, sec, groupe, Lbarre, efforts):
    """efforts : liste de (N, V, M) en kN, kN·m (N > 0 traction). Renvoie le détail de la vérification la plus défavorable."""
    fy, E = p.fy, p.E
    Npl = sec.A * fy / 10                       # kN
    Mpl = sec.Wply * fy / 1000                  # kN·m
    Vpl = sec.Avz * fy / math.sqrt(3) / 10      # kN
    a_w = min(0.5, (sec.A - 2 * sec.b * sec.tf / 100) / sec.A)
    lg = longueurs(p, groupe, Lbarre)
    lam1 = 93.9 * math.sqrt(235 / fy)
    lam_y = lg["Ly"] * 100 / (sec.iy * lam1)
    lam_z = lg["Lz"] * 100 / (sec.iz * lam1)
    chi_y = chi(lam_y, CURVE["a"] if sec.h / sec.b > 1.2 else CURVE["b"])
    chi_z = chi(lam_z, CURVE["b"] if sec.h / sec.b > 1.2 else CURVE["c"])
    Mcr = mcr(sec, lg["LLT"], lg["C1"], E)
    lam_lt = math.sqrt(Mpl / Mcr)
    chi_lt = chi(lam_lt, CURVE["a"] if sec.h / sec.b <= 2 else CURVE["b"])
    worst = None
    for N, V, M in efforts:
        Nc = max(0.0, -N)                     # compression
        n = abs(N) / (Npl / p.gM0)
        MN = min(Mpl, Mpl * (1 - n) / (1 - 0.5 * a_w)) if n < 1 else 0.0
        r_sec = abs(M) / (MN / p.gM0) if MN > 0 else 9.99
        r_v = abs(V) / (Vpl / p.gM0)
        ny = Nc / (chi_y * Npl / p.gM1)
        nz = Nc / (chi_z * Npl / p.gM1)
        Cmy, CmLT = 0.9, 0.6
        kyy = Cmy * (1 + min(lam_y - 0.2, 0.8) * ny) if lam_y > 0.2 else Cmy
        kzy = max(1 - 0.1 * lam_z / (CmLT - 0.25) * nz, 1 - 0.1 / (CmLT - 0.25) * nz) if lam_z >= 0.4 else 0.6 + lam_z
        Mb = chi_lt * Mpl / p.gM1
        r61 = ny + kyy * abs(M) / Mb
        r62 = nz + kzy * abs(M) / Mb
        d = dict(N=N, V=V, M=M, r_sec=r_sec, r_v=r_v, r61=r61, r62=r62, ratio=max(r_sec, r_v, r61, r62))
        if worst is None or d["ratio"] > worst["ratio"]:
            worst = d
    worst.update(Npl=Npl, Mpl=Mpl, Vpl=Vpl, chi_y=chi_y, chi_z=chi_z, chi_lt=chi_lt, Mcr=Mcr,
                 lam_y=lam_y, lam_z=lam_z, lam_lt=lam_lt, **lg)
    return worst


def verifier(p, profils, res=None):
    """Analyse + vérifications complètes. Renvoie dict(res, barres, els, ratio_groupes)."""
    res = res or analyser(p, profils)
    m = res["modele"]
    out = {}
    for nom, b in m.barres.items():
        sec = section(b["sec"])
        meilleur = None
        for cnom, r in res["elu"].items():
            eff = []
            for k in b["elements"]:
                if m.el[k].jarret:
                    continue
                e = r["efforts"][k]
                eff += [(e["Ni"], e["Vi"], e["Mi"]), (e["Nj"], e["Vj"], e["Mj"]), ((e["Ni"] + e["Nj"]) / 2, 0, e["Mmid"])]
            d = verifier_barre(p, sec, b["groupe"], b["longueur"], eff)
            d["combinaison"] = cnom
            if meilleur is None or d["ratio"] > meilleur["ratio"]:
                meilleur = d
        out[nom] = dict(groupe=b["groupe"], sec=b["sec"], longueur=b["longueur"], **meilleur)
    # ELS
    els = []
    xs_nefs = []
    acc = 0.0
    for n in p.nefs:
        xs_nefs.append((acc, acc + n.portee))
        acc += n.portee
    for k, (xa, xb) in enumerate(xs_nefs):
        lim = (xb - xa) / p.fleche_traverse * 1000
        fmax, cmax = 0.0, ""
        for cnom, r in res["els"].items():
            if "W" in cnom:
                continue
            U = r["U"]
            va = U[3 * m.noeud(xa, p.hauteur) + 1]
            vb = U[3 * m.noeud(xb, p.hauteur) + 1]
            for nd, (x, y) in enumerate(m.X):
                if xa - 1e-6 < x < xb + 1e-6 and y > p.hauteur - 1e-6:
                    ref = va + (vb - va) * (x - xa) / (xb - xa)
                    f = abs(U[3 * nd + 1] - ref) * 1000
                    if f > fmax:
                        fmax, cmax = f, cnom
        els.append(dict(verif=f"Flèche de la traverse – nef {k + 1}", valeur=fmax, limite=lim, combinaison=cmax,
                        groupe="traverse", ratio=fmax / lim))
    lim = p.hauteur / p.deplacement_tete * 1000
    dmax, cmax = 0.0, ""
    for cnom, r in res["els"].items():
        for nd in m.noeuds_tete:
            d = abs(r["U"][3 * nd]) * 1000
            if d > dmax:
                dmax, cmax = d, cnom
    els.append(dict(verif="Déplacement horizontal en tête de poteau", valeur=dmax, limite=lim, combinaison=cmax,
                    groupe="poteau_rive", ratio=dmax / lim))
    ratios = {}
    for d in list(out.values()) + els:
        ratios[d["groupe"]] = max(ratios.get(d["groupe"], 0), d["ratio"])
    return dict(res=res, barres=out, els=els, ratio_groupes=ratios)


def dimensionner(p, max_iter=60):
    """Choisit les profilés (plus légers satisfaisant toutes les vérifications) pour les groupes « auto »."""
    fam_pot = IPE if p.famille_poteaux.upper() == "IPE" else HEA
    listes = {"poteau_rive": fam_pot, "poteau_interieur": HEA, "traverse": IPE}
    imposes = {"poteau_rive": p.poteau_rive, "poteau_interieur": p.poteau_interieur, "traverse": p.traverse}
    idx = {}
    for g, lst in listes.items():
        if imposes[g] != "auto":
            idx[g] = None
        else:
            idx[g] = lst.index("IPE 200") if "IPE 200" in lst else 0
    profils = {g: (imposes[g] if idx[g] is None else listes[g][idx[g]]) for g in listes}
    has_int = len(p.nefs) > 1 or any(n.poteau_faitage for n in p.nefs)
    historique = []
    v = None
    for _ in range(max_iter):
        v = verifier(p, profils)
        historique.append((dict(profils), dict(v["ratio_groupes"])))
        trop = [g for g, r in v["ratio_groupes"].items() if r > 1.0 and idx.get(g) is not None]
        if not trop:
            break
        # agrandir le groupe le plus défavorable (déplacement en tête : poteaux puis traverse)
        g = max(trop, key=lambda x: v["ratio_groupes"][x])
        if idx[g] + 1 < len(listes[g]):
            idx[g] += 1
        elif g == "poteau_rive" and idx["traverse"] is not None and idx["traverse"] + 1 < len(IPE):
            idx["traverse"] += 1
        else:
            break
        profils = {gg: (imposes[gg] if idx[gg] is None else listes[gg][idx[gg]]) for gg in listes}
    if not has_int:
        profils["poteau_interieur"] = "—"
    v["profils"] = profils
    v["historique"] = historique
    return v
