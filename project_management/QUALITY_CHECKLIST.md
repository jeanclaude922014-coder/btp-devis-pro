# QUALITY CHECKLIST — btp-devis-pro

**Responsable :** Moulo Jean Claude — **Mise à jour :** 2026-11-08
Statuts conformes à STD-GC-001 § 2.2. Les références A-xx renvoient à `AUDIT_INITIAL_2026-11-08.md`.

## Contrôles des calculs
| Contrôle | Module | Criticité | Statut | Preuve / commentaire |
|---|---|---|---|---|
| Formule déboursé sec → PR → PV | `pricing.ts` | P1 | `VÉRIFIÉ – CONTRÔLE MANUEL` | Cas C1 et C2, `docs/validation/FICHE_VALIDATION_PRIX_DE_REVIENT.md`, automatisés dans `src/lib/pricing.test.ts`. Contrôle par la même formule, pas une validation indépendante |
| Cohérence écran / PDF des totaux du devis | page devis + `quote-document.tsx` | P1 | `VÉRIFIÉ – RÉFÉRENCES DOCUMENTAIRES` (lecture du code) | Les deux appellent `computeLineTotal`. À confirmer par un test |
| Règle d'arrondi des totaux | `pricing.ts`, PDF | P1 | `VÉRIFIÉ – CONTRÔLE MANUEL` | Corrigé le 2026-11-08 : chaque ligne est arrondie au franc avant sommation (A-07). Test C2 |
| Mention HT / TVA sur le devis | PDF devis | P1 | `À FAIRE` | A-08 |
| Lecture correcte d'un DQE Excel réel | `dqe/parse.ts` | P1 | `NON ÉVALUÉ` | Jeu de DQE de référence demandé (D-14) |
| Lecture correcte d'un DQE PDF réel | `dqe/extract.ts`, `parse.ts` | P1 | `NON ÉVALUÉ` | Idem |
| Écart total déclaré / total recalculé signalé | import DQE | P1 | `VÉRIFIÉ – RÉFÉRENCES DOCUMENTAIRES` (lecture du code) | Avertissement si l'écart dépasse max(10 F ; 0,5 %) (`parse.ts`, l. 582). À confirmer par un test sur DQE réel |
| Totaux HT / TVA / TTC du suivi | `dqe-workspace.tsx` | P1 | `NON ÉVALUÉ` | Calcul dans l'interface (A-05) |
| Taux de TVA par défaut (18 %) | `dqe/parse.ts` | P1 | `À RECHERCHER` | Référence fiscale ivoirienne à citer (A-09) |
| Plafonnement de l'exécuté à la quantité du marché | suivi DQE | P2 | `VÉRIFIÉ – RÉFÉRENCES DOCUMENTAIRES` (lecture du code) | `Math.min(e, q)`. Les dépassements de quantité ne sont pas valorisés : comportement à confirmer avec l'utilisateur |
| Surfaces du plan = surface demandée | `floor-plan/generate.ts` | P3 | `NON ÉVALUÉ` | Test simple à écrire |
| Prix du catalogue par défaut | `prisma/seed.ts` | **P0** | `BLOQUANT POUR PUBLICATION PROFESSIONNELLE` | Aucune source (A-03). Les prix ne doivent pas être présentés comme référence sans calibrage |

## Sécurité
| Contrôle | Criticité | Statut | Commentaire |
|---|---|---|---|
| `JWT_SECRET` défini en production | **P0** | Code corrigé le 2026-11-08 (échec fermé, testé). **Reste à vérifier sur l'hébergement** | A-01 |
| Code de récupération intégré limité au bon compte et à une durée courte | **P0** | Corrigé le 2026-11-08, testé (`src/lib/reset-code.test.ts`) | A-02. Limité au compte du propriétaire, expire le 17/11/2026 |
| Isolation des données entre cabinets | P1 | `VÉRIFIÉ – RÉFÉRENCES DOCUMENTAIRES` (lecture du code) | Filtres `organizationId` présents dans les Server Actions relues. Pas de test automatisé |
| Validation serveur des saisies de lignes | P2 | `À FAIRE` | A-10 |
| Limitation des essais de connexion | P2 | `À FAIRE` | A-14 |

## Qualité logicielle
| Contrôle | Criticité | Statut |
|---|---|---|
| Tests unitaires du moteur de calcul | P1 | `EN COURS` : 17 tests (`npm test`) sur le prix, les sessions et le code de récupération. Import DQE et TVA non couverts (A-04) |
| CI : lint + build + tests | P2 | `À FAIRE` (A-12) |
| Documentation STD-GC-001 § 9 | P2 | `EN COURS` (créée le 2026-11-08, à maintenir) |
| Tutoriel intégré au logiciel (§ 10) | P2 | `À FAIRE` (plan dans `docs/tutorial/`) |

## Outil Dalot Pro CI (ajout du 2026-11-11)
| Contrôle | Criticité | Statut |
|---|---|---|
| Solveur de portique et sections BA recoupés par solutions analytiques et calculs manuels | P0 | `VÉRIFIÉ – CONTRÔLE MANUEL` (7 tests) |
| Formules réglementaires confrontées aux textes officiels (BAEL, Fascicule 61, EC) | **P0** | `À FAIRE` : textes non déposés au référentiel. `BLOQUANT POUR PUBLICATION PROFESSIONNELLE` |
| Benchmark sur dalot complet avec un logiciel indépendant | P1 | `À FAIRE` (dossier de reproduction dans la fiche de validation) |
| Alignement sur la vidéo CYPE de référence | P1 | `À RECHERCHER` : vidéo non reçue |
| Signal de confiance, tutoriel et « Comprendre le calcul » intégrés | P2 | Fait |
