import { type NextRequest, NextResponse } from "next/server";

import { createServerClient } from "@supabase/ssr";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    const pathname = request.nextUrl.pathname;
    const isDashboardPage = pathname.startsWith("/dashboard");
    const isOnboardingPage = pathname.startsWith("/onboarding");

    if (isDashboardPage || isOnboardingPage) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    supabaseResponse.headers.set("x-next-pathname", pathname);
    return supabaseResponse;
  }

  const code = request.nextUrl.searchParams.get("code");
  const pathname = request.nextUrl.pathname;
  const isCallbackRoute = pathname === "/api/auth/callback";

  if (code && !isCallbackRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/api/auth/callback";
    url.searchParams.set("code", code);
    url.searchParams.delete("next");
    return NextResponse.redirect(url);
  }

  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/signup") || pathname.startsWith("/forgot-password");
  const isResetPage = pathname.startsWith("/reset-password");
  const isDashboardPage = pathname.startsWith("/dashboard");
  const isOnboardingPage = pathname.startsWith("/onboarding");
  const isEmployeeSpace = pathname.startsWith("/espace-employe");
  const isEmployeeLogin = pathname === "/employe";
  const isSuperAdmin = pathname.startsWith("/super-admin");

  const isEmployeeCookieRoute = isEmployeeSpace || isEmployeeLogin;
  if (isEmployeeCookieRoute) {
    const sessionCookie = request.cookies.get("oc_employee_session");
    if (isEmployeeSpace && !sessionCookie?.value) {
      const url = request.nextUrl.clone();
      url.pathname = "/employe";
      return NextResponse.redirect(url);
    }
    if (isEmployeeLogin && sessionCookie?.value) {
      const url = request.nextUrl.clone();
      url.pathname = "/espace-employe";
      return NextResponse.redirect(url);
    }
    supabaseResponse.headers.set("x-next-pathname", pathname);
    return supabaseResponse;
  }

  const needsAuth = isDashboardPage || isOnboardingPage || isAuthPage || isSuperAdmin;
  if (!needsAuth) {
    supabaseResponse.headers.set("x-next-pathname", pathname);
    return supabaseResponse;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isSuperAdmin) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    supabaseResponse.headers.set("x-next-pathname", pathname);
    return supabaseResponse;
  }

  if (!user && (isDashboardPage || isOnboardingPage)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (user && isAuthPage && !isResetPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  supabaseResponse.headers.set("x-next-pathname", pathname);

  return supabaseResponse;
}
