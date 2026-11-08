// Tests du moteur de prix (src/lib/pricing.ts).
// Cas de référence : docs/validation/FICHE_VALIDATION_PRIX_DE_REVIENT.md (calculs faits à la main).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeLineTotal,
  computeQuoteTotal,
  computeUnitPricing,
  convertToXof,
  roundToUnit,
  type QuoteLineLike,
} from "./pricing";

// Cas C1 : 2 h × 1 500 F/h, matériaux 10 000 F, matériel 500 F, FG 15 %, bénéfice 10 %.
const C1 = { laborHours: 2, laborRateXof: 1500, materialsXof: 10000, equipmentXof: 500 };

test("C1 — décomposition déboursé sec → prix de revient → prix de vente", () => {
  const r = computeUnitPricing(C1, 15, 10);
  assert.equal(r.laborCost, 3000);
  assert.equal(r.deboursesec, 13500);
  assert.equal(r.fraisGeneraux, 2025);
  assert.equal(r.prixRevient, 15525);
  assert.equal(r.benefice, 1552.5);
  assert.equal(r.prixVente, 17077.5);
});

test("C1 — total de ligne pour 12,5 unités arrondi au franc", () => {
  // 17 077,5 × 12,5 = 213 468,75 F → 213 469 F
  assert.equal(computeLineTotal({ ...C1, quantity: 12.5 }, 15, 10).totalVente, 213469);
});

test("Frais généraux et bénéfice nuls : prix de vente = déboursé sec", () => {
  assert.equal(computeUnitPricing(C1, 0, 0).prixVente, 13500);
});

test("Quantité nulle : total de ligne nul", () => {
  assert.equal(computeLineTotal({ ...C1, quantity: 0 }, 15, 10).totalVente, 0);
});

test("C2 — le total du devis est exactement la somme des lignes affichées", () => {
  // 0,33 h × 625 F/h + 101 F, FG 15 %, B 10 % → PV = 388,67125 F par ligne.
  const line: QuoteLineLike = { laborHours: 0.33, laborRateXof: 625, materialsXof: 101, equipmentXof: 0, quantity: 1 };
  const quote = { fgPct: 15, benefitPct: 10, lots: [{ lines: [line, line, line] }] };
  const lineTotal = computeLineTotal(line, 15, 10).totalVente;
  assert.equal(lineTotal, 389);
  assert.equal(computeQuoteTotal(quote), 3 * lineTotal); // 1 167 F (avant correction : 1 166,01)
});

test("Total du devis sur plusieurs lots", () => {
  const quote = {
    fgPct: 15,
    benefitPct: 10,
    lots: [{ lines: [{ ...C1, quantity: 2 }] }, { lines: [{ ...C1, quantity: 1 }] }],
  };
  // 2 × 17 077,5 = 34 155 F ; 1 × 17 077,5 = 17 077,5 → 17 078 F ; total 51 233 F
  assert.equal(computeQuoteTotal(quote), 51233);
});

test("roundToUnit — demi-franc arrondi vers le haut", () => {
  assert.equal(roundToUnit(0.5), 1);
  assert.equal(roundToUnit(1.49), 1);
  assert.equal(roundToUnit(213468.75), 213469);
});

test("convertToXof — 100 EUR au taux 655,957", () => {
  assert.equal(convertToXof(100, 655.957), 65595.7);
});
