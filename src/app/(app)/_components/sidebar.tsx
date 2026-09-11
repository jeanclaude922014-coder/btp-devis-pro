"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Tableau de bord", icon: "◧" },
  { href: "/projects", label: "Projets", icon: "▤" },
  { href: "/plans", label: "Générateur de plan IA", icon: "▦" },
  { href: "/contacts", label: "Contacts", icon: "☺" },
  { href: "/price-library", label: "Bibliothèque de prix", icon: "≡" },
  { href: "/settings", label: "Paramètres", icon: "⚙" },
];

export function Sidebar({ organizationName }: { organizationName: string }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 flex-col border-r border-slate-200 bg-white md:flex">
      <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-5">
        <span className="inline-block h-7 w-7 rounded-lg bg-blue-900" />
        <div className="leading-tight">
          <div className="text-sm font-bold text-slate-900">
            Chantier<span className="text-blue-700">Pilot</span>
          </div>
          <div className="truncate text-xs text-slate-400" title={organizationName}>
            {organizationName}
          </div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-blue-50 text-blue-800"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <span aria-hidden className="w-4 text-center">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
