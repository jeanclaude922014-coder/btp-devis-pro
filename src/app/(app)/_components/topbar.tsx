import { logoutAction } from "@/lib/session-actions";

export function Topbar({
  userName,
  organizationName,
}: {
  userName: string;
  organizationName: string;
}) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div className="text-sm text-slate-500 md:hidden">{organizationName}</div>
      <div className="hidden md:block" />
      <div className="flex items-center gap-4">
        <span className="text-sm text-slate-600">{userName}</span>
        <form action={logoutAction}>
          <button
            type="submit"
            className="rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Déconnexion
          </button>
        </form>
      </div>
    </header>
  );
}
