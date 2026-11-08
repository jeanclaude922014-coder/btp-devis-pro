# Comprendre le calcul — Prix de vente d'un article de devis

**Auteur :** Moulo Jean Claude — **Date :** 2026-11-08
Module : `src/lib/pricing.ts`

## Principe
Le prix de vente d'un article se construit en trois étages, à partir du coût direct de réalisation d'**une unité** d'ouvrage (1 m², 1 m³, 1 ml, 1 u…) :

1. **Déboursé sec (DS)** : ce que coûte directement l'unité d'ouvrage.
2. **Prix de revient (PR)** : DS augmenté des frais généraux de l'entreprise.
3. **Prix de vente (PV)** : PR augmenté du bénéfice.

## Formules utilisées par le logiciel
| Symbole | Signification | Unité |
|---|---|---|
| h | Heures de main-d'œuvre par unité d'ouvrage | h |
| t | Taux horaire de la main-d'œuvre | F CFA/h |
| M | Coût des matériaux par unité d'ouvrage | F CFA |
| E | Coût du matériel par unité d'ouvrage | F CFA |
| FG | Taux de frais généraux | % |
| B | Taux de bénéfice | % |
| Q | Quantité de l'article | unité de l'article |

- DS = h × t + M + E
- PR = DS × (1 + FG / 100)
- PV = PR × (1 + B / 100)
- Total de l'article = PV × Q, arrondi au franc (0,5 F arrondi vers le haut)
- Total du lot = somme des totaux de ses articles ; total du devis = somme des lots

Le bénéfice s'applique **sur le prix de revient** (frais généraux inclus), et non sur le déboursé sec.

## Application numérique (vérifiable à la main)
Données : h = 2 h, t = 1 500 F/h, M = 10 000 F, E = 500 F, FG = 15 %, B = 10 %, Q = 12,5.

| Étape | Calcul | Résultat |
|---|---|---:|
| Main-d'œuvre | 2 × 1 500 | 3 000 F |
| Déboursé sec | 3 000 + 10 000 + 500 | 13 500 F |
| Frais généraux | 13 500 × 0,15 | 2 025 F |
| Prix de revient | 13 500 + 2 025 | 15 525 F |
| Bénéfice | 15 525 × 0,10 | 1 552,5 F |
| Prix de vente unitaire | 15 525 + 1 552,5 | 17 077,5 F |
| Total pour 12,5 unités | 17 077,5 × 12,5 = 213 468,75, arrondi au franc | 213 469 F |

Ces résultats sont identiques à ceux du logiciel (voir `docs/validation/FICHE_VALIDATION_PRIX_DE_REVIENT.md`).

## Limites
- Montants **hors taxes**. Le devis n'applique pas de TVA.
- Les frais généraux et le bénéfice sont les mêmes pour toutes les lignes d'un devis.
- Chaque total d'article est arrondi au franc avant d'être additionné : le total du devis est donc toujours exactement la somme des lignes imprimées.
- La justesse du prix dépend entièrement des valeurs h, t, M et E de votre bibliothèque de prix. Les valeurs fournies par défaut sont **indicatives et non sourcées**.
