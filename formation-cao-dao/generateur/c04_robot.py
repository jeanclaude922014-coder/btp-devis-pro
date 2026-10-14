from lib import *

MODULE = "Livret 4 — Robot Structural Analysis"
COUL = colors.HexColor("#1B5E20")
MENUS = ["Fichier", "Édition", "Affichage", "Structure", "Chargements", "Analyse", "Résultats", "Dimensionnement", "Outils", "Fenêtre", "Aide"]
OUTILS = ["Lignes constr.", "Barres", "Sections", "Appuis", "Cas de charges", "Charges", "Combinaisons", "Calculer", "Diagrammes", "Réactions"]
GESTION = ("Inspecteur d'objets", ["Structure", "  Nœuds (36)", "  Barres (58)", "    Poteaux 20x20", "    Poutres 20x50",
                                   "    Poutres 20x35", "Cas de charges", "  1 : PERM1 (G)", "  2 : EXPL1 (Q)",
                                   "  3 : ELU (comb.)", "  4 : ELS (comb.)"])
DISPO = ("Dispositions", ["Modèle de structure", "  Géométrie", "  Sections", "  Appuis", "  Chargements",
                          "Résultats", "  Diagrammes", "  Réactions", "  Déplacements", "Dimensionnement BA"])


def ecran_rb(contenu=None, reperes=(), bas="Vue 3D — Cas : 1 (PERM1)   Unités : m, kN, kN·m"):
    return ecran("Autodesk Robot Structural Analysis — Villa_R+1.rtd", COUL, MENUS, OUTILS, GESTION, DISPO, bas,
                 contenu=contenu, reperes=reperes)


def diag_moment(d):
    # poutre continue 2 travées 5,50 + 4,50, moments ELU
    x0, y0, s = 40, 70, 34
    d.add(Line(x0, y0, x0 + 10 * s, y0, strokeColor=colors.black, strokeWidth=2))
    for a in (0, 5.5, 10):
        xa = x0 + a * s
        d.add(Polygon([xa - 6, y0 - 10, xa + 6, y0 - 10, xa, y0], fillColor=VERT, strokeColor=None))
    pts = []
    q, L1, L2, Ma = 39.0, 5.5, 4.5, 125.5
    for i in range(101):
        x = 10 * i / 100.0
        if x <= L1:
            R = q * L1 / 2 - Ma / L1
            m = R * x - q * x * x / 2
        else:
            u = 10 - x
            R = q * L2 / 2 - Ma / L2
            m = R * u - q * u * u / 2
        pts.append((x0 + x * s, y0 - m * 0.28))
    for (a, b), (c, e) in zip(pts, pts[1:]):
        d.add(Line(a, b, c, e, strokeColor=ROUGE, strokeWidth=1.4))
    d.add(String(x0 + 2.4 * s, y0 - 36, "+91 kN·m (travée)", fontName="DV-B", fontSize=7.5, fillColor=ROUGE, textAnchor="middle"))
    d.add(String(x0 + 5.5 * s, y0 + 40, "−125 kN·m (appui B)", fontName="DV-B", fontSize=7.5, fillColor=ROUGE, textAnchor="middle"))
    d.add(String(x0 + 7.8 * s, y0 - 20, "+46 kN·m", fontName="DV-B", fontSize=7.5, fillColor=ROUGE, textAnchor="middle"))
    d.add(String(x0, y0 - 24, "Axe 1", fontName="DV", fontSize=7, textAnchor="middle"))
    d.add(String(x0 + 5.5 * s, y0 - 24, "Axe 2", fontName="DV", fontSize=7, textAnchor="middle"))
    d.add(String(x0 + 10 * s, y0 - 24, "Axe 3", fontName="DV", fontSize=7, textAnchor="middle"))
    d.add(String(x0 + 10 * s + 12, y0 + 50, "q ELU = 39 kN/m", fontName="DV", fontSize=7.5, fillColor=BLEU))
    d.add(String(x0 + 10 * s + 12, y0 + 38, "Convention : travée en bas (+),", fontName="DV", fontSize=6.5, fillColor=GRIS))
    d.add(String(x0 + 10 * s + 12, y0 + 29, "appui en haut (−)", fontName="DV", fontSize=6.5, fillColor=GRIS))


BLOCS = [
    ("couverture", "LIVRET 4<br/>ROBOT STRUCTURAL ANALYSIS", "Faire calculer l'ossature de la villa et lire les résultats<br/>Semaine 5 de la formation",
     "Comprendre ce que fait un logiciel de calcul ; créer le modèle filaire 3D de la villa (axes, poteaux, poutres) ; "
     "définir sections, appuis, charges et combinaisons (BAEL 91 mod. 99 ou Eurocode 2) ; lancer le calcul ; lire les "
     "diagrammes, réactions et déplacements ; obtenir le ferraillage ; CONTRÔLER les résultats à la main ; importer "
     "un modèle depuis Revit ; utiliser l'IA pour expliquer et rédiger la note de calcul."),

    ("h1", "Leçon 1 — Ce que fait un logiciel de calcul"),
    ("image_mentale", "Robot ne voit pas de « murs » ni de « belles façades ». Il voit un <b>squelette en fil de fer</b> : "
                      "des <b>barres</b> (poteaux, poutres) reliées par des <b>nœuds</b>, posées sur des <b>appuis</b>, et chargées "
                      "de <b>poids</b>. Il calcule comment chaque barre se plie et s'écrase, puis combien de fer il faut dedans."),
    ("tableau", [
        ["Mot Robot", "Explication simple"],
        ["Nœud", "Un point de rencontre (là où une poutre arrive sur un poteau)"],
        ["Barre", "Un élément linéaire : poteau ou poutre"],
        ["Section", "La forme et la taille de la barre (ex. : rectangle béton 20 × 50 cm)"],
        ["Appui", "La façon dont la structure tient au sol. <b>Encastrement</b> = bloqué comme un poteau pris dans une semelle"],
        ["Cas de charge", "Une famille de poids : G (permanent), Q (exploitation)..."],
        ["Combinaison", "Le mélange « gonflé » des cas : ELU = 1,35 G + 1,5 Q ; ELS = G + Q"],
        ["Effort normal N", "L'écrasement (surtout dans les poteaux)"],
        ["Moment fléchissant M", "La flexion (la poutre qui « sourit » sous le poids)"],
        ["Effort tranchant V", "L'effort qui veut « couper » la poutre près des appuis"],
        ["Flèche", "Combien la poutre descend au milieu"],
    ], [0.25, 0.75]),
    ("h2", "1.1 L'écran de Robot"),
    ("fig", ecran_rb(dessin_portique(), reperes=[(0.3, 0.93, 1), (0.3, 0.845, 2), (0.08, 0.55, 3), (0.5, 0.45, 4), (0.92, 0.55, 5)]),
     "Figure 4.1 — Reproduction simplifiée de l'écran de Robot avec le modèle filaire de la villa (l'aspect exact varie selon la version)."),
    ("tableau", [
        ["N°", "Zone", "À quoi elle sert"],
        ["1", "Menus", "Structure (géométrie), Chargements, Analyse, Résultats, Dimensionnement"],
        ["2", "Barre d'outils", "Les commandes les plus utilisées"],
        ["3", "Inspecteur d'objets", "La liste de tout ce qui existe : nœuds, barres, cas de charges"],
        ["4", "Vue de la structure", "Le modèle 3D filaire (orange = poteaux, bleu = poutres, vert = appuis)"],
        ["5", "Sélecteur de dispositions", "<b>Le guide pas à pas de Robot</b> : suivez les dispositions de haut en bas, dans l'ordre"],
    ], [0.06, 0.26, 0.68]),

    ("h1", "Leçon 2 — Préparer l'affaire (jour 1)", True),
    ("etapes", [
        "Lancez Robot → écran d'accueil → choisissez <b>Portique spatial</b> (structure 3D en barres).",
        "<b>Outils → Préférences de l'affaire</b> : <b>Unités</b> : m, kN, kN·m. <b>Normes</b> : "
        "béton armé <b>BAEL 91 mod. 99</b> (ou <b>EN 1992-1-1</b> avec annexe nationale), charges/combinaisons correspondantes.",
        "<b>Matériaux</b> : béton fc28 = 25 MPa (ou C25/30) ; acier FeE400 (ou B500).",
        "Enregistrez : <b>Villa_R+1.rtd</b>.",
    ]),
    ("attention", "Choisissez la norme <b>avant</b> de commencer. Changer de norme au milieu peut effacer des combinaisons "
                  "et fausser le dimensionnement. Pour comparer BAEL et EC2, faites deux fichiers séparés."),

    ("h1", "Leçon 3 — Construire le modèle (jour 1-2)", True),
    ("h2", "3.1 Les lignes de construction (axes)"),
    ("etapes", [
        "<b>Structure → Lignes de construction</b>. Onglet <b>X</b> : position 0, puis ajoutez 4, 8, 12 → libellés A, B, C, D.",
        "Onglet <b>Y</b> : 0 ; 5,50 ; 10,00 → libellés 1, 2, 3. Onglet <b>Z</b> : 0 ; 3,00 ; 6,00.",
        "Cliquez <b>Appliquer</b> : une grille 3D apparaît. Les intersections serviront à accrocher les barres.",
    ]),
    ("h2", "3.2 Les sections"),
    ("etapes", [
        "<b>Structure → Caractéristiques → Profilés de barres</b> → <b>Nouvelle section</b>.",
        "Type <b>Poteau BA</b>, rectangle b = 20, h = 20 cm, nom <b>P20x20</b>.",
        "Type <b>Poutre BA</b> : <b>B20x50</b> (poutres porteuses de 5,50 et 4,50 m, axes A à D) et <b>B20x35</b> (poutres de 4,00 m, axes 1 à 3).",
    ]),
    ("h2", "3.3 Les barres et les appuis"),
    ("etapes", [
        "<b>Structure → Barres</b> : type <b>Poteau BA</b>, section P20x20. Cliquez à l'intersection au sol (z = 0) puis au-dessus (z = 3). "
        "Faites les 12 poteaux du RDC puis copiez-les à l'étage (<b>Édition → Translation</b>, dz = 3, 1 répétition).",
        "Type <b>Poutre BA</b> : tracez les poutres de nœud à nœud aux niveaux 3,00 et 6,00.",
        "<b>Structure → Appuis</b> : choisissez <b>Encastrement</b>, sélectionnez les 12 nœuds du bas (z = 0), Appliquer.",
        "Vérifiez : <b>Analyse → Vérifier la structure</b>. Il ne doit y avoir <b>aucune erreur</b> (barres non connectées, nœuds en double).",
    ]),
    ("fig", ecran_rb(dessin_portique(resultats="charges"), reperes=[(0.5, 0.75, 1)],
                     bas="Cas : 1 (PERM1) — Charge uniforme sur barres : PZ = −20,00 kN/m"),
     "Figure 4.2 — Les charges (flèches rouges) appliquées sur les poutres du modèle."),

    ("h1", "Leçon 4 — Les charges et les combinaisons (jour 2)", True),
    ("p", "Nos poutrelles portent dans le sens X (4,00 m) : elles déposent la charge de la dalle sur les <b>poutres des axes A, B, C, D</b>. "
          "Chaque poutre reçoit la dalle sur une « largeur de chargement » : 4,00 m pour les poutres intérieures (B, C), 2,00 m pour les poutres de rive (A, D)."),
    ("tableau", [
        ["Poutre", "Largeur reprise", "G dalle (5,0 kN/m²)", "G mur façade (étage)", "Q (1,5 kN/m²)"],
        ["Axes B et C (intérieures)", "4,00 m", "20,0 kN/m", "—", "6,0 kN/m"],
        ["Axes A et D (rive)", "2,00 m", "10,0 kN/m", "+ 6,0 kN/m (agglos 2,6 m × 2,2 kN/m²)", "3,0 kN/m"],
        ["Axes 1, 2, 3 (4,00 m)", "—", "—", "+ 6,0 kN/m si mur dessus", "—"],
    ], [0.24, 0.15, 0.18, 0.28, 0.15]),
    ("etapes", [
        "<b>Chargements → Cas de charge</b> : nature <b>Permanente</b>, nom <b>PERM1</b> → Ajouter. Nature <b>Exploitation</b>, nom <b>EXPL1</b> → Ajouter.",
        "Le <b>poids propre</b> des barres est ajouté automatiquement dans PERM1 (vérifiez qu'il apparaît dans le tableau des charges).",
        "Cas PERM1 actif : <b>Chargements → Définir charges → Barre → Charge uniforme</b> : pZ = <b>−20</b> kN/m → appliquez aux poutres B et C. "
        "Puis −16 kN/m (10 + 6 de mur) aux poutres A et D.",
        "Cas EXPL1 actif : −6 kN/m sur B et C ; −3 kN/m sur A et D.",
        "<b>Chargements → Combinaisons automatiques</b> → <b>Combinaisons complètes</b> selon la norme : Robot crée ELU et ELS.",
    ]),
    ("astuce", "Le signe « moins » veut dire « vers le bas » (axe Z vers le haut). Une erreur de signe et votre maison "
               "est tirée vers le ciel ! Vérifiez toujours visuellement que les flèches pointent vers le bas."),
    ("ci", "Pour un projet réel en Côte d'Ivoire, ajoutez aussi le <b>vent</b> (surtout pour les bâtiments élevés ou en zone côtière) "
           "et, pour les terrasses accessibles, une exploitation plus forte (2,5 kN/m² ou plus selon l'usage). "
           "Pour une villa R+1 courante, G + Q gouvernent généralement le dimensionnement."),

    ("h1", "Leçon 5 — Calculer et lire les résultats (jour 3)", True),
    ("etapes", [
        "<b>Analyse → Calculer</b> (bouton calculatrice). Attendez le message « Calculs terminés ». Lisez les avertissements.",
        "<b>Résultats → Diagrammes pour barres</b> → cochez <b>My</b> (moment), <b>Fz</b> (tranchant), <b>Fx</b> (effort normal) → cas <b>ELU</b>.",
        "<b>Résultats → Réactions</b> : la force que chaque appui transmet à sa semelle (servira à dimensionner les semelles).",
        "<b>Résultats → Déplacements</b> au cas <b>ELS</b> : la flèche des poutres doit rester inférieure à portée/500 environ (5,50 m → 11 mm).",
    ]),
    ("fig", ecran_rb(dessin_portique(resultats="moments"), reperes=[(0.5, 0.55, 1)],
                     bas="Résultats — Diagramme My — Cas : 3 (ELU)"),
     "Figure 4.3 — Diagramme des moments sur les poutres (courbes rouges)."),

    ("h1", "Leçon 6 — Contrôler le logiciel à la main (jour 4)", True),
    ("p", "<b>Règle d'or du technicien : on ne croit jamais un logiciel sans un contrôle rapide.</b> Prenons la poutre de "
          "l'axe B (deux travées : 5,50 m et 4,50 m) au niveau 3,00 m."),
    ("code", "Charges : G = 20 + poids propre 0,20 × 0,50 × 25 = 2,5  →  G = 22,5 kN/m ; Q = 6 kN/m\n"
             "ELU : q = 1,35 × 22,5 + 1,5 × 6 = 30,4 + 9,0 ≈ 39 kN/m\n"
             "Moment sur l'appui central (poutre continue, formule des 3 moments) :\n"
             "   Ma = q (L1³ + L2³) / [8 (L1 + L2)] = 39 × (166,4 + 91,1) / 80 ≈ 125 kN·m\n"
             "Moment maximal en travée de 5,50 m ≈ 91 kN·m ; en travée de 4,50 m ≈ 46 kN·m"),
    ("fig", schema_simple(17 * cm, 130, diag_moment), "Figure 4.4 — Ce que Robot doit trouver (à ± 10 %) sur la poutre de l'axe B."),
    ("tableau", [
        ["Contrôle", "Calcul à la main", "Robot (à remplir)", "OK si écart"],
        ["Moment appui central (ELU)", "≈ 125 kN·m", "....", "&lt; 15 %"],
        ["Moment travée 5,50 m (ELU)", "≈ 91 kN·m", "....", "&lt; 15 %"],
        ["Effort normal poteau B2 RDC (ELU)", "394 kN (méthode des surfaces, livret 0) à ≈ 490 kN (avec continuité)", "....", "dans la fourchette"],
        ["Réaction appui B2 (ELS)", "285 à 350 kN", "....", "dans la fourchette"],
    ], [0.3, 0.38, 0.17, 0.15]),
    ("p", "Pourquoi le logiciel trouve-t-il plus que la méthode des surfaces sur le poteau B2 ? Parce que la poutre est "
          "<b>continue</b> : l'appui central « attire » plus de charge (environ +15 à +25 %). Avec ~0,49 MN, le poteau 20 × 20 "
          "(capacité 0,529 MN, livret 0) reste juste suffisant : beaucoup de bureaux d'études passeraient en <b>25 × 25</b> par sécurité."),
    ("h2", "Ferraillage de contrôle de la poutre (BAEL, fbu = 14,17 MPa, fsu = 348 MPa, d = 0,45 m)"),
    ("code", "Appui : μ = 0,125 / (0,20 × 0,45² × 14,17) = 0,219 → α = 0,313 → z = 0,394 m\n"
             "        As = 0,125 / (0,394 × 348) = 9,1 cm²  →  3 HA20 (9,42 cm²) en chapeau\n"
             "Travée : μ = 0,159 → α = 0,218 → z = 0,411 m → As = 6,4 cm²  →  2 HA16 + 2 HA14 (7,10 cm²)"),

    ("h1", "Leçon 7 — Ferraillage, semelles et note de calcul (jour 5)", True),
    ("etapes", [
        "Disposition <b>Dimensionnement BA</b> (ou menu Dimensionnement → Dimensionnement des éléments BA) : sélectionnez une poutre, "
        "réglez les paramètres (enrobage <b>3 cm</b>, fissuration <b>peu préjudiciable</b> ou <b>préjudiciable</b> en milieu humide).",
        "Lancez le calcul du <b>ferraillage théorique</b> (cm² nécessaires) puis du <b>ferraillage réel</b> (barres choisies). "
        "Robot dessine le plan de ferraillage de la poutre.",
        "Même chose pour un poteau, puis pour une <b>semelle</b> : contrainte admissible du sol <b>0,15 MPa</b> (hypothèse latérite).",
        "Note de calcul : <b>Fichier → Composition de l'impression</b> → ajoutez les tableaux (charges, combinaisons, réactions, ferraillages) → PDF.",
    ]),
    ("h2", "Importer le modèle depuis Revit"),
    ("p", "Dans Revit (livret 3) : onglet Analyser → <b>Robot Structural Analysis Link</b> → « Envoyer le modèle ». Robot s'ouvre avec "
          "les poteaux, poutres et appuis déjà créés. Vous n'avez plus qu'à vérifier, charger et calculer. Un modèle IFC (ArchiCAD) peut aussi être importé."),
    ("h2", "L'IA pour vous aider"),
    ("ia", "Copiez le tableau des réactions ou des moments et demandez à Claude : « Voici les résultats Robot de ma poutre "
           "continue 5,50 + 4,50 m chargée à 39 kN/m à l'ELU. Les valeurs sont-elles cohérentes ? Explique-moi simplement. » "
           "Ou : « Rédige le chapitre Hypothèses de ma note de calcul (BAEL 91 mod. 99, béton 25 MPa, FeE400, sol 0,15 MPa, Abidjan). » "
           "Vérifiez chaque chiffre : c'est vous le responsable."),
    ("quiz", [
        ("Que voit Robot de la maison ?", "Un squelette de barres, nœuds, appuis et charges"),
        ("Quel appui met-on au pied des poteaux ?", "Un encastrement"),
        ("Que vaut la combinaison ELU ?", "1,35 G + 1,5 Q"),
        ("Pourquoi le signe moins dans pZ = −20 ?", "La charge est dirigée vers le bas"),
        ("Moment sur appui central de la poutre B (ELU) ?", "Environ 125 kN·m"),
        ("Pourquoi Robot donne plus que la méthode des surfaces au poteau B2 ?", "Effet de continuité des poutres"),
    ]),
]
