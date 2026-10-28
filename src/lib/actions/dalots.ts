"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSessionWithContext } from "@/lib/auth";
import { runStudy } from "@/lib/dalot/engine";
import { normalizeSpec, seriesSpec, specFromPreset, SERIES_TYPES, type DalotSpec } from "@/lib/dalot/fields";

export type FormState = { error: string };

function statusOf(spec: DalotSpec) {
  const r = runStudy(spec);
  return r.ok ? r.study.status : "non_verifie";
}

export async function createDalotAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { organization } = await requireSessionWithContext();
  const name = z.string().trim().min(1).safeParse(formData.get("name"));
  const preset = z.string().safeParse(formData.get("preset"));
  const spec = specFromPreset(preset.success ? preset.data : "demo", name.success ? name.data : undefined);
  const study = await prisma.dalotStudy.create({
    data: {
      organizationId: organization.id,
      name: String(spec.values.projet || "Nouveau dalot"),
      status: statusOf(spec),
      spec: spec as unknown as object,
    },
  });
  revalidatePath("/dalots");
  redirect(`/dalots/${study.id}`);
}

const seriesSchema = z.object({
  seriesName: z.string().trim().min(1, "Donnez un nom à la série."),
  typeId: z.enum(SERIES_TYPES.map((t) => t.id) as [string, ...string[]]),
  cells: z.array(z.coerce.number().int().min(1).max(6)).min(1, "Cochez au moins un nombre de compartiments."),
  lengths: z.array(z.coerce.number().min(1).max(60)).min(1, "Indiquez au moins une longueur."),
});

/** Crée en une fois toutes les combinaisons compartiments × longueurs d'un gabarit type. */
export async function createDalotSeriesAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { organization } = await requireSessionWithContext();
  const extra = String(formData.get("lengthOther") ?? "")
    .split(/[;\s]+/).map((x) => Number(x.replace(",", "."))).filter((x) => x > 0);
  const parsed = seriesSchema.safeParse({
    seriesName: formData.get("seriesName"),
    typeId: formData.get("typeId"),
    cells: formData.getAll("cells"),
    lengths: [...formData.getAll("lengths"), ...extra],
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  const { seriesName, typeId, cells, lengths } = parsed.data;
  const uniqueLengths = Array.from(new Set(lengths)).sort((a, b) => a - b);
  const uniqueCells = Array.from(new Set(cells)).sort((a, b) => a - b);
  if (uniqueLengths.length * uniqueCells.length > 40) return { error: "Une série est limitée à 40 ouvrages." };
  const rows = uniqueCells.flatMap((n) => uniqueLengths.map((L) => {
    const spec = seriesSpec(typeId, n, L);
    return {
      organizationId: organization.id,
      name: String(spec.values.projet),
      seriesName,
      status: statusOf(spec),
      spec: spec as unknown as object,
    };
  }));
  await prisma.dalotStudy.createMany({ data: rows });
  revalidatePath("/dalots");
  redirect(`/dalots?serie=${encodeURIComponent(seriesName)}`);
}

export async function deleteDalotAction(formData: FormData) {
  const { organization } = await requireSessionWithContext();
  const id = String(formData.get("id"));
  await prisma.dalotStudy.deleteMany({ where: { id, organizationId: organization.id } });
  revalidatePath("/dalots");
  redirect("/dalots");
}

export async function deleteDalotSeriesAction(formData: FormData) {
  const { organization } = await requireSessionWithContext();
  const seriesName = String(formData.get("seriesName"));
  await prisma.dalotStudy.deleteMany({ where: { seriesName, organizationId: organization.id } });
  revalidatePath("/dalots");
  redirect("/dalots");
}

export async function duplicateDalotAction(formData: FormData) {
  const { organization } = await requireSessionWithContext();
  const id = String(formData.get("id"));
  const src = await prisma.dalotStudy.findFirst({ where: { id, organizationId: organization.id } });
  if (!src) return;
  const spec = normalizeSpec(src.spec);
  spec.values.projet = `${spec.values.projet} (copie)`;
  const copy = await prisma.dalotStudy.create({
    data: {
      organizationId: organization.id, name: String(spec.values.projet), seriesName: src.seriesName,
      status: src.status, spec: spec as unknown as object,
    },
  });
  revalidatePath("/dalots");
  redirect(`/dalots/${copy.id}`);
}

const specSchema = z.object({
  version: z.literal(1),
  values: z.record(z.string(), z.union([z.number(), z.string(), z.boolean(), z.null()])),
  defaulted: z.array(z.string()),
  imposed: z.record(z.string(), z.object({ phi: z.number().int().min(6).max(40), s: z.number().min(0.05).max(0.5) }).optional()),
});

/** Enregistrement automatique depuis l'espace de travail (pas de re-rendu de la page). */
export async function saveDalotSpecAction(id: string, raw: unknown): Promise<{ ok: boolean; savedAt?: string; error?: string }> {
  const { organization } = await requireSessionWithContext();
  const parsed = specSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Données invalides." };
  const spec = parsed.data as DalotSpec;
  const res = await prisma.dalotStudy.updateMany({
    where: { id, organizationId: organization.id },
    data: { spec: spec as unknown as object, name: String(spec.values.projet || "Dalot"), status: statusOf(spec) },
  });
  if (res.count === 0) return { ok: false, error: "Étude introuvable." };
  return { ok: true, savedAt: new Date().toISOString() };
}

/** Crée un devis (DQE) dans un projet à partir du métré de l'étude, recalculé côté serveur. */
export async function createQuoteFromDalotAction(id: string, projectId: string): Promise<{ ok: boolean; url?: string; error?: string }> {
  const { organization } = await requireSessionWithContext();
  const [study, project] = await Promise.all([
    prisma.dalotStudy.findFirst({ where: { id, organizationId: organization.id } }),
    prisma.project.findFirst({ where: { id: projectId, organizationId: organization.id } }),
  ]);
  if (!study || !project) return { ok: false, error: "Étude ou projet introuvable." };
  const r = runStudy(normalizeSpec(study.spec));
  if (!r.ok) return { ok: false, error: "Le calcul doit aboutir avant de créer le devis (données manquantes)." };
  const lines = r.study.quantities.lines;
  const lots = Array.from(new Set(lines.map((l) => l.lot)));
  const quote = await prisma.quote.create({
    data: {
      organizationId: organization.id,
      projectId: project.id,
      name: `DQE — ${study.name}`,
      currency: organization.defaultCurrency,
      fgPct: organization.defaultFgPct,
      benefitPct: organization.defaultBenefitPct,
      lots: {
        create: lots.map((lot, i) => ({
          code: String(i + 1).padStart(2, "0"),
          name: lot,
          position: i,
          lines: {
            create: lines.filter((l) => l.lot === lot).map((l, k) => ({
              designation: l.designation, unit: l.unit, quantity: Math.round(l.quantity * 100) / 100, position: k,
            })),
          },
        })),
      },
    },
  });
  revalidatePath(`/projects/${project.id}`);
  return { ok: true, url: `/projects/${project.id}/quotes/${quote.id}` };
}
