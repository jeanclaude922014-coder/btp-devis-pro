#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Contre-lecture d'une fiche projet avant calcul (étape « Verify » de la chaîne croquis → note).

Usage : python3 valider_fiche.py exemples/croquis_2nefs.json
Produit <fiche>_contre_lecture.md et .docx ; code de sortie 2 si un point est bloquant.
"""
import sys

from docx import Document
from docx.shared import Pt, RGBColor

from conception.projet import Projet
from conception.contre_lecture import contre_lire, rapport_markdown
from conception.ec3 import verifier, dimensionner

NOMS = {"poteau_rive": "Poteaux de rive", "poteau_interieur": "Poteaux intérieurs", "traverse": "Traverses"}


def comparer_profils(p):
    pc = p.extra.get("lecture", {}).get("profils_croquis")
    if not pc:
        return None
    prof = {g: pc.get(g, "IPE 300") for g in NOMS}
    v = verifier(p, prof)
    auto = dimensionner(p)["profils"]
    rows = []
    for g in NOMS:
        if g == "poteau_interieur" and len(p.nefs) < 2 and not any(n.poteau_faitage for n in p.nefs):
            continue
        r = float(v["ratio_groupes"].get(g, 0))
        rows.append((NOMS[g], prof[g], f"{r:.2f} ({'OK' if r <= 1 else 'insuffisant'})", auto.get(g, "—")))
    return rows


def docx_rapport(p, md, chemin):
    doc = Document()
    st = doc.styles["Normal"]
    st.font.name, st.font.size = "Arial", Pt(10)
    hd = doc.sections[0].header.paragraphs[0]
    r = hd.add_run(f"{p.auteur.upper()} – Technicien génie civil BTP – Abidjan\nContre-lecture de fiche projet")
    r.font.size, r.font.bold, r.font.color.rgb = Pt(9), True, RGBColor(0x1F, 0x4E, 0x79)
    table = None
    for line in md.splitlines():
        if line.startswith("# "):
            h = doc.add_heading(line[2:], 0)
        elif line.startswith("## "):
            doc.add_heading(line[3:], 1)
            table = None
        elif line.startswith("|"):
            cells = [c.strip() for c in line.strip("|").split("|")]
            if set("".join(cells)) <= set("-: "):
                continue
            if table is None:
                table = doc.add_table(rows=0, cols=len(cells))
                table.style = "Table Grid"
            row = table.add_row().cells
            for k, c in enumerate(cells):
                row[k].text = c.replace("**", "")
                for par in row[k].paragraphs:
                    for rr in par.runs:
                        rr.font.size = Pt(8.5)
        elif line.strip():
            table = None
            doc.add_paragraph(line.replace("**", "").replace("- ☐ ", "☐ "))
    doc.core_properties.author = p.auteur
    doc.save(chemin)


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return 1
    fiche = sys.argv[1]
    p = Projet.from_json(fiche)
    items = contre_lire(p)
    comp = comparer_profils(p)
    md = rapport_markdown(p, items, comp)
    base = fiche.rsplit(".", 1)[0] + "_contre_lecture"
    open(base + ".md", "w", encoding="utf-8").write(md)
    docx_rapport(p, md, base + ".docx")
    for n, s, m in items:
        print(f"{n:9} {s:28} {m}")
    if comp:
        print("\nProfilés du croquis :")
        for row in comp:
            print("  ", " | ".join(row))
    print("\nRapports :", base + ".md", base + ".docx")
    return 2 if any(n == "BLOQUANT" for n, *_ in items) else 0


if __name__ == "__main__":
    sys.exit(main())
