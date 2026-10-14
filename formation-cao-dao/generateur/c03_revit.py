from lib import *

MODULE = "Livret 3 — Revit (BIM)"
COUL = colors.HexColor("#0D47A1")
ONGLETS = ["Architecture", "Structure", "Acier", "Systèmes", "Insérer", "Annoter", "Analyser", "Volume et site",
           "Collaborer", "Vue", "Gérer", "Modifier"]
OUTILS_A = ["Mur", "Porte", "Fenêtre", "Composant", "Poteau", "Toit", "Sol", "Plafond", "Escalier", "Pièce", "Niveau", "Quadrillage"]
OUTILS_S = ["Poutre", "Mur", "Poteau", "Sol", "Isolée", "Semelle filante", "Dalle de fondation", "Armature", "Quadrillage", "Niveau"]
PROP = ("Propriétés", ["Mur de base", "Agglo 15 + enduits", "Contrainte inf. : RDC", "Décalage inf. : 0,00",
                       "Contrainte sup. : Étage", "Porteur : Non", "Phase : Nouvelle", "Arborescence du projet",
                       "  Vues (toutes)", "    Plans d'étage", "      RDC / Étage", "    Élévations", "    Vues 3D",
                       "  Nomenclatures", "  Feuilles"])


def ecran_rv(contenu=None, reperes=(), outils=OUTILS_A, bas="Cliquez pour sélectionner, TAB pour d'autres choix", haut=9.5 * cm):
    return ecran("Autodesk Revit — Villa_R+1.rvt — Plan d'étage : RDC", COUL, ONGLETS, outils, PROP, None, bas,
                 contenu=contenu, reperes=reperes, haut=haut)


def vue_familles(d):
    boites = [(0, "Catégorie", "Portes", BLEU), (1, "Famille", "Porte simple battante", ORANGE),
              (2, "Type", "0,90 × 2,10 m", VERT), (3, "Occurrence", "La porte de la Chambre 1", ROUGE)]
    for i, t, ex, c in boites:
        x = 10 + i * 120
        d.add(Rect(x, 30, 105, 50, fillColor=c, strokeColor=None, rx=6, ry=6))
        d.add(String(x + 52, 60, t, fontName="DV-B", fontSize=10, fillColor=colors.white, textAnchor="middle"))
        d.add(String(x + 52, 42, ex, fontName="DV", fontSize=6.8, fillColor=colors.white, textAnchor="middle"))
        if i < 3:
            d.add(Polygon([x + 107, 58, x + 117, 55, x + 107, 52], fillColor=GRIS, strokeColor=None))
    d.add(String(240, 10, "Du plus général (à gauche) au plus précis (à droite)", fontName="DV-I", fontSize=8, fillColor=GRIS, textAnchor="middle"))


BLOCS = [
    ("couverture", "LIVRET 3<br/>REVIT (BIM)", "La maquette numérique « intelligente » de la villa<br/>Semaine 4 de la formation",
     "Comprendre ce qu'est le BIM et pourquoi tous les grands projets l'exigent ; régler niveaux et quadrillages ; "
     "construire l'architecture ET la structure (poteaux, poutres, dalles, semelles) ; utiliser les familles et "
     "les types ; sortir automatiquement les nomenclatures (quantités de béton) ; créer des feuilles et un PDF ; "
     "préparer le modèle analytique pour le calcul dans Robot ; découvrir la conception générative avec l'IA."),

    ("h1", "Leçon 1 — Le BIM expliqué simplement"),
    ("image_mentale", "Imaginez une maquette de maison où <b>chaque objet a une carte d'identité</b> : ce mur est en agglos "
                      "de 15, il mesure 4 m, il coûte tant, il a été construit en phase 1. Le <b>BIM</b> (Building Information "
                      "Modeling = modélisation des informations du bâtiment), c'est cela : une maquette 3D + une base de données. "
                      "Revit est le logiciel BIM le plus répandu dans le monde."),
    ("p", "Avec Revit, l'architecte, l'ingénieur structure et le métreur travaillent sur <b>la même maquette</b>. "
          "Le devis quantitatif (béton, agglos, portes) sort directement de la maquette : c'est très utile pour vos devis BTP."),
    ("h2", "1.1 L'écran de Revit"),
    ("fig", ecran_rv(dessin_plan(axes=True), reperes=[(0.3, 0.845, 1), (0.25, 0.79, 2), (0.06, 0.6, 3), (0.06, 0.25, 4), (0.6, 0.45, 5)]),
     "Figure 3.1 — Reproduction simplifiée de l'écran de Revit (l'aspect exact varie selon la version)."),
    ("tableau", [
        ["N°", "Zone", "À quoi elle sert"],
        ["1", "Onglets du ruban", "<b>Architecture</b> (murs, portes...), <b>Structure</b> (poteaux, poutres, fondations), <b>Vue</b>, <b>Annoter</b>, <b>Gérer</b>"],
        ["2", "Outils de l'onglet", "Les boutons de l'onglet choisi. L'onglet <b>Modifier</b> apparaît quand un objet est sélectionné"],
        ["3", "Palette Propriétés", "Les informations de l'objet sélectionné (hauteur, niveau, matériau...)"],
        ["4", "Arborescence du projet", "Toutes les vues : plans, élévations, coupes, 3D, nomenclatures, feuilles"],
        ["5", "Zone de dessin", "La vue active. Une vue = une façon de regarder la même maquette"],
    ], [0.06, 0.26, 0.68]),
    ("h2", "1.2 Familles, types et occurrences"),
    ("fig", schema_simple(17 * cm, 90, vue_familles), "Figure 3.2 — La logique de rangement des objets dans Revit."),
    ("puces", [
        "<b>Modifier un type</b> (bouton « Modifier le type ») change <u>toutes</u> les portes de ce type dans le projet.",
        "<b>Modifier une occurrence</b> (palette Propriétés) ne change que l'objet sélectionné.",
        "Les <b>familles système</b> (murs, sols, toits) existent dans le projet ; les <b>familles chargeables</b> (portes, fenêtres, "
        "poteaux) se chargent depuis la bibliothèque (Insérer → Charger la famille).",
    ]),

    ("h1", "Leçon 2 — Démarrer le projet (jour 1)", True),
    ("etapes", [
        "Revit → <b>Nouveau → Projet</b> → gabarit <b>Architectural</b> (version française, métrique).",
        "<b>Gérer → Unités du projet</b> : longueur en <b>mètres</b>, arrondi 2 décimales (ou centimètres si vous préférez).",
        "Ouvrez une <b>élévation</b> (Arborescence → Élévations → Sud). Renommez les niveaux : <b>RDC</b> (0,00), "
        "<b>Étage</b> (3,00) ; créez <b>Terrasse</b> (6,00) avec <b>Architecture → Niveau</b>.",
        "Ouvrez le plan RDC. <b>Architecture → Quadrillage</b> : tracez l'axe vertical A, puis copiez-le (Modifier → Copier, "
        "case « Multiple ») tous les 4,00 m : B, C, D. Horizontaux : 1, puis 2 à 5,50 m, 3 à 10,00 m.",
        "Sélectionnez les quadrillages et cliquez sur <b>Épingler</b> (punaise) pour ne pas les déplacer par erreur.",
        "Enregistrez : <b>Villa_R+1.rvt</b>.",
    ]),
    ("attention", "Les niveaux ne se créent que dans une vue d'<b>élévation</b> ou de <b>coupe</b>. Si le bouton « Niveau » est grisé, "
                  "c'est que vous êtes dans un plan."),

    ("h1", "Leçon 3 — L'architecture (jour 2)", True),
    ("h2", "3.1 Créer le type de mur « Agglo 15 + enduits »"),
    ("etapes", [
        "<b>Architecture → Mur</b>. Dans Propriétés, choisissez un mur de base générique de 20 cm → <b>Modifier le type</b> → <b>Dupliquer</b> → nom : <b>Agglo 15 + enduits</b>.",
        "Structure → <b>Modifier</b> : 3 couches : enduit 0,025 (Finition 1) / bloc béton 0,15 (<b>Structure [1]</b>) / enduit 0,025 (Finition 2).",
        "Barre des options : <b>Hauteur : Étage</b> (le mur monte jusqu'au niveau supérieur), ligne de justification <b>Axe du mur</b>.",
        "Tracez les murs extérieurs (option Rectangle) de A1 à D3, puis les murs intérieurs.",
    ]),
    ("h2", "3.2 Portes, fenêtres, pièces"),
    ("etapes", [
        "<b>Architecture → Porte</b> : choisissez le type 0,90 × 2,10, cliquez dans le mur. La touche <b>Espace</b> retourne le sens d'ouverture.",
        "<b>Architecture → Fenêtre</b> : réglez la <b>hauteur d'allège</b> à 0,90 m dans Propriétés.",
        "<b>Architecture → Pièce</b> : cliquez dans chaque pièce ; renommez (double-clic sur l'étiquette). La surface est calculée.",
        "Copiez au niveau Étage : sélectionnez → <b>Copier dans le presse-papier</b> → <b>Coller → Aligné sur les niveaux sélectionnés</b> → Étage.",
    ]),

    ("h1", "Leçon 4 — La structure en béton armé (jour 3)", True),
    ("p", "C'est ici que Revit devient l'outil du technicien génie civil : on modélise les <b>éléments porteurs</b> "
          "qui seront ensuite calculés dans Robot (livret 4)."),
    ("fig", ecran_rv(dessin_plan(axes=True, poteaux=True), outils=OUTILS_S, reperes=[(0.36, 0.79, 1), (0.46, 0.5, 2)],
                     bas="Poteau porteur : Béton-Poteau rectangulaire 20 x 20 cm — Aux quadrillages"),
     "Figure 3.3 — Onglet Structure : outil Poteau (1) placé automatiquement à toutes les intersections du quadrillage (2)."),
    ("etapes", [
        "<b>Structure → Poteau</b> : chargez la famille <b>Béton-Poteau rectangulaire</b>, dupliquez le type → <b>20 × 20 cm</b>.",
        "Barre des options : <b>Hauteur</b> → Étage. Puis bouton <b>Aux quadrillages</b> : sélectionnez tous les quadrillages → "
        "<b>Terminer</b>. Les 12 poteaux sont posés d'un coup ! Recommencez au niveau Étage.",
        "<b>Structure → Poutre</b> : famille <b>Béton-Poutre rectangulaire</b>, types <b>20 × 50</b> (axes A à D) et <b>20 × 35</b> (axes 1 à 3). "
        "Bouton <b>Sur quadrillage</b> pour poser les poutres de poteau à poteau.",
        "<b>Structure → Sol : Structurel</b> : dalle de 20 cm (corps creux 16+4), contour sur les poutres, sens de portée des poutrelles parallèle à l'axe des X (portée 4 m).",
        "<b>Structure → Isolée</b> (fondation) : famille <b>Semelle rectangulaire</b>, type <b>1,40 × 1,40 × 0,35</b>. "
        "Bouton <b>Aux poteaux</b> : sélectionnez les poteaux du RDC → Terminer.",
        "Longrines : outil Poutre au niveau des fondations, 20 × 40 cm, entre semelles.",
    ]),
    ("astuce", "Activez la vue du <b>modèle analytique</b> (lignes fines au cœur des éléments, avec les appuis). C'est ce "
               "« squelette » simplifié que Robot va calculer. Vérifiez que tous les nœuds sont bien connectés (pas de poutre « dans le vide »)."),
    ("ci", "En Côte d'Ivoire, les semelles sont souvent descendues à 1,00 m ou plus sur latérite. Dans Revit, réglez le "
           "<b>décalage</b> du niveau Fondation à <b>−1,00 m</b> pour que les quantités de terrassement et de béton soient justes."),

    ("h1", "Leçon 5 — Nomenclatures, quantités et feuilles (jour 4-5)", True),
    ("h2", "5.1 La nomenclature du béton (pour votre devis)"),
    ("etapes", [
        "<b>Vue → Nomenclatures → Nomenclature/Quantités</b> → catégorie <b>Poteaux porteurs</b>.",
        "Champs : <b>Type</b>, <b>Niveau de base</b>, <b>Nombre</b>, <b>Volume</b>, <b>Matériau structurel</b>.",
        "Onglet <b>Tri/Regroupement</b> : trier par Type, cocher <b>Totaux généraux</b>. Décochez « Détailler chaque occurrence ».",
        "Même chose pour Poutres, Sols, Fondations : vous obtenez le <b>volume total de béton</b>.",
    ]),
    ("tableau", [
        ["Élément (villa)", "Calcul de contrôle à la main", "Volume béton"],
        ["Poteaux 20×20 (24 u.)", "24 × 0,20 × 0,20 × 3,00", "2,88 m³"],
        ["Semelles 1,40×1,40×0,35 (12 u.)", "12 × 1,40 × 1,40 × 0,35", "8,23 m³"],
        ["Dalle 16+4 (béton de la table + nervures) ≈ 0,09 m³/m²", "2 × 120 m² × 0,09", "≈ 21,6 m³"],
    ], [0.38, 0.4, 0.22]),
    ("p", "Si la nomenclature de Revit donne des volumes très différents de ce contrôle, cherchez l'erreur (élément en double, mauvaise hauteur...)."),
    ("h2", "5.2 Les feuilles et le PDF"),
    ("etapes", [
        "<b>Vue → Feuille</b> → choisissez un cartouche A3. Remplissez : Auteur <b>Moulo Jean Claude</b>, nom du projet, numéro.",
        "Glissez les vues depuis l'arborescence : plan RDC, plan étage, élévation Sud, coupe, vue 3D, nomenclature.",
        "<b>Fichier → Exporter → PDF</b> (versions récentes) ou imprimer avec une imprimante PDF.",
    ]),

    ("h1", "Leçon 6 — Revit, Robot et l'intelligence artificielle (jour 6)", True),
    ("h2", "6.1 Envoyer la structure vers Robot"),
    ("p", "Revit et Robot sont tous deux d'Autodesk : ils sont reliés par la commande <b>Robot Structural Analysis Link</b> "
          "(onglet <b>Analyser</b>, selon votre version et l'installation du lien). Le modèle analytique part vers Robot ; "
          "après calcul, les résultats et même les armatures peuvent revenir dans Revit. Nous le ferons dans le livret 4."),
    ("h2", "6.2 L'IA et la conception générative"),
    ("puces", [
        "<b>Dynamo</b> (intégré à Revit) : programmation visuelle par « boîtes » reliées entre elles. Une IA conversationnelle "
        "peut vous expliquer chaque boîte ou écrire un petit script Python pour Dynamo (ex. : renommer toutes les pièces).",
        "<b>Generative Design</b> (Gérer → Conception générative, selon votre licence) : vous donnez des objectifs "
        "(maximiser l'ensoleillement, minimiser la longueur de couloir...), le logiciel génère et classe des centaines de variantes.",
        "<b>Autodesk Forma</b> : outil en ligne pour les premières esquisses de projet sur un terrain réel, avec analyses "
        "du soleil, du vent et du bruit assistées par IA. Pratique pour orienter la villa face aux vents dominants.",
    ]),
    ("ia", "Demande type à Claude : « Écris un script Python pour Dynamo qui liste toutes les pièces du niveau RDC avec "
           "leur surface et signale celles de moins de 9 m². » Testez toujours sur une copie du projet."),
    ("quiz", [
        ("Que veut dire BIM ?", "Modélisation des informations du bâtiment (maquette 3D + données)"),
        ("Dans quelle vue crée-t-on un niveau ?", "Une élévation ou une coupe"),
        ("Différence entre modifier le type et l'occurrence ?", "Le type change tous les objets du type ; l'occurrence un seul"),
        ("Comment placer 12 poteaux d'un coup ?", "Outil Poteau → Aux quadrillages"),
        ("Où trouve-t-on le volume de béton ?", "Dans une nomenclature/quantités"),
        ("Qu'est-ce que le modèle analytique ?", "Le squelette simplifié (lignes + appuis) envoyé au calcul"),
    ]),
]
