"use server";

import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma/client";
import {
  verifyPassword,
  createSessionToken,
  EMPLOYEE_COOKIE_NAME,
} from "@/lib/employee-auth";
import { generatePhoneVariants } from "@/lib/phone-variants";

interface LoginInput {
  phone: string;
  password: string;
}

interface LoginResult {
  success: boolean;
  error?: string;
}

export async function employeeLoginAction(input: LoginInput): Promise<LoginResult> {
  try {
    const { phone, password } = input;

    if (!phone || !password) {
      return { success: false, error: "Tous les champs sont obligatoires." };
    }

    const phoneVariants = generatePhoneVariants(phone);
    if (phoneVariants.length === 0) {
      return { success: false, error: "Numéro de téléphone ou mot de passe incorrect." };
    }

    const employee = await prisma.employee.findFirst({
      where: {
        phone: { in: phoneVariants },
        isActive: true,
        passwordHash: { not: null },
      },
      include: {
        site: { select: { id: true, name: true } },
      },
    });

    if (!employee) {
      return { success: false, error: "Numéro de téléphone ou mot de passe incorrect." };
    }

    if (!employee.passwordHash || !verifyPassword(password, employee.passwordHash)) {
      return { success: false, error: "Numéro de téléphone ou mot de passe incorrect." };
    }

    if (!employee.site) {
      return { success: false, error: "Aucun lieu de travail assigné à votre compte. Contactez votre responsable." };
    }

    const normalizedPhone = employee.phone ?? phone;

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
