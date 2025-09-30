"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";

type Point = {
  day: string;            // YYYY-MM-DD
  review_count: number | null;
  avg_rating: number | null;     // 1..5
  avg_sentiment: number | null;  // -1..1
};

export default function TrendChart({ data }: { data: Point[] }) {
  // recharts prefers numbers, map nulls → undefined
  const rows = (data || []).map((d) => ({
    ...d,
    review_count: d.review_count ?? undefined,
    avg_rating: d.avg_rating ?? undefined,
    avg_sentiment: d.avg_sentiment ?? undefined,
  }));

  return (
    <div className="grid gap-4">
      {/* Sentiment line (-1..1) */}
      <div className="rounded-lg border bg-white p-3 shadow">
        <div className="text-sm text-[#666] mb-2">Avg Sentiment (−1 to 1)</div>
        <div style={{ width: "100%", height: 220 }}>
          <ResponsiveContainer>
            <LineChart data={rows}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis domain={[-1, 1]} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="avg_sentiment"
                dot={false}
                strokeWidth={2}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Reviews per day (bar) + avg rating line */}
      <div className="rounded-lg border bg-white p-3 shadow">
        <div className="text-sm text-[#666] mb-2">Daily Reviews & Avg Rating</div>
        <div style={{ width: "100%", height: 260 }}>
          <ResponsiveContainer>
            <BarChart data={rows}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis yAxisId="count" />
              <YAxis yAxisId="rating" domain={[1, 5]} orientation="right" />
              <Tooltip />
              <Bar yAxisId="count" dataKey="review_count" />
              <Line
                yAxisId="rating"
                type="monotone"
                dataKey="avg_rating"
                dot={false}
                strokeWidth={2}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
