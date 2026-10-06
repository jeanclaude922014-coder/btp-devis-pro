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
