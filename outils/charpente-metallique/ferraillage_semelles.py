# -*- coding: utf-8 -*-
"""Feuille FERRAILLAGE_SEMELLES : calcul et vérification du ferraillage des semelles isolées
(BAEL 91 mod. 99 – méthode des bielles ; EN 1992-1-1 9.2.1.1 et 6.4.4 ; Fascicule 62 titre V).

Toutes les valeurs sont des formules Excel. Les formules sont les mêmes que celles du générateur
HTML (planches 14 et 15) : en saisissant dans les cellules jaunes les efforts de la planche 15, les
deux outils donnent les mêmes résultats (vérification croisée).

Trois types de semelles en colonnes : S1 poteaux de rive, S2 poteaux intérieurs, S3 poteaux de pignon.
"""
import re

FS = "FERRAILLAGE_SEMELLES"
COLS = ["D", "E", "F"]
TYPES = ["S1 – rive", "S2 – intérieure", "S3 – pignon"]
CAND = [10, 12, 14, 16, 20]
# barres de fût proposées : (n, Ø) classées par section croissante puis nombre de barres (comme le JS)
FUT = sorted([(n, d) for n in (4, 6, 8) for d in (12, 14, 16, 20)], key=lambda q: (q[0] * 3.141592653589793 * q[1] ** 2 / 400, q[0]))


def build(wb, M, h):
    """h : dictionnaire des utilitaires du générateur (st, title, header, section, yellow, XA, page_setup,
    FILL, FormulaRule, Font, FONT, C_BLEU_CLAIR, NF_2)."""
    st, yellow, FILL, FormulaRule, Font = h["st"], h["yellow"], h["FILL"], h["FormulaRule"], h["Font"]
    ws = wb.create_sheet(FS)
    h["title"](ws, "FERRAILLAGE DES SEMELLES ISOLÉES – CALCUL ET VÉRIFICATION (BAEL 91 mod. 99 / EC2)",
               "Méthode des bielles, aciers minimaux EC2, poinçonnement EC2 6.4.4, sol latéritique (Fascicule 62-V). "
               "Toutes les cellules sont des formules ; cellules jaunes = efforts de la note de calcul HTML (facultatif).", 8)
    R = {}            # nom -> ligne
    row = [4]

    def nxt():
        row[0] += 1
        return row[0]

    def sec(text):
        row[0] += 1
        h["section"](ws, nxt(), text, 2, 7)

    def cell_ref(expr, col):
        # [nom] -> cellule de la même colonne
        return re.sub(r"\[([A-Za-z0-9_]+)\]", lambda m: f"{col}{R[m.group(1)]}", expr)

    def line(name, label, rule, exprs, unit="", fmt="#,##0.00", bold=False, fill=None):
        r = nxt()
        R[name] = r
        st(ws.cell(r, 2, label), bold=bold)
        st(ws.cell(r, 3, rule), size=8, italic=True, wrap=True)
        if isinstance(exprs, str):
            exprs = [exprs] * 3
        for col, ex in zip(COLS, exprs):
            c = ws[f"{col}{r}"]
            st(c, fmt=fmt, h="right", bold=bold, fill=fill or h["C_BLEU_CLAIR"])
            M.disp(FS, f"{col}{r}", cell_ref(ex, col), fmt)
        st(ws.cell(r, 7, unit), size=9, h="center")
        return r

    def saisie(name, label, unit):
        r = nxt()
        R[name] = r
        st(ws.cell(r, 2, label))
        st(ws.cell(r, 3, "facultatif – sinon estimation ci-dessus"), size=8, italic=True)
        for col, t in zip(COLS, ("S1", "S2", "S3")):
            c = ws[f"{col}{r}"]
            yellow(c, "#,##0.00")
            M.param(f"fs_{name}_{t}", FS, f"{col}{r}")
        st(ws.cell(r, 7, unit), size=9, h="center")

    # ------------------------------------------------------------------ 1. géométrie
    sec("1. TYPES DE SEMELLES ET GÉOMÉTRIE (PARAMÈTRES)")
    r = nxt()
    h["header"](ws, r, ["Grandeur", "Formule / règle", TYPES[0], TYPES[1], TYPES[2], "Unité"])
    line("nb", "Nombre de semelles", "rive : 2 N ; intérieures : noues + file centrale ; pignon",
         ["2*{N}", "{n_int}+{n_val}", "{n_pp}"], "u", "0")
    line("a", "Côté de la semelle a", "PARAMÈTRES", ["{a1}", "{a1}", "{a2}"], "m")
    line("h", "Hauteur de la semelle h", "PARAMÈTRES", ["{h_s1}", "{h_s1}", "{h_s2}"], "m")
    line("b", "Côté du fût b", "PARAMÈTRES", ["{f1}", "{f1}", "{f2}"], "m")
    line("hf", "Hauteur du fût", "PARAMÈTRES", "{h_fut}", "m")
    line("c", "Enrobage", "PARAMÈTRES", "{c_fond}", "m")

    # ------------------------------------------------------------------ 2. efforts
    sec("2. EFFORTS SUR UNE SEMELLE (par poteau)")
    line("G", "Charge permanente G (estimation)", "rive : qG B/2 + poteau ; intérieure : qG B + poteau ; pignon : G e × entraxe/2",
         ["{v_RG}", "{v_qG}*{portee}+{kg_pot}*{Hf}*9.81/1000", "{v_Gm2}*{e_ppr}*{er}/2+{kg_pp}*{Hf}*9.81/1000"], "kN")
    line("Q", "Exploitation Q (estimation)", "même surface reprise",
         ["{v_RQ}", "{v_qQ}*{portee}", "{Q_toit}*{e_ppr}*{er}/2"], "kN")
    line("W", "Soulèvement au vent W (estimation)", "w × surface reprise",
         ["{v_RW}", "{v_qW}*{portee}", "{v_wt}*{e_ppr}*{er}/2"], "kN")
    line("Hw", "Effort horizontal au vent ELU (estimation)", "1,5 w e H / 2",
         ["1.5*{v_wm}*{er}*{Hm}/2", "1.5*{v_wm}*{er}*{Hm}/2", "1.5*{v_wm}*{e_ppr}*{Hf}/2"], "kN")
    r = nxt()
    st(ws.cell(r, 2, "Saisie facultative : reporter ici les efforts de la planche 15 du générateur HTML "
                     "(calcul aux éléments finis du portique). Une cellule vide garde l'estimation."),
       size=8, italic=True, border=False)
    for nm, lab, u in [("Nser", "N ELS (combinaison déterminante)", "kN"), ("Mser", "M ELS concomitant (encastrement)", "kN·m"),
                       ("Nu", "N ELU (combinaison déterminante)", "kN"), ("Mu", "M ELU concomitant (encastrement)", "kN·m"),
                       ("Nt", "Soulèvement ELU Nt", "kN"), ("Hg", "Glissement : H du couple déterminant", "kN"),
                       ("Ng", "Glissement : N du même couple", "kN")]:
        saisie("in_" + nm, lab, u)
    est = {"Nser": "[G]+[Q]", "Mser": "0", "Nu": "1.35*[G]+1.5*[Q]", "Mu": "0", "Nt": "MAX(0,1.5*[W]-[G])",
           "Hg": "[Hw]", "Ng": "[G]-1.5*[W]"}
    for nm, lab, u in [("Nser", "N ELS retenu", "kN"), ("Mser", "M ELS retenu", "kN·m"), ("Nu", "N ELU retenu", "kN"),
                       ("Mu", "M ELU retenu", "kN·m"), ("Nt", "Nt ELU retenu", "kN"), ("Hg", "H retenu (glissement)", "kN"),
                       ("Ng", "N concomitant retenu (glissement)", "kN")]:
        line(nm, lab, "saisie si renseignée, sinon estimation", f"IF(ISNUMBER([in_{nm}]),[in_{nm}],{est[nm]})", u, bold=True)

    # ------------------------------------------------------------------ 3. calcul
    sec("3. POIDS PROPRE, CONTRAINTES SUR LE SOL ET MÉTHODE DES BIELLES")
    line("hsol", "Hauteur des terres sur la semelle", "max(0 ; D − propreté − h)", "MAX(0,{D}-{e_prop}-[h])", "m")
    line("Wf", "Poids fondation + terres P", "γb (a² h + b² hf) + γt (a² − b²) h terres",
         "{g_beton}*([a]^2*[h]+[b]^2*[hf])+{g_terre}*([a]^2-[b]^2)*[hsol]", "kN")

    def sigma(N, Mo):
        e = f"IF({N}>0,ABS({Mo})/({N}),0)"
        return (f"IF({N}<=0,0,IF({e}<=[a]/6,({N})/[a]^2*(1+3*{e}/[a]),IF({e}<[a]/2,({N})/(2*[a]*([a]/2-{e})),99000)))/1000")
    line("sELS", "Contrainte de référence σ3/4 – ELS", "e ≤ a/6 : N/a² (1 + 3e/a) ; sinon N / (2a (a/2 − e))",
         sigma("[Nser]+[Wf]", "[Mser]"), "MPa", "0.000")
    line("sELU", "Contrainte de référence σ3/4 – ELU", "N = Nu + 1,35 P", sigma("[Nu]+1.35*[Wf]", "[Mu]"), "MPa", "0.000")
    line("Nuf", "Effort sur la semelle Nu,f", "Nu + 1,35 γb b² hf (fût)", "[Nu]+1.35*{g_beton}*[b]^2*[hf]", "kN")
    line("e0", "Excentricité e0 = Mu / Nu", "", "IF([Nu]>0,ABS([Mu])/[Nu],0)", "m", "0.000")
    line("Np", "Effort de calcul des bielles Nu'", "e0 ≤ a/24 : Nu,f ; sinon Nu,f (1 + 3 e0 / a)",
         "IF([e0]<=[a]/24,[Nuf],[Nuf]*(1+3*[e0]/[a]))", "kN")
    line("kf", "Majoration pour fissuration", "1 / 1,10 (préjudiciable) / 1,50 (très préjudiciable)",
         'IF({fiss}="Très préjudiciable",1.5,IF({fiss}="Préjudiciable",1.1,1))', "", "0.00")
    line("fsu", "Contrainte de calcul des aciers fsu", "fe / γs", "{fe}/{gs}", "MPa", "0.0")
    line("ft", "Résistance à la traction ft28", "0,6 + 0,06 fc28", "0.6+0.06*{fc28}", "MPa")
    line("fctm", "Résistance moyenne à la traction fctm", "0,30 fck^(2/3) (EC2)", "0.3*{fc28}^(2/3)", "MPa", "0.000")
    line("rmin", "Pourcentage minimal ρmin", "max(0,26 fctm/fyk ; 0,13 % ; 0,23 ft28/fe)",
         "MAX(0.26*[fctm]/{fe},0.0013,0.23*[ft]/{fe})", "", "0.0000%")

    sec("4. CHOIX DE LA NAPPE INFÉRIEURE (plus petit Ø donnant un espacement ≥ 10 cm)")
    for d in CAND:
        line(f"d{d}", f"HA{d} : hauteur utile d", "h − c − Ø", f"[h]-[c]-{d}/1000", "m", "0.000")
        line(f"A{d}", f"HA{d} : As requise (chaque sens)", "max(kf Nu' (a − b) / (8 d fsu) ; ρmin a d)",
             f"MAX([kf]*[Np]*([a]-[b])/(8*[d{d}]*[fsu])*10,[rmin]*[a]*[d{d}]*10000)", "cm²")
        line(f"n{d}", f"HA{d} : nombre de barres", "max(2 ; As / AØ ; (a − 2c − Ø) / 25 cm + 1)",
             f"MAX(2,ROUNDUP([A{d}]/(PI()*{d}^2/400)-1E-9,0),ROUNDUP(([a]-2*[c]-{d}/1000)/0.25-1E-9,0)+1)", "u", "0")
        line(f"e{d}", f"HA{d} : espacement", "(a − 2c − Ø) / (n − 1)", f"([a]-2*[c]-{d}/1000)/([n{d}]-1)", "m", "0.000")

    def choix(var, last="20"):
        s = last
        for d in reversed(CAND[:-1]):
            s = f"IF([e{d}]>=0.1-1E-9,{var(d)},{s})"
        return s
    line("D", "Diamètre retenu Ø", "premier Ø dont l'espacement ≥ 10 cm", choix(lambda d: str(d)), "mm", "0", bold=True)
    sel = lambda nm: "+".join(f"IF([D]={d},[{nm}{d}],0)" for d in CAND)
    line("n", "Nombre de barres par sens", "", sel("n"), "u", "0", bold=True)
    line("es", "Espacement", "", sel("e"), "m", "0.000", bold=True)
    line("d", "Hauteur utile d", "", sel("d"), "m", "0.000")
    line("Ar", "As requise (chaque sens)", "", sel("A"), "cm²")
    line("As", "As prévue (chaque sens)", "n π Ø² / 400", "[n]*PI()*[D]^2/400", "cm²", bold=True)
    line("Asb", "dont As bielles", "kf Nu' (a − b) / (8 d fsu)", "[kf]*[Np]*([a]-[b])/(8*[d]*[fsu])*10", "cm²")
    line("Amin", "dont As minimale", "ρmin a d", "[rmin]*[a]*[d]*10000", "cm²")
    r = nxt()
    st(ws.cell(r, 2, "Ferraillage prévu dans PARAMÈTRES (ha_sem, m_sem) – comparé à la section requise :"),
       size=8, italic=True, border=False)
    line("Dp", "Prévu : diamètre", "PARAMÈTRES", "VALUE(SUBSTITUTE({ha_sem},\"HA\",\"\"))", "mm", "0")
    line("np", "Prévu : nombre de barres", "ENT((a − 2c) / maille) + 1", "ROUNDDOWN(([a]-2*[c])/{m_sem}+1E-9,0)+1", "u", "0")
    line("Ap", "Prévu : section", "", "[np]*PI()*[Dp]^2/400", "cm²")
    line("Arp", "Prévu : section requise (d avec Ø prévu)", "",
         "MAX([kf]*[Np]*([a]-[b])/(8*([h]-[c]-[Dp]/1000)*[fsu])*10,[rmin]*[a]*([h]-[c]-[Dp]/1000)*10000)", "cm²")

    sec("5. NAPPE SUPÉRIEURE (soulèvement), POINÇONNEMENT, GLISSEMENT, ANCRAGE, FÛT")
    line("Asup", "Nappe supérieure : As requise", "Nt > 0 : kf Nt (a − b) / (8 d fsu)",
         "IF([Nt]>0,[kf]*[Nt]*([a]-[b])/(8*[d]*[fsu])*10,0)", "cm²")
    for d in CAND:
        line(f"ns{d}", f"Nappe sup. HA{d} : barres", "", f"MAX(2,ROUNDUP([Asup]/(PI()*{d}^2/400)-1E-9,0),ROUNDUP(([a]-2*[c]-{d}/1000)/0.25-1E-9,0)+1)", "u", "0")
    s = "20"
    for d in reversed(CAND[:-1]):
        s = f"IF(([a]-2*[c]-{d}/1000)/([ns{d}]-1)>=0.1-1E-9,{d},{s})"
    line("Ds", "Nappe sup. : diamètre", "0 si pas de soulèvement", f"IF([Nt]>0,{s},0)", "mm", "0", bold=True)
    line("nsup", "Nappe sup. : barres par sens", "", "+".join(f"IF([Ds]={d},[ns{d}],0)" for d in CAND), "u", "0", bold=True)
    line("Assup", "Nappe sup. : As prévue", "", "[nsup]*PI()*[Ds]^2/400", "cm²")
    line("Acr", "Poinçonnement : aire dans le contour", "b² + 4 b d + π d²", "[b]^2+4*[b]*[d]+PI()*[d]^2", "m²", "0.000")
    line("u", "Poinçonnement : périmètre u", "4 b + 2 π d", "4*[b]+2*PI()*[d]", "m", "0.000")
    line("Vred", "Poinçonnement : effort réduit", "Nu,f (1 − Acr / a²)", "IF([Acr]>=[a]^2,0,[Nuf]*(1-[Acr]/[a]^2))", "kN")
    line("vEd", "Poinçonnement : vEd", "Vred / (u d)", "[Vred]/([u]*[d])/1000", "MPa", "0.000")
    line("rho", "Pourcentage d'armatures ρ", "min(2 % ; As / (a d))", "MIN(0.02,[As]/([a]*[d]*10000))", "", "0.000%")
    line("k", "Coefficient k", "min(2 ; 1 + √(200 / d))", "MIN(2,1+SQRT(0.2/[d]))", "", "0.000")
    line("vRd", "Poinçonnement : vRd (contour à d)", "max(0,12 k (100 ρ fck)^⅓ ; 0,035 k^1,5 √fck) × 2d/d",
         "MAX(0.12*[k]*(100*[rho]*{fc28})^(1/3),0.035*[k]^1.5*SQRT({fc28}))*2", "MPa", "0.000")
    line("Kp", "Coefficient de butée Kp", "tan²(45° + φ/2)", "TAN(PI()/4+RADIANS({phi_sol})/2)^2", "", "0.000")
    line("Rbut", "Butée des terres mobilisée (50 %)", "½ Kp γt (D − propreté)² a / 2",
         "0.5*[Kp]*{g_terre}*MAX(0,{D}-{e_prop})^2*[a]/2", "kN")
    line("Rgl", "Résistance au glissement", "max(0 ; N + P) tan φ / 1,2 + butée", "MAX(0,[Ng]+[Wf])*TAN(RADIANS({phi_sol}))/1.2+[Rbut]", "kN")
    line("areq", "Côté nécessaire au soulèvement", "a² ≥ (Nt/0,9 − γb b² hf + γt b² ht) / (γb h + γt ht)",
         "CEILING(SQRT(MAX(0,([Nt]/{k_stab}-{g_beton}*[b]^2*[hf]+{g_terre}*[b]^2*[hsol])/({g_beton}*[h]+{g_terre}*[hsol])))-1E-9,0.05)", "m")
    line("ls", "Longueur de scellement ls", "Ø fe / (4 × 0,6 ψs² ft28), ψs = 1,5", "[D]/1000*{fe}/(4*0.6*1.5^2*[ft])", "m", "0.000")
    line("cro", "Crochets nécessaires (ls > a/4)", "1 = oui", "IF([ls]>[a]/4,1,0)", "", "0")
    line("Afmin", "Fût : section minimale", "max(0,2 % b² ; 4 cm²/m × 4b) – BAEL A.8.1.21", "MAX(0.002*[b]^2*10000,16*[b])", "cm²")
    fn, fd = "0", "0"
    for n, d in reversed(FUT):
        A = f"{n}*PI()*{d}^2/400"
        fn = f"IF({A}>=[Afmin]-1E-9,{n},{fn})"
        fd = f"IF({A}>=[Afmin]-1E-9,{d},{fd})"
    line("nfut", "Fût : barres proposées", "plus petite section ≥ minimum (4, 6 ou 8 barres)", fn, "u", "0", bold=True)
    line("dfut", "Fût : diamètre proposé", "", fd, "mm", "0", bold=True)
    line("Afut", "Fût : section proposée", "", "[nfut]*PI()*[dfut]^2/400", "cm²")
    line("ecmax", "Fût : espacement maximal des cadres", "min(40 cm ; b + 10 cm ; 15 Øl)", "MIN(0.4,[b]+0.1,15*[dfut]/1000)", "m", "0.000")

    # ------------------------------------------------------------------ 6. vérifications
    sec("6. VÉRIFICATIONS (taux = Ed / Rd ≤ 1)")
    r = nxt()
    h["header"](ws, r, ["Vérification", "Règle", TYPES[0], TYPES[1], TYPES[2], "Statut"])
    first = row[0] + 1
    checks = [("Sol ELS : σ3/4 ≤ σ adm", "Fascicule 62-V (γq = 3)", "[sELS]", "{sig_adm}"),
              ("Sol ELU : σ3/4 ≤ 1,5 σ adm", "Fascicule 62-V (γq = 2)", "[sELU]", "1.5*{sig_adm}"),
              ("Rigidité : (a − b) / 4 ≤ d", "méthode des bielles", "([a]-[b])/4", "[d]"),
              ("Nappe inférieure : As requise ≤ As proposée", "BAEL A.6.1 / EC2 9.2.1.1", "[Ar]", "[As]"),
              ("Nappe inférieure PRÉVUE (PARAMÈTRES) ≥ As requise", "à reporter dans PARAMÈTRES si non conforme", "[Arp]", "[Ap]"),
              ("Nappe supérieure : As requise ≤ As proposée", "soulèvement", "[Asup]", "IF([Nt]>0,[Assup],1)"),
              ("Espacement ≤ 25 cm", "", "[es]", "0.25"),
              ("Poinçonnement : vEd ≤ vRd", "EC2 6.4.4", "[vEd]", "[vRd]"),
              ("Soulèvement (EQU) : Nt ≤ 0,9 P", "EC0 – EQU", "[Nt]", "{k_stab}*[Wf]"),
              ("Glissement : H ≤ (N + P) tan φ / 1,2 + butée", "", "ABS([Hg])", "[Rgl]"),
              ("Renversement : M ≤ (N + P) a / 2 / 1,5", "couple ELU retenu", "ABS([Mu])", "MAX(0,[Nu]+[Wf])*[a]/2/1.5"),
              ("Fût : section minimale", "BAEL A.8.1.21", "[Afmin]", "[Afut]"),
              ("Fût : espacement des cadres", "BAEL A.8.1.3", "{e_cad_fut}", "[ecmax]")]
    for k, (lab, rule, ed, rd) in enumerate(checks):
        r = nxt()
        R[f"V{k+1}"] = r
        st(ws.cell(r, 2, f"V{k+1} – {lab}"), wrap=True)
        st(ws.cell(r, 3, rule), size=8, italic=True, wrap=True)
        ws.row_dimensions[r].height = 24
        for col in COLS:
            c = ws[f"{col}{r}"]
            st(c, fmt="0%", h="center", bold=True)
            M.disp(FS, f"{col}{r}", cell_ref(f'IF([nb]=0,"",IF(({rd})>0,({ed})/({rd}),0))', col), "0%")
        st(ws.cell(r, 7), h="center", bold=True)
        M.disp(FS, f"G{r}", f'IF(COUNTIF(D{r}:F{r},">1")>0,"NON CONFORME","OK")')
    last = row[0]
    for txt, color, fc in [("OK", "C6EFCE", "006100"), ("NON CONFORME", "FFC7CE", "9C0006")]:
        ws.conditional_formatting.add(f"G{first}:G{last}", FormulaRule(formula=[f'G{first}="{txt}"'], fill=FILL(color),
                                      font=Font(name=h["FONT"], bold=True, color=fc)))
    ws.conditional_formatting.add(f"D{first}:F{last}", FormulaRule(formula=[f'AND(ISNUMBER(D{first}),D{first}>1)'],
                                  fill=FILL("FFC7CE"), font=Font(name=h["FONT"], bold=True, color="9C0006")))
    ws.conditional_formatting.add(f"D{first}:F{last}", FormulaRule(formula=[f'AND(ISNUMBER(D{first}),D{first}<=1)'],
                                  fill=FILL("C6EFCE"), font=Font(name=h["FONT"], bold=True, color="006100")))
    r = nxt()
    st(ws.cell(r, 2, "CONCLUSION"), bold=True)
    ws.merge_cells(start_row=r, start_column=3, end_row=r, end_column=7)
    st(ws.cell(r, 3), bold=True, wrap=True)
    ws.row_dimensions[r].height = 30
    M.disp(FS, f"C{r}", f'IF(COUNTIF(G{first}:G{last},"NON CONFORME")=0,"Les semelles isolées sont justifiées (BAEL 91 mod. 99 / EC2).",'
           f'"Vérifications non conformes : "&COUNTIF(G{first}:G{last},"NON CONFORME")&". Côté de semelle à retenir (soulèvement) : S1 "'
           f'&FIXED(MAX(D{R["areq"]},D{R["a"]})*100,0)&" cm, S3 "&FIXED(MAX(F{R["areq"]},F{R["a"]})*100,0)&" cm ; ferraillage à adopter : S1 "&D{R["n"]}&" HA"&D{R["D"]}'
           f'&" e = "&FIXED(D{R["es"]}*100,1)&" cm, fût "&D{R["nfut"]}&" HA"&D{R["dfut"]}&".")')
    R["concl"] = r

    # ------------------------------------------------------------------ 7. nomenclature
    sec("7. NOMENCLATURE DES ACIERS (ferraillage proposé)")
    XA = h["XA"]

    def barre(key, lab, D, n, L):
        line(f"{key}_n", f"{lab} : nombre / semelle", "", n, "u", "0")
        line(f"{key}_L", f"{lab} : longueur", "", L, "m")
        kgml = XA('"HA"&' + D)
        line(f"{key}_kg", f"{lab} : poids / semelle", "n × L × kg/ml (BASE_ACIERS)", f"[{key}_n]*[{key}_L]*{kgml}", "kg")
    barre("b1", "① ② Nappe inférieure (2 sens)", "[D]", "2*[n]", "[a]-2*[c]+IF([cro]=1,2*{retour},0)")
    barre("b3", "③ ④ Nappe supérieure (2 sens)", "[Ds]", "2*[nsup]", "IF([Nt]>0,[a]-2*[c]+2*{retour},0)")
    barre("b5", "⑤ Fût – barres longitudinales", "[dfut]", "[nfut]", "[hf]+[h]-[c]+{retour}")
    barre("b6", "⑥ Fût – cadres", "VALUE(SUBSTITUTE({ha_cad},\"HA\",\"\"))", "ROUNDDOWN([hf]/{e_cad_fut}+1E-9,0)+1", "4*([b]-2*[c])+2*{crochet}")
    line("kg1", "Acier par semelle", "", "[b1_kg]+[b3_kg]+[b5_kg]+[b6_kg]", "kg", bold=True)
    line("vb", "Béton armé par semelle", "a² h + b² hf", "[a]^2*[h]+[b]^2*[hf]", "m³", "0.000")
    line("kgt", "Acier pour toutes les semelles du type", "nombre × acier par semelle", "[nb]*[kg1]", "kg", bold=True)
    line("ratio", "Ratio d'acier", "kg / m³", "IF([vb]>0,[kg1]/[vb],0)", "kg/m³", "0")
    r = nxt()
    st(ws.cell(r, 2, "Total acier des semelles isolées"), bold=True)
    st(ws.cell(r, 4), bold=True, fmt="#,##0.0", fill=h["C_BLEU_CLAIR"])
    M.disp(FS, f"D{r}", f"SUM(D{R['kgt']}:F{R['kgt']})", "#,##0.0")
    st(ws.cell(r, 7, "kg"), size=9, h="center")
    R["kgtot"] = r

    for col, w in zip("ABCDEFG", [2, 46, 44, 16, 16, 16, 14]):
        ws.column_dimensions[col].width = w
    ws.freeze_panes = "D5"
    h["page_setup"](ws)
    return R
