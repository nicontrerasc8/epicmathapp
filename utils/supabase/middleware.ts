import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import {
  parseStudentSessionValue,
  getStudentSessionCookieName,
} from "@/utils/student-session";

export const updateSession = async (request: NextRequest) => {
  // This `try/catch` block is only here for the interactive tutorial.
  // Feel free to remove once you have Supabase connected.
  try {
    // Create an unmodified response
    let response = NextResponse.next({
      request: {
        headers: request.headers,
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
              request,
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
    const pathname = request.nextUrl.pathname;

    const studentToken = request.cookies.get(getStudentSessionCookieName())?.value;
    const studentSession = studentToken
      ? await parseStudentSessionValue(studentToken)
      : null;

    // protected routes
    if (pathname.startsWith("/protected") && authError) {
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }

    if (pathname === "/" && !authError) {
      return NextResponse.redirect(new URL("/protected", request.url));
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
