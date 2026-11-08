# Inventaire de l'arborescence — REFERENTIEL_GC

**Auteur :** Moulo Jean Claude — tenu par l'agent Bibliothécaire Technique GC
**Date de l'inventaire :** 2026-11-08
**Référence :** STD-GC-001 v2.0, § 7

## 1. Fichiers de pilotage (00_INDEX_ET_REGLES)

| Fichier | Rôle | État |
|---|---|---|
| `README.md` | Index du référentiel | Présent |
| `CATALOGUE_RESSOURCES.csv` | Inventaire des ressources confirmées (lien ouvert et contenu lu) | **24 entrées** |
| `SOURCES_A_VERIFIER.md` | Pistes repérées mais non confirmées | **16 pistes** |
| `DEMANDES_A_L_EQUIPE.md` | Documents à fournir par l'équipe | **12 demandes priorisées** |
| `INVENTAIRE_ARBORESCENCE.md` | Ce document : fonction de chaque dossier et lacunes | Créé |
| `PLAN_DE_RECHERCHE.md` | Prochaines recherches prioritaires | Créé |
| `JOURNAL_DES_SESSIONS.md` | Compte rendu de chaque session de l'agent | Créé |

Les documents fondateurs `STANDARD_DEVELOPPEMENT_LOGICIELS_GC.md`, `AGENT_GESTIONNAIRE_REFERENTIEL_GC.md` et `README.md` sont à la racine de `REFERENTIEL_GC/`.

### Conventions retenues
- Chaque ressource importante dispose d'une fiche dans un sous-dossier `_FICHES/` du dossier où elle est classée. Le fichier est nommé `GC-XXXX_Titre.md`.
- L'identifiant `GC-XXXX` est unique et relie la fiche, le catalogue et les demandes.
- Les originaux fournis par l'équipe sont déposés tels quels, sans renommage destructif, à côté de leur fiche.
- Les dossiers vides contiennent un fichier `.gitkeep` pour que Git conserve l'arborescence.

### Écart relevé dans l'arborescence
Le standard (§ 7) nomme le dossier `11_COMPOSANTS_LOGICIELS_COMMUNS/Gestion_Unités/` avec un accent, alors que le pack livré contient `Gestion_Unites/` sans accent. **Je n'ai rien renommé.** À vous de choisir le nom définitif. Je recommande la forme sans accent, plus sûre entre Windows, Linux et Git. Le dossier `04_.../Murs_Soutènement/` porte lui aussi un accent.

## 2. Fonction de chaque dossier et état

Légende de couverture : 🔴 vide · 🟠 liens seulement · 🟢 documents de référence présents.

| Dossier | Fonction | Ressources confirmées | Couverture |
|---|---|---|---|
| **01_RDM_ET_ANALYSE_STRUCTURALE** | Solutions analytiques et tests de référence de RDM et d'analyse de structures | GC-0011 (NAFEMS) | 🟠 |
| ├ Poutres | Formulaires de poutres (flèches, moments, réactions), cas hyperstatiques | — | 🔴 |
| ├ Portiques | Méthodes des déplacements et des forces, cas de portiques résolus | — | 🔴 |
| ├ Flambement | Charges critiques d'Euler, longueurs de flambement, cas de référence | — | 🔴 |
| ├ Elements_Finis | Benchmarks EF (NAFEMS, AFNOR/SFM), patch tests | GC-0011 | 🟠 |
| └ Cas_Analytiques | Solutions fermées citées avec leur source | — | 🔴 |
| **02_BETON_ARME** | Dimensionnement BA selon EC2 et BAEL 91 révisé 99 | GC-0002, 0003, 0004 | 🟠 |
| ├ Normes | Commentaires et guides d'application EC2 et BAEL (les normes elles-mêmes vont dans 06) | GC-0003 | 🟠 |
| ├ Flexion | Exemples ELU et ELS de flexion simple et composée | — | 🔴 |
| ├ Effort_Tranchant | Exemples d'effort tranchant (bielles, armatures transversales) | — | 🔴 |
| ├ Poinconnement | Exemples de poinçonnement de dalles et de semelles | — | 🔴 |
| ├ Poteaux | Compression centrée, flambement, effets du second ordre | — | 🔴 |
| ├ Fondations | Semelles et radiers BA (aspect béton) | — | 🔴 |
| └ Cas_References | Exemples complets résolus | GC-0002, GC-0004 | 🟠 |
| **03_CHARPENTE_METALLIQUE** | Dimensionnement acier EC3 (et CM66 pour l'historique) | — (benchmarks SCIA et Robot classés en 07) | 🔴 |
| ├ Eurocode_3 · Resistance_Sections · Flambement_Deversement · Assemblages · Cas_References | — | — | 🔴 |
| **04_GEOTECHNIQUE_FONDATIONS** | Reconnaissance des sols, fondations, soutènements, ouvrages enterrés | GC-0012, GC-0013 | 🟠 |
| ├ Reconnaissances_Geotechniques | Essais (pressiomètre, pénétromètre, CBR, Proctor), sols latéritiques | — | 🔴 **P1** |
| ├ Semelles | Portance et tassement des fondations superficielles (NF P94-261) | — | 🔴 **P1** |
| ├ Pieux | Fondations profondes (NF P94-262) | — | 🔴 **P1** |
| ├ Tassements | Consolidation, méthodes pressiométriques et œdométriques | — | 🔴 |
| ├ Murs_Soutènement | NF P94-281, poussée et butée | GC-0012 | 🟢 (guide Cerema) |
| ├ Dalots_Ouvrages | Interaction sol-dalot, ouvrages hydrauliques enterrés | GC-0013 (historique) | 🟠 **P0** |
| └ Cas_References | Notes géotechniques de référence | — | 🔴 |
| **05_HYDRAULIQUE_ET_OUVRAGES** | Hydrologie (débits de projet) et hydraulique des dalots, buses et ponceaux | GC-0014 (HDS-5) | 🟠 **P0** |
| **06_NORMES_ET_REGLEMENTS** | Références normatives, éditions en vigueur, annexes nationales | GC-0001, 0015, 0016 | 🟠 |
| ├ Eurocodes | EN 1990 à EN 1998 (références et liens officiels, pas de copie illégale) | GC-0001 | 🟠 |
| ├ Annexes_Nationales | Annexes nationales françaises (NF EN …/NA) | — | 🔴 |
| ├ BAEL_CM66_Anciens_Reglements | BAEL 91 révisé 99, CM66, Fascicules 62 et 65 | — | 🔴 **P0** |
| └ Reglements_Locaux | Côte d'Ivoire : CODINORM, AGEROUTE, BNETD, LBTP | GC-0015, GC-0016 | 🟠 **P1** |
| **07_BENCHMARKS_LOGICIELS** | Manuels de vérification et exemples des éditeurs | 6 ressources | 🟠 |
| ├ Robot | Verification Manual Eurocodes 2024 | GC-0005 | 🟢 |
| ├ CYPE | Exemples pratiques (pas de manuel de validation trouvé) | GC-0007 | 🟠 |
| ├ Graitec | Starting Guide (pas de Validation Guide trouvé) | GC-0009 | 🟠 |
| ├ SCIA | Benchmarks EN 1993 (51 cas) | GC-0006 | 🟢 |
| ├ SAP2000 | Manuel de vérification CSI : lien bloqué | — | 🔴 |
| ├ RFEM | Exemples de vérification Dlubal | GC-0008 | 🟠 |
| ├ Code_Aster | Site officiel. Manuel de validation V à explorer | GC-0018 | 🟠 |
| └ OpenSees | Exemples du wiki | GC-0010 | 🟠 |
| **08_BIBLIOTHEQUES_ET_OUTILS_OPEN_SOURCE** | Bibliothèques réutilisables, licences et compatibilité | GC-0019 à 0024 | 🟢 |
| ├ Calcul_Scientifique | SciPy (BSD-3), concrete-properties (MIT) | 2 | 🟢 |
| ├ Elements_Finis | PyNite (MIT), anaStruct (LGPL-3.0), DOLFINx (LGPL/GPL-3.0) | 3 | 🟢 |
| ├ Geometrie | section-properties (MIT) | 1 | 🟢 |
| └ Licences_Et_Compatibilite | Matrice de compatibilité des licences | `MATRICE_LICENCES.md` | 🟠 |
| **09_TUTORIELS_ET_EXEMPLES_PEDAGOGIQUES** | Contenus pédagogiques pour les espaces « Comprendre le calcul » | GC-0017 (MIT OCW) | 🟠 |
| **10_MODELES_ET_NOTES_DE_CALCUL** | Notes internes, notes de logiciels tiers, cas reproduits | — | 🔴 **P0** |
| **11_COMPOSANTS_LOGICIELS_COMMUNS** | Composants partagés (interface, unités, rapports, tests) | — | 🔴 |

## 3. Synthèse des lacunes par domaine

| Domaine | Lacune principale | Criticité | Traitement |
|---|---|---|---|
| Béton armé (BAEL) | Aucun texte de référence BAEL 91 révisé 99, alors qu'il reste la référence courante en Côte d'Ivoire | **P0** | Demande D-01 |
| Béton armé (EC2) | Pas d'exemples résolus EC2 en accès direct : les fiches JRC pointent vers un éditeur | P1 | Demande D-02, recherche R-01 |
| Dalots | Aucun cas de référence complet (charges routières, sol, hydraulique) | **P0** | Demandes D-03 et D-04 |
| Hydrologie ouest-africaine | Méthodes ORSTOM (Rodier-Auvray) et CIEH introuvables : serveur IRD en maintenance | **P0** | Demande D-05, source S-02 |
| Géotechnique | Pas de guides Cerema NF P94-261/262. Pas de données sur les sols latéritiques | P1 | Demandes D-06 et D-07 |
| Charpente métallique | Aucun exemple résolu EC3 en accès direct. Access Steel inaccessible | P1 | Recherche R-03 |
| Normes ivoiriennes | Aucun texte CODINORM, AGEROUTE ou BNETD | P1 | Demande D-08 |
| Benchmarks logiciels | SAP2000 (CSI) bloqué. Pas de guide de validation CYPE ni Graitec | P2 | Demande D-09 |
| Notes de calcul | Aucune note de calcul interne ou tierce archivée | **P0** | Demande D-10 |
