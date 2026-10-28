# DalotPro — calcul des dalots cadres en béton armé

Auteur : Moulo Jean Claude — module intégré à ChantierPilot (menu « DalotPro — Dalots »).

## Ce que fait le logiciel

| Étape | Contenu |
|---|---|
| Hydrologie et hydraulique | Kirpich, Montana (station de Man par défaut), méthode rationnelle, Manning-Strickler par cellule, revanche, Froude, vitesse et protections aval |
| Saisie | Géométrie (1 à 6 cellules, ouvertures différentes possibles), remblai et chaussée, matériaux, sol (bibliothèque de sols ivoiriens), convois, ouvrages de tête, talus. Données manquantes signalées en rouge, valeurs par défaut « à confirmer » en orange |
| Modèle | Portique fermé par bande de 1 m (méthode des déplacements), radier sur sol de Winkler ou à réaction linéaire |
| Charges | Poids propre, remblai, chaussée, poussées Kmax / Kmin (guide SETRA PICF), eau, surcharge de remblai |
| Convois | Fascicule 61 titre II : A(l), Bc, Bt, Br, Mc80, Mc120, Me80, Me120, D240, convoi personnalisé ; balayage pas à pas dans les deux sens, diffusion dans le remblai, largeur de répartition b' + 0,5·L, majoration dynamique δ |
| Combinaisons | ELU et ELS (BAEL / Fascicule 61) et combinaisons EN 1990 pour le contrôle Eurocode 2, toutes identifiées |
| Béton armé | BAEL 91 mod. 99 face par face (ELU, ELS, non-fragilité, effort tranchant, dispositions constructives) et contrôle EC2 (MRd, VRd,c, As,min, ouverture de fissures wk). Ferraillage imposable nappe par nappe |
| Géotechnique | Portance (Terzaghi / EC7), contact du radier (Fascicule 62 titre V), tassement, flottaison, stabilité du talus (Fellenius) |
| Ouvrages de tête | Mur de tête et murs en aile calculés (renversement, glissement avec bêche, tiers central, portance, flexion, tranchant) |
| Optimiser | Propose les épaisseurs minimales (grille de 5 cm, ≥ 20 cm) rendant le corps conforme |
| Livrables | Note de calcul Word (en-tête et auteur sur chaque page, sommaire, formules référencées, figures), dossier DXF de 5 planches A3, nomenclature CSV, métré, vue 3D, devis (DQE) dans un projet |
| Séries | Générateur de séries : un gabarit × 1 à 6 compartiments × plusieurs longueurs (7 ml, 8 ml…), tableau comparatif et export CSV |

Chaque vérification porte un statut **Conforme**, **Non conforme**, **Non vérifié** (donnée absente) ou **Non applicable** (raison écrite). Le statut global ne déclare jamais conforme ce qui n'a pas été démontré.

## Validation

`npm run verif:dalot` contrôle :

- le solveur contre un cas analytique (cadre carré : moment d'appui qL²/24, écart < 0,2 %) ;
- l'étude hydraulique contre les trois notes de calcul Bangolo – Bloléquin (dalots 2,00 × 2,00, 3,00 × 2,00 et 2 × 3,00 × 2,00) : Qp, tirant d'eau, vitesse et Froude retrouvés à l'identique ;
- le calcul complet des modèles et d'une série 2, 3, 4 cellules × 7 et 8 ml.

## Code

- `src/lib/dalot/` : moteur de calcul (TypeScript pur, exécuté dans le navigateur et côté serveur)
  - `fields.ts` données, modèles d'ouvrages et séries ; `frame.ts` portique ; `convoys.ts` convois ; `analysis.ts` cas, balayage, combinaisons ;
    `ba.ts` / `design.ts` béton armé ; `geotech.ts` ; `heads.ts` ; `hydro.ts` ; `quantities.ts` ; `drawings.ts` / `dxf.ts` / `svg.ts` plans ;
    `diagrams.ts` ; `note-docx.ts` note Word ; `engine.ts` enchaînement et optimiseur
- `src/app/(app)/dalots/` : pages (liste, séries, espace de travail par étude)
- `src/lib/actions/dalots.ts` : actions serveur (création, séries, enregistrement automatique, devis)

## Limites connues

- Biais de l'ouvrage non traité (dalots droits uniquement) ; contact radier-sol linéaire (bilatéral), vérifié a posteriori.
- Les terrassements du métré sont des estimations forfaitaires.
- Outil d'aide au calcul : les notes et plans doivent être vérifiés et visés par un ingénieur qualifié.

## Version autonome (sans compte ChantierPilot)

`npm run build:dalotpro` produit `standalone/dist/dalotpro.html`, une page unique qui embarque tout le logiciel
(calcul, 3D, note Word, DXF). Hébergée comme Artifact claude.ai, elle garde les études dans l'espace privé du compte
(ou, à défaut, dans le navigateur) et livre les fichiers par l'enregistreur de la plateforme ; le DXF y est livré dans un `.zip`.

## Version 2 — corrections, plans types et compléments

- **Corriger** : sur chaque vérification non conforme, DalotPro cherche la plus petite modification de donnée qui la rend
  conforme (épaisseur, classe de béton, semelle ou bêche des murs en aile, hauteur libre, nombre de cellules…) et affiche
  le statut global obtenu. « Corriger automatiquement » enchaîne ces corrections ; rien n'est appliqué sans validation.
- **Plans types** (modèle D07.1 / D07.2) : plan de coffrage (vue en plan, coupes A-A et B-B, vue de face, cotes en cm,
  épaisseurs cerclées, TN hachuré), plan de ferraillage (coupes repérées, mur en L, radier en plan, tableaux Aciers et
  Indications générales), nomenclature A4 par élément avec croquis de façonnage, totaux et récapitulatif par diamètre.
  Cartouche PROJET / ENTREPRISE – CONCEPTEUR / PK, TITRE, N°, ÉCH, DATE.
- Façonnage : barres transversales à crochets, piédroits en U à retours, équerres d'angle, chaises 3/m², épingles,
  guide-roues, radier de tête, mur en L, bêches.
- Convois Eurocodes LM1 (TS + UDL) et LM2 ; poussée au repos K0, active Ka ou encadrement Kmin/Kmax ; tassement
  œdométrique ; schémas cotés des convois (écran et note) ; diagrammes de moments et maquette DXF 3D dans la vue 3D.
- Contrôle sur le plan ENGC du dalot 2 × 3,00 × 3,00 : 3 664 kg d'acier pour le corps contre 3 689 kg sur la nomenclature.
