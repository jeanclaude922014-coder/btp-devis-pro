"""Génère tous les livrets PDF de la formation. Usage : python3 construire.py"""
import importlib, os, sys
from lib import construire_pdf

SORTIE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "livrets")
LIVRETS = [
    ("c00_plan", "00_Plan_de_formation_CAO_DAO.pdf", "Plan de formation CAO/DAO et dimensionnement"),
    ("c01_autocad", "01_Livret_AutoCAD.pdf", "Livret 1 — AutoCAD"),
    ("c02_archicad", "02_Livret_ArchiCAD.pdf", "Livret 2 — ArchiCAD"),
    ("c03_revit", "03_Livret_Revit_BIM.pdf", "Livret 3 — Revit BIM"),
    ("c04_robot", "04_Livret_Robot_Structural_Analysis.pdf", "Livret 4 — Robot Structural Analysis"),
    ("c05_cypecad", "05_Livret_CYPECAD.pdf", "Livret 5 — CYPECAD"),
]

if __name__ == "__main__":
    os.makedirs(SORTIE, exist_ok=True)
    choix = sys.argv[1:]
    for mod, fichier, titre in LIVRETS:
        if choix and mod not in choix:
            continue
        if not os.path.exists(mod + ".py"):
            print("(absent)", mod); continue
        m = importlib.import_module(mod)
        construire_pdf(os.path.join(SORTIE, fichier), m.MODULE, titre, m.BLOCS)
        print("OK", fichier)
