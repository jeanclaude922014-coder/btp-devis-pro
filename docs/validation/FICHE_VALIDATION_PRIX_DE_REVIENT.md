# FICHE DE VALIDATION — Moteur de prix de revient et de vente
Projet : btp-devis-pro (ChantierPilot)
Module : `src/lib/pricing.ts` (`computeUnitPricing`, `computeLineTotal`, `computeQuoteTotal`)
Version du logiciel : 0.1.0 (commit 17ecc9d)
Version du moteur : non versionnée séparément
Responsable : Moulo Jean Claude
Date : 2026-11-08
Norme / méthode : méthode du déboursé sec (économie de la construction). Aucune norme technique (EC2 ou BAEL) ne s'applique
Domaine couvert : prix unitaire et total d'une ligne, sous-totaux de lots, total du devis

## Hypothèses et limites
- Formules telles qu'implémentées dans le code :
  - Main-d'œuvre = heures × taux horaire
  - DS = MO + matériaux + matériel
  - FG = DS × FG % / 100 ; PR = DS + FG
  - B = PR × B % / 100 ; PV = PR + B
  - Total ligne = PV × quantité
- Frais généraux et bénéfice uniques pour tout le devis.
- Pas de TVA dans ce module. Le total est implicitement hors taxes.
- Cas non couverts : frais de chantier séparés, aléas, révision de prix, remises, arrondis normalisés.

## Sources documentaires
| Référence | Auteur/organisme | Année/version | Langue | Lien/fichier | Fiabilité | Hypothèses du cas |
|---|---|---|---|---|---|---|
| — | — | — | — | Aucune référence d'économie de la construction n'est encore fournie | — | À demander (D-13) |

## Comparaison des résultats
| Cas | Grandeur | Référence 1 (calcul manuel) | Référence 2 | Référence 3 | Notre logiciel | Écart | Tolérance | Statut |
|---|---|---:|---:|---:|---:|---:|---:|---|
| C1 : 2 h × 1 500 F/h, matériaux 10 000 F, matériel 500 F, FG 15 %, B 10 % | Déboursé sec | 13 500 | — | — | 13 500 | 0 | 0,01 F | Conforme |
| C1 | Prix de revient | 15 525 | — | — | 15 525 | 0 | 0,01 F | Conforme |
| C1 | Prix de vente unitaire | 17 077,5 | — | — | 17 077,5 | 0 | 0,01 F | Conforme |
| C1, quantité 12,5 | Total de la ligne | 213 468,75 | — | — | 213 468,75 | 0 | 0,01 F | Conforme |
| C2 : 3 lignes (0,33 h × 625 F/h + 101 F), FG 15 %, B 10 % | Total arrondi vs somme des lignes arrondies | 1 166 vs 1 167 | — | — | 1 166 / 1 167 | 1 F | — | **Écart d'arrondi constaté (A-07)** |

## Contrôle manuel
- Formules et étapes : voir le cas C1 dans `project_management/AUDIT_INITIAL_2026-11-08.md` § 4.1.
- Calcul intermédiaire : MO = 3 000 ; DS = 13 500 ; FG = 2 025 ; PR = 15 525 ; B = 1 552,5 ; PV = 17 077,5.
- Vérification des unités : toutes les grandeurs sont en F CFA (XOF), les heures en h, les pourcentages en %.
- Relecture humaine : **à faire** par Moulo Jean Claude.
- Réserves : le contrôle utilise la même formule que le code (STD-GC-001 § 3.4). Il prouve l'exactitude arithmétique, pas la pertinence de la méthode.

## Benchmark logiciel tiers (si disponible)
- Logiciel et version : non réalisé. Comparaison possible avec un tableur d'étude de prix du cabinet ou un logiciel de métré.
- Fichier de modèle : —
- Note de calcul : —
- Hypothèses identiques vérifiées : —
- Écarts et explications : —

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
| Écart d'arrondi entre total et somme des lignes | P1 | Document contractuel contestable | Choisir une règle d'arrondi (TDP-02) | Moulo Jean Claude | À fixer |
| Pas de test automatisé | P1 | Régression non détectée | Transformer C1 et C2 en tests | Développeur | À fixer |
| Méthode non référencée | P2 | Explicabilité | Fournir une référence d'économie de la construction (D-13) | Équipe | À fixer |

## Conclusion
Statut : `VÉRIFIÉ – CONTRÔLE MANUEL` (arithmétique) — `ACCEPTÉ AVEC RÉSERVE` (arrondis)
Domaine validé ou vérifié : calcul d'un prix unitaire et d'un total de ligne à frais généraux et bénéfice uniques
Limites d'utilisation : pas de TVA, arrondi au franc uniquement à l'affichage
Mention à afficher dans le logiciel : « Niveau de vérification : contrôle manuel de l'arithmétique effectué. Montants hors taxes. Les prix unitaires dépendent de votre bibliothèque de prix. »
