import { requireSessionWithContext } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { indicators, isoDay, type BoardTask, type TaskStatus } from "@/lib/project-tasks";
import type { DqeData } from "@/lib/dqe/types";
import { Board } from "./_components/board";
import { ProjectFilter } from "./_components/project-filter";
import { FromDqePanel, NewTaskPanel } from "./_components/side-forms";

function Kpi({ label, value, hint, children, tone }: { label: string; value: string; hint?: string; children?: React.ReactNode; tone?: "bad" | "good" | "warn" }) {
  const color = tone === "bad" ? "text-red-700" : tone === "good" ? "text-emerald-700" : tone === "warn" ? "text-amber-700" : "text-slate-900";
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${color}`}>{value}</div>
      {children}
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

export default async function GestionProjetPage({ searchParams }: { searchParams: Promise<{ chantier?: string }> }) {
  const { chantier = "" } = await searchParams;
  const { organization } = await requireSessionWithContext();
  const today = isoDay(new Date());

  const [projects, rows, dqes] = await Promise.all([
    prisma.project.findMany({ where: { organizationId: organization.id }, orderBy: { createdAt: "desc" }, select: { id: true, name: true } }),
    prisma.projectTask.findMany({
      where: {
        organizationId: organization.id,
        ...(chantier === "sans" ? { projectId: null } : chantier ? { projectId: chantier } : {}),
      },
      include: { project: { select: { name: true } } },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    }),
    prisma.dqeImport.findMany({ where: { organizationId: organization.id }, orderBy: { updatedAt: "desc" }, select: { id: true, name: true, data: true } }),
  ]);

  const tasks: BoardTask[] = rows.map((t) => ({
    id: t.id,
    title: t.title,
    projectId: t.projectId,
    projectName: t.project?.name ?? null,
    lot: t.lot,
    status: (["a_faire", "en_cours", "termine"].includes(t.status) ? t.status : "a_faire") as TaskStatus,
    progress: t.progress,
    priority: t.priority,
    assignee: t.assignee,
    workers: t.workers,
    equipment: t.equipment,
    startDate: t.startDate ? isoDay(t.startDate) : null,
    dueDate: t.dueDate ? isoDay(t.dueDate) : null,
    notes: t.notes,
    completedAt: t.completedAt ? isoDay(t.completedAt) : null,
  }));
  const k = indicators(tasks, today);
  const selectedProject = chantier && chantier !== "sans" ? chantier : undefined;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Gestion projet et suivi</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Avancement, délais et ressources de vos chantiers en un coup d&apos;œil. Faites glisser chaque tâche de
            « À faire » à « En cours » puis « Terminé », et réglez son avancement.
          </p>
        </div>
        <ProjectFilter value={chantier} projects={projects} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Avancement global" value={`${k.progress} %`} hint={`${k.byStatus.termine}/${k.total} tâches terminées`}>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full bg-emerald-600" style={{ width: `${k.progress}%` }} />
          </div>
        </Kpi>
        <Kpi label="Tâches" value={`${k.byStatus.en_cours} en cours`} hint={`${k.byStatus.a_faire} à faire · ${k.byStatus.termine} terminée(s)`} />
        <Kpi
          label="Délais"
          value={k.late ? `${k.late} en retard` : "Aucun retard"}
          tone={k.late ? "bad" : "good"}
          hint={`${k.dueSoon} échéance(s) sous 7 jours${k.onTimeRate !== null ? ` · ${k.onTimeRate} % terminées dans les délais` : ""}`}
        />
        <Kpi label="Ressources" value={`${k.workersEngaged} pers.`} hint={`engagées sur les tâches en cours · ${k.resources.filter((r) => r.name !== "Non affecté").length} équipe(s)`} />
      </div>

      <Board tasks={tasks} projects={projects} today={today} showProject={!selectedProject} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-1">
          <NewTaskPanel projects={projects} defaultProjectId={selectedProject} />
          <FromDqePanel
            dqes={dqes.map((d) => ({ id: d.id, name: d.name, lots: (d.data as unknown as DqeData).lots?.length ?? 0 }))}
            projects={projects}
            defaultProjectId={selectedProject}
          />
        </div>
        <section className="rounded-xl border border-slate-200 bg-white p-4 lg:col-span-2">
          <h2 className="font-semibold text-slate-900">Charge des ressources</h2>
          <p className="text-xs text-slate-500">Tâches non terminées par équipe ou intervenant.</p>
          {k.resources.length === 0 ? (
            <p className="mt-3 text-sm text-slate-400">Aucune tâche en attente.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-slate-500">
                  <tr>
                    <th className="py-1">Ressource</th>
                    <th className="text-right">En cours</th>
                    <th className="text-right">À faire</th>
                    <th className="text-right">Effectif engagé</th>
                    <th className="text-right">En retard</th>
                  </tr>
                </thead>
                <tbody>
                  {k.resources.map((r) => (
                    <tr key={r.name} className="border-t border-slate-100">
                      <td className="py-1.5 font-medium text-slate-800">{r.name}</td>
                      <td className="text-right">{r.enCours}</td>
                      <td className="text-right">{r.aFaire}</td>
                      <td className="text-right">{r.workers ? `${r.workers} pers.` : "—"}</td>
                      <td className={`text-right ${r.late ? "font-semibold text-red-700" : "text-slate-400"}`}>{r.late || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
