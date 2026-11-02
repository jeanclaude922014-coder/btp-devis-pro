"use client";

import { useActionState, useEffect, useRef } from "react";
import type { TaskFormState } from "@/lib/actions/project-tasks";
import type { BoardTask } from "@/lib/project-tasks";

const input =
  "mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600";
const label = "block text-xs font-medium text-slate-600";

export function TaskForm({
  action,
  projects,
  task,
  defaultProjectId,
  submitLabel,
  onDone,
}: {
  action: (prev: TaskFormState, formData: FormData) => Promise<TaskFormState>;
  projects: Array<{ id: string; name: string }>;
  task?: BoardTask;
  defaultProjectId?: string;
  submitLabel: string;
  onDone?: () => void;
}) {
  const [state, formAction, pending] = useActionState(action, { error: "" });
  const formRef = useRef<HTMLFormElement>(null);
  const handled = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (state.ok && state.ok !== handled.current) {
      handled.current = state.ok;
      if (!task) formRef.current?.reset();
      onDone?.();
    }
  }, [state.ok, task, onDone]);

  const p = task?.id ?? "new";
  return (
    <form ref={formRef} action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className={label} htmlFor={`title-${p}`}>Tâche</label>
        <input id={`title-${p}`} name="title" required defaultValue={task?.title} placeholder="Ex : Coulage dallage bloc A" className={input} />
      </div>
      <div>
        <label className={label} htmlFor={`project-${p}`}>Chantier</label>
        <select id={`project-${p}`} name="projectId" defaultValue={task?.projectId ?? defaultProjectId ?? ""} className={input}>
          <option value="">— Sans chantier —</option>
          {projects.map((pr) => (
            <option key={pr.id} value={pr.id}>{pr.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className={label} htmlFor={`lot-${p}`}>Lot / corps d&apos;état</label>
        <input id={`lot-${p}`} name="lot" defaultValue={task?.lot ?? ""} placeholder="Ex : Lot 2 : Gros œuvre" className={input} />
      </div>
      <div>
        <label className={label} htmlFor={`assignee-${p}`}>Ressource (équipe, chef d&apos;équipe, sous-traitant)</label>
        <input id={`assignee-${p}`} name="assignee" defaultValue={task?.assignee ?? ""} placeholder="Ex : Équipe maçons Koné" className={input} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label} htmlFor={`workers-${p}`}>Effectif</label>
          <input id={`workers-${p}`} name="workers" type="number" min={0} max={999} defaultValue={task?.workers ?? 0} className={input} />
        </div>
        <div>
          <label className={label} htmlFor={`priority-${p}`}>Priorité</label>
          <select id={`priority-${p}`} name="priority" defaultValue={task?.priority ?? "normale"} className={input}>
            <option value="haute">Haute</option>
            <option value="normale">Normale</option>
            <option value="basse">Basse</option>
          </select>
        </div>
      </div>
      <div>
        <label className={label} htmlFor={`start-${p}`}>Début</label>
        <input id={`start-${p}`} name="startDate" type="date" defaultValue={task?.startDate ?? ""} className={input} />
      </div>
      <div>
        <label className={label} htmlFor={`due-${p}`}>Échéance</label>
        <input id={`due-${p}`} name="dueDate" type="date" defaultValue={task?.dueDate ?? ""} className={input} />
      </div>
      <div className="sm:col-span-2">
        <label className={label} htmlFor={`equipment-${p}`}>Matériel</label>
        <input id={`equipment-${p}`} name="equipment" defaultValue={task?.equipment ?? ""} placeholder="Ex : bétonnière 350 L, vibreur, compacteur" className={input} />
      </div>
      {task && (
        <div className="sm:col-span-2">
          <label className={label} htmlFor={`progress-${p}`}>Avancement (%)</label>
          <input id={`progress-${p}`} name="progress" type="number" min={0} max={100} defaultValue={task.progress} className={input} />
        </div>
      )}
      <div className="sm:col-span-2">
        <label className={label} htmlFor={`notes-${p}`}>Notes</label>
        <textarea id={`notes-${p}`} name="notes" rows={2} defaultValue={task?.notes ?? ""} className={input} />
      </div>
      {state.error && <p className="text-sm text-red-600 sm:col-span-2" role="alert">{state.error}</p>}
      <div className="flex gap-2 sm:col-span-2">
        <button type="submit" disabled={pending} className="rounded-md bg-blue-800 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900 disabled:opacity-60">
          {pending ? "Enregistrement…" : submitLabel}
        </button>
        {onDone && task && (
          <button type="button" onClick={onDone} className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
            Annuler
          </button>
        )}
      </div>
    </form>
  );
}
