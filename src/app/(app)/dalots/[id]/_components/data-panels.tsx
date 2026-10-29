"use client";

import { sectionSvg } from "@/lib/dalot/diagrams";
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

/**
 * Réglage des ouvrages de tête par boutons : longueur, épaisseur et angle des ailes, longueur du
 * radier de tête, petite base (débord) et grande base (par l'angle). Vue en plan cotée en direct.
 */
export function HeadsAside({ api }: { api: SpecApi }) {
  const v = api.spec.values;
  const num = (k: string, d: number) => { const x = Number(v[k]); return Number.isFinite(x) ? x : d; };
  let B = 0;
  try {
    const inp = toInput(api.spec);
    B = inp.eExt * 2 + inp.openings.reduce((s, o) => s + o, 0) + inp.eInt * (inp.openings.length - 1);
  } catch {
    B = 0;
  }
  const murs = v.teteMurs === true;
  const long = num("aileLong", 2.5), ep = num("aileEp", 0.25), ang = num("aileAngle", 30);
  const radL = num("radierTeteLong", 1.5), deb = num("radierDebord", 0);
  const a = (ang * Math.PI) / 180;
  const pb = B + 2 * deb;
  const gb = pb + (murs ? 2 * radL * Math.tan(a) : 0);
  const r2 = (x: number) => Math.round(x * 100) / 100;
  const set = (k: string, x: number, min: number, max: number) => api.setValue(k, r2(Math.min(max, Math.max(min, x))));
  const setAngle = (deg: number) => api.setValue("aileAngle", Math.round(Math.min(75, Math.max(0, deg)) * 10) / 10);
  const setGB = (x: number) => {
    if (!murs || radL <= 0) return;
    setAngle((Math.atan(Math.max(0, x - pb) / (2 * radL)) * 180) / Math.PI);
  };
  const gr = (ang * 10) / 9;
  const rows: { label: string; value: string; unit: string; steps: [string, () => void][]; edit?: { k?: string; val: number; on: (x: number) => void } }[] = [
    { label: "Longueur des ailes", value: fr(long), unit: "m", steps: [["−0,25", () => set("aileLong", long - 0.25, 0.5, 10)], ["−0,05", () => set("aileLong", long - 0.05, 0.5, 10)], ["+0,05", () => set("aileLong", long + 0.05, 0.5, 10)], ["+0,25", () => set("aileLong", long + 0.25, 0.5, 10)]], edit: { val: long, on: (x) => set("aileLong", x, 0.5, 10) } },
    { label: "Épaisseur des ailes", value: fr(ep), unit: "m", steps: [["−0,05", () => set("aileEp", ep - 0.05, 0.15, 0.6)], ["−0,01", () => set("aileEp", ep - 0.01, 0.15, 0.6)], ["+0,01", () => set("aileEp", ep + 0.01, 0.15, 0.6)], ["+0,05", () => set("aileEp", ep + 0.05, 0.15, 0.6)]], edit: { val: ep, on: (x) => set("aileEp", x, 0.15, 0.6) } },
    { label: `Angle des ailes (${fr(gr, 1)} gr)`, value: fr(ang, 1), unit: "°", steps: [["−5°", () => setAngle(ang - 5)], ["−1°", () => setAngle(ang - 1)], ["+1°", () => setAngle(ang + 1)], ["+5°", () => setAngle(ang + 5)], ["30 gr", () => setAngle(27)], ["45°", () => setAngle(45)]], edit: { val: ang, on: (x) => setAngle(x) } },
    { label: "Longueur du radier de tête", value: fr(radL), unit: "m", steps: [["−0,25", () => set("radierTeteLong", radL - 0.25, 0, 10)], ["−0,05", () => set("radierTeteLong", radL - 0.05, 0, 10)], ["+0,05", () => set("radierTeteLong", radL + 0.05, 0, 10)], ["+0,25", () => set("radierTeteLong", radL + 0.25, 0, 10)]], edit: { val: radL, on: (x) => set("radierTeteLong", x, 0, 10) } },
    { label: "Petite base du radier (au droit de l'ouvrage)", value: fr(pb), unit: "m", steps: [["−0,10", () => set("radierDebord", deb - 0.05, 0, 3)], ["+0,10", () => set("radierDebord", deb + 0.05, 0, 3)], ["= largeur ouvrage", () => set("radierDebord", 0, 0, 3)]], edit: { val: pb, on: (x) => set("radierDebord", (x - B) / 2, 0, 3) } },
    { label: "Grande base du radier (extrémité)", value: fr(gb), unit: "m", steps: murs ? [["−0,50", () => setGB(gb - 0.5)], ["−0,10", () => setGB(gb - 0.1)], ["+0,10", () => setGB(gb + 0.1)], ["+0,50", () => setGB(gb + 0.5)]] : [], edit: murs ? { val: gb, on: (x) => setGB(x) } : undefined },
  ];
  // Vue en plan d'une tête : y le long de l'axe (0 = nu de l'ouvrage), x en travers.
  const along = murs ? long * Math.cos(a) : 0, across = murs ? long * Math.sin(a) : 0;
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
    ${murs ? txt(B + deb + Math.sin(a) * long * 0.5 + 0.35, Math.cos(a) * long * 0.5, `aile ${fr(long)} m · ${fr(ang, 1)}°`, "start") : ""}
    ${murs ? txt(-deb - Math.sin(a) * long * 0.5 - 0.35, Math.cos(a) * long * 0.5, `ép. ${fr(ep)} m`, "end") : ""}
  </svg>`;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-700">Réglage des ouvrages de tête</h3>
      <p className="mb-2 text-xs text-slate-500">Les boutons modifient directement les données ; le calcul, les plans et la 3D suivent. La grande base se règle par l&apos;angle des ailes (longueur du radier fixée).</p>
      <div className="mb-3" dangerouslySetInnerHTML={{ __html: svg }} />
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.label} className="rounded-lg border border-slate-100 p-2">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs text-slate-600">{r.label}</span>
              <span className="text-sm font-semibold text-slate-900">{r.value} {r.unit}</span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-1">
              {r.steps.map(([l, fn]) => (
                <button key={l} type="button" onClick={fn} className="rounded border border-slate-300 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700 hover:bg-blue-50">{l}</button>
              ))}
              {r.edit && (
                <input key={`${r.label}-${r.edit.val}`} type="number" step="0.01" defaultValue={Math.round(r.edit.val * 100) / 100}
                  onKeyDown={(e) => { if (e.key === "Enter") { const x = Number((e.target as HTMLInputElement).value); if (Number.isFinite(x)) r.edit!.on(x); } }}
                  onBlur={(e) => { const x = Number(e.target.value); if (Number.isFinite(x) && Math.abs(x - r.edit!.val) > 1e-6) r.edit!.on(x); }}
                  className="ml-auto w-20 rounded border border-slate-300 px-1.5 py-0.5 text-right text-xs" />
              )}
            </div>
          </div>
        ))}
        {murs && radL > 0 && (
          <button type="button" onClick={() => set("radierTeteLong", long * Math.cos(a), 0, 10)} className="w-full rounded-md border border-blue-300 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-800 hover:bg-blue-100">
            Aligner le radier sur l&apos;extrémité des ailes (longueur = {fr(long * Math.cos(a))} m, comme les plans types)
          </button>
        )}
        {!murs && <p className="text-xs text-amber-700">Murs en aile désactivés : cochez « Murs en aile » pour régler les ailes et la grande base.</p>}
      </div>
    </div>
  );
}
