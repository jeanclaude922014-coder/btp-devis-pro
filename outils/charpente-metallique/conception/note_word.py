# -*- coding: utf-8 -*-
"""Note de calcul Word (.docx) du portique : hypothèses, modèle, efforts, vérifications EC3, ELS, réactions."""
import io
import datetime
import math

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from docx import Document
from docx.enum.section import WD_ORIENT
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

from .sections import section

BLEU = RGBColor(0x1F, 0x4E, 0x79)
ORANGE = RGBColor(0xC5, 0x5A, 0x11)
COUL = {"poteau_rive": "#1F4E79", "poteau_interieur": "#2E75B6", "traverse": "#0070C0"}
NOMS = {"poteau_rive": "Poteaux de rive", "poteau_interieur": "Poteaux intérieurs", "traverse": "Traverses"}


def fr(x, d=2):
    return f"{x:,.{d}f}".replace(",", " ").replace(".", ",")


# ============================================================================ figures
def _fig(w=17, h=7):
    fig, ax = plt.subplots(figsize=(w / 2.54, h / 2.54), dpi=200)
    ax.set_aspect("equal")
    ax.axis("off")
    return fig, ax


def _png(fig):
    buf = io.BytesIO()
    fig.savefig(buf, format="png", bbox_inches="tight", dpi=200)
    plt.close(fig)
    buf.seek(0)
    return buf


def _structure(ax, m, lw=2.0, col=None, alpha=1.0):
    for e in m.el:
        (x1, y1), (x2, y2) = m.X[e.i], m.X[e.j]
        ax.plot([x1, x2], [y1, y2], color=col or COUL[e.groupe], lw=lw * (1.6 if e.jarret else 1), alpha=alpha,
                solid_capstyle="round")
    for nd, bl in m.appuis:
        x, y = m.X[nd]
        if bl[2]:
            ax.plot([x - 0.5, x + 0.5], [y, y], color="k", lw=2.5)
        else:
            ax.fill([x, x - 0.35, x + 0.35], [y, y - 0.55, y - 0.55], color="#555", alpha=alpha)


def fig_modele(p, m, profils):
    fig, ax = _fig(17, 7.5)
    _structure(ax, m)
    for nom, b in m.barres.items():
        els = b["elements"]
        e = m.el[els[len(els) // 2]]
        (x1, y1), (x2, y2) = m.X[e.i], m.X[e.j]
        xm, ym = (x1 + x2) / 2, (y1 + y2) / 2
        dx = 0.35 if b["groupe"].startswith("poteau") else 0
        dy = max(0.9, p.largeur * 0.035) if b["groupe"] == "traverse" else 0
        ax.text(xm + dx, ym + dy, f"{nom}\n{b['sec']}", fontsize=6.5, color="#222",
                ha="left" if dx else "center", va="center")
    xs = sorted({round(x, 6) for x, y in m.X if abs(y) < 1e-9})
    ytxt = -1.3
    for a, b in zip(xs[:-1], xs[1:]):
        ax.annotate("", (a, ytxt), (b, ytxt), arrowprops=dict(arrowstyle="<->", lw=0.6))
        ax.text((a + b) / 2, ytxt - 0.45, f"{fr(b - a)} m", fontsize=6.5, ha="center", va="top")
    ax.text(xs[0] - 1.0, p.hauteur / 2, f"H = {fr(p.hauteur)} m", rotation=90, fontsize=6.5, ha="right", va="center")
    ax.set_xlim(xs[0] - 2.5, xs[-1] + 2.5)
    return _png(fig)


def fig_diagramme(p, m, eff, cle, titre, unite, couleur):
    fig, ax = _fig(17, 7.5)
    _structure(ax, m, lw=1.2, col="#999")
    vmax = max(max(abs(e[k]) for k in (cle + "i", cle + "j")) for e in eff) or 1
    if cle == "M":
        vmax = max(vmax, max(abs(e["Mmid"]) for e in eff))
    taille = max(p.largeur, p.hauteur) * 0.12
    s = taille / vmax
    for e, el in zip(eff, m.el):
        (x1, y1), (x2, y2) = m.X[el.i], m.X[el.j]
        L = math.hypot(x2 - x1, y2 - y1)
        nx, ny = -(y2 - y1) / L, (x2 - x1) / L
        if cle == "M":
            vals = [(0.0, e["Mi"]), (0.5, e["Mmid"]), (1.0, e["Mj"])]
            sign = -1   # moment tracé du côté tendu
        else:
            vals = [(0.0, e[cle + "i"]), (1.0, e[cle + "j"])]
            sign = 1
        pts = [(x1 + t * (x2 - x1) + sign * v * s * nx, y1 + t * (y2 - y1) + sign * v * s * ny) for t, v in vals]
        poly = [(x1, y1)] + pts + [(x2, y2)]
        ax.fill([q[0] for q in poly], [q[1] for q in poly], color=couleur, alpha=0.35, lw=0)
        ax.plot([q[0] for q in pts], [q[1] for q in pts], color=couleur, lw=0.8)
    # valeurs extrêmes annotées
    cand = []
    for e, el in zip(eff, m.el):
        for t, v in ((0.0, e[cle + "i"]), (1.0, e[cle + "j"])):
            (x1, y1), (x2, y2) = m.X[el.i], m.X[el.j]
            cand.append((abs(v), v, x1 + t * (x2 - x1), y1 + t * (y2 - y1)))
    cand.sort(reverse=True)
    vus = []
    for _, v, x, y in cand:
        if all(math.hypot(x - a, y - b) > max(p.largeur, p.hauteur) * 0.15 for a, b in vus):
            ax.text(x, y + 0.3, f"{fr(v, 1)}", fontsize=6.5, color="#000", ha="center",
                    bbox=dict(boxstyle="round,pad=0.15", fc="white", ec="none", alpha=0.8))
            vus.append((x, y))
        if len(vus) >= 6:
            break
    ax.set_title(f"{titre} ({unite})", fontsize=8)
    return _png(fig)


def fig_deformee(p, m, U, titre):
    fig, ax = _fig(17, 7.5)
    _structure(ax, m, lw=1.0, col="#BBB")
    dmax = max(math.hypot(U[3 * k], U[3 * k + 1]) for k in range(len(m.X))) or 1
    amp = max(p.largeur, p.hauteur) * 0.08 / dmax
    for el in m.el:
        (x1, y1), (x2, y2) = m.X[el.i], m.X[el.j]
        ax.plot([x1 + amp * U[3 * el.i], x2 + amp * U[3 * el.j]], [y1 + amp * U[3 * el.i + 1], y2 + amp * U[3 * el.j + 1]],
                color="#C00000", lw=1.4)
    ax.set_title(f"{titre} – amplification × {amp:.0f} – déplacement maximal {fr(dmax * 1000, 1)} mm", fontsize=8)
    return _png(fig)


# ============================================================================ Word
def _cell(c, txt, bold=False, size=8, color=None, fill=None, align=None):
    c.text = ""
    par = c.paragraphs[0]
    run = par.add_run(str(txt))
    run.font.size = Pt(size)
    run.font.bold = bold
    if color:
        run.font.color.rgb = color
    if align:
        par.alignment = align
    if fill:
        tcPr = c._tc.get_or_add_tcPr()
        shd = OxmlElement("w:shd")
        shd.set(qn("w:val"), "clear")
        shd.set(qn("w:color"), "auto")
        shd.set(qn("w:fill"), fill)
        tcPr.append(shd)


def _table(doc, header, rows, widths=None, size=8):
    t = doc.add_table(rows=1, cols=len(header))
    t.style = "Table Grid"
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    for k, h in enumerate(header):
        _cell(t.rows[0].cells[k], h, bold=True, size=size, color=RGBColor(255, 255, 255), fill="1F4E79")
    for r in rows:
        cells = t.add_row().cells
        for k, v in enumerate(r):
            fill = None
            if isinstance(v, str) and v in ("OK", "NON CONFORME"):
                fill = "C6EFCE" if v == "OK" else "FFC7CE"
            _cell(cells[k], v, size=size, fill=fill,
                  align=WD_ALIGN_PARAGRAPH.RIGHT if isinstance(v, str) and v[:1].isdigit() else None)
    if widths:
        for row in t.rows:
            for k, w in enumerate(widths):
                row.cells[k].width = Cm(w)
    doc.add_paragraph()
    return t


def _field(par, instr):
    r = par.add_run()
    f1 = OxmlElement("w:fldChar"); f1.set(qn("w:fldCharType"), "begin")
    it = OxmlElement("w:instrText"); it.set(qn("xml:space"), "preserve"); it.text = instr
    f2 = OxmlElement("w:fldChar"); f2.set(qn("w:fldCharType"), "end")
    r._r.append(f1); r._r.append(it); r._r.append(f2)
    r.font.size = Pt(8)


def _h(doc, txt, lvl=1):
    h = doc.add_heading(txt, level=lvl)
    for r in h.runs:
        r.font.color.rgb = BLEU if lvl == 1 else ORANGE
        r.font.name = "Arial"
    return h


def _p(doc, txt, size=10, italic=False, bold=False):
    par = doc.add_paragraph()
    r = par.add_run(txt)
    r.font.size = Pt(size)
    r.italic, r.bold = italic, bold
    return par


def generer_note(p, v, chemin):
    res, m = v["res"], v["res"]["modele"]
    profils = v["profils"]
    doc = Document()
    st = doc.styles["Normal"]
    st.font.name = "Arial"
    st.element.rPr.rFonts.set(qn("w:eastAsia"), "Arial")
    st.font.size = Pt(10)
    sec = doc.sections[0]
    sec.page_height, sec.page_width = Cm(29.7), Cm(21.0)
    sec.orientation = WD_ORIENT.PORTRAIT
    sec.left_margin = sec.right_margin = Cm(2.0)
    sec.top_margin, sec.bottom_margin = Cm(2.2), Cm(1.8)
    # en-tête et pied de page
    hd = sec.header.paragraphs[0]
    hd.text = ""
    r = hd.add_run(f"{p.auteur.upper()} – Technicien génie civil BTP – Abidjan")
    r.font.size, r.font.bold, r.font.color.rgb = Pt(9), True, BLEU
    hd.add_run(f"\nNote de calcul – {p.nom}").font.size = Pt(8)
    hd.alignment = WD_ALIGN_PARAGRAPH.LEFT
    pbdr = OxmlElement("w:pBdr")
    bot = OxmlElement("w:bottom")
    for k, val in (("val", "single"), ("sz", "8"), ("space", "1"), ("color", "C55A11")):
        bot.set(qn("w:" + k), val)
    pbdr.append(bot)
    hd._p.get_or_add_pPr().append(pbdr)
    ft = sec.footer.paragraphs[0]
    ft.alignment = WD_ALIGN_PARAGRAPH.CENTER
    ft.add_run("EC3 / EC1 / EC0 – Prédimensionnement – page ").font.size = Pt(8)
    _field(ft, "PAGE")
    ft.add_run(" / ").font.size = Pt(8)
    _field(ft, "NUMPAGES")
    # page de titre
    t = doc.add_paragraph()
    t.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = t.add_run("NOTE DE CALCUL\nPORTIQUE EN CHARPENTE MÉTALLIQUE")
    r.font.size, r.font.bold, r.font.color.rgb = Pt(20), True, BLEU
    t2 = doc.add_paragraph()
    t2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = t2.add_run(f"{p.nom}\n{p.lieu}")
    r.font.size = Pt(13)
    _table(doc, ["Rubrique", "Valeur"], [
        ["Ouvrage", p.description()],
        ["Client", p.client or "—"],
        ["Établi par", p.auteur],
        ["Date", datetime.date.today().strftime("%d/%m/%Y")],
        ["Normes", "EN 1993-1-1 (EC3), EN 1991-1-1 et 1-4 (EC1), EN 1990 (EC0) ; fondations : BAEL 91 mod. 99 / EC2"],
        ["Logiciel", "Calcul par éléments finis 2D (méthode des déplacements) – module conception du classeur de quantitatif"],
    ], widths=[4, 13])
    if p.extra.get("avertissement"):
        _p(doc, "⚠ " + p.extra["avertissement"], 9, italic=True)
    ok_global = all(d["ratio"] <= 1 for d in list(v["barres"].values()) + v["els"])
    _p(doc, ("CONCLUSION : toutes les vérifications sont satisfaites." if ok_global else
             "CONCLUSION : des vérifications ne sont pas satisfaites – voir § 7 et § 8."), 11, bold=True)
    _table(doc, ["Élément", "Profilé retenu", "Taux de travail maximal"],
           [[NOMS[g], profils[g], fr(v["ratio_groupes"].get(g, 0))] for g in ("poteau_rive", "poteau_interieur", "traverse")
            if profils.get(g) not in (None, "—")], widths=[6, 5, 6])
    doc.add_page_break()

    # 1. hypothèses
    _h(doc, "1. Objet et hypothèses générales")
    _p(doc, "La présente note justifie le portique courant du bâtiment : calcul des sollicitations par éléments finis "
            "plans, vérification des barres selon l'EC3 et vérification des déformations. Les pannes, lisses, "
            "contreventements et fondations font l'objet du rapport de vérification du classeur.")
    _table(doc, ["Donnée", "Valeur"], [
        ["Nombre de nefs", str(len(p.nefs))],
        ["Portées", " + ".join(f"{fr(n.portee)} m" for n in p.nefs)],
        ["Pentes", ", ".join(f"{fr(n.pente, 1)} %" for n in p.nefs)],
        ["Hauteur sous sablière", f"{fr(p.hauteur)} m"],
        ["Longueur du bâtiment", f"{fr(p.longueur)} m ({p.nb_travees} travées)"],
        ["Entraxe des portiques", f"{fr(p.entraxe_reel)} m"],
        ["Pieds de poteaux", p.appuis],
        ["Jarrets", f"longueur {fr(p.jarret_ratio * 100, 0)} % de la portée, hauteur {fr(p.jarret_hauteur, 1)} × h traverse"],
        ["Acier", f"S{int(p.fy)} – fy = {fr(p.fy, 0)} MPa – E = {fr(p.E, 0)} MPa – γM0 = {p.gM0} – γM1 = {p.gM1}"],
        ["Maintiens latéraux", f"poteaux : bracons tous les {fr(p.maintien_poteau * p.entraxe_lisses)} m ; "
                               f"traverses : bracons tous les {fr(p.maintien_traverse * p.entraxe_pannes)} m"],
    ], widths=[5, 12])
    _h(doc, "2. Charges", 1)
    vv = p.vent
    _table(doc, ["Cas", "Description", "Valeur"], [
        ["G", "Couverture (tôles, fixations, translucides)", f"{fr(p.G_couverture)} kN/m²"],
        ["G", "Pannes et liernes", f"{fr(p.G_pannes)} kN/m²"],
        ["G", "Poids propre des barres", "calculé (kg/ml × 9,81)"],
        ["Q", "Entretien de toiture (EC1, catégorie H)", f"{fr(p.Q_toiture)} kN/m² en projection horizontale"],
        ["W", "Vitesse de référence vb / ce(z)", f"{fr(vv.vb, 1)} m/s / {fr(vv.ce)}"],
        ["W", "Pression de pointe qp = ce × ½ ρ vb²", f"{fr(vv.qp, 3)} kN/m²"],
        ["W", "cpe parois au vent / sous le vent", f"{fr(vv.cpe_mur_au_vent)} / {fr(vv.cpe_mur_sous_vent)}"],
        ["W", "cpe versant au vent / autres versants", f"{fr(vv.cpe_toit_au_vent)} / {fr(vv.cpe_toit_sous_vent)}"],
        ["W", "cpi surpression / dépression", f"{fr(vv.cpi_surpression)} / {fr(vv.cpi_depression)}"],
    ], widths=[1.5, 10, 5.5])
    _p(doc, "Neige : sans objet (Côte d'Ivoire). La vitesse de vent est une valeur par défaut à confirmer par les "
            "données météorologiques locales (SODEXAM) : il n'existe pas de carte EC1 pour la Côte d'Ivoire.", 9, italic=True)
    _h(doc, "3. Combinaisons d'actions (EN 1990)", 1)
    rows = [[k, " + ".join(f"{fr(c, 2)}·{n}" for n, c in d.items())] for k, d in res["def_elu"].items()]
    rows += [[k, " + ".join(f"{fr(c, 2)}·{n}" for n, c in d.items())] for k, d in res["def_els"].items()]
    _table(doc, ["Combinaison", "Coefficients"], rows, widths=[8, 9], size=7.5)
    _p(doc, "Q de toiture de catégorie H : ψ0 = 0, elle n'est pas combinée avec le vent.", 9, italic=True)

    # 4. modèle
    doc.add_page_break()
    _h(doc, "4. Modèle de calcul", 1)
    doc.add_picture(fig_modele(p, m, profils), width=Cm(17))
    _p(doc, f"{len(m.X)} nœuds, {len(m.el)} éléments. Chaque barre est découpée en tronçons ; le premier tronçon de "
            f"chaque traverse représente le jarret (inertie × {fr(p.jarret_hauteur ** 2, 1)}).", 9)
    # 5. résultats
    _h(doc, "5. Sollicitations", 1)
    c_q = "ELU 1,35G + 1,5Q"
    doc.add_picture(fig_diagramme(p, m, res["elu"][c_q]["efforts"], "M", f"Moments fléchissants – {c_q}", "kN·m",
                                  "#C00000"), width=Cm(16.5))
    cw = max((k for k in res["elu"] if "1,0G" in k),
             key=lambda k: max(abs(e["Mi"]) for e in res["elu"][k]["efforts"]))
    doc.add_picture(fig_diagramme(p, m, res["elu"][cw]["efforts"], "M", f"Moments fléchissants – {cw}", "kN·m",
                                  "#7030A0"), width=Cm(16.5))
    doc.add_picture(fig_diagramme(p, m, res["elu"][c_q]["efforts"], "N", f"Efforts normaux – {c_q}", "kN",
                                  "#2E75B6"), width=Cm(16.5))
    # réactions
    _h(doc, "6. Réactions d'appui (pour le calcul des fondations)", 2)
    rows = []
    for nd, _ in m.appuis:
        x = m.X[nd][0]
        for k in list(res["elu"]) + list(res["els"]):
            pass
        best = {}
        for k, r in list(res["elu"].items()) + list(res["els"].items()):
            R = r["reactions"][nd]
            best.setdefault("Vmax", (R[1], k))
            best.setdefault("Vmin", (R[1], k))
            best.setdefault("Hmax", (abs(R[0]), k))
            if R[1] > best["Vmax"][0]:
                best["Vmax"] = (R[1], k)
            if R[1] < best["Vmin"][0]:
                best["Vmin"] = (R[1], k)
            if abs(R[0]) > best["Hmax"][0]:
                best["Hmax"] = (abs(R[0]), k)
        rows.append([f"x = {fr(x)} m", f"{fr(best['Vmax'][0], 1)}", best["Vmax"][1], f"{fr(best['Vmin'][0], 1)}",
                     best["Vmin"][1], f"{fr(best['Hmax'][0], 1)}"])
    _table(doc, ["Appui", "V max (kN)", "Combinaison", "V min (kN)", "Combinaison", "|H| max (kN)"], rows,
           widths=[2.2, 2, 4.5, 2, 4.5, 2], size=7)
    _p(doc, "V > 0 : compression sur la fondation ; V < 0 : soulèvement (à reprendre par le poids de la semelle).",
       9, italic=True)

    # 7. vérifications EC3
    doc.add_page_break()
    _h(doc, "7. Vérifications des barres (EN 1993-1-1)", 1)
    _p(doc, "Section (6.2.9.1) : M_Ed ≤ M_N,Rd = M_pl,Rd (1 − n) / (1 − 0,5 a). Cisaillement (6.2.6) : V_Ed ≤ A_v f_y / (√3 γM0). "
            "Stabilité (6.3.3, annexe B) : N/(χy N_Rk/γM1) + k_yy M/(χLT M_Rk/γM1) ≤ 1 (6.61) et "
            "N/(χz N_Rk/γM1) + k_zy M/(χLT M_Rk/γM1) ≤ 1 (6.62). Déversement : méthode générale (6.3.2.2), "
            "M_cr de la poutre bi-symétrique.", 9)
    rows = []
    for nom, d in v["barres"].items():
        rows.append([nom, d["sec"], f"{fr(d['longueur'])}", f"{fr(d['N'], 1)}", f"{fr(d['M'], 1)}",
                     f"{fr(d['r_sec'])}", f"{fr(d['r61'])}", f"{fr(d['r62'])}", f"{fr(d['ratio'])}",
                     "OK" if d["ratio"] <= 1 else "NON CONFORME"])
    _table(doc, ["Barre", "Profilé", "L (m)", "N (kN)", "M (kN·m)", "Section", "6.61", "6.62", "Taux", "Statut"],
           rows, widths=[1.3, 1.8, 1.3, 1.6, 1.8, 1.5, 1.4, 1.4, 1.4, 2.4], size=7)
    for nom, d in v["barres"].items():
        _h(doc, f"Barre {nom} – {d['sec']} ({NOMS[d['groupe']].lower()})", 2)
        s_ = section(d["sec"])
        _table(doc, ["Grandeur", "Valeur", "Grandeur", "Valeur"], [
            ["Combinaison déterminante", d["combinaison"], "N_Ed / V_Ed / M_Ed",
             f"{fr(d['N'], 1)} kN / {fr(d['V'], 1)} kN / {fr(d['M'], 1)} kN·m"],
            ["N_pl,Rd", f"{fr(d['Npl'], 0)} kN", "M_pl,Rd", f"{fr(d['Mpl'], 1)} kN·m"],
            ["V_pl,Rd", f"{fr(d['Vpl'], 0)} kN", "A / Wpl,y / Iz", f"{fr(s_.A, 1)} cm² / {fr(s_.Wply, 0)} cm³ / {fr(s_.Iz, 0)} cm⁴"],
            ["L_cr,y / λ̄y / χy", f"{fr(d['Ly'])} m / {fr(d['lam_y'])} / {fr(d['chi_y'], 3)}",
             "L_cr,z / λ̄z / χz", f"{fr(d['Lz'])} m / {fr(d['lam_z'])} / {fr(d['chi_z'], 3)}"],
            ["L_LT / C1 / M_cr", f"{fr(d['LLT'])} m / {fr(d['C1'])} / {fr(d['Mcr'], 1)} kN·m",
             "λ̄LT / χLT", f"{fr(d['lam_lt'])} / {fr(d['chi_lt'], 3)}"],
            ["Section / cisaillement", f"{fr(d['r_sec'])} / {fr(d['r_v'])}", "6.61 / 6.62", f"{fr(d['r61'])} / {fr(d['r62'])}"],
        ], widths=[3.8, 4.7, 3.6, 4.9], size=7.5)
    # 8. ELS
    _h(doc, "8. États limites de service", 1)
    doc.add_picture(fig_deformee(p, m, res["els"]["ELS G + Q"]["U"], "Déformée ELS G + Q"), width=Cm(16))
    rows = [[e["verif"], e["combinaison"], f"{fr(e['valeur'], 1)} mm", f"{fr(e['limite'], 1)} mm", f"{fr(e['ratio'])}",
             "OK" if e["ratio"] <= 1 else "NON CONFORME"] for e in v["els"]]
    _table(doc, ["Vérification", "Combinaison", "Valeur", "Limite", "Taux", "Statut"], rows,
           widths=[5, 4.2, 2, 2, 1.5, 2.3], size=7.5)
    _p(doc, f"Limites : flèche des traverses L/{p.fleche_traverse:g}, déplacement en tête H/{p.deplacement_tete:g}.", 9,
       italic=True)
    # 9. métré
    _h(doc, "9. Poids des portiques", 1)
    rows, tot = [], 0.0
    for nom, b in m.barres.items():
        s_ = section(b["sec"])
        kg = s_.kg * b["longueur"]
        tot += kg
        rows.append([nom, b["sec"], fr(b["longueur"]), fr(s_.kg, 1), fr(kg, 0)])
    rows.append(["Total d'un portique", "", "", "", fr(tot, 0)])
    nb = p.nb_travees + 1
    rows.append([f"Total des {nb} portiques (hors jarrets, platines, boulons)", "", "", "", fr(tot * nb, 0)])
    _table(doc, ["Barre", "Profilé", "L (m)", "kg/ml", "Poids (kg)"], rows, widths=[6, 2.5, 2, 2, 3])
    # 10. conclusion
    _h(doc, "10. Conclusion", 1)
    _p(doc, ("Le portique est justifié avec les profilés retenus. " if ok_global else
             "Certaines vérifications ne sont pas satisfaites : augmenter les profilés concernés. ") +
       "Les assemblages (jarrets, faîtage, pieds de poteaux), les maintiens latéraux (bracons) et les fondations "
       "doivent être justifiés dans les notes correspondantes. Cette note de prédimensionnement doit être revue et "
       "visée avant exécution.")
    t = doc.add_table(rows=2, cols=3)
    t.style = "Table Grid"
    for k, lab in enumerate([f"Établi par : {p.auteur}", "Vérifié par :", "Visa :"]):
        _cell(t.rows[0].cells[k], lab, bold=True, size=9)
        _cell(t.rows[1].cells[k], "\n\n\n", size=9)
    doc.core_properties.author = p.auteur
    doc.core_properties.title = f"Note de calcul – {p.nom}"
    doc.save(chemin)
    return chemin
