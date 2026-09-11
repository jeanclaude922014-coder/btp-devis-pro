import Link from "next/link";
import { requireSessionWithContext } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createFloorPlanAction } from "@/lib/actions/floor-plans";
import { NewPlanForm } from "./new-plan-form";

const STATUS_LABELS: Record<string, string> = {
  brouillon: "En cours",
  valide: "Finalisé",
};

const STATUS_STYLES: Record<string, string> = {
  brouillon: "bg-amber-100 text-amber-700",
  valide: "bg-green-100 text-green-700",
};

export default async function PlansPage() {
  const { organization } = await requireSessionWithContext();

  const plans = await prisma.floorPlan.findMany({
    where: { organizationId: organization.id },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Générateur de plan IA</h1>
          <p className="mt-1 max-w-xl text-sm text-slate-500">
            Décrivez le bâtiment souhaité dans le chat, obtenez un plan 2D à l&apos;échelle et une
            visualisation 3D. Plan schématique d&apos;avant-projet — le dimensionnement
            structurel (poteaux, poutres, fondations) reste à vérifier selon l&apos;EC2/BAEL par un
            professionnel avant exécution.
          </p>
        </div>
        <NewPlanForm action={createFloorPlanAction} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {plans.length === 0 ? (
          <div className="col-span-full rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
            Aucun plan pour l&apos;instant. Créez votre premier plan pour commencer.
          </div>
        ) : (
          plans.map((plan) => {
            const floorsCount = Array.isArray((plan.spec as { floors?: unknown[] })?.floors)
              ? (plan.spec as { floors: unknown[] }).floors.length
              : 0;
            return (
              <Link
                key={plan.id}
                href={`/plans/${plan.id}`}
                className="rounded-xl border border-slate-200 bg-white p-5 hover:border-blue-300 hover:shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="font-semibold text-slate-900">{plan.name}</div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[plan.status]}`}
                  >
                    {STATUS_LABELS[plan.status]}
                  </span>
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  {floorsCount > 0 ? `${floorsCount} niveau(x)` : "En cours de définition"} ·
                  Échelle {plan.scale}
                </div>
                <div className="mt-3 text-xs text-slate-400">
                  Mis à jour le {new Date(plan.updatedAt).toLocaleDateString("fr-FR")}
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
