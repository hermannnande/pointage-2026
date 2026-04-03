import { addDays } from "date-fns";

import {
  ALL_PERMISSIONS,
  ROLE_PERMISSIONS,
  SYSTEM_ROLES,
} from "@/config/permissions";
import { TRIAL_DAYS } from "@/lib/constants";
import { prisma } from "@/lib/prisma/client";

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

async function getUniqueSlug(name: string): Promise<string> {
  const base = generateSlug(name);
  let slug = base;
  let counter = 1;

  while (await prisma.company.findUnique({ where: { slug } })) {
    slug = `${base}-${counter}`;
    counter++;
  }

  return slug;
}

export async function createCompanyWithOwner(params: {
  userId: string;
  companyName: string;
  sector?: string;
  country: string;
  city?: string;
  timezone: string;
  currency: string;
}) {
  const slug = await getUniqueSlug(params.companyName);

  return prisma.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: {
        name: params.companyName,
        slug,
        sector: params.sector || null,
        country: params.country,
        city: params.city || null,
        timezone: params.timezone,
        currency: params.currency,
        onboardingStep: 1,
        trialEndsAt: addDays(new Date(), TRIAL_DAYS),
      },
    });

    await ensurePermissionsExist(tx);

    const roles = await ensureSystemRolesExist(tx, company.id);
    const ownerRole = roles.find((r) => r.slug === "owner")!;

    await tx.membership.create({
      data: {
        userId: params.userId,
        companyId: company.id,
        roleId: ownerRole.id,
        isOwner: true,
      },
    });

    await seedDefaultLeaveTypes(tx, company.id);

    let starterPlan = await tx.plan.findUnique({
      where: { slug: "starter" },
    });

    if (!starterPlan) {
      starterPlan = await tx.plan.create({
        data: {
          name: "Starter",
          slug: "starter",
          description: "Pour les petits commerces et entrepreneurs",
          priceMonthly: 4500,
          priceYearly: 43200,
          currency: "XOF",
          maxEmployees: 50,
          maxSites: 3,
          features: [
            "Jusqu'à 50 employés",
            "Jusqu'à 3 sites",
            "Pointage entrée / sortie / pause",
            "Géolocalisation et géofence",
            "Dashboard temps réel",
            "Gestion des horaires",
            "Rapports basiques",
            "Export CSV",
          ],
          isActive: true,
        },
      });
    }

    const now = new Date();
    await tx.subscription.create({
      data: {
        companyId: company.id,
        planId: starterPlan.id,
        status: "TRIALING",
        billingCycle: "MONTHLY",
        currentPeriodStart: now,
        currentPeriodEnd: addDays(now, TRIAL_DAYS),
        trialEndsAt: addDays(now, TRIAL_DAYS),
      },
    });

    return company;
  });
}

async function ensurePermissionsExist(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
) {
  const existing = await tx.permission.findMany({
    select: { slug: true },
  });
  const existingSlugs = new Set(existing.map((p) => p.slug));

  const toCreate = ALL_PERMISSIONS.filter((p) => !existingSlugs.has(p.slug));

  if (toCreate.length > 0) {
    await tx.permission.createMany({ data: toCreate });
  }
}

async function ensureSystemRolesExist(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  companyId: string,
) {
  const allPermissions = await tx.permission.findMany();
  const permMap = new Map(allPermissions.map((p) => [p.slug, p.id]));

  const roles = [];

  for (const roleDef of SYSTEM_ROLES) {
    let role = await tx.role.findUnique({
      where: { slug_companyId: { slug: roleDef.slug, companyId } },
    });

    if (!role) {
      role = await tx.role.create({
        data: {
          name: roleDef.name,
          slug: roleDef.slug,
          description: roleDef.description,
          isSystem: true,
          companyId,
        },
      });

      const perms = ROLE_PERMISSIONS[roleDef.slug] || [];
      const rolePermData = perms
        .map((permSlug) => {
          const permId = permMap.get(permSlug);
          if (!permId) return null;
          return { roleId: role!.id, permissionId: permId };
        })
        .filter(Boolean) as { roleId: string; permissionId: string }[];

      if (rolePermData.length > 0) {
        await tx.rolePermission.createMany({ data: rolePermData });
      }
    }

    roles.push(role);
  }

  return roles;
}

async function seedDefaultLeaveTypes(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  companyId: string,
) {
  const defaults = [
    { name: "Congé annuel", slug: "annual", color: "#3B82F6", defaultDays: 30, isPaid: true },
    { name: "Congé maladie", slug: "sick", color: "#EF4444", defaultDays: 15, isPaid: true, requiresDoc: true },
    { name: "Congé maternité", slug: "maternity", color: "#EC4899", defaultDays: 90, isPaid: true },
    { name: "Congé sans solde", slug: "unpaid", color: "#6B7280", defaultDays: 0, isPaid: false },
    { name: "Permission exceptionnelle", slug: "exceptional", color: "#F59E0B", defaultDays: 5, isPaid: true },
  ];

  await tx.leaveType.createMany({
    data: defaults.map((lt) => ({ ...lt, companyId })),
  });
}

export async function createSiteForCompany(params: {
  companyId: string;
  name: string;
  address?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  workStartTime?: string;
  workEndTime?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const site = await tx.site.create({
      data: {
        companyId: params.companyId,
        name: params.name,
        address: params.address || null,
        city: params.city || null,
        latitude: params.latitude || null,
        longitude: params.longitude || null,
        workStartTime: params.workStartTime || "08:00",
        workEndTime: params.workEndTime || "17:00",
      },
    });

    await tx.company.update({
      where: { id: params.companyId },
      data: { onboardingStep: 2 },
    });

    return site;
  });
}

export async function completeOnboarding(companyId: string) {
  return prisma.company.update({
    where: { id: companyId },
    data: { onboardingStep: 3 },
  });
}
