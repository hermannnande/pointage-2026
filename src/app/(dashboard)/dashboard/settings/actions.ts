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
  phone?: string;
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

    const { name, email, phone, sector, country, city, timezone, currency } = input;

    if (!name?.trim()) {
      return { success: false, error: "Le nom de l'entreprise est obligatoire." };
    }

    if (!country?.trim()) {
      return { success: false, error: "Le pays est obligatoire." };
    }

    const cleanedPhone = phone?.trim() || null;
    if (cleanedPhone && cleanedPhone.replace(/\D/g, "").length < 8) {
      return { success: false, error: "Le numéro de téléphone doit contenir au moins 8 chiffres." };
    }

    const updated = await prisma.company.update({
      where: { id: ctx.companyId },
      data: {
        name: name.trim(),
        email: email?.trim() || null,
        phone: cleanedPhone,
        sector: sector?.trim() || null,
        country: country.trim(),
        city: city?.trim() || null,
        timezone: timezone || "Africa/Abidjan",
        currency: currency || "XOF",
      },
    });

    // Synchronise le téléphone du propriétaire si vide,
    // pour qu'il soit utilisé directement par Chariow (et éviter le modal).
    if (cleanedPhone) {
      const ownerPhoneDigits = (ctx.user.phone ?? "").replace(/\D/g, "");
      if (ownerPhoneDigits.length < 8) {
        await prisma.user
          .update({ where: { id: ctx.userId }, data: { phone: cleanedPhone } })
          .catch(() => undefined);
      }
    }

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/billing");

    return { success: true, data: { name: updated.name } };
  } catch {
    return { success: false, error: "Une erreur est survenue. Réessayez." };
  }
}
