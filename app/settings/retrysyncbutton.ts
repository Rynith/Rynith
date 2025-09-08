"use client";

import { useState } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast"; // you have this in your repo

type Props = {
  sourceId: string;
  label?: string;
} & ButtonProps;

export default function RetrySyncButton({
  sourceId,
  label = "Retry sync",
  className,
  ...btnProps
}: Props) {
  const [busy, setBusy] = useState(false);
  const { toast } = useToast?.() ?? { toast: (x: any) => console.log(x) };
  const router = useRouter();

  async function run() {
    try {
      setBusy(true);
      const res = await fetch("/api/sources/sync-one", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || `HTTP ${res.status}`);
      }
      toast({ title: "Sync started", description: "We’ll refresh once it completes." });
      router.refresh();
    } catch (e: any) {
      toast({ title: "Sync failed", description: e?.message ?? "Try again later.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button onClick={run} disabled={busy} className={className} {...btnProps}>
      {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {busy ? "Syncing..." : label}
    </Button>
  );
}