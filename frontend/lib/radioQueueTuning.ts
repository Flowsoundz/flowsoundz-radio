"use client";

import type { Song } from "@/lib/types";

type TrackSignalStats = {
  playCount: number;
  skipCount: number;
  completeCount: number;
  failCount: number;
  lastPlayedAt?: string;
  lastSkippedAt?: string;
  lastCompletedAt?: string;
  lastFailedAt?: string;
};

const TRACK_SIGNAL_STORAGE_KEY = "fsz-radio-track-signals";

function canUseStorage() {
  return typeof window !== "undefined";
}

function readSignals(): Record<string, TrackSignalStats> {
  if (!canUseStorage()) {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(TRACK_SIGNAL_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as Record<string, TrackSignalStats>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeSignals(signals: Record<string, TrackSignalStats>) {
  if (!canUseStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(TRACK_SIGNAL_STORAGE_KEY, JSON.stringify(signals));
  } catch {
    // Ignore storage write failures.
  }
}

export function registerTrackSignal(
  song: Pick<Song, "id"> | null | undefined,
  signal: "play" | "skip" | "complete" | "fail",
) {
  if (!song?.id) {
    return;
  }

  const signals = readSignals();
  const current = signals[song.id] ?? {
    playCount: 0,
    skipCount: 0,
    completeCount: 0,
    failCount: 0,
  };
  const now = new Date().toISOString();

  if (signal === "play") {
    current.playCount += 1;
    current.lastPlayedAt = now;
  } else if (signal === "skip") {
    current.skipCount += 1;
    current.lastSkippedAt = now;
  } else if (signal === "complete") {
    current.completeCount += 1;
    current.lastCompletedAt = now;
  } else if (signal === "fail") {
    current.failCount += 1;
    current.lastFailedAt = now;
  }

  signals[song.id] = current;
  writeSignals(signals);
}

function getTrackPriorityScore(song: Song, originalIndex: number) {
  const signals = readSignals()[song.id];
  if (!signals) {
    return 0 - originalIndex * 0.001;
  }

  let score = 0;
  score += signals.completeCount * 3;
  score -= signals.skipCount * 4;
  score -= signals.failCount * 8;

  if (signals.playCount > 0 && signals.completeCount === 0 && signals.skipCount >= 2) {
    score -= 5;
  }

  const lastSkippedAt = signals.lastSkippedAt ? new Date(signals.lastSkippedAt).getTime() : 0;
  const lastCompletedAt = signals.lastCompletedAt ? new Date(signals.lastCompletedAt).getTime() : 0;
  const now = Date.now();

  if (lastSkippedAt && now - lastSkippedAt < 1000 * 60 * 60 * 6) {
    score -= 6;
  }

  if (lastCompletedAt && now - lastCompletedAt < 1000 * 60 * 60 * 24) {
    score += 2;
  }

  return score - originalIndex * 0.001;
}

export function reorderQueueByLocalSignals(queue: Song[]): Song[] {
  if (!canUseStorage() || queue.length <= 1) {
    return queue;
  }

  return queue
    .map((song, index) => ({
      song,
      score: getTrackPriorityScore(song, index),
      index,
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.song);
}
