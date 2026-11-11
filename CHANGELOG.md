# CHANGELOG — btp-devis-pro

Historique reconstitué à partir de l'historique Git le 2026-11-08 (Moulo Jean Claude). Le logiciel n'a pas encore de numéros de version publiés : `package.json` indique 0.1.0.

## [Non publié]
### Sécurité
- 2026-11-08 — A-01 : en production, l'absence de `JWT_SECRET` bloque désormais les sessions au lieu d'utiliser un secret public (`src/lib/jwt.ts`). **Action requise : définir `JWT_SECRET` sur l'hébergement.**
- 2026-11-08 — A-02 : le code de récupération intégré n'est plus accepté que pour le compte de son propriétaire (`src/lib/reset-code.ts`).
### Corrigé
- 2026-11-08 — A-07 : les totaux de ligne sont arrondis au franc avant sommation. Le total du devis est égal à la somme des lignes imprimées.
### Ajouté
- 2026-11-08 — A-04 : premiers tests automatisés (`npm test`, 17 tests).
### Documentation
- 2026-11-08 — Audit initial selon STD-GC-001 et création de `PROJECT_SCOPE.md`, `ARCHITECTURE.md`, `CHANGELOG.md`, `project_management/`, `docs/validation/`, `docs/tutorial/`. Aucune modification du code.
- 2026-11-08 — Ajout du standard STD-GC-001 à la racine du projet.
- 2026-11-08 — Initialisation de la bibliothèque technique `REFERENTIEL_GC/`.

## Non publié — 2026-11-11
### Ajouté
- Outil autonome `outils/Dalot_Pro_CI.html` (Dalot Pro CI 0.1.0) : hydraulique Manning-Strickler, portique sur appuis élastiques, charges Fascicule 61 titre II ou LM1, ferraillage BAEL 91 rév. 99 ou Eurocode 2, métré, note de calcul imprimable et export Word.
- Moteur `outils/dalot/moteur-dalot.cjs` séparé de l'interface, 7 tests (`npm test`), assemblage par `npm run build:dalot`.
- Fiche `docs/validation/FICHE_VALIDATION_DALOT.md`.

## 0.1.0 — développements du 2026-07-07 au 2026-11-02
### Ajouté
- 2026-11-02 — Création automatique des tables manquantes au démarrage (`src/lib/schema.ts`).
- 2026-11-02 — Module « Gestion projet et suivi » (tableau À faire / En cours / Terminé).
- 2026-11-02 — Outil autonome hors ligne `outils/DQE_Lots_et_Suivi.html`.
- 2026-11-02 — Récupération de mot de passe oublié (code de récupération, y compris un code provisoire intégré au code valable jusqu'au 17/11/2026).
- 2026-11-02 — Import de DQE Excel et PDF, description automatique des lots, suivi d'exécution.
- 2026-09-11 — Générateur de plan (dialogue, plan 2D à l'échelle, vue 3D).
- 2026-08-06 — Lot catalogue « Clôtures lourdes » (fondation profonde + élévation).
- 2026-07-07 — Version initiale « ChantierPilot » : comptes, contacts, projets, bibliothèque de prix CI-ABIDJAN, devis avec export PDF.

### Modifié
- 2026-11-02 — Le build ne bloque plus le déploiement quand la base est injoignable.
- 2026-09-11 — Migrations Prisma appliquées automatiquement au build.

### Infrastructure
- 2026-08-22 — Workflow GitHub de provenance SLSA.
