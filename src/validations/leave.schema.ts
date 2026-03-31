import { z } from "zod/v4";

export const createLeaveTypeSchema = z.object({
  name: z.string().min(2, "Minimum 2 caractères").max(100),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Couleur hex invalide").default("#3B82F6"),
  defaultDays: z.number().int().min(0).max(365).default(0),
  isPaid: z.boolean().default(true),
  requiresDoc: z.boolean().default(false),
});

export const updateLeaveTypeSchema = createLeaveTypeSchema.partial().extend({
  id: z.string(),
  isActive: z.boolean().optional(),
});

export const createLeaveRequestSchema = z.object({
  employeeId: z.string().min(1, "Employé requis"),
  leaveTypeId: z.string().min(1, "Type de congé requis"),
  startDate: z.string().min(1, "Date de début requise"),
  endDate: z.string().min(1, "Date de fin requise"),
  reason: z.string().max(500).optional(),
});

export const reviewLeaveRequestSchema = z.object({
  requestId: z.string().min(1),
  status: z.enum(["APPROVED", "REJECTED"]),
  reviewNote: z.string().max(500).optional(),
});

export const cancelLeaveRequestSchema = z.object({
  requestId: z.string().min(1),
});

export type CreateLeaveTypeInput = z.infer<typeof createLeaveTypeSchema>;
export type UpdateLeaveTypeInput = z.infer<typeof updateLeaveTypeSchema>;
export type CreateLeaveRequestInput = z.infer<typeof createLeaveRequestSchema>;
export type ReviewLeaveRequestInput = z.infer<typeof reviewLeaveRequestSchema>;
