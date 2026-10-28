/**
 * Données d'entrée d'une étude de dalot : registre des champs (libellé, unité, valeur par
 * défaut, obligatoire), bibliothèque de sols et conversion vers une entrée typée.
 *
 * Principe : une donnée obligatoire absente bloque le calcul ; une valeur par défaut reste
 * signalée « à confirmer » tant que l'utilisateur ne l'a pas validée, et elle est listée
 * dans la note de calcul.
 */

export type FieldValue = number | string | boolean | null;

export type SectionId =
  | "general"
  | "geometrie"
  | "remblai"
  | "materiaux"
  | "sol"
  | "convois"
  | "tetes"
  | "talus"
  | "hydro";

export type FieldDef = {
  key: string;
  section: SectionId;
  group: string;
  label: string;
  unit?: string;
  kind: "number" | "text" | "select" | "bool";
  options?: { value: string; label: string }[];
  /** Valeur proposée par défaut. `undefined` = aucune, la saisie est attendue. */
  default?: FieldValue;
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
  help?: string;
  /** Champ affiché seulement si la condition est vraie. */
  visibleIf?: (v: Record<string, FieldValue>) => boolean;
};

export type SoilPreset = {
  id: string;
  label: string;
  gamma: number; // kN/m³
  phi: number; // degrés
  c: number; // kPa
  ks: number; // kN/m³ (module de réaction)
  Es: number; // MPa
  qadm: number; // MPa (contrainte admissible ELS indicative)
};

/** Sols de référence (valeurs indicatives, à remplacer par celles de l'étude géotechnique). */
export const SOIL_PRESETS: SoilPreset[] = [
  { id: "laterite_compacte", label: "Latérite compactée (grave latéritique)", gamma: 20, phi: 32, c: 15, ks: 60000, Es: 40, qadm: 0.25 },
  { id: "argile_lateritique", label: "Argile latéritique raide", gamma: 19, phi: 25, c: 25, ks: 35000, Es: 20, qadm: 0.18 },
  { id: "sable_argileux", label: "Sable argileux moyennement dense", gamma: 18.5, phi: 28, c: 5, ks: 30000, Es: 15, qadm: 0.15 },
  { id: "sable_lagunaire", label: "Sable lagunaire lâche (zone littorale)", gamma: 18, phi: 26, c: 0, ks: 15000, Es: 8, qadm: 0.08 },
  { id: "argile_molle", label: "Argile molle / vase de bas-fond", gamma: 16.5, phi: 10, c: 15, ks: 8000, Es: 3, qadm: 0.05 },
  { id: "rocher_altere", label: "Rocher altéré (arène granitique)", gamma: 21, phi: 35, c: 30, ks: 120000, Es: 100, qadm: 0.4 },
];

const yes = (k: string) => (v: Record<string, FieldValue>) => v[k] === true;

export const FIELDS: FieldDef[] = [
  // ── Données générales ─────────────────────────────────────
  { key: "projet", section: "general", group: "Identification", label: "Intitulé du projet", kind: "text", required: true, default: "Dalot double 2 × (2,00 × 1,50)" },
  { key: "dossier", section: "general", group: "Identification", label: "N° de dossier", kind: "text", default: "DP-001" },
  { key: "ouvrage", section: "general", group: "Identification", label: "Repère de l'ouvrage", kind: "text", default: "OH-01 (PK 0+000)" },
  { key: "localisation", section: "general", group: "Identification", label: "Localisation", kind: "text", default: "Abidjan, Côte d'Ivoire" },
  { key: "maitreOuvrage", section: "general", group: "Identification", label: "Maître d'ouvrage", kind: "text", default: "AGEROUTE" },
  { key: "maitreOeuvre", section: "general", group: "Identification", label: "Maître d'œuvre / Contrôle", kind: "text", default: "BNETD" },
  { key: "auteur", section: "general", group: "Identification", label: "Auteur de la note", kind: "text", default: "Moulo Jean Claude" },
  { key: "indice", section: "general", group: "Identification", label: "Indice de révision", kind: "text", default: "A" },

  // ── Hydrologie et hydraulique ─────────────────────────────
  { key: "hyActif", section: "hydro", group: "Étude hydraulique", label: "Justifier la capacité hydraulique de l'ouvrage", kind: "bool", default: true },
  { key: "hyMethode", section: "hydro", group: "Débit de crue de projet", label: "Origine du débit de projet", kind: "select", default: "rationnelle", options: [
    { value: "rationnelle", label: "Méthode rationnelle (Kirpich + Montana)" }, { value: "impose", label: "Débit imposé (étude hydrologique externe)" },
  ], visibleIf: yes("hyActif") },
  { key: "hyQ", section: "hydro", group: "Débit de crue de projet", label: "Débit de projet Qp imposé", unit: "m³/s", kind: "number", default: 10, min: 0.01, max: 2000, visibleIf: (v) => v.hyActif === true && v.hyMethode === "impose" },
  { key: "hyT", section: "hydro", group: "Débit de crue de projet", label: "Période de retour", unit: "ans", kind: "number", default: 10, min: 2, max: 100, visibleIf: yes("hyActif"), help: "10 ans pour une voie secondaire, 25 à 50 ans pour une route nationale." },
  { key: "hyA", section: "hydro", group: "Bassin versant", label: "Superficie du bassin versant A", unit: "km²", kind: "number", default: 1.2, min: 0.001, max: 500, required: true, visibleIf: (v) => v.hyActif === true && v.hyMethode !== "impose" },
  { key: "hyL", section: "hydro", group: "Bassin versant", label: "Longueur du plus long talweg L", unit: "km", kind: "number", default: 1.7, min: 0.01, max: 100, required: true, visibleIf: (v) => v.hyActif === true && v.hyMethode !== "impose" },
  { key: "hyDH", section: "hydro", group: "Bassin versant", label: "Dénivelée point haut / exutoire ΔH", unit: "m", kind: "number", default: 32, min: 0.5, max: 2000, required: true, visibleIf: (v) => v.hyActif === true && v.hyMethode !== "impose" },
  { key: "hyC", section: "hydro", group: "Bassin versant", label: "Coefficient de ruissellement C", kind: "number", default: 0.3, min: 0.05, max: 1, step: 0.01, required: true, visibleIf: (v) => v.hyActif === true && v.hyMethode !== "impose" },
  { key: "hyMa", section: "hydro", group: "Pluie de projet (Montana I = a/t^b)", label: "Coefficient a", kind: "number", default: 350, min: 10, max: 3000, visibleIf: (v) => v.hyActif === true && v.hyMethode !== "impose", help: "Valeurs par défaut : station de Man, T = 10 ans (à recaler sur les séries ASECNA ou les abaques CIEH/ORSTOM)." },
  { key: "hyMb", section: "hydro", group: "Pluie de projet (Montana I = a/t^b)", label: "Coefficient b", kind: "number", default: 0.38, min: 0.1, max: 1, step: 0.01, visibleIf: (v) => v.hyActif === true && v.hyMethode !== "impose" },
  { key: "hyK", section: "hydro", group: "Écoulement dans l'ouvrage", label: "Coefficient de Strickler K", kind: "number", default: 70, min: 20, max: 100, visibleIf: yes("hyActif"), help: "70 pour un radier en béton lisse." },
  { key: "hyI", section: "hydro", group: "Écoulement dans l'ouvrage", label: "Pente longitudinale du radier", unit: "%", kind: "number", default: 0.6, min: 0.05, max: 10, step: 0.05, visibleIf: yes("hyActif") },
  { key: "hyRevPct", section: "hydro", group: "Critères", label: "Revanche minimale (% de la hauteur libre)", unit: "%", kind: "number", default: 25, min: 0, max: 50, visibleIf: yes("hyActif") },
  { key: "hyRevMin", section: "hydro", group: "Critères", label: "Revanche minimale absolue", unit: "m", kind: "number", default: 0.2, min: 0, max: 1, step: 0.05, visibleIf: yes("hyActif") },
  { key: "hyVadm", section: "hydro", group: "Critères", label: "Vitesse admissible du lit non protégé", unit: "m/s", kind: "number", default: 2, min: 0.3, max: 6, step: 0.1, visibleIf: yes("hyActif") },
  { key: "hyProtection", section: "hydro", group: "Critères", label: "Protection aval prévue (avant-radier, perré, enrochement)", kind: "bool", default: true, visibleIf: yes("hyActif") },

  // ── Géométrie ─────────────────────────────────────────────
  { key: "nCells", section: "geometrie", group: "Cellules", label: "Nombre de cellules", kind: "number", default: 2, required: true, min: 1, max: 6, step: 1, help: "Ouvrage multicellulaire : même ouverture pour toutes les cellules, sauf saisie de la ligne suivante." },
  { key: "opening", section: "geometrie", group: "Cellules", label: "Ouverture libre d'une cellule", unit: "m", kind: "number", default: 2, required: true, min: 0.5, max: 6, step: 0.05 },
  { key: "openings", section: "geometrie", group: "Cellules", label: "Ouvertures si les cellules diffèrent", unit: "m", kind: "text", default: "", help: "Une valeur par cellule, séparées par « ; » (ex. 2 ; 2,5 ; 2). Laisser vide si identiques." },
  { key: "hInt", section: "geometrie", group: "Cellules", label: "Hauteur libre intérieure", unit: "m", kind: "number", default: 1.5, required: true, min: 0.5, max: 5, step: 0.05 },
  { key: "es", section: "geometrie", group: "Épaisseurs", label: "Épaisseur de la dalle supérieure", unit: "m", kind: "number", default: 0.3, required: true, min: 0.15, max: 1, step: 0.01 },
  { key: "er", section: "geometrie", group: "Épaisseurs", label: "Épaisseur du radier", unit: "m", kind: "number", default: 0.25, required: true, min: 0.15, max: 1, step: 0.01 },
  { key: "eExt", section: "geometrie", group: "Épaisseurs", label: "Épaisseur des piédroits extérieurs", unit: "m", kind: "number", default: 0.25, required: true, min: 0.15, max: 1, step: 0.01 },
  { key: "eInt", section: "geometrie", group: "Épaisseurs", label: "Épaisseur des piédroits intermédiaires", unit: "m", kind: "number", default: 0.25, required: true, min: 0.15, max: 1, step: 0.01, visibleIf: (v) => Number(v.nCells) > 1 },
  { key: "gousset", section: "geometrie", group: "Épaisseurs", label: "Goussets (côté)", unit: "m", kind: "number", default: 0.1, min: 0, max: 0.4, step: 0.05, help: "Goussets intérieurs à 45°. Pris en compte dans les plans et le métré (sécuritaire : négligés dans le modèle)." },
  { key: "L", section: "geometrie", group: "Longueur", label: "Longueur de l'ouvrage (entre têtes)", unit: "m", kind: "number", default: 8, required: true, min: 1, max: 60, step: 0.1 },

  // ── Remblai et chaussée ───────────────────────────────────
  { key: "hr", section: "remblai", group: "Couverture", label: "Hauteur de remblai sur la dalle", unit: "m", kind: "number", default: 1, required: true, min: 0, max: 15, step: 0.05 },
  { key: "ech", section: "remblai", group: "Couverture", label: "Épaisseur de chaussée", unit: "m", kind: "number", default: 0.1, min: 0, max: 0.6, step: 0.01 },
  { key: "gammaR", section: "remblai", group: "Couverture", label: "Poids volumique du remblai", unit: "kN/m³", kind: "number", default: 20, required: true, min: 14, max: 23 },
  { key: "gammaCh", section: "remblai", group: "Couverture", label: "Poids volumique de la chaussée", unit: "kN/m³", kind: "number", default: 24, min: 18, max: 26 },
  { key: "Kmax", section: "remblai", group: "Poussée des terres", label: "Coefficient de poussée maximal Kmax", kind: "number", default: 0.5, required: true, min: 0.1, max: 1, step: 0.01, help: "Guide SETRA PICF : poussée des terres encadrée entre 0,25 et 0,50." },
  { key: "Kmin", section: "remblai", group: "Poussée des terres", label: "Coefficient de poussée minimal Kmin", kind: "number", default: 0.25, required: true, min: 0.05, max: 1, step: 0.01 },
  { key: "qRemblai", section: "remblai", group: "Poussée des terres", label: "Surcharge sur remblai (trafic)", unit: "kN/m²", kind: "number", default: 10, min: 0, max: 30 },
  { key: "Lr", section: "remblai", group: "Chaussée portée", label: "Largeur roulable", unit: "m", kind: "number", default: 7, required: true, min: 3, max: 30, step: 0.1 },
  { key: "Lc", section: "remblai", group: "Chaussée portée", label: "Largeur chargeable", unit: "m", kind: "number", default: 7, required: true, min: 3, max: 30, step: 0.1, help: "Largeur roulable diminuée de 0,50 m par dispositif de retenue." },
  { key: "classePont", section: "remblai", group: "Chaussée portée", label: "Classe du pont (Fascicule 61)", kind: "select", default: "auto", options: [
    { value: "auto", label: "Automatique (selon Lr)" }, { value: "1", label: "1re classe" }, { value: "2", label: "2e classe" }, { value: "3", label: "3e classe" },
  ] },

  // ── Matériaux et hypothèses ───────────────────────────────
  { key: "fc28", section: "materiaux", group: "Béton", label: "Résistance caractéristique fc28", unit: "MPa", kind: "number", default: 25, required: true, min: 20, max: 40 },
  { key: "gammaBA", section: "materiaux", group: "Béton", label: "Poids volumique du béton armé", unit: "kN/m³", kind: "number", default: 25, min: 23, max: 26 },
  { key: "fe", section: "materiaux", group: "Aciers", label: "Nuance des aciers HA", unit: "MPa", kind: "select", default: "400", required: true, options: [
    { value: "400", label: "FeE 400" }, { value: "500", label: "FeE 500" },
  ] },
  { key: "cover", section: "materiaux", group: "Aciers", label: "Enrobage des armatures", unit: "m", kind: "number", default: 0.04, required: true, min: 0.02, max: 0.08, step: 0.005, help: "4 cm recommandés pour un ouvrage hydraulique enterré en milieu tropical humide." },
  { key: "fissuration", section: "materiaux", group: "Aciers", label: "Fissuration (BAEL A.4.5)", kind: "select", default: "prejudiciable", required: true, options: [
    { value: "prejudiciable", label: "Préjudiciable" }, { value: "tres_prejudiciable", label: "Très préjudiciable" },
  ] },
  { key: "wkMax", section: "materiaux", group: "Contrôle Eurocode 2", label: "Ouverture de fissure limite wmax", unit: "mm", kind: "number", default: 0.3, min: 0.1, max: 0.4, step: 0.05, help: "EC2 tableau 7.1N, classe XC2 (humide, rarement sec)." },

  // ── Sol de fondation ──────────────────────────────────────
  { key: "soilPreset", section: "sol", group: "Sol de fondation", label: "Sol de référence", kind: "select", default: "laterite_compacte", options: SOIL_PRESETS.map((s) => ({ value: s.id, label: s.label })), help: "Remplit les caractéristiques ci-dessous ; elles restent modifiables." },
  { key: "modeleSol", section: "sol", group: "Sol de fondation", label: "Modèle d'appui du radier", kind: "select", default: "winkler", required: true, options: [
    { value: "winkler", label: "Sol élastique (Winkler)" }, { value: "lineaire", label: "Radier rigide, réaction linéaire" },
  ] },
  { key: "ks", section: "sol", group: "Sol de fondation", label: "Module de réaction ks", unit: "kN/m³", kind: "number", default: 60000, required: true, min: 1000, max: 500000, visibleIf: (v) => v.modeleSol === "winkler" },
  { key: "gammaSol", section: "sol", group: "Sol de fondation", label: "Poids volumique du sol", unit: "kN/m³", kind: "number", default: 20, required: true, min: 14, max: 23 },
  { key: "phiSol", section: "sol", group: "Sol de fondation", label: "Angle de frottement φ'", unit: "°", kind: "number", default: 32, required: true, min: 0, max: 45 },
  { key: "cSol", section: "sol", group: "Sol de fondation", label: "Cohésion c'", unit: "kPa", kind: "number", default: 15, required: true, min: 0, max: 200 },
  { key: "EsSol", section: "sol", group: "Sol de fondation", label: "Module de déformation du sol", unit: "MPa", kind: "number", default: 40, min: 1, max: 500 },
  { key: "nuSol", section: "sol", group: "Sol de fondation", label: "Coefficient de Poisson du sol", kind: "number", default: 0.3, min: 0.1, max: 0.5, step: 0.05 },
  { key: "qadm", section: "sol", group: "Sol de fondation", label: "Contrainte admissible ELS (étude géotechnique)", unit: "MPa", kind: "number", default: 0.25, min: 0, max: 2, step: 0.01, help: "Laisser vide pour n'utiliser que la portance calculée (Terzaghi)." },
  { key: "Df", section: "sol", group: "Sol de fondation", label: "Ancrage du radier sous le terrain naturel", unit: "m", kind: "number", default: 0.3, min: 0, max: 5, step: 0.05 },
  { key: "tassementMax", section: "sol", group: "Sol de fondation", label: "Tassement admissible", unit: "cm", kind: "number", default: 2.5, min: 0.5, max: 10, step: 0.5 },
  { key: "nappe", section: "sol", group: "Eau", label: "Nappe phréatique ou crue au-dessus du radier", kind: "bool", default: false },
  { key: "hw", section: "sol", group: "Eau", label: "Hauteur d'eau au-dessus de la sous-face du radier", unit: "m", kind: "number", default: 1, min: 0, max: 20, step: 0.05, visibleIf: yes("nappe") },

  // ── Convois ───────────────────────────────────────────────
  { key: "cv_A", section: "convois", group: "Fascicule 61 titre II — charges civiles", label: "Système A(l)", kind: "bool", default: true },
  { key: "cv_Bc", section: "convois", group: "Fascicule 61 titre II — charges civiles", label: "Système Bc (camions 30 t)", kind: "bool", default: true },
  { key: "cv_Bt", section: "convois", group: "Fascicule 61 titre II — charges civiles", label: "Système Bt (tandems 32 t)", kind: "bool", default: true },
  { key: "cv_Br", section: "convois", group: "Fascicule 61 titre II — charges civiles", label: "Système Br (roue isolée 10 t)", kind: "bool", default: true },
  { key: "cv_Mc80", section: "convois", group: "Charges militaires", label: "Mc80 (char 72 t)", kind: "bool", default: false },
  { key: "cv_Mc120", section: "convois", group: "Charges militaires", label: "Mc120 (char 110 t)", kind: "bool", default: true },
  { key: "cv_Me80", section: "convois", group: "Charges militaires", label: "Me80 (essieux 2 × 22 t)", kind: "bool", default: false },
  { key: "cv_Me120", section: "convois", group: "Charges militaires", label: "Me120 (essieux 2 × 33 t)", kind: "bool", default: false },
  { key: "cv_D240", section: "convois", group: "Convois exceptionnels", label: "D240 (240 t)", kind: "bool", default: false },
  { key: "cv_custom", section: "convois", group: "Convoi personnalisé", label: "Convoi régional / personnalisé", kind: "bool", default: false },
  { key: "customName", section: "convois", group: "Convoi personnalisé", label: "Nom du convoi", kind: "text", default: "Convoi régional", visibleIf: yes("cv_custom") },
  { key: "customAxles", section: "convois", group: "Convoi personnalisé", label: "Essieux : charge (kN) ; distance à l'essieu précédent (m)", kind: "text", default: "60;0 / 120;4,5 / 120;1,5", visibleIf: yes("cv_custom"), help: "Essieux séparés par « / ». Chaque essieu : charge totale ; distance à l'essieu précédent." },
  { key: "customVoie", section: "convois", group: "Convoi personnalisé", label: "Entraxe des roues d'un essieu", unit: "m", kind: "number", default: 2, visibleIf: yes("cv_custom") },
  { key: "customRoue", section: "convois", group: "Convoi personnalisé", label: "Empreinte d'une roue (carré de côté)", unit: "m", kind: "number", default: 0.25, visibleIf: yes("cv_custom") },
  { key: "customGammaU", section: "convois", group: "Convoi personnalisé", label: "Coefficient ELU du convoi", kind: "number", default: 1.605, visibleIf: yes("cv_custom") },
  { key: "customGammaS", section: "convois", group: "Convoi personnalisé", label: "Coefficient ELS du convoi", kind: "number", default: 1.2, visibleIf: yes("cv_custom") },
  { key: "tanDiff", section: "convois", group: "Diffusion et balayage", label: "Pente de diffusion dans le remblai (tan θ)", kind: "number", default: 1, min: 0.3, max: 1, step: 0.05, help: "1,0 = diffusion à 45° ; 0,5 = diffusion 1H/2V, plus sécuritaire." },
  { key: "pas", section: "convois", group: "Diffusion et balayage", label: "Pas de déplacement des convois", unit: "m", kind: "number", default: 0.1, min: 0.05, max: 0.5, step: 0.05 },

  // ── Ouvrages de tête ──────────────────────────────────────
  { key: "teteMurs", section: "tetes", group: "Murs en aile", label: "Murs en aile", kind: "bool", default: true },
  { key: "aileAngle", section: "tetes", group: "Murs en aile", label: "Angle des murs en aile / axe de l'ouvrage", unit: "°", kind: "number", default: 30, min: 0, max: 90, visibleIf: yes("teteMurs") },
  { key: "aileLong", section: "tetes", group: "Murs en aile", label: "Longueur d'un mur en aile", unit: "m", kind: "number", default: 2.5, min: 0.5, max: 10, step: 0.1, visibleIf: yes("teteMurs") },
  { key: "aileEp", section: "tetes", group: "Murs en aile", label: "Épaisseur du voile", unit: "m", kind: "number", default: 0.25, min: 0.15, max: 0.6, step: 0.01, visibleIf: yes("teteMurs") },
  { key: "aileSemelle", section: "tetes", group: "Murs en aile", label: "Largeur de la semelle", unit: "m", kind: "number", default: 2.4, min: 0.5, max: 5, step: 0.05, visibleIf: yes("teteMurs") },
  { key: "aileSemEp", section: "tetes", group: "Murs en aile", label: "Épaisseur de la semelle", unit: "m", kind: "number", default: 0.3, min: 0.2, max: 1, step: 0.05, visibleIf: yes("teteMurs") },
  { key: "aileTalon", section: "tetes", group: "Murs en aile", label: "Débord avant de la semelle (patin)", unit: "m", kind: "number", default: 0.4, min: 0, max: 2, step: 0.05, visibleIf: yes("teteMurs") },
  { key: "aileBeche", section: "tetes", group: "Murs en aile", label: "Bêche d'ancrage sous semelle (hauteur)", unit: "m", kind: "number", default: 0.4, min: 0, max: 1.5, step: 0.05, visibleIf: yes("teteMurs"), help: "Mobilise la butée devant la semelle (prise à 50 %). 0 = pas de bêche." },
  { key: "murTeteEp", section: "tetes", group: "Mur de tête", label: "Épaisseur du mur de tête", unit: "m", kind: "number", default: 0.2, min: 0.15, max: 0.5, step: 0.01 },
  { key: "murTeteRevanche", section: "tetes", group: "Mur de tête", label: "Revanche au-dessus de la chaussée", unit: "m", kind: "number", default: 0.2, min: 0, max: 1, step: 0.05 },
  { key: "radierTeteLong", section: "tetes", group: "Radiers de tête et bêches", label: "Longueur des radiers de tête", unit: "m", kind: "number", default: 1.5, min: 0, max: 5, step: 0.1 },
  { key: "becheProf", section: "tetes", group: "Radiers de tête et bêches", label: "Profondeur des bêches parafouilles", unit: "m", kind: "number", default: 0.8, min: 0, max: 3, step: 0.05 },
  { key: "becheEp", section: "tetes", group: "Radiers de tête et bêches", label: "Épaisseur des bêches", unit: "m", kind: "number", default: 0.25, min: 0.15, max: 0.6, step: 0.01 },
  { key: "guideRoues", section: "tetes", group: "Équipements", label: "Guide-roues sur murs de tête", kind: "bool", default: true },

  // ── Talus du remblai ──────────────────────────────────────
  { key: "talusActif", section: "talus", group: "Stabilité du remblai d'accès", label: "Vérifier la stabilité du talus (Fellenius)", kind: "bool", default: true },
  { key: "talusPente", section: "talus", group: "Stabilité du remblai d'accès", label: "Fruit du talus (horizontal pour 1 vertical)", kind: "number", default: 1.5, min: 0.5, max: 4, step: 0.1, visibleIf: yes("talusActif") },
  { key: "talusPhi", section: "talus", group: "Stabilité du remblai d'accès", label: "φ' du remblai", unit: "°", kind: "number", default: 30, min: 10, max: 45, visibleIf: yes("talusActif") },
  { key: "talusC", section: "talus", group: "Stabilité du remblai d'accès", label: "Cohésion c' du remblai", unit: "kPa", kind: "number", default: 10, min: 0, max: 100, visibleIf: yes("talusActif") },
];

export const FIELD_BY_KEY: Record<string, FieldDef> = Object.fromEntries(FIELDS.map((f) => [f.key, f]));

/** État persisté d'une étude. */
export type DalotSpec = {
  version: 1;
  values: Record<string, FieldValue>;
  /** Clés dont la valeur provient du défaut et n'a pas encore été confirmée. */
  defaulted: string[];
  /** Ferraillage imposé : groupe → { Ø (mm), espacement (m) }. */
  imposed: Record<string, { phi: number; s: number } | undefined>;
};

export function defaultSpec(name?: string): DalotSpec {
  const values: Record<string, FieldValue> = {};
  const defaulted: string[] = [];
  for (const f of FIELDS) {
    values[f.key] = f.default ?? null;
    if (f.default !== undefined && f.kind !== "bool" && f.section !== "general") defaulted.push(f.key);
  }
  if (name) values.projet = name;
  return { version: 1, values, defaulted, imposed: {} };
}

/** Normalise une spec chargée (ajoute les champs apparus depuis sa création). */
export function normalizeSpec(raw: unknown): DalotSpec {
  const base = defaultSpec();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Partial<DalotSpec>;
  const values = { ...base.values, ...(r.values ?? {}) };
  const known = new Set(Object.keys(r.values ?? {}));
  const defaulted = Array.from(
    new Set([...(r.defaulted ?? []), ...base.defaulted.filter((k) => !known.has(k))])
  );
  return { version: 1, values, defaulted, imposed: r.imposed ?? {} };
}

export function isVisible(f: FieldDef, values: Record<string, FieldValue>) {
  return !f.visibleIf || f.visibleIf(values);
}

/** Données obligatoires manquantes (visibles uniquement). */
export function missingFields(values: Record<string, FieldValue>): FieldDef[] {
  return FIELDS.filter((f) => {
    if (!f.required || !isVisible(f, values)) return false;
    const v = values[f.key];
    if (v === null || v === undefined || v === "") return true;
    if (f.kind === "number" && !Number.isFinite(Number(v))) return true;
    return false;
  });
}

export function parseList(text: string): number[] {
  return text
    .split(/[;/]/)
    .map((s) => s.trim().replace(",", "."))
    .filter(Boolean)
    .map(Number);
}

// ── Entrée typée du moteur de calcul ───────────────────────────

export type ConvoyId = "A" | "Bc" | "Bt" | "Br" | "Mc80" | "Mc120" | "Me80" | "Me120" | "D240" | "custom";

export type DalotInput = {
  ident: {
    projet: string; dossier: string; ouvrage: string; localisation: string;
    maitreOuvrage: string; maitreOeuvre: string; auteur: string; indice: string;
  };
  openings: number[];
  hInt: number;
  es: number; er: number; eExt: number; eInt: number; gousset: number;
  L: number;
  hr: number; ech: number; gammaR: number; gammaCh: number;
  Kmax: number; Kmin: number; qRemblai: number;
  Lr: number; Lc: number; classe: 1 | 2 | 3;
  fc28: number; gammaBA: number; fe: number; cover: number;
  fissuration: "prejudiciable" | "tres_prejudiciable"; wkMax: number;
  modeleSol: "winkler" | "lineaire"; ks: number;
  gammaSol: number; phiSol: number; cSol: number; EsSol: number; nuSol: number;
  qadm: number | null; Df: number; tassementMax: number;
  nappe: boolean; hw: number;
  convoys: ConvoyId[];
  custom: { name: string; axles: { P: number; d: number }[]; voie: number; roue: number; gU: number; gS: number };
  tanDiff: number; pas: number;
  tetes: {
    murs: boolean; angle: number; long: number; ep: number; semelle: number; semEp: number; patin: number; beche: number;
    murTeteEp: number; revanche: number; radierLong: number; becheProf: number; becheEp: number; guideRoues: boolean;
  };
  talus: { actif: boolean; pente: number; phi: number; c: number };
  hydro: {
    actif: boolean; methode: "rationnelle" | "impose"; Qimpose: number; T: number;
    A: number; L: number; dH: number; C: number; montanaA: number; montanaB: number;
    K: number; pente: number; revanchePct: number; revancheMin: number; vAdm: number; protection: boolean;
  };
  imposed: DalotSpec["imposed"];
};

const num = (v: FieldValue, d = 0) => {
  const n = typeof v === "string" ? Number(v.replace(",", ".")) : Number(v);
  return Number.isFinite(n) ? n : d;
};
const str = (v: FieldValue) => (v === null || v === undefined ? "" : String(v));

export function autoClasse(Lr: number): 1 | 2 | 3 {
  if (Lr >= 7) return 1;
  if (Lr > 5.5) return 2;
  return 3;
}

export function toInput(spec: DalotSpec): DalotInput {
  const v = spec.values;
  const n = Math.max(1, Math.round(num(v.nCells, 1)));
  const listed = parseList(str(v.openings)).filter((x) => x > 0);
  const openings = listed.length === n ? listed : Array.from({ length: n }, () => num(v.opening, 2));
  const Lr = num(v.Lr, 7);
  const classe = v.classePont === "1" || v.classePont === "2" || v.classePont === "3"
    ? (Number(v.classePont) as 1 | 2 | 3)
    : autoClasse(Lr);
  const convoys = (["A", "Bc", "Bt", "Br", "Mc80", "Mc120", "Me80", "Me120", "D240", "custom"] as ConvoyId[])
    .filter((c) => v[`cv_${c}`] === true);
  const axles = str(v.customAxles)
    .split("/")
    .map((a) => a.split(";").map((x) => Number(x.trim().replace(",", "."))))
    .filter((a) => Number.isFinite(a[0]))
    .map(([P, d]) => ({ P, d: Number.isFinite(d) ? d : 0 }));
  const qadmRaw = v.qadm;
  return {
    ident: {
      projet: str(v.projet), dossier: str(v.dossier), ouvrage: str(v.ouvrage), localisation: str(v.localisation),
      maitreOuvrage: str(v.maitreOuvrage), maitreOeuvre: str(v.maitreOeuvre), auteur: str(v.auteur) || "Moulo Jean Claude",
      indice: str(v.indice),
    },
    openings,
    hInt: num(v.hInt, 1.5),
    es: num(v.es, 0.3), er: num(v.er, 0.25), eExt: num(v.eExt, 0.25), eInt: num(v.eInt, 0.25),
    gousset: num(v.gousset, 0),
    L: num(v.L, 8),
    hr: num(v.hr, 1), ech: num(v.ech, 0), gammaR: num(v.gammaR, 20), gammaCh: num(v.gammaCh, 24),
    Kmax: num(v.Kmax, 0.5), Kmin: num(v.Kmin, 0.25), qRemblai: num(v.qRemblai, 10),
    Lr, Lc: num(v.Lc, Lr), classe,
    fc28: num(v.fc28, 25), gammaBA: num(v.gammaBA, 25), fe: num(v.fe, 400), cover: num(v.cover, 0.04),
    fissuration: v.fissuration === "tres_prejudiciable" ? "tres_prejudiciable" : "prejudiciable",
    wkMax: num(v.wkMax, 0.3),
    modeleSol: v.modeleSol === "lineaire" ? "lineaire" : "winkler",
    ks: num(v.ks, 60000),
    gammaSol: num(v.gammaSol, 20), phiSol: num(v.phiSol, 30), cSol: num(v.cSol, 0),
    EsSol: num(v.EsSol, 30), nuSol: num(v.nuSol, 0.3),
    qadm: qadmRaw === null || qadmRaw === "" || num(qadmRaw, 0) <= 0 ? null : num(qadmRaw),
    Df: num(v.Df, 0), tassementMax: num(v.tassementMax, 2.5),
    nappe: v.nappe === true, hw: num(v.hw, 0),
    convoys,
    custom: {
      name: str(v.customName) || "Convoi personnalisé", axles,
      voie: num(v.customVoie, 2), roue: num(v.customRoue, 0.25),
      gU: num(v.customGammaU, 1.605), gS: num(v.customGammaS, 1.2),
    },
    tanDiff: num(v.tanDiff, 1), pas: Math.max(0.05, num(v.pas, 0.1)),
    tetes: {
      murs: v.teteMurs === true, angle: num(v.aileAngle, 30), long: num(v.aileLong, 2.5), ep: num(v.aileEp, 0.25),
      semelle: num(v.aileSemelle, 2.4), semEp: num(v.aileSemEp, 0.3), patin: num(v.aileTalon, 0.4), beche: num(v.aileBeche, 0),
      murTeteEp: num(v.murTeteEp, 0.2), revanche: num(v.murTeteRevanche, 0.2),
      radierLong: num(v.radierTeteLong, 1.5), becheProf: num(v.becheProf, 0.8), becheEp: num(v.becheEp, 0.25),
      guideRoues: v.guideRoues === true,
    },
    talus: { actif: v.talusActif === true, pente: num(v.talusPente, 1.5), phi: num(v.talusPhi, 30), c: num(v.talusC, 0) },
    hydro: {
      actif: v.hyActif === true, methode: v.hyMethode === "impose" ? "impose" : "rationnelle", Qimpose: num(v.hyQ, 10), T: num(v.hyT, 10),
      A: num(v.hyA, 1), L: num(v.hyL, 1), dH: num(v.hyDH, 10), C: num(v.hyC, 0.3), montanaA: num(v.hyMa, 350), montanaB: num(v.hyMb, 0.38),
      K: num(v.hyK, 70), pente: num(v.hyI, 0.6), revanchePct: num(v.hyRevPct, 25), revancheMin: num(v.hyRevMin, 0.2),
      vAdm: num(v.hyVadm, 2), protection: v.hyProtection === true,
    },
    imposed: spec.imposed,
  };
}

/** Empreinte courte des données (FNV-1a 32 bits) : identifie la note produite. */
export function fingerprint(spec: DalotSpec): string {
  const text = JSON.stringify({ v: spec.values, i: spec.imposed });
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).toUpperCase().padStart(8, "0");
}

// ── Modèles d'ouvrages (démarrage rapide, comme l'assistant « ponts-cadres ») ──

export type DalotPreset = { id: string; label: string; description: string; values: Record<string, FieldValue> };

/** Hypothèses communes des notes de calcul Bangolo – Bloléquin (Guémon / Cavally, juillet 2026). */
const RURAL: Record<string, FieldValue> = {
  fe: "500", fc28: 25, cover: 0.03, hr: 0.6, ech: 0.05, gammaR: 19, gammaCh: 22, Lr: 6.5, Lc: 6.5, L: 7, gousset: 0,
  cv_Mc120: false, cv_Br: true, cv_Bt: true, cv_Bc: true, cv_A: true,
  soilPreset: "laterite_compacte", ks: 10000, qadm: 0.18, phiSol: 30, cSol: 0, gammaSol: 20, talusPhi: 30,
  aileAngle: 30, aileEp: 0.25, radierTeteLong: 1.5, becheProf: 1, becheEp: 0.25,
  localisation: "Route Bangolo – Bloléquin (Guémon / Cavally)", maitreOuvrage: "Conseil Café-Cacao",
  hyActif: true, hyMethode: "rationnelle", hyT: 10, hyMa: 350, hyMb: 0.38, hyK: 70, hyI: 0.6,
};

export const DALOT_PRESETS: DalotPreset[] = [
  {
    id: "demo", label: "Dalot double 2 × (2,00 × 1,50) sous 1 m de remblai",
    description: "Ouvrage de démonstration sous route revêtue, convois A, Bc, Bt, Br et Mc120.", values: {},
  },
  {
    id: "r200x200", label: "Dalot 2,00 × 2,00 — route Bangolo – Bloléquin",
    description: "Note et plan types : voiles 20 cm, dalle et radier 25 cm, L = 7,00 m, FeE500, C25/30, enrobage 3 cm, remblai 0,60 m. BV 1,20 km² → Qp ≈ 9,9 m³/s.",
    values: { ...RURAL, projet: "Dalot 2,00 × 2,00", nCells: 1, opening: 2, hInt: 2, es: 0.25, er: 0.25, eExt: 0.2, eInt: 0.2, aileLong: 3.4, aileEp: 0.25, hyA: 1.2, hyL: 1.7, hyDH: 32, hyC: 0.3 },
  },
  {
    id: "r300x200", label: "Dalot 3,00 × 2,00 — route Bangolo – Bloléquin",
    description: "Note et plan types : voiles 25 cm, dalle et radier 30 cm, L = 7,00 m, FeE500, C25/30. BV 2,20 km² → Qp ≈ 17,2 m³/s.",
    values: { ...RURAL, projet: "Dalot 3,00 × 2,00", nCells: 1, opening: 3, hInt: 2, es: 0.3, er: 0.3, eExt: 0.25, eInt: 0.25, aileLong: 3.45, aileEp: 0.2, hyA: 2.2, hyL: 2.6, hyDH: 40, hyC: 0.33, hyI: 0.5 },
  },
  {
    id: "r2x300x200", label: "Dalot double 2 × 3,00 × 2,00 — route Bangolo – Bloléquin",
    description: "Note et plan types (Intercoton) : voiles 25 cm, dalle et radier 30 cm, L = 7,00 m. BV 5,00 km² → Qp ≈ 31,8 m³/s.",
    values: { ...RURAL, projet: "Dalot 2 × 3,00 × 2,00", nCells: 2, opening: 3, hInt: 2, es: 0.3, er: 0.3, eExt: 0.25, eInt: 0.25, aileLong: 3.45, aileEp: 0.2, hyA: 5, hyL: 4.6, hyDH: 55, hyC: 0.33, hyI: 0.4, maitreOuvrage: "Intercoton" },
  },
];

/** Gabarits types par ouverture (épaisseurs des notes de calcul de référence). */
export const SERIES_TYPES: { id: string; label: string; opening: number; hInt: number; es: number; er: number; eExt: number; eInt: number; aileEp: number }[] = [
  { id: "150x150", label: "1,50 × 1,50", opening: 1.5, hInt: 1.5, es: 0.25, er: 0.25, eExt: 0.2, eInt: 0.2, aileEp: 0.2 },
  { id: "200x150", label: "2,00 × 1,50", opening: 2, hInt: 1.5, es: 0.25, er: 0.25, eExt: 0.2, eInt: 0.2, aileEp: 0.25 },
  { id: "200x200", label: "2,00 × 2,00", opening: 2, hInt: 2, es: 0.25, er: 0.25, eExt: 0.2, eInt: 0.2, aileEp: 0.25 },
  { id: "250x200", label: "2,50 × 2,00", opening: 2.5, hInt: 2, es: 0.3, er: 0.3, eExt: 0.25, eInt: 0.25, aileEp: 0.2 },
  { id: "300x200", label: "3,00 × 2,00", opening: 3, hInt: 2, es: 0.3, er: 0.3, eExt: 0.25, eInt: 0.25, aileEp: 0.2 },
  { id: "300x250", label: "3,00 × 2,50", opening: 3, hInt: 2.5, es: 0.3, er: 0.3, eExt: 0.25, eInt: 0.25, aileEp: 0.25 },
];

const fr = (x: number) => x.toFixed(2).replace(".", ",");

/** Une étude d'une série : n compartiments d'un gabarit type, pour une longueur donnée. */
export function seriesSpec(typeId: string, nCells: number, L: number): DalotSpec {
  const t = SERIES_TYPES.find((x) => x.id === typeId) ?? SERIES_TYPES[2];
  const spec = defaultSpec();
  Object.assign(spec.values, RURAL, {
    projet: `Dalot ${nCells > 1 ? `${nCells} × ` : ""}${fr(t.opening)} × ${fr(t.hInt)} — L = ${fr(L)} m`,
    nCells, opening: t.opening, hInt: t.hInt, es: t.es, er: t.er, eExt: t.eExt, eInt: t.eInt, aileEp: t.aileEp, L,
    aileLong: 3.4, hyActif: false,
  });
  return spec;
}

export function specFromPreset(presetId: string, name?: string): DalotSpec {
  const spec = defaultSpec();
  const preset = DALOT_PRESETS.find((p) => p.id === presetId);
  if (preset) Object.assign(spec.values, preset.values);
  if (name) spec.values.projet = name;
  return spec;
}
