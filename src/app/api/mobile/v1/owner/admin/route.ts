/**
 * GET /api/mobile/v1/owner/admin
 *
 * Snapshot Administration pour l'app mobile owner :
 *   - Liste des membres de l'entreprise (admins, managers, RH, owner)
 *   - Rôles disponibles (système + custom de l'entreprise)
 *   - 30 dernières actions du journal d'audit
 *
 * Les actions modificatrices (inviter, changer rôle, retirer membre)
 * sont sur le web — l'app mobile ouvre /dashboard/settings si besoin.
 */

import { prisma } from "@/lib/prisma/client";

import { ok } from "../../_lib/api-response";
import { requireOwnerAuth } from "../../_lib/auth";
import { preflight } from "../../_lib/cors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const auth = await requireOwnerAuth();
  if (!auth.ok) return auth.response;

  const { companyId } = auth.tenant;

  const [memberships, roles, auditLogs, totalEmployees] = await Promise.all([
    prisma.membership.findMany({
      where: { companyId, isActive: true },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            avatarUrl: true,
            phone: true,
            lastLoginAt: true,
          },
        },
        role: {
          select: { id: true, name: true, slug: true, isSystem: true },
        },
      },
      orderBy: [{ isOwner: "desc" }, { joinedAt: "asc" }],
    }),
    prisma.role.findMany({
      where: {
        OR: [{ isSystem: true }, { companyId }],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        isSystem: true,
      },
      orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    }),
    prisma.auditLog.findMany({
      where: { companyId },
      include: {
        actor: {
          select: { id: true, fullName: true, email: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.employee.count({ where: { companyId, isActive: true } }),
  ]);

  return ok({
    members: memberships.map((m) => ({
      id: m.id,
      isOwner: m.isOwner,
      isActive: m.isActive,
      joinedAt: m.joinedAt.toISOString(),
      user: m.user,
      role: m.role,
    })),
    roles: roles,
    auditLogs: auditLogs.map((l) => ({
      id: l.id,
      action: l.action,
      entity: l.entity,
      entityId: l.entityId,
      ipAddress: l.ipAddress,
      createdAt: l.createdAt.toISOString(),
      actor: l.actor,
    })),
    stats: {
      totalMembers: memberships.length,
      totalEmployees,
      totalAuditLogs: auditLogs.length,
    },
    webLinks: {
      settings: "https://ocontrole.com/dashboard/settings",
    },
  });
}

export const OPTIONS = preflight;
