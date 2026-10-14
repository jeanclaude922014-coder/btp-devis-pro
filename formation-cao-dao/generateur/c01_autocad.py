from lib import *

MODULE = "Livret 1 — AutoCAD (dessin 2D)"
NOM = "AutoCAD — Villa_R+1_RDC.dwg"
COUL = colors.HexColor("#B71C1C")
ONGLETS = ["Début", "Insérer", "Annoter", "Paramétrique", "Vue", "Gérer", "Sortie", "Collaborer"]
OUTILS = ["Ligne", "Polyligne", "Cercle", "Arc", "Déplacer", "Copier", "Décaler", "Ajuster", "Calques", "Cote", "Texte"]


def ecran_acad(contenu=None, reperes=(), bas="Commande :  _LINE  Spécifiez le premier point :", droite=None):
    return ecran(NOM, COUL, ONGLETS, OUTILS, None, droite, bas, contenu=contenu, reperes=reperes)


def zone_vide(d, x, y, w, h):
    # petite croix du curseur et icône du repère SCU
    d.add(Line(x + w / 2 - 20, y + h / 2, x + w / 2 + 20, y + h / 2, strokeColor=colors.white, strokeWidth=0.5))
    d.add(Line(x + w / 2, y + h / 2 - 20, x + w / 2, y + h / 2 + 20, strokeColor=colors.white, strokeWidth=0.5))
    d.add(Line(x + 15, y + 12, x + 45, y + 12, strokeColor=colors.HexColor("#E74C3C"), strokeWidth=1.2))
    d.add(Line(x + 15, y + 12, x + 15, y + 42, strokeColor=colors.HexColor("#2ECC71"), strokeWidth=1.2))
    d.add(String(x + 48, y + 9, "X", fontName="DV", fontSize=6, fillColor=colors.white))
    d.add(String(x + 12, y + 45, "Y", fontName="DV", fontSize=6, fillColor=colors.white))


def murs_seuls(d, x, y, w, h):
    e = min((w - 60) / 12.0, (h - 40) / 10.0)
    ox, oy = x + (w - 12 * e) / 2, y + (h - 10 * e) / 2
    ep = 0.2 * e
    d.add(Rect(ox, oy, 12 * e, 10 * e, fillColor=None, strokeColor=colors.white, strokeWidth=1))
    d.add(Rect(ox + ep, oy + ep, 12 * e - 2 * ep, 10 * e - 2 * ep, fillColor=None, strokeColor=colors.white, strokeWidth=1))
    d.add(String(ox + 6 * e, oy + 5 * e, "Contour extérieur + DECALER de 0,20", fontName="DV", fontSize=7, fillColor=colors.HexColor("#F5B041"), textAnchor="middle"))


def panneau_calques():
    return ("Gestionnaire des calques", ["0", "A-MUR (blanc)", "A-OUVERTURE (cyan)", "A-COTE (vert)",
                                         "A-TEXTE (jaune)", "A-AXE (rouge, tiret)", "A-MOBILIER (gris)", "A-HACHURE (8)"])


def cartouche(d):
    W = 17 * cm
    d.add(Rect(0, 0, W, 90, fillColor=None, strokeColor=colors.black, strokeWidth=1))
    cols = [0, 160, 330, W]
    for c in cols[1:-1]:
        d.add(Line(c, 0, c, 90, strokeColor=colors.black, strokeWidth=0.6))
    d.add(Line(160, 45, W, 45, strokeColor=colors.black, strokeWidth=0.6))
    d.add(String(80, 60, "VILLA R+1", fontName="DV-B", fontSize=12, fillColor=BLEU, textAnchor="middle"))
    d.add(String(80, 42, "Abidjan — Côte d'Ivoire", fontName="DV", fontSize=8, fillColor=GRIS, textAnchor="middle"))
    d.add(String(80, 20, "Maître d'ouvrage : M. / Mme ...", fontName="DV", fontSize=7, fillColor=GRIS, textAnchor="middle"))
    d.add(String(170, 70, "PLAN DU REZ-DE-CHAUSSÉE", fontName="DV-B", fontSize=9, fillColor=BLEU))
    d.add(String(170, 55, "Échelle : 1/100", fontName="DV", fontSize=8))
    d.add(String(170, 28, "Dessiné par : Moulo Jean Claude", fontName="DV", fontSize=8))
    d.add(String(170, 12, "Date : ../../....", fontName="DV", fontSize=8))
    d.add(String(340, 70, "Planche N° : A-01", fontName="DV-B", fontSize=9, fillColor=ORANGE))
    d.add(String(340, 55, "Format : A3 paysage", fontName="DV", fontSize=8))
    d.add(String(340, 28, "Indice : A (1re diffusion)", fontName="DV", fontSize=8))
    d.add(String(340, 12, "Visa : ....................", fontName="DV", fontSize=8))


BLOCS = [
    ("couverture", "LIVRET 1<br/>AUTOCAD", "Dessiner le plan 2D d'une villa, pas à pas<br/>Semaine 2 de la formation",
     "Ouvrir AutoCAD et vous repérer dans l'écran ; dessiner avec précision (longueurs exactes) ; organiser "
     "votre dessin avec des calques ; dessiner les murs, portes et fenêtres de la villa ; écrire les cotes et "
     "les noms des pièces ; créer une mise en page avec cartouche à votre nom ; imprimer en PDF au 1/100 ; "
     "utiliser l'IA pour automatiser les tâches répétitives."),

    ("h1", "Leçon 1 — Découvrir AutoCAD (jour 1)"),
    ("image_mentale", "AutoCAD, c'est une <b>planche à dessin infinie</b> avec une règle parfaite. Vous dessinez "
                      "toujours <b>en vraie grandeur</b> (1 mètre = 1 mètre dans le dessin) : c'est seulement à "
                      "l'impression qu'on choisit de réduire (1/100, 1/50...). C'est la règle d'or n°1."),
    ("h2", "1.1 L'écran d'AutoCAD"),
    ("fig", ecran_acad(zone_vide, reperes=[(0.08, 0.93, 1), (0.25, 0.845, 2), (0.5, 0.45, 3), (0.06, 0.15, 4), (0.4, 0.04, 5)]),
     "Figure 1.1 — Reproduction simplifiée de l'écran d'AutoCAD (l'aspect exact varie selon la version)."),
    ("tableau", [
        ["N°", "Zone", "À quoi elle sert"],
        ["1", "Barre de titre / menu A", "Ouvrir, enregistrer, nom du fichier en cours (.dwg)"],
        ["2", "Ruban (onglets + boutons)", "Tous les outils rangés par thème. L'onglet <b>Début</b> contient 80 % de ce dont vous avez besoin"],
        ["3", "Zone de dessin", "La feuille infinie (fond sombre par défaut). La croix est votre curseur"],
        ["4", "Repère SCU (X, Y)", "Indique la direction des X (droite) et des Y (haut)"],
        ["5", "Ligne de commande", "<b>Le cœur d'AutoCAD</b> : vous y tapez les commandes et AutoCAD vous dit quoi faire ensuite. LISEZ-LA toujours"],
    ], [0.06, 0.3, 0.64]),
    ("h2", "1.2 Les réglages de départ (à faire une seule fois)"),
    ("etapes", [
        "Lancez AutoCAD, cliquez sur <b>Nouveau</b> et choisissez le gabarit <b>acadiso.dwt</b> (gabarit métrique).",
        "Tapez <b>UNITES</b> (ou <b>_UNITS</b>) puis Entrée. Dans « Unités d'insertion », choisissez <b>Mètres</b>. "
        "Précision : <b>0.00</b>. Validez avec OK. Nous dessinerons en mètres : un mur de 4 m = on tape 4.",
        "En bas à droite de l'écran, activez : <b>MODEORTHO</b> (F8, traits bien horizontaux/verticaux), "
        "<b>ACCROBJ</b> (F3, accrochage aux extrémités et milieux) et <b>REPEROBJ</b> (F11).",
        "Clic droit sur le bouton d'accrochage → cochez <b>Extrémité, Milieu, Intersection, Perpendiculaire</b>.",
        "Enregistrez tout de suite : <b>Ctrl + S</b> → nommez le fichier <b>Villa_R+1_RDC.dwg</b>.",
    ]),
    ("attention", "Enregistrez toutes les 10 minutes (Ctrl + S). Les coupures de courant arrivent ! Vous pouvez aussi "
                  "régler la sauvegarde automatique : commande <b>OPTIONS</b> → onglet <b>Ouvrir et enregistrer</b> → "
                  "« Enregistrement automatique toutes les 10 minutes »."),
    ("h2", "1.3 Se déplacer dans le dessin avec la souris"),
    ("tableau", [
        ["Action", "Geste", "Image"],
        ["Zoomer / dézoomer", "Tourner la molette", "La loupe"],
        ["Se déplacer (panoramique)", "Rester appuyé sur la molette et bouger", "Faire glisser une feuille sur la table"],
        ["Tout voir", "Double-clic sur la molette (ou taper Z, Entrée, E, Entrée)", "Reculer pour voir toute la feuille"],
        ["Annuler", "Ctrl + Z (ou taper U)", "La gomme"],
        ["Arrêter une commande", "Touche Échap", "Le bouton « stop »"],
        ["Répéter la dernière commande", "Entrée ou barre d'espace", "« Encore »"],
    ], [0.3, 0.42, 0.28]),
    ("capture", "Faites une capture de votre écran AutoCAD vide (Windows + Maj + S). Collez-la dans un document et "
                "écrivez à côté les 5 zones du tableau ci-dessus. C'est votre fiche n°1."),

    ("h1", "Leçon 2 — Dessiner avec précision (jour 1-2)", True),
    ("p", "AutoCAD ne « devine » pas : vous lui donnez des points et des longueurs. Il y a trois façons de donner une longueur :"),
    ("tableau", [
        ["Méthode", "Ce qu'on tape", "Exemple"],
        ["Direction + longueur (la plus simple)", "On montre la direction avec la souris (ORTHO activé) puis on tape la longueur", "Souris vers la droite, taper 12 Entrée → trait de 12 m vers la droite"],
        ["Coordonnées relatives", "@x,y = « je me déplace de x vers la droite et de y vers le haut »", "@12,0 → 12 m à droite ; @0,10 → 10 m vers le haut"],
        ["Coordonnées polaires", "@longueur&lt;angle", "@5&lt;45 → 5 m en diagonale à 45°"],
    ], [0.27, 0.4, 0.33]),
    ("h2", "Exercice 2.1 — Le contour de la villa (12 × 10 m)"),
    ("etapes", [
        "Tapez <b>L</b> (raccourci de LIGNE) puis Entrée. La ligne de commande affiche « Spécifiez le premier point ».",
        "Tapez <b>0,0</b> puis Entrée : le premier coin est à l'origine.",
        "Tapez <b>@12,0</b> Entrée, puis <b>@0,10</b> Entrée, puis <b>@-12,0</b> Entrée.",
        "Tapez <b>C</b> (pour « Clore ») puis Entrée : AutoCAD referme le rectangle.",
        "Double-cliquez sur la molette pour tout voir. Vous avez dessiné le contour extérieur de la villa !",
    ]),
    ("astuce", "Plus rapide : la commande <b>REC</b> (rectangle). Premier coin <b>0,0</b>, autre coin <b>@12,10</b>. "
               "Un rectangle est une <b>polyligne</b> : un seul objet, plus facile à décaler."),
    ("h2", "Les 12 commandes indispensables"),
    ("tableau", [
        ["Commande", "Raccourci", "Ce qu'elle fait (simplement)"],
        ["LIGNE", "L", "Trace des traits"],
        ["POLYLIGNE", "PL", "Trace des traits « soudés » en un seul objet"],
        ["RECTANGLE", "REC", "Trace un rectangle"],
        ["CERCLE", "C", "Trace un cercle (centre + rayon)"],
        ["DECALER", "DE (O en anglais)", "Fait une copie parallèle à une distance donnée — idéal pour l'épaisseur des murs"],
        ["AJUSTER", "AJ (TR)", "Coupe ce qui dépasse, comme des ciseaux"],
        ["PROLONGER", "PR (EX)", "Allonge un trait jusqu'à un autre"],
        ["DEPLACER", "DP (M)", "Bouge des objets"],
        ["COPIER", "CP (CO)", "Copie des objets"],
        ["MIROIR", "MI", "Copie en symétrie"],
        ["ECHELLE", "SC", "Agrandit ou réduit"],
        ["EFFACER", "EF / touche Suppr", "Supprime"],
    ], [0.22, 0.2, 0.58]),
    ("astuce", "Toutes les commandes françaises peuvent aussi être tapées en anglais en les précédant d'un tiret bas : "
               "<b>_LINE</b>, <b>_OFFSET</b>, <b>_TRIM</b>... Très utile pour suivre des tutoriels en anglais sur Internet."),

    ("h1", "Leçon 3 — Organiser avec les calques (jour 2)", True),
    ("image_mentale", "Les calques sont comme des <b>feuilles de papier transparent</b> posées les unes sur les autres : "
                      "une feuille pour les murs, une pour les cotes, une pour les meubles... On peut cacher une feuille, "
                      "la verrouiller, changer sa couleur, sans toucher aux autres."),
    ("etapes", [
        "Tapez <b>CALQUE</b> (ou cliquez sur l'icône « Propriétés des calques » dans l'onglet Début).",
        "Cliquez sur l'icône <b>Nouveau calque</b> et créez les calques du tableau ci-dessous.",
        "Pour le calque A-AXE, cliquez sur « Continuous » dans la colonne Type de ligne → Charger → choisissez <b>AXES</b> ou <b>CENTER</b>.",
        "Double-cliquez sur A-MUR pour le rendre <b>courant</b> (tout ce que vous dessinez va dedans).",
        "Pour changer un objet de calque : sélectionnez-le, puis choisissez le calque dans la liste déroulante.",
    ]),
    ("fig", ecran_acad(dessin_plan(), droite=panneau_calques(), reperes=[(0.88, 0.62, 1)],
                       bas="Commande :  CALQUE"),
     "Figure 1.2 — Le gestionnaire des calques (repère 1) à droite, et le plan rangé par calques."),
    ("tableau", [
        ["Calque", "Couleur", "Épaisseur à l'impression", "Contenu"],
        ["A-MUR", "Blanc (7)", "0,50 mm", "Murs coupés"],
        ["A-OUVERTURE", "Cyan (4)", "0,25 mm", "Portes, fenêtres"],
        ["A-AXE", "Rouge (1), tiret-point", "0,13 mm", "Axes des poteaux"],
        ["A-COTE", "Vert (3)", "0,18 mm", "Cotations"],
        ["A-TEXTE", "Jaune (2)", "0,25 mm", "Noms des pièces, surfaces"],
        ["A-MOBILIER", "Gris (8)", "0,13 mm", "Meubles, sanitaires"],
        ["A-HACHURE", "Gris (8)", "0,09 mm", "Remplissage des murs coupés"],
    ], [0.22, 0.25, 0.23, 0.30]),

    ("h1", "Leçon 4 — Dessiner les murs de la villa (jour 3)", True),
    ("p", "Nos murs : agglos de 15 cm + enduits de 2,5 cm de chaque côté = <b>20 cm</b> au total. On dessine d'abord "
          "les <b>axes</b>, puis les <b>murs</b> autour."),
    ("h2", "4.1 Les axes"),
    ("etapes", [
        "Rendez le calque <b>A-AXE</b> courant.",
        "Tapez <b>L</b>, cliquez au point <b>0,-1</b> puis <b>@0,12</b> : c'est l'axe A.",
        "Tapez <b>DE</b> (décaler), distance <b>4</b>, cliquez sur l'axe A puis à droite : axe B. Recommencez pour C et D.",
        "Même chose à l'horizontale pour les axes 1 (y = 0), 2 (y = 5,50) et 3 (y = 10).",
        "Si les tirets ne se voient pas : tapez <b>ECHLTP</b> (LTSCALE) et donnez <b>0.02</b> à <b>0.05</b>.",
    ]),
    ("h2", "4.2 Les murs extérieurs"),
    ("etapes", [
        "Rendez le calque <b>A-MUR</b> courant.",
        "Tapez <b>REC</b> : premier coin <b>-0.1,-0.1</b> ; autre coin <b>@12.2,10.2</b> (face extérieure, l'axe est au milieu du mur).",
        "Tapez <b>DE</b>, distance <b>0.2</b>, cliquez sur le rectangle, puis cliquez <u>à l'intérieur</u> : face intérieure créée.",
    ]),
    ("fig", ecran_acad(murs_seuls, reperes=[(0.5, 0.5, 1)], bas="Commande :  _OFFSET  Distance de décalage <0.20> :"),
     "Figure 1.3 — Les murs extérieurs : un rectangle puis un DECALER de 0,20 m vers l'intérieur."),
    ("h2", "4.3 Les murs intérieurs"),
    ("p", "Méthode simple : décalez les axes de 0,10 m de chaque côté, placez-les sur le calque A-MUR, puis coupez "
          "ce qui dépasse avec <b>AJUSTER</b>. Avec la commande <b>MLIGNE</b> (MLINE) vous pouvez aussi tracer un mur double "
          "d'un coup : échelle <b>0.2</b>, justification <b>Zéro</b> (centré sur l'axe)."),
    ("etapes", [
        "Pour chaque mur intérieur (voir le plan de la figure 0.2 du livret 0), décalez l'axe ou un mur existant de la bonne distance.",
        "Tapez <b>AJ</b> (ajuster), puis Entrée : cliquez simplement sur les morceaux de trait en trop. Ils disparaissent.",
        "Vérifiez les longueurs avec la commande <b>DIST</b> (DI) : cliquez sur deux points, AUTOCAD affiche la distance.",
    ]),
    ("attention", "Erreur classique du débutant : dessiner « à l'œil » sans taper les longueurs. Le plan semble beau, "
                  "mais les cotes seront fausses et le maçon construira faux. Tapez TOUJOURS les longueurs."),

    ("h1", "Leçon 5 — Portes, fenêtres et blocs (jour 4)", True),
    ("image_mentale", "Un <b>bloc</b> est un <b>tampon encreur</b> : vous dessinez une porte une seule fois, vous en faites "
                      "un tampon, puis vous la « tamponnez » partout. Si vous modifiez le tampon, toutes les portes changent."),
    ("h2", "5.1 Créer le bloc « Porte 0,90 m »"),
    ("etapes", [
        "Dans un coin libre, sur le calque <b>0</b> : rectangle de 0,90 × 0,04 (le battant), puis un arc de rayon 0,90 (le sens d'ouverture) : "
        "commande <b>A</b> (arc), option <b>Centre</b>.",
        "Tapez <b>B</b> (BLOC). Nom : <b>PORTE_090</b>. Point de base : le coin de la charnière. Sélectionnez le dessin. OK.",
        "Pour placer la porte : tapez <b>I</b> (INSERER), choisissez PORTE_090, cliquez à l'endroit voulu. "
        "Utilisez <b>MIROIR</b> ou <b>ROTATION</b> (RO) pour l'orienter.",
        "Ouvrez le mur à l'endroit de la porte : deux petits traits (« tableaux ») puis AJUSTER le mur entre les deux.",
    ]),
    ("tableau", [
        ["Ouverture (villa)", "Largeur", "Hauteur", "Allège (hauteur sous fenêtre)"],
        ["Porte d'entrée", "1,00 à 1,20 m", "2,20 m", "—"],
        ["Portes de chambre", "0,90 m", "2,10 m", "—"],
        ["Porte douche / WC", "0,70 à 0,80 m", "2,10 m", "—"],
        ["Fenêtres séjour / chambres", "1,20 à 1,60 m", "1,20 à 1,40 m", "0,90 à 1,00 m"],
        ["Naco / fenêtre douche", "0,60 m", "0,60 m", "1,60 m"],
    ], [0.34, 0.2, 0.2, 0.26]),
    ("ci", "Les fenêtres à lames (« naco » / persiennes) restent très utilisées à Abidjan : elles ventilent même fermées. "
           "Prévoyez dans vos blocs une variante <b>FENETRE_NACO</b> et une variante <b>FENETRE_COUL</b> (coulissante aluminium)."),

    ("h1", "Leçon 6 — Cotes, textes, hachures (jour 5)", True),
    ("h2", "6.1 Préparer un style de cote lisible"),
    ("etapes", [
        "Tapez <b>COTSTYLE</b> (DIMSTYLE) → <b>Nouveau</b> → nom <b>COTE_100</b>.",
        "Onglet <b>Symboles et flèches</b> : Flèches → <b>Trait oblique</b> (style architecture).",
        "Onglet <b>Texte</b> : hauteur <b>2.5</b>. Onglet <b>Ajuster</b> : « Utiliser une échelle globale » = <b>0.1</b>. "
        "Pourquoi ? Au 1/100, 1 m du dessin = 10 mm sur le papier ; un texte de 2,5 mm sur papier doit donc mesurer 0,25 m dans le dessin (2,5 × 0,1).",
        "Onglet <b>Unités principales</b> : précision <b>0.00</b>, séparateur décimal <b>virgule</b>.",
        "Rendez ce style courant. Calque <b>A-COTE</b>.",
    ]),
    ("h2", "6.2 Coter le plan"),
    ("etapes", [
        "<b>COTLIN</b> (DLI) : cliquez deux points, puis placez la cote. Pour une chaîne de cotes, enchaînez avec <b>COTCONT</b> (DCO).",
        "Faites 3 lignes de cotes autour du plan : (1) ouvertures, (2) axes des poteaux, (3) cote totale (12,00 et 10,00).",
        "Calque <b>A-TEXTE</b> : commande <b>TEXTMULT</b> (MT) pour écrire le nom de chaque pièce et sa surface.",
        "Pour mesurer une surface : commande <b>AIRE</b> (AA) puis cliquez les coins de la pièce.",
        "Calque <b>A-HACHURE</b> : commande <b>H</b> (HACHURES), motif <b>SOLID</b> gris ou <b>ANSI31</b>, cliquez entre les deux traits des murs.",
    ]),
    ("fig", ecran_acad(dessin_plan(axes=True, poteaux=True, cotes=True), reperes=[(0.5, 0.06, 1)],
                       bas="Commande :  _DIMCONTINUE  Spécifiez l'origine de la deuxième ligne d'attache :"),
     "Figure 1.4 — Le plan RDC complet : murs, axes, poteaux, noms des pièces et cotes."),
    ("capture", "Capture de votre plan coté. Comparez avec la figure 1.4 : les surfaces des pièces sont-elles les mêmes ? "
                "Envoyez-moi votre capture : je vérifie vos cotes."),

    ("h1", "Leçon 7 — Mise en page et impression PDF (jour 6)", True),
    ("image_mentale", "L'<b>espace Objet</b> (onglet « Objet » en bas) est votre <b>chantier</b> en vraie grandeur. "
                      "L'<b>espace Papier</b> (onglets « Présentation ») est la <b>feuille A3</b> que vous allez imprimer. "
                      "Sur la feuille, on découpe une <b>fenêtre</b> (fenêtre de présentation) qui regarde le chantier à l'échelle voulue."),
    ("etapes", [
        "Cliquez sur l'onglet <b>Présentation1</b> en bas. Clic droit → <b>Gestionnaire des mises en page</b> → Modifier.",
        "Imprimante : <b>DWG To PDF.pc3</b>. Format : <b>ISO A3 (420 × 297 mm)</b>. Orientation paysage. Table des plumes : <b>monochrome.ctb</b>.",
        "Dessinez (ou insérez) le cadre et le cartouche ci-dessous dans l'espace papier.",
        "Double-cliquez dans la fenêtre de présentation, faites tout voir, puis tapez <b>ZOOM</b> Entrée <b>10XP</b> Entrée : c'est le 1/100 quand on dessine en mètres "
        "(1 m = 10 mm sur le papier). Attention : le choix « 1:100 » de la liste suppose un dessin en millimètres. "
        "Double-cliquez à l'extérieur et <b>verrouillez</b> la fenêtre (icône cadenas).",
        "Ctrl + P → Aperçu → <b>OK</b> : votre PDF est créé. Vérifiez qu'une cote de 4,00 m mesure bien 4 cm sur le papier.",
    ]),
    ("fig", schema_simple(17 * cm, 92, cartouche), "Figure 1.5 — Modèle de cartouche à reproduire (en bas à droite de la planche)."),

    ("h1", "Leçon 8 — Aller plus vite avec l'intelligence artificielle", True),
    ("h2", "8.1 Les outils intégrés aux versions récentes"),
    ("puces", [
        "<b>Smart Blocks (blocs intelligents)</b> : AutoCAD propose automatiquement de placer un bloc là où vous avez déjà "
        "placé le même type de bloc, ou de remplacer des blocs similaires. Gain de temps pour portes et sanitaires.",
        "<b>Markup Import / Markup Assist</b> : vous importez un PDF ou une photo de plan annoté à la main, l'outil "
        "reconnaît certaines annotations et vous aide à les reporter dans le dessin.",
        "<b>Autodesk Assistant</b> : un assistant intégré qui répond à vos questions sur les commandes. "
        "(Les fonctions disponibles dépendent de votre version et de votre abonnement.)",
    ]),
    ("h2", "8.2 Faire écrire un petit programme (AutoLISP) par une IA"),
    ("p", "AutoCAD sait lire de petits programmes appelés <b>AutoLISP</b>. Vous pouvez demander à une IA comme Claude : "
          "« Écris-moi une routine AutoLISP qui crée automatiquement mes 7 calques A-MUR, A-OUVERTURE... avec leurs couleurs. » "
          "Voici le type de résultat (à tester sur un fichier vide) :"),
    ("code", ";; CALQUES-VILLA : crée les calques standard de la formation\n"
             "(defun c:CALQUES-VILLA ()\n"
             "  (foreach c '((\"A-MUR\" 7) (\"A-OUVERTURE\" 4) (\"A-AXE\" 1)\n"
             "              (\"A-COTE\" 3) (\"A-TEXTE\" 2) (\"A-MOBILIER\" 8) (\"A-HACHURE\" 8))\n"
             "    (command \"_.-LAYER\" \"_M\" (car c) \"_C\" (cadr c) \"\" \"\"))\n"
             "  (princ \"\\nCalques de la villa créés.\")\n"
             "  (princ))"),
    ("etapes", [
        "Copiez ce texte dans le Bloc-notes et enregistrez-le sous <b>calques_villa.lsp</b>.",
        "Dans AutoCAD : tapez <b>APPLOAD</b>, chargez le fichier.",
        "Tapez <b>CALQUES-VILLA</b> : les calques apparaissent tout seuls.",
    ]),
    ("ia", "Autres demandes utiles à une IA : « Explique-moi pourquoi ma commande AJUSTER ne coupe rien », "
           "« Donne-moi la liste des raccourcis pour les cotes », « Transforme cette liste de pièces et surfaces en tableau ». "
           "Testez toujours un programme sur une <b>copie</b> de votre fichier."),

    ("h1", "Récapitulatif et évaluation de la semaine 2", True),
    ("tableau", [
        ["Jour", "Leçons", "Résultat attendu"],
        ["1", "1 et 2", "Réglages faits, contour 12 × 10 dessiné aux coordonnées"],
        ["2", "3", "Calques créés (à la main puis avec le programme AutoLISP)"],
        ["3", "4", "Axes + tous les murs de la villa"],
        ["4", "5", "Blocs portes et fenêtres placés"],
        ["5", "6", "Plan coté, pièces nommées avec surfaces, murs hachurés"],
        ["6", "7", "PDF A3 au 1/100 avec cartouche à votre nom"],
        ["7", "Révision", "Refaire le plan de l'étage SANS le livret (exercice final)"],
    ], [0.1, 0.2, 0.7]),
    ("quiz", [
        ("Dans quelle unité dessine-t-on dans cette formation ?", "En mètres, en vraie grandeur"),
        ("Que fait la commande DECALER ?", "Une copie parallèle à une distance donnée"),
        ("Que signifie @0,10 ?", "Se déplacer de 0 en X et de 10 en Y depuis le dernier point"),
        ("À quoi servent les calques ?", "À ranger le dessin par familles (murs, cotes...) comme des transparents"),
        ("Où choisit-on l'échelle 1/100 ?", "Dans la fenêtre de présentation de l'espace papier"),
        ("Quelle touche arrête une commande ?", "Échap"),
    ]),
]
