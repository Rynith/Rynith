"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Users, Mail, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Implement forgot password logic
    console.log("[v0] Forgot password submitted:", email)
    setIsSubmitted(true)
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center space-x-2 mb-6">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#6A0DAD] to-[#7B3AED] flex items-center justify-center">
              <Users className="h-4 w-4 text-white" />
            </div>
            <span className="text-xl font-bold text-[#1A1A1A]">Customer Whisperer</span>
          </Link>
          <h1 className="text-2xl font-bold text-[#1A1A1A] mb-2">
            {isSubmitted ? "Check your email" : "Forgot your password?"}
          </h1>
          <p className="text-[#666666]">
            {isSubmitted
              ? "We've sent a password reset link to your email address"
              : "Enter your email address and we'll send you a link to reset your password"}
          </p>
        </div>

        <Card className="border-0 shadow-lg bg-white">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl text-center text-[#1A1A1A]">
              {isSubmitted ? "Email Sent" : "Reset Password"}
            </CardTitle>
            <CardDescription className="text-center text-[#666666]">
              {isSubmitted
                ? "Please check your inbox and follow the instructions to reset your password"
                : "We'll email you instructions to reset your password"}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {!isSubmitted ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[#1A1A1A]">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-[#666666]" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="pl-10 border-gray-300 focus:border-[#6A0DAD] focus:ring-[#6A0DAD]"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-[#6A0DAD] to-[#7B3AED] hover:from-[#5A0B9D] hover:to-[#6B2ADD] text-white"
                >
                  Send Reset Link
                </Button>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="text-center p-6 bg-[#F3F0FF] rounded-lg">
                  <Mail className="h-12 w-12 text-[#6A0DAD] mx-auto mb-4" />
                  <p className="text-[#666666]">
                    If an account with <strong>{email}</strong> exists, you'll receive a password reset email shortly.
                  </p>
                </div>

                <Button
                  onClick={() => setIsSubmitted(false)}
                  variant="outline"
                  className="w-full border-[#6A0DAD] text-[#6A0DAD] hover:bg-[#F3F0FF]"
                >
                  Send Another Email
                </Button>
              </div>
            )}

            {/* Back to login */}
            <div className="text-center pt-4">
              <Link
                href="/auth"
                className="inline-flex items-center text-[#6A0DAD] hover:text-[#5A0B9D] font-medium transition-colors"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Sign In
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
