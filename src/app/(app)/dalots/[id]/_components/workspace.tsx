"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  createQuoteFromDalotAction, deleteDalotAction, duplicateDalotAction, saveDalotSpecAction,
} from "@/lib/actions/dalots";
import type { CheckStatus } from "@/lib/dalot/checks";
import type { GroupId } from "@/lib/dalot/design";
import { optimizeThicknesses, runStudy, type RunOutcome } from "@/lib/dalot/engine";
import { FIELD_BY_KEY, normalizeSpec, type DalotSpec, type FieldValue } from "@/lib/dalot/fields";
import { FieldsPanel, GeometryAside, HydroAside, sectionState, type SpecApi } from "./data-panels";
import { downloadText, slug } from "./download";
import {
  ChecksPanel, CombosPanel, DesignPanel, EffortsPanel, HeadsPanel, NotePanel, PlansPanel, QuantitiesPanel, StatusBadge, SynthesePanel,
} from "./result-panels";
import { NAV, type NavItem } from "./nav";
import { Viewer3D } from "./viewer-3d";

export function DalotWorkspace({ id, seriesName, initialSpec, projects }: {
  id: string; seriesName: string | null; initialSpec: DalotSpec; projects: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [spec, setSpec] = useState<DalotSpec>(initialSpec);
  const [computed, setComputed] = useState<{ spec: DalotSpec; outcome: RunOutcome } | null>(null);
  const computedOnce = useRef(false);
  const [verifiedAt, setVerifiedAt] = useState<number | null>(null);
  const [panel, setPanel] = useState("synthese");
  const [save, setSave] = useState<{ spec: DalotSpec; state: "saved" | "error"; at?: string; msg?: string }>({ spec: initialSpec, state: "saved" });
  const [optimizing, setOptimizing] = useState(false);
  const [proposal, setProposal] = useState<{ proposal: { key: string; label: string; from: number; to: number }[]; status: CheckStatus } | null>(null);
  const [quoting, setQuoting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Recalcul à chaque modification (léger différé pour la saisie).
  useEffect(() => {
    const h = setTimeout(() => setComputed({ spec, outcome: runStudy(spec) }), computedOnce.current ? 220 : 0);
    computedOnce.current = true;
    return () => clearTimeout(h);
  }, [spec]);
  const outcome = computed?.outcome ?? null;
  const computing = computed?.spec !== spec;

  // Enregistrement automatique (différé d'1,2 s après la dernière saisie).
  useEffect(() => {
    if (save.spec === spec) return undefined;
    const h = setTimeout(async () => {
      const r = await saveDalotSpecAction(id, spec);
      setSave(r.ok ? { spec, state: "saved", at: r.savedAt } : { spec, state: "error", msg: r.error });
    }, 1200);
    return () => clearTimeout(h);
  }, [spec, id, save.spec]);
  const dirty = save.spec !== spec;

  const api: SpecApi = {
    spec,
    setValue: useCallback((key: string, value: FieldValue) => {
      setProposal(null);
      setSpec((s) => ({ ...s, values: { ...s.values, [key]: value }, defaulted: s.defaulted.filter((k) => k !== key) }));
    }, []),
    setValues: useCallback((values: Record<string, FieldValue>, markDefault?: boolean) => {
      setProposal(null);
      setSpec((s) => {
        const keys = Object.keys(values);
        const defaulted = markDefault
          ? Array.from(new Set([...s.defaulted.filter((k) => !keys.includes(k)), ...keys.filter((k) => k !== "soilPreset")]))
          : s.defaulted.filter((k) => !keys.includes(k));
        return { ...s, values: { ...s.values, ...values }, defaulted };
      });
    }, []),
    confirm: useCallback((keys: string[]) => setSpec((s) => ({ ...s, defaulted: s.defaulted.filter((k) => !keys.includes(k)) })), []),
  };

  const onImpose = (g: GroupId, v: { phi: number; s: number } | undefined) =>
    setSpec((s) => ({ ...s, imposed: { ...s.imposed, [g]: v } }));

  const onOptimize = () => {
    setOptimizing(true);
    setProposal(null);
    setTimeout(() => {
      const r = optimizeThicknesses(spec);
      setProposal(r);
      setOptimizing(false);
    }, 30);
  };
  const applyProposal = () => {
    if (!proposal) return;
    api.setValues(Object.fromEntries(proposal.proposal.map((p) => [p.key, p.to])));
    setProposal(null);
  };

  const onQuote = async (projectId: string) => {
    setQuoting(true);
    await saveDalotSpecAction(id, spec);
    const r = await createQuoteFromDalotAction(id, projectId);
    setQuoting(false);
    if (r.ok && r.url) router.push(r.url); else alert(r.error ?? "Erreur");
  };

  const exportJson = () => downloadText(JSON.stringify(spec, null, 2), `${slug(String(spec.values.projet))}.dalot.json`, "application/json");
  const importJson = async (file: File) => {
    try {
      const parsed = normalizeSpec(JSON.parse(await file.text()));
      if (!window.confirm("Remplacer toutes les données de cette étude par celles du fichier importé ?")) return;
      setSpec(parsed);
    } catch {
      alert("Fichier invalide.");
    }
  };

  const study = outcome?.ok ? outcome.study : null;
  const status: CheckStatus = study ? study.status : "non_verifie";
  const current = NAV.flatMap((g) => g.items).find((i) => i.id === panel)!;

  const dot = (item: NavItem) => {
    if (item.section) {
      const s = sectionState(spec, item.section);
      if (s.missing.length) return "bg-red-500";
      if (s.defaulted.length) return "bg-amber-400";
      return "bg-green-500";
    }
    if (!study) return "bg-slate-300";
    if (item.id === "verifications" || item.id === "synthese") return status === "conforme" ? "bg-green-500" : status === "non_conforme" ? "bg-red-500" : "bg-amber-400";
    if (item.id === "res-tetes") return study.checks.some((c) => c.domain === "Ouvrages de tête" && c.status === "non_conforme") ? "bg-red-500" : "bg-green-500";
    return "";
  };

  const missingAll = outcome && !outcome.ok ? outcome.missing : [];

  return (
    <div className="-m-6 flex min-h-[calc(100vh-4rem)] bg-slate-50">
      {/* Menu des étapes */}
      <aside className="hidden w-64 shrink-0 flex-col bg-slate-900 text-slate-300 lg:flex">
        <div className="border-b border-slate-800 px-4 py-4">
          <Link href={seriesName ? `/dalots?serie=${encodeURIComponent(seriesName)}` : "/dalots"} className="text-xs text-slate-400 hover:text-white">← {seriesName ? `Série ${seriesName}` : "Toutes les études"}</Link>
          <div className="mt-2 flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded bg-orange-500 text-sm font-bold text-white">▣</span>
            <div className="font-semibold text-white">Dalot<span className="text-orange-400">Pro</span></div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {NAV.map((g) => (
            <div key={g.group} className="mb-3">
              <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{g.group}</div>
              {g.items.map((it) => (
                <button key={it.id} onClick={() => setPanel(it.id)}
                  className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm ${panel === it.id ? "bg-blue-700 text-white" : "hover:bg-slate-800 hover:text-white"}`}>
                  <span>{it.label}</span>
                  {dot(it) && <span className={`h-2 w-2 rounded-full ${dot(it)}`} />}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="space-y-2 border-t border-slate-800 p-3 text-xs">
          <div className="flex gap-2">
            <button onClick={exportJson} className="flex-1 rounded border border-slate-700 px-2 py-1 hover:bg-slate-800">Exporter</button>
            <button onClick={() => fileRef.current?.click()} className="flex-1 rounded border border-slate-700 px-2 py-1 hover:bg-slate-800">Importer</button>
            <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importJson(f); e.target.value = ""; }} />
          </div>
          <div className="flex gap-2">
            <form action={duplicateDalotAction} className="flex-1"><input type="hidden" name="id" value={id} /><button className="w-full rounded border border-slate-700 px-2 py-1 hover:bg-slate-800">Dupliquer</button></form>
            <form action={deleteDalotAction} className="flex-1" onSubmit={(e) => { if (!window.confirm("Supprimer définitivement cette étude ? Cette action est irréversible.")) e.preventDefault(); }}>
              <input type="hidden" name="id" value={id} /><button className="w-full rounded border border-red-900 px-2 py-1 text-red-300 hover:bg-red-950">Supprimer</button>
            </form>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Bandeau du projet */}
        <header className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-slate-200 bg-white px-6 py-3">
          <div className="min-w-0">
            <div className="text-[11px] uppercase text-slate-400">Projet</div>
            <div className="truncate font-semibold text-slate-900">{String(spec.values.projet || "—")}</div>
          </div>
          <div><div className="text-[11px] uppercase text-slate-400">Dossier</div><div className="text-sm">{String(spec.values.dossier || "—")}</div></div>
          <div><div className="text-[11px] uppercase text-slate-400">Règlement</div><div className="text-sm">BAEL 91 mod. 99 · F61 T.II · EC2</div></div>
          <div><div className="text-[11px] uppercase text-slate-400">Empreinte</div><div className="font-mono text-sm">{study?.fingerprint ?? "—"}</div></div>
          <div><div className="text-[11px] uppercase text-slate-400">Résultat</div><div>{computing ? <span className="text-xs text-slate-400">calcul…</span> : <StatusBadge status={status} />}</div></div>
          <div className="ml-auto text-xs text-slate-400">
            {dirty && "Enregistrement…"}
            {!dirty && save.state === "saved" && save.at && `Enregistré à ${new Date(save.at).toLocaleTimeString("fr-FR")}`}
            {!dirty && save.state === "error" && <span className="text-red-600">Échec de l&apos;enregistrement : {save.msg}</span>}
          </div>
          <select value={panel} onChange={(e) => setPanel(e.target.value)} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm lg:hidden">
            {NAV.flatMap((g) => g.items).map((i) => <option key={i.id} value={i.id}>{i.label}</option>)}
          </select>
        </header>

        <main className="min-w-0 flex-1 p-6">
          {missingAll.length > 0 && !current.section && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              Calcul bloqué : données obligatoires manquantes — {missingAll.join(", ")}.
            </div>
          )}
          {outcome && !outcome.ok && outcome.error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">Erreur de calcul : {outcome.error}</div>}

          {current.section ? (
            <FieldsPanel
              section={current.section} title={current.label} intro={current.intro ?? ""} api={api}
              aside={current.section === "geometrie" ? <GeometryAside spec={spec} />
                : current.section === "hydro" ? <HydroAside outcome={outcome} />
                : current.section === "convois" && study ? <ConvoySummary outcome={outcome} /> : undefined}
            />
          ) : !study ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
              {computing ? "Calcul en cours…" : "Complétez les données obligatoires pour lancer le calcul."}
            </div>
          ) : (
            <>
              <h2 className="mb-4 text-lg font-semibold text-slate-900">{current.label}</h2>
              {panel === "synthese" && <SynthesePanel study={study} onNav={setPanel} />}
              {panel === "combinaisons" && <CombosPanel study={study} />}
              {panel === "efforts" && <EffortsPanel study={study} />}
              {panel === "dimensionnement" && (
                <DesignPanel study={study} imposed={spec.imposed} onImpose={onImpose} onOptimize={onOptimize} optimizing={optimizing} proposal={proposal} onApply={applyProposal} />
              )}
              {panel === "verifications" && (
                <ChecksPanel study={study} fix={{
                  spec, verifiedAt: computed?.outcome === outcome ? verifiedAt : null,
                  onApply: (next) => { setProposal(null); setSpec(next); },
                  onVerify: () => { setComputed({ spec, outcome: runStudy(spec) }); setVerifiedAt(Date.now()); },
                }} />
              )}
              {panel === "res-tetes" && <HeadsPanel study={study} />}
              {panel === "vue3d" && <Viewer3D study={study} />}
              {panel === "plans" && <PlansPanel study={study} />}
              {panel === "nomenclature" && <QuantitiesPanel study={study} projects={projects} onQuote={onQuote} quoting={quoting} />}
              {panel === "note" && <NotePanel study={study} />}
            </>
          )}
          <p className="mt-8 text-center text-[11px] text-slate-400">
            DalotPro est un outil d&apos;aide au calcul et au dessin : les résultats, notes et plans doivent être vérifiés et validés par un ingénieur qualifié, qui en reste responsable.
          </p>
        </main>
      </div>
    </div>
  );
}

export function ConvoySummary({ outcome }: { outcome: RunOutcome | null }) {
  if (!outcome?.ok) return null;
  const s = outcome.study;
  const unknown = s.defaultsInPlace.filter((k) => FIELD_BY_KEY[k]?.section === "convois");
  return (
    <section className="sticky top-4 rounded-xl border border-slate-200 bg-white p-4 text-sm">
      <h3 className="mb-2 font-semibold text-slate-700">Trafic retenu</h3>
      <p className="text-slate-600">Pont de {s.analysis.ctx.classe}{s.analysis.ctx.classe === 1 ? "re" : "e"} classe, {s.analysis.ctx.nv} voie(s) de {s.analysis.ctx.V.toFixed(2).replace(".", ",")} m.</p>
      <ul className="mt-2 space-y-1">
        {s.analysis.traffic.map((t) => <li key={t.def.id}><span className="font-medium">{t.def.label}</span> — δ = {t.delta.toFixed(3).replace(".", ",")}, γ = {t.def.gammaU} / {t.def.gammaS}</li>)}
      </ul>
      {unknown.length > 0 && <p className="mt-2 text-xs text-amber-700">{unknown.length} paramètre(s) de convoi à confirmer.</p>}
    </section>
  );
}
