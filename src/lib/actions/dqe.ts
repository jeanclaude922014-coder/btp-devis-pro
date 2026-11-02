"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSessionWithContext } from "@/lib/auth";
import { DqeImportError, extractDqeFile } from "@/lib/dqe/extract";
import { parseDqe } from "@/lib/dqe/parse";
import type { DqeData } from "@/lib/dqe/types";

export type ImportState = { error: string; warnings?: string[] };

const MAX_BYTES = 15 * 1024 * 1024;

export async function importDqeAction(_prev: ImportState, formData: FormData): Promise<ImportState> {
  const { organization } = await requireSessionWithContext();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choisissez un fichier DQE (Excel .xlsx, CSV ou PDF)." };
  }
  if (file.size > MAX_BYTES) {
    return { error: "Fichier trop volumineux (15 Mo maximum)." };
  }

  let data: DqeData;
  try {
    const { sheets, source } = await extractDqeFile(file.name, await file.arrayBuffer());
    data = parseDqe(sheets, source);
  } catch (e) {
    if (e instanceof DqeImportError) return { error: e.message };
    console.error("Import DQE", e);
    return { error: "Lecture du fichier impossible. Vérifiez qu'il s'agit bien d'un DQE au format Excel ou PDF." };
  }

  if (!data.items.length) {
    return {
      error:
        "Aucun article de DQE n'a été reconnu dans ce fichier. Le tableau doit comporter au minimum une désignation, une unité, une quantité et un prix unitaire.",
      warnings: data.report.warnings,
    };
  }

  const typed = String(formData.get("name") ?? "").trim();
  const name = typed || file.name.replace(/\.[^.]+$/, "").replace(/[_]+/g, " ");

  const dqe = await prisma.dqeImport.create({
    data: {
      organizationId: organization.id,
      name: name.slice(0, 160),
      fileName: file.name.slice(0, 200),
      data: data as unknown as object,
    },
  });

  revalidatePath("/dqe");
  redirect(`/dqe/${dqe.id}`);
}

const lotSchema = z.object({
  id: z.string().max(40),
  site: z.string().max(40),
  name: z.string().max(300),
  category: z.string().max(60),
});
const itemSchema = z.object({
  k: z.number().int(),
  lot: z.string().max(40),
  n: z.string().max(60),
  d: z.string().max(2000),
  u: z.string().max(30),
  q: z.number().finite(),
  pu: z.number().finite(),
  sec: z.string().max(300).optional(),
});
const dataSchema = z.object({
  sites: z.array(z.object({ id: z.string().max(40), name: z.string().max(300) })).max(200),
  lots: z.array(lotSchema).max(2000),
  items: z.array(itemSchema).max(20000),
  att: z
    .array(
      z.object({
        d: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        k: z.number().int(),
        q: z.number().finite(),
        o: z.string().max(500).optional(),
      })
    )
    .max(50000),
  suivi: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  tva: z.number().min(0).max(1),
  orig: z.object({ lots: z.array(lotSchema), items: z.array(itemSchema) }),
  report: z.record(z.string(), z.unknown()),
});

export async function saveDqeDataAction(id: string, payload: unknown): Promise<{ ok: boolean; error?: string }> {
  const { organization } = await requireSessionWithContext();
  const parsed = dataSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, error: "Données invalides." };
  const res = await prisma.dqeImport.updateMany({
    where: { id, organizationId: organization.id },
    data: { data: parsed.data as unknown as object },
  });
  if (!res.count) return { ok: false, error: "DQE introuvable." };
  return { ok: true };
}

export async function renameDqeAction(id: string, formData: FormData) {
  const { organization } = await requireSessionWithContext();
  const name = String(formData.get("name") ?? "").trim().slice(0, 160);
  if (!name) return;
  await prisma.dqeImport.updateMany({ where: { id, organizationId: organization.id }, data: { name } });
  revalidatePath(`/dqe/${id}`);
  revalidatePath("/dqe");
}

export async function deleteDqeAction(formData: FormData) {
  const { organization } = await requireSessionWithContext();
  const id = String(formData.get("dqeId"));
  await prisma.dqeImport.deleteMany({ where: { id, organizationId: organization.id } });
  revalidatePath("/dqe");
  redirect("/dqe");
}
