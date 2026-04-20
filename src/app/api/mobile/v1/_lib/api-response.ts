/**
 * Helpers de réponse standardisés pour l'API Mobile OControle.
 *
 * Format de réponse uniforme :
 *   - Succès : { ok: true, data: <T>, meta?: { ... } }
 *   - Erreur : { ok: false, error: { code, message, details? } }
 *
 * Toutes les routes mobiles DOIVENT utiliser ces helpers.
 * Cela permet à l'app Flutter de parser de manière uniforme.
 */

import { CORS_HEADERS } from "./cors";

export interface ApiSuccess<T> {
  ok: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiError {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store, no-cache, must-revalidate",
  ...CORS_HEADERS,
};

export function ok<T>(
  data: T,
  init?: { status?: number; meta?: Record<string, unknown> },
): Response {
  const body: ApiSuccess<T> = { ok: true, data };
  if (init?.meta) body.meta = init.meta;
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: JSON_HEADERS,
  });
}

export function err(
  code: string,
  message: string,
  init?: { status?: number; details?: unknown },
): Response {
  const body: ApiError = {
    ok: false,
    error: { code, message, ...(init?.details !== undefined ? { details: init.details } : {}) },
  };
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 400,
    headers: JSON_HEADERS,
  });
}

// Réponses typées d'erreurs courantes
export const errors = {
  badRequest: (msg = "Requête invalide", details?: unknown) =>
    err("BAD_REQUEST", msg, { status: 400, details }),
  unauthorized: (msg = "Non authentifié") =>
    err("UNAUTHORIZED", msg, { status: 401 }),
  forbidden: (msg = "Action non autorisée") =>
    err("FORBIDDEN", msg, { status: 403 }),
  notFound: (msg = "Ressource introuvable") =>
    err("NOT_FOUND", msg, { status: 404 }),
  conflict: (msg = "Conflit de ressource") =>
    err("CONFLICT", msg, { status: 409 }),
  unprocessable: (msg = "Données invalides", details?: unknown) =>
    err("UNPROCESSABLE_ENTITY", msg, { status: 422, details }),
  rateLimited: (msg = "Trop de requêtes") =>
    err("RATE_LIMITED", msg, { status: 429 }),
  serverError: (msg = "Erreur serveur") =>
    err("SERVER_ERROR", msg, { status: 500 }),
  upstreamError: (msg = "Service externe indisponible") =>
    err("UPSTREAM_ERROR", msg, { status: 502 }),
  serviceUnavailable: (msg = "Service indisponible") =>
    err("SERVICE_UNAVAILABLE", msg, { status: 503 }),
};
