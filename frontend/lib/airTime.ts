import type { Song } from "@/lib/types";
import {
  buildStationBlock,
  getBlockIndex,
  getBlockStartMs,
  getStationEligibleSongs,
  BLOCK_DURATION_SEC,
} from "@/lib/stationClock";

// ─────────────────────────────────────────────────────────────────────────────
// Air-time prediction.
//
// Because the station schedule is a pure function of wall-clock time, we can
// tell an artist EXACTLY when their track will next play — something no
// traditional station can promise. This scans the current + upcoming program
// blocks on each channel and returns absolute timestamps.
// ─────────────────────────────────────────────────────────────────────────────

export type Airing = {
  /** Channel the airing happens on ("all" = main station, or a vibe). */
  channel: string;
  /** Absolute epoch ms when the track starts playing. */
  startsAtMs: number;
  /** Convenience: minutes from now (rounded). */
  inMinutes: number;
};

const CHANNELS_FOR_VIBE = (vibe: string | undefined): string[] => {
  const channels = ["all"];
  if (vibe && vibe !== "all") channels.push(vibe.toLowerCase());
  return channels;
};

/**
 * Next airings for one song across its channels, soonest first.
 * `lookaheadBlocks` hours of schedule are scanned (default 12).
 */
export function getUpcomingAirings(
  catalog: Song[],
  songId: string,
  nowMs: number = Date.now(),
  { lookaheadBlocks = 12, limit = 3 }: { lookaheadBlocks?: number; limit?: number } = {},
): Airing[] {
  const song = catalog.find((s) => s.id === songId);
  if (!song) return [];
  // Not broadcast-eligible (explicit, gated, no duration) → never airs.
  if (!getStationEligibleSongs(catalog).some((s) => s.id === songId)) return [];

  const airings: Airing[] = [];
  const startBlock = getBlockIndex(nowMs);

  for (const channel of CHANNELS_FOR_VIBE(song.vibe)) {
    for (let b = startBlock; b < startBlock + lookaheadBlocks; b++) {
      const blockStartMs = getBlockStartMs(b);
      for (const entry of buildStationBlock(catalog, channel, b)) {
        if (entry.song.id !== songId) continue;
        const startsAtMs = blockStartMs + entry.startSec * 1000;
        if (startsAtMs <= nowMs) continue; // already played / playing
        airings.push({
          channel,
          startsAtMs,
          inMinutes: Math.round((startsAtMs - nowMs) / 60000),
        });
      }
      // Small catalogs repeat within a block — one block can hold several
      // airings; we still scan forward for the cross-channel merge below.
      if (airings.filter((a) => a.channel === channel).length >= limit) break;
    }
  }

  airings.sort((a, b) => a.startsAtMs - b.startsAtMs);
  return airings.slice(0, limit);
}

/** Format an airing for human display in the station's local (US Eastern) time. */
export function formatAiring(a: Airing, timeZone = "America/New_York"): string {
  const d = new Date(a.startsAtMs);
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone });
  const day = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone });
  const today = new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone });
  const channelLabel = a.channel === "all" ? "Main station" : `${a.channel[0].toUpperCase()}${a.channel.slice(1).replace("_", " ")} channel`;
  return `${day === today ? "Today" : day} at ${time} ET · ${channelLabel}`;
}

/** True if the block duration / lookahead math can cover at least one airing. */
export const MAX_LOOKAHEAD_HOURS = (12 * BLOCK_DURATION_SEC) / 3600;
