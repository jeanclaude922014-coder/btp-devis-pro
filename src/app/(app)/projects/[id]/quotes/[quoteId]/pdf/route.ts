import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { requireSessionWithContext } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { QuotePdfDocument } from "@/lib/pdf/quote-document";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; quoteId: string }> }
) {
  const { id: projectId, quoteId } = await params;
  const { organization } = await requireSessionWithContext();

  const quote = await prisma.quote.findFirst({
    where: { id: quoteId, organizationId: organization.id, projectId },
    include: {
      project: { include: { contact: true } },
      lots: {
        orderBy: { position: "asc" },
        include: { lines: { orderBy: { position: "asc" } } },
      },
    },
  });

  if (!quote) {
    return NextResponse.json({ error: "Devis introuvable." }, { status: 404 });
  }

  const buffer = await renderToBuffer(
    QuotePdfDocument({
      organization: {
        name: organization.name,
        address: organization.address,
        phone: organization.phone,
        email: organization.email,
        primaryColor: organization.primaryColor,
        secondaryColor: organization.secondaryColor,
        pdfFooterText: organization.pdfFooterText,
      },
      project: {
        name: quote.project.name,
        city: quote.project.city,
        reference: quote.project.reference,
        contact: quote.project.contact ? { name: quote.project.contact.name } : null,
      },
      quote: {
        name: quote.name,
        currency: quote.currency,
        fgPct: quote.fgPct,
        benefitPct: quote.benefitPct,
        createdAt: quote.createdAt,
        lots: quote.lots.map((lot) => ({
          code: lot.code,
          name: lot.name,
          colorHex: lot.colorHex,
          lines: lot.lines,
        })),
      },
    })
  );

  const filename = `Devis_${quote.name.replace(/[^a-z0-9]+/gi, "_")}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
