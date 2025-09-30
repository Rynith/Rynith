"use client";

import { useEffect, useState } from "react";
import { notify } from "@/lib/notify";

type Role = "owner" | "admin" | "member";
type Member = { user_id: string; email: string | null; role: Role; joined_at: string };
type Invite = { id: string; email: string; role: Role; created_at: string; accepted_at: string | null };

export default function MembersManager() {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [error, setError] = useState<string | null>(null);

  // invite form
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("member");
  const [sending, setSending] = useState(false);

  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      // members
      const mRes = await fetch("/api/org/members", { method: "GET", cache: "no-store" });
      if (!mRes.ok) throw new Error(await mRes.text());
      const mData = await mRes.json();
      setMembers(mData.members || []);

      // invites
      const iRes = await fetch("/api/org/invites", { method: "GET", cache: "no-store" });
      if (!iRes.ok) throw new Error(await iRes.text());
      const iData = await iRes.json();
      setInvites(iData.invites || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load team");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const changeRole = async (user_id: string, newRole: Role) => {
    setBusyId(user_id);
    setError(null);
    try {
      const res = await fetch("/api/org/members", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ user_id, role: newRole }),
      });
      if (!res.ok) throw new Error(await res.text());
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to update role");
    } finally {
      setBusyId(null);
    }
  };

  const removeMember = async (user_id: string) => {
  if (!confirm("Remove this member?")) return;
  setBusyId(user_id);
  try {
    const res = await fetch("/api/org/members", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ user_id }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

    // ✅ show toast here (client-side)
    notify.info("Member removed", "Team");
    await load(); // refresh list
  } catch (e: any) {
    notify.error(e?.message ?? "Failed to remove member", "Team");
  } finally {
    setBusyId(null);
  }
  };

  const sendInvite = async (e: React.FormEvent) => {
  e.preventDefault();
  setSending(true);
  setError(null);
  try {
    const res = await fetch("/api/org/invites", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, role }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

    // ✅ auto-copy the accept URL (dev-friendly when email isn’t configured)
    const link = data?.accept_url as string | undefined;
    if (link) {
      try {
        await navigator.clipboard.writeText(link);
        notify.success("Invite sent! Link copied to clipboard.", "Team");
      } catch {
        notify.success("Invite sent! Click a pending invite to copy the link.", "Team");
      }
    } else {
      notify.success("Invite created.", "Team");
    }

    setEmail("");
    setRole("member");
    await load();
  } catch (e: any) {
    const msg = e?.message || "Failed to send invite";
    setError(msg);
    notify.error(msg, "Team");
  } finally {
    setSending(false);
  }
};

  if (loading) return <div className="text-sm text-gray-600 p-3">Loading team…</div>;
  if (error) return <div className="text-sm text-red-600 p-3">Error: {error}</div>;

  return (
    <div className="space-y-6">
      {/* Invite form */}
      <div className="rounded border bg-white p-4">
        <div className="font-medium mb-3">Invite teammate</div>
        <form onSubmit={sendInvite} className="flex flex-wrap gap-2 items-center">
          <input
            type="email"
            required
            placeholder="name@example.com"
            className="border rounded px-3 py-2 text-sm w-64"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <select
            className="border rounded px-2 py-2 text-sm"
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
            <option value="owner">Owner</option>
          </select>
          <button
            type="submit"
            className="px-3 py-2 border rounded text-sm"
            disabled={sending}
          >
            {sending ? "Sending…" : "Send invite"}
          </button>
        </form>
        {!!invites.length && (
  <div className="mt-4 text-sm text-gray-600">
    <div className="font-medium mb-1">Pending invites</div>
    <div className="divide-y rounded border">
      {invites.map((iv) => (
        <div key={iv.id} className="p-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-gray-900">{iv.email}</div>
            <div className="text-xs text-gray-500">
              Role: {iv.role} • Sent {new Date(iv.created_at).toLocaleString()}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="px-2 py-1 text-xs border rounded"
              onClick={async () => {
                const url = `${window.location.origin}/api/org/invites/accept?invite_id=${iv.id}`;
                try {
                  await navigator.clipboard.writeText(url);
                  notify.info("Invite link copied", "Team");
                } catch {
                  // fall back: open in a new tab if clipboard fails
                  window.open(url, "_blank");
                }
              }}
            >
              Copy link
            </button>
            <span className="text-xs px-2 py-0.5 rounded-full border bg-gray-50">Pending</span>
          </div>
        </div>
      ))}
    </div>
  </div>
)}

      </div>

      {/* Members list */}
      <div className="divide-y rounded border bg-white">
        {members.map((m) => (
          <div key={m.user_id} className="p-3 flex items-center justify-between">
            <div className="text-sm">
              <div className="font-medium">{m.email || m.user_id}</div>
              <div className="text-gray-500">Joined {new Date(m.joined_at).toLocaleString()}</div>
            </div>
            <div className="flex items-center gap-2">
              <select
                className="border rounded px-2 py-1 text-sm"
                disabled={busyId === m.user_id}
                value={m.role}
                onChange={(e) => changeRole(m.user_id, e.target.value as Role)}
              >
                <option value="owner">Owner</option>
                <option value="admin">Admin</option>
                <option value="member">Member</option>
              </select>
              <button
                className="border rounded px-2 py-1 text-sm"
                disabled={busyId === m.user_id}
                onClick={() => removeMember(m.user_id)}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
        {!members.length && <div className="p-3 text-sm text-gray-600">No members yet.</div>}
      </div>
    </div>
  );
}
