# -*- coding: utf-8 -*-
"""Interface de compatibilité : expose le modèle unique (modele.py) aux générateurs Word."""
import modele as Mo
_rows = Mo.compute()
V = Mo.V
LOTS = Mo.LOTS
ART = Mo.ARTS
for _a in ART:
    _a['metre'] = Mo.metre_txt(_a['f'])
    _a['comp_v'] = [(nat, lib, u, Mo.ev(q), Mo.PX[code][2]) for nat, lib, code, u, q in _a['comp']]
acier_detail = [(lot, elt, nu, lg) for lot, elt, nu, lg, _ in _rows]
KG = {'HA12': V['p_KG12'], 'HA10': V['p_KG10'], 'HA6': V['p_KG6']}
CHUTES = V['p_CHUTES']
K, FC, FG, ALEA, BEN, TVA = (V[n] for n in ('p_K', 'p_FC', 'p_FG', 'p_ALEA', 'p_BEN', 'p_TVA'))
N_PIL = int(V['p_NPIL'])
PRIX = Mo.PRIX
def besoins(base_only):
    return {(Mo.PX[c][0], Mo.PX[c][1], Mo.PX[c][2]): q for c, q in Mo.besoins(base_only).items()}
