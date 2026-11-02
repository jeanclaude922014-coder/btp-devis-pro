// Gestion projet et suivi : statuts, délais et indicateurs (fonctions pures, utilisables client et serveur).

export const TASK_STATUSES = ["a_faire", "en_cours", "termine"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const STATUS_LABEL: Record<TaskStatus, string> = {
  a_faire: "À faire",
  en_cours: "En cours",
  termine: "Terminé",
};

export const PRIORITY_LABEL: Record<string, string> = { haute: "Haute", normale: "Normale", basse: "Basse" };

/** Tâche sérialisée (dates en AAAA-MM-JJ) transmise au tableau. */
export type BoardTask = {
  id: string;
  title: string;
  projectId: string | null;
  projectName: string | null;
  lot: string | null;
  status: TaskStatus;
  progress: number;
  priority: string;
  assignee: string | null;
  workers: number;
  equipment: string | null;
  startDate: string | null;
  dueDate: string | null;
  notes: string | null;
  completedAt: string | null;
};

const DAY = 864e5;
export const isoDay = (d: Date) => d.toISOString().slice(0, 10);
const toDay = (iso: string) => Date.parse(`${iso}T00:00:00Z`) / DAY;

export type Deadline = { kind: "retard" | "proche" | "ok" | "tenu" | "depasse" | "aucune"; days: number; label: string };

/** Situation d'une tâche par rapport à son échéance, à la date `today` (AAAA-MM-JJ). */
export function deadlineOf(t: Pick<BoardTask, "dueDate" | "status" | "completedAt">, today: string): Deadline {
  if (!t.dueDate) return { kind: "aucune", days: 0, label: "Sans échéance" };
  if (t.status === "termine") {
    const end = t.completedAt ?? today;
    const late = Math.round(toDay(end) - toDay(t.dueDate));
    return late > 0
      ? { kind: "depasse", days: late, label: `Terminé avec ${late} j de retard` }
      : { kind: "tenu", days: -late, label: "Délai tenu" };
  }
  const left = Math.round(toDay(t.dueDate) - toDay(today));
  if (left < 0) return { kind: "retard", days: -left, label: `En retard de ${-left} j` };
  if (left <= 7) return { kind: "proche", days: left, label: left === 0 ? "Échéance aujourd'hui" : `J-${left}` };
  return { kind: "ok", days: left, label: `J-${left}` };
}

export type Indicators = {
  total: number;
  byStatus: Record<TaskStatus, number>;
  progress: number; // avancement moyen 0-100
  late: number;
  dueSoon: number;
  onTimeRate: number | null; // % des tâches terminées dans les délais
  workersEngaged: number; // effectif sur tâches en cours
  resources: Array<{ name: string; enCours: number; aFaire: number; workers: number; late: number }>;
};

export function indicators(tasks: BoardTask[], today: string): Indicators {
  const byStatus: Record<TaskStatus, number> = { a_faire: 0, en_cours: 0, termine: 0 };
  let late = 0;
  let dueSoon = 0;
  let doneDated = 0;
  let doneOnTime = 0;
  let workersEngaged = 0;
  const res = new Map<string, { name: string; enCours: number; aFaire: number; workers: number; late: number }>();
  for (const t of tasks) {
    byStatus[t.status]++;
    const d = deadlineOf(t, today);
    if (d.kind === "retard") late++;
    if (d.kind === "proche") dueSoon++;
    if (d.kind === "tenu") {
      doneDated++;
      doneOnTime++;
    }
    if (d.kind === "depasse") doneDated++;
    if (t.status === "en_cours") workersEngaged += t.workers;
    if (t.status !== "termine") {
      const name = t.assignee?.trim() || "Non affecté";
      const r = res.get(name) ?? { name, enCours: 0, aFaire: 0, workers: 0, late: 0 };
      if (t.status === "en_cours") {
        r.enCours++;
        r.workers += t.workers;
      } else r.aFaire++;
      if (d.kind === "retard") r.late++;
      res.set(name, r);
    }
  }
  const progress = tasks.length ? Math.round(tasks.reduce((s, t) => s + (t.status === "termine" ? 100 : t.progress), 0) / tasks.length) : 0;
  return {
    total: tasks.length,
    byStatus,
    progress,
    late,
    dueSoon,
    onTimeRate: doneDated ? Math.round((doneOnTime / doneDated) * 100) : null,
    workersEngaged,
    resources: [...res.values()].sort((a, b) => b.enCours + b.aFaire - (a.enCours + a.aFaire)),
  };
}
