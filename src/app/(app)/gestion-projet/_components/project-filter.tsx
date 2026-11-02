"use client";

import { useRouter } from "next/navigation";

export function ProjectFilter({ value, projects }: { value: string; projects: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  return (
    <label className="text-xs text-slate-500">
      Chantier
      <select
        value={value}
        onChange={(e) => router.push(e.target.value ? `/gestion-projet?chantier=${encodeURIComponent(e.target.value)}` : "/gestion-projet")}
        className="mt-1 block rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900"
      >
        <option value="">Tous les chantiers</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
        <option value="sans">Tâches sans chantier</option>
      </select>
    </label>
  );
}
