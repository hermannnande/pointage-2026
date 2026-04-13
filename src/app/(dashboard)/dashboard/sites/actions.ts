"use server";

import { revalidatePath } from "next/cache";

import { PERMISSIONS } from "@/config/permissions";

import type { ActionResult } from "@/types";
import { createClient } from "@/lib/supabase/server";
import * as siteService from "@/services/site.service";
import { getTenantContext, requirePermission } from "@/services/tenant.service";
import {
  createSiteSchema,
  type CreateSiteInput,
  updateSiteSchema,
  type UpdateSiteInput,
} from "@/validations/site.schema";

async function getContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  const ctx = await getTenantContext(user.id);
  if (!ctx) throw new Error("Aucune entreprise");
  return ctx;
}

export async function getSitesAction() {
  const ctx = await getContext();
  requirePermission(ctx, PERMISSIONS.SITES_VIEW);
  return siteService.getSites(ctx.companyId);
}

export async function createSiteAction(
  input: CreateSiteInput,
): Promise<ActionResult<{ id: string; code: string | null }>> {
  try {
    const ctx = await getContext();
    requirePermission(ctx, PERMISSIONS.SITES_CREATE);

    const parsed = createSiteSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const site = await siteService.createSite(ctx.companyId, parsed.data);
    revalidatePath("/dashboard/sites");
    return { success: true, data: { id: site.id, code: site.code } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur" };
  }
}

export async function updateSiteAction(
  input: UpdateSiteInput,
): Promise<ActionResult> {
  try {
    const ctx = await getContext();
    requirePermission(ctx, PERMISSIONS.SITES_UPDATE);

    const parsed = updateSiteSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    await siteService.updateSite(ctx.companyId, parsed.data);
    revalidatePath("/dashboard/sites");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur" };
  }
}

export async function deleteSiteAction(siteId: string): Promise<ActionResult> {
  try {
    const ctx = await getContext();
    requirePermission(ctx, PERMISSIONS.SITES_DELETE);
    await siteService.deleteSite(ctx.companyId, siteId);
    revalidatePath("/dashboard/sites");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur" };
  }
}
