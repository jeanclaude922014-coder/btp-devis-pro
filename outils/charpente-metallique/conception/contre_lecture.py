# -*- coding: utf-8 -*-
"""Contre-lecture d'une fiche projet (issue d'un croquis ou d'une saisie) avant calcul.

Rôle : vérifier indépendamment la fiche – cohérence géométrique, plages usuelles, profilés,
valeurs « à confirmer » – et lister les points d'arrêt soumis au visa de l'ingénieur.
Niveaux : OK, ATTENTION (plausible mais inhabituel), BLOQUANT (incohérent ou impossible), VISA (à confirmer).
"""
import datetime
import math

from .sections import SECTIONS


def contre_lire(p):
    out = []

    def add(niv, sujet, msg):
        out.append((niv, sujet, msg))

    # géométrie
    if not p.nefs:
        add("BLOQUANT", "Nefs", "aucune nef définie")
    for k, n in enumerate(p.nefs, 1):
        if not 5 <= n.portee <= 60:
            add("BLOQUANT", f"Nef {k}", f"portée {n.portee} m hors plage 5–60 m")
        elif n.portee > 30 and not n.poteau_faitage:
            add("ATTENTION", f"Nef {k}", f"portée {n.portee} m > 30 m sans poteau de faîtage : ferme treillis ou file centrale à étudier")
        else:
            add("OK", f"Nef {k}", f"portée {n.portee:g} m")
        if not 3 <= n.pente <= 60:
            add("BLOQUANT", f"Nef {k}", f"pente {n.pente} % hors plage 3–60 %")
        elif n.pente < 5:
            add("ATTENTION", f"Nef {k}", f"pente {n.pente} % < 5 % : risque de stagnation")
        elif n.pente > 35:
            add("ATTENTION", f"Nef {k}", f"pente {n.pente} % forte : vérifier la couverture et les fixations")
        else:
            add("OK", f"Nef {k}", f"pente {n.pente:g} %")
    if len(p.nefs) > 1:
        pmin, pmax = min(n.portee for n in p.nefs), max(n.portee for n in p.nefs)
        if pmax / pmin > 1.25:
            add("ATTENTION", "Nefs", f"portées très différentes ({pmin:g} / {pmax:g} m) : vérifier la noue et les chéneaux")
    if not 3 <= p.hauteur <= 15:
        add("BLOQUANT", "Hauteur", f"hauteur sous sablière {p.hauteur} m hors plage 3–15 m")
    else:
        add("OK", "Hauteur", f"hauteur sous sablière {p.hauteur:g} m")
    if not 4 <= p.entraxe <= 8:
        add("ATTENTION", "Trame", f"entraxe des portiques {p.entraxe} m hors plage usuelle 4–8 m")
    ratio = p.longueur / p.entraxe
    if abs(ratio - round(ratio)) > 0.02:
        add("ATTENTION", "Trame", f"longueur {p.longueur:g} m non multiple de l'entraxe {p.entraxe:g} m : entraxe réel retenu "
                                  f"{p.entraxe_reel:.2f} m ({p.nb_travees} travées)")
    else:
        add("OK", "Trame", f"{p.nb_travees} travées de {p.entraxe_reel:.2f} m = {p.longueur:g} m")
    if not 0.05 <= p.jarret_ratio <= 0.20:
        add("ATTENTION", "Jarrets", f"longueur de jarret {p.jarret_ratio * 100:.0f} % de la portée (usuel 8–15 %)")
    if not 1.5 <= p.jarret_hauteur <= 2.5:
        add("ATTENTION", "Jarrets", f"hauteur de jarret {p.jarret_hauteur} × h (usuel 1,5 à 2,5)")
    # profilés imposés
    for g, v in (("poteau_rive", p.poteau_rive), ("poteau_interieur", p.poteau_interieur), ("traverse", p.traverse)):
        if v != "auto" and v not in SECTIONS:
            add("BLOQUANT", "Profilés", f"{g} : profilé « {v} » inconnu de la base")
    # vent
    if not 18 <= p.vent.vb <= 40:
        add("ATTENTION", "Vent", f"vitesse de référence {p.vent.vb} m/s inhabituelle")
    add("VISA", "Vent", f"vitesse de référence {p.vent.vb:g} m/s et ce = {p.vent.ce:g} : à confirmer (données locales)")
    # cohérence avec la lecture du croquis
    lec = p.extra.get("lecture", {})
    hf_lues = lec.get("hauteur_faitage_lue") or []
    for k, n in enumerate(p.nefs):
        hf = p.hauteur + n.pente / 100 * n.portee / 2
        if k < len(hf_lues) and hf_lues[k]:
            ecart = abs(hf - hf_lues[k])
            niv = "OK" if ecart <= 0.05 else ("ATTENTION" if ecart <= 0.20 else "BLOQUANT")
            add(niv, f"Nef {k + 1}", f"hauteur au faîtage recalculée {hf:.2f} m / lue {hf_lues[k]:g} m (écart {ecart * 100:.0f} cm)")
    for v in lec.get("valeurs", []):
        if v.get("confiance") in ("à confirmer", "probable"):
            add("VISA", v["element"], f"{v['valeur']} ({v['confiance']})")
    return out


def rapport_markdown(p, items, comparaison=None):
    sym = {"OK": "✔", "ATTENTION": "⚠", "BLOQUANT": "✖", "VISA": "☐"}
    L = [f"# Contre-lecture de la fiche projet – {p.nom}", "",
         f"Date : {datetime.date.today():%d/%m/%Y} – Ouvrage : {p.description()}", ""]
    lec = p.extra.get("lecture")
    if lec:
        L += [f"Source : {lec.get('source', '')} – {lec.get('lu_par', '')}", "", "## Valeurs lues", "",
              "| Élément | Valeur | Confiance |", "|---|---|---|"]
        L += [f"| {v['element']} | {v['valeur']} | {v['confiance']} |" for v in lec.get("valeurs", [])]
        L.append("")
    L += ["## Contrôles", "", "| | Sujet | Constat |", "|---|---|---|"]
    L += [f"| {sym[n]} {n} | {s} | {m} |" for n, s, m in items if n != "VISA"]
    L += ["", "## Points d'arrêt soumis au visa de l'ingénieur", ""]
    L += [f"- ☐ **{s}** : {m}" for n, s, m in items if n == "VISA"]
    if comparaison:
        L += ["", "## Profilés du croquis comparés au calcul EC3", "", "| Élément | Croquis | Taux avec le profilé du croquis | "
              "Profilé minimal calculé |", "|---|---|---|---|"]
        L += [f"| {a} | {b} | {c} | {d} |" for a, b, c, d in comparaison]
    nb = sum(1 for n, *_ in items if n == "BLOQUANT")
    L += ["", f"**Conclusion : {'fiche BLOQUÉE – corriger les points ✖' if nb else 'fiche cohérente – calcul possible après visa des points ☐'}.**",
          "", "Visa de l'ingénieur : ____________________  Date : ____________"]
    return "\n".join(L)
