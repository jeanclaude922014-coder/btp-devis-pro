import { requireSessionWithContext } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { computeUnitPricing, formatXof } from "@/lib/pricing";
import {
  createPriceCategoryAction,
  deletePriceCategoryAction,
  createPriceItemAction,
  updatePriceItemFieldsAction,
  deletePriceItemAction,
} from "@/lib/actions/price-library";
import { AutoSubmitForm } from "../_components/auto-submit-form";

export default async function PriceLibraryPage() {
  const { organization } = await requireSessionWithContext();

  const categories = await prisma.priceCategory.findMany({
    where: { OR: [{ organizationId: organization.id }, { organizationId: null }] },
    include: { items: { orderBy: { position: "asc" } } },
    orderBy: { position: "asc" },
  });

  const totalItems = categories.reduce((sum, c) => sum + c.items.length, 0);

  return (
    <div className="max-w-5xl space-y-6 pb-16">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Bibliothèque de prix</h1>
        <p className="mt-1 text-sm text-slate-500">
          {categories.length} lot(s) — {totalItems} article(s). Région : {organization.defaultRegion} ·
          Devise : {organization.defaultCurrency}.
        </p>
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
          <span className="font-semibold text-blue-800">MO</span> = heures × taux horaire ·{" "}
          <span className="font-semibold text-amber-700">Matériaux</span> = fournitures + pertes ·{" "}
          <span className="font-semibold text-slate-700">Déboursé sec (DS)</span> = MO + Matériaux + Matériel ·{" "}
          <span className="font-semibold text-green-700">Prix de vente</span> = DS × (1+FG%) × (1+Bénéfice%)
        </div>
      </div>

      {categories.map((cat) => {
        const isCustomCategory = cat.organizationId === organization.id;
        return (
          <div key={cat.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div
              className="flex items-center justify-between px-5 py-3"
              style={{ backgroundColor: cat.colorHex }}
            >
              <div className="font-semibold text-white">
                {cat.code} — {cat.name}{" "}
                {!isCustomCategory && (
                  <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-xs">
                    catalogue global
                  </span>
                )}
              </div>
              {isCustomCategory && (
                <form action={deletePriceCategoryAction}>
                  <input type="hidden" name="categoryId" value={cat.id} />
                  <button type="submit" className="text-sm text-white/80 hover:text-white">
                    Supprimer le lot
                  </button>
                </form>
              )}
            </div>

            {cat.items.length > 0 && (
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Désignation</th>
                    <th className="px-3 py-2">Unité</th>
                    <th className="px-3 py-2">MO (h)</th>
                    <th className="px-3 py-2">Taux MO</th>
                    <th className="px-3 py-2">Matériaux</th>
                    <th className="px-3 py-2">Matériel</th>
                    <th className="px-3 py-2">DS</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cat.items.map((item) => {
                    const editable = item.organizationId === organization.id;
                    const breakdown = computeUnitPricing(
                      item,
                      organization.defaultFgPct,
                      organization.defaultBenefitPct
                    );
                    if (!editable) {
                      return (
                        <tr key={item.id} className="text-slate-500">
                          <td className="px-3 py-2">{item.designation}</td>
                          <td className="px-3 py-2">{item.unit}</td>
                          <td className="px-3 py-2">{item.laborHours}</td>
                          <td className="px-3 py-2">{formatXof(item.laborRateXof)}</td>
                          <td className="px-3 py-2">{formatXof(item.materialsXof)}</td>
                          <td className="px-3 py-2">{formatXof(item.equipmentXof)}</td>
                          <td className="px-3 py-2 font-medium text-slate-700">
                            {formatXof(breakdown.deboursesec)}
                          </td>
                          <td className="px-3 py-2" />
                        </tr>
                      );
                    }
                    return (
                      <tr key={item.id}>
                        <td colSpan={8} className="p-0">
                          <AutoSubmitForm
                            action={updatePriceItemFieldsAction}
                            className="grid grid-cols-8 items-center gap-1 px-3 py-1.5"
                          >
                            <input type="hidden" name="itemId" value={item.id} />
                            <input
                              name="designation"
                              defaultValue={item.designation}
                              className="rounded border border-transparent px-1 py-1 text-sm hover:border-slate-300 focus:border-blue-500 focus:outline-none"
                            />
                            <input
                              name="unit"
                              defaultValue={item.unit}
                              className="rounded border border-transparent px-1 py-1 text-sm hover:border-slate-300 focus:border-blue-500 focus:outline-none"
                            />
                            <input
                              name="laborHours"
                              type="number"
                              step="0.01"
                              defaultValue={item.laborHours}
                              className="rounded border border-transparent px-1 py-1 text-sm hover:border-slate-300 focus:border-blue-500 focus:outline-none"
                            />
                            <input
                              name="laborRateXof"
                              type="number"
                              defaultValue={item.laborRateXof}
                              className="rounded border border-transparent px-1 py-1 text-sm hover:border-slate-300 focus:border-blue-500 focus:outline-none"
                            />
                            <input
                              name="materialsXof"
                              type="number"
                              defaultValue={item.materialsXof}
                              className="rounded border border-transparent px-1 py-1 text-sm hover:border-slate-300 focus:border-blue-500 focus:outline-none"
                            />
                            <input
                              name="equipmentXof"
                              type="number"
                              defaultValue={item.equipmentXof}
                              className="rounded border border-transparent px-1 py-1 text-sm hover:border-slate-300 focus:border-blue-500 focus:outline-none"
                            />
                            <div className="text-sm font-medium text-slate-700">
                              {formatXof(breakdown.deboursesec)}
                            </div>
                            <button
                              type="submit"
                              formAction={deletePriceItemAction}
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

            <details className="border-t border-slate-100 bg-slate-50 px-4 py-3">
              <summary className="cursor-pointer text-xs font-medium text-slate-500">
                + Ajouter un article à ce lot
              </summary>
              <form
                action={createPriceItemAction}
                className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4"
              >
                <input type="hidden" name="categoryId" value={cat.id} />
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

      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-5">
        <form action={createPriceCategoryAction} className="flex items-end gap-2">
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-500">
              Créer un lot personnalisé
            </label>
            <input
              name="name"
              placeholder="Nom du lot (ex: Piscine, Domotique...)"
              required
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-blue-800 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-900"
          >
            Créer
          </button>
        </form>
      </div>
    </div>
  );
}
