import { notFound } from "next/navigation";
import { requireSessionWithContext } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { updateContactAction } from "@/lib/actions/contacts";
import { ContactForm } from "../contact-form";

export default async function EditContactPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { organization } = await requireSessionWithContext();

  const contact = await prisma.contact.findFirst({
    where: { id, organizationId: organization.id },
  });

  if (!contact) notFound();

  const boundAction = updateContactAction.bind(null, contact.id);

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-semibold text-slate-900">Éditer le contact</h1>
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
        <ContactForm
          action={boundAction}
          defaults={{
            type: contact.type,
            name: contact.name,
            companyName: contact.companyName ?? "",
            phone: contact.phone ?? "",
            email: contact.email ?? "",
            address: contact.address ?? "",
            notes: contact.notes ?? "",
          }}
          submitLabel="Enregistrer"
        />
      </div>
    </div>
  );
}
