"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword, setSessionCookie } from "@/lib/auth";

export type FormState = { error: string };

const signupSchema = z.object({
  organizationName: z.string().min(2, "Le nom du cabinet est requis."),
  name: z.string().min(2, "Votre nom est requis."),
  email: z.string().email("Adresse email invalide."),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères."),
});

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function signupAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = signupSchema.safeParse({
    organizationName: formData.get("organizationName"),
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const { organizationName, name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Un compte existe déjà avec cet email." };
  }

  const baseSlug = slugify(organizationName) || "cabinet";
  let slug = baseSlug;
  let suffix = 1;
  while (await prisma.organization.findUnique({ where: { slug } })) {
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }

  const passwordHash = await hashPassword(password);

  const { user, organization } = await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: {
        name: organizationName,
        slug,
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
    });
    const user = await tx.user.create({
      data: { email, name, passwordHash },
    });
    await tx.membership.create({
      data: { userId: user.id, organizationId: organization.id, role: "OWNER" },
    });
    return { user, organization };
  });

  await setSessionCookie({ userId: user.id, organizationId: organization.id });
  redirect("/dashboard");
}

const loginSchema = z.object({
  email: z.string().email("Adresse email invalide."),
  password: z.string().min(1, "Mot de passe requis."),
});

export async function loginAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { email },
    include: { memberships: true },
  });

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Email ou mot de passe incorrect." };
  }

  const membership = user.memberships[0];
  if (!membership) {
    return { error: "Aucun cabinet associé à ce compte." };
  }

  await setSessionCookie({ userId: user.id, organizationId: membership.organizationId });
  redirect("/dashboard");
}

// ── Mot de passe oublié ───────────────────────────────────────
// Sans service d'e-mail : la réinitialisation exige le code de récupération
// défini par l'administrateur dans la variable d'environnement PASSWORD_RESET_CODE.

const resetSchema = z
  .object({
    email: z.string().email("Adresse email invalide."),
    code: z.string().min(1, "Code de récupération requis."),
    password: z.string().min(8, "Le nouveau mot de passe doit contenir au moins 8 caractères."),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "Les deux mots de passe ne sont pas identiques." });

function sameSecret(a: string, b: string): boolean {
  // Comparaison à durée constante.
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

export async function resetPasswordAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const expected = process.env.PASSWORD_RESET_CODE ?? "";
  if (expected.length < 12) {
    return {
      error:
        "La récupération n'est pas activée sur ce serveur : l'administrateur doit définir la variable PASSWORD_RESET_CODE (12 caractères minimum).",
    };
  }

  const parsed = resetSchema.safeParse({
    email: formData.get("email"),
    code: formData.get("code"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const { email, code, password } = parsed.data;
  // Ralentit les essais répétés.
  await new Promise((r) => setTimeout(r, 800));

  const user = await prisma.user.findUnique({ where: { email }, include: { memberships: true } });
  if (!sameSecret(code.trim(), expected) || !user) {
    return { error: "Email ou code de récupération incorrect." };
  }
  const membership = user.memberships[0];
  if (!membership) {
    return { error: "Aucun cabinet associé à ce compte." };
  }

  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(password) } });
  await setSessionCookie({ userId: user.id, organizationId: membership.organizationId });
  redirect("/dashboard");
}
