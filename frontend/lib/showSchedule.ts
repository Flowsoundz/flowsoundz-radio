export type Show = {
  id: string;
  name: string;
  tagline: string;
  vibe: string;
  dayOfWeek: number; // 0=Sun, 1=Mon…6=Sat
  startHour: number; // Eastern Time, 24h
  durationMinutes: number;
  accentColor: string;
  emoji: string;
};

// All times in US Eastern Time (ET)
export const SHOWS: Show[] = [
  {
    id: "monday-grind",
    name: "Monday Grind",
    tagline: "Start the week right",
    vibe: "hype",
    dayOfWeek: 1,
    startHour: 20,
    durationMinutes: 120,
    accentColor: "#00E5FF",
    emoji: "⚡",
  },
  {
    id: "emotional-tuesday",
    name: "Emotional Tuesday",
    tagline: "Feel everything",
    vibe: "emotional",
    dayOfWeek: 2,
    startHour: 21,
    durationMinutes: 120,
    accentColor: "#FF2DA6",
    emoji: "🌊",
  },
  {
    id: "midweek-frequencies",
    name: "Midweek Frequencies",
    tagline: "Smooth out the middle",
    vibe: "chill",
    dayOfWeek: 3,
    startHour: 20,
    durationMinutes: 120,
    accentColor: "#8B5CF6",
    emoji: "🎵",
  },
  {
    id: "late-night-sessions",
    name: "Late Night Sessions",
    tagline: "After dark, underground",
    vibe: "late_night",
    dayOfWeek: 4,
    startHour: 22,
    durationMinutes: 180,
    accentColor: "#7C4DFF",
    emoji: "🌙",
  },
  {
    id: "friday-night-live",
    name: "Friday Night Live",
    tagline: "The week is yours",
    vibe: "hype",
    dayOfWeek: 5,
    startHour: 21,
    durationMinutes: 180,
    accentColor: "#FF2DA6",
    emoji: "🔥",
  },
  {
    id: "saturday-select",
    name: "Saturday Select",
    tagline: "All vibes, all day",
    vibe: "all",
    dayOfWeek: 6,
    startHour: 14,
    durationMinutes: 240,
    accentColor: "#00FF88",
    emoji: "🎧",
  },
  {
    id: "sunday-wind-down",
    name: "Sunday Wind Down",
    tagline: "Rest and reflect",
    vibe: "chill",
    dayOfWeek: 0,
    startHour: 18,
    durationMinutes: 120,
    accentColor: "#C4B5FD",
    emoji: "☁️",
  },
];

function getEasternNow(): { dayOfWeek: number; minuteOfDay: number } {
  const now = new Date();
  const etOffset = getEasternOffsetMs();
  const etDate = new Date(now.getTime() + etOffset);
  return {
    dayOfWeek: etDate.getUTCDay(),
    minuteOfDay: etDate.getUTCHours() * 60 + etDate.getUTCMinutes(),
  };
}

function getEasternOffsetMs(): number {
  // Approximate ET: UTC-5 (EST) / UTC-4 (EDT)
  // Use the browser/server local time to detect DST roughly
  const jan = new Date(new Date().getFullYear(), 0, 1).getTimezoneOffset();
  const jul = new Date(new Date().getFullYear(), 6, 1).getTimezoneOffset();
  const isDST = Math.min(jan, jul) === new Date().getTimezoneOffset();
  return isDST ? -4 * 3600_000 : -5 * 3600_000;
}

export function getCurrentShow(): Show | null {
  const { dayOfWeek, minuteOfDay } = getEasternNow();
  return (
    SHOWS.find((show) => {
      if (show.dayOfWeek !== dayOfWeek) return false;
      const start = show.startHour * 60;
      const end = start + show.durationMinutes;
      return minuteOfDay >= start && minuteOfDay < end;
    }) ?? null
  );
}

export type UpcomingShow = Show & { startsInMinutes: number };

export function getUpcomingShows(count = 5): UpcomingShow[] {
  const { dayOfWeek, minuteOfDay } = getEasternNow();
  const results: UpcomingShow[] = [];

  for (let offset = 0; offset < 7 && results.length < count; offset++) {
    const targetDay = (dayOfWeek + offset) % 7;
    const dayShows = SHOWS.filter((s) => s.dayOfWeek === targetDay).sort(
      (a, b) => a.startHour - b.startHour,
    );

    for (const show of dayShows) {
      const startMinuteAbsolute = offset * 1440 + show.startHour * 60;
      const startsInMinutes = startMinuteAbsolute - minuteOfDay;
      if (startsInMinutes > 0) {
        results.push({ ...show, startsInMinutes });
        if (results.length >= count) break;
      }
    }
  }

  return results;
}
