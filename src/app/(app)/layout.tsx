import { requireSessionWithContext } from "@/lib/auth";
import { Sidebar } from "./_components/sidebar";
import { Topbar } from "./_components/topbar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, organization } = await requireSessionWithContext();

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar organizationName={organization.name} />
      <div className="flex flex-1 flex-col">
        <Topbar userName={user.name} organizationName={organization.name} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
