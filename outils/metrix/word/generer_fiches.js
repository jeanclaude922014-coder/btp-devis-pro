// Fiches qualité Word – Auteur : Moulo Jean Claude
// Usage : node generer_fiches.js  (produit les .docx dans ce dossier)
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, Header, Footer,
  AlignmentType, WidthType, ShadingType, BorderStyle, PageNumber, PositionalTab,
  PositionalTabAlignment, PositionalTabRelativeTo, PositionalTabLeader, VerticalAlign, Tab, TabStopType,
} = require("docx");

const AUTEUR = "Moulo Jean Claude";
const VERT = "1B5E20", VERT2 = "2E7D32", CLAIR = "E8F5E9", GRIS = "616161";
const FONT = "Arial";
const W = 10206; // largeur utile A4 (marges 0,75 po ≈ 1080 dxa de chaque côté) : 11906 - 2*850
const B = { style: BorderStyle.SINGLE, size: 4, color: "9E9E9E" };
const BORDERS = { top: B, bottom: B, left: B, right: B };

const t = (text, o = {}) => new TextRun({ text, font: FONT, size: o.size || 19, bold: o.bold, color: o.color, italics: o.italics });
const p = (runs, o = {}) => new Paragraph({
  children: Array.isArray(runs) ? runs : [t(runs, o)],
  alignment: o.align, spacing: { before: o.before ?? 40, after: o.after ?? 40 },
});

function cell(content, width, o = {}) {
  const paras = (Array.isArray(content) ? content : [content]).map(c =>
    c instanceof Paragraph ? c : p(String(c), { bold: o.bold, color: o.color, size: o.size, align: o.align }));
  return new TableCell({
    children: paras, width: { size: width, type: WidthType.DXA }, borders: BORDERS,
    columnSpan: o.span, verticalAlign: VerticalAlign.CENTER,
    shading: o.fill ? { type: ShadingType.CLEAR, color: "auto", fill: o.fill } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
  });
}
function table(widths, rows) {
  return new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: widths, rows });
}
const row = cells => new TableRow({ children: cells });

function titreSection(txt) {
  return table([W], [row([cell(p([t(txt, { bold: true, color: "FFFFFF", size: 21 })]), W, { fill: VERT2 })])]);
}
// tableau « libellé : zone à remplir »
function champs(lignes, wl = 3400) {
  return table([wl, W - wl], lignes.map(([l, v]) => row([
    cell(p([t(l, { bold: true })]), wl, { fill: CLAIR }), cell(v || "", W - wl)])));
}
const cases = items => items.map(i => "☐ " + i).join("     ");
const espace = (n = 1) => Array.from({ length: n }, () => p(""));
function zoneTexte(lib, nb = 3) {
  return table([W], [row([cell([p([t(lib, { bold: true })]), ...espace(nb)], W)])]);
}
function signatures(cols) {
  const w = Math.floor(W / cols.length);
  const ws = cols.map((_, i) => i === cols.length - 1 ? W - w * (cols.length - 1) : w);
  return table(ws, [
    row(cols.map((c, i) => cell(p([t(c, { bold: true, color: "FFFFFF" })], { align: AlignmentType.CENTER }), ws[i], { fill: VERT2 }))),
    row(cols.map((_, i) => cell([p("Nom : "), p("Date : "), p("Visa :"), ...espace(2)], ws[i]))),
  ]);
}

function entete(titreDoc, ref) {
  return new Header({ children: [
    new Paragraph({
      tabStops: [{ type: TabStopType.RIGHT, position: W }],
      children: [
        t("MOULO JEAN CLAUDE", { bold: true, color: VERT, size: 22 }),
        new TextRun({ children: [new Tab(), titreDoc],
          font: FONT, size: 18, bold: true, color: VERT2 }),
      ],
    }),
    new Paragraph({
      tabStops: [{ type: TabStopType.RIGHT, position: W }],
      children: [
        t("Technicien génie civil BTP – Abidjan, Côte d'Ivoire", { size: 16, color: GRIS }),
        new TextRun({ children: [new Tab(), ref],
          font: FONT, size: 16, color: GRIS }),
      ],
      border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: VERT, space: 4 } },
      spacing: { after: 120 },
    }),
  ] });
}
function pied() {
  return new Footer({ children: [new Paragraph({
    tabStops: [{ type: TabStopType.RIGHT, position: W }],
    border: { top: { style: BorderStyle.SINGLE, size: 4, color: "9E9E9E", space: 4 } },
    children: [
      t("Auteur : " + AUTEUR + " – Réf. : CCTP, EC2 / BAEL, EC3", { size: 14, color: GRIS }),
      new TextRun({ children: [new Tab(),
        "Page ", PageNumber.CURRENT, " / ", PageNumber.TOTAL_PAGES], font: FONT, size: 14, color: GRIS }),
    ],
  })] });
}
function grandTitre(txt, sous) {
  return [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60, after: 20 },
      children: [t(txt, { bold: true, size: 30, color: VERT })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 },
      children: [t(sous, { italics: true, size: 17, color: GRIS })] }),
  ];
}
const COMPOS = ["Route en terre", "Points critiques", "Buses Ø800 / Ø1000", "Dalots", "Bâtiment TCE", "Clôture", "Charpente métallique"];
const ident = () => champs([
  ["Marché / chantier", ""],
  ["Maître d'ouvrage / Mission de contrôle", ""],
  ["Entreprise", ""],
  ["Composante", cases(COMPOS.slice(0, 4))],
  ["", cases(COMPOS.slice(4))],
  ["Ouvrage / PK / localisation", ""],
]);

function doc(titreDoc, ref, enfants) {
  return new Document({
    creator: AUTEUR, title: titreDoc, description: titreDoc + " – " + AUTEUR,
    styles: { default: { document: { run: { font: FONT, size: 19 } } } },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 },
        margin: { top: 1300, bottom: 1000, left: 850, right: 850, header: 500, footer: 450 } } },
      headers: { default: entete(titreDoc, ref) }, footers: { default: pied() }, children: enfants,
    }],
  });
}
const gap = () => p("", { before: 0, after: 80 });

// ------------------------------------------------ FICHE DE POINT D'ARRÊT
const POINTS = [
  ["Implantation, cotes et niveaux (axes, fil d'eau, arases)", "Conformes aux plans d'exécution"],
  ["Fond de fouille / support (nature, portance, propreté)", "Sol sain, sec, conforme à la note de calcul"],
  ["Diamètres et nombre de barres", "Conformes aux plans BA (EC2 / BAEL)"],
  ["Espacements des armatures et cadres", "Conformes aux plans, tolérance ± 1 cm"],
  ["Recouvrements et ancrages", "Longueurs conformes aux plans / EC2"],
  ["Enrobage (cales en place)", "≥ 3 cm (milieu humide) ou selon plans"],
  ["Coffrage : stabilité, étanchéité, propreté", "Étaiement suffisant, joints étanches, huilé"],
  ["Compactage / densité (remblais, couches latéritiques)", "≥ 95 % OPM, couches ≤ 20 cm"],
  ["Réservations, attentes, inserts, tiges d'ancrage", "Positions conformes (± 5 mm pour ancrages)"],
  ["Moyens de bétonnage et de cure prêts", "Formulation validée, éprouvettes, eau / bâches"],
];
const wPts = [500, 3500, 3100, 2006, 1100];
const pa = doc("FICHE DE POINT D'ARRÊT", "Réf. : FPA-____ / Registre 12_Controle_qualite", [
  ...grandTitre("FICHE DE POINT D'ARRÊT (PA)",
    "Aucune phase suivante ne peut être engagée avant la levée écrite du point d'arrêt par la mission de contrôle."),
  champs([["N° de point d'arrêt", "FPA-______          Réf. registre : CQ-______"]]),
  gap(), titreSection("1. IDENTIFICATION"), ident(),
  champs([["Opération soumise au PA", ""],
          ["Plans / documents de référence", "Plan n° ______ indice ___   Note de calcul (EC2 / BAEL / EC3) n° ______"]]),
  gap(), titreSection("2. DEMANDE DE L'ENTREPRISE"),
  champs([["Date et heure de la demande", ""], ["Visite souhaitée le", "____ / ____ / ________   à ____ h ____"],
          ["Autocontrôle réalisé", cases(["Oui", "Non"]) + "     Résultats joints : " + cases(["Oui", "Non"])]]),
  zoneTexte("Description des travaux prêts à être contrôlés :", 2),
  champs([["Chef de chantier (nom, visa)", ""]]),
  gap(), titreSection("3. POINTS VÉRIFIÉS CONTRADICTOIREMENT"),
  table(wPts, [
    row(["N°", "Point de contrôle", "Critère d'acceptation", "Constaté / mesuré", "C / NC"].map((h, i) =>
      cell(p([t(h, { bold: true, color: "FFFFFF" })], { align: AlignmentType.CENTER }), wPts[i], { fill: VERT2 }))),
    ...POINTS.map((pt, i) => row([cell(String(i + 1), wPts[0], { align: AlignmentType.CENTER }), cell(pt[0], wPts[1]),
      cell(p([t(pt[1], { size: 17, color: GRIS })]), wPts[2]), cell("", wPts[3]), cell("☐ C   ☐ NC", wPts[4], { size: 16 })])),
    ...[11, 12, 13].map(n => row([cell(String(n), wPts[0], { align: AlignmentType.CENTER }), cell("", wPts[1]),
      cell("", wPts[2]), cell("", wPts[3]), cell("☐ C   ☐ NC", wPts[4], { size: 16 })])),
  ]),
  p([t("Rayer les points sans objet. C = conforme, NC = non conforme.", { italics: true, size: 16, color: GRIS })]),
  gap(), titreSection("4. DÉCISION DE LA MISSION DE CONTRÔLE"),
  table([W], [row([cell([
    p("☐  PA LEVÉ – poursuite des travaux autorisée"),
    p("☐  PA LEVÉ AVEC RÉSERVES – poursuite autorisée, réserves à lever avant le : ____ / ____ / ________"),
    p("☐  PA NON LEVÉ – reprise exigée (fiche de non-conformité n° NC-______) et nouvelle visite à programmer"),
  ], W)])]),
  zoneTexte("Observations / réserves :", 3),
  gap(), signatures(["Pour l'entreprise", "Pour la mission de contrôle", "Pour le maître d'ouvrage (facultatif)"]),
]);

// --------------------------------- FICHE DE NON-CONFORMITÉ & PV DE LEVÉE
const wV = [3000, 2400, 2400, 2406];
const nc = doc("FICHE DE NON-CONFORMITÉ & PV DE LEVÉE", "Réf. : NC-____ / Registre 12_Controle_qualite", [
  ...grandTitre("FICHE DE NON-CONFORMITÉ & PV DE LEVÉE",
    "Une non-conformité reste ouverte jusqu'à la signature du PV de levée (partie D) et la saisie de la date de levée au registre."),
  champs([["N° de non-conformité", "NC-______          Réf. contrôle : CQ-______          Incident lié : INC-______"]]),
  gap(), titreSection("A. CONSTAT"), ident(),
  champs([
    ["Date du constat", ""],
    ["Détectée par", cases(["Autocontrôle entreprise", "Mission de contrôle", "Laboratoire", "Maître d'ouvrage"])],
    ["Exigence non respectée", "Critère : ____________________   Valeur exigée : ________   Valeur mesurée : ________"],
    ["Gravité", cases(["Mineure", "Moyenne", "Majeure"])],
    ["Conséquence immédiate", cases(["Arrêt de la phase (PA)", "Poursuite sous réserve", "Sans incidence immédiate"])],
  ]),
  zoneTexte("Description de la non-conformité (joindre photos, plans annotés, rapports d'essais) :", 3),
  gap(), titreSection("B. ANALYSE ET TRAITEMENT"),
  zoneTexte("Cause(s) identifiée(s) :", 2),
  champs([
    ["Traitement retenu", cases(["Reprise / correction", "Démolition – réfection"])],
    ["", cases(["Acceptation en l'état (dérogation MOE)", "Déclassement / réfaction de prix"])],
    ["Responsable du traitement", ""], ["Délai de traitement", ""], ["Coût estimé (FCFA)", ""],
  ]),
  zoneTexte("Mode opératoire de reprise :", 3),
  zoneTexte("Action préventive (pour éviter la répétition) :", 2),
  gap(), titreSection("C. VÉRIFICATION APRÈS TRAITEMENT"),
  table(wV, [
    row(["Contrôle / essai de vérification", "Critère", "Résultat", "Conclusion"].map((h, i) =>
      cell(p([t(h, { bold: true, color: "FFFFFF" })], { align: AlignmentType.CENTER }), wV[i], { fill: VERT2 }))),
    ...[1, 2, 3].map(() => row([cell("", wV[0]), cell("", wV[1]), cell("", wV[2]), cell("☐ Conforme   ☐ NC", wV[3], { size: 16 })])),
  ]),
  champs([["Date de la vérification", ""], ["Réf. rapport / PV d'essai", ""]]),
  gap(), titreSection("D. PROCÈS-VERBAL DE LEVÉE"),
  table([W], [row([cell([
    p("Les soussignés, après vérification contradictoire du traitement décrit ci-dessus, constatent que :"),
    p("☐  la non-conformité n° NC-______ est LEVÉE à compter du ____ / ____ / ________ ;"),
    p("☐  la non-conformité n'est PAS levée : nouveau traitement requis avant le ____ / ____ / ________."),
    p("Fait à ______________________, le ____ / ____ / ________"),
  ], W)])]),
  gap(), signatures(["Pour l'entreprise", "Pour la mission de contrôle", "Pour le maître d'ouvrage"]),
]);

(async () => {
  for (const [d, f] of [[pa, "Fiche_Point_Arret.docx"], [nc, "Fiche_NC_et_PV_Levee.docx"]]) {
    fs.writeFileSync(path.join(__dirname, f), await Packer.toBuffer(d));
    console.log("OK ->", f);
  }
})();
