import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import "./globals.css"
import type { ReactNode } from "react";
import AppShell from "@/components/AppShell";
import { Toaster } from "@/components/ui/toaster"; // ✅ shadcn toaster

export const metadata: Metadata = {
  title: "Customer Whisperer - Turn Reviews into Growth Actions",
  description:
    "AI-powered customer feedback analysis for small businesses. Get weekly insights and action steps from your Google Reviews.",
  generator: "v0.app",
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        {/* <Suspense fallback={null}>{children}</Suspense> */}
            <AppShell>{children}</AppShell>
        <Analytics />
         <Toaster /> 
      </body>
    </html>
  )
}
