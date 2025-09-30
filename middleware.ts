// middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

const PUBLIC_PATHS = [
  "/",
  "/pricing",
  "/about",
  "/contact",
  "/blog",
  "/privacy",
  "/terms",
  "/robots.txt",
  "/sitemap.xml",
  "/data",
  "/assets", // your public folders
  "/favicon.ico",
  "/_next",
  "/public",
  "/auth",
  "/auth/callback",
  "/onboarding",
  "/api",
];

// NEW: allow static files from /public by extension
const STATIC_FILE_REGEX =
  /\.(?:png|jpe?g|webp|gif|svg|ico|txt|xml|json|woff2?|ttf|otf|eot|mp4|webm)$/i;

const isPublic = (p: string) =>
  PUBLIC_PATHS.some((x) => p === x || p.startsWith(x + "/"));

export async function middleware(req: NextRequest) {
  const { pathname, origin } = req.nextUrl;

  // ✅ Skip marketing/public routes
  if (isPublic(pathname)) return NextResponse.next();

  // ✅ Skip any request for a static file in /public
  if (STATIC_FILE_REGEX.test(pathname)) return NextResponse.next();

  const res = NextResponse.next();

  const supa = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => req.cookies.get(name)?.value,
        set(name: string, value: string, options: CookieOptions) {
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          res.cookies.set({ name, value: "", ...options, maxAge: 0 });
        },
      },
    }
  );

  const { data } = await supa.auth.getUser();
  if (!data?.user) return NextResponse.redirect(new URL("/auth", origin));

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
