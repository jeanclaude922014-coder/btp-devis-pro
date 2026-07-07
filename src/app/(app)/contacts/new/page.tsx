import { ContactForm } from "../contact-form";
import { createContactAction } from "@/lib/actions/contacts";

export default function NewContactPage() {
  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-semibold text-slate-900">Nouveau contact</h1>
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
        <ContactForm action={createContactAction} submitLabel="Créer le contact" />
      </div>
    </div>
  );
}
