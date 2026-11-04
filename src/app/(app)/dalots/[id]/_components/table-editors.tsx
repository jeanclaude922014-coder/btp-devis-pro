"use client";

/**
 * Éditeurs des données en tableau : ouvrages annexes position par position (4 murs en aile,
 * 2 têtes), coupe de sol sous le radier (tassement) et situations hydrauliques.
 * Les tableaux sont gardés en JSON dans les valeurs de l'étude ; une case vide reprend la valeur générale.
 */

import { useState } from "react";
import { headLayout, headDimensions, wingEndHeight } from "@/lib/dalot/head-dims";
import {
  HEAD_IDS, parseAnnexes, parseLayers, parseSituations, SOIL_PRESETS, toInput, WING_LABELS, WING_POS,
  type Annexes, type FieldDef, type HeadOverride, type HydroSituation, type SoilLayer, type WingOverride,
} from "@/lib/dalot/fields";
import type { SpecApi } from "./data-panels";

const fr = (x: number, d = 2) => x.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
const cell = "w-full min-w-[4.5rem] rounded border px-1.5 py-1 text-right text-sm focus:outline-none focus:ring-1 focus:ring-blue-600";
const btn = "rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50";

/** Case numérique : validée à la sortie du champ ou par Entrée ; vide = valeur générale. */
function NumCell({ value, placeholder, onChange, min, max, label }: {
  value: number | undefined | null; placeholder?: string; onChange: (v: number | undefined) => void; min?: number; max?: number; label: string;
}) {
  const show = (x: number | undefined | null) => (x === undefined || x === null ? "" : String(x).replace(".", ","));
  const [txt, setTxt] = useState(show(value));
  // Valeur changée de l'extérieur (retour aux valeurs générales…) : le texte affiché suit.
  const [prev, setPrev] = useState(value);
  if (prev !== value) { setPrev(value); setTxt(show(value)); }
  const commit = () => {
    const t = txt.trim();
    if (!t) { onChange(undefined); return; }
    const n = Number(t.replace(",", "."));
    if (!Number.isFinite(n) || (min !== undefined && n < min) || (max !== undefined && n > max)) {
      setTxt(value === undefined || value === null ? "" : String(value).replace(".", ","));
      return;
    }
    onChange(n);
  };
  const own = value !== undefined && value !== null;
  return (
    <input aria-label={label} inputMode="decimal" value={txt} placeholder={placeholder} onChange={(e) => setTxt(e.target.value)} onBlur={commit}
      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
      className={`${cell} ${own ? "border-blue-400 bg-blue-50/50 font-medium" : "border-slate-300 placeholder:text-slate-400"}`} />
  );
}

// ── Ouvrages annexes ───────────────────────────────────────────

export function AnnexesEditor({ api }: { api: SpecApi }) {
  const v = api.spec.values;
  const ann = parseAnnexes(v.annexes);
  const inp = toInput(api.spec);
  const t = inp.tetes;
  const layout = headLayout(inp);
  const dm = headDimensions(inp);
  const save = (next: Annexes) => {
    const empty = Object.keys(next.heads).length === 0 && Object.keys(next.wings).length === 0;
    api.setValue("annexes", empty ? "" : JSON.stringify(next));
  };
  const setWing = (pos: (typeof WING_POS)[number], patch: Partial<WingOverride>) => {
    const cur = { ...(ann.wings[pos] ?? {}), ...patch };
    for (const k of Object.keys(cur) as (keyof WingOverride)[]) if (cur[k] === undefined) delete cur[k];
    if (cur.actif === true) delete cur.actif;
    const wings = { ...ann.wings, [pos]: cur };
    if (Object.keys(cur).length === 0) delete wings[pos];
    save({ ...ann, wings });
  };
  const setHead = (h: (typeof HEAD_IDS)[number], patch: Partial<HeadOverride>) => {
    const cur = { ...(ann.heads[h] ?? {}), ...patch };
    for (const k of Object.keys(cur) as (keyof HeadOverride)[]) if (cur[k] === undefined) delete cur[k];
    const heads = { ...ann.heads, [h]: cur };
    if (Object.keys(cur).length === 0) delete heads[h];
    save({ ...ann, heads });
  };
  const n = Object.keys(ann.heads).length + Object.keys(ann.wings).length;
  return (
    <div className="space-y-4 py-2">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className={`rounded px-2 py-1 font-medium ${layout.uniform ? "bg-slate-100 text-slate-600" : "bg-blue-100 text-blue-800"}`}>
          {layout.uniform ? "Têtes identiques et symétriques (valeurs générales)" : `${n} position(s) réglée(s) à part — chaque tête est vérifiée séparément`}
        </span>
        {n > 0 && <button type="button" onClick={() => api.setValue("annexes", "")} className={btn}>Revenir partout aux valeurs générales</button>}
      </div>
      <p className="text-xs text-slate-500">Rive gauche / rive droite : vues de l&apos;amont vers l&apos;aval. Case grise : valeur générale reprise ; case bleue : valeur propre à la position.</p>

      <div>
        <h4 className="mb-1 text-sm font-semibold text-slate-700">Murs en aile</h4>
        {!t.murs ? <p className="text-sm text-slate-500">Murs en aile désactivés (rubrique ci-dessus).</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs text-slate-500">
                <tr>
                  <th className="px-2 py-1.5">Position</th>
                  <th className="px-2 py-1.5">Angle / axe (°)</th>
                  <th className="px-2 py-1.5">Longueur (m)</th>
                  <th className="px-2 py-1.5">Épaisseur (m)</th>
                  <th className="px-2 py-1.5">Hauteur en extrémité (m)</th>
                  <th className="px-2 py-1.5 text-right">Racine / extrémité</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {WING_POS.map((pos) => {
                  const o = ann.wings[pos] ?? {};
                  const head = layout.heads.find((h) => pos.startsWith(h.id))!;
                  const side = head.sides.find((s) => s.pos === pos)!;
                  const Htot = dm.Hext + (side.tv.guideRoues ? side.tv.grH : 0);
                  const active = o.actif !== false;
                  return (
                    <tr key={pos} className={active ? "" : "bg-slate-50 text-slate-400"}>
                      <td className="px-2 py-1.5">
                        <label className="inline-flex items-center gap-2">
                          <input type="checkbox" checked={active} onChange={(e) => setWing(pos, { actif: e.target.checked ? undefined : false })} className="h-4 w-4 accent-blue-700" />
                          {WING_LABELS[pos]}
                        </label>
                      </td>
                      <td className="px-2 py-1"><NumCell label={`Angle ${WING_LABELS[pos]}`} value={o.angle} placeholder={fr(t.angle, 0)} min={0} max={90} onChange={(x) => setWing(pos, { angle: x })} /></td>
                      <td className="px-2 py-1"><NumCell label={`Longueur ${WING_LABELS[pos]}`} value={o.long} placeholder={fr(t.long)} min={0.5} max={15} onChange={(x) => setWing(pos, { long: x })} /></td>
                      <td className="px-2 py-1"><NumCell label={`Épaisseur ${WING_LABELS[pos]}`} value={o.ep} placeholder={fr(t.ep)} min={0.15} max={0.8} onChange={(x) => setWing(pos, { ep: x })} /></td>
                      <td className="px-2 py-1"><NumCell label={`Hauteur en extrémité ${WING_LABELS[pos]}`} value={o.hEnd} placeholder="talus" min={0.3} max={10} onChange={(x) => setWing(pos, { hEnd: x })} /></td>
                      <td className="px-2 py-1.5 text-right text-xs text-slate-600">{active ? `${fr(Htot)} / ${fr(wingEndHeight(inp, side.tv, Htot))} m` : "sans aile"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <h4 className="mb-1 text-sm font-semibold text-slate-700">Têtes : murs de tête, radiers de tête, bêches et guide-roues</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <th className="px-2 py-1.5">Tête</th>
                <th className="px-2 py-1.5">Guide-roue / mur de tête : hauteur sur la dalle (m)</th>
                <th className="px-2 py-1.5">Largeur du guide-roue (m)</th>
                <th className="px-2 py-1.5">Épaisseur du mur de tête (m)</th>
                <th className="px-2 py-1.5">Radier de tête : longueur (m)</th>
                <th className="px-2 py-1.5">Bêche : profondeur (m)</th>
                <th className="px-2 py-1.5">Bêche : épaisseur (m)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {HEAD_IDS.map((h) => {
                const o = ann.heads[h] ?? {};
                return (
                  <tr key={h}>
                    <td className="px-2 py-1.5 font-medium">{h === "amont" ? "Amont" : "Aval"}</td>
                    <td className="px-2 py-1"><NumCell label={`Hauteur guide-roue ${h}`} value={o.grH} placeholder={fr(t.grH)} min={0.1} max={2} onChange={(x) => setHead(h, { grH: x })} /></td>
                    <td className="px-2 py-1"><NumCell label={`Largeur guide-roue ${h}`} value={o.grL} placeholder={fr(t.grL)} min={0.15} max={0.8} onChange={(x) => setHead(h, { grL: x })} /></td>
                    <td className="px-2 py-1"><NumCell label={`Épaisseur mur de tête ${h}`} value={o.murTeteEp} placeholder={fr(t.murTeteEp)} min={0.15} max={0.6} onChange={(x) => setHead(h, { murTeteEp: x })} /></td>
                    <td className="px-2 py-1"><NumCell label={`Longueur radier de tête ${h}`} value={o.radierLong} placeholder={fr(t.radierLong)} min={0} max={12} onChange={(x) => setHead(h, { radierLong: x })} /></td>
                    <td className="px-2 py-1"><NumCell label={`Profondeur bêche ${h}`} value={o.becheProf} placeholder={fr(t.becheProf)} min={0} max={3} onChange={(x) => setHead(h, { becheProf: x })} /></td>
                    <td className="px-2 py-1"><NumCell label={`Épaisseur bêche ${h}`} value={o.becheEp} placeholder={fr(t.becheEp)} min={0.15} max={0.6} onChange={(x) => setHead(h, { becheEp: x })} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Coupe de sol ───────────────────────────────────────────────

const NEW_LAYER: SoilLayer = { nom: "Couche", ep: 2, gamma: 19, methode: "elastique", E: 10, Cc: 0.25, Cr: 0.03, e0: 0.8, sigP: null };

export function LayersEditor({ api }: { api: SpecApi }) {
  const rows = parseLayers(api.spec.values.couchesSol);
  const save = (next: SoilLayer[]) => api.setValue("couchesSol", next.length ? JSON.stringify(next) : "");
  const set = (i: number, patch: Partial<SoilLayer>) => save(rows.map((r, k) => (k === i ? { ...r, ...patch } : r)));
  const [preset, setPreset] = useState("");
  return (
    <div className="space-y-2 py-2">
      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">Aucune couche : le tassement est calculé par la méthode choisie ci-dessus. Ajoutez la coupe du sondage pour un calcul couche par couche.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <th className="px-2 py-1.5">Couche</th><th className="px-2 py-1.5">Épaisseur (m)</th><th className="px-2 py-1.5">γ (kN/m³)</th>
                <th className="px-2 py-1.5">Méthode</th><th className="px-2 py-1.5">E œdo. (MPa)</th><th className="px-2 py-1.5">Cc</th><th className="px-2 py-1.5">Cr</th>
                <th className="px-2 py-1.5">e0</th><th className="px-2 py-1.5">σ&apos;p (kPa)</th><th />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r, i) => {
                const oedo = r.methode === "oedometrique";
                return (
                  <tr key={i}>
                    <td className="px-2 py-1"><input aria-label={`Nom couche ${i + 1}`} value={r.nom} onChange={(e) => set(i, { nom: e.target.value })} className="w-full min-w-[8rem] rounded border border-slate-300 px-1.5 py-1 text-sm" /></td>
                    <td className="px-2 py-1"><NumCell label={`Épaisseur couche ${i + 1}`} value={r.ep} min={0.1} max={50} onChange={(x) => set(i, { ep: x ?? r.ep })} /></td>
                    <td className="px-2 py-1"><NumCell label={`γ couche ${i + 1}`} value={r.gamma} min={10} max={24} onChange={(x) => set(i, { gamma: x ?? r.gamma })} /></td>
                    <td className="px-2 py-1">
                      <select aria-label={`Méthode couche ${i + 1}`} value={r.methode} onChange={(e) => set(i, { methode: e.target.value as SoilLayer["methode"] })} className="rounded border border-slate-300 px-1 py-1 text-xs">
                        <option value="elastique">Élastique (module)</option><option value="oedometrique">Œdométrique (Cc, Cr)</option>
                      </select>
                    </td>
                    <td className="px-2 py-1">{!oedo ? <NumCell label={`Module couche ${i + 1}`} value={r.E} min={0.5} max={2000} onChange={(x) => set(i, { E: x ?? r.E })} /> : <span className="text-xs text-slate-400">—</span>}</td>
                    <td className="px-2 py-1">{oedo ? <NumCell label={`Cc couche ${i + 1}`} value={r.Cc} min={0.005} max={3} onChange={(x) => set(i, { Cc: x ?? r.Cc })} /> : <span className="text-xs text-slate-400">—</span>}</td>
                    <td className="px-2 py-1">{oedo ? <NumCell label={`Cr couche ${i + 1}`} value={r.Cr} min={0} max={1} onChange={(x) => set(i, { Cr: x ?? r.Cr })} /> : <span className="text-xs text-slate-400">—</span>}</td>
                    <td className="px-2 py-1">{oedo ? <NumCell label={`e0 couche ${i + 1}`} value={r.e0} min={0.1} max={5} onChange={(x) => set(i, { e0: x ?? r.e0 })} /> : <span className="text-xs text-slate-400">—</span>}</td>
                    <td className="px-2 py-1">{oedo ? <NumCell label={`σ'p couche ${i + 1}`} value={r.sigP} placeholder="NC" min={1} max={5000} onChange={(x) => set(i, { sigP: x ?? null })} /> : <span className="text-xs text-slate-400">—</span>}</td>
                    <td className="px-2 py-1 text-right"><button type="button" onClick={() => save(rows.filter((_, k) => k !== i))} className="text-xs text-red-700 hover:underline">Retirer</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => save([...rows, { ...NEW_LAYER, nom: `Couche ${rows.length + 1}` }])} className={btn}>+ Ajouter une couche</button>
        <select aria-label="Insérer une couche de référence" value={preset} onChange={(e) => {
          const p = SOIL_PRESETS.find((s) => s.id === e.target.value);
          setPreset("");
          if (p) save([...rows, { ...NEW_LAYER, nom: p.label, gamma: p.gamma, E: p.Es }]);
        }} className="rounded-md border border-slate-300 px-2 py-1 text-xs">
          <option value="">Insérer une couche de référence…</option>
          {SOIL_PRESETS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        {rows.length > 0 && <span className="text-xs text-slate-500">Profondeur totale : {fr(rows.reduce((s, r) => s + r.ep, 0))} m sous le radier · σ&apos;p vide = sol normalement consolidé</span>}
      </div>
    </div>
  );
}

// ── Situations hydrauliques ────────────────────────────────────

const SITUATION_PRESETS: HydroSituation[] = [
  { nom: "Étiage — ouvrage à sec", nappe: null, eauInt: 0, type: "durable", actif: true },
  { nom: "Crue de projet — cellules en charge", nappe: null, eauInt: 0, type: "transitoire", actif: true },
  { nom: "Nappe haute, cellules vides (vidange)", nappe: 1, eauInt: 0, type: "transitoire", actif: true },
];

export function SituationsEditor({ api }: { api: SpecApi }) {
  const rows = parseSituations(api.spec.values.situationsHydro);
  const save = (next: HydroSituation[]) => api.setValue("situationsHydro", next.length ? JSON.stringify(next) : "");
  const set = (i: number, patch: Partial<HydroSituation>) => save(rows.map((r, k) => (k === i ? { ...r, ...patch } : r)));
  const Hint = (Number(api.spec.values.hInt) || 0);
  return (
    <div className="space-y-2 py-2">
      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">Aucune situation déclarée : seule la nappe éventuelle ci-dessus est prise en compte. Ajoutez les situations à justifier (étiage, crue, vidange…) : flottaison et portance sont alors vérifiées pour chacune.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr><th className="px-2 py-1.5">Situation</th><th className="px-2 py-1.5">Nappe extérieure (m)</th><th className="px-2 py-1.5">Eau dans les cellules (m)</th><th className="px-2 py-1.5">Statut</th><th className="px-2 py-1.5">Prise en compte</th><th /></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r, i) => (
                <tr key={i} className={r.actif ? "" : "text-slate-400"}>
                  <td className="px-2 py-1"><input aria-label={`Nom situation ${i + 1}`} value={r.nom} onChange={(e) => set(i, { nom: e.target.value })} className="w-full min-w-[12rem] rounded border border-slate-300 px-1.5 py-1 text-sm" /></td>
                  <td className="px-2 py-1"><NumCell label={`Nappe situation ${i + 1}`} value={r.nappe} placeholder="sans" min={0} max={30} onChange={(x) => set(i, { nappe: x ?? null })} /></td>
                  <td className="px-2 py-1"><NumCell label={`Eau intérieure situation ${i + 1}`} value={r.eauInt} min={0} max={Hint + 5} onChange={(x) => set(i, { eauInt: x ?? 0 })} /></td>
                  <td className="px-2 py-1">
                    <select aria-label={`Statut situation ${i + 1}`} value={r.type} onChange={(e) => set(i, { type: e.target.value as HydroSituation["type"] })} className="rounded border border-slate-300 px-1 py-1 text-xs">
                      <option value="durable">Durable</option><option value="transitoire">Transitoire</option><option value="accidentelle">Accidentelle</option>
                    </select>
                  </td>
                  <td className="px-2 py-1"><input type="checkbox" aria-label={`Prise en compte situation ${i + 1}`} checked={r.actif} onChange={(e) => set(i, { actif: e.target.checked })} className="h-4 w-4 accent-blue-700" /></td>
                  <td className="px-2 py-1 text-right"><button type="button" onClick={() => save(rows.filter((_, k) => k !== i))} className="text-xs text-red-700 hover:underline">Retirer</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => save([...rows, { nom: `Situation ${rows.length + 1}`, nappe: null, eauInt: 0, type: "durable", actif: true }])} className={btn}>+ Ajouter une ligne</button>
        {rows.length === 0 && (
          <button type="button" onClick={() => save(SITUATION_PRESETS.map((s) => (s.nom.startsWith("Crue") ? { ...s, eauInt: Math.round(Hint * 0.75 * 100) / 100, nappe: Math.round((Hint * 0.75 + (Number(api.spec.values.er) || 0.3)) * 100) / 100 } : s)))} className={btn}>
            Ajouter les situations types (étiage, crue, vidange)
          </button>
        )}
      </div>
    </div>
  );
}

/** Éditeur d'un champ « json » selon sa clé. */
export function JsonField({ f, api }: { f: FieldDef; api: SpecApi }) {
  return (
    <div className="py-2">
      {f.help && <p className="mb-1 text-xs text-slate-500">{f.help}</p>}
      {f.key === "annexes" ? <AnnexesEditor api={api} /> : f.key === "couchesSol" ? <LayersEditor api={api} /> : f.key === "situationsHydro" ? <SituationsEditor api={api} /> : null}
    </div>
  );
}
