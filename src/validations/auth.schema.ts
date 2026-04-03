import { z } from "zod/v4";

export const loginSchema = z.object({
  email: z
    .email("Adresse email invalide"),
  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères"),
});

export const signupSchema = z.object({
  fullName: z
    .string()
    .min(2, "Le nom doit contenir au moins 2 caractères")
    .max(100, "Le nom est trop long"),
  email: z
    .email("Adresse email invalide"),
  phone: z
    .string()
    .optional(),
  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères")
    .max(72, "Le mot de passe est trop long"),
});

export const onboardingCompanySchema = z.object({
  companyName: z
    .string()
    .min(2, "Le nom de l'entreprise doit contenir au moins 2 caractères")
    .max(100, "Le nom est trop long"),
  sector: z.string().optional(),
  country: z.string().min(2, "Sélectionnez un pays"),
  city: z.string().optional(),
  timezone: z.string().default("Africa/Abidjan"),
  currency: z.string().default("XOF"),
});

export const onboardingSiteSchema = z.object({
  siteName: z
    .string()
    .min(2, "Le nom du site doit contenir au moins 2 caractères")
    .max(100, "Le nom est trop long"),
  address: z.string().optional(),
  city: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  geofenceRadius: z.number().min(10).max(5000).default(50),
  workStartTime: z.string().default("08:00"),
  workEndTime: z.string().default("17:00"),
});

export const forgotPasswordSchema = z.object({
  email: z.email("Adresse email invalide"),
});

export const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères")
    .max(72, "Le mot de passe est trop long"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type OnboardingCompanyInput = z.infer<typeof onboardingCompanySchema>;
export type OnboardingSiteInput = z.infer<typeof onboardingSiteSchema>;
