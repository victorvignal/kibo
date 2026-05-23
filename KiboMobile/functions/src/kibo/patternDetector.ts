/**
 * Pattern Detection Algorithms for Kibo User Analysis
 * Analyzes check-in data to detect behavioral patterns, correlations, and trends
 */

import type {
  CheckinRecord,
  PatternAnalysis,
  UserProfilePatterns,
  UserProfileTrends,
  TriggerType,
} from "./userProfile";

// Day names for pattern analysis
const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

/**
 * Pearson correlation coefficient between two arrays
 */
function pearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n === 0 || n !== y.length) return 0;

  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
  const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);
  const sumY2 = y.reduce((acc, yi) => acc + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  if (denominator === 0) return 0;
  return Math.max(-1, Math.min(1, numerator / denominator));
}

/**
 * Detect best and worst days of the week for the user
 */
function detectDayPatterns(records: CheckinRecord[]): { bestDays: string[]; worstDays: string[] } {
  const dayMoodSum: number[] = [0, 0, 0, 0, 0, 0, 0];
  const dayCount: number[] = [0, 0, 0, 0, 0, 0, 0];

  for (const record of records) {
    const dayIndex = DAY_NAMES.indexOf(record.dayOfWeek.toLowerCase());
    if (dayIndex === -1) continue;
    dayMoodSum[dayIndex] += record.mood;
    dayCount[dayIndex]++;
  }

  const dayAverages = dayMoodSum.map((sum, i) =>
    dayCount[i] > 0 ? sum / dayCount[i] : 5 // default to neutral
  );

  const sortedIndices = dayAverages
    .map((avg, i) => ({ avg, i }))
    .sort((a, b) => b.avg - a.avg);

  const bestDays = sortedIndices.slice(0, 2).map((d) => DAY_NAMES[d.i]);
  const worstDays = sortedIndices.slice(-2).map((d) => DAY_NAMES[d.i]);

  return { bestDays, worstDays };
}

/**
 * Detect best time of day based on check-in times
 */
function detectTimePatterns(records: CheckinRecord[]): string {
  const timeMoodSum: { [key: string]: number } = {
    morning: 0,
    afternoon: 0,
    evening: 0,
    night: 0,
  };
  const timeCount: { [key: string]: number } = {
    morning: 0,
    afternoon: 0,
    evening: 0,
    night: 0,
  };

  for (const record of records) {
    const hour = record.hourOfDay;
    let timeOfDay = "evening";
    if (hour >= 5 && hour < 12) timeOfDay = "morning";
    else if (hour >= 12 && hour < 18) timeOfDay = "afternoon";
    else if (hour >= 18 && hour < 22) timeOfDay = "evening";
    else timeOfDay = "night";

    // Weight by mood - higher mood check-ins count more
    const weight = record.mood / 10;
    timeMoodSum[timeOfDay] += record.mood * weight;
    timeCount[timeOfDay] += weight;
  }

  let bestTime = "morning";
  let bestAvg = 0;
  for (const [time, sum] of Object.entries(timeMoodSum)) {
    const avg = timeCount[time] > 0 ? sum / timeCount[time] : 0;
    if (avg > bestAvg) {
      bestAvg = avg;
      bestTime = time;
    }
  }

  return bestTime;
}

/**
 * Detect triggers - what precedes bad days
 */
function detectTriggers(records: CheckinRecord[]): TriggerType[] {
  const triggers: TriggerType[] = [];

  // Sort by date
  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));

  // Check for sleep-mood correlation
  const sleepValues: number[] = [];
  const moodValues: number[] = [];
  for (const r of sorted) {
    if (r.sleep > 0) {
      sleepValues.push(r.sleep);
      moodValues.push(r.mood);
    }
  }
  const sleepMoodCorr = pearsonCorrelation(sleepValues, moodValues);
  if (sleepMoodCorr > 0.3) {
    triggers.push("lack_of_sleep");
  }

  // Check for activity-mood correlation
  const activityValues: number[] = [];
  for (const r of sorted) {
    if (r.activity > 0) {
      activityValues.push(r.activity);
    }
  }
  const activityMoodCorr = pearsonCorrelation(activityValues, moodValues.slice(-activityValues.length));
  if (activityMoodCorr > 0.3) {
    triggers.push("no_exercise");
  }

  // Check social isolation pattern
  const socialValues: number[] = [];
  for (const r of sorted) {
    socialValues.push(r.social);
  }
  const socialMoodCorr = pearsonCorrelation(socialValues, moodValues.slice(-socialValues.length));
  if (socialMoodCorr > 0.3) {
    triggers.push("social_isolation");
  }

  // Check for weekend isolation (social drops on weekends)
  const weekendSocial: number[] = [];
  const weekdaySocial: number[] = [];
  for (const r of sorted) {
    const dayIndex = DAY_NAMES.indexOf(r.dayOfWeek.toLowerCase());
    if (dayIndex === 0 || dayIndex === 6) {
      weekendSocial.push(r.social);
    } else {
      weekdaySocial.push(r.social);
    }
  }
  const avgWeekend = weekendSocial.length > 0
    ? weekendSocial.reduce((a, b) => a + b, 0) / weekendSocial.length
    : 5;
  const avgWeekday = weekdaySocial.length > 0
    ? weekdaySocial.reduce((a, b) => a + b, 0) / weekdaySocial.length
    : 5;
  if (avgWeekend < avgWeekday - 2) {
    triggers.push("weekend_isolation");
  }

  // Check for Monday blues
  const mondayMoods: number[] = [];
  const otherDayMoods: number[] = [];
  for (const r of sorted) {
    if (r.dayOfWeek.toLowerCase() === "monday") {
      mondayMoods.push(r.mood);
    } else {
      otherDayMoods.push(r.mood);
    }
  }
  const avgMonday = mondayMoods.length > 0
    ? mondayMoods.reduce((a, b) => a + b, 0) / mondayMoods.length
    : 5;
  const avgOther = otherDayMoods.length > 0
    ? otherDayMoods.reduce((a, b) => a + b, 0) / otherDayMoods.length
    : 5;
  if (avgMonday < avgOther - 1.5 && mondayMoods.length >= 2) {
    triggers.push("monday_blues");
  }

  // Check for poor circadian (high variance in check-in times)
  const hours = sorted.map((r) => r.hourOfDay);
  const hourVariance = calculateVariance(hours);
  if (hourVariance > 8) {
    triggers.push("poor_circadian");
  }

  return triggers;
}

function calculateVariance(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / values.length;
}

/**
 * Detect trends by comparing recent vs older periods
 */
function detectTrends(
  records: CheckinRecord[],
  days: number = 14
): Pick<UserProfileTrends, "moodDirection" | "sleepDirection" | "anxietyDirection" | "socialDirection" | "streakHealth"> {
  if (records.length < 4) {
    return {
      moodDirection: "stable",
      sleepDirection: "stable",
      anxietyDirection: "stable",
      socialDirection: "stable",
      streakHealth: 50,
    };
  }

  const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date)); // newest first
  const midpoint = Math.floor(sorted.length / 2);
  const recent = sorted.slice(0, midpoint);
  const older = sorted.slice(midpoint);

  const avgRecent = (arr: CheckinRecord[], field: keyof CheckinRecord) =>
    arr.length > 0 ? arr.reduce((acc, r) => acc + (Number(r[field]) || 0), 0) / arr.length : 5;
  const avgOlder = (arr: CheckinRecord[], field: keyof CheckinRecord) =>
    arr.length > 0 ? arr.reduce((acc, r) => acc + (Number(r[field]) || 0), 0) / arr.length : 5;

  const recentMood = avgRecent(recent, "mood");
  const olderMood = avgOlder(older, "mood");
  const moodDiff = recentMood - olderMood;

  const recentSleep = avgRecent(recent, "sleep");
  const olderSleep = avgOlder(older, "sleep");
  const sleepDiff = recentSleep - olderSleep;

  const recentAnxiety = avgRecent(recent, "anxiety");
  const olderAnxiety = avgOlder(older, "anxiety");
  const anxietyDiff = recentAnxiety - olderAnxiety;

  const recentSocial = avgRecent(recent, "social");
  const olderSocial = avgOlder(older, "social");
  const socialDiff = recentSocial - olderSocial;

  // Calculate streak (consecutive days with check-in)
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    const dateStr = checkDate.toISOString().split("T")[0];
    const hasCheckin = sorted.some((r) => r.date === dateStr);
    if (hasCheckin) {
      streak++;
    } else if (i > 0) {
      break; // allow today to be missing
    }
  }

  // Calculate streak health score (0-100)
  // Based on: consistency (did they check in regularly?) and recency
  const expectedCheckins = Math.min(days, 30);
  const actualCheckins = sorted.length;
  const consistency = Math.min(100, (actualCheckins / expectedCheckins) * 100);
  const streakHealth = Math.round(consistency);

  return {
    moodDirection: moodDiff > 0.5 ? "improving" : moodDiff < -0.5 ? "declining" : "stable",
    sleepDirection: sleepDiff > 0.5 ? "improving" : sleepDiff < -0.5 ? "declining" : "stable",
    anxietyDirection: anxietyDiff > 0.5 ? "improving" : anxietyDiff < -0.5 ? "declining" : "stable",
    socialDirection: socialDiff > 0.5 ? "improving" : socialDiff < -0.5 ? "declining" : "stable",
    streakHealth,
  };
}

/**
 * Main pattern detection function
 */
export function detectPatterns(records: CheckinRecord[], days: number = 30): PatternAnalysis {
  if (records.length === 0) {
    return {
      patterns: {
        bestDays: [],
        worstDays: [],
        bestTimeOfDay: "morning",
        triggers: [],
        sleepMoodCorrelation: 0,
        activityMoodCorrelation: 0,
        anxietySleepCorrelation: 0,
        socialMoodCorrelation: 0,
      },
      trends: {
        moodDirection: "stable",
        sleepDirection: "stable",
        anxietyDirection: "stable",
        socialDirection: "stable",
        streakHealth: 0,
        consecutiveCheckins: 0,
        lastCheckinDate: null,
      },
    };
  }

  // Calculate correlations
  const sleepValues = records.map((r) => r.sleep);
  const moodValues = records.map((r) => r.mood);
  const activityValues = records.map((r) => r.activity);
  const socialValues = records.map((r) => r.social);
  const anxietyValues = records.map((r) => r.anxiety);

  const sleepMoodCorr = pearsonCorrelation(sleepValues, moodValues);
  const activityMoodCorr = pearsonCorrelation(activityValues, moodValues);
  const anxietySleepCorr = pearsonCorrelation(anxietyValues, sleepValues);
  const socialMoodCorr = pearsonCorrelation(socialValues, moodValues);

  // Detect patterns
  const { bestDays, worstDays } = detectDayPatterns(records);
  const bestTimeOfDay = detectTimePatterns(records);
  const triggers = detectTriggers(records);
  const trends = detectTrends(records, days);

  // Sort by date for streak calculation
  const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date));

  return {
    patterns: {
      bestDays,
      worstDays,
      bestTimeOfDay,
      triggers,
      sleepMoodCorrelation: Math.round(sleepMoodCorr * 100) / 100,
      activityMoodCorrelation: Math.round(activityMoodCorr * 100) / 100,
      anxietySleepCorrelation: Math.round(anxietySleepCorr * 100) / 100,
      socialMoodCorrelation: Math.round(socialMoodCorr * 100) / 100,
    },
    trends: {
      ...trends,
      consecutiveCheckins: records.length,
      lastCheckinDate: sorted[0]?.date || null,
    },
  };
}

export { pearsonCorrelation };
