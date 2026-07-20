/* Test réel du résolveur de liens partagés (cascade de précision). */
import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { resolveSharedLocationLink } from "../src/lib/geo-link-resolver";

async function main() {
  const cases: Array<[string, string]> = [
    [
      "Partage WhatsApp (?q=lat,lng)",
      "https://maps.google.com/?q=5.35311,-3.87021",
    ],
    [
      "Lien universel Google (api=1&query)",
      "https://www.google.com/maps/search/?api=1&query=5.35311,-3.87021",
    ],
    [
      "URL nom de lieu SANS pin (cascade nom + centre de vue)",
      "https://www.google.com/maps/place/Plateau,+Abidjan/@5.3364,-4.0267,15z",
    ],
  ];

  for (const [label, url] of cases) {
    const r = await resolveSharedLocationLink(url);
    console.log(`\n=== ${label} ===`);
    console.log("  source      :", r?.source);
    console.log("  lat,lng     :", r?.lat, r?.lng);
    console.log("  resolvedUrl :", r?.resolvedUrl?.slice(0, 140));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
