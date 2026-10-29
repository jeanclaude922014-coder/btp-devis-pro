"use client";

import { useMemo, useState } from "react";
import { DIAMETERS, SPACINGS } from "@/lib/dalot/ba";
import { checksToCsv, countByStatus, DOMAINS, ratio, STATUS_LABELS, type CheckStatus } from "@/lib/dalot/checks";
import type { GroupId } from "@/lib/dalot/design";
import { convoyFigure, envelopeSvg, passageSvg, type Quantity } from "@/lib/dalot/diagrams";
import { buildSheets } from "@/lib/dalot/drawings";
import { renderSceneImage } from "@/lib/dalot/scene3d";
import { headDimensions } from "@/lib/dalot/head-dims";
import { studyToXlsx } from "@/lib/dalot/excel";
import { sheetsToDxf } from "@/lib/dalot/dxf";
import type { Study } from "@/lib/dalot/engine";
import { buildNoteDocx, type NoteKind, type NoteImages } from "@/lib/dalot/note-docx";
import { barsToCsv } from "@/lib/dalot/quantities";
import { sheetToSvg } from "@/lib/dalot/svg";
import { downloadBlob, downloadText, slug, svgToPng } from "./download";
import { FixOptions, FixToolbar, type FixApi } from "./fix-panel";

const fr = (x: number | undefined, d = 2) =>
  x === undefined || !Number.isFinite(x) ? "—" : x.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });

export const STATUS_CLS: Record<CheckStatus, string> = {
  conforme: "bg-green-100 text-green-700",
  non_conforme: "bg-red-100 text-red-700",
  non_verifie: "bg-amber-100 text-amber-800",
  non_applicable: "bg-slate-100 text-slate-600",
};

export function StatusBadge({ status, big }: { status: CheckStatus; big?: boolean }) {
  return <span className={`rounded-full font-medium ${big ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-xs"} ${STATUS_CLS[status]}`}>{STATUS_LABELS[status]}</span>;
}

function Card({ title, children, actions }: { title: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
        {actions}
      </div>
      {children}
    </section>
  );
}

const btn = "rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50";
const btnPrimary = "rounded-md bg-blue-800 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-900 disabled:opacity-50";

// ── Synthèse ───────────────────────────────────────────────

export function SynthesePanel({ study, onNav }: { study: Study; onNav: (id: string) => void }) {
  const counts = countByStatus(study.checks);
  const inp = study.input;
  const g = study.geo;
  const nc = study.checks.filter((c) => c.status === "non_conforme");
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <div className="col-span-2 rounded-xl border border-slate-200 bg-white p-4 lg:col-span-1">
          <div className="text-xs text-slate-500">Résultat global</div>
          <div className={`mt-1 text-2xl font-bold ${study.status === "conforme" ? "text-green-600" : study.status === "non_conforme" ? "text-red-600" : "text-amber-600"}`}>
            {STATUS_LABELS[study.status]}
          </div>
          <div className="text-xs text-slate-500">{study.checks.length} vérifications · {fr(study.durationMs, 0)} ms</div>
        </div>
        {(["conforme", "non_conforme", "non_verifie", "non_applicable"] as CheckStatus[]).map((s) => (
          <button key={s} onClick={() => onNav("verifications")} className="rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-blue-300">
            <div className="text-xs text-slate-500">{STATUS_LABELS[s]}</div>
            <div className={`mt-1 text-2xl font-bold ${s === "conforme" ? "text-green-600" : s === "non_conforme" ? "text-red-600" : s === "non_verifie" ? "text-amber-600" : "text-slate-500"}`}>{counts[s]}</div>
          </button>
        ))}
      </div>
      {nc.length > 0 && (
        <Card title="Points à traiter">
          <ul className="space-y-1 text-sm">
            {nc.slice(0, 12).map((c) => (
              <li key={c.id} className="text-red-700">✗ <span className="font-medium">{c.element}</span> — {c.label} : {fr(c.value, 3)} pour {fr(c.limit, 3)} {c.unit}{c.detail ? ` (${c.detail})` : ""}</li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button onClick={() => onNav("verifications")} className="rounded-md bg-orange-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-orange-700">Corriger les non-conformités</button>
            <span className="text-xs text-slate-500">ou « Optimiser » dans l&apos;écran Dimensionnement pour les épaisseurs du corps.</span>
          </div>
        </Card>
      )}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Ouvrage">
          <dl className="grid grid-cols-2 gap-y-1 text-sm">
            <dt className="text-slate-500">Cellules</dt><dd className="text-right">{inp.openings.length} × {inp.openings.map((o) => fr(o)).join(" / ")} × {fr(inp.hInt)} m</dd>
            <dt className="text-slate-500">Épaisseurs</dt><dd className="text-right">dalle {fr(inp.es)} / radier {fr(inp.er)} / piédroits {fr(inp.eExt)}</dd>
            <dt className="text-slate-500">Longueur</dt><dd className="text-right">{fr(inp.L)} m</dd>
            <dt className="text-slate-500">Remblai</dt><dd className="text-right">{fr(inp.hr)} m + chaussée {fr(inp.ech)} m</dd>
            <dt className="text-slate-500">Classe du pont</dt><dd className="text-right">{study.analysis.ctx.classe} ({study.analysis.ctx.nv} voies)</dd>
            <dt className="text-slate-500">Convois</dt><dd className="text-right">{study.analysis.traffic.map((t) => t.def.label).join(", ") || "aucun"}</dd>
          </dl>
        </Card>
        <Card title="Résultats clés">
          <dl className="grid grid-cols-2 gap-y-1 text-sm">
            {study.hydro && (<><dt className="text-slate-500">Qp / tirant d&apos;eau</dt><dd className="text-right">{fr(study.hydro.Qp)} m³/s / {fr(study.hydro.h)} m</dd></>)}
            <dt className="text-slate-500">Pression sol ELS max</dt><dd className="text-right">{fr(g.pMaxELS, 1)} kPa</dd>
            <dt className="text-slate-500">qref ELS / qu</dt><dd className="text-right">{fr(g.qrefELS, 0)} / {fr(g.qu, 0)} kPa</dd>
            <dt className="text-slate-500">Tassement</dt><dd className="text-right">{fr(g.settlement)} cm</dd>
            {g.slope && (<><dt className="text-slate-500">Talus (Fellenius)</dt><dd className="text-right">FS = {fr(g.slope.FS)}</dd></>)}
            <dt className="text-slate-500">Combinaisons</dt><dd className="text-right">{study.analysis.combos.length}</dd>
          </dl>
        </Card>
        <Card title="Quantités">
          <dl className="grid grid-cols-2 gap-y-1 text-sm">
            <dt className="text-slate-500">Béton armé</dt><dd className="text-right">{fr(study.quantities.concrete)} m³</dd>
            <dt className="text-slate-500">Acier HA</dt><dd className="text-right">{fr(study.quantities.steelMass, 0)} kg</dd>
            <dt className="text-slate-500">Ratio</dt><dd className="text-right">{fr(study.quantities.ratio, 0)} kg/m³</dd>
            <dt className="text-slate-500">Empreinte</dt><dd className="text-right font-mono text-xs">{study.fingerprint}</dd>
          </dl>
        </Card>
      </div>
      <Card title="Ferraillage retenu">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-slate-100">
            {study.design.groups.map((g) => (
              <tr key={g.id}><td className="py-1.5 text-slate-600">{g.label}</td><td className="py-1.5 text-right font-medium">HA{g.bars.phi} e = {fr(g.bars.s * 100, 1)} cm</td><td className="py-1.5 text-right text-slate-500">rép. HA{g.rep.phi} e = {fr(g.rep.s * 100, 1)}</td></tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ── Combinaisons ───────────────────────────────────────────

export function CombosPanel({ study }: { study: Study }) {
  const [state, setState] = useState<"ELU" | "ELS" | "EC2">("ELU");
  const t = study.analysis.traffic;
  const swept = t.filter((x) => x.positions.length);
  const [cv, setCv] = useState<string>(swept[0]?.def.id ?? "");
  const fig = useMemo(() => (cv ? convoyFigure(study, cv) : null), [study, cv]);
  return (
    <div className="space-y-4">
      {swept.length > 0 && (
        <Card title="Schéma coté du convoi à sa position défavorable" actions={
          <select value={cv} onChange={(e) => setCv(e.target.value)} className="rounded-md border border-slate-300 px-2 py-1 text-sm">
            {swept.map((x) => <option key={x.def.id} value={x.def.id}>{x.def.label}</option>)}
          </select>
        }>
          {fig ? <div className="mx-auto max-w-4xl" dangerouslySetInnerHTML={{ __html: fig }} /> : <p className="text-sm text-slate-500">Pas de position calculée pour ce convoi.</p>}
        </Card>
      )}
      <Card title="Convois et majoration dynamique">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500"><tr><th className="px-2 py-1.5">Convoi</th><th className="px-2 py-1.5">Description</th><th className="px-2 py-1.5 text-right">δ</th><th className="px-2 py-1.5 text-right">γ ELU</th><th className="px-2 py-1.5 text-right">γ ELS</th><th className="px-2 py-1.5 text-right">Positions</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {t.map((x) => (
                <tr key={x.def.id}><td className="px-2 py-1.5 font-medium">{x.def.label}</td><td className="px-2 py-1.5 text-slate-600">{x.def.description} {x.info}</td><td className="px-2 py-1.5 text-right">{fr(x.delta, 3)}</td><td className="px-2 py-1.5 text-right">{fr(x.def.gammaU, 3)}</td><td className="px-2 py-1.5 text-right">{fr(x.def.gammaS)}</td><td className="px-2 py-1.5 text-right">{x.positions.length || "lignes d'infl."}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-500">Diffusion jusqu&apos;au plan moyen de la dalle : d = {fr(study.analysis.D, 3)} m. Classe {study.analysis.ctx.classe}, a1 = {fr(study.analysis.ctx.a1)}, a2 = {fr(study.analysis.ctx.a2, 3)}.</p>
      </Card>
      <Card title="Combinaisons d'actions" actions={
        <div className="flex gap-1">{(["ELU", "ELS", "EC2"] as const).map((s) => <button key={s} onClick={() => setState(s)} className={`rounded px-2 py-1 text-xs font-medium ${state === s ? "bg-blue-800 text-white" : "bg-slate-100 text-slate-600"}`}>{s === "EC2" ? "Contrôle EC2" : s}</button>)}</div>
      }>
        <table className="w-full text-sm">
          <tbody className="divide-y divide-slate-100">
            {study.analysis.combos.filter((c) => c.state === state).map((c) => (
              <tr key={c.id}><td className="w-24 py-1.5 font-mono text-xs text-slate-500">{c.id}</td><td className="py-1.5">{c.label}</td></tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ── Sollicitations ─────────────────────────────────────────

export function EffortsPanel({ study }: { study: Study }) {
  const [q, setQ] = useState<Quantity>("M");
  const [state, setState] = useState<"elu" | "els" | "ec2">("elu");
  const an = study.analysis;
  const env = an[state];
  const svg = useMemo(() => envelopeSvg(an, env, q), [an, env, q]);
  const [sg, setSg] = useState<1 | -1>(1);
  const passage = useMemo(() => passageSvg(study, sg), [study, sg]);
  const ns = an.quantities.ns;
  const off = q === "M" ? 0 : q === "V" ? ns : 2 * ns;
  return (
    <div className="space-y-4">
      <Card title="Diagrammes d'efforts (enveloppes)" actions={
        <div className="flex flex-wrap gap-2">
          <div className="flex gap-1">{(["M", "V", "N"] as Quantity[]).map((x) => <button key={x} onClick={() => setQ(x)} className={`rounded px-2 py-1 text-xs font-medium ${q === x ? "bg-blue-800 text-white" : "bg-slate-100 text-slate-600"}`}>{x === "M" ? "Moments" : x === "V" ? "Tranchants" : "Efforts normaux"}</button>)}</div>
          <div className="flex gap-1">{(["elu", "els", "ec2"] as const).map((x) => <button key={x} onClick={() => setState(x)} className={`rounded px-2 py-1 text-xs font-medium ${state === x ? "bg-orange-600 text-white" : "bg-slate-100 text-slate-600"}`}>{x === "ec2" ? "EC2" : x.toUpperCase()}</button>)}</div>
        </div>
      }>
        <div className="mx-auto max-w-3xl" dangerouslySetInnerHTML={{ __html: svg }} />
      </Card>
      {passage && (
        <Card title="Simulation du passage des convois → enveloppe exacte" actions={
          <div className="flex gap-1">{([[1, "Travée (M+)"], [-1, "Appui (M−)"]] as const).map(([v, l]) => (
            <button key={v} onClick={() => setSg(v)} className={`rounded px-2 py-1 text-xs font-medium ${sg === v ? "bg-blue-800 text-white" : "bg-slate-100 text-slate-600"}`}>{l}</button>
          ))}</div>
        }>
          <div className="mx-auto max-w-4xl" dangerouslySetInnerHTML={{ __html: passage }} />
          <p className="mt-2 text-xs text-slate-500">
            Chaque convoi est promené sur la dalle au pas de calcul, dans les deux sens et dans toutes ses configurations ; la courbe donne le moment caractéristique (δ inclus) au point le plus sollicité.
            Le point noir est l&apos;extremum retenu dans l&apos;enveloppe.
          </p>
        </Card>
      )}
      <Card title="Valeurs extrêmes par barre">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500"><tr><th className="px-2 py-1.5">Barre</th><th className="px-2 py-1.5 text-right">max</th><th className="px-2 py-1.5">comb.</th><th className="px-2 py-1.5 text-right">min</th><th className="px-2 py-1.5">comb.</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {an.model.members.map((m) => {
                let kM = 0, km = 0;
                m.nodes.forEach((_, k) => {
                  if (env.max[off + m.station0 + k] > env.max[off + m.station0 + kM]) kM = k;
                  if (env.min[off + m.station0 + k] < env.min[off + m.station0 + km]) km = k;
                });
                return (
                  <tr key={m.id}>
                    <td className="px-2 py-1.5">{m.label}</td>
                    <td className="px-2 py-1.5 text-right font-medium">{fr(env.max[off + m.station0 + kM], 1)}</td>
                    <td className="px-2 py-1.5 text-xs text-slate-500">{an.combos[env.cMax[off + m.station0 + kM]]?.id} · x = {fr(m.s[kM])} m</td>
                    <td className="px-2 py-1.5 text-right font-medium">{fr(env.min[off + m.station0 + km], 1)}</td>
                    <td className="px-2 py-1.5 text-xs text-slate-500">{an.combos[env.cMin[off + m.station0 + km]]?.id} · x = {fr(m.s[km])} m</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-500">Unités : kN·m/m ou kN/m. M &gt; 0 tend la face inférieure de la dalle et du radier, et la face droite des piédroits. x : abscisse depuis l&apos;origine de la barre (gauche ou bas).</p>
      </Card>
    </div>
  );
}

// ── Dimensionnement ────────────────────────────────────────

export function DesignPanel({
  study, imposed, onImpose, onOptimize, optimizing, proposal, onApply,
}: {
  study: Study;
  imposed: Record<string, { phi: number; s: number } | undefined>;
  onImpose: (g: GroupId, v: { phi: number; s: number } | undefined) => void;
  onOptimize: () => void;
  optimizing: boolean;
  proposal: { proposal: { key: string; label: string; from: number; to: number }[]; status: CheckStatus } | null;
  onApply: () => void;
}) {
  const mat = study.design.mat;
  return (
    <div className="space-y-4">
      <Card title="Épaisseurs" actions={<button onClick={onOptimize} disabled={optimizing} className={btnPrimary}>{optimizing ? "Optimisation en cours…" : "Optimiser"}</button>}>
        <p className="text-sm text-slate-600">
          « Optimiser » épaissit les éléments dont une vérification échoue, puis amincit pas à pas (5 cm, minimum 20 cm) tant que tout reste conforme.
        </p>
        {proposal && (
          <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm">
            {proposal.proposal.length === 0 ? (
              <p>Les épaisseurs actuelles sont déjà optimales sur la grille de 5 cm (statut : {STATUS_LABELS[proposal.status]}).</p>
            ) : (
              <>
                <ul className="mb-2 space-y-0.5">{proposal.proposal.map((p) => <li key={p.key}>{p.label} : {fr(p.from)} → <span className="font-semibold">{fr(p.to)} m</span></li>)}</ul>
                <div className="flex items-center gap-3">
                  <button onClick={onApply} className={btnPrimary}>Appliquer la proposition</button>
                  <span className="text-xs text-slate-600">Statut après application : <StatusBadge status={proposal.status} /></span>
                </div>
              </>
            )}
          </div>
        )}
      </Card>
      <Card title="Ferraillage face par face (BAEL 91 mod. 99)" actions={
        <div className="flex flex-wrap gap-2">
          <button onClick={() => study.design.groups.forEach((g) => onImpose(g.id, { phi: g.bars.phi, s: g.bars.s }))} className={btn}>Imposer partout la disposition calculée</button>
          <button onClick={() => study.design.groups.forEach((g) => onImpose(g.id, undefined))} disabled={!study.design.groups.some((g) => imposed[g.id])} className={btn}>Tout remettre au choix automatique</button>
        </div>
      }>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <th className="px-2 py-1.5">Nappe</th><th className="px-2 py-1.5 text-right">Mu</th><th className="px-2 py-1.5 text-right">Ms</th>
                <th className="px-2 py-1.5 text-right">As ELU</th><th className="px-2 py-1.5 text-right">As ELS</th><th className="px-2 py-1.5 text-right">As min</th>
                <th className="px-2 py-1.5 text-right">As req.</th><th className="px-2 py-1.5">Mode</th><th className="px-2 py-1.5">Armatures</th><th className="px-2 py-1.5 text-right">σs</th><th className="px-2 py-1.5 text-right">wk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {study.design.groups.map((g) => {
                const imp = imposed[g.id];
                return (
                  <tr key={g.id} className={g.bars.As * 1e4 < g.AsReq - 1e-6 ? "bg-red-50" : ""}>
                    <td className="px-2 py-1.5">
                      <div>{g.label}</div>
                      <div className="text-[11px] text-slate-400">h = {fr(g.h)} m, d = {fr(g.d, 3)} m · {g.comboU} / {g.comboS}</div>
                    </td>
                    <td className="px-2 py-1.5 text-right">{fr(g.Mu, 1)}</td>
                    <td className="px-2 py-1.5 text-right">{fr(g.Ms, 1)}</td>
                    <td className="px-2 py-1.5 text-right">{fr(g.AsELU)}</td>
                    <td className="px-2 py-1.5 text-right">{fr(g.AsELS)}</td>
                    <td className="px-2 py-1.5 text-right">{fr(g.AsMin)}</td>
                    <td className="px-2 py-1.5 text-right font-medium">{fr(g.AsReq)}</td>
                    <td className="px-2 py-1.5">
                      <select value={imp ? "impose" : "auto"} onChange={(e) => onImpose(g.id, e.target.value === "impose" ? { phi: g.bars.phi, s: g.bars.s } : undefined)}
                        className={`rounded border px-1 py-0.5 text-xs ${imp ? "border-amber-400 bg-amber-50" : "border-slate-300"}`}>
                        <option value="auto">Automatique</option><option value="impose">Imposé</option>
                      </select>
                    </td>
                    <td className="px-2 py-1.5">
                      <div className="flex items-center gap-1">
                        <select value={imp?.phi ?? g.bars.phi} onChange={(e) => onImpose(g.id, { phi: Number(e.target.value), s: imp?.s ?? g.bars.s })} className="rounded border border-slate-300 px-1 py-0.5 text-xs">
                          {DIAMETERS.map((d) => <option key={d} value={d}>HA{d}</option>)}
                        </select>
                        <select value={imp?.s ?? g.bars.s} onChange={(e) => onImpose(g.id, { phi: imp?.phi ?? g.bars.phi, s: Number(e.target.value) })} className="rounded border border-slate-300 px-1 py-0.5 text-xs">
                          {SPACINGS.map((s) => <option key={s} value={s}>e = {fr(s * 100, 1)}</option>)}
                        </select>
                        {imp ? <button onClick={() => onImpose(g.id, undefined)} className="text-[11px] text-blue-700 hover:underline">auto</button> : <span className="text-[11px] text-slate-400">auto</span>}
                      </div>
                      <div className="text-[11px] text-slate-500">{fr(g.bars.As * 1e4)} cm²/m · rép. HA{g.rep.phi} e = {fr(g.rep.s * 100, 1)}</div>
                    </td>
                    <td className="px-2 py-1.5 text-right">{fr(g.sigmaS, 0)}</td>
                    <td className="px-2 py-1.5 text-right">{fr(g.wk, 3)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Moments en kN·m/m, sections en cm²/m, σs en MPa (limite {fr(mat.sigmaS, 1)} MPa), wk en mm. En mode « Imposé », la nappe garde exactement les barres choisies :
          le logiciel ne la renforce pas, il la revérifie (ELU, ELS, armature minimale, espacements, ouverture des fissures) et signale les écarts. Scellement droit ls = {mat.ls} Ø.
        </p>
      </Card>
      <Card title="Effort tranchant">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500"><tr><th className="px-2 py-1.5">Barre</th><th className="px-2 py-1.5 text-right">Vu au nu</th><th className="px-2 py-1.5 text-right">τu (MPa)</th><th className="px-2 py-1.5 text-right">τlim</th><th className="px-2 py-1.5 text-right">VEd EC2 à d</th><th className="px-2 py-1.5 text-right">VRd,c</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {study.design.shear.map((s) => (
              <tr key={s.member}>
                <td className="px-2 py-1.5">{s.member}</td><td className="px-2 py-1.5 text-right">{fr(s.VuFace, 1)}</td>
                <td className={`px-2 py-1.5 text-right ${s.tau > mat.tauLim ? "font-semibold text-red-600" : ""}`}>{fr(s.tau, 3)}</td><td className="px-2 py-1.5 text-right">{fr(mat.tauLim, 3)}</td>
                <td className={`px-2 py-1.5 text-right ${s.VEd > s.VRdc ? "font-semibold text-red-600" : ""}`}>{fr(s.VEd, 1)}</td><td className="px-2 py-1.5 text-right">{fr(s.VRdc, 1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ── Vérifications ──────────────────────────────────────────

export function ChecksPanel({ study, fix }: { study: Study; fix?: FixApi }) {
  const [status, setStatus] = useState<CheckStatus | "all">("all");
  const [domain, setDomain] = useState<string>("all");
  const [q, setQ] = useState("");
  const counts = countByStatus(study.checks);
  const list = study.checks.filter((c) => (status === "all" || c.status === status) && (domain === "all" || c.domain === domain)
    && (!q || `${c.id} ${c.element} ${c.label} ${c.ref}`.toLowerCase().includes(q.toLowerCase())));
  return (
    <div className="space-y-4">
      {fix && <FixToolbar fix={fix} nonConformes={counts.non_conforme} />}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <div className="col-span-2 rounded-xl border border-slate-200 bg-white p-4 lg:col-span-1">
          <div className="text-xs text-slate-500">Résultat global</div>
          <div className={`text-2xl font-bold ${study.status === "conforme" ? "text-green-600" : study.status === "non_conforme" ? "text-red-600" : "text-amber-600"}`}>{STATUS_LABELS[study.status]}</div>
        </div>
        {(["conforme", "non_conforme", "non_verifie", "non_applicable"] as CheckStatus[]).map((s) => (
          <button key={s} onClick={() => setStatus(status === s ? "all" : s)} className={`rounded-xl border bg-white p-4 text-left ${status === s ? "border-blue-500 ring-1 ring-blue-500" : "border-slate-200"}`}>
            <div className="text-xs text-slate-500">{STATUS_LABELS[s]}</div><div className="text-2xl font-bold text-slate-800">{counts[s]}</div>
          </button>
        ))}
      </div>
      <Card title="Synthèse par domaine">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-slate-500"><tr><th className="py-1">Domaine</th><th className="py-1">Statut</th><th className="py-1">Commentaire</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {DOMAINS.map((d) => {
              const cs = study.checks.filter((c) => c.domain === d);
              if (!cs.length) return null;
              const k = countByStatus(cs);
              const st: CheckStatus = k.non_conforme ? "non_conforme" : k.non_verifie ? "non_verifie" : "conforme";
              return (
                <tr key={d} className="cursor-pointer hover:bg-slate-50" onClick={() => setDomain(domain === d ? "all" : d)}>
                  <td className="py-1.5">{d}</td><td className="py-1.5"><StatusBadge status={st} /></td>
                  <td className="py-1.5 text-xs text-slate-500">{k.conforme} conforme(s){k.non_conforme ? `, ${k.non_conforme} non conforme(s)` : ""}{k.non_verifie ? `, ${k.non_verifie} non vérifiée(s)` : ""}{k.non_applicable ? `, ${k.non_applicable} non applicable(s)` : ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
      <Card title={`Liste des vérifications — ${list.length} affichée(s) sur ${study.checks.length}`} actions={
        <div className="flex flex-wrap items-center gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher une vérification…" className="rounded-md border border-slate-300 px-2 py-1 text-sm" />
          <select value={domain} onChange={(e) => setDomain(e.target.value)} className="rounded-md border border-slate-300 px-2 py-1 text-sm">
            <option value="all">Tous les domaines</option>{DOMAINS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <button onClick={() => downloadText(checksToCsv(study.checks), `verifications_${slug(study.input.ident.projet)}.csv`, "text/csv;charset=utf-8")} className={btn}>Exporter CSV</button>
        </div>
      }>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500"><tr><th className="px-2 py-1.5">Statut</th><th className="px-2 py-1.5">Élément</th><th className="px-2 py-1.5">Vérification</th><th className="px-2 py-1.5 text-right">Valeur</th><th className="px-2 py-1.5 text-right">Limite</th><th className="px-2 py-1.5 text-right">Taux</th><th className="px-2 py-1.5">Référence</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {list.map((c) => {
                const r = ratio(c);
                return (
                  <tr key={c.id} className="align-top">
                    <td className="px-2 py-1.5"><StatusBadge status={c.status} /></td>
                    <td className="px-2 py-1.5 text-xs">{c.element}</td>
                    <td className="px-2 py-1.5">
                      <div className="font-mono text-[10px] text-slate-400">{c.id}</div>{c.label}{c.combo && <span className="ml-1 font-mono text-[11px] text-slate-400">[{c.combo}]</span>}{c.detail && <div className="text-xs text-slate-500">{c.detail}</div>}
                      {fix && (c.status === "non_conforme" || c.status === "non_verifie") && <FixOptions key={`${c.id}-${study.fingerprint}`} fix={fix} check={c} />}
                    </td>
                    <td className="px-2 py-1.5 text-right">{c.value !== undefined ? `${fr(c.value, 3)}` : "—"}</td>
                    <td className="px-2 py-1.5 text-right">{c.limit !== undefined ? `${fr(c.limit, 3)} ${c.unit ?? ""}` : "—"}</td>
                    <td className="px-2 py-1.5 text-right">
                      {r !== undefined && (
                        <div className="ml-auto h-1.5 w-16 overflow-hidden rounded bg-slate-100" title={`${fr(r * 100, 0)} %`}>
                          <div className={`h-full ${r > 1 ? "bg-red-500" : r > 0.9 ? "bg-amber-500" : "bg-green-500"}`} style={{ width: `${Math.min(100, r * 100)}%` }} />
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-xs text-slate-500">{c.ref}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ── Ouvrages de tête ───────────────────────────────────────

export function HeadsPanel({ study }: { study: Study }) {
  const w = study.heads.wing, hw = study.heads.headWall;
  const dm = headDimensions(study.input);
  const t = study.input.tetes;
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card title="Dimensions des ouvrages de tête">
        <dl className="grid grid-cols-2 gap-y-1 text-sm">
          <dt className="text-slate-500">Ailes : longueur / épaisseur / angle</dt><dd className="text-right">{t.murs ? `${fr(t.long)} / ${fr(t.ep)} m / ${fr(t.angle, 1)}°` : "sans"}</dd>
          <dt className="text-slate-500">Hauteur des ailes racine / extrémité</dt><dd className="text-right">{t.murs ? `${fr(dm.Htot)} / ${fr(dm.Hend)} m` : "—"}</dd>
          <dt className="text-slate-500">Projection le long de l&apos;axe / en travers</dt><dd className="text-right">{fr(dm.along)} / {fr(dm.across)} m</dd>
          <dt className="text-slate-500">Radier de tête : longueur</dt><dd className="text-right">{fr(t.radierLong)} m</dd>
          <dt className="text-slate-500">Petite base / grande base</dt><dd className="text-right font-semibold">{fr(dm.pb)} / {fr(dm.gb)} m</dd>
          <dt className="text-slate-500">Surface d&apos;un radier de tête</dt><dd className="text-right">{fr(dm.surfaceRadier)} m²</dd>
          <dt className="text-slate-500">Longueur d&apos;aile recommandée (talus {fr(dm.m, 1)}/1)</dt><dd className="text-right">{t.murs ? `${fr(dm.longRec)} m` : "—"}</dd>
          <dt className="text-slate-500">Emprise totale (long × larg)</dt><dd className="text-right">{fr(dm.emprise.long)} × {fr(dm.emprise.larg)} m</dd>
        </dl>
      </Card>
      <Card title="Mur de tête">
        <dl className="grid grid-cols-2 gap-y-1 text-sm">
          <dt className="text-slate-500">Hauteur retenue / épaisseur</dt><dd className="text-right">{fr(hw.H)} / {fr(hw.e)} m</dd>
          <dt className="text-slate-500">Ka (Rankine)</dt><dd className="text-right">{fr(hw.Ka, 3)}</dd>
          <dt className="text-slate-500">Mu / Ms à l&apos;encastrement</dt><dd className="text-right">{fr(hw.M, 1)} / {fr(hw.Ms, 1)} kN·m/m</dd>
          <dt className="text-slate-500">Armatures</dt><dd className="text-right font-medium">HA{hw.bars.phi} e = {fr(hw.bars.s * 100, 1)} cm</dd>
        </dl>
      </Card>
      {w ? (
        <Card title="Murs en aile">
          <dl className="grid grid-cols-2 gap-y-1 text-sm">
            <dt className="text-slate-500">Hauteur enracinement / extrémité</dt><dd className="text-right">{fr(w.Htot)} / {fr(w.Hend)} m</dd>
            <dt className="text-slate-500">Semelle B</dt><dd className="text-right">{fr(w.B)} m</dd>
            <dt className="text-slate-500">Renversement</dt><dd className={`text-right font-medium ${w.FSr < 1.5 ? "text-red-600" : "text-green-700"}`}>FS = {fr(w.FSr)}</dd>
            <dt className="text-slate-500">Glissement</dt><dd className={`text-right font-medium ${w.FSg < 1.5 ? "text-red-600" : "text-green-700"}`}>FS = {fr(w.FSg)}</dd>
            <dt className="text-slate-500">Excentricité</dt><dd className="text-right">{fr(Math.abs(w.e0))} m (B/6 = {fr(w.B / 6)})</dd>
            <dt className="text-slate-500">σmax / admissible</dt><dd className="text-right">{fr(w.sigmaMax, 0)} / {fr(w.qAllow, 0)} kPa</dd>
            <dt className="text-slate-500">Voile</dt><dd className="text-right font-medium">HA{w.bars.phi} e = {fr(w.bars.s * 100, 1)} cm</dd>
            <dt className="text-slate-500">Semelle</dt><dd className="text-right font-medium">HA{w.footBars.phi} e = {fr(w.footBars.s * 100, 1)} cm</dd>
          </dl>
          <p className="mt-2 text-xs text-slate-500">En cas de glissement insuffisant : approfondir la bêche sous semelle, élargir le talon ou fonder les murs sur le radier de tête.</p>
        </Card>
      ) : <Card title="Murs en aile"><p className="text-sm text-slate-500">Pas de murs en aile.</p></Card>}
      <div className="lg:col-span-2"><ChecksPanelMini study={study} domain="Ouvrages de tête" /></div>
    </div>
  );
}

function ChecksPanelMini({ study, domain }: { study: Study; domain: string }) {
  return (
    <Card title="Vérifications des ouvrages de tête">
      <ul className="divide-y divide-slate-100 text-sm">
        {study.checks.filter((c) => c.domain === domain).map((c) => (
          <li key={c.id} className="flex items-start gap-2 py-1.5"><StatusBadge status={c.status} /><span>{c.element} — {c.label}{c.value !== undefined && ` : ${fr(c.value, 2)} / ${fr(c.limit, 2)} ${c.unit ?? ""}`}{c.detail && <span className="block text-xs text-slate-500">{c.detail}</span>}</span></li>
        ))}
      </ul>
    </Card>
  );
}

// ── Plans DXF ──────────────────────────────────────────────

export function PlansPanel({ study }: { study: Study }) {
  const sheets = useMemo(() => buildSheets(study), [study]);
  const [sel, setSel] = useState(0);
  const svg = useMemo(() => sheetToSvg(sheets[sel], { background: "#ffffff" }), [sheets, sel]);
  return (
    <Card title="Dossier d'exécution (DXF AutoCAD, planches A3)" actions={
      <div className="flex gap-2">
        <button onClick={() => downloadText(sheetsToDxf(sheets), `plans_${slug(study.input.ident.projet)}.dxf`, "application/dxf")} className={btnPrimary}>Télécharger le DXF</button>
        <button onClick={() => downloadText(sheetToSvg(sheets[sel], { background: "#ffffff" }), `planche_${sel + 1}_${slug(study.input.ident.projet)}.svg`, "image/svg+xml")} className={btn}>Planche en SVG</button>
      </div>
    }>
      <div className="mb-3 flex flex-wrap gap-1">
        {sheets.map((s, i) => <button key={s.id} onClick={() => setSel(i)} className={`rounded px-2 py-1 text-xs font-medium ${sel === i ? "bg-blue-800 text-white" : "bg-slate-100 text-slate-600"}`}>{i + 1}. {s.title} ({s.scaleLabel ?? `1/${s.scale}`})</button>)}
      </div>
      <div className="overflow-hidden rounded border border-slate-200 bg-white" dangerouslySetInnerHTML={{ __html: svg }} />
      <p className="mt-2 text-xs text-slate-500">
        Le DXF (format R12, compatible AutoCAD, BricsCAD, ZWCAD, LibreCAD) contient les {sheets.length} planches côte à côte dans l&apos;espace objet, en vraie grandeur (m), sur calques
        COFFRAGE, ACIERS, REPARTITION, COTATION, AXES, TERRAIN, TEXTE et CADRE, avec cartouche renseigné.
      </p>
    </Card>
  );
}

// ── Nomenclature et métré ──────────────────────────────────

export function QuantitiesPanel({ study, projects, onQuote, quoting }: {
  study: Study; projects: { id: string; name: string }[]; onQuote?: (projectId: string) => void; quoting: boolean;
}) {
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const q = study.quantities;
  return (
    <div className="space-y-4">
      <ExcelCard study={study} />
      <Card title="Métré" actions={
        !onQuote ? undefined : projects.length > 0 ? (
          <div className="flex items-center gap-2">
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="rounded-md border border-slate-300 px-2 py-1 text-sm">
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <button onClick={() => onQuote(projectId)} disabled={quoting || !projectId} className={btnPrimary}>{quoting ? "Création…" : "Créer le devis (DQE)"}</button>
          </div>
        ) : <span className="text-xs text-slate-500">Créez un projet pour transformer ce métré en devis.</span>
      }>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500"><tr><th className="px-2 py-1.5">Lot</th><th className="px-2 py-1.5">Désignation</th><th className="px-2 py-1.5">Unité</th><th className="px-2 py-1.5 text-right">Quantité</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {q.lines.map((l) => <tr key={l.designation}><td className="px-2 py-1.5 text-slate-500">{l.lot}</td><td className="px-2 py-1.5">{l.designation}</td><td className="px-2 py-1.5">{l.unit}</td><td className="px-2 py-1.5 text-right font-medium">{fr(l.quantity, l.unit === "kg" ? 0 : 2)}</td></tr>)}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-slate-500">Ratio d&apos;acier : {fr(q.ratio, 0)} kg/m³. Les terrassements sont estimés (fouille et remblai forfaitaires) ; le devis reprend ces quantités sans prix unitaires, à compléter depuis la bibliothèque de prix.</p>
      </Card>
      <Card title={`Nomenclature des aciers (${q.bars.length} repères — ${fr(q.steelMass, 0)} kg)`} actions={
        <button onClick={() => downloadText(barsToCsv(q.bars), `nomenclature_${slug(study.input.ident.projet)}.csv`, "text/csv;charset=utf-8")} className={btn}>Exporter CSV</button>
      }>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500"><tr><th className="px-2 py-1.5">Rep.</th><th className="px-2 py-1.5">Élément</th><th className="px-2 py-1.5">Désignation</th><th className="px-2 py-1.5">Ø</th><th className="px-2 py-1.5">e</th><th className="px-2 py-1.5">Façonnage (m)</th><th className="px-2 py-1.5 text-right">L unit.</th><th className="px-2 py-1.5 text-right">Nb</th><th className="px-2 py-1.5 text-right">kg</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {q.bars.map((b) => (
                <tr key={b.rep}>
                  <td className="px-2 py-1.5 font-medium">{b.rep}</td><td className="px-2 py-1.5 text-slate-500">{b.element}</td><td className="px-2 py-1.5">{b.designation}</td>
                  <td className="px-2 py-1.5">HA{b.phi}</td><td className="px-2 py-1.5">{fr(b.s * 100, 1)}</td><td className="px-2 py-1.5 text-xs">{b.shape} {b.dims.map((d) => fr(d)).join(" + ")}</td>
                  <td className="px-2 py-1.5 text-right">{fr(b.length)}</td><td className="px-2 py-1.5 text-right">{b.count}</td><td className="px-2 py-1.5 text-right">{fr(b.mass, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ── Export Excel de vérification ───────────────────────────

export function ExcelCard({ study }: { study: Study }) {
  const [err, setErr] = useState("");
  const go = () => {
    try {
      const data = studyToXlsx(study);
      void downloadBlob(new Blob([data as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `Verification_${slug(study.input.ident.projet)}_${study.fingerprint}.xlsx`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  };
  return (
    <Card title="Export Excel de vérification (avec formules)" actions={<button onClick={go} className={btnPrimary}>Télécharger le classeur Excel</button>}>
      <p className="text-sm text-slate-600">
        Classeur .xlsx de 7 feuilles : données (cellules jaunes), charges permanentes et poussées, flexion BAEL nappe par nappe (μ, α, z, As, As min, section choisie),
        nomenclature (longueurs, kg/m = 0,00617·Ø², masses, récapitulatif par diamètre), métré et ratio, hydrologie (Kirpich, Montana, méthode rationnelle,
        Manning-Strickler, Froude) et liste des vérifications. Chaque résultat est une formule Excel, à côté de la valeur du logiciel et de l&apos;écart.
      </p>
      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
    </Card>
  );
}

// ── Note de calcul ─────────────────────────────────────────

export function NotePanel({ study }: { study: Study }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const defaults = study.defaultsInPlace.length;
  const generate = async (kind: NoteKind = "complete") => {
    setBusy(true);
    setErr("");
    try {
      if (kind === "hydraulique") {
        // Note hydraulique : sans figures de structure.
        downloadBlob(await buildNoteDocx(study, {}, kind), `Note_hydraulique_${slug(study.input.ident.projet)}_${study.fingerprint}.docx`);
        return;
      }
      const sheets = buildSheets(study);
      const images: NoteImages = {
        coffrage: await svgToPng(sheetToSvg(sheets.find((s) => s.role === "coffrage") ?? sheets[0], { background: "#ffffff" }), 1600),
        ferraillage: await svgToPng(sheetToSvg(sheets.find((s) => s.role === "ferraillage") ?? sheets[1], { background: "#ffffff" }), 1600),
        moments: await svgToPng(envelopeSvg(study.analysis, study.analysis.elu, "M"), 1400),
        tranchant: await svgToPng(envelopeSvg(study.analysis, study.analysis.elu, "V"), 1400),
        convois: [],
      };
      // Vues 3D (si le navigateur dispose de WebGL ; sinon la note est produite sans elles).
      try {
        const cv = study.analysis.traffic.find((x) => x.positions.length)?.def.id ?? "";
        const base = { concrete: "opaque" as const, fill: false, convoy: "", rebar: false, cut: false, efforts: false };
        images.maquette = (await renderSceneImage(study, { ...base, concrete: "transparent", convoy: cv, pressures: true }, 1600, 1000)) ?? undefined;
        images.ferraillage3d = (await renderSceneImage(study, { ...base, concrete: "transparent", rebar: true }, 1600, 1000, "iso", false)) ?? undefined;
        images.moments3d = (await renderSceneImage(study, { ...base, concrete: "transparent", efforts: true }, 1600, 1000)) ?? undefined;
        images.tranchant3d = (await renderSceneImage(study, { ...base, concrete: "transparent", efforts: true, effortKind: "V" }, 1600, 1000)) ?? undefined;
      } catch {
        /* pas de WebGL */
      }
      const pp = passageSvg(study, 1), pm = passageSvg(study, -1);
      if (pp) images.passagePlus = await svgToPng(pp, 1400);
      if (pm) images.passageMoins = await svgToPng(pm, 1400);
      for (const t of study.analysis.traffic.filter((x) => x.positions.length)) {
        const svg = convoyFigure(study, t.def.id);
        if (svg) images.convois!.push({ label: t.def.label, img: await svgToPng(svg, 1400) });
      }
      const blob = await buildNoteDocx(study, images, kind);
      const prefix = kind === "structure" ? "Note_beton_arme" : "Note_de_calcul";
      downloadBlob(blob, `${prefix}_${slug(study.input.ident.projet)}_${study.fingerprint}.docx`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card title="Note de calcul Word">
      <p className="text-sm text-slate-600">
        Trois documents : la note béton armé (structure, géotechnique, têtes, métré), la note hydraulique (bassin versant, débit de projet, écoulement, revanche) et la note complète.
        Document Word en Arial, avec en-tête « Auteur : {study.input.ident.auteur} » et pied de page sur chaque page, page de garde avec cartouche de visa, sommaire automatique,
        étude hydrologique et hydraulique, hypothèses, modèle, charges, convois et positions défavorables, combinaisons, sollicitations, dimensionnement,
        vérifications (BAEL, EC2, géotechnique, têtes), synthèse du ferraillage, métré, nomenclature, valeurs par défaut restées en place et conclusion.
      </p>
      {defaults > 0 && (
        <p className="mt-2 rounded bg-amber-50 p-2 text-sm text-amber-800">{defaults} valeur(s) par défaut ne sont pas confirmées : elles seront listées dans la note (rubrique « Valeurs par défaut restées en place »).</p>
      )}
      <div className="mt-3 flex items-center gap-3">
        <button onClick={() => generate("structure")} disabled={busy} className={btnPrimary}>{busy ? "Génération…" : "Note béton armé (.docx)"}</button>
        <button onClick={() => generate("hydraulique")} disabled={busy} className={btnPrimary}>Note hydraulique (.docx)</button>
        <button onClick={() => generate("complete")} disabled={busy} className={btn}>Note complète (.docx)</button>
        <span className="text-xs text-slate-500">Empreinte des données : <span className="font-mono">{study.fingerprint}</span></span>
      </div>
      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
      <p className="mt-3 text-xs text-slate-500">À l&apos;ouverture, Word propose de mettre à jour les champs : acceptez pour remplir les numéros de page du sommaire.</p>
    </Card>
  );
}
