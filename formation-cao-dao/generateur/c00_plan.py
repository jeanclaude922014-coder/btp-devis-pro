from lib import *

MODULE = "Livret 0 — Plan de formation"


def schema_parcours(d):
    etapes = [("1", "Comprendre\nun plan", ORANGE), ("2", "Concevoir\nla maison", ORANGE),
              ("3", "AutoCAD\n(dessin 2D)", BLEU), ("4", "ArchiCAD\n(maquette)", BLEU),
              ("5", "Revit\n(BIM)", BLEU), ("6", "Calcul\nà la main", VERT),
              ("7", "Robot\n(structure)", VERT), ("8", "CYPECAD\n(structure)", VERT),
              ("9", "IA +\nprojet final", ROUGE)]
    w = 17 * cm / 9
    for i, (n, t, c) in enumerate(etapes):
        cx = w * i + w / 2
        if i < 8:
            d.add(Line(cx + 14, 60, cx + w - 14, 60, strokeColor=GRIS, strokeWidth=1.2))
        d.add(Circle(cx, 60, 13, fillColor=c, strokeColor=None))
        d.add(String(cx, 55.5, n, fontName="DV-B", fontSize=12, fillColor=colors.white, textAnchor="middle"))
        for j, l in enumerate(t.split("\n")):
            d.add(String(cx, 32 - j * 10, l, fontName="DV", fontSize=7.5, fillColor=BLEU, textAnchor="middle"))
    d.add(String(17 * cm / 6, 88, "Dessiner (DAO)", fontName="DV-B", fontSize=8, fillColor=ORANGE, textAnchor="middle"))
    d.add(String(17 * cm / 2 - 20, 88, "Modéliser (CAO / BIM)", fontName="DV-B", fontSize=8, fillColor=BLEU, textAnchor="middle"))
    d.add(String(17 * cm * 0.78, 88, "Dimensionner (calcul)", fontName="DV-B", fontSize=8, fillColor=VERT, textAnchor="middle"))


def schema_chaine(d):
    boites = [("Idée du client", "(besoins, budget,\nterrain)"), ("Esquisse", "(croquis à main\nlevée)"),
              ("Plans 2D", "AutoCAD"), ("Maquette 3D", "ArchiCAD / Revit"),
              ("Calcul structure", "Robot / CYPECAD"), ("Dossier final", "plans + notes\nde calcul + devis")]
    w = 17 * cm / 6
    for i, (t, s) in enumerate(boites):
        x = i * w + 4
        d.add(Rect(x, 20, w - 14, 50, fillColor=BLEU_CLAIR, strokeColor=BLEU, strokeWidth=0.8, rx=5, ry=5))
        d.add(String(x + (w - 14) / 2, 55, t, fontName="DV-B", fontSize=7.5, fillColor=BLEU, textAnchor="middle"))
        for j, l in enumerate(s.split("\n")):
            d.add(String(x + (w - 14) / 2, 42 - j * 9, l, fontName="DV", fontSize=6.8, fillColor=GRIS, textAnchor="middle"))
        if i < 5:
            d.add(Polygon([x + w - 12, 48, x + w - 4, 45, x + w - 12, 42], fillColor=ORANGE, strokeColor=None))



def _schema_descente(d):
    # dalle
    d.add(Rect(40, 120, 260, 12, fillColor=colors.HexColor("#BDC3C7"), strokeColor=colors.black, strokeWidth=0.6))
    d.add(String(170, 136, "DALLE (on marche dessus)", fontName="DV-B", fontSize=7, fillColor=BLEU, textAnchor="middle"))
    # poutre
    d.add(Rect(40, 100, 260, 20, fillColor=colors.HexColor("#95A5A6"), strokeColor=colors.black, strokeWidth=0.6))
    d.add(String(170, 107, "POUTRE (les bras)", fontName="DV-B", fontSize=7, fillColor=colors.white, textAnchor="middle"))
    for x in (40, 280):
        d.add(Rect(x, 40, 20, 60, fillColor=colors.HexColor("#7F8C8D"), strokeColor=colors.black, strokeWidth=0.6))
        d.add(Rect(x - 25, 22, 70, 18, fillColor=colors.HexColor("#5D6D7E"), strokeColor=colors.black, strokeWidth=0.6))
    d.add(String(50, 70, "", fontName="DV", fontSize=6))
    d.add(String(90, 65, "POTEAU (les jambes)", fontName="DV-B", fontSize=7, fillColor=BLEU))
    d.add(String(170, 28, "SEMELLE (les pieds)", fontName="DV-B", fontSize=7, fillColor=BLEU, textAnchor="middle"))
    d.add(Rect(0, 0, 340, 22, fillColor=colors.HexColor("#C0703A"), strokeColor=None))
    d.add(String(170, 8, "SOL LATÉRITIQUE (le terrain)", fontName="DV-B", fontSize=7, fillColor=colors.white, textAnchor="middle"))
    for x in (90, 170, 250):
        d.add(Line(x, 160, x, 136, strokeColor=ROUGE, strokeWidth=1.5))
        d.add(Polygon([x - 4, 140, x + 4, 140, x, 134], fillColor=ROUGE, strokeColor=None))
    # légende à droite
    lignes = ["1. Les personnes et meubles (Q)", "    + le poids des matériaux (G)", "2. La dalle porte ce poids...",
              "3. ... et le donne aux poutres", "4. Les poutres le donnent aux poteaux", "5. Les poteaux aux semelles",
              "6. Les semelles l'étalent sur le sol"]
    for i, l in enumerate(lignes):
        d.add(String(330, 140 - i * 16, l, fontName="DV", fontSize=8, fillColor=BLEU))


BLOCS = [
    ("couverture", "PLAN DE FORMATION<br/>CAO / DAO &amp; DIMENSIONNEMENT",
     "De zéro à la conception complète d'une villa R+1 à Abidjan<br/>AutoCAD • ArchiCAD • Revit (BIM) • Robot Structural Analysis • CYPECAD • Intelligence artificielle",
     "Lire et dessiner un plan de maison ; transformer ce plan en maquette 3D ; comprendre comment "
     "une maison « tient debout » ; faire calculer les poteaux, poutres, dalles et fondations par "
     "un logiciel et savoir vérifier ses résultats ; utiliser l'intelligence artificielle pour aller "
     "plus vite sans jamais perdre le contrôle. Le tout expliqué avec des mots simples, pas à pas."),

    ("h1", "1. Comment utiliser cette formation"),
    ("p", "Bienvenue ! Cette formation est construite pour quelqu'un qui part de zéro. Chaque mot "
          "« technique » est expliqué la première fois qu'il apparaît, avec une image de la vie de tous "
          "les jours. Vous n'avez pas besoin d'être fort en mathématiques : les calculs utilisés sont des "
          "multiplications et des divisions, et nous les faisons ensemble."),
    ("p", "La formation est découpée en <b>6 livrets PDF</b> :"),
    ("tableau", [
        ["Livret", "Contenu", "Durée conseillée"],
        ["0 — Plan de formation (ce document)", "Le parcours, le calendrier, les bases à connaître avant d'ouvrir un logiciel", "Jours 1 à 4"],
        ["1 — AutoCAD", "Dessiner le plan 2D de la villa : murs, portes, cotes, mise en page, impression", "Semaine 2"],
        ["2 — ArchiCAD", "Construire la maquette 3D de la villa, sortir plans, coupes, façades et images", "Semaine 3"],
        ["3 — Revit (BIM)", "Maquette numérique « intelligente » architecture + structure, nomenclatures", "Semaine 4"],
        ["4 — Robot Structural Analysis", "Faire calculer l'ossature (poteaux, poutres, semelles) et lire les résultats", "Semaine 5"],
        ["5 — CYPECAD", "Calcul automatique d'un bâtiment en béton armé et plans de ferraillage", "Semaine 6"],
    ], [0.30, 0.50, 0.20]),
    ("fig", schema_simple(17 * cm, 100, schema_parcours), "Figure 0.1 — Le parcours en 9 étapes : on dessine, on modélise, puis on calcule."),
    ("h2", "La méthode « Voir – Faire – Refaire – Expliquer »"),
    ("etapes", [
        "<b>Voir</b> : lisez la leçon et regardez les schémas d'écran (10 à 20 minutes).",
        "<b>Faire</b> : ouvrez le logiciel et reproduisez chaque étape, en même temps que vous lisez.",
        "<b>Refaire</b> : le lendemain, refaites le même exercice <u>sans regarder le livret</u>. "
        "C'est là que vous apprenez vraiment.",
        "<b>Expliquer</b> : expliquez à voix haute (ou à moi dans la conversation) ce que vous avez fait. "
        "Si vous savez l'expliquer simplement, vous l'avez compris.",
    ]),
    ("astuce", "Travaillez <b>2 heures par jour</b> plutôt que 10 heures le dimanche. Le cerveau retient "
               "mieux en petites doses régulières. Prévoyez 5 jours de travail et 1 jour de révision par semaine."),
    ("h2", "Comment on reprend là où on s'est arrêté"),
    ("p", "Un fichier de suivi (<b>SUIVI_FORMATION.md</b>) est rangé avec ces livrets. Il note la leçon "
          "en cours, les exercices faits et vos difficultés. À chaque nouvelle conversation, dites "
          "simplement : <i>« On reprend la formation »</i>. Je relis ce fichier, je vous fais un petit "
          "rappel de la dernière leçon, une question de contrôle, puis on continue."),
    ("h2", "À propos des captures d'écran"),
    ("p", "Les images d'écran de ces livrets sont des <b>reproductions simplifiées</b> que j'ai dessinées : "
          "elles montrent <u>où se trouvent</u> les zones importantes (menus, palettes, ligne de commande...). "
          "L'aspect exact change un peu d'une version à l'autre du logiciel. Les numéros rouges sur les "
          "images renvoient aux explications. Dans chaque leçon, un encadré « Exercice capture d'écran » "
          "vous demande de faire <b>votre propre capture</b> (touche <b>Impr. écran</b> ou <b>Windows + Maj + S</b>) "
          "et de la coller dans un dossier « Mes captures » : ce sera votre aide-mémoire personnel, avec votre version du logiciel."),

    ("h1", "2. Le calendrier détaillé", True),
    ("p", "Le calendrier est prévu sur <b>7 semaines à raison de 2 heures par jour</b>. Si vous avez plus de "
          "temps, vous pouvez le faire en 3 à 4 semaines. Si une étape est difficile, on prend le temps : "
          "mieux vaut bien comprendre que d'aller vite."),
    ("tableau", [
        ["Période", "Module", "Ce que vous apprenez", "Exercice / résultat"],
        ["Jour 1", "M0 — Lire un plan", "Ce qu'est un plan, une échelle (1/50, 1/100), une cote, un niveau. Vue en plan, coupe, façade.", "Lire le plan de la villa d'étude et retrouver les surfaces"],
        ["Jour 2", "M0 — Le corps de la maison", "Fondation, poteau, poutre, dalle, mur, chaînage : à quoi sert chaque partie", "Dessiner à la main le « squelette » de votre propre maison"],
        ["Jour 3", "M1 — Concevoir une maison", "Programme du client, tailles minimales des pièces, circulation, orientation au soleil et au vent", "Esquisse à main levée d'une villa 3 chambres"],
        ["Jour 4", "M1 — Maison adaptée au climat", "Chaleur, pluie, ventilation traversante, débords de toit, sol latéritique", "Améliorer l'esquisse avec la check-list climat"],
        ["Semaine 2", "M2 — AutoCAD", "Interface, commandes de base, calques, murs, ouvertures, cotes, textes, blocs, mise en page, PDF", "Plan RDC de la villa coté, imprimé en PDF au 1/100"],
        ["Semaine 3", "M3 — ArchiCAD", "Étages, murs, dalles, poteaux, portes-fenêtres, escalier, toit, coupes, façades, rendus", "Maquette 3D de la villa R+1 + planches"],
        ["Semaine 4", "M4 — Revit BIM", "Niveaux, quadrillages, familles, murs, structure, nomenclatures, feuilles", "Maquette BIM + nomenclature des portes et du béton"],
        ["Semaine 5 (j. 1-2)", "M5 — Calcul à la main", "Charges, descente de charges, pré-dimensionnement BAEL / EC2 expliqués simplement", "Calcul d'un poteau et d'une semelle de la villa"],
        ["Semaine 5 (j. 3-5)", "M6 — Robot", "Modèle filaire, sections, appuis, charges, combinaisons, résultats, ferraillage", "Portique 3D de la villa calculé"],
        ["Semaine 6", "M7 — CYPECAD", "Étages, poteaux, poutres, planchers, charges, calcul, plans de ferraillage", "Structure de la villa + plans d'exécution"],
        ["Semaine 7", "M8 — IA + M9 Projet final", "Outils d'IA pour chaque logiciel, contrôle des résultats ; dossier complet", "Dossier villa R+1 : plans + 3D + note de calcul"],
    ], [0.13, 0.17, 0.42, 0.28]),
    ("attention", "Les logiciels de calcul (Robot, CYPECAD) ne remplacent pas un ingénieur. Pour un vrai "
                  "chantier, la note de calcul doit être vérifiée et signée par un ingénieur structure, et "
                  "la portance du sol doit venir d'une étude de sol (par exemple réalisée par le LBTP). "
                  "Dans cette formation, les chiffres du sol sont des <b>hypothèses d'exercice</b>."),

    ("h1", "3. Le projet fil rouge : la villa R+1 d'Abidjan", True),
    ("p", "Pendant toute la formation, nous travaillons sur <b>le même projet</b>. C'est la meilleure façon "
          "d'apprendre : vous voyez la même maison passer du dessin 2D à la 3D, puis au calcul."),
    ("tableau", [
        ["Caractéristique", "Valeur retenue (exercice)"],
        ["Lieu", "Abidjan (ex. : Cocody, Yopougon, Bingerville) — climat chaud et humide"],
        ["Type", "Villa R+1 (rez-de-chaussée + 1 étage), toiture-terrasse en béton"],
        ["Emprise au sol", "12,00 m × 10,00 m = 120 m² par niveau"],
        ["Hauteur d'étage", "3,00 m de sol à sol"],
        ["Murs", "Agglos (parpaings creux) de 15 cm, enduits des deux côtés ; 20 cm en façade si souhaité"],
        ["Ossature", "Poteaux et poutres en béton armé, axes A-B-C-D (tous les 4 m) et 1-2-3 (5,50 m puis 4,50 m)"],
        ["Planchers", "Dalle à corps creux (hourdis) 16+4 cm sur poutrelles"],
        ["Fondations", "Semelles isolées sous poteaux, reliées par des longrines"],
        ["Béton", "Dosé à 350 kg/m³ : fc28 = 25 MPa (BAEL) ≈ classe C25/30 (Eurocode 2)"],
        ["Acier", "Haute adhérence FeE400 (BAEL) / B500 (Eurocode 2) — selon disponibilité au marché"],
        ["Sol (hypothèse)", "Latérite compacte : contrainte admissible prise à 0,15 MPa (1,5 bar) — à confirmer par étude de sol"],
    ], [0.3, 0.7]),
    ("fig", ecran("Plan de principe — Villa R+1, niveau RDC", BLEU, ["Plan RDC"], [], None, None,
                  "Échelle 1/100 — cotes en mètres",
                  contenu=dessin_plan(axes=True, poteaux=True, cotes=True), haut=9 * cm),
          "Figure 0.2 — Plan du rez-de-chaussée de la villa d'étude, avec les axes (A à D, 1 à 3) et les 12 poteaux (carrés gris)."),
    ("fig", schema_simple(17 * cm, 90, schema_chaine), "Figure 0.3 — Le chemin d'un projet de maison, de l'idée au dossier final."),

    ("h1", "4. Module 0 — Les bases avant d'ouvrir un logiciel", True),
    ("h2", "4.1 Les mots à connaître (expliqués simplement)"),
    ("tableau", [
        ["Mot", "Explication simple", "Image de la vie courante"],
        ["DAO", "Dessin Assisté par Ordinateur : on dessine des traits sur l'écran au lieu du papier", "Une règle et un crayon, mais numériques"],
        ["CAO", "Conception Assistée par Ordinateur : on construit des objets (murs, dalles) en 3D", "Construire une maquette en carton, mais dans l'ordinateur"],
        ["BIM", "Maquette numérique où chaque objet connaît ses informations (matériau, prix, poids...)", "Une maquette dont chaque brique a une étiquette"],
        ["Plan", "Vue de la maison coupée à 1 m du sol, vue du dessus", "Enlever le toit et regarder d'un hélicoptère"],
        ["Coupe", "Vue de la maison tranchée verticalement", "Couper un gâteau pour voir les couches"],
        ["Façade", "Vue de l'extérieur, d'un côté de la maison", "La photo de la maison prise depuis la rue"],
        ["Échelle 1/100", "1 cm sur le papier = 100 cm (1 m) en vrai", "Une carte routière : tout est réduit"],
        ["Cote", "Chiffre écrit sur le plan qui donne une longueur", "Le mètre ruban écrit sur le dessin"],
        ["Niveau (±0,00)", "Hauteur de référence, souvent le sol fini du RDC", "Le « zéro » de la règle"],
        ["Axe / quadrillage", "Lignes repères (A, B, C... et 1, 2, 3...) où l'on place les poteaux", "Les rues et avenues d'un plan de ville"],
    ], [0.17, 0.48, 0.35]),
    ("h2", "4.2 Comment une maison tient debout"),
    ("image_mentale", "Pensez à votre corps. Les <b>fondations</b> sont les pieds : elles s'appuient sur le sol. "
                      "Les <b>poteaux</b> sont les jambes : ils portent tout ce qui est au-dessus. Les <b>poutres</b> "
                      "sont les bras tendus d'un poteau à l'autre : elles portent les planchers. La <b>dalle</b> est "
                      "le plateau sur lequel on marche. Les <b>murs en agglos</b> d'une maison à ossature sont comme "
                      "les vêtements : ils ferment et protègent, mais ne portent presque rien."),
    ("p", "Le poids descend toujours <b>du haut vers le bas</b> : dalle → poutres → poteaux → semelles → sol. "
          "C'est ce qu'on appelle la <b>descente de charges</b>. Toute la partie « calcul » de la formation "
          "consiste simplement à vérifier que chaque élément est assez gros et assez armé (avec assez de fer) "
          "pour porter ce qui pèse sur lui."),
    ("fig", schema_simple(17 * cm, 165, lambda d: _schema_descente(d)),
     "Figure 0.4 — La descente de charges : le poids suit le chemin dalle → poutre → poteau → semelle → sol."),
    ("h2", "4.3 Deux sortes de poids : G et Q"),
    ("puces", [
        "<b>G = charges permanentes</b> : tout ce qui est là pour toujours (béton, carrelage, enduits, murs). "
        "Exemple : une dalle à corps creux 16+4 avec carrelage et enduit ≈ 5,0 kN/m², soit environ 500 kg par m².",
        "<b>Q = charges d'exploitation</b> : ce qui va et vient (personnes, meubles). Pour un logement : 1,5 kN/m² (150 kg par m²).",
        "Pour être en sécurité, on <b>gonfle</b> ces poids avant de calculer : c'est le calcul à l'<b>ELU</b> "
        "(État Limite Ultime) : <b>1,35 × G + 1,5 × Q</b>. Même formule en BAEL et en Eurocode 2.",
        "Pour vérifier le « confort » (fissures, flèche), on utilise l'<b>ELS</b> (État Limite de Service) : <b>G + Q</b>, sans gonfler.",
    ]),
    ("astuce", "1 kN (kilonewton) ≈ 100 kg. Donc 1 kN/m² ≈ 100 kg par mètre carré. 1 MPa = 10 bars = 10 kg par cm²."),

    ("h1", "5. Module 1 — Concevoir une maison adaptée à la Côte d'Ivoire", True),
    ("h2", "5.1 Les tailles minimales des pièces (repères pratiques)"),
    ("tableau", [
        ["Pièce", "Surface conseillée", "Largeur minimale", "Remarque"],
        ["Séjour / salon", "20 à 35 m²", "3,60 m", "Bien ventilé, ouvert vers la terrasse"],
        ["Chambre", "10 à 14 m²", "2,80 m", "Prévoir 0,60 m autour du lit"],
        ["Chambre principale", "14 à 18 m²", "3,20 m", "Souvent avec douche/SdB intégrée"],
        ["Cuisine", "8 à 15 m²", "2,40 m", "Proche de la cour, bonne extraction de la chaleur"],
        ["Douche / WC", "3 à 6 m²", "1,20 m", "Pente du sol 1 à 2 % vers le siphon"],
        ["Couloir / dégagement", "—", "0,90 à 1,20 m", "Éviter les couloirs longs et sombres"],
        ["Escalier", "—", "0,90 m utile", "Marche : hauteur 16-18 cm, giron 26-30 cm"],
    ], [0.24, 0.2, 0.2, 0.36]),
    ("h2", "5.2 La check-list « climat chaud et humide »"),
    ("ci", "À Abidjan il fait chaud toute l'année, l'air est humide et les pluies sont fortes (surtout de mai à "
           "juillet). Une bonne maison doit <b>laisser passer l'air</b>, <b>se protéger du soleil</b> et "
           "<b>évacuer l'eau</b>. Sur un sol latéritique, il faut aussi soigner les fondations et le drainage."),
    ("puces", [
        "<b>Ventilation traversante</b> : des fenêtres sur deux façades opposées dans chaque pièce de vie.",
        "<b>Orientation</b> : placer les grandes façades vers le nord et le sud ; limiter les ouvertures à l'ouest (soleil brûlant l'après-midi).",
        "<b>Débords de toiture et casquettes</b> au-dessus des fenêtres (50 à 80 cm) pour faire de l'ombre et protéger de la pluie.",
        "<b>Hauteur sous plafond</b> confortable : 2,80 à 3,00 m (l'air chaud monte).",
        "<b>Soubassement</b> surélevé de 20 à 40 cm au-dessus du terrain pour éviter les remontées d'eau.",
        "<b>Évacuation des eaux pluviales</b> : pentes de terrasse ≥ 1,5 %, gargouilles ou descentes suffisantes.",
        "<b>Béton</b> : arroser (cure) le béton au moins 7 jours, car la chaleur le dessèche et le fissure.",
        "<b>Enrobage des aciers</b> d'au moins 3 cm (milieu humide) pour éviter la rouille.",
    ]),
    ("h2", "5.3 Exercice d'esquisse"),
    ("etapes", [
        "Sur une feuille quadrillée, tracez un rectangle de 12 carreaux × 10 carreaux (1 carreau = 1 m).",
        "Placez le séjour côté entrée, la cuisine près de la cour, les chambres côté calme.",
        "Vérifiez avec le tableau 5.1 que chaque pièce a une taille suffisante.",
        "Dessinez des flèches pour le vent : chaque pièce de vie doit avoir de l'air qui « traverse ».",
        "Marquez par des points les endroits où vous mettriez des poteaux (tous les 3,5 à 5,5 m environ).",
        "Prenez une photo de votre esquisse et envoyez-la moi dans la conversation : je la corrige avec vous.",
    ]),
    ("ia", "Vous pouvez demander à une IA (Claude, par exemple) : « Propose-moi 3 organisations de villa F4 "
           "de 120 m² pour un terrain de 15 × 20 m à Abidjan, entrée côté sud, avec ventilation traversante. » "
           "Prenez ces propositions comme des <b>idées</b>, puis vérifiez toujours les tailles et la logique vous-même."),

    ("h1", "6. Module 5 — Le dimensionnement expliqué simplement", True),
    ("p", "« Dimensionner », c'est choisir la <b>taille</b> d'un élément (largeur, hauteur) et la <b>quantité de fer</b> "
          "qu'il faut mettre dedans. On commence par des <b>règles rapides</b> (pré-dimensionnement), puis le "
          "logiciel fait le calcul précis. Ces règles rapides vous permettent de repérer si le logiciel se trompe "
          "ou si vous avez mal saisi une donnée."),
    ("h2", "6.1 Les règles rapides (pré-dimensionnement)"),
    ("tableau", [
        ["Élément", "Règle simple", "Application à la villa"],
        ["Poutre", "Hauteur entre portée/15 et portée/10 ; largeur ≈ largeur du mur (20 cm)", "Portée 5,50 m → h = 37 à 55 cm → 20 × 50 cm (elle porte la dalle) ; portée 4,00 m sans dalle → 20 × 35 cm"],
        ["Dalle à corps creux", "Épaisseur ≥ portée des poutrelles / 22,5", "Poutrelles de 4,00 m → 17,8 cm → 16+4 = 20 cm OK"],
        ["Dalle pleine", "Épaisseur ≈ portée / 30 à portée / 40 (min. 12 cm)", "Balcon, palier d'escalier : 15 cm"],
        ["Poteau", "Minimum 20 × 20 cm en maison ; vérifier par le calcul", "Poteaux 20 × 20 cm (à vérifier ci-dessous)"],
        ["Semelle isolée", "Surface = charge au sol / contrainte du sol ; hauteur ≥ (A − a)/4 + 5 cm", "Calculée ci-dessous : 1,40 × 1,40 m, h = 35 cm"],
        ["Longrine", "Environ 20 × 30 cm à 20 × 40 cm", "Relie les semelles, porte les murs du RDC"],
    ], [0.18, 0.4, 0.42]),
    ("h2", "6.2 Exemple complet : le poteau central B2 (méthode BAEL 91 mod. 99)"),
    ("p", "<b>Étape 1 — La surface qu'il porte.</b> Le poteau B2 (x = 4 m, y = 5,50 m) porte la moitié des travées "
          "autour de lui : (4/2 + 4/2) × (5,50/2 + 4,50/2) = 4,00 × 5,00 = <b>20 m²</b> par niveau."),
    ("p", "<b>Étape 2 — Les poids.</b> Deux niveaux (plancher haut RDC + terrasse). G = 5,0 kN/m² × 20 m² × 2 = 200 kN, "
          "+ poids propre des poutres et du poteau ≈ 25 kN → <b>G = 225 kN</b>. Q = 1,5 kN/m² × 20 m² × 2 = <b>60 kN</b>."),
    ("p", "<b>Étape 3 — Le poids « gonflé » (ELU).</b> Nu = 1,35 × 225 + 1,5 × 60 = 303,75 + 90 = <b>393,75 kN ≈ 0,394 MN</b>."),
    ("p", "<b>Étape 4 — Ce que le poteau 20 × 20 peut porter.</b> Longueur de flambement Lf = 0,7 × 3,00 = 2,10 m. "
          "Élancement λ = 3,46 × Lf / a = 3,46 × 2,10 / 0,20 = 36,4. Coefficient α = 0,85 / (1 + 0,2 × (λ/35)²) = 0,699. "
          "Section réduite Br = (0,20 − 0,02)² = 0,0324 m². Avec 4 HA12 (A = 4,52 cm², FeE400) :"),
    ("code", "Nu,lim = α × [ Br × fc28 / (0,9 × γb) + A × fe / γs ]\n"
             "       = 0,699 × [ 0,0324 × 25 / 1,35 + 4,52e-4 × 400 / 1,15 ]\n"
             "       = 0,699 × [ 0,600 + 0,157 ] = 0,529 MN  >  Nu = 0,394 MN   →  OK"),
    ("p", "Le fer minimum BAEL = max(4 cm² par mètre de périmètre = 3,2 cm² ; 0,2 % de la section = 0,8 cm²) = 3,2 cm² : "
          "<b>4 HA12 (4,52 cm²)</b> conviennent. Cadres HA6 espacés de 15 cm (≤ 15 × diamètre des barres = 18 cm)."),
    ("h2", "6.3 Exemple complet : la semelle sous B2"),
    ("p", "Charge à l'ELS (non gonflée) : Ns = G + Q = 225 + 60 = 285 kN = 0,285 MN. Sol latéritique (hypothèse) : 0,15 MPa."),
    ("code", "Surface nécessaire = 0,285 / 0,15 = 1,90 m²  →  semelle 1,40 × 1,40 m (1,96 m²)\n"
             "Hauteur utile d ≥ (A − a) / 4 = (1,40 − 0,20) / 4 = 0,30 m  →  h = 0,35 m\n"
             "Acier (méthode des bielles) : As = Nu (A − a) / (8 d fsu)\n"
             "   = 0,394 × 1,20 / (8 × 0,30 × 348) = 5,66 cm² par sens  →  8 HA10 (6,28 cm²) dans chaque sens"),
    ("ci", "Sur latérite, descendez les semelles d'au moins 0,80 à 1,00 m sous le terrain naturel, sur un sol "
           "propre et compact (on enlève la terre végétale). Coulez 5 cm de béton de propreté (dosé à 150 kg/m³) "
           "avant de poser le ferraillage. Faites confirmer la contrainte du sol par une étude géotechnique."),
    ("h2", "6.4 Et l'Eurocode 2 ?"),
    ("p", "L'Eurocode 2 suit la même logique avec d'autres notations : béton C25/30 (fck = 25 MPa, fcd = fck/1,5 = 16,7 MPa), "
          "acier B500 (fyd = 500/1,15 = 435 MPa), combinaison ELU 1,35 G + 1,5 Q. Les logiciels Robot et CYPECAD "
          "permettent de choisir l'une ou l'autre norme : dans les livrets 4 et 5, nous comparerons les deux résultats."),

    ("h1", "7. Module 8 — L'intelligence artificielle dans la chaîne", True),
    ("tableau", [
        ["Étape", "Ce que l'IA peut faire pour vous", "Ce que VOUS devez toujours faire"],
        ["Esquisse", "Proposer des organisations de pièces, des idées de façade, des images d'ambiance", "Vérifier tailles, circulation, budget, règlement"],
        ["AutoCAD", "Écrire des petits programmes (scripts AutoLISP) qui automatisent des tâches répétitives ; expliquer une commande", "Tester le script sur une copie du fichier"],
        ["ArchiCAD", "Transformer une vue 3D brute en image réaliste (outil AI Visualizer des versions récentes)", "Garder la maquette comme seule référence"],
        ["Revit", "Générer et comparer des variantes (Dynamo, conception générative, Autodesk Forma)", "Choisir la variante avec votre jugement"],
        ["Robot / CYPECAD", "Expliquer un résultat, vérifier un ordre de grandeur, rédiger la note de calcul", "Contrôler avec les règles rapides du chapitre 6"],
    ], [0.15, 0.48, 0.37]),
    ("attention", "Une IA peut se tromper avec beaucoup d'assurance. Ne recopiez jamais un chiffre de calcul "
                  "donné par une IA sans le vérifier. La sécurité des personnes est en jeu."),

    ("h1", "8. Projet final et évaluation", True),
    ("p", "À la fin de la semaine 7, vous produirez un <b>dossier complet</b> de la villa R+1 :"),
    ("etapes", [
        "Plans 2D AutoCAD : RDC et étage cotés, au 1/100, en PDF avec cartouche à votre nom.",
        "Maquette ArchiCAD ou Revit : vues 3D, 2 façades, 1 coupe, nomenclature des portes et fenêtres.",
        "Modèle Robot ou CYPECAD : résultats des poteaux, poutres et semelles ; plan de ferraillage d'une poutre et d'une semelle.",
        "Comparaison : vos calculs à la main (chapitre 6) contre les résultats du logiciel, avec explication des écarts.",
        "Une page « IA » : ce que l'IA vous a fait gagner, et ce que vous avez dû corriger.",
    ]),
    ("tableau", [
        ["Critère", "Points"],
        ["Plans 2D propres, cotés, lisibles", "25"],
        ["Maquette 3D cohérente avec les plans", "20"],
        ["Modèle de calcul correct (charges, appuis, sections)", "25"],
        ["Contrôle à la main et explication des écarts", "20"],
        ["Présentation du dossier", "10"],
    ], [0.8, 0.2]),
    ("h2", "Matériel conseillé"),
    ("puces", [
        "Ordinateur Windows 10/11, 16 Go de mémoire vive (8 Go minimum), carte graphique correcte, une souris à molette (indispensable).",
        "Licences : Autodesk (AutoCAD, Revit, Robot) propose des <b>licences éducation gratuites</b> pour étudiants et formateurs ; "
        "Graphisoft (ArchiCAD) propose une version étudiante ; CYPE propose des licences étudiantes et une période d'essai. "
        "Vérifiez les conditions actuelles sur les sites officiels.",
        "Un cahier, une règle, un crayon : on dessine toujours à la main avant de dessiner à l'ordinateur.",
    ]),
    ("quiz", [
        ("Sur un plan au 1/100, un mur mesure 4,5 cm. Quelle est sa vraie longueur ?", "4,50 m"),
        ("Quel élément porte la dalle et transmet son poids aux poteaux ?", "La poutre"),
        ("Que veut dire « 1,35 G + 1,5 Q » ?", "Le poids gonflé pour la sécurité (combinaison ELU)"),
        ("Pourquoi faut-il des fenêtres sur deux façades opposées ?", "Pour la ventilation traversante (fraîcheur)"),
        ("Qui doit fournir la contrainte admissible du sol ?", "Une étude géotechnique (ex. : LBTP)"),
    ]),
]

