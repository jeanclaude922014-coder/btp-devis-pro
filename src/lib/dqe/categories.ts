// Corps d'état usuels des DQE de bâtiment / VRD en Côte d'Ivoire et mots-clés de détection.

export type Category = {
  key: string;
  label: string;
  order: number;
  /** Mots-clés recherchés dans le titre du lot (poids fort) et les désignations (poids faible). */
  keywords: string[];
  /** Points de vigilance techniques (normes BAEL / EC2, contexte ivoirien). */
  note: string;
};

export const CATEGORIES: Category[] = [
  {
    key: "generalites",
    label: "Installation de chantier – généralités",
    order: 0,
    keywords: ["installation", "repli", "amenee", "implantation", "panneau de chantier", "generalite", "etudes", "plan d'execution", "constat", "dossier", "signalisation"],
    note: "Installation, implantation contradictoire et repli : à faire constater par PV ; prévoir le panneau de chantier et les plans d'exécution avant démarrage.",
  },
  {
    key: "terrassement",
    label: "Terrassement",
    order: 1,
    keywords: ["terrassement", "debroussaill", "decapage", "fouille", "deblai", "remblai", "nivellement", "compactage", "evacuation des terres", "plateforme", "laterite", "fouilles"],
    note: "Sol latéritique : purger les poches argileuses, remblais en couches de 20 cm compactées à 95 % de l'OPM (Proctor modifié) avant dallage ; essais de plaque ou densité in situ recommandés.",
  },
  {
    key: "gros_oeuvre",
    label: "Gros œuvre – béton armé et maçonnerie",
    order: 2,
    keywords: ["gros oeuvre", "gros-oeuvre", "beton", "semelle", "fondation", "poteau", "poutre", "chainage", "linteau", "dalle", "dallage", "agglo", "maconnerie", "enduit", "coffrage", "acier", "armature", "ha ", "ferraillage", "voile", "longrine", "radier", "claustra", "hourdis", "polyane"],
    note: "Béton armé à justifier selon BAEL 91 mod. 99 / EC2 : dosage ≥ 350 kg/m³ pour les éléments porteurs, enrobage ≥ 3 cm à l'extérieur, cure humide d'au moins 7 jours (climat tropical chaud) et vibration systématique ; prévoir éprouvettes de contrôle (fc28).",
  },
  {
    key: "etancheite",
    label: "Étanchéité",
    order: 3,
    keywords: ["etancheite", "etanche", "bitum", "paxalumin", "multicouche", "relevé", "releve", "forme de pente"],
    note: "Forme de pente ≥ 1,5 % vers les EP, relevés ≥ 15 cm ; protection anti-UV indispensable sous fort ensoleillement.",
  },
  {
    key: "charpente_couverture",
    label: "Charpente – couverture",
    order: 4,
    keywords: ["charpente", "couverture", "tole", "bac alu", "aluzinc", "faitiere", "panne", "chevron", "ferme", "liteau", "gouttiere", "rive", "toiture", "tuile"],
    note: "Bois traités insecticide-fongicide (termites), ancrage des fermes dans le chaînage contre les vents de tornade ; recouvrement des tôles conforme au fabricant.",
  },
  {
    key: "menuiserie_bois",
    label: "Menuiserie bois",
    order: 5,
    keywords: ["menuiserie bois", "porte isoplane", "porte en bois", "bois rouge", "placard", "isoplane", "quincaillerie", "serrure ", "paumelle"],
    note: "Bois sec (humidité ≤ 18 %) et traité ; protéger les menuiseries des remontées d'humidité.",
  },
  {
    key: "menuiserie_metallique",
    label: "Menuiserie métallique – serrurerie",
    order: 6,
    keywords: ["metallique", "serrurerie", "grille", "garde-corps", "garde corps", "portail", "naco", "persienne", "barreaudage", "ferronnerie"],
    note: "Profilés traités antirouille (2 couches) avant pose ; scellements au mortier dosé à 350 kg/m³.",
  },
  {
    key: "menuiserie_alu",
    label: "Menuiserie aluminium – vitrerie",
    order: 7,
    keywords: ["aluminium", "alu ", "vitrage", "vitrerie", "vitre", "verre", "baie", "coulissant"],
    note: "Joints d'étanchéité périphériques et rejingots pour les pluies battantes.",
  },
  {
    key: "plomberie",
    label: "Plomberie – sanitaires",
    order: 8,
    keywords: ["plomberie", "sanitaire", "wc", "lavabo", "evier", "robinet", "pvc", "tuyau", "sodeci", "douche", "siphon", "chasse", "urinoir", "lave-mains", "lave mains", "pression", "pehd", "cuve", "chateau d'eau"],
    note: "Essais d'étanchéité sous pression avant fermeture des saignées ; branchement SODECI à coordonner tôt.",
  },
  {
    key: "assainissement",
    label: "Assainissement – VRD",
    order: 9,
    keywords: ["assainissement", "regard", "fosse", "puisard", "puits perdu", "caniveau", "dalot", "buse", "drain", "eaux usees", "eaux pluviales", "septique", "latrine", "vrd", "voirie", "bordure", "pave"],
    note: "Puisards et puits perdus : vérifier la perméabilité du sol latéritique ; implanter à distance réglementaire des points d'eau.",
  },
  {
    key: "electricite",
    label: "Électricité",
    order: 10,
    keywords: ["electricite", "electrique", "cable", "fil h07", "tableau", "disjoncteur", "interrupteur", "prise", "pc ", "reglette", "luminaire", "lampe", "hublot", "mise a la terre", "securel", "cie", "icd", "gaine", "eclairage", "ventilateur", "brasseur"],
    note: "Installation conforme NF C 15-100 ; mise à la terre < 100 Ω et attestation SECUREL avant mise sous tension CIE.",
  },
  {
    key: "revetements",
    label: "Revêtements durs – carrelage",
    order: 11,
    keywords: ["revetement", "carreau", "carrelage", "faience", "gres", "plinthe", "chape", "granito", "marbre"],
    note: "Pose sur chape ou dallage sec ; joints de fractionnement tous les 40 m² environ (dilatation thermique).",
  },
  {
    key: "faux_plafond",
    label: "Faux plafonds",
    order: 12,
    keywords: ["faux plafond", "faux-plafond", "plafond", "contreplaque", "staff", "dalles de plafond", "lambris"],
    note: "Ossature traitée et ventilation des combles pour limiter la chaleur sous toiture.",
  },
  {
    key: "peinture",
    label: "Peinture – vernis",
    order: 13,
    keywords: ["peinture", "vinylique", "glycero", "vernis", "brossage", "egrainage", "enduit de lissage", "badigeon", "antirouille", "impression"],
    note: "Enduits secs (≈ 28 jours) avant peinture ; peintures extérieures adaptées aux UV et à l'humidité.",
  },
  {
    key: "equipements",
    label: "Équipements – divers",
    order: 14,
    keywords: ["equipement", "mobilier", "climatis", "split", "forage", "pompe", "solaire", "panneau", "extincteur"],
    note: "Vérifier les fiches techniques et garanties fournisseurs avant commande.",
  },
];

export const OTHER_CATEGORY: Category = {
  key: "divers",
  label: "Divers",
  order: 99,
  keywords: [],
  note: "Lot sans corps d'état reconnu : vérifier le rattachement des articles.",
};

export function categoryByKey(key: string): Category {
  return CATEGORIES.find((c) => c.key === key) ?? OTHER_CATEGORY;
}

export function normalizeText(s: string): string {
  return ` ${s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/œ/g, "oe")
    .replace(/[’']/g, "'")
    .replace(/\s+/g, " ")} `;
}

/** Score d'un texte pour chaque catégorie. */
function scoreText(text: string, weight: number, scores: Map<string, number>) {
  const t = normalizeText(text);
  for (const c of CATEGORIES) {
    for (const kw of c.keywords) {
      if (t.includes(kw)) scores.set(c.key, (scores.get(c.key) ?? 0) + weight * (kw.length > 6 ? 2 : 1));
    }
  }
}

/** Corps d'état d'un lot à partir de son titre et des désignations de ses articles. */
export function classifyLot(lotName: string, designations: string[]): string {
  const scores = new Map<string, number>();
  scoreText(lotName, 10, scores);
  for (const d of designations) scoreText(d, 1, scores);
  let best = OTHER_CATEGORY.key;
  let bestScore = 0;
  for (const [k, v] of scores) {
    if (v > bestScore) {
      best = k;
      bestScore = v;
    }
  }
  return best;
}

/** Corps d'état d'un article isolé (utilisé quand le DQE n'a ni titres de lots ni numérotation). */
export function classifyItem(designation: string): string {
  return classifyLot("", [designation]);
}
