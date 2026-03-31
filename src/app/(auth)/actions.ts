"use server";

import { redirect } from "next/navigation";

import type { ActionResult } from "@/types";
import { createClient } from "@/lib/supabase/server";
import { findOrCreateUser, updateLastLogin } from "@/services/auth.service";
import {
  loginSchema,
  type LoginInput,
  signupSchema,
  type SignupInput,
} from "@/validations/auth.schema";

export async function signupAction(
  input: SignupInput,
): Promise<ActionResult<{ userId: string }>> {
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

  return { success: true, data: { userId: user.id } };
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

export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
