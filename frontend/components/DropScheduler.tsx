"use client";

import { useState } from "react";
import Image from "next/image";

type Song = {
  id: string;
  title: string;
  coverUrl: string | null;
  isVault: boolean;
  memberReleaseAt: string | null;
  publicReleaseAt: string | null;
};

type SongState = {
  memberReleaseAt: string;
  publicReleaseAt: string;
  saving: boolean;
  saved: boolean;
  error: string;
};

function toInputValue(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toISOString().slice(0, 16);
  } catch {
    return "";
  }
}

function addHours(h: number): string {
  return new Date(Date.now() + h * 3_600_000).toISOString().slice(0, 16);
}

export function DropScheduler({ songs }: { songs: Song[] }) {
  const [state, setState] = useState<Record<string, SongState>>(() =>
    Object.fromEntries(
      songs.map((s) => [
        s.id,
        {
          memberReleaseAt: toInputValue(s.memberReleaseAt),
          publicReleaseAt: toInputValue(s.publicReleaseAt),
          saving: false,
          saved: false,
          error: "",
        },
      ])
    )
  );

  function update(songId: string, patch: Partial<SongState>) {
    setState((prev) => ({ ...prev, [songId]: { ...prev[songId]!, ...patch } }));
  }

  function setVaultWindow(songId: string) {
    update(songId, {
      memberReleaseAt: addHours(24),
      publicReleaseAt: addHours(96),
      saved: false,
    });
  }

  async function save(songId: string) {
    const s = state[songId];
    if (!s || s.saving) return;
    update(songId, { saving: true, saved: false, error: "" });
    try {
      const res = await fetch("/api/artist/songs/schedule", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          songId,
          memberReleaseAt: s.memberReleaseAt || null,
          publicReleaseAt: s.publicReleaseAt || null,
        }),
      });
      if (!res.ok) {
        const d = (await res.json()) as { error?: string };
        throw new Error(d.error ?? "Save failed.");
      }
      update(songId, { saving: false, saved: true });
    } catch (e) {
      update(songId, { saving: false, error: e instanceof Error ? e.message : "Error saving." });
    }
  }

  if (songs.length === 0) {
    return (
      <div className="rounded-[1.8rem] border border-white/8 bg-[#0B1020]/80 p-12 text-center">
        <p className="text-sm text-slate-500">No tracks in your catalog yet. Submit a track first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {songs.map((song) => {
        const s = state[song.id];
        if (!s) return null;
        return (
          <div key={song.id} className="rounded-[1.8rem] border border-white/8 bg-[#0B1020]/80 p-5">
            {/* Song header */}
            <div className="mb-4 flex items-center gap-3">
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-white/5">
                {song.coverUrl ? (
                  <Image src={song.coverUrl} alt={song.title} fill className="object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-lg">🎵</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-semibold text-white">{song.title}</p>
                <div className="flex gap-1.5 mt-0.5">
                  {song.isVault && (
                    <span className="rounded-full border border-fuchsia-400/25 bg-fuchsia-400/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.15em] text-fuchsia-300">
                      Vault
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setVaultWindow(song.id)}
                title="Set 72h Vault early access window starting tomorrow"
                className="shrink-0 rounded-full border border-fuchsia-400/25 bg-fuchsia-400/10 px-3 py-1 text-[10px] font-semibold text-fuchsia-300 transition hover:border-fuchsia-400/40 hover:bg-fuchsia-400/18"
              >
                ⚡ 72h Vault Window
              </button>
            </div>

            {/* Date inputs */}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-fuchsia-300/80">
                  Vault Early Access
                </span>
                <input
                  type="datetime-local"
                  value={s.memberReleaseAt}
                  onChange={(e) => update(song.id, { memberReleaseAt: e.target.value, saved: false })}
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white transition focus:border-fuchsia-400/40 focus:outline-none focus:ring-0 [color-scheme:dark]"
                />
                <p className="text-[10px] text-slate-600">When VAULT members can first access this track</p>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300/80">
                  Public Release
                </span>
                <input
                  type="datetime-local"
                  value={s.publicReleaseAt}
                  onChange={(e) => update(song.id, { publicReleaseAt: e.target.value, saved: false })}
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white transition focus:border-cyan-400/40 focus:outline-none focus:ring-0 [color-scheme:dark]"
                />
                <p className="text-[10px] text-slate-600">When all listeners can access this track</p>
              </label>
            </div>

            {/* Save row */}
            <div className="mt-4 flex items-center justify-between gap-3">
              {s.error && <p className="text-xs text-red-400">{s.error}</p>}
              {s.saved && !s.error && <p className="text-xs text-emerald-400">Saved ✓</p>}
              {!s.error && !s.saved && <span />}
              <div className="flex gap-2">
                {(s.memberReleaseAt || s.publicReleaseAt) && (
                  <button
                    type="button"
                    onClick={() => update(song.id, { memberReleaseAt: "", publicReleaseAt: "", saved: false })}
                    className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-slate-400 transition hover:border-white/20 hover:text-white"
                  >
                    Clear
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void save(song.id)}
                  disabled={s.saving}
                  className="rounded-full bg-[linear-gradient(135deg,#00e5ff_0%,#7c4dff_100%)] px-4 py-1.5 text-xs font-bold text-white shadow-[0_0_14px_rgba(0,229,255,0.25)] transition disabled:opacity-50 hover:shadow-[0_0_22px_rgba(0,229,255,0.4)]"
                >
                  {s.saving ? "Saving…" : "Save Schedule"}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
