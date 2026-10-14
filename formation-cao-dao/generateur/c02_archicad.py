from lib import *

MODULE = "Livret 2 — ArchiCAD (maquette 3D)"
COUL = colors.HexColor("#1565C0")
MENUS = ["Fichier", "Édition", "Affichage", "Conception", "Documentation", "Options", "Teamwork", "Fenêtre", "Aide"]
INFO = ["Palette Info :", "Hauteur 3,00", "Épaisseur 0,20", "Composite", "Ligne de réf.", "Étage d'origine"]
BOITE = ("Boîte à outils", ["Flèche (sélection)", "Mur", "Poteau", "Poutre", "Dalle", "Toit", "Escalier",
                            "Garde-corps", "Porte", "Fenêtre", "Zone (pièce)", "Cote", "Texte", "Coupe", "Façade"])
CARTE = ("Navigateur", ["Carte du projet", "  Étages", "    2. Terrasse  6,00", "    1. Étage  3,00",
                        "    0. RDC  0,00", "  Coupes", "  Façades", "  Vues 3D", "Carnet de mises en page"])


def ecran_ac(contenu=None, reperes=(), bas="Plan d'étage : 0. RDC   Échelle 1:100", haut=9.5 * cm):
    return ecran("Archicad — Villa_R+1.pln", COUL, MENUS, INFO, BOITE, CARTE, bas,
                 contenu=contenu, reperes=reperes, haut=haut)


def vue_coupe(d, x, y, w, h):
    e = min((w - 60) / 12.0, (h - 30) / 7.0)
    ox, oy = x + (w - 12 * e) / 2, y + 12
    sol = colors.HexColor("#C0703A")
    d.add(Rect(ox - 20, oy - 8, 12 * e + 40, 8, fillColor=sol, strokeColor=None))
    for z in (2.8, 5.8):
        d.add(Rect(ox, oy + z * e, 12 * e, 0.2 * e, fillColor=colors.HexColor("#7F8C8D"), strokeColor=colors.white, strokeWidth=0.4))
    for xa in (0, 4, 8, 12):
        d.add(Rect(ox + xa * e - 0.1 * e, oy, 0.2 * e, 6 * e, fillColor=colors.HexColor("#95A5A6"), strokeColor=colors.white, strokeWidth=0.4))
        d.add(Rect(ox + xa * e - 0.7 * e, oy - 1.0 * e, 1.4 * e, 0.35 * e, fillColor=colors.HexColor("#5D6D7E"), strokeColor=colors.white, strokeWidth=0.4))
    d.add(Rect(ox - 0.1 * e, oy + 6 * e, 12.2 * e, 0.6 * e, fillColor=None, strokeColor=colors.white, strokeWidth=0.6))
    for z, t in ((0, "±0,00 RDC"), (3, "+3,00 Étage"), (6, "+6,00 Terrasse")):
        d.add(String(ox + 12 * e + 6, oy + z * e, "▼ " + t, fontName="DV", fontSize=6.5, fillColor=colors.HexColor("#F5B041")))


BLOCS = [
    ("couverture", "LIVRET 2<br/>ARCHICAD", "Construire la maquette 3D de la villa R+1<br/>Semaine 3 de la formation",
     "Comprendre la différence entre « dessiner » (AutoCAD) et « construire » (ArchiCAD) ; régler les étages ; "
     "construire murs, poteaux, poutres, dalles, ouvertures, escalier et terrasse ; obtenir automatiquement "
     "coupes, façades, surfaces et nomenclatures ; mettre en page et publier en PDF ; transmettre la maquette "
     "aux ingénieurs (format IFC) ; produire des images réalistes avec l'IA."),

    ("h1", "Leçon 1 — Penser « maquette » et non plus « dessin »"),
    ("image_mentale", "Dans AutoCAD, vous tracez <b>deux traits</b> pour représenter un mur. Dans ArchiCAD, vous "
                      "posez <b>un vrai mur</b> : il a une hauteur, une épaisseur, un matériau. ArchiCAD en déduit tout seul "
                      "le plan, la coupe, la façade et la 3D. C'est comme construire une <b>maison en Lego</b> : on "
                      "pose les pièces, et on peut la regarder sous tous les angles."),
    ("p", "La conséquence est énorme : si vous déplacez un mur dans le plan, la coupe, la façade, la 3D et les "
          "surfaces se mettent à jour <b>automatiquement</b>. Fini les incohérences entre les plans."),
    ("h2", "1.1 L'écran d'ArchiCAD"),
    ("fig", ecran_ac(dessin_plan(), reperes=[(0.25, 0.93, 1), (0.37, 0.845, 2), (0.06, 0.5, 3), (0.5, 0.45, 4), (0.93, 0.5, 5)]),
     "Figure 2.1 — Reproduction simplifiée de l'écran d'ArchiCAD (l'aspect exact varie selon la version)."),
    ("tableau", [
        ["N°", "Zone", "À quoi elle sert"],
        ["1", "Barre de menus", "Fichier, Conception (outils de construction), Documentation (cotes, coupes, publication)..."],
        ["2", "Palette Info", "Les réglages rapides de l'outil choisi (hauteur, épaisseur, matériau)"],
        ["3", "Boîte à outils", "Les « pièces de Lego » : Mur, Poteau, Poutre, Dalle, Porte, Fenêtre, Zone..."],
        ["4", "Fenêtre de travail", "Le plan de l'étage actif (F2) ou la vue 3D (F3)"],
        ["5", "Navigateur", "La table des matières du projet : étages, coupes, façades, vues 3D, mises en page"],
    ], [0.06, 0.25, 0.69]),
    ("tableau", [
        ["Raccourci", "Action"],
        ["F2", "Afficher le plan de l'étage"],
        ["F3", "Afficher la vue 3D"],
        ["Ctrl + flèche haut / bas", "Monter / descendre d'un étage"],
        ["Molette", "Zoom ; molette enfoncée = déplacer ; Maj + molette en 3D = tourner autour"],
        ["Double-clic sur un outil", "Ouvrir la boîte de réglages complète de cet outil"],
        ["Ctrl + Z / Ctrl + S", "Annuler / enregistrer"],
    ], [0.35, 0.65]),
    ("capture", "Faites une capture de votre écran ArchiCAD et repérez-y les 5 zones. Fiche n°2 de votre aide-mémoire."),

    ("h1", "Leçon 2 — Préparer le projet (jour 1)", True),
    ("etapes", [
        "Lancez ArchiCAD → <b>Nouveau projet</b> → choisissez le gabarit standard de votre version (français si disponible). Unités : mètres.",
        "Menu <b>Options → Préférences du projet → Unités de travail</b> : longueur <b>mètre</b>, 2 décimales.",
        "Menu <b>Conception → Réglages des étages</b> (Ctrl + 7) : créez 3 étages : <b>0. RDC</b> à 0,00 m (hauteur 3,00) ; "
        "<b>1. Étage</b> à 3,00 m (hauteur 3,00) ; <b>2. Terrasse</b> à 6,00 m.",
        "Créez le quadrillage : outil <b>Élément de quadrillage</b> ou menu <b>Conception → Système de quadrillage</b> : "
        "axes A, B, C, D espacés de 4,00 m et axes 1, 2, 3 espacés de 5,50 m puis 4,50 m.",
        "Enregistrez : <b>Villa_R+1.pln</b>.",
    ]),
    ("h2", "Préparer le mur « agglo 15 enduit »"),
    ("p", "Un <b>composite</b> est un mur « mille-feuille » : plusieurs couches avec leur épaisseur. Menu "
          "<b>Options → Attributs d'éléments → Composites</b> : dupliquez un composite existant et réglez :"),
    ("tableau", [
        ["Couche", "Matériau de construction", "Épaisseur"],
        ["1 (extérieur)", "Enduit ciment", "0,025 m"],
        ["2 (cœur porteur)", "Bloc béton creux (agglo)", "0,15 m"],
        ["3 (intérieur)", "Enduit ciment", "0,025 m"],
        ["Total", "Nom : <b>AGGLO 15 + ENDUITS</b>", "<b>0,20 m</b>"],
    ], [0.3, 0.5, 0.2]),

    ("h1", "Leçon 3 — Murs, poteaux et poutres (jour 2)", True),
    ("h2", "3.1 Les murs du RDC"),
    ("etapes", [
        "Choisissez l'outil <b>Mur</b>. Dans la palette Info : composite <b>AGGLO 15 + ENDUITS</b>, hauteur <b>3,00</b>, "
        "ligne de référence <b>au centre</b> (le mur se pose sur l'axe).",
        "Méthode de construction <b>Rectangle</b> : cliquez sur l'intersection A1 puis sur D3 : les 4 murs extérieurs sont créés.",
        "Méthode <b>Chaîne</b> pour les murs intérieurs : cliquez point par point en suivant le plan (figure 0.2 du livret 0). "
        "Pour taper une longueur exacte : commencez le mur, puis tapez directement la longueur au clavier (ex. <b>4</b>) et Entrée.",
        "Appuyez sur <b>F3</b> : votre maison sort de terre en 3D !",
    ]),
    ("h2", "3.2 Les poteaux et les poutres"),
    ("etapes", [
        "Outil <b>Poteau</b> : section rectangulaire <b>0,20 × 0,20</b>, matériau <b>Béton armé</b>, hauteur liée à l'étage supérieur.",
        "Cliquez sur chacune des 12 intersections d'axes. Astuce : placez-en un, puis <b>Édition → Déplacer → Multiplier</b> pour copier en série.",
        "Outil <b>Poutre</b> : section <b>0,20 × 0,50</b> (axes A à D, portées de 5,50 et 4,50 m) et <b>0,20 × 0,35</b> (axes 1 à 3, portées de 4,00 m), "
        "dessus de poutre au niveau du dessus de dalle (3,00 m). Tracez de poteau à poteau.",
    ]),
    ("astuce", "Dans les réglages de chaque élément, réglez la <b>Fonction structurelle</b> sur <b>Élément porteur</b> "
               "pour les poteaux, poutres et dalles, et <b>Élément non porteur</b> pour les murs d'agglos. Le calculateur qui "
               "recevra votre maquette (Robot, CYPECAD) saura ainsi ce qu'il doit calculer."),
    ("fig", ecran_ac(dessin_plan(axes=True, poteaux=True), reperes=[(0.06, 0.62, 1), (0.42, 0.3, 2)],
                     bas="Outil Poteau : 0,20 × 0,20  Béton armé   — cliquer sur l'intersection des axes"),
     "Figure 2.2 — Outil Poteau (1) et poteaux posés aux intersections des axes (2)."),

    ("h1", "Leçon 4 — Dalles, portes, fenêtres et pièces (jour 3)", True),
    ("h2", "4.1 Les dalles"),
    ("etapes", [
        "Outil <b>Dalle</b> : épaisseur <b>0,20</b> (corps creux 16+4), matériau béton, <b>dessus à 0,00</b> par rapport à l'étage supérieur.",
        "Méthode <b>Baguette magique</b> : barre d'espace + clic à l'intérieur des murs → la dalle épouse le contour.",
        "Faites aussi la dalle du RDC (dallage sur terre-plein de 10 à 12 cm sur hérisson) et celle de la terrasse (étage 2).",
    ]),
    ("h2", "4.2 Les portes et fenêtres"),
    ("etapes", [
        "Outil <b>Porte</b> : double-cliquez pour ouvrir la bibliothèque. Choisissez une porte battante, largeur <b>0,90</b>, hauteur <b>2,10</b>.",
        "Cliquez sur le mur à l'endroit voulu, puis cliquez du côté où la porte doit s'ouvrir. Le trou dans le mur se fait tout seul !",
        "Outil <b>Fenêtre</b> : fenêtre coulissante 1,20 × 1,30, <b>hauteur d'allège 0,90</b>. Placez-les comme sur le plan.",
    ]),
    ("h2", "4.3 Les zones (pièces)"),
    ("etapes", [
        "Outil <b>Zone</b> : choisissez une catégorie (Séjour, Chambre, Cuisine...).",
        "Méthode Baguette magique : cliquez dans chaque pièce, puis placez l'étiquette. Nom et <b>surface calculée automatiquement</b>.",
        "Copiez tout le RDC à l'étage : sélectionnez tout (Ctrl + A) → Ctrl + C → Ctrl + flèche haut → Ctrl + V. Puis adaptez l'étage (4 chambres par exemple).",
    ]),
    ("ci", "Pensez aux <b>casquettes</b> (petites dalles de 0,60 m en saillie au-dessus des fenêtres) : outil Dalle, "
           "épaisseur 0,10 m. Elles protègent du soleil et de la pluie battante. Visualisez l'ombre en 3D avec le soleil d'Abidjan "
           "(menu des réglages du soleil : latitude ≈ 5,3° Nord)."),

    ("h1", "Leçon 5 — Escalier, terrasse et 3D (jour 4)", True),
    ("etapes", [
        "Outil <b>Escalier</b> : forme en <b>L</b> ou <b>droite</b>, du RDC (0,00) à l'étage (3,00). Hauteur de marche ≈ <b>17,6 cm</b> "
        "(17 marches), giron <b>28 cm</b>. ArchiCAD vérifie la règle du « pas » (2h + g entre 60 et 65 cm).",
        "Faites la trémie (le trou dans la dalle) : sélectionnez la dalle de l'étage et découpez-la avec un rectangle (opération soustraction de polygone).",
        "Terrasse : dalle à l'étage 2 + <b>acrotère</b> = mur bas de 0,60 m de haut sur le pourtour (outil Mur, hauteur 0,60).",
        "Pente de la terrasse : au moins 1,5 % vers les descentes d'eaux pluviales.",
        "Appuyez sur <b>F3</b>, tournez autour (Maj + molette). Explorez la maquette.",
    ]),
    ("fig", ecran_ac(dessin_maison_3d(fond_sombre=False), reperes=[(0.5, 0.6, 1)],
                     bas="Vue 3D générique — Axonométrie"),
     "Figure 2.3 — La villa R+1 en 3D (vue F3) : 2 niveaux, toiture-terrasse avec acrotère."),

    ("h1", "Leçon 6 — Coupes, façades et documentation (jour 5)", True),
    ("etapes", [
        "Outil <b>Coupe</b> : tracez une ligne au travers du plan (passez par l'escalier), puis cliquez du côté du regard. "
        "La coupe apparaît dans le Navigateur : double-cliquez pour l'ouvrir.",
        "Outil <b>Façade</b> : tracez une ligne devant chaque côté de la maison (Sud, Nord, Est, Ouest).",
        "Cotez : outil <b>Cote</b> (chaînes de cotes en plan), <b>Cote de niveau</b> en coupe (±0,00, +3,00, +6,00).",
        "Nomenclatures : <b>Documentation → Nomenclature → Nomenclatures interactives</b> → liste des portes, fenêtres, "
        "volume de béton des dalles, poteaux et poutres.",
    ]),
    ("fig", ecran_ac(vue_coupe, reperes=[(0.5, 0.75, 1)], bas="Coupe A-A   Échelle 1:50"),
     "Figure 2.4 — Coupe A-A générée automatiquement : semelles, poteaux, dalles, niveaux."),

    ("h1", "Leçon 7 — Mise en page, PDF et envoi aux ingénieurs (jour 6)", True),
    ("etapes", [
        "Navigateur → <b>Carnet de mises en page</b> : créez une mise en page A3 avec votre cartouche (nom : Moulo Jean Claude).",
        "Glissez-déposez depuis la Carte du projet : plan RDC (1/100), plan étage, 2 façades, la coupe.",
        "Publication PDF : navigateur → <b>Ensembles de publication</b> → nouvel ensemble → format PDF → <b>Publier</b>.",
        "Envoi aux ingénieurs structure : <b>Fichier → Enregistrer sous → IFC</b> (traducteur « Vue de coordination » ou "
        "« Analyse structurelle » selon votre version). Ce fichier IFC s'ouvre dans Robot, Revit et CYPECAD.",
    ]),
    ("astuce", "Le format <b>IFC</b> est la « langue commune » du BIM : comme un PDF, mais pour les maquettes 3D. "
               "C'est lui qui fera le pont entre ce livret et les livrets 4 (Robot) et 5 (CYPECAD)."),

    ("h1", "Leçon 8 — L'intelligence artificielle dans ArchiCAD", True),
    ("puces", [
        "<b>AI Visualizer</b> (versions récentes d'ArchiCAD) : à partir d'une simple vue 3D de votre maquette et d'une "
        "phrase (ex. : « villa moderne en Côte d'Ivoire, enduit blanc, palmiers, ciel tropical, fin d'après-midi »), "
        "l'outil génère des images d'ambiance en quelques secondes. Idéal pour montrer des idées au client.",
        "Les images produites sont des <b>illustrations</b>, pas des plans : la maquette reste la seule référence.",
        "Vous pouvez demander à une IA conversationnelle (Claude) : « Vérifie mon programme de pièces : surfaces "
        "et circulation » ou « Rédige la notice descriptive de la villa à partir de cette nomenclature ».",
    ]),
    ("ia", "Exemple de demande pour l'AI Visualizer : « Façade sud d'une villa R+1 contemporaine à Abidjan, enduit "
           "blanc cassé, menuiseries aluminium gris, casquettes béton, jardin tropical, lumière douce. » "
           "Essayez plusieurs variantes de couleurs avant de choisir avec le client."),
    ("quiz", [
        ("Quelle est la grande différence entre ArchiCAD et AutoCAD ?", "ArchiCAD construit des objets 3D ; AutoCAD dessine des traits"),
        ("Quelle touche affiche la 3D ?", "F3"),
        ("À quoi sert un composite ?", "Définir un mur en couches (enduit / agglo / enduit)"),
        ("Comment obtenir les surfaces des pièces ?", "Avec l'outil Zone"),
        ("Quel format envoie-t-on à l'ingénieur structure ?", "IFC"),
        ("Une image de l'AI Visualizer est-elle un plan ?", "Non, c'est une illustration d'ambiance"),
    ]),
]
