import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSessionWithContext } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { deleteDqeAction, renameDqeAction, saveDqeDataAction } from "@/lib/actions/dqe";
import type { DqeData } from "@/lib/dqe/types";
import { DeleteDqeButton } from "./_components/delete-button";
import { DqeWorkspace } from "./_components/dqe-workspace";

export default async function DqePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organization } = await requireSessionWithContext();
  const dqe = await prisma.dqeImport.findFirst({ where: { id, organizationId: organization.id } });
  if (!dqe) notFound();

  const data = dqe.data as unknown as DqeData;
  const rename = renameDqeAction.bind(null, dqe.id);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Link href="/dqe" className="text-xs text-slate-500 hover:text-blue-700">
            ← Tous les DQE
          </Link>
          <form action={rename} className="mt-1 flex items-center gap-2">
            <input
              name="name"
              defaultValue={dqe.name}
              aria-label="Nom du marché"
              className="w-full max-w-2xl rounded-md border border-transparent px-1 text-xl font-semibold text-slate-900 hover:border-slate-200 focus:border-blue-600 focus:outline-none"
            />
            <button type="submit" className="text-xs text-blue-700 hover:underline">
              Renommer
            </button>
          </form>
          <p className="px-1 text-sm text-slate-500">
            Devis quantitatif et estimatif · suivi d&apos;exécution · F CFA HT · fichier source : {dqe.fileName}
          </p>
        </div>
        <DeleteDqeButton action={deleteDqeAction} dqeId={dqe.id} />
      </div>
      <DqeWorkspace id={dqe.id} name={dqe.name} initialData={data} save={saveDqeDataAction} />
    </div>
  );
}
