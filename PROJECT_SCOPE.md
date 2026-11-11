# PROJECT SCOPE — btp-devis-pro (ChantierPilot)

**Auteur :** Moulo Jean Claude — **Date :** 2026-11-08 — **Version du logiciel :** 0.1.0
Standard applicable : `STANDARD_DEVELOPPEMENT_LOGICIELS_GC.md` (STD-GC-001 v2.0)

## Objet
Application web d'**économie de la construction et de suivi de chantier** pour les cabinets et entreprises BTP de Côte d'Ivoire : bibliothèque de prix, devis quantitatifs et estimatifs, import et suivi d'exécution de DQE, esquisses de plans, gestion des tâches.

## Utilisateurs visés
Cabinets d'études, économistes, entreprises du BTP et techniciens de chantier en Côte d'Ivoire. Le logiciel est multi-cabinets : chaque organisation ne voit que ses données.

## Périmètre fonctionnel (inclus)
| Module | Description |
|---|---|
| Comptes et cabinets | Inscription, connexion, récupération de mot de passe, paramètres du cabinet (logo, couleurs, frais généraux et bénéfice par défaut) |
| Contacts | Carnet d'adresses : clients, entreprises, architectes, fournisseurs |
| Projets | Chantiers, statut, budget estimé |
| Bibliothèque de prix | Catalogue par lot / corps d'état (heures de main-d'œuvre, taux horaire, matériaux, matériel), catalogue par défaut « CI-ABIDJAN » en XOF |
| Devis | Lots et lignes, calcul déboursé sec → prix de revient → prix de vente, export PDF |
| Import DQE | Lecture Excel, CSV et PDF ; détection des ouvrages, lots et articles ; description automatique des lots ; export Word et Excel |
| Suivi d'exécution | Attachements journaliers, cumul exécuté, avancement par lot, HT, TVA et TTC |
| Générateur de plan | Esquisse de plan d'habitation 2D/3D par dialogue guidé, export PDF à l'échelle 1/50 ou 1/100 |
| Gestion de projet | Tableau de tâches À faire / En cours / Terminé |
| Outil hors ligne | `outils/DQE_Lots_et_Suivi.html` |
| Outil hors ligne de calcul | `outils/Dalot_Pro_CI.html` : dimensionnement de dalot cadre (hydraulique, efforts, ferraillage BAEL / EC2, métré, note de calcul). **Prototype contrôlé manuellement**, voir `docs/validation/FICHE_VALIDATION_DALOT.md` |

## Hors périmètre (exclus explicitement)
- **Dans l'application web** (hors outil autonome Dalot Pro CI) : **tout dimensionnement de structure** : béton armé EC2 ou BAEL, charpente EC3, fondations, dalots, hydraulique. Les désignations d'ouvrages du catalogue sont des libellés de prix, pas des résultats de calcul.
- Le générateur de plan produit une **esquisse indicative**. Il ne vérifie ni les règles d'urbanisme, ni les surfaces réglementaires, ni la faisabilité structurelle.
- Comptabilité, facturation légale, paie.
- Validation fiscale : le taux de TVA est paramétrable, il appartient à l'utilisateur de le vérifier.

## Limites d'usage professionnel
- Les **prix du catalogue par défaut sont indicatifs et non sourcés**. Ils doivent être calibrés par chaque cabinet.
- L'import DQE est **heuristique** : chaque import doit être relu et le total comparé au document d'origine.
- Statut de maturité interne (STD-GC-001 § 15) : **niveau 1 « Prototype »** pour l'ensemble. Le moteur de prix atteint le niveau 2 « Contrôlé manuellement » sur un cas (voir `docs/validation/`).

## Évolutions envisagées (non engagées)
- Modules de calcul GC (Assistant dalot, pré-dimensionnement BA), qui s'appuieront sur `REFERENTIEL_GC/`.
- Tests automatisés et intégration continue.
