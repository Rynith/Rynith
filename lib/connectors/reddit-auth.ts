// lib/connectors/reddit-auth.ts
export async function getAppToken() {
  const id = process.env.REDDIT_CLIENT_ID!;
  const secret = process.env.REDDIT_CLIENT_SECRET!;
  const ua = process.env.REDDIT_USER_AGENT!;

  const creds = Buffer.from(`${id}:${secret}`).toString("base64");
  const res = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${creds}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": ua,
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`reddit token HTTP ${res.status} ${t}`);
  }
  const json = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };
  return json.access_token;
}
