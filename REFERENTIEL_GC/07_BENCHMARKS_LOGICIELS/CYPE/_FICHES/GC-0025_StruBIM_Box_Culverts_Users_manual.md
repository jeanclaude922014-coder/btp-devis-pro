# FICHE RESSOURCE — StruBIM Box Culverts - User's manual

- Identifiant catalogue : GC-0025
- Nom du fichier : aucun fichier déposé (référence par lien)
- Titre officiel : StruBIM Box Culverts - User's manual
- Auteur / organisme : CYPE Ingenieros
- Année / édition / version : non indiquée / manuel PDF de 44 pages
- Langue : en (version espagnole voisine : « Marcos. Manual del usuario », https://downloads2.cype.com/documentos_es/manuales/marexe01.pdf)
- Type : manuel utilisateur
- URL officielle : https://downloads2.cype.com/documents_en/manuals/marexe09.pdf (lien donné par https://learning.cype.com/fr/bibliotheque-de-documents/strubim-box-culverts-users-manual/)
- Date de consultation : 2026-11-11
- Dossier de classement : `07_BENCHMARKS_LOGICIELS/CYPE/`
- Licence / conditions d'accès : PDF en accès libre ; non redistribué dans le dépôt

## Contenu utile
- Thèmes : dalots cadres en béton armé, logiciel de référence
- § 2.2 : règlements proposés, dont BAEL 91 et Fascicule 61 pour la France.
- § 2.3 : charges. Poussée au repos par la formule de Jaky sur les piédroits ; charge uniforme supérieure (incompatible avec les autres charges de chaussée) ; charges en bande ; trains de charges ; charge uniforme sur radier ; charge hydraulique (incompatible avec la charge sur radier) ; diffusion des charges dans le remblai selon un angle réglable.
- § 2.4 : coques épaisses triangulaires 3D à 6 nœuds ; radier sur ressorts de Winkler.
- § 2.6 : vérifications (armatures minimales, flexion, effort tranchant sans armature transversale, flèche, décollement du radier, contrainte admissible du sol, murs en aile).
- § 3.1 : fenêtres « Materials » (béton, acier, environnement) et « General data » (module de réaction, contrainte admissible, coefficient de frottement sol-fondation, poids volumique et angle de frottement du remblai, angle de transmission des charges, charges uniformes, enrobages extérieur et intérieur, taille maximale du granulat).
- § 3.2 : assistant et règle d'épaisseurs : dalle et radier 0,02 L² + 0,10 pour L ≤ 5 m, 0,50 m entre 5 et 7 m ; piédroits 0,02 G² + 0,10 pour G ≤ 4,5 m, 0,50 m entre 4,5 et 7 m.

## Hypothèses et limites
- Limites : manuel d'utilisation, sans exemple chiffré. Il ne permet pas de recouper un résultat numérique.
- Les formules pour L ≥ 7 m et G ≥ 7 m sont tronquées à l'extraction du texte : non reprises.
- Valeurs d'écran (100 000 kN/m³, 200 kN/m², 45°, 3 cm...) : valeurs d'exemple du manuel, pas des recommandations.

## Projets concernés
- Projet / module : `outils/Dalot_Pro_CI.html` (étapes, champs de saisie, règle d'épaisseurs de départ, cas de charge)
- Niveau de fiabilité documentaire : Documentation officielle d'un logiciel

## Vérification de la ressource
- Source primaire retrouvée : oui
- Métadonnées confirmées : oui pour les champs renseignés, sinon « non indiquée »
- Lien vérifié : oui (HTTP 200, PDF lu le 2026-11-11)
- Version confirmée : non

*Fiche établie pour Moulo Jean Claude.*
