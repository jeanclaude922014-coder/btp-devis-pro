"use client";

import { useActionState } from "react";
import { updateOrganizationAction, type FormState } from "@/lib/actions/settings";

const initialState: FormState = { error: "" };

type Defaults = {
  name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  defaultRegion: string;
  defaultCurrency: string;
  defaultFgPct: number;
  defaultBenefitPct: number;
  primaryColor: string;
  secondaryColor: string;
  pdfFooterText: string;
};

export function OrgForm({ defaults }: { defaults: Defaults }) {
  const [state, formAction, pending] = useActionState(updateOrganizationAction, initialState);

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Raison sociale / Nom du cabinet
          </label>
          <input
            name="name"
            required
            defaultValue={defaults.name}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Adresse</label>
          <input
            name="address"
            defaultValue={defaults.address}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Téléphone</label>
          <input
            name="phone"
            defaultValue={defaults.phone}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Email</label>
          <input
            name="email"
            type="email"
            defaultValue={defaults.email}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Site web</label>
          <input
            name="website"
            defaultValue={defaults.website}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Région par défaut</label>
          <input
            name="defaultRegion"
            required
            defaultValue={defaults.defaultRegion}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Devise par défaut</label>
          <input
            name="defaultCurrency"
            required
            maxLength={3}
            defaultValue={defaults.defaultCurrency}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm uppercase"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Frais généraux par défaut (%)
            </label>
            <input
              name="defaultFgPct"
              type="number"
              step="0.1"
              defaultValue={defaults.defaultFgPct}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Bénéfice par défaut (%)
            </label>
            <input
              name="defaultBenefitPct"
              type="number"
              step="0.1"
              defaultValue={defaults.defaultBenefitPct}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-700">Personnalisation des exports PDF</h3>
        <div className="mt-2 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-medium text-slate-500">Couleur principale</label>
            <input
              name="primaryColor"
              type="color"
              defaultValue={defaults.primaryColor}
              className="mt-1 h-9 w-full rounded-md border border-slate-300"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500">Couleur secondaire</label>
            <input
              name="secondaryColor"
              type="color"
              defaultValue={defaults.secondaryColor}
              className="mt-1 h-9 w-full rounded-md border border-slate-300"
            />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs font-medium text-slate-500">
              Texte pied de page personnalisé
            </label>
            <input
              name="pdfFooterText"
              placeholder="laisser vide = nom du cabinet"
              defaultValue={defaults.pdfFooterText}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      {state.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}
      {state.success && <p className="text-sm text-green-600">Paramètres enregistrés.</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-blue-800 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900 disabled:opacity-60"
      >
        {pending ? "Enregistrement..." : "Enregistrer"}
      </button>
    </form>
  );
}
