# -*- coding: utf-8 -*-
import os, math, datetime
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.section import WD_ORIENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
import calc as C

OUT = os.environ['OUT']; IMG = os.environ['IMG']
AUTEUR = 'Moulo Jean Claude'
DATE = '04/10/2026'
PROJET = 'Construction d\'un bâtiment industriel 30,00 x 10,00 m'
BLEU = RGBColor(0x1F, 0x3A, 0x5F)

# ------------------------------------------------------------------ utilitaires
def fnum(x, d=0):
    s = f'{x:,.{d}f}'.replace(',', ' ').replace('.', ',')
    return s.replace(' ', ' ')

def lettres(n):
    U = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze',
         'treize', 'quatorze', 'quinze', 'seize']
    D = {2: 'vingt', 3: 'trente', 4: 'quarante', 5: 'cinquante', 6: 'soixante'}
    def lt100(n):
        if n <= 16: return U[n]
        if n < 20: return 'dix-' + U[n - 10]
        d, u = divmod(n, 10)
        if d in (7, 9):
            base = 'soixante' if d == 7 else 'quatre-vingt'
            r = n - (60 if d == 7 else 80)
            if r == 11 and d == 7: return 'soixante et onze'
            return base + '-' + lt100(r)
        if d == 8: return 'quatre-vingts' if u == 0 else 'quatre-vingt-' + U[u]
        if u == 0: return D[d]
        if u == 1: return D[d] + ' et un'
        return D[d] + '-' + U[u]
    def lt1000(n, final=True):
        c, r = divmod(n, 100)
        out = []
        if c:
            out.append('cent' if c == 1 else U[c] + (' cents' if r == 0 and final else ' cent'))
        if r: out.append(lt100(r))
        return ' '.join(out)
    n = int(round(n))
    if n == 0: return 'zéro'
    parts = []
    mi, r = divmod(n, 1_000_000)
    mil, r = divmod(r, 1000)
    if mi: parts.append(lt1000(mi) + (' million' if mi == 1 else ' millions'))
    if mil: parts.append('mille' if mil == 1 else lt1000(mil, final=False) + ' mille')
    if r: parts.append(lt1000(r))
    return ' '.join(parts)

def shade(cell, hexcol):
    tcPr = cell._tc.get_or_add_tcPr()
    sh = OxmlElement('w:shd'); sh.set(qn('w:val'), 'clear'); sh.set(qn('w:color'), 'auto'); sh.set(qn('w:fill'), hexcol)
    tcPr.append(sh)

def field(run, code):
    f1 = OxmlElement('w:fldChar'); f1.set(qn('w:fldCharType'), 'begin')
    it = OxmlElement('w:instrText'); it.set(qn('xml:space'), 'preserve'); it.text = code
    f2 = OxmlElement('w:fldChar'); f2.set(qn('w:fldCharType'), 'end')
    run._r.append(f1); run._r.append(it); run._r.append(f2)

def new_doc(titre_doc, landscape=False):
    d = Document()
    st = d.styles['Normal']; st.font.name = 'Calibri'; st.font.size = Pt(10)
    st.element.rPr.rFonts.set(qn('w:eastAsia'), 'Calibri')
    for lvl, sz in ((1, 14), (2, 12), (3, 11)):
        h = d.styles[f'Heading {lvl}']; h.font.name = 'Calibri'; h.font.size = Pt(sz); h.font.color.rgb = BLEU
    s = d.sections[0]
    if landscape:
        s.orientation = WD_ORIENT.LANDSCAPE; s.page_width, s.page_height = Cm(29.7), Cm(21.0)
    else:
        s.page_width, s.page_height = Cm(21.0), Cm(29.7)
    s.left_margin = s.right_margin = Cm(1.8); s.top_margin = Cm(2.6); s.bottom_margin = Cm(1.8)
    s.header_distance = Cm(0.8)
    # en-tête
    hd = s.header; p = hd.paragraphs[0]
    t = hd.add_table(rows=1, cols=2, width=s.page_width - s.left_margin - s.right_margin)
    c0, c1 = t.rows[0].cells
    r = c0.paragraphs[0].add_run('MOULO JEAN CLAUDE'); r.bold = True; r.font.size = Pt(11); r.font.color.rgb = BLEU
    c0.add_paragraph('Technicien Génie Civil BTP - Abidjan, Côte d\'Ivoire').runs[0].font.size = Pt(8)
    p1 = c1.paragraphs[0]; p1.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    r = p1.add_run(titre_doc); r.bold = True; r.font.size = Pt(10); r.font.color.rgb = BLEU
    p2 = c1.add_paragraph(PROJET); p2.alignment = WD_ALIGN_PARAGRAPH.RIGHT; p2.runs[0].font.size = Pt(8)
    p3 = c1.add_paragraph(f'Date : {DATE} - Normes : BAEL 91 mod. 99 / EC2'); p3.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p3.runs[0].font.size = Pt(8)
    for c in (c0, c1): shade(c, 'EAF0F7')
    p.text = ''
    # pied de page
    fp = s.footer.paragraphs[0]; fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = fp.add_run(f'Document établi par {AUTEUR} - Technicien Génie Civil BTP  |  Page '); r.font.size = Pt(8)
    r = fp.add_run(); r.font.size = Pt(8); field(r, 'PAGE')
    r = fp.add_run(' / '); r.font.size = Pt(8)
    r = fp.add_run(); r.font.size = Pt(8); field(r, 'NUMPAGES')
    cp = d.core_properties; cp.author = AUTEUR; cp.last_modified_by = AUTEUR; cp.title = f'{titre_doc} - {PROJET}'
    cp.created = datetime.datetime(2026, 10, 4)
    return d

def titre(d, t, st=None):
    p = d.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run(t); r.bold = True; r.font.size = Pt(18); r.font.color.rgb = BLEU
    if st:
        p = d.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run(st); r.font.size = Pt(11); r.italic = True

def table(d, head, rows, widths=None, align=None, bold_rows=(), fill_rows=None, fs=8.5):
    t = d.add_table(rows=1, cols=len(head)); t.style = 'Table Grid'; t.alignment = WD_TABLE_ALIGNMENT.CENTER
    for i, h in enumerate(head):
        c = t.rows[0].cells[i]; c.text = ''
        r = c.paragraphs[0].add_run(h); r.bold = True; r.font.size = Pt(fs); r.font.color.rgb = RGBColor(255, 255, 255)
        c.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER; shade(c, '1F3A5F')
    fill_rows = fill_rows or {}
    for k, row in enumerate(rows):
        cells = t.add_row().cells
        for i, v in enumerate(row):
            cells[i].text = ''
            r = cells[i].paragraphs[0].add_run(str(v)); r.font.size = Pt(fs)
            if k in bold_rows: r.bold = True
            if align and align[i] == 'r': cells[i].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.RIGHT
            if align and align[i] == 'c': cells[i].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
            if k in fill_rows: shade(cells[i], fill_rows[k])
    # répéter l'en-tête
    trPr = t.rows[0]._tr.get_or_add_trPr(); th = OxmlElement('w:tblHeader'); th.set(qn('w:val'), 'true'); trPr.append(th)
    if widths:
        for row in t.rows:
            for i, w in enumerate(widths):
                row.cells[i].width = Cm(w)
    d.add_paragraph()
    return t

def puces(d, items):
    for it in items:
        d.add_paragraph(it, style='List Bullet')

MO_K = 'Main-d\'œuvre'
LOTNAME = {l: n for l, n, _ in C.LOTS}
OPTION = {l: o for l, _, o in C.LOTS}
q = C.q

# =================================================================== 1. ESQUISSE
def esquisse():
    d = new_doc('ESQUISSE', landscape=True)
    titre(d, 'ESQUISSE - BÂTIMENT INDUSTRIEL 30,00 x 10,00 m',
          'Murs en agglos 15 pleins - Piliers BA tous les 5,00 m - Entrée 6,00 m - Toiture 2 versants pente 20 %')
    d.add_heading('1. Données du projet', 1)
    table(d, ['Paramètre', 'Valeur retenue'], [
        ['Dimensions en plan (entre axes)', '30,00 m x 10,00 m - emprise 300 m², surface utile ≈ 294 m²'],
        ['Maçonnerie', 'Agglos 15 pleins (40 x 20 x 15) - fondation h = 1,00 m, élévation 6,00 m'],
        ['Chaînages', 'Bas (+0,00/+0,20), intermédiaire (+3,00/+3,20), haut (+5,80/+6,00) - section 15 x 20'],
        ['Ferraillage', 'Armatures longitudinales HA10 - étriers/cadres HA6 (FeE500)'],
        ['Piliers', f'{C.N_PIL} piliers BA tous les 5,00 m ; chaque pilier = 2 poteaux 15 x 20 jumelés (15 x 40), 8 HA10'],
        ['Entrée', 'Ouverture 6,00 m (pignon Est), portail 6,00 x 4,50 m, linteau BA 15 x 40'],
        ['Toiture', 'Deux versants, pente 20 % → flèche 1,00 m, faîtage à +7,00 m, pignons triangulaires'],
        ['Fondations', 'Semelle filante BA 40 x 20 sous murs + semelles isolées 100 x 100 x 30 sous piliers, fond de fouille à -1,25/-1,40'],
        ['Matériaux', 'Béton dosé à 350 kg/m³ (≈ C25/30), CPJ 42,5, sable lavé, gravier concassé'],
    ], widths=[6, 19])
    d.add_heading('2. Interprétations et hypothèses à valider', 1)
    puces(d, [
        '« Autour de chaque pilier deux poteaux » a été interprété comme : chaque pilier est constitué de 2 poteaux 15 x 20 '
        'jumelés (section totale 15 x 40, dans l\'épaisseur du mur agglo 15), posés sur une semelle isolée commune. '
        'Si vous entendiez 2 poteaux distincts de part et d\'autre de chaque pilier, je mets à jour le métré.',
        'Disposition des piliers : 7 piliers par long pan (axes 1 à 7), 1 pilier au centre du pignon Ouest, 2 piliers '
        'd\'encadrement de l\'entrée sur le pignon Est (le pilier central y est supprimé) → 17 piliers au total.',
        'Pente 20 % appliquée à une toiture à 2 versants de 5,00 m chacun (flèche = 5,00 x 0,20 = 1,00 m).',
        'Hauteur 6,00 m comptée du terrain naturel (±0,00) au dessus du chaînage haut ; fondation 1,00 m sous le TN.',
        'Entrée 6,00 m placée au centre du pignon Est (2,00 m de mur de chaque côté).',
        'Note vocale WhatsApp jointe : elle n\'a pas pu être transcrite ; seul le texte du message a été utilisé.',
    ])
    d.add_heading('3. Plans d\'esquisse', 1)
    for f, cap in [('01_plan.png', 'Plan d\'implantation des piliers et des murs'),
                   ('02_facade_long_pan.png', 'Façade Nord (long pan)'),
                   ('03_pignon_entree.png', 'Pignon Est - façade d\'entrée'),
                   ('04_coupe_AA.png', 'Coupe transversale A-A'),
                   ('05_details_ferraillage.png', 'Détails de ferraillage type')]:
        d.add_page_break()
        h = 16.0 if f in ('03_pignon_entree.png', '04_coupe_AA.png') else None
        if h: d.add_picture(f'{IMG}/{f}', height=Cm(h))
        else: d.add_picture(f'{IMG}/{f}', width=Cm(26.0))
        d.paragraphs[-1].alignment = WD_ALIGN_PARAGRAPH.CENTER
        p = d.add_paragraph(cap); p.alignment = WD_ALIGN_PARAGRAPH.CENTER; p.runs[0].italic = True
    d.add_page_break()
    d.add_heading('4. Tableau des éléments structuraux', 1)
    table(d, ['Élément', 'Section / dimensions', 'Armatures longitudinales', 'Armatures transversales', 'Béton'], [
        ['Semelle isolée (17 u)', '1,00 x 1,00 x 0,30', 'Nappe 2 x 7 HA10 e = 15 cm', '-', '350 kg/m³'],
        ['Semelle filante', '0,40 x 0,20', '4 HA10 filants', 'Répartiteurs HA6 e = 20 cm', '350 kg/m³'],
        ['Pilier (17 u)', '15 x 40 (2 x 15 x 20)', '8 HA10', '2 cadres HA6 / niveau, e = 15 (10 en zones nodales)', '350 kg/m³'],
        ['Chaînage bas', '15 x 20', '4 HA10', 'Cadres HA6 e = 20 cm', '350 kg/m³'],
        ['Chaînage intermédiaire', '15 x 20 à +3,00', '4 HA10', 'Cadres HA6 e = 20 cm', '350 kg/m³'],
        ['Chaînage haut', '15 x 20 à +5,80', '4 HA10', 'Cadres HA6 e = 20 cm', '350 kg/m³'],
        ['Linteau d\'entrée', '15 x 40, portée 6,00 m', '2 lits 3 HA10 (inf.) + 2 HA10 (sup.)', 'Cadres HA6 e = 15 cm', '350 kg/m³'],
        ['Chaînages rampants', '15 x 15, pente 20 %', '4 HA10', 'Cadres HA6 e = 20 cm', '350 kg/m³'],
    ], widths=[4, 4.2, 5.5, 6.5, 2.5])
    d.add_heading('5. Vérifications sommaires (BAEL 91 mod. 99 / EC2)', 1)
    table(d, ['Vérification', 'Calcul', 'Conclusion'], [
        ['Pourcentage mini chaînage 15 x 20', '4 HA10 = 3,14 cm² → 1,05 % > 0,2 % (BAEL) et > 0,26 fctm/fyk·b·d (EC2)', 'Vérifié'],
        ['Pourcentage pilier 15 x 40', '8 HA10 = 6,28 cm² → 1,05 % ; 0,2 % < ρ < 5 %', 'Vérifié'],
        ['Diamètre des cadres', 'Øt = 6 mm ≥ Øl/3 = 3,3 mm (BAEL) et ≥ max(6 ; Øl/4) (EC2)', 'Vérifié'],
        ['Espacement des cadres de pilier', 'st ≤ min(15 Øl = 15 cm ; a + 10 = 25 cm ; 40 cm) = 15 cm (BAEL) ; '
         'EC2 : scl,max = min(20 Øl ; b ; 400) = 15 cm', 'e = 15 cm retenu'],
        ['Élancement pilier (sens faible)', 'lf ≈ 0,7 x 3,00 = 2,10 m ; λ = 2,10 x √12 / 0,15 = 48,5 < 50', 'Vérifié (BAEL)'],
        ['Linteau 6,00 m (ELU)', 'pu ≈ 7,0 kN/m → Mu = 7,0 x 6,20² / 8 = 33,6 kN·m ; μ = 0,123 ; As = 2,33 cm² '
         '< 6 HA10 = 4,71 cm²', 'Vérifié'],
        ['Enrobage', 'Fondations : 4 cm (XC2, sol latéritique humide) ; élévation : 3 cm (XC3/XC4 climat tropical)', 'À respecter'],
    ], widths=[5.5, 14.5, 3.5])
    p = d.add_paragraph('Ces vérifications sont sommaires : la charpente (ratio 17 kg/m²), les réactions d\'appui sur les '
                        'piliers et la contrainte admissible du sol (hypothèse σsol ≥ 1,5 bar sur latérite) doivent être '
                        'confirmées par une note de calcul et une reconnaissance géotechnique avant exécution.')
    p.runs[0].italic = True
    d.add_heading('6. Recommandations - contexte ivoirien', 1)
    puces(d, [
        'Sol latéritique : purger les poches argileuses ou organiques, arroser et compacter le fond de fouille avant le béton de propreté.',
        'Chaleur tropicale : cure humide du béton pendant au moins 7 jours (arrosage, sacs mouillés) ; éviter le bétonnage entre 12 h et 15 h.',
        'Agglos : fabrication au moins 28 jours avant la pose, arrosage pendant 7 jours, humidification avant pose.',
        'Arase étanche hydrofugée sur le chaînage bas contre les remontées capillaires (saison des pluies).',
        'Traitement anti-termites des fouilles et sous dallage.',
        'Toiture pente 20 % : bonne évacuation des fortes pluies ; prévoir gouttières et descentes EP (non chiffrées).',
    ])
    d.save(f'{OUT}/01_Esquisse_Batiment_Industriel_30x10.docx')

# =================================================================== 2. DQE
def dqe():
    d = new_doc('DEVIS QUANTITATIF ET ESTIMATIF')
    titre(d, 'DEVIS QUANTITATIF ET ESTIMATIF (DQE)', 'Bâtiment industriel 30,00 x 10,00 m - Abidjan, Côte d\'Ivoire')
    d.add_heading('1. Bases du devis', 1)
    puces(d, [
        'Quantités issues de l\'avant-métré ci-dessous (dimensions de l\'esquisse du même jour).',
        f'Prix unitaires de vente = déboursé sec unitaire x coefficient K = {fnum(C.K, 4)} '
        f'(frais de chantier {int(C.FC*100)} %, frais généraux {int(C.FG*100)} %, aléas {int(C.ALEA*100)} %, '
        f'bénéfice {int(C.BEN*100)} %) - voir document « Déboursé sec ».',
        'Prix en FCFA, conditions du marché d\'Abidjan en octobre 2026, à actualiser avec les cotations des fournisseurs.',
        'TVA 18 % (Côte d\'Ivoire).',
        'Le gros œuvre (lots 0 à 3) correspond strictement à la demande ; les lots 4 à 7 sont des options pour rendre le bâtiment exploitable.',
    ])
    d.add_heading('2. Avant-métré', 1)
    rows = [[a['code'], a['des'], a['metre'], a['u'], fnum(a['q'], 2)] for a in C.ART]
    table(d, ['N°', 'Désignation', 'Détail du calcul', 'U', 'Quantité'], rows,
          widths=[1.0, 6.2, 7.0, 1.0, 2.2], align=['c', 'l', 'l', 'c', 'r'], fs=8)
    d.add_heading('3. Nomenclature des aciers', 1)
    rows = []
    for lot, elt, nu, lg in C.acier_detail:
        rows.append([f'Lot {lot}', elt, nu, fnum(lg, 1), fnum(lg * C.KG[nu], 1)])
    tot = {nu: sum(lg for _, _, n, lg in C.acier_detail if n == nu) for nu in C.KG}
    for nu in ('HA10', 'HA6'):
        rows.append(['', f'Total {nu} (hors chutes)', nu, fnum(tot[nu], 1), fnum(tot[nu] * C.KG[nu], 1)])
        rows.append(['', f'Total {nu} avec 5 % de chutes', nu, '', fnum(tot[nu] * C.KG[nu] * C.CHUTES, 1)])
        rows.append(['', f'Nombre de barres de 12 m à commander', nu, '',
                     f'{math.ceil(tot[nu] * C.CHUTES / 12)} barres'])
    n = len(C.acier_detail)
    table(d, ['Lot', 'Élément', 'Nuance', 'Longueur (m)', 'Poids (kg)'], rows, widths=[1.3, 9.5, 1.5, 2.3, 2.6],
          align=['c', 'l', 'c', 'r', 'r'], bold_rows=range(n, n + 6), fs=8)
    d.add_page_break()
    d.add_heading('4. Devis quantitatif et estimatif', 1)
    rows, bold, fill = [], [], {}
    tot_lot = {}
    for lot, name, opt in C.LOTS:
        rows.append([f'LOT {lot}', name, '', '', '', '']); bold.append(len(rows) - 1); fill[len(rows) - 1] = 'D6E4F0'
        for a in [a for a in C.ART if a['lot'] == lot]:
            rows.append([a['code'], a['des'], a['u'], fnum(a['q'], 2), fnum(a['pv_u']), fnum(a['pv_tot'])])
        tot_lot[lot] = sum(a['pv_tot'] for a in C.ART if a['lot'] == lot)
        rows.append(['', f'Sous-total lot {lot}', '', '', '', fnum(tot_lot[lot])]); bold.append(len(rows) - 1)
        fill[len(rows) - 1] = 'F2F2F2'
    table(d, ['N°', 'Désignation', 'U', 'Qté', 'P.U. HT (FCFA)', 'Montant HT (FCFA)'], rows,
          widths=[1.1, 8.3, 0.9, 1.8, 2.3, 3.0], align=['c', 'l', 'c', 'r', 'r', 'r'], bold_rows=bold, fill_rows=fill, fs=8)
    d.add_heading('5. Récapitulatif', 1)
    go = sum(tot_lot[l] for l in tot_lot if not OPTION[l])
    op = sum(tot_lot[l] for l in tot_lot if OPTION[l])
    rows = [[f'Lot {l}', LOTNAME[l], fnum(tot_lot[l])] for l in tot_lot if not OPTION[l]]
    rows += [['', 'TOTAL GROS ŒUVRE HT (A)', fnum(go)], ['', 'TVA 18 %', fnum(go * C.TVA)],
             ['', 'TOTAL GROS ŒUVRE TTC', fnum(go * (1 + C.TVA))]]
    rows += [[f'Lot {l}', LOTNAME[l], fnum(tot_lot[l])] for l in tot_lot if OPTION[l]]
    tg = go + op
    rows += [['', 'TOTAL OPTIONS HT (B)', fnum(op)], ['', 'TOTAL GÉNÉRAL HT (A + B)', fnum(tg)],
             ['', 'TVA 18 %', fnum(tg * C.TVA)], ['', 'TOTAL GÉNÉRAL TTC (A + B)', fnum(tg * (1 + C.TVA))]]
    b = [4, 5, 6, 11, 12, 13, 14]
    table(d, ['Lot', 'Désignation', 'Montant (FCFA)'], rows, widths=[1.5, 11.5, 4.0], align=['c', 'l', 'r'],
          bold_rows=b, fill_rows={6: 'D6E4F0', 14: 'D6E4F0'}, fs=9)
    ttc_go = round(go * (1 + C.TVA)); ttc = round(tg * (1 + C.TVA))
    p = d.add_paragraph()
    p.add_run('Arrêté le présent devis (gros œuvre) à la somme TTC de : ').bold = True
    p.add_run(f'{lettres(ttc_go)} francs CFA ({fnum(ttc_go)} FCFA).')
    p = d.add_paragraph()
    p.add_run('Montant TTC avec toutes les options : ').bold = True
    p.add_run(f'{lettres(ttc)} francs CFA ({fnum(ttc)} FCFA).')
    d.add_paragraph(f'Ratio gros œuvre : {fnum(go / 300)} FCFA HT/m² d\'emprise ; ratio global : {fnum(tg / 300)} FCFA HT/m².')
    d.add_paragraph()
    p = d.add_paragraph(f'Fait à Abidjan, le {DATE}'); p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p = d.add_paragraph(f'{AUTEUR}\nTechnicien Génie Civil BTP'); p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p.runs[0].bold = True
    d.save(f'{OUT}/02_Devis_Quantitatif_Estimatif_Batiment_30x10.docx')
    return go, op

# =================================================================== 3. DÉBOURSÉ SEC
def ds():
    d = new_doc('DÉBOURSÉ SEC')
    titre(d, 'DÉBOURSÉ SEC ET SOUS-DÉTAILS DE PRIX', 'Bâtiment industriel 30,00 x 10,00 m - Abidjan, Côte d\'Ivoire')
    d.add_heading('1. Définition', 1)
    d.add_paragraph('Le déboursé sec (DS) est le coût direct de réalisation des ouvrages : matériaux + main-d\'œuvre + '
                    'matériel, sans frais de chantier, frais généraux, aléas, bénéfice ni TVA. Le petit outillage est '
                    'compté à 3 % de la main-d\'œuvre dans chaque sous-détail.')
    d.add_heading('2. Prix de base (Abidjan, octobre 2026 - à confirmer par cotations)', 1)
    rows = [[lib, u, fnum(pu)] for lib, u, pu in C.PRIX.values()]
    table(d, ['Matériau', 'Unité', 'Prix (FCFA)'], rows, widths=[11, 2, 3], align=['l', 'c', 'r'], fs=8.5)
    noms = {'chef': 'Chef de chantier', 'macon': 'Maçon', 'ferr': 'Ferrailleur', 'coff': 'Coffreur',
            'soud': 'Soudeur / couvreur', 'manoeuvre': 'Manœuvre', 'tech': 'Technicien (implantation)'}
    table(d, ['Main-d\'œuvre', 'Unité', 'Salaire journalier (FCFA)'], [[noms[k], 'h.j', fnum(v)] for k, v in C.MO.items()],
          widths=[11, 2, 3], align=['l', 'c', 'r'], fs=8.5)
    table(d, ['Matériel (location)', 'Unité', 'Prix (FCFA)'],
          [['Bétonnière 350 L', 'j', fnum(C.MAT['betonniere'])], ['Vibreur', 'j', fnum(C.MAT['vibreur'])],
           ['Dame sauteuse', 'j', fnum(C.MAT['dame'])], ['Camion benne 10 m³', 'voyage', fnum(C.MAT['camion'])]],
          widths=[11, 2, 3], align=['l', 'c', 'r'], fs=8.5)
    d.add_heading('3. Sous-détails des prix unitaires', 1)
    for a in C.ART:
        p = d.add_paragraph(); r = p.add_run(f"Article {a['code']} - {a['des']} (unité : {a['u']})"); r.bold = True
        r.font.color.rgb = BLEU
        rows = []
        for nat, lib, u, qq, pu in a['comp']:
            rows.append([nat, lib, u, fnum(qq, 3), fnum(pu), fnum(qq * pu)])
        po = 0.03 * a['ds_nat']['Main-d\'œuvre']
        if po:
            rows.append(['Matériel', 'Petit outillage (3 % de la MO)', '%', '3', '', fnum(po)])
        rows.append(['', f"DÉBOURSÉ SEC UNITAIRE / {a['u']}", '', '', '', fnum(a['ds_u'])])
        table(d, ['Nature', 'Composante', 'U', 'Qté/unité', 'P.U.', 'Montant'], rows,
              widths=[2.2, 7.6, 1.0, 1.8, 1.9, 2.4], align=['l', 'l', 'c', 'r', 'r', 'r'],
              bold_rows=[len(rows) - 1], fill_rows={len(rows) - 1: 'F2F2F2'}, fs=8)
    d.add_page_break()
    d.add_heading('4. Déboursé sec total par article', 1)
    rows, bold, fill = [], [], {}
    tot = {}
    for lot, name, opt in C.LOTS:
        rows.append([f'LOT {lot}', name, '', '', '', '', '', '']); bold.append(len(rows) - 1); fill[len(rows) - 1] = 'D6E4F0'
        arts = [a for a in C.ART if a['lot'] == lot]
        for a in arts:
            n = a['ds_nat']
            rows.append([a['code'], a['des'], a['u'], fnum(a['q'], 2), fnum(n['Matériaux'] * a['q']),
                         fnum(n['Main-d\'œuvre'] * a['q']), fnum(n['Matériel'] * a['q']), fnum(a['ds_tot'])])
        t = {k: sum(a['ds_nat'][k] * a['q'] for a in arts) for k in ('Matériaux', 'Main-d\'œuvre', 'Matériel')}
        t['tot'] = sum(t.values()); tot[lot] = t
        rows.append(['', f'Sous-total DS lot {lot}', '', '', fnum(t['Matériaux']), fnum(t['Main-d\'œuvre']),
                     fnum(t['Matériel']), fnum(t['tot'])]); bold.append(len(rows) - 1); fill[len(rows) - 1] = 'F2F2F2'
    table(d, ['N°', 'Désignation', 'U', 'Qté', 'Matériaux', 'Main-d\'œuvre', 'Matériel', 'DS total'], rows,
          widths=[0.9, 5.8, 0.8, 1.4, 2.2, 2.0, 1.7, 2.3], align=['c', 'l', 'c', 'r', 'r', 'r', 'r', 'r'],
          bold_rows=bold, fill_rows=fill, fs=7.5)
    d.add_heading('5. Récapitulatif du déboursé sec', 1)
    def somme(f):
        ls = [l for l in tot if f(l)]
        return {k: sum(tot[l][k] for l in ls) for k in ('Matériaux', 'Main-d\'œuvre', 'Matériel', 'tot')}
    go = somme(lambda l: not OPTION[l]); op = somme(lambda l: OPTION[l]); tg = somme(lambda l: True)
    rows = [[f'Lot {l}', LOTNAME[l], fnum(tot[l]['Matériaux']), fnum(tot[l]['Main-d\'œuvre']), fnum(tot[l]['Matériel']),
             fnum(tot[l]['tot'])] for l in tot if not OPTION[l]]
    rows.append(['', 'DS GROS ŒUVRE (A)', fnum(go['Matériaux']), fnum(go['Main-d\'œuvre']), fnum(go['Matériel']), fnum(go['tot'])])
    rows += [[f'Lot {l}', LOTNAME[l], fnum(tot[l]['Matériaux']), fnum(tot[l]['Main-d\'œuvre']), fnum(tot[l]['Matériel']),
              fnum(tot[l]['tot'])] for l in tot if OPTION[l]]
    rows.append(['', 'DS OPTIONS (B)', fnum(op['Matériaux']), fnum(op['Main-d\'œuvre']), fnum(op['Matériel']), fnum(op['tot'])])
    rows.append(['', 'DS TOTAL (A + B)', fnum(tg['Matériaux']), fnum(tg['Main-d\'œuvre']), fnum(tg['Matériel']), fnum(tg['tot'])])
    rows.append(['', 'Répartition gros œuvre', fnum(go['Matériaux']/go['tot']*100, 1) + ' %',
                 fnum(go[MO_K]/go['tot']*100, 1) + ' %', fnum(go['Matériel']/go['tot']*100, 1) + ' %', '100 %'])
    table(d, ['Lot', 'Désignation', 'Matériaux', 'Main-d\'œuvre', 'Matériel', 'DS total'], rows,
          widths=[1.2, 6.8, 2.5, 2.4, 2.0, 2.5], align=['c', 'l', 'r', 'r', 'r', 'r'],
          bold_rows=[4, 9, 10, 11], fill_rows={4: 'D6E4F0', 10: 'D6E4F0'}, fs=8)
    d.add_heading('6. Besoins en matériaux (liste de commande)', 1)
    for titre_b, base in (('Gros œuvre seul (lots 0 à 3)', True), ('Gros œuvre + options (lots 0 à 7)', False)):
        d.add_paragraph(titre_b).runs[0].bold = True
        need = C.besoins(base)
        rows = []
        for (lib, u, pu), qq in sorted(need.items(), key=lambda x: -x[0][2] * x[1]):
            if u == 'ft': continue
            arr = math.ceil(qq) if u in ('sac', 'u') else round(qq, 1)
            extra = ''
            if lib.startswith('Acier HA10'): extra = f' (≈ {math.ceil(qq / 7.40)} barres de 12 m)'
            if lib.startswith('Acier HA6'): extra = f' (≈ {math.ceil(qq / 2.66)} barres de 12 m)'
            if lib.startswith('Ciment'): extra = f' (≈ {fnum(qq * 50 / 1000, 1)} t)'
            rows.append([lib, u, fnum(arr, 0 if u in ('sac', 'u') else 1) + extra, fnum(qq * pu)])
        table(d, ['Matériau', 'U', 'Quantité', 'Montant (FCFA)'], rows, widths=[7.5, 1.2, 5.3, 3.0],
              align=['l', 'c', 'r', 'r'], fs=8)
    d.add_heading('7. Passage du déboursé sec au prix de vente', 1)
    d.add_paragraph(f'K = (1 + frais de chantier) / (1 - (frais généraux + aléas + bénéfice)) = (1 + {C.FC:.2f}) / '
                    f'(1 - ({C.FG:.2f} + {C.ALEA:.2f} + {C.BEN:.2f})) = {fnum(C.K, 4)}')
    rows = [['Déboursé sec', fnum(go['tot']), fnum(tg['tot'])],
            [f'Prix de vente HT (DS x K, PU arrondis)', fnum(sum(a['pv_tot'] for a in C.ART if not OPTION[a['lot']])),
             fnum(sum(a['pv_tot'] for a in C.ART))],
            ['Marge brute (frais + aléas + bénéfice)',
             fnum(sum(a['pv_tot'] for a in C.ART if not OPTION[a['lot']]) - go['tot']),
             fnum(sum(a['pv_tot'] for a in C.ART) - tg['tot'])]]
    table(d, ['Rubrique', 'Gros œuvre (FCFA)', 'Avec options (FCFA)'], rows, widths=[8, 4.5, 4.5],
          align=['l', 'r', 'r'], bold_rows=[1], fs=9)
    d.add_paragraph('Main-d\'œuvre estimée (gros œuvre) : ' +
                    fnum(go['Main-d\'œuvre'] / 7500) + ' hommes-jours environ (base moyenne 7 500 FCFA/h.j).')
    p = d.add_paragraph(f'Fait à Abidjan, le {DATE}'); p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p = d.add_paragraph(f'{AUTEUR}\nTechnicien Génie Civil BTP'); p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p.runs[0].bold = True
    d.save(f'{OUT}/03_Debourse_Sec_Batiment_30x10.docx')
    return go, op

if __name__ == '__main__':
    esquisse()
    print('DQE', dqe())
    g, o = ds()
    print('DS', round(g['tot']), round(o['tot']))
