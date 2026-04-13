import { scryptSync, randomBytes, timingSafeEqual, createHmac } from "node:crypto";

const SESSION_SECRET =
  process.env.SUPABASE_SERVICE_ROLE_KEY || "oc-employee-fallback-secret-key";
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24h
export const EMPLOYEE_COOKIE_NAME = "oc_employee_session";

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const buf1 = Buffer.from(hash, "hex");
  const buf2 = scryptSync(password, salt, 64);
  if (buf1.length !== buf2.length) return false;
  return timingSafeEqual(buf1, buf2);
}

export interface EmployeeSessionPayload {
  employeeId: string;
  companyId: string;
  siteId: string;
  siteName: string;
  siteCode: string;
  firstName: string;
  lastName: string;
  matricule: string;
  exp: number;
}

export function createSessionToken(
  data: Omit<EmployeeSessionPayload, "exp">,
): string {
  const payload: EmployeeSessionPayload = {
    ...data,
    exp: Date.now() + SESSION_DURATION_MS,
  };
  const payloadStr = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", SESSION_SECRET)
    .update(payloadStr)
    .digest("base64url");
  return `${payloadStr}.${signature}`;
}

export function verifySessionToken(
  token: string,
): EmployeeSessionPayload | null {
  try {
    const dotIdx = token.indexOf(".");
    if (dotIdx === -1) return null;

    const payloadStr = token.slice(0, dotIdx);
    const signature = token.slice(dotIdx + 1);

    const expectedSig = createHmac("sha256", SESSION_SECRET)
      .update(payloadStr)
      .digest("base64url");

    if (signature !== expectedSig) return null;

    const payload: EmployeeSessionPayload = JSON.parse(
      Buffer.from(payloadStr, "base64url").toString(),
    );

    if (payload.exp < Date.now()) return null;

    return payload;
  } catch {
    return null;
  }
}

const SAFE_CHARS = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export function generateSiteCode(): string {
  const bytes = randomBytes(6);
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += SAFE_CHARS[bytes[i] % SAFE_CHARS.length];
  }
  return code;
}
