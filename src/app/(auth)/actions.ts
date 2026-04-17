"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import type { ActionResult } from "@/types";
import { createClient } from "@/lib/supabase/server";
import { createMetaEventId, sendCompleteRegistrationToMeta } from "@/lib/meta-conversions";
import { findOrCreateUser, updateLastLogin } from "@/services/auth.service";
import {
  loginSchema,
  type LoginInput,
  signupSchema,
  type SignupInput,
  forgotPasswordSchema,
  type ForgotPasswordInput,
  resetPasswordSchema,
  type ResetPasswordInput,
} from "@/validations/auth.schema";

export async function signupAction(
  input: SignupInput,
): Promise<ActionResult<{ userId: string; metaEventId: string }>> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      if (!fieldErrors[key]) fieldErrors[key] = [];
      fieldErrors[key].push(issue.message);
    }
    return { success: false, error: "Données invalides", errors: fieldErrors };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.fullName,
        phone: parsed.data.phone || "",
      },
    },
  });

  if (error) {
    if (error.message.includes("already registered")) {
      return { success: false, error: "Un compte existe déjà avec cet email" };
    }
    return { success: false, error: error.message };
  }

  if (!data.user) {
    return { success: false, error: "Erreur lors de la création du compte" };
  }

  const user = await findOrCreateUser({
    supabaseUid: data.user.id,
    email: parsed.data.email,
    fullName: parsed.data.fullName,
    phone: parsed.data.phone,
  });

  if (!data.session) {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (signInError) {
      return {
        success: false,
        error: "Compte créé mais connexion automatique échouée. Veuillez vous connecter.",
      };
    }
  }

  const metaEventId = createMetaEventId();

  try {
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() || headersList.get("x-real-ip");
    const userAgent = headersList.get("user-agent");
    const eventSourceUrl =
      headersList.get("origin")
      || headersList.get("referer")
      || `${process.env.NEXT_PUBLIC_APP_URL || "https://ocontrole.com"}/signup`;

    await sendCompleteRegistrationToMeta({
      email: parsed.data.email,
      phone: parsed.data.phone,
      externalId: user.id,
      clientIpAddress: ip,
      clientUserAgent: userAgent,
      eventSourceUrl,
      eventId: metaEventId,
    });
  } catch {
    // Non-bloquant : l'inscription doit toujours réussir même si Meta est indisponible.
  }

  return { success: true, data: { userId: user.id, metaEventId } };
}

export async function loginAction(
  input: LoginInput,
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      if (!fieldErrors[key]) fieldErrors[key] = [];
      fieldErrors[key].push(issue.message);
    }
    return { success: false, error: "Données invalides", errors: fieldErrors };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { success: false, error: "Email ou mot de passe incorrect" };
  }

  if (data.user) {
    const user = await findOrCreateUser({
      supabaseUid: data.user.id,
      email: parsed.data.email,
      fullName: data.user.user_metadata?.full_name || parsed.data.email,
    });
    await updateLastLogin(user.id);
  }

  return { success: true };
}

export async function oauthLoginAction(
  provider: "google" | "facebook",
): Promise<ActionResult<{ url: string }>> {
  const supabase = await createClient();
  const headersList = await headers();
  const origin = headersList.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${origin}/api/auth/callback`,
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  if (data.url) {
    return { success: true, data: { url: data.url } };
  }

  return { success: false, error: "Impossible de lancer la connexion" };
}

export async function forgotPasswordAction(
  input: ForgotPasswordInput,
): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Adresse email invalide" };
  }

  const supabase = await createClient();
  const headersList = await headers();
  const origin = headersList.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    { redirectTo: `${origin}/reset-password` },
  );

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function resetPasswordAction(
  input: ResetPasswordInput,
): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      if (!fieldErrors[key]) fieldErrors[key] = [];
      fieldErrors[key].push(issue.message);
    }
    return { success: false, error: "Données invalides", errors: fieldErrors };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
