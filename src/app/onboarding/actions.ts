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

async function getAuthenticatedUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const dbUser = await findOrCreateUser({
    supabaseUid: user.id,
    email: user.email!,
    fullName: user.user_metadata?.full_name || user.email!,
    phone: user.user_metadata?.phone,
  });

  return dbUser.id;
}

export async function createCompanyAction(
  input: OnboardingCompanyInput,
): Promise<ActionResult<{ companyId: string }>> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { success: false, error: "Non authentifié" };

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

  try {
    const company = await createCompanyWithOwner({
      userId,
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
    return { success: false, error: "Erreur lors de la création de l'entreprise" };
  }
}

export async function createSiteAction(
  input: OnboardingSiteInput,
): Promise<ActionResult<{ siteId: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non authentifié" };

  const ctx = await getTenantContext(user.id);
  if (!ctx) return { success: false, error: "Aucune entreprise trouvée" };

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

  try {
    const site = await createSiteForCompany({
      companyId: ctx.companyId,
      name: parsed.data.siteName,
      address: parsed.data.address,
      city: parsed.data.city,
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude,
      workStartTime: parsed.data.workStartTime,
      workEndTime: parsed.data.workEndTime,
    });

    return { success: true, data: { siteId: site.id } };
  } catch (err) {
    console.error("Erreur création site:", err);
    return { success: false, error: "Erreur lors de la création du site" };
  }
}

export async function completeOnboardingAction(): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non authentifié" };

  const ctx = await getTenantContext(user.id);
  if (!ctx) return { success: false, error: "Aucune entreprise trouvée" };

  try {
    await completeOnboarding(ctx.companyId);
    return { success: true };
  } catch (err) {
    console.error("Erreur finalisation onboarding:", err);
    return { success: false, error: "Erreur lors de la finalisation" };
  }
}
