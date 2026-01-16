import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import {
  parseStudentSessionValue,
  getStudentSessionCookieName,
} from "@/utils/student-session";

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
  // This `try/catch` block is only here for the interactive tutorial.
  // Feel free to remove once you have Supabase connected.
  try {
    const host = getHost(request);
    const slug = getInstitutionSlugFromHost(host);
    const pathname = request.nextUrl.pathname;

    if (!slug) {
      if (
        pathname.startsWith("/dashboard") ||
        pathname.startsWith("/sign-in") ||
        pathname.startsWith("/protected")
      ) {
        return NextResponse.redirect(getRootRedirectUrl(request));
      }
    }

    // Create an unmodified response
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
              response.cookies.set(name, value, options),
            );
          },
        },
      },
    );

    // This will refresh session if expired - required for Server Components
    // https://supabase.com/docs/guides/auth/server-side/nextjs
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (slug) {
      const { data: institution } = await supabase
        .from("edu_institutions")
        .select("id, name, slug, logo_url")
        .eq("slug", slug)
        .eq("active", true)
        .maybeSingle();

      if (!institution) {
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

    const studentToken = request.cookies.get(getStudentSessionCookieName())?.value;
    const studentSession = studentToken
      ? await parseStudentSessionValue(studentToken)
      : null;

    // protected routes
    if (pathname.startsWith("/protected") && authError) {
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }

    if (slug && pathname === "/") {
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }

    if (pathname.startsWith("/dashboard/student")) {
      if (!studentSession) {
        return NextResponse.redirect(new URL("/sign-in", request.url));
      }
    }

    if (pathname.startsWith("/dashboard/teacher") || pathname.startsWith("/dashboard/admin")) {
      if (authError || !authData.user) {
        return NextResponse.redirect(new URL("/sign-in", request.url));
      }

      const { data: profile } = await supabase
        .from("edu_profiles")
        .select("global_role, active")
        .eq("id", authData.user.id)
        .maybeSingle();

      if (!profile?.active) {
        return NextResponse.redirect(new URL("/sign-in", request.url));
      }

      if (pathname.startsWith("/dashboard/admin") && profile.global_role !== "admin") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }

      if (
        pathname.startsWith("/dashboard/teacher") &&
        profile.global_role !== "teacher" &&
        profile.global_role !== "admin"
      ) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }

    return response;
  } catch (e) {
    // If you are here, a Supabase client could not be created!
    // This is likely because you have not set up environment variables.
    // Check out http://localhost:3000 for Next Steps.
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  }
};
