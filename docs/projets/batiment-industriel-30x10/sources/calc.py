# -*- coding: utf-8 -*-
"""Bâtiment industriel 30 x 10 m - métré, sous-détails (déboursé sec) et DQE.
Auteur : Moulo Jean Claude - Technicien génie civil BTP, Abidjan."""
import math

# ------------------------------------------------------------------ GEOMETRIE
L, B = 30.0, 10.0           # dimensions entre axes (m)
P = 2 * (L + B)             # périmètre axe des murs = 80 m
e = 0.15                    # épaisseur agglo 15
ESP = 5.0                   # espacement des piliers
PENTE = 0.20                # pente toiture 20 %
FLECHE = B / 2 * PENTE      # 1,00 m -> faîtage à +7,00
H = 6.00                    # hauteur élévation (TN -> dessus chaînage haut)
H_FOND = 1.00               # hauteur maçonnerie de fondation
PORTE_L, PORTE_H = 6.00, 4.50
# piliers : 7 par long pan (2 x 7 = 14) + 1 au centre du pignon Ouest
#           + 2 piliers d'encadrement de l'entrée (pignon Est)  -> 17
N_LONG = int(L / ESP) + 1
N_PIL = 2 * N_LONG + 1 + 2
a_pil, b_pil = 0.15, 0.40   # pilier = 2 poteaux 15x20 jumelés -> 15 x 40
S_PIL = a_pil * b_pil
Z_SEM = -1.05               # dessus semelle (départ maçonnerie fondation)
H_PIL = H - Z_SEM           # 7,05 m (partie enterrée + élévation)
# chaînages 15x20
S_CH = 0.15 * 0.20
L_CH_BAS = P - N_PIL * b_pil              # 73,20 m net de piliers
L_CH_HAUT = L_CH_BAS
L_CH_INT = P - N_PIL * b_pil - PORTE_L    # interrompu au droit de l'entrée
# hauteurs nettes de maçonnerie en élévation
H_M1 = 3.00 - 0.20          # entre chaînage bas et intermédiaire
H_M2 = 5.80 - 3.20          # entre intermédiaire et haut
L_MUR_EL = P - N_PIL * b_pil - PORTE_L    # 67,20 m
L_RAMP = math.hypot(B / 2, FLECHE)        # 5,10 m

# fouilles
FR_L, FR_H = 0.60, 1.25     # rigole 0,60 x 1,25
FP, FP_H = 1.20, 1.40       # puits 1,20 x 1,20 x 1,40
SEM = 1.00; SEM_H = 0.30    # semelle isolée 1,00 x 1,00 x 0,30
SF_B, SF_H = 0.40, 0.20     # semelle filante 0,40 x 0,20

q = {}
q['decap'] = (L + 4) * (B + 4)
q['fouille_rig'] = P * FR_L * FR_H
q['fouille_puits'] = N_PIL * (FP * FP * FP_H - FR_L * FP * FR_H)
q['propre'] = (P - N_PIL * FP) * FR_L * 0.05 + N_PIL * FP * FP * 0.05
q['sem_iso'] = N_PIL * SEM * SEM * SEM_H
q['sem_fil'] = (P - N_PIL * SEM) * SF_B * SF_H
q['agglo_fond'] = (P - N_PIL * b_pil) * H_FOND
q['ch_bas'] = L_CH_BAS * S_CH
q['arase'] = L_CH_BAS * e
pil_enterre = N_PIL * S_PIL * (0 - Z_SEM)
vol_enterre = (q['propre'] + q['sem_iso'] + q['sem_fil'] + q['agglo_fond'] * e
               + pil_enterre)
fouilles = q['fouille_rig'] + q['fouille_puits']
q['remblai'] = fouilles - vol_enterre
q['evac'] = (fouilles - q['remblai']) * 1.25
q['termite'] = P * FR_L + N_PIL * (FP * FP - FR_L * FP)

# élévation
pignon_net = 0.5 * B * FLECHE - 2 * L_RAMP * 0.15 - 0.40 * 0.5   # par pignon
q['agglo_elev'] = L_MUR_EL * (H_M1 + H_M2) + PORTE_L * (5.80 - 4.90) + 2 * pignon_net
q['piliers'] = N_PIL * S_PIL * H_PIL + S_PIL * FLECHE  # + surhauteur pilier pignon
q['ch_int'] = L_CH_INT * S_CH
q['ch_haut'] = L_CH_HAUT * S_CH
q['linteau'] = PORTE_L * 0.15 * 0.40
q['ch_ramp'] = 4 * (L_RAMP - 0.20) * 0.15 * 0.15

# coffrages
cof_pil_ml = 2 * b_pil       # 2 faces vues (les faces 15 cm sont contre agglos)
q['cof_fond'] = N_PIL * 4 * SEM * SEM_H + 2 * 0.20 * L_CH_BAS
q['cof_elev'] = (N_PIL * cof_pil_ml * H_PIL + cof_pil_ml * FLECHE
                 + 2 * 0.20 * L_CH_INT + 2 * 0.20 * L_CH_HAUT
                 + (2 * 0.40 + 0.15) * PORTE_L + 2 * 0.15 * 4 * (L_RAMP - 0.20))

# ------------------------------------------------------------------ ACIERS
KG = {'HA10': 0.617, 'HA6': 0.222}
CHUTES = 1.05
cad_15x20 = 2 * (0.10 + 0.15) + 0.10
cad_15x40 = 2 * (0.10 + 0.35) + 0.10
cad_15x15 = 2 * (0.10 + 0.10) + 0.10
acier_detail = []   # (lot, élément, nuance, longueur m)
def A(lot, elt, nu, lg):
    acier_detail.append((lot, elt, nu, lg))
# fondations
A(2, 'Semelles isolées : nappe HA10 e=15 dans 2 sens (2x7 barres x 1,25 m) x 17', 'HA10', N_PIL * 14 * 1.25)
A(2, 'Semelle filante : 4 HA10 filants (x1,05 recouvrements)', 'HA10', 4 * P * 1.05)
A(2, 'Semelle filante : répartiteurs HA6 e=20 (L=0,45 m)', 'HA6', P / 0.20 * 0.45)
A(2, 'Chaînage bas : 4 HA10 (x1,10 recouvrements + ancrages d\'angle)', 'HA10', 4 * P * 1.10)
A(2, 'Chaînage bas : cadres HA6 15x20 e=20 (L=0,60 m)', 'HA6', P / 0.20 * cad_15x20)
# élévation
n_niv = math.ceil(H_PIL / 0.15) + 1
A(3, 'Piliers : 8 HA10 (2 x 4 HA10) L=7,75 m x 17 + surhauteur pignon', 'HA10', N_PIL * 8 * (H_PIL + 0.30 + 0.40) + 8 * FLECHE)
A(3, f'Piliers : 2 cadres HA6 15x20 par niveau, e=15 ({n_niv} niv.) x 17', 'HA6', N_PIL * n_niv * 2 * cad_15x20)
A(3, 'Chaînage intermédiaire : 4 HA10 (interrompu à l\'entrée)', 'HA10', 4 * (P - PORTE_L) * 1.10)
A(3, 'Chaînage intermédiaire : cadres HA6 e=20', 'HA6', (P - PORTE_L) / 0.20 * cad_15x20)
A(3, 'Chaînage haut : 4 HA10', 'HA10', 4 * P * 1.10)
A(3, 'Chaînage haut : cadres HA6 e=20', 'HA6', P / 0.20 * cad_15x20)
A(3, 'Linteau entrée 15x40 : 2 lits 3 HA10 + 2 HA10 haut, L=6,80 m', 'HA10', 8 * (PORTE_L + 0.80))
A(3, 'Linteau entrée : cadres HA6 15x40 e=15', 'HA6', math.ceil((PORTE_L + 0.80) / 0.15) * cad_15x40)
A(3, 'Chaînages rampants pignons 15x15 : 4 HA10', 'HA10', 4 * 4 * L_RAMP * 1.10)
A(3, 'Chaînages rampants : cadres HA6 15x15 e=20', 'HA6', 4 * L_RAMP / 0.20 * cad_15x15)

def kg(lot, nu):
    return sum(lg for l, _, n, lg in acier_detail if l == lot and n == nu) * KG[nu] * CHUTES
for lot in (2, 3):
    for nu in ('HA10', 'HA6'):
        q[f'{nu}_{lot}'] = kg(lot, nu)

# options
q['enduit'] = (2 * (L + e + B + e) * (H + 0.20) + 2 * 0.5 * B * FLECHE - PORTE_L * PORTE_H) \
            + (2 * (L - e + B - e) * H + 2 * 0.5 * B * FLECHE - PORTE_L * PORTE_H)
q['charpente'] = 17.0 * (L + 1.0) * (B + 1.0)          # ratio 17 kg/m² couvert
q['couverture'] = 2 * (L_RAMP + 0.50) * (L + 1.0)
q['faitage'] = L + 1.0
q['dal_remblai'] = (L - e) * (B - e) * 0.20
q['dal_beton'] = (L - e) * (B - e) * 0.12
q['dal_ts'] = (L - e) * (B - e) * 1.10

# ------------------------------------------------------------------ PRIX DE BASE (FCFA, Abidjan 2026)
PRIX = {
    'ciment':  ('Ciment CPJ 42,5 (sac 50 kg)', 'sac', 5800),
    'sable':   ('Sable lavé', 'm³', 12000),
    'gravier': ('Gravier concassé 5/15 - 15/25', 'm³', 25000),
    'eau':     ('Eau de gâchage', 'm³', 1000),
    'agglo':   ('Agglo 15 plein 40x20x15 rendu chantier', 'u', 500),
    'HA10':    ('Acier HA10 (barre 12 m = 7,40 kg à 6 000)', 'kg', 810),
    'HA6':     ('Acier HA6 (barre 12 m = 2,66 kg à 2 300)', 'kg', 865),
    'fil':     ('Fil recuit', 'kg', 1500),
    'bois':    ('Bois de coffrage (planches, chevrons) amorti 3 emplois', 'm²', 1800),
    'pointes': ('Pointes', 'kg', 1500),
    'huile':   ('Huile de décoffrage', 'L', 1000),
    'hydro':   ('Hydrofuge de masse', 'L', 2000),
    'termite': ('Produit anti-termites (dilué)', 'm²', 1200),
    'laterite':('Latérite d\'emprunt (rendue)', 'm³', 6000),
    'polyane': ('Film polyane 150 µ', 'm²', 400),
    'ts':      ('Treillis soudé ST 25', 'm²', 1800),
    'acier_ch':('Profilés acier charpente + peinture antirouille', 'kg', 900),
    'bac':     ('Bac aluminium 6/10 + accessoires de fixation', 'm²', 4500),
    'faitiere':('Faîtière aluminium', 'ml', 3500),
}
MO = {  # salaires journaliers chargés (FCFA/j)
    'chef': 20000, 'macon': 10000, 'ferr': 10000, 'coff': 10000,
    'soud': 15000, 'manoeuvre': 5000, 'tech': 15000,
}
MAT = {'betonniere': 25000, 'vibreur': 15000, 'dame': 20000, 'camion': 25000}

def m(k, qte):
    lib, u, pu = PRIX[k]
    return ('Matériaux', lib, u, qte, pu)
def mo(lib, qte_j_par_unite, pu):
    return ('Main-d\'œuvre', lib, 'h.j', qte_j_par_unite, pu)
def mat(lib, u, qte, pu):
    return ('Matériel', lib, u, qte, pu)

def beton(dosage, rendement=6.0):
    sacs = dosage / 50
    return [m('ciment', sacs), m('sable', 0.45), m('gravier', 0.85), m('eau', 0.20),
            mo('Maçon (équipe 1 maçon + 6 manœuvres : 6 m³/j)', 1 / rendement, MO['macon']),
            mo('Manœuvres (6 / équipe)', 6 / rendement, MO['manoeuvre']),
            mat('Bétonnière 350 L (location)', 'j', 1 / rendement, MAT['betonniere']),
            mat('Vibreur (location)', 'j', 1 / rendement, MAT['vibreur'])]

def acier(nu):
    return [m(nu, 1.0), m('fil', 0.015),
            mo('Ferrailleur (150 kg/j)', 1 / 150, MO['ferr']),
            mo('Manœuvre (150 kg/j)', 1 / 150, MO['manoeuvre'])]

COFFRAGE = [m('bois', 1.0), m('pointes', 0.15), m('huile', 0.10),
            mo('Coffreur (8 m²/j)', 1 / 8, MO['coff']), mo('Manœuvre (8 m²/j)', 1 / 8, MO['manoeuvre'])]
AGGLO = [m('agglo', 12.5 * 1.05), m('ciment', 0.15), m('sable', 0.03), m('eau', 0.01),
         mo('Maçon (10 m²/j)', 1 / 10, MO['macon']), mo('Manœuvre (10 m²/j)', 1 / 10, MO['manoeuvre'])]

# ------------------------------------------------------------------ ARTICLES
LOTS = [
    (0, 'INSTALLATION DE CHANTIER ET TRAVAUX PRÉPARATOIRES', False),
    (1, 'TERRASSEMENTS', False),
    (2, 'FONDATIONS', False),
    (3, 'ÉLÉVATION (MAÇONNERIE ET BÉTON ARMÉ)', False),
    (4, 'ENDUITS (OPTION)', True),
    (5, 'CHARPENTE MÉTALLIQUE ET COUVERTURE - PENTE 20 % (OPTION)', True),
    (6, 'DALLAGE INDUSTRIEL (OPTION)', True),
    (7, 'MENUISERIE MÉTALLIQUE (OPTION)', True),
]
ART = []  # (code, lot, designation, unité, quantité, composantes, métré)
def art(code, lot, des, u, qte, comp, metre=''):
    ART.append(dict(code=code, lot=lot, des=des, u=u, q=round(qte, 2), comp=comp, metre=metre))

art('0.1', 0, 'Installation et repli de chantier (magasin, clôture provisoire, eau, électricité, panneau)', 'ft', 1,
    [('Matériaux', 'Magasin, clôture provisoire, panneau de chantier', 'ft', 1, 300000),
     mo('Manœuvres (montage/repli)', 20, MO['manoeuvre']),
     mat('Branchements provisoires eau et électricité', 'ft', 1, 100000)], 'Forfait')
art('0.2', 0, 'Débroussaillage et décapage de la terre végétale ép. 10 cm', 'm²', q['decap'],
    [mo('Manœuvre (60 m²/j)', 1 / 60, MO['manoeuvre'])], f'(30+4) x (10+4) = {q["decap"]:.2f} m²')
art('0.3', 0, 'Implantation du bâtiment (chaises, cordeaux, axes et niveaux)', 'ft', 1,
    [('Matériaux', 'Bois de chaises, cordeau, pointes, peinture', 'ft', 1, 40000),
     mo('Technicien', 2, MO['tech']), mo('Manœuvres', 4, MO['manoeuvre']),
     mat('Niveau de chantier / théodolite (location)', 'j', 2, 15000)], 'Forfait')

art('1.1', 1, 'Fouilles en rigole 0,60 x 1,25 m en terrain latéritique', 'm³', q['fouille_rig'],
    [mo('Manœuvre (1,5 m³/j en latérite compacte)', 1 / 1.5, MO['manoeuvre'])],
    f'80,00 x 0,60 x 1,25 = {q["fouille_rig"]:.2f} m³')
art('1.2', 1, 'Fouilles en puits 1,20 x 1,20 x 1,40 m pour semelles isolées (complément)', 'm³', q['fouille_puits'],
    [mo('Manœuvre (1,5 m³/j)', 1 / 1.5, MO['manoeuvre'])],
    f'17 x (1,20 x 1,20 x 1,40 - 0,60 x 1,20 x 1,25) = {q["fouille_puits"]:.2f} m³')
art('1.3', 1, 'Remblai des fouilles avec les terres extraites, compacté par couches de 20 cm', 'm³', q['remblai'],
    [mo('Manœuvre (4 m³/j)', 1 / 4, MO['manoeuvre']), mat('Dame sauteuse (20 m³/j)', 'j', 1 / 20, MAT['dame'])],
    f'Fouilles {fouilles:.2f} - volumes enterrés {vol_enterre:.2f} = {q["remblai"]:.2f} m³')
art('1.4', 1, 'Évacuation des terres excédentaires (foisonnement 1,25)', 'm³', q['evac'],
    [mo('Manœuvre - chargement (5 m³/j)', 1 / 5, MO['manoeuvre']),
     mat('Camion benne 10 m³ (voyage)', 'voy', 1 / 10, MAT['camion'])],
    f'({fouilles:.2f} - {q["remblai"]:.2f}) x 1,25 = {q["evac"]:.2f} m³')
art('1.5', 1, 'Traitement anti-termites des fonds de fouilles', 'm²', q['termite'],
    [m('termite', 1.0), mo('Manœuvre (25 m²/j)', 1 / 25, MO['manoeuvre'])],
    f'80,00 x 0,60 + 17 x (1,44 - 0,72) = {q["termite"]:.2f} m²')

art('2.1', 2, 'Béton de propreté dosé à 150 kg/m³, ép. 5 cm', 'm³', q['propre'], beton(150, 8),
    f'(80,00 - 17 x 1,20) x 0,60 x 0,05 + 17 x 1,20 x 1,20 x 0,05 = {q["propre"]:.2f} m³')
art('2.2', 2, 'Béton armé dosé à 350 kg/m³ pour semelles isolées 1,00 x 1,00 x 0,30', 'm³', q['sem_iso'], beton(350),
    f'17 x 1,00 x 1,00 x 0,30 = {q["sem_iso"]:.2f} m³')
art('2.3', 2, 'Béton armé dosé à 350 kg/m³ pour semelle filante 0,40 x 0,20', 'm³', q['sem_fil'], beton(350),
    f'(80,00 - 17 x 1,00) x 0,40 x 0,20 = {q["sem_fil"]:.2f} m³')
art('2.4', 2, 'Maçonnerie d\'agglos 15 pleins en fondation, h = 1,00 m, mortier dosé à 300 kg/m³', 'm²', q['agglo_fond'], AGGLO,
    f'(80,00 - 17 x 0,40) x 1,00 = {q["agglo_fond"]:.2f} m²')
art('2.5', 2, 'Béton armé dosé à 350 kg/m³ pour chaînage bas 15 x 20', 'm³', q['ch_bas'], beton(350),
    f'(80,00 - 17 x 0,40) x 0,15 x 0,20 = {q["ch_bas"]:.2f} m³')
art('2.6', 2, 'Chape d\'arase étanche (mortier dosé à 400 kg/m³ + hydrofuge) ép. 3 cm', 'm²', q['arase'],
    [m('ciment', 0.24), m('sable', 0.036), m('hydro', 0.5),
     mo('Maçon (15 m²/j)', 1 / 15, MO['macon']), mo('Manœuvre (15 m²/j)', 1 / 15, MO['manoeuvre'])],
    f'73,20 x 0,15 = {q["arase"]:.2f} m²')
art('2.7', 2, 'Coffrage en bois ordinaire (semelles isolées, chaînage bas)', 'm²', q['cof_fond'], COFFRAGE,
    f'17 x 4 x 1,00 x 0,30 + 2 x 0,20 x 73,20 = {q["cof_fond"]:.2f} m²')
art('2.8', 2, 'Armatures HA10 (FeE500) façonnées et posées - fondations', 'kg', q['HA10_2'], acier('HA10'),
    'Voir nomenclature des aciers')
art('2.9', 2, 'Armatures HA6 (FeE500) façonnées et posées - fondations', 'kg', q['HA6_2'], acier('HA6'),
    'Voir nomenclature des aciers')

art('3.1', 3, 'Maçonnerie d\'agglos 15 pleins en élévation, mortier dosé à 300 kg/m³ (y compris pignons)', 'm²', q['agglo_elev'], AGGLO,
    f'67,20 x (2,80 + 2,60) + 6,00 x 0,90 (au-dessus linteau) + 2 x {pignon_net:.2f} (pignons) = {q["agglo_elev"]:.2f} m²')
art('3.2', 3, 'Béton armé dosé à 350 kg/m³ pour piliers 15 x 40 (2 poteaux 15 x 20 jumelés), de -1,05 à +6,00', 'm³', q['piliers'], beton(350, 5),
    f'17 x 0,15 x 0,40 x 7,05 + 0,15 x 0,40 x 1,00 (pilier de pignon) = {q["piliers"]:.2f} m³')
art('3.3', 3, 'Béton armé dosé à 350 kg/m³ pour chaînage intermédiaire 15 x 20 à +3,00', 'm³', q['ch_int'], beton(350, 5),
    f'(80,00 - 17 x 0,40 - 6,00) x 0,15 x 0,20 = {q["ch_int"]:.2f} m³')
art('3.4', 3, 'Béton armé dosé à 350 kg/m³ pour chaînage haut 15 x 20 à +5,80', 'm³', q['ch_haut'], beton(350, 5),
    f'(80,00 - 17 x 0,40) x 0,15 x 0,20 = {q["ch_haut"]:.2f} m³')
art('3.5', 3, 'Béton armé dosé à 350 kg/m³ pour linteau de l\'entrée 15 x 40 (portée 6,00 m)', 'm³', q['linteau'], beton(350, 4),
    f'6,00 x 0,15 x 0,40 = {q["linteau"]:.2f} m³')
art('3.6', 3, 'Béton armé dosé à 350 kg/m³ pour chaînages rampants des pignons 15 x 15 (pente 20 %)', 'm³', q['ch_ramp'], beton(350, 4),
    f'4 x ({L_RAMP:.2f} - 0,20) x 0,15 x 0,15 = {q["ch_ramp"]:.2f} m³')
art('3.7', 3, 'Coffrage en bois ordinaire (piliers, chaînages, linteau, rampants)', 'm²', q['cof_elev'], COFFRAGE,
    f'Piliers 17 x 0,80 x 7,05 + 0,80 + chaînages 2 x 0,20 x (67,20 + 73,20) + linteau 0,95 x 6,00 + rampants = {q["cof_elev"]:.2f} m²')
art('3.8', 3, 'Armatures HA10 (FeE500) façonnées et posées - élévation', 'kg', q['HA10_3'], acier('HA10'),
    'Voir nomenclature des aciers')
art('3.9', 3, 'Armatures HA6 (FeE500) façonnées et posées - élévation', 'kg', q['HA6_3'], acier('HA6'),
    'Voir nomenclature des aciers')

art('4.1', 4, 'Enduit au mortier dosé à 300 kg/m³ ép. 2 cm, deux faces (intérieur + extérieur)', 'm²', q['enduit'],
    [m('ciment', 0.13), m('sable', 0.025), m('eau', 0.01),
     mo('Maçon (12 m²/j)', 1 / 12, MO['macon']), mo('Manœuvre (12 m²/j)', 1 / 12, MO['manoeuvre']),
     mat('Échafaudage (location)', 'm²', 1, 150)],
    f'Ext. 81,20 x 6,20 + int. 79,40 x 6,00 + pignons 2 x 2 x 5,00 - entrée 2 x 27,00 = {q["enduit"]:.2f} m²')
art('5.1', 5, 'Charpente métallique (fermes treillis + pannes + contreventements), ratio 17 kg/m² - à confirmer par note de calcul', 'kg', q['charpente'],
    [m('acier_ch', 1.05), mo('Soudeur (60 kg/j)', 1 / 60, MO['soud']), mo('Manœuvre (60 kg/j)', 1 / 60, MO['manoeuvre']),
     mat('Poste à souder, meuleuse, levage', 'kg', 1, 100)],
    f'17 kg/m² x 31,00 x 11,00 = {q["charpente"]:.2f} kg')
art('5.2', 5, 'Couverture en bac aluminium 6/10 sur pannes, pente 20 % (débords 0,50 m)', 'm²', q['couverture'],
    [m('bac', 1.10), mo('Couvreur (40 m²/j)', 1 / 40, MO['soud']), mo('Manœuvre (40 m²/j)', 1 / 40, MO['manoeuvre'])],
    f'2 x ({L_RAMP:.2f} + 0,50) x 31,00 = {q["couverture"]:.2f} m²')
art('5.3', 5, 'Faîtière aluminium', 'ml', q['faitage'],
    [m('faitiere', 1.05), mo('Couvreur (30 ml/j)', 1 / 30, MO['soud'])], '30,00 + 2 x 0,50 = 31,00 ml')
art('6.1', 6, 'Remblai en latérite d\'emprunt compacté ép. 20 cm sous dallage', 'm³', q['dal_remblai'],
    [m('laterite', 1.30), mo('Manœuvre (6 m³/j)', 1 / 6, MO['manoeuvre']), mat('Dame sauteuse (20 m³/j)', 'j', 1 / 20, MAT['dame'])],
    f'29,85 x 9,85 x 0,20 = {q["dal_remblai"]:.2f} m³')
art('6.2', 6, 'Film polyane + treillis soudé ST 25 sous/dans dallage', 'm²', q['dal_ts'],
    [m('polyane', 1.0), m('ts', 1.0), mo('Ferrailleur (80 m²/j)', 1 / 80, MO['ferr'])],
    f'29,85 x 9,85 x 1,10 (recouvrements) = {q["dal_ts"]:.2f} m²')
art('6.3', 6, 'Béton dosé à 350 kg/m³ pour dallage industriel ép. 12 cm, surfacé', 'm³', q['dal_beton'], beton(350, 8),
    f'29,85 x 9,85 x 0,12 = {q["dal_beton"]:.2f} m³')
art('7.1', 7, 'Portail métallique coulissant 6,00 x 4,50 m (tôle 15/10 sur cadre tubes, rail, peinture)', 'u', 1,
    [('Matériaux', 'Tubes, tôle, rail, roulettes, peinture', 'ft', 1, 1600000),
     mo('Soudeur', 15, MO['soud']), mo('Manœuvre', 15, MO['manoeuvre']),
     mat('Poste à souder, meuleuse', 'ft', 1, 150000)], 'Forfait')

# ------------------------------------------------------------------ CALCUL DS / PV
FC, FG, ALEA, BEN = 0.05, 0.08, 0.02, 0.10
K = (1 + FC) / (1 - (FG + ALEA + BEN))
TVA = 0.18

def r5(x):
    return int(5 * round(x / 5))

for a in ART:
    tot = {'Matériaux': 0, 'Main-d\'œuvre': 0, 'Matériel': 0}
    for nat, lib, u, qq, pu in a['comp']:
        tot[nat] += qq * pu
    # petit outillage : 3 % de la main-d'œuvre
    tot['Matériel'] += 0.03 * tot['Main-d\'œuvre']
    a['ds_nat'] = tot
    a['ds_u'] = sum(tot.values())
    a['ds_tot'] = a['ds_u'] * a['q']
    a['pv_u'] = r5(a['ds_u'] * K)
    a['pv_tot'] = a['pv_u'] * a['q']

# besoins matériaux globaux
def besoins(base_only):
    need = {}
    for a in ART:
        if base_only and dict((l[0], l[2]) for l in LOTS)[a['lot']]:
            continue
        for nat, lib, u, qq, pu in a['comp']:
            if nat == 'Matériaux':
                k = (lib, u, pu)
                need[k] = need.get(k, 0) + qq * a['q']
    return need

if __name__ == '__main__':
    for k, v in q.items():
        print(f'{k:14s} {v:10.2f}')
    print('K =', round(K, 4))
    for a in ART:
        print(a['code'], a['u'], a['q'], round(a['ds_u']), a['pv_u'], round(a['pv_tot']))
    base = sum(a['ds_tot'] for a in ART if a['lot'] <= 3)
    opt = sum(a['ds_tot'] for a in ART if a['lot'] > 3)
    print('DS base', round(base), 'DS opt', round(opt))
    print('PV base', sum(a['pv_tot'] for a in ART if a['lot'] <= 3))
