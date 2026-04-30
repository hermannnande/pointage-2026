/**
 * POST /api/mobile/v1/owner/onboarding/company
 *
 * Crée la Company + le membership Owner + le rôle système + l'abonnement
 * d'essai pour un user Supabase qui vient de signer up. Utilisé par
 * l'onboarding wizard natif de l'app mobile (équivalent du `/onboarding`
 * web mais en API REST).
 *
 * Body :
 *   {
 *     companyName: string,    // min 2 chars
 *     sector?: string,
 *     country: string,        // min 2 chars (code ISO)
 *     city?: string,
 *     timezone?: string,      // défaut "Africa/Abidjan"
 *     currency?: string,      // défaut "XOF"
 *   }
 *
 * Réponse 200 :
 *   { tenant: TenantContext }
 *
 * Auth : Bearer access_token Supabase (via requireOwnerAuth flexible :
 * on tolère le user sans Company puisque c'est précisément ce qu'on est
 * en train de créer).
 */

import { z } from "zod";

import { prisma } from "@/lib/prisma/client";
import { findOrCreateUser } from "@/services/auth.service";
import { createCompanyWithOwner } from "@/services/company.service";
import { getTenantContext } from "@/services/tenant.service";

import { errors, ok } from "../../../_lib/api-response";
import { preflight } from "../../../_lib/cors";
import { parseAndValidateBody } from "../../../_lib/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const companySchema = z.object({
  companyName: z.string().trim().min(2, "Nom d'entreprise trop court").max(100),
  sector: z.string().trim().max(100).optional(),
  country: z.string().trim().min(2).max(2, "Code pays ISO 2 lettres requis"),
  city: z.string().trim().max(100).optional(),
  timezone: z.string().trim().min(1).max(80).default("Africa/Abidjan"),
  currency: z.string().trim().min(3).max(3).default("XOF"),
});

export async function POST(request: Request) {
  // Auth : on récupère le user Supabase MANUELLEMENT (sans passer par
  // requireOwnerAuth qui exigerait déjà un tenant — qu'on est en train
  // de créer). On accepte donc un user sans tenant.
  const authHeader = request.headers.get("authorization");
  const tokenMatch = authHeader?.match(/^Bearer\s+(.+)$/i);
  const accessToken = tokenMatch?.[1].trim();
  if (!accessToken) {
    return errors.unauthorized("Token manquant");
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return errors.serverError("Supabase non configuré");
  }

  let supabaseUid: string;
  let userEmail: string | null = null;
  let userFullName: string | null = null;
  let userPhone: string | null = null;
  let emailVerified = false;
  try {
    const resp = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${accessToken}`,
      },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!resp.ok) {
      return errors.unauthorized("Token Supabase invalide");
    }
    const user = (await resp.json()) as {
      id?: string;
      email?: string;
      email_confirmed_at?: string | null;
      app_metadata?: { provider?: string };
      user_metadata?: { full_name?: string; phone?: string };
    };
    if (!user?.id) return errors.unauthorized("Utilisateur introuvable");
    supabaseUid = user.id;
    userEmail = user.email ?? null;
    userFullName = user.user_metadata?.full_name ?? null;
    userPhone = user.user_metadata?.phone ?? null;
    const provider = user.app_metadata?.provider ?? "";
    emailVerified = !!user.email_confirmed_at ||
      provider === "google" ||
      provider === "apple";
  } catch {
    return errors.upstreamError("Échec vérification Supabase");
  }

  // Si la Company existe déjà (ex: l'utilisateur a relancé l'onboarding),
  // on retourne directement le tenant courant — idempotent.
  let existingTenant = await getTenantContext(supabaseUid);

  // Auto-linking par email : couvre le cas où l'utilisateur a un compte
  // web (créé avec email/password) et se reconnecte via Google sur l'APK
  // (Supabase aurait alors créé un NOUVEAU user OAuth avec un autre uid).
  if (!existingTenant && userEmail && emailVerified) {
    const linked = await prisma.user.findFirst({
      where: {
        email: userEmail,
        supabaseUid: { not: supabaseUid },
        memberships: { some: { isActive: true } },
      },
      select: { id: true },
    });
    if (linked) {
      await prisma.user.update({
        where: { id: linked.id },
        data: { supabaseUid },
      });
      existingTenant = await getTenantContext(supabaseUid);
    }
  }

  if (existingTenant) {
    return ok({ tenant: existingTenant, alreadyExisted: true });
  }

  const parsed = await parseAndValidateBody(request, companySchema);
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;

  // S'assurer que l'utilisateur existe en BDD (table User) — créé à la volée
  // si c'est un sign-up Google qui n'a jamais touché notre BDD.
  const dbUser = await findOrCreateUser({
    supabaseUid,
    email: userEmail ?? "",
    fullName: userFullName ?? userEmail ?? "Utilisateur",
    phone: userPhone ?? undefined,
  });

  // Crée la Company + role Owner + membership + plan + subscription d'essai.
  await createCompanyWithOwner({
    userId: dbUser.id,
    companyName: data.companyName,
    sector: data.sector,
    country: data.country,
    city: data.city,
    timezone: data.timezone,
    currency: data.currency,
  });

  // Renvoie le tenant context complet (avec rôle, permissions, etc.)
  const tenant = await getTenantContext(supabaseUid);
  if (!tenant) {
    return errors.serverError("Tenant créé mais introuvable");
  }

  return ok({ tenant, alreadyExisted: false });
}

export const OPTIONS = preflight;
