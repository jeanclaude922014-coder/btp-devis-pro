# -*- coding: utf-8 -*-
"""Esquisse : plan, façades, coupe, détails de ferraillage."""
import os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle, Polygon, Circle, FancyArrowPatch

OUT = os.environ.get('OUT', '.')
C_MUR = '#d9c7a3'; C_BA = '#7f8c8d'; C_TXT = '#1a1a1a'; C_COTE = '#c0392b'; C_ROOF = '#9fb6c9'
L, B = 30.0, 10.0
XP = [0, 5, 10, 15, 20, 25, 30]

def cote(ax, x1, y1, x2, y2, txt, off=0.0, vertical=False, fs=8):
    ax.annotate('', xy=(x1, y1), xytext=(x2, y2),
                arrowprops=dict(arrowstyle='<|-|>', color=C_COTE, lw=0.8, mutation_scale=7))
    xm, ym = (x1 + x2) / 2, (y1 + y2) / 2
    if vertical:
        ax.text(xm + off, ym, txt, color=C_COTE, fontsize=fs, rotation=90, ha='center', va='center',
                bbox=dict(fc='white', ec='none', pad=0.5))
    else:
        ax.text(xm, ym + off, txt, color=C_COTE, fontsize=fs, ha='center', va='center',
                bbox=dict(fc='white', ec='none', pad=0.5))

def cartouche(fig, titre, ech):
    fig.text(0.01, 0.01, f'Projet : Bâtiment industriel 30 x 10 m - {titre} - {ech}', fontsize=8, color='#555')
    fig.text(0.99, 0.01, 'Esquisse établie par Moulo Jean Claude - Technicien génie civil BTP - Abidjan', fontsize=8,
             color='#555', ha='right')

# ------------------------------------------------------------------ 1. PLAN
def plan():
    fig, ax = plt.subplots(figsize=(14, 6.8))
    t = 0.15
    walls = [(-t/2, -t/2, L + t, t), (-t/2, B - t/2, L + t, t), (-t/2, -t/2, t, B + t),
             (L - t/2, -t/2, t, 2.0 + t/2), (L - t/2, 8.0, t, 2.0 + t/2)]
    for x, y, w, h in walls:
        ax.add_patch(Rectangle((x, y), w, h, fc=C_MUR, ec='k', lw=0.8))
    pil = [(x, 0, 'h') for x in XP] + [(x, B, 'h') for x in XP] + [(0, 5, 'v'), (L, 1.8, 'v'), (L, 8.2, 'v')]
    for x, y, o in pil:
        w, h = (0.40, 0.15) if o == 'h' else (0.15, 0.40)
        if (x, y) in [(L, 0), (L, B)]:
            pass
        ax.add_patch(Rectangle((x - w/2, y - h/2), w, h, fc='#2c3e50', ec='k', lw=0.6, zorder=3))
        if o == 'h':
            ax.plot([x, x], [y - h/2, y + h/2], color='white', lw=0.6, zorder=4)
        else:
            ax.plot([x - w/2, x + w/2], [y, y], color='white', lw=0.6, zorder=4)
    # portail
    ax.plot([L, L], [2.0, 8.0], color='#2980b9', lw=1.2, ls='--')
    ax.annotate('', xy=(L - 1.6, 5), xytext=(L + 1.6, 5),
                arrowprops=dict(arrowstyle='-|>', color='#2980b9', lw=1.5))
    ax.text(L + 0.6, 5.6, 'ENTRÉE\n6,00 m\n(portail\ncoulissant)', fontsize=8, color='#2980b9', ha='left', va='bottom')
    # axes
    for i, x in enumerate(XP):
        ax.plot([x, x], [-2.6, B + 1.2], color='#888', lw=0.4, ls='-.')
        ax.add_patch(Circle((x, B + 1.6), 0.38, fc='white', ec='k', lw=0.7))
        ax.text(x, B + 1.6, str(i + 1), ha='center', va='center', fontsize=8)
    for lab, y in zip('ABC', [0, 5, B]):
        ax.plot([-1.2, L + 0.6], [y, y], color='#888', lw=0.4, ls='-.')
        ax.add_patch(Circle((-1.6, y), 0.38, fc='white', ec='k', lw=0.7))
        ax.text(-1.6, y, lab, ha='center', va='center', fontsize=8)
    for i in range(6):
        cote(ax, XP[i], -1.5, XP[i + 1], -1.5, '5,00')
    cote(ax, 0, -2.5, L, -2.5, '30,00 m entre axes')
    cote(ax, -2.6, 0, -2.6, B, '10,00 m', vertical=True)
    cote(ax, L + 2.9, 0, L + 2.9, 2.0, '2,00', vertical=True)
    cote(ax, L + 2.9, 2.0, L + 2.9, 8.0, '6,00', vertical=True)
    cote(ax, L + 2.9, 8.0, L + 2.9, B, '2,00', vertical=True)
    ax.text(L / 2, B / 2, 'HALL INDUSTRIEL\nSurface utile ≈ 294 m²\nHauteur sous chaînage haut : 5,80 m',
            ha='center', va='center', fontsize=11, color=C_TXT, weight='bold')
    # coupe A-A
    ax.plot([12.5, 12.5], [-1.0, B + 1.0], color='k', lw=1.4, ls=(0, (6, 2, 1, 2)))
    for y in (-1.0, B + 1.0):
        ax.annotate('', xy=(11.3, y), xytext=(12.5, y), arrowprops=dict(arrowstyle='-|>', lw=1.2))
        ax.text(12.9, y, 'A', fontsize=10, weight='bold', va='center')
    # nord
    ax.annotate('N', xy=(-3.6, B + 1.6), xytext=(-3.6, B - 0.2), ha='center', fontsize=10, weight='bold',
                arrowprops=dict(arrowstyle='-|>', lw=1.5))
    # légende
    ax.add_patch(Rectangle((2, -4.0), 0.8, 0.35, fc=C_MUR, ec='k', lw=0.6))
    ax.text(3.0, -3.83, 'Mur agglos 15 pleins', fontsize=8, va='center')
    ax.add_patch(Rectangle((10, -4.0), 0.8, 0.35, fc='#2c3e50', ec='k', lw=0.6))
    ax.text(11.0, -3.83, 'Pilier BA 15x40 = 2 poteaux 15x20 jumelés (17 u)', fontsize=8, va='center')
    ax.plot([22.5, 23.3], [-3.83, -3.83], color='#2980b9', ls='--')
    ax.text(23.5, -3.83, 'Portail 6,00 x 4,50', fontsize=8, va='center')
    ax.set_xlim(-4.5, L + 4.5); ax.set_ylim(-4.6, B + 2.4)
    ax.set_aspect('equal'); ax.axis('off')
    ax.set_title('PLAN DE MASSE / PLAN DE NIVEAU - Implantation des piliers', fontsize=12, weight='bold')
    cartouche(fig, 'Plan', 'Éch. 1/150 (indicative)')
    fig.tight_layout(); fig.savefig(f'{OUT}/01_plan.png', dpi=200); plt.close(fig)

def bandes_elevation(ax, x0, x1, door=None):
    """mur + chaînages entre x0 et x1, avec éventuelle ouverture (xa, xb, h)."""
    ax.add_patch(Rectangle((x0, -1.05), x1 - x0, 1.05, fc=C_MUR, ec='k', lw=0.5, hatch='..', alpha=0.6))
    ax.add_patch(Rectangle((x0, 0), x1 - x0, 6.0, fc=C_MUR, ec='k', lw=0.6))
    for z, h in [(0, 0.20), (5.80, 0.20)]:
        ax.add_patch(Rectangle((x0, z), x1 - x0, h, fc=C_BA, ec='k', lw=0.5))
    if door:
        xa, xb, hd = door
        ax.add_patch(Rectangle((x0, 3.0), xa - x0, 0.2, fc=C_BA, ec='k', lw=0.5))
        ax.add_patch(Rectangle((xb, 3.0), x1 - xb, 0.2, fc=C_BA, ec='k', lw=0.5))
        ax.add_patch(Rectangle((xa, 0), xb - xa, hd, fc='#d6e4f0', ec='#2980b9', lw=1.0))
        for k in range(1, 12):
            xx = xa + k * (xb - xa) / 12
            ax.plot([xx, xx], [0, hd], color='#2980b9', lw=0.4)
        ax.add_patch(Rectangle((xa - 0.2, hd), xb - xa + 0.4, 0.40, fc=C_BA, ec='k', lw=0.6))
    else:
        ax.add_patch(Rectangle((x0, 3.0), x1 - x0, 0.2, fc=C_BA, ec='k', lw=0.5))
    ax.plot([x0 - 1.5, x1 + 1.5], [0, 0], color='#6d4c41', lw=2)
    ax.text(x0 - 1.4, 0.08, 'TN ±0,00', fontsize=7, color='#6d4c41')

def niveaux(ax, x, items):
    for z, t in items:
        ax.plot([x - 0.25, x + 0.25], [z, z], color=C_COTE, lw=0.8)
        ax.text(x + 0.35, z, t, fontsize=7, color=C_COTE, va='center')

# ------------------------------------------------------------------ 2. FAÇADE LONG PAN
def facade_long():
    fig, ax = plt.subplots(figsize=(14, 5.2))
    bandes_elevation(ax, -0.075, L + 0.075)
    for x in XP:
        ax.add_patch(Rectangle((x - 0.2, -1.05), 0.4, 7.05, fc='#2c3e50', ec='k', lw=0.5, alpha=0.85))
    # toiture vue en long pan (égout à +5,90, faîtage +7,00)
    ax.add_patch(Polygon([(-0.5, 5.90), (L + 0.5, 5.90), (L + 0.5, 7.0), (-0.5, 7.0)], fc=C_ROOF, ec='k', lw=0.7))
    for k in range(0, 62):
        xx = -0.5 + k * 0.5
        ax.plot([xx, xx], [5.90, 7.0], color='#6b8aa3', lw=0.3)
    ax.text(L / 2, 6.45, 'Couverture bac alu 6/10 - pente 20 %', ha='center', fontsize=8,
            bbox=dict(fc='white', ec='none', pad=1))
    ax.add_patch(Rectangle((-0.075, -1.25), L + 0.15, 0.20, fc=C_BA, ec='k', lw=0.4, alpha=0.5))
    niveaux(ax, L + 1.0, [(-1.05, '-1,05 dessus semelle'),
                          (0.20, '+0,20 chaînage bas'), (3.20, '+3,00/+3,20 chaînage interm.'),
                          (6.00, '+6,00 chaînage haut'), (7.00, '+7,00 faîtage')])
    for i in range(6):
        cote(ax, XP[i], -1.8, XP[i + 1], -1.8, '5,00')
    ax.text(12.5, 1.6, 'Agglos 15 pleins', ha='center', fontsize=9)
    ax.text(12.5, 4.4, 'Agglos 15 pleins', ha='center', fontsize=9)
    ax.text(12.5, -0.6, 'Maçonnerie de fondation h = 1,00 m (agglos 15 pleins)', ha='center', fontsize=8, bbox=dict(fc='white', ec='none', pad=1))
    ax.set_xlim(-2, L + 6.5); ax.set_ylim(-2.3, 7.8); ax.set_aspect('equal'); ax.axis('off')
    ax.set_title('FAÇADE NORD (long pan, identique façade Sud) - 7 piliers espacés de 5,00 m', fontsize=12, weight='bold')
    cartouche(fig, 'Façade long pan', 'Éch. 1/150 (indicative)')
    fig.tight_layout(); fig.savefig(f'{OUT}/02_facade_long_pan.png', dpi=200); plt.close(fig)

# ------------------------------------------------------------------ 3. PIGNON AVEC ENTRÉE
def pignon():
    fig, ax = plt.subplots(figsize=(10, 7))
    bandes_elevation(ax, -0.075, B + 0.075, door=(2.0, 8.0, 4.50))
    tri = Polygon([(-0.075, 6.0), (B / 2, 7.0), (B + 0.075, 6.0)], fc=C_MUR, ec='k', lw=0.6)
    ax.add_patch(tri)
    for s in (1, -1):
        x0 = 0 if s == 1 else B
        ax.add_patch(Polygon([(x0, 6.0), (B / 2, 7.0), (B / 2, 7.15), (x0, 6.15)], fc=C_BA, ec='k', lw=0.5))
    ax.plot([-0.6, B / 2, B + 0.6], [5.88, 7.17, 5.88], color='#34495e', lw=2.5)
    for x in (0, 1.8, 8.2, B):
        ax.add_patch(Rectangle((x - 0.2, -1.05), 0.4, 7.05, fc='#2c3e50', ec='k', lw=0.5, alpha=0.85))
    ax.text(5.0, 2.2, 'PORTAIL MÉTALLIQUE\nCOULISSANT\n6,00 x 4,50 m', ha='center', fontsize=9, color='#1f618d',
            weight='bold', bbox=dict(fc='white', ec='none', pad=1))
    ax.text(5.0, 4.70, 'Linteau BA 15x40', ha='center', fontsize=7, color='white')
    ax.text(2.2, 5.55, 'pente 20 %', fontsize=9, rotation=11.3, color=C_COTE)
    ax.text(6.1, 5.55, 'pente 20 %', fontsize=9, rotation=-11.3, color=C_COTE)
    cote(ax, 2.0, -1.6, 8.0, -1.6, '6,00 (entrée)')
    cote(ax, 0, -2.2, B, -2.2, '10,00 m')
    cote(ax, 9.0, 0, 9.0, 4.5, '4,50', vertical=True)
    niveaux(ax, B + 0.8, [(-1.05, '-1,05'), (0.0, '±0,00'), (3.2, '+3,20'), (4.9, '+4,90 sous-face'),
                          (6.0, '+6,00'), (7.0, '+7,00 faîtage')])
    ax.set_xlim(-2, B + 3.2); ax.set_ylim(-2.7, 7.8); ax.set_aspect('equal'); ax.axis('off')
    ax.set_title('PIGNON EST - FAÇADE D\'ENTRÉE (toiture 2 versants, pente 20 %)', fontsize=12, weight='bold')
    cartouche(fig, 'Pignon Est', 'Éch. 1/100 (indicative)')
    fig.tight_layout(); fig.savefig(f'{OUT}/03_pignon_entree.png', dpi=200); plt.close(fig)

# ------------------------------------------------------------------ 4. COUPE A-A
def coupe():
    fig, ax = plt.subplots(figsize=(12, 7.5))
    ax.add_patch(Rectangle((-2, -1.6), B + 4, 1.6, fc='#e8d8c3', ec='none', alpha=0.5))
    ax.plot([-2, B + 2], [0, 0], color='#6d4c41', lw=2)
    for xw in (0, B):
        ax.add_patch(Rectangle((xw - 0.30, -1.30), 0.60, 0.05, fc='#bbb', ec='k', lw=0.4))      # propreté
        ax.add_patch(Rectangle((xw - 0.20, -1.25), 0.40, 0.20, fc=C_BA, ec='k', lw=0.6))       # semelle
        ax.add_patch(Rectangle((xw - 0.075, -1.05), 0.15, 1.05, fc=C_MUR, ec='k', lw=0.6, hatch='///'))
        ax.add_patch(Rectangle((xw - 0.075, 0), 0.15, 0.20, fc=C_BA, ec='k', lw=0.6))
        ax.add_patch(Rectangle((xw - 0.075, 0.20), 0.15, 2.80, fc=C_MUR, ec='k', lw=0.6, hatch='///'))
        ax.add_patch(Rectangle((xw - 0.075, 3.00), 0.15, 0.20, fc=C_BA, ec='k', lw=0.6))
        ax.add_patch(Rectangle((xw - 0.075, 3.20), 0.15, 2.60, fc=C_MUR, ec='k', lw=0.6, hatch='///'))
        ax.add_patch(Rectangle((xw - 0.075, 5.80), 0.15, 0.20, fc=C_BA, ec='k', lw=0.6))
        ax.plot([xw - 0.30, xw - 0.30, xw + 0.30, xw + 0.30], [0, -1.30, -1.30, 0], color='k', lw=0.5, ls=':')
    # pilier de pignon vu en arrière-plan
    ax.add_patch(Rectangle((B / 2 - 0.2, 0), 0.4, 7.0, fc='none', ec='#555', lw=0.6, ls='--'))
    # ferme métallique schématique
    E = 6.0
    ax.plot([-0.6, B / 2, B + 0.6], [E - 0.12, E + 1.0, E - 0.12], color='#34495e', lw=2.5)
    ax.plot([0, B], [E, E], color='#34495e', lw=1.4)
    for x in [1.25, 2.5, 3.75, 5.0, 6.25, 7.5, 8.75]:
        ztop = E + (x if x <= 5 else B - x) * 0.2
        ax.plot([x, x], [E, ztop], color='#34495e', lw=0.8)
    for x0, x1 in [(0, 1.25), (1.25, 2.5), (2.5, 3.75), (3.75, 5.0)]:
        ax.plot([x0, x1], [E, E + x1 * 0.2], color='#34495e', lw=0.6)
        ax.plot([B - x0, B - x1], [E, E + x1 * 0.2], color='#34495e', lw=0.6)
    ax.text(B / 2, E + 1.35, 'Ferme métallique + pannes + bac alu (option)', ha='center', fontsize=8)
    ax.text(2.0, E + 0.55, '20 %', fontsize=9, color=C_COTE, rotation=11.3)
    ax.text(7.4, E + 0.55, '20 %', fontsize=9, color=C_COTE, rotation=-11.3)
    # dallage option
    ax.add_patch(Rectangle((0.075, 0.0), B - 0.15, 0.12, fc='#d0d3d4', ec='k', lw=0.4))
    ax.text(B / 2, 0.35, 'Dallage BA ép. 12 cm sur latérite compactée (option)', ha='center', fontsize=7)
    # cotes
    cote(ax, 0, -2.0, B, -2.0, '10,00 m entre axes')
    niveaux(ax, B + 0.9, [(-1.30, '-1,30 fond de fouille'), (-1.05, '-1,05'), (-0.10, '±0,00 TN'), (0.25, '+0,20'),
                          (3.00, '+3,00'), (3.20, '+3,20'), (5.80, '+5,80'), (6.00, '+6,00'), (7.00, '+7,00 faîtage')])
    ax.annotate('Chaînage haut 15x20\n4 HA10 + cad. HA6 e=20', xy=(0, 5.9), xytext=(-2.6, 5.0), fontsize=7,
                arrowprops=dict(arrowstyle='->', lw=0.6))
    ax.annotate('Chaînage intermédiaire\n15x20 - 4 HA10', xy=(0, 3.1), xytext=(-2.6, 2.3), fontsize=7,
                arrowprops=dict(arrowstyle='->', lw=0.6))
    ax.annotate('Chaînage bas 15x20\n4 HA10 + arase étanche', xy=(0, 0.1), xytext=(-2.6, 0.9), fontsize=7,
                arrowprops=dict(arrowstyle='->', lw=0.6))
    ax.annotate('Agglos 15 pleins\nen fondation h=1,00', xy=(0, -0.5), xytext=(-2.6, -0.8), fontsize=7,
                arrowprops=dict(arrowstyle='->', lw=0.6))
    ax.annotate('Semelle filante 40x20\n4 HA10 + HA6 e=20\nBéton propreté 5 cm', xy=(0, -1.15), xytext=(-2.6, -1.9),
                fontsize=7, arrowprops=dict(arrowstyle='->', lw=0.6))
    ax.set_xlim(-3.2, B + 3.6); ax.set_ylim(-2.5, 7.8); ax.set_aspect('equal'); ax.axis('off')
    ax.set_title('COUPE TRANSVERSALE A-A', fontsize=12, weight='bold')
    cartouche(fig, 'Coupe A-A', 'Éch. 1/75 (indicative)')
    fig.tight_layout(); fig.savefig(f'{OUT}/04_coupe_AA.png', dpi=200); plt.close(fig)

# ------------------------------------------------------------------ 5. DÉTAILS DE FERRAILLAGE
def section(ax, b, h, bars, cadres, titre, sous_titre, c=0.025):
    ax.add_patch(Rectangle((0, 0), b, h, fc='#ecf0f1', ec='k', lw=1.2))
    for (x0, y0, x1, y1) in cadres:
        ax.add_patch(Rectangle((x0, y0), x1 - x0, y1 - y0, fc='none', ec='#c0392b', lw=1.2))
    for x, y in bars:
        ax.add_patch(Circle((x, y), 0.006, fc='k'))
    ax.set_xlim(-0.08, b + 0.08); ax.set_ylim(-0.10, h + 0.06); ax.set_aspect('equal'); ax.axis('off')
    ax.set_title(titre, fontsize=10, weight='bold')
    ax.text(b / 2, -0.07, sous_titre, ha='center', fontsize=8, va='top')
    cote(ax, 0, h + 0.03, b, h + 0.03, f'{int(b*100)}', fs=7)
    cote(ax, -0.05, 0, -0.05, h, f'{int(h*100)}', vertical=True, fs=7)

def details():
    fig, axs = plt.subplots(1, 4, figsize=(14, 5.4), gridspec_kw={'width_ratios': [1, 1.4, 1.6, 1.6]})
    c = 0.03
    section(axs[0], 0.15, 0.20, [(c, c), (0.15 - c, c), (c, 0.2 - c), (0.15 - c, 0.2 - c)],
            [(c - 0.008, c - 0.008, 0.15 - c + 0.008, 0.2 - c + 0.008)],
            'Chaînages 15x20', '4 HA10\nCadres HA6 e = 20 cm\n(bas, intermédiaire, haut)')
    bars = []
    for x0 in (0, 0.20):
        bars += [(x0 + c, c), (x0 + 0.20 - c, c), (x0 + c, 0.15 - c), (x0 + 0.20 - c, 0.15 - c)]
    bars = [(y, x) for x, y in bars]
    section(axs[1], 0.15, 0.40, bars,
            [(c - 0.008, c - 0.008, 0.15 - c + 0.008, 0.20 - c + 0.008),
             (c - 0.008, 0.20 + c - 0.008, 0.15 - c + 0.008, 0.40 - c + 0.008)],
            'Pilier 15x40', '= 2 poteaux 15x20 jumelés\n8 HA10 - 2 cadres HA6 / niveau\ne = 15 cm (10 cm en pied et tête)')
    # semelle isolée (vue en plan)
    ax = axs[2]
    ax.add_patch(Rectangle((0, 0), 1.0, 1.0, fc='#ecf0f1', ec='k', lw=1.2))
    for k in range(7):
        p = 0.05 + k * 0.15
        ax.plot([0.04, 0.96], [p, p], color='k', lw=1.0)
        ax.plot([p, p], [0.04, 0.96], color='#555', lw=1.0)
    ax.add_patch(Rectangle((0.425, 0.30), 0.15, 0.40, fc='#2c3e50', ec='k'))
    ax.set_xlim(-0.15, 1.15); ax.set_ylim(-0.30, 1.15); ax.set_aspect('equal'); ax.axis('off')
    ax.set_title('Semelle isolée 100x100x30', fontsize=10, weight='bold')
    ax.text(0.5, -0.08, '2 x 7 HA10 e = 15 cm (avec retours 15 cm)\nBéton 350 kg/m³ - propreté 5 cm\nEnrobage 4 cm (XC2, sol latéritique)',
            ha='center', va='top', fontsize=8)
    cote(ax, 0, 1.06, 1.0, 1.06, '100', fs=7)
    # semelle filante coupe
    ax = axs[3]
    ax.add_patch(Rectangle((0, 0), 0.60, 0.05, fc='#bbb', ec='k'))
    ax.add_patch(Rectangle((0.10, 0.05), 0.40, 0.20, fc='#ecf0f1', ec='k', lw=1.2))
    for x in (0.14, 0.247, 0.353, 0.46):
        ax.add_patch(Circle((x, 0.10), 0.006, fc='k'))
    ax.plot([0.13, 0.47], [0.088, 0.088], color='#c0392b', lw=1.2)
    ax.add_patch(Rectangle((0.225, 0.25), 0.15, 0.55, fc=C_MUR, ec='k', hatch='///'))
    ax.add_patch(Rectangle((0.225, 0.80), 0.15, 0.20, fc='#ecf0f1', ec='k', lw=1.2))
    for x, y in [(0.255, 0.83), (0.345, 0.83), (0.255, 0.97), (0.345, 0.97)]:
        ax.add_patch(Circle((x, y), 0.006, fc='k'))
    ax.add_patch(Rectangle((0.247, 0.822), 0.106, 0.156, fc='none', ec='#c0392b', lw=1.0))
    ax.text(0.40, 0.52, 'Agglos 15 pleins\nh = 1,00 m\n(coupe interrompue)', ha='left', fontsize=7)
    ax.set_xlim(-0.1, 0.85); ax.set_ylim(-0.30, 1.08); ax.set_aspect('equal'); ax.axis('off')
    ax.set_title('Fondation filante', fontsize=10, weight='bold')
    ax.text(0.30, -0.04, 'Semelle 40x20 : 4 HA10 filants\n+ répartiteurs HA6 e = 20 cm\nChaînage bas 15x20 : 4 HA10',
            ha='center', va='top', fontsize=8)
    fig.suptitle('DÉTAILS DE FERRAILLAGE TYPE (acier FeE500 - béton C25/30, BAEL 91 mod. 99 / EC2)', fontsize=12,
                 weight='bold')
    cartouche(fig, 'Détails', 'Éch. 1/10 (indicative)')
    fig.tight_layout(rect=(0, 0.03, 1, 0.95)); fig.savefig(f'{OUT}/05_details_ferraillage.png', dpi=200); plt.close(fig)

if __name__ == '__main__':
    plan(); facade_long(); pignon(); coupe(); details()
