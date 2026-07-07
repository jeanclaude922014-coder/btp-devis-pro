export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2">
            <span className="inline-block h-8 w-8 rounded-lg bg-blue-900" />
            <span className="text-xl font-bold text-slate-900">
              Chantier<span className="text-blue-700">Pilot</span>
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Gestion de devis &amp; chantiers BTP
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
}
