// lib/ai.ts
import OpenAI from "openai";

let _openai: OpenAI | null = null;
function openaiClient() {
  if (_openai) return _openai;
  const key = process.env.OPENAI_API_KEY || process.env.OPENAI_DEV_KEY; // fallback
  if (!key) throw new Error("OPENAI_API_KEY is not set");
  _openai = new OpenAI({ apiKey: key });
  return _openai;
}


const CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";

export async function summarizeClusters(input: {
  orgName?: string | null;
  days: number;
  totals: {
    reviews: number;
    avgRating: number | null;
    avgSentiment: number | null;
  };
  clusters: Array<{
    label: string | null;
    terms: string[];
    size: number;
    avg_sentiment: number | null;
  }>;
}) {
  const o = openaiClient();

  const sys = `You are an expert retail CX analyst. 
Produce a tight, practical brief: 
1) 3 concise action recommendations (imperative, measurable),
2) 3 positive highlights (what to double down on),
3) 3 pain points (what to fix).
Use the merchant's vocabulary if present. Avoid fluff.`;

  const user = {
    role: "user" as const,
    content:
      `Org: ${input.orgName || "—"}\n` +
      `Window: last ${input.days} days\n` +
      `Totals: reviews=${input.totals.reviews}, avgRating=${
        input.totals.avgRating ?? "—"
      }, avgSent=${input.totals.avgSentiment ?? "—"}\n` +
      `Clusters (label | size | avgSent | terms):\n` +
      input.clusters
        .map(
          (c, i) =>
            `- ${i + 1}. ${c.label || "unlabeled"} | size=${c.size} | sent=${
              c.avg_sentiment ?? "—"
            } | terms=${(c.terms || []).slice(0, 8).join(", ")}`
        )
        .join("\n") +
      `\n\nReturn strict JSON with keys: summary (string), actions (string[]), positives (string[]), negatives (string[]). Max 60 words per field.`,
  };

  const res = await o.chat.completions.create({
    model: CHAT_MODEL,
    messages: [{ role: "system", content: sys }, user],
    temperature: 0.2,
    response_format: { type: "json_object" },
  });

  const raw = res.choices[0]?.message?.content || "{}";
  try {
    const parsed = JSON.parse(raw);
    return {
      summary: String(parsed.summary || ""),
      actions: Array.isArray(parsed.actions) ? parsed.actions.map(String) : [],
      positives: Array.isArray(parsed.positives)
        ? parsed.positives.map(String)
        : [],
      negatives: Array.isArray(parsed.negatives)
        ? parsed.negatives.map(String)
        : [],
      model: CHAT_MODEL,
    };
  } catch {
    return {
      summary: "",
      actions: [],
      positives: [],
      negatives: [],
      model: CHAT_MODEL,
    };
  }
}
