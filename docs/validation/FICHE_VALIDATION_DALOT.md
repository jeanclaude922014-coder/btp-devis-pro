# FICHE DE VALIDATION — Dalot Pro CI (outil autonome)
Projet : btp-devis-pro — outil hors ligne `outils/Dalot_Pro_CI.html`
Module : dimensionnement d'un dalot cadre fermé en béton armé
Version du logiciel : 0.1.0 — Version du moteur : 0.1.0 (`outils/dalot/moteur-dalot.cjs`) — Plans : `outils/dalot/plans-dalot.cjs`
Responsable : Moulo Jean Claude — Date : 2026-11-11
Norme / méthode : BAEL 91 rév. 99 ou EN 1992-1-1 ; Fascicule 61 titre II ou EN 1991-2 (LM1) ; Manning-Strickler
Domaine couvert : dalot droit de 1 à 6 cellules identiques, coulé en place, bande de 1 m

## Hypothèses et limites
- Géométrie : cadre fermé aux axes des parois, épaisseurs constantes, goussets hors modèle (dessin et métré seulement).
- Matériaux : béton élastique linéaire (Ei BAEL ou Ecm EC2), acier HA Fe E400 ou E500.
- Appuis : ressorts verticaux de Winkler sous le radier, blocage horizontal au milieu du radier. Pas d'itération en cas de décollement (alerte seulement).
- Charges : poids propre, remblai, poussée K0 / Ka, surcharge sur remblai, eau intérieure, A(l), Bc, Bt, Br, Mc120 ou LM1.
- Combinaisons : enveloppe du produit cartésien (permanentes défavorables ou favorables, chaque variable présente ou absente). Coefficients modifiables.
- Hypothèses : flexion simple (effort normal de compression négligé, côté sécurité) ; route perpendiculaire à l'ouvrage.
- Cas non couverts : biais, murs en aile, nappe et flottabilité, tassements, séisme, phases de chantier, préfabrication, fatigue.

## Sources documentaires
| Référence | Auteur/organisme | Année/version | Langue | Lien/fichier | Fiabilité | Hypothèses du cas |
|---|---|---|---|---|---|---|
| Règles BAEL 91 révisées 99 | DTU P 18-702 | 1999 | fr | non déposé dans `REFERENTIEL_GC/` | Texte réglementaire | Formules ELU / ELS, A.4.2.1, A.4.5.3, A.5.2.2 citées de mémoire d'usage : **à confronter au texte** |
| Fascicule 61 titre II du CPC | Ministère de l'Équipement | 1971 | fr | non déposé | Texte réglementaire | A(l), Bc, Bt, Br, Mc120, δ, bc, bt, a1, a2 : **à confronter au texte** |
| EN 1992-1-1, EN 1991-2, EN 1990 annexe A2 | CEN | 2004-2005 | fr/en | fiche GC-0001 | Norme | § 6.2.2, § 7.3.4, LM1, valeurs recommandées (pas d'annexe nationale ivoirienne) |
| StruBIM Box Culverts - User's manual | CYPE Ingenieros | non indiquée | en | fiche GC-0025 | Documentation logicielle | Modèle, charges, champs de saisie, règle d'épaisseurs ; aucun exemple chiffré |
| Résistance des matériaux, méthode des déplacements | cours classiques | — | fr | — | Analytique | Poutre bi-encastrée, cadre fermé symétrique |

Aucun document du référentiel ne contient à ce jour d'exemple chiffré de dalot. Les textes BAEL et Fascicule 61 ne sont pas déposés : voir demandes ci-dessous.

## Comparaison des résultats (11 tests automatiques `outils/dalot/moteur-dalot.test.mjs`)
| Cas | Grandeur | Référence analytique / manuelle | Notre logiciel | Tolérance | Statut |
|---|---|---:|---:|---:|---|
| Poutre bi-encastrée L = 4 m, q = 10 kN/m | M appui ; M travée | −13,333 ; +6,667 kN.m | identique | 0,001 | `VÉRIFIÉ – CONTRÔLE MANUEL` |
| Cadre fermé 3 × 2 m, e = 30 / 20 cm, q = 50 kN/m haut et bas | M angle = qL²/12 / (1 + (Is/L)/(Iw/H)) | 11,538 kN.m | écart < 0,2 % | 0,2 % | `VÉRIFIÉ – CONTRÔLE MANUEL` |
| Dalot par défaut, charges permanentes | Σ réactions du sol = poids total | égalité | écart < 0,01 % | 0,01 % | `VÉRIFIÉ – CONTRÔLE MANUEL` |
| Flexion ELU BAEL, Mu = 100 kN.m, d = 0,25 m, fc28 = 25, Fe E500 | µ ; α ; As | 0,1129 ; 0,1501 ; 9,79 cm² | identique | 0,01 cm² | `VÉRIFIÉ – CONTRÔLE MANUEL` |
| ELS section fissurée, M = 60 kN.m, As = 10 cm², d = 0,25 m, n = 15 | x ; σbc ; σs | 7,29 cm ; 7,29 MPa ; 265,8 MPa | identique | 0,2 MPa | `VÉRIFIÉ – CONTRÔLE MANUEL` |
| Ancrage droit BAEL A.6.1.23, HA12 Fe E500, fc28 = 25 MPa | ls | 12 × 500 / (4 × 0,6 × 2,25 × 2,1) = 529 mm | identique | 0,1 mm | `VÉRIFIÉ – CONTRÔLE MANUEL` |
| Ancrage EC2 § 8.4.3, HA12 B500, fck = 25 MPa | lb,rqd | 3 × 434,8 / 2,693 = 484 mm | identique | 0,5 mm | `VÉRIFIÉ – CONTRÔLE MANUEL` |
| Nomenclature des aciers | masse | Σ n × L × 0,006165 Ø² | identique | 1e-6 kg | `VÉRIFIÉ – CONTRÔLE MANUEL` |
| Règle d'épaisseurs de l'assistant CYPE, L = 2 m, G = 1,5 m | dalle ; piédroit | 0,18 m ; 0,145 m (manuel § 3.2) | identique | exact | `VÉRIFIÉ – RÉFÉRENCES DOCUMENTAIRES` |
| A(10 m) ; δ(L = 10, G = 1000, S = 500) ; K0(30°) ; Strickler | formules fermées | 18,66 kPa ; 1,20 ; 0,50 ; 5,97 m³/s | identique | arrondi | `VÉRIFIÉ – CONTRÔLE MANUEL` |

## Contrôle manuel
- Formules et étapes : reprises dans l'onglet « Comprendre le calcul » de l'outil.
- Vérification des unités : kN, m, kPa en interne ; MPa pour les matériaux ; conversions testées par les cas ci-dessus.
- Relecture humaine : **non faite**. Les contrôles ont été produits par l'IA développeuse. Ils ne sont pas indépendants pour les formules réglementaires (même lecture des textes).
- Réserves : voir tableau.

## Benchmark logiciel tiers
### Comparaison partielle avec la vidéo « Étude complète d'un pont-cadre (dalot) avec CYPE » (2026-11-19)
Vidéo fournie par Moulo Jean Claude : CYPE Ponts-cadres PICF 2017, 11 min 41 s. Données relevées image par image :
gabarit 4,50 m ; 2 cellules de 4,00 et 3,80 m (cloison 20 cm) ; dalle et radier 60 cm ; piédroits 50 cm ; longueur du module 6,00 m ;
chaussée à 6,00 m au-dessus du radier (remblai 0,30 m) ; B25, Fe E500, fissuration préjudiciable ; enrobages 3,5 cm ; granulat 25 mm ;
module de réaction 50 000 kN/m³, contrainte admissible 300 kN/m² ; remblai 19 kN/m³, φ = 33°, angle de transmission 45° ;
convoi Bt du Fascicule 61 (roues de 78,5 kN), charges en bande de 9,81 kN/m², surcharge sur radier 4 kN/m² ; vérifications CYPE citant le BAEL 91.
Saisie équivalente : bouton « Charger l'exemple de la vidéo CYPE » (cellules ramenées à 2 × 3,90 m ; charges en bande prises comme surcharge uniforme en surface).

| Nappe | CYPE (vidéo) | Dalot Pro CI | Écart de section |
|---|---|---|---:|
| Dalle, nappe supérieure | HA12 e=15 (7,54 cm²) | HA10 e=12,5 (6,28 cm²) | −17 % |
| Dalle, nappe inférieure | HA12 e=15 (7,54 cm²) | HA14 e=25 (6,16 cm²) | −18 % |
| Radier, nappe supérieure | HA12 e=15 (7,54 cm²) | HA14 e=25 (6,16 cm²) | −18 % |
| Radier, nappe inférieure | HA12 e=15 (7,54 cm²) | HA16 e=20 (10,05 cm²) | +33 % |
| Piédroits, côté terre | HA12 e=15 (7,54 cm²) | HA14 e=12,5 (12,32 cm²) | +63 % |
| Piédroits, côté eau | HA12 e=20 (5,65 cm²) | HA12 e=25 (4,52 cm²) | −20 % |
| Cloison | HA10 e=25 (3,14 cm²) | HA10 e=25 (3,14 cm²) | 0 % |

Statut : `ACCEPTÉ AVEC RÉSERVE` — comparaison partielle, ne valide pas le moteur. Les hypothèses ne sont pas identiques (coques 3D contre portique plan, cellules inégales, positions des charges). La vidéo n'affiche ni moments ni combinaisons ; les étiquettes de ferraillage sont lues à basse résolution et leur attribution à chaque face reste à confirmer.

### Dossier de reproduction proposé
Non réalisé. Dossier de reproduction proposé (CYPE « Dalots », Robot ou SCIA) :
dalot 2 × 2,00 × 1,50 m, épaisseurs 25 cm, remblai 0,60 m (20 kN/m³, φ = 30°, K0), chaussée 5 cm, k = 40 000 kN/m³, fc28 = 25 MPa, Fe E500, enrobage 4 cm, fissuration préjudiciable, pont de 1re classe 2 voies, A(l) + Bc + Bt + Br + Mc120.
Sorties attendues : moments enveloppes ELU et ELS par paroi, effort tranchant, pression sur le sol, sections d'acier. Résultats de l'outil pour ce cas : M ELU dalle +44,2 / −53,9 ; radier +43,1 / −74,2 ; piédroits −39,6 kN.m/m ; sol 156 kPa à l'ELS. Tolérance proposée : 10 % sur les moments (modèle barres contre plaques), à justifier après comparaison.

## Niveau de preuve
- [x] Contrôle de cohérence élémentaire
- [x] Contrôle manuel documenté
- [ ] Références documentaires concordantes
- [~] Comparaison à un outil indépendant (partielle : vidéo CYPE, écarts non expliqués)
- [ ] Revue humaine compétente
- [x] Domaine de validité clairement défini

## Réserves et actions
| Réserve | Criticité | Impact | Action | Responsable | Échéance |
|---|---|---|---|---|---|
| Comparaison avec l'exemple de la vidéo CYPE : écarts de −20 % à +63 % sur les sections d'acier (voir § Benchmark), causes non démontrées | P1 | Modèle global non recoupé | Obtenir de CYPE les moments enveloppes et les combinaisons du même cas, ou reproduire le cas dans Robot | Moulo Jean Claude | — |
| Plans générés : façonnage simplifié, murs en aile et joints non dessinés | P2 | Plans à compléter par le projeteur | Relecture humaine de chaque dossier | Utilisateur | par projet |
| Formules BAEL, Fascicule 61 et EC non confrontées aux textes officiels | **P0** | Risque de coefficient erroné | Déposer les textes dans `REFERENTIEL_GC/06_NORMES_ET_REGLEMENTS/` et relire | Moulo Jean Claude | avant tout usage en exécution |
| Pas de benchmark sur dalot complet | P1 | Modèle global non recoupé | Reproduire le dossier ci-dessus dans CYPE ou Robot | Équipe | — |
| Répartition transversale des roues sous faible remblai | P1 | Sur-dimensionnement possible | Comparer à un calcul plaque | Équipe | — |
| Coefficients de l'eau intérieure, valeurs de sol indicatives | P2 | Valeurs par défaut discutables | Faire confirmer par le projeteur | Utilisateur | par projet |

## Conclusion
Statut : `VÉRIFIÉ – CONTRÔLE MANUEL` sur les briques listées ; `ACCEPTÉ AVEC RÉSERVE` pour l'ensemble ; **non validé pour un usage professionnel sans visa d'ingénieur**.
Maturité interne : niveau 2 « contrôlé manuellement ».
Mention affichée dans le logiciel : « Niveau de vérification : contrôle manuel effectué sur les cas documentés ; comparaison à un logiciel indépendant non encore réalisée. Les résultats doivent être visés par un ingénieur avant exécution. »
