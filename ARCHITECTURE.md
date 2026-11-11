# ARCHITECTURE — btp-devis-pro

**Auteur :** Moulo Jean Claude — **Date :** 2026-11-08 — décrit l'architecture **réelle** au commit `17ecc9d`

## 1. Pile technique
| Élément | Choix |
|---|---|
| Framework | Next.js 16.2.10 (App Router, Server Actions, `src/proxy.ts`) — voir `AGENTS.md` : version récente, lire `node_modules/next/dist/docs/` avant de coder |
| Interface | React 19.2.4, Tailwind CSS 4 |
| Base de données | PostgreSQL via Prisma 7.8 (adaptateur `@prisma/adapter-pg`), client généré dans `src/generated/prisma` |
| Authentification | JWT (`jsonwebtoken`) en cookie httpOnly pour 30 jours, mots de passe `bcryptjs` |
| Validation | zod 4 |
| Exports | `@react-pdf/renderer` (PDF), `docx` (Word), `exceljs` (Excel), `unpdf` (lecture PDF) |
| 3D | three.js (vue 3D du plan) |

## 2. Arborescence
```text
btp-devis-pro/
├── STANDARD_DEVELOPPEMENT_LOGICIELS_GC.md   copie du standard (original : REFERENTIEL_GC/)
├── PROJECT_SCOPE.md · ARCHITECTURE.md · CHANGELOG.md
├── project_management/                      checklist qualité, limites, décisions, audit
├── docs/validation/ · docs/tutorial/
├── REFERENTIEL_GC/                          bibliothèque technique commune (hors application)
├── prisma/  schema.prisma · migrations/ · seed.ts (catalogue de prix par défaut)
├── scripts/ migrate.mjs (migrations au build) · reset-password.ts
├── outils/  DQE_Lots_et_Suivi.html (outil autonome hors ligne)
│            Dalot_Pro_CI.html (généré) · dalot/ moteur-dalot.cjs + tests · interface.html
└── src/
    ├── proxy.ts                 garde d'accès (redirection /login)
    ├── app/(auth)/              connexion, inscription, mot de passe oublié
    ├── app/(app)/               dashboard, contacts, projects (+ quotes), price-library,
    │                            dqe, plans, gestion-projet, settings
    └── lib/
        ├── pricing.ts           MOTEUR DE PRIX (fonctions pures)
        ├── dqe/                 parse · extract · categories · describe · types
        ├── floor-plan/          generate · layout · chat-engine · catalog · drawing · types
        ├── pdf/                 quote-document · floor-plan-document
        ├── actions/             Server Actions par domaine (validation + persistance)
        ├── auth.ts · jwt.ts · db.ts · schema.ts (création des tables au démarrage)
        └── project-tasks.ts
```

## 3. Correspondance avec les 5 couches du standard (STD-GC-001 § 5)

| Couche | Emplacement | État |
|---|---|---|
| 1. Interface | `src/app/**`, composants `_components/` | En place |
| 2. Couche métier | `src/lib/actions/*`, `prisma/schema.prisma`, `src/lib/*/types.ts` | En place |
| 3. Moteur de calcul | `src/lib/pricing.ts`, `src/lib/dqe/parse.ts`, `src/lib/floor-plan/{generate,layout}.ts` | En place, **sauf** les totaux du suivi DQE (HT, TVA, TTC, avancement), qui sont dans `dqe-workspace.tsx` (interface) |
| 4. Moteur de vérification | — | **Absent** (pas de tests) |
| 5. Traçabilité / documentation | `docs/`, `project_management/`, `CHANGELOG.md` | Créée le 2026-11-08 |

## 4. Flux principaux
1. **Devis.** La ligne (heures, taux, matériaux, matériel, quantité) passe par `computeLineTotal(fg%, bénéfice%)`. On obtient les sous-totaux de lot, puis le total via `computeQuoteTotal`. L'écran et le PDF appellent les mêmes fonctions.
2. **Import DQE.** Le fichier est converti en `RawSheet[]` (`extract.ts`), puis analysé par `parseDqe` (en-têtes, codes, titres de lots, contrôle Qté × P.U. = Montant). On obtient un `DqeData` (JSON) stocké dans `DqeImport.data`, accompagné d'un rapport d'analyse et d'avertissements.
3. **Suivi.** Les attachements (date, article, quantité) sont cumulés et plafonnés à la quantité du marché. Ils donnent le montant exécuté, l'avancement et la TVA (calculs dans l'interface).
4. **Plan.** Le dialogue (`chat-engine.ts`, règles et mots-clés) produit une requête, puis `generateFloors` (pondérations + pavage) produit un `FloorPlanSpec` (JSON), affiché en 2D, en 3D et en PDF.

## 5. Données et multi-cabinet
Toutes les entités métier portent `organizationId`. Les Server Actions filtrent sur `organizationId` de la session. Le catalogue global a `organizationId = null`.

## 6. Points d'attention architecturaux
Voir `project_management/AUDIT_INITIAL_2026-11-08.md` : A-01 (secret JWT de repli), A-05 (calculs dans l'interface et logique dupliquée dans l'outil HTML), A-12 (CI sans tests).
