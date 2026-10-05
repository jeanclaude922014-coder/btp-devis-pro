# -*- coding: utf-8 -*-
"""Bâtiment industriel 30 x 10 m - modèle unique (paramètres, prix, métré, aciers, sous-détails).
Les quantités sont écrites sous forme de formules « Excel » utilisant des noms (p_...),
évaluées ici en Python et recopiées telles quelles dans le classeur Excel.
Auteur : Moulo Jean Claude - Technicien génie civil BTP, Abidjan."""
import math, re

def ROUNDUP(x, n=0):
    f = 10 ** n
    return math.ceil(round(x * f, 9)) / f
NS_FUN = {'ROUNDUP': ROUNDUP, 'SQRT': math.sqrt, 'MAX': max, 'MIN': min}

# ------------------------------------------------------------------ PARAMÈTRES
# (nom, désignation, valeur ou formule, unité, commentaire, groupe)
PARAMS = [
    # géométrie
    ('p_L', 'Longueur du bâtiment entre axes', 30.0, 'm', 'Donnée du maître d\'ouvrage', 'Géométrie'),
    ('p_B', 'Largeur du bâtiment entre axes', 10.0, 'm', 'Donnée du maître d\'ouvrage', 'Géométrie'),
    ('p_ESP', 'Espacement des piliers', 5.0, 'm', 'Donnée du maître d\'ouvrage', 'Géométrie'),
    ('p_PENTE', 'Pente de la toiture (2 versants)', 0.20, '-', 'Donnée : 20 %', 'Géométrie'),
    ('p_H', 'Hauteur élévation (TN → dessus chaînage haut)', 6.0, 'm', 'Donnée : 6 m', 'Géométrie'),
    ('p_HFOND', 'Hauteur maçonnerie agglos en fondation', 1.0, 'm', 'Donnée : 1 m', 'Géométrie'),
    ('p_EP', 'Épaisseur des murs (agglos 15)', 0.15, 'm', 'Donnée', 'Géométrie'),
    ('p_PL', 'Largeur de l\'entrée', 6.0, 'm', 'Donnée : 6 m', 'Géométrie'),
    ('p_PH', 'Hauteur du portail', 4.5, 'm', 'Hypothèse', 'Géométrie'),
    ('p_NPIL', 'Nombre de piliers IPE 220', '=2*(p_L/p_ESP+1)+3', 'u', '7 par long pan + 1 pignon Ouest + 2 encadrement entrée', 'Géométrie'),
    ('p_APO', 'Poteaux BA de part et d\'autre des IPE : côté', 0.15, 'm', '2 poteaux 15x15 par pilier', 'Géométrie'),
    ('p_NPO', 'Nombre de poteaux BA par pilier', 2, 'u', 'Donnée : deux poteaux autour de chaque pilier', 'Géométrie'),
    ('p_BIPE', 'Largeur d\'aile IPE 220', 0.11, 'm', 'IPE 220 : h = 220 mm, b = 110 mm', 'Géométrie'),
    ('p_BPIL', 'Emprise d\'un pilier dans le mur (poteau + IPE + poteau)', '=p_NPO*p_APO+p_BIPE', 'm', '', 'Géométrie'),
    ('p_BCH', 'Chaînages : largeur', 0.15, 'm', '', 'Géométrie'),
    ('p_HCH', 'Chaînages : hauteur', 0.20, 'm', 'Chaînages bas, intermédiaire et haut 15x20', 'Géométrie'),
    ('p_ZCHI', 'Niveau du chaînage intermédiaire', 3.0, 'm', 'Hypothèse : mi-hauteur', 'Géométrie'),
    ('p_LINH', 'Hauteur du linteau d\'entrée', 0.40, 'm', 'Linteau 15x40', 'Géométrie'),
    # fondations
    ('p_FRH', 'Profondeur des fouilles (rigoles et puits)', 1.20, 'm', 'Donnée : 120 cm', 'Fondations'),
    ('p_PROP', 'Épaisseur béton de propreté', 0.05, 'm', '', 'Fondations'),
    ('p_SFB', 'Semelle filante : largeur', 0.60, 'm', 'Donnée : 60 cm', 'Fondations'),
    ('p_SFH', 'Semelle filante : hauteur', 0.15, 'm', 'Donnée : 15 cm', 'Fondations'),
    ('p_FRL', 'Largeur des fouilles en rigole', '=p_SFB+0.20', 'm', 'Semelle + 10 cm de chaque côté', 'Fondations'),
    ('p_SIA', 'Semelle isolée : côté', 0.80, 'm', 'Donnée : 80 x 80 cm', 'Fondations'),
    ('p_SIH', 'Semelle isolée : hauteur', 0.30, 'm', 'Hypothèse (≥ (A-a)/4 = 0,16 m)', 'Fondations'),
    ('p_FPA', 'Fouille en puits : côté', '=p_SIA+0.20', 'm', '10 cm de jeu de chaque côté', 'Fondations'),
    ('p_ESI', 'Semelle isolée : espacement des HA12', 0.15, 'm', '', 'Fondations'),
    ('p_AFUT', 'Fût BA sous platine : côté', 0.40, 'm', 'Fût 40x40 de -0,85 à ±0,00, 4 HA12', 'Fondations'),
    ('p_NTIG', 'Tiges d\'ancrage M20 par pilier', 4, 'u', 'L = 600 mm coudées, écrous + rondelles', 'Fondations'),
    ('p_FOIS', 'Coefficient de foisonnement des terres', 1.25, '-', '', 'Fondations'),
    # dallage
    ('p_EPDAL', 'Épaisseur du dallage', 0.20, 'm', 'Donnée : 20 cm', 'Dallage'),
    ('p_EDAL', 'Maille des armatures du dallage', 0.20, 'm', 'HA10 e = 20 cm dans les 2 sens', 'Dallage'),
    ('p_NNAP', 'Nombre de nappes', 1, 'u', 'Donnée : nappe simple HA10 (mettre 2 pour une double nappe)', 'Dallage'),
    ('p_RDAL', 'Majoration recouvrements dallage', 1.10, '-', '', 'Dallage'),
    ('p_NCHA', 'Chaises (distanciers) HA10 par m²', 1, 'u/m²', 'L = 0,80 m par chaise', 'Dallage'),
    ('p_EPLAT', 'Épaisseur de latérite (purge + rechargement)', 0.40, 'm', 'Mettre 0,20 si le sol a une bonne portance ; 0,40 sinon', 'Dallage'),
    ('p_COUCHE', 'Épaisseur d\'une couche compactée', 0.20, 'm', 'Compactage à 95 % OPM', 'Dallage'),
    # charpente métallique
    ('p_KGIPE', 'Poids IPE 220', 26.2, 'kg/m', 'Catalogue profilés', 'Structure métallique'),
    ('p_KGPLA', 'Platines (pied 320x220x15 + tête) et raidisseurs par pilier', 15, 'kg/u', 'Estimation', 'Structure métallique'),
    ('p_KGCOR', 'Poids cornière 50x50x5', 3.77, 'kg/m', 'Catalogue profilés', 'Structure métallique'),
    ('p_NPAL', 'Palées verticales (croix de St-André) en long pan', 4, 'u', '2 par long pan, travées d\'extrémité', 'Structure métallique'),
    ('p_NPV', 'Travées de poutre au vent en toiture', 2, 'u', 'Travées d\'extrémité, 2 versants', 'Structure métallique'),
    ('p_GOUS', 'Majoration goussets et boulonnerie', 1.10, '-', '10 %', 'Structure métallique'),
    # aciers
    ('p_KG6', 'Poids HA6', 0.222, 'kg/m', '', 'Aciers'),
    ('p_KG10', 'Poids HA10', 0.617, 'kg/m', '', 'Aciers'),
    ('p_KG12', 'Poids HA12', 0.888, 'kg/m', '', 'Aciers'),
    ('p_CHUTES', 'Majoration pour chutes', 1.05, '-', '5 %', 'Aciers'),
    # options
    ('p_RCH', 'Ratio fermes / traverses de toiture', 8, 'kg/m²', 'Hors piliers IPE, pannes et contreventements - à confirmer par note de calcul', 'Options'),
    ('p_EPAN', 'Entraxe maximal des pannes', 1.20, 'm', 'Pour bac 5 ondes - vérifier la fiche du fabricant', 'Options'),
    ('p_KGZ', 'Poids panne Z 120 x 2 mm', 3.9, 'kg/m', 'Z 120 x 50 x 2 (développé ≈ 250 mm)', 'Options'),
    ('p_DEB', 'Débord de toiture', 0.50, 'm', '', 'Options'),
    # coefficients
    ('p_PO', 'Petit outillage (% de la main-d\'œuvre)', 0.03, '%', '', 'Coefficients'),
    ('p_FC', 'Frais de chantier', 0.05, '%', '', 'Coefficients'),
    ('p_FG', 'Frais généraux', 0.08, '%', '', 'Coefficients'),
    ('p_ALEA', 'Aléas', 0.02, '%', '', 'Coefficients'),
    ('p_BEN', 'Bénéfice', 0.10, '%', '', 'Coefficients'),
    ('p_TVA', 'TVA (Côte d\'Ivoire)', 0.18, '%', '', 'Coefficients'),
    ('p_K', 'Coefficient de vente K', '=(1+p_FC)/(1-(p_FG+p_ALEA+p_BEN))', '-', 'PV = DS x K', 'Coefficients'),
    # grandeurs calculées
    ('p_P', 'Périmètre à l\'axe des murs', '=2*(p_L+p_B)', 'm', '', 'Calculé'),
    ('p_FL', 'Flèche de toiture', '=p_B/2*p_PENTE', 'm', '', 'Calculé'),
    ('p_RAMP', 'Longueur d\'un rampant', '=SQRT(p_B/2*p_B/2+p_FL*p_FL)', 'm', '', 'Calculé'),
    ('p_LNET', 'Longueur nette de murs (hors piliers)', '=p_P-p_NPIL*p_BPIL', 'm', '', 'Calculé'),
    ('p_LCHI', 'Longueur nette hors piliers et entrée', '=p_LNET-p_PL', 'm', '', 'Calculé'),
    ('p_SINT', 'Surface intérieure (dallage)', '=(p_L-p_EP)*(p_B-p_EP)', 'm²', '', 'Calculé'),
    ('p_HENT', 'Hauteur dessus semelle → TN (fût)', '=p_FRH-p_PROP-p_SIH', 'm', '', 'Calculé'),
    ('p_HPO', 'Hauteur totale des poteaux BA', '=p_H+p_HENT', 'm', '', 'Calculé'),
    ('p_LIPE', 'Longueur totale d\'IPE 220', '=p_NPIL*p_H+p_FL', 'm', 'Platine à ±0,00, tête à +6,00 (+1,00 pilier de pignon)', 'Calculé'),
    ('p_NPAN', 'Nombre de lignes de pannes (2 versants)', '=2*(ROUNDUP(p_RAMP/p_EPAN,0)+1)', 'u', '', 'Calculé'),
    ('p_LCOR', 'Longueur totale de cornières', '=p_NPAL*2*SQRT(p_ESP*p_ESP+p_H*p_H)+p_NPV*2*2*SQRT(p_ESP*p_ESP+p_RAMP*p_RAMP)', 'm', '', 'Calculé'),
    ('p_HM', 'Hauteur nette d\'agglos en élévation', '=p_H-3*p_HCH', 'm', '', 'Calculé'),
    ('p_PIGN', 'Agglos net par pignon triangulaire', '=0.5*p_B*p_FL-2*p_RAMP*p_BCH-p_BPIL*0.5', 'm²', '', 'Calculé'),
    ('p_NCOU', 'Nombre de couches de latérite', '=p_EPLAT/p_COUCHE', 'u', '', 'Calculé'),
    ('p_VRIG', 'Volume fouilles en rigole', '=p_P*p_FRL*p_FRH', 'm³', '', 'Calculé'),
    ('p_VPUI', 'Volume fouilles en puits (complément)', '=p_NPIL*(p_FPA*p_FPA-p_FRL*p_FPA)*p_FRH', 'm³', '', 'Calculé'),
    ('p_VPROP', 'Volume béton de propreté', '=(p_P-p_NPIL*p_FPA)*p_FRL*p_PROP+p_NPIL*p_FPA*p_FPA*p_PROP', 'm³', '', 'Calculé'),
    ('p_VSI', 'Volume semelles isolées', '=p_NPIL*p_SIA*p_SIA*p_SIH', 'm³', '', 'Calculé'),
    ('p_VSF', 'Volume semelle filante', '=(p_P-p_NPIL*p_SIA)*p_SFB*p_SFH', 'm³', '', 'Calculé'),
    ('p_VENT', 'Volume des ouvrages enterrés', '=p_VPROP+p_VSI+p_VSF+p_LNET*p_HFOND*p_EP+p_NPIL*(p_AFUT*p_AFUT+p_NPO*p_APO*p_APO)*p_HENT', 'm³', '', 'Calculé'),
]

# ------------------------------------------------------------------ PRIX DE BASE
# (code, désignation, unité, prix FCFA, catégorie)
PRIX = [
    ('ciment', 'Ciment CPJ 42,5 (sac 50 kg)', 'sac', 5800, 'Matériaux'),
    ('sable', 'Sable lavé', 'm³', 12000, 'Matériaux'),
    ('gravier', 'Gravier concassé 5/15 - 15/25', 'm³', 25000, 'Matériaux'),
    ('eau', 'Eau', 'm³', 1000, 'Matériaux'),
    ('agglo', 'Agglo 15 plein 40x20x15 rendu chantier', 'u', 500, 'Matériaux'),
    ('agglo_cr', 'Agglo 15 creux 40x20x15 rendu chantier', 'u', 400, 'Matériaux'),
    ('ha6', 'Acier HA6 FeE500 (barre 12 m = 2,66 kg à 2 300)', 'kg', 865, 'Matériaux'),
    ('ha10', 'Acier HA10 FeE500 (barre 12 m = 7,40 kg à 6 000)', 'kg', 810, 'Matériaux'),
    ('ha12', 'Acier HA12 FeE500 (barre 12 m = 10,66 kg à 8 500)', 'kg', 800, 'Matériaux'),
    ('fil', 'Fil recuit', 'kg', 1500, 'Matériaux'),
    ('bois', 'Bois de coffrage (amorti 3 emplois)', 'm²', 1800, 'Matériaux'),
    ('pointes', 'Pointes', 'kg', 1500, 'Matériaux'),
    ('huile', 'Huile de décoffrage', 'L', 1000, 'Matériaux'),
    ('hydro', 'Hydrofuge de masse', 'L', 2000, 'Matériaux'),
    ('termite', 'Produit anti-termites (dilué)', 'm²', 1200, 'Matériaux'),
    ('laterite', 'Latérite d\'emprunt rendue chantier', 'm³', 6000, 'Matériaux'),
    ('polyane', 'Film polyane 150 µ', 'm²', 400, 'Matériaux'),
    ('joint', 'Fond de joint + mastic / joint périphérique', 'ml', 800, 'Matériaux'),
    ('ipe', 'Profilé IPE 220 (S235)', 'kg', 950, 'Matériaux'),
    ('corniere', 'Cornière 50x50x5 (S235)', 'kg', 900, 'Matériaux'),
    ('tole', 'Tôle pour platines et goussets ép. 15 mm', 'kg', 900, 'Matériaux'),
    ('tige', 'Tige d\'ancrage M20 L = 600 coudée + 2 écrous + rondelle', 'u', 6000, 'Matériaux'),
    ('grout', 'Mortier de calage sans retrait (sac 25 kg)', 'sac', 9000, 'Matériaux'),
    ('peint', 'Peinture antirouille + finition (2 couches)', 'kg', 100, 'Matériaux'),
    ('acier_ch', 'Profilés charpente de toiture + peinture', 'kg', 950, 'Matériaux'),
    ('bac', 'Tôle bac 5 ondes (alu 6/10 ou acier prélaqué) + fixations', 'm²', 4500, 'Matériaux'),
    ('zpanne', 'Panne Z 120 x 2 galvanisée + échantignoles + boulons', 'kg', 1000, 'Matériaux'),
    ('faitiere', 'Faîtière aluminium', 'ml', 3500, 'Matériaux'),
    ('ff_install', 'Magasin, clôture provisoire, panneau de chantier', 'ft', 300000, 'Matériaux'),
    ('ff_implant', 'Bois de chaises, cordeau, peinture', 'ft', 40000, 'Matériaux'),
    ('ff_essais', 'Essais labo (Proctor, densités in situ, écrasement béton)', 'ft', 250000, 'Matériaux'),
    ('ff_portail', 'Portail : tubes, tôle 15/10, rail, roulettes, peinture', 'ft', 1600000, 'Matériaux'),
    ('mo_macon', 'Maçon', 'h.j', 10000, 'Main-d\'œuvre'),
    ('mo_ferr', 'Ferrailleur', 'h.j', 10000, 'Main-d\'œuvre'),
    ('mo_coff', 'Coffreur', 'h.j', 10000, 'Main-d\'œuvre'),
    ('mo_soud', 'Soudeur / couvreur', 'h.j', 15000, 'Main-d\'œuvre'),
    ('mo_tech', 'Technicien', 'h.j', 15000, 'Main-d\'œuvre'),
    ('mo_man', 'Manœuvre', 'h.j', 5000, 'Main-d\'œuvre'),
    ('mt_bet', 'Bétonnière 350 L (location)', 'j', 25000, 'Matériel'),
    ('mt_vib', 'Vibreur (location)', 'j', 15000, 'Matériel'),
    ('mt_dame', 'Dame sauteuse (location)', 'j', 20000, 'Matériel'),
    ('mt_plaque', 'Compacteur à plaque vibrante / rouleau 1 t (location)', 'j', 60000, 'Matériel'),
    ('mt_cam', 'Camion benne 10 m³', 'voyage', 25000, 'Matériel'),
    ('mt_scie', 'Scie à sol (location)', 'j', 30000, 'Matériel'),
    ('mt_niveau', 'Niveau / théodolite (location)', 'j', 15000, 'Matériel'),
    ('mt_branch', 'Branchements provisoires eau et électricité', 'ft', 100000, 'Matériel'),
    ('mt_ch', 'Poste à souder, meuleuse, levage (charpente)', 'kg', 100, 'Matériel'),
    ('mt_echaf', 'Échafaudage (location)', 'm²', 150, 'Matériel'),
    ('mt_portail', 'Poste à souder, meuleuse (portail)', 'ft', 150000, 'Matériel'),
]
PX = {c: (lib, u, pu, cat) for c, lib, u, pu, cat in PRIX}

# ------------------------------------------------------------------ ACIERS (lot, élément, nuance, formule longueur)
ACIERS = [
    (2, 'Semelles isolées 80x80 : 2 sens x n HA12 e=15 (L = A - 0,10 + 2 retours 0,20)', 'HA12',
     '=p_NPIL*2*(ROUNDUP((p_SIA-0.10)/p_ESI,0)+1)*(p_SIA-0.10+2*0.20)'),
    (2, 'Fûts 40x40 sous platines : 4 HA12 en L (hauteur + retour 0,40)', 'HA12', '=p_NPIL*4*(p_HENT+0.40)'),
    (2, 'Fûts 40x40 : cadres HA6 e=15 (L = 1,40 m)', 'HA6', '=p_NPIL*(ROUNDUP(p_HENT/0.15,0)+1)*1.40'),
    (2, 'Semelle filante : 4 HA10 filants (x1,05 recouvrements)', 'HA10', '=4*p_P*1.05'),
    (2, 'Semelle filante : répartiteurs HA6 e=20', 'HA6', '=p_P/0.20*(p_SFB+0.05)'),
    (2, 'Chaînage bas : 4 HA10 (x1,10 recouvrements et angles)', 'HA10', '=4*p_P*1.10'),
    (2, 'Chaînage bas : cadres HA6 15x20 e=20 (L = 0,60 m)', 'HA6', '=p_P/0.20*0.60'),
    (3, 'Poteaux BA 15x15 (2 par pilier) : 4 HA10 (retour 0,30 en semelle + ancrage 0,40)', 'HA10', '=p_NPIL*p_NPO*4*(p_HPO+0.70)+p_NPO*4*p_FL'),
    (3, 'Poteaux BA 15x15 : cadres HA6 e=15 (L = 0,50 m)', 'HA6', '=p_NPIL*p_NPO*(ROUNDUP(p_HPO/0.15,0)+1)*0.50'),
    (3, 'Chaînage intermédiaire : 4 HA10 (interrompu à l\'entrée)', 'HA10', '=4*(p_P-p_PL)*1.10'),
    (3, 'Chaînage intermédiaire : cadres HA6 e=20', 'HA6', '=(p_P-p_PL)/0.20*0.60'),
    (3, 'Chaînage haut : 4 HA10', 'HA10', '=4*p_P*1.10'),
    (3, 'Chaînage haut : cadres HA6 e=20', 'HA6', '=p_P/0.20*0.60'),
    (3, 'Linteau 15x40 : 2 lits 3 HA10 + 2 HA10 haut', 'HA10', '=8*(p_PL+0.80)'),
    (3, 'Linteau : cadres HA6 15x40 e=15 (L = 1,00 m)', 'HA6', '=ROUNDUP((p_PL+0.80)/0.15,0)*1.00'),
    (3, 'Chaînages rampants 15x15 : 4 HA10', 'HA10', '=16*p_RAMP*1.10'),
    (3, 'Chaînages rampants : cadres HA6 e=20 (L = 0,50 m)', 'HA6', '=4*p_RAMP/0.20*0.50'),
    (5, 'Dallage : nappe(s) HA10 e=20 dans les 2 sens', 'HA10', '=p_SINT*p_NNAP*2/p_EDAL*p_RDAL'),
    (5, 'Dallage : chaises HA10 (L = 0,80 m)', 'HA10', '=p_SINT*p_NCHA*0.80'),
]
KGNAME = {'HA6': 'p_KG6', 'HA10': 'p_KG10', 'HA12': 'p_KG12'}

# ------------------------------------------------------------------ SOUS-DÉTAILS
M, O, E = 'Matériaux', 'Main-d\'œuvre', 'Matériel'
def c(nat, code, q, lib=None):
    return (nat, lib or PX[code][0], code, PX[code][1], q)

def beton(dos, r):
    return [c(M, 'ciment', f'={dos}/50'), c(M, 'sable', '=0.45'), c(M, 'gravier', '=0.85'), c(M, 'eau', '=0.20'),
            c(O, 'mo_macon', f'=1/{r}', f'Maçon (équipe 1 maçon + 6 manœuvres : {r} m³/j)'),
            c(O, 'mo_man', f'=6/{r}', 'Manœuvres (6 par équipe)'),
            c(E, 'mt_bet', f'=1/{r}'), c(E, 'mt_vib', f'=1/{r}')]
def acier(code, r=150):
    return [c(M, code, '=1'), c(M, 'fil', '=0.015'), c(O, 'mo_ferr', f'=1/{r}', f'Ferrailleur ({r} kg/j)'),
            c(O, 'mo_man', f'=1/{r}', f'Manœuvre ({r} kg/j)')]
COFF = [c(M, 'bois', '=1'), c(M, 'pointes', '=0.15'), c(M, 'huile', '=0.10'),
        c(O, 'mo_coff', '=1/8', 'Coffreur (8 m²/j)'), c(O, 'mo_man', '=1/8', 'Manœuvre (8 m²/j)')]
AGG = [c(M, 'agglo', '=12.5*1.05', 'Agglos 15 pleins (12,5 u/m² + 5 % casse)'), c(M, 'ciment', '=0.15'),
       c(M, 'sable', '=0.03'), c(M, 'eau', '=0.01'),
       c(O, 'mo_macon', '=1/10', 'Maçon (10 m²/j)'), c(O, 'mo_man', '=1/10', 'Manœuvre (10 m²/j)')]
AGG_CR = [c(M, 'agglo_cr', '=12.5*1.05', 'Agglos 15 creux (12,5 u/m² + 5 % casse)'), c(M, 'ciment', '=0.13'),
          c(M, 'sable', '=0.025'), c(M, 'eau', '=0.01'),
          c(O, 'mo_macon', '=1/12', 'Maçon (12 m²/j)'), c(O, 'mo_man', '=1/12', 'Manœuvre (12 m²/j)')]

LOTS = [
    (0, 'INSTALLATION DE CHANTIER ET TRAVAUX PRÉPARATOIRES', False),
    (1, 'TERRASSEMENTS', False),
    (2, 'FONDATIONS', False),
    (3, 'ÉLÉVATION (MAÇONNERIE ET BÉTON ARMÉ)', False),
    (4, 'STRUCTURE MÉTALLIQUE : PILIERS IPE 220 ET CONTREVENTEMENTS', False),
    (5, 'FORME EN LATÉRITE ET DALLAGE BA 20 cm', False),
    (6, 'ENDUITS (OPTION)', True),
    (7, 'CHARPENTE DE TOITURE ET COUVERTURE - PENTE 20 % (OPTION)', True),
    (8, 'MENUISERIE MÉTALLIQUE (OPTION)', True),
]
OPTION = {l: o for l, _, o in LOTS}

ARTS = []  # code, lot, désignation, unité, formule quantité, composantes
def art(code, lot, des, u, f, comp):
    ARTS.append(dict(code=code, lot=lot, des=des, u=u, f=f, comp=comp))
def acier_q(lot, nu):
    return ('ACIER', lot, nu)

art('0.1', 0, 'Installation et repli de chantier (magasin, clôture provisoire, eau, électricité, panneau)', 'ft', '=1',
    [c(M, 'ff_install', '=1'), c(O, 'mo_man', '=20', 'Manœuvres (montage / repli)'), c(E, 'mt_branch', '=1')])
art('0.2', 0, 'Débroussaillage et décapage de la terre végétale ép. 10 cm', 'm²', '=(p_L+4)*(p_B+4)',
    [c(O, 'mo_man', '=1/60', 'Manœuvre (60 m²/j)')])
art('0.3', 0, 'Implantation du bâtiment (chaises, cordeaux, axes et niveaux)', 'ft', '=1',
    [c(M, 'ff_implant', '=1'), c(O, 'mo_tech', '=2'), c(O, 'mo_man', '=4'), c(E, 'mt_niveau', '=2')])

art('1.1', 1, 'Fouilles en rigole 0,80 x 1,20 m en terrain latéritique', 'm³', '=p_VRIG',
    [c(O, 'mo_man', '=1/1.5', 'Manœuvre (1,5 m³/j en latérite compacte)')])
art('1.2', 1, 'Fouilles en puits 1,00 x 1,00 x 1,20 m pour semelles isolées 80x80 (complément)', 'm³', '=p_VPUI',
    [c(O, 'mo_man', '=1/1.5', 'Manœuvre (1,5 m³/j)')])
art('1.3', 1, 'Remblai des fouilles avec les terres extraites, compacté par couches de 20 cm', 'm³', '=p_VRIG+p_VPUI-p_VENT',
    [c(O, 'mo_man', '=1/4', 'Manœuvre (4 m³/j)'), c(E, 'mt_dame', '=1/20', 'Dame sauteuse (20 m³/j)')])
art('1.4', 1, 'Évacuation des terres excédentaires des fouilles', 'm³', '=p_VENT*p_FOIS',
    [c(O, 'mo_man', '=1/5', 'Manœuvre - chargement (5 m³/j)'), c(E, 'mt_cam', '=1/10', 'Camion benne 10 m³ (voyage)')])
art('1.5', 1, 'Traitement anti-termites des fonds de fouilles', 'm²', '=p_P*p_FRL+p_NPIL*(p_FPA*p_FPA-p_FRL*p_FPA)',
    [c(M, 'termite', '=1'), c(O, 'mo_man', '=1/25', 'Manœuvre (25 m²/j)')])

art('2.1', 2, 'Béton de propreté dosé à 150 kg/m³, ép. 5 cm', 'm³', '=p_VPROP', beton(150, 8))
art('2.2', 2, 'Béton armé dosé à 350 kg/m³ pour semelles isolées 0,80 x 0,80 x 0,30', 'm³', '=p_VSI', beton(350, 5))
art('2.3', 2, 'Béton armé dosé à 350 kg/m³ pour semelle filante 0,60 x 0,15', 'm³', '=p_VSF', beton(350, 6))
art('2.4', 2, 'Maçonnerie d\'agglos 15 pleins en fondation h = 1,00 m, mortier dosé à 300 kg/m³', 'm²', '=p_LNET*p_HFOND', AGG)
art('2.11', 2, 'Béton armé dosé à 350 kg/m³ pour fûts 40 x 40 sous platines des IPE (de -0,85 à ±0,00)', 'm³', '=p_NPIL*p_AFUT*p_AFUT*p_HENT', beton(350, 4))
art('2.12', 2, 'Fourniture et scellement des tiges d\'ancrage M20 des IPE (gabarit de pose, 4 par pilier)', 'u', '=p_NPIL*p_NTIG',
    [c(M, 'tige', '=1'), c(M, 'bois', '=0.10', 'Gabarit de pose (contreplaqué)'), c(O, 'mo_soud', '=1/16', 'Monteur (16 tiges/j)'), c(O, 'mo_man', '=1/16', 'Manœuvre (16 tiges/j)')])
art('2.5', 2, 'Béton armé dosé à 350 kg/m³ pour chaînage bas 15 x 20', 'm³', '=p_LNET*p_BCH*p_HCH', beton(350, 6))
art('2.6', 2, 'Chape d\'arase étanche (mortier dosé à 400 kg/m³ + hydrofuge) ép. 3 cm', 'm²', '=p_LNET*p_EP',
    [c(M, 'ciment', '=0.24'), c(M, 'sable', '=0.036'), c(M, 'hydro', '=0.5'),
     c(O, 'mo_macon', '=1/15', 'Maçon (15 m²/j)'), c(O, 'mo_man', '=1/15', 'Manœuvre (15 m²/j)')])
art('2.7', 2, 'Coffrage en bois ordinaire (semelles isolées, fûts, chaînage bas)', 'm²', '=p_NPIL*4*(p_SIA*p_SIH+p_AFUT*p_HENT)+2*p_HCH*p_LNET', COFF)
art('2.8', 2, 'Armatures HA12 FeE500 - semelles isolées 80x80 et fûts', 'kg', acier_q(2, 'HA12'), acier('ha12'))
art('2.9', 2, 'Armatures HA10 FeE500 - fondations', 'kg', acier_q(2, 'HA10'), acier('ha10'))
art('2.10', 2, 'Armatures HA6 FeE500 - fondations', 'kg', acier_q(2, 'HA6'), acier('ha6'))

art('3.1', 3, 'Maçonnerie d\'agglos 15 creux en élévation h = 6,00 m, mortier dosé à 300 kg/m³ (y compris pignons)', 'm²',
    '=p_LCHI*p_HM+p_PL*((p_H-p_HCH)-(p_PH+p_LINH))+2*p_PIGN', AGG_CR)
art('3.2', 3, 'Béton armé dosé à 350 kg/m³ pour poteaux 15 x 15 (2 par pilier IPE), de -0,85 à +6,00', 'm³',
    '=p_NPIL*p_NPO*p_APO*p_APO*p_HPO+p_NPO*p_APO*p_APO*p_FL', beton(350, 4))
art('3.3', 3, 'Béton armé dosé à 350 kg/m³ pour chaînage intermédiaire 15 x 20 à +3,00', 'm³', '=p_LCHI*p_BCH*p_HCH', beton(350, 5))
art('3.4', 3, 'Béton armé dosé à 350 kg/m³ pour chaînage haut 15 x 20', 'm³', '=p_LNET*p_BCH*p_HCH', beton(350, 5))
art('3.5', 3, 'Béton armé dosé à 350 kg/m³ pour linteau de l\'entrée 15 x 40', 'm³', '=p_PL*p_BCH*p_LINH', beton(350, 4))
art('3.6', 3, 'Béton armé dosé à 350 kg/m³ pour chaînages rampants 15 x 15 (pente 20 %)', 'm³',
    '=4*(p_RAMP-0.20)*0.15*0.15', beton(350, 4))
art('3.7', 3, 'Coffrage en bois ordinaire (poteaux, chaînages, linteau, rampants)', 'm²',
    '=3*p_APO*p_NPO*(p_NPIL*p_HPO+p_FL)+2*p_HCH*(p_LCHI+p_LNET)+(2*p_LINH+p_BCH)*p_PL+2*0.15*4*(p_RAMP-0.20)', COFF)
art('3.8', 3, 'Armatures HA10 FeE500 - élévation', 'kg', acier_q(3, 'HA10'), acier('ha10'))
art('3.9', 3, 'Armatures HA6 FeE500 - élévation', 'kg', acier_q(3, 'HA6'), acier('ha6'))

STRUCT = lambda prod, r: [c(M, prod, '=1.05', PX[prod][0] + ' (5 % de chutes)'), c(M, 'peint', '=1'),
    c(O, 'mo_soud', f'=1/{r}', f'Soudeur / monteur ({r} kg/j)'), c(O, 'mo_man', f'=2/{r}', f'Manœuvres (2 / monteur)'),
    c(E, 'mt_ch', '=1', 'Poste à souder, meuleuse, palan / chèvre de levage')]
art('4.1', 4, 'Piliers en IPE 220 (S235) de ±0,00 à +6,00, fournis, fabriqués, peints et posés', 'kg', '=p_LIPE*p_KGIPE', STRUCT('ipe', 100))
art('4.2', 4, 'Platines de pied et de tête 15 mm + raidisseurs, soudées', 'kg', '=p_NPIL*p_KGPLA', STRUCT('tole', 40))
art('4.3', 4, 'Calage et scellement des platines au mortier sans retrait', 'u', '=p_NPIL',
    [c(M, 'grout', '=0.5'), c(O, 'mo_macon', '=1/8', 'Maçon (8 platines/j)'), c(O, 'mo_man', '=1/8', 'Manœuvre (8 platines/j)')])
art('4.4', 4, 'Contreventements en cornières 50x50x5 : palées verticales en long pan et poutre au vent en toiture (goussets et boulons compris)', 'kg',
    '=p_LCOR*p_KGCOR*p_GOUS', STRUCT('corniere', 60))
art('5.1', 5, 'Décaissement / purge intérieure du sol de mauvaise portance (ép. = épaisseur de latérite) et évacuation', 'm³',
    '=p_SINT*p_EPLAT',
    [c(O, 'mo_man', '=1/2', 'Manœuvre (2 m³/j)'), c(E, 'mt_cam', '=1.25/10', 'Camion benne 10 m³ (foisonnement 1,25)')])
art('5.2', 5, 'Rechargement en latérite d\'emprunt à l\'intérieur, mis en œuvre par couches de 20 cm, arrosé et compacté à 95 % OPM', 'm³',
    '=p_SINT*p_EPLAT',
    [c(M, 'laterite', '=1.30', 'Latérite d\'emprunt (coef. compactage 1,30)'), c(M, 'eau', '=0.10', 'Eau d\'arrosage (teneur OPM)'),
     c(O, 'mo_man', '=1/6', 'Manœuvre - répandage, réglage, arrosage (6 m³/j)'),
     c(E, 'mt_plaque', '=1/40', 'Compacteur (40 m³/j)')])
art('5.3', 5, 'Essais de contrôle (Proctor modifié, densités in situ par couche, éprouvettes béton)', 'ft', '=1',
    [c(M, 'ff_essais', '=1')])
art('5.4', 5, 'Traitement anti-termites sous dallage', 'm²', '=p_SINT',
    [c(M, 'termite', '=1'), c(O, 'mo_man', '=1/50', 'Manœuvre (50 m²/j)')])
art('5.5', 5, 'Film polyane 150 µ sous dallage (recouvrements 10 %)', 'm²', '=p_SINT*1.10',
    [c(M, 'polyane', '=1'), c(O, 'mo_man', '=1/150', 'Manœuvre (150 m²/j)')])
art('5.6', 5, 'Armatures HA10 FeE500 - dallage nappe simple e = 20 cm + chaises', 'kg', acier_q(5, 'HA10'), acier('ha10', 200))
art('5.7', 5, 'Béton armé dosé à 350 kg/m³ pour dallage ép. 20 cm, vibré et surfacé', 'm³', '=p_SINT*p_EPDAL', beton(350, 8))
art('5.8', 5, 'Joints de retrait sciés (maille 5 m) et joint périphérique', 'ml',
    '=(p_L/p_ESP-1)*(p_B-p_EP)+(ROUNDUP(p_B/p_ESP,0)-1)*(p_L-p_EP)+2*(p_L+p_B-2*p_EP)',
    [c(M, 'joint', '=1'), c(O, 'mo_macon', '=1/60', 'Maçon (60 ml/j)'), c(E, 'mt_scie', '=1/120', 'Scie à sol (120 ml/j)')])

art('6.1', 6, 'Enduit au mortier dosé à 300 kg/m³ ép. 2 cm, intérieur et extérieur', 'm²',
    '=2*(p_L+p_B+2*p_EP)*(p_H+0.20)+p_B*p_FL-p_PL*p_PH+2*(p_L+p_B-2*p_EP)*(p_H-p_EPDAL)+p_B*p_FL-p_PL*p_PH',
    [c(M, 'ciment', '=0.13'), c(M, 'sable', '=0.025'), c(M, 'eau', '=0.01'),
     c(O, 'mo_macon', '=1/12', 'Maçon (12 m²/j)'), c(O, 'mo_man', '=1/12', 'Manœuvre (12 m²/j)'), c(E, 'mt_echaf', '=1')])
art('7.1', 7, 'Fermes / traverses de toiture sur têtes d\'IPE 220 (hors pannes) - ratio à confirmer par note de calcul', 'kg',
    '=p_RCH*(p_L+1)*(p_B+1)',
    [c(M, 'acier_ch', '=1.05'), c(O, 'mo_soud', '=1/60', 'Soudeur (60 kg/j)'), c(O, 'mo_man', '=1/60', 'Manœuvre (60 kg/j)'),
     c(E, 'mt_ch', '=1')])
art('7.2', 7, 'Pannes en Z 120 x 2 mm, entraxe ≤ 1,20 m, y compris échantignoles et boulonnerie', 'kg', '=p_NPAN*(p_L+1)*1.05*p_KGZ',
    [c(M, 'zpanne', '=1'), c(O, 'mo_soud', '=1/150', 'Monteur (150 kg/j)'), c(O, 'mo_man', '=2/150', 'Manœuvres (2 / monteur)'),
     c(E, 'mt_ch', '=0.5', 'Levage, perceuse, petit matériel')])
art('7.3', 7, 'Couverture en tôles bacs 5 ondulations sur pannes Z, pente 20 %, débords 0,50 m', 'm²', '=2*(p_RAMP+p_DEB)*(p_L+1)',
    [c(M, 'bac', '=1.10'), c(O, 'mo_soud', '=1/40', 'Couvreur (40 m²/j)'), c(O, 'mo_man', '=1/40', 'Manœuvre (40 m²/j)')])
art('7.4', 7, 'Faîtière', 'ml', '=p_L+1', [c(M, 'faitiere', '=1.05'), c(O, 'mo_soud', '=1/30', 'Couvreur (30 ml/j)')])
art('8.1', 8, 'Portail métallique coulissant 6,00 x 4,50 m', 'u', '=1',
    [c(M, 'ff_portail', '=1'), c(O, 'mo_soud', '=15'), c(O, 'mo_man', '=15'), c(E, 'mt_portail', '=1')])

# ordre et numérotation définitifs du lot 2
_ORD2 = ['2.1', '2.2', '2.11', '2.12', '2.3', '2.4', '2.5', '2.6', '2.7', '2.8', '2.9', '2.10']
_l2 = sorted([a for a in ARTS if a['lot'] == 2], key=lambda a: _ORD2.index(a['code']))
for i, a in enumerate(_l2, 1):
    a['code'] = f'2.{i}'
ARTS = [a for a in ARTS if a['lot'] < 2] + _l2 + [a for a in ARTS if a['lot'] > 2]

# ------------------------------------------------------------------ ÉVALUATION PYTHON
V = {}
def ev(f):
    return eval(f.lstrip('='), dict(NS_FUN), V)

def compute():
    V.clear()
    for n, _, v, *_ in PARAMS:
        V[n] = ev(v) if isinstance(v, str) else v
    for a in ACIERS:
        pass
    acier_rows = []
    for lot, elt, nu, f in ACIERS:
        lg = ev(f)
        acier_rows.append((lot, elt, nu, lg, lg * V[KGNAME[nu]]))
    for a in ARTS:
        if isinstance(a['f'], tuple):
            _, lot, nu = a['f']
            a['q'] = sum(r[4] for r in acier_rows if r[0] == lot and r[2] == nu) * V['p_CHUTES']
        else:
            a['q'] = ev(a['f'])
        mo = sum(ev(q) * PX[code][2] for nat, _, code, _, q in a['comp'] if nat == O)
        tot = {M: 0.0, O: 0.0, E: 0.0}
        for nat, _, code, _, q in a['comp']:
            tot[nat] += ev(q) * PX[code][2]
        tot[E] += V['p_PO'] * mo
        a['ds_nat'] = tot
        a['ds_u'] = sum(tot.values())
        a['ds_tot'] = a['ds_u'] * a['q']
        a['pv_u'] = math.floor(a['ds_u'] * V['p_K'] / 5 + 0.5) * 5
        a['pv_tot'] = a['pv_u'] * a['q']
    return acier_rows

def metre_txt(f):
    """formule avec les noms remplacés par leurs valeurs."""
    if isinstance(f, tuple):
        return 'Voir nomenclature des aciers (poids x 1,05 chutes)'
    s = f.lstrip('=')
    PF = {n: v for n, _, v, *_ in PARAMS if isinstance(v, str)}
    for n in ('p_VRIG', 'p_VPUI', 'p_VPROP', 'p_VSI', 'p_VSF', 'p_LIPE'):
        if s == n:
            s = PF[n].lstrip('=')
    s = re.sub(r'p_[A-Z0-9]+', lambda m: (f'{V[m.group(0)]:.2f}'.rstrip('0').rstrip('.')).replace('.', ','), s)
    s = re.sub(r'(?<=\d)\.(?=\d)', ',', s)
    return s.replace('*', ' x ')

def besoins(base_only):
    need = {}
    for a in ARTS:
        if base_only and OPTION[a['lot']]:
            continue
        for nat, _, code, u, q in a['comp']:
            if nat == M:
                need[code] = need.get(code, 0) + ev(q) * a['q']
    return need

if __name__ == '__main__':
    rows = compute()
    for n in ('p_NPIL', 'p_HPO', 'p_BPIL', 'p_LIPE', 'p_LCOR', 'p_SINT', 'p_VRIG', 'p_VPUI', 'p_VENT', 'p_K'):
        print(n, round(V[n], 4))
    for a in ARTS:
        print(a['code'], a['u'], round(a['q'], 2), round(a['ds_u']), a['pv_u'], round(a['pv_tot']), '|', metre_txt(a['f'])[:70])
    for l, _, o in LOTS:
        print(l, round(sum(a['ds_tot'] for a in ARTS if a['lot'] == l)), sum(a['pv_tot'] for a in ARTS if a['lot'] == l))
    print('PV base', round(sum(a['pv_tot'] for a in ARTS if not OPTION[a['lot']])))
