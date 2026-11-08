# KNOWN LIMITATIONS — btp-devis-pro

**Responsable :** Moulo Jean Claude — **Mise à jour :** 2026-11-08

| N° | Limite | Module | Conséquence pour l'utilisateur | Contournement actuel |
|---|---|---|---|---|
| L-01 | Aucun calcul de structure, de géotechnique ou d'hydraulique | Global | Le logiciel ne justifie pas les ouvrages qu'il chiffre | Utiliser une note de calcul séparée (Robot, CYPE, calcul manuel EC2/BAEL) |
| L-02 | Prix du catalogue par défaut indicatifs, sans source ni date | Bibliothèque de prix | Risque de devis éloigné des prix du marché | Calibrer chaque article avec les coûts réels du cabinet |
| L-03 | Import DQE heuristique (détection d'en-têtes, de codes et de titres ; tolérance Qté × P.U. = Montant de 0,5 % à 1 % ou 2 F) | Import DQE | Articles mal lus, lots mal regroupés, sous-totaux pris pour des articles | Relire le rapport d'analyse. Un avertissement apparaît si le total recalculé s'écarte de plus de max(10 F ; 0,5 %) du total HT lu dans le document |
| L-04 | PDF scannés (images) non lus : il n'y a pas d'OCR | Import DQE | Import refusé avec un message explicite | Fournir le fichier Excel ou un PDF texte |
| L-05 | Les quantités exécutées au-delà de la quantité du marché ne sont pas valorisées | Suivi DQE | Les travaux supplémentaires n'apparaissent pas dans le montant exécuté | Créer un article d'avenant |
| L-06 | TVA unique par DQE (18 % par défaut), ni exonération ni taux multiples | Suivi DQE | Montant TTC faux pour les marchés exonérés | Modifier le taux du DQE |
| L-07 | Devis interne sans TVA ni mention HT | Devis | Ambiguïté HT / TTC sur le PDF | Préciser « HT » dans le nom ou les conditions |
| L-08 | ~~Écart d'arrondi entre le total et la somme des lignes~~ **Corrigé le 2026-11-08** : lignes arrondies au franc avant sommation. Les prix unitaires restent affichés avec leur valeur exacte | Devis | — | — |
| L-09 | Générateur de plan : 1 à 4 niveaux, surface par niveau > 15 m², pièces rectangulaires, empreinte de ratio 1,3, sans cotes d'exécution, sans murs porteurs ni réglementation | Plans | Esquisse seulement | Reprendre le plan avec un architecte ou un dessinateur |
| L-10 | Le « plan IA » est un moteur à règles (mots-clés), pas un modèle d'IA | Plans | Demandes libres mal comprises | Utiliser les formulations proposées |
| L-11 | Conversion de devises au taux saisi manuellement, sans date ni source | Devises | Taux obsolète possible | Mettre à jour les taux |
| L-12 | Récupération de mot de passe sans e-mail : code administrateur | Authentification | Procédure manuelle | Variable `PASSWORD_RESET_CODE` ou script `scripts/reset-password.ts` |
