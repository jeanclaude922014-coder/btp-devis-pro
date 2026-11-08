# TECHNICAL DECISIONS — btp-devis-pro

**Responsable :** Moulo Jean Claude — **Mise à jour :** 2026-11-08
Décisions **constatées** dans le code (reconstituées lors de l'audit) et décisions **proposées** (en attente de validation).

## Décisions constatées
| N° | Décision | Justification apparente | Statut |
|---|---|---|---|
| TD-01 | Next.js (App Router) + Server Actions, sans API REST séparée | Simplicité de déploiement (Vercel) | En vigueur |
| TD-02 | PostgreSQL + Prisma 7, données DQE et plans stockées en JSON (`DqeImport.data`, `FloorPlan.spec`) | Structures souples et évolutives | En vigueur. Le contenu JSON n'est pas validé par schéma en base |
| TD-03 | Session JWT en cookie httpOnly pour 30 jours, sans table de sessions | Pas d'infrastructure de session | En vigueur. La révocation est impossible avant l'expiration |
| TD-04 | Modèle de prix : PV = DS × (1 + FG %) × (1 + B %), frais généraux et bénéfice au niveau du devis | Méthode usuelle de l'économie de la construction | En vigueur. Méthode à documenter avec une référence d'économie de la construction (à fournir) |
| TD-05 | Import DQE par heuristiques (regex, contrôle Qté × P.U.) plutôt que par modèle d'IA | Fonctionne hors ligne, déterministe, gratuit | En vigueur |
| TD-06 | Générateur de plan par règles et pavage « slice-and-dice » | Déterministe, pas de dépendance externe | En vigueur |
| TD-07 | Migrations au build non bloquantes et création des tables au démarrage | Base parfois injoignable depuis le build | En vigueur, filet de sécurité |
| TD-08 | Code de récupération provisoire intégré (empreinte SHA-256), expirant le 17/11/2026 | Récupérer un compte sans service d'e-mail | **À revoir** (audit A-02) |

## Dépendances et licences
Licences des dépendances principales **non relues pendant l'audit** (pas de `node_modules` dans l'environnement d'audit). Action : générer un inventaire des licences (`npx license-checker` ou équivalent) avant toute diffusion commerciale.

## Décisions proposées (en attente de votre validation)
| N° | Proposition | Motif |
|---|---|---|
| TDP-01 | Refuser le démarrage en production si `JWT_SECRET` est absent | A-01 |
| TDP-02 | Arrondir chaque total de ligne au franc avant de faire la somme | A-07, cohérence du document contractuel |
| TDP-03 | Extraire les totaux du suivi DQE dans `src/lib/dqe/totals.ts` et les tester | A-05, standard § 5 |
| TDP-04 | Adopter un outil de test (par exemple Vitest ou `node:test`) | A-04 |
| TDP-05 | Futurs modules de calcul GC dans un dossier séparé `src/lib/gc/` qui cite `REFERENTIEL_GC/` | Séparer devis et dimensionnement |
