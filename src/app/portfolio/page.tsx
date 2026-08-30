import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Moulo Jean Claude Ayemou — Technicien Supérieur Travaux Publics",
  description:
    "Portfolio de Moulo Jean Claude Ayemou, Technicien Supérieur Travaux Publics : conduite de travaux routiers, VRD, ouvrages hydrauliques et bâtiment en Côte d'Ivoire.",
};

type Mission = {
  period: string;
  role: string;
  company: string;
  location?: string;
  bullets: string[];
  highlight?: boolean;
};

const recentMissions: Mission[] = [
  {
    period: "Mai 2026 — Août 2026 (4 mois)",
    role: "Consultant technicien routier",
    company: "Mission d'étude — réhabilitation de routes rurales",
    location: "Région du Worodougou",
    highlight: true,
    bullets: [
      "Réalisation des études techniques et élaboration des pièces du DAO pour la réhabilitation de routes rurales.",
      "Relevé des schémas itinéraires sur le terrain.",
      "Production des avant-métrés et du devis quantitatif et estimatif (DQE).",
    ],
  },
  {
    period: "Avril 2026 — Mai 2026",
    role: "Consultant conducteur de travaux",
    company: "GeoReco",
    location: "Quai de Singapour & Lahou Kpanda",
    highlight: true,
    bullets: [
      "Travaux de purge des algues sur le bord de la lagune au Quai de Singapour.",
      "Dragage et reconstruction du lac à Lahou Kpanda.",
    ],
  },
];

const experience: Mission[] = [
  {
    period: "Avril 2024 — 2026",
    role: "Conducteur de travaux",
    company: "LENOTE SARL",
    bullets: [
      "Organisation et suivi des travaux et des équipes.",
      "Suivi des travaux d'exécution, supervision et contrôle des chantiers.",
      "Conception et calcul d'ouvrages et d'ouvrages hydrauliques.",
    ],
  },
  {
    period: "Mars 2023 — Novembre 2023",
    role: "Conducteur de travaux",
    company: "GeoReco",
    bullets: [
      "Organisation et suivi des travaux et des équipes.",
      "Supervision et contrôle des chantiers.",
    ],
  },
  {
    period: "Novembre 2021 — Février 2023",
    role: "Chef de chantier",
    company: "GeoReco",
    bullets: [
      "Terrassement, suivi des travaux d'exécution.",
      "Conception et calcul d'ouvrages (bâtiment, dalles, ouvrages hydrauliques en béton armé, caniveaux, pavés).",
      "Planification, organisation, suivi et contrôle. Montage d'appel d'offre.",
    ],
  },
  {
    period: "Octobre 2020 — Août 2021",
    role: "Chef de chantier",
    company: "LENOTE SARL",
    bullets: ["Terrassement, pose de buses.", "Suivi des travaux d'exécution, planification et contrôle."],
  },
  {
    period: "Juillet 2020 — Septembre 2020",
    role: "Essai",
    company: "LENOTE SARL",
    bullets: [],
  },
  {
    period: "Août 2019 — Mai 2020",
    role: "Chef de chantier",
    company: "GeoReco",
    bullets: [
      "Stabilisation au sol ciment, pose de buses, purge, perrés bétonnés.",
      "Suivi de la mise en place de la couche de fondation en graveleux latéritiques.",
    ],
  },
  {
    period: "Avril 2019 — Juillet 2019",
    role: "Essai",
    company: "GeoReco",
    bullets: [],
  },
  {
    period: "Novembre 2018 — Mars 2019",
    role: "Stagiaire",
    company: "GeoReco",
    bullets: ["Thème : reprofilage lourd et traitement des points critiques."],
  },
];

const projects: { period: string; title: string; detail: string }[] = [
  {
    period: "Juil. 2025 — Nov. 2025",
    title: "Accord-cadre à bons de commande — Galébré",
    detail:
      "Reprofilage lourd et traitement de points critiques sur route en terre, et construction d'ouvrages à Galébré, département de Gagnoa.",
  },
  {
    period: "Juin 2024 — Mars 2025",
    title: "Centre de maternité et logement — Banvayo",
    detail: "Construction en BTC d'un centre de maternité et d'un logement à Banvayo (S/P Kapkin), département de Nassian, sur 3 000 m².",
  },
  {
    period: "—",
    title: "Centre de santé — Gnonssiéra",
    detail: "Construction d'un centre de santé (dispensaire) à Gnonssiéra (S/P Danoa), département de Doropo, sur 1 ha.",
  },
  {
    period: "Déc. 2022 — Sept. 2023",
    title: "Clôture, forage et château métallique — AGL Bouaké",
    detail:
      "Clôture sur 1 ha, forage d'eau et château métallique avec construction métallique en acier galvanisé sur 1 920 m² (bardage compris), à Bouaké (Lomibo) pour AGL (Africa Global Logistics).",
  },
  {
    period: "—",
    title: "Reprofilage Sokouamékro–Bopri",
    detail: "13 km de reprofilage lourd et traitement de points critiques, dont 6 km de rechargement, pour LafargeHolcim.",
  },
  {
    period: "Avril 2022 — Mai 2022",
    title: "Semelle et voile — Vridi Zimbabwé",
    detail:
      "Réalisation d'une semelle (75 ml × 150 cm × 30 cm) et d'un voile (75 ml × 250 cm × 30 cm) dans le hall de matières de LafargeHolcim, zone portuaire.",
  },
  {
    period: "Oct. 2021 — Jan. 2022",
    title: "Clôture usine de concassage — Brobo-Bouaké",
    detail: "Construction d'une clôture d'usine de concassage et forage/adduction en eau potable sur 4 ha pour LafargeHolcim Côte d'Ivoire.",
  },
  {
    period: "Mai 2021 — Juillet 2021",
    title: "Villa 6 pièces — Konankokorekro",
    detail: "Construction d'une villa de 6 pièces à Konankokorekro (S/P Agonda).",
  },
  {
    period: "Juil. 2020 — Mars 2021",
    title: "Reprofilage lourd — PER 2019 LOT 64",
    detail: "105,80 km de reprofilage lourd avec traitement des points critiques (Bongouanou, Arrah, M'Batto).",
  },
  {
    period: "Mai 2020 — Juin 2020",
    title: "Forage et AEP — Sokouamékro",
    detail: "Forage et adduction en eau potable sur la carrière de pouzzolane de Sokouamékro (S/P Brobo).",
  },
  {
    period: "Fév. 2020 — Avril 2020",
    title: "Reprofilage lourd — Brobo",
    detail: "9 km de travaux de reprofilage lourd (S/P Brobo).",
  },
  {
    period: "Oct. 2019 — Déc. 2019",
    title: "Plateforme usine cimenterie — LafargeHolcim",
    detail: "Terrassement et aménagement de la plateforme de l'usine de cimenterie LafargeHolcim, 11 ha (S/P Brobo).",
  },
  {
    period: "Mars 2019 — Avril 2019",
    title: "Reprofilage léger — Pindikro-Sokouamékro",
    detail: "Reprofilage léger, assainissement et ouverture de voie secondaire sur 8 km (S/P Brobo).",
  },
  {
    period: "Nov. 2018 — Fév. 2019",
    title: "Ouverture de voie — Bopri-Sokouamékro",
    detail:
      "Ouverture de voie et reprofilage lourd sur 13 km : débroussaillement, déblai, remblai, purge, couche de fondation, pose de buses, rechargement et ciment stabilisé à 4 %.",
  },
];

const skillGroups = [
  {
    title: "Travaux publics",
    items: [
      "Terrassement",
      "Assainissement",
      "Stabilisation au ciment",
      "Étude de prix et métré des travaux",
      "Entretien de route en terre",
      "Relevé de schéma itinéraire",
      "Contrôle et suivi de chantier",
      "Bâtiment",
      "Hydraulique et forage d'eau",
      "Construction métallique",
      "Construction en BTC",
      "Construction de bâtiment et réhabilitation tout corps d'état",
    ],
  },
  {
    title: "Logiciels",
    items: ["AutoCAD", "ArchiCAD", "Covadis", "Microsoft Word / Excel / PowerPoint"],
  },
  {
    title: "Atouts",
    items: [
      "Organisé, autonome, rigoureux",
      "Sens de la confidentialité et des responsabilités",
      "Ponctuel et disponible",
      "Travail sous pression, seul ou en équipe",
      "Permis B, C, D, E",
    ],
  },
];

export default function PortfolioPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header / Hero */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-8 px-6 py-14 sm:flex-row sm:items-start">
          <Image
            src="/portfolio/moulo-jean-claude.jpg"
            alt="Moulo Jean Claude Ayemou"
            width={160}
            height={160}
            className="h-40 w-40 flex-none rounded-2xl border-4 border-blue-900 object-cover"
            priority
          />
          <div className="text-center sm:text-left">
            <p className="text-sm font-semibold uppercase tracking-widest text-orange-600">
              Technicien Supérieur — Travaux Publics
            </p>
            <h1 className="mt-1 text-3xl font-bold text-slate-900 sm:text-4xl">
              Moulo Jean Claude Ayemou
            </h1>
            <p className="mt-3 max-w-2xl text-slate-600">
              Conducteur de travaux et technicien routier ivoirien, fort de 7 ans d&apos;expérience sur des
              chantiers de routes en terre, VRD, ouvrages hydrauliques, bâtiment et construction
              métallique en Côte d&apos;Ivoire.
            </p>
            <dl className="mt-5 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-slate-500 sm:justify-start">
              <div className="flex items-center gap-1.5">
                <dt className="sr-only">Téléphone</dt>
                <dd>(+225) 07 09 00 56 64 / 05 85 68 88 25</dd>
              </div>
              <div className="flex items-center gap-1.5">
                <dt className="sr-only">Email</dt>
                <dd>
                  <a href="mailto:jeanclaude922014@gmail.com" className="text-blue-700 hover:underline">
                    jeanclaude922014@gmail.com
                  </a>
                </dd>
              </div>
              <div className="flex items-center gap-1.5">
                <dt className="sr-only">Langues</dt>
                <dd>Français (soutenu), Anglais (intermédiaire)</dd>
              </div>
            </dl>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12 space-y-16">
        {/* Missions récentes en avant */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-orange-600">Missions récentes</h2>
          <div className="mt-4 grid gap-6 sm:grid-cols-2">
            {recentMissions.map((m) => (
              <article
                key={m.period}
                className="rounded-xl border-2 border-blue-900 bg-white p-6 shadow-sm"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">{m.period}</p>
                <h3 className="mt-1 text-lg font-bold text-slate-900">{m.role}</h3>
                <p className="text-sm text-slate-500">
                  {m.company}
                  {m.location ? ` · ${m.location}` : ""}
                </p>
                <ul className="mt-3 space-y-1.5 text-sm text-slate-600">
                  {m.bullets.map((b) => (
                    <li key={b} className="flex gap-2">
                      <span aria-hidden className="text-blue-700">▸</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        {/* Expérience professionnelle */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-orange-600">
            Expérience professionnelle
          </h2>
          <ol className="mt-4 space-y-6 border-l-2 border-slate-200 pl-6">
            {experience.map((m) => (
              <li key={`${m.period}-${m.company}`} className="relative">
                <span
                  aria-hidden
                  className="absolute -left-[1.9rem] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-blue-900"
                />
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{m.period}</p>
                <h3 className="text-base font-semibold text-slate-900">
                  {m.role} <span className="font-normal text-slate-500">— {m.company}</span>
                </h3>
                {m.bullets.length > 0 && (
                  <ul className="mt-1.5 space-y-1 text-sm text-slate-600">
                    {m.bullets.map((b) => (
                      <li key={b} className="flex gap-2">
                        <span aria-hidden className="text-slate-400">–</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        </section>

        {/* Réalisations clés */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-orange-600">Réalisations clés</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {projects.map((p) => (
              <article key={p.title} className="rounded-lg border border-slate-200 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">{p.period}</p>
                <h3 className="mt-1 text-sm font-bold text-slate-900">{p.title}</h3>
                <p className="mt-1.5 text-sm text-slate-600">{p.detail}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Compétences */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-orange-600">Compétences</h2>
          <div className="mt-4 grid gap-6 sm:grid-cols-3">
            {skillGroups.map((g) => (
              <div key={g.title} className="rounded-lg border border-slate-200 bg-white p-5">
                <h3 className="text-sm font-bold text-slate-900">{g.title}</h3>
                <ul className="mt-2 space-y-1 text-sm text-slate-600">
                  {g.items.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span aria-hidden className="text-orange-600">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Formation */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-orange-600">Formation</h2>
          <div className="mt-4 space-y-3">
            <div className="rounded-lg border border-slate-200 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">2016 — 2018</p>
              <h3 className="text-sm font-bold text-slate-900">BTS Génie Civil / Travaux Publics</h3>
              <p className="text-sm text-slate-600">ESBTP Yamoussoukro</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">2015 — 2016</p>
              <h3 className="text-sm font-bold text-slate-900">Baccalauréat scientifique, série D</h3>
              <p className="text-sm text-slate-600">Collège Ehivet, Bonoua</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-8 text-center text-sm text-slate-500">
        <p>Moulo Jean Claude Ayemou — Technicien Supérieur Travaux Publics</p>
        <p className="mt-1">
          <a href="mailto:jeanclaude922014@gmail.com" className="text-blue-700 hover:underline">
            jeanclaude922014@gmail.com
          </a>{" "}
          · (+225) 07 09 00 56 64
        </p>
      </footer>
    </div>
  );
}
