# -*- coding: utf-8 -*-
"""Export DXF (AutoCAD R2010) des plans du bâtiment, généré à partir de la fiche projet.

Espace objet en mètres (1 unité = 1 m). Chaque vue est placée dans un cadre A3 paysage à une échelle
normalisée choisie automatiquement (1:50 à 1:500), avec cartouche. Calques séparés pour faciliter
la reprise dans AutoCAD. Les cotations sont de vraies cotes AutoCAD (associées au style COTES_xxx).
"""
import datetime
import math

import ezdxf
from ezdxf.enums import TextEntityAlignment

from .sections import section

ECHELLES = [50, 75, 100, 125, 150, 200, 250, 300, 400, 500]
A3 = (0.420, 0.297)
CALQUES = {  # nom: (couleur ACI, type de ligne, épaisseur 1/100 mm)
    "AXES": (8, "DASHDOT", 18), "CHARPENTE": (5, "Continuous", 50), "CHARPENTE_SECOND": (4, "Continuous", 25),
    "CONTREVENTEMENT": (30, "Continuous", 25), "BETON": (8, "Continuous", 35), "BETON_CACHE": (8, "DASHED", 18),
    "BAIES": (1, "Continuous", 25), "COTES": (7, "Continuous", 18), "TEXTE": (7, "Continuous", 18),
    "REPERES": (7, "Continuous", 25), "CARTOUCHE": (7, "Continuous", 35),
}


def _f(x, d=2):
    return f"{x:.{d}f}".replace(".", ",")


class Planche:
    """Une vue dans un cadre A3 à l'échelle 1:denom, positionnée en x0 dans l'espace objet."""

    def __init__(self, dxf, x0, denom, titre, num, total, p):
        self.d, self.msp, self.x0, self.k = dxf, dxf.modelspace(), x0, denom / 1000.0
        self.denom, self.titre = denom, titre
        W, H = A3[0] * denom, A3[1] * denom
        self.W, self.H = W, H
        self.dimstyle = _dimstyle(dxf, denom)
        m = 0.010 * denom
        self.rect(x0, 0, x0 + W, H, "CARTOUCHE")
        self.rect(x0 + m, m, x0 + W - m, H - m, "CARTOUCHE")
        # cartouche (190 × 46 mm) en bas à droite
        cw, ch = 0.190 * denom, 0.046 * denom
        cx, cy = x0 + W - m - cw, m
        self.rect(cx, cy, cx + cw, cy + ch, "CARTOUCHE")
        for yy in (0.012, 0.024, 0.034):
            self.line((cx, cy + yy * denom), (cx + cw, cy + yy * denom), "CARTOUCHE")
        self.line((cx + 0.120 * denom, cy), (cx + 0.120 * denom, cy + 0.024 * denom), "CARTOUCHE")
        t = self.txt
        t(cx + 0.003 * denom, cy + 0.040 * denom, p.nom[:60], 3.0, bold=True)
        t(cx + 0.003 * denom, cy + 0.0365 * denom, f"{p.lieu} – {p.description()[:90]}", 1.8)
        t(cx + 0.003 * denom, cy + 0.028 * denom, titre, 3.2, bold=True)
        t(cx + 0.003 * denom, cy + 0.0165 * denom, f"Échelle 1:{denom}   –   Planche {num} / {total}", 2.2)
        t(cx + 0.003 * denom, cy + 0.0045 * denom, f"Établi par : {p.auteur}   –   {datetime.date.today():%d/%m/%Y}", 2.0)
        t(cx + 0.123 * denom, cy + 0.0165 * denom, "ESQUISSE NON CONTRACTUELLE", 2.0, bold=True)
        t(cx + 0.123 * denom, cy + 0.0045 * denom, "Bon pour accord :", 2.0)
        self.zone = (x0 + m + 0.025 * denom, m + ch + 0.020 * denom, x0 + W - m - 0.025 * denom, H - m - 0.030 * denom)
        t(x0 + m + 0.005 * denom, H - m - 0.012 * denom, titre, 5.0, bold=True)

    # primitives -------------------------------------------------------------
    def line(self, a, b, layer):
        self.msp.add_line(a, b, dxfattribs={"layer": layer})

    def pl(self, pts, layer, close=False):
        self.msp.add_lwpolyline(pts, close=close, dxfattribs={"layer": layer})

    def rect(self, x1, y1, x2, y2, layer):
        self.pl([(x1, y1), (x2, y1), (x2, y2), (x1, y2)], layer, close=True)

    def txt(self, x, y, s, hmm=2.5, layer="TEXTE", align="LEFT", bold=False, rot=0):
        e = self.msp.add_text(s, height=hmm / 1000 * self.denom, rotation=rot,
                              dxfattribs={"layer": layer, "style": "GRAS" if bold else "STANDARD"})
        e.set_placement((x, y), align=getattr(TextEntityAlignment, align))
        return e

    def cote(self, p1, p2, base, angle=0):
        dim = self.msp.add_linear_dim(base=base, p1=p1, p2=p2, angle=angle, dimstyle=self.dimstyle,
                                      dxfattribs={"layer": "COTES"})
        dim.render()

    def repere(self, x, y, s):
        r = 0.004 * self.denom
        self.msp.add_circle((x, y), r, dxfattribs={"layer": "REPERES"})
        self.txt(x, y, s, 3.0, "REPERES", "MIDDLE_CENTER", bold=True)

    def placer(self, xmin, ymin, xmax, ymax):
        """Décalage (dx, dy) pour centrer une boîte réelle dans la zone utile."""
        zx1, zy1, zx2, zy2 = self.zone
        return (zx1 + zx2) / 2 - (xmin + xmax) / 2, (zy1 + zy2) / 2 - (ymin + ymax) / 2


def _dimstyle(doc, denom):
    nom = f"COTES_{denom}"
    if nom not in doc.dimstyles:
        ds = doc.dimstyles.duplicate_entry("EZDXF", nom)
        k = denom / 1000
        ds.dxf.dimtxt = 2.2 * k
        ds.dxf.dimasz = 2.0 * k
        ds.dxf.dimexe = 1.5 * k
        ds.dxf.dimexo = 1.0 * k
        ds.dxf.dimgap = 0.8 * k
        ds.dxf.dimdec = 2
        ds.dxf.dimdsep = ord(",")
        ds.dxf.dimtad = 1
        ds.dxf.dimlfac = 1.0
        ds.dxf.dimblk = "ARCHTICK"
    return nom


def _echelle(dx, dy):
    """Plus petite échelle normalisée pour laquelle la vue (avec marges) tient dans la zone utile du cadre A3."""
    for d in ECHELLES:
        uw, uh = (A3[0] - 0.070) * d, (A3[1] - 0.106) * d
        if dx <= uw and dy <= uh:
            return d
    return ECHELLES[-1]


def _num(extra, k, default):
    try:
        return float(str(extra.get(k, default)).replace(",", "."))
    except ValueError:
        return default


def exporter_dxf(p, profils, chemin):
    doc = ezdxf.new("R2010", setup=True)
    doc.units = ezdxf.units.M
    doc.header["$INSUNITS"] = 6
    doc.header["$MEASUREMENT"] = 1
    if "GRAS" not in doc.styles:
        doc.styles.add("GRAS", font="arialbd.ttf")
    for nom, (col, lt, lw) in CALQUES.items():
        if nom not in doc.layers:
            doc.layers.add(nom, color=col, linetype=lt, lineweight=lw)
    ex = p.extra
    L, H, e = p.longueur, p.hauteur, p.entraxe_reel
    nt = p.nb_travees
    xs = [0.0]
    for n in p.nefs:
        xs.append(xs[-1] + n.portee)
    W = xs[-1]
    a1, a2 = _num(ex, "a1", 1.2), _num(ex, "a2", 0.8)
    s_pot = section(profils["poteau_rive"])
    s_tr = section(profils["traverse"])
    s_int = section(profils["poteau_interieur"]) if profils.get("poteau_interieur") not in (None, "—") else s_pot
    hmax = max(H + n.pente / 100 * n.portee / 2 for n in p.nefs)
    vues = []
    x_cur = [0.0]
    total = 5

    def nouvelle(titre, dx, dy):
        denom = _echelle(dx, dy)
        pl = Planche(doc, x_cur[0], denom, titre, len(vues) + 1, total, p)
        x_cur[0] += pl.W + 0.05 * denom
        vues.append(pl)
        return pl

    # ------------------------------------------------------------------ 1. implantation
    v = nouvelle("PLAN D'IMPLANTATION DES POTEAUX ET FONDATIONS", L + 8, W + 8)
    r_ = 0.004 * v.denom
    yr = -2.0 - r_                       # centre des repères
    yc1, yc2 = yr - r_ - 0.006 * v.denom, yr - r_ - 0.012 * v.denom
    ox, oy = v.placer(yc2 - 0.004 * v.denom, yc2 - 0.004 * v.denom, L + 2, W + 3)
    P = lambda x, y: (x + ox, y + oy)
    for i in range(nt + 1):
        v.line(P(i * e, -2.0), P(i * e, W + 1.0), "AXES")
        v.repere(*P(i * e, -2.0 - 0.004 * v.denom), str(i + 1))
    for j, y in enumerate(xs):
        v.line(P(-2.0, y), P(L + 1.0, y), "AXES")
        v.repere(*P(-2.0 - 0.004 * v.denom, y), chr(65 + j))
    for i in range(nt + 1):
        for j, y in enumerate(xs):
            sec = s_pot if j in (0, len(xs) - 1) else s_int
            aa = a1 if j in (0, len(xs) - 1) else a1
            v.rect(*P(i * e - aa / 2, y - aa / 2), *P(i * e + aa / 2, y + aa / 2), "BETON")
            v.rect(*P(i * e - sec.b / 2000, y - sec.h / 2000), *P(i * e + sec.b / 2000, y + sec.h / 2000), "CHARPENTE")
    import math as _m
    for xg in (0.0, L):
        for k, n in enumerate(p.nefs):
            nip = max(1, _m.ceil(n.portee / 6.0 - 1e-9))
            for q in range(1, nip):
                y = xs[k] + q * n.portee / nip
                v.rect(*P(xg - a2 / 2, y - a2 / 2), *P(xg + a2 / 2, y + a2 / 2), "BETON")
                v.msp.add_circle(P(xg, y), 0.10, dxfattribs={"layer": "CHARPENTE"})
    bf = _num(ex, "bf", 0.6)
    v.rect(*P(-bf / 2, -bf / 2), *P(L + bf / 2, W + bf / 2), "BETON_CACHE")
    v.rect(*P(bf / 2, bf / 2), *P(L - bf / 2, W - bf / 2), "BETON_CACHE")
    v.cote(P(0, 0), P(L, 0), P(0, yc2), 0)
    v.cote(P(0, 0), P(e, 0), P(0, yc1), 0)
    v.cote(P(0, 0), P(0, W), P(yc2, 0), 90)
    for k in range(len(p.nefs)):
        if len(p.nefs) > 1:
            v.cote(P(0, xs[k]), P(0, xs[k + 1]), P(yc1, 0), 90)
    v.txt(*P(L / 2, W + 2.2), f"Poteaux de rive {profils['poteau_rive']}"
          + (f" – poteaux intérieurs {profils['poteau_interieur']}" if len(xs) > 2 else "")
          + f" – semelles {a1 * 100:.0f} × {a1 * 100:.0f} cm (pignons {a2 * 100:.0f} × {a2 * 100:.0f})", 2.5,
          align="MIDDLE_CENTER")

    # ------------------------------------------------------------------ 2. coupe
    v = nouvelle("COUPE TRANSVERSALE – PORTIQUE TYPE", W + 6, hmax + 5)
    ox, oy = v.placer(-2, -2.5, W + 2, hmax + 1)
    P = lambda x, y: (x + ox, y + oy)
    v.line(P(-1.5, 0), P(W + 1.5, 0), "TEXTE")
    for j, x in enumerate(xs):
        sec = s_pot if j in (0, len(xs) - 1) else s_int
        hh = sec.h / 1000
        v.rect(*P(x - hh / 2, 0), *P(x + hh / 2, H), "CHARPENTE")
        v.rect(*P(x - a1 / 2, -_num(ex, "D", 1.2)), *P(x + a1 / 2, -_num(ex, "D", 1.2) + 0.4), "BETON")
        v.txt(*P(x + hh / 2 + 0.15, H * 0.45), sec.nom, 2.2, rot=90)
    ht = s_tr.h / 1000
    for k, n in enumerate(p.nefs):
        x0, B, pe = xs[k], n.portee, n.pente / 100
        Hf = H + pe * B / 2
        top = [P(x0, H), P(x0 + B / 2, Hf), P(x0 + B, H)]
        bot = [P(x0, H - ht), P(x0 + B / 2, Hf - ht), P(x0 + B, H - ht)]
        v.pl(top, "CHARPENTE")
        v.pl(bot, "CHARPENTE")
        lj = p.jarret_ratio * B
        hj = ht * (p.jarret_hauteur - 1)
        for sgn, xa in ((1, x0), (-1, x0 + B)):
            v.pl([P(xa, H - ht), P(xa, H - ht - hj), P(xa + sgn * lj, H - ht + pe * lj)], "CHARPENTE")
        npn = max(2, math.ceil(math.hypot(B / 2, pe * B / 2) / p.entraxe_pannes - 1e-9) + 1)
        for q in range(npn):
            for xx in (x0 + q * (B / 2) / (npn - 1), x0 + B - q * (B / 2) / (npn - 1)):
                yy = H + pe * min(xx - x0, x0 + B - xx)
                v.rect(*P(xx - 0.04, yy), *P(xx + 0.04, yy + 0.20), "CHARPENTE_SECOND")
        if n.poteau_faitage:
            v.rect(*P(x0 + B / 2 - s_int.h / 2000, 0), *P(x0 + B / 2 + s_int.h / 2000, Hf - ht), "CHARPENTE")
        v.txt(*P(x0 + B / 4, H + pe * B / 4 + 0.6), f"Traverse {s_tr.nom}", 2.2, align="BOTTOM_CENTER",
              rot=math.degrees(math.atan(pe)))
        v.txt(*P(x0 + B / 2, Hf + 0.5), f"Pente {_f(n.pente, 1)} %", 2.2, align="BOTTOM_CENTER")
        v.cote(P(x0, 0), P(x0 + B, 0), P(x0, -2.0), 0)
        v.cote(P(x0 + B / 2, 0), P(x0 + B / 2, Hf), P(x0 + B / 2 + 0.8, 0), 90)
    v.cote(P(0, 0), P(0, H), P(-1.4, 0), 90)

    # ------------------------------------------------------------------ 3. long-pan
    v = nouvelle("ÉLÉVATION LONG-PAN", L + 6, H + 5)
    ox, oy = v.placer(-2, -2.5, L + 2, H + 1.5)
    P = lambda x, y: (x + ox, y + oy)
    v.line(P(-1.5, 0), P(L + 1.5, 0), "TEXTE")
    for i in range(nt + 1):
        v.rect(*P(i * e - s_pot.b / 2000, 0), *P(i * e + s_pot.b / 2000, H), "CHARPENTE")
    v.line(P(0, H), P(L, H), "CHARPENTE")
    elis = p.entraxe_lisses
    nl = max(0, math.ceil(H / elis - 1e-9))
    for q in range(nl):
        v.line(P(0, q * elis + 0.3), P(L, q * elis + 0.3), "CHARPENTE_SECOND")
    nbcv = nt if nt <= 2 else 2 + (nt - 1) // 5
    for mm in range(1, nbcv + 1):
        b = 1 if mm == 1 else (nt if mm == nbcv else 5 * (mm - 1))
        v.line(P((b - 1) * e, 0.1), P(b * e, H - 0.1), "CONTREVENTEMENT")
        v.line(P(b * e, 0.1), P((b - 1) * e, H - 0.1), "CONTREVENTEMENT")
    portes = []
    for pre in ("pc", "pt"):
        if ex.get("e" + pre, "") == "Long-pan" and _num(ex, "n" + pre, 0) > 0:
            portes.append((_num(ex, "l" + pre, 4), _num(ex, "h" + pre, 4), "Porte coul." if pre == "pc" else "Portillon"))
    for k, (lw, hw, lab) in enumerate(portes[:4]):
        bay = max(2 if nt >= 3 else 1, min(nt - 1 if nt >= 3 else nt, round((k + 1) * nt / (len(portes) + 1))))
        xc = (bay - 0.5) * e
        v.rect(*P(xc - lw / 2, 0), *P(xc + lw / 2, hw), "BAIES")
        v.txt(*P(xc, hw + 0.2), f"{lab} {_f(lw)} × {_f(hw)}", 2.0, align="BOTTOM_CENTER")
    v.cote(P(0, 0), P(L, 0), P(0, -2.0), 0)
    v.cote(P(0, 0), P(e, 0), P(0, H + 0.9), 0)
    v.cote(P(0, 0), P(0, H), P(-1.4, 0), 90)

    # ------------------------------------------------------------------ 4. pignon
    v = nouvelle("ÉLÉVATION PIGNON", W + 6, hmax + 5)
    ox, oy = v.placer(-2, -2.5, W + 2, hmax + 1)
    P = lambda x, y: (x + ox, y + oy)
    v.line(P(-1.5, 0), P(W + 1.5, 0), "TEXTE")
    contour = [P(0, 0), P(0, H)]
    for k, n in enumerate(p.nefs):
        contour += [P(xs[k] + n.portee / 2, H + n.pente / 100 * n.portee / 2), P(xs[k + 1], H)]
    contour.append(P(W, 0))
    v.pl(contour, "CHARPENTE")
    for k, n in enumerate(p.nefs):
        x0, B, pe = xs[k], n.portee, n.pente / 100
        nip = max(1, math.ceil(B / 6.0 - 1e-9))
        for q in range(1, nip):
            y = x0 + q * B / nip
            v.line(P(y, 0), P(y, H + pe * min(y - x0, x0 + B - y)), "CHARPENTE")
        for qq in range(nl):
            z = qq * elis + 0.3
            v.line(P(x0, z), P(x0 + B, z), "CHARPENTE_SECOND")
        v.cote(P(x0, 0), P(x0 + B, 0), P(x0, -2.0), 0)
        v.cote(P(x0 + B / 2, 0), P(x0 + B / 2, H + pe * B / 2), P(x0 + B / 2 + 0.8, 0), 90)
    for j in range(1, len(xs) - 1):
        v.line(P(xs[j], 0), P(xs[j], H), "CHARPENTE")
    for pre in ("pc", "pt"):
        if ex.get("e" + pre, "") == "Pignon" and _num(ex, "n" + pre, 0) > 0:
            lw, hw = _num(ex, "l" + pre, 4), _num(ex, "h" + pre, 4)
            xc = p.nefs[0].portee / 2
            v.rect(*P(xc - lw / 2, 0), *P(xc + lw / 2, hw), "BAIES")
            v.txt(*P(xc, hw + 0.2), f"{'Porte coul.' if pre == 'pc' else 'Portillon'} {_f(lw)} × {_f(hw)}", 2.0,
                  align="BOTTOM_CENTER")
            break
    v.cote(P(0, 0), P(0, H), P(-1.4, 0), 90)

    # ------------------------------------------------------------------ 5. toiture
    v = nouvelle("PLAN DE TOITURE – CHARPENTE ET CONTREVENTEMENTS", L + 8, W + 7)
    ox, oy = v.placer(-3, -3, L + 2, W + 2)
    P = lambda x, y: (x + ox, y + oy)
    d = _num(ex, "deb", 0.3)
    v.rect(*P(-d, 0), *P(L + d, W), "TEXTE")
    for i in range(nt + 1):
        v.line(P(i * e, 0), P(i * e, W), "CHARPENTE")
        v.repere(*P(i * e, -2.0), str(i + 1))
    for k, n in enumerate(p.nefs):
        x0, B, pe = xs[k], n.portee, n.pente / 100
        R1 = math.hypot(B / 2, pe * B / 2)
        npn = max(2, math.ceil(R1 / p.entraxe_pannes - 1e-9) + 1)
        for q in range(npn):
            for y in (x0 + q * (B / 2) / (npn - 1), x0 + B - q * (B / 2) / (npn - 1)):
                v.line(P(-d, y), P(L + d, y), "CHARPENTE_SECOND")
        v.line(P(-d, x0 + B / 2), P(L + d, x0 + B / 2), "AXES")
        v.txt(*P(L + d + 0.4, x0 + B / 2), "faîtage", 2.0, align="MIDDLE_LEFT")
        npv = max(1, round(R1 / e))
        for mm in range(1, nbcv + 1):
            b = 1 if mm == 1 else (nt if mm == nbcv else 5 * (mm - 1))
            xa, xb = (b - 1) * e, b * e
            for half in (0, 1):
                for r in range(npv):
                    ya = x0 + half * B / 2 + r * (B / 2) / npv
                    yb = ya + (B / 2) / npv
                    v.line(P(xa, ya), P(xb, yb), "CONTREVENTEMENT")
                    v.line(P(xa, yb), P(xb, ya), "CONTREVENTEMENT")
        if k > 0:
            v.txt(*P(L + d + 0.4, x0), "chéneau central", 2.0, align="MIDDLE_LEFT")
    v.cote(P(0, 0), P(L, 0), P(0, -3.4), 0)
    v.cote(P(0, 0), P(0, W), P(-1.8, 0), 90)
    doc.saveas(chemin)
    return chemin, [(pl.titre, pl.denom) for pl in vues]
