"""Outils communs pour générer les livrets PDF de la formation CAO/DAO.

Auteur : Moulo Jean Claude
Chaque livret est décrit par une liste de blocs (titre, paragraphe, étapes,
figure, astuce, tableau, quiz...) puis transformé en PDF avec ReportLab.
"""
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.graphics.shapes import Circle, Drawing, Line, Polygon, Rect, String
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate, CondPageBreak, Frame, KeepTogether, ListFlowable, ListItem, PageBreak,
    PageTemplate, Paragraph, Spacer, Table, TableStyle,
)

FONT_DIR = "/usr/share/fonts/truetype/dejavu/"
pdfmetrics.registerFont(TTFont("DV", FONT_DIR + "DejaVuSans.ttf"))
pdfmetrics.registerFont(TTFont("DV-B", FONT_DIR + "DejaVuSans-Bold.ttf"))
pdfmetrics.registerFont(TTFont("DV-I", "/usr/share/fonts/truetype/freefont/FreeSansOblique.ttf"))
pdfmetrics.registerFont(TTFont("DV-BI", "/usr/share/fonts/truetype/freefont/FreeSansBoldOblique.ttf"))
pdfmetrics.registerFont(TTFont("DVM", FONT_DIR + "DejaVuSansMono.ttf"))
pdfmetrics.registerFontFamily("DV", normal="DV", bold="DV-B", italic="DV-I", boldItalic="DV-BI")

AUTEUR = "Moulo Jean Claude"
ORANGE = colors.HexColor("#E87722")   # orange Côte d'Ivoire
VERT = colors.HexColor("#009A44")     # vert Côte d'Ivoire
BLEU = colors.HexColor("#1F3B5C")
GRIS = colors.HexColor("#5F6B7A")
GRIS_CLAIR = colors.HexColor("#EEF1F5")
ROUGE = colors.HexColor("#C0392B")
JAUNE_CLAIR = colors.HexColor("#FFF6E0")
VERT_CLAIR = colors.HexColor("#E6F5EC")
ROUGE_CLAIR = colors.HexColor("#FCEBEA")
BLEU_CLAIR = colors.HexColor("#E8F0FA")

S = {
    "titre": ParagraphStyle("titre", fontName="DV-B", fontSize=26, leading=32, textColor=BLEU, alignment=TA_CENTER),
    "sous_titre": ParagraphStyle("sous_titre", fontName="DV", fontSize=14, leading=19, textColor=GRIS, alignment=TA_CENTER),
    "h1": ParagraphStyle("h1", fontName="DV-B", fontSize=17, leading=22, textColor=BLEU, spaceBefore=6, spaceAfter=8, keepWithNext=1),
    "h2": ParagraphStyle("h2", fontName="DV-B", fontSize=13, leading=17, textColor=ORANGE, spaceBefore=10, spaceAfter=5, keepWithNext=1),
    "h3": ParagraphStyle("h3", fontName="DV-B", fontSize=11, leading=14, textColor=BLEU, spaceBefore=6, spaceAfter=3, keepWithNext=1),
    "p": ParagraphStyle("p", fontName="DV", fontSize=10, leading=14.5, alignment=TA_JUSTIFY, spaceAfter=5),
    "cell": ParagraphStyle("cell", fontName="DV", fontSize=8.8, leading=11.5),
    "cell_b": ParagraphStyle("cell_b", fontName="DV-B", fontSize=8.8, leading=11.5, textColor=colors.white),
    "cap": ParagraphStyle("cap", fontName="DV-I", fontSize=8.5, leading=11, textColor=GRIS, alignment=TA_CENTER, spaceAfter=8),
    "code": ParagraphStyle("code", fontName="DVM", fontSize=8.8, leading=12, backColor=GRIS_CLAIR,
                           borderPadding=6, leftIndent=6, rightIndent=6, spaceBefore=4, spaceAfter=8),
    "box": ParagraphStyle("box", fontName="DV", fontSize=9.5, leading=13.5),
}


# --------------------------------------------------------------------------
# Mise en page : en-tête et pied de page sur chaque page
# --------------------------------------------------------------------------
def _page(module_titre):
    def dessiner(canv, doc):
        w, h = A4
        canv.saveState()
        # bandeau tricolore discret
        canv.setFillColor(ORANGE); canv.rect(0, h - 0.35 * cm, w / 3, 0.35 * cm, stroke=0, fill=1)
        canv.setFillColor(colors.white); canv.rect(w / 3, h - 0.35 * cm, w / 3, 0.35 * cm, stroke=0, fill=1)
        canv.setFillColor(VERT); canv.rect(2 * w / 3, h - 0.35 * cm, w / 3, 0.35 * cm, stroke=0, fill=1)
        canv.setFont("DV-B", 8.5); canv.setFillColor(BLEU)
        canv.drawString(2 * cm, h - 1.1 * cm, "FORMATION CAO/DAO & DIMENSIONNEMENT BÂTIMENT")
        canv.setFont("DV", 8.5); canv.setFillColor(GRIS)
        canv.drawRightString(w - 2 * cm, h - 1.1 * cm, module_titre)
        canv.drawString(2 * cm, h - 1.5 * cm, "Auteur : " + AUTEUR + " — Technicien génie civil BTP, Abidjan")
        canv.drawRightString(w - 2 * cm, h - 1.5 * cm, "Réf. : BAEL 91 mod. 99 / Eurocode 2")
        canv.setStrokeColor(ORANGE); canv.setLineWidth(0.8)
        canv.line(2 * cm, h - 1.7 * cm, w - 2 * cm, h - 1.7 * cm)
        canv.setStrokeColor(GRIS); canv.setLineWidth(0.4)
        canv.line(2 * cm, 1.5 * cm, w - 2 * cm, 1.5 * cm)
        canv.setFont("DV", 8); canv.setFillColor(GRIS)
        canv.drawString(2 * cm, 1.0 * cm, "© " + AUTEUR + " — Support de formation personnel — Côte d'Ivoire")
        canv.drawRightString(w - 2 * cm, 1.0 * cm, "Page %d" % doc.page)
        canv.restoreState()
    return dessiner


def construire_pdf(chemin, module_titre, titre_doc, blocs):
    doc = BaseDocTemplate(chemin, pagesize=A4, leftMargin=2 * cm, rightMargin=2 * cm,
                          topMargin=2.2 * cm, bottomMargin=2 * cm,
                          title=titre_doc, author=AUTEUR, subject=module_titre,
                          creator="Générateur formation CAO/DAO — " + AUTEUR)
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="f")
    doc.addPageTemplates([PageTemplate(id="p", frames=[frame], onPage=_page(module_titre))])
    story = []
    for b in blocs:
        story.extend(_bloc(b, doc.width))
    doc.build(story)


# --------------------------------------------------------------------------
# Blocs de contenu
# --------------------------------------------------------------------------
def _encadre(texte, titre, fond, bord, largeur):
    contenu = Paragraph("<b>" + titre + "</b><br/>" + texte, S["box"])
    t = Table([[contenu]], colWidths=[largeur])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), fond),
        ("LINEBEFORE", (0, 0), (0, -1), 3, bord),
        ("LEFTPADDING", (0, 0), (-1, -1), 10), ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    return [t, Spacer(1, 7)]


def _tableau(lignes, largeur, cols=None):
    data = [[Paragraph(str(c), S["cell_b"]) for c in lignes[0]]]
    data += [[Paragraph(str(c), S["cell"]) for c in l] for l in lignes[1:]]
    n = len(lignes[0])
    cw = [largeur * c for c in cols] if cols else [largeur / n] * n
    t = Table(data, colWidths=cw, repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BLEU),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, GRIS_CLAIR]),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#C5CDD8")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    return [t, Spacer(1, 8)]


def _bloc(b, largeur):
    k = b[0]
    if k == "couverture":
        _, titre, sous_titre, resume = b
        return [Spacer(1, 3 * cm), Paragraph(titre, S["titre"]), Spacer(1, 0.5 * cm),
                Paragraph(sous_titre, S["sous_titre"]), Spacer(1, 1.2 * cm),
                *_encadre(resume, "Ce que vous saurez faire à la fin de ce livret",
                          BLEU_CLAIR, BLEU, largeur),
                Spacer(1, 1 * cm),
                Paragraph("Auteur : <b>" + AUTEUR + "</b><br/>Technicien génie civil BTP — Abidjan, Côte d'Ivoire"
                          "<br/>Normes de référence : BAEL 91 modifié 99 et Eurocode 2 (EN 1992-1-1)",
                          S["sous_titre"]),
                PageBreak()]
    if k == "h1":
        return [CondPageBreak(10 * cm), Paragraph(b[1], S["h1"])] if len(b) > 2 and b[2] else [Paragraph(b[1], S["h1"])]
    if k in ("h2", "h3"):
        return [Paragraph(b[1], S[k])]
    if k == "p":
        return [Paragraph(b[1], S["p"])]
    if k == "puces":
        items = [ListItem(Paragraph(t, S["p"]), leftIndent=12) for t in b[1]]
        return [ListFlowable(items, bulletType="bullet", start="•", leftIndent=12, bulletFontName="DV")]
    if k == "etapes":
        items = [ListItem(Paragraph(t, S["p"]), leftIndent=16) for t in b[1]]
        return [ListFlowable(items, bulletType="1", leftIndent=16, bulletFontName="DV-B",
                             bulletColor=ORANGE)]
    if k == "astuce":
        return _encadre(b[1], "Astuce du formateur", VERT_CLAIR, VERT, largeur)
    if k == "attention":
        return _encadre(b[1], "Attention", ROUGE_CLAIR, ROUGE, largeur)
    if k == "image_mentale":
        return _encadre(b[1], "Pour bien comprendre (image simple)", JAUNE_CLAIR, ORANGE, largeur)
    if k == "ci":
        return _encadre(b[1], "Contexte ivoirien", JAUNE_CLAIR, VERT, largeur)
    if k == "ia":
        return _encadre(b[1], "Avec l'intelligence artificielle", BLEU_CLAIR, BLEU, largeur)
    if k == "capture":
        return _encadre(b[1], "Exercice capture d'écran", GRIS_CLAIR, GRIS, largeur)
    if k == "code":
        return [Paragraph(b[1].replace("\n", "<br/>").replace("  ", "&nbsp;&nbsp;"), S["code"])]
    if k == "tableau":
        return _tableau(b[1], largeur, b[2] if len(b) > 2 else None)
    if k == "fig":
        _, dessin, legende = b
        return [KeepTogether([dessin, Paragraph(legende, S["cap"])])]
    if k == "quiz":
        lignes = [["N°", "Question", "Réponse attendue"]]
        lignes += [[str(i + 1), q, r] for i, (q, r) in enumerate(b[1])]
        return [Paragraph("Quiz de contrôle (cachez la colonne de droite !)", S["h3"]),
                *_tableau(lignes, largeur, [0.06, 0.52, 0.42])]
    if k == "saut":
        return [PageBreak()]
    if k == "espace":
        return [Spacer(1, b[1])]
    raise ValueError(k)


# --------------------------------------------------------------------------
# Figures : reproductions simplifiées d'écrans de logiciels
# --------------------------------------------------------------------------
LARG_FIG = 17 * cm


def ecran(nom, couleur, onglets, outils, gauche, droite, bas, contenu=None, reperes=(), haut=9.5 * cm):
    """Dessine une fenêtre de logiciel schématique.

    onglets : liste d'onglets du ruban/menu ; outils : boutons de la barre
    gauche/droite : (titre, [lignes]) ou None ; bas : texte de la barre du bas
    contenu(d, x, y, w, h) : fonction qui dessine dans la zone de travail
    reperes : [(x_rel, y_rel, numéro)] cercles numérotés (0..1 dans la fenêtre)
    """
    W, H = LARG_FIG, haut
    d = Drawing(W, H)
    d.add(Rect(0, 0, W, H, fillColor=colors.HexColor("#2B2F36"), strokeColor=colors.black, strokeWidth=1))
    # barre de titre
    d.add(Rect(0, H - 16, W, 16, fillColor=couleur, strokeColor=None))
    d.add(String(8, H - 12, nom, fontName="DV-B", fontSize=8, fillColor=colors.white))
    for i, c in enumerate(["#E74C3C", "#F1C40F", "#2ECC71"]):
        d.add(Circle(W - 12 - i * 12, H - 8, 3.5, fillColor=colors.HexColor(c), strokeColor=None))
    # onglets
    y = H - 30
    d.add(Rect(0, y, W, 14, fillColor=colors.HexColor("#3A3F47"), strokeColor=None))
    x = 6
    for i, o in enumerate(onglets):
        lw = pdfmetrics.stringWidth(o, "DV", 7) + 10
        if i == 0:
            d.add(Rect(x - 3, y + 1, lw, 12, fillColor=colors.HexColor("#50565F"), strokeColor=None))
        d.add(String(x + 2, y + 4, o, fontName="DV", fontSize=7, fillColor=colors.white))
        x += lw + 2
    # barre d'outils
    y2 = y - 22
    d.add(Rect(0, y2, W, 22, fillColor=colors.HexColor("#E9ECEF"), strokeColor=None))
    x = 6
    for o in outils:
        lw = max(pdfmetrics.stringWidth(o, "DV", 6) + 8, 26)
        d.add(Rect(x, y2 + 3, lw, 16, fillColor=colors.white, strokeColor=colors.HexColor("#ADB5BD"), strokeWidth=0.5))
        d.add(String(x + lw / 2, y2 + 8, o, fontName="DV", fontSize=6, fillColor=colors.HexColor("#212529"), textAnchor="middle"))
        x += lw + 3
    # panneaux latéraux
    zone_bas = 16
    xg, xd = 0, W
    for cote, pan in (("g", gauche), ("d", droite)):
        if not pan:
            continue
        pw = 3.3 * cm
        px = 0 if cote == "g" else W - pw
        d.add(Rect(px, zone_bas, pw, y2 - zone_bas, fillColor=colors.HexColor("#F8F9FA"), strokeColor=colors.HexColor("#ADB5BD"), strokeWidth=0.5))
        d.add(Rect(px, y2 - 13, pw, 13, fillColor=colors.HexColor("#DDE2E7"), strokeColor=None))
        d.add(String(px + 4, y2 - 10, pan[0], fontName="DV-B", fontSize=6.5, fillColor=colors.HexColor("#212529")))
        ly = y2 - 24
        for l in pan[1]:
            d.add(String(px + 6, ly, l, fontName="DV", fontSize=6, fillColor=colors.HexColor("#343A40")))
            ly -= 9
        if cote == "g":
            xg = pw
        else:
            xd = W - pw
    # zone de travail
    d.add(Rect(xg, zone_bas, xd - xg, y2 - zone_bas, fillColor=colors.HexColor("#1E2228") if contenu is None or getattr(contenu, "fond_sombre", True) else colors.white, strokeColor=None))
    if contenu:
        contenu(d, xg, zone_bas, xd - xg, y2 - zone_bas)
    # barre du bas
    d.add(Rect(0, 0, W, zone_bas, fillColor=colors.HexColor("#3A3F47"), strokeColor=None))
    d.add(String(6, 5, bas, fontName="DVM", fontSize=6.5, fillColor=colors.HexColor("#E9ECEF")))
    for (rx, ry, n) in reperes:
        cx, cy = rx * W, ry * H
        d.add(Circle(cx, cy, 7, fillColor=ROUGE, strokeColor=colors.white, strokeWidth=1))
        d.add(String(cx, cy - 3, str(n), fontName="DV-B", fontSize=7.5, fillColor=colors.white, textAnchor="middle"))
    return d


# Plan de la villa d'étude (cotes en mètres) : 12 m x 10 m
PIECES = [
    ("Séjour / Salon", 0, 0, 7, 5.5),
    ("Cuisine", 7, 0, 12, 3.5),
    ("Douche-WC", 7, 3.5, 9.5, 5.5),
    ("Magasin", 9.5, 3.5, 12, 5.5),
    ("Chambre 1", 0, 5.5, 4, 10),
    ("Dégagement", 4, 5.5, 8, 7.5),
    ("SdB", 4, 7.5, 6, 10),
    ("Placard", 6, 7.5, 8, 10),
    ("Chambre 2", 8, 5.5, 12, 10),
]
AXES_X = [0, 4, 8, 12]
AXES_Y = [0, 5.5, 10]


def dessin_plan(couleur_mur=colors.white, couleur_txt=colors.HexColor("#9AD0FF"), axes=False, poteaux=False,
                cotes=False, fond_sombre=True):
    def f(d, x, y, w, h):
        echelle = min((w - 50) / 12.0, (h - 40) / 10.0)
        ox = x + (w - 12 * echelle) / 2
        oy = y + (h - 10 * echelle) / 2
        P = lambda a, b: (ox + a * echelle, oy + b * echelle)
        if axes:
            for i, a in enumerate(AXES_X):
                xa, _ = P(a, 0)
                d.add(Line(xa, oy - 14, xa, oy + 10 * echelle + 14, strokeColor=colors.HexColor("#E67E22"), strokeWidth=0.4, strokeDashArray=[4, 2, 1, 2]))
                d.add(Circle(xa, oy + 10 * echelle + 20, 6, fillColor=None, strokeColor=colors.HexColor("#E67E22"), strokeWidth=0.6))
                d.add(String(xa, oy + 10 * echelle + 17.5, "ABCD"[i], fontName="DV-B", fontSize=6.5, fillColor=colors.HexColor("#E67E22"), textAnchor="middle"))
            for i, b in enumerate(AXES_Y):
                _, ya = P(0, b)
                d.add(Line(ox - 14, ya, ox + 12 * echelle + 14, ya, strokeColor=colors.HexColor("#E67E22"), strokeWidth=0.4, strokeDashArray=[4, 2, 1, 2]))
                d.add(Circle(ox - 20, ya, 6, fillColor=None, strokeColor=colors.HexColor("#E67E22"), strokeWidth=0.6))
                d.add(String(ox - 20, ya - 2.5, str(i + 1), fontName="DV-B", fontSize=6.5, fillColor=colors.HexColor("#E67E22"), textAnchor="middle"))
        for (nom, a, b, c, e) in PIECES:
            (x0, y0), (x1, y1) = P(a, b), P(c, e)
            d.add(Rect(x0, y0, x1 - x0, y1 - y0, fillColor=None, strokeColor=couleur_mur, strokeWidth=1.6))
            surf = (c - a) * (e - b)
            d.add(String((x0 + x1) / 2, (y0 + y1) / 2 + 2, nom, fontName="DV", fontSize=5.5, fillColor=couleur_txt, textAnchor="middle"))
            d.add(String((x0 + x1) / 2, (y0 + y1) / 2 - 6, "%.1f m²" % surf, fontName="DV", fontSize=5, fillColor=couleur_txt, textAnchor="middle"))
        # porte d'entrée et fenêtres
        xe, ye = P(3, 0)
        d.add(Rect(xe, ye - 2, 1.0 * echelle, 4, fillColor=colors.HexColor("#E74C3C"), strokeColor=None))
        for (a, b, c, e) in [(1, 10, 2.5, 10), (9.5, 10, 11, 10), (0, 2, 0, 3.5), (12, 1, 12, 2.5), (8.5, 0, 10.5, 0)]:
            (x0, y0), (x1, y1) = P(a, b), P(c, e)
            d.add(Line(x0, y0, x1, y1, strokeColor=colors.HexColor("#5DADE2"), strokeWidth=3))
        if poteaux:
            for a in AXES_X:
                for b in AXES_Y:
                    xa, ya = P(a, b)
                    d.add(Rect(xa - 3, ya - 3, 6, 6, fillColor=colors.HexColor("#95A5A6"), strokeColor=colors.black, strokeWidth=0.5))
        if cotes:
            c = colors.HexColor("#2ECC71")
            x0, y0 = P(0, 0); x1, _ = P(12, 0)
            d.add(Line(x0, y0 - 10, x1, y0 - 10, strokeColor=c, strokeWidth=0.5))
            d.add(String((x0 + x1) / 2, y0 - 18, "12,00", fontName="DV", fontSize=6, fillColor=c, textAnchor="middle"))
            _, y1 = P(0, 10)
            d.add(Line(x1 + 10, y0, x1 + 10, y1, strokeColor=c, strokeWidth=0.5))
            d.add(String(x1 + 13, (y0 + y1) / 2, "10,00", fontName="DV", fontSize=6, fillColor=c))
    f.fond_sombre = fond_sombre
    return f


def dessin_portique(resultats=None, fond_sombre=True):
    """Modèle filaire 3D simplifié (poteaux/poutres) pour Robot / CYPECAD."""
    def f(d, x, y, w, h):
        e = min((w - 60) / 15.5, (h - 30) / 9.0)
        ox, oy = x + 30, y + 15
        dx, dy = 0.35, 0.28
        def P(a, b, z):
            return ox + (a + b * dx) * e, oy + (z + b * dy) * e
        trait = colors.HexColor("#5DADE2") if fond_sombre else BLEU
        for z in (0, 3, 6):
            for b in AXES_Y:
                xa, ya = P(0, b, z); xb, yb = P(12, b, z)
                if z > 0:
                    d.add(Line(xa, ya, xb, yb, strokeColor=trait, strokeWidth=1.1))
            for a in AXES_X:
                xa, ya = P(a, 0, z); xb, yb = P(a, 10, z)
                if z > 0:
                    d.add(Line(xa, ya, xb, yb, strokeColor=trait, strokeWidth=1.1))
        for a in AXES_X:
            for b in AXES_Y:
                xa, ya = P(a, b, 0); xb, yb = P(a, b, 6)
                d.add(Line(xa, ya, xb, yb, strokeColor=colors.HexColor("#F5B041"), strokeWidth=1.6))
                # appui encastré
                d.add(Polygon([xa - 4, ya - 5, xa + 4, ya - 5, xa, ya], fillColor=colors.HexColor("#2ECC71"), strokeColor=None))
        if resultats == "charges":
            for a in (2, 6, 10):
                for b in (2.75, 7.75):
                    xa, ya = P(a, b, 6)
                    d.add(Line(xa, ya + 16, xa, ya + 2, strokeColor=colors.HexColor("#E74C3C"), strokeWidth=1))
                    d.add(Polygon([xa - 2.5, ya + 5, xa + 2.5, ya + 5, xa, ya + 1], fillColor=colors.HexColor("#E74C3C"), strokeColor=None))
        if resultats == "moments":
            for b in AXES_Y:
                for a0 in (0, 4, 8):
                    pts = []
                    for i in range(11):
                        t = i / 10.0
                        m = 4 * t * (1 - t) - 0.35
                        xa, ya = P(a0 + 4 * t, b, 3)
                        pts += [xa, ya - m * 9]
                    for i in range(0, len(pts) - 2, 2):
                        d.add(Line(pts[i], pts[i + 1], pts[i + 2], pts[i + 3], strokeColor=colors.HexColor("#E74C3C"), strokeWidth=1))
    f.fond_sombre = fond_sombre
    return f


def schema_simple(largeur, hauteur, dessiner):
    d = Drawing(largeur, hauteur)
    dessiner(d)
    return d


def dessin_maison_3d(fond_sombre=False):
    """Vue 3D simplifiée de la villa R+1 (2 niveaux de 3 m, toiture terrasse)."""
    def f(d, x, y, w, h):
        e = min((w - 40) / 16.0, (h - 30) / 10.5)
        ox, oy = x + 20, y + 12
        dx, dy = 0.4, 0.3
        def P(a, b, z):
            return ox + (a + b * dx) * e, oy + (z + b * dy) * e
        def face(pts, c):
            flat = []
            for p in pts:
                flat += list(P(*p))
            d.add(Polygon(flat, fillColor=colors.HexColor(c), strokeColor=colors.black, strokeWidth=0.6))
        face([(0, 0, 0), (12, 0, 0), (12, 0, 6), (0, 0, 6)], "#E6D7BC")       # façade
        face([(12, 0, 0), (12, 10, 0), (12, 10, 6), (12, 0, 6)], "#C9B898")   # pignon
        face([(0, 0, 6), (12, 0, 6), (12, 10, 6), (0, 10, 6)], "#A9A9A9")     # terrasse
        face([(0, 0, 6), (12, 0, 6), (12, 0, 6.6), (0, 0, 6.6)], "#D5C4A1")   # acrotère
        face([(0, 0, 2.95), (12, 0, 2.95), (12, 0, 3.25), (0, 0, 3.25)], "#BFAE90")  # bandeau dalle
        for lvl in (0, 3):
            for a in (1, 4.5, 8.5):
                face([(a, 0, lvl + 1.0), (a + 1.6, 0, lvl + 1.0), (a + 1.6, 0, lvl + 2.3), (a, 0, lvl + 1.0 + 1.3)], "#5DADE2")
        face([(3, 0, 0), (4, 0, 0), (4, 0, 2.2), (3, 0, 2.2)], "#8E5B3A")    # porte
        face([(12, 3, 1.0), (12, 5, 1.0), (12, 5, 2.3), (12, 3, 2.3)], "#5DADE2")
        face([(12, 3, 4.0), (12, 5, 4.0), (12, 5, 5.3), (12, 3, 5.3)], "#5DADE2")
    f.fond_sombre = fond_sombre
    return f
