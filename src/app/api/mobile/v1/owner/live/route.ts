/**
 * GET /api/mobile/v1/owner/live
 *
 * Pointage en direct du jour pour l'espace propriétaire / admin.
 *
 * Query params (optionnels) :
 *   - siteId : filtre les pointages et le total d'employés actifs sur un site
 *
 * Réponse :
 *   {
 *     stats: { total, present, onBreak, completed, absent, late },
 *     items: [
 *       {
 *         employee: { id, firstName, lastName, position, photoUrl, phone, matricule, siteId },
 *         site: { id, name, address, city, latitude, longitude, geofenceRadius } | null,
 *         record: { ...AttendanceRecord, hasOpenBreak } | null,
 *         displayStatus: "PRESENT" | "ON_BREAK" | "COMPLETED" | "ABSENT" | "LATE",
 *         lastPosition: { lat, lng, address, at, source } | null
 *       }, ...
 *     ]
 *   }
 *
 * Sécurité : auth Supabase + permission `attendance.view`.
 */

import { PERMISSIONS } from "@/config/permissions";
import { prisma } from "@/lib/prisma/client";
import { requirePermission } from "@/services/tenant.service";

import { errors, ok } from "../../_lib/api-response";
import { requireOwnerAuth } from "../../_lib/auth";
import { preflight } from "../../_lib/cors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function todayDate(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

type DisplayStatus =
  | "PRESENT"
  | "ON_BREAK"
  | "COMPLETED"
  | "ABSENT"
  | "LATE";

export async function GET(request: Request) {
  const auth = await requireOwnerAuth();
  if (!auth.ok) return auth.response;

  try {
    requirePermission(auth.tenant, PERMISSIONS.ATTENDANCE_VIEW);
  } catch {
    return errors.forbidden("Permission attendance.view requise");
  }

  const { searchParams } = new URL(request.url);
  const siteId = searchParams.get("siteId") || undefined;
  const companyId = auth.tenant.companyId;
  const today = todayDate();

  // ─── Charge les enregistrements du jour ─────────────────
  const recordWhere: Record<string, unknown> = { companyId, date: today };
  if (siteId) recordWhere.siteId = siteId;

  const records = await prisma.attendanceRecord.findMany({
    where: recordWhere as never,
    include: {
      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          position: true,
          photoUrl: true,
          phone: true,
          matricule: true,
          siteId: true,
        },
      },
      site: {
        select: {
          id: true,
          name: true,
          address: true,
          city: true,
          latitude: true,
          longitude: true,
          geofenceRadius: true,
        },
      },
      breaks: {
        select: {
          id: true,
          startTime: true,
          endTime: true,
          durationMinutes: true,
        },
      },
    },
    orderBy: [{ clockIn: "desc" }, { createdAt: "desc" }],
  });

  // ─── Charge les employés actifs (pour calculer les absents) ─
  const activeEmployees = await prisma.employee.findMany({
    where: {
      companyId,
      isActive: true,
      ...(siteId ? { siteId } : {}),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      position: true,
      photoUrl: true,
      phone: true,
      matricule: true,
      siteId: true,
      site: {
        select: {
          id: true,
          name: true,
          address: true,
          city: true,
          latitude: true,
          longitude: true,
          geofenceRadius: true,
        },
      },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  // ─── Construit les items ────────────────────────────────
  const recordByEmployee = new Map<string, (typeof records)[number]>();
  for (const r of records) recordByEmployee.set(r.employeeId, r);

  type Item = {
    employee: (typeof activeEmployees)[number];
    site: (typeof activeEmployees)[number]["site"];
    record:
      | ((typeof records)[number] & { hasOpenBreak: boolean })
      | null;
    displayStatus: DisplayStatus;
    lastPosition: {
      lat: number;
      lng: number;
      address: string | null;
      at: string;
      source: "CLOCK_IN" | "CLOCK_OUT";
    } | null;
  };

  const items: Item[] = activeEmployees.map((emp) => {
    const r = recordByEmployee.get(emp.id) ?? null;
    const hasOpenBreak = r ? r.breaks.some((b) => b.endTime === null) : false;

    let displayStatus: DisplayStatus;
    if (!r || !r.clockIn) {
      displayStatus = "ABSENT";
    } else if (hasOpenBreak) {
      displayStatus = "ON_BREAK";
    } else if (r.clockOut) {
      displayStatus = "COMPLETED";
    } else if (r.isLate) {
      displayStatus = "LATE";
    } else {
      displayStatus = "PRESENT";
    }

    let lastPosition: Item["lastPosition"] = null;
    if (
      r?.clockOut &&
      r.clockOutLat !== null &&
      r.clockOutLng !== null
    ) {
      lastPosition = {
        lat: r.clockOutLat,
        lng: r.clockOutLng,
        address: r.clockOutAddress,
        at: r.clockOut.toISOString(),
        source: "CLOCK_OUT",
      };
    } else if (
      r?.clockIn &&
      r.clockInLat !== null &&
      r.clockInLng !== null
    ) {
      lastPosition = {
        lat: r.clockInLat,
        lng: r.clockInLng,
        address: r.clockInAddress,
        at: r.clockIn.toISOString(),
        source: "CLOCK_IN",
      };
    }

    return {
      employee: emp,
      site: emp.site,
      record: r ? { ...r, hasOpenBreak } : null,
      displayStatus,
      lastPosition,
    };
  });

  // Inclure aussi les records orphelins (employees inactifs avec un record du jour)
  const knownEmployeeIds = new Set(activeEmployees.map((e) => e.id));
  for (const r of records) {
    if (!knownEmployeeIds.has(r.employeeId)) {
      const hasOpenBreak = r.breaks.some((b) => b.endTime === null);
      let displayStatus: DisplayStatus;
      if (hasOpenBreak) {
        displayStatus = "ON_BREAK";
      } else if (r.clockOut) {
        displayStatus = "COMPLETED";
      } else if (r.isLate) {
        displayStatus = "LATE";
      } else {
        displayStatus = "PRESENT";
      }

      let lastPosition: Item["lastPosition"] = null;
      if (
        r.clockOut &&
        r.clockOutLat !== null &&
        r.clockOutLng !== null
      ) {
        lastPosition = {
          lat: r.clockOutLat,
          lng: r.clockOutLng,
          address: r.clockOutAddress,
          at: r.clockOut.toISOString(),
          source: "CLOCK_OUT",
        };
      } else if (
        r.clockIn &&
        r.clockInLat !== null &&
        r.clockInLng !== null
      ) {
        lastPosition = {
          lat: r.clockInLat,
          lng: r.clockInLng,
          address: r.clockInAddress,
          at: r.clockIn.toISOString(),
          source: "CLOCK_IN",
        };
      }

      items.push({
        employee: {
          id: r.employee.id,
          firstName: r.employee.firstName,
          lastName: r.employee.lastName,
          position: r.employee.position,
          photoUrl: r.employee.photoUrl,
          phone: r.employee.phone,
          matricule: r.employee.matricule,
          siteId: r.employee.siteId,
          site: r.site,
        },
        site: r.site,
        record: { ...r, hasOpenBreak },
        displayStatus,
        lastPosition,
      });
    }
  }

  // ─── Stats ──────────────────────────────────────────────
  const stats = {
    total: activeEmployees.length,
    present: items.filter((i) => i.displayStatus === "PRESENT").length,
    onBreak: items.filter((i) => i.displayStatus === "ON_BREAK").length,
    completed: items.filter((i) => i.displayStatus === "COMPLETED").length,
    late: items.filter((i) => i.record?.isLate === true).length,
    absent: items.filter((i) => i.displayStatus === "ABSENT").length,
  };

  return ok({
    stats,
    items,
    refreshedAt: new Date().toISOString(),
  });
}

export const OPTIONS = preflight;
