"use client";

import { useState } from "react";

export default function RefreshButton() {
  const [loading, setLoading] = useState(false);
  return (
    <button
      onClick={async () => {
        setLoading(true);
        await new Promise((r) => setTimeout(r, 1200));
        location.reload();
      }}
      disabled={loading}
      className="px-3 py-1.5 border rounded text-sm"
    >
      {loading ? "Refreshing..." : "Refresh Feedback"}
    </button>
  );
}
