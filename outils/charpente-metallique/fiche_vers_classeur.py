#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Génère le classeur Excel pré-rempli à partir d'une fiche projet (gabarit PERSONNALISÉ).

Usage : python3 fiche_vers_classeur.py exemples/croquis_2nefs.json -o Classeur_croquis.xlsx

Le classeur raisonne en nefs identiques : si les portées diffèrent, la plus grande est retenue
(dimensionnement du lot sécuritaire) ; le calcul détaillé nef par nef reste celui de calculer_portique.py.
"""
import argparse

from conception.projet import Projet
import generer_classeur as gc


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("fiche")
    ap.add_argument("-o", "--sortie", default="Classeur_projet.xlsx")
    a = ap.parse_args()
    p = Projet.from_json(a.fiche)
    B = max(n.portee for n in p.nefs)
    pente = max(n.pente for n in p.nefs)
    if len({n.portee for n in p.nefs}) > 1:
        print(f"⚠ Portées différentes : le classeur retient {len(p.nefs)} nefs de {B:g} m (la plus grande).")
    params = {"perso_portee": B, "perso_longueur": p.longueur, "perso_hauteur": p.hauteur,
              "perso_pente": pente / 100, "nn": len(p.nefs), "e_port": p.entraxe,
              "e_pan": p.entraxe_pannes, "e_lis": p.entraxe_lisses, "ratio_jarret": p.jarret_ratio,
              "file_int": "Oui" if any(n.poteau_faitage for n in p.nefs) else "Non",
              "vb": p.vent.vb, "ce": p.vent.ce, "G_couv": p.G_couverture, "Q_toit": p.Q_toiture, "fy": p.fy}
    gc.main(a.sortie, gabarit="PERSONNALISÉ", params=params)
    print("Classeur pré-rempli :", a.sortie)


if __name__ == "__main__":
    main()
