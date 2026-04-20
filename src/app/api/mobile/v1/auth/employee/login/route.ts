/**
 * POST /api/mobile/v1/auth/employee/login
 *
 * Body : { phone: string, password: string }
 * Réponse 200 : { token, expiresAt, employee: { ... } }
 *
 * Réutilise la même logique que `employeeLoginAction` (côté web) :
 *   - Recherche employé par téléphone normalisé (avec plusieurs variantes
 *     pour tolérer les différents formats de saisie : +225XX..., 0XX..., XX...)
 *   - Vérification scrypt du password
 *   - Création du token HMAC (24h) via `createSessionToken()`
 *
 * Différence : on ne pose PAS de cookie, on renvoie le token au client.
 */

import { z } from "zod";

import { createSessionToken, verifyPassword } from "@/lib/employee-auth";
import { generatePhoneVariants } from "@/lib/phone-variants";
import { prisma } from "@/lib/prisma/client";

import { errors, ok } from "../../../_lib/api-response";
import { preflight } from "../../../_lib/cors";
import { parseAndValidateBody } from "../../../_lib/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

const loginSchema = z.object({
  phone: z.string().trim().min(4, "Téléphone requis").max(32),
  password: z.string().min(1, "Mot de passe requis").max(200),
});

export async function POST(request: Request) {
  const parsed = await parseAndValidateBody(request, loginSchema);
  if (!parsed.ok) return parsed.response;

  const { phone, password } = parsed.data;
  const phoneVariants = generatePhoneVariants(phone);

  if (phoneVariants.length === 0) {
    return errors.unauthorized("Numéro de téléphone ou mot de passe incorrect");
  }

  const employee = await prisma.employee.findFirst({
    where: {
      phone: { in: phoneVariants },
      isActive: true,
      passwordHash: { not: null },
    },
    include: {
      site: { select: { id: true, name: true } },
      company: { select: { id: true, name: true, currency: true, timezone: true } },
    },
  });

  if (!employee || !employee.passwordHash) {
    return errors.unauthorized("Numéro de téléphone ou mot de passe incorrect");
  }

  if (!verifyPassword(password, employee.passwordHash)) {
    return errors.unauthorized("Numéro de téléphone ou mot de passe incorrect");
  }

  const normalizedPhone = employee.phone ?? phone;

  if (!employee.site) {
    return errors.forbidden(
      "Aucun lieu de travail assigné à votre compte. Contactez votre responsable.",
    );
  }

  const token = createSessionToken({
    employeeId: employee.id,
    companyId: employee.companyId,
    siteId: employee.site.id,
    siteName: employee.site.name,
    phone: normalizedPhone,
    firstName: employee.firstName,
    lastName: employee.lastName,
    matricule: employee.matricule || "",
  });

  return ok({
    token,
    expiresAt: new Date(Date.now() + SESSION_DURATION_MS).toISOString(),
    employee: {
      id: employee.id,
      firstName: employee.firstName,
      lastName: employee.lastName,
      matricule: employee.matricule,
      phone: normalizedPhone,
      photoUrl: employee.photoUrl,
      position: employee.position,
      siteId: employee.site.id,
      siteName: employee.site.name,
      companyId: employee.companyId,
      companyName: employee.company.name,
      currency: employee.company.currency,
      timezone: employee.company.timezone,
    },
  });
}

export const OPTIONS = preflight;
