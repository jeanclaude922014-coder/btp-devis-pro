"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSessionWithContext } from "@/lib/auth";

export type FormState = { error: string };

// ── Devis (en-tête) ──────────────────────────────────────────

const quoteSchema = z.object({
  name: z.string().min(2, "Le nom du devis est requis."),
});

export async function createQuoteAction(
  projectId: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const { organization } = await requireSessionWithContext();

  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId: organization.id },
  });
  if (!project) return { error: "Projet introuvable." };

  const parsed = quoteSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const quote = await prisma.quote.create({
    data: {
      organizationId: organization.id,
      projectId: project.id,
      name: parsed.data.name,
      currency: organization.defaultCurrency,
      fgPct: organization.defaultFgPct,
      benefitPct: organization.defaultBenefitPct,
    },
  });

  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}/quotes/${quote.id}`);
}

const quoteMetaSchema = z.object({
  name: z.string().min(2),
  status: z.enum(["brouillon", "envoye", "accepte", "refuse"]),
  fgPct: z.coerce.number().min(0),
  benefitPct: z.coerce.number().min(0),
});

export async function updateQuoteMetaAction(
  quoteId: string,
  formData: FormData
): Promise<void> {
  const { organization } = await requireSessionWithContext();
  const parsed = quoteMetaSchema.safeParse({
    name: formData.get("name"),
    status: formData.get("status"),
    fgPct: formData.get("fgPct"),
    benefitPct: formData.get("benefitPct"),
  });
  if (!parsed.success) return;

  const quote = await prisma.quote.findFirst({
    where: { id: quoteId, organizationId: organization.id },
  });
  if (!quote) return;

  await prisma.quote.update({ where: { id: quoteId }, data: parsed.data });
  revalidatePath(`/projects/${quote.projectId}/quotes/${quoteId}`);
}

export async function deleteQuoteAction(formData: FormData) {
  const { organization } = await requireSessionWithContext();
  const quoteId = String(formData.get("quoteId"));
  const projectId = String(formData.get("projectId"));

  await prisma.quote.deleteMany({
    where: { id: quoteId, organizationId: organization.id },
  });

  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}`);
}

// ── Lots ─────────────────────────────────────────────────────

export async function addLotFromCategoryAction(formData: FormData) {
  const { organization } = await requireSessionWithContext();
  const quoteId = String(formData.get("quoteId"));
  const categoryId = String(formData.get("categoryId"));

  const quote = await prisma.quote.findFirst({
    where: { id: quoteId, organizationId: organization.id },
    include: { lots: true },
  });
  if (!quote) return;

  const category = await prisma.priceCategory.findFirst({
    where: {
      id: categoryId,
      OR: [{ organizationId: organization.id }, { organizationId: null }],
    },
  });
  if (!category) return;

  await prisma.quoteLot.create({
    data: {
      quoteId,
      code: category.code,
      name: category.name,
      colorHex: category.colorHex,
      position: quote.lots.length,
    },
  });

  revalidatePath(`/projects/${quote.projectId}/quotes/${quoteId}`);
}

export async function addCustomLotAction(formData: FormData) {
  const { organization } = await requireSessionWithContext();
  const quoteId = String(formData.get("quoteId"));
  const name = String(formData.get("name") || "").trim();
  if (!name) return;

  const quote = await prisma.quote.findFirst({
    where: { id: quoteId, organizationId: organization.id },
    include: { lots: true },
  });
  if (!quote) return;

  await prisma.quoteLot.create({
    data: {
      quoteId,
      code: String(quote.lots.length + 1).padStart(2, "0"),
      name,
      position: quote.lots.length,
    },
  });

  revalidatePath(`/projects/${quote.projectId}/quotes/${quoteId}`);
}

export async function deleteLotAction(formData: FormData) {
  const { organization } = await requireSessionWithContext();
  const lotId = String(formData.get("lotId"));

  const lot = await prisma.quoteLot.findFirst({
    where: { id: lotId, quote: { organizationId: organization.id } },
    include: { quote: true },
  });
  if (!lot) return;

  await prisma.quoteLot.delete({ where: { id: lotId } });
  revalidatePath(`/projects/${lot.quote.projectId}/quotes/${lot.quoteId}`);
}

// ── Lignes ───────────────────────────────────────────────────

export async function addLineFromCatalogAction(formData: FormData) {
  const { organization } = await requireSessionWithContext();
  const lotId = String(formData.get("lotId"));
  const priceItemId = String(formData.get("priceItemId"));
  const quantity = Number(formData.get("quantity") || 1);

  const lot = await prisma.quoteLot.findFirst({
    where: { id: lotId, quote: { organizationId: organization.id } },
    include: { quote: true, lines: true },
  });
  if (!lot) return;

  const priceItem = await prisma.priceItem.findFirst({
    where: {
      id: priceItemId,
      OR: [{ organizationId: organization.id }, { organizationId: null }],
    },
  });
  if (!priceItem) return;

  await prisma.quoteLine.create({
    data: {
      quoteLotId: lotId,
      priceItemId: priceItem.id,
      designation: priceItem.displayLabel || priceItem.designation,
      unit: priceItem.unit,
      quantity,
      laborHours: priceItem.laborHours,
      laborRateXof: priceItem.laborRateXof,
      materialsXof: priceItem.materialsXof,
      equipmentXof: priceItem.equipmentXof,
      position: lot.lines.length,
    },
  });

  revalidatePath(`/projects/${lot.quote.projectId}/quotes/${lot.quoteId}`);
}

export async function addCustomLineAction(formData: FormData) {
  const { organization } = await requireSessionWithContext();
  const lotId = String(formData.get("lotId"));
  const designation = String(formData.get("designation") || "").trim();
  if (!designation) return;

  const lot = await prisma.quoteLot.findFirst({
    where: { id: lotId, quote: { organizationId: organization.id } },
    include: { quote: true, lines: true },
  });
  if (!lot) return;

  await prisma.quoteLine.create({
    data: {
      quoteLotId: lotId,
      designation,
      unit: String(formData.get("unit") || "u"),
      quantity: Number(formData.get("quantity") || 1),
      laborHours: Number(formData.get("laborHours") || 0),
      laborRateXof: Number(formData.get("laborRateXof") || 0),
      materialsXof: Number(formData.get("materialsXof") || 0),
      equipmentXof: Number(formData.get("equipmentXof") || 0),
      position: lot.lines.length,
    },
  });

  revalidatePath(`/projects/${lot.quote.projectId}/quotes/${lot.quoteId}`);
}

export async function updateLineFieldsAction(formData: FormData) {
  const { organization } = await requireSessionWithContext();
  const lineId = String(formData.get("lineId"));

  const line = await prisma.quoteLine.findFirst({
    where: { id: lineId, quoteLot: { quote: { organizationId: organization.id } } },
    include: { quoteLot: { include: { quote: true } } },
  });
  if (!line) return;

  await prisma.quoteLine.update({
    where: { id: lineId },
    data: {
      designation: String(formData.get("designation") || line.designation),
      unit: String(formData.get("unit") || line.unit),
      quantity: Number(formData.get("quantity") ?? line.quantity),
      laborHours: Number(formData.get("laborHours") ?? line.laborHours),
      laborRateXof: Number(formData.get("laborRateXof") ?? line.laborRateXof),
      materialsXof: Number(formData.get("materialsXof") ?? line.materialsXof),
      equipmentXof: Number(formData.get("equipmentXof") ?? line.equipmentXof),
    },
  });
  revalidatePath(
    `/projects/${line.quoteLot.quote.projectId}/quotes/${line.quoteLot.quoteId}`
  );
}

export async function deleteLineAction(formData: FormData) {
  const { organization } = await requireSessionWithContext();
  const lineId = String(formData.get("lineId"));

  const line = await prisma.quoteLine.findFirst({
    where: { id: lineId, quoteLot: { quote: { organizationId: organization.id } } },
    include: { quoteLot: { include: { quote: true } } },
  });
  if (!line) return;

  await prisma.quoteLine.delete({ where: { id: lineId } });
  revalidatePath(
    `/projects/${line.quoteLot.quote.projectId}/quotes/${line.quoteLot.quoteId}`
  );
}
