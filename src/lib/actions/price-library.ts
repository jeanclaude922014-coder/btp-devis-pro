"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSessionWithContext } from "@/lib/auth";

export async function createPriceCategoryAction(formData: FormData) {
  const { organization } = await requireSessionWithContext();
  const name = String(formData.get("name") || "").trim();
  if (!name) return;

  const count = await prisma.priceCategory.count({
    where: { organizationId: organization.id },
  });

  await prisma.priceCategory.create({
    data: {
      organizationId: organization.id,
      code: `C${count + 1}`,
      name,
      colorHex: "#334155",
      position: 1000 + count,
      region: organization.defaultRegion,
    },
  });

  revalidatePath("/price-library");
}

export async function deletePriceCategoryAction(formData: FormData) {
  const { organization } = await requireSessionWithContext();
  const categoryId = String(formData.get("categoryId"));

  await prisma.priceCategory.deleteMany({
    where: { id: categoryId, organizationId: organization.id },
  });

  revalidatePath("/price-library");
}

export async function createPriceItemAction(formData: FormData) {
  const { organization } = await requireSessionWithContext();
  const categoryId = String(formData.get("categoryId"));
  const designation = String(formData.get("designation") || "").trim();
  if (!designation) return;

  const category = await prisma.priceCategory.findFirst({
    where: {
      id: categoryId,
      OR: [{ organizationId: organization.id }, { organizationId: null }],
    },
  });
  if (!category) return;

  const count = await prisma.priceItem.count({ where: { categoryId } });

  await prisma.priceItem.create({
    data: {
      organizationId: organization.id,
      categoryId,
      designation,
      unit: String(formData.get("unit") || "u"),
      laborHours: Number(formData.get("laborHours") || 0),
      laborRateXof: Number(formData.get("laborRateXof") || 0),
      materialsXof: Number(formData.get("materialsXof") || 0),
      equipmentXof: Number(formData.get("equipmentXof") || 0),
      region: organization.defaultRegion,
      position: count,
    },
  });

  revalidatePath("/price-library");
}

export async function updatePriceItemFieldsAction(formData: FormData) {
  const { organization } = await requireSessionWithContext();
  const itemId = String(formData.get("itemId"));

  const item = await prisma.priceItem.findFirst({
    where: { id: itemId, organizationId: organization.id },
  });
  if (!item) return; // articles globaux non modifiables

  await prisma.priceItem.update({
    where: { id: itemId },
    data: {
      designation: String(formData.get("designation") || item.designation),
      unit: String(formData.get("unit") || item.unit),
      laborHours: Number(formData.get("laborHours") ?? item.laborHours),
      laborRateXof: Number(formData.get("laborRateXof") ?? item.laborRateXof),
      materialsXof: Number(formData.get("materialsXof") ?? item.materialsXof),
      equipmentXof: Number(formData.get("equipmentXof") ?? item.equipmentXof),
    },
  });

  revalidatePath("/price-library");
}

export async function deletePriceItemAction(formData: FormData) {
  const { organization } = await requireSessionWithContext();
  const itemId = String(formData.get("itemId"));

  await prisma.priceItem.deleteMany({
    where: { id: itemId, organizationId: organization.id },
  });

  revalidatePath("/price-library");
}
