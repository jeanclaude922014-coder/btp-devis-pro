import { requireSessionWithContext } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatXof } from "@/lib/pricing";

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

export default async function DashboardPage() {
  const { organization } = await requireSessionWithContext();

  const [projectCount, activeProjectCount, quotes, projects] = await Promise.all([
    prisma.project.count({ where: { organizationId: organization.id } }),
    prisma.project.count({
      where: { organizationId: organization.id, status: "actif" },
    }),
    prisma.quote.findMany({
      where: { organizationId: organization.id },
      select: { status: true },
    }),
    prisma.project.findMany({
      where: { organizationId: organization.id },
      select: { estimatedBudget: true },
    }),
  ]);

  const quoteCount = quotes.length;
  const acceptedCount = quotes.filter((q) => q.status === "accepte").length;
  const winRate = quoteCount > 0 ? Math.round((acceptedCount / quoteCount) * 100) : 0;
  const totalBudget = projects.reduce((sum, p) => sum + p.estimatedBudget, 0);

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900">Tableau de bord</h1>
      <p className="mt-1 text-sm text-slate-500">Vue globale de votre activité.</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Projets"
          value={String(projectCount)}
          hint={`${activeProjectCount} actif(s)`}
        />
        <StatCard
          label="Devis"
          value={String(quoteCount)}
          hint={`${acceptedCount} accepté(s)`}
        />
        <StatCard label="Win rate" value={`${winRate}%`} hint="Taux d'acceptation" />
        <StatCard
          label="Budget total estimé"
          value={`${formatXof(totalBudget)} XOF`}
        />
      </div>

      {projectCount === 0 && (
        <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-slate-600">Aucun projet pour le moment.</p>
          <a
            href="/projects"
            className="mt-3 inline-block rounded-md bg-blue-800 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900"
          >
            Créer mon premier projet
          </a>
        </div>
      )}
    </div>
  );
}
