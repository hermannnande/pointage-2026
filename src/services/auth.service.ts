import { prisma } from "@/lib/prisma/client";

export async function findOrCreateUser(params: {
  supabaseUid: string;
  email: string;
  fullName: string;
  phone?: string;
}) {
  const existing = await prisma.user.findUnique({
    where: { supabaseUid: params.supabaseUid },
  });

  if (existing) return existing;

  return prisma.user.create({
    data: {
      supabaseUid: params.supabaseUid,
      email: params.email,
      fullName: params.fullName,
      phone: params.phone || null,
      emailVerified: true,
    },
  });
}

export async function getUserBySupabaseUid(supabaseUid: string) {
  return prisma.user.findUnique({
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
      },
    },
  });
}

export async function updateLastLogin(userId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { lastLoginAt: new Date() },
  });
}
