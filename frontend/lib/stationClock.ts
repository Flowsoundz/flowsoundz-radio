import type { Song } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// Deterministic station clock.
//
// "What's playing right now" is a pure function of wall-clock time and the
// track catalog — no scheduler process, no shared mutable state. Every client
// and every serverless instance computes the same answer, which is what makes
// all listeners hear the same track at the same moment.
//
// Time is divided into fixed one-hour program blocks anchored to a fixed
// epoch. Each block gets a seeded shuffle of the eligible catalog, laid out
// back-to-back with a fixed transition gap (where DJ drops play). If the
// catalog is shorter than an hour the shuffled order cycles with a fresh
// seed per cycle. The tail of a block that can't fit another full track is a
// "station break" — clients play bed/ident audio until the next block opens.
// Block boundaries are the hard sync points (top-of-hour, like real radio).
// ─────────────────────────────────────────────────────────────────────────────

export const STATION_EPOCH_MS = Date.UTC(2026, 0, 1, 0, 0, 0);
export const BLOCK_DURATION_SEC = 60 * 60;
// Gap between tracks — the window where DJ drops / narration play.
export const TRANSITION_GAP_SEC = 12;
// Tracks shorter than this are idents/stingers, not programming.
const MIN_TRACK_DURATION_SEC = 45;
// Guard against corrupt duration data poisoning the schedule.
const MAX_TRACK_DURATION_SEC = 15 * 60;

export type StationEntry = {
  song: Song;
  /** Seconds from block start when this track begins. */
  startSec: number;
  /** Seconds from block start when this track ends (start + duration). */
  endSec: number;
};

export type StationNow =
  | {
      type: "track";
      song: Song;
      /** Seek position within the track, in seconds. */
      positionSec: number;
      /** Seconds until this track ends. */
      remainingSec: number;
      next: Song | null;
    }
  | {
      type: "break";
      /** Next scheduled track, or null when the block tail has no more tracks. */
      next: Song | null;
      /** Seconds until the next track (or next block) starts. */
      startsInSec: number;
    };

// Deterministic 32-bit PRNG — same sequence for the same seed everywhere.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// FNV-1a over a string — turns (blockIndex, channel, cycle) into a PRNG seed.
function hashSeed(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function seededShuffle<T>(items: T[], seed: number): T[] {
  const rand = mulberry32(seed);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Canonical station eligibility. Deliberately stricter than per-user queue
 * filtering: only tracks EVERY listener can play are scheduled, so the same
 * schedule works for guests, members, and explicit-filtered listeners alike.
 * Input order doesn't matter — the canonical sort makes the schedule
 * independent of boost/request reordering applied to client queues.
 */
export function getStationEligibleSongs(songs: Song[], vibe?: string): Song[] {
  return songs
    .filter((song) => {
      const duration = song.duration_sec ?? 0;
      if (duration < MIN_TRACK_DURATION_SEC || duration > MAX_TRACK_DURATION_SEC) return false;
      if (song.is_playable === false) return false;
      if (song.is_explicit) return false;
      if (song.is_vault) return false;
      if (song.access_tier && song.access_tier !== "listener") return false;
      if (vibe && vibe !== "all" && song.vibe !== vibe) return false;
      return true;
    })
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

export function getBlockIndex(nowMs: number): number {
  return Math.floor((nowMs - STATION_EPOCH_MS) / (BLOCK_DURATION_SEC * 1000));
}

export function getBlockStartMs(blockIndex: number): number {
  return STATION_EPOCH_MS + blockIndex * BLOCK_DURATION_SEC * 1000;
}

/**
 * Lay out one program block. Cycles the eligible catalog (reshuffled per
 * cycle) until no further full track fits before the block boundary.
 */
export function buildStationBlock(
  songs: Song[],
  vibe: string,
  blockIndex: number,
): StationEntry[] {
  const eligible = getStationEligibleSongs(songs, vibe);
  if (eligible.length === 0) return [];

  const entries: StationEntry[] = [];
  let cursorSec = 0;
  let cycle = 0;
  let lastSongId: string | null = null;

  while (true) {
    const order = seededShuffle(eligible, hashSeed(`fsz:${vibe}:${blockIndex}:${cycle}`));
    // Avoid back-to-back repeat across a cycle seam when the catalog allows it.
    if (order.length > 1 && order[0].id === lastSongId) {
      [order[0], order[1]] = [order[1], order[0]];
    }

    let placedAny = false;
    for (const song of order) {
      const duration = song.duration_sec ?? 0;
      if (cursorSec + duration > BLOCK_DURATION_SEC) {
        return entries;
      }
      entries.push({ song, startSec: cursorSec, endSec: cursorSec + duration });
      cursorSec += duration + TRANSITION_GAP_SEC;
      lastSongId = song.id;
      placedAny = true;
    }

    if (!placedAny) return entries;
    cycle += 1;
    // Safety bound — can't happen with MIN_TRACK_DURATION_SEC, but never loop forever.
    if (cycle > 200) return entries;
  }
}

/**
 * The station's on-air state at `nowMs`. Pure and deterministic: any two
 * callers with the same catalog and the same clock get the same answer.
 */
export function getStationNow(songs: Song[], vibe: string, nowMs: number): StationNow {
  const blockIndex = getBlockIndex(nowMs);
  const entries = buildStationBlock(songs, vibe, blockIndex);
  const blockOffsetSec = (nowMs - getBlockStartMs(blockIndex)) / 1000;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (blockOffsetSec < entry.startSec) {
      // In the transition gap before this track.
      return { type: "break", next: entry.song, startsInSec: entry.startSec - blockOffsetSec };
    }
    if (blockOffsetSec < entry.endSec) {
      return {
        type: "track",
        song: entry.song,
        positionSec: blockOffsetSec - entry.startSec,
        remainingSec: entry.endSec - blockOffsetSec,
        next: entries[i + 1]?.song ?? null,
      };
    }
  }

  // Block tail (station break) — next programming starts at the next block.
  const nextBlockEntries = buildStationBlock(songs, vibe, blockIndex + 1);
  return {
    type: "break",
    next: nextBlockEntries[0]?.song ?? null,
    startsInSec: BLOCK_DURATION_SEC - blockOffsetSec + (nextBlockEntries[0]?.startSec ?? 0),
  };
}
