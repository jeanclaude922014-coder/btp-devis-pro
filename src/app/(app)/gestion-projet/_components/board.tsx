"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import {
  deleteTaskAction,
  moveTaskAction,
  setTaskProgressAction,
  updateTaskAction,
} from "@/lib/actions/project-tasks";
import {
  PRIORITY_LABEL,
  STATUS_LABEL,
  TASK_STATUSES,
  deadlineOf,
  type BoardTask,
  type TaskStatus,
} from "@/lib/project-tasks";
import { TaskForm } from "./task-form";

const COL_STYLE: Record<TaskStatus, { head: string; ring: string }> = {
  a_faire: { head: "bg-slate-100 text-slate-800", ring: "ring-slate-300" },
  en_cours: { head: "bg-blue-100 text-blue-900", ring: "ring-blue-300" },
  termine: { head: "bg-emerald-100 text-emerald-900", ring: "ring-emerald-300" },
};

const DEADLINE_STYLE: Record<string, string> = {
  retard: "bg-red-100 text-red-700",
  proche: "bg-amber-100 text-amber-800",
  ok: "bg-slate-100 text-slate-600",
  tenu: "bg-emerald-100 text-emerald-700",
  depasse: "bg-orange-100 text-orange-800",
  aucune: "bg-slate-50 text-slate-400",
};

const PRIORITY_STYLE: Record<string, string> = {
  haute: "border-l-red-500",
  normale: "border-l-blue-400",
  basse: "border-l-slate-300",
};

const fDate = (iso: string | null) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(2, 4)}` : "");

type Op = { id: string; status?: TaskStatus; progress?: number; remove?: boolean };

export function Board({
  tasks,
  projects,
  today,
  showProject,
}: {
  tasks: BoardTask[];
  projects: Array<{ id: string; name: string }>;
  today: string;
  showProject: boolean;
}) {
  const [optimistic, apply] = useOptimistic(tasks, (cur: BoardTask[], op: Op) =>
    op.remove
      ? cur.filter((t) => t.id !== op.id)
      : cur.map((t) => {
          if (t.id !== op.id) return t;
          if (op.status) {
            const progress = op.status === "termine" ? 100 : op.status === "a_faire" ? 0 : t.progress >= 100 ? 90 : Math.max(t.progress, 5);
            return { ...t, status: op.status, progress, completedAt: op.status === "termine" ? today : null };
          }
          if (op.progress !== undefined) {
            const p = op.progress;
            const status: TaskStatus = p >= 100 ? "termine" : p > 0 ? "en_cours" : t.status === "termine" ? "en_cours" : t.status;
            return { ...t, progress: p, status };
          }
          return t;
        })
  );
  const [, startTransition] = useTransition();
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<TaskStatus | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [armed, setArmed] = useState<string | null>(null);
  // Un appui sur un contrôle (curseur, bouton) ne doit pas déplacer la carte.
  const noDrag = useRef(false);

  const move = (id: string, status: TaskStatus) =>
    startTransition(async () => {
      apply({ id, status });
      await moveTaskAction(id, status);
    });
  const setProgress = (id: string, progress: number) =>
    startTransition(async () => {
      apply({ id, progress });
      await setTaskProgressAction(id, progress);
    });
  const remove = (id: string) => {
    if (armed !== id) {
      setArmed(id);
      setTimeout(() => setArmed((a) => (a === id ? null : a)), 3000);
      return;
    }
    setArmed(null);
    startTransition(async () => {
      apply({ id, remove: true });
      await deleteTaskAction(id);
    });
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {TASK_STATUSES.map((col, ci) => {
        const list = optimistic.filter((t) => t.status === col);
        return (
          <section
            key={col}
            aria-label={STATUS_LABEL[col]}
            onDragOver={(e) => {
              e.preventDefault();
              setOverCol(col);
            }}
            onDragLeave={() => setOverCol((c) => (c === col ? null : c))}
            onDrop={(e) => {
              e.preventDefault();
              setOverCol(null);
              const id = e.dataTransfer.getData("text/plain") || dragId;
              if (id) move(id, col);
              setDragId(null);
            }}
            className={`flex min-h-48 flex-col rounded-xl border border-slate-200 bg-slate-50/60 ${overCol === col ? `ring-2 ${COL_STYLE[col].ring}` : ""}`}
          >
            <header className={`flex items-center justify-between rounded-t-xl px-3 py-2 ${COL_STYLE[col].head}`}>
              <h2 className="text-sm font-bold uppercase tracking-wide">{STATUS_LABEL[col]}</h2>
              <span className="rounded-full bg-white/70 px-2 text-xs font-semibold">{list.length}</span>
            </header>
            <div className="flex flex-1 flex-col gap-2 p-2">
              {list.length === 0 && (
                <p className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400">
                  {col === "a_faire" ? "Aucune tâche à faire." : col === "en_cours" ? "Glissez ici une tâche démarrée." : "Glissez ici une tâche achevée."}
                </p>
              )}
              {list.map((t) => {
                const d = deadlineOf(t, today);
                if (editing === t.id) {
                  return (
                    <div key={t.id} className="rounded-lg border border-blue-300 bg-white p-3">
                      <TaskForm
                        action={updateTaskAction.bind(null, t.id)}
                        projects={projects}
                        task={t}
                        submitLabel="Enregistrer"
                        onDone={() => setEditing(null)}
                      />
                    </div>
                  );
                }
                return (
                  <article
                    key={t.id}
                    draggable
                    onPointerDownCapture={(e) => {
                      noDrag.current = !!(e.target as HTMLElement).closest("input,button,select,textarea,a");
                    }}
                    onDragStart={(e) => {
                      if (noDrag.current) {
                        e.preventDefault();
                        return;
                      }
                      setDragId(t.id);
                      e.dataTransfer.setData("text/plain", t.id);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragEnd={() => setDragId(null)}
                    className={`cursor-grab rounded-lg border border-l-4 border-slate-200 bg-white p-3 shadow-sm active:cursor-grabbing ${PRIORITY_STYLE[t.priority] ?? ""} ${dragId === t.id ? "opacity-50" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold text-slate-900">{t.title}</h3>
                      <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${DEADLINE_STYLE[d.kind]}`}>{d.label}</span>
                    </div>
                    {(() => {
                      const meta = [
                        showProject && t.projectName ? `▤ ${t.projectName}` : null,
                        t.lot && !t.title.startsWith(t.lot) ? t.lot : null,
                        t.priority !== "normale" ? `Priorité ${PRIORITY_LABEL[t.priority]?.toLowerCase()}` : null,
                      ].filter(Boolean);
                      return meta.length ? <div className="mt-1 text-xs text-slate-500">{meta.join(" · ")}</div> : null;
                    })()}
                    {(t.assignee || t.workers > 0 || t.equipment) && (
                      <div className="mt-1 text-xs text-slate-600">
                        {t.assignee && <span className="font-medium">{t.assignee}</span>}
                        {t.workers > 0 && <span> · {t.workers} pers.</span>}
                        {t.equipment && <span> · {t.equipment}</span>}
                      </div>
                    )}
                    {(t.startDate || t.dueDate) && (
                      <div className="mt-1 text-xs text-slate-500">
                        {t.startDate ? `Du ${fDate(t.startDate)}` : ""}
                        {t.dueDate ? ` au ${fDate(t.dueDate)}` : ""}
                      </div>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        defaultValue={t.progress}
                        key={`${t.id}-${t.progress}`}
                        aria-label={`Avancement de ${t.title}`}
                        onPointerUp={(e) => setProgress(t.id, +(e.target as HTMLInputElement).value)}
                        onKeyUp={(e) => setProgress(t.id, +(e.target as HTMLInputElement).value)}
                        className="h-1.5 flex-1 accent-emerald-600"
                      />
                      <span className="w-10 text-right text-xs font-semibold text-slate-700">{t.progress} %</span>
                    </div>
                    {t.notes && <p className="mt-1 line-clamp-2 text-xs text-slate-400">{t.notes}</p>}
                    <div className="mt-2 flex items-center justify-between gap-1 border-t border-slate-100 pt-2">
                      <div className="flex gap-1">
                        {ci > 0 && (
                          <button type="button" onClick={() => move(t.id, TASK_STATUSES[ci - 1])} className="rounded border border-slate-200 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-50" aria-label={`Remettre en ${STATUS_LABEL[TASK_STATUSES[ci - 1]]}`}>
                            ← {STATUS_LABEL[TASK_STATUSES[ci - 1]]}
                          </button>
                        )}
                        {ci < 2 && (
                          <button type="button" onClick={() => move(t.id, TASK_STATUSES[ci + 1])} className="rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-800 hover:bg-blue-100" aria-label={`Passer en ${STATUS_LABEL[TASK_STATUSES[ci + 1]]}`}>
                            {STATUS_LABEL[TASK_STATUSES[ci + 1]]} →
                          </button>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button type="button" onClick={() => setEditing(t.id)} className="rounded px-2 py-0.5 text-xs text-slate-500 hover:bg-slate-100">Modifier</button>
                        <button type="button" onClick={() => remove(t.id)} className={`rounded px-2 py-0.5 text-xs ${armed === t.id ? "bg-red-50 text-red-700" : "text-slate-400 hover:text-red-600"}`}>
                          {armed === t.id ? "Confirmer ?" : "Supprimer"}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
