/**
 * Headers CORS pour l'API mobile.
 *
 * L'app Flutter mobile n'a pas d'origin (les requêtes natives ne sont
 * pas soumises à CORS), mais on autorise tout pour permettre :
 *   - les tests depuis un navigateur (debug)
 *   - les éventuels clients web tiers (intégrations futures)
 */

export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Version, X-Client-Platform, X-Request-Id",
  "Access-Control-Max-Age": "86400",
};

/**
 * Handler OPTIONS générique (preflight CORS).
 * Réutilisable dans toutes les routes via : `export const OPTIONS = preflight;`
 */
export function preflight(): Response {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}
