import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { prisma } from "@/lib/prisma/client";
import { createClient } from "@/lib/supabase/server";
import { sendCompleteRegistrationToMeta } from "@/lib/meta-conversions";
import { findOrCreateUser } from "@/services/auth.service";
import { getTenantContext } from "@/services/tenant.service";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        try {
          const existing = await prisma.user.findUnique({
            where: { supabaseUid: user.id },
            select: { id: true },
          });

          await findOrCreateUser({
            supabaseUid: user.id,
            email: user.email || "",
            fullName:
              user.user_metadata?.full_name ||
              user.user_metadata?.name ||
              user.email?.split("@")[0] ||
              "Utilisateur",
            avatarUrl: user.user_metadata?.avatar_url || user.user_metadata?.picture,
            phone: user.user_metadata?.phone || user.phone,
          });

          if (!existing) {
            const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip");
            const userAgent = request.headers.get("user-agent");
            await sendCompleteRegistrationToMeta({
              email: user.email || "",
              phone: user.user_metadata?.phone || user.phone || undefined,
              externalId: user.id,
              clientIpAddress: ip,
              clientUserAgent: userAgent,
              eventSourceUrl: `${origin}/signup`,
            });
          }
        } catch {
          // Non-bloquant
        }

        try {
          const ctx = await getTenantContext(user.id);
          if (ctx && ctx.company.onboardingStep >= 3) {
            return NextResponse.redirect(`${origin}/dashboard`);
          }
        } catch {
          // Non-bloquant
        }
      }

      return NextResponse.redirect(`${origin}/onboarding`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
