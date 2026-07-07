// Catalogue de prix par défaut — région Côte d'Ivoire / Abidjan (XOF).
// Valeurs indicatives de démarrage (main d'oeuvre, matériaux, matériel),
// à calibrer par chaque cabinet selon ses coûts réels.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

// Taux horaires main d'oeuvre (FCFA/h), dérivés des barèmes journaliers /8h
const MO = {
  manoeuvre: 625,
  manoeuvreQualifie: 875,
  macon: 1500,
  coffreur: 1375,
  ferrailleur: 1250,
  carreleur: 1625,
  charpentier: 1500,
  couvreur: 1500,
  menuisier: 1625,
  electricien: 1750,
  plombier: 1750,
  peintre: 1375,
  chefEquipe: 2250,
};

type ItemSeed = {
  designation: string;
  unit: string;
  laborHours: number;
  laborRateXof: number;
  materialsXof: number;
  equipmentXof: number;
};

type CategorySeed = {
  code: string;
  name: string;
  colorHex: string;
  items: ItemSeed[];
};

const CATALOG: CategorySeed[] = [
  {
    code: "01",
    name: "Terrassement",
    colorHex: "#475569",
    items: [
      { designation: "Décapage terre végétale (ép. 20cm)", unit: "m2", laborHours: 0.15, laborRateXof: MO.manoeuvre, materialsXof: 0, equipmentXof: 350 },
      { designation: "Déblais en terrain meuble (TM), évacuation comprise", unit: "m3", laborHours: 0.4, laborRateXof: MO.manoeuvre, materialsXof: 0, equipmentXof: 2200 },
      { designation: "Déblais en terrain latéritique / dur", unit: "m3", laborHours: 0.6, laborRateXof: MO.manoeuvre, materialsXof: 0, equipmentXof: 3800 },
      { designation: "Remblais compactés (matériaux latéritiques locaux)", unit: "m3", laborHours: 0.3, laborRateXof: MO.manoeuvre, materialsXof: 2500, equipmentXof: 1800 },
      { designation: "Fouilles en rigoles (fondations filantes)", unit: "m3", laborHours: 1.2, laborRateXof: MO.manoeuvreQualifie, materialsXof: 0, equipmentXof: 900 },
      { designation: "Nivellement général du terrain (décapage)", unit: "m2", laborHours: 0.08, laborRateXof: MO.manoeuvre, materialsXof: 0, equipmentXof: 300 },
    ],
  },
  {
    code: "02",
    name: "Béton armé",
    colorHex: "#1e3a5f",
    items: [
      { designation: "Béton de propreté dosé à 150 kg/m3 (ép. 5cm)", unit: "m2", laborHours: 0.5, laborRateXof: MO.macon, materialsXof: 4500, equipmentXof: 800 },
      { designation: "Semelles filantes béton armé 350 kg/m3 (35x50)", unit: "ml", laborHours: 1.8, laborRateXof: MO.coffreur, materialsXof: 21000, equipmentXof: 1500 },
      { designation: "Semelles isolées béton armé 350 kg/m3 (80x80x40)", unit: "u", laborHours: 3.5, laborRateXof: MO.coffreur, materialsXof: 38000, equipmentXof: 2500 },
      { designation: "Poteau béton armé 25x25 cm (dosé à 350 kg/m3)", unit: "ml", laborHours: 2.2, laborRateXof: MO.coffreur, materialsXof: 12500, equipmentXof: 1200 },
      { designation: "Poteau béton armé 30x30 cm (dosé à 350 kg/m3)", unit: "ml", laborHours: 2.6, laborRateXof: MO.coffreur, materialsXof: 17500, equipmentXof: 1400 },
      { designation: "Longrine / poutre de fondation BA 25x40", unit: "ml", laborHours: 2.4, laborRateXof: MO.coffreur, materialsXof: 19500, equipmentXof: 1400 },
      { designation: "Chaînage haut / ceinture BA (20x20)", unit: "ml", laborHours: 1.6, laborRateXof: MO.coffreur, materialsXof: 9500, equipmentXof: 900 },
      { designation: "Dallage béton armé dosé 350 kg/m3 (ép. 12cm)", unit: "m2", laborHours: 1.1, laborRateXof: MO.macon, materialsXof: 14500, equipmentXof: 1800 },
      { designation: "Dalle pleine coulée en place (ép. 15cm)", unit: "m2", laborHours: 1.6, laborRateXof: MO.coffreur, materialsXof: 21000, equipmentXof: 2200 },
      { designation: "Escalier béton armé coulé en place (largeur 1.20m)", unit: "ml", laborHours: 4.5, laborRateXof: MO.coffreur, materialsXof: 28000, equipmentXof: 2000 },
      { designation: "Ferraillage HA Fe500 (façonnage + pose)", unit: "kg", laborHours: 0.12, laborRateXof: MO.ferrailleur, materialsXof: 850, equipmentXof: 0 },
    ],
  },
  {
    code: "03",
    name: "Maçonnerie",
    colorHex: "#92400e",
    items: [
      { designation: "Maçonnerie parpaings creux 15x20x40 (mur intérieur)", unit: "m2", laborHours: 0.9, laborRateXof: MO.macon, materialsXof: 8500, equipmentXof: 0 },
      { designation: "Maçonnerie parpaings creux 20x20x40 (mur porteur/extérieur)", unit: "m2", laborHours: 1.1, laborRateXof: MO.macon, materialsXof: 10500, equipmentXof: 0 },
      { designation: "Cloison parpaings 10x20x40 (cloison légère)", unit: "m2", laborHours: 0.7, laborRateXof: MO.macon, materialsXof: 6000, equipmentXof: 0 },
      { designation: "Hourdis béton (remplissage plancher corps creux)", unit: "u", laborHours: 0.05, laborRateXof: MO.manoeuvre, materialsXof: 950, equipmentXof: 0 },
      { designation: "Remplissage hourdis béton (plancher corps creux - pose)", unit: "m2", laborHours: 0.6, laborRateXof: MO.macon, materialsXof: 7500, equipmentXof: 300 },
    ],
  },
  {
    code: "04",
    name: "Charpente bois",
    colorHex: "#b45309",
    items: [
      { designation: "Charpente bois (Framiré/Samba traité) toiture simple pente", unit: "m2", laborHours: 1.2, laborRateXof: MO.charpentier, materialsXof: 12500, equipmentXof: 0 },
      { designation: "Pannes en bois 10x15 cm (gîtes de toiture)", unit: "ml", laborHours: 0.35, laborRateXof: MO.charpentier, materialsXof: 3800, equipmentXof: 0 },
      { designation: "Chevrons bois 5x7 cm (support couverture)", unit: "ml", laborHours: 0.2, laborRateXof: MO.charpentier, materialsXof: 1800, equipmentXof: 0 },
      { designation: "Faux-plafond en plaque de plâtre BA13 (ossature métallique)", unit: "m2", laborHours: 0.5, laborRateXof: MO.menuisier, materialsXof: 8500, equipmentXof: 0 },
      { designation: "Faux-plafond bois (contreplaqué 5mm sur ossature)", unit: "m2", laborHours: 0.55, laborRateXof: MO.menuisier, materialsXof: 7500, equipmentXof: 0 },
    ],
  },
  {
    code: "05",
    name: "Couverture / Étanchéité",
    colorHex: "#1d4ed8",
    items: [
      { designation: "Couverture tôle galva bac acier (ép. 6/10) y/c fixations", unit: "m2", laborHours: 0.4, laborRateXof: MO.couvreur, materialsXof: 8500, equipmentXof: 0 },
      { designation: "Couverture tuiles béton (pose sur voliges)", unit: "m2", laborHours: 0.7, laborRateXof: MO.couvreur, materialsXof: 11500, equipmentXof: 0 },
      { designation: "Étanchéité bicouche asphalte (terrasse)", unit: "m2", laborHours: 0.5, laborRateXof: MO.couvreur, materialsXof: 9500, equipmentXof: 500 },
      { designation: "Gouttière PVC Ø100 demi-ronde (y/c crochet + jonction)", unit: "ml", laborHours: 0.2, laborRateXof: MO.couvreur, materialsXof: 3500, equipmentXof: 0 },
      { designation: "Descente EP PVC Ø100 (y/c fixations et coudes)", unit: "ml", laborHours: 0.2, laborRateXof: MO.couvreur, materialsXof: 3200, equipmentXof: 0 },
    ],
  },
  {
    code: "06",
    name: "Menuiseries bois",
    colorHex: "#15803d",
    items: [
      { designation: "Porte intérieure bois (bloc-porte 90x210)", unit: "u", laborHours: 2.5, laborRateXof: MO.menuisier, materialsXof: 45000, equipmentXof: 0 },
      { designation: "Porte extérieure bois pleine (100x215)", unit: "u", laborHours: 3, laborRateXof: MO.menuisier, materialsXof: 75000, equipmentXof: 0 },
      { designation: "Fenêtre bois 2 vantaux 120x120 (vitrage simple)", unit: "u", laborHours: 2.5, laborRateXof: MO.menuisier, materialsXof: 55000, equipmentXof: 0 },
      { designation: "Placard encastré bois (ml de façade, 2.20m hauteur)", unit: "ml", laborHours: 3, laborRateXof: MO.menuisier, materialsXof: 65000, equipmentXof: 0 },
    ],
  },
  {
    code: "07",
    name: "Menuiseries alu",
    colorHex: "#0f766e",
    items: [
      { designation: "Porte-fenêtre alu coulissante 2 vantaux 130x215", unit: "u", laborHours: 2, laborRateXof: MO.menuisier, materialsXof: 145000, equipmentXof: 0 },
      { designation: "Fenêtre alu coulissante 120x100", unit: "u", laborHours: 1.5, laborRateXof: MO.menuisier, materialsXof: 85000, equipmentXof: 0 },
      { designation: "Garde-corps alu (hauteur 1.10m)", unit: "ml", laborHours: 1, laborRateXof: MO.menuisier, materialsXof: 32000, equipmentXof: 0 },
      { designation: "Moustiquaire alu fixe (sur menuiserie existante)", unit: "m2", laborHours: 0.4, laborRateXof: MO.menuisier, materialsXof: 12000, equipmentXof: 0 },
    ],
  },
  {
    code: "08",
    name: "Revêtements sols",
    colorHex: "#be123c",
    items: [
      { designation: "Carrelage grès cérame 60x60 (pose collée, joint 2mm)", unit: "m2", laborHours: 0.8, laborRateXof: MO.carreleur, materialsXof: 12500, equipmentXof: 0 },
      { designation: "Carrelage grès cérame 80x80 (grande dalle, pose collée)", unit: "m2", laborHours: 1, laborRateXof: MO.carreleur, materialsXof: 16500, equipmentXof: 0 },
      { designation: "Carrelage antidérapant extérieur 40x40 (R11)", unit: "m2", laborHours: 0.8, laborRateXof: MO.carreleur, materialsXof: 11000, equipmentXof: 0 },
      { designation: "Chape de forme (ragréage) ép. 3cm", unit: "m2", laborHours: 0.4, laborRateXof: MO.macon, materialsXof: 3200, equipmentXof: 0 },
      { designation: "Béton ciré (finition lissée, 2 couches cire)", unit: "m2", laborHours: 0.9, laborRateXof: MO.carreleur, materialsXof: 9500, equipmentXof: 0 },
      { designation: "Parquet stratifié (pose collée, ép. 8mm)", unit: "m2", laborHours: 0.6, laborRateXof: MO.menuisier, materialsXof: 14000, equipmentXof: 0 },
    ],
  },
  {
    code: "09",
    name: "Enduits / Revêtements muraux",
    colorHex: "#a21caf",
    items: [
      { designation: "Enduit intérieur ciment-sable dosé 350 kg/m3 (ép. 1.5cm)", unit: "m2", laborHours: 0.45, laborRateXof: MO.macon, materialsXof: 2200, equipmentXof: 0 },
      { designation: "Enduit extérieur façade grésé fin (ép. 2cm)", unit: "m2", laborHours: 0.55, laborRateXof: MO.macon, materialsXof: 2800, equipmentXof: 0 },
      { designation: "Faïence murale 30x60 (salle de bain / cuisine)", unit: "m2", laborHours: 0.9, laborRateXof: MO.carreleur, materialsXof: 13500, equipmentXof: 0 },
      { designation: "Faïence murale 40x80 (grande plaque)", unit: "m2", laborHours: 1, laborRateXof: MO.carreleur, materialsXof: 15500, equipmentXof: 0 },
    ],
  },
  {
    code: "10",
    name: "Peinture",
    colorHex: "#7e22ce",
    items: [
      { designation: "Peinture vinylique murs intérieurs (2 couches + impression)", unit: "m2", laborHours: 0.3, laborRateXof: MO.peintre, materialsXof: 1800, equipmentXof: 0 },
      { designation: "Peinture façade imperméabilisante (2 couches)", unit: "m2", laborHours: 0.35, laborRateXof: MO.peintre, materialsXof: 2500, equipmentXof: 0 },
      { designation: "Peinture plafond (blanc mat, 2 couches)", unit: "m2", laborHours: 0.3, laborRateXof: MO.peintre, materialsXof: 1700, equipmentXof: 0 },
      { designation: "Peinture glycérophtalique (boiseries, métaux, 2 couches)", unit: "m2", laborHours: 0.4, laborRateXof: MO.peintre, materialsXof: 2600, equipmentXof: 0 },
      { designation: "Traitement bois fongicide + insecticide (2 couches)", unit: "m2", laborHours: 0.25, laborRateXof: MO.peintre, materialsXof: 1500, equipmentXof: 0 },
    ],
  },
  {
    code: "11",
    name: "Plomberie / Sanitaire",
    colorHex: "#4338ca",
    items: [
      { designation: "WC / cuvette complète posée (branchement EU compris)", unit: "u", laborHours: 3, laborRateXof: MO.plombier, materialsXof: 95000, equipmentXof: 0 },
      { designation: "Lavabo vasque complète posée (avec robinetterie)", unit: "u", laborHours: 2.5, laborRateXof: MO.plombier, materialsXof: 65000, equipmentXof: 0 },
      { designation: "Douche (receveur + colonne de douche + robinetterie)", unit: "u", laborHours: 3, laborRateXof: MO.plombier, materialsXof: 85000, equipmentXof: 0 },
      { designation: "Évier cuisine inox 2 bacs (avec robinetterie)", unit: "u", laborHours: 2, laborRateXof: MO.plombier, materialsXof: 55000, equipmentXof: 0 },
      { designation: "Chauffe-eau électrique 100L (avec mise en service)", unit: "u", laborHours: 2.5, laborRateXof: MO.plombier, materialsXof: 135000, equipmentXof: 0 },
      { designation: "Réseau alimentation eau PVC pression Ø20 (apparent)", unit: "ml", laborHours: 0.3, laborRateXof: MO.plombier, materialsXof: 2200, equipmentXof: 0 },
      { designation: "Réseau évacuation EU/EP PVC Ø100 (scellé)", unit: "ml", laborHours: 0.4, laborRateXof: MO.plombier, materialsXof: 3500, equipmentXof: 0 },
      { designation: "Fosse septique maçonnée 3m3 (toutes sujétions)", unit: "u", laborHours: 20, laborRateXof: MO.macon, materialsXof: 350000, equipmentXof: 15000 },
      { designation: "Puisard perdant maçonné (Ø1.50m x 2.00m prof.)", unit: "u", laborHours: 12, laborRateXof: MO.macon, materialsXof: 180000, equipmentXof: 8000 },
      { designation: "Compteur eau + branchement au réseau SODECI", unit: "ff", laborHours: 4, laborRateXof: MO.plombier, materialsXof: 65000, equipmentXof: 0 },
    ],
  },
  {
    code: "12",
    name: "Électricité",
    colorHex: "#c2410c",
    items: [
      { designation: "Tableau électrique général TGBT (disjoncteurs + protection)", unit: "u", laborHours: 8, laborRateXof: MO.electricien, materialsXof: 185000, equipmentXof: 0 },
      { designation: "Point lumineux complet (câblage + boîte + douille)", unit: "u", laborHours: 1, laborRateXof: MO.electricien, materialsXof: 6500, equipmentXof: 0 },
      { designation: "Prise de courant 2P+T (encastrée 16A)", unit: "u", laborHours: 0.8, laborRateXof: MO.electricien, materialsXof: 5500, equipmentXof: 0 },
      { designation: "Interrupteur simple encastré", unit: "u", laborHours: 0.6, laborRateXof: MO.electricien, materialsXof: 4200, equipmentXof: 0 },
      { designation: "Câble U-1000 R2V 3x6mm2 (alimentation moteurs/gros appareils)", unit: "ml", laborHours: 0.15, laborRateXof: MO.electricien, materialsXof: 2800, equipmentXof: 0 },
      { designation: "Disjoncteur différentiel 30mA type A (protection circuit)", unit: "u", laborHours: 0.5, laborRateXof: MO.electricien, materialsXof: 22000, equipmentXof: 0 },
      { designation: "Mise à la terre complète (piquet + câble + cosses)", unit: "ff", laborHours: 4, laborRateXof: MO.electricien, materialsXof: 45000, equipmentXof: 0 },
      { designation: "Branchement SODECI/CIE électricité (compteur + raccordement)", unit: "ff", laborHours: 3, laborRateXof: MO.electricien, materialsXof: 55000, equipmentXof: 0 },
      { designation: "Climatiseur split (fourniture + pose)", unit: "u", laborHours: 4, laborRateXof: MO.electricien, materialsXof: 285000, equipmentXof: 0 },
    ],
  },
  {
    code: "13",
    name: "VRD",
    colorHex: "#047857",
    items: [
      { designation: "Voirie béton armé ép. 15cm (dosseret pour véhicules légers)", unit: "m2", laborHours: 0.7, laborRateXof: MO.macon, materialsXof: 14000, equipmentXof: 1500 },
      { designation: "Trottoir béton banché ép. 10cm", unit: "m2", laborHours: 0.5, laborRateXof: MO.macon, materialsXof: 8500, equipmentXof: 800 },
      { designation: "Bordure de trottoir T2 béton préfabriqué (h=20cm)", unit: "ml", laborHours: 0.3, laborRateXof: MO.macon, materialsXof: 5500, equipmentXof: 0 },
      { designation: "Caniveau béton C1 préfabriqué (30x30)", unit: "ml", laborHours: 0.4, laborRateXof: MO.macon, materialsXof: 8500, equipmentXof: 0 },
      { designation: "Réseau EU/EP PVC Ø125 enterré (fouille + pose + remblai)", unit: "ml", laborHours: 0.6, laborRateXof: MO.manoeuvreQualifie, materialsXof: 9500, equipmentXof: 1200 },
      { designation: "Regard de visite maçonné 60x60x100 (avec tampon fonte)", unit: "u", laborHours: 8, laborRateXof: MO.macon, materialsXof: 65000, equipmentXof: 0 },
      { designation: "Grille avaloir eaux pluviales (200x200, fonte)", unit: "u", laborHours: 3, laborRateXof: MO.macon, materialsXof: 45000, equipmentXof: 0 },
      { designation: "Dallage allée extérieure pavés autobloquants (ép. 6cm)", unit: "m2", laborHours: 0.5, laborRateXof: MO.macon, materialsXof: 9500, equipmentXof: 0 },
    ],
  },
  {
    code: "14",
    name: "Aménagements extérieurs",
    colorHex: "#4d7c0f",
    items: [
      { designation: "Clôture parpaings 15cm (hauteur 2.00m, enduite 2 faces)", unit: "ml", laborHours: 2.5, laborRateXof: MO.macon, materialsXof: 22000, equipmentXof: 0 },
      { designation: "Portail métallique battant 2 vantaux (largeur 4.00m)", unit: "u", laborHours: 12, laborRateXof: MO.menuisier, materialsXof: 385000, equipmentXof: 0 },
      { designation: "Portillon piéton métallique (largeur 1.00m)", unit: "u", laborHours: 4, laborRateXof: MO.menuisier, materialsXof: 95000, equipmentXof: 0 },
      { designation: "Dallage extérieur béton balayé ép. 10cm", unit: "m2", laborHours: 0.5, laborRateXof: MO.macon, materialsXof: 8500, equipmentXof: 500 },
    ],
  },
];

async function main() {
  console.log("Seed du catalogue de prix par défaut (global, région CI-ABIDJAN)...");

  for (const cat of CATALOG) {
    const category = await prisma.priceCategory.upsert({
      where: { id: `global-${cat.code}` },
      create: {
        id: `global-${cat.code}`,
        organizationId: null,
        code: cat.code,
        name: cat.name,
        colorHex: cat.colorHex,
        position: parseInt(cat.code, 10),
        region: "CI-ABIDJAN",
      },
      update: {
        name: cat.name,
        colorHex: cat.colorHex,
      },
    });

    for (const [idx, item] of cat.items.entries()) {
      const id = `global-${cat.code}-${idx + 1}`;
      await prisma.priceItem.upsert({
        where: { id },
        create: {
          id,
          organizationId: null,
          categoryId: category.id,
          designation: item.designation,
          unit: item.unit,
          laborHours: item.laborHours,
          laborRateXof: item.laborRateXof,
          materialsXof: item.materialsXof,
          equipmentXof: item.equipmentXof,
          region: "CI-ABIDJAN",
          position: idx,
        },
        update: {
          designation: item.designation,
          unit: item.unit,
          laborHours: item.laborHours,
          laborRateXof: item.laborRateXof,
          materialsXof: item.materialsXof,
          equipmentXof: item.equipmentXof,
        },
      });
    }
  }

  const total = await prisma.priceItem.count({ where: { organizationId: null } });
  console.log(`Catalogue global initialisé : ${CATALOG.length} lots, ${total} articles.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
