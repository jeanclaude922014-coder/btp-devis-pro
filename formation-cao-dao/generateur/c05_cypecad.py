from lib import *

MODULE = "Livret 5 — CYPECAD"
COUL = colors.HexColor("#4A148C")
MENUS = ["Fichier", "Édition", "Ouvrage", "Groupes", "Poteaux", "Introduction", "Calculer", "Fondation", "Plans", "Aide"]
OUTILS = ["Poteaux", "Gabarit DXF", "Poutres", "Panneaux", "Charges", "Trémie", "Copier groupe", "Calculer", "Erreurs", "Ferraillage"]
ONGLETS_BAS = "[ Entrée des poteaux ]  [ Entrée des poutres ]  [ Résultats ]  [ Isovaleurs ]  [ Déformée ]"
GAUCHE = ("Groupes / étages", ["Groupe 2 : Terrasse +6,00", "Groupe 1 : Étage +3,00", "Groupe 0 : Fondation",
                              "", "Charges du groupe :", "  G add. = 2,3 kN/m²", "  Q = 1,5 kN/m²", "", "Norme : BAEL 91 mod. 99",
                              "ou EN 1992-1-1", "Béton : fc28 25 MPa", "Acier : FeE400"])


def ecran_cy(contenu=None, reperes=(), bas=ONGLETS_BAS):
    return ecran("CYPECAD — Villa_R+1", COUL, MENUS, OUTILS, GAUCHE, None, bas, contenu=contenu, reperes=reperes)


def plan_ferraillage_semelle(d):
    # vue en plan et coupe d'une semelle 1,40 x 1,40
    s = 70
    x0, y0 = 30, 20
    d.add(Rect(x0, y0, 1.4 * s, 1.4 * s, fillColor=colors.HexColor("#ECF0F1"), strokeColor=colors.black, strokeWidth=1))
    d.add(Rect(x0 + 0.6 * s, y0 + 0.6 * s, 0.2 * s, 0.2 * s, fillColor=colors.HexColor("#7F8C8D"), strokeColor=colors.black))
    for i in range(8):
        t = 0.1 * s + i * (1.2 * s / 7)
        d.add(Line(x0 + 0.05 * s, y0 + t, x0 + 1.35 * s, y0 + t, strokeColor=ROUGE, strokeWidth=0.8))
        d.add(Line(x0 + t, y0 + 0.05 * s, x0 + t, y0 + 1.35 * s, strokeColor=BLEU, strokeWidth=0.8))
    d.add(String(x0 + 0.7 * s, y0 + 1.4 * s + 8, "VUE EN PLAN — S1 (1,40 × 1,40)", fontName="DV-B", fontSize=7.5, textAnchor="middle"))
    d.add(String(x0 + 0.7 * s, y0 - 12, "8 HA10 chaque sens, e ≈ 17 cm", fontName="DV", fontSize=7, textAnchor="middle"))
    # coupe
    x1 = 230
    d.add(Rect(x1, y0, 1.4 * s, 0.35 * s, fillColor=colors.HexColor("#ECF0F1"), strokeColor=colors.black, strokeWidth=1))
    d.add(Rect(x1 - 5, y0 - 5, 1.4 * s + 10, 5, fillColor=colors.HexColor("#BDC3C7"), strokeColor=None))
    d.add(Rect(x1 + 0.6 * s, y0 + 0.35 * s, 0.2 * s, 1.0 * s, fillColor=colors.HexColor("#ECF0F1"), strokeColor=colors.black, strokeWidth=1))
    d.add(Line(x1 + 0.05 * s, y0 + 0.05 * s, x1 + 1.35 * s, y0 + 0.05 * s, strokeColor=ROUGE, strokeWidth=1.5))
    for xx in (0.64, 0.76):
        d.add(Line(x1 + xx * s, y0 + 0.05 * s, x1 + xx * s, y0 + 1.35 * s, strokeColor=BLEU, strokeWidth=1.2))
    d.add(String(x1 + 0.7 * s, y0 + 1.4 * s + 8, "COUPE", fontName="DV-B", fontSize=7.5, textAnchor="middle"))
    d.add(String(x1 + 1.4 * s + 8, y0 + 8, "h = 0,35 m", fontName="DV", fontSize=7))
    d.add(String(x1 + 1.4 * s + 8, y0 - 4, "béton de propreté 5 cm", fontName="DV", fontSize=7, fillColor=GRIS))
    d.add(String(x1 + 1.4 * s + 8, y0 + 50, "Attentes poteau 4 HA12", fontName="DV", fontSize=7, fillColor=BLEU))
    d.add(String(x1 + 1.4 * s + 8, y0 + 40, "+ cadres HA6", fontName="DV", fontSize=7, fillColor=BLEU))
    d.add(String(x1 + 1.4 * s + 8, y0 + 20, "Enrobage 5 cm (contact sol)", fontName="DV", fontSize=7, fillColor=GRIS))


BLOCS = [
    ("couverture", "LIVRET 5<br/>CYPECAD", "Calcul automatique de la structure en béton armé et plans d'exécution<br/>Semaine 6 de la formation",
     "Comprendre la logique « bâtiment » de CYPECAD (étages, poteaux, poutres, planchers) ; importer le plan AutoCAD "
     "comme gabarit ; introduire poteaux, poutres, planchers à poutrelles et charges ; calculer tout le bâtiment, "
     "fondations comprises ; corriger les erreurs signalées ; éditer les ferraillages ; sortir les plans de "
     "coffrage et de ferraillage ; échanger avec ArchiCAD/Revit en IFC ; utiliser l'IA pour vérifier la note."),

    ("h1", "Leçon 1 — CYPECAD, c'est quoi ?"),
    ("image_mentale", "Si Robot est une <b>boîte à outils</b> où l'on construit le squelette barre par barre, CYPECAD est une "
                      "<b>usine à bâtiments</b> : on lui décrit les étages, on pose les poteaux et les poutres sur le plan "
                      "d'architecte, et il fait tout le reste : charges des dalles, calcul, ferraillage et <b>plans prêts pour le chantier</b>."),
    ("tableau", [
        ["", "Robot Structural Analysis", "CYPECAD"],
        ["Logique", "Barres et nœuds, très libre", "Étages, poteaux, poutres, planchers : pensé « bâtiment béton »"],
        ["Charges de dalle", "À répartir sur les poutres (à la main ou par bardage)", "Calculées automatiquement à partir des planchers"],
        ["Plans de ferraillage", "Par élément", "Pour tout le bâtiment (poutres, poteaux, fondations)"],
        ["Idéal pour", "Ouvrages variés, charpentes, ponts, vérifications fines", "Bâtiments courants en béton armé (villas, immeubles)"],
    ], [0.16, 0.42, 0.42]),
    ("h2", "1.1 L'écran de CYPECAD"),
    ("fig", ecran_cy(dessin_plan(axes=True, poteaux=True), reperes=[(0.3, 0.93, 1), (0.3, 0.845, 2), (0.08, 0.6, 3), (0.55, 0.45, 4), (0.25, 0.04, 5)]),
     "Figure 5.1 — Reproduction simplifiée de l'écran de CYPECAD, onglet « Entrée des poteaux » (l'aspect exact varie selon la version)."),
    ("tableau", [
        ["N°", "Zone", "À quoi elle sert"],
        ["1", "Menus", "Les menus changent selon l'onglet du bas actif"],
        ["2", "Barre d'outils", "Poteaux, poutres, panneaux (planchers), charges, calcul..."],
        ["3", "Groupes / étages", "Le niveau sur lequel on travaille et ses charges"],
        ["4", "Zone de travail", "Le gabarit (plan AutoCAD en fond) et la structure"],
        ["5", "Onglets du bas", "<b>L'ordre de travail</b> : Entrée des poteaux → Entrée des poutres → Résultats → Isovaleurs → Déformée"],
    ], [0.06, 0.26, 0.68]),

    ("h1", "Leçon 2 — Créer l'ouvrage (jour 1)", True),
    ("etapes", [
        "Lancez CYPECAD → <b>Fichier → Nouveau</b> → nom <b>Villa_R+1</b>. Choisissez « Ouvrage vide » (ou l'assistant avec import DXF/DWG).",
        "<b>Données générales</b> : norme béton <b>BAEL 91 mod. 99</b> ou <b>EN 1992-1-1</b> (selon les normes installées dans votre licence), "
        "béton <b>fc28 = 25 MPa</b> / C25/30, acier <b>FeE400</b> / B500, enrobage 3 cm.",
        "Actions : charges <b>gravitaires</b> seulement pour cet exercice (vent et séisme désactivés).",
        "<b>Introduction des étages et groupes</b> : Fondation (−1,00), Étage (+3,00), Terrasse (+6,00). "
        "Charges par groupe : charges permanentes <b>additionnelles ≈ 2,3 kN/m²</b> (carrelage + chape 1,0 ; enduit 0,3 ; "
        "cloisons 1,0). Le poids du plancher 16+4 (≈ 2,7 kN/m²) est ajouté automatiquement : total ≈ 5,0 kN/m² comme au livret 0. Exploitation : <b>1,5 kN/m²</b>.",
    ]),
    ("attention", "Piège classique : saisir 5,0 kN/m² de permanentes ET laisser CYPECAD ajouter le poids du plancher : "
                  "vous comptez le béton deux fois ! Lisez bien ce que le logiciel ajoute tout seul."),
    ("h2", "2.1 Importer le plan AutoCAD comme gabarit"),
    ("etapes", [
        "Dans AutoCAD (livret 1), enregistrez le plan RDC en DXF ou DWG, en mètres.",
        "CYPECAD → icône <b>Gabarits</b> (modèles DXF/DWG) → Ajouter → choisissez le fichier → unités <b>mètres</b>.",
        "Le plan apparaît en fond, en couleur atténuée : on va « décalquer » la structure dessus.",
    ]),

    ("h1", "Leçon 3 — Poteaux, poutres et planchers (jour 2-3)", True),
    ("h2", "3.1 Les poteaux"),
    ("etapes", [
        "Onglet <b>Entrée des poteaux</b> → <b>Introduction → Poteaux, voiles et démarrages</b> → Nouveau.",
        "Dimensions initiales <b>20 × 20</b>, du groupe Fondation au groupe Terrasse. Type de liaison en pied : <b>fondation</b>.",
        "Cliquez sur les 12 intersections d'axes du gabarit (accrochage aux intersections DXF activé).",
        "Nommez-les comme les axes : A1, B1... (cela facilitera la lecture des résultats).",
    ]),
    ("h2", "3.2 Les poutres"),
    ("etapes", [
        "Onglet <b>Entrée des poutres</b>. Choisissez le groupe <b>Étage</b>.",
        "<b>Poutres → Introduire poutre</b> : poutre <b>retombante</b> (« descendue ») 20 × 50 sur les axes A à D, 20 × 35 sur les axes 1 à 3.",
        "Cliquez de poteau à poteau. Les poutres de rive se calent sur la face extérieure (option d'alignement).",
    ]),
    ("h2", "3.3 Les planchers (« panneaux »)"),
    ("etapes", [
        "<b>Panneaux → Gestion des panneaux</b> → type <b>Plancher à poutrelles</b> (corps creux/hourdis) → créez le type <b>16+4</b> "
        "(entrevous 16 cm + table de compression 4 cm, entraxe 60 cm).",
        "Cliquez dans chaque case délimitée par les poutres, puis indiquez la <b>direction des poutrelles</b> : parallèle à X (portée 4,00 m).",
        "CYPECAD calcule alors automatiquement les charges transmises aux poutres. Faites la trémie d'escalier (<b>Trémies</b>).",
        "<b>Groupes → Copier</b> la structure de l'Étage vers la Terrasse, puis ajustez (acrotère = charge linéaire ≈ 3 kN/m en rive).",
    ]),
    ("fig", ecran_cy(dessin_portique(resultats="charges", fond_sombre=True), reperes=[(0.55, 0.7, 1)],
                     bas="Vue 3D de l'ouvrage — poteaux 20×20, poutres 20×50 / 20×35, planchers 16+4"),
     "Figure 5.2 — Vue 3D de la structure dans CYPECAD avant calcul."),
    ("ci", "Les murs d'agglos posés sur les poutres et les longrines doivent être saisis comme <b>charges linéaires</b> "
           "(agglos de 15 enduits ≈ 2,2 kN/m² × hauteur du mur). Au RDC, ils reposent sur les longrines : pensez à les saisir dans le groupe Fondation."),

    ("h1", "Leçon 4 — Calculer et corriger (jour 4)", True),
    ("etapes", [
        "<b>Calculer → Calculer l'ouvrage (fondations incluses)</b>. Pour les semelles, réglez auparavant la "
        "<b>contrainte admissible du sol à 0,15 MPa</b> (hypothèse latérite, menu Fondation / données de sol).",
        "À la fin, CYPECAD affiche un rapport. Onglet <b>Résultats</b> : les poutres en erreur apparaissent <b>en rouge</b>.",
        "<b>Poutres → Erreurs de poutres</b> : lisez chaque message (flèche excessive, section insuffisante, tranchant...).",
        "Corrigez (augmenter la hauteur, ajouter un poteau...), puis <b>recalculez</b>. Recommencez jusqu'à zéro erreur.",
        "<b>Poteaux → Éditer</b> : ferraillage proposé pour chaque poteau et chaque étage.",
    ]),
    ("tableau", [
        ["Message fréquent", "Ce que ça veut dire simplement", "Solution courante"],
        ["Flèche excessive", "La poutre descend trop au milieu", "Augmenter la hauteur de la poutre"],
        ["Section insuffisante / compression excessive", "Le béton est trop petit pour l'effort", "Agrandir la section"],
        ["Cisaillement / tranchant", "Risque de « coupure » près des appuis", "Élargir, ou plus de cadres"],
        ["Longueur d'ancrage insuffisante", "Les barres ne sont pas assez « accrochées »", "Changer le diamètre, prolonger"],
        ["Poteau en flexion composée excessive", "Le poteau est trop fin pour moment + écrasement", "Passer de 20×20 à 25×25"],
    ], [0.3, 0.38, 0.32]),
    ("h2", "Contrôle à la main (même méthode que le livret 4)"),
    ("tableau", [
        ["Grandeur", "Valeur de contrôle", "CYPECAD (à remplir)"],
        ["Effort normal poteau B2 en pied (ELU)", "≈ 0,40 à 0,50 MN", "...."],
        ["Semelle sous B2", "1,40 × 1,40 × 0,35 m, 8 HA10 chaque sens", "...."],
        ["Poutre axe B, appui central (ELU)", "≈ 125 kN·m → 3 HA20 en chapeau", "...."],
        ["Poutre axe B, travée 5,50 m (ELU)", "≈ 91 kN·m → ≈ 6,4 cm²", "...."],
    ], [0.38, 0.38, 0.24]),
    ("p", "CYPECAD calcule les planchers, la continuité et la redistribution avec ses propres méthodes : un écart de "
          "10 à 20 % avec le calcul à la main est normal. Un écart de 50 % ou plus signifie presque toujours une <b>erreur de saisie</b>."),

    ("h1", "Leçon 5 — Plans d'exécution et échanges BIM (jour 5)", True),
    ("etapes", [
        "<b>Fichier → Imprimer → Plans de l'ouvrage</b> : choisissez plans de coffrage par étage, élévation des poutres "
        "(ferraillage), tableau des poteaux, plan des fondations. Cartouche : auteur <b>Moulo Jean Claude</b>.",
        "Sortie en <b>DXF/DWG</b> (pour retoucher dans AutoCAD) ou en <b>PDF</b>.",
        "Note de calcul : <b>Fichier → Imprimer → Listes de l'ouvrage</b> (hypothèses, charges, efforts, quantités d'acier et de béton).",
        "Échanges BIM : CYPE utilise la plateforme <b>BIMserver.center</b> et le format <b>IFC</b> pour importer la maquette ArchiCAD/Revit "
        "et renvoyer la structure calculée.",
    ]),
    ("fig", schema_simple(17 * cm, 150, plan_ferraillage_semelle),
     "Figure 5.3 — Exemple de détail de ferraillage de semelle tel que vous le retrouverez sur les plans (semelle S1 sous B2)."),
    ("ci", "Sur les plans pour le chantier ivoirien, ajoutez toujours les notes : dosage béton (350 kg/m³ pour les éléments "
           "porteurs, 150 kg/m³ pour le béton de propreté), enrobages (3 cm en élévation, 5 cm au contact du sol), "
           "cure du béton 7 jours minimum, et la mention « contrainte du sol à confirmer par étude géotechnique »."),

    ("h1", "Leçon 6 — L'IA et la synthèse de la formation (jour 6)", True),
    ("ia", "Utilisez une IA comme <b>relecteur</b> : copiez la liste des erreurs de CYPECAD et demandez « Explique-moi ces "
           "messages simplement et propose les corrections possibles, du plus simple au plus coûteux ». Ou donnez-lui le "
           "tableau des quantités pour préparer le <b>devis quantitatif et estimatif</b> (béton, acier, coffrage). "
           "L'IA ne remplace pas la vérification par un ingénieur ni l'étude de sol."),
    ("h2", "Ce que vous savez faire maintenant"),
    ("tableau", [
        ["Étape", "Logiciel", "Livrable"],
        ["Dessiner le plan", "AutoCAD", "Plans 2D cotés en PDF"],
        ["Construire la maquette", "ArchiCAD ou Revit", "3D, coupes, façades, nomenclatures, IFC"],
        ["Calculer l'ossature", "Robot ou CYPECAD", "Efforts, ferraillages, plans d'exécution"],
        ["Contrôler", "Votre tête + calculatrice", "Tableau de contrôle main / logiciel"],
        ["Accélérer", "IA", "Scripts, images, explications, rédaction"],
    ], [0.3, 0.3, 0.4]),
    ("quiz", [
        ("Dans quel ordre utilise-t-on les onglets du bas ?", "Entrée des poteaux → Entrée des poutres → Résultats"),
        ("Qu'est-ce qu'un « panneau » dans CYPECAD ?", "Un plancher (ici à poutrelles 16+4)"),
        ("Quel piège avec les charges permanentes ?", "Compter deux fois le poids propre du plancher"),
        ("Que faire quand une poutre est en rouge ?", "Lire l'erreur, corriger la section, recalculer"),
        ("Écart normal entre CYPECAD et le calcul à la main ?", "10 à 20 % ; au-delà de 50 % : erreur de saisie"),
        ("Quel format pour échanger avec ArchiCAD/Revit ?", "IFC (via BIMserver.center)"),
    ]),
]
