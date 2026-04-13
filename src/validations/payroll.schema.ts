import { z } from "zod/v4";

export const createPeriodSchema = z.object({
  label: z.string().min(1, "Libellé requis").max(100),
  startDate: z.string().min(1, "Date de début requise"),
  endDate: z.string().min(1, "Date de fin requise"),
});

export const updateConfigSchema = z.object({
  workingDaysPerMonth: z.number().int().min(1).max(31).optional(),
  workingHoursPerDay: z.number().min(1).max(24).optional(),
  overtimeRate: z.number().min(1).max(5).optional(),
  lateDeductionEnabled: z.boolean().optional(),
  lateThresholdMinutes: z.number().int().min(0).max(120).optional(),
  currency: z.string().max(5).optional(),
});

export const updateEntrySchema = z.object({
  entryId: z.string().min(1),
  bonuses: z.number().int().min(0).optional(),
  deductions: z.number().int().min(0).optional(),
  notes: z.string().max(500).optional(),
});

export type CreatePeriodInput = z.infer<typeof createPeriodSchema>;
export type UpdateConfigInput = z.infer<typeof updateConfigSchema>;
export type UpdateEntryInput = z.infer<typeof updateEntrySchema>;
