// components/layout/ResponsiveNavbar.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase-browser";

export default function ResponsiveNavbar() {
  const [open, setOpen] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = supabaseBrowser();

  // Auth state
  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (mounted) setIsAuthed(!!session);
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setIsAuthed(!!session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  // Close mobile menu on route/hash change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setIsAuthed(false);
      router.refresh();
    } catch {
      // no-op
    }
  };

  const NavLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
    <Link
      href={href}
      className="hover:text-[var(--primaryFrom)] transition-colors"
      onClick={() => setOpen(false)}
    >
      {children}
    </Link>
  );

  return (
    <header className="sticky top-0 z-50 bg-[var(--bg)]/80 backdrop-blur border-b border-[var(--border)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
            {/* Make sure this file exists exactly at /public/assets/logos/rynith-logo.png (case-sensitive on Vercel) */}
            <Image
              src="/assets/logos/rynith-logo.png"
              alt="Rynith logo"
              width={28}
              height={28}
              priority
            />
            <span className="font-semibold text-lg text-[var(--text)]">Rynith</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8 text-sm text-[var(--muted)]">
            <NavLink href="/#home">Home</NavLink>
            <NavLink href="/#features">Features</NavLink>
            <NavLink href="/#pricing">Pricing</NavLink>
            <NavLink href="/#faq">FAQ</NavLink>
            <NavLink href="/#resources">Resources</NavLink>
          </nav>

          {/* Right actions */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/demo"
              className="inline-flex items-center rounded-xl bg-gradient-to-r from-[var(--primaryFrom)] to-[var(--primaryTo)] text-white px-5 py-2.5 text-sm font-semibold shadow hover:shadow-md"
            >
              Book a demo
            </Link>

            {/* Uncomment when ready to accept logins */}
            {/* {isAuthed ? (
              <>
                <Link
                  href="/dashboard"
                  className="text-sm font-medium text-[var(--text)] hover:text-[var(--primaryFrom)]"
                >
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text)] hover:bg-[var(--surfaceAccent)]"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link
                href="/auth"
                className="inline-flex items-center rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text)] hover:bg-[var(--surfaceAccent)]"
              >
                Login / Signup
              </Link>
            )} */}
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setOpen(v => !v)}
            className="md:hidden p-2"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label="Toggle menu"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {open && (
        <div
          id="mobile-nav"
          className="md:hidden border-t border-[var(--border)] bg-white px-6 py-4 space-y-4"
        >
          <NavLink href="/#home">Home</NavLink>
          <NavLink href="/#features">Features</NavLink>
          <NavLink href="/#pricing">Pricing</NavLink>
          <NavLink href="/#faq">FAQ</NavLink>
          <NavLink href="/#resources">Resources</NavLink>

          <Link
            href="/demo"
            onClick={() => setOpen(false)}
            className="inline-flex w-full justify-center items-center rounded-xl bg-gradient-to-r from-[var(--primaryFrom)] to-[var(--primaryTo)] text-white px-5 py-3 text-sm font-semibold shadow hover:shadow-md"
          >
            Book a demo
          </Link>

          {/* Auth (mobile) — enable when ready */}
          {/* {isAuthed ? (
            <>
              <Link href="/dashboard" className="block" onClick={() => setOpen(false)}>
                Dashboard
              </Link>
              <button onClick={handleLogout} className="block text-left text-[var(--muted)]">
                Sign out
              </button>
            </>
          ) : (
            <Link
              href="/auth"
              onClick={() => setOpen(false)}
              className="inline-block mt-2 w-full text-center border border-[var(--border)] text-[var(--text)] px-4 py-2 rounded-xl font-semibold hover:bg-[var(--surfaceAccent)]"
            >
              Login / Signup
            </Link>
          )} */}
        </div>
      )}
    </header>
  );
}
