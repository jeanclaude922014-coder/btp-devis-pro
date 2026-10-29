"use client";

import { useActionState, useState } from "react";
import type { FormState } from "@/lib/actions/dalots";
import { DALOT_PRESETS, SERIES_TYPES } from "@/lib/dalot/fields";

const initial: FormState = { error: "" };
const input = "rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600";

export function NewDalotForm({ action }: { action: (prev: FormState, fd: FormData) => Promise<FormState> }) {
  const [state, formAction, pending] = useActionState(action, initial);
  const [preset, setPreset] = useState("demo");
  const desc = DALOT_PRESETS.find((p) => p.id === preset)?.description;
  return (
    <form action={formAction} className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Modèle de départ</label>
        <select name="preset" value={preset} onChange={(e) => setPreset(e.target.value)} className={`${input} w-full`}>
          {DALOT_PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
        {desc && <p className="mt-1 text-xs text-slate-500">{desc}</p>}
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Intitulé (facultatif)</label>
        <input name="name" placeholder="ex. Dalot PK 12+350" className={`${input} w-full`} />
      </div>
      <button type="submit" disabled={pending} className="w-full rounded-md bg-blue-800 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900 disabled:opacity-60">
        {pending ? "Création..." : "+ Nouvelle étude de dalot"}
      </button>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}

export function NewSeriesForm({ action }: { action: (prev: FormState, fd: FormData) => Promise<FormState> }) {
  const [state, formAction, pending] = useActionState(action, initial);
  const [cells, setCells] = useState<number[]>([2, 3, 4]);
  const [lengths, setLengths] = useState<number[]>([7, 8]);
  const [other, setOther] = useState("");
  const toggle = (arr: number[], v: number) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v].sort((a, b) => a - b));
  const extra = other.split(/[;\s]+/).map((x) => Number(x.replace(",", "."))).filter((x) => x > 0);
  const count = cells.length * new Set([...lengths, ...extra]).size;
  return (
    <form action={formAction} className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Nom de la série</label>
        <input name="seriesName" defaultValue="Série dalots 2,00 × 2,00" className={`${input} w-full`} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Gabarit d&apos;une cellule</label>
        <select name="typeId" defaultValue="200x200" className={`${input} w-full`}>
          {SERIES_TYPES.map((t) => (
            <option key={t.id} value={t.id}>{t.label} (dalle {t.es * 100} / radier {t.er * 100} / piédroits {t.eExt * 100} cm)</option>
          ))}
        </select>
      </div>
      <fieldset>
        <legend className="mb-1 text-xs font-medium text-slate-600">Nombre de compartiments</legend>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <label key={n} className={`cursor-pointer rounded-md border px-3 py-1.5 text-sm ${cells.includes(n) ? "border-blue-600 bg-blue-50 text-blue-800" : "border-slate-300 text-slate-600"}`}>
              <input type="checkbox" name="cells" value={n} checked={cells.includes(n)} onChange={() => setCells(toggle(cells, n))} className="sr-only" />
              {n === 1 ? "Simple" : `${n} cellules`}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-1 text-xs font-medium text-slate-600">Longueurs d&apos;ouvrage (ml)</legend>
        <div className="flex flex-wrap items-center gap-2">
          {[6, 7, 8, 9, 10, 12].map((L) => (
            <label key={L} className={`cursor-pointer rounded-md border px-3 py-1.5 text-sm ${lengths.includes(L) ? "border-blue-600 bg-blue-50 text-blue-800" : "border-slate-300 text-slate-600"}`}>
              <input type="checkbox" name="lengths" value={L} checked={lengths.includes(L)} onChange={() => setLengths(toggle(lengths, L))} className="sr-only" />
              {L} ml
            </label>
          ))}
          <input name="lengthOther" value={other} onChange={(e) => setOther(e.target.value)} placeholder="autres : 7,5 ; 11" className={`${input} w-36 py-1.5`} />
        </div>
      </fieldset>
      <button type="submit" disabled={pending || count === 0} className="w-full rounded-md bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60">
        {pending ? "Calcul de la série..." : `Générer ${count} étude${count > 1 ? "s" : ""}`}
      </button>
      <p className="text-xs text-slate-500">
        Chaque ouvrage est calculé avec les hypothèses des notes de calcul types (FeE500, C25/30, remblai 0,60 m, convois A, Bc, Bt, Br).
        L&apos;étude hydraulique est à compléter ouvrage par ouvrage (bassin versant propre à chaque PK).
      </p>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
