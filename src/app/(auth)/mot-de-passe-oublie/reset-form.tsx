"use client";

import { useActionState } from "react";
import { resetPasswordAction, type FormState } from "../actions";

const initialState: FormState = { error: "" };
const inputClass =
  "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600";

function Field({ id, label, type = "text", autoComplete }: { id: string; label: string; type?: string; autoComplete?: string }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input id={id} name={id} type={type} required autoComplete={autoComplete} className={inputClass} />
    </div>
  );
}

export function ResetForm() {
  const [state, formAction, pending] = useActionState(resetPasswordAction, initialState);
  return (
    <form action={formAction} className="space-y-4">
      <Field id="email" label="Email du compte" type="email" autoComplete="email" />
      <Field id="code" label="Code de récupération" type="password" autoComplete="off" />
      <Field id="password" label="Nouveau mot de passe (8 caractères min.)" type="password" autoComplete="new-password" />
      <Field id="confirm" label="Confirmer le nouveau mot de passe" type="password" autoComplete="new-password" />
      {state.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-blue-800 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900 disabled:opacity-60"
      >
        {pending ? "Réinitialisation..." : "Changer mon mot de passe"}
      </button>
    </form>
  );
}
