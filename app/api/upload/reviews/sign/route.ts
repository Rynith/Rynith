import crypto from "node:crypto";
import { NextRequest } from "next/server";
import { supabaseService } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { org_id, filename } = await req.json();
  if (!org_id || !filename) return new Response("Bad request", { status: 400 });
  const supa = supabaseService();
  const path = `${org_id}/${Date.now()}-${filename}`;
  const { data, error } = await (supa as any).storage
    .from("reviews_csv")
    .createSignedUploadUrl(path);
  if (error) return new Response(error.message, { status: 500 });
  return Response.json({ path, signedUrl: data.signedUrl, token: data.token });
}
