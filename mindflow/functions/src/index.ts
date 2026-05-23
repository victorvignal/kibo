import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

const db = admin.firestore();

// ─── Types ───────────────────────────────────────────────────────────────────

interface BehavioralFeatures {
  moodScore: number;
  sleepDuration: number;
  anxietyScore: number;
  physicalActivity: number;
  socialInteractionScore: number;
}

interface DailyData {
  id: string;
  patientId: string;
  date: string;
  features: BehavioralFeatures;
}

interface CheckinData {
  patientId: string;
  mood?: number;
  anxiety?: number;
  sleep?: number;
  activity?: number;
  social?: number;
  timestamp?: admin.firestore.Timestamp;
  colorSelected?: string;
  hesitationMs?: number;
}

interface UserProfile {
  userId: string;
  updatedAt: admin.firestore.Timestamp;
  patterns: {
    bestDays: string[];
    worstDays: string[];
    bestTimeOfDay: string;
    triggers: string[];
    sleepMoodCorrelation: number;
    activityMoodCorrelation: number;
    anxietySleepCorrelation: number;
    socialMoodCorrelation: number;
  };
  trends: {
    moodDirection: "improving" | "stable" | "declining";
    sleepDirection: "improving" | "stable" | "declining";
    anxietyDirection: "improving" | "stable" | "declining";
    socialDirection: "improving" | "stable" | "declining";
    streakHealth: number;
    consecutiveCheckins: number;
    lastCheckinDate: string | null;
  };
  recommendations: {
    prioritized: string[];
    sleep: string[];
    activity: string[];
    social: string[];
    mindfulness: string[];
    personalizedChallenges: string[];
  };
  scoring: {
    coherenceScore: number;
    aiConfidence: number;
    dataPointsAnalyzed: number;
    analysisWindowDays: number;
  };
  chatContext: {
    summary: string;
    riskLevel: "low" | "medium" | "high" | "critical";
    keyInsight: string;
    bestDayForEngagement: string;
    worstDayAlert: string;
    triggerWarning: string;
  };
}

// ─── Pattern Analysis Engine ─────────────────────────────────────────────────

function analyzePatterns(dailyData: DailyData[]): UserProfile["patterns"] {
  if (dailyData.length < 3) {
    return {
      bestDays: [], worstDays: [], bestTimeOfDay: "unknown",
      triggers: [], sleepMoodCorrelation: 0, activityMoodCorrelation: 0,
      anxietySleepCorrelation: 0, socialMoodCorrelation: 0,
    };
  }

  const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const dayScores: Record<string, number[]> = {
    sunday: [], monday: [], tuesday: [], wednesday: [],
    thursday: [], friday: [], saturday: [],
  };

  for (const d of dailyData) {
    const date = new Date(d.date);
    const day = dayNames[date.getDay()];
    if (dayScores[day]) dayScores[day].push(d.features.moodScore);
  }

  const avgByDay = (arr: number[]) =>
    arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 5;

  const dayAverages = dayNames.map((day) => ({ day, avg: avgByDay(dayScores[day] || []) }));
  dayAverages.sort((a, b) => b.avg - a.avg);

  const bestDays = dayAverages.slice(0, 2).map((d) => d.day);
  const worstDays = dayAverages.slice(-2).map((d) => d.day);

  const correlation = (keyA: keyof BehavioralFeatures, keyB: keyof BehavioralFeatures): number => {
    const n = dailyData.length;
    if (n < 2) return 0;
    const sumA = dailyData.reduce((s, d) => s + d.features[keyA], 0);
    const sumB = dailyData.reduce((s, d) => s + d.features[keyB], 0);
    const sumProduct = dailyData.reduce((s, d) => s + d.features[keyA] * d.features[keyB], 0);
    const sumASq = dailyData.reduce((s, d) => s + d.features[keyA] ** 2, 0);
    const sumBSq = dailyData.reduce((s, d) => s + d.features[keyB] ** 2, 0);
    const num = sumProduct - (sumA * sumB) / n;
    const den = Math.sqrt((sumASq - (sumA ** 2) / n) * (sumBSq - (sumB ** 2) / n));
    return den !== 0 ? Math.round((num / den) * 100) / 100 : 0;
  };

  const sleepMoodCorr = correlation("sleepDuration", "moodScore");
  const activityMoodCorr = correlation("physicalActivity", "moodScore");
  const anxietySleepCorr = correlation("anxietyScore", "sleepDuration");
  const socialMoodCorr = correlation("socialInteractionScore", "moodScore");

  const triggers: string[] = [];
  if (sleepMoodCorr < -0.3) triggers.push("poor_sleep_affects_mood");
  if (activityMoodCorr < -0.3) triggers.push("lack_of_activity");
  if (socialMoodCorr < -0.3) triggers.push("social_isolation");
  if (anxietySleepCorr < -0.3) triggers.push("anxiety_disrupts_sleep");

  return {
    bestDays, worstDays, bestTimeOfDay: "afternoon", triggers,
    sleepMoodCorrelation: sleepMoodCorr, activityMoodCorrelation: activityMoodCorr,
    anxietySleepCorrelation: anxietySleepCorr, socialMoodCorrelation: socialMoodCorr,
  };
}

function analyzeTrends(dailyData: DailyData[]): UserProfile["trends"] {
  if (dailyData.length < 7) {
    return {
      moodDirection: "stable", sleepDirection: "stable",
      anxietyDirection: "stable", socialDirection: "stable",
      streakHealth: Math.min(100, Math.round((dailyData.length / 30) * 100)),
      consecutiveCheckins: dailyData.length,
      lastCheckinDate: dailyData[0]?.date ?? null,
    };
  }

  const mid = Math.floor(dailyData.length / 2);
  const recent = dailyData.slice(0, Math.min(7, mid));
  const older = dailyData.slice(mid, mid + 7);

  const avg = (key: keyof BehavioralFeatures, data: DailyData[]) =>
    data.length > 0 ? data.reduce((s, d) => s + d.features[key], 0) / data.length : 5;

  const diff = (r: number, o: number): "improving" | "stable" | "declining" => {
    const d = r - o;
    if (d > 0.5) return "improving";
    if (d < -0.5) return "declining";
    return "stable";
  };

  return {
    moodDirection: diff(avg("moodScore", recent), avg("moodScore", older)),
    sleepDirection: diff(avg("sleepDuration", recent), avg("sleepDuration", older)),
    anxietyDirection: diff(avg("anxietyScore", older), avg("anxietyScore", recent)),
    socialDirection: diff(avg("socialInteractionScore", recent), avg("socialInteractionScore", older)),
    streakHealth: Math.min(100, Math.round((dailyData.length / 30) * 100)),
    consecutiveCheckins: dailyData.length,
    lastCheckinDate: dailyData[0]?.date ?? null,
  };
}

function generateRecommendations(
  patterns: UserProfile["patterns"],
  trends: UserProfile["trends"]
): UserProfile["recommendations"] {
  const prioritized: string[] = [];
  const sleep: string[] = [];
  const activity: string[] = [];
  const social: string[] = [];
  const mindfulness: string[] = [];
  const personalizedChallenges: string[] = [];

  if (patterns.sleepMoodCorrelation < 0) {
    sleep.push("Sono impacta humor diretamente — priorize descanso");
    sleep.push("Routine noturna: evitar telas 1h antes de dormir");
  }
  if (patterns.activityMoodCorrelation < 0.3) {
    activity.push("Exercício físico eleva mood — mesmo 20min conta");
    personalizedChallenges.push("Desafio Movimento: 20min/dia, 7 dias");
  }
  if (patterns.socialMoodCorrelation < 0.3) {
    social.push("Interação social, mesmo breve, melhora humor");
    personalizedChallenges.push("Desafio Social: conversa >5min por dia");
  }

  mindfulness.push("5-min de respiração focada reduz ansiedade em 40%");
  mindfulness.push("Body scan antes de dormir melhora qualidade do sono");

  if (trends.moodDirection === "declining") prioritized.push("Atenção ao humor — tendência de queda");
  if (trends.sleepDirection === "declining") prioritized.push("Sono em queda — priorize descanso");
  if (trends.anxietyDirection === "declining") prioritized.push("Ansiedade aumentando");
  if (trends.socialDirection === "declining") prioritized.push("Isolamento social aumentando");

  return { prioritized, sleep, activity, social, mindfulness, personalizedChallenges };
}

function buildChatContext(
  patterns: UserProfile["patterns"],
  trends: UserProfile["trends"],
  dailyData: DailyData[]
): UserProfile["chatContext"] {
  const recent = dailyData.slice(0, 5);
  const avgMood = recent.length > 0
    ? recent.reduce((s, d) => s + d.features.moodScore, 0) / recent.length : 5;

  let riskLevel: "low" | "medium" | "high" | "critical" = "low";
  if (avgMood < 3) riskLevel = "critical";
  else if (avgMood < 4) riskLevel = "high";
  else if (avgMood < 5.5) riskLevel = "medium";

  if (trends.moodDirection === "declining" && riskLevel !== "critical") {
    riskLevel = riskLevel === "low" ? "medium" : "high";
  }

  const bestDay = patterns.bestDays[0] || "domingo";
  const worstDay = patterns.worstDays[0] || "segunda-feira";

  const summary = `Paciente em ${riskLevel} risco. Humor médio: ${avgMood.toFixed(1)}/10. Melhor dia: ${bestDay}. Tendência: ${trends.moodDirection}.`;

  let keyInsight = `Correção sono-humor: ${patterns.sleepMoodCorrelation}.`;
  if (patterns.sleepMoodCorrelation < 0) {
    keyInsight = `Sono e humor correlacionados (${patterns.sleepMoodCorrelation}). Melhorar sono = melhorar humor.`;
  } else if (patterns.activityMoodCorrelation > 0.3) {
    keyInsight = `Atividade física tem forte impacto positivo no humor.`;
  } else {
    keyInsight = `Principal gatilho identificado.`;
  }

  const triggerWarning = patterns.triggers.length > 0
    ? `Alerta: ${patterns.triggers.join(", ")} detectados.` : "Nenhum gatilho claro identificado.";

  return {
    summary, riskLevel, keyInsight,
    bestDayForEngagement: bestDay, worstDayAlert: worstDay, triggerWarning,
  };
}

// ─── Core Analysis ──────────────────────────────────────────────────────────

async function analyzeUser(patientId: string, windowDays: number = 30): Promise<UserProfile | null> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - windowDays);

  const dailyDataSnap = await db.collection("dailyData")
    .where("patientId", "==", patientId)
    .orderBy("date", "desc")
    .get();

  const dailyData: DailyData[] = dailyDataSnap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() } as DailyData))
    .filter((d) => new Date(d.date) >= cutoff);

  if (dailyData.length < 2) return null;

  const patterns = analyzePatterns(dailyData);
  const trends = analyzeTrends(dailyData);
  const recommendations = generateRecommendations(patterns, trends);
  const chatContext = buildChatContext(patterns, trends, dailyData);

  const coherenceScore = Math.min(100, Math.round((dailyData.length / windowDays) * 100));
  const aiConfidence = Math.min(0.99, 0.3 + (dailyData.length / windowDays) * 0.5);

  const profile: UserProfile = {
    userId: patientId, updatedAt: admin.firestore.Timestamp.now(),
    patterns, trends, recommendations,
    scoring: { coherenceScore, aiConfidence, dataPointsAnalyzed: dailyData.length, analysisWindowDays: windowDays },
    chatContext,
  };

  await db.doc(`users/${patientId}/profile/weekly`).set(profile, { merge: true });
  console.log(`[Kibo] ${patientId}: updated. Confidence=${aiConfidence.toFixed(2)}`);

  return profile;
}

// ─── Firebase Cloud Functions (v7 API) ──────────────────────────────────────

/**
 * Fires on every new check-in document.
 */
export const onCheckinCreated = functions.firestore.onDocumentCreated(
  "checkins/{checkinId}",
  async (event) => {
    if (!event.data) return;
    const checkin = event.data.data() as CheckinData;
    if (!checkin.patientId) return;
    console.log(`[Trigger] New check-in for ${checkin.patientId}`);
    await analyzeUser(checkin.patientId, 30);
  }
);

/**
 * Scheduled: runs every day at 6am and 6pm (America/Sao_Paulo).
 */
export const scheduledAnalysis = functions.scheduler.onSchedule(
  { schedule: "0 6,18 * * *", timeZone: "America/Sao_Paulo" },
  async () => {
    console.log("[Scheduled] Kibo analysis — 6am/6pm batch");

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const activeCheckins = await db.collection("checkins")
      .where("timestamp", ">", admin.firestore.Timestamp.fromDate(sevenDaysAgo))
      .get();

    const patientIds = new Set<string>();
    activeCheckins.docs.forEach((doc) => {
      const data = doc.data() as CheckinData;
      if (data.patientId) patientIds.add(data.patientId);
    });

    console.log(`[Scheduled] Analyzing ${patientIds.size} users`);

    const results = await Promise.allSettled(
      Array.from(patientIds).map((id) => analyzeUser(id, 30))
    );

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    console.log(`[Scheduled] Done. Succeeded: ${succeeded}/${patientIds.size}`);
  }
);

/**
 * HTTP callable: analyze a specific user on demand.
 */
export const analyzeUserHttp = functions.https.onCall(async (request) => {
  const patientId = request.data?.patientId as string | undefined;
  if (!patientId) {
    throw new functions.https.HttpsError("invalid-argument", "patientId is required");
  }

  const profile = await analyzeUser(patientId, 30);
  if (!profile) {
    throw new functions.https.HttpsError("not-found", "Insufficient data for analysis");
  }

  return profile;
});
