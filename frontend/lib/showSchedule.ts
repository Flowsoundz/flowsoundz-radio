export type Show = {
  id: string;
  name: string;
  tagline: string;
  vibe: string;
  startHour: number; // Eastern Time, 24h
  durationMinutes: number;
  accentColor: string;
  emoji: string;
};

// Daily station clock. This repeats every 24 hours so the schedule behaves like
// real radio programming instead of a once-a-week event calendar.
export const SHOWS: Show[] = [
  {
    id: "sunrise-select",
    name: "Sunrise Select",
    tagline: "Clean starts, bright hooks",
    vibe: "chill",
    startHour: 6,
    durationMinutes: 240,
    accentColor: "#00FF88",
    emoji: "SUN",
  },
  {
    id: "day-shift",
    name: "Day Shift",
    tagline: "Discovery while the world is moving",
    vibe: "all",
    startHour: 10,
    durationMinutes: 240,
    accentColor: "#00E5FF",
    emoji: "DAY",
  },
  {
    id: "afternoon-current",
    name: "Afternoon Current",
    tagline: "Warm records and repeatable hooks",
    vibe: "emotional",
    startHour: 14,
    durationMinutes: 240,
    accentColor: "#FF2DA6",
    emoji: "FLOW",
  },
  {
    id: "prime-signal",
    name: "Prime Signal",
    tagline: "The strongest discovery block of the day",
    vibe: "hype",
    startHour: 18,
    durationMinutes: 240,
    accentColor: "#7C4DFF",
    emoji: "LIVE",
  },
  {
    id: "late-night-sessions",
    name: "Late Night Sessions",
    tagline: "After dark, underground",
    vibe: "late_night",
    startHour: 22,
    durationMinutes: 240,
    accentColor: "#8B5CF6",
    emoji: "LATE",
  },
  {
    id: "afterhours-archive",
    name: "Afterhours Archive",
    tagline: "Deep cuts for the quiet hours",
    vibe: "chill",
    startHour: 2,
    durationMinutes: 240,
    accentColor: "#C4B5FD",
    emoji: "AM",
  },
];

function getEasternNow(): { minuteOfDay: number } {
  const now = new Date();
  const etParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(now);
  const hour = Number(etParts.find((part) => part.type === "hour")?.value ?? 0) % 24;
  const minute = Number(etParts.find((part) => part.type === "minute")?.value ?? 0);

  return {
    minuteOfDay: hour * 60 + minute,
  };
}

function isShowActive(show: Show, minuteOfDay: number) {
  const start = show.startHour * 60;
  const end = (start + show.durationMinutes) % 1440;

  if (show.durationMinutes >= 1440) return true;
  if (start < end) return minuteOfDay >= start && minuteOfDay < end;
  return minuteOfDay >= start || minuteOfDay < end;
}

export function getCurrentShow(): Show | null {
  const { minuteOfDay } = getEasternNow();
  return SHOWS.find((show) => isShowActive(show, minuteOfDay)) ?? null;
}

export type UpcomingShow = Show & { startsInMinutes: number };

export function getUpcomingShows(count = 5): UpcomingShow[] {
  const { minuteOfDay } = getEasternNow();

  return SHOWS.map((show) => {
    const startMinute = show.startHour * 60;
    const startsInMinutes =
      startMinute > minuteOfDay
        ? startMinute - minuteOfDay
        : startMinute + 1440 - minuteOfDay;

    return { ...show, startsInMinutes };
  })
    .filter((show) => show.startsInMinutes > 0)
    .sort((a, b) => a.startsInMinutes - b.startsInMinutes)
    .slice(0, count);
}
