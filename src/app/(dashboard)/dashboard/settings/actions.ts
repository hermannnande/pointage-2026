"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma/client";
import { createClient } from "@/lib/supabase/server";
import { getTenantContext } from "@/services/tenant.service";
import type { ActionResult } from "@/types";

async function getContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  const ctx = await getTenantContext(user.id);
  if (!ctx) throw new Error("Aucune entreprise");
  return ctx;
}

interface UpdateCompanyInput {
  name: string;
  email?: string;
  sector?: string;
  country: string;
  city?: string;
  timezone: string;
  currency: string;
}

export async function updateCompanyAction(
  input: UpdateCompanyInput,
): Promise<ActionResult<{ name: string }>> {
  try {
    const ctx = await getContext();

    if (!ctx.isOwner) {
      return { success: false, error: "Seul le propriétaire peut modifier ces informations." };
    }

    const { name, email, sector, country, city, timezone, currency } = input;

    if (!name?.trim()) {
      return { success: false, error: "Le nom de l'entreprise est obligatoire." };
    }

    if (!country?.trim()) {
      return { success: false, error: "Le pays est obligatoire." };
    }

    const updated = await prisma.company.update({
      where: { id: ctx.companyId },
      data: {
        name: name.trim(),
        email: email?.trim() || null,
        sector: sector?.trim() || null,
        country: country.trim(),
        city: city?.trim() || null,
        timezone: timezone || "Africa/Abidjan",
        currency: currency || "XOF",
      },
    });

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard");

    return { success: true, data: { name: updated.name } };
  } catch {
    return { success: false, error: "Une erreur est survenue. Réessayez." };
  }
}
