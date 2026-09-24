from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from openpyxl.comments import Comment

# ---------- nombres en lettres (français) ----------
U=["zéro","un","deux","trois","quatre","cinq","six","sept","huit","neuf","dix","onze","douze","treize","quatorze","quinze","seize","dix-sept","dix-huit","dix-neuf"]
T={2:"vingt",3:"trente",4:"quarante",5:"cinquante",6:"soixante"}
def lt100(n):
    if n<20: return U[n]
    d,u=divmod(n,10)
    if d in (7,9):
        base="soixante" if d==7 else "quatre-vingt"
        r=10+u
        if d==7 and u==1: return "soixante et onze"
        return base+"-"+U[r]
    if d==8: return "quatre-vingts" if u==0 else "quatre-vingt-"+U[u]
    if u==0: return T[d]
    if u==1: return T[d]+" et un"
    return T[d]+"-"+U[u]
def lt1000(n):
    c,r=divmod(n,100)
    if c==0: return lt100(r)
    s="cent" if c==1 else U[c]+" cent"
    if r==0: return s+("s" if c>1 else "")
    return s+" "+lt100(r)
def lettres(n):
    n=int(n)
    if n==0: return "zéro"
    parts=[]
    m,r=divmod(n,1_000_000)
    k,r=divmod(r,1000)
    if m: parts.append(("un million" if m==1 else lt1000(m).replace("cents","cent") if False else lt1000(m))+("" if m==1 else " millions"))
    if k: parts.append("mille" if k==1 else lt1000(k).replace("cents","cent").replace("quatre-vingts","quatre-vingt")+" mille")
    if r: parts.append(lt1000(r))
    s=" ".join(parts)
    return s[0].upper()+s[1:]+(" de" if n%1_000_000==0 else "")+" francs CFA"

# ---------- données extraites du DAO ----------
# (code, désignation, unité DAO, quantité DAO (None = non renseignée), PU proposé HT, commentaire)
SECTIONS=[
 ("000","Section 0 - Installation de chantier",[
   ("001","Installation de chantier de l'entreprise","Ft",1,12_000_000,"Base vie, bureau MOE, signalisation, amenée/repli du matériel (niveleuse, compacteurs, finisseur, répandeuse) - env. 3 % du montant HT."),
 ]),
 ("100","Section 1 - Dégagement des emprises",[
   ("101","Dégagement des accotements","m2",3000,500,"Débroussaillage, désherbage et évacuation hors emprise."),
   ("102","Dégagement des ordures ménagères","Ft",1,2_500_000,"Chargement et évacuation vers décharge agréée par la Mairie."),
 ]),
 ("200","Section 2 - Terrassements généraux",[
   ("201","Remblais provenant d'emprunts y compris distance de transport","m2",None,6_500,"Quantité non renseignée au DAO. Prix établi au m3 compacté (latérite d'emprunt CBR≥20, 95 % OPM)."),
   ("202","Démantèlement et enlèvement de dépôt","Ft",1,2_000_000,""),
   ("203","Décaissement et compactage du fond de décaissement","m2",18214,1_200,"Décaissement ≈ 25 cm, évacuation des déblais, compactage du fond à 95 % OPM."),
 ]),
 ("300","Section 3 - Chaussée",[
   (None,"Fourniture et mise en œuvre de matériaux graveleux naturels sélectionnés quelle que soit la distance de transport",None,None,None,""),
   ("301","Pour la couche de forme (sous-couche de fondation)","m2",0,3_000,"Quantité nulle au DAO - prix donné pour mémoire (latérite ép. 20 cm)."),
   ("302","Pour la couche de fondation (ép. 15 cm)","m2",0,2_500,"Quantité nulle au DAO - prix donné pour mémoire (latérite CBR≥30, ép. 15 cm)."),
   ("303","Stabilisation au ciment 4 % de la couche de base","m2",None,3_500,"Quantité non renseignée au DAO. Ciment CPJ 42,5 à 4 %, malaxage en place."),
   ("304","Fourniture, transport et mise en œuvre de granite concassé 0/31,5 pour la couche de base","m2",2732.10,35_000,"ATTENTION : 2 732,10 = 18 214 m2 × 0,15 m → quantité en m3. PU établi au m3 compacté (GNT 0/31,5 carrière Abidjan/Alépé)."),
   ("305","Exécution de l'imprégnation au cut-back de la couche de base (1,2 kg/m2)","m2",18214,900,"Cut-back 0/1 à 1,2 kg/m2 (le DAO indique « 1200 kg/m3 », lire 1,2 kg/m2)."),
   ("306","Couche d'accrochage à l'émulsion de bitume (300 g/m2)","m2",18214,400,"Émulsion cationique ECR 65 à 0,3 kg/m2."),
   (None,"Fourniture, fabrication et mise en œuvre de revêtement de chaussée en béton bitumineux quelle que soit la distance de transport",None,None,None,""),
   ("307","Béton bitumineux d'épaisseur 3 cm","m2",5795,7_000,"BB 0/10, ≈ 0,070 t/m2 ; enrobé centrale Abidjan + transport ≈ 55 km."),
   ("308","Béton bitumineux d'épaisseur 5 cm","m2",18214,11_500,"BB 0/14, ≈ 0,117 t/m2 ; bitume 50/70 ; finisseur + compacteurs tandem et pneus."),
 ]),
 ("400","Section 4 - Assainissement - Drainage",[
   ("401","Fourniture, transport et mise en œuvre de buses en béton armé série 90 A Ø 1000, y compris têtes et remblais d'accès","ml",24,250_000,"Buse Ø1000 série 90A, lit de sable 20 cm, bloc technique compacté 95 % OPM, têtes en BA."),
   ("402","Curage d'ouvrage sanitaire","Ft",0,1_500_000,"Quantité nulle au DAO - prix donné pour mémoire."),
 ]),
 ("700","Section 7 - Protection de l'environnement",[
   ("701","Régénérescence des zones d'emprunts","m2",0,300,"Quantité nulle au DAO - régalage terre végétale et revégétalisation."),
 ]),
]
_ht=sum(round((q or 0)*pu) for _,_,its in SECTIONS for n,_,_,q,pu,_ in its if n)
LET_TTC=lettres(_ht+round(_ht*0.18))+" TTC"
RECAP=["Section 000 Installation","Section 100 Dégagement des emprises","Section 200 Terrassements généraux","Section 300 Chaussée","Section 400 Assainissement-drainage","Section 700 Protection de l'environnement"]

F="Arial"
thin=Side(style="thin",color="000000")
B=Border(left=thin,right=thin,top=thin,bottom=thin)
HDR=PatternFill("solid",fgColor="1F4E78")
SEC=PatternFill("solid",fgColor="D9E1F2")
TOT=PatternFill("solid",fgColor="FCE4D6")
INP=PatternFill("solid",fgColor="FFF2CC")
NUM='#,##0;-#,##0;"-"'
QTY='#,##0.00;-#,##0.00;"-"'

def entete(ws,titre,ncol):
    L=[("REPUBLIQUE DE CÔTE D'IVOIRE — Union - Discipline - Travail",10,False),
       ("REGION DE LA MÉ — MAIRIE D'ALÉPÉ",11,True),
       ("Appel d'Offres Ouvert AOO N° T ....../2026 — Financement : Budget d'investissement 2026, Ligne 9101/2220",9,False),
       (titre,14,True),
       ("Réalisation de 1700 mètres linéaires de bitume du quartier Château au quartier Comoé extension d'Alépé",11,True),
       ("Proposition de prix établie par : MOULO Jean Claude, Technicien Génie Civil BTP — Abidjan, septembre 2026 — Montants en FCFA HT",9,False)]
    col=chr(64+ncol)
    for i,(t,sz,b) in enumerate(L,1):
        ws.merge_cells(f"A{i}:{col}{i}")
        c=ws[f"A{i}"]; c.value=t; c.font=Font(name=F,size=sz,bold=b,color="1F4E78" if i in (4,5) else "000000")
        c.alignment=Alignment(horizontal="center",vertical="center",wrap_text=True)
    ws.row_dimensions[5].height=30
    ws.oddHeader.center.text="Mairie d'Alépé — "+titre
    ws.oddFooter.left.text="Auteur : Moulo Jean Claude"
    ws.oddFooter.right.text="Page &P / &N"
    ws.page_setup.orientation="landscape"; ws.page_setup.paperSize=9
    ws.page_setup.fitToWidth=1; ws.page_setup.fitToHeight=0
    ws.sheet_properties.pageSetUpPr.fitToPage=True
    ws.print_title_rows="8:8"

def hdr(ws,row,heads):
    for j,h in enumerate(heads,1):
        c=ws.cell(row,j,h); c.font=Font(name=F,bold=True,color="FFFFFF"); c.fill=HDR
        c.alignment=Alignment(horizontal="center",vertical="center",wrap_text=True); c.border=B
    ws.row_dimensions[row].height=32

def cell(ws,r,c,v,bold=False,fmt=None,fill=None,color="000000",align=None,wrap=False):
    x=ws.cell(r,c,v); x.font=Font(name=F,bold=bold,color=color); x.border=B
    if fmt: x.number_format=fmt
    if fill: x.fill=fill
    x.alignment=Alignment(horizontal=align,vertical="center",wrap_text=wrap)
    return x

wb=Workbook()
# ================= BPU =================
bpu=wb.active; bpu.title="BPU"
entete(bpu,"BORDEREAU DES PRIX UNITAIRES (BPU)",6)
hdr(bpu,8,["N°","DÉSIGNATION","U","QTÉ (DAO)","PRIX UNIT. EN CHIFFRES (FCFA HT)","PRIX UNIT. EN LETTRES"])
for col,w in zip("ABCDEF",[8,62,7,12,18,55]): bpu.column_dimensions[col].width=w
r=9; bpu_ref={}
for code,titre,items in SECTIONS:
    for j in range(1,7): cell(bpu,r,j,None,fill=SEC)
    bpu.cell(r,1,code).font=Font(name=F,bold=True); bpu.cell(r,2,titre).font=Font(name=F,bold=True)
    r+=1
    for it in items:
        n,des,u,q,pu,com=it
        cell(bpu,r,1,n,align="center"); cell(bpu,r,2,des,wrap=True,bold=n is None)
        cell(bpu,r,3,u,align="center"); cell(bpu,r,4,(0 if (q is None and n) else q),fmt=QTY)
        if n:
            x=cell(bpu,r,5,pu,fmt=NUM,fill=INP,color="0000FF")
            if com: x.comment=Comment(com,"Moulo Jean Claude",width=320,height=110)
            cell(bpu,r,6,lettres(pu),wrap=True)
            bpu_ref[n]=f"BPU!$E${r}"
            if q is None:
                bpu.cell(r,4).comment=Comment("Quantité non renseignée dans le DAO — à confirmer par le Maître d'ouvrage.","Moulo Jean Claude")
        else:
            cell(bpu,r,5,None); cell(bpu,r,6,None)
        r+=1
r+=1
bpu.merge_cells(f"A{r}:F{r}")
bpu[f"A{r}"]="Légende : cellules jaunes / texte bleu = prix unitaires proposés (saisie). Le DQE est lié automatiquement à ces prix. Si un prix est modifié, mettre à jour le prix en lettres (colonne F)."
bpu[f"A{r}"].font=Font(name=F,italic=True,size=9); bpu[f"A{r}"].alignment=Alignment(wrap_text=True)
bpu.row_dimensions[r].height=28
bpu.freeze_panes="A9"

# ================= DQE =================
dqe=wb.create_sheet("DQE")
entete(dqe,"DEVIS QUANTITATIF ET ESTIMATIF (DQE)",6)
hdr(dqe,8,["N°","DÉSIGNATION","UNITÉS","QUANTITÉS","PRIX UNIT. (FCFA HT)","PRIX TOTAL (FCFA HT)"])
for col,w in zip("ABCDEF",[8,62,9,12,18,20]): dqe.column_dimensions[col].width=w
r=9; subtot=[]
for code,titre,items in SECTIONS:
    for j in range(1,7): cell(dqe,r,j,None,fill=SEC)
    dqe.cell(r,1,code).font=Font(name=F,bold=True); dqe.cell(r,2,titre).font=Font(name=F,bold=True)
    r+=1; first=r
    for n,des,u,q,pu,com in items:
        cell(dqe,r,1,n,align="center"); cell(dqe,r,2,des,wrap=True,bold=n is None)
        cell(dqe,r,3,u,align="center")
        if n:
            x=cell(dqe,r,4,0 if q is None else q,fmt=QTY,color="0000FF")
            if q is None: x.comment=Comment("Quantité non renseignée dans le DAO — à confirmer par le Maître d'ouvrage.","Moulo Jean Claude")
            cell(dqe,r,5,"="+bpu_ref[n],fmt=NUM,color="008000")
            cell(dqe,r,6,f"=ROUND(D{r}*E{r},0)",fmt=NUM)
        else:
            for j in (4,5,6): cell(dqe,r,j,None)
        r+=1
    for j in range(1,7): cell(dqe,r,j,None,fill=TOT)
    dqe.cell(r,2,"Total "+titre.split(" - ")[0]).font=Font(name=F,bold=True)
    c=dqe.cell(r,6,f"=SUM(F{first}:F{r-1})"); c.font=Font(name=F,bold=True); c.number_format=NUM
    subtot.append(r); r+=1
r+=1
for j in range(1,7): cell(dqe,r,j,None,fill=HDR)
dqe.merge_cells(f"A{r}:F{r}"); x=dqe.cell(r,1,"RÉCAPITULATIF PAR SECTION"); x.font=Font(name=F,bold=True,color="FFFFFF"); x.alignment=Alignment(horizontal="center")
r+=1; rec0=r
for lab,sr in zip(RECAP,subtot):
    for j in range(1,7): cell(dqe,r,j,None)
    dqe.merge_cells(f"A{r}:E{r}"); dqe.cell(r,1,lab).font=Font(name=F)
    c=dqe.cell(r,6,f"=F{sr}"); c.number_format=NUM; c.font=Font(name=F)
    r+=1
tv_ht=r
for lab,f,fill in [("TOTAL HTVA",f"=SUM(F{rec0}:F{r-1})",TOT),("TVA AU TAUX DE 18 %",None,None),("TOTAL GÉNÉRAL TTC",None,TOT)]:
    for j in range(1,7): cell(dqe,r,j,None,fill=fill)
    dqe.merge_cells(f"A{r}:E{r}"); dqe.cell(r,1,lab).font=Font(name=F,bold=True)
    r+=1
dqe.cell(tv_ht,6,f"=SUM(F{rec0}:F{tv_ht-1})")
dqe.cell(tv_ht+1,6,f"=ROUND(F{tv_ht}*Hypothèses!$C$6,0)")
dqe.cell(tv_ht+2,6,f"=F{tv_ht}+F{tv_ht+1}")
for k in range(3):
    c=dqe.cell(tv_ht+k,6); c.number_format=NUM; c.font=Font(name=F,bold=True)
r+=1
dqe.merge_cells(f"A{r}:F{r}")
dqe.cell(r,1,"Arrêté le présent devis à la somme de : "+LET_TTC+" (à mettre à jour si les prix sont modifiés).").font=Font(name=F,italic=True,size=9)
r+=2
dqe.merge_cells(f"D{r}:F{r}"); dqe.cell(r,4,"Fait à Abidjan, le ...../...../2026").font=Font(name=F)
dqe.merge_cells(f"D{r+1}:F{r+1}"); dqe.cell(r+1,4,"Le Soumissionnaire (signature et cachet)").font=Font(name=F,bold=True)
dqe.freeze_panes="A9"
TTC=f"DQE!$F${tv_ht+2}"; HT=f"DQE!$F${tv_ht}"

# ================= Hypothèses =================
h=wb.create_sheet("Hypothèses")
h.column_dimensions["A"].width=4; h.column_dimensions["B"].width=58; h.column_dimensions["C"].width=70
h["B1"]="HYPOTHÈSES DE PRIX ET CONTRÔLES — DAO Mairie d'Alépé 2026"; h["B1"].font=Font(name=F,bold=True,size=13,color="1F4E78")
h["B2"]="Auteur : Moulo Jean Claude, Technicien Génie Civil BTP — Abidjan, 24/09/2026"; h["B2"].font=Font(name=F,italic=True)
rows=[
 (4,"Paramètres",None,True),
 (5,"Délai d'exécution (DPAO IC 13.2)","12 mois",False),
 (6,"Taux de TVA (DAO)",0.18,False),
 (7,"Montant total HT proposé",f"={HT}",False),
 (8,"Montant total TTC proposé",f"={TTC}",False),
 (9,"Montant TTC en lettres (contrôle)",LET_TTC,False),
 (10,"Garantie d'offre exigée (DPAO IC 20.2)",4_200_000,False),
 (11,"Ratio garantie / montant HT",f"=C10/C7",False),
 (12,"Coût HT au mètre linéaire (1 700 ml)",f"=C7/1700",False),
 (13,"Coût HT au m2 de chaussée revêtue (18 214 m2)",f"=C7/18214",False),
]
for rr,a,b,bold in rows:
    h.cell(rr,2,a).font=Font(name=F,bold=bold)
    if b is not None:
        c=h.cell(rr,3,b); c.font=Font(name=F,color="0000FF" if not str(b).startswith("=") else "008000")
        c.alignment=Alignment(horizontal="left")
h["C6"].number_format="0%"; h["C7"].number_format=NUM+' "FCFA"'; h["C8"].number_format=NUM+' "FCFA"'
h["C10"].number_format=NUM+' "FCFA"'; h["C11"].number_format="0.00%"; h["C12"].number_format=NUM+' "FCFA/ml"'; h["C13"].number_format=NUM+' "FCFA/m2"'
notes=[
 "Bases de prix (marché ivoirien, septembre 2026, prix HT rendus Alépé ≈ 55 km d'Abidjan) :",
 "• Béton bitumineux (BB) : ≈ 95 000 à 100 000 FCFA/t mis en œuvre (bitume 50/70 importé, granulats granite, centrale d'enrobage Abidjan), densité 2,35 t/m3.",
 "• Granite concassé 0/31,5 (GNT) : ≈ 17 000 FCFA/t carrière + transport ≈ 55 km + mise en œuvre et compactage 95 % OPM → ≈ 35 000 FCFA/m3 compacté.",
 "• Cut-back 0/1 : 1,2 kg/m2 ; émulsion ECR 65 : 0,3 kg/m2 (répandeuse + balayage).",
 "• Sol support latéritique : fond de décaissement compacté à 95 % OPM, CBR plate-forme ≥ 15 à vérifier par essais (Proctor modifié, CBR 96 h imbibition).",
 "• Contexte climatique tropical humide (Sud-Est, deux saisons des pluies) : planning à caler hors mai-juillet pour les enrobés ; drainage provisoire inclus dans les prix.",
 "• Prix fermes et non révisables (DPAO IC 14.5) : aléas de variation bitume/carburant intégrés (≈ 3 %). Frais généraux ≈ 15 % et bénéfice ≈ 10 % inclus.",
 "",
 "Incohérences relevées dans le DAO (à signaler par demande d'éclaircissement — IC 7.1) :",
 "1. Poste 304 (granite concassé) : unité « m2 » mais 2 732,10 = 18 214 × 0,15 → il s'agit de m3. Prix établi au m3.",
 "2. Poste 305 : « 1200 kg/m3 » → dosage à lire 1,2 kg/m2.  Poste 306 : « 300 g/m3 » → lire 300 g/m2.",
 "3. Postes 201 (remblais) et 303 (stabilisation ciment 4 %) : quantités non renseignées → portées à 0, prix donnés pour mémoire.",
 "4. Postes 301, 302, 402, 701 : quantités nulles au DAO → prix donnés pour mémoire (IC 14 : tous les postes doivent être prix).",
 "5. Poste 401 : « xxx » dans la désignation — précision attendue (têtes d'ouvrage / type de buse). Poste 304 : granulométrie « xxx » supposée 0/31,5.",
 "6. Le BB 5 cm couvre 18 214 m2 (≈ 10,7 m de large sur 1 700 ml) ; le BB 3 cm (5 795 m2) est supposé réservé aux accotements/trottoirs/parkings.",
 "",
 "Avertissement : prix indicatifs d'aide à la soumission, à ajuster selon les devis fournisseurs réels, la visite de site et la politique commerciale de l'entreprise.",
 "L'offre est jugée par rapport à l'estimation administrative confidentielle et à la moyenne des offres (seuils anormalement bas/élevés) — éviter les écarts extrêmes.",
]
rr=15
for t in notes:
    h.merge_cells(f"B{rr}:C{rr}"); c=h.cell(rr,2,t); c.alignment=Alignment(wrap_text=True,vertical="top")
    c.font=Font(name=F,bold=t.endswith(":") and not t.startswith("•"),size=10)
    h.row_dimensions[rr].height=30 if len(t)>110 else 16
    rr+=1
h.page_setup.orientation="portrait"; h.page_setup.paperSize=9
h.page_setup.fitToWidth=1; h.page_setup.fitToHeight=0; h.sheet_properties.pageSetUpPr.fitToPage=True
h.oddFooter.left.text="Auteur : Moulo Jean Claude"; h.oddFooter.right.text="Page &P / &N"
for _r in range(15,rr): h.row_dimensions[_r].height=32 if len(str(h.cell(_r,2).value or ""))>95 else 16
wb.save("/home/user/btp-devis-pro/documents/alepe-2026/DQE_BPU_Alepe_1700ml_bitume_2026.xlsx")
print("saved", HT, TTC)
