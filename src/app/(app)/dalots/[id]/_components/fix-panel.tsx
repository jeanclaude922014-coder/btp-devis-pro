"use client";

import { useState } from "react";
import { STATUS_LABELS, type Check, type CheckStatus } from "@/lib/dalot/checks";
import type { DalotSpec } from "@/lib/dalot/fields";
import { applyFix, autoFix, proposeFixes, type AutoFixStep, type FixOption } from "@/lib/dalot/fixes";

export type FixApi = {
  spec: DalotSpec;
  /** Remplace les données de l'étude (le calcul se relance aussitôt). */
  onApply: (next: DalotSpec) => void;
  /** Relance immédiatement le calcul et les vérifications. */
  onVerify: () => void;
  verifiedAt: number | null;
};

const TONE: Record<CheckStatus, string> = {
  conforme: "text-green-700", non_conforme: "text-red-700", non_verifie: "text-amber-700", non_applicable: "text-slate-500",
};

/** Barre d'actions des vérifications : vérifier, corriger tout automatiquement. */
export function FixToolbar({ fix, nonConformes }: { fix: FixApi; nonConformes: number }) {
  const [busy, setBusy] = useState("");
  const [result, setResult] = useState<{ spec: DalotSpec; steps: AutoFixStep[]; status: CheckStatus } | null>(null);
  const run = async () => {
    setResult(null);
    setBusy("Recherche des corrections…");
    const r = await autoFix(fix.spec, (m) => setBusy(`Correction en cours : ${m}`));
    setBusy("");
    setResult(r);
  };
  return (
    <section className="rounded-xl border border-blue-200 bg-blue-50/60 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={fix.onVerify} className="rounded-md bg-blue-800 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-900">Vérifier maintenant</button>
        <button onClick={run} disabled={!!busy || nonConformes === 0} className="rounded-md bg-orange-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50">
          {nonConformes === 0 ? "Aucune correction nécessaire" : `Corriger automatiquement (${nonConformes})`}
        </button>
        {fix.verifiedAt && <span className="text-xs text-slate-500">Vérifié à {new Date(fix.verifiedAt).toLocaleTimeString("fr-FR")}</span>}
        {busy && <span className="text-xs text-blue-800">{busy}</span>}
      </div>
      <p className="mt-2 text-xs text-slate-600">
        « Corriger » sur une ligne non conforme propose les données à modifier (épaisseur, semelle, bêche, hauteur libre…) avec la plus petite valeur qui la rend conforme.
        La correction automatique enchaîne ces propositions jusqu&apos;à la conformité ; rien n&apos;est modifié avant que vous l&apos;appliquiez.
      </p>
      {result && (
        <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3 text-sm">
          {result.steps.length === 0 ? (
            <p>Aucune correction automatique n&apos;a été trouvée : utilisez « Corriger » sur chaque ligne pour voir les options.</p>
          ) : (
            <>
              <div className="mb-1 font-medium">Corrections proposées :</div>
              <ol className="list-decimal space-y-0.5 pl-5">
                {result.steps.map((s, i) => <li key={i}><span className="font-medium">{s.option.label}</span> : {s.option.change} <span className="text-xs text-slate-500">(pour « {s.check} »)</span></li>)}
              </ol>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <button onClick={() => { fix.onApply(result.spec); setResult(null); }} className="rounded-md bg-blue-800 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-900">Appliquer ces corrections</button>
                <button onClick={() => setResult(null)} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm">Ignorer</button>
                <span className={`text-sm font-medium ${TONE[result.status]}`}>Statut après correction : {STATUS_LABELS[result.status]}</span>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}

/** Options de correction d'une vérification, affichées sous sa ligne. */
export function FixOptions({ fix, check }: { fix: FixApi; check: Check }) {
  const [opts, setOpts] = useState<FixOption[] | null>(null);
  const [loading, setLoading] = useState(false);
  const load = async () => {
    setLoading(true);
    setOpts(await proposeFixes(fix.spec, check));
    setLoading(false);
  };
  if (!opts) {
    return (
      <button onClick={load} disabled={loading} className="mt-1 rounded border border-orange-300 bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-800 hover:bg-orange-100 disabled:opacity-60">
        {loading ? "Recherche…" : "Corriger"}
      </button>
    );
  }
  if (opts.length === 0) {
    return <div className="mt-1 text-xs text-slate-500">Pas de correction automatique pour cette vérification : elle dépend de données d&apos;étude (sol, hydrologie) à confirmer.</div>;
  }
  return (
    <div className="mt-2 space-y-1 rounded-lg border border-orange-200 bg-orange-50/60 p-2">
      {opts.map((o, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2 text-xs">
          <span className={o.resolves ? "text-green-700" : "text-red-700"}>{o.resolves ? "✓" : "✗"}</span>
          <span className="font-medium text-slate-800">{o.label}</span>
          <span className="text-slate-600">{o.change}</span>
          {o.resolves && (
            <>
              <span className={TONE[o.status]}>→ statut global {STATUS_LABELS[o.status]}{o.remaining > 0 ? ` (${o.remaining} défaut(s) restant(s))` : ""}</span>
              <button onClick={() => fix.onApply(applyFix(fix.spec, o))} className="rounded bg-blue-800 px-2 py-0.5 font-semibold text-white hover:bg-blue-900">Appliquer</button>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
