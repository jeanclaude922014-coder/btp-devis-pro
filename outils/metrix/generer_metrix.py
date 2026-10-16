# -*- coding: utf-8 -*-
"""
Générateur du classeur « METRIX AVANCÉ CHANTIER BTP ».
Auteur : Moulo Jean Claude – Technicien génie civil BTP, Abidjan.

Usage : python3 generer_metrix.py [chemin_sortie.xlsx]
Produit un classeur Excel de pilotage de chantier (10 modules + annexes),
entièrement formulé (aucune valeur calculée en dur), avec un exemple de
chantier R+1 à Abidjan pré-rempli.
"""
import sys
import datetime as dt

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter as L
from openpyxl.workbook.defined_name import DefinedName
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.formatting.rule import FormulaRule, CellIsRule
from openpyxl.chart import BarChart, Reference
from openpyxl.comments import Comment

AUTEUR = "Moulo Jean Claude"
SORTIE = sys.argv[1] if len(sys.argv) > 1 else "Metrix_Avance_Chantier_BTP.xlsx"

# ------------------------------------------------------------------ styles
FONT = "Arial"
VERT, VERT2, VERT_CLAIR = "1B5E20", "2E7D32", "E8F5E9"
ORANGE, ROUGE, GRIS_TXT = "EF6C00", "C62828", "616161"
SAISIE, CALCUL = "FFFDE7", "F5F5F5"
thin = Side(style="thin", color="BFBFBF")
BORDER = Border(left=thin, right=thin, top=thin, bottom=thin)
FMT = {
    "date": "dd/mm/yyyy",
    "fcfa": '#,##0;[Red]-#,##0;"-"',
    "pct": '0%;[Red]-0%;"-"',
    "int": '#,##0;[Red]-#,##0;"-"',
    "dec": '#,##0.0;[Red]-#,##0.0;"-"',
}


def font(bold=False, color="000000", size=10, italic=False):
    return Font(name=FONT, bold=bold, color=color, size=size, italic=italic)


def fill(c):
    return PatternFill("solid", start_color=c, end_color=c)


CENTER = Alignment(horizontal="center", vertical="center", wrap_text=True)
LEFT = Alignment(horizontal="left", vertical="center", wrap_text=True)

wb = Workbook()
wb.remove(wb.active)


def nom(name, sheet, ref):
    wb.defined_names[name] = DefinedName(name, attr_text=f"'{sheet}'!{ref}")


def entete(ws, module, ncols, desc=""):
    last = L(max(ncols, 6))
    lignes = [
        ("METRIX AVANCÉ CHANTIER BTP", font(True, "FFFFFF", 16), VERT, 26),
        (module, font(True, "FFFFFF", 12), VERT2, 20),
        ('="Chantier : "&P_Chantier&"     |     Auteur : ' + AUTEUR + '"',
         font(True, VERT, 10), VERT_CLAIR, 18),
        (desc, font(False, GRIS_TXT, 9, True), None, 30),
    ]
    for i, (val, ft, bg, h) in enumerate(lignes, start=1):
        ws.merge_cells(f"A{i}:{last}{i}")
        c = ws[f"A{i}"]
        c.value, c.font, c.alignment = val, ft, LEFT
        if bg:
            for col in range(1, max(ncols, 6) + 1):
                ws.cell(i, col).fill = fill(bg)
        ws.row_dimensions[i].height = h
    ws.sheet_view.showGridLines = False
    ws.page_setup.orientation = "landscape"
    ws.page_setup.paperSize = ws.PAPERSIZE_A4
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 0
    ws.sheet_properties.pageSetUpPr.fitToPage = True
    ws.oddHeader.left.text = "METRIX AVANCÉ CHANTIER BTP"
    ws.oddHeader.right.text = "&A"
    ws.oddFooter.left.text = "Auteur : " + AUTEUR
    ws.oddFooter.right.text = "Page &P / &N"


def table(ws, top, cols, data, n, col0=1):
    """Construit un tableau : en-tête en ligne `top`, n lignes de données.
    cols : liste de dict(key, h, w, fmt, f (modèle de formule), dv (nom de liste),
    name (nom défini pour la colonne), note (commentaire d'en-tête)).
    Les modèles de formule utilisent {r} (ligne) et {cle} (lettre de colonne)."""
    let = {c["key"]: L(col0 + i) for i, c in enumerate(cols)}
    first, last = top + 1, top + n
    for i, c in enumerate(cols):
        col = col0 + i
        h = ws.cell(top, col, c["h"])
        h.font, h.fill, h.alignment, h.border = font(True, "FFFFFF"), fill(VERT2), CENTER, BORDER
        if c.get("note"):
            h.comment = Comment(c["note"], AUTEUR)
        ws.column_dimensions[L(col)].width = c.get("w", 14)
        for k in range(n):
            r = first + k
            cell = ws.cell(r, col)
            if c.get("f"):
                cell.value = c["f"].format(r=r, **let)
                cell.font, cell.fill = font(), fill(CALCUL)
            else:
                if k < len(data):
                    cell.value = data[k].get(c["key"])
                elif "defaut" in c:
                    cell.value = None
                cell.font, cell.fill = font(color="1F3FBF"), fill(SAISIE)
            cell.border = BORDER
            cell.alignment = CENTER if c.get("fmt") in ("date", "pct") or c.get("centre") else LEFT
            if c.get("fmt"):
                cell.number_format = FMT[c["fmt"]]
        rng = f"{L(col)}{first}:{L(col)}{last}"
        if c.get("dv"):
            dv = DataValidation(type="list", formula1=f"={c['dv']}", allow_blank=True,
                                showErrorMessage=not c.get("libre", False))
            dv.add(rng)
            ws.add_data_validation(dv)
        if c.get("name"):
            nom(c["name"], ws.title, f"${L(col)}${first}:${L(col)}${last}")
    ws.row_dimensions[top].height = 32
    ws.freeze_panes = ws.cell(first, col0 + 1 if col0 == 1 else 1)
    ws.auto_filter.ref = f"{L(col0)}{top}:{L(col0 + len(cols) - 1)}{last}"
    return let, first, last


def cf_statut(ws, rng, rouge=(), orange=(), vert=(), gris=()):
    for vals, c in ((rouge, ROUGE), (orange, ORANGE), (vert, VERT2), (gris, "9E9E9E")):
        for v in vals:
            ws.conditional_formatting.add(rng, CellIsRule(
                operator="equal", formula=[f'"{v}"'], fill=fill(c),
                font=Font(name=FONT, bold=True, color="FFFFFF")))


D = dt.date
# =================================================================== ACCUEIL
acc = wb.create_sheet("Accueil")
# ================================================================ PARAMÈTRES
par = wb.create_sheet("Paramètres")
entete(par, "PARAMÈTRES DU CHANTIER & LISTES DE RÉFÉRENCE", 16,
        "Renseignez ici les données générales du chantier. Les listes (colonnes E à O) "
        "alimentent les menus déroulants de tous les onglets : ajoutez vos éléments en bas de chaque liste.")
par.column_dimensions["A"].width = 3
par.column_dimensions["B"].width = 34
par.column_dimensions["C"].width = 40
par.column_dimensions["D"].width = 3
params = [
    ("P_Chantier", "Intitulé du chantier", "Construction d'une villa R+1 – Cocody Angré (exemple)", None, None),
    ("P_MOA", "Maître d'ouvrage", "À renseigner", None, None),
    ("P_MOE", "Maître d'œuvre / BET", "À renseigner", None, None),
    ("P_Entreprise", "Entreprise titulaire", "À renseigner", None, None),
    ("P_Conducteur", "Conducteur de travaux", AUTEUR, None, None),
    ("P_Lieu", "Localisation", "Abidjan – Côte d'Ivoire", None, None),
    ("P_Marche_No", "N° du marché / contrat", "À renseigner", None, None),
    ("P_Debut", "Date de démarrage (OS)", D(2026, 8, 3), "date", None),
    ("P_Delai", "Délai contractuel (jours calendaires)", 180, "int", None),
    ("P_Fin", "Date de fin contractuelle", "=P_Debut+P_Delai-1", "date", "calc"),
    ("P_DateRef", "Date de référence (pilotage)", "=TODAY()", "date",
     "Par défaut = date du jour (AUJOURDHUI). Saisissez une date fixe pour analyser le chantier à une date passée."),
    ("P_Marche", "Montant du marché HT (FCFA)", "=SIT_TotMarche", "fcfa", "calc"),
    ("P_TVA", "Taux de TVA", 0.18, "pct", "TVA Côte d'Ivoire : 18 % (taux normal)."),
    ("P_RG", "Retenue de garantie", 0.05, "pct", "Usuel : 5 % jusqu'à la réception définitive."),
    ("P_Avance", "Remboursement avance de démarrage (% des situations)", 0.10, "pct",
     "Pourcentage retenu sur chaque situation pour rembourser l'avance. Mettre 0 s'il n'y a pas d'avance."),
    ("P_Heures", "Heures de travail par jour", 8, "int", None),
    ("P_Tol", "Tolérance d'écart avant alerte", 0.10, "pct",
     "Écart toléré entre avancement prévu et réel (ou entre % consommé et % avancé) avant alerte."),
]
r = 6
par.cell(r, 2, "DONNÉES GÉNÉRALES").font = font(True, VERT, 11)
for name, lib, val, fmt, note in params:
    r += 1
    a, b = par.cell(r, 2, lib), par.cell(r, 3, val)
    a.font, a.border, a.alignment = font(True), BORDER, LEFT
    b.border, b.alignment = BORDER, LEFT
    calc = note == "calc" or (isinstance(val, str) and val.startswith("="))
    b.font = font(color="1F3FBF") if not calc else font()
    b.fill = fill(CALCUL if note == "calc" else SAISIE)
    if fmt:
        b.number_format = FMT[fmt]
    if note and note != "calc":
        b.comment = Comment(note, AUTEUR)
    nom(name, "Paramètres", f"$C${r}")
par.cell(r + 2, 2, "Contexte ivoirien : grande saison des pluies ≈ avril–juillet, petite saison ≈ octobre–novembre. "
         "Prévoir des marges de délai sur terrassements et bétonnages pendant ces périodes.").font = font(False, GRIS_TXT, 9, True)
par.merge_cells(start_row=r + 2, start_column=2, end_row=r + 2, end_column=3)
par.row_dimensions[r + 2].height = 40
par.cell(r + 2, 2).alignment = LEFT

LOTS = ["L01 Installation chantier", "L02 Terrassements", "L03 Fondations", "L04 Gros œuvre RDC",
        "L05 Gros œuvre R+1", "L06 Charpente-couverture", "L07 Second œuvre",
        "L08 Plomberie-électricité", "L09 VRD-assainissement"]
EQUIPES = ["Équipe A – Maçonnerie", "Équipe B – Ferraillage/Coffrage", "Équipe C – Terrassement/VRD",
           "Encadrement", "Sous-traitant"]
FOURN = ["Dépôt ciment Yopougon", "Quincaillerie Adjamé", "Carrière Anyama", "Sablière lagunaire",
         "Briqueterie Abobo", "Location engins", "Laboratoire essais"]
listes = [
    ("L_Lots", "Lots", LOTS),
    ("L_Equipes", "Équipes", EQUIPES),
    ("L_Fourn", "Fournisseurs", FOURN),
    ("L_Unites", "Unités", ["u", "ens", "ff", "m", "m²", "m³", "kg", "t", "sac", "barre", "l", "j", "h"]),
    ("L_Meteo", "Météo", ["Ensoleillé", "Nuageux", "Pluie faible", "Forte pluie", "Orage", "Harmattan"]),
    ("L_TypeInc", "Types d'incident", ["Sécurité / accident", "Qualité / non-conformité", "Retard",
                                        "Intempérie", "Matériel / panne", "Approvisionnement",
                                        "Environnement", "Litige / riverains"]),
    ("L_Gravite", "Gravité", ["Mineure", "Moyenne", "Majeure"]),
    ("L_StatInc", "Statut incident", ["Ouvert", "En cours", "Clos"]),
    ("L_Presence", "Présence", ["P", "A", "1/2"]),
    ("L_TypeMvt", "Type mouvement", ["Entrée", "Sortie"]),
    ("L_OuiNon", "Oui / Non", ["Oui", "Non"]),
]
for j, (name, titre, vals) in enumerate(listes):
    col = 5 + j
    par.column_dimensions[L(col)].width = 30 if j < 3 else (22 if j in (5,) else 14)
    h = par.cell(6, col, titre)
    h.font, h.fill, h.alignment, h.border = font(True, "FFFFFF"), fill(VERT2), CENTER, BORDER
    for k in range(25):
        c = par.cell(7 + k, col, vals[k] if k < len(vals) else None)
        c.font, c.fill, c.border = font(color="1F3FBF"), fill(SAISIE), BORDER
    nom(name, "Paramètres", f"${L(col)}$7:${L(col)}$31")
par.freeze_panes = "A7"

# ================================================================ PERSONNEL
pers = wb.create_sheet("Personnel")
entete(pers, "FICHIER DU PERSONNEL (base du pointage et des affectations)", 10,
       "Un ouvrier par ligne. Le matricule est la clé utilisée dans le pointage. "
       "Taux journalier en FCFA (à adapter aux barèmes en vigueur et aux conventions de l'entreprise).")
PERSONNEL = [
    ("M001", "KOFFI Yao", "Chef de chantier", EQUIPES[3], 15000),
    ("M002", "KOUAMÉ Serge", "Chef d'équipe maçon", EQUIPES[0], 10000),
    ("M003", "DIABATÉ Moussa", "Maçon", EQUIPES[0], 7000),
    ("M004", "TRAORÉ Ibrahim", "Maçon", EQUIPES[0], 7000),
    ("M005", "N'GUESSAN Paul", "Manœuvre", EQUIPES[0], 3500),
    ("M006", "OUATTARA Lassina", "Manœuvre", EQUIPES[0], 3500),
    ("M007", "BAMBA Seydou", "Chef d'équipe ferrailleur", EQUIPES[1], 10000),
    ("M008", "KONÉ Adama", "Ferrailleur", EQUIPES[1], 7000),
    ("M009", "YAO Kouadio", "Coffreur", EQUIPES[1], 7000),
    ("M010", "SORO Nanga", "Manœuvre", EQUIPES[1], 3500),
    ("M011", "GNAHORÉ Didier", "Conducteur d'engin", EQUIPES[2], 8000),
    ("M012", "ZADI Martial", "Manœuvre", EQUIPES[2], 3500),
]
pers_data = [dict(mat=m, nom=n, fct=f, eq=e, taux=t) for m, n, f, e, t in PERSONNEL]
table(pers, 6, [
    dict(key="mat", h="Matricule", w=11, name="PE_Mat", centre=True),
    dict(key="nom", h="Nom & prénoms", w=24, name="PE_Nom"),
    dict(key="fct", h="Fonction", w=24, name="PE_Fonction"),
    dict(key="eq", h="Équipe", w=30, dv="L_Equipes", name="PE_Equipe"),
    dict(key="taux", h="Taux journalier (FCFA)", w=14, fmt="fcfa", name="PE_Taux"),
    dict(key="tel", h="Téléphone", w=15),
    dict(key="cnps", h="N° CNPS", w=14),
    dict(key="jt", h="Jours travaillés", w=12, fmt="dec",
         f='=IF({mat}{r}="","",SUMIFS(PT_Heures,PT_Mat,{mat}{r})/P_Heures)'),
    dict(key="du", h="Montant cumulé dû (FCFA)", w=16, fmt="fcfa",
         f='=IF({mat}{r}="","",SUMIFS(PT_Cout,PT_Mat,{mat}{r}))'),
    dict(key="obs", h="Observations", w=24),
], pers_data, 60)

# ================================================================ 01 PLANNING
pl = wb.create_sheet("01_Planning")
NB_SEM = 26
G0 = 12  # première colonne du Gantt (L)
entete(pl, "01 · PLANNING GANTT DU CHANTIER", G0 + NB_SEM - 1,
       "Saisissez lot, tâche, date de début, durée et % réalisé. Fin, % prévu, écart et statut sont calculés. "
       "Barres : vert foncé = réalisé · vert clair = prévu · rouge = tâche en retard · colonne orange = semaine de la date de référence.")
P = [
    ("L01 Installation chantier", "Installation de chantier, clôture, base vie", EQUIPES[3], D(2026, 8, 3), 7, 1),
    ("L02 Terrassements", "Décapage terre végétale & implantation", EQUIPES[2], D(2026, 8, 8), 5, 1),
    ("L02 Terrassements", "Fouilles en rigoles et semelles (sol latéritique)", EQUIPES[2], D(2026, 8, 12), 8, 1),
    ("L03 Fondations", "Béton de propreté dosé 150 kg/m³", EQUIPES[0], D(2026, 8, 20), 3, 1),
    ("L03 Fondations", "Semelles isolées & filantes en BA", EQUIPES[1], D(2026, 8, 23), 12, 1),
    ("L03 Fondations", "Soubassement, longrines & remblai latéritique compacté", EQUIPES[0], D(2026, 9, 4), 12, 1),
    ("L04 Gros œuvre RDC", "Dallage RDC (hérisson + dalle 10 cm)", EQUIPES[0], D(2026, 9, 16), 7, 1),
    ("L04 Gros œuvre RDC", "Poteaux & élévation maçonnerie RDC", EQUIPES[0], D(2026, 9, 23), 18, 0.8),
    ("L05 Gros œuvre R+1", "Coffrage & ferraillage poutres / dalle haute RDC", EQUIPES[1], D(2026, 10, 8), 14, 0.3),
    ("L05 Gros œuvre R+1", "Coulage dalle haute RDC + cure humide 7 j", EQUIPES[1], D(2026, 10, 22), 9, 0),
    ("L05 Gros œuvre R+1", "Élévation maçonnerie R+1", EQUIPES[0], D(2026, 11, 2), 18, 0),
    ("L06 Charpente-couverture", "Chaînage haut, charpente & couverture", EQUIPES[1], D(2026, 11, 20), 15, 0),
    ("L08 Plomberie-électricité", "Réseaux plomberie & électricité (saignées, gaines)", EQUIPES[4], D(2026, 11, 25), 20, 0),
    ("L07 Second œuvre", "Enduits intérieurs & extérieurs", EQUIPES[0], D(2026, 12, 7), 18, 0),
    ("L07 Second œuvre", "Chapes, carrelage & faïence", EQUIPES[4], D(2026, 12, 21), 15, 0),
    ("L07 Second œuvre", "Menuiseries bois / alu & vitrerie", EQUIPES[4], D(2027, 1, 4), 12, 0),
    ("L09 VRD-assainissement", "Fosse septique, puisard, caniveaux", EQUIPES[2], D(2027, 1, 5), 14, 0),
    ("L07 Second œuvre", "Peinture, finitions, nettoyage & réception", EQUIPES[0], D(2027, 1, 14), 14, 0),
]
pl_data = [dict(no=i + 1, lot=a, tache=b, resp=c, deb=d, dur=e, real=f) for i, (a, b, c, d, e, f) in enumerate(P)]
NPL = 60
let, f1, l1 = table(pl, 7, [
    dict(key="no", h="N°", w=5, centre=True),
    dict(key="lot", h="Lot", w=22, dv="L_Lots", name="PL_Lot"),
    dict(key="tache", h="Tâche", w=40, name="PL_Tache"),
    dict(key="resp", h="Équipe / responsable", w=22, dv="L_Equipes", libre=True, name="PL_Resp"),
    dict(key="deb", h="Début", w=11, fmt="date", name="PL_Debut"),
    dict(key="dur", h="Durée (j cal.)", w=8, fmt="int", name="PL_Duree", centre=True),
    dict(key="fin", h="Fin", w=11, fmt="date", name="PL_Fin",
         f='=IF(OR({deb}{r}="",{dur}{r}=""),"",{deb}{r}+{dur}{r}-1)'),
    dict(key="real", h="% réalisé", w=9, fmt="pct", name="PL_Real",
         note="Avancement physique constaté sur le terrain (0 % à 100 %)."),
    dict(key="prev", h="% prévu à date", w=9, fmt="pct", name="PL_Prevu",
         f='=IF(OR({deb}{r}="",{dur}{r}=""),"",MAX(0,MIN(1,(P_DateRef-{deb}{r}+1)/{dur}{r})))'),
    dict(key="ecart", h="Écart réel - prévu", w=9, fmt="pct",
         f='=IF({prev}{r}="","",N({real}{r})-{prev}{r})'),
    dict(key="stat", h="Statut", w=12, name="PL_Statut", centre=True,
         f='=IF({tache}{r}="","",IF(N({real}{r})>=1,"Terminé",IF({deb}{r}="","À planifier",'
           'IF(P_DateRef<{deb}{r},"À venir",IF(OR(P_DateRef>{fin}{r},N({real}{r})<{prev}{r}-P_Tol),"En retard","En cours")))))'),
], pl_data, NPL)
# Colonnes Gantt
for k in range(NB_SEM):
    col = G0 + k
    pl.column_dimensions[L(col)].width = 4.6
    s = pl.cell(6, col, f"S{k + 1}")
    s.font, s.alignment, s.fill = font(True, "FFFFFF", 8), CENTER, fill(VERT)
    h = pl.cell(7, col, "=P_Debut-WEEKDAY(P_Debut,2)+1" if k == 0 else f"={L(col - 1)}7+7")
    h.number_format = "dd/mm"
    h.font, h.fill, h.border = font(True, "FFFFFF", 8), fill(VERT2), BORDER
    h.alignment = Alignment(horizontal="center", vertical="center", text_rotation=90)
    for r in range(f1, l1 + 1):
        pl.cell(r, col).border = BORDER
pl.row_dimensions[7].height = 44
g = f"{L(G0)}{f1}:{L(G0 + NB_SEM - 1)}{l1}"
tl = f"{L(G0)}"
ovl = f'$E{f1}<>"",$F{f1}<>"",{tl}$7<=$G{f1},{tl}$7+6>=$E{f1}'
pl.conditional_formatting.add(g, FormulaRule(formula=[f"AND({ovl},{tl}$7<$E{f1}+$F{f1}*N($H{f1}))"],
                                             fill=fill(VERT), stopIfTrue=True))
pl.conditional_formatting.add(g, FormulaRule(formula=[f'AND({ovl},$K{f1}="En retard")'],
                                             fill=fill("EF9A9A"), stopIfTrue=True))
pl.conditional_formatting.add(g, FormulaRule(formula=[f"AND({ovl})"], fill=fill("A5D6A7"), stopIfTrue=True))
pl.conditional_formatting.add(f"{L(G0)}7:{L(G0 + NB_SEM - 1)}{l1}", FormulaRule(
    formula=[f"AND(P_DateRef>={tl}$7,P_DateRef<{tl}$7+7)"], fill=fill("FFCC80")))
cf_statut(pl, f"K{f1}:K{l1}", rouge=["En retard"], orange=["En cours"], vert=["Terminé"], gris=["À venir", "À planifier"])
pl.conditional_formatting.add(f"J{f1}:J{l1}", FormulaRule(formula=[f'AND(J{f1}<>"",J{f1}<-P_Tol)'],
                                                          font=Font(name=FONT, bold=True, color=ROUGE)))
pl.freeze_panes = "D8"
pl.cell(5, 1, "Date de référence :").font = font(True)
pl.merge_cells("A5:C5")
c = pl.cell(5, 4, "=P_DateRef"); c.number_format = FMT["date"]; c.font = font(True, ORANGE)

# =========================================================== 02 TABLEAU DE BORD
tb = wb.create_sheet("02_Tableau_de_bord")
# ================================================================== 03 BUDGET
bu = wb.create_sheet("03_Budget")
entete(bu, "03 · SUIVI BUDGÉTAIRE PAR LOT", 13,
       "Saisissez le budget prévu (déboursé sec) et les autres dépenses non facturées (caisse, petites dépenses). "
       "Engagé, factures et main-d'œuvre sont totalisés automatiquement depuis les onglets 05, 06 et 08.")
BUDGET = [2_000_000, 3_500_000, 9_500_000, 14_000_000, 15_000_000, 7_500_000, 14_000_000, 6_000_000, 3_500_000]
AUTRES = [350_000, 0, 120_000, 0, 0, 0, 0, 0, 0]
NBU = 15
bu_data = [dict(bud=b, aut=a) for b, a in zip(BUDGET, AUTRES)]
let, f1, l1 = table(bu, 6, [
    dict(key="lot", h="Lot", w=26, name="BU_Lot",
         f="=IF(INDEX(L_Lots,{r}-6)=\"\",\"\",INDEX(L_Lots,{r}-6))"),
    dict(key="bud", h="Budget prévu HT (FCFA)", w=16, fmt="fcfa", name="BU_Budget"),
    dict(key="eng", h="Engagé – bons de commande (FCFA)", w=16, fmt="fcfa", name="BU_Engage",
         f='=IF({lot}{r}="","",SUMIFS(BC_HT,BC_Lot,{lot}{r}))'),
    dict(key="fac", h="Factures fournisseurs HT (FCFA)", w=16, fmt="fcfa", name="BU_Factures",
         f='=IF({lot}{r}="","",SUMIFS(FA_HT,FA_Lot,{lot}{r}))'),
    dict(key="mo", h="Main-d'œuvre pointée (FCFA)", w=16, fmt="fcfa", name="BU_MO",
         f='=IF({lot}{r}="","",SUMIFS(PT_Cout,PT_Lot,{lot}{r}))'),
    dict(key="aut", h="Autres dépenses HT (FCFA)", w=16, fmt="fcfa", name="BU_Autres"),
    dict(key="dep", h="Total dépensé (FCFA)", w=16, fmt="fcfa", name="BU_Depense",
         f='=IF({lot}{r}="","",N({fac}{r})+N({mo}{r})+N({aut}{r}))'),
    dict(key="reste", h="Reste budget (FCFA)", w=16, fmt="fcfa", name="BU_Reste",
         f='=IF({lot}{r}="","",N({bud}{r})-{dep}{r})'),
    dict(key="conso", h="% consommé", w=10, fmt="pct", name="BU_Conso",
         f='=IF(OR({lot}{r}="",N({bud}{r})=0),"",{dep}{r}/{bud}{r})'),
    dict(key="avc", h="Avancement physique du lot", w=11, fmt="pct", name="BU_Avanc",
         f='=IF({lot}{r}="","",IFERROR(SUMPRODUCT((PL_Lot={lot}{r})*PL_Duree*PL_Real)/SUMIFS(PL_Duree,PL_Lot,{lot}{r}),""))'),
    dict(key="alert", h="Alerte", w=16, name="BU_Alerte", centre=True,
         f='=IF({conso}{r}="","",IF({dep}{r}>N({bud}{r}),"Dépassement",'
           'IF({conso}{r}-IF({avc}{r}="",0,{avc}{r})>P_Tol,"Surconsommation","OK")))'),
], bu_data, NBU)
tr = l1 + 1
bu.cell(tr, 1, "TOTAL").font = font(True, "FFFFFF")
for key in ("bud", "eng", "fac", "mo", "aut", "dep", "reste"):
    c = bu[f"{let[key]}{tr}"]
    c.value = f"=SUM({let[key]}{f1}:{let[key]}{l1})"
    c.number_format = FMT["fcfa"]
for col in range(1, 12):
    c = bu.cell(tr, col)
    c.fill, c.border = fill(VERT), BORDER
    c.font = font(True, "FFFFFF")
c = bu[f"{let['conso']}{tr}"]; c.value = f"=IF({let['bud']}{tr}=0,\"\",{let['dep']}{tr}/{let['bud']}{tr})"; c.number_format = FMT["pct"]
bu.cell(tr + 2, 1, "Note : le budget est suivi en HT (déboursé). « Surconsommation » = % consommé supérieur à "
        "l'avancement physique du lot + tolérance (Paramètres).").font = font(False, GRIS_TXT, 9, True)
cf_statut(bu, f"K{f1}:K{l1}", rouge=["Dépassement"], orange=["Surconsommation"], vert=["OK"])
bu.conditional_formatting.add(f"H{f1}:H{l1}", CellIsRule(operator="lessThan", formula=["0"],
                                                         font=Font(name=FONT, bold=True, color=ROUGE)))

# =============================================================== 04 SITUATIONS
si = wb.create_sheet("04_Situations")
entete(si, "04 · SITUATIONS DE TRAVAUX (décompte mensuel)", 13,
       "Base : DQE / BPU du marché. Chaque mois, reportez le cumul précédent puis saisissez les quantités exécutées "
       "dans le mois (attachements contradictoires). Le décompte (retenue de garantie, avance, TVA) est calculé en bas.")
si["A5"], si["C5"] = "Situation n° :", 3
si["E5"], si["F5"] = "Période du :", D(2026, 10, 1)
si["H5"], si["I5"] = "au :", D(2026, 10, 31)
for a in ("A5", "E5", "H5"):
    si[a].font = font(True)
for a in ("C5", "F5", "I5"):
    si[a].font, si[a].fill, si[a].border = font(True, "1F3FBF"), fill(SAISIE), BORDER
si["F5"].number_format = si["I5"].number_format = FMT["date"]
DQE = [
    ("1.1", LOTS[0], "Installation et repli de chantier", "ens", 1, 2_500_000, 1, 0),
    ("2.1", LOTS[1], "Décapage et nivellement de la plateforme", "m²", 400, 1_500, 400, 0),
    ("2.2", LOTS[1], "Fouilles en terrain latéritique", "m³", 180, 6_500, 180, 0),
    ("2.3", LOTS[1], "Remblai latéritique compacté à 95 % OPM", "m³", 150, 9_000, 150, 0),
    ("3.1", LOTS[2], "Béton de propreté dosé à 150 kg/m³", "m³", 12, 75_000, 12, 0),
    ("3.2", LOTS[2], "Béton armé en fondations dosé à 350 kg/m³", "m³", 45, 185_000, 45, 0),
    ("3.3", LOTS[2], "Maçonnerie de soubassement en agglos pleins", "m²", 160, 14_000, 160, 0),
    ("4.1", LOTS[3], "Dallage RDC ép. 10 cm sur hérisson", "m²", 180, 15_000, 180, 0),
    ("4.2", LOTS[3], "Béton armé poteaux et poutres RDC", "m³", 22, 210_000, 8, 6),
    ("4.3", LOTS[3], "Maçonnerie agglos creux de 15 RDC", "m²", 420, 9_500, 180, 150),
    ("5.1", LOTS[4], "Dalle haute RDC en BA ép. 16 cm", "m²", 180, 32_000, 0, 0),
    ("5.2", LOTS[4], "Béton armé et maçonnerie R+1", "ens", 1, 13_500_000, 0, 0),
    ("6.1", LOTS[5], "Charpente et couverture bac alu", "m²", 220, 32_000, 0, 0),
    ("7.1", LOTS[6], "Enduits intérieurs et extérieurs", "m²", 1400, 3_500, 0, 0),
    ("7.2", LOTS[6], "Carrelage et faïence", "m²", 320, 14_000, 0, 0),
    ("7.3", LOTS[6], "Menuiseries bois et aluminium", "ens", 1, 6_500_000, 0, 0),
    ("7.4", LOTS[6], "Peinture intérieure et extérieure", "m²", 1600, 2_200, 0, 0),
    ("8.1", LOTS[7], "Plomberie sanitaire", "ens", 1, 3_800_000, 0, 0),
    ("8.2", LOTS[7], "Électricité courants forts / faibles", "ens", 1, 3_500_000, 0, 0),
    ("9.1", LOTS[8], "VRD et assainissement autonome", "ens", 1, 3_800_000, 0, 0),
]
si_data = [dict(no=a, lot=b, des=c, u=d, qm=e, pu=f, qp=g, qmois=h) for a, b, c, d, e, f, g, h in DQE]
NSI = 60
let, f1, l1 = table(si, 7, [
    dict(key="no", h="N° prix", w=7, centre=True),
    dict(key="lot", h="Lot", w=20, dv="L_Lots"),
    dict(key="des", h="Désignation", w=40),
    dict(key="u", h="Unité", w=6, dv="L_Unites", centre=True),
    dict(key="qm", h="Qté marché", w=10, fmt="dec"),
    dict(key="pu", h="PU HT (FCFA)", w=12, fmt="fcfa"),
    dict(key="mm", h="Montant marché HT", w=14, fmt="fcfa", name="SIT_Marche",
         f='=IF({qm}{r}="","",{qm}{r}*N({pu}{r}))'),
    dict(key="qp", h="Qté cumul précédent", w=10, fmt="dec"),
    dict(key="qmois", h="Qté du mois", w=10, fmt="dec"),
    dict(key="qc", h="Qté cumulée", w=10, fmt="dec",
         f='=IF({qm}{r}="","",N({qp}{r})+N({qmois}{r}))'),
    dict(key="pct", h="% exécuté", w=9, fmt="pct",
         f='=IF(N({qm}{r})=0,"",{qc}{r}/{qm}{r})'),
    dict(key="mp", h="Montant cumul précédent", w=14, fmt="fcfa", name="SIT_Prec",
         f='=IF({qm}{r}="","",N({qp}{r})*N({pu}{r}))'),
    dict(key="mc", h="Montant cumulé HT", w=14, fmt="fcfa", name="SIT_Cumul",
         f='=IF({qm}{r}="","",{qc}{r}*N({pu}{r}))'),
], si_data, NSI)
si.conditional_formatting.add(f"K{f1}:K{l1}", FormulaRule(formula=[f'AND(K{f1}<>"",K{f1}>1)'],
                                                          fill=fill("EF9A9A")))
tr = l1 + 1
for col in range(1, 14):
    c = si.cell(tr, col); c.fill, c.font, c.border = fill(VERT), font(True, "FFFFFF"), BORDER
si.cell(tr, 3, "TOTAUX HT")
for key, nm_ in (("mm", "SIT_TotMarche"), ("mp", "SIT_TotPrec"), ("mc", "SIT_TotCumul")):
    c = si[f"{let[key]}{tr}"]; c.value = f"=SUM({let[key]}{f1}:{let[key]}{l1})"; c.number_format = FMT["fcfa"]
    nom(nm_, "04_Situations", f"${let[key]}${tr}")
# Décompte
rd = tr + 2
si.cell(rd, 3, "DÉCOMPTE DE LA SITUATION").font = font(True, VERT, 11)
lignes = [
    ("Montant cumulé des travaux HT", "=SIT_TotCumul", "=SIT_TotPrec"),
    ("Retenue de garantie", "=-SIT_TotCumul*P_RG", "=-SIT_TotPrec*P_RG"),
    ("Remboursement de l'avance de démarrage", "=-SIT_TotCumul*P_Avance", "=-SIT_TotPrec*P_Avance"),
    ("Net cumulé HT", f"=SUM(E{rd + 2}:E{rd + 4})", f"=SUM(F{rd + 2}:F{rd + 4})"),
]
for j, hd in enumerate(["Cumul à ce jour", "Cumul précédent", "Montant de la situation"]):
    c = si.cell(rd + 1, 5 + j, hd); c.font, c.fill, c.alignment, c.border = font(True, "FFFFFF"), fill(VERT2), CENTER, BORDER
for i, (lib, a, b) in enumerate(lignes):
    rr = rd + 2 + i
    si.cell(rr, 3, lib).font = font(i == 3)
    for j, v in enumerate([a, b, f"=E{rr}-F{rr}"]):
        c = si.cell(rr, 5 + j, v); c.number_format = FMT["fcfa"]; c.border = BORDER; c.font = font(i == 3)
rr = rd + 6
for i, (lib, v) in enumerate([("TVA", f"=G{rd + 5}*P_TVA"), ("NET À PAYER TTC (situation)", f"=G{rd + 5}+G{rr}")]):
    si.cell(rr + i, 3, lib).font = font(i == 1)
    c = si.cell(rr + i, 7, v); c.number_format = FMT["fcfa"]; c.border = BORDER; c.font = font(i == 1, ROUGE if i else "000000")
nom("SIT_NetTTC", "04_Situations", f"$G${rr + 1}")
si.cell(rr + 3, 3, "Avancement financier du marché").font = font(True)
c = si.cell(rr + 3, 7, "=IF(SIT_TotMarche=0,0,SIT_TotCumul/SIT_TotMarche)"); c.number_format = FMT["pct"]; c.font = font(True, VERT)
si.cell(rr + 5, 3, "Le maître d'ouvrage : ……………………        Le maître d'œuvre : ……………………        "
        "Le conducteur de travaux : " + AUTEUR).font = font(False, GRIS_TXT, 9, True)

# ================================================================ 05 FACTURES
fa = wb.create_sheet("05_Factures")
entete(fa, "05 · FACTURES FOURNISSEURS & ÉCHÉANCIER DE PAIEMENT", 18,
       "Saisissez chaque facture reçue et les paiements effectués. Statut et retards sont calculés "
       "par rapport à la date de référence. Les montants HT alimentent le suivi budgétaire (03).")
FACT = [
    ("FA-0812", D(2026, 8, 12), FOURN[0], LOTS[2], "Ciment CPJ 42.5 – 300 sacs", "BC-001", 1_560_000, 30, 1_840_800, D(2026, 9, 10)),
    ("LOC-0815", D(2026, 8, 15), FOURN[5], LOTS[1], "Location niveleuse + compacteur 5 j", "", 1_200_000, 30, 1_416_000, D(2026, 9, 14)),
    ("FQ-2201", D(2026, 8, 22), FOURN[1], LOTS[2], "Acier HA12 – 120 barres", "BC-002", 672_000, 30, 792_960, D(2026, 9, 20)),
    ("FQ-2202", D(2026, 8, 22), FOURN[1], LOTS[2], "Acier HA10 – 150 barres", "BC-003", 585_000, 30, 690_300, D(2026, 9, 20)),
    ("CA-0904", D(2026, 9, 4), FOURN[2], LOTS[2], "Gravier 5/15 – 30 m³", "BC-004", 540_000, 30, 300_000, D(2026, 9, 30)),
    ("SL-0904", D(2026, 9, 4), FOURN[3], LOTS[2], "Sable lagunaire – 40 m³", "BC-005", 360_000, 30, 424_800, D(2026, 9, 28)),
    ("BR-0926", D(2026, 9, 26), FOURN[4], LOTS[3], "Agglos creux 15 – 2 500 u", "BC-006", 875_000, 30, None, None),
    ("FA-1010", D(2026, 10, 10), FOURN[0], LOTS[4], "Ciment CPJ 42.5 – 250 sacs", "BC-007", 1_300_000, 15, None, None),
    ("FQ-1013", D(2026, 10, 13), FOURN[1], LOTS[4], "Acier HA14 – 60 barres (livraison partielle)", "BC-008", 468_000, 30, None, None),
]
fa_data = [dict(num=a, date=b, four=c, lot=d, obj=e, bc=f, ht=g, tx=0.18, delai=h, paye=i, dpay=j)
           for a, b, c, d, e, f, g, h, i, j in FACT]
let, f1, l1 = table(fa, 6, [
    dict(key="num", h="N° facture", w=11, name="FA_Num"),
    dict(key="date", h="Date facture", w=11, fmt="date"),
    dict(key="four", h="Fournisseur", w=22, dv="L_Fourn", libre=True, name="FA_Fourn"),
    dict(key="lot", h="Lot imputé", w=20, dv="L_Lots", name="FA_Lot"),
    dict(key="obj", h="Objet", w=30),
    dict(key="bc", h="N° BC lié", w=9, dv="BC_Num", libre=True),
    dict(key="ht", h="Montant HT (FCFA)", w=13, fmt="fcfa", name="FA_HT"),
    dict(key="tx", h="Taux TVA", w=7, fmt="pct", note="18 % par défaut. Mettre 0 % pour un fournisseur non assujetti."),
    dict(key="tva", h="TVA (FCFA)", w=11, fmt="fcfa", f='=IF({ht}{r}="","",{ht}{r}*N({tx}{r}))'),
    dict(key="ttc", h="Montant TTC (FCFA)", w=13, fmt="fcfa", name="FA_TTC", f='=IF({ht}{r}="","",{ht}{r}+{tva}{r})'),
    dict(key="delai", h="Délai paiement (j)", w=8, fmt="int", centre=True),
    dict(key="ech", h="Échéance", w=11, fmt="date", name="FA_Echeance",
         f='=IF(OR({date}{r}="",{delai}{r}=""),"",{date}{r}+{delai}{r})'),
    dict(key="paye", h="Montant payé (FCFA)", w=13, fmt="fcfa"),
    dict(key="dpay", h="Date dernier paiement", w=11, fmt="date"),
    dict(key="reste", h="Reste à payer (FCFA)", w=13, fmt="fcfa", name="FA_Reste",
         f='=IF({ht}{r}="","",{ttc}{r}-N({paye}{r}))'),
    dict(key="stat", h="Statut", w=13, name="FA_Statut", centre=True,
         f='=IF({ht}{r}="","",IF({reste}{r}<=0,"Réglée",IF({ech}{r}="","À payer",IF(P_DateRef>{ech}{r},"En retard",'
           'IF({ech}{r}-P_DateRef<=7,"À payer < 7j","À payer")))))'),
    dict(key="jr", h="Jours de retard", w=8, fmt="int", centre=True,
         f='=IF({stat}{r}="En retard",P_DateRef-{ech}{r},"")'),
    dict(key="rang", h="(rang tableau de bord)", w=8, name="FA_Rang", centre=True,
         f='=IF(OR({num}{r}="",N({reste}{r})<=0),"",COUNTIFS($A${f1}:{num}{r},"<>",${reste}${f1}:{reste}{r},">0"))'.replace("{f1}", str(7))),
], fa_data, 150)
cf_statut(fa, f"P{f1}:P{l1}", rouge=["En retard"], orange=["À payer < 7j"], vert=["Réglée"], gris=["À payer"])

# =============================================================== 06 POINTAGE
pt = wb.create_sheet("06_Pointage")
entete(pt, "06 · POINTAGE JOURNALIER DES OUVRIERS", 12,
       "Une ligne par ouvrier et par jour. Saisissez date, matricule, lot, tâche, présence (P / A / 1/2) et heures. "
       "Nom, équipe, taux et coût sont repris du fichier Personnel. Le coût alimente le budget par lot.")
pt_data = []
ASSIGN = {EQUIPES[0]: (LOTS[3], "Poteaux & élévation maçonnerie RDC"),
          EQUIPES[1]: (LOTS[4], "Coffrage & ferraillage poutres / dalle haute RDC"),
          EQUIPES[2]: (LOTS[3], "Approvisionnement poste maçonnerie"),
          EQUIPES[3]: (LOTS[0], "Encadrement, réception des livraisons")}
for jour in (D(2026, 10, 15), D(2026, 10, 16)):
    for m, n_, f_, e, t in PERSONNEL:
        pres, h = "P", 8
        if m == "M006" and jour.day == 16:
            pres, h = "A", 0
        if m == "M012" and jour.day == 15:
            pres, h = "1/2", 4
        pt_data.append(dict(date=jour, mat=m, lot=ASSIGN[e][0], tache=ASSIGN[e][1], pres=pres, h=h))
let, f1, l1 = table(pt, 6, [
    dict(key="date", h="Date", w=11, fmt="date", name="PT_Date"),
    dict(key="mat", h="Matricule", w=10, dv="PE_Mat", name="PT_Mat", centre=True),
    dict(key="nom", h="Nom & prénoms", w=22, f='=IF({mat}{r}="","",IFERROR(INDEX(PE_Nom,MATCH({mat}{r},PE_Mat,0)),"Matricule inconnu"))'),
    dict(key="fct", h="Fonction", w=20, f='=IF({mat}{r}="","",IFERROR(INDEX(PE_Fonction,MATCH({mat}{r},PE_Mat,0)),""))'),
    dict(key="eq", h="Équipe", w=26, name="PT_Equipe",
         f='=IF({mat}{r}="","",IFERROR(INDEX(PE_Equipe,MATCH({mat}{r},PE_Mat,0)),""))'),
    dict(key="lot", h="Lot", w=20, dv="L_Lots", name="PT_Lot"),
    dict(key="tache", h="Tâche", w=34, dv="PL_Tache", libre=True),
    dict(key="pres", h="Présence (P/A/1/2)", w=9, dv="L_Presence", name="PT_Pres", centre=True),
    dict(key="h", h="Heures", w=7, fmt="dec", name="PT_Heures", centre=True),
    dict(key="taux", h="Taux journalier (FCFA)", w=11, fmt="fcfa",
         f='=IF({mat}{r}="","",IFERROR(INDEX(PE_Taux,MATCH({mat}{r},PE_Mat,0)),0))'),
    dict(key="cout", h="Coût du jour (FCFA)", w=12, fmt="fcfa", name="PT_Cout",
         f='=IF({mat}{r}="","",IF({pres}{r}="A",0,IFERROR(N({h}{r})/P_Heures*{taux}{r},0)))'),
    dict(key="obs", h="Observations", w=22),
], pt_data, 2000)
cf_statut(pt, f"H{f1}:H{l1}", rouge=["A"], orange=["1/2"])

# ============================================================= 07 AFFECTATION
af = wb.create_sheet("07_Affectation")
entete(af, "07 · AFFECTATION DES ÉQUIPES (qui travaille, où, sur quelle tâche)", 11,
       "Planifiez chaque jour l'affectation des équipes. L'effectif présent est compté automatiquement "
       "depuis le pointage (06). Le tableau de bord affiche les équipes de la date de référence.")
af_data = []
for jour in (D(2026, 10, 15), D(2026, 10, 16)):
    af_data += [
        dict(date=jour, eq=EQUIPES[0], chef="KOUAMÉ Serge", tache="Poteaux & élévation maçonnerie RDC", lot=LOTS[3], zone="Façade nord – axes 1 à 3", prev=5),
        dict(date=jour, eq=EQUIPES[1], chef="BAMBA Seydou", tache="Coffrage & ferraillage poutres / dalle haute RDC", lot=LOTS[4], zone="Travées A-B", prev=4),
        dict(date=jour, eq=EQUIPES[2], chef="GNAHORÉ Didier", tache="Approvisionnement poste maçonnerie", lot=LOTS[3], zone="Aire de stockage", prev=2),
        dict(date=jour, eq=EQUIPES[3], chef="KOFFI Yao", tache="Encadrement, réception des livraisons", lot=LOTS[0], zone="Tout le chantier", prev=1),
    ]
let, f1, l1 = table(af, 6, [
    dict(key="date", h="Date", w=11, fmt="date", name="AF_Date"),
    dict(key="eq", h="Équipe", w=28, dv="L_Equipes", name="AF_Equipe"),
    dict(key="chef", h="Chef d'équipe", w=18),
    dict(key="tache", h="Tâche affectée", w=38, dv="PL_Tache", libre=True, name="AF_Tache"),
    dict(key="lot", h="Lot", w=20, dv="L_Lots"),
    dict(key="zone", h="Zone / axe / niveau", w=22, name="AF_Zone"),
    dict(key="prev", h="Effectif prévu", w=9, fmt="int", name="AF_Prevu", centre=True),
    dict(key="pres", h="Effectif présent (pointage)", w=10, fmt="dec", name="AF_Present", centre=True,
         f='=IF(OR({date}{r}="",{eq}{r}=""),"",COUNTIFS(PT_Date,{date}{r},PT_Equipe,{eq}{r},PT_Pres,"P")'
           '+0.5*COUNTIFS(PT_Date,{date}{r},PT_Equipe,{eq}{r},PT_Pres,"1/2"))'),
    dict(key="ecart", h="Écart", w=7, fmt="dec", centre=True,
         f='=IF({pres}{r}="","",{pres}{r}-N({prev}{r}))'),
    dict(key="obs", h="Consignes / observations", w=30),
    dict(key="rang", h="(rang tableau de bord)", w=8, name="AF_Rang", centre=True,
         f='=IF(OR({date}{r}="",{date}{r}<>P_DateRef),"",COUNTIF($A$7:{date}{r},P_DateRef))'),
], af_data, 400)
af.conditional_formatting.add(f"I{f1}:I{l1}", CellIsRule(operator="lessThan", formula=["0"],
                                                         font=Font(name=FONT, bold=True, color=ROUGE)))
af.conditional_formatting.add(f"A{f1}:K{l1}", FormulaRule(formula=[f"$A{f1}=P_DateRef"],
                                                          font=Font(name=FONT, bold=True, color=VERT)))

# =============================================================== 08 COMMANDES
bc = wb.create_sheet("08_Commandes")
entete(bc, "08 · BONS DE COMMANDE (BC) & SUIVI DES LIVRAISONS", 16,
       "Une ligne par article commandé. Les quantités livrées sont reprises des entrées de stock (09b) "
       "portant le même N° BC et le même code article. Les montants HT forment l'« engagé » du budget.")
BCS = [
    ("BC-001", D(2026, 8, 5), FOURN[0], LOTS[2], "CIM42", 300, 5_200, D(2026, 8, 10)),
    ("BC-002", D(2026, 8, 18), FOURN[1], LOTS[2], "HA12", 120, 5_600, D(2026, 8, 21)),
    ("BC-003", D(2026, 8, 18), FOURN[1], LOTS[2], "HA10", 150, 3_900, D(2026, 8, 21)),
    ("BC-004", D(2026, 9, 1), FOURN[2], LOTS[2], "GRA", 30, 18_000, D(2026, 9, 3)),
    ("BC-005", D(2026, 9, 1), FOURN[3], LOTS[2], "SAB", 40, 9_000, D(2026, 9, 3)),
    ("BC-006", D(2026, 9, 20), FOURN[4], LOTS[3], "AGG15", 3000, 350, D(2026, 9, 25)),
    ("BC-007", D(2026, 10, 5), FOURN[0], LOTS[4], "CIM42", 250, 5_200, D(2026, 10, 10)),
    ("BC-008", D(2026, 10, 6), FOURN[1], LOTS[4], "HA14", 100, 7_800, D(2026, 10, 12)),
    ("BC-009", D(2026, 10, 12), FOURN[1], LOTS[4], "HA8", 200, 2_600, D(2026, 10, 20)),
    ("BC-010", D(2026, 10, 13), FOURN[1], LOTS[4], "PLA", 150, 2_500, D(2026, 10, 15)),
]
bc_data = [dict(num=a, date=b, four=c, lot=d, code=e, q=f, pu=g, dprev=h) for a, b, c, d, e, f, g, h in BCS]
let, f1, l1 = table(bc, 6, [
    dict(key="num", h="N° BC", w=9, name="BC_Num", centre=True),
    dict(key="date", h="Date commande", w=11, fmt="date"),
    dict(key="four", h="Fournisseur", w=22, dv="L_Fourn", libre=True, name="BC_Fourn"),
    dict(key="lot", h="Lot", w=20, dv="L_Lots", name="BC_Lot"),
    dict(key="code", h="Code article", w=9, dv="ST_Code", name="BC_Code", centre=True),
    dict(key="des", h="Désignation", w=28, name="BC_Design",
         f='=IF({code}{r}="","",IFERROR(INDEX(ST_Design,MATCH({code}{r},ST_Code,0)),"Code inconnu"))'),
    dict(key="u", h="Unité", w=6, centre=True,
         f='=IF({code}{r}="","",IFERROR(INDEX(ST_Unite,MATCH({code}{r},ST_Code,0)),""))'),
    dict(key="q", h="Qté commandée", w=10, fmt="dec"),
    dict(key="pu", h="PU HT (FCFA)", w=11, fmt="fcfa"),
    dict(key="ht", h="Montant HT (FCFA)", w=13, fmt="fcfa", name="BC_HT",
         f='=IF({q}{r}="","",{q}{r}*N({pu}{r}))'),
    dict(key="dprev", h="Livraison prévue", w=11, fmt="date", name="BC_Prevue"),
    dict(key="ql", h="Qté livrée", w=10, fmt="dec",
         f='=IF({num}{r}="","",SUMIFS(MV_Qte,MV_BC,{num}{r},MV_Code,{code}{r},MV_Type,"Entrée"))'),
    dict(key="rl", h="Reste à livrer", w=10, fmt="dec", name="BC_Reste",
         f='=IF({num}{r}="","",MAX(0,N({q}{r})-{ql}{r}))'),
    dict(key="stat", h="Statut", w=12, name="BC_Statut", centre=True,
         f='=IF({num}{r}="","",IF({rl}{r}<=0,"Livrée",IF(AND({dprev}{r}<>"",P_DateRef>{dprev}{r}),"En retard",'
           'IF({ql}{r}>0,"Partielle","En attente"))))'),
    dict(key="obs", h="Observations", w=22),
    dict(key="rang", h="(rang tableau de bord)", w=8, name="BC_Rang", centre=True,
         f='=IF(OR({num}{r}="",{stat}{r}="Livrée"),"",COUNTIFS($A$7:{num}{r},"<>",$N$7:{stat}{r},"<>Livrée"))'),
], bc_data, 150)
cf_statut(bc, f"N{f1}:N{l1}", rouge=["En retard"], orange=["Partielle"], vert=["Livrée"], gris=["En attente"])

# ================================================================== 09 STOCK
st = wb.create_sheet("09_Stock")
entete(st, "09 · STOCK DES MATÉRIAUX (état en temps réel)", 12,
       "Catalogue des articles. Entrées et sorties sont totalisées depuis l'onglet 09b_Livraisons. "
       "Fixez un seuil d'alerte réaliste (délai d'approvisionnement × consommation journalière).")
ART = [
    ("CIM42", "Ciment CPJ 42.5 (sac 50 kg)", "sac", 0, 80, 5_200),
    ("HA8", "Acier HA8 (barre 12 m)", "barre", 0, 40, 2_600),
    ("HA10", "Acier HA10 (barre 12 m)", "barre", 0, 30, 3_900),
    ("HA12", "Acier HA12 (barre 12 m)", "barre", 0, 30, 5_600),
    ("HA14", "Acier HA14 (barre 12 m)", "barre", 0, 20, 7_800),
    ("SAB", "Sable lagunaire", "m³", 0, 8, 9_000),
    ("GRA", "Gravier concassé 5/15", "m³", 0, 6, 18_000),
    ("AGG15", "Agglos creux de 15", "u", 0, 300, 350),
    ("PLA", "Planche de coffrage", "u", 0, 40, 2_500),
    ("FIL", "Fil à ligaturer recuit", "kg", 25, 10, 1_500),
    ("POI", "Pointes assorties", "kg", 20, 10, 1_200),
]
st_data = [dict(code=a, des=b, u=c, si=d, seuil=e, pu=f) for a, b, c, d, e, f in ART]
let, f1, l1 = table(st, 6, [
    dict(key="code", h="Code", w=9, name="ST_Code", centre=True),
    dict(key="des", h="Désignation", w=30, name="ST_Design"),
    dict(key="u", h="Unité", w=7, dv="L_Unites", name="ST_Unite", centre=True),
    dict(key="si", h="Stock initial", w=9, fmt="dec"),
    dict(key="ent", h="Entrées", w=9, fmt="dec",
         f='=IF({code}{r}="","",SUMIFS(MV_Qte,MV_Code,{code}{r},MV_Type,"Entrée"))'),
    dict(key="sor", h="Sorties", w=9, fmt="dec",
         f='=IF({code}{r}="","",SUMIFS(MV_Qte,MV_Code,{code}{r},MV_Type,"Sortie"))'),
    dict(key="stk", h="Stock disponible", w=10, fmt="dec", name="ST_Stock",
         f='=IF({code}{r}="","",N({si}{r})+{ent}{r}-{sor}{r})'),
    dict(key="seuil", h="Seuil d'alerte", w=9, fmt="dec", name="ST_Seuil"),
    dict(key="stat", h="Statut", w=13, name="ST_Statut", centre=True,
         f='=IF({code}{r}="","",IF({stk}{r}<=0,"Rupture",IF({stk}{r}<=N({seuil}{r}),"À commander","OK")))'),
    dict(key="pu", h="PU moyen HT (FCFA)", w=11, fmt="fcfa"),
    dict(key="val", h="Valeur du stock (FCFA)", w=13, fmt="fcfa", name="ST_Valeur",
         f='=IF({code}{r}="","",MAX(0,{stk}{r})*N({pu}{r}))'),
    dict(key="rang", h="(rang tableau de bord)", w=8, name="ST_Rang", centre=True,
         f='=IF(OR({code}{r}="",{stat}{r}="OK"),"",COUNTIFS($A$7:{code}{r},"<>",$I$7:{stat}{r},"<>OK"))'),
], st_data, 80)
cf_statut(st, f"I{f1}:I{l1}", rouge=["Rupture"], orange=["À commander"], vert=["OK"])

# ============================================================ 09b LIVRAISONS
mv = wb.create_sheet("09b_Livraisons")
entete(mv, "09b · MOUVEMENTS DE STOCK (livraisons reçues & sorties chantier)", 12,
       "Entrée = livraison fournisseur (indiquez le N° BC et le N° de bon de livraison). "
       "Sortie = consommation sur chantier (indiquez le lot destinataire).")
MV = [
    (D(2026, 8, 10), "Entrée", "CIM42", 300, "BC-001", "BL-4471", ""),
    (D(2026, 8, 21), "Entrée", "HA12", 120, "BC-002", "BL-1022", ""),
    (D(2026, 8, 21), "Entrée", "HA10", 150, "BC-003", "BL-1022", ""),
    (D(2026, 8, 23), "Sortie", "HA12", 110, "", "BS-001", LOTS[2]),
    (D(2026, 8, 23), "Sortie", "HA10", 100, "", "BS-001", LOTS[2]),
    (D(2026, 8, 24), "Sortie", "FIL", 8, "", "BS-002", LOTS[2]),
    (D(2026, 8, 24), "Sortie", "POI", 6, "", "BS-002", LOTS[2]),
    (D(2026, 9, 3), "Entrée", "GRA", 30, "BC-004", "BL-0903", ""),
    (D(2026, 9, 3), "Entrée", "SAB", 40, "BC-005", "BL-0377", ""),
    (D(2026, 9, 5), "Sortie", "CIM42", 270, "", "BS-003", LOTS[2]),
    (D(2026, 9, 5), "Sortie", "GRA", 20, "", "BS-003", LOTS[2]),
    (D(2026, 9, 5), "Sortie", "SAB", 30, "", "BS-003", LOTS[2]),
    (D(2026, 9, 26), "Entrée", "AGG15", 2500, "BC-006", "BL-2601", ""),
    (D(2026, 10, 2), "Sortie", "AGG15", 2300, "", "BS-004", LOTS[3]),
    (D(2026, 10, 10), "Entrée", "CIM42", 250, "BC-007", "BL-4590", ""),
    (D(2026, 10, 13), "Entrée", "HA14", 60, "BC-008", "BL-1101", ""),
    (D(2026, 10, 15), "Sortie", "CIM42", 120, "", "BS-005", LOTS[3]),
    (D(2026, 10, 16), "Sortie", "CIM42", 80, "", "BS-006", LOTS[4]),
    (D(2026, 10, 16), "Sortie", "HA14", 20, "", "BS-006", LOTS[4]),
]
mv_data = [dict(date=a, type=b, code=c, q=d, bc=e, bl=f, lot=g, rec="KOFFI Yao") for a, b, c, d, e, f, g in MV]
let, f1, l1 = table(mv, 6, [
    dict(key="date", h="Date", w=11, fmt="date", name="MV_Date"),
    dict(key="type", h="Type", w=9, dv="L_TypeMvt", name="MV_Type", centre=True),
    dict(key="code", h="Code article", w=9, dv="ST_Code", name="MV_Code", centre=True),
    dict(key="des", h="Désignation", w=28,
         f='=IF({code}{r}="","",IFERROR(INDEX(ST_Design,MATCH({code}{r},ST_Code,0)),"Code inconnu"))'),
    dict(key="u", h="Unité", w=6, centre=True,
         f='=IF({code}{r}="","",IFERROR(INDEX(ST_Unite,MATCH({code}{r},ST_Code,0)),""))'),
    dict(key="q", h="Quantité", w=9, fmt="dec", name="MV_Qte"),
    dict(key="bc", h="N° BC (entrée)", w=9, dv="BC_Num", libre=True, name="MV_BC", centre=True),
    dict(key="four", h="Fournisseur", w=22,
         f='=IF({bc}{r}="","",IFERROR(INDEX(BC_Fourn,MATCH({bc}{r},BC_Num,0)),""))'),
    dict(key="bl", h="N° BL / bon de sortie", w=12),
    dict(key="lot", h="Lot destinataire (sortie)", w=20, dv="L_Lots"),
    dict(key="rec", h="Réceptionné / remis par", w=16),
    dict(key="obs", h="Observations (état, conformité)", w=26),
], mv_data, 800)
cf_statut(mv, f"B{f1}:B{l1}", vert=["Entrée"], orange=["Sortie"])

# ================================================================ 10 JOURNAL
jo = wb.create_sheet("10_Journal")
entete(jo, "10 · JOURNAL DE CHANTIER", 12,
       "Une ligne par jour. Effectif et livraisons sont calculés depuis le pointage et les mouvements de stock. "
       "Notez systématiquement les intempéries (pluies) : elles justifient les demandes de prolongation de délai.")
JO = [
    (D(2026, 10, 12), "Ensoleillé", 32, "Élévation agglos RDC façade est ; préparation coffrage poutres", "", "Non", "RAS – port EPI vérifié", 0),
    (D(2026, 10, 13), "Forte pluie", 27, "Arrêt partiel matin ; ferraillage poutres l'après-midi", "", "Oui", "Évacuation eaux pluviales des fouilles", 3),
    (D(2026, 10, 14), "Nuageux", 30, "Ferraillage poutres travées A-B ; élévation axes 1-2", "Visite MOE – contrôle ferraillage", "Non", "RAS", 0),
    (D(2026, 10, 15), "Ensoleillé", 33, "Élévation axes 2-3 ; coffrage poutres", "", "Non", "Arrosage des maçonneries (chaleur)", 0),
    (D(2026, 10, 16), "Pluie faible", 29, "Coffrage poutres ; élévation axes 3 ; contrôle aplomb poteaux", "", "Oui", "Rappel consignes travail en hauteur", 1),
]
jo_data = [dict(date=a, meteo=b, t=c, trav=d, vis=e, inc=f, hse=g, hp=h, red=AUTEUR) for a, b, c, d, e, f, g, h in JO]
let, f1, l1 = table(jo, 6, [
    dict(key="date", h="Date", w=11, fmt="date", name="JO_Date"),
    dict(key="meteo", h="Météo", w=12, dv="L_Meteo"),
    dict(key="t", h="T° max (°C)", w=7, fmt="int", centre=True),
    dict(key="eff", h="Effectif présent", w=9, fmt="dec", centre=True,
         f='=IF({date}{r}="","",COUNTIFS(PT_Date,{date}{r},PT_Pres,"P")+0.5*COUNTIFS(PT_Date,{date}{r},PT_Pres,"1/2"))'),
    dict(key="trav", h="Travaux réalisés", w=44),
    dict(key="liv", h="Livraisons reçues (nb)", w=9, fmt="int", centre=True,
         f='=IF({date}{r}="","",COUNTIFS(MV_Date,{date}{r},MV_Type,"Entrée"))'),
    dict(key="vis", h="Visites / réunions", w=24),
    dict(key="inc", h="Incident ?", w=8, dv="L_OuiNon", name="JO_Incident", centre=True,
         note="Si « Oui », établir une fiche dans l'onglet 11_Incidents."),
    dict(key="hse", h="Observations HSE", w=28),
    dict(key="hp", h="Heures perdues (intempéries)", w=10, fmt="dec", centre=True),
    dict(key="red", h="Rédacteur", w=18),
    dict(key="visa", h="Visa", w=10),
], jo_data, 300)
cf_statut(jo, f"H{f1}:H{l1}", rouge=["Oui"])

# ============================================================== 11 INCIDENTS
inc = wb.create_sheet("11_Incidents")
entete(inc, "11 · FICHES INCIDENTS / ALERTES", 15,
       "Documentez tout incident (sécurité, qualité, retard, intempérie, approvisionnement…) avec sa cause, "
       "l'action corrective, le responsable et l'échéance. Une échéance dépassée non close passe en rouge.")
INC = [
    ("INC-01", D(2026, 10, 13), "Intempérie", "Moyenne", LOTS[3], "Forte pluie : fouilles VRD inondées, arrêt 3 h",
     "Pluies de la petite saison", "Pompage, arrêt des travaux exposés", "Demande de prolongation à documenter (journal)",
     "KOFFI Yao", D(2026, 10, 20), "En cours", 45_000),
    ("INC-02", D(2026, 10, 15), "Approvisionnement", "Majeure", LOTS[4], "Planches de coffrage BC-010 non livrées",
     "Rupture chez le fournisseur", "Relance fournisseur", "Recherche d'un fournisseur alternatif",
     "Moulo Jean Claude", D(2026, 10, 17), "Ouvert", 0),
    ("INC-03", D(2026, 10, 16), "Qualité / non-conformité", "Mineure", LOTS[3], "Défaut d'aplomb poteau P7 (12 mm)",
     "Coffrage mal contreventé", "Marquage du poteau", "Ragréage et contrôle systématique au fil à plomb",
     "KOUAMÉ Serge", D(2026, 10, 19), "Ouvert", 25_000),
]
in_data = [dict(num=a, date=b, type=c, grav=d, lot=e, des=f, cause=g, mes=h, act=i, resp=j, ech=k, stat=l, cout=m)
           for a, b, c, d, e, f, g, h, i, j, k, l, m in INC]
let, f1, l1 = table(inc, 6, [
    dict(key="num", h="N°", w=8, name="IN_Num", centre=True),
    dict(key="date", h="Date", w=11, fmt="date"),
    dict(key="type", h="Type", w=20, dv="L_TypeInc"),
    dict(key="grav", h="Gravité", w=9, dv="L_Gravite", name="IN_Grav", centre=True),
    dict(key="lot", h="Lot", w=18, dv="L_Lots"),
    dict(key="des", h="Description", w=32),
    dict(key="cause", h="Cause identifiée", w=22),
    dict(key="mes", h="Mesure immédiate", w=22),
    dict(key="act", h="Action corrective / préventive", w=28),
    dict(key="resp", h="Responsable", w=16),
    dict(key="ech", h="Échéance", w=11, fmt="date"),
    dict(key="stat", h="Statut", w=9, dv="L_StatInc", name="IN_Statut", centre=True),
    dict(key="cout", h="Coût estimé (FCFA)", w=12, fmt="fcfa"),
    dict(key="jo", h="Jours ouvert", w=8, fmt="int", centre=True,
         f='=IF(OR({num}{r}="",{date}{r}="",{stat}{r}="Clos"),"",P_DateRef-{date}{r})'),
    dict(key="al", h="Alerte", w=14, centre=True,
         f='=IF(OR({num}{r}="",{stat}{r}="Clos"),"",IF(AND({ech}{r}<>"",P_DateRef>{ech}{r}),"Échéance dépassée","Suivi en cours"))'),
], in_data, 100)
cf_statut(inc, f"L{f1}:L{l1}", rouge=["Ouvert"], orange=["En cours"], vert=["Clos"])
cf_statut(inc, f"D{f1}:D{l1}", rouge=["Majeure"], orange=["Moyenne"], gris=["Mineure"])
cf_statut(inc, f"O{f1}:O{l1}", rouge=["Échéance dépassée"])

# =============================================================== CHECKLIST
ck = wb.create_sheet("Checklist_lancement")
entete(ck, "CHECK-LIST DE LANCEMENT DE CHANTIER", 6,
       "À compléter avant et pendant la première semaine. Statut : Fait / En cours / À faire.")
CK = [
    ("Administratif", "Ordre de service de démarrage reçu et daté"),
    ("Administratif", "Permis de construire obtenu et affiché, panneau de chantier posé"),
    ("Administratif", "Assurances (TRC, RC décennale) en cours de validité"),
    ("Administratif", "Déclaration du personnel à la CNPS"),
    ("Technique", "Plans d'exécution BA validés (notes de calcul EC2 / BAEL)"),
    ("Technique", "Étude géotechnique / reconnaissance du sol (latérite : Proctor, CBR)"),
    ("Technique", "Implantation contradictoire par géomètre, PV signé"),
    ("Technique", "Formulation béton validée (350 kg/m³, E/C ≤ 0,55), essais d'écrasement prévus"),
    ("Technique", "Contrôle réception aciers (certificats, stockage hors sol, à l'abri)"),
    ("Technique", "Dispositif de cure du béton (bâches, arrosage) adapté à la chaleur"),
    ("Organisation", "Plan d'installation de chantier (base vie, magasin, aires de stockage)"),
    ("Organisation", "Branchements provisoires eau (SODECI) et électricité (CIE)"),
    ("Organisation", "Clôture, gardiennage et contrôle des accès"),
    ("Organisation", "Planning (01) validé par le maître d'œuvre"),
    ("Organisation", "Budget par lot (03) validé"),
    ("Organisation", "Liste des fournisseurs, prix et délais d'approvisionnement"),
    ("Organisation", "Évacuation provisoire des eaux pluviales (saison des pluies)"),
    ("HSE", "PPSPS / plan HSE validé, affichage des consignes"),
    ("HSE", "EPI distribués (casques, chaussures, gants, gilets) et fiche de remise signée"),
    ("HSE", "Trousse de secours, point d'eau potable, zone d'ombre de repos"),
    ("HSE", "Plan de circulation et signalisation du chantier"),
    ("Qualité", "PAQ établi : points d'arrêt (fond de fouille, ferraillage avant coulage)"),
    ("Qualité", "Journal de chantier (10) ouvert, réunion de lancement tenue, PV diffusé"),
]
ck_data = [dict(dom=a, item=b, stat="À faire") for a, b in CK]
let, f1, l1 = table(ck, 6, [
    dict(key="dom", h="Domaine", w=14),
    dict(key="item", h="Point de contrôle", w=70),
    dict(key="stat", h="Statut", w=11, dv='"Fait,En cours,À faire"', centre=True),
    dict(key="resp", h="Responsable", w=18),
    dict(key="date", h="Date", w=11, fmt="date"),
    dict(key="obs", h="Observations", w=30),
], ck_data, 40)
# liste en dur pour la validation : la formule ne doit pas commencer par "=" ici
for dv in ck.data_validations.dataValidation:
    if dv.formula1 == '="Fait,En cours,À faire"':
        dv.formula1 = '"Fait,En cours,À faire"'
cf_statut(ck, f"C{f1}:C{l1}", rouge=["À faire"], orange=["En cours"], vert=["Fait"])
c = ck.cell(l1 + 2, 2, f'=COUNTIF(C{f1}:C{l1},"Fait")&" / "&COUNTA(B{f1}:B{l1})&" points réalisés"')
c.font = font(True, VERT)

# ================================================================= LEXIQUE
lx = wb.create_sheet("Lexique")
entete(lx, "LEXIQUE BTP", 2, "Termes utilisés dans le classeur et sur chantier (contexte Côte d'Ivoire).")
LEX = [
    ("Attachement", "Relevé contradictoire des quantités exécutées, base de la situation de travaux."),
    ("Avance de démarrage", "Somme versée à l'entreprise au démarrage, remboursée par retenue sur les situations."),
    ("Avancement financier", "Montant cumulé des situations / montant du marché."),
    ("Avancement physique", "Part réellement exécutée des travaux, ici pondérée par la durée des tâches du planning."),
    ("BC", "Bon de commande : engagement d'achat auprès d'un fournisseur."),
    ("BL", "Bon de livraison : document remis à la réception des matériaux."),
    ("BPU / DQE", "Bordereau des prix unitaires / Devis quantitatif et estimatif du marché."),
    ("CBR", "Indice portant Californien : capacité portante d'un sol (latérite de remblai ou de couche de forme)."),
    ("Chaînage", "Élément en BA ceinturant la maçonnerie (horizontal ou vertical)."),
    ("Chemin critique", "Suite de tâches dont tout retard décale la fin du chantier."),
    ("Cure du béton", "Maintien humide du béton les premiers jours (≥ 7 j sous climat chaud) pour éviter la fissuration."),
    ("Déboursé sec", "Coût direct (matériaux, main-d'œuvre, matériel) hors frais généraux et marge."),
    ("EC2 / BAEL", "Eurocode 2 (NF EN 1992-1-1) et BAEL 91 révisé 99 : règles de calcul du béton armé."),
    ("ELU / ELS", "États limites ultimes (résistance) / de service (déformations, fissuration)."),
    ("Hérisson", "Couche de pierres sèches sous dallage, coupure capillaire."),
    ("Latérite", "Sol rouge tropical riche en fer et alumine, très utilisé en remblai et couche de forme."),
    ("Longrine", "Poutre en BA reliant les semelles et portant les murs de soubassement."),
    ("OPM", "Optimum Proctor Modifié : densité de référence pour le compactage (ex. 95 % OPM)."),
    ("OS", "Ordre de service : instruction écrite du maître d'œuvre (démarrage, arrêt, reprise)."),
    ("PAQ", "Plan d'assurance qualité de l'entreprise pour le chantier."),
    ("Point d'arrêt", "Contrôle obligatoire avant de poursuivre (ex. réception ferraillage avant coulage)."),
    ("Retenue de garantie", "Pourcentage (souvent 5 %) retenu sur les paiements jusqu'à la levée des réserves."),
    ("Situation de travaux", "Décompte périodique des travaux exécutés, servant à la facturation au client."),
]
lx.column_dimensions["A"].width = 26
lx.column_dimensions["B"].width = 100
for i, hd in enumerate(["Terme", "Définition"]):
    c = lx.cell(6, 1 + i, hd); c.font, c.fill, c.border = font(True, "FFFFFF"), fill(VERT2), BORDER
for i, (t, d_) in enumerate(LEX):
    a, b = lx.cell(7 + i, 1, t), lx.cell(7 + i, 2, d_)
    a.font, a.border, b.border, b.alignment = font(True, VERT), BORDER, BORDER, LEFT

# ======================================================== 02 TABLEAU DE BORD
entete(tb, "02 · TABLEAU DE BORD – PILOTAGE ET AIDE À LA DÉCISION", 13,
       "Synthèse automatique de tous les modules à la date de référence. Aucune saisie sur cet onglet. "
       "Signal : OK (vert) · ATTENTION (orange) · ALERTE (rouge).")
tb.column_dimensions["A"].width = 2
for col in range(2, 14):
    tb.column_dimensions[L(col)].width = 13.5
for col in ("N", "O"):
    tb.column_dimensions[col].hidden = True


def mput(rng, val, ft=None, fl=None, fmt=None, al=CENTER, border=True):
    ws = tb
    a = rng.split(":")[0]
    if ":" in rng:
        ws.merge_cells(rng)
    c = ws[a]
    c.value = val
    c.font = ft or font()
    c.alignment = al
    if fmt:
        c.number_format = FMT.get(fmt, fmt)
    if fl or border:
        from openpyxl.utils.cell import range_boundaries
        c1, r1, c2, r2 = range_boundaries(rng if ":" in rng else f"{a}:{a}")
        for rr in range(r1, r2 + 1):
            for cc in range(c1, c2 + 1):
                if fl:
                    ws.cell(rr, cc).fill = fill(fl)
                if border:
                    ws.cell(rr, cc).border = BORDER
    return c


tb["B5"] = "Date de référence :"; tb["B5"].font = font(True)
mput("D5:E5", "=P_DateRef", font(True, ORANGE, 11), fmt="date")
tb["G5"] = "Fin contractuelle :"; tb["G5"].font = font(True)
mput("I5:J5", "=P_Fin", font(True), fmt="date")

# Indicateurs calculés (colonnes masquées N:O)
calc = [
    ("KPI_AvReal", "Avancement physique réel", "=IFERROR(SUMPRODUCT(PL_Duree,PL_Real)/SUM(PL_Duree),0)"),
    ("KPI_AvPrev", "Avancement physique prévu", "=IFERROR(SUMPRODUCT(PL_Duree,PL_Prevu)/SUM(PL_Duree),0)"),
    ("KPI_AvFin", "Avancement financier", "=IF(P_Marche=0,0,SIT_TotCumul/P_Marche)"),
    ("KPI_Budget", "Budget total", "=SUM(BU_Budget)"),
    ("KPI_Depense", "Total dépensé", "=SUM(BU_Depense)"),
    ("KPI_Reste", "Reste budget", "=KPI_Budget-KPI_Depense"),
    ("KPI_Conso", "% budget consommé", "=IF(KPI_Budget=0,0,KPI_Depense/KPI_Budget)"),
    ("KPI_Effectif", "Effectif présent", '=COUNTIFS(PT_Date,P_DateRef,PT_Pres,"P")+0.5*COUNTIFS(PT_Date,P_DateRef,PT_Pres,"1/2")'),
    ("KPI_Delai", "% délai consommé", "=MAX(0,MIN(1,(P_DateRef-P_Debut+1)/P_Delai))"),
    ("KPI_Retard", "Tâches en retard", '=COUNTIF(PL_Statut,"En retard")'),
]
for i, (nm_, lib, fml) in enumerate(calc):
    tb.cell(6 + i, 14, lib)
    tb.cell(6 + i, 15, fml)
    nom(nm_, "02_Tableau_de_bord", f"$O${6 + i}")

# Tuiles
tuiles = [
    ("Avancement physique", "=KPI_AvReal", "pct", '="Prévu : "&ROUND(KPI_AvPrev*100,0)&" %"'),
    ("Avancement financier", "=KPI_AvFin", "pct", '="Délai consommé : "&ROUND(KPI_Delai*100,0)&" %"'),
    ("Budget consommé", "=KPI_Conso", "pct", '="Budget : "&FIXED(KPI_Budget,0)'),
    ("Total dépensé (FCFA)", "=KPI_Depense", "fcfa", '="Engagé BC : "&FIXED(SUM(BU_Engage),0)'),
    ("Reste budget (FCFA)", "=KPI_Reste", "fcfa", '=COUNTIF(BU_Alerte,"Dépassement")&" lot(s) en dépassement"'),
    ("Présents aujourd'hui", "=KPI_Effectif", '0.0 "pers."', '=COUNTIF(AF_Date,P_DateRef)&" équipe(s) affectée(s)"'),
]
for i, (lib, val, fmt, sub) in enumerate(tuiles):
    c1, c2 = L(2 + 2 * i), L(3 + 2 * i)
    mput(f"{c1}7:{c2}7", lib, font(True, "FFFFFF", 9), VERT2)
    mput(f"{c1}8:{c2}8", val, font(True, VERT, 18), VERT_CLAIR, fmt=fmt)
    mput(f"{c1}9:{c2}9", sub, font(False, GRIS_TXT, 8), VERT_CLAIR)
tb.row_dimensions[8].height = 34
tb.conditional_formatting.add("L8", CellIsRule(operator="lessThan", formula=["0"],
                                               font=Font(name=FONT, bold=True, size=18, color=ROUGE)))

# Les 9 questions du pilotage
r0 = 11
mput(f"B{r0}:M{r0}", "LES 9 QUESTIONS DU PILOTAGE DE CHANTIER", font(True, "FFFFFF", 11), VERT, al=LEFT)
for rng, hd in ((f"B{r0 + 1}", "N°"), (f"C{r0 + 1}:F{r0 + 1}", "Question"), (f"G{r0 + 1}:H{r0 + 1}", "Réponse"),
                (f"I{r0 + 1}:L{r0 + 1}", "Détail"), (f"M{r0 + 1}", "Signal")):
    mput(rng, hd, font(True, "FFFFFF"), VERT2)
EN_ATT = 'COUNTIF(BC_Statut,"En attente")+COUNTIF(BC_Statut,"Partielle")+COUNTIF(BC_Statut,"En retard")'
QS = [
    ("Sommes-nous dans les délais ?",
     '=IF(OR(KPI_Retard>0,AND(P_DateRef>P_Fin,KPI_AvReal<1)),"NON – retard","OUI")', None,
     '="Réel "&ROUND(KPI_AvReal*100,0)&" % / prévu "&ROUND(KPI_AvPrev*100,0)&" % · "&KPI_Retard&" tâche(s) en retard · "&MAX(0,P_Fin-P_DateRef)&" j restants"',
     '=IF(KPI_AvReal<KPI_AvPrev-P_Tol,"ALERTE",IF(KPI_Retard>0,"ATTENTION","OK"))'),
    ("Combien avons-nous déjà dépensé ?", "=KPI_Depense", "fcfa",
     '="Factures "&FIXED(SUM(BU_Factures),0)&" · Main-d\'œuvre "&FIXED(SUM(BU_MO),0)&" · Autres "&FIXED(SUM(BU_Autres),0)&" FCFA"',
     '=IF(KPI_Conso>KPI_AvReal+P_Tol,"ALERTE",IF(KPI_Conso>KPI_AvReal,"ATTENTION","OK"))'),
    ("Quel budget reste-t-il ?", "=KPI_Reste", "fcfa",
     '=ROUND(KPI_Conso*100,0)&" % consommé · engagé non facturé : "&FIXED(MAX(0,SUM(BU_Engage)-SUM(BC_HT)+SUMPRODUCT(BC_HT)-SUM(BU_Factures)),0)&" FCFA"',
     '=IF(KPI_Reste<0,"ALERTE",IF(COUNTIF(BU_Alerte,"Dépassement")+COUNTIF(BU_Alerte,"Surconsommation")>0,"ATTENTION","OK"))'),
    ("Qui travaille aujourd'hui et sur quelle tâche ?", "=KPI_Effectif", '0.0 "présents"',
     '=COUNTIF(AF_Date,P_DateRef)&" équipe(s) affectée(s) – détail ci-dessous (onglet 07)"',
     '=IF(COUNTIF(AF_Date,P_DateRef)=0,"ATTENTION","OK")'),
    ("Quels matériaux restent disponibles ?", "=SUM(ST_Valeur)", "fcfa",
     '=COUNTIF(ST_Statut,"OK")&" article(s) OK · "&COUNTIF(ST_Statut,"À commander")&" à commander · "&COUNTIF(ST_Statut,"Rupture")&" en rupture"',
     '=IF(COUNTIF(ST_Statut,"Rupture")>0,"ALERTE",IF(COUNTIF(ST_Statut,"À commander")>0,"ATTENTION","OK"))'),
    ("Quelles commandes sont encore en attente ?", "=" + EN_ATT, '0 "BC"',
     '=COUNTIF(BC_Statut,"En retard")&" en retard de livraison · "&COUNTIF(BC_Statut,"Partielle")&" partielle(s) · "&COUNTIF(BC_Statut,"En attente")&" en attente"',
     '=IF(COUNTIF(BC_Statut,"En retard")>0,"ALERTE",IF(' + EN_ATT + '>0,"ATTENTION","OK"))'),
    ("Quelles factures doivent être réglées ?", '=SUMIF(FA_Reste,">0")', "fcfa",
     '=COUNTIF(FA_Statut,"En retard")&" en retard · "&COUNTIF(FA_Statut,"À payer < 7j")&" à échéance < 7 j · "&COUNTIF(FA_Statut,"À payer")&" autre(s)"',
     '=IF(COUNTIF(FA_Statut,"En retard")>0,"ALERTE",IF(COUNTIF(FA_Statut,"À payer < 7j")>0,"ATTENTION","OK"))'),
    ("Quel est le niveau réel d'avancement ?", "=KPI_AvReal", "pct",
     '="Physique "&ROUND(KPI_AvReal*100,0)&" % · financier "&ROUND(KPI_AvFin*100,0)&" % · délai consommé "&ROUND(KPI_Delai*100,0)&" %"',
     '=IF(KPI_AvReal<KPI_Delai-P_Tol,"ALERTE",IF(KPI_AvReal<KPI_AvPrev,"ATTENTION","OK"))'),
    ("Quels incidents devons-nous documenter ?", '=COUNTIFS(IN_Num,"<>",IN_Statut,"<>Clos")', '0 "ouvert(s)"',
     '=COUNTIF(JO_Incident,"Oui")&" signalé(s) au journal · "&COUNTIF(IN_Num,"?*")&" fiche(s) établie(s) · "&COUNTIFS(IN_Grav,"Majeure",IN_Statut,"<>Clos")&" majeure(s) ouverte(s)"',
     '=IF(COUNTIFS(IN_Grav,"Majeure",IN_Statut,"<>Clos")>0,"ALERTE",IF(COUNTIF(JO_Incident,"Oui")>COUNTIF(IN_Num,"?*"),"ATTENTION",IF(COUNTIFS(IN_Num,"<>",IN_Statut,"<>Clos")>0,"ATTENTION","OK")))'),
]
# engagé non facturé = engagé BC - factures liées : version simple
QS[2] = (QS[2][0], QS[2][1], QS[2][2],
         '=ROUND(KPI_Conso*100,0)&" % consommé · "&COUNTIF(BU_Alerte,"Dépassement")&" lot(s) en dépassement · "&COUNTIF(BU_Alerte,"Surconsommation")&" en surconsommation"',
         QS[2][4])
for i, (q, rep, fmt, det, sig) in enumerate(QS):
    r = r0 + 2 + i
    mput(f"B{r}", i + 1, font(True, VERT))
    mput(f"C{r}:F{r}", q, font(True), al=LEFT)
    mput(f"G{r}:H{r}", rep, font(True, "000000", 11), fmt=fmt)
    mput(f"I{r}:L{r}", det, font(False, GRIS_TXT, 9), al=LEFT)
    mput(f"M{r}", sig, font(True))
    tb.row_dimensions[r].height = 30
rq1, rq2 = r0 + 2, r0 + 1 + len(QS)
for v, c in (("OK", VERT2), ("ATTENTION", ORANGE), ("ALERTE", ROUGE)):
    tb.conditional_formatting.add(f"M{rq1}:M{rq2}", CellIsRule(operator="equal", formula=[f'"{v}"'], fill=fill(c),
                                                               font=Font(name=FONT, bold=True, color="FFFFFF")))
tb.conditional_formatting.add(f"G{rq1}", CellIsRule(operator="equal", formula=['"NON – retard"'],
                                                    font=Font(name=FONT, bold=True, color=ROUGE, size=11)))

# Synthèse par lot
r1 = rq2 + 2
mput(f"B{r1}:M{r1}", "SYNTHÈSE PAR LOT (budget / dépenses / avancement)", font(True, "FFFFFF", 11), VERT, al=LEFT)
for rng, hd in ((f"B{r1 + 1}:D{r1 + 1}", "Lot"), (f"E{r1 + 1}:F{r1 + 1}", "Budget HT"), (f"G{r1 + 1}:H{r1 + 1}", "Dépensé"),
                (f"I{r1 + 1}:J{r1 + 1}", "Reste"), (f"K{r1 + 1}", "% consommé"), (f"L{r1 + 1}", "Avanc. physique"),
                (f"M{r1 + 1}", "Alerte")):
    mput(rng, hd, font(True, "FFFFFF", 9), VERT2)
NLOT = 12
for k in range(1, NLOT + 1):
    r = r1 + 1 + k
    mput(f"B{r}:D{r}", f'=IF(INDEX(BU_Lot,{k})="","",INDEX(BU_Lot,{k}))', al=LEFT)
    for rng, nm_, fmt in ((f"E{r}:F{r}", "BU_Budget", "fcfa"), (f"G{r}:H{r}", "BU_Depense", "fcfa"),
                          (f"I{r}:J{r}", "BU_Reste", "fcfa"), (f"K{r}", "BU_Conso", "pct"),
                          (f"L{r}", "BU_Avanc", "pct"), (f"M{r}", "BU_Alerte", None)):
        mput(rng, f'=IF($B{r}="","",INDEX({nm_},{k}))', fmt=fmt)
rl1, rl2 = r1 + 2, r1 + 1 + NLOT
cf_statut(tb, f"M{rl1}:M{rl2}", rouge=["Dépassement"], orange=["Surconsommation"], vert=["OK"])

# Listes : équipes du jour / alertes stock / factures / commandes
def bloc(r, titre_g, titre_d, cols_g, cols_d, n=8):
    mput(f"B{r}:G{r}", titre_g, font(True, "FFFFFF", 10), VERT, al=LEFT)
    mput(f"H{r}:M{r}", titre_d, font(True, "FFFFFF", 10), VERT, al=LEFT)
    for cols in (cols_g, cols_d):
        for rng, hd, _, _ in cols:
            mput(rng.format(r=r + 1), hd, font(True, "FFFFFF", 9), VERT2)
    for k in range(1, n + 1):
        rr = r + 1 + k
        for cols in (cols_g, cols_d):
            for rng, _, fml, fmt in cols:
                mput(rng.format(r=rr), fml.format(k=k), font(False, "000000", 9), fmt=fmt, al=LEFT if fmt is None else CENTER)
    return r + 2 + n


def idx(name, rang, k):
    return f'=IFERROR(INDEX({name},MATCH({k},{rang},0)),"")'


rb = r1 + NLOT + 3
rb = bloc(rb, "ÉQUIPES AU TRAVAIL (date de référence)", "ALERTES STOCK (à commander / rupture)",
          [("B{r}:C{r}", "Équipe", idx("AF_Equipe", "AF_Rang", "{k}"), None),
           ("D{r}:F{r}", "Tâche", idx("AF_Tache", "AF_Rang", "{k}"), None),
           ("G{r}", "Présents / prévu", '=IFERROR(INDEX(AF_Present,MATCH({k},AF_Rang,0))&" / "&INDEX(AF_Prevu,MATCH({k},AF_Rang,0)),"")', "@")],
          [("H{r}:J{r}", "Article", idx("ST_Design", "ST_Rang", "{k}"), None),
           ("K{r}", "Stock", idx("ST_Stock", "ST_Rang", "{k}"), "dec"),
           ("L{r}", "Seuil", idx("ST_Seuil", "ST_Rang", "{k}"), "dec"),
           ("M{r}", "Statut", idx("ST_Statut", "ST_Rang", "{k}"), None)])
rs1 = rb - 8
cf_statut(tb, f"M{rs1}:M{rb - 1}", rouge=["Rupture"], orange=["À commander"])
rb = bloc(rb + 1, "FACTURES À RÉGLER", "COMMANDES EN ATTENTE DE LIVRAISON",
          [("B{r}:C{r}", "Fournisseur", idx("FA_Fourn", "FA_Rang", "{k}"), None),
           ("D{r}", "N° facture", idx("FA_Num", "FA_Rang", "{k}"), None),
           ("E{r}", "Reste (FCFA)", idx("FA_Reste", "FA_Rang", "{k}"), "fcfa"),
           ("F{r}", "Échéance", idx("FA_Echeance", "FA_Rang", "{k}"), "date"),
           ("G{r}", "Statut", idx("FA_Statut", "FA_Rang", "{k}"), None)],
          [("H{r}", "N° BC", idx("BC_Num", "BC_Rang", "{k}"), None),
           ("I{r}:J{r}", "Article", idx("BC_Design", "BC_Rang", "{k}"), None),
           ("K{r}", "Reste à livrer", idx("BC_Reste", "BC_Rang", "{k}"), "dec"),
           ("L{r}", "Prévue le", idx("BC_Prevue", "BC_Rang", "{k}"), "date"),
           ("M{r}", "Statut", idx("BC_Statut", "BC_Rang", "{k}"), None)])
rf1 = rb - 8
cf_statut(tb, f"G{rf1}:G{rb - 1}", rouge=["En retard"], orange=["À payer < 7j"])
cf_statut(tb, f"M{rf1}:M{rb - 1}", rouge=["En retard"], orange=["Partielle"])

# Graphiques
ch = BarChart()
ch.type, ch.grouping = "col", "clustered"
ch.title = "Budget prévu vs dépensé par lot (FCFA)"
ch.y_axis.title = "FCFA"
ch.y_axis.numFmt = "#,##0"
cats = Reference(tb, min_col=2, min_row=rl1, max_row=rl1 + len(LOTS) - 1)
for col in (5, 7):
    ch.add_data(Reference(tb, min_col=col, min_row=r1 + 1, max_row=rl1 + len(LOTS) - 1), titles_from_data=True)
ch.set_categories(cats)
ch.height, ch.width = 8.5, 17
ch.series[0].graphicalProperties.solidFill = "A5D6A7"
ch.series[1].graphicalProperties.solidFill = VERT
ch.y_axis.delete = False
ch.x_axis.delete = False
ch.legend.position = "b"
tb.add_chart(ch, f"B{rb + 1}")

ch2 = BarChart()
ch2.type, ch2.grouping = "col", "clustered"
ch2.title = "% budget consommé vs avancement physique"
ch2.y_axis.numFmt = "0%"
for col in (11, 12):
    ch2.add_data(Reference(tb, min_col=col, min_row=r1 + 1, max_row=rl1 + len(LOTS) - 1), titles_from_data=True)
ch2.set_categories(cats)
ch2.height, ch2.width = 8.5, 14
ch2.series[0].graphicalProperties.solidFill = ORANGE
ch2.series[1].graphicalProperties.solidFill = VERT
ch2.y_axis.delete = False
ch2.x_axis.delete = False
ch2.legend.position = "b"
tb.add_chart(ch2, f"H{rb + 1}")
tb.freeze_panes = "A5"
tb.page_setup.orientation = "portrait"

# ================================================================== ACCUEIL
acc.sheet_view.showGridLines = False
acc.column_dimensions["A"].width = 3
acc.column_dimensions["B"].width = 26
acc.column_dimensions["C"].width = 70
acc.column_dimensions["D"].width = 22
for i, (txt, ft, bg, h) in enumerate([
        ("METRIX AVANCÉ CHANTIER BTP", font(True, "FFFFFF", 22), VERT, 40),
        ("Pilotage complet de chantier : planning · budget · équipes · stock · factures · commandes · avancement · journal",
         font(True, "FFFFFF", 11), VERT2, 22),
        ("Auteur : " + AUTEUR + " – Technicien génie civil BTP, Abidjan (Côte d'Ivoire)", font(True, VERT, 10), VERT_CLAIR, 18),
], start=1):
    acc.merge_cells(f"B{i}:D{i}")
    c = acc[f"B{i}"]; c.value, c.font, c.alignment = txt, ft, LEFT
    for col in "BCD":
        acc[f"{col}{i}"].fill = fill(bg)
    acc.row_dimensions[i].height = h
acc["B5"] = "Chantier :"; acc["B5"].font = font(True)
acc["C5"] = "=P_Chantier"; acc["C5"].font = font(True, VERT)
acc["B6"] = "Date de référence :"; acc["B6"].font = font(True)
acc["C6"] = "=P_DateRef"; acc["C6"].number_format = FMT["date"]; acc["C6"].alignment = Alignment(horizontal="left")

r = 8
acc.cell(r, 2, "SOMMAIRE (cliquez pour ouvrir)").font = font(True, VERT, 12)
MODS = [
    ("Paramètres", "Données du chantier, taux (TVA 18 %, retenue 5 %…), listes déroulantes", "À remplir en 1er"),
    ("02_Tableau_de_bord", "Les 9 questions du pilotage + synthèse par lot + alertes + graphiques", "Lecture seule"),
    ("01_Planning", "Planning Gantt sur 26 semaines, % prévu / réalisé, tâches en retard", "Hebdomadaire"),
    ("03_Budget", "Budget par lot : engagé, factures, main-d'œuvre, reste, surconsommation", "Budget au départ"),
    ("04_Situations", "Situations de travaux mensuelles : DQE, attachements, décompte TTC", "Mensuelle"),
    ("05_Factures", "Factures fournisseurs, échéances, paiements, retards", "À chaque facture"),
    ("06_Pointage", "Pointage journalier des ouvriers, coût de main-d'œuvre par lot", "Quotidienne"),
    ("07_Affectation", "Affectation des équipes : qui travaille, où, sur quelle tâche", "Quotidienne"),
    ("08_Commandes", "Bons de commande, quantités livrées, reste à livrer, retards", "À chaque commande"),
    ("09_Stock", "État du stock, seuils d'alerte, valeur du stock", "Catalogue au départ"),
    ("09b_Livraisons", "Entrées (livraisons) et sorties de matériaux", "À chaque mouvement"),
    ("10_Journal", "Journal de chantier : météo, effectif, travaux, visites, HSE", "Quotidienne"),
    ("11_Incidents", "Fiches incidents / alertes avec actions correctives", "Dès qu'un incident survient"),
    ("Personnel", "Fichier du personnel, taux journaliers, cumul jours et montants dus", "Au recrutement"),
    ("Checklist_lancement", "Check-list de lancement de chantier (administratif, technique, HSE)", "Démarrage"),
    ("Lexique", "Lexique des termes BTP utilisés", "—"),
]
for i, hd in enumerate(["Onglet", "Contenu", "Fréquence de mise à jour"]):
    c = acc.cell(r + 1, 2 + i, hd); c.font, c.fill, c.border = font(True, "FFFFFF"), fill(VERT2), BORDER
for i, (sh, desc, freq) in enumerate(MODS):
    rr = r + 2 + i
    c = acc.cell(rr, 2, sh)
    c.hyperlink = f"#'{sh}'!A1"
    c.font = Font(name=FONT, bold=True, color="1565C0", underline="single")
    acc.cell(rr, 3, desc).font = font()
    acc.cell(rr, 4, freq).font = font(False, GRIS_TXT, 9)
    for col in range(2, 5):
        acc.cell(rr, col).border = BORDER
        acc.cell(rr, col).alignment = LEFT
r = r + 3 + len(MODS)
acc.cell(r, 2, "LÉGENDE DES CELLULES").font = font(True, VERT, 12)
for i, (bg, ftc, lib) in enumerate([
        (SAISIE, "1F3FBF", "Cellule de SAISIE (fond crème, texte bleu) : à remplir par vous"),
        (CALCUL, "000000", "Cellule CALCULÉE (fond gris, texte noir) : formule, ne pas écraser"),
        (VERT2, "FFFFFF", "En-tête de tableau / statut favorable (OK, Terminé, Livrée, Réglée)"),
        (ORANGE, "FFFFFF", "Statut à surveiller (En cours, Partielle, À commander, ATTENTION)"),
        (ROUGE, "FFFFFF", "Statut critique (En retard, Rupture, Dépassement, ALERTE)")]):
    rr = r + 1 + i
    c = acc.cell(rr, 2, "Exemple"); c.fill, c.font, c.border = fill(bg), font(True, ftc), BORDER
    acc.cell(rr, 3, lib).font = font()
r = r + 7
acc.cell(r, 2, "MODE D'EMPLOI EN 6 ÉTAPES").font = font(True, VERT, 12)
STEPS = [
    "1. Paramètres : saisir le chantier, la date de démarrage, le délai, les taux ; compléter les listes (lots, équipes, fournisseurs).",
    "2. Personnel et 09_Stock : créer la liste des ouvriers (matricule, taux) et le catalogue des matériaux (code, seuil).",
    "3. 01_Planning, 03_Budget, 04_Situations : saisir les tâches, le budget par lot et le DQE du marché.",
    "4. Chaque jour : 06_Pointage, 07_Affectation, 09b_Livraisons, 10_Journal (et 11_Incidents si besoin).",
    "5. À chaque achat : 08_Commandes puis 05_Factures ; chaque semaine : mettre à jour le % réalisé du planning.",
    "6. Consulter 02_Tableau_de_bord : les signaux ALERTE / ATTENTION indiquent où agir en priorité.",
    "Les lignes pré-remplies sont un EXEMPLE (villa R+1 à Cocody Angré) : effacez uniquement les cellules de saisie pour démarrer votre chantier.",
    "Date de référence = date du jour par défaut ; elle peut être forcée dans Paramètres pour analyser une date passée.",
    "Compatible Excel 2010+ et LibreOffice ; importable dans Google Sheets (les mises en forme conditionnelles restent actives).",
]
for i, s in enumerate(STEPS):
    c = acc.cell(r + 1 + i, 2, s)
    acc.merge_cells(start_row=r + 1 + i, start_column=2, end_row=r + 1 + i, end_column=4)
    c.font = font(i >= 6, GRIS_TXT if i >= 6 else "000000", 10, i >= 6)
    c.alignment = LEFT
    acc.row_dimensions[r + 1 + i].height = 28
r = r + 2 + len(STEPS)
acc.cell(r, 2, "CONTEXTE TECHNIQUE (Côte d'Ivoire)").font = font(True, VERT, 12)
for i, s in enumerate([
        "Structures BA : dimensionnement et vérifications selon EC2 (NF EN 1992-1-1) et BAEL 91 révisé 99.",
        "Sols latéritiques : remblais compactés par couches de 20 cm à 95 % OPM, contrôle CBR ; purge des poches argileuses.",
        "Climat tropical chaud et humide : cure humide du béton ≥ 7 jours, bétonnage aux heures fraîches, enrobage adapté.",
        "Saisons des pluies (avril–juillet, octobre–novembre) : tracer les intempéries au journal pour justifier les prolongations."]):
    c = acc.cell(r + 1 + i, 2, "• " + s)
    acc.merge_cells(start_row=r + 1 + i, start_column=2, end_row=r + 1 + i, end_column=4)
    c.font, c.alignment = font(), LEFT
    acc.row_dimensions[r + 1 + i].height = 22
acc.page_setup.orientation = "portrait"
acc.page_setup.fitToWidth = 1
acc.page_setup.fitToHeight = 0
acc.sheet_properties.pageSetUpPr.fitToPage = True
acc.oddFooter.left.text = "Auteur : " + AUTEUR

# Ordre et couleur des onglets
ordre = ["Accueil", "Paramètres", "02_Tableau_de_bord", "01_Planning", "03_Budget", "04_Situations",
         "05_Factures", "06_Pointage", "07_Affectation", "08_Commandes", "09_Stock", "09b_Livraisons",
         "10_Journal", "11_Incidents", "Personnel", "Checklist_lancement", "Lexique"]
wb._sheets = [wb[n] for n in ordre]
for n in ordre:
    wb[n].sheet_properties.tabColor = {"Accueil": VERT, "Paramètres": ORANGE, "02_Tableau_de_bord": ROUGE}.get(n, VERT2)
wb.active = 0
wb.properties.creator = AUTEUR
wb.properties.title = "Metrix Avancé Chantier BTP"
wb.properties.subject = "Pilotage de chantier BTP"
wb.save(SORTIE)
print("OK ->", SORTIE)
