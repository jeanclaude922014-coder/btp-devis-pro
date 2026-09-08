"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSessionWithContext } from "@/lib/auth";
import { DEFAULT_DOCUMENTS } from "@/lib/tenders";

export type FormState = { error: string };

function path(tenderId: string) {
  return `/tenders/${tenderId}`;
}

// ── Dossier (en-tête) ────────────────────────────────────────

const nameSchema = z.object({
  name: z.string().min(2, "Le nom du dossier est requis."),
});

export async function createTenderAction(formData: FormData) {
  const { organization } = await requireSessionWithContext();
  const parsed = nameSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return;

  const tender = await prisma.tenderAnalysis.create({
    data: {
      organizationId: organization.id,
      name: parsed.data.name,
      documents: {
        create: DEFAULT_DOCUMENTS.map((label, position) => ({ label, position })),
      },
    },
  });

  revalidatePath("/tenders");
  redirect(path(tender.id));
}

export async function deleteTenderAction(formData: FormData) {
  const { organization } = await requireSessionWithContext();
  const tenderId = String(formData.get("tenderId"));

  await prisma.tenderAnalysis.deleteMany({
    where: { id: tenderId, organizationId: organization.id },
  });

  revalidatePath("/tenders");
  redirect("/tenders");
}

const identificationSchema = z.object({
  name: z.string().min(2),
  maitreOuvrage: z.string().optional(),
  maitreOuvrageDelegue: z.string().optional(),
  objet: z.string().optional(),
  financement: z.string().optional(),
  modePassation: z.string().optional(),
  referenceAao: z.string().optional(),
  nombreLots: z.coerce.number().int().min(0).optional(),
  montantEstime: z.coerce.number().min(0).optional(),
  prixDossier: z.coerce.number().min(0).optional(),
  plateformeDepot: z.string().optional(),
  contactNom: z.string().optional(),
  contactTelephone: z.string().optional(),
});

function emptyToUndefined(v: FormDataEntryValue | null) {
  const s = v ? String(v).trim() : "";
  return s === "" ? undefined : s;
}

export async function updateTenderIdentificationAction(
  tenderId: string,
  formData: FormData
): Promise<void> {
  const { organization } = await requireSessionWithContext();
  const tender = await prisma.tenderAnalysis.findFirst({
    where: { id: tenderId, organizationId: organization.id },
  });
  if (!tender) return;

  const parsed = identificationSchema.safeParse({
    name: formData.get("name") || tender.name,
    maitreOuvrage: emptyToUndefined(formData.get("maitreOuvrage")),
    maitreOuvrageDelegue: emptyToUndefined(formData.get("maitreOuvrageDelegue")),
    objet: emptyToUndefined(formData.get("objet")),
    financement: emptyToUndefined(formData.get("financement")),
    modePassation: emptyToUndefined(formData.get("modePassation")),
    referenceAao: emptyToUndefined(formData.get("referenceAao")),
    nombreLots: emptyToUndefined(formData.get("nombreLots")),
    montantEstime: emptyToUndefined(formData.get("montantEstime")),
    prixDossier: emptyToUndefined(formData.get("prixDossier")),
    plateformeDepot: emptyToUndefined(formData.get("plateformeDepot")),
    contactNom: emptyToUndefined(formData.get("contactNom")),
    contactTelephone: emptyToUndefined(formData.get("contactTelephone")),
  });
  if (!parsed.success) return;

  await prisma.tenderAnalysis.update({
    where: { id: tenderId },
    data: parsed.data,
  });

  revalidatePath("/tenders");
  revalidatePath(path(tenderId));
}

const garantiesSchema = z.object({
  dateLimiteDepot: z.coerce.date().optional(),
  dateOuverturePlis: z.coerce.date().optional(),
  delaiValiditeOffreJours: z.coerce.number().int().min(0).optional(),
  delaiExecutionJours: z.coerce.number().int().min(0).optional(),
  garantieSoumissionXof: z.coerce.number().min(0).optional(),
  garantieBonneExecutionPct: z.coerce.number().min(0).optional(),
  retenueGarantiePct: z.coerce.number().min(0).optional(),
  avanceDemarragePct: z.coerce.number().min(0).optional(),
});

export async function updateTenderGarantiesAction(
  tenderId: string,
  formData: FormData
): Promise<void> {
  const { organization } = await requireSessionWithContext();
  const tender = await prisma.tenderAnalysis.findFirst({
    where: { id: tenderId, organizationId: organization.id },
  });
  if (!tender) return;

  const parsed = garantiesSchema.safeParse({
    dateLimiteDepot: emptyToUndefined(formData.get("dateLimiteDepot")),
    dateOuverturePlis: emptyToUndefined(formData.get("dateOuverturePlis")),
    delaiValiditeOffreJours: emptyToUndefined(formData.get("delaiValiditeOffreJours")),
    delaiExecutionJours: emptyToUndefined(formData.get("delaiExecutionJours")),
    garantieSoumissionXof: emptyToUndefined(formData.get("garantieSoumissionXof")),
    garantieBonneExecutionPct: emptyToUndefined(formData.get("garantieBonneExecutionPct")),
    retenueGarantiePct: emptyToUndefined(formData.get("retenueGarantiePct")),
    avanceDemarragePct: emptyToUndefined(formData.get("avanceDemarragePct")),
  });
  if (!parsed.success) return;

  await prisma.tenderAnalysis.update({
    where: { id: tenderId },
    data: parsed.data,
  });

  revalidatePath(path(tenderId));
}

const decisionSchema = z.object({
  decision: z.enum(["GO", "GO_CONDITIONNEL", "NO_GO"]).optional(),
  decisionNote: z.string().optional(),
});

export async function updateTenderDecisionAction(
  tenderId: string,
  formData: FormData
): Promise<void> {
  const { organization } = await requireSessionWithContext();
  const tender = await prisma.tenderAnalysis.findFirst({
    where: { id: tenderId, organizationId: organization.id },
  });
  if (!tender) return;

  const parsed = decisionSchema.safeParse({
    decision: emptyToUndefined(formData.get("decision")),
    decisionNote: emptyToUndefined(formData.get("decisionNote")),
  });
  if (!parsed.success) return;

  await prisma.tenderAnalysis.update({
    where: { id: tenderId },
    data: parsed.data,
  });

  revalidatePath(path(tenderId));
}

// ── Documents ────────────────────────────────────────────────

export async function addDocumentAction(formData: FormData) {
  const { organization } = await requireSessionWithContext();
  const tenderId = String(formData.get("tenderId"));
  const label = String(formData.get("label") || "").trim();
  if (!label) return;

  const tender = await prisma.tenderAnalysis.findFirst({
    where: { id: tenderId, organizationId: organization.id },
    include: { documents: true },
  });
  if (!tender) return;

  await prisma.tenderDocument.create({
    data: { tenderId, label, position: tender.documents.length },
  });
  revalidatePath(path(tenderId));
}

export async function updateDocumentAction(formData: FormData) {
  const { organization } = await requireSessionWithContext();
  const documentId = String(formData.get("documentId"));

  const doc = await prisma.tenderDocument.findFirst({
    where: { id: documentId, tender: { organizationId: organization.id } },
    include: { tender: true },
  });
  if (!doc) return;

  await prisma.tenderDocument.update({
    where: { id: documentId },
    data: {
      status: String(formData.get("status") || doc.status),
      comment: emptyToUndefined(formData.get("comment")) ?? null,
    },
  });
  revalidatePath(path(doc.tenderId));
}

export async function deleteDocumentAction(formData: FormData) {
  const { organization } = await requireSessionWithContext();
  const documentId = String(formData.get("documentId"));

  const doc = await prisma.tenderDocument.findFirst({
    where: { id: documentId, tender: { organizationId: organization.id } },
  });
  if (!doc) return;

  await prisma.tenderDocument.delete({ where: { id: documentId } });
  revalidatePath(path(doc.tenderId));
}

// ── Personnel ────────────────────────────────────────────────

export async function addPersonnelAction(formData: FormData) {
  const { organization } = await requireSessionWithContext();
  const tenderId = String(formData.get("tenderId"));
  const poste = String(formData.get("poste") || "").trim();
  if (!poste) return;

  const tender = await prisma.tenderAnalysis.findFirst({
    where: { id: tenderId, organizationId: organization.id },
    include: { personnel: true },
  });
  if (!tender) return;

  await prisma.tenderPersonnel.create({
    data: {
      tenderId,
      poste,
      nbExige: Number(formData.get("nbExige") || 1),
      formationExigee: emptyToUndefined(formData.get("formationExigee")) ?? null,
      experienceExigee: emptyToUndefined(formData.get("experienceExigee")) ?? null,
      position: tender.personnel.length,
    },
  });
  revalidatePath(path(tenderId));
}

export async function updatePersonnelAction(formData: FormData) {
  const { organization } = await requireSessionWithContext();
  const id = String(formData.get("personnelId"));

  const row = await prisma.tenderPersonnel.findFirst({
    where: { id, tender: { organizationId: organization.id } },
  });
  if (!row) return;

  await prisma.tenderPersonnel.update({
    where: { id },
    data: {
      poste: String(formData.get("poste") || row.poste),
      nbExige: Number(formData.get("nbExige") ?? row.nbExige),
      formationExigee: emptyToUndefined(formData.get("formationExigee")) ?? null,
      experienceExigee: emptyToUndefined(formData.get("experienceExigee")) ?? null,
      nbDisponible: Number(formData.get("nbDisponible") ?? row.nbDisponible),
    },
  });
  revalidatePath(path(row.tenderId));
}

export async function deletePersonnelAction(formData: FormData) {
  const { organization } = await requireSessionWithContext();
  const id = String(formData.get("personnelId"));

  const row = await prisma.tenderPersonnel.findFirst({
    where: { id, tender: { organizationId: organization.id } },
  });
  if (!row) return;

  await prisma.tenderPersonnel.delete({ where: { id } });
  revalidatePath(path(row.tenderId));
}

// ── Matériel ─────────────────────────────────────────────────

export async function addMaterielAction(formData: FormData) {
  const { organization } = await requireSessionWithContext();
  const tenderId = String(formData.get("tenderId"));
  const designation = String(formData.get("designation") || "").trim();
  if (!designation) return;

  const tender = await prisma.tenderAnalysis.findFirst({
    where: { id: tenderId, organizationId: organization.id },
    include: { materiels: true },
  });
  if (!tender) return;

  await prisma.tenderMateriel.create({
    data: {
      tenderId,
      designation,
      nbExige: Number(formData.get("nbExige") || 1),
      position: tender.materiels.length,
    },
  });
  revalidatePath(path(tenderId));
}

export async function updateMaterielAction(formData: FormData) {
  const { organization } = await requireSessionWithContext();
  const id = String(formData.get("materielId"));

  const row = await prisma.tenderMateriel.findFirst({
    where: { id, tender: { organizationId: organization.id } },
  });
  if (!row) return;

  await prisma.tenderMateriel.update({
    where: { id },
    data: {
      designation: String(formData.get("designation") || row.designation),
      nbExige: Number(formData.get("nbExige") ?? row.nbExige),
      nbPropre: Number(formData.get("nbPropre") ?? row.nbPropre),
      nbLocation: Number(formData.get("nbLocation") ?? row.nbLocation),
    },
  });
  revalidatePath(path(row.tenderId));
}

export async function deleteMaterielAction(formData: FormData) {
  const { organization } = await requireSessionWithContext();
  const id = String(formData.get("materielId"));

  const row = await prisma.tenderMateriel.findFirst({
    where: { id, tender: { organizationId: organization.id } },
  });
  if (!row) return;

  await prisma.tenderMateriel.delete({ where: { id } });
  revalidatePath(path(row.tenderId));
}

// ── Qualification financière ────────────────────────────────

export async function addQualificationAction(formData: FormData) {
  const { organization } = await requireSessionWithContext();
  const tenderId = String(formData.get("tenderId"));
  const critere = String(formData.get("critere") || "").trim();
  if (!critere) return;

  const tender = await prisma.tenderAnalysis.findFirst({
    where: { id: tenderId, organizationId: organization.id },
    include: { qualifications: true },
  });
  if (!tender) return;

  await prisma.tenderQualification.create({
    data: { tenderId, critere, position: tender.qualifications.length },
  });
  revalidatePath(path(tenderId));
}

export async function updateQualificationAction(formData: FormData) {
  const { organization } = await requireSessionWithContext();
  const id = String(formData.get("qualificationId"));

  const row = await prisma.tenderQualification.findFirst({
    where: { id, tender: { organizationId: organization.id } },
  });
  if (!row) return;

  const exigenceValeurRaw = emptyToUndefined(formData.get("exigenceValeur"));
  const valeurReelleRaw = emptyToUndefined(formData.get("valeurReelle"));

  await prisma.tenderQualification.update({
    where: { id },
    data: {
      critere: String(formData.get("critere") || row.critere),
      exigenceLabel: emptyToUndefined(formData.get("exigenceLabel")) ?? null,
      exigenceValeur: exigenceValeurRaw ? Number(exigenceValeurRaw) : null,
      valeurReelle: valeurReelleRaw ? Number(valeurReelleRaw) : null,
    },
  });
  revalidatePath(path(row.tenderId));
}

export async function deleteQualificationAction(formData: FormData) {
  const { organization } = await requireSessionWithContext();
  const id = String(formData.get("qualificationId"));

  const row = await prisma.tenderQualification.findFirst({
    where: { id, tender: { organizationId: organization.id } },
  });
  if (!row) return;

  await prisma.tenderQualification.delete({ where: { id } });
  revalidatePath(path(row.tenderId));
}

// ── Exemple pré-rempli : DAO AGEROUTE "Bacs à traille" ─────────

export async function seedExampleTenderAction() {
  const { organization } = await requireSessionWithContext();

  const tender = await prisma.tenderAnalysis.create({
    data: {
      organizationId: organization.id,
      name: "Exemple — AO AGEROUTE Bacs à traille (Lot 1 Sahoubly)",
      maitreOuvrage: "Ministère des Infrastructures et de l'Entretien Routier (MIER)",
      maitreOuvrageDelegue: "AGEROUTE",
      objet:
        "Travaux de réhabilitation de bacs à traille et d'aménagement de sites des bacs y compris rampe d'accès en béton armé",
      financement: "Fonds d'Entretien Routier (FER)",
      modePassation: "Appel d'offres ouvert national (art. 56 du Code des Marchés Publics)",
      referenceAao: "AAO N° T ..../2026",
      nombreLots: 2,
      montantEstime: 240000000,
      prixDossier: 50000,
      plateformeDepot: "SIGOMAP (100% dématérialisé, dépôt physique non autorisé)",
      contactNom: "M. Edoukou Valère — Directeur des Marchés et Contrats",
      contactTelephone: "(225) 27 20 25 10 00 / 07 17 86 99 54",
      delaiValiditeOffreJours: 120,
      delaiExecutionJours: 180,
      garantieSoumissionXof: 4400000,
      garantieBonneExecutionPct: 5,
      retenueGarantiePct: 5,
      avanceDemarragePct: 15,
      documents: {
        create: DEFAULT_DOCUMENTS.map((label, position) => ({
          label,
          position,
          status: "manquant",
        })),
      },
      personnel: {
        create: [
          {
            poste: "Directeur des travaux",
            nbExige: 1,
            formationExigee: "Ingénieur électromécanique / électrotechnique ou équivalent",
            experienceExigee:
              "5 ans d'expérience ; a dirigé au moins 1 projet de réhabilitation/entretien de bacs ou bateau",
            position: 0,
          },
          {
            poste: "Conducteur des travaux (électromécanique)",
            nbExige: 1,
            formationExigee: "Technicien supérieur électromécanique / électrotechnique",
            experienceExigee: "3 ans ; a conduit au moins 1 projet d'entretien de bacs ou bateau",
            position: 1,
          },
          {
            poste: "Conducteur des travaux (génie civil)",
            nbExige: 1,
            formationExigee: "Technicien supérieur génie civil ou équivalent",
            experienceExigee:
              "3 ans ; a conduit au moins 1 projet de construction/réhabilitation de bâtiment",
            position: 2,
          },
          {
            poste: "Responsable Sécurité et Environnement",
            nbExige: 1,
            formationExigee: "Technicien supérieur Environnement / HSE",
            experienceExigee: "3 ans ; a réalisé au moins 1 mission de mise en œuvre d'un PGES",
            position: 3,
          },
        ],
      },
      materiels: {
        create: [
          { designation: "Camion benne (12 m³)", nbExige: 1, position: 0 },
          { designation: "Véhicule de liaison type Pick-up", nbExige: 1, position: 1 },
          { designation: "Bétonnière", nbExige: 1, position: 2 },
          { designation: "Chargeuse", nbExige: 1, position: 3 },
          { designation: "Compacteur", nbExige: 1, position: 4 },
        ],
      },
      qualifications: {
        create: [
          {
            critere: "Chiffre d'affaires annuel moyen (5 dernières années)",
            exigenceLabel: "240 000 000 FCFA (Lot 1)",
            exigenceValeur: 240000000,
            position: 0,
          },
          {
            critere: "Expérience générale de construction (5 ans)",
            exigenceLabel: "1 marché de travaux de génie civil",
            position: 1,
          },
          {
            critere: "Expérience spécifique — 1 projet bacs/bateau ou construction navale",
            exigenceLabel: "≥ 237 000 000 FCFA (Lot 1)",
            exigenceValeur: 237000000,
            position: 2,
          },
        ],
      },
    },
  });

  revalidatePath("/tenders");
  redirect(path(tender.id));
}
