# -*- coding: utf-8 -*-
"""Identité de l'entreprise (extraite du devis ASC du 16/02/2026 adressé à NUCLEUS SA)."""
import os
NOM = 'ASSEYA SILVER CONSTRUCTION'
SIGLE = 'ASC'
ACTIVITE = 'Construction métallique et bâtiment'
VILLE = 'Bouaké'
TEL = '07 08 39 02 66 / 05 05 10 76 82'
EMAIL = 'asseyasilver@gmail.com'
CC = '2245191 D'
RCCM = 'CI-BKE-01-2022-B13-00153'
BANQUE = 'Bank of Africa - compte n° 004619070000'
IMPOT = 'TEE - Bouaké 1'
LOGO = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'logo_asc.jpg')
AUTEUR = 'Moulo Jean Claude'
FONCTION = 'Technicien Génie Civil BTP'
LIGNE_CONTACT = f'{VILLE} - Tél : {TEL} - Email : {EMAIL}'
LIGNE_LEGALE = f'N° CC : {CC} - RCCM : {RCCM} - {BANQUE} - Impôts : {IMPOT}'
