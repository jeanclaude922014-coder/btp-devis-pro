"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { CATEGORIES, categoryByKey } from "@/lib/dqe/categories";
import { describeAll } from "@/lib/dqe/describe";
import type { DqeData, DqeItem } from "@/lib/dqe/types";

type SaveFn = (id: string, data: unknown) => Promise<{ ok: boolean; error?: string }>;

const F = (n: number) => Math.round(n).toLocaleString("fr-FR").replace(/[  ]/g, " ");
const Q = (n: number) =>
  (Math.round(n * 1000) / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 3 }).replace(/[  ]/g, " ");
const todayISO = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
};
const fD = (s: string) => {
  if (!s) return "";
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y.slice(2)}`;
};
const mt = (i: DqeItem) => Math.round((+i.q || 0) * (+i.pu || 0));
const pctTxt = (n: number) => `${n.toFixed(1).replace(".", ",")} %`;

const STRATEGY_LABEL: Record<string, string> = {
  titres: "à partir des titres de lots du document",
  numerotation: "à partir de la numérotation des prix (le document n'a pas de titres de lots)",
  "mots-cles": "par reconnaissance des désignations (le document n'a ni titres de lots ni numérotation)",
};

export function DqeWorkspace({
  id,
  name,
  initialData,
  save,
}: {
  id: string;
  name: string;
  initialData: DqeData;
  save: SaveFn;
}) {
  const [data, setData] = useState<DqeData>(() => ({
    ...initialData,
    suivi: initialData.suivi ?? todayISO(),
  }));
  const [site, setSite] = useState("");
  const [query, setQuery] = useState("");
  const [onlyRun, setOnlyRun] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [openDesc, setOpenDesc] = useState(true);
  const [status, setStatus] = useState<string>("Enregistré");
  const [msg, setMsg] = useState<string>("");
  const [armed, setArmed] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Formulaire d'attachement
  const [aItem, setAItem] = useState<number>(initialData.items[0]?.k ?? 0);
  const [aDate, setADate] = useState<string>(initialData.suivi ?? todayISO());
  const [aQty, setAQty] = useState("");
  const [aObs, setAObs] = useState("");

  // ── Sauvegarde automatique (différée) ─────────────────────
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setStatus("Modifications non enregistrées…");
    const t = setTimeout(() => {
      startTransition(async () => {
        const res = await save(id, data);
        setStatus(res.ok ? "Enregistré" : `Erreur d'enregistrement : ${res.error ?? ""}`);
      });
    }, 700);
    return () => clearTimeout(t);
  }, [data, id, save]);

  const arm = useCallback((key: string) => {
    setArmed(key);
    setTimeout(() => setArmed((a) => (a === key ? null : a)), 3000);
  }, []);

  const up = data.suivi ?? todayISO();
  const lotById = useMemo(() => new Map(data.lots.map((l) => [l.id, l])), [data.lots]);
  const origByK = useMemo(() => new Map(data.orig.items.map((i) => [i.k, i])), [data.orig.items]);

  const execQ = useCallback(
    (k: number, upto?: string) =>
      data.att.filter((a) => a.k === k && (!upto || a.d <= upto)).reduce((s, a) => s + (+a.q || 0), 0),
    [data.att]
  );

  const inSite = useCallback(
    (i: DqeItem) => {
      const l = lotById.get(i.lot);
      return !!l && (!site || l.site === site);
    },
    [lotById, site]
  );

  const totals = useMemo(() => {
    let ht = 0;
    let ex = 0;
    let nArt = 0;
    let nDone = 0;
    data.items.forEach((i) => {
      if (!inSite(i)) return;
      const e = execQ(i.k, up);
      ht += mt(i);
      ex += Math.min(e, Math.max(+i.q || 0, 0)) * (+i.pu || 0);
      nArt++;
      if (+i.q > 0 && e >= +i.q) nDone++;
    });
    const origHt = data.orig.items
      .filter((i) => {
        const l = data.orig.lots.find((x) => x.id === i.lot);
        return l && (!site || l.site === site);
      })
      .reduce((s, i) => s + mt(i), 0);
    return { ht, ex, nArt, nDone, diff: ht - origHt };
  }, [data, inSite, execQ, up, site]);

  const descriptions = useMemo(() => describeAll(data), [data]);
  const tva = data.tva;

  // ── Mutations ─────────────────────────────────────────────
  const updateItem = (k: number, field: "d" | "u" | "q" | "pu" | "n", value: string) => {
    setData((d) => ({
      ...d,
      items: d.items.map((i) => {
        if (i.k !== k) return i;
        if (field === "q" || field === "pu") {
          const v = parseFloat(value.replace(",", "."));
          return { ...i, [field]: Number.isNaN(v) || v < 0 ? 0 : v };
        }
        return { ...i, [field]: value.trim() || i[field] };
      }),
    }));
  };

  const updateLot = (lotId: string, patch: { name?: string; category?: string }) => {
    setData((d) => ({ ...d, lots: d.lots.map((l) => (l.id === lotId ? { ...l, ...patch } : l)) }));
  };

  const addItem = (lotId: string) => {
    setData((d) => {
      const k = Math.max(0, ...d.items.map((i) => i.k), ...d.orig.items.map((i) => i.k)) + 1;
      const its = d.items.filter((i) => i.lot === lotId);
      const idx = its.length ? d.items.indexOf(its[its.length - 1]) + 1 : d.items.length;
      const items = [...d.items];
      items.splice(idx, 0, { k, lot: lotId, n: "nouv.", d: "Nouvel article", u: "u", q: 1, pu: 0 });
      return { ...d, items };
    });
    setCollapsed((c) => ({ ...c, [lotId]: false }));
    setMsg("Article ajouté : saisissez sa désignation, son unité, sa quantité et son prix.");
  };

  const delItem = (k: number) => {
    const key = `item-${k}`;
    if (armed !== key) return arm(key);
    setArmed(null);
    setData((d) => ({ ...d, items: d.items.filter((i) => i.k !== k), att: d.att.filter((a) => a.k !== k) }));
    setMsg("Article supprimé (et ses quantités exécutées).");
  };

  const delAtt = (ix: number) => {
    const key = `att-${ix}`;
    if (armed !== key) return arm(key);
    setArmed(null);
    setData((d) => ({ ...d, att: d.att.filter((_, j) => j !== ix) }));
    setMsg("Saisie supprimée. Cumuls recalculés.");
  };

  const resetToOrig = () => {
    if (armed !== "reset") return arm("reset");
    setArmed(null);
    setData((d) => ({
      ...d,
      lots: JSON.parse(JSON.stringify(d.orig.lots)),
      items: JSON.parse(JSON.stringify(d.orig.items)),
      att: [],
    }));
    setMsg("DQE d'origine rétabli, saisies effacées.");
  };

  const selItem = data.items.find((i) => i.k === aItem) ?? data.items[0];
  const selExec = selItem ? execQ(selItem.k) : 0;

  const saveAttachment = () => {
    const q = parseFloat(aQty.replace(",", "."));
    if (!selItem) return setMsg("Choisissez un article.");
    if (!aDate) return setMsg("Indiquez la date de l'attachement.");
    if (Number.isNaN(q) || q <= 0) return setMsg("Indiquez une quantité supérieure à 0.");
    const cumul = selExec + q;
    setData((d) => {
      const att = [...d.att, { d: aDate, k: selItem.k, q, ...(aObs.trim() ? { o: aObs.trim() } : {}) }].sort((a, b) =>
        a.d < b.d ? -1 : a.d > b.d ? 1 : 0
      );
      return { ...d, att, suivi: d.suivi && d.suivi < aDate ? aDate : d.suivi };
    });
    setAQty("");
    setAObs("");
    setMsg(
      `Enregistré : ${Q(q)} ${selItem.u} sur l'article ${selItem.n} le ${fD(aDate)} → cumul ${Q(cumul)} / ${Q(+selItem.q)} (${
        +selItem.q ? Math.round((cumul / +selItem.q) * 100) : 0
      } %).${cumul > +selItem.q ? " Attention : quantité DQE dépassée." : ""}`
    );
  };

  // ── Exports ───────────────────────────────────────────────
  const download = (fileName: string, content: string, type: string) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([content], { type }));
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 500);
  };

  const exportCsv = () => {
    const num = (v: number) => String(Math.round(v * 1000) / 1000).replace(".", ",");
    const R: (string | number)[][] = [
      ["Ouvrage", "Lot", "Corps d'état", "N°", "Désignation", "U", "Quantité", "P.U.", "Montant HT", "Qté exécutée", "% exécuté", "Montant réalisé HT", "Reste HT"],
    ];
    let g = 0;
    let gx = 0;
    data.sites.forEach((s) =>
      data.lots
        .filter((l) => l.site === s.id)
        .forEach((l) =>
          data.items
            .filter((i) => i.lot === l.id)
            .forEach((i) => {
              const e = execQ(i.k, up);
              const m = mt(i);
              const x = Math.min(e, +i.q) * +i.pu;
              g += m;
              gx += x;
              R.push([s.name, l.name, categoryByKey(l.category).label, i.n, i.d, i.u, num(+i.q), Math.round(+i.pu), m, num(e), +i.q ? Math.round((e / +i.q) * 100) : 0, Math.round(x), Math.round(m - x)]);
            })
        )
    );
    R.push([]);
    R.push(["", "", "", "", "TOTAL HT", "", "", "", g, "", "", Math.round(gx), Math.round(g - gx)]);
    R.push(["", "", "", "", `TVA ${Math.round(tva * 100)} %`, "", "", "", Math.round(g * tva)]);
    R.push(["", "", "", "", "TOTAL TTC", "", "", "", Math.round(g * (1 + tva))]);
    R.push([]);
    R.push(["JOURNAL DES ATTACHEMENTS"]);
    R.push(["Date", "N°", "Désignation", "U", "Quantité", "Montant HT", "Observation"]);
    const byK = new Map(data.items.map((i) => [i.k, i]));
    data.att.forEach((a) => {
      const i = byK.get(a.k);
      R.push([fD(a.d), i?.n ?? "", i?.d ?? "", i?.u ?? "", num(+a.q), i ? Math.round(a.q * i.pu) : "", a.o ?? ""]);
    });
    const csv =
      "﻿" +
      R.map((r) =>
        r
          .map((v) => {
            const s = String(v);
            return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
          })
          .join(";")
      ).join("\r\n");
    const safe = name.replace(/[^\p{L}\p{N}]+/gu, "_").slice(0, 60);
    download(`DQE_Suivi_${safe}_${todayISO()}.csv`, csv, "text/csv;charset=utf-8");
    setMsg("Fichier CSV téléchargé (DQE + réalisé + journal). Il s'ouvre directement dans Excel.");
  };

  // ── Rendu ─────────────────────────────────────────────────
  const qs = query.trim().toLowerCase();
  const visibleSites = data.sites.filter((s) => !site || s.id === site);
  const r = data.report;
  const siteName = (sid: string) => data.sites.find((s) => s.id === sid)?.name ?? "";

  return (
    <div className="space-y-5">
      {/* Rapport d'analyse */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        <div className="font-semibold">
          Analyse automatique : {data.sites.length} ouvrage{data.sites.length > 1 ? "s" : ""}, {data.lots.length} lots,{" "}
          {data.items.length} articles reconnus
          {r.source === "pdf" ? " (PDF)" : r.source === "csv" ? " (CSV)" : " (Excel)"}.
        </div>
        <div className="mt-0.5 text-blue-800">
          Lots constitués {STRATEGY_LABEL[r.lotStrategy] ?? ""}.
          {r.declaredTotal ? ` Total HT indiqué dans le document : ${F(r.declaredTotal)} F.` : ""}
        </div>
        {r.warnings.length > 0 && (
          <ul className="mt-2 list-disc pl-5 text-amber-800">
            {r.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        )}
      </div>

      {/* Barre d'outils */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <label className="text-xs text-slate-500">
          Ouvrage
          <select
            value={site}
            onChange={(e) => setSite(e.target.value)}
            className="mt-1 block rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
          >
            <option value="">Tout le marché</option>
            {data.sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-slate-500">
          Situation au
          <input
            type="date"
            value={up}
            onChange={(e) => {
              setData((d) => ({ ...d, suivi: e.target.value || todayISO() }));
              setADate(e.target.value);
            }}
            className="mt-1 block rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
          />
        </label>
        <label className="min-w-48 flex-1 text-xs text-slate-500">
          Rechercher
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="N° ou désignation"
            className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
          />
        </label>
        <button
          type="button"
          onClick={() => setOnlyRun((v) => !v)}
          className={`rounded-md border px-3 py-1.5 text-sm ${onlyRun ? "border-blue-800 bg-blue-800 text-white" : "border-slate-300 text-slate-700 hover:bg-slate-50"}`}
        >
          Articles en cours seulement
        </button>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={exportCsv} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
            Exporter vers Excel (.csv)
          </button>
          <a
            href={`/dqe/${id}/export/docx`}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            Description des lots (.docx)
          </a>
          <button
            type="button"
            onClick={resetToOrig}
            className={`rounded-md border px-3 py-1.5 text-sm ${armed === "reset" ? "border-red-600 bg-red-50 text-red-700" : "border-slate-300 text-slate-700 hover:bg-slate-50"}`}
          >
            {armed === "reset" ? "Confirmer : tout effacer (DQE + saisies) ?" : "Revenir au DQE d'origine"}
          </button>
        </div>
        <div className="w-full text-xs text-slate-500">
          <b className="text-slate-700">{status}</b>
          {msg ? <span> · {msg}</span> : null}
        </div>
      </div>

      {/* Indicateurs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi label="Montant total HT" value={F(totals.ht)} sub={`${site ? siteName(site) : "Tout le marché"} · ${totals.nArt} articles`} main />
        <Kpi label={`TVA ${Math.round(tva * 100)} %`} value={F(totals.ht * tva)} sub={`TTC ${F(totals.ht * (1 + tva))}`} />
        <Kpi
          label={`Réalisé HT au ${fD(up)}`}
          value={F(totals.ex)}
          sub={`${pctTxt(totals.ht ? (totals.ex / totals.ht) * 100 : 0)} du montant`}
          meter={totals.ht ? (totals.ex / totals.ht) * 100 : 0}
          tone="good"
        />
        <Kpi label="Reste à réaliser HT" value={F(totals.ht - totals.ex)} sub={`${totals.nDone}/${totals.nArt} articles soldés`} />
        <Kpi
          label="Écart / DQE d'origine"
          value={`${totals.diff > 0 ? "+" : ""}${F(totals.diff)}`}
          sub={totals.diff ? "après modifications" : "aucune modification"}
          tone={totals.diff > 0 ? "bad" : totals.diff < 0 ? "good" : undefined}
        />
      </div>

      {/* Description automatique des lots */}
      <section className="rounded-xl border border-slate-200 bg-white">
        <button
          type="button"
          onClick={() => setOpenDesc((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3 text-left"
        >
          <span>
            <span className="font-semibold text-slate-900">Description automatique des lots</span>
            <span className="ml-2 text-xs text-slate-500">
              corps d&apos;état détecté, poids financier, quantités clés, ratios et points de vigilance (BAEL / EC2)
            </span>
          </span>
          <span className="text-slate-400">{openDesc ? "▾" : "▸"}</span>
        </button>
        {openDesc && (
          <div className="grid grid-cols-1 gap-3 border-t border-slate-100 p-4 lg:grid-cols-2">
            {descriptions
              .filter((ds) => {
                const l = lotById.get(ds.lotId);
                return l && (!site || l.site === site);
              })
              .map((ds) => {
                const lot = lotById.get(ds.lotId)!;
                return (
                  <article key={ds.lotId} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex items-start gap-2">
                      <input
                        key={lot.name}
                        defaultValue={lot.name}
                        onBlur={(e) => e.target.value.trim() && e.target.value !== lot.name && updateLot(lot.id, { name: e.target.value.trim() })}
                        aria-label="Nom du lot"
                        className="flex-1 rounded border border-transparent px-1 font-semibold text-slate-900 hover:border-slate-200 focus:border-blue-500 focus:outline-none"
                      />
                      <span className="whitespace-nowrap text-sm font-semibold text-slate-800">{F(ds.amount)} F</span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      {data.sites.length > 1 && <span>{ds.site} ·</span>}
                      <select
                        value={lot.category}
                        onChange={(e) => updateLot(lot.id, { category: e.target.value })}
                        aria-label="Corps d'état"
                        className="rounded border border-slate-200 px-1 py-0.5 text-xs text-slate-700"
                      >
                        {[...CATEGORIES, categoryByKey("divers")].map((c) => (
                          <option key={c.key} value={c.key}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                      <span>
                        {ds.articles} article{ds.articles > 1 ? "s" : ""} · {pctTxt(ds.share * 100)} du marché
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full bg-blue-700" style={{ width: `${Math.min(100, ds.share * 100)}%` }} />
                    </div>
                    <p className="mt-2 text-sm text-slate-700">{ds.summary}</p>
                    {ds.quantities.length > 0 && (
                      <p className="mt-1 text-xs text-slate-600">
                        <b>Quantités clés :</b> {ds.quantities.join(" · ")}
                      </p>
                    )}
                    {ds.mainItems.length > 1 && (
                      <p className="mt-1 text-xs text-slate-600">
                        <b>Principaux postes :</b>{" "}
                        {ds.mainItems.map((m) => `${m.n ? `${m.n} ` : ""}${m.d} (${F(m.amount)} F)`).join(" ; ")}
                      </p>
                    )}
                    {ds.ratios.map((t) => (
                      <p key={t} className="mt-1 text-xs text-slate-600">
                        <b>Contrôle :</b> {t}
                      </p>
                    ))}
                    <p className="mt-2 rounded bg-amber-50 px-2 py-1 text-xs text-amber-900">
                      <b>Vigilance :</b> {ds.note}
                    </p>
                  </article>
                );
              })}
          </div>
        )}
      </section>

      {/* Saisie des attachements + avancement par lot */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="font-semibold text-slate-900">Saisie des quantités exécutées</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[9rem_1fr]">
            <label className="text-xs text-slate-500">
              Date
              <input
                type="date"
                value={aDate}
                onChange={(e) => setADate(e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
              />
            </label>
            <label className="text-xs text-slate-500">
              Article du DQE
              <select
                value={selItem?.k ?? ""}
                onChange={(e) => setAItem(+e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
              >
                {visibleSites.map((s) =>
                  data.lots
                    .filter((l) => l.site === s.id)
                    .map((l) => {
                      const its = data.items.filter((i) => i.lot === l.id);
                      if (!its.length) return null;
                      return (
                        <optgroup key={l.id} label={`${data.sites.length > 1 ? `${s.name} · ` : ""}${l.name}`}>
                          {its.map((i) => {
                            const done = +i.q > 0 && execQ(i.k) >= +i.q;
                            return (
                              <option key={i.k} value={i.k}>
                                {i.n} – {i.d}
                                {done ? " ✓" : ""}
                              </option>
                            );
                          })}
                        </optgroup>
                      );
                    })
                )}
              </select>
            </label>
          </div>
          {selItem && (
            <p className="mt-2 text-xs text-slate-600">
              Quantité DQE <b>{Q(+selItem.q)} {selItem.u}</b> · déjà exécuté <b>{Q(selExec)}</b> · reste{" "}
              <b>
                {Q(Math.max(0, +selItem.q - selExec))} {selItem.u}
              </b>{" "}
              · P.U. <b>{F(+selItem.pu)}</b> F
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <label className="text-xs text-slate-500">
              Quantité exécutée {selItem ? `(${selItem.u})` : ""}
              <input
                inputMode="decimal"
                value={aQty}
                onChange={(e) => setAQty(e.target.value)}
                className="mt-1 block w-32 rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
              />
            </label>
            <button
              type="button"
              onClick={() => selItem && setAQty(String(Math.round(Math.max(0, +selItem.q - selExec) * 1000) / 1000))}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              Solder le reste
            </button>
            <label className="min-w-40 flex-1 text-xs text-slate-500">
              Observation
              <input
                value={aObs}
                onChange={(e) => setAObs(e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
              />
            </label>
            <button
              type="button"
              onClick={saveAttachment}
              className="rounded-md bg-blue-800 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-900"
            >
              Enregistrer la quantité
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Chaque saisie s&apos;ajoute au cumul de l&apos;article : % exécuté, montant réalisé, avancement par lot et
            situation se calculent seuls.
          </p>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="font-semibold text-slate-900">Avancement par lot</h2>
          <p className="text-xs text-slate-500">montant exécuté / montant DQE</p>
          <LotBars data={data} site={site} execQ={execQ} up={up} />
        </section>
      </div>

      {/* Courbe + journal */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="font-semibold text-slate-900">Montant réalisé cumulé</h2>
          <p className="text-xs text-slate-500">{F(totals.ht)} F HT</p>
          <Curve data={data} site={site} up={up} total={totals.ht} lotById={lotById} />
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-baseline justify-between">
            <h2 className="font-semibold text-slate-900">Journal des attachements</h2>
            <span className="text-xs text-slate-500">
              {data.att.length} saisie{data.att.length > 1 ? "s" : ""} ·{" "}
              {F(
                data.att.reduce((s, a) => {
                  const i = data.items.find((x) => x.k === a.k);
                  return s + (i ? a.q * i.pu : 0);
                }, 0)
              )}{" "}
              F HT
            </span>
          </div>
          <div className="mt-2 max-h-72 overflow-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-white text-left text-slate-500">
                <tr>
                  <th className="py-1">Date</th>
                  <th>Article</th>
                  <th className="text-right">Quantité</th>
                  <th className="text-right">Montant</th>
                  <th>Observation</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.att.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-3 text-slate-400">
                      Aucune quantité saisie. Choisissez un article, indiquez la quantité exécutée du jour et cliquez
                      « Enregistrer la quantité ».
                    </td>
                  </tr>
                ) : (
                  [...data.att.keys()].reverse().map((ix) => {
                    const a = data.att[ix];
                    const i = data.items.find((x) => x.k === a.k);
                    return (
                      <tr key={ix} className="border-t border-slate-100">
                        <td className="py-1">{fD(a.d)}</td>
                        <td>{i ? `${i.n} – ${i.d}` : "(article supprimé)"}</td>
                        <td className="text-right">
                          {Q(+a.q)} {i?.u}
                        </td>
                        <td className="text-right">{i ? F(a.q * i.pu) : ""}</td>
                        <td>{a.o}</td>
                        <td className="text-right">
                          <button
                            type="button"
                            onClick={() => delAtt(ix)}
                            className={`rounded px-1 ${armed === `att-${ix}` ? "bg-red-50 text-red-700" : "text-slate-400 hover:text-red-600"}`}
                            aria-label="Supprimer cette saisie"
                          >
                            {armed === `att-${ix}` ? "Suppr. ?" : "✕"}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* DQE complet */}
      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="px-4 pt-4">
          <h2 className="font-semibold text-slate-900">Devis quantitatif et estimatif</h2>
          <p className="text-xs text-slate-500">
            Désignation, unité, quantité et prix unitaire modifiables · cliquez sur un lot pour le replier. Cellule orange
            = valeur différente du DQE d&apos;origine. « + » ajoute un article au lot, « ✕ » le supprime (deux clics).
          </p>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[1000px] text-xs">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-2 py-2">N°</th>
                <th>Désignation des ouvrages</th>
                <th>U</th>
                <th className="text-right">Quantité</th>
                <th className="text-right">P.U.</th>
                <th className="text-right">Montant HT</th>
                <th className="text-right">Qté exécutée</th>
                <th className="pl-2">% exéc.</th>
                <th className="text-right">Montant réalisé</th>
                <th className="text-right">Reste HT</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {(() => {
                const rows: React.ReactNode[] = [];
                let gHT = 0;
                let gEX = 0;
                visibleSites.forEach((s) => {
                  let sHT = 0;
                  let sEX = 0;
                  if (data.sites.length > 1)
                    rows.push(
                      <tr key={`s-${s.id}`} className="bg-slate-800 text-white">
                        <td colSpan={11} className="px-2 py-1.5 font-semibold">
                          {s.name}
                        </td>
                      </tr>
                    );
                  data.lots
                    .filter((l) => l.site === s.id)
                    .forEach((l) => {
                      const its = data.items.filter((i) => i.lot === l.id);
                      let lHT = 0;
                      let lEX = 0;
                      const itemRows: React.ReactNode[] = [];
                      let lastSec: string | undefined;
                      its.forEach((i) => {
                        const e = execQ(i.k, up);
                        const m = mt(i);
                        const ex = Math.min(e, Math.max(+i.q || 0, 0)) * (+i.pu || 0);
                        lHT += m;
                        lEX += ex;
                        if (qs && !(i.d.toLowerCase().includes(qs) || i.n.toLowerCase().includes(qs))) return;
                        if (onlyRun && !(e > 0 && e < +i.q)) return;
                        const p = +i.q > 0 ? (e / +i.q) * 100 : 0;
                        const o = origByK.get(i.k);
                        if (i.sec && i.sec !== lastSec) {
                          itemRows.push(
                            <tr key={`sec-${i.k}`}>
                              <td />
                              <td colSpan={10} className="py-1 font-medium italic text-slate-500">
                                {i.sec}
                              </td>
                            </tr>
                          );
                        }
                        lastSec = i.sec;
                        itemRows.push(
                          <tr key={i.k} className="border-t border-slate-100 hover:bg-slate-50">
                            <td className="px-2 py-1 font-mono text-slate-500">{i.n}</td>
                            <td>
                              <CellInput value={i.d} onCommit={(v) => updateItem(i.k, "d", v)} className="w-full min-w-64" label={`Désignation ${i.n}`} />
                            </td>
                            <td>
                              <CellInput value={i.u} onCommit={(v) => updateItem(i.k, "u", v)} className="w-12" label={`Unité ${i.n}`} />
                            </td>
                            <td className="text-right">
                              <CellInput
                                value={String(i.q)}
                                numeric
                                changed={!!o && +o.q !== +i.q}
                                onCommit={(v) => updateItem(i.k, "q", v)}
                                className="w-20 text-right"
                                label={`Quantité ${i.n}`}
                              />
                            </td>
                            <td className="text-right">
                              <CellInput
                                value={String(i.pu)}
                                numeric
                                changed={!!o && +o.pu !== +i.pu}
                                onCommit={(v) => updateItem(i.k, "pu", v)}
                                className="w-24 text-right"
                                label={`Prix unitaire ${i.n}`}
                              />
                            </td>
                            <td className="text-right">{F(m)}</td>
                            <td className="text-right">{e ? Q(e) : ""}</td>
                            <td className="pl-2">
                              <Bar pct={p} label={e ? `${Math.round(p)} %` : ""} />
                            </td>
                            <td className="text-right">{ex ? F(ex) : ""}</td>
                            <td className="text-right">{F(m - ex)}</td>
                            <td className="px-1 text-right">
                              <button
                                type="button"
                                onClick={() => delItem(i.k)}
                                className={`rounded px-1 ${armed === `item-${i.k}` ? "bg-red-50 text-red-700" : "text-slate-400 hover:text-red-600"}`}
                                aria-label={`Supprimer l'article ${i.n}`}
                              >
                                {armed === `item-${i.k}` ? "Suppr. ?" : "✕"}
                              </button>
                            </td>
                          </tr>
                        );
                      });
                      sHT += lHT;
                      sEX += lEX;
                      const lp = lHT ? (lEX / lHT) * 100 : 0;
                      rows.push(
                        <tr
                          key={`l-${l.id}`}
                          tabIndex={0}
                          onClick={(e) => {
                            if ((e.target as HTMLElement).closest("button")) return;
                            setCollapsed((c) => ({ ...c, [l.id]: !c[l.id] }));
                          }}
                          onKeyDown={(e) => {
                            if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
                              e.preventDefault();
                              setCollapsed((c) => ({ ...c, [l.id]: !c[l.id] }));
                            }
                          }}
                          className="cursor-pointer border-t border-slate-200 bg-blue-50 font-semibold text-blue-950"
                        >
                          <td colSpan={5} className="px-2 py-1.5">
                            <span className="mr-1 inline-block w-3 text-slate-500">{collapsed[l.id] ? "▸" : "▾"}</span>
                            {l.name}
                            <span className="ml-2 text-[10px] font-normal text-slate-500">{categoryByKey(l.category).label}</span>
                          </td>
                          <td className="text-right">{F(lHT)}</td>
                          <td />
                          <td className="pl-2">
                            <Bar pct={lp} label={`${Math.round(lp)} %`} />
                          </td>
                          <td className="text-right">{F(lEX)}</td>
                          <td className="text-right">{F(lHT - lEX)}</td>
                          <td className="px-1 text-right">
                            <button
                              type="button"
                              onClick={() => addItem(l.id)}
                              className="rounded px-1.5 text-blue-800 hover:bg-blue-100"
                              aria-label={`Ajouter un article au ${l.name}`}
                            >
                              +
                            </button>
                          </td>
                        </tr>
                      );
                      if (!collapsed[l.id]) rows.push(...itemRows);
                    });
                  gHT += sHT;
                  gEX += sEX;
                  if (data.sites.length > 1)
                    rows.push(
                      <tr key={`st-${s.id}`} className="border-t-2 border-slate-300 bg-slate-100 font-semibold">
                        <td colSpan={5} className="px-2 py-1.5">
                          Total {s.name} (HT)
                        </td>
                        <td className="text-right">{F(sHT)}</td>
                        <td />
                        <td className="pl-2">{sHT ? `${Math.round((sEX / sHT) * 100)} %` : ""}</td>
                        <td className="text-right">{F(sEX)}</td>
                        <td className="text-right">{F(sHT - sEX)}</td>
                        <td />
                      </tr>
                    );
                });
                rows.push(
                  <tr key="g" className="border-t-2 border-slate-400 bg-slate-800 font-bold text-white">
                    <td colSpan={5} className="px-2 py-2">
                      MONTANT TOTAL HT
                    </td>
                    <td className="text-right">{F(gHT)}</td>
                    <td />
                    <td className="pl-2">{gHT ? `${Math.round((gEX / gHT) * 100)} %` : ""}</td>
                    <td className="text-right">{F(gEX)}</td>
                    <td className="text-right">{F(gHT - gEX)}</td>
                    <td />
                  </tr>,
                  <tr key="tva" className="bg-slate-100">
                    <td colSpan={5} className="px-2 py-1.5">
                      TVA {Math.round(tva * 100)} %
                    </td>
                    <td className="text-right">{F(gHT * tva)}</td>
                    <td />
                    <td />
                    <td className="text-right">{F(gEX * tva)}</td>
                    <td className="text-right">{F((gHT - gEX) * tva)}</td>
                    <td />
                  </tr>,
                  <tr key="ttc" className="bg-slate-800 font-bold text-white">
                    <td colSpan={5} className="px-2 py-2">
                      MONTANT TOTAL TTC
                    </td>
                    <td className="text-right">{F(gHT * (1 + tva))}</td>
                    <td />
                    <td />
                    <td className="text-right">{F(gEX * (1 + tva))}</td>
                    <td className="text-right">{F((gHT - gEX) * (1 + tva))}</td>
                    <td />
                  </tr>
                );
                return rows;
              })()}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

// ── Sous-composants ─────────────────────────────────────────

function Kpi({
  label,
  value,
  sub,
  main,
  meter,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  main?: boolean;
  meter?: number;
  tone?: "good" | "bad";
}) {
  return (
    <div className={`rounded-xl border p-3 ${main ? "border-blue-800 bg-blue-900 text-white" : "border-slate-200 bg-white"}`}>
      <div className={`text-xs ${main ? "text-blue-100" : "text-slate-500"}`}>{label}</div>
      <div
        className={`mt-1 text-lg font-bold ${
          main ? "" : tone === "good" ? "text-emerald-700" : tone === "bad" ? "text-red-700" : "text-slate-900"
        }`}
      >
        {value}
      </div>
      {meter !== undefined && (
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full bg-emerald-600" style={{ width: `${Math.min(100, meter)}%` }} />
        </div>
      )}
      <div className={`mt-1 text-xs ${main ? "text-blue-100" : "text-slate-500"}`}>{sub}</div>
    </div>
  );
}

function Bar({ pct, label }: { pct: number; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="block h-1.5 w-14 overflow-hidden rounded-full bg-slate-200">
        <i className={`block h-full ${pct > 100.001 ? "bg-red-600" : "bg-emerald-600"}`} style={{ width: `${Math.min(100, pct)}%` }} />
      </span>
      <b className="text-[11px] font-medium">{label}</b>
    </div>
  );
}

function CellInput({
  value,
  onCommit,
  className,
  numeric,
  changed,
  label,
}: {
  value: string;
  onCommit: (v: string) => void;
  className?: string;
  numeric?: boolean;
  changed?: boolean;
  label: string;
}) {
  return (
    <input
      key={value}
      defaultValue={value}
      inputMode={numeric ? "decimal" : undefined}
      aria-label={label}
      onBlur={(e) => e.target.value !== value && onCommit(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      className={`rounded border px-1 py-0.5 ${changed ? "border-orange-300 bg-orange-50" : "border-transparent bg-transparent"} hover:border-slate-200 focus:border-blue-500 focus:bg-white focus:outline-none ${className ?? ""}`}
    />
  );
}

function LotBars({
  data,
  site,
  execQ,
  up,
}: {
  data: DqeData;
  site: string;
  execQ: (k: number, upto?: string) => number;
  up: string;
}) {
  const rows = data.lots
    .filter((l) => !site || l.site === site)
    .map((l) => {
      let ht = 0;
      let ex = 0;
      data.items
        .filter((i) => i.lot === l.id)
        .forEach((i) => {
          ht += mt(i);
          ex += Math.min(execQ(i.k, up), Math.max(+i.q || 0, 0)) * (+i.pu || 0);
        });
      return { l, ht, ex };
    });
  const mx = Math.max(1, ...rows.map((r) => r.ht));
  const siteShort = (sid: string) => {
    const n = data.sites.find((s) => s.id === sid)?.name ?? "";
    return n.replace(/^\d+\.\s*/, "").split(/\s+/).slice(0, 2).join(" ");
  };
  return (
    <div className="mt-3 max-h-80 space-y-1.5 overflow-auto pr-1">
      {rows.map((r) => (
        <div key={r.l.id} className="grid grid-cols-[minmax(0,12rem)_1fr_auto] items-center gap-2 text-xs">
          <span className="truncate text-slate-700" title={r.l.name}>
            {data.sites.length > 1 && <small className="text-slate-400">{siteShort(r.l.site)} · </small>}
            {r.l.name}
          </span>
          <span className="block h-2.5 rounded-full bg-slate-200" style={{ width: `${Math.max(6, (r.ht / mx) * 100)}%` }} title={`${F(r.ex)} / ${F(r.ht)}`}>
            <i className="block h-full rounded-full bg-emerald-600" style={{ width: `${r.ht ? Math.min(100, (r.ex / r.ht) * 100) : 0}%` }} />
          </span>
          <span className="whitespace-nowrap text-slate-500">
            {r.ht ? Math.round((r.ex / r.ht) * 100) : 0} % · {F(r.ht / 1000)} k
          </span>
        </div>
      ))}
    </div>
  );
}

function Curve({
  data,
  site,
  up,
  total,
  lotById,
}: {
  data: DqeData;
  site: string;
  up: string;
  total: number;
  lotById: Map<string, { site: string }>;
}) {
  const byK = new Map(data.items.map((i) => [i.k, i]));
  const ev = data.att
    .filter((a) => a.d <= up && byK.has(a.k) && (!site || lotById.get(byK.get(a.k)!.lot)?.site === site))
    .sort((a, b) => (a.d < b.d ? -1 : 1));
  const W = 640;
  const H = 240;
  if (!ev.length || !total) {
    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full text-slate-400">
        <text x={W / 2} y={110} textAnchor="middle" fontSize="13" fill="currentColor">
          Aucune quantité saisie avant le {fD(up)}.
        </text>
        <text x={W / 2} y={132} textAnchor="middle" fontSize="12" fill="currentColor">
          La courbe se dessine dès la première saisie d&apos;attachement.
        </text>
      </svg>
    );
  }
  const days = [...new Set(ev.map((a) => a.d))];
  const cumK = new Map<number, number>();
  const pts: Array<[string, number]> = [];
  days.forEach((d) => {
    ev.filter((a) => a.d === d).forEach((a) => cumK.set(a.k, (cumK.get(a.k) ?? 0) + (+a.q || 0)));
    let cum = 0;
    cumK.forEach((q, k) => {
      const i = byK.get(k)!;
      cum += Math.min(q, Math.max(+i.q || 0, 0)) * (+i.pu || 0);
    });
    pts.push([d, cum]);
  });
  const endD = up > days[days.length - 1] ? up : days[days.length - 1];
  const t0 = new Date(days[0]).getTime();
  const t1 = new Date(endD).getTime();
  const span = Math.max(1, (t1 - t0) / 864e5);
  const Lm = 70;
  const R = 16;
  const Tp = 16;
  const B = 34;
  const xs = (d: string) => Lm + ((new Date(d).getTime() - t0) / 864e5 / span) * (W - Lm - R);
  const ys = (v: number) => H - B - (v / total) * (H - B - Tp);
  let p = `M${xs(days[0])},${ys(0)}`;
  pts.forEach(([d, v]) => {
    p += ` H${xs(d)} V${ys(v)}`;
  });
  p += ` H${xs(endD)}`;
  const lv = pts[pts.length - 1][1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full text-[10px]">
      {[0, 0.25, 0.5, 0.75, 1].map((f) => (
        <g key={f}>
          <line x1={Lm} x2={W - R} y1={ys(total * f)} y2={ys(total * f)} stroke="#e2e8f0" />
          <text x={Lm - 6} y={ys(total * f) + 3} textAnchor="end" fill="#64748b">
            {((total * f) / 1e6).toFixed(1).replace(".", ",")} M
          </text>
        </g>
      ))}
      <line x1={Lm} x2={W - R} y1={ys(total)} y2={ys(total)} stroke="#1e40af" strokeDasharray="4 3" />
      <text x={Lm} y={H - B + 15} fill="#64748b">
        {fD(days[0])}
      </text>
      <text x={W - R} y={H - B + 15} textAnchor="end" fill="#64748b">
        {fD(endD)}
      </text>
      <path d={`${p} V${ys(0)} Z`} fill="#05966922" />
      <path d={p} fill="none" stroke="#059669" strokeWidth="2" />
      <line x1={Lm} x2={W - R} y1={H - B} y2={H - B} stroke="#94a3b8" />
      {pts.map(([d, v]) => (
        <circle key={d} cx={xs(d)} cy={ys(v)} r="3.5" fill="#059669">
          <title>{`${fD(d)} – cumul ${F(v)} F HT`}</title>
        </circle>
      ))}
      <text x={W - R} y={Math.max(12, ys(lv) - 8)} textAnchor="end" fill="#0f172a" fontWeight="500">
        {F(lv)} F ({((lv / total) * 100).toFixed(1).replace(".", ",")} %)
      </text>
    </svg>
  );
}
