import Link from "next/link";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div>
      <h1 className="text-lg font-semibold text-slate-900">Connexion</h1>
      <p className="mt-1 text-sm text-slate-500">
        Accédez à votre espace cabinet.
      </p>
      <div className="mt-6">
        <LoginForm />
      </div>
      <p className="mt-6 text-center text-sm text-slate-500">
        Pas encore de compte ?{" "}
        <Link href="/signup" className="font-medium text-blue-700 hover:underline">
          Créer un cabinet
        </Link>
      </p>
    </div>
  );
}
