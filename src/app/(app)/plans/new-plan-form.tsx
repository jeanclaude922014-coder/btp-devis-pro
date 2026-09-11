"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/actions/floor-plans";

const initialState: FormState = { error: "" };

export function NewPlanForm({
  action,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex items-start gap-2">
      <input
        name="name"
        placeholder="Nom du plan (ex : Villa Cocody)"
        defaultValue="Nouveau plan"
        className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
      />
      <button
        type="submit"
        disabled={pending}
        className="whitespace-nowrap rounded-md bg-blue-800 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900 disabled:opacity-60"
      >
        {pending ? "Création..." : "+ Nouveau plan"}
      </button>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
