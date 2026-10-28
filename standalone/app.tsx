/**
 * DalotPro autonome : la même application que dans ChantierPilot, sans compte ni serveur.
 * Le calcul tourne dans la page ; les études sont gardées dans l'espace privé du compte
 * claude.ai (ou, à défaut, dans le navigateur) ; les fichiers passent par l'enregistreur
 * de la plateforme.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import type { CheckStatus } from "@/lib/dalot/checks";
import type { GroupId } from "@/lib/dalot/design";
import { optimizeThicknesses, runStudy, type RunOutcome } from "@/lib/dalot/engine";
import {
  DALOT_PRESETS, normalizeSpec, seriesSpec, SERIES_TYPES, specFromPreset, type DalotSpec, type FieldValue,
} from "@/lib/dalot/fields";
import { FieldsPanel, GeometryAside, HydroAside, sectionState, type SpecApi } from "@/app/(app)/dalots/[id]/_components/data-panels";
import { downloadText, setSaver, slug } from "@/app/(app)/dalots/[id]/_components/download";
import { NAV, type NavItem } from "@/app/(app)/dalots/[id]/_components/nav";
import {
  ChecksPanel, CombosPanel, DesignPanel, EffortsPanel, HeadsPanel, NotePanel, PlansPanel, QuantitiesPanel, StatusBadge, SynthesePanel,
} from "@/app/(app)/dalots/[id]/_components/result-panels";
import { Viewer3D } from "@/app/(app)/dalots/[id]/_components/viewer-3d";
import { newId, openStore, type Store, type StudyItem } from "./store";
import { zipFiles } from "./zip";

type Toast = { kind: "ok" | "err"; text: string } | null;
type Saves = { save(r: { filename: string; data: Blob }): Promise<unknown> } | null;

const input = "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600";
const btn = "rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50";
const fr = (x: number, d = 2) => x.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
const STATUS_TXT: Record<string, string> = { conforme: "Conforme", non_conforme: "Non conforme", non_verifie: "Non vérifié" };
const STATUS_CLS: Record<string, string> = { conforme: "bg-green-100 text-green-700", non_conforme: "bg-red-100 text-red-700", non_verifie: "bg-amber-100 text-amber-800" };

function statusOf(spec: DalotSpec) {
  const r = runStudy(spec);
  return r.ok ? r.study.status : "non_verifie";
}

function App() {
  const [store, setStore] = useState<Store | null>(null);
  const [items, setItems] = useState<StudyItem[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const s = await openStore();
      let list = await s.list().catch(() => [] as StudyItem[]);
      if (list.length === 0) {
        // Premier lancement : l'ouvrage de démonstration, pour voir le logiciel au travail.
        const spec = specFromPreset("demo");
        const demo = { id: newId(), name: String(spec.values.projet), seriesName: null, status: statusOf(spec), spec, updatedAt: Date.now() };
        await s.save(demo).catch(() => undefined);
        list = [demo];
      }
      if (alive) { setStore(s); setItems(list); }
    })();
    // Enregistreur de fichiers de la plateforme (le DXF part dans un .zip).
    const runtime = (window as unknown as { claude?: { use(n: string): Promise<unknown> } }).claude;
    runtime?.use("downloads").then((d) => {
      const dl = d as Saves;
      if (!dl || !alive) return;
      setSaver(async (blob, filename) => {
        let data = blob, name = filename;
        if (/\.dxf$/i.test(filename)) {
          data = zipFiles([{ name: filename, data: new Uint8Array(await blob.arrayBuffer()) }]);
          name = filename.replace(/\.dxf$/i, ".zip");
        }
        try {
          await dl.save({ filename: name, data });
          setToast({ kind: "ok", text: `${name} enregistré.` });
        } catch (e) {
          const code = (e as { code?: string })?.code;
          if (code !== "declined") setToast({ kind: "err", text: `Enregistrement impossible (${code ?? "erreur"}).` });
        }
      });
    }).catch(() => undefined);
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const h = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(h);
  }, [toast]);

  const upsert = useCallback(async (item: StudyItem) => {
    setItems((list) => [item, ...list.filter((x) => x.id !== item.id)]);
    await store?.save(item);
  }, [store]);

  const remove = useCallback(async (ids: string[]) => {
    setItems((list) => list.filter((x) => !ids.includes(x.id)));
    for (const id of ids) await store?.remove(id);
  }, [store]);

  const open = items.find((x) => x.id === openId);

  return (
    <div className="min-h-full bg-slate-50 text-slate-900">
      {!store ? (
        <div className="p-10 text-center text-slate-500">Ouverture de DalotPro…</div>
      ) : open ? (
        <Workspace key={open.id} item={open} onBack={() => setOpenId(null)} onSave={upsert}
          onDelete={async () => { await remove([open.id]); setOpenId(null); }}
          onDuplicate={async () => {
            const spec = normalizeSpec(JSON.parse(JSON.stringify(open.spec)));
            spec.values.projet = `${spec.values.projet} (copie)`;
            const copy = { ...open, id: newId(), name: String(spec.values.projet), spec, updatedAt: Date.now() };
            await upsert(copy);
            setOpenId(copy.id);
          }} />
      ) : (
        <Home items={items} store={store} onOpen={setOpenId} onCreate={async (list) => { for (const it of list) await upsert(it); }} onRemove={remove} />
      )}
      {toast && (
        <div role="status" className={`fixed bottom-4 right-4 z-50 rounded-lg px-4 py-2 text-sm shadow-lg ${toast.kind === "ok" ? "bg-green-700 text-white" : "bg-red-700 text-white"}`}
          style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}>
          {toast.text}
        </div>
      )}
    </div>
  );
}

// ── Accueil : études, modèles, séries ─────────────────────────

function Home({ items, store, onOpen, onCreate, onRemove }: {
  items: StudyItem[]; store: Store; onOpen: (id: string) => void;
  onCreate: (list: StudyItem[]) => Promise<void>; onRemove: (ids: string[]) => Promise<void>;
}) {
  const [preset, setPreset] = useState("demo");
  const [name, setName] = useState("");
  const [seriesName, setSeriesName] = useState("Série dalots 2,00 × 2,00");
  const [typeId, setTypeId] = useState("200x200");
  const [cells, setCells] = useState<number[]>([2, 3, 4]);
  const [lengths, setLengths] = useState<number[]>([7, 8]);
  const [other, setOther] = useState("");
  const [busy, setBusy] = useState(false);
  const [serie, setSerie] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const extra = other.split(/[;\s]+/).map((x) => Number(x.replace(",", "."))).filter((x) => x > 0 && x <= 60);
  const allLengths = Array.from(new Set([...lengths, ...extra])).sort((a, b) => a - b);
  const count = cells.length * allLengths.length;
  const toggle = (arr: number[], v: number) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v].sort((a, b) => a - b));

  const createOne = async () => {
    const spec = specFromPreset(preset, name.trim() || undefined);
    const item = { id: newId(), name: String(spec.values.projet), seriesName: null, status: statusOf(spec), spec, updatedAt: Date.now() };
    await onCreate([item]);
    onOpen(item.id);
  };
  const createSeries = () => {
    if (!seriesName.trim() || count === 0 || count > 40) return;
    setBusy(true);
    setTimeout(async () => {
      const list: StudyItem[] = [];
      for (const n of cells) for (const L of allLengths) {
        const spec = seriesSpec(typeId, n, L);
        list.push({ id: newId(), name: String(spec.values.projet), seriesName: seriesName.trim(), status: statusOf(spec), spec, updatedAt: Date.now() });
      }
      await onCreate(list);
      setSerie(seriesName.trim());
      setBusy(false);
    }, 30);
  };

  const groups = useMemo(() => {
    const m = new Map<string, StudyItem[]>();
    for (const s of [...items].sort((a, b) => b.updatedAt - a.updatedAt)) {
      const k = s.seriesName ?? "";
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(s);
    }
    return m;
  }, [items]);

  const table = useMemo(() => {
    if (!serie) return null;
    return items.filter((x) => x.seriesName === serie).map((x) => {
      const r = runStudy(x.spec);
      const q = r.ok ? r.study.quantities : null;
      return {
        id: x.id, name: x.name, cells: Number(x.spec.values.nCells), L: Number(x.spec.values.L),
        status: r.ok ? r.study.status : "non_verifie",
        nc: r.ok ? r.study.checks.filter((c) => c.status === "non_conforme").map((c) => `${c.element} : ${c.label}`) : [],
        body: q?.lines.find((l) => l.designation.includes("corps"))?.quantity ?? 0,
        concrete: q?.concrete ?? 0, steel: q?.steelMass ?? 0, ratio: q?.ratio ?? 0,
        coffrage: q?.lines.find((l) => l.lot === "Coffrages")?.quantity ?? 0,
      };
    }).sort((a, b) => a.cells - b.cells || a.L - b.L);
  }, [serie, items]);

  const exportSeries = () => {
    if (!table || !serie) return;
    const f = (x: number, d = 2) => x.toFixed(d).replace(".", ",");
    const rows = table.map((r) => [r.name, r.cells, f(r.L), STATUS_TXT[r.status] ?? r.status, f(r.body), f(r.concrete), f(r.steel, 0), f(r.ratio, 0), f(r.coffrage, 1), r.nc.join(" | ")]
      .map((x) => `"${String(x).replace(/"/g, '""')}"`).join(";"));
    downloadText("﻿" + ["Ouvrage;Cellules;Longueur (ml);Statut;Béton corps (m3);Béton total (m3);Acier (kg);Ratio (kg/m3);Coffrage (m2);Non-conformités", ...rows].join("\r\n"),
      `${slug(serie)}.csv`, "text/csv;charset=utf-8");
  };

  const chip = (on: boolean) => `cursor-pointer rounded-md border px-3 py-1.5 text-sm ${on ? "border-blue-600 bg-blue-50 text-blue-800" : "border-slate-300 bg-white text-slate-600"}`;

  return (
    <div className="mx-auto max-w-6xl space-y-6 py-6" style={{ paddingLeft: "max(16px, env(safe-area-inset-left, 0px))", paddingRight: "max(16px, env(safe-area-inset-right, 0px))" }}>
      <div className="rounded-xl bg-gradient-to-r from-slate-900 to-blue-900 p-6 text-white">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-orange-500 text-lg font-bold">▣</span>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold">Dalot<span className="text-orange-400">Pro</span> — calcul des dalots cadres</h1>
            <p className="text-sm text-blue-100">
              Hydrologie et hydraulique, portique par bande de 1 m sur sol élastique, convois du Fascicule 61 titre II promenés pas à pas,
              ferraillage BAEL 91 mod. 99 avec contrôle Eurocode 2, note Word, plans DXF, nomenclature, vue 3D.
            </p>
            <p className="mt-1 text-xs text-blue-200">
              Auteur : Moulo Jean Claude · Vos études sont enregistrées {store.kind === "compte" ? "dans votre espace privé claude.ai" : "dans ce navigateur (exportez-les en JSON pour les garder)"}.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold text-slate-900">Nouvelle étude</h2>
          <div>
            <label htmlFor="preset" className="mb-1 block text-xs font-medium text-slate-600">Modèle de départ</label>
            <select id="preset" value={preset} onChange={(e) => setPreset(e.target.value)} className={`${input} w-full`}>
              {DALOT_PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
            <p className="mt-1 text-xs text-slate-500">{DALOT_PRESETS.find((p) => p.id === preset)?.description}</p>
          </div>
          <div>
            <label htmlFor="nom" className="mb-1 block text-xs font-medium text-slate-600">Intitulé (facultatif)</label>
            <input id="nom" value={name} onChange={(e) => setName(e.target.value)} placeholder="ex. Dalot PK 12+350" className={`${input} w-full`} />
          </div>
          <button onClick={createOne} className="w-full rounded-md bg-blue-800 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900">+ Nouvelle étude de dalot</button>
        </section>

        <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
          <div>
            <h2 className="font-semibold text-slate-900">Générateur de série</h2>
            <p className="text-xs text-slate-500">Plusieurs dalots d&apos;un même gabarit, à 2, 3, 4 compartiments ou plus, pour plusieurs longueurs (7 ml, 8 ml…), calculés en une fois.</p>
          </div>
          <div>
            <label htmlFor="serie" className="mb-1 block text-xs font-medium text-slate-600">Nom de la série</label>
            <input id="serie" value={seriesName} onChange={(e) => setSeriesName(e.target.value)} className={`${input} w-full`} />
          </div>
          <div>
            <label htmlFor="gabarit" className="mb-1 block text-xs font-medium text-slate-600">Gabarit d&apos;une cellule</label>
            <select id="gabarit" value={typeId} onChange={(e) => setTypeId(e.target.value)} className={`${input} w-full`}>
              {SERIES_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label} (dalle {t.es * 100} / radier {t.er * 100} / piédroits {t.eExt * 100} cm)</option>)}
            </select>
          </div>
          <div>
            <div className="mb-1 text-xs font-medium text-slate-600">Nombre de compartiments</div>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5, 6].map((n) => <button key={n} type="button" onClick={() => setCells(toggle(cells, n))} className={chip(cells.includes(n))}>{n === 1 ? "Simple" : `${n} cellules`}</button>)}
            </div>
          </div>
          <div>
            <div className="mb-1 text-xs font-medium text-slate-600">Longueurs d&apos;ouvrage (ml)</div>
            <div className="flex flex-wrap items-center gap-2">
              {[6, 7, 8, 9, 10, 12].map((L) => <button key={L} type="button" onClick={() => setLengths(toggle(lengths, L))} className={chip(lengths.includes(L))}>{L} ml</button>)}
              <input id="autres" value={other} onChange={(e) => setOther(e.target.value)} placeholder="autres : 7,5 ; 11" className={`${input} w-36 py-1.5`} />
            </div>
          </div>
          <button onClick={createSeries} disabled={busy || count === 0 || count > 40 || !seriesName.trim()} className="w-full rounded-md bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60">
            {busy ? "Calcul de la série…" : count > 40 ? "40 ouvrages au maximum par série" : `Générer ${count} étude${count > 1 ? "s" : ""}`}
          </button>
          <p className="text-xs text-slate-500">Hypothèses des notes Bangolo – Bloléquin (FeE500, C25/30, remblai 0,60 m, convois A, Bc, Bt, Br). L&apos;étude hydraulique se complète ouvrage par ouvrage.</p>
        </section>
      </div>

      {table && serie && (
        <section className="rounded-xl border border-orange-200 bg-white p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold text-slate-900">Tableau comparatif — {serie}</h2>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={exportSeries} className={btn}>Exporter en CSV</button>
              {confirmDel === `serie:${serie}` ? (
                <>
                  <button onClick={async () => { await onRemove(items.filter((x) => x.seriesName === serie).map((x) => x.id)); setSerie(null); setConfirmDel(null); }} className="rounded-md bg-red-700 px-3 py-1.5 text-sm font-semibold text-white">Confirmer la suppression</button>
                  <button onClick={() => setConfirmDel(null)} className={btn}>Annuler</button>
                </>
              ) : <button onClick={() => setConfirmDel(`serie:${serie}`)} className="px-2 text-sm font-medium text-red-600 hover:underline">Supprimer la série</button>}
              <button onClick={() => setSerie(null)} className={btn}>Fermer</button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ fontVariantNumeric: "tabular-nums" }}>
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr><th className="px-3 py-2">Ouvrage</th><th className="px-3 py-2">Cellules</th><th className="px-3 py-2">Longueur</th><th className="px-3 py-2">Statut</th>
                  <th className="px-3 py-2 text-right">Béton corps (m³)</th><th className="px-3 py-2 text-right">Béton total (m³)</th><th className="px-3 py-2 text-right">Acier (kg)</th>
                  <th className="px-3 py-2 text-right">Ratio (kg/m³)</th><th className="px-3 py-2 text-right">Coffrage (m²)</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {table.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2"><button onClick={() => onOpen(r.id)} className="text-left font-medium text-blue-800 hover:underline">{r.name}</button></td>
                    <td className="px-3 py-2">{r.cells}</td><td className="px-3 py-2">{fr(r.L)} ml</td>
                    <td className="px-3 py-2"><span title={r.nc.join("\n")} className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLS[r.status]}`}>{STATUS_TXT[r.status]}{r.nc.length ? ` (${r.nc.length})` : ""}</span></td>
                    <td className="px-3 py-2 text-right">{fr(r.body)}</td><td className="px-3 py-2 text-right">{fr(r.concrete)}</td>
                    <td className="px-3 py-2 text-right">{fr(r.steel, 0)}</td><td className="px-3 py-2 text-right">{fr(r.ratio, 0)}</td><td className="px-3 py-2 text-right">{fr(r.coffrage, 1)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-slate-200 font-semibold">
                <tr><td className="px-3 py-2" colSpan={4}>Total de la série ({table.length} ouvrages)</td>
                  <td className="px-3 py-2 text-right">{fr(table.reduce((s, r) => s + r.body, 0))}</td><td className="px-3 py-2 text-right">{fr(table.reduce((s, r) => s + r.concrete, 0))}</td>
                  <td className="px-3 py-2 text-right">{fr(table.reduce((s, r) => s + r.steel, 0), 0)}</td><td /><td className="px-3 py-2 text-right">{fr(table.reduce((s, r) => s + r.coffrage, 0), 1)}</td></tr>
              </tfoot>
            </table>
          </div>
          <p className="mt-2 text-xs text-slate-500">Survolez un statut pour lire les non-conformités ; ouvrez un ouvrage pour l&apos;optimiser et produire sa note et ses plans.</p>
        </section>
      )}

      <section className="space-y-4">
        {Array.from(groups.entries()).map(([g, list]) => (
          <div key={g || "_"}>
            <div className="mb-2 flex items-center gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{g ? `Série : ${g}` : "Études individuelles"}</h3>
              {g && <button onClick={() => setSerie(g)} className="text-xs font-medium text-orange-700 hover:underline">Tableau comparatif</button>}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((s) => (
                <button key={s.id} onClick={() => onOpen(s.id)} className="rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-blue-300 hover:shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 font-medium text-slate-900">{s.name}</div>
                    <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLS[s.status] ?? ""}`}>{STATUS_TXT[s.status] ?? s.status}</span>
                  </div>
                  <div className="mt-2 text-xs text-slate-400">Modifiée le {new Date(s.updatedAt).toLocaleDateString("fr-FR")}</div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>
      <p className="text-center text-[11px] text-slate-400">
        DalotPro est un outil d&apos;aide au calcul et au dessin : les résultats, notes et plans doivent être vérifiés et validés par un ingénieur qualifié, qui en reste responsable.
      </p>
    </div>
  );
}

// ── Espace de travail d'une étude ─────────────────────────────

function Workspace({ item, onBack, onSave, onDelete, onDuplicate }: {
  item: StudyItem; onBack: () => void; onSave: (it: StudyItem) => Promise<void>; onDelete: () => Promise<void>; onDuplicate: () => Promise<void>;
}) {
  const [spec, setSpec] = useState<DalotSpec>(item.spec);
  const [computed, setComputed] = useState<{ spec: DalotSpec; outcome: RunOutcome } | null>(null);
  const computedOnce = useRef(false);
  const [panel, setPanel] = useState("synthese");
  const [saved, setSaved] = useState<DalotSpec>(item.spec);
  const [optimizing, setOptimizing] = useState(false);
  const [proposal, setProposal] = useState<{ proposal: { key: string; label: string; from: number; to: number }[]; status: CheckStatus } | null>(null);
  const [confirm, setConfirm] = useState<"delete" | "import" | null>(null);
  const [pending, setPending] = useState<DalotSpec | null>(null);
  const [importErr, setImportErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const h = setTimeout(() => setComputed({ spec, outcome: runStudy(spec) }), computedOnce.current ? 220 : 0);
    computedOnce.current = true;
    return () => clearTimeout(h);
  }, [spec]);
  const outcome = computed?.outcome ?? null;
  const computing = computed?.spec !== spec;

  // Enregistrement automatique, 1,2 s après la dernière saisie, une fois le calcul à jour.
  useEffect(() => {
    if (saved === spec || computing || !outcome) return undefined;
    const h = setTimeout(async () => {
      const status = outcome.ok ? outcome.study.status : "non_verifie";
      await onSave({ ...item, spec, name: String(spec.values.projet || "Dalot"), status, updatedAt: Date.now() }).catch(() => undefined);
      setSaved(spec);
    }, 1200);
    return () => clearTimeout(h);
  }, [spec, saved, computing, outcome, item, onSave]);

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

  const onImpose = (g: GroupId, v: { phi: number; s: number } | undefined) => setSpec((s) => ({ ...s, imposed: { ...s.imposed, [g]: v } }));
  const onOptimize = () => {
    setOptimizing(true);
    setProposal(null);
    setTimeout(() => { setProposal(optimizeThicknesses(spec)); setOptimizing(false); }, 30);
  };
  const applyProposal = () => {
    if (!proposal) return;
    api.setValues(Object.fromEntries(proposal.proposal.map((p) => [p.key, p.to])));
    setProposal(null);
  };

  const study = outcome?.ok ? outcome.study : null;
  const status: CheckStatus = study ? study.status : "non_verifie";
  const current = NAV.flatMap((g) => g.items).find((i) => i.id === panel)!;
  const dot = (it: NavItem) => {
    if (it.section) {
      const s = sectionState(spec, it.section);
      return s.missing.length ? "bg-red-500" : s.defaulted.length ? "bg-amber-400" : "bg-green-500";
    }
    if (!study) return "";
    if (it.id === "verifications" || it.id === "synthese") return status === "conforme" ? "bg-green-500" : status === "non_conforme" ? "bg-red-500" : "bg-amber-400";
    if (it.id === "res-tetes") return study.checks.some((c) => c.domain === "Ouvrages de tête" && c.status === "non_conforme") ? "bg-red-500" : "bg-green-500";
    return "";
  };
  const missingAll = outcome && !outcome.ok ? outcome.missing : [];

  return (
    <div className="flex min-h-full">
      <aside className="hidden w-64 shrink-0 flex-col bg-slate-900 text-slate-300 lg:flex" style={{ paddingLeft: "env(safe-area-inset-left, 0px)" }}>
        <div className="border-b border-slate-800 px-4 py-4">
          <button onClick={onBack} className="text-xs text-slate-400 hover:text-white">← {item.seriesName ? `Série ${item.seriesName}` : "Toutes les études"}</button>
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
                <button key={it.id} onClick={() => setPanel(it.id)} className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm ${panel === it.id ? "bg-blue-700 text-white" : "hover:bg-slate-800 hover:text-white"}`}>
                  <span>{it.label}</span>{dot(it) && <span className={`h-2 w-2 rounded-full ${dot(it)}`} />}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="space-y-2 border-t border-slate-800 p-3 text-xs">
          <div className="flex gap-2">
            <button onClick={() => downloadText(JSON.stringify(spec, null, 2), `${slug(String(spec.values.projet))}.dalot.json`, "application/json")} className="flex-1 rounded border border-slate-700 px-2 py-1 hover:bg-slate-800">Exporter</button>
            <button onClick={() => fileRef.current?.click()} className="flex-1 rounded border border-slate-700 px-2 py-1 hover:bg-slate-800">Importer</button>
          </div>
          <div className="flex gap-2">
            <button onClick={onDuplicate} className="flex-1 rounded border border-slate-700 px-2 py-1 hover:bg-slate-800">Dupliquer</button>
            <button onClick={() => setConfirm("delete")} className="flex-1 rounded border border-red-900 px-2 py-1 text-red-300 hover:bg-red-950">Supprimer</button>
          </div>
        </div>
      </aside>
      <input ref={fileRef} id="import-json" type="file" accept=".json,application/json" className="hidden" onChange={async (e) => {
        const f = e.target.files?.[0];
        e.target.value = "";
        if (!f) return;
        try { setPending(normalizeSpec(JSON.parse(await f.text()))); setConfirm("import"); setImportErr(""); } catch { setImportErr("Fichier invalide : ce n'est pas une étude DalotPro exportée en JSON."); }
      }} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-slate-200 bg-white py-3" style={{ paddingLeft: "max(16px, env(safe-area-inset-left, 0px))", paddingRight: "max(16px, env(safe-area-inset-right, 0px))" }}>
          <button onClick={onBack} className="text-sm text-blue-800 lg:hidden">← Études</button>
          <div className="min-w-0"><div className="text-[11px] uppercase text-slate-400">Projet</div><div className="truncate font-semibold">{String(spec.values.projet || "—")}</div></div>
          <div><div className="text-[11px] uppercase text-slate-400">Dossier</div><div className="text-sm">{String(spec.values.dossier || "—")}</div></div>
          <div><div className="text-[11px] uppercase text-slate-400">Règlement</div><div className="text-sm">BAEL 91 mod. 99 · F61 T.II · EC2</div></div>
          <div><div className="text-[11px] uppercase text-slate-400">Empreinte</div><div className="font-mono text-sm">{study?.fingerprint ?? "—"}</div></div>
          <div><div className="text-[11px] uppercase text-slate-400">Résultat</div><div>{computing ? <span className="text-xs text-slate-400">calcul…</span> : <StatusBadge status={status} />}</div></div>
          <div className="ml-auto text-xs text-slate-400">{saved === spec ? "Enregistré" : "Enregistrement…"}</div>
          <select id="panneau" value={panel} onChange={(e) => setPanel(e.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm lg:hidden">
            {NAV.flatMap((g) => g.items).map((i) => <option key={i.id} value={i.id}>{i.label}</option>)}
          </select>
          <div className="flex w-full flex-wrap gap-2 text-xs lg:hidden">
            <button onClick={() => downloadText(JSON.stringify(spec, null, 2), `${slug(String(spec.values.projet))}.dalot.json`, "application/json")} className={btn}>Exporter</button>
            <button onClick={() => fileRef.current?.click()} className={btn}>Importer</button>
            <button onClick={onDuplicate} className={btn}>Dupliquer</button>
            <button onClick={() => setConfirm("delete")} className={`${btn} text-red-700`}>Supprimer</button>
          </div>
        </header>

        <main className="min-w-0 flex-1 py-6" style={{ paddingLeft: "max(16px, env(safe-area-inset-left, 0px))", paddingRight: "max(16px, env(safe-area-inset-right, 0px))" }}>
          {confirm === "delete" && (
            <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              Supprimer définitivement « {String(spec.values.projet)} » ? Cette action est irréversible.
              <button onClick={onDelete} className="rounded-md bg-red-700 px-3 py-1.5 font-semibold text-white">Supprimer</button>
              <button onClick={() => setConfirm(null)} className={btn}>Annuler</button>
            </div>
          )}
          {confirm === "import" && pending && (
            <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              Remplacer toutes les données de cette étude par « {String(pending.values.projet)} » (fichier importé) ?
              <button onClick={() => { setSpec(pending); setPending(null); setConfirm(null); }} className="rounded-md bg-amber-700 px-3 py-1.5 font-semibold text-white">Remplacer</button>
              <button onClick={() => { setPending(null); setConfirm(null); }} className={btn}>Annuler</button>
            </div>
          )}
          {importErr && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{importErr}</div>}
          {missingAll.length > 0 && !current.section && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">Calcul bloqué : données obligatoires manquantes — {missingAll.join(", ")}.</div>
          )}
          {outcome && !outcome.ok && outcome.error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">Erreur de calcul : {outcome.error}</div>}

          {current.section ? (
            <FieldsPanel section={current.section} title={current.label} intro={current.intro ?? ""} api={api}
              aside={current.section === "geometrie" ? <GeometryAside spec={spec} /> : current.section === "hydro" ? <HydroAside outcome={outcome} /> : undefined} />
          ) : !study ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">{computing ? "Calcul en cours…" : "Complétez les données obligatoires pour lancer le calcul."}</div>
          ) : (
            <>
              <h2 className="mb-4 text-lg font-semibold text-slate-900">{current.label}</h2>
              {panel === "synthese" && <SynthesePanel study={study} onNav={setPanel} />}
              {panel === "combinaisons" && <CombosPanel study={study} />}
              {panel === "efforts" && <EffortsPanel study={study} />}
              {panel === "dimensionnement" && <DesignPanel study={study} imposed={spec.imposed} onImpose={onImpose} onOptimize={onOptimize} optimizing={optimizing} proposal={proposal} onApply={applyProposal} />}
              {panel === "verifications" && <ChecksPanel study={study} />}
              {panel === "res-tetes" && <HeadsPanel study={study} />}
              {panel === "vue3d" && <Viewer3D study={study} />}
              {panel === "plans" && <PlansPanel study={study} />}
              {panel === "nomenclature" && <QuantitiesPanel study={study} projects={[]} quoting={false} />}
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

createRoot(document.getElementById("dalotpro")!).render(<App />);
