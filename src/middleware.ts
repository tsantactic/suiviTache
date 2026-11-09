import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dummy.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy',
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet: any) {
          cookiesToSet.forEach(({ name, value, options }: any) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const isAuthRoute = request.nextUrl.pathname.startsWith("/login") || request.nextUrl.pathname.startsWith("/register");
  const isProtected = request.nextUrl.pathname.startsWith("/dashboard") || request.nextUrl.pathname.startsWith("/admin");

  if (isProtected && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (isProtected && user) {
    const { data: profile } = await supabase.from("profiles").select("is_approved, approval_status").eq("id", user.id).single();
    if (profile && profile.is_approved === false) {
      await supabase.auth.signOut();
      const url = new URL("/login", request.url);
      url.searchParams.set("reason", profile.approval_status === "disabled" ? "disabled" : "pending");
      return NextResponse.redirect(url);
    }
  }
  if (isAuthRoute && user) {
    // Laisse passer /login si raison explicite (affichage message après désactivation)
    if (request.nextUrl.pathname.startsWith("/login") && request.nextUrl.searchParams.get("reason")) {
      return response;
    }
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/login", "/register"],
};
