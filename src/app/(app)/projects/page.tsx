import Link from "next/link";
import { requireSessionWithContext } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatXof } from "@/lib/pricing";

const STATUS_LABELS: Record<string, string> = {
  actif: "Actif",
  termine: "Terminé",
  brouillon: "Brouillon",
};

const STATUS_STYLES: Record<string, string> = {
  actif: "bg-green-100 text-green-700",
  termine: "bg-slate-200 text-slate-600",
  brouillon: "bg-amber-100 text-amber-700",
};

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q, status } = await searchParams;
  const { organization } = await requireSessionWithContext();

  const projects = await prisma.project.findMany({
    where: {
      organizationId: organization.id,
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q } },
              { city: { contains: q } },
              { reference: { contains: q } },
            ],
          }
        : {}),
    },
    include: { contact: true, _count: { select: { quotes: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Projets</h1>
          <p className="mt-1 text-sm text-slate-500">{projects.length} projet(s) au total.</p>
        </div>
        <Link
          href="/projects/new"
          className="rounded-md bg-blue-800 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900"
        >
          + Nouveau projet
        </Link>
      </div>

      <form className="mt-4 flex gap-3" method="get">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Nom, ville, référence..."
          className="w-full max-w-sm rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
        />
        <select
          name="status"
          defaultValue={status ?? ""}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
        >
          <option value="">Tous</option>
          <option value="actif">Actif</option>
          <option value="termine">Terminé</option>
          <option value="brouillon">Brouillon</option>
        </select>
      </form>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.length === 0 ? (
          <div className="col-span-full rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
            Aucun projet. Créez votre premier projet pour commencer un devis.
          </div>
        ) : (
          projects.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="rounded-xl border border-slate-200 bg-white p-5 hover:border-blue-300 hover:shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="font-semibold text-slate-900">{p.name}</div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[p.status]}`}
                >
                  {STATUS_LABELS[p.status]}
                </span>
              </div>
              <div className="mt-1 text-sm text-slate-500">
                {p.contact?.name ?? "Sans client"} {p.city ? `· ${p.city}` : ""}
              </div>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-slate-600">{p._count.quotes} devis</span>
                <span className="font-medium text-slate-900">
                  {formatXof(p.estimatedBudget)} XOF
                </span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
