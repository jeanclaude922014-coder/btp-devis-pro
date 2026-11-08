# RAPPORT D'AUDIT INITIAL — btp-devis-pro (ChantierPilot)

**Auteur :** Moulo Jean Claude — audit réalisé avec l'assistance de l'agent IA
**Date :** 2026-11-08
**Référence :** STD-GC-001 v2.0, § 9 et AGENT_GESTIONNAIRE_REFERENTIEL_GC § 10
**Version auditée :** commit `17ecc9d` (branche `claude/relaxed-lovelace-mhlbvg`), `package.json` version 0.1.0
**Règle appliquée :** audit sans réécriture. **Aucun fichier de code n'a été modifié.**

---

## 1. Nature réelle du logiciel

`btp-devis-pro` (nom commercial dans le code : « ChantierPilot ») est une **application web d'économie de la construction et de gestion de chantier**, multi-cabinets (multi-organisation), destinée au marché ivoirien (XOF, région CI-ABIDJAN).

**Ce n'est pas un logiciel de calcul de structures.** Il ne contient :
- aucun calcul de béton armé (EC2, BAEL) ;
- aucun calcul de RDM, de géotechnique ou d'hydraulique.

Les descriptions d'ouvrages du catalogue (« semelle 80x80x40 dosée à 350 kg/m³ », « treillis HA8 »…) sont des **libellés de prix** et non des résultats de dimensionnement.

Conséquence : les exigences scientifiques les plus lourdes du standard (benchmarks Robot, CYPE, SCIA) **ne s'appliquent pas aujourd'hui**. Elles s'appliqueront dès qu'un module de dimensionnement sera ajouté (Assistant dalot, pré-dimensionnement BA).

## 2. Fonctions réellement implémentées

| Module | Fichiers principaux | Nature du calcul | Criticité métier |
|---|---|---|---|
| Moteur de prix de revient | `src/lib/pricing.ts` | Déboursé sec → prix de revient → prix de vente, totaux des lots et du devis | **Élevée** (montants contractuels) |
| Devis / DQE interne | `src/lib/actions/quotes.ts`, `src/app/(app)/projects/[id]/quotes/…` | Saisie des lignes, application des frais généraux et du bénéfice | Élevée |
| Export PDF du devis | `src/lib/pdf/quote-document.tsx` | Réutilise `computeLineTotal` | Élevée |
| Bibliothèque de prix | `prisma/seed.ts` (≈ 99 articles en 15 lots), `src/lib/actions/price-library.ts` | Données d'entrée : taux de main-d'œuvre et coûts « indicatifs » | **Élevée** (données sans source) |
| Import de DQE Excel/PDF | `src/lib/dqe/parse.ts`, `extract.ts`, `categories.ts`, `describe.ts` | Extraction heuristique de N°, désignation, unité, Qté, P.U. ; contrôle Qté × P.U. ≈ Montant ; classement des lots par mots-clés | Élevée (une erreur de lecture fausse le marché) |
| Suivi d'exécution DQE | `src/app/(app)/dqe/[id]/_components/dqe-workspace.tsx` | Attachements, cumul exécuté, % d'avancement, TVA (18 % par défaut), HT/TTC | Élevée (situations de travaux) |
| Export Word du DQE | `src/app/(app)/dqe/[id]/export/docx/route.ts` | Mise en forme | Moyenne |
| Générateur de plan | `src/lib/floor-plan/*` | Répartition de surfaces par pondération, pavage rectangulaire (« slice-and-dice »), plan 2D/3D, export PDF | Faible à moyenne (esquisse, non contractuelle) |
| Gestion de projet | `src/lib/project-tasks.ts`, `src/lib/actions/project-tasks.ts` | Tableau de tâches, avancement | Faible |
| Devises | `ExchangeRate`, `convertToXof` | Multiplication par un taux saisi | Moyenne |
| Authentification | `src/lib/auth.ts`, `src/lib/jwt.ts`, `src/proxy.ts`, `src/app/(auth)/actions.ts` | JWT, bcrypt, code de récupération | **Sécurité** |
| Outil hors ligne | `outils/DQE_Lots_et_Suivi.html` (694 lignes) | Version autonome du suivi DQE | Moyenne |

## 3. Architecture constatée vs architecture exigée (STD-GC-001 § 5)

| Couche exigée | Constat | Écart |
|---|---|---|
| Interface utilisateur | `src/app/**` (Next.js 16, React 19, Tailwind 4) | Conforme |
| Couche métier | `src/lib/actions/*` (Server Actions + validation zod), `prisma/schema.prisma` | Globalement conforme |
| Moteur de calcul | `src/lib/pricing.ts`, `src/lib/dqe/*`, `src/lib/floor-plan/*` : fonctions pures, testables | **Partiellement conforme.** Les totaux HT/TVA/TTC et l'avancement du suivi DQE sont **calculés dans le composant d'interface** `dqe-workspace.tsx` (1093 lignes). L'outil HTML hors ligne contient une **seconde implémentation** de la même logique |
| Moteur de vérification | Aucun : pas de tests, pas de script `test` | **Absent** |
| Traçabilité / documentation | Absente avant cet audit | Créée par cet audit (fichiers listés au § 7) |

## 4. Contrôles réalisés pendant l'audit

### 4.1 Contrôle manuel du moteur de prix (`computeUnitPricing`)
Données : 2 h de main-d'œuvre × 1 500 F/h, matériaux 10 000 F, matériel 500 F, frais généraux 15 %, bénéfice 10 %.

| Grandeur | Calcul à la main | Résultat du programme | Écart |
|---|---|---|---:|
| Main-d'œuvre | 2 × 1 500 = 3 000 | 3 000 | 0 |
| Déboursé sec | 3 000 + 10 000 + 500 = 13 500 | 13 500 | 0 |
| Frais généraux | 13 500 × 0,15 = 2 025 | 2 025 | 0 |
| Prix de revient | 13 500 + 2 025 = 15 525 | 15 525 | 0 |
| Bénéfice | 15 525 × 0,10 = 1 552,5 | 1 552,5 | 0 |
| Prix de vente unitaire | 15 525 + 1 552,5 = 17 077,5 | 17 077,5 | 0 |
| Total pour 12,5 unités | 17 077,5 × 12,5 = 213 468,75 | 213 468,75 | 0 |

Statut : `VÉRIFIÉ – CONTRÔLE MANUEL` sur ce cas. C'est un contrôle par la même formule (STD-GC-001 § 3.4) : ce n'est pas une validation indépendante.

### 4.2 Arrondis
Cas de 3 lignes identiques à prix de vente non entier :
- total du devis arrondi = **1 166 F** ;
- somme des 3 totaux de ligne affichés (arrondis) = **1 167 F**.

Le total imprimé peut donc différer de **quelques francs** de la somme des lignes imprimées. Risque de contestation sur un document contractuel.

### 4.3 Validation des saisies
- Frais généraux et bénéfice : validés côté serveur (≥ 0).
- Quantités, heures et prix des lignes : simple `Number(...)`, **sans contrôle de valeur négative ni de valeur non numérique** côté serveur.

## 5. Constats classés par criticité (STD-GC-001 § 2.1)

### P0 — Critique
| N° | Constat | Risque | Action proposée |
|---|---|---|---|
| A-01 | `src/lib/jwt.ts` : si `JWT_SECRET` n'est pas défini, le secret de repli `"dev-only-secret"` (public dans le dépôt) est utilisé, **y compris en production** | Toute personne peut fabriquer une session valide pour n'importe quel cabinet | **Vérifier immédiatement** que `JWT_SECRET` est défini sur l'hébergement. Faire échouer le démarrage en production si la variable est absente |
| A-02 | `src/app/(auth)/actions.ts` : code de récupération intégré au code (empreinte SHA-256), valable jusqu'au **17/11/2026**, accepté **pour n'importe quel compte de n'importe quel cabinet** | Quiconque détient ce code peut prendre le contrôle de tous les comptes jusqu'à cette date | Le limiter au compte concerné, ou le retirer dès que `PASSWORD_RESET_CODE` est configuré. Échéance avant le 17/11/2026 |
| A-03 | Prix unitaires du catalogue par défaut (`prisma/seed.ts`) **sans source** : le fichier les qualifie de « valeurs indicatives de démarrage » | Devis sous- ou sur-évalués présentés comme crédibles | Afficher dans l'application que le catalogue doit être calibré. Documenter la source et la date de chaque prix (cf. D-13) |

### P1 — Majeur
| N° | Constat | Action |
|---|---|---|
| A-04 | Aucun test automatisé (pas de script `test`) sur le moteur de prix, l'import DQE et les totaux TVA | Créer des tests unitaires (cas du § 4.1, DQE de référence) |
| A-05 | Totaux HT, TVA, TTC et avancement calculés dans l'interface (`dqe-workspace.tsx`) et dupliqués dans `outils/DQE_Lots_et_Suivi.html` | Extraire dans `src/lib/dqe/totals.ts`, puis partager ou tester les deux versions sur les mêmes cas |
| A-06 | Import DQE heuristique : tolérance Qté × P.U. = Montant de max(2 F ; 1 %) dans `resolveAmounts` et de max(2 F ; 0,5 %) dans `splitNumericTail`. Écart possible entre total déclaré et total relu | Un avertissement existe déjà si l'écart dépasse max(10 F ; 0,5 %). Le contrôle doit être éprouvé sur un jeu de DQE réels de référence (cf. D-14) |
| A-07 | Écarts d'arrondi entre lignes et total (§ 4.2) | Arrondir chaque total de ligne au franc **avant** sommation, ou indiquer la règle d'arrondi sur le document |
| A-08 | Devis interne : pas de mention HT/TTC ni de TVA sur le PDF « TOTAL DEVIS » | Préciser « montant HT » et ajouter la TVA si nécessaire |
| A-09 | Taux de TVA DQE fixé par défaut à 18 % sans référence documentée | Citer le texte fiscal ivoirien applicable (Code général des impôts) dans la documentation, et prévoir l'exonération et les autres taux |

### P2 — Important
| N° | Constat | Action |
|---|---|---|
| A-10 | Saisie des lignes non validée côté serveur (négatifs, valeurs non numériques) | Schéma zod avec `min(0)` |
| A-11 | Le « générateur de plan IA » est un **moteur à règles déterministe** (mots-clés + pavage). Limité à 4 niveaux, surface ≥ 15 m². Pas de contrôle de surfaces minimales réglementaires ni de faisabilité structurelle | Renommer ou expliquer « esquisse automatique ». Afficher « plan indicatif non coté pour exécution » |
| A-12 | Le workflow GitHub présent (SLSA) ne fait ni lint ni build ni test | Ajouter un workflow CI : lint + build + tests |
| A-13 | `scripts/migrate.mjs` poursuit le déploiement si les migrations échouent. `src/lib/schema.ts` recrée les tables au démarrage | Acceptable comme filet de sécurité. Journaliser et alerter |
| A-14 | Pas de limitation du nombre d'essais de connexion ni de réinitialisation (seulement un délai de 800 ms) | Ajouter une limitation par IP et par compte |

### P3 / P4
- P3 : documenter l'outil HTML hors ligne et sa compatibilité avec les données de l'application.
- P3 : lien vers `REFERENTIEL_GC/` depuis les futurs modules de calcul.
- P4 : nom du projet incohérent (`btp-devis-pro` / « ChantierPilot »).

## 6. Association au référentiel REFERENTIEL_GC
- Le moteur de prix, l'import DQE et le suivi ne relèvent d'aucun Eurocode. Leur preuve repose sur des **cas de contrôle manuel** et des **DQE réels** (demande D-14).
- Les prix nécessitent des **sources économiques** (bordereaux de prix, mercuriales, DQE de marchés attribués) : demande D-13 ajoutée au référentiel.
- Les futurs modules de calcul (dalot, BA) devront s'appuyer sur `REFERENTIEL_GC/02_…`, `04_…` et `05_…`.

## 7. Fichiers créés par cet audit
- `PROJECT_SCOPE.md`, `ARCHITECTURE.md`, `CHANGELOG.md`
- `project_management/QUALITY_CHECKLIST.md`, `KNOWN_LIMITATIONS.md`, `TECHNICAL_DECISIONS.md`, ce rapport
- `docs/validation/` : 4 fiches (prix de revient, import DQE, suivi DQE et TVA, générateur de plan)
- `docs/tutorial/` : plan du tutoriel et dossier « Comprendre le calcul » du prix de vente

## 8. Plan d'amélioration priorisé
1. **Immédiat (P0) :** A-01 (vérifier `JWT_SECRET`), A-02 (code de récupération, avant le 17/11/2026), A-03 (avertissement sur le catalogue).
2. **Court terme (P1) :** tests unitaires A-04 → extraction des totaux A-05 → règle d'arrondi A-07 → mention HT/TVA A-08 et A-09 → jeu de DQE de référence A-06.
3. **Moyen terme (P2) :** validation des saisies, CI, limitation des essais, clarification du générateur de plan.

## 9. Suivi des corrections

| Constat | Décision | Date | Correction | Preuve |
|---|---|---|---|---|
| A-01 | Validée par Moulo Jean Claude | 2026-11-08 | `src/lib/jwt.ts` : plus de secret de repli en production. Sans `JWT_SECRET`, aucune session n'est créée ni acceptée, et un message clair s'affiche à la connexion | `src/lib/jwt.test.ts`, build de production réussi, essai serveur : jeton forgé avec l'ancien secret → redirection vers /login |
| A-02 | Validée : limiter au compte du propriétaire | 2026-11-08 | `src/lib/reset-code.ts` : code intégré accepté uniquement pour le compte du propriétaire (empreinte SHA-256 de l'e-mail), jusqu'au 17/11/2026 | `src/lib/reset-code.test.ts` |
| A-04 | Validée | 2026-11-08 | Script `npm test` (`tsx --test`), 17 tests | Exécution : 17/17 réussis |
| A-07 | Validée | 2026-11-08 | `computeLineTotal` arrondit chaque total de ligne au franc avant sommation (`roundToUnit`) | Test C2 : total = somme des lignes = 1 167 F |

Les autres constats restent ouverts. Un point est hors périmètre des corrections : `npm run lint` signale 2 erreurs **préexistantes** dans `src/app/(app)/dashboard/page.tsx` (lien `<a>` au lieu de `<Link>`).
