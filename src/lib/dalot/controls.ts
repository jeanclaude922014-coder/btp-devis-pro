/**
 * Contrôles internes du modèle de calcul : ils ne justifient pas l'ouvrage, ils prouvent que le
 * modèle aux éléments finis porte bien les charges annoncées (équilibre, poids propre, remblai,
 * symétrie, convois effectivement placés). Un écart signale une erreur de modélisation.
 */

import type { Analysis } from "./analysis";
import type { Check } from "./checks";
import type { DalotInput } from "./fields";

const DOM = "Contrôles du modèle et hypothèses";

export function modelControls(inp: DalotInput, an: Analysis): Check[] {
  const m = an.model;
  const cl = an.caseLoads;
  const B = m.xRight - m.xLeft;
  const n = inp.openings.length;
  const ns = m.nStations;
  const out: Check[] = [];
  const pct = (a: number, b: number) => (Math.abs(a - b) / Math.max(Math.abs(b), 1e-9)) * 100;

  // Poids propre introduit dans le modèle / poids du béton de la section (par mètre de bande).
  const gous = inp.gousset > 0 ? 4 * n * (inp.gammaBA * inp.gousset ** 2) / 2 : 0;
  const wModel = cl.selfTop * B + cl.selfRaft * B + cl.selfWalls.reduce((s, w) => s + w, 0) + gous;
  const Hout = inp.er + inp.hInt + inp.es;
  const area = B * Hout - inp.openings.reduce((s, o) => s + o * inp.hInt, 0) + 4 * n * inp.gousset ** 2 / 2;
  const wSection = inp.gammaBA * area;
  out.push({
    id: "CTRL-POIDS-PROPRE", domain: DOM, element: "Modèle de calcul",
    label: "Poids propre du modèle égal au poids du béton de la section (γ·A)", value: wModel, limit: wSection, unit: "kN/m",
    status: pct(wModel, wSection) <= 0.1 ? "conforme" : "non_conforme", ref: "Contrôle interne",
    detail: `Écart ${pct(wModel, wSection).toFixed(3).replace(".", ",")} % (tolérance 0,1 %).`,
  });

  // Remblai et chaussée sur la dalle : q = γr·hr + γch·ech sur toute la largeur.
  const qExp = (inp.gammaR * inp.hr + inp.gammaCh * inp.ech) * B;
  out.push({
    id: "CTRL-REMBLAI", domain: DOM, element: "Modèle de calcul",
    label: "Poids du remblai et de la chaussée sur la dalle égal à q × B", value: cl.gTop * B, limit: qExp, unit: "kN/m",
    status: pct(cl.gTop * B, qExp) <= 0.1 || qExp === 0 && cl.gTop === 0 ? "conforme" : "non_conforme", ref: "Contrôle interne",
  });

  // Équilibre vertical sous G : somme des réactions du sol = charges appliquées.
  const wTot = wModel + cl.gTop * B;
  let R = 0;
  m.raftNodes.forEach((_, k) => { R += an.cases.G[3 * ns + k] * m.raftTrib[k]; });
  const res = pct(R, wTot);
  out.push({
    id: "CTRL-EQUILIBRE-APPUIS", domain: DOM, element: "Modèle de calcul",
    label: "Équilibre du modèle : réactions du sol égales aux charges permanentes", value: R, limit: wTot, unit: "kN/m",
    status: res <= 0.5 ? "conforme" : "non_conforme", ref: "Contrôle interne",
    detail: `Résidu ${res.toFixed(3).replace(".", ",")} % (tolérance 0,5 %).`,
  });

  // Symétrie : sous G et poussées symétriques, les moments aux deux encastrements de la dalle sont égaux.
  const dalle = m.members.filter((mm) => mm.kind === "dalle");
  if (dalle.length && inp.openings.every((o) => Math.abs(o - inp.openings[0]) < 1e-9)) {
    const first = dalle[0], last = dalle[dalle.length - 1];
    const mL = an.cases.G[first.station0] + an.cases.Pmax[first.station0];
    const mR = an.cases.G[last.station0 + last.nodes.length - 1] + an.cases.Pmax[last.station0 + last.nodes.length - 1];
    const d = Math.abs(mL - mR);
    const ref = Math.max(Math.abs(mL), Math.abs(mR), 1);
    out.push({
      id: "CTRL-SYMETRIE", domain: DOM, element: "Modèle de calcul",
      label: "Symétrie du modèle : moments d'encastrement gauche et droit de la dalle (G + Pmax)", value: mL, limit: mR, unit: "kN·m/m",
      status: d / ref <= 0.01 ? "conforme" : "non_conforme", ref: "Contrôle interne",
    });
  }

  // Convois cochés effectivement appliqués : effets non nuls sur la dalle (charges réparties comprises).
  for (const t of an.traffic) {
    let eff = 0;
    for (const mm of m.members.filter((x) => x.kind === "dalle")) for (let k = 0; k < mm.nodes.length; k++) eff = Math.max(eff, Math.abs(t.max[mm.station0 + k]), Math.abs(t.min[mm.station0 + k]));
    out.push({
      id: `CTRL-CONVOI-${t.def.id}`, domain: DOM, element: t.def.label,
      label: "Convoi appliqué au modèle : moment maximal non nul dans la dalle", value: eff, unit: "kN·m/m",
      status: eff > 1e-6 ? "conforme" : "non_verifie", ref: "Contrôle interne — lignes d'influence",
      detail: t.positions.length ? `${t.positions.length} positions défavorables retenues.` : "Charge répartie : appliquée sur les travées défavorables.",
    });
  }
  return out;
}
