"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/actions/projects";

const initialState: FormState = { error: "" };

type Contact = { id: string; name: string };

type ProjectDefaults = {
  name: string;
  reference: string;
  city: string;
  contactId: string;
  status: string;
  estimatedBudget: number;
};

export function ProjectForm({
  action,
  contacts,
  defaults,
  submitLabel,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  contacts: Contact[];
  defaults?: Partial<ProjectDefaults>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700">Nom du projet</label>
        <input
          name="name"
          required
          defaultValue={defaults?.name}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Référence</label>
          <input
            name="reference"
            defaultValue={defaults?.reference}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Ville</label>
          <input
            name="city"
            defaultValue={defaults?.city}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Client</label>
        <select
          name="contactId"
          defaultValue={defaults?.contactId ?? ""}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
        >
          <option value="">— Aucun —</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Statut</label>
          <select
            name="status"
            defaultValue={defaults?.status ?? "actif"}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
          >
            <option value="actif">Actif</option>
            <option value="termine">Terminé</option>
            <option value="brouillon">Brouillon</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Budget estimé (XOF)
          </label>
          <input
            name="estimatedBudget"
            type="number"
            step="1"
            min="0"
            defaultValue={defaults?.estimatedBudget ?? 0}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
          />
        </div>
      </div>
      {state.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-blue-800 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900 disabled:opacity-60"
      >
        {pending ? "Enregistrement..." : submitLabel}
      </button>
    </form>
  );
}
