# -*- coding: utf-8 -*-
"""
Générateur du classeur « METRIX AVANCÉ CHANTIER BTP ».
Auteur : Moulo Jean Claude – Technicien génie civil BTP, Abidjan.

Usage : python3 generer_metrix.py [chemin_sortie.xlsx]
Produit un classeur Excel de pilotage de chantier (10 modules de gestion,
contrôle qualité et suivis spécialisés : route en terre / reprofilage lourd,
points critiques et buses Ø800 / Ø1000, dalots, bâtiment TCE, clôture,
charpente métallique), entièrement formulé (aucune valeur calculée en dur),
avec un exemple multi-composantes pré-rempli. Usage : réalisation (entreprise)
et/ou contrôle (mission de contrôle).
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
    "dec2": '0.00;[Red]-0.00;"-"',
    "pk": '0"+"000',
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
        ('="Chantier : "&P_Chantier&"   |   Mission : "&P_Mission&"   |   Auteur : ' + AUTEUR + '"',
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
entete(par, "PARAMÈTRES DU CHANTIER & LISTES DE RÉFÉRENCE", 28,
        "Renseignez ici les données générales du chantier. Les listes (colonnes E à AA) "
        "alimentent les menus déroulants de tous les onglets : ajoutez vos éléments en bas de chaque liste.")
par.column_dimensions["A"].width = 3
par.column_dimensions["B"].width = 34
par.column_dimensions["C"].width = 40
par.column_dimensions["D"].width = 3
params = [
    ("P_Chantier", "Intitulé du chantier",
     "Route en terre A–B (20 km), ouvrages, bâtiment TCE, clôture, hangar (exemple)",
     None, None),
    ("P_Mission", "Mission / rôle", "Réalisation & contrôle", None,
     "Entreprise – réalisation, Mission de contrôle – surveillance, ou Réalisation & contrôle (liste)."),
    ("P_MOA", "Maître d'ouvrage", "À renseigner", None, None),
    ("P_MOE", "Maître d'œuvre / BET", "À renseigner", None, None),
    ("P_Entreprise", "Entreprise titulaire", "À renseigner", None, None),
    ("P_Conducteur", "Conducteur de travaux", AUTEUR, None, None),
    ("P_Lieu", "Localisation", "Abidjan – Côte d'Ivoire", None, None),
    ("P_Marche_No", "N° du marché / contrat", "À renseigner", None, None),
    ("P_Debut", "Date de démarrage (OS)", D(2026, 8, 3), "date", None),
    ("P_Delai", "Délai contractuel (jours calendaires)", 270, "int", None),
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
    ("P_Compacite", "Compacité minimale exigée (% OPM)", 0.95, "pct",
     "Critère usuel CCTP routes en terre / remblais : ≥ 95 % de l'Optimum Proctor Modifié. À adapter au CCTP."),
    ("P_CBR", "CBR minimal de la latérite (couche de roulement)", 30, "int",
     "CBR à 95 % OPM après 4 jours d'imbibition. Valeur usuelle ≥ 30 ; à adapter au CCTP du marché."),
    ("P_TolEp", "Tolérance sur épaisseur de rechargement (m)", 0.02, "dec2",
     "Épaisseur mesurée admise ≥ épaisseur prévue − tolérance."),
    ("P_TolConso", "Tolérance surconsommation gasoil engins", 0.15, "pct",
     "Alerte si la consommation réelle (l/h) dépasse la consommation théorique de plus de ce pourcentage."),
    ("P_DispoMin", "Taux de disponibilité minimal des engins", 0.85, "pct",
     "Disponibilité = heures de marche / (heures de marche + heures de panne)."),
    ("P_Fc28", "Résistance béton exigée fc28 (MPa)", 25, "int",
     "Classe de résistance des notes de calcul BA (EC2 : C25/30 ; BAEL : fc28 = 25 MPa)."),
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
    if name == "P_Mission":
        dvm = DataValidation(type="list", formula1="=L_Mission", allow_blank=True)
        dvm.add(f"C{r}")
        par.add_data_validation(dvm)
par.cell(r + 2, 2, "Contexte ivoirien : grande saison des pluies ≈ avril–juillet, petite saison ≈ octobre–novembre. "
         "Prévoir des marges de délai sur terrassements et bétonnages pendant ces périodes.").font = font(False, GRIS_TXT, 9, True)
par.merge_cells(start_row=r + 2, start_column=2, end_row=r + 2, end_column=3)
par.row_dimensions[r + 2].height = 40
par.cell(r + 2, 2).alignment = LEFT

LOTS = ["L00 Installation & repli", "R01 Route – reprofilage lourd", "R02 Route – points critiques",
        "R03 Ouvrages – buses Ø800/Ø1000", "R04 Ouvrages – dalots", "B01 Bâtiment – gros œuvre",
        "B02 Bâtiment – second œuvre TCE", "C01 Clôture", "M01 Charpente métallique", "S01 Contrôle & essais"]
EQUIPES = ["Équipe Route – terrassement", "Équipe OH – ouvrages hydrauliques", "Équipe Bâtiment / clôture",
           "Équipe Charpente métallique", "Encadrement", "Labo / contrôle", "Sous-traitant"]
FOURN = ["Dépôt ciment", "Quincaillerie générale", "Carrière de granite", "Sablière", "Briqueterie",
         "Préfabricant buses BA", "Station-service (gasoil)", "Location engins", "Laboratoire géotechnique",
         "Atelier charpente métallique"]
COMPOS = ["Installation", "Route en terre", "Points critiques", "Ouvrages hydrauliques – buses", "Dalots",
          "Bâtiment TCE", "Clôture", "Charpente métallique"]
listes = [
    ("L_Lots", "Lots", LOTS),
    ("L_Equipes", "Équipes", EQUIPES),
    ("L_Fourn", "Fournisseurs", FOURN),
    ("L_Compos", "Composantes", COMPOS),
    ("L_Mission", "Mission / rôle", ["Entreprise – réalisation", "Mission de contrôle – surveillance",
                                     "Réalisation & contrôle"]),
    ("L_TypeCtrl", "Type de contrôle", ["Point d'arrêt (PA)", "Point critique (PC)", "Autocontrôle",
                                        "Essai laboratoire", "Contrôle extérieur", "Réception partielle"]),
    ("L_Interv", "Intervenant", ["Entreprise (autocontrôle)", "Mission de contrôle", "Laboratoire",
                                 "Maître d'ouvrage"]),
    ("L_Verdict", "Appréciation", ["Conforme", "Non conforme", "Réserve"]),
    ("L_Diam", "Diamètre buses", ["Ø800", "Ø1000", "Ø600", "Ø1200"]),
    ("L_Traitement", "Traitement point critique", ["Purge + remblai latéritique", "Rechargement localisé",
                                                   "Pose de buses", "Dalot", "Enrochement / perré",
                                                   "Fossé de crête / divergent"]),
    ("L_EtatEng", "État engin", ["En service", "En panne", "En réparation", "Non mobilisé", "Restitué"]),
    ("L_Propriete", "Propriété engin", ["Propre", "Location", "Sous-traitant"]),
    ("L_Unites", "Unités", ["u", "ens", "ff", "m", "ml", "km", "m²", "m³", "kg", "t", "sac", "barre", "l", "j", "h"]),
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
    par.column_dimensions[L(col)].width = 30 if j < 10 else 16
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
    ("M001", "KOFFI Yao", "Chef de chantier", EQUIPES[4], 20000),
    ("M002", "TOURÉ Bakary", "Topographe", EQUIPES[4], 15000),
    ("M003", "KOUASSI Arsène", "Laborantin", EQUIPES[5], 12000),
    ("M004", "GNAHORÉ Didier", "Conducteur niveleuse", EQUIPES[0], 12000),
    ("M005", "SANOGO Lamine", "Conducteur compacteur", EQUIPES[0], 10000),
    ("M006", "DIALLO Ousmane", "Chauffeur camion benne", EQUIPES[0], 8000),
    ("M007", "ZADI Martial", "Manœuvre", EQUIPES[0], 3500),
    ("M008", "KOUAMÉ Serge", "Chef d'équipe OH", EQUIPES[1], 10000),
    ("M009", "BAMBA Seydou", "Ferrailleur", EQUIPES[1], 7000),
    ("M010", "YAO Kouadio", "Coffreur", EQUIPES[1], 7000),
    ("M011", "KONÉ Adama", "Maçon", EQUIPES[1], 7000),
    ("M012", "SORO Nanga", "Manœuvre", EQUIPES[1], 3500),
    ("M013", "DIABATÉ Moussa", "Chef d'équipe bâtiment", EQUIPES[2], 10000),
    ("M014", "TRAORÉ Ibrahim", "Maçon", EQUIPES[2], 7000),
    ("M015", "N'GUESSAN Paul", "Manœuvre", EQUIPES[2], 3500),
    ("M016", "OUATTARA Lassina", "Manœuvre", EQUIPES[2], 3500),
    ("M017", "ADOU Franck", "Soudeur-monteur", EQUIPES[3], 9000),
    ("M018", "AKA Jérôme", "Aide-monteur", EQUIPES[3], 5000),
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
NB_SEM = 40
G0 = 12  # première colonne du Gantt (L)
entete(pl, "01 · PLANNING GANTT DU CHANTIER", G0 + NB_SEM - 1,
       "Saisissez lot, tâche, date de début, durée et % réalisé. Fin, % prévu, écart et statut sont calculés. "
       "Barres : vert foncé = réalisé · vert clair = prévu · rouge = tâche en retard · colonne orange = semaine de la date de référence.")
E_R, E_OH, E_B, E_CM, E_ENC, E_LAB, E_ST = EQUIPES
P = [
    (LOTS[0], "Installation de chantier, base vie, laboratoire", E_ENC, D(2026, 8, 3), 15, 1),
    (LOTS[9], "Reconnaissance des emprunts de latérite & essais d'identification", E_LAB, D(2026, 8, 5), 20, 1),
    (LOTS[1], "Débroussaillage & décapage PK 0+000 à 20+000", E_R, D(2026, 8, 17), 60, 0.95),
    (LOTS[1], "Scarification & reprofilage lourd PK 0+000 à 20+000", E_R, D(2026, 9, 1), 90, 0.45),
    (LOTS[1], "Rechargement latéritique ép. 0,20 m + compactage 95 % OPM", E_R, D(2026, 9, 15), 100, 0.3),
    (LOTS[1], "Fossés latéraux & exutoires", E_R, D(2026, 10, 1), 90, 0.1),
    (LOTS[2], "Points critiques : purges & remblais latéritiques", E_R, D(2026, 9, 1), 60, 0.5),
    (LOTS[3], "Pose buses Ø1000 (PC2, PC6)", E_OH, D(2026, 9, 21), 45, 0.5),
    (LOTS[3], "Pose buses Ø800 (PC3, PC4, PC7)", E_OH, D(2026, 10, 5), 40, 0.25),
    (LOTS[3], "Têtes de buses, perrés & enrochements", E_OH, D(2026, 11, 2), 40, 0),
    (LOTS[4], "Dalot D1 – PK 3+200 – 1×(2,00×1,50)", E_OH, D(2026, 8, 24), 40, 1),
    (LOTS[4], "Dalot D2 – PK 9+750 – 2×(2,50×2,00)", E_OH, D(2026, 9, 21), 55, 0.45),
    (LOTS[4], "Dalot D3 – PK 16+400 – 1×(3,00×2,00)", E_OH, D(2026, 11, 16), 55, 0),
    (LOTS[5], "Bâtiment : terrassements & fondations", E_B, D(2026, 8, 24), 30, 1),
    (LOTS[5], "Bâtiment : élévation maçonnerie & BA", E_B, D(2026, 9, 23), 35, 0.6),
    (LOTS[5], "Bâtiment : dalle / plancher haut", E_B, D(2026, 10, 28), 20, 0),
    (LOTS[6], "Bâtiment : charpente-couverture & étanchéité", E_ST, D(2026, 11, 20), 25, 0),
    (LOTS[6], "Bâtiment : plomberie, électricité, climatisation", E_ST, D(2026, 11, 25), 45, 0),
    (LOTS[6], "Bâtiment : menuiseries bois, alu & métalliques", E_ST, D(2026, 12, 21), 30, 0),
    (LOTS[6], "Bâtiment : revêtements, enduits & peinture", E_B, D(2027, 1, 5), 50, 0),
    (LOTS[7], "Clôture : fouilles, semelles & soubassement", E_B, D(2026, 9, 14), 30, 0.9),
    (LOTS[7], "Clôture : poteaux BA, élévation & chaînage", E_B, D(2026, 10, 12), 45, 0.15),
    (LOTS[7], "Clôture : enduits, peinture & portail", E_B, D(2027, 1, 11), 25, 0),
    (LOTS[8], "Charpente : plans d'exécution & approvisionnement acier", E_CM, D(2026, 9, 1), 30, 1),
    (LOTS[8], "Charpente : fabrication atelier & anticorrosion", E_CM, D(2026, 10, 1), 45, 0.4),
    (LOTS[8], "Charpente : montage hangar & couverture", E_CM, D(2026, 11, 16), 35, 0),
    (LOTS[9], "Contrôles & essais (laboratoire) en continu", E_LAB, D(2026, 8, 10), 255, 0.25),
    (LOTS[0], "Repli de chantier & réception provisoire", E_ENC, D(2027, 4, 15), 15, 0),
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
BUDGET = [22_000_000, 190_000_000, 55_000_000, 30_000_000, 85_000_000, 55_000_000, 42_000_000,
          17_000_000, 34_000_000, 8_000_000]
AUTRES = [1_500_000, 6_000_000, 0, 0, 0, 0, 0, 0, 0, 500_000]
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
si["A5"], si["C5"] = "Situation n° :", 2
si["E5"], si["F5"] = "Période du :", D(2026, 10, 1)
si["H5"], si["I5"] = "au :", D(2026, 10, 31)
for a in ("A5", "E5", "H5"):
    si[a].font = font(True)
for a in ("C5", "F5", "I5"):
    si[a].font, si[a].fill, si[a].border = font(True, "1F3FBF"), fill(SAISIE), BORDER
si["F5"].number_format = si["I5"].number_format = FMT["date"]
DQE = [
    ("1.1", LOTS[0], "Installation et repli de chantier", "ff", 1, 30_000_000, 0.6, 0.1),
    ("1.2", LOTS[9], "Laboratoire de chantier, essais et contrôles", "ff", 1, 6_000_000, 0.2, 0.1),
    ("2.1", LOTS[1], "Débroussaillage, dessouchage et décapage", "m²", 160_000, 150, 120_000, 30_000),
    ("2.2", LOTS[1], "Scarification, reprofilage lourd et compactage de la plateforme", "km", 20, 4_500_000, 6, 2.5),
    ("2.3", LOTS[1], "Rechargement en latérite ép. 0,20 m (extraction, transport, mise en œuvre)", "m³", 20_000, 5_200, 6_000, 1_800),
    ("2.4", LOTS[1], "Fossés latéraux et exutoires", "ml", 12_000, 1_500, 0, 1_200),
    ("3.1", LOTS[2], "Purge des matériaux impropres aux points critiques", "m³", 3_000, 3_500, 1_200, 400),
    ("3.2", LOTS[2], "Remblai latéritique compacté à 95 % OPM", "m³", 6_000, 7_500, 2_000, 1_000),
    ("3.3", LOTS[2], "Enrochements et perrés secs", "m³", 300, 45_000, 0, 0),
    ("4.1", LOTS[3], "Fourniture et pose de buses BA Ø800", "ml", 48, 120_000, 0, 12),
    ("4.2", LOTS[3], "Fourniture et pose de buses BA Ø1000", "ml", 60, 165_000, 12, 12),
    ("4.3", LOTS[3], "Têtes de buses en béton armé (murs de tête et en aile)", "u", 10, 850_000, 0, 0),
    ("5.1", LOTS[4], "Béton de propreté dosé à 150 kg/m³ (dalots)", "m³", 20, 85_000, 12, 2),
    ("5.2", LOTS[4], "Béton armé dosé à 350 kg/m³ pour dalots", "m³", 260, 220_000, 70, 45),
    ("5.3", LOTS[4], "Aciers HA pour dalots", "kg", 26_000, 1_100, 7_000, 4_500),
    ("5.4", LOTS[4], "Remblais techniques compactés", "m³", 900, 9_000, 300, 0),
    ("5.5", LOTS[4], "Perrés maçonnés", "m²", 250, 25_000, 80, 0),
    ("6.1", LOTS[5], "Bâtiment – gros œuvre (terrassements, fondations, élévation, dalle)", "ens", 1, 62_000_000, 0.3, 0.15),
    ("6.2", LOTS[6], "Bâtiment – charpente, couverture et étanchéité", "ens", 1, 9_000_000, 0, 0),
    ("6.3", LOTS[6], "Bâtiment – menuiseries bois, aluminium et métalliques", "ens", 1, 8_500_000, 0, 0),
    ("6.4", LOTS[6], "Bâtiment – plomberie sanitaire", "ens", 1, 6_000_000, 0, 0),
    ("6.5", LOTS[6], "Bâtiment – électricité CFO / CFA et climatisation", "ens", 1, 7_500_000, 0, 0),
    ("6.6", LOTS[6], "Bâtiment – revêtements, enduits et peinture", "ens", 1, 9_000_000, 0, 0),
    ("7.1", LOTS[7], "Clôture agglos + poteaux BA, h = 2,50 m", "ml", 400, 45_000, 0, 120),
    ("7.2", LOTS[7], "Portail métallique 6 m", "u", 1, 2_500_000, 0, 0),
    ("8.1", LOTS[8], "Charpente métallique hangar (fourniture, fabrication, montage)", "kg", 18_000, 1_850, 0, 4_000),
    ("8.2", LOTS[8], "Couverture et bardage bac aluminium", "m²", 600, 12_000, 0, 0),
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
    ("SS-0805", D(2026, 8, 5), FOURN[6], LOTS[1], "Gasoil 20 000 l", "BC-010", 14_300_000, 30, 14_300_000, D(2026, 8, 20)),
    ("DC-0812", D(2026, 8, 12), FOURN[0], LOTS[4], "Ciment CPJ 42.5 – 600 sacs", "BC-001", 3_120_000, 30, 3_681_600, D(2026, 9, 10)),
    ("QG-0815", D(2026, 8, 15), FOURN[1], LOTS[4], "Acier HA12 – 400 barres", "BC-002", 2_240_000, 30, 2_643_200, D(2026, 9, 12)),
    ("QG-0816", D(2026, 8, 15), FOURN[1], LOTS[4], "Acier HA16 – 300 barres", "BC-003", 2_940_000, 30, 3_469_200, D(2026, 9, 12)),
    ("SB-0825", D(2026, 8, 25), FOURN[3], LOTS[4], "Sable – 120 m³", "BC-005", 1_440_000, 30, 1_699_200, D(2026, 9, 20)),
    ("CG-0826", D(2026, 8, 26), FOURN[2], LOTS[4], "Gravier 5/15 – 200 m³", "BC-007", 4_400_000, 30, 2_000_000, D(2026, 9, 25)),
    ("QG-0826", D(2026, 8, 26), FOURN[1], LOTS[5], "Acier HA10 – 250 barres", "BC-004", 975_000, 30, 1_150_500, D(2026, 9, 20)),
    ("LE-0831", D(2026, 8, 31), FOURN[7], LOTS[1], "Location niveleuse, compacteur, citernes – août", "", 18_500_000, 30, 21_830_000, D(2026, 9, 29)),
    ("BR-0910", D(2026, 9, 10), FOURN[4], LOTS[5], "Agglos creux 15 – 6 000 u", "BC-012", 2_250_000, 30, 2_655_000, D(2026, 10, 5)),
    ("DC-0920", D(2026, 9, 20), FOURN[0], LOTS[4], "Ciment CPJ 42.5 – 400 sacs", "BC-006", 2_080_000, 30, None, None),
    ("SS-0926", D(2026, 9, 26), FOURN[6], LOTS[1], "Gasoil 15 000 l", "BC-011", 10_725_000, 30, 10_725_000, D(2026, 10, 6)),
    ("LE-0930", D(2026, 9, 30), FOURN[7], LOTS[1], "Location niveleuse, compacteur, citernes – septembre", "", 24_000_000, 30, 10_000_000, D(2026, 10, 10)),
    ("PB-1001", D(2026, 10, 1), FOURN[5], LOTS[3], "Buses BA Ø1000 – 36 éléments", "BC-008", 4_500_000, 30, None, None),
    ("AC-1005", D(2026, 10, 5), FOURN[9], LOTS[8], "Acompte 30 % fourniture acier charpente", "", 9_990_000, 15, None, None),
    ("LG-1010", D(2026, 10, 10), FOURN[8], LOTS[9], "Essais Proctor, CBR, densités, écrasements – septembre", "", 1_850_000, 30, None, None),
]
fa_data = [dict(num=a, date=b, four=c, lot=d, obj=e, bc=f, ht=g, tx=0 if c == FOURN[6] else 0.18, delai=h, paye=i, dpay=j)
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
ASSIGN = {E_R: (LOTS[1], "Rechargement latéritique ép. 0,20 m + compactage 95 % OPM"),
          E_OH: (LOTS[4], "Dalot D2 – PK 9+750 – 2×(2,50×2,00)"),
          E_B: (LOTS[5], "Bâtiment : élévation maçonnerie & BA"),
          E_CM: (LOTS[8], "Charpente : fabrication atelier & anticorrosion"),
          E_ENC: (LOTS[0], "Installation de chantier, base vie, laboratoire"),
          E_LAB: (LOTS[9], "Contrôles & essais (laboratoire) en continu")}
for jour in (D(2026, 10, 15), D(2026, 10, 16)):
    for m, n_, f_, e, t in PERSONNEL:
        pres, h = "P", 8
        if m == "M007" and jour.day == 16:
            pres, h = "A", 0
        if m == "M016" and jour.day == 15:
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
        dict(date=jour, eq=E_R, chef="GNAHORÉ Didier", tache=ASSIGN[E_R][1], lot=LOTS[1], zone="Tronçon T08 – PK 7+000 à 8+000", prev=4),
        dict(date=jour, eq=E_OH, chef="KOUAMÉ Serge", tache=ASSIGN[E_OH][1], lot=LOTS[4], zone="Dalot D2 – PK 9+750 (piédroits)", prev=5),
        dict(date=jour, eq=E_B, chef="DIABATÉ Moussa", tache=ASSIGN[E_B][1], lot=LOTS[5], zone="Bâtiment – façade nord", prev=4),
        dict(date=jour, eq=E_CM, chef="ADOU Franck", tache=ASSIGN[E_CM][1], lot=LOTS[8], zone="Atelier – fermes F1", prev=2),
        dict(date=jour, eq=E_ENC, chef="KOFFI Yao", tache=ASSIGN[E_ENC][1], lot=LOTS[0], zone="Tout le chantier + topographie T09", prev=2),
        dict(date=jour, eq=E_LAB, chef="KOUASSI Arsène", tache=ASSIGN[E_LAB][1], lot=LOTS[9], zone="T08 – densités en place", prev=1),
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
    ("BC-001", D(2026, 8, 6), FOURN[0], LOTS[4], "CIM42", 600, 5_200, D(2026, 8, 12)),
    ("BC-002", D(2026, 8, 10), FOURN[1], LOTS[4], "HA12", 400, 5_600, D(2026, 8, 14)),
    ("BC-003", D(2026, 8, 10), FOURN[1], LOTS[4], "HA16", 300, 9_800, D(2026, 8, 14)),
    ("BC-004", D(2026, 8, 20), FOURN[1], LOTS[5], "HA10", 250, 3_900, D(2026, 8, 24)),
    ("BC-005", D(2026, 8, 20), FOURN[3], LOTS[4], "SAB", 120, 12_000, D(2026, 8, 25)),
    ("BC-006", D(2026, 9, 15), FOURN[0], LOTS[4], "CIM42", 400, 5_200, D(2026, 9, 19)),
    ("BC-007", D(2026, 8, 20), FOURN[2], LOTS[4], "GRA", 200, 22_000, D(2026, 8, 26)),
    ("BC-008", D(2026, 9, 10), FOURN[5], LOTS[3], "BUS1000", 60, 125_000, D(2026, 9, 30)),
    ("BC-009", D(2026, 9, 20), FOURN[5], LOTS[3], "BUS800", 48, 85_000, D(2026, 10, 10)),
    ("BC-010", D(2026, 8, 4), FOURN[6], LOTS[1], "GASOIL", 20_000, 715, D(2026, 8, 5)),
    ("BC-011", D(2026, 9, 25), FOURN[6], LOTS[1], "GASOIL", 15_000, 715, D(2026, 9, 26)),
    ("BC-012", D(2026, 9, 1), FOURN[4], LOTS[5], "AGG15", 6_000, 375, D(2026, 9, 8)),
    ("BC-013", D(2026, 10, 12), FOURN[1], LOTS[7], "HA8", 300, 2_600, D(2026, 10, 20)),
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
    ("CIM42", "Ciment CPJ 42.5 (sac 50 kg)", "sac", 0, 150, 5_200),
    ("HA8", "Acier HA8 (barre 12 m)", "barre", 120, 40, 2_600),
    ("HA10", "Acier HA10 (barre 12 m)", "barre", 0, 30, 3_900),
    ("HA12", "Acier HA12 (barre 12 m)", "barre", 0, 50, 5_600),
    ("HA16", "Acier HA16 (barre 12 m)", "barre", 0, 40, 9_800),
    ("SAB", "Sable", "m³", 0, 15, 12_000),
    ("GRA", "Gravier concassé 5/15", "m³", 0, 20, 22_000),
    ("BUS800", "Buse BA Ø800 (élément 1 m)", "u", 0, 6, 85_000),
    ("BUS1000", "Buse BA Ø1000 (élément 1 m)", "u", 0, 6, 125_000),
    ("GASOIL", "Gasoil engins", "l", 0, 5_000, 715),
    ("AGG15", "Agglos creux de 15", "u", 0, 500, 375),
    ("PLA", "Planche de coffrage", "u", 100, 30, 2_500),
    ("FIL", "Fil à ligaturer recuit", "kg", 50, 15, 1_500),
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
    (D(2026, 8, 5), "Entrée", "GASOIL", 20_000, "BC-010", "BL-S801", ""),
    (D(2026, 8, 12), "Entrée", "CIM42", 600, "BC-001", "BL-C112", ""),
    (D(2026, 8, 14), "Entrée", "HA12", 400, "BC-002", "BL-Q214", ""),
    (D(2026, 8, 14), "Entrée", "HA16", 300, "BC-003", "BL-Q214", ""),
    (D(2026, 8, 24), "Entrée", "HA10", 250, "BC-004", "BL-Q224", ""),
    (D(2026, 8, 25), "Entrée", "SAB", 120, "BC-005", "BL-S025", ""),
    (D(2026, 8, 26), "Entrée", "GRA", 200, "BC-007", "BL-G026", ""),
    (D(2026, 8, 31), "Sortie", "GASOIL", 16_500, "", "BS-GO-08", LOTS[1]),
    (D(2026, 9, 5), "Sortie", "CIM42", 520, "", "BS-001", LOTS[4]),
    (D(2026, 9, 5), "Sortie", "HA12", 360, "", "BS-001", LOTS[4]),
    (D(2026, 9, 5), "Sortie", "HA16", 180, "", "BS-001", LOTS[4]),
    (D(2026, 9, 5), "Sortie", "GRA", 170, "", "BS-001", LOTS[4]),
    (D(2026, 9, 5), "Sortie", "SAB", 95, "", "BS-001", LOTS[4]),
    (D(2026, 9, 8), "Entrée", "AGG15", 6_000, "BC-012", "BL-B908", ""),
    (D(2026, 9, 10), "Sortie", "HA10", 150, "", "BS-002", LOTS[5]),
    (D(2026, 9, 19), "Entrée", "CIM42", 400, "BC-006", "BL-C419", ""),
    (D(2026, 9, 26), "Entrée", "GASOIL", 15_000, "BC-011", "BL-S926", ""),
    (D(2026, 9, 30), "Sortie", "GASOIL", 15_000, "", "BS-GO-09", LOTS[1]),
    (D(2026, 10, 1), "Entrée", "BUS1000", 36, "BC-008", "BL-P101", ""),
    (D(2026, 10, 2), "Sortie", "BUS1000", 24, "", "BS-003", LOTS[3]),
    (D(2026, 10, 3), "Sortie", "AGG15", 4_800, "", "BS-004", LOTS[5]),
    (D(2026, 10, 5), "Entrée", "BUS800", 12, "BC-009", "BL-P105", ""),
    (D(2026, 10, 6), "Sortie", "BUS800", 12, "", "BS-005", LOTS[3]),
    (D(2026, 10, 15), "Sortie", "CIM42", 330, "", "BS-006", LOTS[4]),
    (D(2026, 10, 15), "Sortie", "PLA", 40, "", "BS-006", LOTS[4]),
    (D(2026, 10, 15), "Sortie", "FIL", 30, "", "BS-006", LOTS[4]),
    (D(2026, 10, 16), "Sortie", "HA8", 100, "", "BS-007", LOTS[7]),
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
    (D(2026, 10, 12), "Ensoleillé", 33, "Rechargement T07 (PK 6+000–7+000) 1 000 m³ ; coffrage piédroits D2 ; élévation bâtiment", "", "Non", "RAS – port EPI vérifié", 0),
    (D(2026, 10, 13), "Forte pluie", 27, "Arrêt rechargement 4 h ; ferraillage piédroits D2 ; fabrication fermes atelier", "", "Oui", "Évacuation eaux pluviales ; latérite T08 détrempée", 4),
    (D(2026, 10, 14), "Nuageux", 30, "Compactage T08 ; essais densité en place (93,5 % OPM : non conforme)", "Visite MDC – contrôle compactage T08", "Oui", "Signalisation de la zone de travaux", 0),
    (D(2026, 10, 15), "Ensoleillé", 33, "Reprise T08 (scarification, aération) ; débroussaillage T19 ; poteaux clôture tronçon A", "", "Oui", "Arrosage piste (poussière riverains)", 0),
    (D(2026, 10, 16), "Pluie faible", 29, "Recompactage T08 ; ferraillage piédroits D2 (PA en attente) ; élévation bâtiment", "", "Oui", "Panne compacteur – zone balisée", 1),
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
    ("INC-01", D(2026, 10, 13), "Intempérie", "Moyenne", LOTS[1], "Forte pluie : arrêt rechargement 4 h, latérite T08 détrempée",
     "Petite saison des pluies", "Arrêt des engins, drainage provisoire", "Journal des intempéries pour demande de prolongation",
     "KOFFI Yao", D(2026, 10, 20), "En cours", 1_200_000),
    ("INC-02", D(2026, 10, 14), "Qualité / non-conformité", "Majeure", LOTS[1], "Compacité 93,5 % OPM sur T08 (< 95 %)",
     "Teneur en eau trop élevée après la pluie", "Point d'arrêt : pas de couche suivante", "Scarifier, aérer, recompacter, nouvel essai de densité",
     AUTEUR, D(2026, 10, 18), "Ouvert", 850_000),
    ("INC-03", D(2026, 10, 15), "Approvisionnement", "Majeure", LOTS[3], "Buses Ø800 BC-009 : 12 livrées sur 48, pose PC4 bloquée",
     "Retard de production du préfabricant", "Relance écrite du fournisseur", "Pénalités / recherche d'un second préfabricant",
     AUTEUR, D(2026, 10, 20), "Ouvert", 0),
    ("INC-04", D(2026, 10, 16), "Matériel / panne", "Moyenne", LOTS[1], "Panne compacteur V5 (flexible hydraulique)",
     "Usure – entretien préventif non fait", "Location d'un compacteur de remplacement", "Planning d'entretien des engins",
     "GNAHORÉ Didier", D(2026, 10, 18), "En cours", 450_000),
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
    ("Route", "Emprunts de latérite identifiés, autorisés (propriétaires / administration) et essayés (Proctor, CBR)"),
    ("Route", "Piquetage de l'axe, profils en travers et repères PK posés (topographie)"),
    ("Route", "Inventaire contradictoire des points critiques et des ouvrages existants (PV)"),
    ("Route", "Engins mobilisés et vérifiés : niveleuse, compacteur, chargeuse, camions, citerne à eau"),
    ("Route", "Signalisation temporaire et déviations (sécurité usagers et riverains)"),
    ("Ouvrages", "Plans d'exécution dalots et têtes de buses validés (BA : EC2 / BAEL)"),
    ("Ouvrages", "Préfabricant de buses Ø800 / Ø1000 retenu, classe des buses et délais confirmés"),
    ("Charpente", "Plans d'atelier et notes de calcul charpente métallique validés (EC3)"),
    ("Contrôle", "Plan de contrôle (onglet Plan_controle) validé par la mission de contrôle"),
    ("Contrôle", "Liste des points d'arrêt et circuit de levée (entreprise / MDC) diffusés"),
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
    ("Buse", "Conduite préfabriquée en béton armé (ici Ø800 et Ø1000) assurant le passage des eaux sous la chaussée."),
    ("Dalot", "Ouvrage hydraulique cadre en béton armé (radier, piédroits, dalle) de section rectangulaire."),
    ("Emprunt", "Gisement de matériaux (latérite) exploité pour les remblais et le rechargement."),
    ("EC3", "Eurocode 3 (NF EN 1993) : calcul des structures en acier (charpente métallique)."),
    ("MDC", "Mission de contrôle : surveille et valide l'exécution pour le compte du maître d'ouvrage."),
    ("Mur de tête / en aile", "Murs en BA aux extrémités d'une buse ou d'un dalot, protégeant le remblai de l'érosion."),
    ("Perré", "Revêtement de talus ou de lit (moellons maçonnés ou secs) contre l'érosion."),
    ("Point critique (route)", "Section dégradée de route en terre (bourbier, ravinement, zone inondable) à traiter spécifiquement."),
    ("Purge", "Enlèvement des matériaux impropres (argile, vase) remplacés par un matériau sain compacté."),
    ("Rechargement", "Apport d'une couche de latérite (ex. 0,20 m) compactée pour reconstituer la couche de roulement."),
    ("Reprofilage lourd", "Scarification et remise en forme de la plateforme à la niveleuse avec apport, arrosage et compactage."),
    ("Taux de disponibilité", "Heures de marche / (heures de marche + heures de panne) d'un engin."),
    ("TCE", "Tous corps d'état : ensemble des métiers d'un bâtiment (gros œuvre, menuiserie, plomberie, électricité…)."),
]
lx.column_dimensions["A"].width = 26
lx.column_dimensions["B"].width = 100
for i, hd in enumerate(["Terme", "Définition"]):
    c = lx.cell(6, 1 + i, hd); c.font, c.fill, c.border = font(True, "FFFFFF"), fill(VERT2), BORDER
for i, (t, d_) in enumerate(LEX):
    a, b = lx.cell(7 + i, 1, t), lx.cell(7 + i, 2, d_)
    a.font, a.border, b.border, b.alignment = font(True, VERT), BORDER, BORDER, LEFT

# ======================================================= SUIVIS SPÉCIALISÉS
from openpyxl.formatting.rule import ColorScaleRule, DataBarRule


def suivi(nom_onglet, titre, desc, prefix, ident, phases, extras, data, n, id_key, pond_key):
    """Onglet de suivi par phases pondérées. Une phase sans objet se saisit « n/a »
    (elle est alors exclue du calcul de l'avancement de la ligne)."""
    ws = wb.create_sheet(nom_onglet)
    c_p1 = len(ident) + 1
    p1, pn = L(c_p1), L(c_p1 + len(phases) - 1)
    W = f"${p1}$6:${pn}$6"
    cols = list(ident)
    for i, (lib, _) in enumerate(phases):
        cols.append(dict(key=f"p{i + 1}", h=lib, w=11, fmt="pct", centre=True))
    cols.append(dict(key="av", h="Avancement pondéré", w=11, fmt="pct", name=f"{prefix}_Av",
                     f='=IF({' + id_key + '}{r}="","",IFERROR(SUMPRODUCT(' + W + ',' + p1 + '{r}:' + pn + '{r})/SUMPRODUCT('
                       + W + '*(' + p1 + '{r}:' + pn + '{r}<>"n/a")),0))'))
    cols.append(dict(key="stat", h="Statut", w=12, name=f"{prefix}_Stat", centre=True,
                     f='=IF({' + id_key + '}{r}="","",IF({av}{r}>=1,"Terminé",IF({av}{r}>0,"En cours","Non démarré")))'))
    cols += extras
    entete(ws, titre, len(cols), desc)
    let, f1, l1 = table(ws, 7, cols, data, n)
    ws.row_dimensions[7].height = 46
    # ligne des poids de phases
    ws.cell(6, c_p1 - 1, "Poids des phases →").font = font(True, VERT)
    ws.cell(6, c_p1 - 1).alignment = Alignment(horizontal="right")
    for i, (_, w) in enumerate(phases):
        c = ws.cell(6, c_p1 + i, w)
        c.number_format, c.font, c.fill, c.border, c.alignment = FMT["pct"], font(True, "1F3FBF"), fill(SAISIE), BORDER, CENTER
    c = ws.cell(6, c_p1 + len(phases), f"=SUM({W})")
    c.number_format, c.font, c.border, c.alignment = FMT["pct"], font(True), BORDER, CENTER
    ws.conditional_formatting.add(c.coordinate, FormulaRule(formula=[f"ROUND({c.coordinate},4)<>1"], fill=fill("EF9A9A")))
    c.comment = Comment("La somme des poids doit faire 100 %.", AUTEUR)
    # avancement global de l'onglet
    ws.merge_cells("A5:B5")
    ws["A5"] = "AVANCEMENT GLOBAL :"
    ws["A5"].font = font(True, VERT, 11)
    pr = f"${let[pond_key]}${f1}:${let[pond_key]}${l1}"
    ar = f"${let['av']}${f1}:${let['av']}${l1}"
    g = ws["C5"]
    g.value = f"=IFERROR(SUMPRODUCT({pr},{ar})/SUM({pr}),0)"
    g.number_format, g.font, g.fill, g.border = FMT["pct"], font(True, VERT, 12), fill(VERT_CLAIR), BORDER
    nom(f"{prefix}_Glob", ws.title, "$C$5")
    nom(f"{prefix}_Pond", ws.title, pr)
    ws.cell(5, 4, "(pondéré par : " + next(c["h"] for c in cols if c["key"] == pond_key) + ")").font = font(False, GRIS_TXT, 9, True)
    rng = f"{p1}{f1}:{pn}{l1}"
    ws.conditional_formatting.add(rng, CellIsRule(operator="equal", formula=['"n/a"'], fill=fill("E0E0E0"),
                                                  font=Font(name=FONT, color="9E9E9E")))
    ws.conditional_formatting.add(rng, ColorScaleRule(start_type="num", start_value=0, start_color="FFFFFF",
                                                      end_type="num", end_value=1, end_color="81C784"))
    ws.conditional_formatting.add(f"{let['av']}{f1}:{let['av']}{l1}", DataBarRule(
        start_type="num", start_value=0, end_type="num", end_value=1, color="43A047"))
    cf_statut(ws, f"{let['stat']}{f1}:{let['stat']}{l1}", orange=["En cours"], vert=["Terminé"], gris=["Non démarré"])
    ws.freeze_panes = ws.cell(f1, 2)
    return ws, let, f1, l1


def phases_data(rows, keys, nph):
    out = []
    for row in rows:
        d = dict(zip(keys, row[:len(keys)]))
        for i, v in enumerate(row[len(keys):len(keys) + nph]):
            d[f"p{i + 1}"] = v
        for k, v in zip(("x1", "x2", "x3", "x4"), row[len(keys) + nph:]):
            d[k] = v
        out.append(d)
    return out


# ---------------------------------------------------------- 13 ROUTE
RT_PH = [("Débroussaillage & décapage", 0.05), ("Scarification", 0.10), ("Reprofilage lourd (mise en forme)", 0.20),
         ("Rechargement latéritique", 0.35), ("Arrosage & compactage", 0.20), ("Fossés & exutoires", 0.10)]
rt_rows = []
for k in range(20):
    if k < 5:
        ph, vmo, ctl = [1, 1, 1, 1, 1, 1], 1000, (0.962 + k * 0.003, 38 + k, 0.20)
    elif k == 5:
        ph, vmo, ctl = [1, 1, 1, 1, 1, 0.5], 1000, (0.958, 35, 0.19)
    elif k == 6:
        ph, vmo, ctl = [1, 1, 1, 1, 1, 0], 1000, (0.964, 41, 0.19)
    elif k == 7:
        ph, vmo, ctl = [1, 1, 1, 0.8, 0.5, 0], 800, (0.935, 36, 0.20)
    elif k == 8:
        ph, vmo, ctl = [1, 1, 0.6, 0, 0, 0], None, (None, None, None)
    elif k == 9:
        ph, vmo, ctl = [1, 0.8, 0.3, 0, 0, 0], None, (None, None, None)
    elif k < 18:
        ph, vmo, ctl = [1, 0, 0, 0, 0, 0], None, (None, None, None)
    elif k == 18:
        ph, vmo, ctl = [0.5, 0, 0, 0, 0, 0], None, (None, None, None)
    else:
        ph, vmo, ctl = [0, 0, 0, 0, 0, 0], None, (None, None, None)
    rt_rows.append([f"T{k + 1:02d}", k * 1000, (k + 1) * 1000, 5.0, 0.20, vmo] + ph + list(ctl))
ws_rt, let, f1, l1 = suivi(
    "13_Route", "13 · ROUTE EN TERRE – REPROFILAGE LOURD & RECHARGEMENT (suivi par tronçon)",
    "Un tronçon par ligne (PK en mètres, affichés 0+000). Saisissez le % de chaque phase (n/a si sans objet) et les "
    "résultats de contrôle. Conformité : compacité ≥ seuil, CBR ≥ seuil, épaisseur ≥ prévue − tolérance (Paramètres).",
    "RT",
    [dict(key="tr", h="Tronçon", w=8, centre=True, name="RT_Tr"),
     dict(key="pkd", h="PK début", w=9, fmt="pk", centre=True),
     dict(key="pkf", h="PK fin", w=9, fmt="pk", centre=True),
     dict(key="lg", h="Longueur (km)", w=8, fmt="dec2", name="RT_Long",
          f='=IF(OR({pkd}{r}="",{pkf}{r}=""),"",({pkf}{r}-{pkd}{r})/1000)'),
     dict(key="larg", h="Largeur rechargée (m)", w=8, fmt="dec"),
     dict(key="ep", h="Ép. rechargement prévue (m)", w=9, fmt="dec2"),
     dict(key="vp", h="Volume latérite prévu (m³)", w=10, fmt="int", name="RT_VolPrev",
          f='=IF({lg}{r}="","",{lg}{r}*1000*N({larg}{r})*N({ep}{r}))'),
     dict(key="vmo", h="Volume mis en œuvre (m³)", w=10, fmt="int", name="RT_VolMO")],
    RT_PH,
    [dict(key="km", h="km réalisés (équivalent)", w=9, fmt="dec2", name="RT_Km",
          f='=IF({av}{r}="","",{lg}{r}*{av}{r})'),
     dict(key="x1", h="Compacité mesurée (% OPM)", w=9, fmt="pct"),
     dict(key="x2", h="CBR mesuré", w=7, fmt="int", centre=True),
     dict(key="x3", h="Épaisseur mesurée (m)", w=8, fmt="dec2"),
     dict(key="conf", h="Conformité", w=13, centre=True, name="RT_Conf",
          f='=IF(AND({x1}{r}="",{x2}{r}="",{x3}{r}=""),"",IF(AND(OR({x1}{r}="",{x1}{r}>=P_Compacite),'
            'OR({x2}{r}="",{x2}{r}>=P_CBR),OR({x3}{r}="",{x3}{r}>=N({ep}{r})-P_TolEp)),"Conforme","Non conforme"))'),
     dict(key="obs", h="Observations", w=24)],
    phases_data(rt_rows, ["tr", "pkd", "pkf", "larg", "ep", "vmo"], 6), 80, "tr", "lg")
cf_statut(ws_rt, f"{let['conf']}{f1}:{let['conf']}{l1}", rouge=["Non conforme"], vert=["Conforme"])

# ------------------------------------------------- 14 POINTS CRITIQUES & BUSES
PC_PH = [("Purge & terrassement", 0.20), ("Remblai latéritique compacté", 0.25), ("Fouille & lit de pose", 0.10),
         ("Pose & jointoiement buses", 0.20), ("Remblai sur buses", 0.10), ("Têtes / perrés / enrochements", 0.15)]
NA = "n/a"
pc_rows = [
    ["PC1", 2350, "Bourbier (zone hydromorphe)", "Purge + remblai latéritique", 120, None, None, None, None, None, 9_000_000,
     1, 1, NA, NA, NA, NA, "Conforme"],
    ["PC2", 4800, "Traversée de bas-fond", "Pose de buses", 60, "Ø1000", 2, 12, 24, 2, 14_000_000,
     1, 1, 1, 1, 1, 0.3, "Conforme"],
    ["PC3", 6100, "Ravinement transversal", "Pose de buses", 30, "Ø800", 1, 12, 12, 2, 6_500_000,
     1, 1, 1, 1, 1, 1, "Conforme"],
    ["PC4", 8400, "Passage d'eau (radier submersible)", "Pose de buses", 40, "Ø800", 2, 12, 0, 2, 9_000_000,
     1, 0.5, 0.3, 0, 0, 0, "En attente"],
    ["PC5", 11200, "Zone inondable", "Purge + remblai latéritique", 250, None, None, None, None, None, 16_000_000,
     0.6, 0.3, NA, NA, NA, NA, "En attente"],
    ["PC6", 13650, "Traversée de cours d'eau temporaire", "Pose de buses", 50, "Ø1000", 3, 12, 0, 2, 15_000_000,
     0.3, 0, 0, 0, 0, 0, None],
    ["PC7", 15900, "Ravinement transversal", "Pose de buses", 30, "Ø800", 1, 12, 0, 2, 5_000_000,
     0, 0, 0, 0, 0, 0, None],
    ["PC8", 18300, "Bourbier", "Purge + remblai latéritique", 150, None, None, None, None, None, 10_000_000,
     0, 0, NA, NA, NA, NA, None],
]
ws_pc, let, f1, l1 = suivi(
    "14_Points_critiques", "14 · POINTS CRITIQUES & OUVRAGES BUSES (Ø800 / Ø1000)",
    "Un point critique par ligne. Pour un traitement sans buses, saisir « n/a » dans les phases buses. "
    "ml de buses prévus = nb de lignes × longueur par ligne ; saisissez les ml réellement posés. Pondération : montant estimé.",
    "PC",
    [dict(key="num", h="N° PC", w=7, centre=True, name="PC_Num"),
     dict(key="pk", h="PK", w=8, fmt="pk", centre=True),
     dict(key="nat", h="Nature du désordre", w=24),
     dict(key="trait", h="Traitement retenu", w=22, dv="L_Traitement", libre=True),
     dict(key="lgt", h="Longueur traitée (m)", w=8, fmt="int"),
     dict(key="diam", h="Ø buses", w=7, dv="L_Diam", centre=True, name="PC_Diam"),
     dict(key="nl", h="Nb lignes", w=6, fmt="int", centre=True),
     dict(key="lu", h="Long. par ligne (ml)", w=7, fmt="dec"),
     dict(key="mlp", h="ml buses prévus", w=8, fmt="dec", name="PC_MlPrev",
          f='=IF({diam}{r}="","",N({nl}{r})*N({lu}{r}))'),
     dict(key="mlo", h="ml buses posés", w=8, fmt="dec", name="PC_MlPose"),
     dict(key="tete", h="Têtes de buses (u)", w=7, fmt="int", centre=True),
     dict(key="mont", h="Montant estimé (FCFA)", w=13, fmt="fcfa")],
    PC_PH,
    [dict(key="x1", h="Contrôle MDC", w=12, dv="L_Verdict", libre=True, centre=True),
     dict(key="obs", h="Observations", w=24)],
    phases_data(pc_rows, ["num", "pk", "nat", "trait", "lgt", "diam", "nl", "lu", "mlo", "tete", "mont"], 6),
    60, "num", "mont")
cf_statut(ws_pc, f"{let['x1']}{f1}:{let['x1']}{l1}", rouge=["Non conforme"], orange=["Réserve"], vert=["Conforme"])
ws_pc.conditional_formatting.add(f"{let['mlo']}{f1}:{let['mlo']}{l1}", FormulaRule(
    formula=[f'AND(ISNUMBER({let["mlp"]}{f1}),N({let["mlo"]}{f1})>{let["mlp"]}{f1})'], fill=fill("EF9A9A")))
# Récapitulatif buses (sous le titre)
for i, (d_, lbl) in enumerate((("Ø800", "Buses Ø800"), ("Ø1000", "Buses Ø1000"))):
    c0 = 13 + i * 3
    ws_pc.cell(5, c0, lbl + " posées (ml) :").font = font(True, VERT)
    c = ws_pc.cell(5, c0 + 2, f'=SUMIFS(PC_MlPose,PC_Diam,"{d_}")&" / "&SUMIFS(PC_MlPrev,PC_Diam,"{d_}")')
    c.font, c.fill, c.border = font(True), fill(VERT_CLAIR), BORDER

# ---------------------------------------------------------------- 15 DALOTS
DA_PH = [("Implantation & fouilles", 0.05), ("Béton de propreté", 0.05), ("Radier (ferraillage + coulage)", 0.20),
         ("Piédroits", 0.20), ("Dalle / tablier", 0.25), ("Murs de tête & en aile", 0.15),
         ("Remblais techniques & perrés", 0.10)]
da_rows = [
    ["D1", 3200, "1×(2,00×1,50)", 9, 55, 5500, 22_000_000, 1, 1, 1, 1, 1, 1, 1, 19.5, 27.8],
    ["D2", 9750, "2×(2,50×2,00)", 10, 120, 12000, 46_000_000, 1, 1, 1, 0.6, 0, 0, 0, 18.2, None],
    ["D3", 16400, "1×(3,00×2,00)", 10, 85, 8500, 33_000_000, 0, 0, 0, 0, 0, 0, 0, None, None],
]
ws_da, let, f1, l1 = suivi(
    "15_Dalots", "15 · SUIVI DES DALOTS (ouvrages hydrauliques en béton armé)",
    "Un dalot par ligne. Ferraillages et coffrages = points d'arrêt à lever par la mission de contrôle avant coulage "
    "(onglet 12). Béton : conformité si fc28 moyen ≥ fc28 exigé (Paramètres, EC2 / BAEL).",
    "DA",
    [dict(key="num", h="Ouvrage", w=8, centre=True, name="DA_Num"),
     dict(key="pk", h="PK", w=8, fmt="pk", centre=True),
     dict(key="type", h="Section (nb × l × h)", w=15, centre=True),
     dict(key="lg", h="Longueur (m)", w=8, fmt="dec"),
     dict(key="vb", h="Béton prévu (m³)", w=8, fmt="int"),
     dict(key="ac", h="Acier prévu (kg)", w=9, fmt="int"),
     dict(key="mont", h="Montant (FCFA)", w=13, fmt="fcfa")],
    DA_PH,
    [dict(key="x1", h="fc 7 j moyen (MPa)", w=8, fmt="dec", centre=True),
     dict(key="x2", h="fc 28 j moyen (MPa)", w=8, fmt="dec", centre=True),
     dict(key="conf", h="Conformité béton", w=14, centre=True,
          f='=IF({num}{r}="","",IF({x2}{r}="",IF({x1}{r}="","","En attente 28 j"),IF({x2}{r}>=P_Fc28,"Conforme","Non conforme")))'),
     dict(key="obs", h="Observations", w=24)],
    phases_data(da_rows, ["num", "pk", "type", "lg", "vb", "ac", "mont"], 7), 30, "num", "mont")
cf_statut(ws_da, f"{let['conf']}{f1}:{let['conf']}{l1}", rouge=["Non conforme"], orange=["En attente 28 j"], vert=["Conforme"])

# ------------------------------------------------------------ 16 BÂTIMENT TCE
bt_rows = [
    ["Terrassements & fouilles", "Entreprise", 3_500_000, D(2026, 8, 24), D(2026, 9, 2), 1],
    ["Fondations (semelles, longrines, soubassement)", "Entreprise", 11_500_000, D(2026, 9, 3), D(2026, 9, 22), 1],
    ["Élévation maçonnerie & BA (poteaux, poutres)", "Entreprise", 27_000_000, D(2026, 9, 23), D(2026, 10, 27), 0.6],
    ["Dalle / plancher haut", "Entreprise", 20_000_000, D(2026, 10, 28), D(2026, 11, 16), 0],
    ["Charpente & couverture", "Sous-traitant", 6_500_000, D(2026, 11, 20), D(2026, 12, 14), 0],
    ["Étanchéité", "Sous-traitant", 2_500_000, D(2026, 12, 1), D(2026, 12, 14), 0],
    ["Menuiserie bois", "Sous-traitant", 3_500_000, D(2026, 12, 21), D(2027, 1, 19), 0],
    ["Menuiserie aluminium & vitrerie", "Sous-traitant", 3_500_000, D(2026, 12, 21), D(2027, 1, 19), 0],
    ["Menuiserie métallique (portes, grilles)", "Sous-traitant", 1_500_000, D(2026, 12, 21), D(2027, 1, 19), 0],
    ["Plomberie sanitaire", "Sous-traitant", 6_000_000, D(2026, 11, 25), D(2027, 1, 8), 0],
    ["Électricité CFO / CFA", "Sous-traitant", 6_000_000, D(2026, 11, 25), D(2027, 1, 8), 0],
    ["Climatisation / ventilation", "Sous-traitant", 1_500_000, D(2027, 1, 11), D(2027, 1, 29), 0],
    ["Carrelage & faïence", "Entreprise", 5_000_000, D(2027, 1, 5), D(2027, 2, 5), 0],
    ["Faux plafonds", "Sous-traitant", 1_500_000, D(2027, 1, 20), D(2027, 2, 5), 0],
    ["Enduits", "Entreprise", 1_500_000, D(2027, 1, 5), D(2027, 1, 29), 0],
    ["Peinture", "Entreprise", 1_000_000, D(2027, 2, 1), D(2027, 2, 23), 0],
]
ws_bt, let, f1, l1 = suivi(
    "16_Batiment_TCE", "16 · BÂTIMENT TOUS CORPS D'ÉTAT (TCE)",
    "Un corps d'état par ligne avec son montant (pondération), ses dates et son % réalisé. "
    "Les réserves relevées aux réceptions par corps d'état se suivent dans la colonne « Réserves ».",
    "BT",
    [dict(key="ce", h="Corps d'état", w=36, name="BT_CE"),
     dict(key="ent", h="Entreprise / sous-traitant", w=16),
     dict(key="mont", h="Montant HT (FCFA)", w=14, fmt="fcfa"),
     dict(key="deb", h="Début", w=11, fmt="date"),
     dict(key="fin", h="Fin", w=11, fmt="date")],
    [("% réalisé", 1.0)],
    [dict(key="mr", h="Montant réalisé (FCFA)", w=14, fmt="fcfa",
          f='=IF({av}{r}="","",N({mont}{r})*{av}{r})'),
     dict(key="ret", h="Retard ?", w=9, centre=True,
          f='=IF(OR({ce}{r}="",{fin}{r}=""),"",IF(AND(P_DateRef>{fin}{r},{av}{r}<1),"En retard",""))'),
     dict(key="x1", h="Réserves (nb)", w=8, fmt="int", centre=True),
     dict(key="obs", h="Observations", w=26)],
    phases_data(bt_rows, ["ce", "ent", "mont", "deb", "fin"], 1), 40, "ce", "mont")
cf_statut(ws_bt, f"{let['ret']}{f1}:{let['ret']}{l1}", rouge=["En retard"])

# ---------------------------------------------------------------- 17 CLÔTURE
CL_PH = [("Implantation & fouilles", 0.10), ("Semelle filante", 0.15), ("Soubassement", 0.15), ("Poteaux BA", 0.15),
         ("Élévation maçonnerie", 0.20), ("Chaînage haut", 0.10), ("Enduits & peinture", 0.15)]
cl_rows = [
    ["A – Façade principale", 80, 2.5, "Agglos 15 + poteaux BA / 3 m", 1, 1, 1, 0.6, 0.3, 0, 0],
    ["B – Côté est", 100, 2.5, "Agglos 15 + poteaux BA / 3 m", 1, 1, 1, 0.2, 0, 0, 0],
    ["C – Côté arrière", 100, 2.5, "Agglos 15 + poteaux BA / 3 m", 1, 1, 0.8, 0, 0, 0, 0],
    ["D – Côté ouest", 114, 2.5, "Agglos 15 + poteaux BA / 3 m", 1, 1, 0.5, 0, 0, 0, 0],
    ["Portail métallique 6 m", 6, 2.5, "Portail 2 vantaux + piliers BA", 0, 0, NA, 0, NA, NA, 0],
]
ws_cl, let, f1, l1 = suivi(
    "17_Cloture", "17 · CONSTRUCTION DE LA CLÔTURE (suivi par tronçon)",
    "Un tronçon par ligne (longueur en ml = pondération). Saisissez le % de chaque phase ; « n/a » si sans objet.",
    "CL",
    [dict(key="tr", h="Tronçon / élément", w=24, name="CL_Tr"),
     dict(key="lg", h="Longueur (ml)", w=9, fmt="dec"),
     dict(key="h", h="Hauteur (m)", w=7, fmt="dec2"),
     dict(key="type", h="Constitution", w=26)],
    CL_PH,
    [dict(key="mla", h="ml achevés (équivalent)", w=10, fmt="dec", name="CL_Ml",
          f='=IF({av}{r}="","",N({lg}{r})*{av}{r})'),
     dict(key="obs", h="Observations", w=24)],
    phases_data(cl_rows, ["tr", "lg", "h", "type"], 7), 30, "tr", "lg")

# ------------------------------------------------------ 18 CHARPENTE MÉTALLIQUE
CM_PH = [("Approvisionnement acier", 0.10), ("Fabrication atelier", 0.30), ("Anticorrosion / peinture", 0.10),
         ("Transport", 0.05), ("Levage & montage", 0.30), ("Boulonnage / serrage contrôlé", 0.10), ("Réception", 0.05)]
cm_rows = [
    ["P1", "Poteaux", "HEA 200 – S275", 12, 254, 1, 1, 0.5, 0, 0, 0, 0],
    ["F1", "Fermes treillis 20 m", "Cornières L – S275", 6, 1150, 1, 0.5, 0, 0, 0, 0, 0],
    ["PA", "Pannes", "IPE 120 – S235", 66, 52, 1, 0.2, 0, 0, 0, 0, 0],
    ["LS", "Lisses de bardage", "UPN 100 – S235", 48, 53, 1, 0, 0, 0, 0, 0, 0],
    ["CV", "Contreventements (palées, poutres au vent)", "Cornières / tirants", 1, 1200, 0.5, 0, 0, 0, 0, 0, 0],
    ["AN", "Platines, tiges d'ancrage & goussets", "Tôles S275 / tiges", 1, 650, 1, 1, 1, 1, NA, NA, 0],
]
ws_cm, let, f1, l1 = suivi(
    "18_Charpente_metal", "18 · CHARPENTE MÉTALLIQUE (hangar) – suivi par repère",
    "Un repère (famille d'éléments) par ligne. Pondération = poids total (kg). Contrôles : certificats matière, "
    "soudures, peinture, ancrages, verticalité, serrage (onglet 12, référentiel EC3 / CCTP).",
    "CM",
    [dict(key="rep", h="Repère", w=7, centre=True, name="CM_Rep"),
     dict(key="des", h="Désignation", w=30),
     dict(key="prof", h="Profilé / nuance", w=18),
     dict(key="q", h="Quantité", w=7, fmt="int", centre=True),
     dict(key="pu", h="Poids unitaire (kg)", w=9, fmt="int"),
     dict(key="pt", h="Poids total (kg)", w=10, fmt="int",
          f='=IF({rep}{r}="","",N({q}{r})*N({pu}{r}))')],
    CM_PH,
    [dict(key="kg", h="kg réalisés (équivalent)", w=10, fmt="int", name="CM_Kg",
          f='=IF({av}{r}="","",{pt}{r}*{av}{r})'),
     dict(key="obs", h="Observations", w=24)],
    phases_data(cm_rows, ["rep", "des", "prof", "q", "pu"], 7), 40, "rep", "pt")

# ------------------------------------------------------- PLAN DE CONTRÔLE
pc_ = wb.create_sheet("Plan_controle")
entete(pc_, "PLAN DE CONTRÔLE – référentiel des points d'arrêt, contrôles et essais", 7,
       "Référentiel type à adapter au CCTP du marché et au PAQ. PA = point d'arrêt (levée écrite obligatoire avant de "
       "poursuivre) · PC = point critique (contrôle avec information préalable) · AC = autocontrôle de l'entreprise.")
PLAN = [
    ("Route en terre", "Emprunt de latérite", "Identification : granulométrie, limites d'Atterberg, Proctor modifié, CBR", "CBR à 95 % OPM ≥ 30 ; IP ≤ 25 ; Dmax ≤ 50 mm (selon CCTP)", "1 série / 2 000 m³ et à chaque changement de faciès", "PA", "CCTP / guide AGEROUTE"),
    ("Route en terre", "Scarification & reprofilage", "Profil en travers (bombement)", "Pente transversale 4 % ± 1 %", "Tous les 50 m", "AC", "CCTP"),
    ("Route en terre", "Rechargement latéritique", "Épaisseur mise en œuvre", "≥ épaisseur prévue − 2 cm", "Tous les 100 m", "AC", "CCTP"),
    ("Route en terre", "Arrosage & compactage", "Teneur en eau de mise en œuvre", "w = wOPM ± 2 %", "Chaque planche", "AC", "CCTP"),
    ("Route en terre", "Arrosage & compactage", "Densité en place (gammadensimètre ou densitomètre à sable)", "≥ 95 % OPM", "1 mesure / 250 m de couche", "PA", "CCTP"),
    ("Route en terre", "Fossés & exutoires", "Pente longitudinale et débouché", "Pente ≥ 0,5 % ; exutoire dégagé", "Chaque tronçon", "AC", "CCTP"),
    ("Route en terre", "Réception de tronçon", "Uni / flaches, profil, assainissement", "Pas de flache > 2 cm sous règle de 3 m", "Chaque km", "PC", "CCTP"),
    ("Points critiques", "Purge", "Fond de purge", "Matériaux impropres évacués, fond sain et portant", "Chaque point", "PA", "CCTP"),
    ("Points critiques", "Remblai latéritique", "Compactage par couches", "Couches ≤ 20 cm ; ≥ 95 % OPM", "Chaque couche", "PA", "CCTP"),
    ("Ouvrages hydrauliques – buses", "Réception des buses", "État, classe, dimensions", "Sans fissure ni épaufrure ; classe conforme à la commande", "Chaque livraison", "AC", "CCTP / fiche fabricant"),
    ("Ouvrages hydrauliques – buses", "Fouille & lit de pose", "Cote fil d'eau, pente, lit de pose", "Pente 1 à 3 % ; lit de pose conforme au plan", "Chaque ligne", "PA", "Plans d'exécution"),
    ("Ouvrages hydrauliques – buses", "Pose & jointoiement", "Alignement, emboîtement, joints", "Joints au mortier pleins ; alignement ± 2 cm", "Chaque ligne", "PC", "CCTP"),
    ("Ouvrages hydrauliques – buses", "Remblai sur buses", "Compactage latéral symétrique et couverture", "Couverture ≥ 0,60 m (ou selon plan) avant passage d'engins lourds", "Chaque ligne", "PA", "CCTP"),
    ("Ouvrages hydrauliques – buses", "Têtes de buses", "Ferraillage, coffrage, béton", "Conforme aux plans BA ; enrobage ≥ 3 cm", "Chaque tête", "PA", "EC2 / BAEL"),
    ("Dalots", "Implantation", "Axe, biais, cotes fil d'eau", "± 2 cm en plan ; ± 1 cm en altimétrie", "Chaque ouvrage", "PA", "Plans d'exécution"),
    ("Dalots", "Fond de fouille", "Nature et portance du sol", "Sol sain conforme aux hypothèses de la note de calcul", "Chaque ouvrage", "PA", "Note de calcul"),
    ("Dalots", "Ferraillage (radier, piédroits, dalle)", "Diamètres, espacements, recouvrements, enrobages", "Conforme aux plans BA ; enrobage ≥ 3 cm (milieu humide)", "Avant chaque coulage", "PA", "EC2 / BAEL"),
    ("Dalots", "Coffrage", "Stabilité, étanchéité, cotes", "± 1 cm", "Avant chaque coulage", "PA", "CCTP"),
    ("Dalots", "Béton frais", "Affaissement au cône d'Abrams", "6 à 10 cm (selon formulation)", "Chaque gâchée / toupie", "AC", "NF EN 12350-2"),
    ("Dalots", "Béton durci", "Écrasement d'éprouvettes 16×32", "fc28 ≥ fc28 exigé (25 MPa)", "3 éprouvettes à 7 j et 28 j par coulage", "PC", "EC2 / BAEL"),
    ("Dalots", "Cure du béton", "Cure humide, protection solaire", "≥ 7 jours", "Chaque coulage", "AC", "EC2"),
    ("Dalots", "Remblais techniques", "Compactage symétrique par couches", "Couches ≤ 20 cm ; ≥ 95 % OPM", "Chaque couche", "PA", "CCTP"),
    ("Bâtiment TCE", "Fondations", "Fond de fouille et ferraillage des semelles", "Conforme aux plans", "Chaque semelle", "PA", "EC2 / BAEL"),
    ("Bâtiment TCE", "Béton", "Affaissement et éprouvettes", "Idem dalots", "Chaque coulage", "PC", "EC2 / BAEL"),
    ("Bâtiment TCE", "Maçonnerie", "Aplomb, alignement, joints", "Aplomb ≤ 1 cm / 2,5 m", "Chaque niveau", "AC", "DTU 20.1"),
    ("Bâtiment TCE", "Étanchéité", "Essai de mise en eau", "48 h sans fuite", "Chaque terrasse", "PA", "DTU 43.1"),
    ("Bâtiment TCE", "Plomberie", "Essai de pression des réseaux", "Sans chute de pression (valeur et durée selon CCTP)", "Avant fermeture des saignées", "PA", "CCTP"),
    ("Bâtiment TCE", "Électricité", "Continuité de terre, isolement", "Résistance de terre et isolement selon CCTP / NF C 15-100", "Avant mise sous tension", "PA", "NF C 15-100"),
    ("Bâtiment TCE", "Réception TCE", "Visite de réception par corps d'état", "Levée de toutes les réserves", "Fin de chaque lot", "PC", "Marché"),
    ("Clôture", "Fondation", "Fouille et semelle filante", "Profondeur et largeur conformes aux plans", "Chaque tronçon", "AC", "Plans"),
    ("Clôture", "Poteaux BA", "Aplomb, entraxe", "± 1 cm ; entraxe conforme", "Chaque tronçon", "AC", "Plans"),
    ("Clôture", "Élévation", "Alignement, hauteur", "± 2 cm", "Chaque tronçon", "AC", "Plans"),
    ("Charpente métallique", "Approvisionnement", "Certificats matière (nuance S235 / S275)", "Conformes à la commande", "Chaque lot de profilés", "PA", "EC3 / NF EN 10025"),
    ("Charpente métallique", "Fabrication", "Soudures (visuel, ressuage si demandé)", "Sans défaut ; cordons conformes aux plans d'atelier", "Chaque élément", "PC", "EC3 / NF EN 1090"),
    ("Charpente métallique", "Anticorrosion", "Épaisseur de peinture", "≥ épaisseur prescrite (nombre de couches)", "Chaque élément", "AC", "CCTP"),
    ("Charpente métallique", "Ancrages", "Position des tiges et platines", "± 5 mm ; calage conforme", "Avant montage", "PA", "Plans"),
    ("Charpente métallique", "Montage", "Verticalité des poteaux, alignement", "≤ H/300 (selon CCTP)", "Chaque file", "PC", "EC3 / NF EN 1090"),
    ("Charpente métallique", "Boulonnage", "Serrage contrôlé", "Couple conforme aux plans", "100 % des assemblages", "PA", "EC3"),
]
pc_data = [dict(comp=a, oper=b, ctl=c, crit=d, freq=e, typ=f, ref=g) for a, b, c, d, e, f, g in PLAN]
let, f1, l1 = table(pc_, 6, [
    dict(key="comp", h="Composante", w=22, dv="L_Compos"),
    dict(key="oper", h="Phase / opération", w=26, name="PCT_Oper"),
    dict(key="ctl", h="Contrôle / essai", w=38),
    dict(key="crit", h="Critère d'acceptation", w=44),
    dict(key="freq", h="Fréquence", w=26),
    dict(key="typ", h="Type", w=6, centre=True),
    dict(key="ref", h="Référence", w=18),
], pc_data, 80)
cf_statut(pc_, f"F{f1}:F{l1}", rouge=["PA"], orange=["PC"], gris=["AC"])

# --------------------------------------------- 12 CONTRÔLE QUALITÉ (registre)
cq = wb.create_sheet("12_Controle_qualite")
entete(cq, "12 · REGISTRE DES CONTRÔLES, ESSAIS & POINTS D'ARRÊT (réalisation et contrôle)", 19,
       "Une ligne par contrôle. Résultat automatique si une valeur mesurée est saisie (comparée aux bornes mini / maxi), "
       "sinon appréciation visuelle. Une non-conformité reste « ouverte » tant que la date de levée n'est pas saisie.")
CQ = [
    ("CQ-001", D(2026, 8, 14), COMPOS[1], "Emprunt E1 – PK 5+500", "Emprunt de latérite", "Essai laboratoire", "Laboratoire", "CBR à 95 % OPM ≥ 30", 30, None, 42, "CBR", None, "Emprunt agréé", "", None, "Rapport LG-0814"),
    ("CQ-002", D(2026, 9, 2), COMPOS[4], "Dalot D1 – PK 3+200", "Ferraillage (radier, piédroits, dalle)", "Point d'arrêt (PA)", "Mission de contrôle", "Conforme aux plans BA, enrobage ≥ 3 cm", None, None, None, "", "Conforme", "PA levé – coulage autorisé", "", None, "PV PA-012"),
    ("CQ-003", D(2026, 9, 3), COMPOS[4], "Dalot D1 – radier", "Béton frais", "Autocontrôle", "Entreprise (autocontrôle)", "Affaissement 6 à 10 cm", 6, 10, 8, "cm", None, "", "", None, ""),
    ("CQ-004", D(2026, 10, 1), COMPOS[4], "Dalot D1 – radier", "Béton durci", "Essai laboratoire", "Laboratoire", "fc28 ≥ 25 MPa", 25, None, 27.8, "MPa", None, "", "", None, "Rapport LG-1001"),
    ("CQ-005", D(2026, 9, 28), COMPOS[1], "T05 – PK 4+000 à 5+000", "Arrosage & compactage", "Essai laboratoire", "Laboratoire", "Densité ≥ 95 % OPM", 95, None, 97.1, "% OPM", None, "", "", None, "Rapport LG-0928"),
    ("CQ-006", D(2026, 10, 8), COMPOS[1], "T07 – PK 6+000 à 7+000", "Rechargement latéritique", "Autocontrôle", "Entreprise (autocontrôle)", "Épaisseur ≥ 0,18 m", 0.18, None, 0.19, "m", None, "", "", None, ""),
    ("CQ-007", D(2026, 10, 14), COMPOS[1], "T08 – PK 7+000 à 8+000", "Arrosage & compactage", "Point d'arrêt (PA)", "Mission de contrôle", "Densité ≥ 95 % OPM", 95, None, 93.5, "% OPM", None, "Reprise : scarification, aération, recompactage", AUTEUR, None, "Fiche NC-003"),
    ("CQ-008", D(2026, 10, 5), COMPOS[3], "PC3 – PK 6+100 – buses Ø800", "Pose & jointoiement", "Point critique (PC)", "Mission de contrôle", "Pente 1 à 3 %", 1, 3, 1.8, "%", None, "", "", None, ""),
    ("CQ-009", D(2026, 10, 12), COMPOS[3], "PC2 – PK 4+800 – buses Ø1000", "Remblai sur buses", "Point d'arrêt (PA)", "Mission de contrôle", "Couverture ≥ 0,60 m", 0.6, None, 0.55, "m", None, "Rechargement complémentaire 10 cm", AUTEUR, D(2026, 10, 15), "Fiche NC-002"),
    ("CQ-010", D(2026, 10, 9), COMPOS[5], "Bâtiment – semelles axes A à D", "Fondations", "Point d'arrêt (PA)", "Mission de contrôle", "Ferraillage conforme aux plans", None, None, None, "", "Conforme", "PA levé", "", None, "PV PA-018"),
    ("CQ-011", D(2026, 10, 13), COMPOS[7], "Lot profilés HEA 200", "Approvisionnement", "Point d'arrêt (PA)", "Mission de contrôle", "Certificats matière S275", None, None, None, "", "Réserve", "Fournir les certificats manquants (2 barres)", "ADOU Franck", None, ""),
    ("CQ-012", D(2026, 10, 15), COMPOS[6], "Clôture – tronçon A", "Poteaux BA", "Autocontrôle", "Entreprise (autocontrôle)", "Écart d'aplomb ≤ 1 cm", None, 1, 0.5, "cm", None, "", "", None, ""),
    ("CQ-013", D(2026, 10, 16), COMPOS[4], "Dalot D2 – PK 9+750 – piédroits", "Ferraillage (radier, piédroits, dalle)", "Point d'arrêt (PA)", "Mission de contrôle", "Conforme aux plans BA, enrobage ≥ 3 cm", None, None, None, "", None, "Visite MDC demandée le 16/10", "", None, ""),
]
cq_data = [dict(num=a, date=b, comp=c, loc=d, oper=e, typ=f, interv=g, crit=h, vmin=i, vmax=j, vmes=k, u=l, verd=m,
                act=n, resp=o, dlev=p, ref=q) for a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q in CQ]
let, f1, l1 = table(cq, 6, [
    dict(key="num", h="N°", w=8, centre=True, name="CQ_Num"),
    dict(key="date", h="Date", w=11, fmt="date"),
    dict(key="comp", h="Composante", w=20, dv="L_Compos", name="CQ_Comp"),
    dict(key="loc", h="Ouvrage / PK / localisation", w=26),
    dict(key="oper", h="Opération contrôlée", w=24, dv="PCT_Oper", libre=True),
    dict(key="typ", h="Type de contrôle", w=16, dv="L_TypeCtrl", name="CQ_Type"),
    dict(key="interv", h="Intervenant", w=18, dv="L_Interv", name="CQ_Interv"),
    dict(key="crit", h="Critère d'acceptation", w=24),
    dict(key="vmin", h="Valeur mini", w=7, fmt="dec2", centre=True),
    dict(key="vmax", h="Valeur maxi", w=7, fmt="dec2", centre=True),
    dict(key="vmes", h="Valeur mesurée", w=8, fmt="dec2", centre=True),
    dict(key="u", h="Unité", w=7, centre=True),
    dict(key="verd", h="Appréciation visuelle", w=11, dv="L_Verdict", centre=True),
    dict(key="res", h="Résultat", w=12, centre=True, name="CQ_Res",
         f='=IF({num}{r}="","",IF(ISNUMBER({vmes}{r}),IF(AND(OR({vmin}{r}="",{vmes}{r}>={vmin}{r}),'
           'OR({vmax}{r}="",{vmes}{r}<={vmax}{r})),"Conforme","Non conforme"),IF({verd}{r}="","En attente",{verd}{r})))'),
    dict(key="act", h="Décision / action corrective", w=28),
    dict(key="resp", h="Responsable", w=15),
    dict(key="dlev", h="Date de levée", w=11, fmt="date"),
    dict(key="etat", h="État", w=14, centre=True, name="CQ_Etat",
         f='=IF({num}{r}="","",IF({res}{r}="Non conforme",IF({dlev}{r}="","NC ouverte","NC levée"),'
           'IF({res}{r}="Réserve",IF({dlev}{r}="","Réserve ouverte","Réserve levée"),IF({res}{r}="En attente","À contrôler","Clos"))))'),
    dict(key="ref", h="Réf. PV / rapport", w=14),
], cq_data, 500)
cf_statut(cq, f"N{f1}:N{l1}", rouge=["Non conforme"], orange=["Réserve"], vert=["Conforme"], gris=["En attente"])
cf_statut(cq, f"R{f1}:R{l1}", rouge=["NC ouverte"], orange=["Réserve ouverte", "À contrôler"], vert=["Clos", "NC levée", "Réserve levée"])


# ============================================================ 19 ENGINS
ENG = [
    ("NIV-01", "Niveleuse 140 (reprofilage)", "Niveleuse", "Location", FOURN[7], 45_000, 18, "En service"),
    ("CMP-01", "Compacteur vibrant V5 – 12 t", "Compacteur", "Location", FOURN[7], 30_000, 12, "En panne"),
    ("CMP-02", "Compacteur vibrant de remplacement", "Compacteur", "Location", FOURN[7], 32_000, 12, "En service"),
    ("CHG-01", "Chargeuse sur pneus (emprunt)", "Chargeuse", "Location", FOURN[7], 40_000, 16, "En service"),
    ("CAM-01", "Camion benne 20 m³", "Camion benne", "Propre", "", 15_000, 14, "En service"),
    ("CAM-02", "Camion benne 20 m³", "Camion benne", "Propre", "", 15_000, 14, "En service"),
    ("CIT-01", "Camion citerne à eau 10 000 l", "Citerne", "Location", FOURN[7], 20_000, 10, "En service"),
    ("BET-01", "Bétonnière 350 l (ouvrages)", "Bétonnière", "Propre", "", 3_000, 1.5, "En service"),
    ("GRU-01", "Camion-grue (montage charpente)", "Grue", "Location", FOURN[7], 55_000, 12, "Non mobilisé"),
]
en = wb.create_sheet("19_Engins")
entete(en, "19 · PARC MATÉRIEL & ENGINS (disponibilité, gasoil, coûts)", 17,
       "Un engin par ligne. Heures, pannes et gasoil sont totalisés depuis 19b_Engins_journal. Le coût estimé "
       "(heures × coût horaire) sert à l'analyse : les locations réellement facturées sont suivies dans 05_Factures.")
en_data = [dict(code=a, des=b, typ=c, prop=d, four=e, taux=f, conso=g, etat=h) for a, b, c, d, e, f, g, h in ENG]
let, f1, l1 = table(en, 6, [
    dict(key="code", h="Code engin", w=9, centre=True, name="EN_Code"),
    dict(key="des", h="Désignation", w=30, name="EN_Des"),
    dict(key="typ", h="Type", w=13),
    dict(key="prop", h="Propriété", w=10, dv="L_Propriete", centre=True),
    dict(key="four", h="Loueur", w=16, dv="L_Fourn", libre=True),
    dict(key="taux", h="Coût horaire (FCFA/h)", w=11, fmt="fcfa"),
    dict(key="conso", h="Conso théorique (l/h)", w=9, fmt="dec", centre=True),
    dict(key="etat", h="État actuel", w=12, dv="L_EtatEng", centre=True, name="EN_Etat"),
    dict(key="hm", h="Heures de marche", w=9, fmt="dec", name="EN_HM",
         f='=IF({code}{r}="","",SUMIFS(EJ_HM,EJ_Code,{code}{r}))'),
    dict(key="hp", h="Heures de panne", w=9, fmt="dec", name="EN_HP",
         f='=IF({code}{r}="","",SUMIFS(EJ_HP,EJ_Code,{code}{r}))'),
    dict(key="hi", h="Heures arrêt intempérie", w=9, fmt="dec",
         f='=IF({code}{r}="","",SUMIFS(EJ_HI,EJ_Code,{code}{r}))'),
    dict(key="gas", h="Gasoil consommé (l)", w=10, fmt="int",
         f='=IF({code}{r}="","",SUMIFS(EJ_Gas,EJ_Code,{code}{r}))'),
    dict(key="cm", h="Conso réelle (l/h)", w=9, fmt="dec", centre=True,
         f='=IF(OR({code}{r}="",N({hm}{r})=0),"",{gas}{r}/{hm}{r})'),
    dict(key="ec", h="Écart conso", w=8, fmt="pct", centre=True,
         f='=IF(OR({cm}{r}="",N({conso}{r})=0),"",{cm}{r}/{conso}{r}-1)'),
    dict(key="dispo", h="Taux de disponibilité", w=10, fmt="pct", centre=True, name="EN_Dispo",
         f='=IF(OR({code}{r}="",N({hm}{r})+N({hp}{r})=0),"",{hm}{r}/({hm}{r}+{hp}{r}))'),
    dict(key="cout", h="Coût estimé (FCFA)", w=13, fmt="fcfa", name="EN_Cout",
         f='=IF({code}{r}="","",N({hm}{r})*N({taux}{r}))'),
    dict(key="al", h="Alerte", w=16, centre=True, name="EN_Alerte",
         f='=IF({code}{r}="","",IF({etat}{r}="En panne","En panne",IF(AND({ec}{r}<>"",N({ec}{r})>P_TolConso),"Surconsommation",'
           'IF(AND({dispo}{r}<>"",N({dispo}{r})<P_DispoMin),"Disponibilité faible","OK"))))'),
], en_data, 50)
cf_statut(en, f"{let['al']}{f1}:{let['al']}{l1}", rouge=["En panne"], orange=["Surconsommation", "Disponibilité faible"], vert=["OK"])
cf_statut(en, f"{let['etat']}{f1}:{let['etat']}{l1}", rouge=["En panne", "En réparation"], vert=["En service"], gris=["Non mobilisé", "Restitué"])

ej = wb.create_sheet("19b_Engins_journal")
entete(ej, "19b · RAPPORT JOURNALIER DES ENGINS", 17,
       "Une ligne par engin et par jour : relevé des compteurs horaires, heures de panne et d'arrêt (pluie), gasoil "
       "servi, conducteur et production. Le rendement (production / heure) permet de comparer engins et équipes.")
ej_data = []
cpt = {"NIV-01": 2150, "CMP-01": 3420, "CMP-02": 5100, "CHG-01": 4310, "CAM-01": 8800, "CAM-02": 9120, "CIT-01": 6200}
COND = {"NIV-01": "M004", "CMP-01": "M005", "CMP-02": "M005", "CHG-01": "M004", "CAM-01": "M006", "CAM-02": "M006", "CIT-01": "M007"}
PROD = {"NIV-01": (900, "m de plateforme"), "CMP-01": (850, "m compactés"), "CMP-02": (850, "m compactés"),
        "CHG-01": (420, "m³ chargés"), "CAM-01": (200, "m³ transportés"), "CAM-02": (200, "m³ transportés"),
        "CIT-01": (60, "m³ d'eau")}
CONSO = {e[0]: e[6] for e in ENG}
for jour in (D(2026, 10, 12), D(2026, 10, 13), D(2026, 10, 14), D(2026, 10, 15), D(2026, 10, 16)):
    for code in ("NIV-01", "CMP-01", "CMP-02", "CHG-01", "CAM-01", "CAM-02", "CIT-01"):
        if code == "CMP-02" and jour.day < 16:
            continue
        hm, hp, hi, obs = 8, 0, 0, ""
        if jour.day == 13:
            hm, hi, obs = 4, 4, "Arrêt pluie"
        if code == "CMP-01" and jour.day == 16:
            hm, hp, obs = 2, 6, "Panne flexible hydraulique (INC-04)"
        if code == "CMP-02" and jour.day == 16:
            hm, obs = 5, "Remplacement de CMP-01 à partir de 11 h"
        fact = 1.30 if code == "CAM-02" else 1.0
        d0 = cpt[code]
        cpt[code] = d0 + hm
        q, u = PROD[code]
        ej_data.append(dict(date=jour, code=code, lot=LOTS[1], loc="T08 – PK 7+000 à 8+000", cd=d0, cf=d0 + hm,
                            hp=hp or None, hi=hi or None, gas=round(hm * CONSO[code] * fact), cond=COND[code],
                            prod=round(q * hm / 8), u=u, obs=obs))
let, f1, l1 = table(ej, 6, [
    dict(key="date", h="Date", w=11, fmt="date", name="EJ_Date"),
    dict(key="code", h="Code engin", w=9, dv="EN_Code", centre=True, name="EJ_Code"),
    dict(key="des", h="Désignation", w=26,
         f='=IF({code}{r}="","",IFERROR(INDEX(EN_Des,MATCH({code}{r},EN_Code,0)),"Code inconnu"))'),
    dict(key="lot", h="Lot", w=20, dv="L_Lots"),
    dict(key="loc", h="Tronçon / PK / ouvrage", w=20),
    dict(key="cd", h="Compteur début (h)", w=9, fmt="dec"),
    dict(key="cf", h="Compteur fin (h)", w=9, fmt="dec"),
    dict(key="hm", h="Heures de marche", w=8, fmt="dec", name="EJ_HM",
         f='=IF(OR({cd}{r}="",{cf}{r}=""),"",{cf}{r}-{cd}{r})'),
    dict(key="hp", h="Heures de panne", w=8, fmt="dec", name="EJ_HP"),
    dict(key="hi", h="Heures arrêt intempérie", w=8, fmt="dec", name="EJ_HI"),
    dict(key="gas", h="Gasoil servi (l)", w=8, fmt="int", name="EJ_Gas"),
    dict(key="lh", h="Conso (l/h)", w=7, fmt="dec", centre=True,
         f='=IF(OR({gas}{r}="",N({hm}{r})=0),"",{gas}{r}/{hm}{r})'),
    dict(key="cond", h="Conducteur (matricule)", w=10, dv="PE_Mat", centre=True),
    dict(key="prod", h="Production", w=9, fmt="int"),
    dict(key="u", h="Unité production", w=14),
    dict(key="rend", h="Rendement (/h)", w=9, fmt="dec",
         f='=IF(OR({prod}{r}="",N({hm}{r})=0),"",{prod}{r}/{hm}{r})'),
    dict(key="obs", h="Observations (pannes, entretien)", w=28),
], ej_data, 1500)
ej.conditional_formatting.add(f"{let['cf']}{f1}:{let['cf']}{l1}", FormulaRule(
    formula=[f'AND({let["cf"]}{f1}<>"",{let["cf"]}{f1}<{let["cd"]}{f1})'], fill=fill("EF9A9A")))
ej.conditional_formatting.add(f"{let['hp']}{f1}:{let['hp']}{l1}", CellIsRule(
    operator="greaterThan", formula=["0"], font=Font(name=FONT, bold=True, color=ROUGE)))

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
mput(f"B{r0}:M{r0}", "LES 11 QUESTIONS DU PILOTAGE DE CHANTIER", font(True, "FFFFFF", 11), VERT, al=LEFT)
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
QS.append(("Les travaux sont-ils conformes (contrôles & essais) ?",
           '=IFERROR(COUNTIF(CQ_Res,"Conforme")/(COUNTIF(CQ_Res,"Conforme")+COUNTIF(CQ_Res,"Non conforme")),1)', "pct",
           '=COUNTIF(CQ_Num,"?*")&" contrôle(s) · "&COUNTIF(CQ_Etat,"NC ouverte")&" NC ouverte(s) · "&COUNTIF(CQ_Etat,"Réserve ouverte")&" réserve(s) · "&COUNTIF(CQ_Etat,"À contrôler")&" PA/contrôle(s) en attente · "&COUNTIF(RT_Conf,"Non conforme")&" tronçon(s) route NC"',
           '=IF(COUNTIF(CQ_Etat,"NC ouverte")>0,"ALERTE",IF(COUNTIF(CQ_Etat,"Réserve ouverte")+COUNTIF(CQ_Etat,"À contrôler")>0,"ATTENTION","OK"))'))
QS.append(("Nos engins sont-ils disponibles et productifs ?",
           '=IFERROR(SUM(EN_HM)/(SUM(EN_HM)+SUM(EN_HP)),1)', "pct",
           '=COUNTIF(EN_Etat,"En panne")&" engin(s) en panne · "&SUM(EN_HP)&" h de panne · "&COUNTIF(EN_Alerte,"Surconsommation")&" surconsommation(s) gasoil · coût estimé "&FIXED(SUM(EN_Cout),0)&" FCFA"',
           '=IF(COUNTIF(EN_Etat,"En panne")>0,"ALERTE",IF(COUNTIF(EN_Alerte,"Surconsommation")+COUNTIF(EN_Alerte,"Disponibilité faible")>0,"ATTENTION","OK"))'))
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

# Avancement par composante (suivis spécialisés)
rc = rq2 + 2
mput(f"B{rc}:M{rc}", "AVANCEMENT PHYSIQUE PAR COMPOSANTE (onglets 13 à 18 et 12)", font(True, "FFFFFF", 11), VERT, al=LEFT)
for rng, hd in ((f"B{rc + 1}:E{rc + 1}", "Composante"), (f"F{rc + 1}", "Unité"), (f"G{rc + 1}:H{rc + 1}", "Prévu"),
                (f"I{rc + 1}:J{rc + 1}", "Réalisé"), (f"K{rc + 1}", "Avancement"), (f"L{rc + 1}:M{rc + 1}", "Statut")):
    mput(rng, hd, font(True, "FFFFFF", 9), VERT2)
COMP_ROWS = [
    ("Route en terre – reprofilage lourd (13)", "km", "=SUM(RT_Long)", "=SUMPRODUCT(RT_Long,RT_Av)", "=RT_Glob", "dec2"),
    ("Route – rechargement latéritique (13)", "m³", "=SUM(RT_VolPrev)", "=SUM(RT_VolMO)", None, "int"),
    ("Points critiques traités (14)", "u", '=COUNTIF(PC_Num,"?*")', '=COUNTIF(PC_Stat,"Terminé")', "=PC_Glob", "int"),
    ("Buses Ø800 posées (14)", "ml", '=SUMIFS(PC_MlPrev,PC_Diam,"Ø800")', '=SUMIFS(PC_MlPose,PC_Diam,"Ø800")', None, "dec"),
    ("Buses Ø1000 posées (14)", "ml", '=SUMIFS(PC_MlPrev,PC_Diam,"Ø1000")', '=SUMIFS(PC_MlPose,PC_Diam,"Ø1000")', None, "dec"),
    ("Dalots achevés (15)", "u", '=COUNTIF(DA_Num,"?*")', '=COUNTIF(DA_Stat,"Terminé")', "=DA_Glob", "int"),
    ("Bâtiment tous corps d'état (16)", "FCFA", "=SUM(BT_Pond)", "=SUMPRODUCT(BT_Pond,BT_Av)", "=BT_Glob", "fcfa"),
    ("Clôture (17)", "ml", "=SUM(CL_Pond)", "=SUM(CL_Ml)", "=CL_Glob", "dec"),
    ("Charpente métallique (18)", "kg", "=SUM(CM_Pond)", "=SUM(CM_Kg)", "=CM_Glob", "int"),
    ("Contrôles conformes / réalisés (12)", "u",
     '=COUNTIF(CQ_Res,"Conforme")+COUNTIF(CQ_Res,"Non conforme")', '=COUNTIF(CQ_Res,"Conforme")', None, "int"),
]
for i, (lib, u, prev, real, pct, fmt) in enumerate(COMP_ROWS):
    r = rc + 2 + i
    mput(f"B{r}:E{r}", lib, font(True), al=LEFT)
    mput(f"F{r}", u, font(False, GRIS_TXT, 9))
    mput(f"G{r}:H{r}", prev, fmt=fmt)
    mput(f"I{r}:J{r}", real, fmt=fmt)
    mput(f"K{r}", pct or f"=IF(N(G{r})=0,0,I{r}/G{r})", font(True, VERT), fmt="pct")
    mput(f"L{r}:M{r}", f'=IF(K{r}>=1,"Terminé",IF(K{r}>0,"En cours","Non démarré"))', font(True))
rc1, rc2 = rc + 2, rc + 1 + len(COMP_ROWS)
tb.conditional_formatting.add(f"K{rc1}:K{rc2}", DataBarRule(start_type="num", start_value=0, end_type="num",
                                                            end_value=1, color="43A047"))
cf_statut(tb, f"L{rc1}:L{rc2}", orange=["En cours"], vert=["Terminé"], gris=["Non démarré"])

# Synthèse par lot
r1 = rc2 + 2
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
        ("Réalisation & contrôle : route en terre · points critiques & buses · dalots · bâtiment TCE · clôture · charpente métallique",
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
    ("02_Tableau_de_bord", "Les 10 questions du pilotage, avancement par composante, synthèse par lot, alertes, graphiques", "Lecture seule"),
    ("01_Planning", "Planning Gantt sur 40 semaines, % prévu / réalisé, tâches en retard", "Hebdomadaire"),
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
    ("12_Controle_qualite", "Registre des contrôles, essais et points d'arrêt (entreprise et mission de contrôle)", "À chaque contrôle"),
    ("13_Route", "Route en terre : reprofilage lourd, rechargement, compactage par tronçon (PK)", "Quotidienne"),
    ("14_Points_critiques", "Points critiques : purges, remblais, buses Ø800 / Ø1000, têtes de buses", "Quotidienne"),
    ("15_Dalots", "Dalots : phases (radier, piédroits, dalle, murs), béton fc7 / fc28", "Quotidienne"),
    ("16_Batiment_TCE", "Bâtiment tous corps d'état : montants, dates, % réalisé, réserves", "Hebdomadaire"),
    ("17_Cloture", "Clôture : avancement par tronçon et ml achevés", "Hebdomadaire"),
    ("18_Charpente_metal", "Charpente métallique : avancement par repère, pondéré au poids (kg)", "Hebdomadaire"),
    ("Plan_controle", "Référentiel des points d'arrêt, contrôles et essais par composante", "Au démarrage"),
    ("19_Engins", "Parc matériel : heures, pannes, disponibilité, gasoil, coût, alertes", "Lecture (calculé)"),
    ("19b_Engins_journal", "Rapport journalier engins : compteurs, pannes, intempéries, gasoil, production", "Quotidienne"),
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
    "4. Chaque jour : 06_Pointage, 07_Affectation, 09b_Livraisons, 10_Journal, 19b_Engins_journal, suivis 13 à 18 et registre 12_Controle_qualite.",
    "5. À chaque achat : 08_Commandes puis 05_Factures ; chaque semaine : mettre à jour le % réalisé du planning.",
    "6. Consulter 02_Tableau_de_bord : les signaux ALERTE / ATTENTION indiquent où agir en priorité.",
    "Les lignes pré-remplies sont un EXEMPLE (route en terre de 20 km + ouvrages + bâtiment) : effacez uniquement les cellules de saisie pour démarrer. Onglets 13 à 18 inutiles pour un chantier ? Masquez-les (clic droit > Masquer).",
    "Mission de contrôle : utilisez surtout 01, 04, 10, 11, 12, 13 à 18 et Plan_controle ; choisissez votre rôle dans Paramètres.",
    "Phases sans objet dans les suivis 13 à 18 : saisir « n/a » (la phase est alors exclue du calcul d'avancement).",
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
        "Saisons des pluies (avril–juillet, octobre–novembre) : tracer les intempéries au journal pour justifier les prolongations.",
        "Routes en terre : rechargement latéritique CBR ≥ 30 à 95 % OPM, bombement 4 %, fossés et exutoires avant la saison des pluies.",
        "Buses Ø800 / Ø1000 : lit de pose réglé, pente 1 à 3 %, remblai latéral symétrique, couverture ≥ 0,60 m avant passage d'engins.",
        "Charpente métallique : calcul et contrôles selon EC3 (NF EN 1993) / NF EN 1090 ; protection anticorrosion renforcée (climat humide)."]):
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
         "10_Journal", "11_Incidents", "12_Controle_qualite", "13_Route", "14_Points_critiques", "15_Dalots",
         "16_Batiment_TCE", "17_Cloture", "18_Charpente_metal", "19_Engins", "19b_Engins_journal",
         "Plan_controle", "Personnel",
         "Checklist_lancement", "Lexique"]
assert sorted(ordre) == sorted(wb.sheetnames), set(wb.sheetnames) ^ set(ordre)
wb._sheets = [wb[n] for n in ordre]
for n in ordre:
    couleur = {"Accueil": VERT, "Paramètres": ORANGE, "02_Tableau_de_bord": ROUGE,
               "12_Controle_qualite": "6A1B9A", "Plan_controle": "6A1B9A"}.get(n, VERT2)
    if n[:2] in ("13", "14", "15", "16", "17", "18", "19"):
        couleur = "1565C0"
    wb[n].sheet_properties.tabColor = couleur
wb.active = 0
wb.properties.creator = AUTEUR
wb.properties.title = "Metrix Avancé Chantier BTP"
wb.properties.subject = "Pilotage de chantier BTP"
wb.save(SORTIE)
print("OK ->", SORTIE)
