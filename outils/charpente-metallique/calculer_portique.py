#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Calcule le portique d'un projet et produit la note de calcul Word.

Exemples :
  python3 calculer_portique.py exemples/projet_20x40.json
  python3 calculer_portique.py exemples/croquis_2nefs.json -o Note_croquis.docx
  python3 calculer_portique.py --code "PLAN1;gab=20 × 40;B=20.0000;..."   (CODE PLANS copié depuis Excel)
"""
import argparse
import json
import sys

from conception.projet import Projet
from conception.ec3 import dimensionner
from conception.note_word import generer_note


def main():
    ap = argparse.ArgumentParser(description="Calcul de portique EC3 et note de calcul Word")
    ap.add_argument("fiche", nargs="?", help="fiche projet JSON")
    ap.add_argument("--code", help="CODE PLANS copié depuis le classeur Excel")
    ap.add_argument("-o", "--sortie", default=None, help="note Word à produire (.docx)")
    a = ap.parse_args()
    if a.code:
        p = Projet.from_code(a.code)
    elif a.fiche:
        p = Projet.from_json(a.fiche)
    else:
        ap.error("donner une fiche JSON ou --code")
    v = dimensionner(p)
    print(p.description())
    print("Profilés retenus :", json.dumps(v["profils"], ensure_ascii=False))
    for g, r in v["ratio_groupes"].items():
        print(f"  {g:18} taux maximal {float(r):.2f}")
    for e in v["els"]:
        print(f"  {e['verif']} : {e['valeur']:.1f} / {e['limite']:.1f} mm")
    sortie = a.sortie or "Note_de_calcul_portique.docx"
    generer_note(p, v, sortie)
    print("Note de calcul :", sortie)
    return 0 if all(float(r) <= 1 for r in v["ratio_groupes"].values()) else 1


if __name__ == "__main__":
    sys.exit(main())
