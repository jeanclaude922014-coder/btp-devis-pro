import Link from "next/link";
import { SignupForm } from "./signup-form";

export default function SignupPage() {
  return (
    <div>
      <h1 className="text-lg font-semibold text-slate-900">Créer votre cabinet</h1>
      <p className="mt-1 text-sm text-slate-500">
        14 jours d&apos;essai, toutes les fonctionnalités incluses.
      </p>
      <div className="mt-6">
        <SignupForm />
      </div>
      <p className="mt-6 text-center text-sm text-slate-500">
        Déjà un compte ?{" "}
        <Link href="/login" className="font-medium text-blue-700 hover:underline">
          Se connecter
        </Link>
      </p>
    </div>
  );
}
