"use client";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto mt-16 max-w-lg rounded-xl border border-red-200 bg-white p-6 text-center">
      <h1 className="text-lg font-semibold text-slate-900">Cette page n&apos;a pas pu s&apos;afficher</h1>
      <p className="mt-2 text-sm text-slate-600">
        Une erreur est survenue sur le serveur. Réessayez ; si le problème persiste, transmettez le code ci-dessous.
      </p>
      {error.digest && <p className="mt-3 font-mono text-xs text-slate-400">Code : {error.digest}</p>}
      <button type="button" onClick={reset} className="mt-4 rounded-md bg-blue-800 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900">
        Réessayer
      </button>
    </div>
  );
}
