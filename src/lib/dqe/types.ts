// Structure d'un DQE importé (Devis Quantitatif et Estimatif) et de son suivi d'exécution.

export type DqeSite = { id: string; name: string };

export type DqeLot = {
  id: string;
  site: string; // id de l'ouvrage
  name: string; // ex : "Lot 2 : Gros œuvre"
  category: string; // corps d'état détecté (clé de CATEGORIES)
};

export type DqeItem = {
  k: number; // clé unique stable
  lot: string; // id du lot
  n: string; // numéro de prix
  d: string; // désignation
  u: string; // unité
  q: number; // quantité
  pu: number; // prix unitaire HT
  sec?: string; // sous-titre (section) éventuel à l'intérieur du lot
};

export type DqeAttachment = {
  d: string; // date ISO AAAA-MM-JJ
  k: number; // article
  q: number; // quantité exécutée ce jour
  o?: string; // observation
};

export type ParseReport = {
  source: "excel" | "csv" | "pdf";
  sheets: string[];
  rowsRead: number;
  itemsFound: number;
  lotsFound: number;
  lotStrategy: "titres" | "numerotation" | "mots-cles";
  declaredTotal: number | null; // total HT lu dans le document, si présent
  warnings: string[];
};

export type DqeData = {
  sites: DqeSite[];
  lots: DqeLot[];
  items: DqeItem[];
  att: DqeAttachment[];
  suivi: string | null;
  tva: number; // taux, ex 0.18
  orig: { lots: DqeLot[]; items: DqeItem[] };
  report: ParseReport;
};

export type Cell = string | number | null | undefined;
/** layout "free" : cellules sans alignement de colonnes fiable (PDF). */
export type RawSheet = { name: string; rows: Cell[][]; layout?: "grid" | "free" };
