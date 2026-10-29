"use client";

import { useState } from "react";
import { sectionSvg } from "@/lib/dalot/diagrams";
import { H_END_MIN, headDimensions } from "@/lib/dalot/head-dims";
import type { RunOutcome } from "@/lib/dalot/engine";
import {
  FIELDS, isVisible, parseList, SOIL_PRESETS, toInput, type DalotSpec, type FieldDef, type FieldValue, type SectionId,
} from "@/lib/dalot/fields";

export type SpecApi = {
  spec: DalotSpec;
  setValue: (key: string, value: FieldValue) => void;
  setValues: (values: Record<string, FieldValue>, markDefault?: boolean) => void;
  confirm: (keys: string[]) => void;
};

const fr = (x: number, d = 2) => x.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });

export function sectionState(spec: DalotSpec, section: SectionId) {
  const fields = FIELDS.filter((f) => f.section === section && isVisible(f, spec.values));
  const missing = fields.filter((f) => f.required && (spec.values[f.key] === null || spec.values[f.key] === ""));
  const defaulted = fields.filter((f) => spec.defaulted.includes(f.key));
  return { fields, missing, defaulted };
}

function FieldRow({ f, api }: { f: FieldDef; api: SpecApi }) {
  const v = api.spec.values[f.key];
  const isDefault = api.spec.defaulted.includes(f.key);
  const missing = f.required && (v === null || v === "" || (f.kind === "number" && !Number.isFinite(Number(v))));
  const base = "w-full rounded-md border px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1";
  const tone = missing ? "border-red-400 bg-red-50 focus:ring-red-500" : isDefault ? "border-amber-300 bg-amber-50/40 focus:ring-amber-500" : "border-slate-300 focus:ring-blue-600";
  let control: React.ReactNode;
  if (f.kind === "bool") {
    control = (
      <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
        <input type="checkbox" checked={v === true} onChange={(e) => api.setValue(f.key, e.target.checked)} className="h-4 w-4 accent-blue-700" />
        <span className="text-slate-600">{v === true ? "Oui" : "Non"}</span>
      </label>
    );
  } else if (f.kind === "select") {
    control = (
      <select value={String(v ?? "")} onChange={(e) => api.setValue(f.key, e.target.value)} className={`${base} ${tone}`}>
        {f.options!.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    );
  } else {
    control = (
      <input
        type={f.kind === "number" ? "number" : "text"}
        inputMode={f.kind === "number" ? "decimal" : undefined}
        step={f.step ?? "any"} min={f.min} max={f.max}
        value={v === null || v === undefined ? "" : String(v)}
        onChange={(e) => {
          const raw = e.target.value;
          api.setValue(f.key, f.kind === "number" ? (raw === "" ? null : Number(raw)) : raw);
        }}
        className={`${base} ${tone}`}
      />
    );
  }
  return (
    <div className={`grid grid-cols-1 gap-1 border-l-2 py-2 pl-3 sm:grid-cols-[minmax(0,1fr)_200px_48px] sm:items-start sm:gap-3 ${missing ? "border-red-500" : isDefault ? "border-amber-400" : "border-transparent"}`}>
      <div>
        <div className="text-sm text-slate-800">{f.label}{f.required && <span className="text-red-500"> *</span>}</div>
        {f.help && <div className="text-xs text-slate-500">{f.help}</div>}
        {missing && <div className="mt-0.5 text-xs font-medium text-red-600">Donnée obligatoire manquante : le calcul est bloqué.</div>}
        {isDefault && !missing && (
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-800">Valeur par défaut, à confirmer</span>
            <button type="button" onClick={() => api.confirm([f.key])} className="rounded border border-slate-300 px-1.5 py-0.5 text-[11px] text-slate-600 hover:bg-slate-50">
              Confirmer cette valeur
            </button>
          </div>
        )}
      </div>
      <div>{control}</div>
      <div className="pt-1.5 text-xs text-slate-500">{f.unit}</div>
    </div>
  );
}

export function FieldsPanel({ section, title, intro, api, aside }: { section: SectionId; title: string; intro: string; api: SpecApi; aside?: React.ReactNode }) {
  const { fields, missing, defaulted } = sectionState(api.spec, section);
  const groups = Array.from(new Set(fields.map((f) => f.group)));
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <p className="text-sm text-slate-500">{intro}</p>
          <p className="mt-1 text-xs text-slate-400">* donnée obligatoire. Une barre rouge signale une donnée manquante ; une barre orange une valeur par défaut que vous devez confirmer.</p>
          {(missing.length > 0 || defaulted.length > 0) && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              {missing.length > 0 && <span className="rounded bg-red-100 px-2 py-1 font-medium text-red-700">{missing.length} donnée(s) manquante(s)</span>}
              {defaulted.length > 0 && (
                <>
                  <span className="rounded bg-amber-100 px-2 py-1 font-medium text-amber-800">{defaulted.length} valeur(s) à confirmer</span>
                  <button type="button" onClick={() => api.confirm(defaulted.map((f) => f.key))} className="rounded border border-slate-300 px-2 py-1 text-slate-600 hover:bg-slate-50">
                    Tout confirmer dans cette rubrique
                  </button>
                </>
              )}
            </div>
          )}
        </div>
        {groups.map((g) => (
          <section key={g} className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-1 text-sm font-semibold text-slate-700">{g}</h3>
            <div className="divide-y divide-slate-100">
              {fields.filter((f) => f.group === g).map((f) => (
                section === "sol" && f.key === "soilPreset"
                  ? <SoilPresetRow key={f.key} f={f} api={api} />
                  : <FieldRow key={f.key} f={f} api={api} />
              ))}
            </div>
          </section>
        ))}
      </div>
      {aside && <div className="space-y-4">{aside}</div>}
    </div>
  );
}

function SoilPresetRow({ f, api }: { f: FieldDef; api: SpecApi }) {
  return (
    <div className="py-2 pl-3">
      <div className="text-sm text-slate-800">{f.label}</div>
      <div className="text-xs text-slate-500">{f.help}</div>
      <select
        value={String(api.spec.values.soilPreset ?? "")}
        onChange={(e) => {
          const p = SOIL_PRESETS.find((s) => s.id === e.target.value);
          if (!p) return;
          api.setValues({ soilPreset: p.id, gammaSol: p.gamma, phiSol: p.phi, cSol: p.c, ks: p.ks, EsSol: p.Es, qadm: p.qadm }, true);
        }}
        className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
      >
        {SOIL_PRESETS.map((s) => <option key={s.id} value={s.id}>{s.label} — γ {s.gamma}, φ {s.phi}°, c {s.c} kPa, ks {s.ks / 1000} MN/m³</option>)}
      </select>
    </div>
  );
}

/** Coupe transversale cotée, mise à jour à chaque frappe. */
export function GeometryAside({ spec }: { spec: DalotSpec }) {
  const inp = toInput(spec);
  const ok = inp.openings.every((o) => o > 0) && inp.hInt > 0 && inp.es > 0 && inp.er > 0 && inp.eExt > 0;
  const n = inp.openings.length;
  const listed = parseList(String(spec.values.openings ?? "")).filter((x) => x > 0);
  const B = 2 * inp.eExt + inp.openings.reduce((s, o) => s + o, 0) + (n - 1) * inp.eInt;
  const H = inp.er + inp.hInt + inp.es;
  return (
    <section className="sticky top-4 rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="mb-2 text-sm font-semibold text-slate-700">Coupe transversale</h3>
      {ok ? <div dangerouslySetInnerHTML={{ __html: sectionSvg(inp) }} /> : <p className="text-sm text-red-600">Géométrie incomplète.</p>}
      {listed.length > 0 && listed.length !== n && (
        <p className="mt-2 text-xs text-amber-700">{listed.length} ouverture(s) saisie(s) pour {n} cellule(s) : l&apos;ouverture commune est utilisée.</p>
      )}
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <dt className="text-slate-500">Portée aux axes</dt><dd className="text-right font-medium">{fr(inp.openings[0] + (inp.eExt + (n > 1 ? inp.eInt : inp.eExt)) / 2, 3)} m</dd>
        <dt className="text-slate-500">Hauteur aux axes</dt><dd className="text-right font-medium">{fr(inp.hInt + (inp.es + inp.er) / 2, 3)} m</dd>
        <dt className="text-slate-500">Largeur extérieure</dt><dd className="text-right font-medium">{fr(B, 3)} m</dd>
        <dt className="text-slate-500">Hauteur extérieure</dt><dd className="text-right font-medium">{fr(H, 3)} m</dd>
        <dt className="text-slate-500">Section d&apos;écoulement</dt><dd className="text-right font-medium">{fr(inp.openings.reduce((s, o) => s + o * inp.hInt, 0))} m²</dd>
        <dt className="text-slate-500">Béton du corps</dt><dd className="text-right font-medium">{fr((B * H - inp.openings.reduce((s, o) => s + o * inp.hInt, 0)) * inp.L)} m³</dd>
      </dl>
    </section>
  );
}

export function HydroAside({ outcome }: { outcome: RunOutcome | null }) {
  if (!outcome?.ok || !outcome.study.hydro) {
    return <section className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">Étude hydraulique désactivée ou calcul incomplet.</section>;
  }
  const h = outcome.study.hydro;
  const inp = outcome.study.input;
  const checks = outcome.study.checks.filter((c) => c.domain === "Hydrologie et hydraulique");
  const pct = Math.max(0, Math.min(100, (h.h / inp.hInt) * 100));
  return (
    <section className="sticky top-4 space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-700">Résultats hydrauliques</h3>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        {h.method === "rationnelle" && (<>
          <dt className="text-slate-500">Temps de concentration</dt><dd className="text-right font-medium">{fr(h.tcMin, 1)} min</dd>
          <dt className="text-slate-500">Intensité de pluie</dt><dd className="text-right font-medium">{fr(h.I, 1)} mm/h</dd>
        </>)}
        <dt className="text-slate-500">Débit de projet Qp</dt><dd className="text-right font-semibold text-blue-800">{fr(h.Qp)} m³/s</dd>
        <dt className="text-slate-500">Débit par cellule</dt><dd className="text-right font-medium">{fr(h.Qcell)} m³/s</dd>
        <dt className="text-slate-500">Tirant d&apos;eau normal</dt><dd className="text-right font-medium">{fr(h.h)} m</dd>
        <dt className="text-slate-500">Vitesse</dt><dd className="text-right font-medium">{fr(h.V)} m/s</dd>
        <dt className="text-slate-500">Froude</dt><dd className="text-right font-medium">{fr(h.Fr)} ({h.Fr > 1 ? "torrentiel" : "fluvial"})</dd>
        <dt className="text-slate-500">Revanche</dt><dd className="text-right font-medium">{fr(h.revanche)} m ({fr(h.revanchePct, 0)} %)</dd>
      </dl>
      <div>
        <div className="mb-1 text-xs text-slate-500">Remplissage d&apos;une cellule</div>
        <div className="relative h-24 w-full overflow-hidden rounded border-2 border-slate-700 bg-slate-50">
          <div className="absolute bottom-0 left-0 right-0 bg-sky-400/70" style={{ height: `${pct}%` }} />
          <div className="absolute left-0 right-0 border-t border-dashed border-red-500" style={{ bottom: `${100 - inp.hydro.revanchePct}%` }} />
        </div>
        <div className="mt-1 text-[11px] text-slate-400">Pointillé rouge : niveau maximal pour respecter la revanche de {inp.hydro.revanchePct} %.</div>
      </div>
      <ul className="space-y-1 text-xs">
        {checks.map((c) => (
          <li key={c.id} className={c.status === "conforme" ? "text-green-700" : c.status === "non_conforme" ? "text-red-700" : "text-amber-700"}>
            {c.status === "conforme" ? "✓" : c.status === "non_conforme" ? "✗" : "•"} {c.label}{c.detail ? ` — ${c.detail}` : ""}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Champ numérique avec validation : la valeur n'est appliquée qu'à « Entrée » ou à la sortie du champ. */
function NumEdit({ value, onApply, min, max, unit }: { value: number; onApply: (x: number) => void; min: number; max: number; unit: string }) {
  const [txt, setTxt] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const shown = txt ?? String(Math.round(value * 100) / 100).replace(".", ",");
  const commit = () => {
    if (txt === null) return;
    const x = Number(txt.replace(",", ".").trim());
    if (!Number.isFinite(x)) { setMsg("Nombre invalide"); return; }
    if (x < min - 1e-9 || x > max + 1e-9) { setMsg(`Valeur entre ${fr(min)} et ${fr(max)} ${unit}`); return; }
    setMsg("");
    setTxt(null);
    onApply(x);
  };
  return (
    <span className="ml-auto inline-flex flex-col items-end">
      <span className="inline-flex items-center gap-1">
        <input value={shown} inputMode="decimal" onChange={(e) => { setTxt(e.target.value); setMsg(""); }} onBlur={commit}
          onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setTxt(null); setMsg(""); } }}
          className={`w-20 rounded border px-1.5 py-0.5 text-right text-xs ${msg ? "border-red-400 bg-red-50" : "border-slate-300"}`} />
        <button type="button" onClick={commit} className="rounded bg-blue-800 px-1.5 py-0.5 text-[11px] font-medium text-white hover:bg-blue-900">OK</button>
      </span>
      {msg && <span className="text-[11px] text-red-600">{msg}</span>}
    </span>
  );
}

/**
 * Réglage des ouvrages de tête par boutons : longueur, épaisseur et angle des ailes, longueur du
 * radier de tête, petite base (débord) et grande base (par l'angle). Dimensions calculées à partir
 * des données du projet et vue en plan cotée, en direct.
 */
export function HeadsAside({ api }: { api: SpecApi }) {
  let inp: ReturnType<typeof toInput> | null = null;
  try { inp = toInput(api.spec); } catch { inp = null; }
  if (!inp) return <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-red-600">Géométrie incomplète : renseignez d&apos;abord la rubrique « Géométrie du dalot ».</div>;
  const dims = headDimensions(inp);
  const t = inp.tetes;
  const B = dims.B;
  const murs = t.murs;
  const long = t.long, ep = t.ep, ang = t.angle, radL = t.radierLong, deb = t.debord;
  const a = (ang * Math.PI) / 180;
  const pb = dims.pb, gb = dims.gb;
  const r2 = (x: number) => Math.round(x * 100) / 100;
  const set = (k: string, x: number, min: number, max: number) => api.setValue(k, r2(Math.min(max, Math.max(min, x))));
  const setAngle = (deg: number) => api.setValue("aileAngle", Math.round(Math.min(75, Math.max(0, deg)) * 10) / 10);
  const setGB = (x: number) => {
    if (!murs || radL <= 0) return;
    setAngle((Math.atan(Math.max(0, x - pb) / (2 * radL)) * 180) / Math.PI);
  };
  const setPB = (x: number) => set("radierDebord", (x - B) / 2, 0, 3);
  const gr = (ang * 10) / 9;
  type Row = { label: string; value: string; unit: string; steps: [string, () => void][]; edit?: { val: number; on: (x: number) => void; min: number; max: number }; note?: string };
  const rows: Row[] = [
    { label: "Longueur des ailes", value: fr(long), unit: "m", steps: [["−0,25", () => set("aileLong", long - 0.25, 0.5, 10)], ["−0,05", () => set("aileLong", long - 0.05, 0.5, 10)], ["+0,05", () => set("aileLong", long + 0.05, 0.5, 10)], ["+0,25", () => set("aileLong", long + 0.25, 0.5, 10)]], edit: { val: long, on: (x) => set("aileLong", x, 0.5, 10), min: 0.5, max: 10 } },
    { label: "Épaisseur des ailes", value: fr(ep), unit: "m", steps: [["−0,05", () => set("aileEp", ep - 0.05, 0.15, 0.6)], ["−0,01", () => set("aileEp", ep - 0.01, 0.15, 0.6)], ["+0,01", () => set("aileEp", ep + 0.01, 0.15, 0.6)], ["+0,05", () => set("aileEp", ep + 0.05, 0.15, 0.6)]], edit: { val: ep, on: (x) => set("aileEp", x, 0.15, 0.6), min: 0.15, max: 0.6 } },
    { label: `Angle des ailes / axe (${fr(gr, 1)} gr)`, value: fr(ang, 1), unit: "°", steps: [["−5°", () => setAngle(ang - 5)], ["−1°", () => setAngle(ang - 1)], ["+1°", () => setAngle(ang + 1)], ["+5°", () => setAngle(ang + 5)], ["30 gr", () => setAngle(27)], ["45°", () => setAngle(45)]], edit: { val: ang, on: (x) => setAngle(x), min: 0, max: 75 } },
    { label: "Longueur du radier de tête", value: fr(radL), unit: "m", steps: [["−0,25", () => set("radierTeteLong", radL - 0.25, 0, 10)], ["−0,05", () => set("radierTeteLong", radL - 0.05, 0, 10)], ["+0,05", () => set("radierTeteLong", radL + 0.05, 0, 10)], ["+0,25", () => set("radierTeteLong", radL + 0.25, 0, 10)]], edit: { val: radL, on: (x) => set("radierTeteLong", x, 0, 10), min: 0, max: 10 } },
    { label: "Petite base du radier (au droit de l'ouvrage)", value: fr(pb), unit: "m", steps: [["−0,10", () => setPB(pb - 0.1)], ["+0,10", () => setPB(pb + 0.1)], ["+0,50", () => setPB(pb + 0.5)], ["= largeur ouvrage", () => setPB(B)]], edit: { val: pb, on: setPB, min: B, max: B + 6 }, note: `minimum = largeur extérieure de l'ouvrage (${fr(B)} m) ; débord ${fr(deb)} m de chaque côté` },
    { label: "Grande base du radier (extrémité)", value: fr(gb), unit: "m", steps: murs && radL > 0 ? [["−0,50", () => setGB(gb - 0.5)], ["−0,10", () => setGB(gb - 0.1)], ["+0,10", () => setGB(gb + 0.1)], ["+0,50", () => setGB(gb + 0.5)]] : [], edit: murs && radL > 0 ? { val: gb, on: setGB, min: pb, max: pb + 2 * radL * Math.tan((75 * Math.PI) / 180) } : undefined, note: murs ? "réglée par l'angle des ailes (longueur du radier fixée)" : "murs en aile désactivés : grande base = petite base" },
  ];
  // Vue en plan d'une tête : y le long de l'axe (0 = nu de l'ouvrage), x en travers.
  const along = dims.along, across = dims.across;
  const Wd = (Math.max(gb, pb + 2 * across) + 2 * ep) * 1.55 + 1, Hd = Math.max(radL, along) + 1.2;
  const k = 380 / Wd;
  const X = (x: number) => 190 + x * k, Y = (y: number) => 30 + y * k;
  const cx = B / 2;
  const P = (pts: [number, number][]) => pts.map(([x, y]) => `${X(x - cx).toFixed(1)},${Y(y).toFixed(1)}`).join(" ");
  const hgt = Hd * k + 40;
  const wing = (side: 1 | -1) => {
    const x0 = side < 0 ? -deb : B + deb;
    const dx = side * Math.sin(a), dy = Math.cos(a), nx = side * Math.cos(a), ny = -Math.sin(a);
    return P([[x0, 0], [x0 + dx * long, dy * long], [x0 + dx * long + nx * ep, dy * long + ny * ep], [x0 + nx * ep, ny * ep]]);
  };
  const txt = (x: number, y: number, s: string, anchor = "middle", col = "#1d4ed8") => `<text x="${X(x - cx).toFixed(1)}" y="${Y(y).toFixed(1)}" font-size="11" text-anchor="${anchor}" fill="${col}">${s}</text>`;
  const svg = `<svg viewBox="0 0 380 ${hgt.toFixed(0)}" width="100%" font-family="Arial">
    <rect x="${X(-cx)}" y="${Y(-0.9)}" width="${B * k}" height="${0.9 * k}" fill="#cbd5e1" stroke="#0f172a"/>
    ${txt(cx, -0.35, `Ouvrage ${fr(B)} m`, "middle", "#0f172a")}
    ${radL > 0 ? `<polygon points="${P([[-deb, 0], [B + deb, 0], [B + deb + (murs ? radL * Math.tan(a) : 0), radL], [-deb - (murs ? radL * Math.tan(a) : 0), radL]])}" fill="#e2e8f0" stroke="#0f172a"/>` : ""}
    ${murs ? `<polygon points="${wing(-1)}" fill="#94a3b8" stroke="#0f172a"/><polygon points="${wing(1)}" fill="#94a3b8" stroke="#0f172a"/>` : ""}
    ${txt(cx, 0.35, `petite base ${fr(pb)} m`)}
    ${radL > 0 ? txt(cx, radL + 0.45, `grande base ${fr(gb)} m`) : ""}
    ${radL > 0 ? txt(cx, radL / 2 + 0.15, `radier L = ${fr(radL)} m`, "middle", "#334155") : ""}
    ${murs ? txt(B + deb + Math.sin(a) * long * 0.5 + 0.35, Math.cos(a) * long * 0.5, `aile ${fr(long)} m`, "start") : ""}
    ${murs ? txt(-deb - Math.sin(a) * long * 0.5 - 0.35, Math.cos(a) * long * 0.5, `${fr(ang, 1)}° · ép. ${fr(ep)}`, "end") : ""}
  </svg>`;
  const applyRec = () => api.setValues({ aileLong: r2(Math.ceil(dims.longRec / 0.05) * 0.05), radierTeteLong: r2(Math.ceil(dims.alongRec / 0.05) * 0.05) });
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4">
        <h3 className="text-sm font-semibold text-slate-800">Dimensions calculées à partir du projet</h3>
        <table className="mt-2 w-full text-xs">
          <tbody className="divide-y divide-blue-100">
            <tr><td className="py-1 text-slate-600">Largeur extérieure de l&apos;ouvrage B = n·o + 2e + (n−1)·ei</td><td className="py-1 text-right font-semibold">{fr(B)} m</td></tr>
            <tr><td className="py-1 text-slate-600">Hauteur des ailes à la racine (arrêtées à la dalle supérieure) H = er + h + es</td><td className="py-1 text-right font-semibold">{fr(dims.Htot)} m</td></tr>
            {murs && <tr><td className="py-1 text-slate-600">Hauteur des ailes : racine / extrémité (talus {fr(dims.m, 1)}/1)</td><td className="py-1 text-right font-semibold">{fr(dims.Htot)} / {fr(dims.Hend)} m</td></tr>}
            {murs && <tr><td className="py-1 text-slate-600">Projection des ailes : le long de l&apos;axe / en travers</td><td className="py-1 text-right font-semibold">{fr(along)} / {fr(across)} m</td></tr>}
            <tr><td className="py-1 text-slate-600">Petite base du radier = B + 2·débord</td><td className="py-1 text-right font-semibold">{fr(pb)} m</td></tr>
            <tr><td className="py-1 text-slate-600">Grande base du radier = petite base + 2·L·tan(angle)</td><td className="py-1 text-right font-semibold">{fr(gb)} m</td></tr>
            <tr><td className="py-1 text-slate-600">Surface d&apos;un radier de tête (trapèze)</td><td className="py-1 text-right font-semibold">{fr(dims.surfaceRadier)} m²</td></tr>
            {murs && <tr><td className="py-1 text-slate-600">Longueur d&apos;aile recommandée : (H − 0,60)·m / cos(angle)</td><td className="py-1 text-right font-semibold text-blue-800">{fr(dims.longRec)} m</td></tr>}
            {murs && <tr><td className="py-1 text-slate-600">Radier aligné sur les ailes recommandées / grande base</td><td className="py-1 text-right font-semibold text-blue-800">{fr(dims.alongRec)} / {fr(dims.gbRec)} m</td></tr>}
          </tbody>
        </table>
        {murs && (
          <button type="button" onClick={applyRec} className="mt-2 w-full rounded-md bg-blue-800 px-2 py-1.5 text-xs font-semibold text-white hover:bg-blue-900">
            Appliquer les dimensions calculées (ailes {fr(Math.ceil(dims.longRec / 0.05) * 0.05)} m, radier {fr(Math.ceil(dims.alongRec / 0.05) * 0.05)} m)
          </button>
        )}
        {murs && dims.Hend > H_END_MIN + 0.01 && <p className="mt-2 text-xs text-amber-800">Les ailes actuelles sont trop courtes : le talus arrive à {fr(dims.Hend)} m de hauteur en bout d&apos;aile (au lieu de {fr(H_END_MIN)} m).</p>}
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-700">Réglage des ouvrages de tête</h3>
        <p className="mb-2 text-xs text-slate-500">Boutons ou saisie (valider par « OK » ou Entrée) : le calcul, les plans, la nomenclature et la 3D suivent.</p>
        <div className="mb-3" dangerouslySetInnerHTML={{ __html: svg }} />
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.label} className="rounded-lg border border-slate-100 p-2">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs text-slate-600">{r.label}</span>
                <span className="text-sm font-semibold text-slate-900">{r.value} {r.unit}</span>
              </div>
              <div className="mt-1 flex flex-wrap items-start gap-1">
                {r.steps.map(([l, fn]) => (
                  <button key={l} type="button" onClick={fn} className="rounded border border-slate-300 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700 hover:bg-blue-50">{l}</button>
                ))}
                {r.edit && <NumEdit value={r.edit.val} onApply={r.edit.on} min={r.edit.min} max={r.edit.max} unit={r.unit} />}
              </div>
              {r.note && <div className="mt-1 text-[11px] text-slate-400">{r.note}</div>}
            </div>
          ))}
          {!murs && (
            <button type="button" onClick={() => api.setValue("teteMurs", true)} className="w-full rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800">Activer les murs en aile</button>
          )}
        </div>
      </div>
    </div>
  );
}
