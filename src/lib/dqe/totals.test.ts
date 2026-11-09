// Tests du moteur de montants et de TVA des DQE (src/lib/dqe/totals.ts) — audit A-05.
// Tous les résultats attendus ont été calculés à la main (voir docs/validation/FICHE_VALIDATION_SUIVI_DQE_TVA.md).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  attachmentAmount,
  executedAmount,
  executedQty,
  formatRate,
  lineAmount,
  normalizeRate,
  splitTaxes,
  summarizeDqe,
  taxLabel,
  taxes,
} from "./totals";
import type { DqeData } from "./types";

test("Montant d'article arrondi au franc ; saisies invalides ou négatives = 0", () => {
  assert.equal(lineAmount({ q: 12.5, pu: 1333 }), 16663); // 16 662,5 → 16 663
  assert.equal(lineAmount({ q: 3, pu: 0 }), 0);
  assert.equal(lineAmount({ q: -2, pu: 1000 }), 0);
  assert.equal(lineAmount({ q: Number.NaN, pu: 1000 }), 0);
});

test("Réalisé plafonné à la quantité du marché, arrondi au franc", () => {
  assert.equal(executedAmount({ q: 10, pu: 1500.5 }, 4), 6002); // 4 × 1 500,5
  assert.equal(executedAmount({ q: 10, pu: 1000 }, 12), 10000); // dépassement non valorisé
  assert.equal(executedAmount({ q: 10, pu: 1000 }, -3), 0);
});

test("Cumul des attachements jusqu'à la date de situation incluse", () => {
  const att = [
    { d: "2026-10-01", k: 1, q: 2 },
    { d: "2026-10-15", k: 1, q: 3 },
    { d: "2026-11-01", k: 1, q: 4 },
    { d: "2026-10-10", k: 2, q: 9 },
  ];
  assert.equal(executedQty(att, 1, "2026-10-15"), 5);
  assert.equal(executedQty(att, 1, null), 9);
  assert.equal(attachmentAmount({ q: 2.5 }, { pu: 333 }), 833); // 832,5 → 833
  assert.equal(attachmentAmount({ q: 1 }, undefined), 0);
});

test("TVA 18 % arrondie une seule fois, TTC = HT + TVA", () => {
  // 1 234 567 × 0,18 = 222 222,06 → 222 222 ; TTC = 1 456 789
  assert.deepEqual(taxes(1234567, 0.18), { ht: 1234567, tva: 222222, ttc: 1456789 });
});

test("Réalisé + reste = marché, au franc près, en HT, TVA et TTC", () => {
  // Marché 1 003 F HT, réalisé 501 F HT, TVA 18 %.
  // Avant correction : TVA marché 180,54 → 181 ; réalisé 90,18 → 90 ; reste 90,36 → 90 ; 90 + 90 ≠ 181.
  const t = splitTaxes(1003, 501, 0.18);
  assert.deepEqual(t.total, { ht: 1003, tva: 181, ttc: 1184 });
  assert.deepEqual(t.executed, { ht: 501, tva: 90, ttc: 591 });
  assert.deepEqual(t.remaining, { ht: 502, tva: 91, ttc: 593 });
  assert.equal(t.executed.tva + t.remaining.tva, t.total.tva);
  assert.equal(t.executed.ttc + t.remaining.ttc, t.total.ttc);
});

test("Marché exonéré (taux 0) et taux hors limites", () => {
  assert.deepEqual(taxes(500000, 0), { ht: 500000, tva: 0, ttc: 500000 });
  assert.equal(taxLabel(0), "TVA (exonéré)");
  assert.equal(normalizeRate(-0.2), 0);
  assert.equal(normalizeRate(18), 1); // un taux saisi en % par erreur est borné à 100 %
  assert.equal(normalizeRate("abc"), 0);
});

test("Libellé du taux : décimales conservées (9,5 % n'est plus affiché 10 %)", () => {
  assert.equal(formatRate(0.18).replace(/\s/g, " "), "18 %");
  assert.equal(formatRate(0.095).replace(/\s/g, " "), "9,5 %");
});

// DQE de test : 2 ouvrages, 3 lots, 4 articles, attachements à deux dates.
const data: DqeData = {
  sites: [
    { id: "S1", name: "Bâtiment A" },
    { id: "S2", name: "Clôture" },
  ],
  lots: [
    { id: "L1", site: "S1", name: "Lot 1", category: "gros_oeuvre" },
    { id: "L2", site: "S1", name: "Lot 2", category: "divers" },
    { id: "L3", site: "S2", name: "Lot 3", category: "divers" },
  ],
  items: [
    { k: 1, lot: "L1", n: "1.1", d: "Béton", u: "m3", q: 12.5, pu: 85000 }, // 1 062 500
    { k: 2, lot: "L1", n: "1.2", d: "Acier", u: "kg", q: 1033, pu: 1250.5 }, // 1 291 766,5 → 1 291 767
    { k: 3, lot: "L2", n: "2.1", d: "Enduit", u: "m2", q: 40, pu: 2200 }, // 88 000
    { k: 4, lot: "L3", n: "3.1", d: "Clôture", u: "ml", q: 30, pu: 25000 }, // 750 000
  ],
  att: [
    { d: "2026-10-01", k: 1, q: 5 }, // 425 000
    { d: "2026-10-20", k: 2, q: 400.3 }, // 500 575,15 → 500 575
    { d: "2026-10-20", k: 3, q: 50 }, // plafonné à 40 → 88 000 (soldé)
    { d: "2026-11-05", k: 4, q: 10 }, // après la situation du 31/10
  ],
  suivi: "2026-10-31",
  tva: 0.18,
  orig: { lots: [], items: [] },
  report: { source: "excel", sheets: [], rowsRead: 0, itemsFound: 4, lotsFound: 3, lotStrategy: "titres", declaredTotal: null, warnings: [] },
};
data.orig = {
  lots: data.lots,
  items: data.items.map((i) => (i.k === 4 ? { ...i, q: 20 } : i)), // DQE d'origine : 20 ml de clôture (500 000)
};

test("Indicateurs du marché complet au 31/10/2026", () => {
  const s = summarizeDqe(data, { upto: "2026-10-31" });
  assert.equal(s.ht, 1062500 + 1291767 + 88000 + 750000); // 3 192 267
  assert.equal(s.ex, 425000 + 500575 + 88000); // 1 013 575
  assert.equal(s.nArt, 4);
  assert.equal(s.nDone, 1);
  assert.equal(s.diff, 250000); // clôture passée de 20 à 30 ml
  const t = splitTaxes(s.ht, s.ex, data.tva);
  assert.deepEqual(t.total, { ht: 3192267, tva: 574608, ttc: 3766875 }); // 574 608,06
  assert.deepEqual(t.executed, { ht: 1013575, tva: 182444, ttc: 1196019 }); // 182 443,5 → 182 444
  assert.deepEqual(t.remaining, { ht: 2178692, tva: 392164, ttc: 2570856 });
});

test("Indicateurs filtrés sur un ouvrage", () => {
  const s = summarizeDqe(data, { site: "S2", upto: "2026-11-30" });
  assert.equal(s.ht, 750000);
  assert.equal(s.ex, 250000);
  assert.equal(s.diff, 250000);
});

// ── Cohérence avec l'outil hors ligne outils/DQE_Lots_et_Suivi.html ──────────
// Le bloc « DQE-TOTALS » de l'outil doit appliquer exactement les mêmes règles.
type HtmlTotals = {
  lineAmount: (i: { q: number; pu: number }) => number;
  executedAmount: (i: { q: number; pu: number }, e: number) => number;
  attachmentAmount: (a: { q: number }, i?: { pu: number }) => number;
  splitTaxes: typeof splitTaxes;
  taxLabel: (r: number) => string;
};

function loadHtmlTotals(): HtmlTotals {
  const html = readFileSync(new URL("../../../outils/DQE_Lots_et_Suivi.html", import.meta.url), "utf8");
  const m = html.match(/\/\* DQE-TOTALS:BEGIN \*\/([\s\S]*?)\/\* DQE-TOTALS:END \*\//);
  assert.ok(m, "Bloc DQE-TOTALS introuvable dans l'outil hors ligne");
  return new Function(`${m[1]}; return { lineAmount: TX.mt, executedAmount: TX.exA, attachmentAmount: TX.attA, splitTaxes: TX.split, taxLabel: TX.label };`)();
}

test("Outil hors ligne : mêmes montants et même TVA que l'application", () => {
  const h = loadHtmlTotals();
  for (const i of data.items) {
    assert.equal(h.lineAmount(i), lineAmount(i));
    for (const e of [0, 1.5, 400.3, 1e6]) assert.equal(h.executedAmount(i, e), executedAmount(i, e));
  }
  assert.equal(h.attachmentAmount({ q: 2.5 }, { pu: 333 }), 833);
  for (const [ht, ex, r] of [[1003, 501, 0.18], [3192267, 1013575, 0.18], [500000, 0, 0], [999, 333, 0.095]]) {
    assert.deepEqual(h.splitTaxes(ht, ex, r), splitTaxes(ht, ex, r));
  }
  assert.equal(h.taxLabel(0), "TVA (exonéré)");
});
