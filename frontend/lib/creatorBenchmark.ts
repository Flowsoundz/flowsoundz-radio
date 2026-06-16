import { prisma } from "@/lib/prisma";

// Station-wide benchmarks so an artist's numbers have CONTEXT — "you're in the
// top 22%" beats a bare play count. Computed from every track's QueuePreference
// row (the live rotation stats). Cheap: the catalog is small.

export type StationBenchmarks = {
  trackCount: number;
  avgPlays: number;
  medianPlays: number;
  avgCompleteRate: number; // 0..1, over tracks with plays
  avgSkipRate: number; // 0..1, over tracks with plays
  avgHype: number;
  playCountsAsc: number[]; // for percentile ranking
};

const mean = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);
const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export async function getStationBenchmarks(): Promise<StationBenchmarks | null> {
  const prefs = await prisma.queuePreference.findMany({
    select: { playCount: true, completeRate: true, skipRate: true, hypeCount: true },
  });
  if (prefs.length === 0) return null;

  const played = prefs.filter((p) => p.playCount > 0);
  const rateBase = played.length ? played : prefs; // rates only meaningful once played
  const plays = prefs.map((p) => p.playCount);

  return {
    trackCount: prefs.length,
    avgPlays: mean(plays),
    medianPlays: median(plays),
    avgCompleteRate: mean(rateBase.map((p) => p.completeRate)),
    avgSkipRate: mean(rateBase.map((p) => p.skipRate)),
    avgHype: mean(prefs.map((p) => p.hypeCount)),
    playCountsAsc: plays.sort((a, b) => a - b),
  };
}

/** Percentile rank (0–100) of `value` within a sorted-ascending distribution. */
export function percentileRank(sortedAsc: number[], value: number): number {
  if (!sortedAsc.length) return 0;
  const below = sortedAsc.filter((v) => v < value).length;
  const equal = sortedAsc.filter((v) => v === value).length;
  // midpoint method so ties land sensibly
  return Math.round(((below + equal / 2) / sortedAsc.length) * 100);
}

export type ImprovementTip = { tone: "good" | "tip"; text: string; href?: string; cta?: string };

// Turn the gap between an artist and the station into 1–3 plain-language,
// actionable tips — the feedback loop that pulls artists back to submit again.
export function buildTips(args: {
  bestPlayPercentile: number;
  artistAvgComplete: number;
  artistAvgSkip: number;
  station: StationBenchmarks;
  totalPlays: number;
  totalShares: number;
  artistSlug?: string | null;
}): ImprovementTip[] {
  const { bestPlayPercentile, artistAvgComplete, artistAvgSkip, station, totalPlays, totalShares, artistSlug } = args;
  const tips: ImprovementTip[] = [];

  // Skip rate notably worse than the station → hook problem.
  if (station.avgSkipRate > 0 && artistAvgSkip > station.avgSkipRate * 1.15) {
    tips.push({
      tone: "tip",
      text: `Listeners skip your tracks more than the station average (${Math.round(artistAvgSkip * 100)}% vs ${Math.round(station.avgSkipRate * 100)}%). A stronger first 15 seconds — hook up front, less intro — usually cuts skips.`,
    });
  }

  // Completion notably worse → arrangement/length.
  if (station.avgCompleteRate > 0 && artistAvgComplete > 0 && artistAvgComplete < station.avgCompleteRate * 0.9) {
    tips.push({
      tone: "tip",
      text: `Your completion rate trails the station (${Math.round(artistAvgComplete * 100)}% vs ${Math.round(station.avgCompleteRate * 100)}%). Tighter arrangements and shorter outros keep listeners to the end.`,
    });
  }

  // Low reach → share the profile.
  if (totalPlays === 0 || bestPlayPercentile < 50) {
    tips.push({
      tone: "tip",
      text: "Your reach has room to grow — sharing your artist page drives the first plays that lift you into heavier rotation.",
      href: artistSlug ? `/artists/${artistSlug}` : undefined,
      cta: artistSlug ? "Open your shareable page" : undefined,
    });
  }

  // Doing well → reinforce + nudge the next submission (the revenue action).
  if (tips.length === 0) {
    tips.push({
      tone: "good",
      text: `You're outperforming the catalog — your best track beats ${bestPlayPercentile}% of the station. Submit your next track to build on the momentum.`,
      href: "/artist/submit",
      cta: "Submit another track",
    });
  } else if (totalShares > 0 && bestPlayPercentile >= 70) {
    tips.push({
      tone: "good",
      text: `Strong work — your best track is in the top ${100 - bestPlayPercentile}% for plays. Keep the streak going.`,
      href: "/artist/submit",
      cta: "Submit another track",
    });
  }

  return tips.slice(0, 3);
}
