import type { PermissionSlug } from "@/config/permissions";
import type { TenantContext } from "@/types";
import { prisma } from "@/lib/prisma/client";

export async function getTenantContext(
  supabaseUid: string,
): Promise<TenantContext | null> {
  const user = await prisma.user.findUnique({
    where: { supabaseUid },
    include: {
      memberships: {
        where: { isActive: true },
        include: {
          company: {
            select: {
              id: true,
              name: true,
              slug: true,
              onboardingStep: true,
              isActive: true,
              sector: true,
              country: true,
              city: true,
              timezone: true,
              currency: true,
              email: true,
            },
          },
          role: {
            include: {
              rolePermissions: {
                include: { permission: true },
              },
            },
          },
        },
        take: 1,
      },
    },
  });

  if (!user) return null;

  const membership = user.memberships[0];
  if (!membership) return null;

  const permissions = membership.role.rolePermissions.map(
    (rp) => rp.permission.slug as PermissionSlug,
  );

  return {
    userId: user.id,
    companyId: membership.company.id,
    membershipId: membership.id,
    role: membership.role.slug,
    isOwner: membership.isOwner,
    permissions,
    company: {
      name: membership.company.name,
      slug: membership.company.slug,
      onboardingStep: membership.company.onboardingStep,
      sector: membership.company.sector,
      country: membership.company.country,
      city: membership.company.city,
      timezone: membership.company.timezone,
      currency: membership.company.currency,
      email: membership.company.email,
    },
    user: {
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
    },
  };
}

export function hasPermission(
  context: TenantContext,
  permission: PermissionSlug,
): boolean {
  if (context.role === "owner") return true;
  return context.permissions.includes(permission);
}

export function requirePermission(
  context: TenantContext,
  permission: PermissionSlug,
): void {
  if (!hasPermission(context, permission)) {
    throw new Error(`Permission requise : ${permission}`);
  }
}
