"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSessionWithContext } from "@/lib/auth";

const projectSchema = z.object({
  name: z.string().min(2, "Le nom du projet est requis."),
  reference: z.string().optional(),
  city: z.string().optional(),
  contactId: z.string().optional(),
  status: z.enum(["actif", "termine", "brouillon"]),
  estimatedBudget: z.coerce.number().min(0).default(0),
});

export type FormState = { error: string };

function readForm(formData: FormData) {
  return projectSchema.safeParse({
    name: formData.get("name"),
    reference: formData.get("reference") || undefined,
    city: formData.get("city") || undefined,
    contactId: formData.get("contactId") || undefined,
    status: formData.get("status"),
    estimatedBudget: formData.get("estimatedBudget") || 0,
  });
}

export async function createProjectAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const { organization } = await requireSessionWithContext();
  const parsed = readForm(formData);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const project = await prisma.project.create({
    data: { ...parsed.data, organizationId: organization.id },
  });

  revalidatePath("/projects");
  redirect(`/projects/${project.id}`);
}

export async function updateProjectAction(
  projectId: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const { organization } = await requireSessionWithContext();
  const parsed = readForm(formData);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  await prisma.project.updateMany({
    where: { id: projectId, organizationId: organization.id },
    data: parsed.data,
  });

  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  return { error: "" };
}

export async function deleteProjectAction(formData: FormData) {
  const { organization } = await requireSessionWithContext();
  const projectId = String(formData.get("projectId"));

  await prisma.project.deleteMany({
    where: { id: projectId, organizationId: organization.id },
  });

  revalidatePath("/projects");
  redirect("/projects");
}
