export type CheckStatus = "conforme" | "non_conforme" | "non_verifie" | "non_applicable";

export type Check = {
  id: string;
  domain: string;
  element: string;
  label: string;
  status: CheckStatus;
  value?: number;
  limit?: number;
  unit?: string;
  combo?: string;
  ref: string;
  detail?: string;
};

export const STATUS_LABELS: Record<CheckStatus, string> = {
  conforme: "Conforme",
  non_conforme: "Non conforme",
  non_verifie: "Non vérifié",
  non_applicable: "Non applicable",
};

export const DOMAINS = [
  "Hydrologie et hydraulique",
  "Dimensionnement des sections",
  "Contraintes de service (ELS)",
  "Effort tranchant",
  "Dispositions constructives",
  "Géotechnique et stabilité",
  "Ouvrages de tête",
  "Contrôle Eurocode 2",
  "Contrôles du modèle et hypothèses",
] as const;

export function globalStatus(checks: Check[]): CheckStatus {
  if (checks.some((c) => c.status === "non_conforme")) return "non_conforme";
  if (checks.some((c) => c.status === "non_verifie")) return "non_verifie";
  return "conforme";
}

export function countByStatus(checks: Check[]) {
  const out: Record<CheckStatus, number> = { conforme: 0, non_conforme: 0, non_verifie: 0, non_applicable: 0 };
  for (const c of checks) out[c.status]++;
  return out;
}

/** Ratio d'utilisation (valeur / limite) quand il a un sens. */
export function ratio(c: Check) {
  if (c.value === undefined || c.limit === undefined || c.limit === 0) return undefined;
  // Pour les vérifications du type « valeur ≥ limite » (sections, coefficients de sécurité), le ratio est inversé.
  const reversed = /≥|FS|non-fragilité|minimale|fournie|Enrobage|répartition/i.test(c.label);
  return reversed ? c.limit / Math.max(c.value, 1e-9) : c.value / c.limit;
}

export function checksToCsv(checks: Check[]) {
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const head = ["Statut", "Domaine", "Élément", "Vérification", "Valeur", "Limite", "Unité", "Combinaison", "Référence", "Commentaire"];
  const rows = checks.map((c) => [
    STATUS_LABELS[c.status], c.domain, c.element, c.label,
    c.value !== undefined ? c.value.toFixed(3).replace(".", ",") : "",
    c.limit !== undefined ? c.limit.toFixed(3).replace(".", ",") : "",
    c.unit ?? "", c.combo ?? "", c.ref, c.detail ?? "",
  ].map((x) => esc(String(x))).join(";"));
  return "﻿" + [head.map(esc).join(";"), ...rows].join("\r\n");
}
