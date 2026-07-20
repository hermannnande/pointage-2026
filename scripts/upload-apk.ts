/**
 * Upload les APKs Android vers Supabase Storage (bucket public `apk`).
 *
 * Deux variantes (issues d'un build `build-apk.ps1 -SplitPerAbi`) :
 *   - app-arm64-v8a-release.apk    → apk/ocontrole.apk        (défaut, téléphones 2017+)
 *   - app-armeabi-v7a-release.apk  → apk/ocontrole-32bit.apk  (anciens téléphones 32-bit)
 *
 * Le site les sert via /download/apk et /download/apk?arch=32.
 * Ré-exécuter ce script après chaque build — AUCUN redéploiement du site requis.
 *
 * Usage :
 *   npx tsx scripts/upload-apk.ts
 *
 * NB : le plan Supabase limite chaque fichier à 50 Mo, d'où le split par
 * architecture (~30-35 Mo chacun) plutôt qu'un APK universel (~53 Mo).
 */
import { readFileSync, statSync } from "fs";
import { resolve } from "path";

import { config as loadEnv } from "dotenv";

loadEnv({ path: resolve(process.cwd(), ".env.local"), override: true });

const BUCKET = "apk";
const FLUTTER_APK_DIR = "../ocontrole_mobile/build/app/outputs/flutter-apk";
const PUBSPEC_PATH = "../ocontrole_mobile/pubspec.yaml";

/** Notes de version affichées dans le popup de mise à jour de l'app.
 *  Modifier ici avant chaque publication (ou laisser vide). */
const RELEASE_NOTES =
  "Correction importante : les lieux de travail créés via un lien Google " +
  "Maps / WhatsApp enregistrent désormais la position exacte du repère " +
  "(plus de fausses alertes « Hors périmètre » au pointage).";

/**
 * Offset d'ABI appliqué par `flutter build apk --split-per-abi` : le
 * versionCode réellement installé sur un téléphone arm64 (~99 % du parc)
 * vaut `2000 + buildNumber` (armeabi-v7a → 1000+, x86_64 → 4000+).
 *
 * On publie donc la valeur AVEC l'offset arm64 pour que même les APK déjà
 * installés — dont l'ancien comparateur lisait la valeur brute (2xxx) — voient
 * la nouvelle version comme supérieure et proposent enfin la mise à jour.
 * L'app corrigée (≥ 1.0.22) retire l'offset des deux côtés, donc la
 * comparaison reste juste pour elle aussi. Cf. app_update.dart `_logicalBuild`.
 */
const ARM64_ABI_OFFSET = 2000;

/** Lit `version: 1.0.15+16` du pubspec → { versionName, versionCode }. */
function readAppVersion(): {
  versionName: string;
  versionCode: number;
  publishedVersionCode: number;
} {
  const pubspec = readFileSync(resolve(PUBSPEC_PATH), "utf-8");
  const match = pubspec.match(/^version:\s*([\d.]+)\+(\d+)\s*$/m);
  if (!match) {
    console.error(`Version introuvable dans ${PUBSPEC_PATH} (format attendu : version: x.y.z+n)`);
    process.exit(1);
  }
  const versionCode = parseInt(match[2], 10);
  return {
    versionName: match[1],
    versionCode,
    publishedVersionCode: ARM64_ABI_OFFSET + versionCode,
  };
}

const VARIANTS = [
  {
    local: "app-arm64-v8a-release.apk",
    remote: "ocontrole.apk",
    label: "arm64 (défaut)",
  },
  {
    local: "app-armeabi-v7a-release.apk",
    remote: "ocontrole-32bit.apk",
    label: "armeabi-v7a (anciens téléphones)",
  },
] as const;

async function main() {
  const { createClient } = await import("@supabase/supabase-js");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error(
      "NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants dans .env.local",
    );
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  // 1) S'assurer que le bucket public existe
  const { data: buckets, error: listErr } = await supabase.storage.listBuckets();
  if (listErr) {
    console.error("Erreur listBuckets :", listErr.message);
    process.exit(1);
  }
  if (!buckets.some((b) => b.name === BUCKET)) {
    console.log(`Bucket "${BUCKET}" absent — création (public)...`);
    const { error: createErr } = await supabase.storage.createBucket(BUCKET, {
      public: true,
    });
    if (createErr) {
      console.error("Erreur createBucket :", createErr.message);
      process.exit(1);
    }
  }

  // 2) Upload de chaque variante (upsert = remplace la version en ligne)
  for (const variant of VARIANTS) {
    const apkPath = resolve(FLUTTER_APK_DIR, variant.local);
    let sizeMb: string;
    try {
      sizeMb = (statSync(apkPath).size / 1024 / 1024).toFixed(1);
    } catch {
      console.warn(`[!] ${variant.local} introuvable — variante ignorée.`);
      console.warn(`    Buildez avec : .\\build-apk.ps1 -SplitPerAbi`);
      continue;
    }

    console.log(`Upload ${variant.label} : ${sizeMb} Mo → ${variant.remote} ...`);
    const file = readFileSync(apkPath);
    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(variant.remote, file, {
        upsert: true,
        contentType: "application/vnd.android.package-archive",
        cacheControl: "3600",
      });
    if (uploadErr) {
      console.error(`Erreur upload ${variant.remote} :`, uploadErr.message);
      process.exit(1);
    }

    const { data: pub } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(variant.remote);
    console.log(`   ✅ ${pub.publicUrl}`);
  }

  // 3) Publier version.json — consommé par /api/mobile/v1/app/version pour
  //    que l'app installée propose la mise à jour à l'utilisateur.
  const { versionName, versionCode, publishedVersionCode } = readAppVersion();
  const versionPayload = JSON.stringify(
    {
      versionName,
      // Publié AVEC l'offset arm64 (cf. ARM64_ABI_OFFSET) pour que les APK
      // déjà installés détectent la mise à jour. L'app corrigée renormalise.
      versionCode: publishedVersionCode,
      apkUrl: "https://ocontrole.com/download/apk",
      apk32Url: "https://ocontrole.com/download/apk?arch=32",
      notes: RELEASE_NOTES,
      publishedAt: new Date().toISOString(),
    },
    null,
    2,
  );
  const { error: versionErr } = await supabase.storage
    .from(BUCKET)
    .upload("version.json", Buffer.from(versionPayload, "utf-8"), {
      upsert: true,
      contentType: "application/json",
      cacheControl: "60",
    });
  if (versionErr) {
    console.error("Erreur upload version.json :", versionErr.message);
    process.exit(1);
  }
  console.log(
    `   ✅ version.json publié : ${versionName} ` +
      `(code publié ${publishedVersionCode}, build pubspec ${versionCode})`,
  );

  console.log("");
  console.log("Terminé. Le site sert l'APK via /download/apk (et ?arch=32).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
