import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { findOrCreateUser } from "@/services/auth.service";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/onboarding";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        try {
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
        } catch {
          // Non-bloquant : l'utilisateur est connecté même si la synchro Prisma échoue.
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
