import { notFound } from "next/navigation";
import { requireSessionWithContext } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  deleteFloorPlanAction,
  sendPlanMessageAction,
  setFloorPlanScaleAction,
} from "@/lib/actions/floor-plans";
import { quickRepliesForStep } from "@/lib/floor-plan/chat-engine";
import type { FloorPlanSpec } from "@/lib/floor-plan/types";
import { AutoSubmitForm } from "../../_components/auto-submit-form";
import { ChatPanel } from "./_components/chat-panel";
import { PlanWorkspace } from "./_components/plan-workspace";

export default async function FloorPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organization } = await requireSessionWithContext();

  const floorPlan = await prisma.floorPlan.findFirst({
    where: { id, organizationId: organization.id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  if (!floorPlan) notFound();

  const spec = floorPlan.spec as unknown as FloorPlanSpec;
  const quickReplies = quickRepliesForStep(spec.step);
  const boundSendMessage = sendPlanMessageAction.bind(null, floorPlan.id);
  const boundSetScale = setFloorPlanScaleAction.bind(null, floorPlan.id);

  return (
    <div className="flex h-[calc(100vh-7.5rem)] flex-col">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{floorPlan.name}</h1>
          <p className="text-sm text-slate-500">
            {spec.step === "done" ? "Plan finalisé" : "En cours de définition avec l'assistant"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AutoSubmitForm action={boundSetScale} className="flex items-center gap-2">
            <label className="text-sm text-slate-500">Échelle</label>
            <select
              name="scale"
              defaultValue={floorPlan.scale}
              className="rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-600 focus:outline-none"
            >
              <option value="1/50">1/50</option>
              <option value="1/100">1/100</option>
            </select>
          </AutoSubmitForm>
          <a
            href={`/plans/${floorPlan.id}/export/pdf`}
            className="rounded-md bg-blue-800 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-900"
          >
            Exporter en PDF
          </a>
          <form action={deleteFloorPlanAction}>
            <input type="hidden" name="floorPlanId" value={floorPlan.id} />
            <button type="submit" className="text-sm font-medium text-red-600 hover:underline">
              Supprimer
            </button>
          </form>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[380px_1fr]">
        <div className="min-h-0 rounded-xl border border-slate-200 bg-white">
          <ChatPanel
            action={boundSendMessage}
            messages={floorPlan.messages}
            quickReplies={quickReplies}
            done={spec.step === "done"}
          />
        </div>
        <div className="min-h-0 rounded-xl border border-slate-200 bg-white">
          <PlanWorkspace floors={spec.floors} scale={floorPlan.scale} />
        </div>
      </div>
    </div>
  );
}
