# -*- coding: utf-8 -*-
"""Intègre le classeur Excel dans Generateur_Plans.html.

1. Régénère Quantitatif_Charpente_Metallique.xlsx (generer_classeur.main).
2. Écrit dans le HTML, entre les repères /*@@CLASSEUR_DEBUT@@*/ et /*@@CLASSEUR_FIN@@*/ :
   - le classeur (base64) ;
   - la correspondance paramètre HTML → cellule jaune Excel (inverse du CODE PLANS) ;
   - les cellules de saisie des efforts de la feuille FERRAILLAGE_SEMELLES.
Le bouton « Classeur Excel » du HTML recopie alors les paramètres courants et les efforts du calcul
dans le classeur, retire les valeurs en cache (recalcul complet à l'ouverture) et le télécharge.

Usage : python3 integrer_classeur.py [--sans-regeneration]
"""
import base64, json, os, re, sys, zipfile

ICI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ICI)
import generer_classeur as G   # noqa: E402

XLSX = os.path.join(ICI, "Quantitatif_Charpente_Metallique.xlsx")
HTML = os.path.join(ICI, "Generateur_Plans.html")
DEB, FIN = "/*@@CLASSEUR_DEBUT@@*/", "/*@@CLASSEUR_FIN@@*/"


def cellule(ref):
    sh, co = ref.replace("$", "").split("!")
    return sh.strip("'"), co


def main(regen=True):
    if regen:
        G.main(XLSX)
    else:                       # remplit G.M sans écrire le classeur (structure identique)
        G.main(os.path.join(ICI, ".classeur_tmp.xlsx"), recalc=False)
        os.remove(os.path.join(ICI, ".classeur_tmp.xlsx"))
    M = G.M
    carte, ignores = [], []
    for k, ex, kind in G.CODE_KEYS:
        if k in ("gab", "B", "L", "H", "p"):
            continue                                     # géométrie : traitée à part (gabarit / PERSONNALISÉ)
        m = re.fullmatch(r"\{(\w+)\}(\*100)?", ex)
        nom = {"nef": "nn"}.get(m.group(1), m.group(1)) if m else None
        if nom and nom.startswith("prof_") and "force_" + nom[5:] in M.params:
            nom = "force_" + nom[5:]                     # profilé forcé (vide = automatique)
        if not nom or nom not in M.params:
            ignores.append(k)
            continue
        sh, co = cellule(M.params[nom])
        carte.append([k, sh, co, kind, 0.01 if m.group(2) else 1])
    geo = {}
    for nom in ("gab", "hauteur_def", "pente_def"):
        geo[nom] = cellule(M.params[nom])
    r_perso = 5 + len(G.GABARITS)
    geo["perso"] = [G.PAR, r_perso]                       # colonnes H portée, I longueur, J hauteur, K pente
    geo["gabarits"] = {n: [b, l] for n, b, l in G.GABARITS}
    efforts = {}
    for nm in ("Nser", "Mser", "Nu", "Mu", "Nt", "Hg", "Ng"):
        for t in ("S1", "S2", "S3"):
            efforts[f"{nm}_{t}"] = cellule(M.params[f"fs_in_{nm}_{t}"])
    z = zipfile.ZipFile(XLSX)
    wbx = z.read("xl/workbook.xml").decode()
    rels = z.read("xl/_rels/workbook.xml.rels").decode()
    cible = dict(re.findall(r'Id="(rId\d+)"[^>]*Target="([^"]+)"', rels))
    cible.update({a: b for b, a in re.findall(r'Target="([^"]+)"[^>]*Id="(rId\d+)"', rels)})
    feuilles = {}
    for nom, rid in re.findall(r'<sheet [^>]*name="([^"]+)"[^>]*r:id="(rId\d+)"', wbx):
        t = cible[rid]
        feuilles[nom] = t.lstrip("/") if t.startswith("/") else "xl/" + t
    data = {"b64": base64.b64encode(open(XLSX, "rb").read()).decode(), "carte": carte, "geo": geo,
            "efforts": efforts, "feuilles": feuilles}
    bloc = f"{DEB}const CLASSEUR={json.dumps(data, ensure_ascii=False, separators=(',', ':'))};{FIN}"
    h = open(HTML, encoding="utf-8").read()
    if DEB in h:
        a, b = h.index(DEB), h.index(FIN) + len(FIN)
        h = h[:a] + bloc + h[b:]
    else:
        h = h.replace("</body>", f"<script>{bloc}</script>\n</body>", 1)
    open(HTML, "w", encoding="utf-8").write(h)
    print(f"Classeur intégré : {os.path.getsize(XLSX) // 1024} ko, {len(carte)} paramètres reliés, "
          f"{len(efforts)} cellules d'efforts ; non reliés : {', '.join(ignores) or 'aucun'}")


if __name__ == "__main__":
    main("--sans-regeneration" not in sys.argv)
