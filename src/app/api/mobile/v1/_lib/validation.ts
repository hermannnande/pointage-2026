/**
 * Helpers de validation Zod pour l'API mobile.
 *
 * Wrap des appels Zod pour produire automatiquement une erreur 422
 * formatée selon notre standard.
 */

import { ZodError, type ZodType } from "zod";

import { errors as apiErrors } from "./api-response";

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: Response };

/**
 * Parse + valide un objet inconnu avec un schéma Zod.
 * Retourne soit `{ ok: true, data }`, soit `{ ok: false, response: 422 }`.
 */
export function validate<T>(
  schema: ZodType<T>,
  input: unknown,
): ValidationResult<T> {
  const result = schema.safeParse(input);
  if (result.success) {
    return { ok: true, data: result.data };
  }
  const flat = flattenZodError(result.error);
  return {
    ok: false,
    response: apiErrors.unprocessable("Données invalides", flat),
  };
}

/**
 * Parse le body JSON d'une requête puis le valide avec un schéma Zod.
 */
export async function parseAndValidateBody<T>(
  request: Request,
  schema: ZodType<T>,
): Promise<ValidationResult<T>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { ok: false, response: apiErrors.badRequest("Corps JSON invalide") };
  }
  return validate(schema, raw);
}

/**
 * Aplatit les erreurs Zod en {field: [messages]} pour l'app mobile.
 */
function flattenZodError(error: ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join(".") : "_root";
    if (!out[key]) out[key] = [];
    out[key].push(issue.message);
  }
  return out;
}
