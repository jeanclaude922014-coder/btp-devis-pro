# Journal des sessions — Bibliothécaire Technique GC

## Session 1 — 2026-11-08 — Initialisation du référentiel
**Responsable :** Moulo Jean Claude — **Agent :** Bibliothécaire Technique GC

### Travaux réalisés
- Lecture intégrale de `STANDARD_DEVELOPPEMENT_LOGICIELS_GC.md` (STD-GC-001 v2.0), `AGENT_GESTIONNAIRE_REFERENTIEL_GC.md` et des `README.md`.
- Intégration du pack `REFERENTIEL_GC` dans le dépôt `btp-devis-pro`. L'arborescence (12 dossiers principaux, 51 sous-dossiers vides) est conservée telle que livrée.
- Ajout de `.gitkeep` dans les dossiers vides et d'un `README.md` dans chaque dossier principal.
- Création de l'inventaire, du plan de recherche et de ce journal.
- Recherches web en anglais, français, espagnol et allemand : Eurocodes JRC, Cerema, IRD/ORSTOM, FHWA, PIARC, TRL, JICA, éditeurs (Autodesk, SCIA, CSI, CYPE, Dlubal, Graitec), projets open source, NAFEMS, MIT OCW.

### Vérification des liens
- **31 URL candidates testées.** 24 ont été ouvertes et leur contenu lu (titre, organisme, édition et pages relevés sur le document) : elles sont inscrites au catalogue sous GC-0001 à GC-0024.
- 6 URL sont restées inaccessibles : maintenance IRD (2 liens), certificat TLS expiré sur trl.co.uk, redirections vers des hôtes non autorisés (CSI, steelconstruction.info), notice ROSA P du DOT américain (403). Une variante d'URL GitHub erronée (404) a été corrigée. Les pistes non confirmées sont dans `SOURCES_A_VERIFIER.md`.
- Aucun contournement TLS n'a été effectué et aucune copie non officielle (Scribd, Issuu) n'a été retenue.

### Doublons ou contradictions détectés
- Le dossier `Gestion_Unités` est nommé avec un accent dans le standard, mais `Gestion_Unites` sans accent dans le pack. Il n'a pas été renommé : décision attendue.
- Pour les cas tests code_aster, le site officiel annonce 4600 cas, des sources secondaires en citent 3500 ou 2300. Le chiffre retenu est celui du site officiel, à la date de consultation.
- La note Sétra OA n°30 (2008) contient des dispositions provisoires, probablement remplacées par NF P94-261/262 : elle est classée comme document historique.

### Demandes à l'équipe
D-01 à D-12 (voir `DEMANDES_A_L_EQUIPE.md`). Les demandes P0 portent sur le BAEL 91 révisé 99, une note de calcul de dalot, les charges routières, l'hydrologie ouest-africaine et un premier benchmark Robot.

### Lacunes P0/P1
BAEL, dalots, hydrologie ouest-africaine, notes de calcul de référence (P0). Géotechnique NF P94-261/262, sols latéritiques, EC3, cadre normatif ivoirien (P1).

### Prochaines actions
Voir `PLAN_DE_RECHERCHE.md` (R-01 à R-10).

### Hors périmètre respecté
Aucun fichier de l'application `btp-devis-pro` (src/, prisma/, outils/, scripts/) n'a été modifié.

## Session 1 (suite) — 2026-11-08 — Standard à la racine du projet
- Sur demande de Moulo Jean Claude, `STANDARD_DEVELOPPEMENT_LOGICIELS_GC.md` (STD-GC-001 v2.0) a été copié à la racine du projet `btp-devis-pro`, conformément au § 9 du standard.
- La copie est identique à l'original. **La version de référence reste `REFERENTIEL_GC/STANDARD_DEVELOPPEMENT_LOGICIELS_GC.md`** : toute évolution du standard doit y être faite, puis recopiée à la racine.
