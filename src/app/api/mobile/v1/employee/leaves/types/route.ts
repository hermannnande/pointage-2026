/**
 * /api/mobile/v1/employee/leaves/types
 *
 * GET → liste des types de congés actifs de l'entreprise de l'employé.
 *       (Lecture seule pour l'employé connecté.)
 */

import * as leaveService from "@/services/leave.service";

import { errors, ok } from "../../../_lib/api-response";
import { requireEmployeeAuth } from "../../../_lib/auth";
import { preflight } from "../../../_lib/cors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const auth = await requireEmployeeAuth();
  if (!auth.ok) return auth.response;

  try {
    const types = await leaveService.getLeaveTypes(auth.session.companyId);
    return ok({
      types: types
        .filter((t) => t.isActive)
        .map((t) => ({
          id: t.id,
          name: t.name,
          color: t.color,
          defaultDays: t.defaultDays,
          isPaid: t.isPaid,
          requiresDoc: t.requiresDoc,
        })),
    });
  } catch (e) {
    return errors.serverError(
      e instanceof Error ? e.message : "Erreur chargement types",
    );
  }
}

export const OPTIONS = preflight;
