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
  "/demo",
  "/api/contact",
  "/assets", // your public folders
  "/favicon.ico",
  "/_next",
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

  // NEW: Skip static files (anything with an extension), Next.js assets, images, etc.
  if (
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname.includes(".") || // <-- /data/*.json, images, css, etc.
    isPublic(pathname)
  ) {
    return NextResponse.next();
  }

  const res = NextResponse.next();

  const supa = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => req.cookies.get(name)?.value,
        set: (name: string, value: string, options: CookieOptions) => {
          res.cookies.set({ name, value, ...options });
        },
        remove: (name: string, options: CookieOptions) => {
          res.cookies.set({ name, value: "", ...options, maxAge: 0 });
        },
      },
    }
  );

  const { data } = await supa.auth.getUser();
  if (!data?.user) {
    return NextResponse.redirect(new URL("/auth", origin));
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
