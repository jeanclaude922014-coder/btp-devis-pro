# FICHE DE VALIDATION — Générateur de plan (esquisse)
Projet : btp-devis-pro
Module : `src/lib/floor-plan/generate.ts`, `layout.ts`, `chat-engine.ts`
Version du logiciel : 0.1.0 (commit 17ecc9d)
Responsable : Moulo Jean Claude
Date : 2026-11-08
Norme / méthode : répartition des surfaces par pondération (`ROOM_CATALOG.areaWeight`), pavage rectangulaire récursif, empreinte de ratio largeur/profondeur 1,3
Domaine couvert : esquisse d'habitation de 1 à 4 niveaux

## Hypothèses et limites
- Géométrie : rectangle de surface S, largeur = √(1,3 S), profondeur = S / largeur.
- Pièces rectangulaires, sans épaisseur de murs ni ouvertures dimensionnées.
- Pas de vérification des surfaces minimales, de l'éclairement ou de la ventilation, ni de règles d'urbanisme.
- Aucune descente de charges ni aucun élément porteur.
- Cas non couverts : terrains non rectangulaires, plus de 4 niveaux, escaliers.

## Sources documentaires
| Référence | Auteur/organisme | Année/version | Langue | Lien/fichier | Fiabilité | Hypothèses du cas |
|---|---|---|---|---|---|---|
| — | — | — | — | Pondérations des pièces sans source (choix de conception) | — | — |

## Comparaison des résultats
| Cas | Grandeur | Référence 1 | Référence 2 | Référence 3 | Notre logiciel | Écart | Tolérance | Statut |
|---|---|---:|---:|---:|---:|---:|---:|---|
| 1 niveau, 80 m² | Somme des surfaces des pièces | 80 m² | — | — | à tester | — | 0,5 m² (arrondis à 0,1 m²) | `À FAIRE` |
| 1 niveau, 80 m² | Largeur × profondeur | 80 m² (≈ 10,20 × 7,84 m) | — | — | à tester | — | 0,01 m | `À FAIRE` |

## Contrôle manuel
- Calcul de l'empreinte pour 80 m² : largeur = √(80 × 1,3) = √104 ≈ 10,198 m ; profondeur = 80 / 10,198 ≈ 7,845 m.
- Relecture humaine : à faire.

## Niveau de preuve
- [x] Contrôle de cohérence élémentaire
- [ ] Contrôle manuel documenté (exécution non réalisée)
- [ ] Références documentaires concordantes
- [ ] Comparaison à un outil indépendant
- [ ] Revue humaine compétente
- [x] Domaine de validité clairement défini

## Conclusion
Statut : `ACCEPTÉ AVEC RÉSERVE` comme **outil d'esquisse non contractuel**
Mention à afficher dans le logiciel : « Esquisse indicative générée automatiquement. Ce plan n'est ni un plan d'exécution ni un plan de permis de construire. »
