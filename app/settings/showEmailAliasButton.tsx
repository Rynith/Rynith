"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type Variant = "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
type Size = "default" | "sm" | "lg" | "icon";

type Props = {
  currentAlias: string | null;
  buttonVariant?: Variant;
  buttonSize?: Size;
  className?: string;
};

export default function ShowEmailAliasButton({
  currentAlias,
  buttonVariant = "outline",
  buttonSize = "sm",
  className,
}: Props) {
  const [busy, setBusy] = React.useState(false);
  const { toast } = useToast();

  const handleClick = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/sources/connect-email", { method: "POST", cache: "no-store" });
      const data = await res.json().catch(() => null);
      const alias = (data && data.alias) || currentAlias;

      if (alias) {
        toast({ title: "Email alias", description: alias });
      } else {
        toast({
          title: "Alias unavailable",
          description: "Please try connecting email ingestion again.",
          variant: "destructive",
        });
      }
    } catch (e: any) {
      toast({
        title: "Failed to fetch alias",
        description: e?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button onClick={handleClick} disabled={busy} variant={buttonVariant} size={buttonSize} className={className}>
      {busy ? "Working…" : currentAlias ? "Show email alias" : "Connect email ingestion"}
    </Button>
  );
}









// "use client";

// import { useState } from "react";
// import { Button } from "@/components/ui/button";

// type Props = {
//   /** Existing alias from DB (if any). If null, clicking will call /api/sources/connect-email */
//   currentAlias?: string | null;
//   /** Optional: extra classes for the wrapper */
//   className?: string;
//   /** Any Button props (variant, size, etc.) */
//   buttonProps?: React.ComponentProps<typeof Button>;
// };

// export default function ShowEmailAliasButton({
//   currentAlias = null,
//   className,
//   buttonProps,
// }: Props) {
//   const [alias, setAlias] = useState<string | null>(currentAlias);
//   const [open, setOpen] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [err, setErr] = useState<string | null>(null);

//   const handleClick = async () => {
//     setErr(null);

//     // If we already have an alias, just show it
//     if (alias) {
//       setOpen((v) => !v);
//       return;
//     }

//     // Otherwise, (re)create/fetch alias via your API
//     setLoading(true);
//     try {
//       const res = await fetch("/api/sources/connect-email", { method: "POST" });
//       const json = await res.json().catch(() => ({} as any));

//       if (!res.ok) {
//         throw new Error(json?.error || `HTTP ${res.status}`);
//       }

//       setAlias(json.alias || null);
//       setOpen(true);
//     } catch (e: any) {
//       setErr(e?.message || "Failed to fetch alias");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const copy = async () => {
//     if (!alias) return;
//     try {
//       await navigator.clipboard.writeText(alias);
//     } catch {
//       // no-op
//     }
//   };

//   return (
    
//     <div className={className}>
//       <Button
//         onClick={handleClick}
//         {...buttonProps}
//         disabled={loading || buttonProps?.disabled}
//       >
//         {loading ? "Loading…" : alias ? "Show alias" : "Reconnect email"}
//       </Button>

//       {open && (
//         <div className="mt-2 w-full rounded-lg border bg-white p-3 text-sm">
//           {err ? (
//             <div className="text-red-600">{err}</div>
//           ) : (
//             <>
//               <div className="text-[#1A1A1A]">
//                 Forward reviews to:{" "}
//                 <strong>{alias || "—"}</strong>
//               </div>
//               <div className="text-[#666] mt-1">
//                 Add a mail rule in Gmail/Outlook to forward new review notifications to this address.
//               </div>
//               <div className="flex gap-2 mt-2">
//                 <Button onClick={copy} variant="outline" size="sm">
//                   Copy
//                 </Button>
//                 <Button onClick={() => setOpen(false)} variant="ghost" size="sm">
//                   Close
//                 </Button>
//               </div>
//             </>
//           )}
//         </div>
//       )}
//     </div>
   
//   );
// }
