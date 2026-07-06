/**
 * GET /download/apk          → APK Android arm64 (téléphones récents, défaut)
 * GET /download/apk?arch=32  → APK armeabi-v7a (anciens téléphones 32-bit)
 *
 * Redirige vers l'APK hébergé sur Supabase Storage (bucket public `apk`).
 * Passer par cette route (plutôt que l'URL Storage en dur dans l'UI)
 * permet de :
 *   - changer d'hébergement sans toucher aux pages ;
 *   - garder une URL courte et mémorisable (ocontrole.com/download/apk) ;
 *   - surcharger la cible via la variable d'env APK_PUBLIC_URL si besoin.
 *
 * L'upload des APKs se fait via `npx tsx scripts/upload-apk.ts`.
 */

import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const arch = request.nextUrl.searchParams.get("arch");
  const file = arch === "32" ? "ocontrole-32bit.apk" : "ocontrole.apk";
  // Nom affiché à l'utilisateur au téléchargement (Content-Disposition).
  const downloadName = arch === "32" ? "OControle-32bit.apk" : "OControle.apk";

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const target =
    arch !== "32" && process.env.APK_PUBLIC_URL
      ? process.env.APK_PUBLIC_URL
      : `${supabaseUrl}/storage/v1/object/public/apk/${file}?download=${downloadName}`;

  return NextResponse.redirect(target, 302);
}
