"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Users, Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";

import { supabaseBrowser } from "@/lib/supabase-browser";

/** Ensure org + membership exists for the current user */
async function ensureOrgMembership() {
  const res = await fetch("/api/org/config", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ensure: true }),
    cache: "no-store",
    credentials: "include",
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j?.error || `Onboarding failed (${res.status})`);
}

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const router = useRouter();
  const supabase = supabaseBrowser();

  const fireConfetti = () => {
    confetti({ particleCount: 150, spread: 70, origin: { y: 0.7 }, scalar: 0.9 });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    setInfoMsg(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        // ✅ Ensure org + membership, then go to dashboard
        await ensureOrgMembership();
        fireConfetti();
        setTimeout(() => router.replace("/dashboard"), 300);
      } else {
        if (password !== confirmPassword) throw new Error("Passwords do not match.");

        const { error, data } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        });
        if (error) throw error;

        if (!data.session) {
          // Email confirmation flow (no session yet)
          setInfoMsg("Check your inbox to confirm your email before signing in.");
        } else {
          // Auto-signed-in projects → onboard now
          await ensureOrgMembership();
          fireConfetti();
          setTimeout(() => router.replace("/dashboard"), 300);
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo:
            typeof window !== "undefined"
              ? `${window.location.origin}/auth/callback`
              : undefined,
        },
      });
      if (error) throw error;
      // After OAuth returns to /auth/callback, run ensure there or rely on middleware + onboarding page.
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Google sign-in failed.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-[#f4f1ff] to-[#f7f5ff] flex items-center justify-center relative overflow-hidden px-4">
      <div className="z-20 w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="text-center mb-8"
        >
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[#6A0DAD] to-[#7B3AED] flex items-center justify-center">
              <Users className="h-4 w-4 text-white" />
            </div>
            <span className="text-xl font-bold text-[#1A1A1A]">Rynith</span>
          </Link>
          <h1 className="text-3xl font-bold text-[#1A1A1A] mb-2">
            <AnimatePresence mode="wait">
              <motion.span
                key={isLogin ? "welcome-back" : "create-account"}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
              >
                {isLogin ? "Welcome Back 🚀" : "Create Your Account"}
              </motion.span>
            </AnimatePresence>
          </h1>
          <p className="text-[#666]">
            {isLogin ? "Sign in to continue analyzing feedback." : "Start using AI-powered insights today."}
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: "easeOut", delay: 0.05 }}>
          <Card className="bg-white/90 shadow-xl border border-gray-200 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-center text-xl">
                {isLogin ? "Sign In" : "Sign Up"}
              </CardTitle>
              <CardDescription className="text-center">
                {isLogin ? "Login to access your dashboard" : "Create a new account"}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <Button
                type="button"
                variant="outline"
                className="w-full border-gray-300 hover:bg-gray-100"
                onClick={handleGoogleLogin}
                disabled={submitting}
              >
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M21.8 10.1H12v3.8h5.6c-.3 1.6-1.5 2.9-3.2 3.4v2.8h5.1c3-2.8 4.1-7.3 2.3-10.9z" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">or</span>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <AnimatePresence mode="wait">
                  {!isLogin && (
                    <motion.div
                      key="name-field"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required={!isLogin}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-gray-500"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {!isLogin && (
                  <div>
                    <Label htmlFor="confirm">Confirm Password</Label>
                    <Input
                      id="confirm"
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required={!isLogin}
                    />
                  </div>
                )}

                {isLogin && (
                  <div className="text-right">
                    <Link href="/auth/forgot-password" className="text-sm text-purple-600 hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                )}

                {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}
                {infoMsg && <p className="text-sm text-emerald-600">{infoMsg}</p>}

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-[#6A0DAD] to-[#7B3AED] text-white"
                  disabled={submitting}
                >
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isLogin ? "Sign In" : "Sign Up"}
                </Button>
              </form>

              <div className="text-center text-sm">
                {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
                <button
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-purple-600 font-medium hover:underline"
                  disabled={submitting}
                >
                  {isLogin ? "Sign up" : "Sign in"}
                </button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut", delay: 0.1 }}
          className="text-center mt-8 text-sm text-gray-500"
        >
          By continuing, you agree to our{" "}
          <Link href="/terms" className="text-purple-600 hover:underline">Terms</Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-purple-600 hover:underline">Privacy Policy</Link>
        </motion.div>
      </div>
    </div>
  );
}
