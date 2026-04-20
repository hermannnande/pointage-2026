/**
 * POST /api/mobile/v1/employee/clock
 *
 * Body : { type: "CLOCK_IN"|"CLOCK_OUT"|"BREAK_START"|"BREAK_END",
 *          latitude: number, longitude: number,
 *          accuracy?: number, isMocked?: boolean }
 *
 * Réutilise EXACTEMENT la même logique que `attendanceService.clockAction()`
 * utilisée par le web (geofence, calcul des heures, gestion des pauses).
 *
 * Source = "MOBILE_WEB" (même valeur que l'espace employé web mobile).
 * Une migration ultérieure pourra ajouter "MOBILE_APP" pour distinguer
 * l'app native dans les rapports.
 */

import { z } from "zod";

import { prisma } from "@/lib/prisma/client";
import * as attendanceService from "@/services/attendance.service";
import type { EventSource, EventType } from "@prisma/client";

import { errors, ok } from "../../_lib/api-response";
import { requireEmployeeAuth } from "../../_lib/auth";
import { preflight } from "../../_lib/cors";
import { parseAndValidateBody } from "../../_lib/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const clockSchema = z.object({
  type: z.enum(["CLOCK_IN", "CLOCK_OUT", "BREAK_START", "BREAK_END"]),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().nonnegative().optional(),
  isMocked: z.boolean().optional(),
});

export async function POST(request: Request) {
  const auth = await requireEmployeeAuth();
  if (!auth.ok) return auth.response;

  const parsed = await parseAndValidateBody(request, clockSchema);
  if (!parsed.ok) return parsed.response;

  const { type, latitude, longitude, isMocked } = parsed.data;
  const { session } = auth;

  // Refus immédiat des positions GPS simulées
  if (isMocked === true) {
    return errors.forbidden(
      "Position GPS simulée détectée. Désactivez les outils de localisation factice.",
    );
  }

  // Vérification abonnement (même règle que le web)
  const sub = await prisma.subscription.findUnique({
    where: { companyId: session.companyId },
    select: {
      status: true,
      trialEndsAt: true,
      currentPeriodEnd: true,
      gracePeriodEndsAt: true,
    },
  });
  if (!sub) {
    return errors.forbidden("Aucun abonnement actif pour votre entreprise");
  }
  const now = new Date();
  const isExpired =
    (sub.status === "TRIALING" &&
      (sub.trialEndsAt ?? sub.currentPeriodEnd) <= now) ||
    sub.status === "EXPIRED" ||
    sub.status === "CANCELLED" ||
    ((sub.status === "GRACE_PERIOD" || sub.status === "PAST_DUE") &&
      (sub.gracePeriodEndsAt ?? sub.currentPeriodEnd) <= now);
  if (isExpired) {
    return errors.forbidden(
      "L'abonnement de votre entreprise a expiré. Contactez votre administrateur.",
    );
  }

  try {
    const record = await attendanceService.clockAction({
      employeeId: session.employeeId,
      companyId: session.companyId,
      type: type as EventType,
      latitude,
      longitude,
      source: "MOBILE_WEB" as EventSource,
    });
    return ok({ id: record.id, type });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur de pointage";
    // Les erreurs de geofence/horaires sont des erreurs métier (422)
    return errors.unprocessable(message);
  }
}

export const OPTIONS = preflight;
