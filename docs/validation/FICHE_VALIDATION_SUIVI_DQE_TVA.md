# FICHE DE VALIDATION — Suivi d'exécution DQE, HT / TVA / TTC
Projet : btp-devis-pro
Module : `src/lib/dqe/totals.ts` (moteur unique depuis le 2026-11-09), utilisé par `dqe-workspace.tsx`, l'export CSV, l'export Word et `describe.ts`. Copie JavaScript dans `outils/DQE_Lots_et_Suivi.html` (bloc `DQE-TOTALS`)
Version du logiciel : 0.1.0 + correctif A-05
Responsable : Moulo Jean Claude
Date : 2026-11-09
Norme / méthode : règles d'arrondi et de taxe décrites ci-dessous. Aucune norme technique ne s'applique
Domaine couvert : avancement financier par article, lot, ouvrage et marché ; TVA à taux unique par DQE

## Hypothèses et limites
- Montant d'un article = Qté × P.U., arrondi au franc (0,5 F vers le haut). Les sous-totaux sont des sommes d'articles arrondis.
- Montant réalisé = min(Qté exécutée, Qté du marché) × P.U., arrondi au franc. Un dépassement de quantité n'est pas valorisé.
- TVA = taux × total HT, arrondie au franc **une seule fois** sur le total ; TTC = HT + TVA.
- TVA du reste = TVA du marché − TVA du réalisé, pour que réalisé + reste = marché au franc près.
- Taux unique par DQE, modifiable (0 = exonéré), borné entre 0 et 100 %.
- Le taux de 18 % par défaut n'est pas encore rattaché à un texte fiscal ivoirien (A-09).
- Cas non couverts : taux multiples, avenants, révision de prix, retenue de garantie, avances.

## Défauts corrigés le 2026-11-09
| Défaut | Exemple | Après correction |
|---|---|---|
| TVA du réalisé + TVA du reste ≠ TVA du marché | Marché 1 003 F, réalisé 501 F, 18 % : 90 + 90 = 180 ≠ 181 | 90 + 91 = 181 |
| Réalisé et journal non arrondis par article | Total réalisé différent de la somme des lignes affichées | Chaque montant est arrondi avant sommation |
| Total HT du Word calculé sans arrondi par article | Total Word différent de l'écran | Même fonction `sumHt` partout |
| Taux affiché arrondi au pour-cent | 9,5 % affiché « 10 % » | « 9,5 % » |
| Taux non modifiable | Marché exonéré impossible | Champ « Taux de TVA (%) », 0 → « TVA (exonéré) » |
| Logique dupliquée dans l'outil hors ligne | Risque de divergence | Bloc `DQE-TOTALS` testé contre le moteur TypeScript |

## Sources documentaires
| Référence | Auteur/organisme | Année/version | Langue | Lien/fichier | Fiabilité | Hypothèses du cas |
|---|---|---|---|---|---|---|
| Texte fiscal ivoirien fixant le taux normal de TVA | Direction générale des impôts de Côte d'Ivoire | à confirmer | fr | à fournir ou rechercher | — | — |
| Situation de travaux réelle (attachements + décompte) | Équipe | — | fr | à fournir (D-14) | — | — |

## Comparaison des résultats
| Cas | Grandeur | Référence 1 (calcul manuel) | Référence 2 | Référence 3 | Notre logiciel | Écart | Tolérance | Statut |
|---|---|---:|---:|---:|---:|---:|---:|---|
| T1 : marché 1 003 F, réalisé 501 F, 18 % | TVA marché / réalisé / reste | 181 / 90 / 91 | — | — | 181 / 90 / 91 | 0 | 0 F | Conforme |
| T2 : DQE de test à 4 articles, situation au 31/10/2026 | Total HT | 3 192 267 | — | — | 3 192 267 | 0 | 0 F | Conforme |
| T2 | Réalisé HT | 1 013 575 | — | — | 1 013 575 | 0 | 0 F | Conforme |
| T2 | TVA marché / réalisé / reste | 574 608 / 182 444 / 392 164 | — | — | identique | 0 | 0 F | Conforme |
| T3 : exemple de l'outil hors ligne (111 articles) | Total HT | 49 053 257 (total déclaré dans le document) | — | — | 49 053 257 | 0 | 0 F | Conforme |
| T3 | TVA 18 % : marché = réalisé + reste | 8 829 586 = 757 710 + 8 071 876 | — | — | identique | 0 | 0 F | Conforme |
| T4 : application vs outil hors ligne | Montants, réalisé, TVA sur 4 jeux de données | identiques | — | — | identiques | 0 | 0 F | Conforme (test automatisé) |
| Décompte réel (à fournir) | Montant exécuté HT, TVA, TTC | — | — | — | — | — | au franc près | `NON ÉVALUÉ` |

## Contrôle manuel
- Formules et étapes : chaque valeur attendue de `src/lib/dqe/totals.test.ts` est calculée à la main en commentaire (par exemple 1 033 × 1 250,5 = 1 291 766,5 → 1 291 767 F).
- Vérification des unités : montants en F CFA, quantités dans l'unité de l'article, taux en fraction (0,18).
- Relecture humaine : à faire.
- Réserves : contrôle par les mêmes règles que le code (STD-GC-001 § 3.4). Pas encore de comparaison à un décompte officiel.

## Niveau de preuve
- [x] Contrôle de cohérence élémentaire
- [x] Contrôle manuel documenté
- [ ] Références documentaires concordantes
- [ ] Comparaison à un outil indépendant (décompte réel)
- [ ] Revue humaine compétente
- [x] Domaine de validité clairement défini
- [x] Tests automatisés (`src/lib/dqe/totals.test.ts`)

## Réserves et actions
| Réserve | Criticité | Impact | Action | Responsable | Échéance |
|---|---|---|---|---|---|
| ~~Calcul dans l'interface, dupliqué~~ | P1 | — | Corrigé le 2026-11-09 | — | Fait |
| Taux de TVA non sourcé | P1 | Erreur fiscale possible | Citer le texte | Moulo Jean Claude | À fixer |
| Pas de comparaison à un décompte réel | P1 | Règles d'arrondi du maître d'ouvrage peut-être différentes | Fournir un décompte (D-14) | Équipe | À fixer |
| La bibliothèque intégrée à l'outil hors ligne (bloc minifié) calcule encore les parts de lots sans arrondi | P3 | Pourcentages de répartition à ±0,1 % près | Reconstruire la bibliothèque lors d'une prochaine évolution | Développeur | — |

## Conclusion
Statut : `VÉRIFIÉ – CONTRÔLE MANUEL` (règles d'arrondi et de TVA) — décompte réel `NON ÉVALUÉ`
Domaine vérifié : montants, avancement, HT, TVA à taux unique et TTC d'un DQE
Limites d'utilisation : taux unique ; dépassements non valorisés ; taux de 18 % à confirmer selon le marché
Mention à afficher dans le logiciel : « Montants arrondis au franc par article ; TVA calculée sur le total HT. Le décompte officiel fait foi. Vérifiez le taux de TVA applicable à votre marché. »
