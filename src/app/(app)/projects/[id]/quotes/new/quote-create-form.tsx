"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/actions/quotes";

const initialState: FormState = { error: "" };

export function QuoteCreateForm({
  action,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700">Nom du devis</label>
        <input
          name="name"
          required
          placeholder="Ex : Devis gros oeuvre - villa R+1"
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
        {pending ? "Création..." : "Créer le devis"}
      </button>
    </form>
  );
}
