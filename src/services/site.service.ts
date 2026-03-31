import { prisma } from "@/lib/prisma/client";
import type { CreateSiteInput, UpdateSiteInput } from "@/validations/site.schema";

export async function getSites(companyId: string) {
  return prisma.site.findMany({
    where: { companyId },
    include: {
      _count: { select: { employees: { where: { isActive: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getSiteById(companyId: string, siteId: string) {
  return prisma.site.findFirst({
    where: { id: siteId, companyId },
    include: {
      departments: { where: { isActive: true }, orderBy: { name: "asc" } },
      _count: { select: { employees: { where: { isActive: true } } } },
    },
  });
}

export async function createSite(companyId: string, data: CreateSiteInput) {
  return prisma.site.create({
    data: { companyId, ...data },
  });
}

export async function updateSite(companyId: string, data: UpdateSiteInput) {
  const { id, ...rest } = data;
  return prisma.site.update({
    where: { id },
    data: rest,
  });
}

export async function deleteSite(companyId: string, siteId: string) {
  const site = await prisma.site.findFirst({
    where: { id: siteId, companyId },
    include: { _count: { select: { employees: { where: { isActive: true } } } } },
  });

  if (!site) throw new Error("Site introuvable");
  if (site._count.employees > 0) {
    throw new Error("Impossible de supprimer un site avec des employés actifs");
  }

  return prisma.site.delete({ where: { id: siteId } });
}

export async function getSiteCount(companyId: string): Promise<number> {
  return prisma.site.count({ where: { companyId, isActive: true } });
}
