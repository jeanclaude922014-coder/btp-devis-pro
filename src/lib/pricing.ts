/**
 * Moteur de calcul du prix de revient BTP.
 *
 * Déboursé sec (DS)   = coût main d'oeuvre + matériaux + matériel
 * Prix de revient (PR) = DS × (1 + fraisGeneraux%)
 * Prix de vente (PV)   = PR × (1 + bénéfice%) = DS × (1+FG%) × (1+Bénéfice%)
 */

export type PriceInputs = {
  laborHours: number;
  laborRateXof: number;
  materialsXof: number;
  equipmentXof: number;
};

export type PricingBreakdown = {
  laborCost: number;
  materialsCost: number;
  equipmentCost: number;
  deboursesec: number;
  fraisGeneraux: number;
  prixRevient: number;
  benefice: number;
  prixVente: number;
};

export function computeUnitPricing(
  inputs: PriceInputs,
  fgPct: number,
  benefitPct: number
): PricingBreakdown {
  const laborCost = inputs.laborHours * inputs.laborRateXof;
  const materialsCost = inputs.materialsXof;
  const equipmentCost = inputs.equipmentXof;
  const deboursesec = laborCost + materialsCost + equipmentCost;
  const fraisGeneraux = (deboursesec * fgPct) / 100;
  const prixRevient = deboursesec + fraisGeneraux;
  const benefice = (prixRevient * benefitPct) / 100;
  const prixVente = prixRevient + benefice;

  return {
    laborCost,
    materialsCost,
    equipmentCost,
    deboursesec,
    fraisGeneraux,
    prixRevient,
    benefice,
    prixVente,
  };
}

export type QuoteLineLike = PriceInputs & { quantity: number };

export function computeLineTotal(
  line: QuoteLineLike,
  fgPct: number,
  benefitPct: number
): PricingBreakdown & { totalVente: number } {
  const breakdown = computeUnitPricing(line, fgPct, benefitPct);
  return { ...breakdown, totalVente: breakdown.prixVente * line.quantity };
}

export type QuoteLike = {
  fgPct: number;
  benefitPct: number;
  lots: { lines: QuoteLineLike[] }[];
};

export function computeQuoteTotal(quote: QuoteLike): number {
  return quote.lots.reduce(
    (sum, lot) =>
      sum +
      lot.lines.reduce(
        (lotSum, line) =>
          lotSum + computeLineTotal(line, quote.fgPct, quote.benefitPct).totalVente,
        0
      ),
    0
  );
}

export function formatXof(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

export function convertToXof(amount: number, rateToXof: number): number {
  return amount * rateToXof;
}
