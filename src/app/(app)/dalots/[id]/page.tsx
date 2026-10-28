import { notFound } from "next/navigation";
import { requireSessionWithContext } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { normalizeSpec } from "@/lib/dalot/fields";
import { DalotWorkspace } from "./_components/workspace";

export default async function DalotStudyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organization } = await requireSessionWithContext();
  const [study, projects] = await Promise.all([
    prisma.dalotStudy.findFirst({ where: { id, organizationId: organization.id } }),
    prisma.project.findMany({ where: { organizationId: organization.id }, orderBy: { updatedAt: "desc" }, select: { id: true, name: true } }),
  ]);
  if (!study) notFound();
  return (
    <DalotWorkspace
      id={study.id}
      seriesName={study.seriesName}
      initialSpec={normalizeSpec(study.spec)}
      projects={projects}
    />
  );
}
