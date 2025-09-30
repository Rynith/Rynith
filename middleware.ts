// middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

// Allow these paths without auth-gating in middleware.
// (Pages/APIs will enforce their own auth/roles as needed.)
const PUBLIC_PATHS = [
  "/_next",
  "/favicon.ico",
  "/public",
  "/auth",
  "/auth/callback",
  "/onboarding",
  "/api",
];

const isPublic = (p: string) =>
  PUBLIC_PATHS.some((x) => p === x || p.startsWith(x + "/"));

export async function middleware(req: NextRequest) {
  const { pathname, origin } = req.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  const res = NextResponse.next();

  const supa = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          res.cookies.set({ name, value: "", ...options, maxAge: 0 });
        },
      },
    }
  );

  // Auth-only gate (no org/membership checks here)
  const { data } = await supa.auth.getUser();
  if (!data?.user) {
    return NextResponse.redirect(new URL("/auth", origin));
  }

  return res;
}

// Apply to everything except Next static assets
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
