import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSessionWithContext } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { updateProjectAction, deleteProjectAction } from "@/lib/actions/projects";
import { ProjectForm } from "../project-form";
import { formatXof, computeQuoteTotal } from "@/lib/pricing";

const STATUS_LABELS: Record<string, string> = {
  brouillon: "Brouillon",
  envoye: "Envoyé",
  accepte: "Accepté",
  refuse: "Refusé",
};

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { organization } = await requireSessionWithContext();

  const [project, contacts] = await Promise.all([
    prisma.project.findFirst({
      where: { id, organizationId: organization.id },
      include: {
        quotes: {
          include: { lots: { include: { lines: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    prisma.contact.findMany({
      where: { organizationId: organization.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!project) notFound();

  const boundUpdate = updateProjectAction.bind(null, project.id);

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">{project.name}</h1>
        <form action={deleteProjectAction}>
          <input type="hidden" name="projectId" value={project.id} />
          <button
            type="submit"
            className="text-sm font-medium text-red-600 hover:underline"
          >
            Supprimer le projet
          </button>
        </form>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-slate-700">Informations</h2>
        <div className="mt-4">
          <ProjectForm
            action={boundUpdate}
            contacts={contacts}
            defaults={{
              name: project.name,
              reference: project.reference ?? "",
              city: project.city ?? "",
              contactId: project.contactId ?? "",
              status: project.status,
              estimatedBudget: project.estimatedBudget,
            }}
            submitLabel="Enregistrer"
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">
            Devis ({project.quotes.length})
          </h2>
          <Link
            href={`/projects/${project.id}/quotes/new`}
            className="rounded-md bg-blue-800 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-900"
          >
            + Nouveau devis
          </Link>
        </div>

        <div className="mt-4 divide-y divide-slate-100">
          {project.quotes.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">
              Aucun devis pour ce projet.
            </p>
          ) : (
            project.quotes.map((quote) => {
              const total = computeQuoteTotal(quote);
              return (
                <Link
                  key={quote.id}
                  href={`/projects/${project.id}/quotes/${quote.id}`}
                  className="flex items-center justify-between py-3 hover:bg-slate-50"
                >
                  <div>
                    <div className="font-medium text-slate-900">{quote.name}</div>
                    <div className="text-xs text-slate-400">
                      {STATUS_LABELS[quote.status] ?? quote.status}
                    </div>
                  </div>
                  <div className="font-semibold text-slate-900">
                    {formatXof(total)} {quote.currency}
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
