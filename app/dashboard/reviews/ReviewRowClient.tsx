// app/reviews/ReviewRowClient.tsx
"use client";

import { useState } from "react";

type Row = {
  id: string;
  author: string | null;
  rating: number | null;
  body: string | null;
  published_at: string | null;
  sentiment: number | null;
  topics: string[] | null;
  summary: string | null;
};

export default function ReviewRowClient({ row }: { row: Row }) {
  const [open, setOpen] = useState(false);
  const [quickTags, setQuickTags] = useState<string[]>([]); // local-only, non-persisted

  const toggleTag = (t: string) => {
    setQuickTags((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-[#666]">
          {row.author || "Anonymous"} •{" "}
          {row.published_at ? new Date(row.published_at).toLocaleString() : "—"}
        </div>
        <div className="flex items-center gap-2 text-sm text-[#666]">
          {row.rating != null ? <span>★ {row.rating}</span> : null}
          {row.sentiment != null ? (
            <span
              className={`px-2 py-0.5 rounded-full border text-xs ${
                row.sentiment < -0.05
                  ? "bg-red-50 text-red-700 border-red-200"
                  : row.sentiment > 0.05
                  ? "bg-green-50 text-green-700 border-green-200"
                  : "bg-gray-50 text-gray-700 border-gray-200"
              }`}
              title={`Sentiment: ${row.sentiment}`}
            >
              {row.sentiment < -0.05 ? "neg" : row.sentiment > 0.05 ? "pos" : "neu"}
            </span>
          ) : null}
        </div>
      </div>

      <p className="mt-1 text-[#1A1A1A]">
        {(row.summary || row.body || "").slice(0, 220)}
        {(row.body && row.body.length > 220) ? "…" : ""}
      </p>

      {row.topics?.length ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {row.topics.map((t) => (
            <span
              key={t}
              className="text-xs px-2 py-1 rounded-full bg-gray-50 text-gray-700 border"
            >
              {t}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-2">
        <button
          onClick={() => setOpen((v) => !v)}
          className="text-xs text-violet-700 hover:underline"
        >
          {open ? "Hide details" : "View details"}
        </button>
      </div>

      {open && (
        <div className="mt-3 rounded border bg-gray-50 p-3">
          <div className="text-xs text-[#666] mb-2">Full text</div>
          <div className="text-sm whitespace-pre-wrap">{row.body || "—"}</div>

          {/* quick local tags (demo only) */}
          <div className="mt-3">
            <div className="text-xs text-[#666] mb-1">Quick tags (local)</div>
            <div className="flex flex-wrap gap-2">
              {["shipping", "service", "pricing", "quality", "wait_time"].map((t) => {
                const active = quickTags.includes(t);
                return (
                  <button
                    key={t}
                    onClick={() => toggleTag(t)}
                    className={`text-xs px-2 py-1 rounded-full border ${
                      active
                        ? "bg-violet-600 text-white border-violet-600"
                        : "bg-white text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
