/**
 * Logtime metrics derived from /v2/users/:id/locations_stats.
 *
 * That endpoint returns the student's whole history aggregated as
 * { "2024-05-01": "05:23:11.123", ... } in a single request, where the raw
 * /locations endpoint needs one page per hundred rows. It is what makes a
 * campus-wide logtime index affordable on a student's own API quota.
 *
 * The shape produced here mirrors what the rankings page reads under
 * `activityData.logtime`. Session counts and time-of-day splits are absent by
 * construction: both need the individual location rows, not daily totals.
 */

const DAY_MS = 86_400_000;

export interface Logtime {
  totalSeconds: number;
  totalHours: number;
  activeDays: number;
  averageDailyHours: string;
  presenceRate: string;
  firstDay: string | null;
  lastDay: string | null;
  daysSinceFirst: number;
  daysWithoutConnection: number;
  currentStreak: number;
  maxStreak: number;
  bestDay: { date: string; hours: string } | null;
  worstDay: { date: string; hours: string } | null;
  last7Days: { totalHours: string };
  last30Days: { totalHours: string };
  weekdayVsWeekend: {
    weekday: { hours: string };
    weekend: { hours: string };
    ratio: string;
  };
  productivity: {
    days4h: number;
    days8h: number;
    days12h: number;
    rate: string;
  };
  source: "locations_stats";
  computedAt: string;
}

/** "05:23:11.123" and "27:10:00" both parse; anything unexpected yields 0. */
const durationToSeconds = (duration: string): number => {
  if (typeof duration !== "string") return 0;
  const [hours, minutes, seconds] = duration.split(":");
  const parsed =
    Number(hours) * 3600 + Number(minutes) * 60 + parseFloat(seconds);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const toDayNumber = (day: string): number =>
  Math.floor(new Date(`${day}T00:00:00Z`).getTime() / DAY_MS);

const hours = (seconds: number): number =>
  Math.round((seconds / 3600) * 10) / 10;

export const computeLogtime = (stats: Record<string, string>): Logtime => {
  const days = Object.entries(stats ?? {})
    .map(([day, duration]) => ({ day, seconds: durationToSeconds(duration) }))
    .filter((entry) => entry.seconds > 0)
    .sort((a, b) => a.day.localeCompare(b.day));

  const computedAt = new Date().toISOString();

  if (days.length === 0) {
    return {
      totalSeconds: 0,
      totalHours: 0,
      activeDays: 0,
      averageDailyHours: "0.0",
      presenceRate: "0.0",
      firstDay: null,
      lastDay: null,
      daysSinceFirst: 0,
      daysWithoutConnection: 0,
      currentStreak: 0,
      maxStreak: 0,
      bestDay: null,
      worstDay: null,
      last7Days: { totalHours: "0.0" },
      last30Days: { totalHours: "0.0" },
      weekdayVsWeekend: {
        weekday: { hours: "0.0" },
        weekend: { hours: "0.0" },
        ratio: "0.00",
      },
      productivity: { days4h: 0, days8h: 0, days12h: 0, rate: "0.0" },
      source: "locations_stats",
      computedAt,
    };
  }

  const totalSeconds = days.reduce((sum, entry) => sum + entry.seconds, 0);
  const activeDays = days.length;
  const firstDay = days[0].day;
  const lastDay = days[days.length - 1].day;

  const today = Math.floor(Date.now() / DAY_MS);
  const daysSinceFirst = Math.max(1, today - toDayNumber(firstDay) + 1);
  const daysWithoutConnection = Math.max(0, today - toDayNumber(lastDay));

  // Streaks over consecutive calendar days.
  let maxStreak = 1;
  let runningStreak = 1;
  for (let i = 1; i < days.length; i++) {
    const isConsecutive =
      toDayNumber(days[i].day) - toDayNumber(days[i - 1].day) === 1;
    runningStreak = isConsecutive ? runningStreak + 1 : 1;
    if (runningStreak > maxStreak) maxStreak = runningStreak;
  }
  // A streak only counts as current while it reaches today or yesterday.
  const currentStreak = daysWithoutConnection <= 1 ? runningStreak : 0;

  const sortedBySeconds = [...days].sort((a, b) => b.seconds - a.seconds);
  const best = sortedBySeconds[0];
  const worst = sortedBySeconds[sortedBySeconds.length - 1];

  const secondsSince = (windowDays: number): number =>
    days
      .filter((entry) => today - toDayNumber(entry.day) < windowDays)
      .reduce((sum, entry) => sum + entry.seconds, 0);

  let weekdaySeconds = 0;
  let weekendSeconds = 0;
  for (const entry of days) {
    const weekday = new Date(`${entry.day}T00:00:00Z`).getUTCDay();
    if (weekday === 0 || weekday === 6) weekendSeconds += entry.seconds;
    else weekdaySeconds += entry.seconds;
  }

  const days4h = days.filter((entry) => entry.seconds >= 4 * 3600).length;
  const days8h = days.filter((entry) => entry.seconds >= 8 * 3600).length;
  const days12h = days.filter((entry) => entry.seconds >= 12 * 3600).length;

  return {
    totalSeconds: Math.round(totalSeconds),
    totalHours: hours(totalSeconds),
    activeDays,
    averageDailyHours: (totalSeconds / activeDays / 3600).toFixed(1),
    presenceRate: ((activeDays / daysSinceFirst) * 100).toFixed(1),
    firstDay,
    lastDay,
    daysSinceFirst,
    daysWithoutConnection,
    currentStreak,
    maxStreak,
    bestDay: { date: best.day, hours: hours(best.seconds).toFixed(1) },
    worstDay: { date: worst.day, hours: hours(worst.seconds).toFixed(1) },
    last7Days: { totalHours: hours(secondsSince(7)).toFixed(1) },
    last30Days: { totalHours: hours(secondsSince(30)).toFixed(1) },
    weekdayVsWeekend: {
      weekday: { hours: hours(weekdaySeconds).toFixed(1) },
      weekend: { hours: hours(weekendSeconds).toFixed(1) },
      ratio: weekendSeconds > 0
        ? (weekdaySeconds / weekendSeconds).toFixed(2)
        : weekdaySeconds > 0
          ? "100.00"
          : "0.00",
    },
    productivity: {
      days4h,
      days8h,
      days12h,
      rate: ((days4h / activeDays) * 100).toFixed(1),
    },
    source: "locations_stats",
    computedAt,
  };
};
