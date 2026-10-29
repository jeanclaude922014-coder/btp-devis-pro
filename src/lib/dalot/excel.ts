/**
 * Export Excel de vérification : les grandeurs saisies (en jaune) et des formules Excel qui refont
 * les calculs principaux (charges, flexion BAEL, nomenclature, métré, hydraulique), à côté des
 * valeurs du logiciel et de l'écart. Le classeur se recalcule à l'ouverture.
 */

import type { Study } from "./engine";
import { BAR_PARTS } from "./quantities";
import { buildXlsx, colName, type Cell, type SheetDef } from "./xlsx";

class Sh {
  rows: Cell[][] = [];
  constructor(public name: string, public cols: number[]) {}
  /** Ajoute une ligne et rend son numéro (1 = première ligne). */
  add(cells: Cell[]) { this.rows.push(cells); return this.rows.length; }
  def(): SheetDef { return { name: this.name, rows: this.rows, cols: this.cols }; }
}

const T = (s: string): Cell => ({ v: s, s: 4 });
const H = (s: string): Cell => ({ v: s, s: 1 });
const IN = (v: number): Cell => ({ v, s: 5 });
const F = (f: string, s = 2): Cell => ({ f, s });
const R = (f: string): Cell => ({ f, s: 6 });
const B = (s: string): Cell => ({ v: s, s: 7 });

export function studyToXlsx(study: Study): Uint8Array {
  const inp = study.input;
  const mat = study.design.mat;
  const id = inp.ident;
  const n = inp.openings.length;
  const same = inp.openings.every((o) => Math.abs(o - inp.openings[0]) < 1e-9);
  const sheets: Sh[] = [];

  // ── 1. Données ──
  const D = new Sh("Donnees", [46, 12, 14, 12, 60]);
  D.add([T(`DalotPro — ${id.projet}`)]);
  D.add([`Auteur : ${id.auteur} — empreinte ${study.fingerprint} — cellules jaunes : données saisies ; cellules vertes : résultats par formule.`]);
  D.add([H("Paramètre"), H("Symbole"), H("Valeur"), H("Unité"), H("Observation")]);
  const P: Record<string, string> = {};
  const put = (key: string, label: string, sym: string, v: Cell, unit: string, obs = "") => {
    const r = D.add([label, sym, v, unit, obs]);
    P[key] = `Donnees!$C$${r}`;
  };
  put("n", "Nombre de cellules", "n", IN(n), "u");
  put("o", same ? "Ouverture d'une cellule" : "Ouverture de la 1re cellule", "o", IN(inp.openings[0]), "m", same ? "" : `Ouvertures : ${inp.openings.join(" ; ")}`);
  put("hInt", "Hauteur intérieure", "h", IN(inp.hInt), "m");
  put("es", "Épaisseur de la dalle", "es", IN(inp.es), "m");
  put("er", "Épaisseur du radier", "er", IN(inp.er), "m");
  put("eExt", "Épaisseur des piédroits extérieurs", "e", IN(inp.eExt), "m");
  put("eInt", "Épaisseur des piédroits intermédiaires", "ei", IN(inp.eInt), "m");
  put("L", "Longueur de l'ouvrage", "L", IN(inp.L), "m");
  if (same) put("B", "Largeur extérieure", "B", R(`${P.n}*${P.o}+2*${P.eExt}+(${P.n}-1)*${P.eInt}`), "m", "B = n·o + 2·e + (n−1)·ei");
  else put("B", "Largeur extérieure", "B", IN(study.analysis.model.xRight - study.analysis.model.xLeft), "m", "ouvertures inégales : valeur du logiciel");
  put("Hout", "Hauteur extérieure", "H", R(`${P.er}+${P.hInt}+${P.es}`), "m", "H = er + h + es");
  put("hr", "Hauteur de remblai sur la dalle", "hr", IN(inp.hr), "m");
  put("ech", "Épaisseur de chaussée", "ech", IN(inp.ech), "m");
  put("gBA", "Poids volumique du béton armé", "γb", IN(inp.gammaBA), "kN/m³");
  put("gR", "Poids volumique du remblai", "γr", IN(inp.gammaR), "kN/m³");
  put("gCh", "Poids volumique de la chaussée", "γch", IN(inp.gammaCh), "kN/m³");
  put("Kmax", "Coefficient de poussée maximal", "Kmax", IN(inp.Kmax), "—");
  put("Kmin", "Coefficient de poussée minimal", "Kmin", IN(inp.Kmin), "—");
  put("q", "Surcharge de remblai", "q", IN(inp.qRemblai), "kPa");
  put("fc28", "Résistance du béton à 28 jours", "fc28", IN(inp.fc28), "MPa");
  put("fe", "Limite élastique des aciers", "fe", IN(inp.fe), "MPa");
  put("c", "Enrobage", "c", IN(inp.cover), "m");
  put("ft28", "Résistance à la traction", "ft28", R(`0.6+0.06*${P.fc28}`), "MPa", "BAEL A.2.1,12");
  put("fbu", "Résistance de calcul du béton", "fbu", R(`0.85*${P.fc28}/1.5`), "MPa", "BAEL A.4.3,41 (θ = 1)");
  put("fsu", "Résistance de calcul des aciers", "fsu", R(`${P.fe}/1.15`), "MPa", "BAEL A.4.3,2");
  put("sigS", "Contrainte limite des aciers à l'ELS", "σs", IN(mat.sigmaS), "MPa", inp.fissuration === "prejudiciable" ? "fissuration préjudiciable" : "fissuration très préjudiciable");
  sheets.push(D);

  // ── 2. Charges permanentes et poussées (bande de 1 m) ──
  const C = new Sh("Charges", [52, 18, 16, 16, 12, 44]);
  C.add([T("Charges permanentes et poussées — bande de 1 m")]);
  C.add([]);
  C.add([H("Charge"), H("Formule"), H("Excel"), H("Logiciel"), H("Écart %"), H("Unité / commentaire")]);
  const cl = study.analysis.caseLoads;
  const Bm = study.analysis.model.xRight - study.analysis.model.xLeft;
  const line = (label: string, form: string, f: string, sw: number, unit: string) => {
    const r = C.add([label, form, R(f), { v: sw, s: 2 }, F(`IF(D${0}=0,0,(C${0}-D${0})/D${0}*100)`), unit]);
    C.rows[r - 1][4] = F(`IF(D${r}=0,0,(C${r}-D${r})/D${r}*100)`);
    return `C${r}`;
  };
  const g1 = line("Poids propre de la dalle", "γb·es", `${P.gBA}*${P.es}`, cl.selfTop, "kN/m²");
  const gR = line("Remblai et chaussée sur la dalle", "γr·hr + γch·ech", `${P.gR}*${P.hr}+${P.gCh}*${P.ech}`, cl.gTop, "kN/m²");
  const g2 = line("Poids propre du radier", "γb·er", `${P.gBA}*${P.er}`, cl.selfRaft, "kN/m²");
  const gw = line("Poids des piédroits", "γb·h·(2e + (n−1)·ei)", `${P.gBA}*${P.hInt}*(2*${P.eExt}+(${P.n}-1)*${P.eInt})`, cl.selfWalls.reduce((s, w) => s + w, 0), "kN/m");
  const gous = inp.gousset > 0 ? 4 * n * (inp.gammaBA * inp.gousset ** 2) / 2 : 0;
  const G = line("Charge permanente totale G", "(g1 + gR + g2)·B + piédroits", `(${g1}+${gR}+${g2})*${P.B}+${gw}${gous ? `+${gous}` : ""}`, (cl.selfTop + cl.gTop + cl.selfRaft) * Bm + cl.selfWalls.reduce((s, w) => s + w, 0) + gous, "kN/m");
  line("Pression moyenne sous le radier (G seul)", "G / B", `${G}/${P.B}`, ((cl.selfTop + cl.gTop + cl.selfRaft) * Bm + cl.selfWalls.reduce((s, w) => s + w, 0) + gous) / Bm, "kPa");
  const Hc = inp.er + inp.hInt + inp.es;
  line("Poussée Kmax en tête des piédroits", "Kmax·(γr·hr + γch·ech)", `${P.Kmax}*${gR}`, inp.Kmax * cl.gTop, "kPa");
  line("Poussée Kmax en pied des piédroits", "Kmax·(gR + γr·H)", `${P.Kmax}*(${gR}+${P.gR}*${P.Hout})`, inp.Kmax * (cl.gTop + inp.gammaR * Hc), "kPa");
  line("Poussée Kmin en pied des piédroits", "Kmin·(gR + γr·H)", `${P.Kmin}*(${gR}+${P.gR}*${P.Hout})`, inp.Kmin * (cl.gTop + inp.gammaR * Hc), "kPa");
  line("Poussée due à la surcharge de remblai", "Kmax·q", `${P.Kmax}*${P.q}`, inp.Kmax * inp.qRemblai, "kPa (uniforme)");
  sheets.push(C);

  // ── 3. Flexion BAEL, nappe par nappe ──
  const Fe = new Sh("Ferraillage", [34, 8, 8, 8, 9, 10, 10, 9, 9, 9, 10, 10, 10, 10, 10, 8, 11, 9, 10]);
  Fe.add([T("Flexion simple BAEL 91 mod. 99 — par mètre de largeur")]);
  Fe.add(["Mu et Ms : moments du logiciel (enveloppes ELU / ELS). As ELS : valeur du logiciel (calcul exact en section fissurée). Le reste est recalculé par formule."]);
  const hdr = ["Nappe", "h (m)", "Ø (mm)", "s (m)", "d (m)", "Mu (kN·m)", "Ms (kN·m)", "μ", "α", "z (m)", "As ELU (cm²)", "As min (cm²)", "As ELS logiciel", "As requis (cm²)", "As choisi (cm²)", "Vérif.", "As ELU logiciel", "Écart %", "d logiciel"];
  Fe.add(hdr.map(H));
  for (const g of study.design.groups) {
    const r = Fe.rows.length + 1;
    const c = (k: number) => `${colName(k)}${r}`;
    Fe.add([
      g.label, IN(g.h), IN(g.bars.phi), IN(g.bars.s),
      F(`${c(1)}-${P.c}-${c(2)}/2000`, 3),
      IN(g.Mu), IN(g.Ms),
      F(`${c(5)}/1000/(${c(4)}^2*${P.fbu})`, 3),
      F(`1.25*(1-SQRT(1-2*${c(7)}))`, 3),
      F(`${c(4)}*(1-0.4*${c(8)})`, 3),
      F(`${c(5)}/1000/(${c(9)}*${P.fsu})*10000`),
      F(`0.23*${c(4)}*${P.ft28}/${P.fe}*10000`),
      { v: g.AsELS, s: 2 },
      R(`MAX(${c(10)},${c(11)},${c(12)})`),
      R(`PI()*${c(2)}^2/4/100/${c(3)}`),
      F(`IF(${c(14)}>=${c(13)}-0.005,"OK","À RENFORCER")`, 7),
      { v: g.AsELU, s: 2 },
      F(`IF(${c(16)}=0,0,(${c(10)}-${c(16)})/${c(16)}*100)`),
      { v: g.d, s: 3 },
    ]);
  }
  Fe.add([]);
  Fe.add(["μ = Mu / (b·d²·fbu) ; α = 1,25·(1 − √(1 − 2μ)) ; z = d·(1 − 0,4·α) ; As = Mu / (z·fsu) ; As min = 0,23·b·d·ft28 / fe (BAEL A.4.2) ; As choisi = π·Ø²/4 / s."]);
  sheets.push(Fe);

  // ── 4. Nomenclature ──
  const N = new Sh("Nomenclature", [18, 16, 8, 60, 7, 9, 11, 9, 13, 12, 12]);
  N.add([T("Nomenclature des aciers — façonnages, longueurs, poids")]);
  N.add([]);
  N.add(["Partie", "Élément", "Rep.", "Désignation", "Ø", "Esp. (m)", "Long. (m)", "Nombre", "Long. tot. (m)", "kg/m", "Masse (kg)"].map(H));
  const first = N.rows.length + 1;
  for (const part of BAR_PARTS) {
    for (const b of study.quantities.bars.filter((x) => x.part === part)) {
      const r = N.rows.length + 1;
      N.add([part, b.element, b.rep, b.designation, IN(b.phi), b.s > 0 ? { v: b.s, s: 2 } : b.spacingLabel, IN(Math.round(b.length * 1000) / 1000), IN(b.count),
        F(`G${r}*H${r}`), F(`0.00617*E${r}^2`, 3), R(`I${r}*J${r}`)]);
    }
  }
  const last = N.rows.length;
  N.add([B("TOTAL"), "", "", "", "", "", "", "", F(`SUM(I${first}:I${last})`), "", R(`SUM(K${first}:K${last})`)]);
  const totRow = N.rows.length;
  N.add([]);
  N.add([H("Récapitulatif par diamètre"), H("Long. totale (m)"), H("Masse (kg)"), H("Barres de 12 m")]);
  for (const phi of Array.from(new Set(study.quantities.bars.map((b) => b.phi))).sort((a, b) => a - b)) {
    const r = N.rows.length + 1;
    N.add([`HA ${phi}`, F(`SUMIF($E$${first}:$E$${last},${phi},$I$${first}:$I$${last})`), R(`SUMIF($E$${first}:$E$${last},${phi},$K$${first}:$K$${last})`), F(`ROUNDUP(B${r}/12,0)`, 0)]);
  }
  for (const part of BAR_PARTS) {
    if (!study.quantities.bars.some((b) => b.part === part)) continue;
    N.add([`Masse ${part.toLowerCase()}`, "", R(`SUMIF($A$${first}:$A$${last},"${part}",$K$${first}:$K$${last})`)]);
  }
  N.add(["Masse totale (logiciel)", "", { v: study.quantities.steelMass, s: 2 }, F(`IF(C${N.rows.length + 1}=0,0,(K${totRow}-C${N.rows.length + 1})/C${N.rows.length + 1}*100)`)]);
  N.add(["kg/m = 0,00617·Ø² (π·Ø²/4 × 7 850 kg/m³)."]);
  sheets.push(N);

  // ── 5. Métré ──
  const M = new Sh("Metre", [18, 80, 8, 14]);
  M.add([T("Métré de l'ouvrage")]);
  M.add([]);
  M.add(["Lot", "Désignation", "Unité", "Quantité"].map(H));
  const m0 = M.rows.length + 1;
  for (const l of study.quantities.lines) M.add([l.lot, l.designation, l.unit, IN(Math.round(l.quantity * 1000) / 1000)]);
  const m1 = M.rows.length;
  M.add([B("Béton armé total (m³)"), "", "m³", R(`SUMIFS(D${m0}:D${m1},A${m0}:A${m1},"Béton",B${m0}:B${m1},"Béton armé*")`)]);
  const rb = M.rows.length;
  M.add([B("Aciers (kg)"), "", "kg", R(`SUMIF(A${m0}:A${m1},"Aciers",D${m0}:D${m1})`)]);
  const ra = M.rows.length;
  M.add([B("Ratio acier / béton armé"), "", "kg/m³", R(`D${ra}/D${rb}`)]);
  sheets.push(M);

  // ── 6. Hydraulique ──
  const hy = study.hydro;
  if (hy && inp.hydro.actif) {
    const Y = new Sh("Hydraulique", [52, 16, 16, 14, 40]);
    Y.add([T("Hydrologie et hydraulique")]);
    Y.add([]);
    Y.add(["Grandeur", "Excel", "Logiciel", "Unité", "Formule"].map(H));
    const h = inp.hydro;
    const row = (label: string, v: Cell, sw: number | null, unit: string, form: string) => `B${Y.add([label, v, sw === null ? "" : { v: sw, s: 2 }, unit, form])}`;
    const A = row("Surface du bassin versant A", IN(h.A), null, "km²", "");
    const Lk = row("Longueur du plus long cheminement", IN(h.L), null, "km", "");
    const dH = row("Dénivelée ΔH", IN(h.dH), null, "m", "");
    const Cc = row("Coefficient de ruissellement C", IN(h.C), null, "—", "");
    const a = row("Montana a", IN(h.montanaA), null, "", "");
    const bb = row("Montana b", IN(h.montanaB), null, "", "");
    const tc = row("Temps de concentration (Kirpich)", R(`0.945*(${Lk}^3/${dH})^0.385`), hy.tcH, "h", "tc = 0,945·(L³/ΔH)^0,385");
    const I = row("Intensité de pluie", R(`${a}/(${tc}*60)^${bb}`), hy.I, "mm/h", "i = a·(60·tc)^−b");
    const Q = h.methode === "rationnelle"
      ? row("Débit de pointe (méthode rationnelle)", R(`${Cc}*${I}*${A}/3.6`), hy.Qp, "m³/s", "Q = C·i·A / 3,6")
      : row("Débit de projet imposé", IN(h.Qimpose), hy.Qp, "m³/s", "");
    const bc = row("Largeur d'une cellule", IN(Math.min(...inp.openings)), null, "m", "");
    const Qc = row("Débit par cellule", R(`${Q}*${bc}/${inp.openings.reduce((s, o) => s + o, 0)}`), hy.Qcell, "m³/s", "au prorata des ouvertures");
    const K = row("Coefficient de Strickler K", IN(h.K), null, "m^(1/3)/s", "");
    const Ip = row("Pente du radier", IN(h.pente / 100), null, "m/m", "");
    const hn = row("Tirant d'eau normal (logiciel)", IN(hy.h), hy.h, "m", "résolu par dichotomie");
    row("Débit vérifié avec ce tirant d'eau", R(`${K}*${bc}*${hn}*((${bc}*${hn})/(${bc}+2*${hn}))^(2/3)*SQRT(${Ip})`), hy.Qcell, "m³/s", "Q = K·S·Rh^(2/3)·√I, doit égaler le débit par cellule");
    const V = row("Vitesse", R(`${Qc}/(${bc}*${hn})`), hy.V, "m/s", "V = Q / S");
    row("Nombre de Froude", R(`${V}/SQRT(9.81*${hn})`), hy.Fr, "—", "Fr = V / √(g·h)");
    row("Revanche sous la dalle", R(`${P.hInt}-${hn}`), hy.revanche, "m", "h intérieure − tirant d'eau");
    sheets.push(Y);
  }

  // ── 7. Vérifications ──
  const V = new Sh("Verifications", [22, 26, 26, 70, 12, 12, 10, 14, 12]);
  V.add([T("Vérifications réglementaires (valeurs du logiciel)")]);
  V.add([]);
  V.add(["Identifiant", "Domaine", "Élément", "Vérification", "Valeur", "Limite", "Unité", "Statut", "Taux"].map(H));
  for (const c of study.checks) {
    const r = V.rows.length + 1;
    V.add([c.id, c.domain, c.element, c.label, c.value ?? "", c.limit ?? "", c.unit ?? "", c.status.replace("_", " "),
      F(`IF(AND(ISNUMBER(E${r}),ISNUMBER(F${r}),F${r}<>0),ABS(E${r}/F${r}),"")`)]);
  }
  sheets.push(V);

  return buildXlsx(sheets.map((s) => s.def()), { title: `Vérification ${id.projet}`, author: id.auteur });
}
