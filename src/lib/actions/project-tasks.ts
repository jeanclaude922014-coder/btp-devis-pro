"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSessionWithContext } from "@/lib/auth";
import type { DqeData } from "@/lib/dqe/types";
import { TASK_STATUSES, type TaskStatus } from "@/lib/project-tasks";

export type TaskFormState = { error: string; ok?: number };

const PATH = "/gestion-projet";

const optDate = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? new Date(`${v}T12:00:00Z`) : null))
  .refine((d) => d === null || !Number.isNaN(d.getTime()), "Date invalide.");

const taskSchema = z
  .object({
    title: z.string().trim().min(2, "Indiquez l'intitulé de la tâche.").max(200),
    projectId: z.string().trim().optional().transform((v) => v || null),
    lot: z.string().trim().max(120).optional().transform((v) => v || null),
    assignee: z.string().trim().max(120).optional().transform((v) => v || null),
    workers: z.coerce.number().int().min(0).max(999).default(0),
    equipment: z.string().trim().max(200).optional().transform((v) => v || null),
    priority: z.enum(["haute", "normale", "basse"]).default("normale"),
    startDate: optDate,
    dueDate: optDate,
    notes: z.string().trim().max(2000).optional().transform((v) => v || null),
  })
  .refine((t) => !t.startDate || !t.dueDate || t.startDate <= t.dueDate, {
    message: "L'échéance doit être postérieure au début.",
  });

function readTaskForm(formData: FormData) {
  const get = (k: string) => {
    const v = formData.get(k);
    return v === null ? undefined : String(v);
  };
  return taskSchema.safeParse({
    title: get("title"),
    projectId: get("projectId"),
    lot: get("lot"),
    assignee: get("assignee"),
    workers: get("workers") || 0,
    equipment: get("equipment"),
    priority: get("priority") || "normale",
    startDate: get("startDate"),
    dueDate: get("dueDate"),
    notes: get("notes"),
  });
}

async function checkProject(organizationId: string, projectId: string | null) {
  if (!projectId) return true;
  const p = await prisma.project.findFirst({ where: { id: projectId, organizationId } });
  return !!p;
}

export async function createTaskAction(_prev: TaskFormState, formData: FormData): Promise<TaskFormState> {
  const { organization } = await requireSessionWithContext();
  const parsed = readTaskForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  if (!(await checkProject(organization.id, parsed.data.projectId))) return { error: "Chantier introuvable." };

  const last = await prisma.projectTask.findFirst({
    where: { organizationId: organization.id, status: "a_faire" },
    orderBy: { position: "desc" },
  });
  await prisma.projectTask.create({
    data: { ...parsed.data, organizationId: organization.id, status: "a_faire", position: (last?.position ?? 0) + 1 },
  });
  revalidatePath(PATH);
  return { error: "", ok: Date.now() };
}

export async function updateTaskAction(taskId: string, _prev: TaskFormState, formData: FormData): Promise<TaskFormState> {
  const { organization } = await requireSessionWithContext();
  const parsed = readTaskForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  if (!(await checkProject(organization.id, parsed.data.projectId))) return { error: "Chantier introuvable." };
  const progress = z.coerce.number().int().min(0).max(100).safeParse(formData.get("progress") ?? 0);
  const res = await prisma.projectTask.updateMany({
    where: { id: taskId, organizationId: organization.id },
    data: { ...parsed.data, ...(progress.success ? { progress: progress.data } : {}) },
  });
  if (!res.count) return { error: "Tâche introuvable." };
  revalidatePath(PATH);
  return { error: "", ok: Date.now() };
}

/** Déplace une tâche dans une colonne. Terminé ⇒ 100 %, retour en arrière ⇒ avancement plafonné. */
export async function moveTaskAction(taskId: string, status: TaskStatus) {
  const { organization } = await requireSessionWithContext();
  if (!TASK_STATUSES.includes(status)) return;
  const task = await prisma.projectTask.findFirst({ where: { id: taskId, organizationId: organization.id } });
  if (!task || task.status === status) return;
  const last = await prisma.projectTask.findFirst({
    where: { organizationId: organization.id, status },
    orderBy: { position: "desc" },
  });
  let progress = task.progress;
  if (status === "termine") progress = 100;
  else if (status === "en_cours") progress = task.progress >= 100 ? 90 : Math.max(task.progress, 5);
  else progress = 0;
  await prisma.projectTask.update({
    where: { id: task.id },
    data: {
      status,
      progress,
      position: (last?.position ?? 0) + 1,
      completedAt: status === "termine" ? new Date() : null,
      startDate: status === "en_cours" && !task.startDate ? new Date() : task.startDate,
    },
  });
  revalidatePath(PATH);
}

export async function setTaskProgressAction(taskId: string, progress: number) {
  const { organization } = await requireSessionWithContext();
  const p = Math.max(0, Math.min(100, Math.round(progress)));
  const task = await prisma.projectTask.findFirst({ where: { id: taskId, organizationId: organization.id } });
  if (!task) return;
  const status: TaskStatus = p >= 100 ? "termine" : p > 0 ? "en_cours" : task.status === "termine" ? "en_cours" : (task.status as TaskStatus);
  await prisma.projectTask.update({
    where: { id: task.id },
    data: {
      progress: p,
      status,
      completedAt: status === "termine" ? (task.completedAt ?? new Date()) : null,
      startDate: status === "en_cours" && !task.startDate ? new Date() : task.startDate,
    },
  });
  revalidatePath(PATH);
}

export async function deleteTaskAction(taskId: string) {
  const { organization } = await requireSessionWithContext();
  await prisma.projectTask.deleteMany({ where: { id: taskId, organizationId: organization.id } });
  revalidatePath(PATH);
}

/** Crée une tâche « À faire » par lot d'un DQE importé. */
export async function tasksFromDqeAction(_prev: TaskFormState, formData: FormData): Promise<TaskFormState> {
  const { organization } = await requireSessionWithContext();
  const dqeId = String(formData.get("dqeId") ?? "");
  const projectId = String(formData.get("projectId") ?? "") || null;
  if (!(await checkProject(organization.id, projectId))) return { error: "Chantier introuvable." };
  const dqe = await prisma.dqeImport.findFirst({ where: { id: dqeId, organizationId: organization.id } });
  if (!dqe) return { error: "Choisissez un DQE importé." };
  const data = dqe.data as unknown as DqeData;
  const multi = data.sites.length > 1;
  const existing = await prisma.projectTask.findMany({
    where: { organizationId: organization.id, projectId },
    select: { title: true },
  });
  const have = new Set(existing.map((t) => t.title));
  const last = await prisma.projectTask.findFirst({
    where: { organizationId: organization.id, status: "a_faire" },
    orderBy: { position: "desc" },
  });
  let pos = last?.position ?? 0;
  const rows = data.lots
    .map((l) => {
      const site = data.sites.find((s) => s.id === l.site)?.name ?? "";
      const n = data.items.filter((i) => i.lot === l.id).length;
      const title = multi ? `${l.name} — ${site.replace(/^\d+\.\s*/, "")}` : l.name;
      return { l, title: title.slice(0, 200), n };
    })
    .filter((r) => !have.has(r.title));
  if (!rows.length) return { error: "Les lots de ce DQE sont déjà dans le tableau." };
  await prisma.projectTask.createMany({
    data: rows.map((r) => ({
      organizationId: organization.id,
      projectId,
      title: r.title,
      lot: r.l.name.slice(0, 120),
      notes: `${r.n} article(s) du DQE « ${dqe.name} ».`,
      status: "a_faire",
      position: ++pos,
    })),
  });
  revalidatePath(PATH);
  return { error: "", ok: rows.length };
}
