"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/actions/contacts";

const initialState: FormState = { error: "" };

type ContactDefaults = {
  type: string;
  name: string;
  companyName: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
};

export function ContactForm({
  action,
  defaults,
  submitLabel,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  defaults?: Partial<ContactDefaults>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700">Type</label>
        <select
          name="type"
          defaultValue={defaults?.type ?? "client"}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
        >
          <option value="client">Client</option>
          <option value="entreprise">Entreprise</option>
          <option value="architecte">Architecte</option>
          <option value="fournisseur">Fournisseur</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Nom</label>
        <input
          name="name"
          required
          defaultValue={defaults?.name}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">
          Entreprise (optionnel)
        </label>
        <input
          name="companyName"
          defaultValue={defaults?.companyName}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Téléphone</label>
          <input
            name="phone"
            defaultValue={defaults?.phone}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Email</label>
          <input
            name="email"
            type="email"
            defaultValue={defaults?.email}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Adresse</label>
        <input
          name="address"
          defaultValue={defaults?.address}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Notes</label>
        <textarea
          name="notes"
          rows={3}
          defaultValue={defaults?.notes}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
        />
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
