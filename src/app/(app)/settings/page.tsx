import { requireSessionWithContext } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { OrgForm } from "./org-form";
import { upsertExchangeRateAction } from "@/lib/actions/settings";
import { AutoSubmitForm } from "../_components/auto-submit-form";

const CURRENCIES = [
  { code: "EUR", label: "Euro" },
  { code: "USD", label: "Dollar américain" },
  { code: "GBP", label: "Livre sterling" },
  { code: "XAF", label: "Franc CFA BEAC" },
  { code: "MAD", label: "Dirham marocain" },
  { code: "GNF", label: "Franc guinéen" },
  { code: "NGN", label: "Naira nigérian" },
];

export default async function SettingsPage() {
  const { organization } = await requireSessionWithContext();

  const rates = await prisma.exchangeRate.findMany({
    where: { organizationId: organization.id },
  });
  const rateByCode = new Map(rates.map((r) => [r.currencyCode, r.rateToXof]));

  return (
    <div className="max-w-3xl space-y-8 pb-16">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Paramètres du cabinet</h1>
        <p className="mt-1 text-sm text-slate-500">Configuration globale de votre organisation.</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <OrgForm
          defaults={{
            name: organization.name,
            address: organization.address ?? "",
            phone: organization.phone ?? "",
            email: organization.email ?? "",
            website: organization.website ?? "",
            defaultRegion: organization.defaultRegion,
            defaultCurrency: organization.defaultCurrency,
            defaultFgPct: organization.defaultFgPct,
            defaultBenefitPct: organization.defaultBenefitPct,
            primaryColor: organization.primaryColor,
            secondaryColor: organization.secondaryColor,
            pdfFooterText: organization.pdfFooterText ?? "",
          }}
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-slate-700">Taux de change</h2>
        <p className="mt-1 text-xs text-slate-500">
          Conversion vers {organization.defaultCurrency} pour les statistiques multi-devises.
          1 devise étrangère = X {organization.defaultCurrency}.
        </p>
        <div className="mt-4 space-y-2">
          {CURRENCIES.map((c) => (
            <AutoSubmitForm
              key={c.code}
              action={upsertExchangeRateAction}
              className="flex items-center gap-3"
            >
              <input type="hidden" name="currencyCode" value={c.code} />
              <span className="w-16 text-sm font-medium text-slate-700">{c.code}</span>
              <span className="flex-1 text-xs text-slate-400">{c.label}</span>
              <input
                name="rateToXof"
                type="number"
                step="0.0001"
                defaultValue={rateByCode.get(c.code) ?? ""}
                placeholder="—"
                className="w-32 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              />
              <span className="text-xs text-slate-400">{organization.defaultCurrency}</span>
            </AutoSubmitForm>
          ))}
        </div>
      </div>
    </div>
  );
}
