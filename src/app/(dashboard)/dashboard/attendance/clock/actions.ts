"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { getTenantContext } from "@/services/tenant.service";

export async function getMyEmployeeAction() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const ctx = await getTenantContext(user.id);
  if (!ctx) return null;

  const employee = await prisma.employee.findFirst({
    where: { companyId: ctx.companyId, userId: ctx.userId, isActive: true },
  });
  return employee;
}
