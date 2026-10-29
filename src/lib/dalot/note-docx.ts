/**
 * Note de calcul Word (.docx), générée dans le navigateur. En-tête et pied de page sur chaque
 * page (projet, auteur, empreinte des données), sommaire automatique, formules avec leurs
 * références réglementaires, tableaux de résultats et figures tirées du calcul.
 */

import {
  AlignmentType, BorderStyle, Document, Footer, Header, HeadingLevel, ImageRun, Packer, PageBreak, PageNumber,
  Paragraph, ShadingType, Table, TableCell, TableOfContents, TableRow, TextRun, WidthType,
} from "docx";
import { STATUS_LABELS, countByStatus, type Check } from "./checks";
import type { Study } from "./engine";
import { FIELD_BY_KEY } from "./fields";
import { convoyLibrary, diffusionDepth } from "./convoys";
import { headDimensions } from "./head-dims";

export type NoteImage = { data: Uint8Array; width: number; height: number };
export type NoteImages = Partial<Record<"section" | "coffrage" | "ferraillage" | "moments" | "tranchant" | "normal" | "maquette" | "ferraillage3d" | "moments3d" | "tranchant3d" | "passagePlus" | "passageMoins", NoteImage>> & {
  convois?: { label: string; img: NoteImage }[];
};

const FONT = "Arial";
const f = (x: number | undefined, d = 2) => (x === undefined || !Number.isFinite(x) ? "—" : x.toFixed(d).replace(".", ","));

const P = (text: string, opts: { bold?: boolean; italic?: boolean; size?: number; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; color?: string; spacingAfter?: number } = {}) =>
  new Paragraph({
    alignment: opts.align,
    spacing: { after: opts.spacingAfter ?? 100 },
    children: [new TextRun({ text, bold: opts.bold, italics: opts.italic, size: opts.size, color: opts.color, font: FONT })],
  });
const H1 = (text: string) => new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 240, after: 120 }, children: [new TextRun({ text, font: FONT })] });
const H2 = (text: string) => new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 160, after: 80 }, children: [new TextRun({ text, font: FONT })] });
const FORMULA = (text: string, ref?: string) => new Paragraph({
  indent: { left: 567 },
  spacing: { after: 80 },
  children: [
    new TextRun({ text, italics: true, font: "Cambria Math", size: 21 }),
    ...(ref ? [new TextRun({ text: `    [${ref}]`, size: 16, color: "64748B", font: FONT })] : []),
  ],
});
const BULLET = (text: string) => new Paragraph({ bullet: { level: 0 }, spacing: { after: 60 }, children: [new TextRun({ text, font: FONT })] });

function table(head: string[], rows: (string | number)[][], widths?: number[], opts: { statusCol?: number } = {}) {
  const total = 9638; // largeur utile A4 (twips) avec marges de 2 cm
  const w = widths ?? head.map(() => 1 / head.length);
  const cell = (text: string, header: boolean, i: number, fill?: string) => new TableCell({
    width: { size: Math.round(total * (w[i] ?? 0)), type: WidthType.DXA },
    shading: header ? { type: ShadingType.CLEAR, fill: "1E3A5F", color: "auto" } : fill ? { type: ShadingType.CLEAR, fill, color: "auto" } : undefined,
    margins: { top: 40, bottom: 40, left: 70, right: 70 },
    children: [new Paragraph({ children: [new TextRun({ text, bold: header, size: header ? 17 : 16, color: header ? "FFFFFF" : undefined, font: FONT })] })],
  });
  const statusFill: Record<string, string> = { Conforme: "DCFCE7", "Non conforme": "FEE2E2", "Non vérifié": "FEF3C7", "Non applicable": "F1F5F9" };
  return new Table({
    width: { size: total, type: WidthType.DXA },
    columnWidths: w.map((x) => Math.round(total * x)),
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: "94A3B8" }, bottom: { style: BorderStyle.SINGLE, size: 4, color: "94A3B8" },
      left: { style: BorderStyle.SINGLE, size: 4, color: "94A3B8" }, right: { style: BorderStyle.SINGLE, size: 4, color: "94A3B8" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: "CBD5E1" }, insideVertical: { style: BorderStyle.SINGLE, size: 2, color: "CBD5E1" },
    },
    rows: [
      new TableRow({ tableHeader: true, children: head.map((h, i) => cell(h, true, i)) }),
      ...rows.map((r) => new TableRow({
        children: r.map((v, i) => cell(String(v), false, i, opts.statusCol === i ? statusFill[String(v)] : undefined)),
      })),
    ],
  });
}

function image(img: NoteImage | undefined, widthPx: number, caption: string) {
  if (!img) return [P(`[Figure non disponible : ${caption}]`, { italic: true, color: "94A3B8" })];
  const h = Math.round((widthPx * img.height) / img.width);
  return [
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({ type: "png", data: img.data, transformation: { width: widthPx, height: h } })] }),
    P(caption, { italic: true, size: 17, align: AlignmentType.CENTER, color: "475569" }),
  ];
}

function checksTable(checks: Check[]) {
  return table(
    ["Statut", "Élément", "Vérification", "Valeur", "Limite", "Comb.", "Référence"],
    checks.map((c) => [STATUS_LABELS[c.status], c.element, c.label + (c.detail ? ` — ${c.detail}` : ""),
      c.value !== undefined ? `${f(c.value, 3)} ${c.unit ?? ""}` : "—", c.limit !== undefined ? `${f(c.limit, 3)} ${c.unit ?? ""}` : "—", c.combo ?? "—", c.ref]),
    [0.1, 0.15, 0.31, 0.1, 0.1, 0.07, 0.17],
    { statusCol: 0 },
  );
}

export async function buildNoteDocx(study: Study, images: NoteImages): Promise<Blob> {
  const { input: inp, analysis: an, design, geo, heads, quantities: qt } = study;
  const id = inp.ident;
  const mat = design.mat;
  const today = new Date().toLocaleDateString("fr-FR");
  const counts = countByStatus(study.checks);
  const B = an.model.xRight - an.model.xLeft;
  const Hout = inp.er + inp.hInt + inp.es;
  const ns = an.quantities.ns;
  const statusText = STATUS_LABELS[study.status];
  const body: (Paragraph | Table | TableOfContents)[] = [];

  // ── Page de garde ──
  body.push(
    P(" ", { spacingAfter: 1200 }),
    P("NOTE DE CALCUL", { bold: true, size: 48, align: AlignmentType.CENTER, color: "1E3A5F" }),
    P("Dalot cadre en béton armé", { size: 30, align: AlignmentType.CENTER, color: "334155" }),
    P(" ", { spacingAfter: 400 }),
    P(id.projet, { bold: true, size: 32, align: AlignmentType.CENTER }),
    P(`${id.ouvrage} — ${id.localisation}`, { size: 24, align: AlignmentType.CENTER }),
    P(`${inp.openings.length} cellule${inp.openings.length > 1 ? "s" : ""} ${inp.openings.map((o) => f(o)).join(" + ")} × ${f(inp.hInt)} m — longueur ${f(inp.L)} m — remblai ${f(inp.hr)} m`, { size: 22, align: AlignmentType.CENTER, color: "475569" }),
    P(" ", { spacingAfter: 600 }),
    table(["Rubrique", "Valeur"], [
      ["Maître d'ouvrage", id.maitreOuvrage], ["Maître d'œuvre / Contrôle", id.maitreOeuvre], ["Dossier", id.dossier],
      ["Règlements", "BAEL 91 mod. 99 — Fascicule 61 titre II — contrôle Eurocode 2"],
      ["Auteur", id.auteur], ["Date", today], ["Indice", id.indice || "A"],
      ["Empreinte des données", study.fingerprint], ["Statut global", `${statusText} (${counts.conforme} conformes, ${counts.non_conforme} non conformes, ${counts.non_verifie} non vérifiées, ${counts.non_applicable} non applicables)`],
    ], [0.35, 0.65]),
    P(" ", { spacingAfter: 300 }),
    table(["Visa", "Nom", "Date", "Signature"], [["Établi par", id.auteur, today, ""], ["Vérifié par", "", "", ""], ["Approuvé par", "", "", ""]], [0.2, 0.35, 0.2, 0.25]),
    new Paragraph({ children: [new PageBreak()] }),
    P("SOMMAIRE", { bold: true, size: 28, color: "1E3A5F" }),
    new TableOfContents("Sommaire", { hyperlink: true, headingStyleRange: "1-2" }),
    new Paragraph({ children: [new PageBreak()] }),
  );

  // 1. Objet
  body.push(H1("1. Objet de la note"),
    P(`La présente note justifie le dalot cadre « ${id.ouvrage} » du projet « ${id.projet} » (${id.localisation}). Elle couvre la modélisation de l'ouvrage, les charges permanentes et routières, les combinaisons d'actions, les sollicitations, le dimensionnement du béton armé face par face, les vérifications de résistance, de service et géotechniques, les ouvrages de tête, la synthèse du ferraillage et le métré.`),
    P("Chaque vérification porte un statut : Conforme, Non conforme, Non vérifié (donnée absente : la vérification reste ouverte) ou Non applicable (avec la raison). Le statut global reflète exactement ce qui a été démontré."));

  // 1 bis. Hydrologie et hydraulique
  const hyd = study.hydro;
  const hy = inp.hydro;
  if (hyd) {
    body.push(H1("Étude hydrologique et hydraulique"),
      ...(hyd.method === "rationnelle" ? [
        H2("Débit de crue de projet"),
        table(["Paramètre", "Valeur"], [
          ["Superficie du bassin versant A", `${f(hy.A)} km²`], ["Longueur du plus long talweg L", `${f(hy.L)} km`],
          ["Dénivelée ΔH", `${f(hy.dH, 1)} m`], ["Coefficient de ruissellement C", f(hy.C)], ["Période de retour T", `${f(hy.T, 0)} ans`],
        ], [0.6, 0.4]),
        FORMULA(`Kirpich : tc = 0,945·(L³/ΔH)^0,385 = ${f(hyd.tcH, 3)} h ≈ ${f(hyd.tcMin, 1)} min`),
        FORMULA(`Montana : I = a/t^b = ${f(hy.montanaA, 0)}/${f(hyd.tcMin, 1)}^${f(hy.montanaB)} = ${f(hyd.I, 1)} mm/h`),
        FORMULA(`Méthode rationnelle : Qp = C·I·A/3,6 = ${f(hyd.Qp)} m³/s`),
      ] : [P(`Débit de projet issu d'une étude hydrologique externe : Qp = ${f(hyd.Qp)} m³/s.`)]),
      H2("Écoulement dans l'ouvrage"),
      FORMULA(`Q = K·S·R^(2/3)·Ir^(1/2), K = ${f(hy.K, 0)}, Ir = ${f(hy.pente)} % — débit par cellule ${f(hyd.Qcell)} m³/s`, "Manning-Strickler"),
      table(["Grandeur", "Valeur"], [
        ["Tirant d'eau normal h", `${f(hyd.h)} m`], ["Section mouillée S", `${f(hyd.S)} m²`], ["Rayon hydraulique R", `${f(hyd.R, 3)} m`],
        ["Vitesse moyenne V", `${f(hyd.V)} m/s`], ["Nombre de Froude", f(hyd.Fr)], ["Revanche", `${f(hyd.revanche)} m (${f(hyd.revanchePct, 0)} %)`],
      ], [0.6, 0.4]),
      checksTable(study.checks.filter((c) => c.domain === "Hydrologie et hydraulique")));
  }

  // 2. Références
  body.push(H1("2. Références réglementaires"),
    BULLET("BAEL 91 révisé 99 : règles techniques de conception et de calcul des ouvrages en béton armé (dimensionnement)."),
    BULLET("Fascicule 61 titre II : programmes de charges et épreuves des ponts-routes (systèmes A, B, charges militaires, convois exceptionnels)."),
    BULLET("Fascicule 62 titre V : règles techniques de conception et de calcul des fondations des ouvrages de génie civil."),
    BULLET("NF EN 1992-1-1 (Eurocode 2) et NF EN 1990 : contrôle croisé des sections (résistance, effort tranchant, ferraillage minimal, ouverture des fissures)."),
    BULLET("NF EN 1997-1 (Eurocode 7) annexe D : portance ; vérification UPL de la flottaison."),
    BULLET("Guide SETRA « Ponts-cadres et portiques » (PICF) et guide « Ouvrages hydrauliques » : poussée des terres, dispositions constructives."),
    BULLET("CCTP type AGEROUTE / BNETD : matériaux et mise en œuvre en Côte d'Ivoire."));

  // 3. Contexte ivoirien
  body.push(H1("3. Contexte local et hypothèses climatiques"),
    P("L'ouvrage est situé en climat tropical humide (Côte d'Ivoire) : fortes températures, saison des pluies marquée, sols latéritiques. Les dispositions suivantes sont retenues :"),
    BULLET(`Enrobage de ${f(inp.cover * 100, 0)} cm et fissuration ${mat.fissuration === "tres_prejudiciable" ? "très préjudiciable" : "préjudiciable"} (ouvrage hydraulique enterré, alternance humidification / séchage).`),
    BULLET("Ciment CPJ 42,5 ; cure humide d'au moins 7 jours, bétonnage aux heures fraîches, protection contre la dessiccation (forte chaleur)."),
    BULLET("Remblai en latérite sélectionnée (CBR ≥ 30), compacté à 95 % de l'OPM par couches de 20 cm, monté symétriquement des deux côtés de l'ouvrage."),
    BULLET("Bêches parafouilles et radiers de tête contre l'affouillement en période de crue ; parements enterrés badigeonnés au bitume."));

  // 4. Description
  body.push(H1("4. Description de l'ouvrage"),
    table(["Donnée", "Valeur"], [
      ["Nombre de cellules", String(inp.openings.length)],
      ["Ouvertures libres", inp.openings.map((o) => `${f(o)} m`).join(" ; ")],
      ["Hauteur libre intérieure", `${f(inp.hInt)} m`],
      ["Épaisseur dalle / radier", `${f(inp.es)} m / ${f(inp.er)} m`],
      ["Piédroits extérieurs / intermédiaires", `${f(inp.eExt)} m / ${f(inp.eInt)} m`],
      ["Goussets", inp.gousset > 0 ? `${f(inp.gousset * 100, 0)} × ${f(inp.gousset * 100, 0)} cm` : "sans"],
      ["Largeur / hauteur extérieures", `${f(B)} m / ${f(Hout)} m`],
      ["Longueur entre têtes", `${f(inp.L)} m`],
      ["Remblai sur dalle / chaussée", `${f(inp.hr)} m / ${f(inp.ech)} m`],
      ["Largeur roulable / chargeable", `${f(inp.Lr)} m / ${f(inp.Lc)} m`],
    ], [0.45, 0.55]),
    ...image(images.coffrage ?? images.section, 600, "Figure 1 — Coupe transversale de coffrage cotée (m)."),
    ...image(images.maquette, 600, "Figure 1 bis — Maquette 3D annotée de l'ouvrage complet (ailes, radiers de tête, bêches), convoi à sa position la plus défavorable avec volumes de diffusion, poussée des terres et pression du sol."));

  // 5. Matériaux
  body.push(H1("5. Matériaux"),
    H2("5.1 Béton"),
    FORMULA(`fc28 = ${f(inp.fc28, 0)} MPa ; ft28 = 0,6 + 0,06·fc28 = ${f(mat.ft28)} MPa`, "BAEL A.2.1,12"),
    FORMULA(`fbu = 0,85·fc28 / (θ·γb) = 0,85 × ${f(inp.fc28, 0)} / 1,5 = ${f(mat.fbu)} MPa`, "BAEL A.4.3,41"),
    FORMULA(`σ̄bc = 0,6·fc28 = ${f(mat.sigmaBc)} MPa`, "BAEL A.4.5,2"),
    FORMULA(`Eij = 11 000·fc28^(1/3) = ${f(an.model.E / 1000, 0)} MPa (modèle de calcul)`, "BAEL A.2.1,21"),
    FORMULA(`τu,lim = 0,07·fc28/γb = ${f(mat.tauLim, 3)} MPa (dalles sans armatures d'effort tranchant)`, "BAEL A.5.2,2"),
    H2("5.2 Aciers"),
    FORMULA(`HA FeE${inp.fe} : fsu = fe/γs = ${f(mat.fsu)} MPa ; μl = ${f(mat.muL, 3)}`, "BAEL A.4.3,2"),
    FORMULA(`σ̄s = ${mat.fissuration === "tres_prejudiciable" ? "0,8 × " : ""}min(2/3·fe ; max(0,5·fe ; 110·√(η·ft28))) = ${f(mat.sigmaS)} MPa (η = 1,6)`, mat.fissuration === "tres_prejudiciable" ? "BAEL A.4.5,34" : "BAEL A.4.5,33"),
    FORMULA(`Longueur de scellement droit : ls = Ø·fe/(4·τs), τs = 0,6·ψs²·ft28 → ls = ${mat.ls} Ø`, "BAEL A.6.1,23"),
    H2("5.3 Contrôle Eurocode 2"),
    FORMULA(`fck = ${f(mat.fck, 0)} MPa ; fcd = ${f(mat.fcd)} MPa ; fctm = 0,3·fck^(2/3) = ${f(mat.fctm)} MPa ; fyd = ${f(mat.fyd)} MPa ; Ecm = ${f(mat.Ecm, 0)} MPa`, "EC2 tableau 3.1"));

  // 6. Sol
  body.push(H1("6. Sol de fondation et remblai"),
    table(["Paramètre", "Valeur"], [
      ["Modèle d'appui du radier", inp.modeleSol === "winkler" ? `Sol élastique de Winkler, ks = ${f(inp.ks, 0)} kN/m³` : "Radier rigide, réaction linéaire"],
      ["Poids volumique du sol γ", `${f(inp.gammaSol, 1)} kN/m³`], ["φ' / c'", `${f(inp.phiSol, 0)}° / ${f(inp.cSol, 0)} kPa`],
      ["Module E / ν", `${f(inp.EsSol, 0)} MPa / ${f(inp.nuSol)}`],
      ["Contrainte admissible (étude géotechnique)", inp.qadm !== null ? `${f(inp.qadm)} MPa` : "non renseignée"],
      ["Ancrage du radier Df", `${f(inp.Df)} m`],
      ["Remblai : γ / Kmax / Kmin", `${f(inp.gammaR, 1)} kN/m³ / ${f(inp.Kmax)} / ${f(inp.Kmin)}`],
      ["Nappe", inp.nappe ? `hw = ${f(inp.hw)} m au-dessus de la sous-face du radier` : "non"],
    ], [0.45, 0.55]));

  // 7. Modèle
  body.push(H1("7. Modélisation"),
    P(`L'ouvrage est modélisé en portique plan fermé par bande de 1 m, tracé sur les fibres moyennes (méthode des déplacements, éléments de poutre). Les axes des piédroits sont aux abscisses ${an.model.xs.map((x) => f(x)).join(" ; ")} m ; la dalle et le radier sont distants de ${f(an.model.yTop - an.model.yBot)} m entre fibres moyennes. Le modèle comporte ${an.model.nodes.length} nœuds et ${an.model.elems.length} éléments (longueur ≤ 0,125 m).`),
    P(inp.modeleSol === "winkler"
      ? `Le radier repose sur des ressorts verticaux de raideur ks × largeur tributaire (ks = ${f(inp.ks, 0)} kN/m³). Le contact est vérifié a posteriori : la pression minimale de service doit rester positive (§ 17).`
      : "Le radier est supposé rigide vis-à-vis du sol : chaque cas de charge est équilibré par une réaction linéaire (trapézoïdale) du sol."),
    P("Le modèle étant linéaire, les convois sont déplacés à l'aide des lignes d'influence obtenues pour une charge unitaire sur chaque nœud de la dalle. Les sollicitations de dimensionnement sont prises au nu des appuis."));

  // 8. Charges permanentes
  const cl = an.caseLoads;
  body.push(H1("8. Charges permanentes"),
    FORMULA(`Poids propre de la dalle : g1 = γBA·es = ${f(inp.gammaBA, 0)} × ${f(inp.es)} = ${f(cl.selfTop)} kN/m²`),
    FORMULA(`Remblai et chaussée : g2 = γr·hr + γch·ech = ${f(inp.gammaR, 0)} × ${f(inp.hr)} + ${f(inp.gammaCh, 0)} × ${f(inp.ech)} = ${f(cl.gTop)} kN/m²`),
    FORMULA(`Poids propre du radier : ${f(cl.selfRaft)} kN/m² ; piédroits : ${cl.selfWalls.map((w) => f(w)).join(" ; ")} kN par mètre de bande`),
    P("Le poids des goussets est ramené aux nœuds d'angle."));

  // 9. Poussées
  const sigTop = cl.gTop, sigBot = cl.gTop + inp.gammaR * Hout;
  body.push(H1("9. Poussée des terres"),
    FORMULA(`σv(z) = g2 + γr·z ; σh = K·σv' + u — en tête : σv = ${f(sigTop)} kPa ; en pied : σv = ${f(sigBot)} kPa`),
    FORMULA(`Pmax : K = ${f(inp.Kmax)} → σh de ${f(inp.Kmax * sigTop)} à ${f(inp.Kmax * sigBot)} kPa ; Pmin : K = ${f(inp.Kmin)} → σh de ${f(inp.Kmin * sigTop)} à ${f(inp.Kmin * sigBot)} kPa`, "Guide SETRA PICF"),
    P(inp.pousseeMode === "repos" ? "Hypothèse retenue : terres au repos K0 = 1 − sin φ' ; la poussée minimale est une fraction de K0."
      : inp.pousseeMode === "active" ? "Hypothèse retenue : poussée active de Rankine Ka = tan²(45° − φ'/2), justifiée par un déplacement suffisant des piédroits ; la poussée minimale est une fraction de Ka."
      : "Hypothèse retenue : encadrement de la poussée entre Kmin et Kmax (guide SETRA PICF)."),
    P("Les deux situations sont combinées séparément (poussée maximale défavorable aux piédroits, poussée minimale défavorable à la dalle et au radier en travée)."),
    ...(inp.nappe ? [P(`Nappe à ${f(inp.hw)} m au-dessus de la sous-face du radier : poussée calculée avec les contraintes effectives, plus la pression hydrostatique.`)] : []),
    H1("10. Surcharge sur remblai"),
    FORMULA(`Surcharge q = ${f(inp.qRemblai, 0)} kN/m² → poussée uniforme Kmax·q = ${f(inp.Kmax * inp.qRemblai)} kPa sur les deux piédroits, combinée avec chaque convoi (même coefficient).`));

  // 11. Charges routières
  const ctx = an.ctx;
  const D = diffusionDepth(inp);
  body.push(H1("11. Charges routières — Fascicule 61 titre II"),
    table(["Paramètre", "Valeur"], [
      ["Classe du pont", `${ctx.classe}${ctx.classe === 1 ? "re" : "e"} classe`],
      ["Nombre de voies nv = E(Lc/3)", String(ctx.nv)], ["Largeur d'une voie V = Lc/nv", `${f(ctx.V)} m`],
      ["V0", `${f(ctx.V0)} m`], ["a1", f(ctx.a1)], ["a2 = V0/V", f(ctx.a2, 3)],
    ], [0.5, 0.5]),
    H2("11.1 Convois retenus et majoration dynamique"),
    FORMULA("δ = 1 + 0,4/(1 + 0,2·L) + 0,6/(1 + 4·G/S)", "Fascicule 61 titre II, art. 5.5"),
    FORMULA(`L = ${f(B)} m (largeur de l'ouvrage) ; G = (g1 + g2)·L·Lr = ${f((cl.selfTop + cl.gTop) * B * inp.Lr, 0)} kN`),
    table(["Convoi", "Description", "Coef.", "S (kN)", "δ", "γ ELU", "γ ELS"],
      an.traffic.map((t) => [t.def.label, t.def.description + (t.info ? ` ${t.info}` : ""),
        t.def.configs.length ? t.def.configs.map((c) => f(c.coef)).join("/") : "a1·a2", t.S ? f(t.S, 0) : "—", f(t.delta, 3), f(t.def.gammaU, 3), f(t.def.gammaS, 2)]),
      [0.08, 0.46, 0.08, 0.08, 0.08, 0.11, 0.11]),
    ...convoyLibrary(inp, ctx).filter((d) => d.notApplicable).map((d) => P(`${d.label} : ${d.notApplicable}`, { italic: true })),
    H2("11.2 Diffusion des charges"),
    FORMULA(`Diffusion dans le remblai (tan θ = ${f(inp.tanDiff)}) puis à 45° dans le béton jusqu'au plan moyen : d = tanθ·(hr + ech) + es/2 = ${f(D, 3)} m`),
    FORMULA("Empreinte diffusée : a' = a + 2d ; b' = b + 2d."),
    FORMULA(`Largeur de répartition transversale (dalle portant dans un sens, charge localisée) : b = b' + 0,5·L, L = ${f(Math.min(...inp.openings))} m → q = P/(a'·b) ; la bande de 1 m retenue est la plus chargée en travers de la chaussée.`),
    P(`Les convois sont déplacés par pas de ${f(inp.pas)} m dans les deux sens de circulation, depuis l'entrée jusqu'à la sortie complète de l'ouvrage. A(l) est chargé sur les zones de même signe des lignes d'influence, avec la longueur chargée correspondante.`));

  // 14. Positions défavorables
  const dalleMid = an.model.members.filter((m) => m.kind === "dalle").map((m) => m.station0 + Math.floor(m.nodes.length / 2));
  body.push(H1("12. Positions défavorables des convois"),
    table(["Convoi", "Effet (travée de dalle)", "Valeur caractéristique", "Position de l'essieu de référence", "Configuration"],
      an.traffic.filter((t) => t.positions.length).map((t) => {
        let best = dalleMid[0];
        for (const q of dalleMid) if (t.max[q] > t.max[best]) best = q;
        const pos = t.positions[t.argMax[best]];
        return [t.def.label, "M max (mi-travée)", `${f(t.max[best])} kN·m/m`,
          pos ? `x = ${f(pos.X)} m${pos.reversed ? " (sens inverse)" : ""}` : "—", pos ? t.def.configs[pos.config].label : "—"];
      }), [0.12, 0.22, 0.2, 0.26, 0.2]),
    ...(images.convois ?? []).flatMap((c, i) => image(c.img, 600, `Figure C${i + 1} — Convoi ${c.label} à la position du moment maximal en travée : vue en long avec diffusion, vue en plan avec empreintes diffusées et bande de calcul.`)),
    ...(images.passagePlus || images.passageMoins ? [
      H2("Simulation du passage des convois → enveloppe exacte"),
      P("Chaque convoi est promené sur l'ouvrage au pas de calcul, dans les deux sens et dans toutes ses configurations. Les courbes donnent le moment au point le plus sollicité de la dalle en fonction de la position de l'essieu de référence ; leur extremum est la valeur retenue dans l'enveloppe.", { size: 18 }),
    ] : []),
    ...image(images.passagePlus, 600, "Figure C+ — Passage des convois : moment positif au point critique de la dalle (travée)."),
    ...image(images.passageMoins, 600, "Figure C− — Passage des convois : moment négatif au point critique de la dalle (appui)."));

  // 15. Combinaisons
  body.push(H1("13. Combinaisons d'actions"),
    P("ELU fondamental : 1,35·G + 1,35·Pmax (ou G + Pmin) + γQ·(Q + q remblai), avec γQ = 1,605 pour A et B (1,5 × 1,07), 1,35 pour les charges militaires et exceptionnelles. ELS : G + P + γQ·(Q + q), γQ = 1,2 (A, B) ou 1,0 (M, D). Contrôle EC2 : combinaisons EN 1990 (6.10) avec γQ = 1,35."),
    table(["N°", "État", "Combinaison"],
      [...an.combos].sort((a, b) => ["ELU", "ELS", "EC2"].indexOf(a.state) - ["ELU", "ELS", "EC2"].indexOf(b.state) || a.id.localeCompare(b.id))
        .map((c) => [c.id, c.state, c.label]), [0.12, 0.1, 0.78]));

  // 16. Sollicitations
  body.push(H1("14. Sollicitations"),
    table(["Barre", "M ELU max", "M ELU min", "M ELS max", "M ELS min", "V ELU |max|", "N ELU min"],
      an.model.members.map((m) => {
        const r = (arr: Float64Array, off: number, fn: (a: number, b: number) => number, init: number) => {
          let v = init;
          m.nodes.forEach((_, k) => { v = fn(v, arr[off + m.station0 + k]); });
          return v;
        };
        const vmax = Math.max(r(an.elu.max, ns, Math.max, -Infinity), -r(an.elu.min, ns, Math.min, Infinity));
        return [m.label, f(r(an.elu.max, 0, Math.max, -Infinity), 1), f(r(an.elu.min, 0, Math.min, Infinity), 1),
          f(r(an.els.max, 0, Math.max, -Infinity), 1), f(r(an.els.min, 0, Math.min, Infinity), 1), f(vmax, 1), f(r(an.elu.min, 2 * ns, Math.min, Infinity), 1)];
      }), [0.28, 0.12, 0.12, 0.12, 0.12, 0.12, 0.12]),
    P("Unités : kN·m/m et kN/m. Convention : M > 0 tend la face inférieure de la dalle, la face inférieure du radier et la face droite des piédroits ; N > 0 en traction.", { italic: true, size: 17 }),
    ...image(images.moments, 600, "Figure 2 — Enveloppe des moments fléchissants ELU (kN·m/m), tracée côté fibre tendue."),
    ...image(images.tranchant, 600, "Figure 3 — Enveloppe des efforts tranchants ELU (kN/m)."),
    ...image(images.moments3d, 600, "Figure 3 bis — Enveloppe des moments ELU tracée sur la maquette 3D, valeurs extrêmes repérées (rouge : moments positifs, bleu : moments négatifs)."),
    ...image(images.tranchant3d, 600, "Figure 3 ter — Enveloppe des efforts tranchants ELU sur la maquette 3D, valeurs extrêmes repérées."));

  // 17. Réactions du sol
  body.push(H1("15. Réactions du sol"),
    table(["Grandeur", "Valeur"], [
      ["Pression maximale ELS", `${f(geo.pMaxELS, 1)} kPa`], ["Pression minimale ELS", `${f(geo.pMinELS, 1)} kPa`],
      ["Pression maximale ELU", `${f(geo.pMaxELU, 1)} kPa`], ["qref ELS = (3σmax + σmin)/4", `${f(geo.qrefELS, 1)} kPa`],
      ["qref ELU", `${f(geo.qrefELU, 1)} kPa`],
    ], [0.5, 0.5]));

  // 18. Dimensionnement
  body.push(H1("16. Dimensionnement du béton armé"),
    FORMULA("μ = Mu/(b·d²·fbu) ; α = 1,25·(1 − √(1 − 2μ)) ; z = d·(1 − 0,4α) ; As,u = Mu/(z·fsu)", "BAEL A.4.3"),
    FORMULA("ELS : y1 solution de b·y²/2 − 15·As·(d − y) = 0 ; I = b·y1³/3 + 15·As·(d − y1)² ; σs = 15·Ms·(d − y1)/I ≤ σ̄s", "BAEL A.4.5"),
    FORMULA("As,min = max(0,23·b·d·ft28/fe ; EC2 : max(0,26·fctm/fyk ; 0,0013)·b·d)", "BAEL A.4.2 / EC2 9.2.1.1"),
    table(["Nappe", "h / d (m)", "Mu / Ms", "As ELU", "As ELS", "As min", "As req.", "Choix", "As fournie"],
      design.groups.map((g) => [g.label, `${f(g.h)} / ${f(g.d, 3)}`, `${f(g.Mu, 1)} / ${f(g.Ms, 1)}`, f(g.AsELU), f(g.AsELS), f(g.AsMin), f(g.AsReq),
        `HA${g.bars.phi} e=${f(g.bars.s * 100, 1)}${g.imposed ? " (imposé)" : ""}`, f(g.bars.As * 1e4)]),
      [0.24, 0.09, 0.1, 0.08, 0.08, 0.08, 0.08, 0.15, 0.1]),
    P("Sections d'acier en cm²/m, moments en kN·m/m. Les nappes symétriques sont uniformisées (même diamètre, même espacement).", { italic: true, size: 17 }),
    table(["Nappe", "Combinaison ELU", "Combinaison ELS", "Section déterminante"], design.groups.map((g) => [g.label, g.comboU, g.comboS, g.governing]), [0.3, 0.14, 0.14, 0.42]));

  // 19-22 Vérifications
  const by = (d: string) => study.checks.filter((c) => c.domain === d);
  body.push(H1("17. Vérifications de résistance (ELU)"), checksTable(by("Dimensionnement des sections")),
    H1("18. Vérifications de service (ELS)"), checksTable(by("Contraintes de service (ELS)")),
    H1("19. Effort tranchant"),
    table(["Barre", "Vu au nu", "τu (MPa)", "Vu à d", "VEd EC2 à d", "VRd,c"],
      design.shear.map((s) => [s.member, f(s.VuFace, 1), f(s.tau, 3), f(s.VuD, 1), f(s.VEd, 1), f(s.VRdc, 1)]),
      [0.34, 0.12, 0.12, 0.14, 0.14, 0.14]),
    checksTable(by("Effort tranchant")),
    H1("20. Dispositions constructives"), checksTable(by("Dispositions constructives")),
    H1("21. Contrôle Eurocode 2"),
    FORMULA("MRd = As·fyd·(d − 0,4x), x = As·fyd/(0,8·b·fcd) ; VRd,c = max(CRd,c·k·(100·ρl·fck)^(1/3) ; 0,035·k^1,5·fck^0,5)·b·d", "EC2 6.1 / 6.2.2"),
    FORMULA("wk = sr,max·(εsm − εcm) ; sr,max = 3,4·c + 0,425·k1·k2·Ø/ρp,eff", "EC2 7.3.4"),
    checksTable(by("Contrôle Eurocode 2")),
    H2("Contrôles internes du modèle de calcul"),
    P("Ces contrôles ne justifient pas l'ouvrage : ils établissent que le modèle porte exactement les charges annoncées (équilibre des réactions du sol, poids propre, remblai, symétrie) et que chaque convoi a bien été promené sur la dalle.", { italic: true, size: 18 }),
    checksTable(by("Contrôles du modèle et hypothèses")));

  // 23. Géotechnique
  const gf = geo.factors;
  body.push(H1("22. Vérifications géotechniques"),
    FORMULA(`Portance : qu = c·Nc·sc + q0·Nq·sq + 0,5·γ'·B·Nγ·sγ, avec Nq = ${f(gf.Nq)}, Nc = ${f(gf.Nc)}, Nγ = ${f(gf.Ng)}, sq = ${f(gf.sq)}, sγ = ${f(gf.sg)}, sc = ${f(gf.sc)}, q0 = ${f(gf.q0, 1)} kPa → qu = ${f(geo.qu, 0)} kPa`, "EC7 annexe D"),
    FORMULA(`${study.checks.find((c) => c.id === "G-TASS")?.label ?? "Tassement"} = ${f(geo.settlement)} cm`),
    ...(geo.slope ? [FORMULA(`Talus : cercle critique centre (${f(geo.slope.xc)} ; ${f(geo.slope.yc)}) m, R = ${f(geo.slope.R)} m → FS = ${f(geo.slope.FS)}`, "Fellenius")] : []),
    checksTable(by("Géotechnique et stabilité")));

  // 24. Têtes
  const w = heads.wing, hw = heads.headWall;
  const dm = headDimensions(inp);
  body.push(H1("23. Ouvrages de tête"),
    table(["Dimension", "Valeur"], [
      ["Ailes : longueur / épaisseur / angle sur l'axe", inp.tetes.murs ? `${f(inp.tetes.long)} m / ${f(inp.tetes.ep)} m / ${f(inp.tetes.angle, 1)}°` : "sans"],
      ["Hauteur des ailes à la racine / en extrémité", inp.tetes.murs ? `${f(dm.Htot)} m / ${f(dm.Hend)} m` : "—"],
      ["Projection des ailes le long de l'axe / en travers", `${f(dm.along)} m / ${f(dm.across)} m`],
      ["Radier de tête : longueur", `${f(inp.tetes.radierLong)} m`],
      ["Radier de tête : petite base (B + 2·débord) / grande base", `${f(dm.pb)} m / ${f(dm.gb)} m`],
      ["Longueur d'aile recommandée (H − 0,60)·m / cos α", inp.tetes.murs ? `${f(dm.longRec)} m` : "—"],
    ], [0.6, 0.4]),
    FORMULA(`Ka = tan²(45° − φ/2) = ${f(hw.Ka, 3)} (φ = ${f(inp.talus.phi, 0)}°)`, "Rankine"),
    FORMULA(`Mur de tête (h = ${f(hw.H)} m, e = ${f(hw.e)} m) : Mu = 1,35·Ka·γ·h³/6 + 1,5·Ka·q·h²/2 = ${f(hw.M, 1)} kN·m/m → HA${hw.bars.phi} e = ${f(hw.bars.s * 100, 1)} cm`),
    ...(w ? [
      FORMULA(`Mur en aile à l'enracinement (H = ${f(w.Htot)} m, extrémité ${f(w.Hend)} m) : Mu = ${f(w.M, 1)} kN·m/m → HA${w.bars.phi} e = ${f(w.bars.s * 100, 1)} cm`),
      table(["Stabilité du mur en aile", "Valeur", "Limite"], [
        ["Renversement FS", f(w.FSr), "≥ 1,50"], ["Glissement FS", f(w.FSg), "≥ 1,50"],
        ["Excentricité |e|", `${f(Math.abs(w.e0))} m`, `≤ B/6 = ${f(w.B / 6)} m`], ["Contrainte maximale", `${f(w.sigmaMax, 0)} kPa`, `≤ ${f(w.qAllow, 0)} kPa`],
      ], [0.5, 0.25, 0.25]),
    ] : []),
    checksTable(by("Ouvrages de tête")));

  // 25. Synthèse ferraillage
  body.push(H1("24. Synthèse du ferraillage"),
    table(["Nappe", "Armatures principales", "Répartition"],
      design.groups.map((g) => [g.label, `HA${g.bars.phi} e = ${f(g.bars.s * 100, 1)} cm (${f(g.bars.As * 1e4)} cm²/m)`, `HA${g.rep.phi} e = ${f(g.rep.s * 100, 1)} cm`]), [0.4, 0.35, 0.25]),
    ...image(images.ferraillage, 600, "Figure 4 — Ferraillage de la section courante."),
    ...image(images.ferraillage3d, 600, "Figure 5 — Maquette 3D ferraillée, barre par barre : corps, murs et radiers de tête, bêches, murs en aile et semelles."));

  // 26. Métré
  body.push(H1("25. Métré et nomenclature des aciers"),
    table(["Lot", "Désignation", "Unité", "Quantité"], qt.lines.map((l) => [l.lot, l.designation, l.unit, f(l.quantity, l.unit === "kg" ? 0 : 2)]), [0.14, 0.62, 0.08, 0.16]),
    P(`Ratio d'acier : ${f(qt.ratio, 0)} kg/m³ de béton armé.`),
    table(["Rep.", "Élément", "Désignation", "Ø", "e (cm)", "Forme", "L unit. (m)", "Nb", "Masse (kg)"],
      qt.bars.map((b) => [b.rep, b.element, b.designation, b.phi, f(b.s * 100, 1), `${b.shape} ${b.dims.map((d) => f(d)).join("+")}`, f(b.length), b.count, f(b.mass, 1)]),
      [0.05, 0.13, 0.3, 0.05, 0.07, 0.17, 0.08, 0.06, 0.09]));

  // 27. Valeurs par défaut
  const defs = study.defaultsInPlace.map((k) => FIELD_BY_KEY[k]).filter(Boolean);
  body.push(H1("26. Valeurs par défaut restées en place"),
    defs.length === 0
      ? P("Toutes les données ont été saisies ou confirmées par l'utilisateur.")
      : P("Les données suivantes proviennent des valeurs proposées par défaut et n'ont pas été confirmées. Elles doivent être validées par le bureau d'études :"),
    ...(defs.length ? [table(["Donnée", "Valeur retenue"], defs.map((d) => [d.label, `${formatValue(study.values[d.key])} ${d.unit ?? ""}`]), [0.7, 0.3])] : []));

  // 28. Conclusion
  const nc = study.checks.filter((c) => c.status === "non_conforme");
  const nv = study.checks.filter((c) => c.status === "non_verifie");
  body.push(H1("27. Conclusion"),
    P(`Sur ${study.checks.length} vérifications : ${counts.conforme} conformes, ${counts.non_conforme} non conformes, ${counts.non_verifie} non vérifiées et ${counts.non_applicable} non applicables (avec leur justification). Statut global : ${statusText}.`, { bold: true }),
    ...(nc.length ? [P("Vérifications non conformes à traiter :"), ...nc.map((c) => BULLET(`${c.element} — ${c.label} (${f(c.value, 3)} pour ${f(c.limit, 3)} ${c.unit ?? ""})`))] : []),
    ...(nv.length ? [P("Vérifications restées ouvertes :"), ...nv.map((c) => BULLET(`${c.element} — ${c.label}${c.detail ? ` : ${c.detail}` : ""}`))] : []),
    ...(nc.length === 0 && nv.length === 0 ? [P("L'ouvrage est justifié sous les hypothèses de la présente note.")] : []),
    P(" "),
    P("Avertissement : ce document est produit par un outil d'aide au calcul. Les résultats, la note et les plans doivent être vérifiés, interprétés et validés par un ingénieur qualifié, qui en reste responsable.", { italic: true, size: 17, color: "64748B" }));

  const header = new Header({
    children: [new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "1E3A5F", space: 4 } },
      children: [
        new TextRun({ text: `Note de calcul — ${id.projet} — ${id.ouvrage}`, size: 16, font: FONT, color: "1E3A5F", bold: true }),
        new TextRun({ text: `\tAuteur : ${id.auteur}`, size: 16, font: FONT, color: "475569" }),
      ],
      tabStops: [{ type: "right", position: 9638 }],
    })],
  });
  const footer = new Footer({
    children: [new Paragraph({
      tabStops: [{ type: "right", position: 9638 }],
      children: [
        new TextRun({ text: `${id.dossier} — indice ${id.indice || "A"} — empreinte ${study.fingerprint} — ${today}`, size: 15, font: FONT, color: "64748B" }),
        new TextRun({ children: ["\tPage ", PageNumber.CURRENT, " / ", PageNumber.TOTAL_PAGES], size: 15, font: FONT, color: "64748B" }),
      ],
    })],
  });

  const doc = new Document({
    creator: id.auteur,
    title: `Note de calcul — ${id.projet}`,
    description: "Note de calcul de dalot cadre (BAEL 91 mod. 99, Fascicule 61 titre II, contrôle EC2)",
    features: { updateFields: true },
    styles: {
      default: { document: { run: { font: FONT, size: 20 } } },
      paragraphStyles: [
        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: FONT, size: 28, bold: true, color: "1E3A5F" } },
        { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: FONT, size: 23, bold: true, color: "334155" } },
      ],
    },
    sections: [{
      properties: { page: { margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
      headers: { default: header },
      footers: { default: footer },
      children: body,
    }],
  });
  return Packer.toBlob(doc);
}

function formatValue(v: unknown) {
  if (typeof v === "number") return f(v, Math.abs(v) >= 100 ? 0 : 2);
  if (typeof v === "boolean") return v ? "oui" : "non";
  return v === null || v === undefined || v === "" ? "—" : String(v);
}
