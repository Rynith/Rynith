"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function SourceFilter({ value }: { value: string }) {
  const router = useRouter();
  const sp = useSearchParams();

  const update = (v: string) => {
    const params = new URLSearchParams(sp.toString());
    if (v === "all") params.delete("source");
    else params.set("source", v);
    params.delete("page"); // reset pagination
    router.push(`/dashboard?${params.toString()}`);
  };

  return (
    <select
      value={value}
      onChange={(e) => update(e.target.value)}
      className="rounded-md border border-gray-200 bg-white p-1.5 text-sm"
    >
      <option value="all">All sources</option>
      <option value="yelp">Yelp</option>
      <option value="reddit">Reddit</option>
      <option value="csv">CSV Upload</option>
      <option value="google_gbp">Google Business</option>
      <option value="google_places">Google Places</option>
    </select>
  );
}
