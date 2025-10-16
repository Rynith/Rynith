// lib/oauth.ts
import crypto from "crypto";

export function base64url(buf: Buffer) {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function randomState(): string {
  return base64url(crypto.randomBytes(16));
}

export function encodeBasic(id: string, secret: string) {
  return Buffer.from(`${id}:${secret}`).toString("base64");
}
