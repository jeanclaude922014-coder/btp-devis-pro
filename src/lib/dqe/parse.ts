// Analyse d'un DQE brut (lignes de tableur ou de PDF) → ouvrages, lots et articles.
// Aucune dépendance serveur : testable seul.

import { categoryByKey, classifyItem, classifyLot, normalizeText } from "./categories";
import type { Cell, DqeData, DqeItem, DqeLot, DqeSite, ParseReport, RawSheet } from "./types";

// ── Nombres ───────────────────────────────────────────────────

/** Convertit "1 234 567,50", "69,7", "2.000.000", "450 000 F" en nombre. */
export function toNumber(cell: Cell): number | null {
  if (cell === null || cell === undefined) return null;
  if (typeof cell === "number") return Number.isFinite(cell) ? cell : null;
  let s = String(cell)
    .replace(/[   \s]/g, "")
    .replace(/(f\.?cfa|fcfa|xof|cfa|f)$/i, "")
    .trim();
  if (!s || !/^-?[\d.,]+$/.test(s) || !/\d/.test(s)) return null;
  const dots = (s.match(/\./g) ?? []).length;
  const commas = (s.match(/,/g) ?? []).length;
  if (dots && commas) {
    // Le dernier séparateur est le séparateur décimal.
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (commas > 1) {
    s = s.replace(/,/g, "");
  } else if (commas === 1) {
    s = s.replace(",", ".");
  } else if (dots > 1) {
    s = s.replace(/\./g, "");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function cellText(cell: Cell): string {
  if (cell === null || cell === undefined) return "";
  return String(cell).replace(/[  ]/g, " ").replace(/\s+/g, " ").trim();
}

// ── Reconnaissance des cellules ──────────────────────────────

const UNIT_RE =
  /^(m[²2³3]?|ml|m\.?l\.?|u|un|unit[ée]s?|u\.|ens|ensemble|ff|fft|forfait|f\.f\.?|kg|t|tonnes?|l|litres?|pm|p\.m\.?|pce|pi[èe]ces?|nb|nbre|no|j|jours?|h|heures?|km|ha|lot|pt|point|sac|voyage|v|mois|m\/l|m2\/m|gl|global)$/i;

export function isUnit(text: string): boolean {
  return UNIT_RE.test(text.trim());
}

export function normalizeUnit(text: string): string {
  const t = text.trim().toLowerCase().replace(/\.$/, "");
  if (t === "m2") return "m²";
  if (t === "m3") return "m³";
  if (t === "m.l" || t === "m/l") return "ml";
  if (t === "unite" || t === "unité" || t === "un" || t === "unites" || t === "unités") return "u";
  if (t === "ensemble") return "ens";
  if (t === "forfait" || t === "f.f") return "ff";
  return text.trim();
}

/** Numéro de prix : "2.3.1", "02", "A.1", "II", "2.2.2.1a", "1-3". */
const CODE_RE = /^(?:[A-Z]{1,2}[.\-]?)?\d{1,3}(?:[.\-]\d{1,3})*[a-z]?\.?$|^[IVXL]{1,6}\.?$|^[A-H]\.?$/;

function isCode(text: string): boolean {
  return CODE_RE.test(text.trim());
}

function codeDepth(code: string): number {
  return code.replace(/\.$/, "").split(/[.\-]/).filter(Boolean).length;
}

const ROMAN_RE = /^[IVXL]{1,6}$/;

const TOTAL_RE =
  /^(sous[\s-]?total|s\/total|total|montant|report|a reporter|à reporter|r[ée]capitulati|tva|t\.v\.a|ttc|net a payer|net à payer|arr[êe]t[ée]|cumul|prix total)/i;

const LOT_RE = /^\s*lot\s*(?:n[°o]?\.?\s*)?([0-9]{1,3}[a-z]?(?:\s*[-–&et,]+\s*[0-9]{1,3})*|[ivxl]{1,6})?\b/i;

const SITE_RE =
  /^\s*(?:[IVXL]{1,6}\s*[.\-–:)]\s*)?(ouvrage|b[âa]timent|bloc|site|tranche|partie|composante|sous[\s-]?projet|module|zone|construction|r[ée]habilitation|am[ée]nagement|r[ée]alisation)\b/i;

const RECAP_RE = /^(r[ée]capitulati|r[ée]sum[ée] g[ée]n[ée]ral|synth[eè]se)/i;

// ── En-têtes de colonnes ─────────────────────────────────────

type ColMap = { num?: number; des?: number; unit?: number; qty?: number; pu?: number; amt?: number };

function headerRole(text: string): keyof ColMap | null {
  const t = normalizeText(text).trim();
  if (!t) return null;
  if (/^(n|no|n°|n °|num|numero|item|ref|reference|art|article|code|prix n|n prix|n° prix|n°prix)\b/.test(t) && t.length < 18)
    return "num";
  if (/designation|libelle|description|nature des|ouvrages|prestations|travaux/.test(t)) return "des";
  if (/^(u|un|unite|unites|u\.)\.?$/.test(t) || /^unite/.test(t)) return "unit";
  if (/qte|quantite|qtes|^q\.?$|quant/.test(t)) return "qty";
  if (/p\.?\s?u\b|prix unit|^pu\b|prix unitaire|p\.u\.?/.test(t)) return "pu";
  if (/montant|prix total|p\.?\s?t\b|^total|^pt$/.test(t)) return "amt";
  return null;
}

function detectHeader(rows: Cell[][]): { index: number; map: ColMap } | null {
  const limit = Math.min(rows.length, 60);
  for (let i = 0; i < limit; i++) {
    const map: ColMap = {};
    rows[i].forEach((c, ci) => {
      const role = headerRole(cellText(c));
      if (role && map[role] === undefined) map[role] = ci;
    });
    if (map.des !== undefined && (map.qty !== undefined || map.pu !== undefined)) {
      // En-tête sur deux lignes : complète avec la ligne suivante.
      const next = rows[i + 1];
      if (next) {
        next.forEach((c, ci) => {
          const role = headerRole(cellText(c));
          if (role && map[role] === undefined && role !== "des") map[role] = ci;
        });
      }
      return { index: i, map };
    }
  }
  return null;
}

// ── Lignes interprétées ──────────────────────────────────────

type ParsedRow =
  | { kind: "item"; n: string; d: string; u: string; q: number; pu: number }
  | { kind: "heading"; code: string; text: string }
  | { kind: "total"; text: string; amount: number | null }
  | { kind: "recap" }
  | { kind: "text"; text: string }
  | { kind: "skip" };

function splitCodeFromText(text: string): { code: string; rest: string } {
  const m = text.match(/^((?:[A-Z]{1,2}[.\-]?)?\d{1,3}(?:[.\-]\d{1,3})*[a-z]?|[IVXL]{1,6})\s*[.\-–:)/]\s*(.+)$/);
  if (m && m[2].length > 2) return { code: m[1], rest: m[2].trim() };
  const m2 = text.match(/^(\d{1,3}(?:\.\d{1,3})+)\s+(.+)$/);
  if (m2) return { code: m2[1], rest: m2[2].trim() };
  return { code: "", rest: text };
}

function resolveAmounts(nums: number[], hasUnit: boolean): { q: number; pu: number } | null {
  // nums : nombres en fin de ligne, dans l'ordre.
  if (nums.length >= 3) {
    const [a, b, c] = nums.slice(-3);
    if (Math.abs(a * b - c) <= Math.max(2, c * 0.01)) return { q: a, pu: b };
    // Colonnes P.U. / Qté inversées ou montant absent : on garde Qté, P.U.
    return { q: a, pu: b };
  }
  if (nums.length === 2) {
    const [a, b] = nums;
    return { q: a, pu: b };
  }
  if (nums.length === 1 && hasUnit) return { q: nums[0], pu: 0 };
  return null;
}

function interpretMapped(row: Cell[], map: ColMap): ParsedRow {
  const get = (k: keyof ColMap) => (map[k] === undefined ? undefined : row[map[k]!]);
  let n = cellText(get("num"));
  let d = cellText(get("des"));
  let u = cellText(get("unit"));
  let q = toNumber(get("qty"));
  let pu = toNumber(get("pu"));
  const amt = toNumber(get("amt"));

  // Textes hors colonnes reconnues (titres fusionnés, etc.)
  const known = new Set(Object.values(map));
  const extra = row
    .map((c, i) => (known.has(i) ? "" : cellText(c)))
    .filter((t) => t && toNumber(t) === null);
  if (!d && extra.length) d = extra.join(" ");
  if (!d && n && !isCode(n)) {
    d = n;
    n = "";
  }
  if (u && !isUnit(u) && toNumber(u) !== null && q === null) {
    q = toNumber(u);
    u = "";
  }
  if (!d && !n && q === null && pu === null && amt === null) return { kind: "skip" };

  const full = `${n} ${d}`.trim();
  if (RECAP_RE.test(d) || RECAP_RE.test(full)) return { kind: "recap" };
  if (TOTAL_RE.test(d) || TOTAL_RE.test(n) || /\btotal\b/i.test(d)) return { kind: "total", text: d, amount: amt };

  if (q === null && pu !== null && amt !== null && pu > 0) q = amt / pu;
  if (pu === null && q !== null && amt !== null && q > 0) pu = amt / q;

  const hasQty = q !== null && q !== 0;
  if (d && (hasQty || (u && isUnit(u)) || (pu !== null && pu > 0))) {
    if (!u && !hasQty && !pu) return { kind: "heading", code: n, text: d };
    return {
      kind: "item",
      n,
      d,
      u: u ? normalizeUnit(u) : "u",
      q: q ?? 0,
      pu: pu ?? 0,
    };
  }
  if (!d) return { kind: "skip" };
  if (amt !== null && amt > 0) {
    // Ligne titrée avec montant seul : sous-total / récapitulatif de lot.
    return { kind: "total", text: d, amount: amt };
  }
  const split = n ? { code: n, rest: d } : splitCodeFromText(d);
  return { kind: "heading", code: split.code, text: split.rest };
}

/** Découpe les nombres de fin de ligne quand le PDF a fusionné ou éclaté les cellules
 *  ("85000 1233690", "1 234 567", "2 000 000 1 2 000 000"). Cherche Qté × P.U. = Montant. */
export function splitNumericTail(tokens: string[]): number[] {
  const groups = tokens.flatMap((t) => t.split(/[\u00a0\u202f\s]+/)).filter(Boolean);
  if (groups.some((g) => toNumber(g) === null)) return tokens.map((t) => toNumber(t) ?? 0);
  const n = groups.length;
  if (n > 12) return groups.map((g) => toNumber(g)!);
  // Partitions en nombres : un groupe de 3 chiffres peut prolonger le précédent (séparateur de milliers).
  const results: number[][] = [];
  const walk = (i: number, acc: string[]) => {
    if (results.length > 2000) return;
    if (i === n) {
      results.push(acc.map((a) => toNumber(a)!));
      return;
    }
    walk(i + 1, [...acc, groups[i]]);
    if (acc.length && /^\d{3}([.,]\d+)?$/.test(groups[i]) && /^\d{1,3}( \d{3})*$/.test(acc[acc.length - 1]))
      walk(i + 1, [...acc.slice(0, -1), `${acc[acc.length - 1]} ${groups[i]}`]);
  };
  walk(0, []);
  const ok = (a: number[]) => {
    if (a.length < 3) return false;
    const [q, pu, m] = a.slice(-3);
    return m > 0 && Math.abs(q * pu - m) <= Math.max(2, m * 0.005);
  };
  const exact = results.filter((r) => r.length === 3 && ok(r));
  if (exact.length) return exact[0];
  const any = results.filter(ok).sort((x, y) => x.length - y.length);
  if (any.length) return any[0];
  // Par défaut : chaque cellule d'origine = un nombre.
  return tokens.map((t) => toNumber(t) ?? 0);
}

/** Interprétation sans en-tête : cellules non vides dans l'ordre. */
function interpretFree(row: Cell[]): ParsedRow {
  let cells = row.map(cellText).filter(Boolean);
  if (!cells.length) return { kind: "skip" };
  const isNumCell = (c: string) => /^[\d\s\u00a0\u202f.,]+$/.test(c) && /\d/.test(c);
  let end = cells.length;
  while (end > 0 && isNumCell(cells[end - 1])) end--;
  const nums = end < cells.length ? splitNumericTail(cells.slice(end)) : [];
  cells = cells.slice(0, end).concat([]);
  if (end > 0 && !isUnit(cells[end - 1])) {
    const m = cells[end - 1].match(/^(.*\S)\s+(m[²2³3]|ml|u|ens|ff|fft|kg|forfait|pm)$/i);
    if (m && nums.length) {
      cells[end - 1] = m[1];
      cells.splice(end, 0, m[2]);
      end++;
    }
  }
  let unit = "";
  if (end > 0 && isUnit(cells[end - 1])) {
    unit = cells[end - 1];
    end--;
  }
  let code = "";
  let start = 0;
  if (end > 1 && isCode(cells[0])) {
    code = cells[0];
    start = 1;
  }
  let text = cells.slice(start, end).join(" ").trim();
  if (!code) {
    const s = splitCodeFromText(text);
    if (s.code && (nums.length || unit)) {
      code = s.code;
      text = s.rest;
    }
  }
  if (!text) return { kind: "skip" };
  if (RECAP_RE.test(text)) return { kind: "recap" };
  if (TOTAL_RE.test(text) || /\btotal\b/i.test(text)) return { kind: "total", text, amount: nums.length ? nums[nums.length - 1] : null };

  const amounts = resolveAmounts(nums, !!unit);
  if (amounts && (unit || nums.length >= 2)) {
    return { kind: "item", n: code, d: text, u: unit ? normalizeUnit(unit) : "u", q: amounts.q, pu: amounts.pu };
  }
  if (nums.length === 1 && !unit) return { kind: "total", text, amount: nums[0] };
  if (!nums.length && !unit) {
    const s = code ? { code, rest: text } : splitCodeFromText(text);
    return { kind: "heading", code: s.code, text: s.rest };
  }
  return { kind: "text", text };
}

// ── Mise en forme des titres ─────────────────────────────────

const ACRONYMS = new Set(["VRD", "BA", "PVC", "CIE", "SODECI", "HA", "AEP", "EP", "EU", "EV", "RDC", "R+1", "R+2", "PEHD", "HT", "TTC", "TVA", "BPU", "DQE", "LED", "SECUREL", "CI", "II", "III", "IV", "VI", "VII", "VIII", "IX"]);

/** Titre en MAJUSCULES → casse de phrase ("GROS ŒUVRE" → "Gros œuvre"). */
function prettyTitle(text: string): string {
  let t = text.replace(/\s+/g, " ").replace(/\s*[:\-–]\s*$/, "").trim();
  t = t.replace(/\bOEUVRE\b/g, "ŒUVRE").replace(/\boeuvre\b/g, "œuvre");
  const letters = t.replace(/[^A-Za-zÀ-ÿŒœ]/g, "");
  const upper = letters.replace(/[^A-ZÀ-ÞŒ]/g, "").length;
  if (letters.length > 3 && upper / letters.length > 0.8) {
    let first = true;
    t = t
      .split(" ")
      .map((w) => {
        const bare = w.replace(/[^A-Za-zÀ-ÿŒœ+0-9]/g, "");
        if (ACRONYMS.has(bare)) {
          if (/[A-Za-z]/.test(bare)) first = false;
          return w;
        }
        let out = w.toLocaleLowerCase("fr-FR");
        if (first && /[a-zà-ÿœ]/.test(out)) {
          out = out.replace(/[a-zà-ÿœ]/, (c) => c.toLocaleUpperCase("fr-FR"));
          first = false;
        }
        return out;
      })
      .join(" ");
  }
  return t;
}

function lotTitle(code: string, text: string): string {
  const m = text.match(LOT_RE);
  if (m && m[0].trim().length) {
    const num = m[1] ? m[1].toUpperCase().replace(/\s+/g, "") : "";
    const rest = text.slice(m[0].length).replace(/^\s*[:\-–.)]\s*/, "").trim();
    return `Lot ${num}${rest ? ` : ${prettyTitle(rest)}` : ""}`.replace(/\s+:/, " :");
  }
  if (code) return `Lot ${code.replace(/\.$/, "")} : ${prettyTitle(text)}`;
  return prettyTitle(text);
}

function lotNumberKey(name: string): string | null {
  const m = name.match(/^Lot\s+([0-9A-Z\-–&,]+)/i);
  return m ? m[1].toUpperCase() : null;
}

// ── Assemblage ───────────────────────────────────────────────

type Builder = {
  sites: DqeSite[];
  lots: DqeLot[];
  items: DqeItem[];
  k: number;
  lotSeq: number;
  warnings: string[];
  declaredTotal: number | null;
};

type SheetResult = {
  entries: Array<{ row: ParsedRow }>;
};

function parseSheetRows(sheet: RawSheet): SheetResult {
  const found = detectHeader(sheet.rows);
  const free = sheet.layout === "free";
  const header = free ? null : found;
  const entries: Array<{ row: ParsedRow }> = [];
  const startAt = found ? found.index + 1 : 0;
  let stop = false;
  let itemsSeen = 0;
  for (let i = startAt; i < sheet.rows.length && !stop; i++) {
    const raw = sheet.rows[i];
    // Ligne d'en-tête répétée (PDF multi-pages)
    if (found && detectHeader([raw])) continue;
    let parsed = header ? interpretMapped(raw, header.map) : interpretFree(raw);
    if (header && parsed.kind === "skip") parsed = interpretFree(raw);
    if (parsed.kind === "recap" && itemsSeen > 0) {
      stop = true;
      break;
    }
    if (parsed.kind === "item") itemsSeen++;
    entries.push({ row: parsed });
  }
  return { entries };
}

const ROMAN_HEADING = (code: string) => ROMAN_RE.test(code.replace(/\.$/, ""));

function assembleSheet(b: Builder, sheetName: string, multiSheet: boolean, res: SheetResult) {
  const headings = res.entries.filter((e) => e.row.kind === "heading").map((e) => e.row as Extract<ParsedRow, { kind: "heading" }>);
  const hasLotKw = headings.some((h) => LOT_RE.test(h.text) && /^\s*lot\b/i.test(h.text));
  const hasRoman = headings.some((h) => ROMAN_HEADING(h.code));
  const hasArabicTop = headings.some((h) => h.code && !ROMAN_HEADING(h.code) && codeDepth(h.code) === 1);

  let site: DqeSite | null = null;
  const siteLotNumbers = new Set<string>();
  let lot: DqeLot | null = null;
  let section: string | undefined;
  let lastItem: DqeItem | null = null;
  const sheetPrefix = multiSheet ? sheetName : "";

  const newSite = (name: string) => {
    const s: DqeSite = { id: `S${b.sites.length + 1}`, name };
    b.sites.push(s);
    site = s;
    siteLotNumbers.clear();
    lot = null;
    section = undefined;
    return s;
  };
  const ensureSite = () => site ?? newSite(sheetPrefix || "Ouvrage principal");
  const newLot = (name: string) => {
    const key = lotNumberKey(name);
    if (key && siteLotNumbers.has(key) && site) {
      // Numérotation qui recommence : nouvel ouvrage.
      if (site.name === "Ouvrage principal") site.name = "Ouvrage 1";
      newSite(`${sheetPrefix ? `${sheetPrefix} – ` : ""}Ouvrage ${b.sites.length + 1}`);
    }
    const s = ensureSite();
    if (key) siteLotNumbers.add(key);
    const l: DqeLot = { id: `L${++b.lotSeq}`, site: s.id, name, category: "divers" };
    b.lots.push(l);
    lot = l;
    section = undefined;
    return l;
  };

  /** Le prochain titre structurant (avant tout article) est-il un titre de lot ? → ce titre est un ouvrage. */
  const nextIsLotHeading = (idx: number) => {
    for (let j = idx + 1; j < res.entries.length; j++) {
      const r = res.entries[j].row;
      if (r.kind === "item") return false;
      if (r.kind === "heading") return /^\s*lot\b/i.test(r.text);
    }
    return false;
  };

  for (const [idx, { row }] of res.entries.entries()) {
    if (row.kind === "skip") continue;
    if (row.kind === "total") {
      if (/\b(ht|hors taxe|g[ée]n[ée]ral)\b/i.test(row.text) && !/lot|sous/i.test(row.text) && row.amount) {
        b.declaredTotal = Math.max(b.declaredTotal ?? 0, row.amount);
      }
      lastItem = null;
      continue;
    }
    if (row.kind === "recap") continue;
    if (row.kind === "text") {
      if (lastItem && /^[a-zà-ÿ(]/.test(row.text)) lastItem.d = `${lastItem.d} ${row.text}`;
      continue;
    }
    if (row.kind === "heading") {
      const text = row.text;
      // Suite d'une désignation coupée sur deux lignes (PDF)
      if (lastItem && /^[a-zà-ÿ(]/.test(text) && !row.code) {
        lastItem.d = `${lastItem.d} ${text}`;
        continue;
      }
      lastItem = null;
      const isLotKw = /^\s*lot\b/i.test(text);
      const isSite = SITE_RE.test(text) && !isLotKw;
      if (isSite || (!isLotKw && hasLotKw && nextIsLotHeading(idx)) || (hasRoman && hasArabicTop && ROMAN_HEADING(row.code))) {
        newSite(`${sheetPrefix && !text.toLowerCase().includes(sheetPrefix.toLowerCase()) ? `${sheetPrefix} – ` : ""}${row.code ? `${row.code.replace(/\.$/, "")}. ` : ""}${prettyTitle(text)}`);
        continue;
      }
      if (isLotKw) {
        newLot(lotTitle(row.code, text));
        continue;
      }
      if (hasLotKw) {
        if (!lot) newLot(lotTitle(row.code, text));
        else section = prettyTitle(row.code ? `${row.code} ${text}` : text);
        continue;
      }
      const depth = row.code ? codeDepth(row.code) : 0;
      const letters = text.replace(/[^A-Za-zÀ-ÿ]/g, "");
      const isUpper = letters.length > 2 && letters === letters.toUpperCase();
      if ((row.code && depth === 1) || (!row.code && isUpper) || !lot) {
        newLot(lotTitle(row.code, text));
      } else {
        section = prettyTitle(row.code ? `${row.code} ${text}` : text);
      }
      continue;
    }
    // Article
    const target = lot ?? newLot("__AUTO__");
    const item: DqeItem = {
      k: ++b.k,
      lot: target.id,
      n: row.n,
      d: row.d,
      u: row.u,
      q: Math.round(row.q * 1000) / 1000,
      pu: Math.round(row.pu * 100) / 100,
    };
    if (section) item.sec = section;
    b.items.push(item);
    lastItem = item;
  }
}

/** Regroupe les articles d'un lot fourre-tout "__AUTO__" (DQE sans titres). */
function splitAutoLots(b: Builder): ParseReport["lotStrategy"] {
  const auto = b.lots.filter((l) => l.name === "__AUTO__");
  if (!auto.length) return "titres";
  let strategy: ParseReport["lotStrategy"] = "titres";
  for (const a of auto) {
    const its = b.items.filter((i) => i.lot === a.id);
    // 1) Par premier segment de la numérotation (2.3.1 → lot 2)
    const firstSeg = (n: string) => (n ? n.split(/[.\-]/)[0].replace(/[^0-9A-Z]/gi, "") : "");
    const groups = new Map<string, DqeItem[]>();
    its.forEach((i) => {
      const g = firstSeg(i.n);
      groups.set(g, [...(groups.get(g) ?? []), i]);
    });
    const numbered = its.filter((i) => firstSeg(i.n)).length;
    const newLots: DqeLot[] = [];
    if (groups.size > 1 && numbered / Math.max(1, its.length) > 0.8) {
      strategy = "numerotation";
      for (const [g, list] of groups) {
        const cat = classifyLot("", list.map((i) => i.d));
        const l: DqeLot = { id: `L${++b.lotSeq}`, site: a.site, name: `Lot ${g || "?"} : ${categoryByKey(cat).label}`, category: cat };
        newLots.push(l);
        list.forEach((i) => (i.lot = l.id));
      }
    } else {
      // 2) Par mots-clés : chaque article est rattaché à un corps d'état.
      strategy = "mots-cles";
      const byCat = new Map<string, DqeItem[]>();
      its.forEach((i) => {
        const c = classifyItem(i.d);
        byCat.set(c, [...(byCat.get(c) ?? []), i]);
      });
      const ordered = [...byCat.keys()].sort((x, y) => categoryByKey(x).order - categoryByKey(y).order);
      ordered.forEach((c, idx) => {
        const l: DqeLot = { id: `L${++b.lotSeq}`, site: a.site, name: `Lot ${idx + 1} : ${categoryByKey(c).label}`, category: c };
        newLots.push(l);
        byCat.get(c)!.forEach((i) => (i.lot = l.id));
      });
    }
    const pos = b.lots.indexOf(a);
    b.lots.splice(pos, 1, ...newLots);
  }
  return strategy;
}

/** Trie les articles dans l'ordre des lots (utile après regroupement par mots-clés). */
function orderItems(b: Builder) {
  const pos = new Map(b.lots.map((l, i) => [l.id, i]));
  b.items.sort((x, y) => (pos.get(x.lot)! - pos.get(y.lot)!) || x.k - y.k);
}

const SKIP_SHEET_RE = /r[ée]cap|synth[eè]se|sommaire|garde|^bpu|bordereau des prix|notice|instructions?/i;

export function parseDqe(sheets: RawSheet[], source: ParseReport["source"]): DqeData {
  const b: Builder = { sites: [], lots: [], items: [], k: 0, lotSeq: 0, warnings: [], declaredTotal: null };
  const parsed = sheets.map((s) => ({ sheet: s, res: parseSheetRows(s) }));
  const withItems = parsed.filter((p) => p.res.entries.some((e) => e.row.kind === "item"));
  let useful = withItems.filter((p) => !SKIP_SHEET_RE.test(p.sheet.name));
  if (!useful.length) useful = withItems;
  const multi = useful.length > 1;
  for (const p of useful) assembleSheet(b, p.sheet.name, multi, p.res);

  const strategy = splitAutoLots(b);

  // Supprime les lots/ouvrages vides, classe chaque lot par corps d'état.
  b.lots = b.lots.filter((l) => b.items.some((i) => i.lot === l.id));
  b.sites = b.sites.filter((s) => b.lots.some((l) => l.site === s.id));
  for (const l of b.lots) {
    if (l.category === "divers") l.category = classifyLot(l.name, b.items.filter((i) => i.lot === l.id).map((i) => i.d));
    if (/^Lot\s+[0-9A-Z]*$/i.test(l.name)) l.name = `${l.name} : ${categoryByKey(l.category).label}`;
  }
  orderItems(b);

  const rowsRead = sheets.reduce((s, sh) => s + sh.rows.length, 0);
  if (!b.items.length) {
    b.warnings.push(
      "Aucun article reconnu. Vérifiez que le fichier contient bien un tableau avec désignation, unité, quantité et prix unitaire."
    );
  }
  const unpriced = b.items.filter((i) => !i.pu).length;
  if (unpriced) b.warnings.push(`${unpriced} article(s) sans prix unitaire (à compléter dans le tableau).`);
  const noQty = b.items.filter((i) => !i.q).length;
  if (noQty) b.warnings.push(`${noQty} article(s) sans quantité (à compléter).`);
  const total = b.items.reduce((s, i) => s + i.q * i.pu, 0);
  if (b.declaredTotal && total && Math.abs(total - b.declaredTotal) > Math.max(10, b.declaredTotal * 0.005)) {
    b.warnings.push(
      `Le total HT recalculé (${Math.round(total).toLocaleString("fr-FR")} F) diffère du total indiqué dans le document (${Math.round(b.declaredTotal).toLocaleString("fr-FR")} F) : contrôlez les lignes signalées.`
    );
  }

  const report: ParseReport = {
    source,
    sheets: useful.map((p) => p.sheet.name),
    rowsRead,
    itemsFound: b.items.length,
    lotsFound: b.lots.length,
    lotStrategy: strategy,
    declaredTotal: b.declaredTotal,
    warnings: b.warnings,
  };

  const clone = <T,>(o: T): T => JSON.parse(JSON.stringify(o));
  return {
    sites: b.sites,
    lots: b.lots,
    items: b.items,
    att: [],
    suivi: null,
    tva: 0.18,
    orig: { lots: clone(b.lots), items: clone(b.items) },
    report,
  };
}
