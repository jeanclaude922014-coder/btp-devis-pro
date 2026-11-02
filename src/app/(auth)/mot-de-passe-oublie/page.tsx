import Link from "next/link";
import { ResetForm } from "./reset-form";

export default function ForgotPasswordPage() {
  return (
    <div>
      <h1 className="text-lg font-semibold text-slate-900">Mot de passe oublié</h1>
      <p className="mt-1 text-sm text-slate-500">
        Saisissez votre email, le code de récupération de votre espace et un nouveau mot de passe.
      </p>
      <div className="mt-6">
        <ResetForm />
      </div>
      <p className="mt-6 text-center text-sm text-slate-500">
        <Link href="/login" className="font-medium text-blue-700 hover:underline">
          Retour à la connexion
        </Link>
      </p>
    </div>
  );
}
