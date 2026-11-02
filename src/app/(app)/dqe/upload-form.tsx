"use client";

import { useActionState, useRef, useState } from "react";
import type { ImportState } from "@/lib/actions/dqe";

const initialState: ImportState = { error: "" };

export function UploadForm({
  action,
}: {
  action: (prev: ImportState, formData: FormData) => Promise<ImportState>;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [fileName, setFileName] = useState("");
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <form action={formAction} className="rounded-xl border border-slate-200 bg-white p-5">
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files?.[0];
          if (f && inputRef.current) {
            const dt = new DataTransfer();
            dt.items.add(f);
            inputRef.current.files = dt.files;
            setFileName(f.name);
          }
        }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors ${
          drag ? "border-blue-600 bg-blue-50" : "border-slate-300 hover:border-blue-400 hover:bg-slate-50"
        }`}
      >
        <span aria-hidden className="text-3xl text-blue-800">⇪</span>
        <span className="mt-2 text-sm font-semibold text-slate-900">
          {fileName || "Déposez ici votre DQE (Excel ou PDF)"}
        </span>
        <span className="mt-1 text-xs text-slate-500">
          ou cliquez pour choisir un fichier · .xlsx, .csv, .pdf · 15 Mo maximum
        </span>
        <input
          ref={inputRef}
          type="file"
          name="file"
          required
          accept=".xlsx,.xlsm,.csv,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
          className="sr-only"
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
        />
      </label>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          name="name"
          placeholder="Nom du marché (facultatif, ex : Marché de volailles Bouna)"
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
        />
        <button
          type="submit"
          disabled={pending || !fileName}
          className="whitespace-nowrap rounded-md bg-blue-800 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900 disabled:opacity-50"
        >
          {pending ? "Analyse du DQE…" : "Importer et analyser"}
        </button>
      </div>

      {state.error && (
        <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {state.error}
          {state.warnings?.length ? (
            <ul className="mt-1 list-disc pl-5 text-xs">
              {state.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          ) : null}
        </div>
      )}
    </form>
  );
}
