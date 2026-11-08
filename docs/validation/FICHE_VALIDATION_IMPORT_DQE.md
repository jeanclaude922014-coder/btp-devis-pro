# FICHE DE VALIDATION — Import de DQE (Excel / CSV / PDF)
Projet : btp-devis-pro
Module : `src/lib/dqe/extract.ts`, `parse.ts`, `categories.ts`, `describe.ts`
Version du logiciel : 0.1.0 (commit 17ecc9d)
Version du moteur : non versionnée
Responsable : Moulo Jean Claude
Date : 2026-11-08
Norme / méthode : heuristiques de lecture (en-têtes, codes de prix, titres de lots, contrôle Qté × P.U. = Montant)
Domaine couvert : DQE tabulaires Excel, CSV et PDF texte (non scannés)

## Hypothèses et limites
- Géométrie / matériaux / charges : sans objet.
- Hypothèses :
  - un article possède une désignation, une unité, une quantité et un prix unitaire ;
  - le montant, s'il est présent, sert à lever l'ambiguïté Qté / P.U. (tolérance de max(2 F ; 1 %) dans `resolveAmounts`, de max(2 F ; 0,5 %) dans `splitNumericTail`) ;
  - les lignes « total », « sous-total », « TVA », « TTC »… sont exclues des articles ;
  - le total HT déclaré le plus élevé est retenu, et un avertissement apparaît si l'écart avec le total recalculé dépasse max(10 F ; 0,5 %).
- Arrondis : Qté à 0,001 près, P.U. à 0,01 F près.
- Cas non couverts : PDF scannés (message d'erreur explicite), tableaux à cellules fusionnées complexes, DQE multi-devises.

## Sources documentaires
| Référence | Auteur/organisme | Année/version | Langue | Lien/fichier | Fiabilité | Hypothèses du cas |
|---|---|---|---|---|---|---|
| — | — | — | — | **Jeu de DQE réels à fournir (D-14)** | — | — |

## Comparaison des résultats
| Cas | Grandeur | Référence 1 (document source) | Référence 2 | Référence 3 | Notre logiciel | Écart | Tolérance | Statut |
|---|---|---:|---:|---:|---:|---:|---:|---|
| DQE réel n°1 (à fournir) | Nombre d'articles, total HT | — | — | — | — | — | Nombre exact ; total au franc près | `NON ÉVALUÉ` |

## Contrôle manuel
- Formules et étapes : lecture du code effectuée lors de l'audit.
- Calcul intermédiaire : —
- Vérification des unités : `normalizeUnit` (m², m³, ml, u, kg, ff…), à tester.
- Relecture humaine : à faire.
- Réserves : aucune exécution sur un DQE réel pendant l'audit.

## Benchmark logiciel tiers (si disponible)
- Logiciel et version : sans objet. La référence est le document DQE lui-même (total HT signé).

## Niveau de preuve
- [x] Contrôle de cohérence élémentaire (contrôle Qté × P.U. = Montant intégré au code)
- [ ] Contrôle manuel documenté
- [ ] Références documentaires concordantes
- [ ] Comparaison à un outil indépendant
- [ ] Revue humaine compétente
- [x] Domaine de validité clairement défini

## Réserves et actions
| Réserve | Criticité | Impact | Action | Responsable | Échéance |
|---|---|---|---|---|---|
| Aucun DQE de référence testé | P1 | Erreurs de lecture non détectées | Fournir 3 à 5 DQE réels (Excel et PDF) avec leur total HT | Équipe (D-14) | À fixer |
| Pas de test automatisé | P1 | Régressions | Tests sur ces DQE | Développeur | À fixer |

## Conclusion
Statut : `NON ÉVALUÉ` (fonctionnel, non vérifié sur cas réels)
Domaine validé ou vérifié : aucun à ce jour
Limites d'utilisation : relire chaque import, comparer le total au document d'origine
Mention à afficher dans le logiciel : « Import automatique : vérifiez les articles et le total HT par rapport au document d'origine. »
