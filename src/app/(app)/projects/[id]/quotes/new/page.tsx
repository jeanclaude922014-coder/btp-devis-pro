import { notFound } from "next/navigation";
import { requireSessionWithContext } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createQuoteAction } from "@/lib/actions/quotes";
import { QuoteCreateForm } from "./quote-create-form";

export default async function NewQuotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { organization } = await requireSessionWithContext();

  const project = await prisma.project.findFirst({
    where: { id, organizationId: organization.id },
  });
  if (!project) notFound();

  const boundAction = createQuoteAction.bind(null, project.id);

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-semibold text-slate-900">
        Nouveau devis — {project.name}
      </h1>
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
        <QuoteCreateForm action={boundAction} />
      </div>
    </div>
  );
}
