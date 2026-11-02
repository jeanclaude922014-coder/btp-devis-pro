import ExcelJS from "exceljs";
import type { Cell, RawSheet } from "./types";

export class DqeImportError extends Error {}

export type ExtractResult = { sheets: RawSheet[]; source: "excel" | "csv" | "pdf" };

export async function extractDqeFile(fileName: string, bytes: ArrayBuffer): Promise<ExtractResult> {
  const ext = fileName.toLowerCase().split(".").pop() ?? "";
  const head = new Uint8Array(bytes.slice(0, 8));
  const isPdf = head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46; // %PDF
  const isZip = head[0] === 0x50 && head[1] === 0x4b; // PK (xlsx)
  const isOle = head[0] === 0xd0 && head[1] === 0xcf; // ancien .xls

  if (isPdf || ext === "pdf") return { sheets: await extractPdf(bytes), source: "pdf" };
  if (isOle || ext === "xls") {
    throw new DqeImportError(
      "Format Excel 97-2003 (.xls) : ouvrez le fichier dans Excel et enregistrez-le au format .xlsx, puis réimportez-le."
    );
  }
  if (isZip || ext === "xlsx" || ext === "xlsm") return { sheets: await extractXlsx(bytes), source: "excel" };
  if (ext === "csv" || ext === "txt") return { sheets: [extractCsv(new TextDecoder("utf-8").decode(bytes))], source: "csv" };
  throw new DqeImportError("Format non pris en charge. Importez un fichier Excel (.xlsx), CSV ou PDF.");
}

// ── Excel ────────────────────────────────────────────────────

function excelValue(v: ExcelJS.CellValue): Cell {
  if (v === null || v === undefined) return null;
  if (typeof v === "number" || typeof v === "string") return v;
  if (typeof v === "boolean") return null;
  if (v instanceof Date) return null;
  if (typeof v === "object") {
    if ("result" in v) {
      const r = (v as ExcelJS.CellFormulaValue).result;
      if (typeof r === "number" || typeof r === "string") return r;
      return null;
    }
    if ("richText" in v) return (v as ExcelJS.CellRichTextValue).richText.map((t) => t.text).join("");
    if ("text" in v) return String((v as ExcelJS.CellHyperlinkValue).text);
    if ("error" in v) return null;
  }
  return null;
}

async function extractXlsx(bytes: ArrayBuffer): Promise<RawSheet[]> {
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(bytes);
  } catch {
    throw new DqeImportError("Fichier Excel illisible ou protégé par mot de passe.");
  }
  const sheets: RawSheet[] = [];
  wb.eachSheet((ws) => {
    if (ws.state && ws.state !== "visible") return;
    const rows: Cell[][] = [];
    const max = Math.min(ws.rowCount, 5000);
    for (let r = 1; r <= max; r++) {
      const row = ws.getRow(r);
      const cells: Cell[] = [];
      const cols = Math.min(Math.max(row.cellCount, 0), 30);
      for (let c = 1; c <= cols; c++) {
        const cell = row.getCell(c);
        // Cellules fusionnées : seule la cellule maîtresse porte la valeur.
        if (cell.isMerged && cell.master && cell.master.address !== cell.address) {
          cells.push(null);
          continue;
        }
        cells.push(excelValue(cell.value));
      }
      rows.push(cells);
    }
    sheets.push({ name: ws.name, rows });
  });
  if (!sheets.length) throw new DqeImportError("Le classeur ne contient aucune feuille visible.");
  return sheets;
}

// ── CSV ──────────────────────────────────────────────────────

function extractCsv(text: string): RawSheet {
  const clean = text.replace(/^﻿/, "");
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? "";
  const sep = (firstLine.match(/;/g) ?? []).length >= (firstLine.match(/,/g) ?? []).length ? ";" : firstLine.includes("\t") ? "\t" : ",";
  const rows: Cell[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (inQ) {
      if (ch === '"' && clean[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') inQ = false;
      else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === sep) {
      row.push(cur);
      cur = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && clean[i + 1] === "\n") i++;
      row.push(cur);
      rows.push(row);
      row = [];
      cur = "";
    } else cur += ch;
  }
  if (cur || row.length) {
    row.push(cur);
    rows.push(row);
  }
  return { name: "CSV", rows };
}

// ── PDF ──────────────────────────────────────────────────────

type TextItem = { str: string; x: number; y: number; width: number; fontSize: number };

async function extractPdf(bytes: ArrayBuffer): Promise<RawSheet[]> {
  const { extractTextItems, getDocumentProxy } = await import("unpdf");
  let pages: TextItem[][];
  try {
    const doc = await getDocumentProxy(new Uint8Array(bytes));
    const res = await extractTextItems(doc);
    pages = res.items as unknown as TextItem[][];
  } catch {
    throw new DqeImportError("PDF illisible ou protégé.");
  }
  const rows: Cell[][] = [];
  let chars = 0;
  for (const items of pages) {
    const list = items.filter((i) => i.str && i.str.trim());
    chars += list.reduce((s, i) => s + i.str.trim().length, 0);
    // Regroupement en lignes (y décroissant)
    list.sort((a, b) => b.y - a.y || a.x - b.x);
    const lines: TextItem[][] = [];
    for (const it of list) {
      const tol = Math.max(2, (it.fontSize || 10) * 0.45);
      const line = lines.find((l) => Math.abs(l[0].y - it.y) <= tol);
      if (line) line.push(it);
      else lines.push([it]);
    }
    lines.sort((a, b) => b[0].y - a[0].y);
    for (const line of lines) {
      line.sort((a, b) => a.x - b.x);
      const cells: string[] = [];
      let cur = "";
      let lastEnd = -Infinity;
      for (const it of line) {
        const gap = it.x - lastEnd;
        const fs = it.fontSize || 10;
        if (cur && gap > fs * 0.9) {
          cells.push(cur.trim());
          cur = "";
        }
        cur += (cur && gap > fs * 0.15 ? " " : "") + it.str;
        lastEnd = it.x + it.width;
      }
      if (cur.trim()) cells.push(cur.trim());
      rows.push(cells);
    }
  }
  if (chars < 40) {
    throw new DqeImportError(
      "Ce PDF ne contient pas de texte (document scanné). Importez la version Excel du DQE ou un PDF généré depuis Excel/Word."
    );
  }
  return [{ name: "PDF", rows, layout: "free" }];
}
