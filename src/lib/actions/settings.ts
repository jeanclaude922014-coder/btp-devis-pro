"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSessionWithContext } from "@/lib/auth";

export type FormState = { error: string; success?: boolean };

const orgSchema = z.object({
  name: z.string().min(2, "Le nom du cabinet est requis."),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  website: z.string().optional(),
  defaultRegion: z.string().min(2),
  defaultCurrency: z.string().min(3).max(3),
  defaultFgPct: z.coerce.number().min(0),
  defaultBenefitPct: z.coerce.number().min(0),
  primaryColor: z.string().min(4),
  secondaryColor: z.string().min(4),
  pdfFooterText: z.string().optional(),
});

export async function updateOrganizationAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const { organization } = await requireSessionWithContext();

  const parsed = orgSchema.safeParse({
    name: formData.get("name"),
    address: formData.get("address") || undefined,
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || undefined,
    website: formData.get("website") || undefined,
    defaultRegion: formData.get("defaultRegion"),
    defaultCurrency: formData.get("defaultCurrency"),
    defaultFgPct: formData.get("defaultFgPct"),
    defaultBenefitPct: formData.get("defaultBenefitPct"),
    primaryColor: formData.get("primaryColor"),
    secondaryColor: formData.get("secondaryColor"),
    pdfFooterText: formData.get("pdfFooterText") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  await prisma.organization.update({
    where: { id: organization.id },
    data: parsed.data,
  });

  revalidatePath("/settings");
  return { error: "", success: true };
}

export async function upsertExchangeRateAction(formData: FormData) {
  const { organization } = await requireSessionWithContext();
  const currencyCode = String(formData.get("currencyCode"));
  const rateToXof = Number(formData.get("rateToXof") || 0);
  if (!currencyCode || rateToXof <= 0) return;

  await prisma.exchangeRate.upsert({
    where: { organizationId_currencyCode: { organizationId: organization.id, currencyCode } },
    create: { organizationId: organization.id, currencyCode, rateToXof },
    update: { rateToXof },
  });

  revalidatePath("/settings");
}
