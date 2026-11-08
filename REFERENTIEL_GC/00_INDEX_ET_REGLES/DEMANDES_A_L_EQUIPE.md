# Demandes de ressources à l'équipe

L'agent ajoute ici les demandes documentaires précises : sujet, projet concerné, ressource recherchée, raison, priorité, dossier de dépôt recommandé et statut.

**Destinataire :** Moulo Jean Claude et l'équipe — **Date :** 2026-11-08
Pour chaque document fourni, merci d'indiquer si possible le **titre exact, l'édition ou l'année, et les pages utiles**. Je créerai ensuite la fiche et la ligne du catalogue.

> Rappel : ne fournissez que des documents auxquels vous avez légalement accès (achat, abonnement, cours remis, document public). Je ne recopierai pas intégralement les normes protégées.

## Priorité P0 — bloquant pour valider les modules actifs

| N° | Sujet | Ressource recherchée | Utilité | Projet / module | Dépôt recommandé | Statut |
|---|---|---|---|---|---|---|
| D-01 | **BAEL 91 révisé 99** | Le texte du BAEL 91 mod. 99 (Fascicule 62 Titre I Section I du CCTG) et, si possible, un ouvrage d'application avec exemples résolus (par exemple un cours de BA BAEL de votre formation) | Le BAEL reste la référence courante en Côte d'Ivoire. Sans ce texte, aucune formule BAEL ne peut être tracée | Pré-dimensionnement BA, Assistant calcul dalot | `06_NORMES_ET_REGLEMENTS/BAEL_CM66_Anciens_Reglements/` (texte) et `02_BETON_ARME/Cas_References/` (exemples) | OUVERTE |
| D-03 | **Note de calcul de dalot** | Une ou deux notes de calcul de dalot déjà vérifiées (AGEROUTE ou BNETD de préférence) : hypothèses de sol, charges routières, combinaisons, ferraillage | Seul moyen d'obtenir un cas de référence réaliste et local pour l'Assistant calcul dalot | Assistant calcul dalot | `10_MODELES_ET_NOTES_DE_CALCUL/Notes_Logiciels_Tiers/` ou `04_GEOTECHNIQUE_FONDATIONS/Dalots_Ouvrages/` | OUVERTE |
| D-04 | **Charges routières applicables** | Le document fixant les charges routières à utiliser sur vos projets : Fascicule 61 Titre II (systèmes A, B, Bc, Bt, Mc120…) ou EN 1991-2 et son annexe nationale, selon ce que prescrit le CCTP | Il faut savoir quel règlement de charges le logiciel doit implémenter | Assistant calcul dalot | `06_NORMES_ET_REGLEMENTS/BAEL_CM66_Anciens_Reglements/` ou `06_NORMES_ET_REGLEMENTS/Eurocodes/` | OUVERTE |
| D-05 | **Hydrologie des petits bassins ouest-africains** | Rodier & Auvray (ORSTOM, 1965), *Estimation des débits de crues décennales…*, ou le guide hydrologique utilisé par AGEROUTE ou le BNETD | Dimensionner l'ouverture des dalots exige un débit de projet adapté au climat ivoirien. La source IRD en ligne est en maintenance (voir S-02) | Assistant calcul dalot (module hydraulique) | `05_HYDRAULIQUE_ET_OUVRAGES/` | OUVERTE |
| D-10 | **Benchmark logiciel tiers** | Un modèle Robot (ou CYPECAD, Graitec ou SCIA) d'une poutre BA ou d'un portique simple déjà calculé, avec **le fichier natif et la note de calcul exportée en PDF** | Premier cas de comparaison « outil indépendant » selon le standard (§ 3.1, niveau 4) | Robot Extractor Core, Pré-dimensionnement BA | `10_MODELES_ET_NOTES_DE_CALCUL/Notes_Logiciels_Tiers/` et `07_BENCHMARKS_LOGICIELS/Robot/` | OUVERTE |

## Priorité P1 — fortement souhaité

| N° | Sujet | Ressource recherchée | Utilité | Projet / module | Dépôt recommandé | Statut |
|---|---|---|---|---|---|---|
| D-02 | Exemples résolus EC2 | *Worked Examples to EN 1992* (European Concrete Platform, 2008) ou tout recueil d'exemples EC2 en votre possession | Recoupement des calculs EC2 en flexion, effort tranchant et poinçonnement | Pré-dimensionnement BA | `02_BETON_ARME/Cas_References/` | OUVERTE |
| D-06 | Guides Cerema de fondations | *Eurocode 7 – Application aux fondations superficielles (NF P94-261)* et *… fondations profondes (NF P94-262)*, Collection Références | Méthodes pressiométriques et pénétrométriques, avec exemples | Calcul de pieux, Assistant calcul dalot | `04_GEOTECHNIQUE_FONDATIONS/Semelles/` et `04_GEOTECHNIQUE_FONDATIONS/Pieux/` | OUVERTE |
| D-07 | Sols latéritiques et reconnaissance | Un rapport géotechnique du LBTP sur un site d'Abidjan ou de l'intérieur (essais pressiométriques, CBR, Proctor, limites d'Atterberg) | Calibrer les hypothèses de sol par défaut et les ordres de grandeur, sans en inventer | Calcul de pieux, Assistant calcul dalot | `04_GEOTECHNIQUE_FONDATIONS/Reconnaissances_Geotechniques/` | OUVERTE |
| D-08 | Références techniques ivoiriennes | Les CCTP types AGEROUTE pour les ouvrages hydrauliques, les normes CODINORM du domaine BTP et le guide CEBTP 1984 (chaussées tropicales) si disponible | Connaître le cadre réglementaire réellement imposé sur les marchés | Tous | `06_NORMES_ET_REGLEMENTS/Reglements_Locaux/` | OUVERTE |

## Priorité P2 — utile

| N° | Sujet | Ressource recherchée | Dépôt recommandé | Statut |
|---|---|---|---|---|
| D-09 | Manuels de vérification des logiciels installés | Si vous disposez de SAP2000, CYPECAD ou Graitec : exporter depuis le menu Aide le manuel de vérification ou de validation (CSI : *Help > Documentation > Analysis Verification*) | `07_BENCHMARKS_LOGICIELS/<logiciel>/` | OUVERTE |
| D-11 | Cours de RDM | Votre cours de RDM (formulaire des poutres, méthode des trois moments, Caquot) | `01_RDM_ET_ANALYSE_STRUCTURALE/Poutres/` | OUVERTE |
| D-12 | Charpente métallique | Le texte CM66 ou un cours d'EC3 avec exemples (déversement, assemblages) | `03_CHARPENTE_METALLIQUE/` | OUVERTE |

## Historique
- 2026-11-08 : création des demandes D-01 à D-12 (session d'initialisation).
