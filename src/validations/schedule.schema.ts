import { z } from "zod/v4";

const shiftSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Format HH:mm"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Format HH:mm"),
  breakMinutes: z.number().int().min(0).max(480).default(0),
  isWorkDay: z.boolean().default(true),
});

export const createScheduleSchema = z.object({
  name: z.string().min(2, "Minimum 2 caractères").max(100),
  description: z.string().max(255).optional(),
  isTemplate: z.boolean().default(false),
  shifts: z.array(shiftSchema).min(1, "Au moins un jour requis").max(7),
});

export const updateScheduleSchema = z.object({
  id: z.string(),
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(255).optional(),
  isActive: z.boolean().optional(),
  isTemplate: z.boolean().optional(),
  shifts: z.array(shiftSchema).min(1).max(7).optional(),
});

export const assignScheduleSchema = z.object({
  scheduleId: z.string().min(1, "Planning requis"),
  employeeIds: z.array(z.string()).min(1, "Au moins un employé"),
  startDate: z.string().min(1, "Date de début requise"),
  endDate: z.string().optional(),
});

export const unassignScheduleSchema = z.object({
  assignmentId: z.string().min(1),
});

export type ShiftInput = z.infer<typeof shiftSchema>;
export type CreateScheduleInput = z.infer<typeof createScheduleSchema>;
export type UpdateScheduleInput = z.infer<typeof updateScheduleSchema>;
export type AssignScheduleInput = z.infer<typeof assignScheduleSchema>;
