import Link from "next/link";
import { requireSessionWithContext } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { importDqeAction } from "@/lib/actions/dqe";
import type { DqeData } from "@/lib/dqe/types";
import { UploadForm } from "./upload-form";

const F = (n: number) => Math.round(n).toLocaleString("fr-FR");

export default async function DqeListPage() {
  const { organization } = await requireSessionWithContext();
  const list = await prisma.dqeImport.findMany({
    where: { organizationId: organization.id },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Import DQE &amp; suivi d&apos;exécution</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">
          Importez uniquement le DQE (Excel ou PDF) : le logiciel reconnaît seul les ouvrages, les lots et les
          articles, décrit chaque lot (corps d&apos;état, poids financier, quantités clés, points de vigilance
          BAEL/EC2) et prépare le tableau de suivi : attachements, avancement par lot, situation et export Excel.
        </p>
      </div>

      <UploadForm action={importDqeAction} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.length === 0 ? (
          <div className="col-span-full rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
            Aucun DQE importé pour l&apos;instant.
          </div>
        ) : (
          list.map((x) => {
            const d = x.data as unknown as DqeData;
            const ht = d.items.reduce((s, i) => s + i.q * i.pu, 0);
            const byK = new Map(d.items.map((i) => [i.k, i]));
            const exec = new Map<number, number>();
            d.att.forEach((a) => exec.set(a.k, (exec.get(a.k) ?? 0) + a.q));
            let ex = 0;
            exec.forEach((q, k) => {
              const i = byK.get(k);
              if (i) ex += Math.min(q, Math.max(i.q, 0)) * i.pu;
            });
            const pct = ht ? (ex / ht) * 100 : 0;
            return (
              <Link
                key={x.id}
                href={`/dqe/${x.id}`}
                className="rounded-xl border border-slate-200 bg-white p-5 hover:border-blue-300 hover:shadow-sm"
              >
                <div className="font-semibold text-slate-900">{x.name}</div>
                <div className="mt-1 text-sm text-slate-500">
                  {d.sites.length} ouvrage(s) · {d.lots.length} lots · {d.items.length} articles
                </div>
                <div className="mt-2 text-sm font-medium text-slate-800">{F(ht)} F CFA HT</div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full bg-emerald-600" style={{ width: `${Math.min(100, pct)}%` }} />
                </div>
                <div className="mt-1 text-xs text-slate-500">{pct.toFixed(1).replace(".", ",")} % réalisé</div>
                <div className="mt-3 text-xs text-slate-400">
                  {x.fileName} · mis à jour le {new Date(x.updatedAt).toLocaleDateString("fr-FR")}
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
