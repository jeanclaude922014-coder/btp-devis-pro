"use client";

import { useActionState } from "react";
import { signupAction, type FormState } from "../actions";

const initialState: FormState = { error: "" };

function Field({
  id,
  label,
  type = "text",
}: {
  id: string;
  label: string;
  type?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        required
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
      />
    </div>
  );
}

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signupAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <Field id="organizationName" label="Nom du cabinet / entreprise" />
      <Field id="name" label="Votre nom" />
      <Field id="email" label="Email" type="email" />
      <Field id="password" label="Mot de passe (8 caractères min.)" type="password" />
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
        {pending ? "Création..." : "Créer mon cabinet"}
      </button>
    </form>
  );
}
