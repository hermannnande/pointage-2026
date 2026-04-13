import { z } from "zod/v4";

export const createEmployeeSchema = z.object({
  firstName: z.string().min(1, "Prénom requis").max(100),
  lastName: z.string().min(1, "Nom requis").max(100),
  email: z.email("Email invalide").optional().or(z.literal("")),
  phone: z.string().max(30).optional(),
  matricule: z.string().max(50).optional(),
  position: z.string().max(100).optional(),
  siteId: z.string().optional(),
  departmentId: z.string().optional(),
  contractType: z.enum(["CDI", "CDD", "STAGE", "FREELANCE", "INTERIM", "AUTRE"]).default("CDI"),
  hireDate: z.string().optional(),
  password: z
    .string()
    .min(4, "Le mot de passe doit contenir au moins 4 caractères")
    .max(50)
    .optional(),
  baseSalary: z.number().int().min(0).optional(),
  salaryType: z.enum(["MONTHLY", "DAILY", "HOURLY"]).optional(),
  absencePolicy: z.enum(["DEDUCT", "PAID", "TOLERATED"]).optional(),
});

export const updateEmployeeSchema = createEmployeeSchema.partial().extend({
  id: z.string(),
  isActive: z.boolean().optional(),
});

export const importEmployeeCsvRowSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().optional(),
  phone: z.string().optional(),
  matricule: z.string().optional(),
  position: z.string().optional(),
  site: z.string().optional(),
  department: z.string().optional(),
  contractType: z.string().optional(),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
