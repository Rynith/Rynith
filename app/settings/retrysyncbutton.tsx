"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

type Variant = "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
type Size = "default" | "sm" | "lg" | "icon";

type Props = {
  sourceId: string;
  label?: string;
  className?: string;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
};

export default function RetrySyncButton({
  sourceId,
  label = "Retry sync",
  className,
  variant = "outline",
  size = "sm",
  disabled,
}: Props) {
  const [busy, setBusy] = React.useState(false);

  const run = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await fetch(`/api/sources/sync?source_id=${encodeURIComponent(sourceId)}`, {
        method: "POST",
        cache: "no-store",
      });
    } catch {
      /* optional: toast error */
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button onClick={run} disabled={busy || disabled} className={className} variant={variant} size={size}>
      {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {busy ? "Syncing…" : label}
    </Button>
  );
}
