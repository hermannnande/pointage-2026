import { z } from "zod/v4";

export const createSiteSchema = z.object({
  name: z.string().min(2, "Minimum 2 caractères").max(100),
  address: z.string().max(255).optional(),
  city: z.string().max(100).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  geofenceRadius: z.number().int().min(10).max(5000).default(50),
  workStartTime: z.string().default("08:00"),
  workEndTime: z.string().default("17:00"),
  graceMinutes: z.number().int().min(0).max(120).default(15),
});

export const updateSiteSchema = createSiteSchema.partial().extend({
  id: z.string(),
  isActive: z.boolean().optional(),
  clockInEnabled: z.boolean().optional(),
});

export type CreateSiteInput = z.infer<typeof createSiteSchema>;
export type UpdateSiteInput = z.infer<typeof updateSiteSchema>;
