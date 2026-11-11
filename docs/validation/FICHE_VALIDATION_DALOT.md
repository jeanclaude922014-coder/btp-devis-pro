# FICHE DE VALIDATION — Dalot Pro CI (outil autonome)
Projet : btp-devis-pro — outil hors ligne `outils/Dalot_Pro_CI.html`
Module : dimensionnement d'un dalot cadre fermé en béton armé
Version du logiciel : 0.1.0 — Version du moteur : 0.1.0 (`outils/dalot/moteur-dalot.cjs`)
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

## Comparaison des résultats (tests automatiques `outils/dalot/moteur-dalot.test.mjs`)
| Cas | Grandeur | Référence analytique / manuelle | Notre logiciel | Tolérance | Statut |
|---|---|---:|---:|---:|---|
| Poutre bi-encastrée L = 4 m, q = 10 kN/m | M appui ; M travée | −13,333 ; +6,667 kN.m | identique | 0,001 | `VÉRIFIÉ – CONTRÔLE MANUEL` |
| Cadre fermé 3 × 2 m, e = 30 / 20 cm, q = 50 kN/m haut et bas | M angle = qL²/12 / (1 + (Is/L)/(Iw/H)) | 11,538 kN.m | écart < 0,2 % | 0,2 % | `VÉRIFIÉ – CONTRÔLE MANUEL` |
| Dalot par défaut, charges permanentes | Σ réactions du sol = poids total | égalité | écart < 0,01 % | 0,01 % | `VÉRIFIÉ – CONTRÔLE MANUEL` |
| Flexion ELU BAEL, Mu = 100 kN.m, d = 0,25 m, fc28 = 25, Fe E500 | µ ; α ; As | 0,1129 ; 0,1501 ; 9,79 cm² | identique | 0,01 cm² | `VÉRIFIÉ – CONTRÔLE MANUEL` |
| ELS section fissurée, M = 60 kN.m, As = 10 cm², d = 0,25 m, n = 15 | x ; σbc ; σs | 7,29 cm ; 7,29 MPa ; 265,8 MPa | identique | 0,2 MPa | `VÉRIFIÉ – CONTRÔLE MANUEL` |
| Règle d'épaisseurs de l'assistant CYPE, L = 2 m, G = 1,5 m | dalle ; piédroit | 0,18 m ; 0,145 m (manuel § 3.2) | identique | exact | `VÉRIFIÉ – RÉFÉRENCES DOCUMENTAIRES` |
| A(10 m) ; δ(L = 10, G = 1000, S = 500) ; K0(30°) ; Strickler | formules fermées | 18,66 kPa ; 1,20 ; 0,50 ; 5,97 m³/s | identique | arrondi | `VÉRIFIÉ – CONTRÔLE MANUEL` |

## Contrôle manuel
- Formules et étapes : reprises dans l'onglet « Comprendre le calcul » de l'outil.
- Vérification des unités : kN, m, kPa en interne ; MPa pour les matériaux ; conversions testées par les cas ci-dessus.
- Relecture humaine : **non faite**. Les contrôles ont été produits par l'IA développeuse. Ils ne sont pas indépendants pour les formules réglementaires (même lecture des textes).
- Réserves : voir tableau.

## Benchmark logiciel tiers
Non réalisé. Dossier de reproduction proposé (CYPE « Dalots », Robot ou SCIA) :
dalot 2 × 2,00 × 1,50 m, épaisseurs 25 cm, remblai 0,60 m (20 kN/m³, φ = 30°, K0), chaussée 5 cm, k = 40 000 kN/m³, fc28 = 25 MPa, Fe E500, enrobage 4 cm, fissuration préjudiciable, pont de 1re classe 2 voies, A(l) + Bc + Bt + Br + Mc120.
Sorties attendues : moments enveloppes ELU et ELS par paroi, effort tranchant, pression sur le sol, sections d'acier. Résultats de l'outil pour ce cas : M ELU dalle +44,2 / −53,9 ; radier +43,1 / −74,2 ; piédroits −39,6 kN.m/m ; sol 156 kPa à l'ELS. Tolérance proposée : 10 % sur les moments (modèle barres contre plaques), à justifier après comparaison.

## Niveau de preuve
- [x] Contrôle de cohérence élémentaire
- [x] Contrôle manuel documenté
- [ ] Références documentaires concordantes
- [ ] Comparaison à un outil indépendant
- [ ] Revue humaine compétente
- [x] Domaine de validité clairement défini

## Réserves et actions
| Réserve | Criticité | Impact | Action | Responsable | Échéance |
|---|---|---|---|---|---|
| Vidéo de référence (YouTube `tSDFMF90D8w`) non lue : YouTube est refusé par le réseau de l'environnement. Étapes et champs alignés le 2026-11-11 sur le manuel officiel CYPE « StruBIM Box Culverts » (fiche GC-0025), pas sur la vidéo | P1 | Écarts possibles de valeurs par rapport à la vidéo | Fournir des captures d'écran de la vidéo ou les valeurs saisies | Moulo Jean Claude | à réception |
| Formules BAEL, Fascicule 61 et EC non confrontées aux textes officiels | **P0** | Risque de coefficient erroné | Déposer les textes dans `REFERENTIEL_GC/06_NORMES_ET_REGLEMENTS/` et relire | Moulo Jean Claude | avant tout usage en exécution |
| Pas de benchmark sur dalot complet | P1 | Modèle global non recoupé | Reproduire le dossier ci-dessus dans CYPE ou Robot | Équipe | — |
| Répartition transversale des roues sous faible remblai | P1 | Sur-dimensionnement possible | Comparer à un calcul plaque | Équipe | — |
| Coefficients de l'eau intérieure, valeurs de sol indicatives | P2 | Valeurs par défaut discutables | Faire confirmer par le projeteur | Utilisateur | par projet |

## Conclusion
Statut : `VÉRIFIÉ – CONTRÔLE MANUEL` sur les briques listées ; `ACCEPTÉ AVEC RÉSERVE` pour l'ensemble ; **non validé pour un usage professionnel sans visa d'ingénieur**.
Maturité interne : niveau 2 « contrôlé manuellement ».
Mention affichée dans le logiciel : « Niveau de vérification : contrôle manuel effectué sur les cas documentés ; comparaison à un logiciel indépendant non encore réalisée. Les résultats doivent être visés par un ingénieur avant exécution. »
