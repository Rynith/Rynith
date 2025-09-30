// app/reviews/FiltersClient.tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function FiltersClient(props: {
  start: string;
  end: string;
  ratingMin: string;
  ratingMax: string;
  sent?: "neg" | "neu" | "pos";
  topic?: string;
  page: number;
}) {
  const router = useRouter();
  const sp = useSearchParams();

  const [start, setStart] = useState(props.start);
  const [end, setEnd] = useState(props.end);
  const [ratingMin, setRatingMin] = useState(props.ratingMin);
  const [ratingMax, setRatingMax] = useState(props.ratingMax);
  const [sent, setSent] = useState<string>(props.sent ?? "");
  const [topic, setTopic] = useState(props.topic ?? "");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = new URLSearchParams(sp?.toString() ?? "");
    q.set("start", start);
    q.set("end", end);
    q.set("ratingMin", ratingMin);
    q.set("ratingMax", ratingMax);
    if (sent) q.set("sent", sent);
    else q.delete("sent");
    if (topic.trim()) q.set("topic", topic.trim());
    else q.delete("topic");
    q.set("page", "1"); // reset to page 1 on new search
    router.push(`/reviews?${q.toString()}`);
  };

  return (
    <form onSubmit={submit} className="bg-white rounded-lg border shadow p-4 grid grid-cols-2 md:grid-cols-6 gap-3">
      <div className="flex flex-col">
        <label className="text-xs text-[#666]">Start</label>
        <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="border rounded px-2 py-1 text-sm" />
      </div>
      <div className="flex flex-col">
        <label className="text-xs text-[#666]">End</label>
        <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="border rounded px-2 py-1 text-sm" />
      </div>
      <div className="flex flex-col">
        <label className="text-xs text-[#666]">Rating min</label>
        <input type="number" min={1} max={5} value={ratingMin} onChange={(e) => setRatingMin(e.target.value)} className="border rounded px-2 py-1 text-sm" />
      </div>
      <div className="flex flex-col">
        <label className="text-xs text-[#666]">Rating max</label>
        <input type="number" min={1} max={5} value={ratingMax} onChange={(e) => setRatingMax(e.target.value)} className="border rounded px-2 py-1 text-sm" />
      </div>
      <div className="flex flex-col">
        <label className="text-xs text-[#666]">Sentiment</label>
        <select value={sent} onChange={(e) => setSent(e.target.value)} className="border rounded px-2 py-1 text-sm">
          <option value="">Any</option>
          <option value="neg">Negative</option>
          <option value="neu">Neutral</option>
          <option value="pos">Positive</option>
        </select>
      </div>
      <div className="flex flex-col">
        <label className="text-xs text-[#666]">Topic</label>
        <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. shipping" className="border rounded px-2 py-1 text-sm" />
      </div>

      <div className="col-span-2 md:col-span-6 flex justify-end">
        <button type="submit" className="px-3 py-2 text-sm rounded border bg-white hover:bg-gray-50">
          Apply Filters
        </button>
      </div>
    </form>
  );
}
