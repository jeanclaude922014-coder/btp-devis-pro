import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { requireSessionWithContext } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { FloorPlanPdfDocument } from "@/lib/pdf/floor-plan-document";
import type { FloorPlanSpec } from "@/lib/floor-plan/types";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organization } = await requireSessionWithContext();

  const floorPlan = await prisma.floorPlan.findFirst({
    where: { id, organizationId: organization.id },
  });

  if (!floorPlan) {
    return NextResponse.json({ error: "Plan introuvable." }, { status: 404 });
  }

  const spec = floorPlan.spec as unknown as FloorPlanSpec;

  if (spec.floors.length === 0) {
    return NextResponse.json(
      { error: "Le plan n'est pas encore généré. Terminez la conversation avec l'assistant." },
      { status: 400 }
    );
  }

  const buffer = await renderToBuffer(
    FloorPlanPdfDocument({
      organization: {
        name: organization.name,
        address: organization.address,
        phone: organization.phone,
      },
      planName: floorPlan.name,
      scale: floorPlan.scale,
      floors: spec.floors,
    })
  );

  const filename = `Plan_${floorPlan.name.replace(/[^a-z0-9]+/gi, "_")}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
