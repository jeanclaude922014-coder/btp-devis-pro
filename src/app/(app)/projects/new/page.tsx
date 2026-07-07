import { requireSessionWithContext } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ProjectForm } from "../project-form";
import { createProjectAction } from "@/lib/actions/projects";

export default async function NewProjectPage() {
  const { organization } = await requireSessionWithContext();
  const contacts = await prisma.contact.findMany({
    where: { organizationId: organization.id },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-semibold text-slate-900">Nouveau projet</h1>
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
        <ProjectForm
          action={createProjectAction}
          contacts={contacts}
          submitLabel="Créer le projet"
        />
      </div>
    </div>
  );
}
