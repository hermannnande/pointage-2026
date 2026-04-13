"use server";

import { createClient } from "@/lib/supabase/server";
import * as sa from "@/services/super-admin.service";
import type { ActionResult } from "@/types";

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

// ─── Dashboard ───────────────────────────────────────────────

export async function getDashboardKPIsAction() {
  await requireSuperAdmin();
  return sa.getDashboardKPIs();
}

export async function getRegistrationTrendAction(months = 6) {
  await requireSuperAdmin();
  return sa.getRegistrationTrend(months);
}

export async function getRevenueTrendAction(months = 6) {
  await requireSuperAdmin();
  return sa.getRevenueTrend(months);
}

export async function getSubscriptionDistributionAction() {
  await requireSuperAdmin();
  return sa.getSubscriptionDistribution();
}

export async function getTopActiveCompaniesAction(limit = 10) {
  await requireSuperAdmin();
  return sa.getTopActiveCompanies(limit);
}

// ─── Companies ───────────────────────────────────────────────

export async function getCompaniesAction(filters: sa.CompanyFilter = {}) {
  await requireSuperAdmin();
  return sa.getCompanies(filters);
}

export async function getCompanyDetailAction(id: string) {
  await requireSuperAdmin();
  return sa.getCompanyDetail(id);
}

export async function suspendCompanyAction(companyId: string): Promise<ActionResult> {
  try {
    const admin = await requireSuperAdmin();
    await sa.suspendCompany(companyId, admin.id);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Erreur" };
  }
}

export async function reactivateCompanyAction(companyId: string): Promise<ActionResult> {
  try {
    const admin = await requireSuperAdmin();
    await sa.reactivateCompany(companyId, admin.id);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Erreur" };
  }
}

export async function extendTrialAction(companyId: string, days: number): Promise<ActionResult> {
  try {
    const admin = await requireSuperAdmin();
    await sa.extendTrial(companyId, days, admin.id);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Erreur" };
  }
}

export async function changePlanAction(companyId: string, planSlug: string): Promise<ActionResult> {
  try {
    const admin = await requireSuperAdmin();
    await sa.changePlanManual(companyId, planSlug, admin.id);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Erreur" };
  }
}

export async function addNoteAction(companyId: string, content: string): Promise<ActionResult> {
  try {
    const admin = await requireSuperAdmin();
    await sa.addAdminNote(companyId, admin.id, content);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Erreur" };
  }
}

// ─── Employees ───────────────────────────────────────────────

export async function getGlobalEmployeesAction(filters: sa.EmployeeFilter = {}) {
  await requireSuperAdmin();
  return sa.getGlobalEmployees(filters);
}

export async function getEmployeeGrowthAction() {
  await requireSuperAdmin();
  return sa.getEmployeeGrowthStats();
}

// ─── Subscriptions ───────────────────────────────────────────

export async function getSubscriptionsAction(filters: sa.SubFilter = {}) {
  await requireSuperAdmin();
  return sa.getSubscriptions(filters);
}

export async function getSubscriptionKPIsAction() {
  await requireSuperAdmin();
  return sa.getSubscriptionKPIs();
}

// ─── Transactions ────────────────────────────────────────────

export async function getTransactionsAction(filters: sa.TxFilter = {}) {
  await requireSuperAdmin();
  return sa.getTransactions(filters);
}

export async function getTransactionKPIsAction() {
  await requireSuperAdmin();
  return sa.getTransactionKPIs();
}

// ─── Trials ──────────────────────────────────────────────────

export async function getTrialsAction(filters: sa.TrialFilter = {}) {
  await requireSuperAdmin();
  return sa.getTrials(filters);
}

// ─── Activity ────────────────────────────────────────────────

export async function getRecentActivityAction(limit = 30) {
  await requireSuperAdmin();
  return sa.getRecentActivity(limit);
}

// ─── Logs ────────────────────────────────────────────────────

export async function getSuperAdminLogsAction(filters: sa.LogFilter = {}) {
  await requireSuperAdmin();
  return sa.getSuperAdminLogs(filters);
}

// ─── Plans ───────────────────────────────────────────────────

export async function getPlansAction() {
  await requireSuperAdmin();
  return sa.getPlans();
}

// ─── Team ────────────────────────────────────────────────────

export async function listSuperAdminsAction() {
  await requireSuperAdmin();
  return sa.listSuperAdmins();
}

export async function addSuperAdminAction(email: string, fullName: string, role: string): Promise<ActionResult> {
  try {
    const admin = await requireSuperAdmin();
    if (!(await sa.isOwnerRole(admin.superAdminRole))) return { success: false, error: "Seul le propriétaire peut ajouter des admins." };
    await sa.addSuperAdmin(email, fullName, role as sa.SARole, admin.id);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Erreur" };
  }
}

export async function removeSuperAdminAction(userId: string): Promise<ActionResult> {
  try {
    const admin = await requireSuperAdmin();
    if (!(await sa.isOwnerRole(admin.superAdminRole))) return { success: false, error: "Seul le propriétaire peut retirer des admins." };
    await sa.removeSuperAdmin(userId, admin.id);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Erreur" };
  }
}

export async function updateSuperAdminRoleAction(userId: string, newRole: string): Promise<ActionResult> {
  try {
    const admin = await requireSuperAdmin();
    if (!(await sa.isOwnerRole(admin.superAdminRole))) return { success: false, error: "Seul le propriétaire peut changer les rôles." };
    await sa.updateSuperAdminRole(userId, newRole as sa.SARole, admin.id);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Erreur" };
  }
}

export async function getCurrentAdminRoleAction(): Promise<string | null> {
  const admin = await requireSuperAdmin();
  return admin.superAdminRole;
}
