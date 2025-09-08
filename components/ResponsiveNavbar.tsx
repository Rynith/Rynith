// components/layout/ResponsiveNavbar.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase-browser";

export default function ResponsiveNavbar() {
  const [open, setOpen] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const router = useRouter();
  const supabase = supabaseBrowser(); // ✅ correct helper

  useEffect(() => {
    let mounted = true;

    // initial session check
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (mounted) setIsAuthed(!!session);
    };
    init();

    // keep in sync with auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;
        setIsAuthed(!!session);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsAuthed(false);
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-50 bg-[var(--bg)]/80 backdrop-blur border-b border-[var(--border)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <img src="/logo.svg" alt="Logo" className="h-7 w-auto" />
            <span className="font-semibold text-lg">Customer Whisperer</span>
          </Link>

          {/* Desktop Menu */}
          <nav className="hidden md:flex items-center gap-8 text-sm text-[var(--muted)]">
            <Link href="#home" className="hover:text-[var(--primaryFrom)]">Home</Link>
            <Link href="#features" className="hover:text-[var(--primaryFrom)]">Features</Link>
            <Link href="#pricing" className="hover:text-[var(--primaryFrom)]">Pricing</Link>
            <Link href="#faq" className="hover:text-[var(--primaryFrom)]">FAQ</Link>
            <Link href="#resources" className="hover:text-[var(--primaryFrom)]">Resources</Link>
          </nav>

          {/* Auth Buttons */}
          <div className="flex items-center gap-3">
            {isAuthed ? (
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
                href="/auth" /* was /login; unify to /auth */
                className="inline-flex items-center rounded-xl bg-gradient-to-r from-[var(--primaryFrom)] to-[var(--primaryTo)] text-white px-4 py-2 text-sm font-semibold shadow hover:shadow-lg"
              >
                Login / Signup
              </Link>
            )}
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setOpen((v) => !v)}
            className="md:hidden p-2"
            aria-expanded={open}
            aria-label="Toggle menu"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {open && (
        <div className="md:hidden border-t border-[var(--border)] bg-white px-6 py-4 space-y-4">
          <Link href="#home" className="block">Home</Link>
          <Link href="#features" className="block">Features</Link>
          <Link href="#pricing" className="block">Pricing</Link>
          <Link href="#faq" className="block">FAQ</Link>
          <Link href="#resources" className="block">Resources</Link>

          {isAuthed ? (
            <>
              <Link href="/dashboard" className="block">Dashboard</Link>
              <button onClick={handleLogout} className="block text-left text-[var(--muted)]">Sign out</button>
            </>
          ) : (
            <Link
              href="/auth"
              className="inline-block mt-2 w-full text-center bg-gradient-to-r from-[var(--primaryFrom)] to-[var(--primaryTo)] text-white px-4 py-2 rounded-xl font-semibold"
            >
              Login / Signup
            </Link>
          )}
        </div>
      )}
    </header>
  );
}