import { z } from "zod/v4";

export const clockActionSchema = z.object({
  employeeId: z.string().min(1, "Employé requis"),
  type: z.enum(["CLOCK_IN", "CLOCK_OUT", "BREAK_START", "BREAK_END"]),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  source: z.enum(["WEB", "MOBILE_WEB", "KIOSK", "ADMIN_MANUAL"]).default("WEB"),
  notes: z.string().max(500).optional(),
});

export const kioskClockSchema = z.object({
  pin: z.string().min(4, "PIN requis").max(10),
  siteId: z.string().min(1, "Site requis"),
  type: z.enum(["CLOCK_IN", "CLOCK_OUT", "BREAK_START", "BREAK_END"]),
});

export const correctionRequestSchema = z.object({
  recordId: z.string().min(1),
  fieldChanged: z.string().min(1, "Champ requis"),
  oldValue: z.string().optional(),
  newValue: z.string().min(1, "Nouvelle valeur requise"),
  reason: z.string().min(3, "Motif requis (min. 3 caractères)").max(500),
});

export const correctionReviewSchema = z.object({
  correctionId: z.string().min(1),
  status: z.enum(["APPROVED", "REJECTED"]),
  reviewNote: z.string().max(500).optional(),
});

export const attendanceFilterSchema = z.object({
  siteId: z.string().optional(),
  date: z.string().optional(),
  status: z.string().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(25),
});

export type ClockActionInput = z.infer<typeof clockActionSchema>;
export type KioskClockInput = z.infer<typeof kioskClockSchema>;
export type CorrectionRequestInput = z.infer<typeof correctionRequestSchema>;
export type CorrectionReviewInput = z.infer<typeof correctionReviewSchema>;
export type AttendanceFilterInput = z.infer<typeof attendanceFilterSchema>;
