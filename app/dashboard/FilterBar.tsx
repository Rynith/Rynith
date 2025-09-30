"use client";

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

type Props = { topics: string[] };

const ALL = "__all__";
const ANY = "__any__";

export default function FilterBar({ topics }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentTopic = searchParams.get("topic") ?? ALL;
  const currentMinRating = searchParams.get("minRating") ?? ANY;

  const updateParam = (key: string, value: string) => {
    const sp = new URLSearchParams(searchParams?.toString() || "");
    if (value === ALL || value === ANY) {
      sp.delete(key);
    } else {
      sp.set(key, value);
    }
    router.replace(`${pathname}?${sp.toString()}`);
  };

  return (
    <div className="flex flex-wrap gap-3 items-center">
      {/* Topic filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-[#666]">Topic</span>
        <Select
          value={currentTopic || ALL}
          onValueChange={(v) => updateParam("topic", v)}
        >
          <SelectTrigger className="w-56">
            <SelectValue placeholder="All topics" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All topics</SelectItem>
            {topics.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Min rating filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-[#666]">Min rating</span>
        <Select
          value={currentMinRating || ANY}
          onValueChange={(v) => updateParam("minRating", v)}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Any" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any</SelectItem>
            <SelectItem value="1">★ 1+</SelectItem>
            <SelectItem value="2">★ 2+</SelectItem>
            <SelectItem value="3">★ 3+</SelectItem>
            <SelectItem value="4">★ 4+</SelectItem>
            <SelectItem value="5">★ 5</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
