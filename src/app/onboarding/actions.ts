"use server";

import type { ActionResult } from "@/types";
import { createClient } from "@/lib/supabase/server";
import { findOrCreateUser } from "@/services/auth.service";
import {
  completeOnboarding,
  createCompanyWithOwner,
  createSiteForCompany,
} from "@/services/company.service";
import { getTenantContext } from "@/services/tenant.service";
import {
  onboardingCompanySchema,
  type OnboardingCompanyInput,
  onboardingSiteSchema,
  type OnboardingSiteInput,
} from "@/validations/auth.schema";

export async function createCompanyAction(
  input: OnboardingCompanyInput,
): Promise<ActionResult<{ companyId: string }>> {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) return { success: false, error: "Non authentifié. Veuillez vous reconnecter." };

    const dbUser = await findOrCreateUser({
      supabaseUid: authUser.id,
      email: authUser.email!,
      fullName: authUser.user_metadata?.full_name || authUser.email!,
      phone: authUser.user_metadata?.phone,
    });

    const existingCtx = await getTenantContext(authUser.id);
    if (existingCtx) {
      return { success: true, data: { companyId: existingCtx.companyId } };
    }

    const parsed = onboardingCompanySchema.safeParse(input);
    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0]);
        if (!fieldErrors[key]) fieldErrors[key] = [];
        fieldErrors[key].push(issue.message);
      }
      return { success: false, error: "Données invalides", errors: fieldErrors };
    }

    const company = await createCompanyWithOwner({
      userId: dbUser.id,
      companyName: parsed.data.companyName,
      sector: parsed.data.sector,
      country: parsed.data.country,
      city: parsed.data.city,
      timezone: parsed.data.timezone,
      currency: parsed.data.currency,
    });

    return { success: true, data: { companyId: company.id } };
  } catch (err) {
    console.error("Erreur création entreprise:", err);
    const message = err instanceof Error ? err.message : "Erreur lors de la création de l'entreprise";
    return { success: false, error: message };
  }
}

export async function createSiteAction(
  input: OnboardingSiteInput,
): Promise<ActionResult<{ siteId: string }>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Non authentifié. Veuillez vous reconnecter." };

    const ctx = await getTenantContext(user.id);
    if (!ctx) return { success: false, error: "Aucune entreprise trouvée. Veuillez rafraîchir la page." };

    const parsed = onboardingSiteSchema.safeParse(input);
    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0]);
        if (!fieldErrors[key]) fieldErrors[key] = [];
        fieldErrors[key].push(issue.message);
      }
      return { success: false, error: "Données invalides", errors: fieldErrors };
    }

    const site = await createSiteForCompany({
      companyId: ctx.companyId,
      name: parsed.data.siteName,
      address: parsed.data.address,
      city: parsed.data.city,
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude,
      geofenceRadius: parsed.data.geofenceRadius,
      workStartTime: parsed.data.workStartTime,
      workEndTime: parsed.data.workEndTime,
    });

    return { success: true, data: { siteId: site.id } };
  } catch (err) {
    console.error("Erreur création site:", err);
    const message = err instanceof Error ? err.message : "Erreur lors de la création du site";
    return { success: false, error: message };
  }
}

export async function completeOnboardingAction(): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Non authentifié" };

    const ctx = await getTenantContext(user.id);
    if (!ctx) return { success: false, error: "Aucune entreprise trouvée" };

    await completeOnboarding(ctx.companyId);
    return { success: true };
  } catch (err) {
    console.error("Erreur finalisation onboarding:", err);
    return { success: false, error: "Erreur lors de la finalisation" };
  }
}
