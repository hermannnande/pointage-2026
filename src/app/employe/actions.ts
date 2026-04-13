"use server";

import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma/client";
import {
  verifyPassword,
  createSessionToken,
  EMPLOYEE_COOKIE_NAME,
} from "@/lib/employee-auth";

interface LoginInput {
  siteCode: string;
  password: string;
}

interface LoginResult {
  success: boolean;
  error?: string;
}

export async function employeeLoginAction(input: LoginInput): Promise<LoginResult> {
  try {
    const { siteCode, password } = input;

    if (!siteCode || !password) {
      return { success: false, error: "Tous les champs sont obligatoires." };
    }

    const site = await prisma.site.findUnique({
      where: { code: siteCode.toUpperCase().trim() },
      select: { id: true, name: true, companyId: true, isActive: true },
    });

    if (!site) {
      return { success: false, error: "Code du site incorrect. Vérifiez le code donné par votre responsable." };
    }

    if (!site.isActive) {
      return { success: false, error: "Ce site n'est plus actif. Contactez votre responsable." };
    }

    const employees = await prisma.employee.findMany({
      where: {
        companyId: site.companyId,
        siteId: site.id,
        isActive: true,
        passwordHash: { not: null },
      },
    });

    const employee = employees.find((emp) =>
      emp.passwordHash ? verifyPassword(password, emp.passwordHash) : false,
    );

    if (!employee) {
      return { success: false, error: "Code du site ou mot de passe incorrect." };
    }

    const token = createSessionToken({
      employeeId: employee.id,
      companyId: site.companyId,
      siteId: site.id,
      siteName: site.name,
      siteCode: siteCode.toUpperCase().trim(),
      firstName: employee.firstName,
      lastName: employee.lastName,
      matricule: employee.matricule || "",
    });

    const cookieStore = await cookies();
    cookieStore.set(EMPLOYEE_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 24 * 60 * 60,
    });

    return { success: true };
  } catch {
    return { success: false, error: "Une erreur est survenue. Réessayez." };
  }
}

export async function employeeLogoutAction(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(EMPLOYEE_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
