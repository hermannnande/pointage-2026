import { createHash, randomUUID } from "node:crypto";

interface CompleteRegistrationPayload {
  email?: string;
  phone?: string;
  externalId?: string;
  clientIpAddress?: string | null;
  clientUserAgent?: string | null;
  eventSourceUrl?: string | null;
  eventId?: string;
}

const META_GRAPH_VERSION = "v23.0";

function normalizeEmail(email?: string) {
  return email?.trim().toLowerCase() ?? "";
}

function normalizePhone(phone?: string) {
  if (!phone) return "";
  return phone.replace(/[^\d+]/g, "");
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function getPixelId() {
  return process.env.NEXT_PUBLIC_FB_PIXEL_ID || process.env.FB_PIXEL_ID || "1404819328327910";
}

function getAccessToken() {
  return process.env.META_CONVERSIONS_API_TOKEN || process.env.META_CAPI_ACCESS_TOKEN;
}

export function createMetaEventId() {
  return randomUUID();
}

export async function sendCompleteRegistrationToMeta(payload: CompleteRegistrationPayload) {
  const accessToken = getAccessToken();
  if (!accessToken) return;

  const pixelId = getPixelId();

  const email = normalizeEmail(payload.email);
  const phone = normalizePhone(payload.phone);

  const userData: Record<string, unknown> = {
    client_ip_address: payload.clientIpAddress ?? undefined,
    client_user_agent: payload.clientUserAgent ?? undefined,
    em: email ? [sha256(email)] : undefined,
    ph: phone ? [sha256(phone)] : undefined,
    external_id: payload.externalId ? [sha256(payload.externalId)] : undefined,
  };

  const eventId = payload.eventId ?? createMetaEventId();

  await fetch(`https://graph.facebook.com/${META_GRAPH_VERSION}/${pixelId}/events`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      data: [
        {
          event_name: "CompleteRegistration",
          event_time: Math.floor(Date.now() / 1000),
          action_source: "website",
          event_id: eventId,
          event_source_url: payload.eventSourceUrl ?? undefined,
          user_data: userData,
          custom_data: {
            status: "completed",
            registration_method: "email",
          },
        },
      ],
      access_token: accessToken,
    }),
  });

  return eventId;
}
