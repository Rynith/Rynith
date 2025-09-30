export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function GET() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: mem } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id)
    .single();
  if (!mem?.org_id)
    return NextResponse.json({ error: "No org" }, { status: 400 });

  const { data: rows, error } = await supabase
    .from("reviews")
    .select(
      "id, author, rating, body, published_at, review_analysis!left(sentiment,topics)"
    )
    .eq("org_id", mem.org_id)
    .order("published_at", { ascending: false })
    .limit(2000);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  const header = [
    "id",
    "author",
    "rating",
    "sentiment",
    "topics",
    "published_at",
    "body",
  ];
  const lines = [header.join(",")];

  (rows ?? []).forEach((r: any) => {
    const a = Array.isArray(r.review_analysis)
      ? r.review_analysis[0]
      : r.review_analysis;
    const sentiment = a?.sentiment ?? "";
    const topics = (a?.topics ?? []).join("|");
    const csv = [
      r.id,
      (r.author ?? "").replaceAll('"', '""'),
      r.rating ?? "",
      sentiment,
      topics.replaceAll('"', '""'),
      r.published_at ?? "",
      (r.body ?? "").replaceAll('"', '""'),
    ]
      .map((v) => `"${String(v)}"`)
      .join(",");
    lines.push(csv);
  });

  const csvBody = lines.join("\n");
  return new NextResponse(csvBody, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="reviews.csv"`,
    },
  });
}
