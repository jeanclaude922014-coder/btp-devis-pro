import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSessionWithContext } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { computeLineTotal, computeQuoteTotal, formatXof } from "@/lib/pricing";
import {
  updateQuoteMetaAction,
  deleteQuoteAction,
  addLotFromCategoryAction,
  addCustomLotAction,
  deleteLotAction,
  addLineFromCatalogAction,
  addCustomLineAction,
  updateLineFieldsAction,
  deleteLineAction,
} from "@/lib/actions/quotes";
import { AutoSubmitForm } from "../../../../_components/auto-submit-form";

const STATUS_OPTIONS = [
  { value: "brouillon", label: "Brouillon" },
  { value: "envoye", label: "Envoyé" },
  { value: "accepte", label: "Accepté" },
  { value: "refuse", label: "Refusé" },
];

export default async function QuoteBuilderPage({
  params,
}: {
  params: Promise<{ id: string; quoteId: string }>;
}) {
  const { id: projectId, quoteId } = await params;
  const { organization } = await requireSessionWithContext();

  const quote = await prisma.quote.findFirst({
    where: { id: quoteId, organizationId: organization.id, projectId },
    include: {
      project: true,
      lots: {
        orderBy: { position: "asc" },
        include: { lines: { orderBy: { position: "asc" } } },
      },
    },
  });
  if (!quote) notFound();

  const categories = await prisma.priceCategory.findMany({
    where: { OR: [{ organizationId: organization.id }, { organizationId: null }] },
    include: { items: { orderBy: { position: "asc" } } },
    orderBy: { position: "asc" },
  });

  const grandTotal = computeQuoteTotal(quote);
  const updateMeta = updateQuoteMetaAction.bind(null, quote.id);

  return (
    <div className="max-w-5xl space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={`/projects/${projectId}`}
            className="text-sm text-blue-700 hover:underline"
          >
            ← {quote.project.name}
          </Link>
          <h1 className="mt-1 text-xl font-semibold text-slate-900">{quote.name}</h1>
        </div>
        <div className="flex items-center gap-4">
          <a
            href={`/projects/${projectId}/quotes/${quote.id}/pdf`}
            className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-900"
          >
            Télécharger le PDF
          </a>
          <form action={deleteQuoteAction}>
            <input type="hidden" name="quoteId" value={quote.id} />
            <input type="hidden" name="projectId" value={projectId} />
            <button type="submit" className="text-sm font-medium text-red-600 hover:underline">
              Supprimer le devis
            </button>
          </form>
        </div>
      </div>

      {/* Méta du devis */}
      <AutoSubmitForm
        action={updateMeta}
        className="grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-4"
      >
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-xs font-medium text-slate-500">Nom</label>
          <input
            name="name"
            defaultValue={quote.name}
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500">Statut</label>
          <select
            name="status"
            defaultValue={quote.status}
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500">
            Frais généraux (%)
          </label>
          <input
            name="fgPct"
            type="number"
            step="0.1"
            defaultValue={quote.fgPct}
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500">
            Bénéfice &amp; aléas (%)
          </label>
          <input
            name="benefitPct"
            type="number"
            step="0.1"
            defaultValue={quote.benefitPct}
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </div>
      </AutoSubmitForm>

      {/* Lots */}
      {quote.lots.map((lot) => {
        const lotTotal = lot.lines.reduce(
          (sum, line) =>
            sum + computeLineTotal(line, quote.fgPct, quote.benefitPct).totalVente,
          0
        );
        return (
          <div key={lot.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div
              className="flex items-center justify-between px-5 py-3"
              style={{ backgroundColor: lot.colorHex }}
            >
              <div className="font-semibold text-white">
                LOT {lot.code} — {lot.name}
              </div>
              <div className="flex items-center gap-4">
                <span className="font-semibold text-white">
                  {formatXof(lotTotal)} {quote.currency}
                </span>
                <form action={deleteLotAction}>
                  <input type="hidden" name="lotId" value={lot.id} />
                  <button type="submit" className="text-sm text-white/80 hover:text-white">
                    Supprimer
                  </button>
                </form>
              </div>
            </div>

            {lot.lines.length > 0 && (
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Désignation</th>
                    <th className="px-3 py-2">Unité</th>
                    <th className="px-3 py-2">Qté</th>
                    <th className="px-3 py-2">MO (h)</th>
                    <th className="px-3 py-2">Taux MO</th>
                    <th className="px-3 py-2">Matériaux</th>
                    <th className="px-3 py-2">Matériel</th>
                    <th className="px-3 py-2">PV unit.</th>
                    <th className="px-3 py-2">Total</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lot.lines.map((line) => {
                    const breakdown = computeLineTotal(line, quote.fgPct, quote.benefitPct);
                    return (
                      <tr key={line.id}>
                        <td colSpan={10} className="p-0">
                          <AutoSubmitForm
                            action={updateLineFieldsAction}
                            className="grid grid-cols-10 items-center gap-1 px-3 py-1.5"
                          >
                            <input type="hidden" name="lineId" value={line.id} />
                            <input
                              name="designation"
                              defaultValue={line.designation}
                              className="col-span-1 w-full rounded border border-transparent px-1 py-1 text-sm hover:border-slate-300 focus:border-blue-500 focus:outline-none"
                            />
                            <input
                              name="unit"
                              defaultValue={line.unit}
                              className="w-full rounded border border-transparent px-1 py-1 text-sm hover:border-slate-300 focus:border-blue-500 focus:outline-none"
                            />
                            <input
                              name="quantity"
                              type="number"
                              step="0.01"
                              defaultValue={line.quantity}
                              className="w-full rounded border border-transparent px-1 py-1 text-sm hover:border-slate-300 focus:border-blue-500 focus:outline-none"
                            />
                            <input
                              name="laborHours"
                              type="number"
                              step="0.01"
                              defaultValue={line.laborHours}
                              className="w-full rounded border border-transparent px-1 py-1 text-sm hover:border-slate-300 focus:border-blue-500 focus:outline-none"
                            />
                            <input
                              name="laborRateXof"
                              type="number"
                              step="1"
                              defaultValue={line.laborRateXof}
                              className="w-full rounded border border-transparent px-1 py-1 text-sm hover:border-slate-300 focus:border-blue-500 focus:outline-none"
                            />
                            <input
                              name="materialsXof"
                              type="number"
                              step="1"
                              defaultValue={line.materialsXof}
                              className="w-full rounded border border-transparent px-1 py-1 text-sm hover:border-slate-300 focus:border-blue-500 focus:outline-none"
                            />
                            <input
                              name="equipmentXof"
                              type="number"
                              step="1"
                              defaultValue={line.equipmentXof}
                              className="w-full rounded border border-transparent px-1 py-1 text-sm hover:border-slate-300 focus:border-blue-500 focus:outline-none"
                            />
                            <div className="text-sm text-slate-600">
                              {formatXof(breakdown.prixVente)}
                            </div>
                            <div className="text-sm font-semibold text-slate-900">
                              {formatXof(breakdown.totalVente)}
                            </div>
                            <button
                              type="submit"
                              formAction={deleteLineAction}
                              formNoValidate
                              className="justify-self-end text-xs text-red-500 hover:underline"
                            >
                              ✕
                            </button>
                          </AutoSubmitForm>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {/* Ajouter une ligne depuis la bibliothèque */}
            <form
              action={addLineFromCatalogAction}
              className="flex flex-wrap items-end gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3"
            >
              <input type="hidden" name="lotId" value={lot.id} />
              <div className="flex-1 min-w-[240px]">
                <label className="block text-xs font-medium text-slate-500">
                  Ajouter depuis la bibliothèque
                </label>
                <select
                  name="priceItemId"
                  required
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                >
                  <option value="">— Choisir un article —</option>
                  {categories.map((cat) => (
                    <optgroup key={cat.id} label={`${cat.code} — ${cat.name}`}>
                      {cat.items.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.designation} ({item.unit})
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div className="w-24">
                <label className="block text-xs font-medium text-slate-500">Quantité</label>
                <input
                  name="quantity"
                  type="number"
                  step="0.01"
                  defaultValue={1}
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                />
              </div>
              <button
                type="submit"
                className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-900"
              >
                Ajouter
              </button>
            </form>

            {/* Ligne personnalisée */}
            <details className="border-t border-slate-100 bg-white px-4 py-3">
              <summary className="cursor-pointer text-xs font-medium text-slate-500">
                + Ajouter une ligne personnalisée
              </summary>
              <form
                action={addCustomLineAction}
                className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4"
              >
                <input type="hidden" name="lotId" value={lot.id} />
                <input
                  name="designation"
                  placeholder="Désignation"
                  required
                  className="col-span-2 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                />
                <input
                  name="unit"
                  placeholder="Unité"
                  defaultValue="u"
                  className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                />
                <input
                  name="quantity"
                  type="number"
                  step="0.01"
                  placeholder="Quantité"
                  defaultValue={1}
                  className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                />
                <input
                  name="laborHours"
                  type="number"
                  step="0.01"
                  placeholder="MO (h)"
                  defaultValue={0}
                  className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                />
                <input
                  name="laborRateXof"
                  type="number"
                  placeholder="Taux MO (XOF/h)"
                  defaultValue={0}
                  className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                />
                <input
                  name="materialsXof"
                  type="number"
                  placeholder="Matériaux (XOF)"
                  defaultValue={0}
                  className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                />
                <input
                  name="equipmentXof"
                  type="number"
                  placeholder="Matériel (XOF)"
                  defaultValue={0}
                  className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                />
                <button
                  type="submit"
                  className="col-span-2 rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-900 sm:col-span-1"
                >
                  Ajouter
                </button>
              </form>
            </details>
          </div>
        );
      })}

      {/* Ajouter un lot */}
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <form action={addLotFromCategoryAction} className="flex items-end gap-2">
            <input type="hidden" name="quoteId" value={quote.id} />
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-500">
                Ajouter un lot depuis la bibliothèque
              </label>
              <select
                name="categoryId"
                required
                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              >
                <option value="">— Choisir un lot —</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.code} — {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="rounded-md bg-blue-800 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-900"
            >
              Ajouter
            </button>
          </form>

          <form action={addCustomLotAction} className="flex items-end gap-2">
            <input type="hidden" name="quoteId" value={quote.id} />
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-500">
                Ou créer un lot personnalisé
              </label>
              <input
                name="name"
                placeholder="Nom du lot"
                required
                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              />
            </div>
            <button
              type="submit"
              className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-900"
            >
              Créer
            </button>
          </form>
        </div>
      </div>

      {/* Total */}
      <div className="sticky bottom-4 flex items-center justify-between rounded-xl border border-slate-300 bg-white p-5 shadow-lg">
        <span className="text-sm font-medium text-slate-600">DEVIS QUANTITATIF ESTIMATIF — TOTAL</span>
        <span className="text-2xl font-bold text-slate-900">
          {formatXof(grandTotal)} {quote.currency}
        </span>
      </div>
    </div>
  );
}
