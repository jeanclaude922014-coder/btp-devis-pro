import Link from "next/link";
import { requireSessionWithContext } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { deleteContactAction } from "@/lib/actions/contacts";

const TYPE_LABELS: Record<string, string> = {
  client: "Client",
  entreprise: "Entreprise",
  architecte: "Architecte",
  fournisseur: "Fournisseur",
};

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const { organization } = await requireSessionWithContext();

  const contacts = await prisma.contact.findMany({
    where: {
      organizationId: organization.id,
      ...(q
        ? {
            OR: [
              { name: { contains: q } },
              { companyName: { contains: q } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Carnet d&apos;adresses</h1>
          <p className="mt-1 text-sm text-slate-500">
            {contacts.length} contact(s) — clients, entreprises, architectes, fournisseurs.
          </p>
        </div>
        <Link
          href="/contacts/new"
          className="rounded-md bg-blue-800 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900"
        >
          + Nouveau contact
        </Link>
      </div>

      <form className="mt-4" method="get">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Rechercher nom, entreprise..."
          className="w-full max-w-sm rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
        />
      </form>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {contacts.length === 0 ? (
          <div className="p-10 text-center text-slate-500">
            Aucun contact enregistré. Centralisez ici tous vos contacts BTP.
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Nom</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Téléphone</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {contacts.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{c.name}</div>
                    {c.companyName && (
                      <div className="text-xs text-slate-400">{c.companyName}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                      {TYPE_LABELS[c.type] ?? c.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{c.phone || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{c.email || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-3">
                      <Link
                        href={`/contacts/${c.id}`}
                        className="text-sm font-medium text-blue-700 hover:underline"
                      >
                        Éditer
                      </Link>
                      <form action={deleteContactAction}>
                        <input type="hidden" name="contactId" value={c.id} />
                        <button
                          type="submit"
                          className="text-sm font-medium text-red-600 hover:underline"
                        >
                          Supprimer
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
