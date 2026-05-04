"use client";

import { useState } from "react";
import type { Song } from "@/lib/types";

type AdminReleaseSong = Pick<
  Song,
  | "id"
  | "title"
  | "artist"
  | "access_tier"
  | "member_release_at"
  | "public_release_at"
  | "is_featured"
  | "is_vault"
  | "behind_the_mix_text"
>;

type AdminReleaseEditorProps = {
  songs: AdminReleaseSong[];
};

const ACCESS_TIER_OPTIONS = [
  { value: "", label: "Public / Listener default" },
  { value: "listener", label: "Listener" },
  { value: "insider", label: "Insider" },
  { value: "vault", label: "Vault" },
];

function toDateTimeLocalValue(value?: string | null): string {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  const offsetMs = parsed.getTimezoneOffset() * 60_000;
  return new Date(parsed.getTime() - offsetMs).toISOString().slice(0, 16);
}

function toIsoStringOrEmpty(value: string): string {
  return value ? new Date(value).toISOString() : "";
}

export function AdminReleaseEditor({ songs }: AdminReleaseEditorProps) {
  const [password, setPassword] = useState("");
  const [selectedSongId, setSelectedSongId] = useState(songs[0]?.id ?? "");
  const [accessTier, setAccessTier] = useState(songs[0]?.access_tier ?? "");
  const [memberReleaseAt, setMemberReleaseAt] = useState(
    toDateTimeLocalValue(songs[0]?.member_release_at),
  );
  const [publicReleaseAt, setPublicReleaseAt] = useState(
    toDateTimeLocalValue(songs[0]?.public_release_at),
  );
  const [isFeatured, setIsFeatured] = useState(Boolean(songs[0]?.is_featured));
  const [isVault, setIsVault] = useState(Boolean(songs[0]?.is_vault));
  const [behindTheMixText, setBehindTheMixText] = useState(
    songs[0]?.behind_the_mix_text ?? "",
  );
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function loadSong(songId: string) {
    setSelectedSongId(songId);
    setStatus(null);
    setError(null);

    const song = songs.find((entry) => entry.id === songId);
    if (!song) {
      return;
    }

    setAccessTier(song.access_tier ?? "");
    setMemberReleaseAt(toDateTimeLocalValue(song.member_release_at));
    setPublicReleaseAt(toDateTimeLocalValue(song.public_release_at));
    setIsFeatured(Boolean(song.is_featured));
    setIsVault(Boolean(song.is_vault));
    setBehindTheMixText(song.behind_the_mix_text ?? "");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!password) {
      setError("Enter the admin password first.");
      return;
    }

    if (!selectedSongId) {
      setError("Choose a song first.");
      return;
    }

    setIsSaving(true);
    setStatus(null);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("password", password);
      formData.append("songId", selectedSongId);
      formData.append("accessTier", accessTier);
      formData.append("memberReleaseAt", toIsoStringOrEmpty(memberReleaseAt));
      formData.append("publicReleaseAt", toIsoStringOrEmpty(publicReleaseAt));
      formData.append("isFeatured", String(isFeatured));
      formData.append("isVault", String(isVault));
      formData.append("behindTheMixText", behindTheMixText);

      const response = await fetch("/api/admin/releases", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        throw new Error(data?.error || "Failed to save release settings.");
      }

      const activeSong = songs.find((song) => song.id === selectedSongId);
      setStatus(`Saved founder metadata for ${activeSong?.title ?? "selected song"}.`);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to save release settings.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="glass-card rounded-[1.8rem] p-5">
        <label className="block text-sm font-medium text-slate-200">
          Admin password
        </label>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-3 w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white outline-none"
          placeholder="Enter ADMIN_UPLOAD_PASSWORD"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="glass-card rounded-[1.8rem] p-5">
          <label className="block text-sm font-medium text-slate-200">
            Choose song
          </label>
          <select
            value={selectedSongId}
            onChange={(event) => loadSong(event.target.value)}
            className="mt-3 w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white outline-none"
          >
            {songs.map((song) => (
              <option key={song.id} value={song.id} className="bg-slate-950">
                {song.title} · {song.artist}
              </option>
            ))}
          </select>
        </div>

        <div className="glass-card rounded-[1.8rem] p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-200">
              Access tier
            </label>
            <select
              value={accessTier}
              onChange={(event) => setAccessTier(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white outline-none"
            >
              {ACCESS_TIER_OPTIONS.map((option) => (
                <option key={option.value || "default"} value={option.value} className="bg-slate-950">
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200">
              Members Early
            </label>
            <input
              type="datetime-local"
              value={memberReleaseAt}
              onChange={(event) => setMemberReleaseAt(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200">
              Public Friday
            </label>
            <input
              type="datetime-local"
              value={publicReleaseAt}
              onChange={(event) => setPublicReleaseAt(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white outline-none"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(event) => setIsFeatured(event.target.checked)}
              />
              Featured
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white">
              <input
                type="checkbox"
                checked={isVault}
                onChange={(event) => setIsVault(event.target.checked)}
              />
              Vault
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200">
              Behind the Mix
            </label>
            <textarea
              value={behindTheMixText}
              onChange={(event) => setBehindTheMixText(event.target.value)}
              rows={5}
              className="mt-2 w-full rounded-[1.4rem] border border-white/10 bg-white/6 px-4 py-3 text-sm text-white outline-none"
              placeholder="Add founder-story context for this track."
            />
          </div>

          <button
            type="submit"
            disabled={isSaving || !password || !selectedSongId}
            className="w-full rounded-2xl border border-cyan-100/70 bg-[linear-gradient(135deg,#67E8F9_0%,#22D3EE_45%,#06B6D4_100%)] px-4 py-3 text-sm font-bold text-slate-950 shadow-[0_0_0_1px_rgba(255,255,255,0.12),0_12px_30px_rgba(34,211,238,0.35)] transition hover:-translate-y-0.5 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.18),0_16px_36px_rgba(34,211,238,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/90 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050816] disabled:border-white/8 disabled:bg-white/10 disabled:text-slate-400 disabled:shadow-none disabled:hover:translate-y-0"
          >
            {isSaving ? "Saving release..." : "Save release settings"}
          </button>

          {status ? (
            <p className="text-sm text-emerald-300">{status}</p>
          ) : null}
          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        </div>
      </div>
    </form>
  );
}
