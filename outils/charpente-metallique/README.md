# Quantitatif, estimation et esquisses : bâtiments industriels en charpente métallique

Classeur Excel `Quantitatif_Charpente_Metallique.xlsx`, généré par `generer_classeur.py`.

- **Charpente** : Eurocode 3. **Charges et vent** : Eurocode 1 (pas de neige).
- **Béton armé et fondations** : BAEL 91 révisé 99 et Eurocode 2.
- **Contexte** : Côte d'Ivoire. Sol latéritique, climat tropical humide, ciment CPJ 42.5, montants en FCFA, TVA 18 %.

## Utilisation

1. **ACCUEIL** : choisir le gabarit dans la liste déroulante (cellule jaune). Les 7 gabarits sont 10×30, 15×20, 15×30, 20×20, 20×40, 30×40 et 40×40, plus une ligne PERSONNALISÉ.
2. **PARAMÈTRES** : ajuster les cellules jaunes (trames, ouvertures, façade, dallage, fondations, dosages, prix unitaires). Pour un gabarit PERSONNALISÉ, saisir la portée, la longueur, la hauteur et la pente dans le tableau des colonnes G à K. Les valeurs proposées par défaut sont celles du modèle de référence 40 × 48 m.
3. Lire les résultats dans ACCUEIL, QUANTITATIF_CHARPENTE, GROS_ŒUVRE, DQE_DEVIS, RÉCAP_GABARITS et PLANS.

Le classeur est **entièrement modifiable** (aucune protection). Saisir de préférence dans les cellules jaunes : les autres cellules contiennent les formules. Pour protéger les formules, régénérer le classeur avec l'option `--proteger`.

## Plans en PDF

Deux possibilités :

1. **Depuis Excel** : feuille PLANS > Fichier > Enregistrer sous > PDF. On obtient 7 planches A4 paysage.
2. **Avec `Generateur_Plans.html`**, qui s'ouvre dans n'importe quel navigateur (PC, tablette, téléphone) et fonctionne sans connexion ni installation.
   - Dans Excel (ACCUEIL), copier la cellule **CODE PLANS**, la coller dans le générateur et cliquer sur « Appliquer le code ». Les plans reprennent alors exactement le paramétrage du classeur : dimensions, profilés retenus, baies, façade, fondations, aciers.
   - On peut aussi saisir les paramètres directement dans le panneau de gauche.
   - Cliquer sur **« Enregistrer en PDF / Imprimer »** et choisir l'imprimante « Enregistrer au format PDF », en A4 paysage.
   - Les planches sont dessinées en vectoriel : traits nets à l'impression, hachures pour les translucides, le remblai et le sable.
   - En plus des 7 planches techniques, le générateur produit **3 planches de présentation** (10 planches au total) :
     - **8 – Vue d'ensemble** : bâtiment terminé en perspective (bardage ou agglos, couverture, translucides, portes, descentes EP), ossature métallique en perspective, élévations long-pan et pignon, plan de charpente de toiture avec repères de files.
     - **9 – Assemblage éclaté** : perspective éclatée de l'ossature avec étiquettes des éléments et profilés, et nomenclature des matériaux (repère, profil, nombre, longueur, poids indicatif).
     - **10 – Détails d'assemblage** : pied de poteau en perspective (platine, tiges d'ancrage, calage, fût, semelle ferraillée), assemblage de faîtage, jarret ou appui de ferme selon le système, attache de contreventement.
   - Ces planches de présentation n'existent que dans le HTML : les graphiques Excel ne permettent ni faces ombrées ni perspectives.
   - **Calcul intégré au HTML** : le portique est calculé directement dans le navigateur, hors connexion et sans installation (éléments finis 2D, combinaisons EC0, vérifications EC3, choix automatique des profilés).
     - Les résultats sont identiques au module Python, contrôlé sur 4 bâtiments, écart nul.
     - Les planches 11 et 12 présentent la note de calcul : modèle, moments ELU, déformée, vérifications des barres, ELS, réactions d'appui pour les fondations et poids des portiques.
     - **Assemblages EN 1993-1-8** (planche 13, note Word § 7, export d'images), calculés à partir des efforts du portique :
       1. **Jarret poteau-traverse** (platine d'about boulonnée HR) : résistance de chaque rangée par tronçons en T de la platine et de la semelle du poteau (modes 1 à 3), âme tendue, compression, cisaillement du panneau d'âme Vwp,Ed = M / z ; moment résistant Mj,Rd = Σ Fr·hr ; interaction M + N ; cisaillement des boulons ; épaisseurs de soudure.
       2. **Faîtage** (platines d'about) : même méthode.
       3. **Pied de poteau articulé** : compression de la platine sur le béton (fjd, aire efficace), soulèvement (tiges et flexion de la platine), cisaillement (frottement 0,2·N + tiges), traction + cisaillement des tiges, ancrage BAEL (≥ 20 Ø).
       4. **Attache de contreventement** : cisaillement des boulons, pression diamétrale, section nette de la cornière (β2), soudure du gousset.

       Les boulons, platines, tiges, béton et goussets se règlent dans la section « Assemblages EC3-1-8 ».
     - Le bouton **« Exporter les images (ZIP) »** fait dessiner toutes les planches (plans, perspectives, détails, note de calcul) et les enregistre en images PNG A4 paysage à 200 dpi (2339 × 1654 px), cartouche compris, réunies dans un fichier ZIP. Le bouton **« ⤓ Image PNG »** de chaque planche exporte celle-ci seule. Les images se partagent par WhatsApp ou par courriel, et s'insèrent dans un rapport Word ou une présentation.
     - Le bouton **« Note de calcul Word »** télécharge un vrai fichier .docx avec en-tête (champ « Établi par »), pied de page numéroté, diagrammes et tableaux.
     - Les plans reprennent automatiquement les profilés calculés, sauf profilé imposé dans le panneau.
     - Les paramètres de calcul (appuis, jarrets, charges, vent, acier, bracons) se règlent dans la section « Calcul EC3 du portique ». Le CODE PLANS d'Excel transmet aussi le vent, les charges et l'acier.
   - Le cartouche comporte : projet, lieu, date modifiable, mention « esquisse non contractuelle », « Bon pour accord / Date / Signature ».

## Structure du classeur

| Feuille | Contenu |
|---|---|
| ACCUEIL | Choix du gabarit, résumé (surface, tonnage, béton, aciers HA, coûts HT, TVA et TTC), contrôles en rouge |
| PARAMÈTRES | Toutes les saisies en jaune : gabarits, trames, ouvertures, couverture, façade, assemblages, gros œuvre, dallage, agglos, dosages, prix |
| BASE_PROFILÉS | IPE 160–600, HEA 140–400, UPN, cornières 40×4 à 100×10, pannes Z et C 120–250, tubes, ronds. Valeurs en kg/ml et hauteur h |
| BASE_ACIERS | HA6 à HA16 (et HA20, HA25), en kg/ml |
| PRÉDIMENSIONNEMENT | Règles selon la portée, profilés automatiques avec forçage en jaune, géométrie calculée, alertes |
| QUANTITATIF_CHARPENTE | Ossature, stabilité, couverture, bardage, assemblages et totaux. La règle de calcul figure dans une colonne et dans un commentaire sur la quantité |
| GROS_ŒUVRE | Terrassements, semelles isolées et filantes, maçonnerie de fondation, dallage, variante agglos, récapitulatif des matériaux |
| DQE_DEVIS | 5 lots, TOTAL HT, TVA = HT × 0,18, TOTAL TTC |
| RÉCAP_GABARITS | Comparatif des 7 gabarits et contrôle de cohérence avec le DQE |
| (paramètre « Nombre de nefs ») | 1 à 4 nefs identiques : poteaux de noue, chéneaux centraux, quantités et esquisses adaptées |
| RAPPORT_VÉRIFICATION | Rapport de vérification automatique du gabarit actif (EC3 / EC1 / BAEL), imprimable en PDF |
| PLANS | 7 planches A4 paysage avec cartouche (imprimables en PDF) |
| COORD_PLANS (masquée) | Coordonnées des esquisses, calculées par formules |
| CALC_GABARITS (masquée) | Moteur de calcul des 7 gabarits × 3 scénarios de façade (paramétrage, bardage, agglos) |

### Particularités techniques

- **Cohérence du comparatif.** Chaque calcul est décrit une seule fois dans le script (`moteur.py`). Il est écrit à la fois dans les feuilles visibles et dans le moteur CALC_GABARITS. RÉCAP_GABARITS vérifie automatiquement que le moteur et le DQE donnent le même total pour le gabarit actif.
- **RECHERCHEX** sert aux recherches dans les bases. Il est encapsulé dans `SIERREUR(…; INDEX/EQUIV)`, ce qui permet au fichier de fonctionner aussi dans les versions d'Excel qui n'ont pas RECHERCHEX.
- **Esquisses.** Ce sont des graphiques Nuage de points (XY) à lignes droites, sans macro.
  - Une échelle unique en X et en Y est recalculée pour chaque vue, ce qui évite toute déformation et met la zone de tracé à l'échelle automatiquement.
  - Les ruptures de traits utilisent `#N/A` avec l'option « afficher #N/A comme cellule vide ». Les `#N/A` de COORD_PLANS sont donc volontaires.
  - Les cotes et les repères sont des étiquettes de données reliées à des cellules texte calculées.
  - La planche 7 (mur agglos) affiche « SANS OBJET » en façade bardage.
- **Façade.** En « Agglos 15 creux », les lisses, le bardage, les liernes de lisses et les larmiers de bardage passent automatiquement à 0. En « Mixte », ils ne sont calculés qu'au-dessus du soubassement.
- **Valeurs en cache.** Après génération, le classeur est recalculé par LibreOffice et les résultats sont injectés dans le fichier : il s'affiche donc déjà calculé dans les visionneuses. Excel recalcule de toute façon à l'ouverture.
- Le fichier ne contient aucun nom d'auteur ni nom d'entreprise.

## Tableau de contrôle des 7 gabarits

Hypothèses : paramètres par défaut, à savoir :

- H = 6,00 m, pente 16 %, portiques tous les 6 m ;
- façade en bardage bac acier, galvanisation ;
- dallage de 20 cm en nappe simple HA10, maille de 20 cm ;
- remblai latérite de 20 cm ;
- prix unitaires par défaut.

| Gabarit | Système | Acier (t) | kg/m² | Béton (m³) | Aciers HA (kg) | Coût HT (FCFA) | HT / m² | Rapport : non conformes |
|---|---|---:|---:|---:|---:|---:|---:|---|
| 10 × 30 | Portique IPE + jarrets | 10,30 | 34,3 | 79,15 | 2 577 | 42 132 082 | 140 440 | aucune |
| 15 × 20 | Portique IPE + jarrets | 11,32 | 37,7 | 76,90 | 2 539 | 42 818 820 | 142 729 | aucune |
| 15 × 30 | Portique IPE + jarrets | 14,35 | 31,9 | 110,92 | 3 663 | 56 405 084 | 125 345 | aucune |
| 20 × 20 | Portique IPE + jarrets | 15,82 | 39,5 | 98,68 | 3 257 | 55 974 805 | 139 937 | aucune |
| 20 × 40 | Portique IPE + jarrets | 25,90 | 32,4 | 188,04 | 6 214 | 94 472 975 | 118 091 | F2 (soulèvement) |
| 30 × 40 | Portique IPE renforcé | 50,38 | 42,0 | 271,16 | 8 993 | 156 510 161 | 130 425 | F2 |
| 40 × 40 | Ferme treillis | 68,32 | 42,7 | 354,71 | 11 800 | 208 484 744 | 130 303 | F2, H4 (file centrale) |
| Réf. 40 × 48 (PERSONNALISÉ) | Ferme treillis | 75,85 | 39,5 | 422,19 | 14 011 | 236 519 785 | 123 187 | F2, H4 |

Résultat des contrôles :

- **Erreurs de formule** : aucune pour les 10 configurations testées, hors `#N/A` volontaires de COORD_PLANS. Les configurations testées sont les 7 gabarits, la référence 40 × 48, le 40 × 40 en agglos, et le 20 × 40 en façade mixte avec un dallage de 15 cm en nappe double.
- **Ratios acier** : tous dans la fourchette 18–45 kg/m² ; le 40 × 40 est proche du haut (42,7 kg/m²), car les diagonales du treillis sont en cornières accolées.
- **Cohérence moteur / DQE** : écart nul pour chaque gabarit et pour chaque scénario de façade.
- **Esquisses** : vérifiées lisibles de 10 × 30 à 40 × 40, en bardage, en agglos et en mixte.
- **Rapport de vérification** : toutes les vérifications de barres sont conformes avec les profilés automatiques. La seule non-conformité récurrente est le soulèvement au vent des semelles de 120 × 120 dès 20 m de portée ; le rapport donne le côté de semelle à adopter (par exemple 175 × 175 pour le 40 × 40).

## Rapport de vérification (feuille RAPPORT_VÉRIFICATION)

Le rapport vérifie automatiquement le gabarit actif et se met à jour à chaque changement de paramètre. Il est imprimable en PDF (environ 4 pages A4 paysage). Un exemple est fourni : `Rapport_verification_exemple_20x40.pdf`.

1. **Identification** : projet, lieu, « Établi par » (cellules jaunes), date, description de l'ouvrage.
2. **Hypothèses et grandeurs de calcul** :
   - vent EC1 : qb, qp et pressions nettes ;
   - charges ;
   - réactions d'appui ;
   - élancements.

   Les valeurs d'entrée (vitesse du vent, coefficients, fy, σ admissible du sol, flèches limites…) se règlent dans PARAMÈTRES, section 10.
3. **Vérifications**, chacune avec sa formule, la sollicitation Ed, la résistance Rd, le taux de travail, un statut coloré (OK, NON CONFORME, À VÉRIFIER, SANS OBJET) et une recommandation :
   - A. Tôles et pannes : portée, flexion descendante et au soulèvement, flèche.
   - B. Lisses : flexion et flèche sous vent.
   - C. Portique IPE : poteau en flexion composée avec flambement ; traverse en about de jarret, à mi-portée et en flèche. Ferme treillis : membrures, diagonales d'about et courantes, montants, poteaux, flèche.
   - D. Poteaux de pignon : flexion et flèche sous vent.
   - E. Croix de Saint-André et poutre au vent.
   - F. Semelles :
     - contrainte sur la latérite ;
     - soulèvement, avec le calcul du côté de semelle nécessaire ;
     - aciers par la méthode des bielles (BAEL) ;
     - hauteur utile ;
     - semelle filante.
   - G. Dallage (épaisseur, sections d'acier) et chaînages.
   - H. Contrôles généraux : ratio acier, pente, épaisseur des tôles, file centrale, dallage, profilés introuvables, cohérence moteur / DQE.
4. **Synthèse et conclusion** automatiques, avec cadres « Établi par », « Vérifié par » et « Visa ».

> Il s'agit de vérifications simplifiées de prédimensionnement (EC3 / EC1 / EC0, BAEL 91 mod. 99). La vitesse de vent de 25 m/s et la contrainte admissible de 0,20 MPa sont des valeurs par défaut à confirmer (données météo locales, étude géotechnique). Elles ne remplacent pas la note de calcul d'exécution.

## Module de conception : du croquis à la note de calcul

Chaîne de travail sur le principe « l'outil automatise, l'ingénieur vérifie et valide ». Chaque étape produit un livrable contrôlable, et l'étape suivante ne démarre qu'après visa.

| Étape | Outil | Livrable | Point de contrôle |
|---|---|---|---|
| 1. Lecture du croquis | Claude (lecture de la photo) | fiche projet JSON avec la confiance de chaque valeur lue | – |
| 2. Contre-lecture | `valider_fiche.py` | rapport `.md` et `.docx` : contrôles, points d'arrêt, profilés du croquis comparés au calcul | **visa des points ☐** |
| 3. Calcul et note | `calculer_portique.py` | note de calcul Word (en-tête Moulo Jean Claude) | relecture de la note |
| 4. Plans CAO | `calculer_portique.py --dxf` | 5 planches DXF A3 (AutoCAD R2010) | contrôle des plans |
| 5. Métré et devis | `fiche_vers_classeur.py` | classeur Excel pré-rempli (gabarit PERSONNALISÉ) | relecture du DQE |
| 6. Plans de présentation | CODE PLANS → `Generateur_Plans.html` | 10 planches PDF | Bon pour accord |

### La fiche projet (`conception/projet.py`)

Source unique, en JSON. Elle contient :

- une ou plusieurs nefs, de portées et pentes indépendantes, avec éventuellement un poteau de faîtage ;
- la hauteur, la longueur, l'entraxe, les jarrets et les appuis ;
- les charges G, Q et le vent EC1 ;
- l'acier, les critères de flèche et les maintiens latéraux (bracons) ;
- les profilés, imposés ou « auto ».

Elle se crée depuis un croquis, depuis le CODE PLANS du classeur (`--code`), ou à la main (voir `exemples/`).

### Calcul du portique (`conception/portique.py`, `conception/ec3.py`)

- **Méthode** : éléments finis 2D, méthode des déplacements. Le calcul est validé sur la formule de Kleinlogel (écart inférieur à 0,1 %).
- **Modèle** : jarrets modélisés par un tronçon à inertie majorée ; pieds de poteaux articulés ou encastrés ; multi-nefs avec poteaux de noue.
- **Cas de charges** : G (poids propre, couverture, pannes), Q (toiture, catégorie H) et 4 cas de vent EC1 (gauche ou droite, surpression ou dépression intérieure).
- **Combinaisons EC0** : ELU 1,35G + 1,5Q, 1,35G + 1,5W et 1,0G + 1,5W ; ELS G + Q et G + W.
- **Vérifications EC3** :
  - résistance de section M + N (6.2.9.1) et cisaillement ;
  - flambement y et z, déversement (méthode générale, Mcr) ;
  - interaction 6.61 / 6.62 (annexe B) ;
  - flèche des traverses L/200 et déplacement en tête H/150.
- **Choix automatique** : les profilés les plus légers satisfaisant toutes les vérifications (IPE pour les traverses, IPE ou HEA pour les poteaux).

### Commandes

```bash
cd outils/charpente-metallique
python3 valider_fiche.py exemples/croquis_2nefs.json                    # contre-lecture + visa
python3 calculer_portique.py exemples/croquis_2nefs.json \
        -o Note_croquis.docx --dxf Plans_croquis.dxf                    # note Word + plans DXF
python3 calculer_portique.py --code "PLAN1;gab=20 × 40;B=20.0000;..."   # depuis le CODE PLANS d'Excel
python3 fiche_vers_classeur.py exemples/croquis_2nefs.json -o Classeur_croquis.xlsx
```

Le module nécessite Python 3, openpyxl, numpy, python-docx, matplotlib et ezdxf.

### Exemple réel : le croquis à 2 nefs

La fiche `exemples/croquis_2nefs.json` est issue de la lecture d'un croquis iPad :

- 2 nefs de 15,9 et 15,2 m ;
- hauteur 6,25 m à l'égout et 8,8 m au faîtage ;
- 15 travées de 5 m ;
- jarrets de 1,5 m × 660 mm.

La contre-lecture retrouve les hauteurs au faîtage à 0 cm près et soumet 6 points au visa, dont 2 cotes non identifiées. Les profilés du croquis (IPE 400, IPE 450, IPE 300) sont vérifiés avec des taux de 0,07 à 0,43. Le calcul propose des sections plus légères (IPE 400, HEA 160, IPE 220), sous vent ivoirien et sans neige.

Livrables d'exemple dans `exemples/` : notes de calcul Word, plans DXF, rapports de contre-lecture.

> Limites : vent EC1 simplifié (coefficients de pression moyens) ; assemblages, bracons et fondations à justifier séparément (rapport de vérification du classeur pour les fondations) ; pas de liaison directe avec AutoCAD, Robot ou IDEA StatiCa. Le DXF s'ouvre dans AutoCAD, et un export vers Robot pourra être étudié.

## De l'esquisse au plan 2D, à la maquette 3D et au BIM (dans `Generateur_Plans.html`)

Tout se fait dans le navigateur, sans connexion :

1. **Mode croquis.** Dessiner la coupe à main levée, à la souris ou au doigt : poteaux, puis versants. Le bouton *Reconnaître* identifie :
   - les poteaux de rive et de noue ;
   - les faîtages et les poteaux de faîtage ;
   - la portée et la pente de chaque nef.

   Saisir ensuite la largeur totale et les hauteurs, puis cliquer sur *Appliquer* : la fiche du formulaire est remplie (nefs, portées, pentes, H), et les planches 2D et le calcul EC3 se régénèrent.
2. **Maquette 3D navigable.** Le modèle contient :
   - les portiques, pannes, lisses et contreventements ;
   - les semelles et fûts ;
   - la couverture, le bardage et la maçonnerie.

   Navigation : orbite à la souris, zoom à la molette, pincement au doigt. Les barres sont colorées selon le taux de travail EC3, et le cadrage est automatique.
3. **Exports 3D.**
   - *Image* : PNG.
   - *OBJ* : SketchUp, Blender.
   - *DXF 3D* : faces 3DFACE pour AutoCAD.
   - *IFC* : maquette BIM IFC2X3, ouvrable dans Revit, ArchiCAD, Tekla, BIMvision ou BlenderBIM.

Contenu du fichier IFC :
- **Hiérarchie spatiale :** projet, site, bâtiment, rez-de-chaussée.
- **Charpente :**
  - IfcColumn pour les poteaux, IfcBeam pour les traverses et sablières, IfcMember pour les pannes, lisses et contreventements ;
  - chaque barre est une extrusion de son vrai profil (IfcIShapeProfileDef pour IPE et HEA, rond ou plat).
- **Fondations :** IfcFooting (semelles et fûts en béton armé).
- **Enveloppe :** IfcCovering ROOFING pour la couverture, CLADDING pour le bardage et la maçonnerie.
- **Matériaux :** acier S235/S275/S355, béton C25 et tôle.
- **Propriétés :** chaque barre porte le jeu `Pset_CharpenteMetallique`, avec le profil et le taux de travail EC3.

Contrôle : le fichier du gabarit 20 × 40 m a été relu avec ifcopenshell, et les 202 éléments sont géométriquement valides.

## Ferraillage des semelles isolées (BAEL 91 mod. 99 / EC2)

Les semelles isolées sont calculées dans les deux outils, avec les mêmes formules.

**Dans `Generateur_Plans.html`** (section « Ferraillage des semelles » du formulaire) :
- **Planche 14 :** pour chaque type de semelle, vue en plan et coupe A-A. On y voit la nappe inférieure, la nappe supérieure en cas de soulèvement, le fût (barres longitudinales et cadres), les crochets et les repères ① à ⑥. La planche contient aussi la nomenclature des aciers (nombre, longueur, façonnage, poids) et le ratio en kg/m³.
- **Planche 15 :** note de calcul des fondations.
- **Note Word :** § 8 « Fondations », avec le plan de ferraillage et la nomenclature.
- **Types de semelles :**
  - S1 : poteaux de rive ;
  - S2 : poteaux intérieurs (noues, file centrale) ;
  - S3 : poteaux de pignon.
- **Efforts :**
  - S1 et S2 : réactions du calcul aux éléments finis du portique ;
  - pour le sol, on retient le couple N / M de la même combinaison qui donne la plus forte contrainte ;
  - S3 : surface reprise par chaque poteau de pignon.
- **Modes de ferraillage :**
  - *Calculé* : plus petit Ø (HA10 à HA20) donnant un espacement ≥ 10 cm, et barres de fût proposées ;
  - *Imposé* : quadrillage et fût saisis dans le formulaire.

**Vérifications :**

| N° | Vérification | Référence |
|---|---|---|
| 1-2 | Contrainte sur le sol σ3/4 ≤ σ adm (ELS) et ≤ 1,5 σ adm (ELU) | Fascicule 62 titre V |
| 3 | Rigidité (a − b) / 4 ≤ d | méthode des bielles |
| 4 | As = kf Nu' (a − b) / (8 d fsu) ≥ ρmin a d. Majoration kf de 1,10 ou 1,50 selon la fissuration | BAEL A.6.1 ; EC2 9.2.1.1 |
| 5 | Nappe supérieure en cas de soulèvement | – |
| 6 | Espacement ≤ 25 cm | – |
| 7 | Poinçonnement au contour situé à d | EC2 6.4.4 |
| 8 | Soulèvement Nt ≤ 0,9 P (sinon, côté de semelle nécessaire) | EC0, EQU |
| 9 | Glissement H ≤ (N + P) tan φ / 1,2 + butée / 2 | – |
| 10 | Renversement | – |
| 11 | Fût : As ≥ max(0,2 % B ; 4 cm²/m) | BAEL A.8.1.21 |
| 12 | Fût : espacement des cadres | BAEL A.8.1.3 |
| – | Ancrage ls ≤ a/4, sinon crochets | BAEL A.6.1.23 |

Le sol latéritique est pris par défaut avec σ adm = 0,20 MPa et φ = 30°. **Ces valeurs sont à confirmer par une étude géotechnique.**

**Dans le classeur Excel**, la feuille `FERRAILLAGE_SEMELLES` refait tout le calcul en formules visibles, une colonne par type de semelle :
- géométrie ;
- efforts ;
- poids propre ;
- contraintes ;
- tableau de choix du diamètre ;
- nappe supérieure ;
- poinçonnement ;
- glissement ;
- fût ;
- 13 vérifications avec taux et statut ;
- nomenclature.

Elle compare aussi le ferraillage prévu dans PARAMÈTRES (`ha_sem`, `m_sem`) à la section requise. Par défaut, les efforts sont estimés. Pour une **vérification croisée**, il suffit de reporter dans les cellules jaunes les efforts de la planche 15 du générateur HTML.

Contrôle effectué sur 3 configurations, soit 168 grandeurs comparées. Les configurations testées sont :
- le gabarit 20 × 40 ;
- 2 nefs, pieds encastrés, FeE400, C30, fissuration très préjudiciable ;
- 30 × 40 avec 2 nefs et une file centrale.

L'écart relatif maximal entre le HTML et Excel recalculé par LibreOffice est de 4·10⁻¹⁵ : les résultats sont identiques.

## Régénérer le classeur

```bash
cd outils/charpente-metallique
python3 generer_classeur.py Quantitatif_Charpente_Metallique.xlsx
```

Le script nécessite Python 3 et openpyxl. LibreOffice (`soffice`) est facultatif et sert à injecter les valeurs calculées.

Options :

- `--gabarit "40 × 40"` : gabarit sélectionné à l'ouverture ;
- `--sans-recalcul` : ne pas injecter les valeurs calculées ;
- `--param nom=valeur` : surcharge d'un paramètre, pour les tests.

> Estimation de prédimensionnement : les sections et quantités doivent être confirmées par une note de calcul (EC3 / EC1 / BAEL 91 mod. 99) avant exécution.
