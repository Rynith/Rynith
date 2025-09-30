"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import ResponsiveNavBar from "@/components/ResponsiveNavbar";

type Props = { children: ReactNode };

// hide the navbar on these routes
const HIDE_ON = ["/auth"]; // add "/onboarding" here if you want it hidden there too

export default function AppShell({ children }: Props) {
  const pathname = usePathname();
  const hideNav = HIDE_ON.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  return (
    <>
      {!hideNav && <ResponsiveNavBar />}
      {/* If navbar is sticky, give content top padding to avoid overlap */}
      <main className={!hideNav ? "pt-14" : ""}>{children}</main>
    </>
  );
}
