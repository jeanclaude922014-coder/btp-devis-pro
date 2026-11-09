import { NextResponse } from "next/server";
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  Packer,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { requireSessionWithContext } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { describeAll } from "@/lib/dqe/describe";
import type { DqeData } from "@/lib/dqe/types";
import { sumHt, taxLabel, taxes } from "@/lib/dqe/totals";

const F = (n: number) => Math.round(n).toLocaleString("fr-FR").replace(/[  ]/g, " ");
const BLUE = "1E3A5F";

function cell(text: string, opts: { bold?: boolean; fill?: string; color?: string; right?: boolean; width?: number } = {}) {
  return new TableCell({
    width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    shading: opts.fill ? { type: ShadingType.CLEAR, color: "auto", fill: opts.fill } : undefined,
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
    children: [
      new Paragraph({
        alignment: opts.right ? AlignmentType.RIGHT : AlignmentType.LEFT,
        children: [new TextRun({ text, bold: opts.bold, color: opts.color, size: 18 })],
      }),
    ],
  });
}

function labelLine(label: string, text: string) {
  return new Paragraph({
    spacing: { after: 60 },
    children: [new TextRun({ text: `${label} : `, bold: true, size: 20 }), new TextRun({ text, size: 20 })],
  });
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organization, user } = await requireSessionWithContext();
  const dqe = await prisma.dqeImport.findFirst({ where: { id, organizationId: organization.id } });
  if (!dqe) return NextResponse.json({ error: "DQE introuvable." }, { status: 404 });

  const data = dqe.data as unknown as DqeData;
  const desc = describeAll(data);
  const ht = sumHt(data.items);
  const tx = taxes(ht, data.tva);
  const author = user.name;
  const today = new Date().toLocaleDateString("fr-FR");

  const header = new Header({
    children: [
      new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BLUE, space: 4 } },
        children: [
          new TextRun({ text: organization.name, bold: true, color: BLUE, size: 20 }),
          new TextRun({ text: `\t${dqe.name} — Description des lots`, size: 16, color: "555555" }),
        ],
        tabStops: [{ type: "right", position: 9638 }],
      }),
      new Paragraph({
        children: [
          new TextRun({ text: `Auteur : ${author} · Normes de référence : BAEL 91 mod. 99 / Eurocode 2 · ${today}`, size: 14, color: "777777" }),
        ],
      }),
    ],
  });

  const footer = new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: "Page ", size: 16, color: "777777" }),
          new TextRun({ children: [PageNumber.CURRENT], size: 16, color: "777777" }),
          new TextRun({ text: " / ", size: 16, color: "777777" }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: "777777" }),
        ],
      }),
    ],
  });

  const recapRows = [
    new TableRow({
      tableHeader: true,
      children: [
        cell("Ouvrage", { bold: true, fill: BLUE, color: "FFFFFF", width: 24 }),
        cell("Lot", { bold: true, fill: BLUE, color: "FFFFFF", width: 30 }),
        cell("Corps d'état", { bold: true, fill: BLUE, color: "FFFFFF", width: 20 }),
        cell("Art.", { bold: true, fill: BLUE, color: "FFFFFF", right: true, width: 6 }),
        cell("Montant HT (F)", { bold: true, fill: BLUE, color: "FFFFFF", right: true, width: 14 }),
        cell("%", { bold: true, fill: BLUE, color: "FFFFFF", right: true, width: 6 }),
      ],
    }),
    ...desc.map(
      (d) =>
        new TableRow({
          children: [
            cell(d.site),
            cell(d.title),
            cell(d.category),
            cell(String(d.articles), { right: true }),
            cell(F(d.amount), { right: true }),
            cell(`${(d.share * 100).toFixed(1).replace(".", ",")}`, { right: true }),
          ],
        })
    ),
    new TableRow({
      children: [
        cell("TOTAL HT", { bold: true, fill: "E8EEF5" }),
        cell("", { fill: "E8EEF5" }),
        cell("", { fill: "E8EEF5" }),
        cell(String(data.items.length), { bold: true, right: true, fill: "E8EEF5" }),
        cell(F(ht), { bold: true, right: true, fill: "E8EEF5" }),
        cell("100", { bold: true, right: true, fill: "E8EEF5" }),
      ],
    }),
  ];

  const lotSections = desc.flatMap((d) => {
    const parts: Paragraph[] = [
      new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 80 }, children: [new TextRun({ text: d.title, color: BLUE })] }),
    ];
    if (data.sites.length > 1) parts.push(labelLine("Ouvrage", d.site));
    parts.push(labelLine("Corps d'état", d.category));
    parts.push(new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: d.summary, size: 20 })] }));
    if (d.quantities.length) parts.push(labelLine("Quantités clés", d.quantities.join(" · ")));
    if (d.mainItems.length)
      parts.push(labelLine("Principaux postes", d.mainItems.map((m) => `${m.n ? `${m.n} ` : ""}${m.d} (${F(m.amount)} F)`).join(" ; ")));
    d.ratios.forEach((r) => parts.push(labelLine("Contrôle", r)));
    parts.push(
      new Paragraph({
        shading: { type: ShadingType.CLEAR, color: "auto", fill: "FFF7E6" },
        spacing: { after: 120 },
        children: [new TextRun({ text: "Vigilance : ", bold: true, size: 20 }), new TextRun({ text: d.note, size: 20 })],
      })
    );
    return parts;
  });

  const doc = new Document({
    creator: author,
    lastModifiedBy: author,
    title: `${dqe.name} — Description des lots`,
    description: "Description automatique des lots d'un DQE importé",
    styles: { default: { document: { run: { font: "Calibri" } } } },
    sections: [
      {
        properties: { page: { margin: { top: 1300, bottom: 1000, left: 1100, right: 1100 } } },
        headers: { default: header },
        footers: { default: footer },
        children: [
          new Paragraph({
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: "DESCRIPTION DES LOTS DU DQE", bold: true, color: BLUE })],
          }),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 }, children: [new TextRun({ text: dqe.name, size: 26 })] }),
          labelLine("Fichier source", dqe.fileName),
          labelLine("Établi par", author),
          labelLine("Date", today),
          labelLine("Composition", `${data.sites.length} ouvrage(s), ${data.lots.length} lots, ${data.items.length} articles`),
          labelLine("Montant total HT", `${F(ht)} F CFA`),
          labelLine(taxLabel(data.tva), `${F(tx.tva)} F CFA`),
          labelLine("Montant total TTC", `${F(tx.ttc)} F CFA`),
          new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 240, after: 120 }, children: [new TextRun({ text: "1. Récapitulatif par lot", color: BLUE })] }),
          new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: recapRows }),
          new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 120 }, children: [new TextRun({ text: "2. Description détaillée des lots", color: BLUE })] }),
          ...lotSections,
          new Paragraph({
            spacing: { before: 240 },
            children: [
              new TextRun({
                text: "Description générée automatiquement à partir du DQE importé. Les ratios et points de vigilance sont indicatifs (BAEL 91 mod. 99 / EC2, contexte ivoirien : sols latéritiques, climat tropical chaud et humide) et ne remplacent pas les notes de calcul d'exécution.",
                italics: true,
                size: 16,
                color: "777777",
              }),
            ],
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const safe = dqe.name.replace(/[^\p{L}\p{N}]+/gu, "_").slice(0, 60);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="Description_lots.docx"; filename*=UTF-8''${encodeURIComponent(`Description_lots_${safe}.docx`)}`,
    },
  });
}
