export type WeatherCondition =
  | "clear"
  | "partly_cloudy"
  | "cloudy"
  | "foggy"
  | "rainy"
  | "stormy"
  | "snowy";

export type TimeOfDay = "morning" | "afternoon" | "evening" | "late_night";

export type RadioContext = {
  hour: number;
  minute: number;
  timeOfDay: TimeOfDay;
  timeLabel: string;
  dayOfWeek: string;
  isWeekend: boolean;
  isSpecialHour: boolean;
  weatherCondition: WeatherCondition;
  weatherDesc: string;
  tempF: number | null;
};

// Default: Orlando, FL
const DEFAULT_LAT = 28.5383;
const DEFAULT_LON = -81.3792;

function weatherCodeToCondition(code: number): WeatherCondition {
  if (code === 0) return "clear";
  if (code <= 3) return "partly_cloudy";
  if (code <= 48) return "foggy";
  if (code <= 67 || (code >= 80 && code <= 82)) return "rainy";
  if (code <= 77) return "snowy";
  if (code >= 95) return "stormy";
  return "cloudy";
}

function weatherConditionToDesc(condition: WeatherCondition): string {
  switch (condition) {
    case "clear": return "clear skies";
    case "partly_cloudy": return "partly cloudy";
    case "cloudy": return "overcast";
    case "foggy": return "foggy";
    case "rainy": return "rainy";
    case "stormy": return "stormy";
    case "snowy": return "snowy";
  }
}

function getTimeOfDay(hour: number): TimeOfDay {
  if (hour >= 6 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "late_night";
}

function getTimeLabel(hour: number): string {
  const ampm = hour < 12 ? "AM" : "PM";
  const h = hour % 12 || 12;
  if (hour >= 6 && hour < 12) return `${h} ${ampm} morning`;
  if (hour >= 12 && hour < 17) return `${h} ${ampm} afternoon`;
  if (hour >= 17 && hour < 21) return `${h} ${ampm} evening`;
  if (hour === 0) return "midnight";
  return `${h} ${ampm} late night`;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

let weatherCache: { condition: WeatherCondition; tempF: number | null; fetchedAt: number; cacheKey: string } | null = null;
const WEATHER_CACHE_TTL_MS = 20 * 60 * 1000; // 20 minutes

async function fetchWeather(lat = DEFAULT_LAT, lon = DEFAULT_LON): Promise<{ condition: WeatherCondition; tempF: number | null }> {
  const now = Date.now();
  const cacheKey = `${Math.round(lat * 10)},${Math.round(lon * 10)}`;
  if (weatherCache && weatherCache.cacheKey === cacheKey && now - weatherCache.fetchedAt < WEATHER_CACHE_TTL_MS) {
    return { condition: weatherCache.condition, tempF: weatherCache.tempF };
  }

  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&temperature_unit=fahrenheit`,
      { signal: AbortSignal.timeout(4000) },
    );
    if (!res.ok) throw new Error("weather fetch failed");
    const data = await res.json() as {
      current?: { weather_code?: number; temperature_2m?: number };
    };
    const code = data.current?.weather_code ?? 0;
    const tempF = data.current?.temperature_2m ?? null;
    const condition = weatherCodeToCondition(code);
    weatherCache = { condition, tempF, fetchedAt: now, cacheKey };
    return { condition, tempF };
  } catch {
    return { condition: "clear", tempF: null };
  }
}

export async function getRadioContext(lat?: number, lon?: number): Promise<RadioContext> {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const dayOfWeek = DAYS[now.getDay()];
  const isWeekend = now.getDay() === 0 || now.getDay() === 6;
  const isSpecialHour =
    minute < 5 || // top of any hour
    ((hour === 0 || hour === 6 || hour === 12 || hour === 18) && minute < 10);

  const { condition, tempF } = await fetchWeather(lat, lon);

  return {
    hour,
    minute,
    timeOfDay: getTimeOfDay(hour),
    timeLabel: getTimeLabel(hour),
    dayOfWeek,
    isWeekend,
    isSpecialHour,
    weatherCondition: condition,
    weatherDesc: weatherConditionToDesc(condition),
    tempF,
  };
}

export function isSpecialNarrationMoment(songCount: number): boolean {
  const now = new Date();
  const min = now.getMinutes();
  const hour = now.getHours();
  if (min < 3) return true; // top of hour
  if ((hour === 0 || hour === 6 || hour === 12 || hour === 18) && min < 8) return true;
  if (songCount > 0 && songCount % 3 === 0) return true;
  return false;
}
