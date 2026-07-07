"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSessionWithContext } from "@/lib/auth";

const contactSchema = z.object({
  type: z.enum(["client", "entreprise", "architecte", "fournisseur"]),
  name: z.string().min(2, "Le nom est requis."),
  companyName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export type FormState = { error: string };

export async function createContactAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const { organization } = await requireSessionWithContext();

  const parsed = contactSchema.safeParse({
    type: formData.get("type"),
    name: formData.get("name"),
    companyName: formData.get("companyName") || undefined,
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || undefined,
    address: formData.get("address") || undefined,
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  await prisma.contact.create({
    data: { ...parsed.data, organizationId: organization.id },
  });

  revalidatePath("/contacts");
  redirect("/contacts");
}

export async function updateContactAction(
  contactId: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const { organization } = await requireSessionWithContext();

  const parsed = contactSchema.safeParse({
    type: formData.get("type"),
    name: formData.get("name"),
    companyName: formData.get("companyName") || undefined,
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || undefined,
    address: formData.get("address") || undefined,
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  await prisma.contact.updateMany({
    where: { id: contactId, organizationId: organization.id },
    data: parsed.data,
  });

  revalidatePath("/contacts");
  redirect("/contacts");
}

export async function deleteContactAction(formData: FormData) {
  const { organization } = await requireSessionWithContext();
  const contactId = String(formData.get("contactId"));

  await prisma.contact.deleteMany({
    where: { id: contactId, organizationId: organization.id },
  });

  revalidatePath("/contacts");
}
