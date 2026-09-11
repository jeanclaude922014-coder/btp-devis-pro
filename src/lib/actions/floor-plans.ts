"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSessionWithContext } from "@/lib/auth";
import { advanceConversation, initialAssistantTurn } from "@/lib/floor-plan/chat-engine";
import { emptyFloorPlanSpec, type FloorPlanSpec } from "@/lib/floor-plan/types";

export type FormState = { error: string };

export async function createFloorPlanAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const { organization } = await requireSessionWithContext();
  const nameParsed = z.string().trim().min(1).safeParse(formData.get("name"));
  const name = nameParsed.success ? nameParsed.data : "Nouveau plan";

  const { assistantMessage, quickReplies } = initialAssistantTurn();
  const spec = emptyFloorPlanSpec();

  const floorPlan = await prisma.floorPlan.create({
    data: {
      organizationId: organization.id,
      name,
      spec: spec as unknown as object,
      messages: {
        create: [{ role: "assistant", content: assistantMessage }],
      },
    },
  });

  void quickReplies;
  revalidatePath("/plans");
  redirect(`/plans/${floorPlan.id}`);
}

export async function deleteFloorPlanAction(formData: FormData) {
  const { organization } = await requireSessionWithContext();
  const floorPlanId = String(formData.get("floorPlanId"));

  await prisma.floorPlan.deleteMany({
    where: { id: floorPlanId, organizationId: organization.id },
  });

  revalidatePath("/plans");
  redirect("/plans");
}

export async function setFloorPlanScaleAction(floorPlanId: string, formData: FormData) {
  const { organization } = await requireSessionWithContext();
  const scale = String(formData.get("scale"));
  if (scale !== "1/50" && scale !== "1/100") return;

  await prisma.floorPlan.updateMany({
    where: { id: floorPlanId, organizationId: organization.id },
    data: { scale },
  });

  revalidatePath(`/plans/${floorPlanId}`);
}

const messageSchema = z.object({
  kind: z.enum(["quick_reply", "text"]),
  value: z.string().trim().min(1),
  label: z.string().trim().optional(),
});

export async function sendPlanMessageAction(
  floorPlanId: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const { organization } = await requireSessionWithContext();

  const parsed = messageSchema.safeParse({
    kind: formData.get("kind"),
    value: formData.get("value"),
    label: formData.get("label") || undefined,
  });
  if (!parsed.success) {
    return { error: "Message invalide." };
  }

  const floorPlan = await prisma.floorPlan.findFirst({
    where: { id: floorPlanId, organizationId: organization.id },
  });
  if (!floorPlan) {
    return { error: "Plan introuvable." };
  }

  const currentSpec = floorPlan.spec as unknown as FloorPlanSpec;
  const displayedUserText = parsed.data.label ?? parsed.data.value;

  const { spec: nextSpec, assistantMessage } = advanceConversation(currentSpec, {
    value: parsed.data.value,
  });

  await prisma.$transaction([
    prisma.floorPlanMessage.create({
      data: { floorPlanId, role: "user", content: displayedUserText },
    }),
    prisma.floorPlanMessage.create({
      data: { floorPlanId, role: "assistant", content: assistantMessage },
    }),
    prisma.floorPlan.update({
      where: { id: floorPlanId },
      data: {
        spec: nextSpec as unknown as object,
        status: nextSpec.step === "done" ? "valide" : "brouillon",
      },
    }),
  ]);

  revalidatePath(`/plans/${floorPlanId}`);
  return { error: "" };
}
