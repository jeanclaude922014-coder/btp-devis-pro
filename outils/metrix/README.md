# METRIX AVANCÉ CHANTIER BTP

Classeur Excel de pilotage de chantier — auteur : **Moulo Jean Claude**, technicien génie civil BTP (Abidjan).

Fichier : `Metrix_Avance_Chantier_BTP.xlsx` (régénérable avec `python3 generer_metrix.py`).

| Onglet | Rôle |
|---|---|
| Paramètres | Données du chantier, TVA 18 %, retenue de garantie, avance, listes déroulantes |
| 01_Planning | Gantt 26 semaines, % prévu / réalisé, tâches en retard |
| 02_Tableau_de_bord | Les 9 questions du pilotage, synthèse par lot, alertes, graphiques |
| 03_Budget | Budget par lot : engagé, factures, main-d'œuvre, reste, surconsommation |
| 04_Situations | Situations de travaux (DQE, attachements, décompte TTC) |
| 05_Factures | Factures fournisseurs, échéances, retards de paiement |
| 06_Pointage | Pointage journalier et coût de main-d'œuvre |
| 07_Affectation | Qui travaille, où, sur quelle tâche |
| 08_Commandes | Bons de commande, reste à livrer |
| 09_Stock / 09b_Livraisons | État du stock, seuils d'alerte, entrées / sorties |
| 10_Journal | Journal de chantier (météo, effectif, HSE) |
| 11_Incidents | Fiches incidents / alertes |
| 12_Controle_qualite | Registre des contrôles, essais et points d'arrêt (entreprise + mission de contrôle) |
| 13_Route | Route en terre : reprofilage lourd, rechargement latéritique, compactage par tronçon (PK) |
| 14_Points_critiques | Points critiques : purges, remblais, buses Ø800 / Ø1000, têtes de buses |
| 15_Dalots | Dalots : radier, piédroits, dalle, murs, remblais ; béton fc7 / fc28 |
| 16_Batiment_TCE | Bâtiment tous corps d'état |
| 17_Cloture | Clôture par tronçon (ml achevés) |
| 18_Charpente_metal | Charpente métallique par repère (pondération au poids) |
| Plan_controle | Référentiel PA / PC / autocontrôles par composante |
| Personnel, Checklist_lancement, Lexique | Annexes |

Cellules crème / texte bleu = saisie ; cellules grises = formules. Les données pré-remplies sont un exemple (route en terre de 20 km avec ouvrages, bâtiment TCE, clôture et hangar métallique). Dans les suivis 13 à 18, une phase sans objet se saisit « n/a ».
