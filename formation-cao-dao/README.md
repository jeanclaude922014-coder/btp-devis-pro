# Formation CAO/DAO & dimensionnement de bâtiment

Auteur : **Moulo Jean Claude** — Technicien génie civil BTP, Abidjan.
Normes de référence : BAEL 91 modifié 99 et Eurocode 2 — contexte ivoirien.

## Livrets (PDF)

| Fichier | Contenu |
|---|---|
| `livrets/00_Plan_de_formation_CAO_DAO.pdf` | Plan de formation sur 7 semaines, bases, conception climat tropical, calculs à la main (poteau, semelle), IA, projet final |
| `livrets/01_Livret_AutoCAD.pdf` | Plan 2D de la villa : réglages, calques, murs, blocs, cotes, mise en page, PDF, AutoLISP par IA |
| `livrets/02_Livret_ArchiCAD.pdf` | Maquette 3D : étages, composites, structure, zones, escalier, coupes, publication, IFC, AI Visualizer |
| `livrets/03_Livret_Revit_BIM.pdf` | BIM : niveaux, quadrillages, familles, structure béton, nomenclatures, feuilles, lien Robot, Dynamo |
| `livrets/04_Livret_Robot_Structural_Analysis.pdf` | Modèle filaire, charges, combinaisons, résultats, contrôle à la main, ferraillage |
| `livrets/05_Livret_CYPECAD.pdf` | Étages, poteaux, poutres, planchers 16+4, calcul, erreurs, plans d'exécution, BIMserver.center |

Les images d'écran sont des **reproductions simplifiées** (l'aspect réel varie selon la version) ;
chaque leçon propose de faire ses propres captures.

## Suivi
`SUIVI_FORMATION.md` mémorise où la formation s'est arrêtée.

## Régénérer les PDF
```bash
cd formation-cao-dao/generateur && python3 construire.py   # nécessite reportlab
```
