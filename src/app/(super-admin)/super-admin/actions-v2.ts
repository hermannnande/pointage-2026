"use server";

// Server actions du super-admin V2 — analytics par période, blocages
// d'inscription et diagnostic paiements. Chaque action vérifie le rôle
// super-admin avant de toucher aux données (même modèle que actions.ts).

import { createClient } from "@/lib/supabase/server";
import * as sa from "@/services/super-admin.service";
import * as analytics from "@/services/super-admin-analytics.service";
import type { StatPeriod } from "@/services/super-admin-analytics.service";

async function requireSuperAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  const ok = await sa.isSuperAdmin(user.id);
  if (!ok) throw new Error("Accès refusé");
  const adminUser = await sa.getSuperAdminUser(user.id);
  if (!adminUser) throw new Error("Utilisateur introuvable");
  return adminUser;
}

export async function getPeriodStatsAction(period: StatPeriod) {
  await requireSuperAdmin();
  return analytics.getPeriodStats(period);
}

export async function getMultiTrendAction(period: StatPeriod) {
  await requireSuperAdmin();
  return analytics.getMultiTrend(period);
}

export async function getSignupAnalysisAction(days = 90) {
  await requireSuperAdmin();
  return analytics.getSignupAnalysis(days);
}

export async function getPaymentAnalysisAction(days = 90) {
  await requireSuperAdmin();
  return analytics.getPaymentAnalysis(days);
}

export async function getDashboardAlertsAction() {
  await requireSuperAdmin();
  return analytics.getDashboardAlerts();
}

export async function getLiveFeedAction(limit = 25) {
  await requireSuperAdmin();
  return analytics.getLiveFeed(limit);
}

export async function getWhatsAppMessagesAction(filters: analytics.WhatsAppFilter = {}) {
  await requireSuperAdmin();
  return analytics.getWhatsAppMessages(filters);
}

export async function getWhatsAppKPIsAction() {
  await requireSuperAdmin();
  return analytics.getWhatsAppKPIs();
}
