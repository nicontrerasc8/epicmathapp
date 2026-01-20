import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

type InstitutionLookup = {
  id: string;
  name: string;
  slug: string;
  logo_url?: string | null;
};

const ROOT_DOMAIN =
  process.env.NEXT_PUBLIC_ROOT_DOMAIN || "ludus-edu.com";

const getHost = (request: NextRequest) =>
  request.headers.get("host") || "";

const getRootRedirectUrl = (request: NextRequest) => {
  const host = getHost(request);
  const protocol = request.nextUrl.protocol;
  if (host.includes("localhost")) {
    return `${protocol}//localhost:3000/`;
  }
  return `${protocol}//${ROOT_DOMAIN}/`;
};

const getInstitutionSlugFromHost = (host: string) => {
  const hostname = host.split(":")[0] || "";
  if (!hostname) return null;
  if (hostname === "localhost") return null;
  if (hostname.endsWith(".localhost")) {
    const parts = hostname.split(".");
    return parts.length > 1 ? parts[0] : null;
  }
  if (hostname === ROOT_DOMAIN || hostname === `www.${ROOT_DOMAIN}`) {
    return null;
  }
  if (hostname.endsWith(`.${ROOT_DOMAIN}`)) {
    const slug = hostname.slice(0, -1 * (`.${ROOT_DOMAIN}`.length));
    if (!slug || slug === "www") return null;
    return slug;
  }
  return null;
};

export const updateSession = async (request: NextRequest) => {
  const host = getHost(request);
  const slug = getInstitutionSlugFromHost(host);
  const pathname = request.nextUrl.pathname;
  const isStudentRoute = pathname.startsWith("/student");

  // Redirect root domain dashboard/auth routes to root
  if (!slug) {
    const isSignInRoute = pathname.startsWith("/sign-in");
    if (!isStudentRoute && !isSignInRoute && pathname.startsWith("/dashboard")) {
      return NextResponse.redirect(getRootRedirectUrl(request));
    }
  }

  // Create request headers with institution context
  const requestHeaders = new Headers(request.headers);
  if (slug) {
    requestHeaders.set("x-institution-slug", slug);
  } else {
    requestHeaders.delete("x-institution-slug");
  }

  let response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  const isProduction = request.nextUrl.protocol === "https:";
  const isLocalhost = host.includes("localhost");

  const getCookieOptions = (options: any = {}) => {
    return {
      ...options,
      path: options.path || "/",
      sameSite: options.sameSite || (isProduction ? "lax" : "lax"),
      secure: options.secure !== undefined ? options.secure : isProduction,
      domain: !isLocalhost && slug ? `.${ROOT_DOMAIN}` : undefined,
    };
  };

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({
            request: {
              headers: requestHeaders,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, getCookieOptions(options)),
          );
        },
      },
    },
  );

  // Refresh session if expired - required for Server Components
  const { data: authData, error: authError } = await supabase.auth.getUser();
  // 🚨 ROOT ACCESS CONTROL
if (pathname === "/" && authData?.user) {
  const { data: profile } = await supabase
    .from("edu_profiles")
    .select("global_role")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (profile?.global_role === "student") {
    return NextResponse.redirect(new URL("/student/play", request.url));
  }

  if (profile?.global_role === "teacher") {
    return NextResponse.redirect(new URL("/dashboard/teacher", request.url));
  }

  if (profile?.global_role === "admin") {
    return NextResponse.redirect(new URL("/admin-access", request.url));
  }
}


  // Fetch and validate institution if on subdomain
  if (slug) {
    const { data: institution, error: instError } = await supabase
      .from("edu_institutions")
      .select("id, name, slug, logo_url")
      .eq("slug", slug)
      .eq("active", true)
      .maybeSingle();

    if (instError) {
      console.error("[Middleware] Institution lookup error:", instError);
      return NextResponse.redirect(getRootRedirectUrl(request));
    }

    if (!institution) {
      console.warn(`[Middleware] Institution not found or inactive: ${slug}`);
      return NextResponse.redirect(getRootRedirectUrl(request));
    }

    const inst = institution as InstitutionLookup;
    requestHeaders.set("x-institution-id", inst.id);
    requestHeaders.set("x-institution-name", inst.name);
    requestHeaders.set("x-institution-slug", inst.slug);
    if (inst.logo_url) {
      requestHeaders.set("x-institution-logo", inst.logo_url);
    } else {
      requestHeaders.delete("x-institution-logo");
    }

    response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // Redirect institution root to sign-in if user is not authenticated
  if (slug && pathname === "/" && (authError || !authData.user)) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  // Student routes - require Supabase auth + student profile
  if (isStudentRoute) {
    if (authError || !authData.user) {
      console.warn(`[Middleware] Auth required for student route: ${pathname}`);
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }

    const { data: profile, error: profileError } = await supabase
      .from("edu_profiles")
      .select("global_role, active")
      .eq("id", authData.user.id)
      .maybeSingle();

    if (profileError || !profile || !profile.active || profile.global_role !== "student") {
      console.warn(`[Middleware] Student access denied for user: ${authData.user.id}`);
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }

    if (slug) {
      const institutionId = requestHeaders.get("x-institution-id") || "";
      const { data: member, error: memberError } = await supabase
        .from("edu_institution_members")
        .select("id")
        .eq("profile_id", authData.user.id)
        .eq("role", "student")
        .eq("active", true)
        .eq("institution_id", institutionId)
        .maybeSingle();

      if (memberError) {
        console.warn(`[Middleware] Student membership lookup failed for slug: ${slug}`);
        return NextResponse.redirect(getRootRedirectUrl(request));
      }

      if (!member) {
        console.warn(`[Middleware] Student not in institution for slug: ${slug}. Allowing access to show message.`);
      }
    }

    return response;
  }

  // Teacher and Admin routes - require Supabase auth and proper role
  if (
    pathname.startsWith("/dashboard/teacher") ||
    pathname.startsWith("/dashboard/admin")
  ) {
    if (authError || !authData.user) {
      console.warn(`[Middleware] Auth required for: ${pathname}`);
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }

    const { data: profile, error: profileError } = await supabase
      .from("edu_profiles")
      .select("global_role, active")
      .eq("id", authData.user.id)
      .maybeSingle();

    if (profileError) {
      console.error("[Middleware] Profile lookup error:", profileError);
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }

    if (!profile) {
      console.warn(`[Middleware] Profile not found for user: ${authData.user.id}`);
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }

    if (!profile.active) {
      console.warn(`[Middleware] Inactive profile: ${authData.user.id}`);
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }

    if (pathname.startsWith("/dashboard/admin") && profile.global_role !== "admin") {
      console.warn(`[Middleware] Admin access denied for role: ${profile.global_role}`);
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    if (
      pathname.startsWith("/dashboard/teacher") &&
      profile.global_role !== "teacher" &&
      profile.global_role !== "admin"
    ) {
      console.warn(`[Middleware] Teacher access denied for role: ${profile.global_role}`);
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return response;
};
