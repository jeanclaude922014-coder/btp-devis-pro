"use client";

/**
 * « Modifier les diamètres et les espacements » : tableau élément par élément et nappe par nappe
 * (corps et ouvrages de tête). Les choix sont préparés en brouillon puis enregistrés et revérifiés
 * d'un seul coup (« Enregistrer et vérifier ») ; une nappe imposée garde exactement ses barres.
 */

import { useMemo, useState } from "react";
import { barArea, DIAMETERS, SPACINGS, type BarChoice } from "@/lib/dalot/ba";
import { STATUS_LABELS, type Check, type CheckStatus } from "@/lib/dalot/checks";
import type { Study } from "@/lib/dalot/engine";
import type { Imposed } from "@/lib/dalot/fields";

const fr = (x: number, d = 2) => x.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
const btn = "rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50";
const btnPrimary = "rounded-md bg-blue-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50";
const STATUS_CLS: Record<CheckStatus, string> = {
  conforme: "bg-green-100 text-green-700", non_conforme: "bg-red-100 text-red-700", non_verifie: "bg-amber-100 text-amber-800", non_applicable: "bg-slate-100 text-slate-600",
};
const RANK: Record<CheckStatus, number> = { non_conforme: 3, non_verifie: 2, conforme: 1, non_applicable: 0 };

type Row = {
  key: string; element: string; nappe: string;
  bars: BarChoice; rep: BarChoice | null;
  AsReq: number; // cm²/m
  checks: Check[];
};

function worst(checks: Check[]): CheckStatus {
  return checks.reduce<CheckStatus>((w, c) => (RANK[c.status] > RANK[w] ? c.status : w), "non_applicable");
}

function rowsOf(study: Study): { group: string; rows: Row[] }[] {
  const body: Row[] = study.design.groups.map((g) => {
    const [element, ...rest] = g.label.split(" — ");
    return {
      key: g.id, element, nappe: rest.join(" — ") || g.label, bars: g.bars, rep: g.rep, AsReq: g.AsReq,
      checks: study.checks.filter((c) => c.id.endsWith(`-${g.id}`)),
    };
  });
  const heads: Row[] = [];
  const hc = (re: RegExp) => study.checks.filter((c) => re.test(c.id));
  const wings = study.heads.perHead.flatMap((h) => h.wings.map((w) => w.res));
  if (wings.length) {
    const w = wings.reduce((a, b) => (b.AsReq > a.AsReq ? b : a));
    heads.push({ key: "aile_v", element: "Murs en aile", nappe: "Voile — barres verticales côté remblai (et répartition horizontale)", bars: w.bars, rep: w.rep, AsReq: w.AsReq, checks: hc(/^T-MA-(F|S|V)/) });
    const f = wings.reduce((a, b) => (b.encAsReq > a.encAsReq ? b : a));
    heads.push({ key: "rt_enc", element: "Radier de tête", nappe: "Nappe inférieure transversale — encastrement des ailes", bars: f.footBars, rep: null, AsReq: f.encAsReq, checks: hc(/^T-MA-ENC/) });
  }
  const hw = study.heads.headWall;
  if (hw.H > 0.3) {
    heads.push({ key: "mt_v", element: "Mur de tête", nappe: "Face côté remblai — barres en attente (et répartition)", bars: hw.bars, rep: hw.rep, AsReq: hw.AsReq, checks: hc(/^T-MT-|^ANX-CHOC/) });
  } else if (study.input.tetes.guideRoues && study.heads.perHead[0].choc) {
    const ch = study.heads.perHead[0].choc;
    heads.push({ key: "gr", element: "Guide-roues", nappe: "Cadres ancrés dans la dalle (choc)", bars: study.heads.perHead[0].grBars, rep: null, AsReq: ch.AsReq, checks: hc(/^ANX-CHOC/) });
  }
  return [{ group: "Corps du dalot", rows: body }, ...(heads.length ? [{ group: "Ouvrages annexes", rows: heads }] : [])];
}

type Draft = Record<string, Imposed | null>; // null = retour au choix automatique

export function RebarEditor({ study, imposed, onImposeMany }: {
  study: Study;
  imposed: Record<string, Imposed | undefined>;
  onImposeMany: (patch: Record<string, Imposed | undefined>) => void;
}) {
  const groups = useMemo(() => rowsOf(study), [study]);
  const [draft, setDraft] = useState<Draft>({});
  const dirty = Object.keys(draft).length > 0;
  // Empreinte de l'étude au moment de l'enregistrement : la vérification est revenue quand elle change.
  const [checkedFp, setCheckedFp] = useState<string | null>(null);
  const pendingCheck = checkedFp !== null && study.fingerprint === checkedFp;
  const lastResult = checkedFp !== null && !pendingCheck && !dirty
    ? { status: study.status, nc: study.checks.filter((c) => c.status === "non_conforme").length }
    : null;

  const current = (r: Row): { mode: "auto" | "impose"; v: Imposed } => {
    const d = draft[r.key];
    if (d === null) return { mode: "auto", v: { phi: r.bars.phi, s: r.bars.s } };
    if (d) return { mode: "impose", v: d };
    const i = imposed[r.key];
    if (i) return { mode: "impose", v: i };
    return { mode: "auto", v: { phi: r.bars.phi, s: r.bars.s, ...(r.rep ? { phiR: r.rep.phi, sR: r.rep.s } : {}) } };
  };
  const setRow = (r: Row, v: Imposed | null) => { setCheckedFp(null); setDraft((d) => ({ ...d, [r.key]: v })); };
  const all = groups.flatMap((g) => g.rows);
  const save = () => {
    const patch: Record<string, Imposed | undefined> = {};
    for (const [k, v] of Object.entries(draft)) patch[k] = v === null ? undefined : v;
    setCheckedFp(study.fingerprint);
    onImposeMany(patch);
    setDraft({});
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-800">Modifier les diamètres et les espacements</h3>
        <span className="text-xs text-slate-500">{all.some((r) => imposed[r.key]) ? `${all.filter((r) => imposed[r.key]).length} nappe(s) imposée(s)` : "Toutes les armatures sont au choix automatique."}</span>
      </div>
      <div className="space-y-3 p-4">
        <p className="text-sm text-slate-600">
          Une nappe « Imposée » garde exactement les barres que vous choisissez : le logiciel ne la renforce pas, il la revérifie (ELU, ELS, minimum, espacements, fissuration) et signale les écarts.
          Les modifications restent en brouillon jusqu&apos;à « Enregistrer et vérifier ».
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={save} disabled={!dirty} className={btnPrimary}>Enregistrer et vérifier{dirty ? ` (${Object.keys(draft).length})` : ""}</button>
          {dirty && <button onClick={() => setDraft({})} className={btn}>Annuler les modifications</button>}
          <button onClick={() => setDraft(Object.fromEntries(all.map((r) => [r.key, { phi: r.bars.phi, s: r.bars.s, ...(r.rep ? { phiR: r.rep.phi, sR: r.rep.s } : {}) }])))} className={btn}>Imposer partout la disposition calculée</button>
          <button onClick={() => setDraft(Object.fromEntries(all.filter((r) => imposed[r.key] || draft[r.key]).map((r) => [r.key, null])))} disabled={!all.some((r) => imposed[r.key] || draft[r.key])} className={btn}>Tout remettre au choix automatique</button>
          {pendingCheck && <span className="text-xs text-slate-500">Vérification en cours…</span>}
          {lastResult && (
            <span className={`rounded px-2 py-1 text-xs font-medium ${STATUS_CLS[lastResult.status]}`}>
              Ferraillage vérifié : {STATUS_LABELS[lastResult.status]}{lastResult.nc ? ` — ${lastResult.nc} non-conformité(s)` : ""}
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <th className="px-2 py-1.5">Élément</th><th className="px-2 py-1.5">Nappe</th><th className="px-2 py-1.5">Mode</th>
                <th className="px-2 py-1.5">Diamètre</th><th className="px-2 py-1.5">Espacement</th><th className="px-2 py-1.5">Répartition</th>
                <th className="px-2 py-1.5 text-right">Section (cm²/m)</th><th className="px-2 py-1.5">Statut</th>
              </tr>
            </thead>
            {groups.map((g) => (
              <tbody key={g.group} className="divide-y divide-slate-100">
                <tr><td colSpan={8} className="bg-slate-100/70 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">{g.group}</td></tr>
                {g.rows.map((r) => {
                  const cur = current(r);
                  const As = (barArea(cur.v.phi) / cur.v.s) * 1e4;
                  const short = As < r.AsReq - 1e-6;
                  const changed = r.key in draft;
                  const st = worst(r.checks);
                  const imp = cur.mode === "impose";
                  const sel = "rounded border border-slate-300 px-1 py-0.5 text-xs disabled:bg-slate-50 disabled:text-slate-500";
                  return (
                    <tr key={r.key} className={changed ? "bg-blue-50/50" : short ? "bg-red-50" : ""}>
                      <td className="px-2 py-1.5 font-medium">{r.element}</td>
                      <td className="px-2 py-1.5 text-slate-600">{r.nappe}</td>
                      <td className="px-2 py-1.5">
                        <select aria-label={`Mode ${r.element} ${r.nappe}`} value={cur.mode} onChange={(e) => setRow(r, e.target.value === "impose" ? cur.v : null)}
                          className={`rounded border px-1 py-0.5 text-xs ${imp ? "border-amber-400 bg-amber-50" : "border-slate-300"}`}>
                          <option value="auto">Automatique</option><option value="impose">Imposé</option>
                        </select>
                      </td>
                      <td className="px-2 py-1.5">
                        <select aria-label={`Diamètre ${r.element} ${r.nappe}`} value={cur.v.phi} onChange={(e) => setRow(r, { ...cur.v, phi: Number(e.target.value) })} className={sel}>
                          {DIAMETERS.map((d) => <option key={d} value={d}>HA{d}</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-1.5">
                        <select aria-label={`Espacement ${r.element} ${r.nappe}`} value={cur.v.s} onChange={(e) => setRow(r, { ...cur.v, s: Number(e.target.value) })} className={sel}>
                          {SPACINGS.map((s) => <option key={s} value={s}>{fr(s * 100, 1)} cm</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-1.5">
                        {r.rep ? (
                          <div className="flex items-center gap-1">
                            <select aria-label={`Répartition diamètre ${r.element}`} value={cur.v.phiR ?? r.rep.phi} onChange={(e) => setRow(r, { ...cur.v, phiR: Number(e.target.value), sR: cur.v.sR ?? r.rep!.s })} className={sel}>
                              {DIAMETERS.map((d) => <option key={d} value={d}>HA{d}</option>)}
                            </select>
                            <select aria-label={`Répartition espacement ${r.element}`} value={cur.v.sR ?? r.rep.s} onChange={(e) => setRow(r, { ...cur.v, sR: Number(e.target.value), phiR: cur.v.phiR ?? r.rep!.phi })} className={sel}>
                              {SPACINGS.map((s) => <option key={s} value={s}>{fr(s * 100, 1)}</option>)}
                            </select>
                          </div>
                        ) : <span className="text-xs text-slate-400">—</span>}
                      </td>
                      <td className={`px-2 py-1.5 text-right ${short ? "font-semibold text-red-700" : ""}`}>
                        {fr(As)} <span className="text-xs text-slate-400">/ {fr(r.AsReq)} requis</span>
                      </td>
                      <td className="px-2 py-1.5">
                        {changed ? <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-800">à vérifier</span>
                          : <span title={r.checks.filter((c) => c.status === "non_conforme").map((c) => c.label).join("\n")} className={`rounded px-1.5 py-0.5 text-xs font-medium ${STATUS_CLS[st]}`}>{STATUS_LABELS[st]}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            ))}
          </table>
        </div>
        <p className="text-xs text-slate-500">
          « requis » : section la plus exigeante des calculs ELU, ELS et du minimum de non-fragilité. Une ligne rouge indique une section choisie inférieure à la section requise.
          Les ouvrages annexes réglés position par position reçoivent la même disposition sur toutes les têtes ; le statut reprend la vérification la plus défavorable.
        </p>
      </div>
    </section>
  );
}
