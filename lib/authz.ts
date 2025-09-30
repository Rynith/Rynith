export function assertInternal(req: Request) {
  const key = req.headers.get("x-internal-key");
  if (!key || key !== process.env.INTERNAL_SYNC_KEY) {
    return new Response("Unauthorized", { status: 401 });
  }
}
