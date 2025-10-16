"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function Pager({ page, hasMore }: { page: number; hasMore: boolean }) {
  const router = useRouter();
  const sp = useSearchParams();

  const go = (nextPage: number) => {
    const params = new URLSearchParams(sp.toString());
    params.set("page", String(nextPage));
    router.push(`/dashboard?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => go(Math.max(1, page - 1))}
        disabled={page <= 1}
        className="px-2 py-1 border rounded disabled:opacity-40 text-sm"
      >
        Prev
      </button>
      <span className="text-sm">Page {page}</span>
      <button
        onClick={() => go(page + 1)}
        disabled={!hasMore}
        className="px-2 py-1 border rounded disabled:opacity-40 text-sm"
      >
        Next
      </button>
    </div>
  );
}
