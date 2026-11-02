"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { createTaskAction, tasksFromDqeAction } from "@/lib/actions/project-tasks";
import { TaskForm } from "./task-form";

export function NewTaskPanel({ projects, defaultProjectId }: { projects: Array<{ id: string; name: string }>; defaultProjectId?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between px-4 py-3 text-left">
        <span className="font-semibold text-slate-900">+ Nouvelle tâche</span>
        <span className="text-slate-400">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="border-t border-slate-100 p-4">
          <TaskForm action={createTaskAction} projects={projects} defaultProjectId={defaultProjectId} submitLabel="Ajouter à « À faire »" />
        </div>
      )}
    </div>
  );
}

export function FromDqePanel({
  dqes,
  projects,
  defaultProjectId,
}: {
  dqes: Array<{ id: string; name: string; lots: number }>;
  projects: Array<{ id: string; name: string }>;
  defaultProjectId?: string;
}) {
  const [state, action, pending] = useActionState(tasksFromDqeAction, { error: "" });
  return (
    <form action={action} className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="font-semibold text-slate-900">Créer les tâches depuis un DQE</div>
      <p className="mt-0.5 text-xs text-slate-500">Une tâche « À faire » par lot du DQE importé.</p>
      {dqes.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">
          Aucun DQE importé. Importez-en un dans <Link href="/dqe" className="text-blue-700 hover:underline">Import DQE &amp; suivi</Link>.
        </p>
      ) : (
        <div className="mt-3 grid gap-2">
          <select name="dqeId" aria-label="DQE" className="rounded-md border border-slate-300 px-2.5 py-1.5 text-sm">
            {dqes.map((d) => (
              <option key={d.id} value={d.id}>{d.name} ({d.lots} lots)</option>
            ))}
          </select>
          <select name="projectId" aria-label="Chantier" defaultValue={defaultProjectId ?? ""} className="rounded-md border border-slate-300 px-2.5 py-1.5 text-sm">
            <option value="">— Sans chantier —</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button type="submit" disabled={pending} className="rounded-md border border-blue-800 px-3 py-1.5 text-sm font-semibold text-blue-800 hover:bg-blue-50 disabled:opacity-60">
            {pending ? "Création…" : "Créer les tâches"}
          </button>
          {state.error && <p className="text-sm text-red-600" role="alert">{state.error}</p>}
          {!state.error && state.ok ? <p className="text-sm text-emerald-700">{state.ok} tâche(s) ajoutée(s) dans « À faire ».</p> : null}
        </div>
      )}
    </form>
  );
}
