/**
 * GET /api/mobile/v1/app/version
 *
 * Renvoie la dernière version publiée de l'APK Android :
 *   { versionName: "1.0.15", versionCode: 16, apkUrl: "...", notes?: "..." }
 *
 * Source : le fichier `version.json` uploadé sur Supabase Storage (bucket
 * public `apk`) par `scripts/upload-apk.ts` en même temps que l'APK.
 * Aucun redéploiement du site n'est donc nécessaire pour publier une
 * nouvelle version.
 *
 * Endpoint PUBLIC (pas d'auth) : l'app mobile l'appelle au démarrage pour
 * proposer la mise à jour à l'utilisateur.
 */

import { errors, ok } from "../../_lib/api-response";
import { preflight } from "../../_lib/cors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    return errors.serverError("Supabase non configuré");
  }

  try {
    const res = await fetch(
      `${supabaseUrl}/storage/v1/object/public/apk/version.json`,
      { cache: "no-store", signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) {
      return errors.notFound("Aucune version publiée");
    }

    const data = (await res.json()) as {
      versionName?: string;
      versionCode?: number;
      apkUrl?: string;
      notes?: string;
    };

    return ok({
      versionName: data.versionName ?? "",
      versionCode: data.versionCode ?? 0,
      apkUrl: data.apkUrl ?? "https://ocontrole.com/download/apk",
      notes: data.notes ?? null,
    });
  } catch {
    return errors.upstreamError("Version indisponible");
  }
}

export const OPTIONS = preflight;
