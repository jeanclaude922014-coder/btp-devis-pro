# -*- coding: utf-8 -*-
"""Esquisse : plan, façades, coupe, détails - piliers IPE 220 + 2 poteaux BA, contreventements L50x50x5.
Auteur : Moulo Jean Claude."""
import os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle, Polygon, Circle

OUT = os.environ.get('OUT', '.')
C_MUR = '#d9c7a3'; C_BA = '#7f8c8d'; C_TXT = '#1a1a1a'; C_COTE = '#c0392b'; C_ROOF = '#9fb6c9'
C_IPE = '#1b4f72'; C_CV = '#d35400'; C_LAT = '#c8a27a'
L, B = 30.0, 10.0
XP = [0, 5, 10, 15, 20, 25, 30]
H = 6.0; FL = 1.0

def cote(ax, x1, y1, x2, y2, txt, off=0.0, vertical=False, fs=8):
    ax.annotate('', xy=(x1, y1), xytext=(x2, y2),
                arrowprops=dict(arrowstyle='<|-|>', color=C_COTE, lw=0.8, mutation_scale=7))
    xm, ym = (x1 + x2) / 2, (y1 + y2) / 2
    ax.text(xm + (off if vertical else 0), ym + (0 if vertical else off), txt, color=C_COTE, fontsize=fs,
            rotation=90 if vertical else 0, ha='center', va='center', bbox=dict(fc='white', ec='none', pad=0.5))

def cartouche(fig, titre, ech):
    fig.text(0.01, 0.01, f'Projet : Bâtiment industriel 30 x 10 m - {titre} - {ech}', fontsize=8, color='#555')
    fig.text(0.99, 0.01, 'Esquisse établie par Moulo Jean Claude - Technicien génie civil BTP - Abidjan', fontsize=8,
             color='#555', ha='right')

def niveaux(ax, x, items):
    for z, t in items:
        ax.plot([x - 0.25, x + 0.25], [z, z], color=C_COTE, lw=0.8)
        ax.text(x + 0.35, z, t, fontsize=7, color=C_COTE, va='center')

# ------------------------------------------------------------------ pilier en plan
def pilier_plan(ax, x, y, horiz):
    """IPE 220 (aile 0,11 le long du mur, hauteur 0,22 en travers) + 2 poteaux BA 15x15."""
    if horiz:
        ax.add_patch(Rectangle((x - 0.205, y - 0.075), 0.15, 0.15, fc=C_BA, ec='k', lw=0.4, zorder=3))
        ax.add_patch(Rectangle((x + 0.055, y - 0.075), 0.15, 0.15, fc=C_BA, ec='k', lw=0.4, zorder=3))
        ax.add_patch(Rectangle((x - 0.055, y - 0.11), 0.11, 0.22, fc=C_IPE, ec='k', lw=0.4, zorder=4))
    else:
        ax.add_patch(Rectangle((x - 0.075, y - 0.205), 0.15, 0.15, fc=C_BA, ec='k', lw=0.4, zorder=3))
        ax.add_patch(Rectangle((x - 0.075, y + 0.055), 0.15, 0.15, fc=C_BA, ec='k', lw=0.4, zorder=3))
        ax.add_patch(Rectangle((x - 0.11, y - 0.055), 0.22, 0.11, fc=C_IPE, ec='k', lw=0.4, zorder=4))
    ax.add_patch(Rectangle((x - 0.4, y - 0.4), 0.8, 0.8, fc='none', ec='#7f8c8d', lw=0.6, ls='--', zorder=2))

# ------------------------------------------------------------------ 1. PLAN
def plan():
    fig, ax = plt.subplots(figsize=(14, 7.2))
    t = 0.15
    for x, y, w, h in [(-t/2, -t/2, L + t, t), (-t/2, B - t/2, L + t, t), (-t/2, -t/2, t, B + t),
                       (L - t/2, -t/2, t, 2.0 + t/2), (L - t/2, 8.0, t, 2.0 + t/2)]:
        ax.add_patch(Rectangle((x, y), w, h, fc=C_MUR, ec='k', lw=0.8))
    for x in XP:
        pilier_plan(ax, x, 0, True); pilier_plan(ax, x, B, True)
    for y in (5, ):
        pilier_plan(ax, 0, y, False)
    pilier_plan(ax, L, 1.8, False); pilier_plan(ax, L, 8.2, False)
    # dallage
    ax.add_patch(Rectangle((0.075, 0.075), L - 0.15, B - 0.15, fc='#eef2f5', ec='none', zorder=0))
    # contreventements : palées verticales (long pans, travées 1-2 et 6-7) et poutre au vent (toiture)
    for x0 in (0, 25):
        for y in (0, B):
            ax.plot([x0 + 0.3, x0 + 4.7], [y + (0.35 if y == 0 else -0.35)] * 2, color=C_CV, lw=3, solid_capstyle='butt')
        for yy in ((0, 5), (5, 10)):
            ax.plot([x0, x0 + 5], [yy[0], yy[1]], color=C_CV, lw=0.8, ls='--')
            ax.plot([x0, x0 + 5], [yy[1], yy[0]], color=C_CV, lw=0.8, ls='--')
    # portail
    ax.plot([L, L], [2.0, 8.0], color='#2980b9', lw=1.2, ls='--')
    ax.annotate('', xy=(L - 1.6, 5), xytext=(L + 1.6, 5), arrowprops=dict(arrowstyle='-|>', color='#2980b9', lw=1.5))
    ax.text(L + 0.6, 5.6, 'ENTRÉE\n6,00 m\n(portail\ncoulissant)', fontsize=8, color='#2980b9', ha='left', va='bottom')
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
    ax.text(L / 2, B / 2, 'HALL INDUSTRIEL - surface utile ≈ 294 m²\nDallage BA 20 cm double nappe HA10 e = 20\n'
            'sur latérite compactée 2 x 20 cm', ha='center', va='center', fontsize=10, color=C_TXT, weight='bold')
    ax.plot([12.5, 12.5], [-1.0, B + 1.0], color='k', lw=1.4, ls=(0, (6, 2, 1, 2)))
    for y in (-1.0, B + 1.0):
        ax.annotate('', xy=(11.3, y), xytext=(12.5, y), arrowprops=dict(arrowstyle='-|>', lw=1.2))
        ax.text(12.9, y, 'A', fontsize=10, weight='bold', va='center')
    ax.annotate('N', xy=(-3.6, B + 1.6), xytext=(-3.6, B - 0.2), ha='center', fontsize=10, weight='bold',
                arrowprops=dict(arrowstyle='-|>', lw=1.5))
    # légende
    y0 = -3.9
    ax.add_patch(Rectangle((0, y0 - 0.17), 0.7, 0.35, fc=C_MUR, ec='k', lw=0.6)); ax.text(0.9, y0, 'Mur agglos 15 pleins', fontsize=8, va='center')
    ax.add_patch(Rectangle((6.2, y0 - 0.17), 0.25, 0.35, fc=C_IPE, ec='k', lw=0.6))
    ax.add_patch(Rectangle((6.5, y0 - 0.12), 0.25, 0.25, fc=C_BA, ec='k', lw=0.6))
    ax.text(6.95, y0, 'Pilier IPE 220 + 2 poteaux BA 15x15 (17 u)', fontsize=8, va='center')
    ax.add_patch(Rectangle((15.4, y0 - 0.3), 0.6, 0.6, fc='none', ec='#7f8c8d', ls='--'))
    ax.text(16.2, y0, 'Semelle isolée 80x80', fontsize=8, va='center')
    ax.plot([20.3, 21.1], [y0, y0], color=C_CV, lw=3); ax.text(21.3, y0, 'Palée verticale L50x50x5', fontsize=8, va='center')
    ax.plot([26.0, 26.8], [y0 - 0.2, y0 + 0.2], color=C_CV, lw=0.8, ls='--')
    ax.text(27.0, y0, 'Poutre au vent (toiture)', fontsize=8, va='center')
    ax.set_xlim(-4.5, L + 4.5); ax.set_ylim(-4.6, B + 2.4)
    ax.set_aspect('equal'); ax.axis('off')
    ax.set_title('PLAN D\'IMPLANTATION - piliers IPE 220, poteaux BA, contreventements', fontsize=12, weight='bold')
    cartouche(fig, 'Plan', 'Éch. 1/150 (indicative)')
    fig.tight_layout(); fig.savefig(f'{OUT}/01_plan.png', dpi=200); plt.close(fig)

# ------------------------------------------------------------------ élévations
def fondations_elev(ax, x0, x1, piliers):
    ax.add_patch(Rectangle((x0, -1.20), x1 - x0, 0.05, fc='#bbb', ec='k', lw=0.3))
    ax.add_patch(Rectangle((x0, -1.15), x1 - x0, 0.15, fc=C_BA, ec='k', lw=0.4, alpha=0.6))
    ax.add_patch(Rectangle((x0, -1.00), x1 - x0, 1.00, fc=C_MUR, ec='k', lw=0.5, hatch='..', alpha=0.6))
    for x in piliers:
        ax.add_patch(Rectangle((x - 0.4, -1.15), 0.8, 0.30, fc=C_BA, ec='k', lw=0.5))
        ax.add_patch(Rectangle((x - 0.2, -0.85), 0.4, 0.85, fc=C_BA, ec='k', lw=0.5))

def pilier_elev(ax, x, ztop):
    ax.add_patch(Rectangle((x - 0.205, -0.85), 0.15, ztop + 0.85, fc=C_BA, ec='k', lw=0.4))
    ax.add_patch(Rectangle((x + 0.055, -0.85), 0.15, ztop + 0.85, fc=C_BA, ec='k', lw=0.4))
    ax.add_patch(Rectangle((x - 0.055, 0.0), 0.11, ztop, fc=C_IPE, ec='k', lw=0.4))

def murs_elev(ax, x0, x1, door=None):
    ax.add_patch(Rectangle((x0, 0), x1 - x0, H, fc=C_MUR, ec='k', lw=0.6))
    for z in (0, H - 0.2):
        ax.add_patch(Rectangle((x0, z), x1 - x0, 0.2, fc=C_BA, ec='k', lw=0.5))
    if door:
        xa, xb, hd = door
        ax.add_patch(Rectangle((x0, 3.0), xa - x0, 0.2, fc=C_BA, ec='k', lw=0.5))
        ax.add_patch(Rectangle((xb, 3.0), x1 - xb, 0.2, fc=C_BA, ec='k', lw=0.5))
        ax.add_patch(Rectangle((xa, 0), xb - xa, hd, fc='#d6e4f0', ec='#2980b9', lw=1.0))
        for k in range(1, 12):
            ax.plot([xa + k * (xb - xa) / 12] * 2, [0, hd], color='#2980b9', lw=0.4)
        ax.add_patch(Rectangle((xa - 0.2, hd), xb - xa + 0.4, 0.40, fc=C_BA, ec='k', lw=0.6))
    else:
        ax.add_patch(Rectangle((x0, 3.0), x1 - x0, 0.2, fc=C_BA, ec='k', lw=0.5))
    ax.plot([x0 - 1.5, x1 + 1.5], [0, 0], color='#6d4c41', lw=2)
    ax.text(x0 - 1.4, 0.08, 'TN ±0,00', fontsize=7, color='#6d4c41')

def facade_long():
    fig, ax = plt.subplots(figsize=(14, 5.6))
    fondations_elev(ax, -0.075, L + 0.075, XP)
    murs_elev(ax, -0.075, L + 0.075)
    for x in XP:
        pilier_elev(ax, x, H)
    for x0 in (0, 25):   # palées de stabilité (face intérieure, en pointillé)
        ax.plot([x0 + 0.2, x0 + 4.8], [0.2, H - 0.2], color=C_CV, lw=1.6, ls='--')
        ax.plot([x0 + 0.2, x0 + 4.8], [H - 0.2, 0.2], color=C_CV, lw=1.6, ls='--')
        ax.text(x0 + 2.5, 4.2, 'Palée\nL50x50x5', ha='center', fontsize=7, color=C_CV, bbox=dict(fc='white', ec='none', pad=0.5))
    ax.add_patch(Polygon([(-0.5, 5.90), (L + 0.5, 5.90), (L + 0.5, 7.0), (-0.5, 7.0)], fc=C_ROOF, ec='k', lw=0.7))
    for k in range(0, 62):
        ax.plot([-0.5 + k * 0.5] * 2, [5.90, 7.0], color='#6b8aa3', lw=0.3)
    ax.text(L / 2, 6.45, 'Tôles bacs 5 ondes sur pannes Z 120x2 - pente 20 % (option)', ha='center', fontsize=8, bbox=dict(fc='white', ec='none', pad=1))
    ax.text(12.5, 1.6, 'Agglos 15 pleins', ha='center', fontsize=9)
    ax.text(12.5, 4.4, 'Agglos 15 pleins', ha='center', fontsize=9)
    ax.text(12.5, -0.55, 'Fondation agglos 15 pleins h = 1,00 m', ha='center', fontsize=8, bbox=dict(fc='white', ec='none', pad=1))
    niveaux(ax, L + 1.0, [(-1.20, '-1,20 fond de fouille'), (-0.85, '-0,85 dessus semelle 80x80'),
                          (0.0, '±0,00 platines IPE'), (3.2, '+3,00/+3,20 chaînage interm.'),
                          (6.0, '+6,00 tête IPE / chaînage haut'), (7.0, '+7,00 faîtage')])
    for i in range(6):
        cote(ax, XP[i], -1.8, XP[i + 1], -1.8, '5,00')
    ax.set_xlim(-2, L + 7.5); ax.set_ylim(-2.3, 7.8); ax.set_aspect('equal'); ax.axis('off')
    ax.set_title('FAÇADE NORD (long pan, identique façade Sud) - piliers IPE 220 tous les 5,00 m', fontsize=12, weight='bold')
    cartouche(fig, 'Façade long pan', 'Éch. 1/150 (indicative)')
    fig.tight_layout(); fig.savefig(f'{OUT}/02_facade_long_pan.png', dpi=200); plt.close(fig)

def pignon():
    fig, ax = plt.subplots(figsize=(10, 7.2))
    P = [0, 1.8, 8.2, B]
    fondations_elev(ax, -0.075, B + 0.075, P)
    murs_elev(ax, -0.075, B + 0.075, door=(2.0, 8.0, 4.50))
    ax.add_patch(Polygon([(-0.075, 6.0), (B / 2, 7.0), (B + 0.075, 6.0)], fc=C_MUR, ec='k', lw=0.6))
    for x0 in (0, B):
        ax.add_patch(Polygon([(x0, 6.0), (B / 2, 7.0), (B / 2, 7.15), (x0, 6.15)], fc=C_BA, ec='k', lw=0.5))
    ax.plot([-0.6, B / 2, B + 0.6], [5.88, 7.17, 5.88], color='#34495e', lw=2.5)
    for x in P:
        pilier_elev(ax, x, H)
    ax.text(5.0, 2.2, 'PORTAIL MÉTALLIQUE\nCOULISSANT\n6,00 x 4,50 m', ha='center', fontsize=9, color='#1f618d',
            weight='bold', bbox=dict(fc='white', ec='none', pad=1))
    ax.text(5.0, 4.70, 'Linteau BA 15x40', ha='center', fontsize=7, color='white')
    ax.text(2.2, 5.55, 'pente 20 %', fontsize=9, rotation=11.3, color=C_COTE)
    ax.text(6.1, 5.55, 'pente 20 %', fontsize=9, rotation=-11.3, color=C_COTE)
    cote(ax, 2.0, -1.6, 8.0, -1.6, '6,00 (entrée)')
    cote(ax, 0, -2.2, B, -2.2, '10,00 m')
    cote(ax, 9.0, 0, 9.0, 4.5, '4,50', vertical=True)
    niveaux(ax, B + 0.8, [(-1.20, '-1,20'), (-0.85, '-0,85'), (0.0, '±0,00'), (3.2, '+3,20'),
                          (4.9, '+4,90 sous-face'), (6.0, '+6,00'), (7.0, '+7,00 faîtage')])
    ax.set_xlim(-2, B + 3.2); ax.set_ylim(-2.7, 7.8); ax.set_aspect('equal'); ax.axis('off')
    ax.set_title('PIGNON EST - FAÇADE D\'ENTRÉE (IPE 220 d\'encadrement + poteaux BA)', fontsize=12, weight='bold')
    cartouche(fig, 'Pignon Est', 'Éch. 1/100 (indicative)')
    fig.tight_layout(); fig.savefig(f'{OUT}/03_pignon_entree.png', dpi=200); plt.close(fig)

# ------------------------------------------------------------------ COUPE A-A
def coupe():
    fig, ax = plt.subplots(figsize=(12.5, 8))
    ax.add_patch(Rectangle((-2, -1.6), B + 4, 1.6, fc='#e8d8c3', ec='none', alpha=0.5))
    # latérite 2 couches + dallage
    ax.add_patch(Rectangle((0.075, -0.40), B - 0.15, 0.20, fc=C_LAT, ec='k', lw=0.4, hatch='xx', alpha=0.8))
    ax.add_patch(Rectangle((0.075, -0.20), B - 0.15, 0.20, fc=C_LAT, ec='k', lw=0.4, hatch='..', alpha=0.8))
    ax.add_patch(Rectangle((0.075, 0.0), B - 0.15, 0.20, fc='#d0d3d4', ec='k', lw=0.6))
    for z in (0.04, 0.16):
        ax.plot([0.15, B - 0.15], [z, z], color='k', lw=0.7, ls=(0, (4, 1)))
    ax.plot([-2, 0], [0, 0], color='#6d4c41', lw=2); ax.plot([B, B + 2], [0, 0], color='#6d4c41', lw=2)
    for xw in (0, B):
        ax.add_patch(Rectangle((xw - 0.30, -1.20), 0.60, 0.05, fc='#bbb', ec='k', lw=0.4))
        ax.add_patch(Rectangle((xw - 0.20, -1.15), 0.40, 0.15, fc=C_BA, ec='k', lw=0.6))
        ax.add_patch(Rectangle((xw - 0.075, -1.00), 0.15, 1.00, fc=C_MUR, ec='k', lw=0.6, hatch='///'))
        for z0, h in ((0, 0.2), (3.0, 0.2), (5.8, 0.2)):
            ax.add_patch(Rectangle((xw - 0.075, z0), 0.15, h, fc=C_BA, ec='k', lw=0.6))
        ax.add_patch(Rectangle((xw - 0.075, 0.20), 0.15, 2.80, fc=C_MUR, ec='k', lw=0.6, hatch='///'))
        ax.add_patch(Rectangle((xw - 0.075, 3.20), 0.15, 2.60, fc=C_MUR, ec='k', lw=0.6, hatch='///'))
        # portique en arrière-plan (axe 4) : semelle 80x80, fût, IPE 220
        ax.add_patch(Rectangle((xw - 0.40, -1.15), 0.80, 0.30, fc='none', ec='#555', lw=0.6, ls='--'))
        ax.add_patch(Rectangle((xw - 0.20, -0.85), 0.40, 0.85, fc='none', ec='#555', lw=0.6, ls='--'))
        xi = xw + (0.075 if xw == 0 else -0.295)
        ax.add_patch(Rectangle((xi, 0.0), 0.22, 6.0, fc=C_IPE, ec='k', lw=0.5, alpha=0.35))
    E = 6.0
    ax.plot([-0.6, B / 2, B + 0.6], [E - 0.12, E + 1.0, E - 0.12], color='#34495e', lw=2.5)
    ax.plot([0, B], [E, E], color='#34495e', lw=1.4)
    for x in [1.25, 2.5, 3.75, 5.0, 6.25, 7.5, 8.75]:
        ax.plot([x, x], [E, E + (x if x <= 5 else B - x) * 0.2], color='#34495e', lw=0.8)
    for x0, x1 in [(0, 1.25), (1.25, 2.5), (2.5, 3.75), (3.75, 5.0)]:
        ax.plot([x0, x1], [E, E + x1 * 0.2], color='#34495e', lw=0.6)
        ax.plot([B - x0, B - x1], [E, E + x1 * 0.2], color='#34495e', lw=0.6)
    ax.text(B / 2, E + 1.35, 'Fermes + pannes Z 120x2 (e ≤ 1,20 m) + tôles bacs 5 ondes (option)', ha='center', fontsize=8)
    ax.text(2.0, E + 0.55, '20 %', fontsize=9, color=C_COTE, rotation=11.3)
    ax.text(7.4, E + 0.55, '20 %', fontsize=9, color=C_COTE, rotation=-11.3)
    ax.text(B / 2, 0.45, 'Dallage BA 20 cm - double nappe HA10 e = 20 - béton 350 kg/m³ - polyane', ha='center', fontsize=8)
    ax.text(B / 2, -0.30, 'Latérite compactée 95 % OPM : 2 couches de 20 cm (1 seule si bonne portance)', ha='center', fontsize=7,
            bbox=dict(fc='white', ec='none', pad=0.5))
    cote(ax, 0, -2.0, B, -2.0, '10,00 m entre axes')
    niveaux(ax, B + 0.9, [(-1.20, '-1,20 fond de fouille'), (-0.85, '-0,85'), (-0.40, '-0,40 fond de forme'),
                          (-0.08, '±0,00'), (0.28, '+0,20 dallage'), (3.10, '+3,00'), (6.0, '+6,00'), (7.0, '+7,00 faîtage')])
    ann = [('Chaînage haut 15x20\n4 HA10 + cad. HA6 e=20', 5.9, 5.0), ('IPE 220 (portique axe 4,\nen arrière-plan)', 4.5, 3.9),
           ('Chaînage intermédiaire\n15x20 - 4 HA10', 3.1, 2.4), ('Chaînage bas 15x20\n+ arase étanche', 0.1, 1.0),
           ('Agglos 15 pleins\nfondation h = 1,00', -0.5, -0.6), ('Semelle filante 40x15\n4 HA10 + HA6 e=20\npropreté 5 cm', -1.1, -1.9)]
    for t, y, yt in ann:
        ax.annotate(t, xy=(0.0 if 'IPE' not in t else 0.18, y), xytext=(-2.7, yt), fontsize=7, arrowprops=dict(arrowstyle='->', lw=0.6))
    ax.set_xlim(-3.2, B + 3.8); ax.set_ylim(-2.5, 7.8); ax.set_aspect('equal'); ax.axis('off')
    ax.set_title('COUPE TRANSVERSALE A-A', fontsize=12, weight='bold')
    cartouche(fig, 'Coupe A-A', 'Éch. 1/75 (indicative)')
    fig.tight_layout(); fig.savefig(f'{OUT}/04_coupe_AA.png', dpi=200); plt.close(fig)

# ------------------------------------------------------------------ DÉTAILS
def bar(ax, x, y, r=0.007):
    ax.add_patch(Circle((x, y), r, fc='k'))

def details():
    fig = plt.figure(figsize=(15, 9.5))
    gs = fig.add_gridspec(2, 3, height_ratios=[1, 1.15])
    # (a) coupe horizontale pilier
    ax = fig.add_subplot(gs[0, 0])
    ax.add_patch(Rectangle((-0.60, -0.075), 0.395, 0.15, fc=C_MUR, ec='k', hatch='///'))
    ax.add_patch(Rectangle((0.205, -0.075), 0.395, 0.15, fc=C_MUR, ec='k', hatch='///'))
    for x0 in (-0.205, 0.055):
        ax.add_patch(Rectangle((x0, -0.075), 0.15, 0.15, fc='#ecf0f1', ec='k', lw=1.2))
        ax.add_patch(Rectangle((x0 + 0.025, -0.05), 0.10, 0.10, fc='none', ec=C_COTE, lw=1))
        for dx in (0.035, 0.115):
            for dy in (-0.04, 0.04):
                bar(ax, x0 + dx, dy)
    ax.add_patch(Rectangle((-0.055, -0.11), 0.11, 0.0092, fc=C_IPE)); ax.add_patch(Rectangle((-0.055, 0.1008), 0.11, 0.0092, fc=C_IPE))
    ax.add_patch(Rectangle((-0.003, -0.11), 0.0059, 0.22, fc=C_IPE))
    ax.set_xlim(-0.65, 0.65); ax.set_ylim(-0.30, 0.25); ax.set_aspect('equal'); ax.axis('off')
    ax.set_title('Coupe horizontale d\'un pilier', fontsize=10, weight='bold')
    ax.text(0, -0.17, 'Poteau BA 15x15 | IPE 220 | Poteau BA 15x15\n4 HA10 + cadres HA6 e = 15 par poteau\n'
            'Liaison poteaux/IPE : pattes HA8 soudées tous les 50 cm', ha='center', va='top', fontsize=8)
    # (b) pied de poteau
    ax = fig.add_subplot(gs[:, 1])
    ax.add_patch(Rectangle((-0.45, -1.20), 0.90, 0.05, fc='#bbb', ec='k'))
    ax.add_patch(Rectangle((-0.40, -1.15), 0.80, 0.30, fc='#ecf0f1', ec='k', lw=1.2))
    ax.add_patch(Rectangle((-0.20, -0.85), 0.40, 0.85, fc='#ecf0f1', ec='k', lw=1.2))
    ax.add_patch(Rectangle((-0.42, -0.40), 0.84, 0.20, fc=C_LAT, ec='k', lw=0.4, hatch='xx', alpha=0.5))
    ax.add_patch(Rectangle((-0.42, -0.20), 0.84, 0.20, fc=C_LAT, ec='k', lw=0.4, hatch='..', alpha=0.5))
    ax.add_patch(Rectangle((0.20, 0.0), 0.25, 0.20, fc='#d0d3d4', ec='k')); ax.add_patch(Rectangle((-0.45, 0.0), 0.25, 0.20, fc='#d0d3d4', ec='k'))
    for k in range(6):  # nappe HA12
        bar(ax, -0.35 + k * 0.14, -1.10, 0.008)
    ax.plot([-0.35, 0.35], [-1.11, -1.11], color='k', lw=1.4)
    for x in (-0.16, 0.16):  # HA12 du fût
        ax.plot([x, x, x + (0.25 if x < 0 else -0.25)], [-0.04, -1.10, -1.10], color='k', lw=1.4)
    for z in (-0.75, -0.55, -0.35, -0.15):
        ax.plot([-0.17, 0.17], [z, z], color=C_COTE, lw=1)
    for x in (-0.11, 0.11):  # tiges M20
        ax.plot([x, x, x + (-0.08 if x < 0 else 0.08)], [0.06, -0.55, -0.55], color='#8e44ad', lw=2)
    ax.add_patch(Rectangle((-0.16, 0.0), 0.32, 0.015, fc=C_IPE, ec='k'))
    ax.add_patch(Rectangle((-0.03, 0.015), 0.06, 0.85, fc=C_IPE, ec='k'))
    ax.text(0.05, 0.75, 'IPE 220', rotation=90, fontsize=9, color='white', va='center')
    notes = [('Platine 320x220x15 + raidisseurs\ncalage mortier sans retrait', 0.01), ('4 tiges d\'ancrage M20 L = 600\ncoudées + écrous', -0.42),
             ('Fût BA 40x40 : 4 HA12\ncadres HA6 e = 15', -0.72), ('Semelle 80x80x30 :\nHA12 e = 15 dans les 2 sens', -1.02),
             ('Béton de propreté 5 cm\nfond de fouille -1,20', -1.18), ('Dallage 20 cm', 0.14), ('Latérite 2 x 20 cm', -0.12)]
    for t, y in notes:
        ax.annotate(t, xy=(0.15 if y > -0.9 else 0.3, y), xytext=(0.55, y), fontsize=7.5, va='center',
                    arrowprops=dict(arrowstyle='->', lw=0.6))
    ax.set_xlim(-0.6, 1.25); ax.set_ylim(-1.35, 0.95); ax.set_aspect('equal'); ax.axis('off')
    ax.set_title('Pied de poteau IPE 220 sur semelle isolée 80x80', fontsize=10, weight='bold')
    # (c) chaînage
    ax = fig.add_subplot(gs[0, 2])
    ax.add_patch(Rectangle((0, 0), 0.15, 0.20, fc='#ecf0f1', ec='k', lw=1.2))
    ax.add_patch(Rectangle((0.022, 0.022), 0.106, 0.156, fc='none', ec=C_COTE, lw=1.2))
    for x, y in [(0.03, 0.03), (0.12, 0.03), (0.03, 0.17), (0.12, 0.17)]:
        bar(ax, x, y)
    ax.add_patch(Rectangle((0.30, 0.0), 0.15, 0.15, fc='#ecf0f1', ec='k', lw=1.2))
    ax.add_patch(Rectangle((0.322, 0.022), 0.106, 0.106, fc='none', ec=C_COTE, lw=1.2))
    for x, y in [(0.33, 0.03), (0.42, 0.03), (0.33, 0.12), (0.42, 0.12)]:
        bar(ax, x, y)
    ax.text(0.075, -0.04, 'Chaînages 15x20\n4 HA10\ncadres HA6 e = 20', ha='center', va='top', fontsize=8)
    ax.text(0.375, -0.04, 'Poteaux / rampants\n15x15 - 4 HA10\ncadres HA6 e = 15', ha='center', va='top', fontsize=8)
    ax.set_xlim(-0.05, 0.55); ax.set_ylim(-0.20, 0.25); ax.set_aspect('equal'); ax.axis('off')
    ax.set_title('Chaînages et poteaux BA', fontsize=10, weight='bold')
    # (d) dallage
    ax = fig.add_subplot(gs[1, 0])
    ax.add_patch(Rectangle((0, -0.40), 1.2, 0.20, fc=C_LAT, ec='k', hatch='xx', alpha=0.8))
    ax.add_patch(Rectangle((0, -0.20), 1.2, 0.20, fc=C_LAT, ec='k', hatch='..', alpha=0.8))
    ax.plot([0, 1.2], [0.0, 0.0], color='#2e86c1', lw=2)
    ax.add_patch(Rectangle((0, 0.0), 1.2, 0.20, fc='#ecf0f1', ec='k', lw=1.2))
    for z in (0.035, 0.165):
        ax.plot([0.03, 1.17], [z, z], color='k', lw=1.2)
        for k in range(6):
            bar(ax, 0.1 + k * 0.2, z + (0.012 if z < 0.1 else -0.012), 0.008)
    for x in (0.3, 0.9):
        ax.plot([x - 0.06, x - 0.03, x + 0.03, x + 0.06], [0.035, 0.153, 0.153, 0.035], color=C_COTE, lw=1)
    ax.text(0.6, -0.47, 'Dallage BA 20 cm, béton 350 kg/m³ - 2 nappes HA10 e = 20 dans les 2 sens\n'
            'chaises HA10 (1/m²) - enrobage 3 cm - film polyane 150 µ\n'
            'Latérite par couches de 20 cm compactées à 95 % OPM (40 cm si mauvaise portance)\n'
            'Joints sciés maille 5 x 5 m, joint périphérique', ha='center', va='top', fontsize=8)
    ax.set_xlim(-0.05, 1.25); ax.set_ylim(-0.85, 0.30); ax.set_aspect('equal'); ax.axis('off')
    ax.set_title('Dallage double nappe sur forme en latérite', fontsize=10, weight='bold')
    # (e) contreventement
    ax = fig.add_subplot(gs[1, 2])
    ax.add_patch(Rectangle((0, 0), 0.11, 6, fc=C_IPE)); ax.add_patch(Rectangle((5 - 0.11, 0), 0.11, 6, fc=C_IPE))
    ax.plot([0.11, 4.89], [0.3, 5.7], color=C_CV, lw=2.5); ax.plot([0.11, 4.89], [5.7, 0.3], color=C_CV, lw=2.5)
    for x, y in [(0.11, 0.3), (4.89, 5.7), (0.11, 5.7), (4.89, 0.3)]:
        ax.add_patch(Polygon([(x, y - 0.25), (x + (0.35 if x < 1 else -0.35), y), (x, y + 0.25)], fc='#aaa', ec='k'))
    ax.text(2.5, -0.4, 'Croix de Saint-André en cornières L50x50x5 (3,77 kg/m)\n'
            'goussets 8 mm soudés sur IPE, boulons M12 - 4 palées en long pans\n'
            '+ poutre au vent en toiture (2 travées d\'extrémité)', ha='center', va='top', fontsize=8)
    ax.set_xlim(-0.3, 5.3); ax.set_ylim(-2.0, 6.3); ax.set_aspect('equal'); ax.axis('off')
    ax.set_title('Palée de stabilité (travée de 5,00 m)', fontsize=10, weight='bold')
    fig.suptitle('DÉTAILS TYPE - IPE 220, poteaux BA, semelles 80x80 HA12, dallage double nappe, contreventements L50x50x5\n'
                 '(acier FeE500 - béton 350 kg/m³ ≈ C25/30 - BAEL 91 mod. 99 / EC2 / EC3)', fontsize=11, weight='bold')
    cartouche(fig, 'Détails', 'Échelles indicatives')
    fig.tight_layout(rect=(0, 0.03, 1, 0.94)); fig.savefig(f'{OUT}/05_details.png', dpi=200); plt.close(fig)

if __name__ == '__main__':
    plan(); facade_long(); pignon(); coupe(); details()
