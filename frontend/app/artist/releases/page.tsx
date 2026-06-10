"use client";

import { useEffect, useState } from "react";
import { CreatorHubShell } from "@/components/creator-hub/CreatorHubShell";

type SongRow = {
  id: string;
  title: string;
  vibe: string;
  genre: string;
  memberReleaseAt: string | null;
  publicReleaseAt: string | null;
};

function toInputVal(iso: string | null) {
  if (!iso) return "";
  return iso.slice(0, 16); // "YYYY-MM-DDTHH:mm"
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const VIBE_COLOR: Record<string, string> = {
  CHILL: "text-cyan-300", HYPE: "text-fuchsia-300",
  LATE_NIGHT: "text-violet-300", EMOTIONAL: "text-amber-300", UNSURE: "text-slate-400",
};

export default function ReleasesPage() {
  const [songs, setSongs] = useState<SongRow[] | null>(null);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [edits, setEdits] = useState<Record<string, { member: string; public: string }>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/artist/profile")
      .then((r) => r.ok ? r.json() : Promise.reject(r.status))
      .then((d: { artist: { id: string } }) => {
        return fetch(`/api/songs?artistId=${d.artist.id}`).then((r) => r.ok ? r.json() : Promise.reject());
      })
      .then((data: { songs?: SongRow[] } | SongRow[]) => {
        const rows = Array.isArray(data) ? data : (data.songs ?? []);
        setSongs(rows);
        const init: Record<string, { member: string; public: string }> = {};
        for (const s of rows) init[s.id] = { member: toInputVal(s.memberReleaseAt), public: toInputVal(s.publicReleaseAt) };
        setEdits(init);
      })
      .catch(() => setError("Could not load your songs. Make sure your account is linked to an artist."));
  }, []);

  async function save(songId: string) {
    setSaving((p) => ({ ...p, [songId]: true }));
    const vals = edits[songId];
    try {
      const res = await fetch("/api/artist/songs/schedule", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          songId,
          memberReleaseAt: vals?.member || null,
          publicReleaseAt: vals?.public || null,
        }),
      });
      if (!res.ok) throw new Error();
      setSaved((p) => ({ ...p, [songId]: true }));
      setTimeout(() => setSaved((p) => ({ ...p, [songId]: false })), 2500);
      setSongs((prev) => prev?.map((s) => s.id === songId
        ? { ...s, memberReleaseAt: vals?.member || null, publicReleaseAt: vals?.public || null }
        : s) ?? null);
    } catch {
      setError("Save failed.");
    } finally {
      setSaving((p) => ({ ...p, [songId]: false }));
    }
  }

  return (
    <CreatorHubShell eyebrow="Creator Hub" title="Release Schedule">
      <p className="mb-8 text-sm text-slate-400 max-w-xl">
        Set when members get early access and when the public can hear each track. Leave blank to keep it live in current rotation.
      </p>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      {!songs && !error && (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#8B5CF6] border-t-transparent" />
        </div>
      )}

      {songs && songs.length === 0 && (
        <p className="text-sm text-slate-500">No songs found linked to your account.</p>
      )}

      {songs && songs.length > 0 && (
        <div className="divide-y divide-white/[0.05] rounded-[1.8rem] border border-white/8 bg-[#0B1020]/80 overflow-hidden">
          {songs.map((song) => {
            const edit = edits[song.id] ?? { member: "", public: "" };
            const vibeKey = song.vibe?.toUpperCase().replace(" ", "_");
            return (
              <div key={song.id} className="p-5 sm:grid sm:grid-cols-[1fr_auto] sm:items-center sm:gap-6">
                <div className="mb-4 sm:mb-0">
                  <p className="font-semibold text-white">{song.title}</p>
                  <p className={`text-xs mt-0.5 ${VIBE_COLOR[vibeKey] ?? "text-slate-400"}`}>
                    {song.vibe?.replace("_", " ").toLowerCase()} · {song.genre}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-500">
                    <span>Members: {formatDate(song.memberReleaseAt)}</span>
                    <span>Public: {formatDate(song.publicReleaseAt)}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Members Early</span>
                    <input
                      type="datetime-local"
                      value={edit.member}
                      onChange={(e) => setEdits((p) => ({ ...p, [song.id]: { ...edit, member: e.target.value } }))}
                      className="rounded-[0.8rem] border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white focus:border-[#7c4dff]/40 focus:outline-none transition"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Public Release</span>
                    <input
                      type="datetime-local"
                      value={edit.public}
                      onChange={(e) => setEdits((p) => ({ ...p, [song.id]: { ...edit, public: e.target.value } }))}
                      className="rounded-[0.8rem] border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white focus:border-[#7c4dff]/40 focus:outline-none transition"
                    />
                  </label>
                  <button
                    onClick={() => { void save(song.id); }}
                    disabled={saving[song.id]}
                    className="inline-flex min-h-10 items-center justify-center rounded-full border border-[#7c4dff]/30 bg-[#7c4dff]/10 px-4 text-xs font-semibold text-violet-200 transition hover:bg-[#7c4dff]/20 disabled:opacity-50 self-end"
                  >
                    {saving[song.id] ? "…" : saved[song.id] ? "✓ Saved" : "Save"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </CreatorHubShell>
  );
}
