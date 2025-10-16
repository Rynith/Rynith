export const runtime = "nodejs";
export async function GET() {
  return new Response(JSON.stringify({ ok: true, pong: true }), {
    headers: { "content-type": "application/json" },
  });
}
