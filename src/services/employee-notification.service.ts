import type { EmployeeNotificationTarget, NotificationPriority } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";

export interface SendNotificationInput {
  companyId: string;
  sentById: string;
  title: string;
  message: string;
  priority?: NotificationPriority;
  target: EmployeeNotificationTarget;
  employeeId?: string;
  siteId?: string;
}

export async function sendNotification(input: SendNotificationInput) {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  return prisma.employeeNotification.create({
    data: {
      companyId: input.companyId,
      sentById: input.sentById,
      title: input.title,
      message: input.message,
      priority: input.priority ?? "NORMAL",
      target: input.target,
      employeeId: input.target === "INDIVIDUAL" ? input.employeeId : null,
      siteId: input.target === "SITE" ? input.siteId : null,
      expiresAt,
    },
  });
}

export async function getNotificationsForEmployee(
  companyId: string,
  employeeId: string,
  siteId: string | null,
) {
  const now = new Date();

  const notifications = await prisma.employeeNotification.findMany({
    where: {
      companyId,
      expiresAt: { gt: now },
      OR: [
        { target: "ALL" },
        { target: "INDIVIDUAL", employeeId },
        ...(siteId ? [{ target: "SITE" as const, siteId }] : []),
      ],
    },
    include: {
      reads: {
        where: { employeeId },
        select: { readAt: true, dismissedAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return notifications.map((n) => ({
    id: n.id,
    title: n.title,
    message: n.message,
    priority: n.priority,
    target: n.target,
    createdAt: n.createdAt,
    expiresAt: n.expiresAt,
    isRead: n.reads.length > 0,
    isDismissed: n.reads.some((r) => r.dismissedAt !== null),
  }));
}

export async function getUnreadCount(
  companyId: string,
  employeeId: string,
  siteId: string | null,
) {
  const now = new Date();

  const total = await prisma.employeeNotification.count({
    where: {
      companyId,
      expiresAt: { gt: now },
      OR: [
        { target: "ALL" },
        { target: "INDIVIDUAL", employeeId },
        ...(siteId ? [{ target: "SITE" as const, siteId }] : []),
      ],
      reads: { none: { employeeId } },
    },
  });

  return total;
}

export async function markAsRead(notificationId: string, employeeId: string) {
  return prisma.employeeNotificationRead.upsert({
    where: {
      notificationId_employeeId: { notificationId, employeeId },
    },
    create: { notificationId, employeeId },
    update: {},
  });
}

/**
 * Marque comme lues TOUTES les notifications visibles par cet employé qui
 * ne le sont pas encore. Utilisé par l'action « tout marquer comme lu » du mobile.
 * Renvoie le nombre de notifications nouvellement marquées.
 */
export async function markAllAsRead(
  companyId: string,
  employeeId: string,
  siteId: string | null,
) {
  const now = new Date();

  const unread = await prisma.employeeNotification.findMany({
    where: {
      companyId,
      expiresAt: { gt: now },
      OR: [
        { target: "ALL" },
        { target: "INDIVIDUAL", employeeId },
        ...(siteId ? [{ target: "SITE" as const, siteId }] : []),
      ],
      reads: { none: { employeeId } },
    },
    select: { id: true },
  });

  if (unread.length === 0) return 0;

  await prisma.employeeNotificationRead.createMany({
    data: unread.map((n) => ({ notificationId: n.id, employeeId })),
    skipDuplicates: true,
  });

  return unread.length;
}

export async function dismissNotification(notificationId: string, employeeId: string) {
  return prisma.employeeNotificationRead.upsert({
    where: {
      notificationId_employeeId: { notificationId, employeeId },
    },
    create: { notificationId, employeeId, dismissedAt: new Date() },
    update: { dismissedAt: new Date() },
  });
}

export async function getSentNotifications(companyId: string) {
  const notifications = await prisma.employeeNotification.findMany({
    where: { companyId },
    include: {
      employee: { select: { firstName: true, lastName: true } },
      site: { select: { name: true } },
      _count: { select: { reads: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return notifications.map((n) => ({
    id: n.id,
    title: n.title,
    message: n.message,
    priority: n.priority,
    target: n.target,
    employeeName: n.employee ? `${n.employee.firstName} ${n.employee.lastName}` : null,
    siteName: n.site?.name ?? null,
    readCount: n._count.reads,
    createdAt: n.createdAt,
    expiresAt: n.expiresAt,
    isExpired: n.expiresAt < new Date(),
  }));
}

export async function deleteNotification(notificationId: string, companyId: string) {
  return prisma.employeeNotification.deleteMany({
    where: { id: notificationId, companyId },
  });
}
