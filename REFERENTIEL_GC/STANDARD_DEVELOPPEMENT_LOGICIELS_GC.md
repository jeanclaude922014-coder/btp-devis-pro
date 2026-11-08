# STANDARD DE DÉVELOPPEMENT DES LOGICIELS DE GÉNIE CIVIL
**Référence : STD-GC-001 | Version : 2.0 | Statut : Standard interne**

## 1. Objet et philosophie

Ce standard s'applique à tous les logiciels de génie civil : calcul, dimensionnement, modélisation, extraction, contrôle, visualisation et production de notes de calcul.

Il doit être placé à la racine de chaque projet logiciel et consulté par tout développeur humain ou agent IA avant une création, une évolution importante ou un audit.

Notre objectif n'est pas de ralentir le développement avec une procédure administrative. Nous voulons développer vite, mais avec une méthode qui :
- réutilise les outils et méthodes scientifiques éprouvés ;
- recherche activement les références disponibles ;
- distingue les résultats calculés, contrôlés et validés ;
- conserve les preuves et les réserves ;
- rend les résultats explicables, reproductibles et défendables.

**Règle fondamentale : une vérification incomplète ne bloque pas automatiquement le développement. Elle doit être visible, qualifiée et suivie. En revanche, une fonction ne doit jamais être présentée comme pleinement validée pour un usage professionnel si ses contrôles critiques ne sont pas satisfaits.**

## 2. Niveaux de criticité et statuts

### 2.1 Niveaux

| Niveau | Signification | Comportement |
|---|---|---|
| **P0 – Critique** | Risque potentiel de résultat faux, dangereux ou trompeur. | Le développement continue. La fonction ne peut pas être déclarée pleinement validée pour un usage professionnel tant que le risque n'est pas maîtrisé. Alerte rouge dans le suivi interne. |
| **P1 – Majeur** | Preuve ou contrôle important encore incomplet. | Le développement continue. Action corrective et échéance enregistrées. |
| **P2 – Important** | Qualité, maintenance, documentation ou ergonomie. | Ajouter au backlog et traiter selon priorité. |
| **P3 – Recommandé** | Bonne pratique utile. | À réaliser lorsque pertinent. |
| **P4 – Facultatif** | Amélioration non essentielle au périmètre actuel. | Le développeur peut l'écarter avec une justification si nécessaire. |

**Nuance essentielle pour les benchmarks :** l'absence d'une solution analytique ou d'un logiciel tiers ne doit pas, à elle seule, faire échouer le développement. L'agent doit d'abord rechercher des références techniques fiables, réaliser les contrôles possibles et qualifier le niveau de preuve obtenu. La fonction peut avancer avec une réserve clairement affichée.

### 2.2 Statuts

- `NON ÉVALUÉ`
- `À RECHERCHER`
- `À FAIRE`
- `EN COURS`
- `VÉRIFIÉ – RÉFÉRENCES DOCUMENTAIRES`
- `VÉRIFIÉ – CONTRÔLE MANUEL`
- `COMPARÉ – OUTIL INDÉPENDANT`
- `VALIDÉ DANS LE PÉRIMÈTRE DÉFINI`
- `NON APPLICABLE` (justification obligatoire)
- `ACCEPTÉ AVEC RÉSERVE`
- `BLOQUANT POUR PUBLICATION PROFESSIONNELLE`

Ne jamais marquer `VALIDÉ` simplement parce que le programme s'exécute sans erreur.

## 3. Politique de vérification progressive des calculs

### 3.1 Ordre de recherche obligatoire

Pour chaque fonction de calcul importante, l'IA doit rechercher les éléments de vérification dans cet ordre :

1. **Références analytiques** : solutions fermées, exemples résolus, exercices corrigés, publications et manuels techniques.
2. **Références institutionnelles et professionnelles** : guides de conception, guides techniques, rapports d'organismes, documents de recherche et cas d'étude publiés.
3. **Références académiques** : cours universitaires, thèses, articles scientifiques, supports de laboratoire.
4. **Benchmarks logiciels** : exemples documentés de logiciels indépendants tels que Robot, CYPECAD, Graitec, SCIA Engineer, SAP2000, RFEM, Code_Aster, OpenSees ou autres outils adaptés.
5. **Contrôle manuel indépendant** : recalcul détaillé à partir des équations, hypothèses et données du cas.
6. **Benchmark spécialement produit** : si les références publiques sont insuffisantes, demander à un ingénieur/programmeur de reproduire le cas dans un logiciel tiers ou de faire établir un cas de référence indépendant.

L'IA doit chercher dans plusieurs langues lorsque cela augmente les chances de trouver une référence utile : français, anglais, espagnol, allemand, portugais, italien, et toute autre langue pertinente. Elle peut traduire les requêtes et exploiter des documents étrangers, mais doit conserver le titre original, la langue, l'auteur, l'organisme, la date, la version et le lien source.

### 3.2 Recherche documentaire multi-langue

L'agent doit utiliser des requêtes variées, par exemple :
- nom du phénomène + `benchmark`, `verification example`, `validation example` ;
- nom de la méthode + `worked example`, `numerical example`, `test problem` ;
- nom de la norme + `design example`, `calculation example`, `worked solution` ;
- traductions du phénomène et de la méthode dans les langues utiles.

Il doit privilégier les sources primaires : organismes publics, organismes de normalisation, universités, laboratoires, éditeurs scientifiques, associations professionnelles et documentation officielle des logiciels.

Les forums et discussions peuvent orienter la recherche, mais ne doivent pas constituer seuls une preuve de validation.

### 3.3 Cas où deux ou trois références publiques concordent

Si l'agent trouve deux ou trois références sérieuses et suffisamment indépendantes, donnant des résultats très proches, il peut classer le cas :

`VÉRIFIÉ – RÉFÉRENCES DOCUMENTAIRES`

Conditions :
- les hypothèses, unités, géométrie, matériaux, conditions aux limites et chargements sont identiques ou leurs différences sont explicitement corrigées ;
- les sources sont identifiables et accessibles ;
- les résultats comparés portent sur les mêmes grandeurs ;
- les écarts sont calculés et expliqués ;
- la tolérance est justifiée par la méthode, la précision des sources et la nature de la grandeur ;
- l'agent indique si les sources sont réellement indépendantes ou si elles reprennent une même référence.

**Ne pas imposer un seuil universel de 1 % ou 2 %.** Pour chaque cas, définir une tolérance absolue et/ou relative appropriée. Un écart faible n'est pas automatiquement une preuve de justesse si les hypothèses ne sont pas identiques.

Si ces conditions sont réunies, l'absence de comparaison avec un logiciel tiers ne doit pas empêcher le développement de continuer. Le logiciel affiche cependant une réserve de couverture de benchmark tant qu'une validation indépendante plus complète n'a pas été réalisée.

### 3.4 Contrôle manuel réalisé par l'IA

L'IA peut effectuer un contrôle manuel détaillé :
- réécrire les données et hypothèses ;
- montrer les formules et les étapes numériques ;
- vérifier les unités et les ordres de grandeur ;
- recalculer les résultats intermédiaires ;
- comparer avec le résultat du programme ;
- expliquer l'écart.

Ce contrôle doit être transparent et reproductible. L'IA ne doit pas prétendre qu'il s'agit d'une validation indépendante si elle utilise la même formule, les mêmes hypothèses ou le même raisonnement que le code testé.

Le programmeur ou responsable technique supervise les cas sensibles, vérifie les sources et décide de l'acceptation. Un contrôle généré par IA ne remplace pas une revue humaine compétente pour une fonction critique.

### 3.5 Si aucun benchmark fiable n'est trouvé

L'agent ne doit ni inventer une référence, ni conclure que le calcul est correct par défaut.

Il doit :
1. enregistrer les recherches effectuées et les mots-clés/langues utilisés ;
2. expliquer pourquoi les sources trouvées sont insuffisantes ;
3. proposer un cas de référence complet avec hypothèses explicites ;
4. demander à l'équipe si elle possède un livre, une norme, un guide, un exemple de cours, une note de calcul ou un fichier de modèle ;
5. si nécessaire, préparer un dossier de benchmark à reproduire dans un logiciel tiers ;
6. préciser le logiciel, la version, les paramètres et les sorties attendues ;
7. demander le fichier du modèle et la note de calcul exportée (PDF, DOCX ou autre format exploitable) ;
8. comparer les résultats après réception et consigner les écarts.

L'agent peut demander explicitement : « As-tu un guide CEREMA sur les fondations, un extrait de cours, un exemple de calcul de pieu ou une note de calcul de référence à déposer dans `REFERENTIEL_GC/04_GEOTECHNIQUE_FONDATIONS/` ? »

## 4. Signal de confiance affiché dans le logiciel

Le logiciel doit afficher un indicateur discret, informatif et non alarmiste. Il ne doit pas faire croire que tout est certifié, ni inquiéter inutilement l'utilisateur lorsque les vérifications disponibles sont sérieuses.

Exemples de libellés :

- **Contrôle documentaire effectué** — résultats comparés à des références identifiées.
- **Contrôle manuel effectué** — calcul intermédiaire revu et documenté.
- **Benchmark logiciel partiel** — comparaison avec un outil indépendant non encore réalisée.
- **Validation limitée au domaine documenté** — les cas couverts et les limites sont indiqués.

Exemple de mention en bas d'un rapport :

> Niveau de vérification : contrôle manuel et références documentaires disponibles. Les résultats ont été comparés aux cas de référence cités dans la documentation. La couverture des benchmarks indépendants reste partielle ; cette fonction ne doit pas être considérée comme validée pour tous les cas d'utilisation.

L'indicateur peut être jaune doux ou gris-jaune, non clignotant et non agressif. Il doit être accompagné d'un lien ou d'une section « Méthode de vérification » expliquant les preuves disponibles.

**Ne jamais afficher « validé à 100 % » ou un pourcentage global artificiel.** Préférer des niveaux de preuve et une liste de cas effectivement couverts.

## 5. Architecture obligatoire

Les responsabilités doivent être séparées, quelle que soit la technologie.

1. **Interface utilisateur** : saisie, visualisation, résultats, rapports.
2. **Couche métier** : objets, hypothèses, normes, combinaisons, paramètres, unités.
3. **Moteur de calcul** : équations, algorithmes, méthodes numériques.
4. **Moteur de vérification** : tests, benchmarks, références, tolérances.
5. **Traçabilité et documentation** : hypothèses, résultats, versions, preuves et rapports.

L'interface ne doit pas contenir les équations de calcul. Les moteurs doivent être testables sans lancer l'interface. Les dépendances circulaires et les variables globales partagées sont à éviter.

## 6. Recherche et choix des bibliothèques scientifiques

Avant de développer un solveur, l'IA doit rechercher les bibliothèques et moteurs éprouvés. Exemples à étudier selon le besoin :
- NumPy / SciPy : algèbre linéaire, matrices creuses, valeurs propres, optimisation et calcul scientifique.
- Code_Aster : éléments finis et mécanique des structures.
- OpenSees : simulation structurelle et géotechnique.
- FEniCSx : formulations éléments finis et équations aux dérivées partielles.
- CalculiX : analyse par éléments finis.
- Autres bibliothèques spécialisées selon le domaine.

Pour chaque outil envisagé, l'IA doit vérifier et consigner :
- domaine d'application et fonctions réellement couvertes ;
- version et activité de maintenance ;
- documentation et qualité des exemples ;
- cas de test ou benchmarks disponibles ;
- licence et obligations de redistribution/intégration commerciale ;
- compatibilité avec notre langage, architecture et environnement ;
- limites, hypothèses et risques d'utilisation.

Décision possible : `RÉUTILISER`, `ADAPTER`, `ENCAPSULER`, `UTILISER COMME RÉFÉRENCE`, `ÉCARTER` ou `DÉVELOPPER EN INTERNE`.

Si l'IA choisit une solution qui n'est pas la plus évidente, elle doit expliquer le choix dans `TECHNICAL_DECISIONS.md`. Si elle conserve un outil imparfait, elle doit documenter les limites et proposer les améliorations nécessaires. Aucune dépendance ne doit être intégrée sans vérification de licence.

## 7. Organisation centrale de la bibliothèque technique

Créer un dossier central, partagé entre les projets, nommé `REFERENTIEL_GC/`. Les projets doivent pointer vers ce référentiel et éviter de dupliquer les mêmes livres et documents.

```text
REFERENTIEL_GC/
├── 00_INDEX_ET_REGLES/
│   ├── README.md
│   ├── CATALOGUE_RESSOURCES.csv
│   ├── SOURCES_A_VERIFIER.md
│   └── DEMANDES_A_L_EQUIPE.md
├── 01_RDM_ET_ANALYSE_STRUCTURALE/
│   ├── Poutres/
│   ├── Portiques/
│   ├── Flambement/
│   ├── Elements_Finis/
│   └── Cas_Analytiques/
├── 02_BETON_ARME/
│   ├── Normes/
│   ├── Flexion/
│   ├── Effort_Tranchant/
│   ├── Poinconnement/
│   ├── Poteaux/
│   ├── Fondations/
│   └── Cas_References/
├── 03_CHARPENTE_METALLIQUE/
│   ├── Eurocode_3/
│   ├── Resistance_Sections/
│   ├── Flambement_Deversement/
│   ├── Assemblages/
│   └── Cas_References/
├── 04_GEOTECHNIQUE_FONDATIONS/
│   ├── Reconnaissances_Geotechniques/
│   ├── Semelles/
│   ├── Pieux/
│   ├── Tassements/
│   ├── Murs_Soutènement/
│   ├── Dalots_Ouvrages/
│   └── Cas_References/
├── 05_HYDRAULIQUE_ET_OUVRAGES/
├── 06_NORMES_ET_REGLEMENTS/
│   ├── Eurocodes/
│   ├── Annexes_Nationales/
│   ├── BAEL_CM66_Anciens_Reglements/
│   └── Reglements_Locaux/
├── 07_BENCHMARKS_LOGICIELS/
│   ├── Robot/
│   ├── CYPE/
│   ├── Graitec/
│   ├── SCIA/
│   ├── SAP2000/
│   ├── RFEM/
│   ├── Code_Aster/
│   └── OpenSees/
├── 08_BIBLIOTHEQUES_ET_OUTILS_OPEN_SOURCE/
│   ├── Calcul_Scientifique/
│   ├── Elements_Finis/
│   ├── Geometrie/
│   └── Licences_Et_Compatibilite/
├── 09_TUTORIELS_ET_EXEMPLES_PEDAGOGIQUES/
│   ├── Formules_Expliquees/
│   ├── Applications_Numeriques/
│   └── Guides_Utilisation/
├── 10_MODELES_ET_NOTES_DE_CALCUL/
│   ├── Notes_Internes/
│   ├── Notes_Logiciels_Tiers/
│   └── Cas_Reproduits/
└── 11_COMPOSANTS_LOGICIELS_COMMUNS/
    ├── Interface/
    ├── Gestion_Unités/
    ├── Rapports/
    └── Tests_Utilitaires/
```

Ne pas déposer un document dans un dossier uniquement parce que son titre contient un mot-clé. Lire son contenu ou ses métadonnées, identifier son domaine, sa version et son utilité, puis le classer. Conserver l'original et créer une fiche descriptive. Ne jamais remplacer un document original par un résumé IA.

## 8. Agent gestionnaire du référentiel

Un agent spécialisé doit maintenir `REFERENTIEL_GC/` :
- rechercher des ressources web fiables dans plusieurs langues ;
- proposer et enregistrer les liens dans les bons dossiers ;
- classer les documents fournis par l'équipe ;
- détecter les doublons et versions contradictoires ;
- tenir le catalogue et les fiches de ressources à jour ;
- demander à l'équipe les documents manquants ;
- relier chaque ressource à un domaine et à des projets qui peuvent l'utiliser.

L'agent ne doit pas télécharger ou redistribuer automatiquement des documents protégés. Il peut enregistrer la référence bibliographique et le lien officiel, puis demander à l'utilisateur de fournir légalement le fichier si nécessaire.

## 9. Dossier de documentation obligatoire dans chaque logiciel

Chaque projet logiciel doit contenir à sa racine :
- `STANDARD_DEVELOPPEMENT_LOGICIELS_GC.md` : copie ou lien vers le standard.
- `PROJECT_SCOPE.md` : périmètre et limites.
- `ARCHITECTURE.md` : architecture réelle du projet.
- `CHANGELOG.md` : historique des versions.
- `project_management/QUALITY_CHECKLIST.md` : contrôles et réserves.
- `project_management/KNOWN_LIMITATIONS.md` : limites connues.
- `project_management/TECHNICAL_DECISIONS.md` : décisions et dépendances.
- `docs/validation/` : fiches de validation par module.
- `docs/tutorial/` : tutoriel utilisateur et dossier pédagogique des calculs.

Lorsqu'un logiciel existe déjà, l'IA doit d'abord l'auditer. Elle ne doit pas imposer une réécriture complète. Elle décrit l'architecture existante, les écarts, les risques, puis propose une migration progressive.

## 10. Tutoriel et transparence intégrés au logiciel

Tout logiciel de calcul destiné à des utilisateurs doit comporter, selon son périmètre, deux espaces pédagogiques.

### A. Tutoriel d'utilisation
- démarrage rapide ;
- description des champs et unités ;
- exemple complet pas à pas ;
- lecture des résultats et avertissements ;
- export et archivage d'un calcul ;
- limites d'utilisation.

### B. Comprendre le calcul
Pour chaque module important :
- principe physique ;
- hypothèses et domaine de validité ;
- formules utilisées et signification des symboles ;
- références normatives avec édition et paragraphes lorsque disponibles ;
- application numérique détaillée ;
- résultats intermédiaires ;
- cas de référence permettant une vérification rapide ;
- limites et cas non couverts.

Exemple : un module de flambement explique la longueur efficace, les conditions d'appui, la charge critique, les paramètres normatifs et présente un exemple numérique que l'utilisateur peut recalculer à la main.

Le tutoriel ne doit pas inventer ou simplifier abusivement une exigence normative. Si un texte normatif n'est pas disponible ou si son usage est soumis à licence, citer précisément la référence et demander à l'équipe de fournir l'extrait autorisé.

## 11. Fiche de validation obligatoire par module important

Créer une fiche dans `docs/validation/` :

```markdown
# FICHE DE VALIDATION — [Module]
Projet :
Module :
Version du logiciel :
Version du moteur :
Responsable :
Date :
Norme / méthode :
Domaine couvert :

## Hypothèses et limites
- Géométrie :
- Matériaux :
- Appuis / conditions aux limites :
- Charges :
- Combinaisons :
- Hypothèses :
- Cas non couverts :

## Sources documentaires
| Référence | Auteur/organisme | Année/version | Langue | Lien/fichier | Fiabilité | Hypothèses du cas |
|---|---|---|---|---|---|---|

## Comparaison des résultats
| Cas | Grandeur | Référence 1 | Référence 2 | Référence 3 | Notre logiciel | Écart | Tolérance | Statut |
|---|---|---:|---:|---:|---:|---:|---:|---|

## Contrôle manuel
- Formules et étapes :
- Calcul intermédiaire :
- Vérification des unités :
- Relecture humaine :
- Réserves :

## Benchmark logiciel tiers (si disponible)
- Logiciel et version :
- Fichier de modèle :
- Note de calcul :
- Hypothèses identiques vérifiées :
- Écarts et explications :

## Niveau de preuve
- [ ] Contrôle de cohérence élémentaire
- [ ] Contrôle manuel documenté
- [ ] Références documentaires concordantes
- [ ] Comparaison à un outil indépendant
- [ ] Revue humaine compétente
- [ ] Domaine de validité clairement défini

## Réserves et actions
| Réserve | Criticité | Impact | Action | Responsable | Échéance |
|---|---|---|---|---|---|

## Conclusion
Statut :
Domaine validé ou vérifié :
Limites d'utilisation :
Mention à afficher dans le logiciel :
```

## 12. Si un benchmark public manque : procédure de reproduction externe

L'agent prépare un « dossier de reproduction » comprenant :
- cas de calcul et objectif ;
- géométrie et unités ;
- propriétés des matériaux ;
- conditions aux limites et relâchements ;
- chargements et combinaisons ;
- hypothèses et norme ;
- résultats à extraire ;
- tolérances proposées et justification.

Il demande ensuite à l'équipe de reproduire le cas dans un logiciel disponible (Robot, CYPECAD, Graitec, SCIA, SAP2000, RFEM ou autre adapté), puis de fournir :
- le fichier natif du modèle si possible ;
- la note de calcul exportée ;
- les tableaux de résultats ;
- le nom et la version du logiciel ;
- les paramètres de calcul.

L'agent compare les résultats seulement après avoir vérifié que les principes et hypothèses sont identiques. Toute différence de modèle doit être signalée, pas masquée.

## 13. Application à nos projets

| Projet | Contrôles prioritaires |
|---|---|
| Robot Extractor Core | Exactitude des efforts, combinaisons, repères locaux/globaux, unités, signes et traçabilité des cas de charge. |
| Robot Forces Viewer | Comparaison avec les données sources Robot sur cas connus, filtres et enveloppes. |
| Robot Error Doctor | Chaque diagnostic lié à une règle technique ou une source documentée. |
| Assistant calcul dalot | Cas de référence indépendants, charges, sol, appuis, combinaisons et hypothèses. |
| Pré-dimensionnement BA | Formules, normes, matériaux, unités, dispositions constructives et limites. |
| Calcul de pieux | Modèles géotechniques, données de reconnaissance, méthodes et cas de référence. |
| Laboratoire Numérique GC | Architecture commune, composants réutilisables, tests, gestion des unités et bibliothèque documentaire. |

## 14. Instructions obligatoires pour l'IA développeuse

1. Lire ce standard avant toute intervention importante.
2. Examiner l'application existante avant de proposer une refonte.
3. Chercher les ressources de benchmark dans plusieurs langues.
4. Privilégier les sources primaires et documenter les références.
5. Vérifier les hypothèses avant toute comparaison.
6. Rechercher les bibliothèques éprouvées et contrôler licences, versions, couverture et limites.
7. Ne jamais inventer formule, référence normative, tolérance ou propriété matériau.
8. Signaler immédiatement les éléments incertains et demander au programmeur superviseur une décision.
9. Effectuer les contrôles manuels possibles et montrer les étapes.
10. Créer ou actualiser la fiche de validation et la checklist.
11. Continuer le développement si les réserves ne rendent pas la fonction dangereuse à utiliser ; conserver les statuts visibles.
12. Ne jamais masquer un échec, supprimer un avertissement ou revendiquer une validation non démontrée.
13. Mettre à jour tutoriel, références et limites lorsque le calcul évolue.

## 15. Maturité interne

Ces statuts sont des repères internes, pas des certifications :
1. Prototype.
2. Contrôlé manuellement.
3. Vérifié sur références documentaires identifiées.
4. Comparé à un outil indépendant.
5. Revu techniquement et validé dans un domaine défini.
6. Prêt pour un usage professionnel dans le périmètre explicitement documenté.

Ne jamais annoncer certification, homologation ou reconnaissance officielle sans procédure et preuve correspondantes.

## 16. Règle finale

Nous ne cherchons pas seulement à créer des applications qui affichent des résultats. Nous voulons des logiciels dont les résultats peuvent être expliqués, vérifiés, reproduits et défendus techniquement.

**Développer vite, oui. Développer à l'aveugle, non.**
