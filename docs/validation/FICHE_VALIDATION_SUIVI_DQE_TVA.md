# FICHE DE VALIDATION — Suivi d'exécution DQE, HT / TVA / TTC
Projet : btp-devis-pro
Module : `src/app/(app)/dqe/[id]/_components/dqe-workspace.tsx` (calculs dans l'interface) et `outils/DQE_Lots_et_Suivi.html` (seconde implémentation)
Version du logiciel : 0.1.0 (commit 17ecc9d)
Responsable : Moulo Jean Claude
Date : 2026-11-08
Norme / méthode : montant = Qté × P.U. ; exécuté = min(cumul des attachements, Qté marché) × P.U. ; TVA = HT × taux (18 % par défaut)
Domaine couvert : avancement financier par article, lot, ouvrage et marché

## Hypothèses et limites
- Le dépassement de quantité n'est pas valorisé (plafonnement à la quantité du marché).
- Un seul taux de TVA par DQE.
- Le taux de 18 % n'est pas encore rattaché à un texte fiscal ivoirien dans la documentation (A-09).
- Cas non couverts : avenants, révision de prix, retenue de garantie, avances.

## Sources documentaires
| Référence | Auteur/organisme | Année/version | Langue | Lien/fichier | Fiabilité | Hypothèses du cas |
|---|---|---|---|---|---|---|
| Texte fiscal ivoirien fixant le taux normal de TVA | Direction générale des impôts de Côte d'Ivoire | à confirmer | fr | à fournir ou rechercher | — | — |
| Situation de travaux réelle (attachements + décompte) | Équipe | — | fr | à fournir (D-14) | — | — |

## Comparaison des résultats
| Cas | Grandeur | Référence 1 | Référence 2 | Référence 3 | Notre logiciel | Écart | Tolérance | Statut |
|---|---|---:|---:|---:|---:|---:|---:|---|
| Décompte réel (à fournir) | Montant exécuté HT, TVA, TTC | — | — | — | — | — | au franc près | `NON ÉVALUÉ` |

## Contrôle manuel
- Lecture du code : formules ci-dessus confirmées. Plafonnement `Math.min(e, q)` présent.
- Relecture humaine : à faire.
- Réserves : les calculs sont dans l'interface (A-05) et dupliqués dans l'outil HTML. Il faudra vérifier que les deux versions donnent les mêmes résultats.

## Niveau de preuve
- [x] Contrôle de cohérence élémentaire
- [ ] Contrôle manuel documenté
- [ ] Références documentaires concordantes
- [ ] Comparaison à un outil indépendant
- [ ] Revue humaine compétente
- [ ] Domaine de validité clairement défini

## Réserves et actions
| Réserve | Criticité | Impact | Action | Responsable | Échéance |
|---|---|---|---|---|---|
| Calcul dans l'interface, dupliqué | P1 | Divergence possible entre l'application et l'outil hors ligne | Extraire dans `src/lib/dqe/totals.ts` (TDP-03) | Développeur | À fixer |
| Taux de TVA non sourcé | P1 | Erreur fiscale | Citer le texte ; permettre l'exonération | Moulo Jean Claude | À fixer |

## Conclusion
Statut : `NON ÉVALUÉ`
Mention à afficher dans le logiciel : « Montants indicatifs : le décompte officiel fait foi. Vérifiez le taux de TVA applicable à votre marché. »
