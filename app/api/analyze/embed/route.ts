// app/api/embed/route.ts
export const runtime = "nodejs";
export const maxDuration = 300; // generous for batch jobs

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const EMBED_MODEL = process.env.OPENAI_EMBED_MODEL || "text-embedding-3-small";

function j(status: number, payload: any) {
  return new NextResponse(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

type PendingRow = { id: string; org_id: string; body: string | null };

export async function POST(req: Request) {
  // Internal auth
  const provided = (req.headers.get("x-internal-key") ?? "").trim();
  if (
    !process.env.INTERNAL_SYNC_KEY ||
    provided !== process.env.INTERNAL_SYNC_KEY
  ) {
    return j(401, { error: "Unauthorized" });
  }
  if (!process.env.OPENAI_API_KEY) {
    return j(500, { error: "OPENAI_API_KEY not set" });
  }

  // Lazy import to avoid build errors if key is missing during dev
  const { default: OpenAI } = await import("openai");
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const sb = supabaseAdmin();

  // Prefer RPC for efficient "missing-embedding" selection
  // Create the RPC below (reviews_needing_embeddings)
  const { data: pending, error: pErr } = await sb.rpc(
    "reviews_needing_embeddings",
    {
      p_limit: 200,
    }
  );

  if (pErr) return j(500, { error: pErr.message });
  const rows = (pending ?? []).filter(
    (r: PendingRow) => r.body && r.body.trim().length > 0
  ) as PendingRow[];

  if (!rows.length) return j(200, { ok: true, embedded: 0 });

  // Chunk requests to be nice to the API
  const chunk = <T>(arr: T[], size: number) =>
    Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
      arr.slice(i * size, i * size + size)
    );

  let embedded = 0;
  for (const batch of chunk(rows, 64)) {
    const inputs = batch.map((r) => r.body!.slice(0, 2000)); // trim long texts
    const resp = await openai.embeddings.create({
      model: EMBED_MODEL,
      input: inputs,
    });

    // Order is preserved by the API; align 1:1
    const upsertRows = batch.map((r, i) => ({
      review_id: r.id,
      org_id: r.org_id,
      embedding: resp.data[i].embedding as unknown as number[],
      model: EMBED_MODEL,
    }));

    const { error: upErr } = await sb
      .from("review_embeddings")
      .upsert(upsertRows, {
        onConflict: "review_id",
      });
    if (upErr) return j(500, { error: upErr.message });

    embedded += upsertRows.length;
  }

  return j(200, { ok: true, embedded });
}
