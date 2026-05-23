"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeUserHttp = exports.scheduledAnalysis = exports.onCheckinCreated = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
const db = admin.firestore();
// ─── Pattern Analysis Engine ─────────────────────────────────────────────────
function analyzePatterns(dailyData) {
    if (dailyData.length < 3) {
        return {
            bestDays: [], worstDays: [], bestTimeOfDay: "unknown",
            triggers: [], sleepMoodCorrelation: 0, activityMoodCorrelation: 0,
            anxietySleepCorrelation: 0, socialMoodCorrelation: 0,
        };
    }
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const dayScores = {
        sunday: [], monday: [], tuesday: [], wednesday: [],
        thursday: [], friday: [], saturday: [],
    };
    for (const d of dailyData) {
        const date = new Date(d.date);
        const day = dayNames[date.getDay()];
        if (dayScores[day])
            dayScores[day].push(d.features.moodScore);
    }
    const avgByDay = (arr) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 5;
    const dayAverages = dayNames.map((day) => ({ day, avg: avgByDay(dayScores[day] || []) }));
    dayAverages.sort((a, b) => b.avg - a.avg);
    const bestDays = dayAverages.slice(0, 2).map((d) => d.day);
    const worstDays = dayAverages.slice(-2).map((d) => d.day);
    const correlation = (keyA, keyB) => {
        const n = dailyData.length;
        if (n < 2)
            return 0;
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
    const triggers = [];
    if (sleepMoodCorr < -0.3)
        triggers.push("poor_sleep_affects_mood");
    if (activityMoodCorr < -0.3)
        triggers.push("lack_of_activity");
    if (socialMoodCorr < -0.3)
        triggers.push("social_isolation");
    if (anxietySleepCorr < -0.3)
        triggers.push("anxiety_disrupts_sleep");
    return {
        bestDays, worstDays, bestTimeOfDay: "afternoon", triggers,
        sleepMoodCorrelation: sleepMoodCorr, activityMoodCorrelation: activityMoodCorr,
        anxietySleepCorrelation: anxietySleepCorr, socialMoodCorrelation: socialMoodCorr,
    };
}
function analyzeTrends(dailyData) {
    var _a, _b, _c, _d;
    if (dailyData.length < 7) {
        return {
            moodDirection: "stable", sleepDirection: "stable",
            anxietyDirection: "stable", socialDirection: "stable",
            streakHealth: Math.min(100, Math.round((dailyData.length / 30) * 100)),
            consecutiveCheckins: dailyData.length,
            lastCheckinDate: (_b = (_a = dailyData[0]) === null || _a === void 0 ? void 0 : _a.date) !== null && _b !== void 0 ? _b : null,
        };
    }
    const mid = Math.floor(dailyData.length / 2);
    const recent = dailyData.slice(0, Math.min(7, mid));
    const older = dailyData.slice(mid, mid + 7);
    const avg = (key, data) => data.length > 0 ? data.reduce((s, d) => s + d.features[key], 0) / data.length : 5;
    const diff = (r, o) => {
        const d = r - o;
        if (d > 0.5)
            return "improving";
        if (d < -0.5)
            return "declining";
        return "stable";
    };
    return {
        moodDirection: diff(avg("moodScore", recent), avg("moodScore", older)),
        sleepDirection: diff(avg("sleepDuration", recent), avg("sleepDuration", older)),
        anxietyDirection: diff(avg("anxietyScore", older), avg("anxietyScore", recent)),
        socialDirection: diff(avg("socialInteractionScore", recent), avg("socialInteractionScore", older)),
        streakHealth: Math.min(100, Math.round((dailyData.length / 30) * 100)),
        consecutiveCheckins: dailyData.length,
        lastCheckinDate: (_d = (_c = dailyData[0]) === null || _c === void 0 ? void 0 : _c.date) !== null && _d !== void 0 ? _d : null,
    };
}
function generateRecommendations(patterns, trends) {
    const prioritized = [];
    const sleep = [];
    const activity = [];
    const social = [];
    const mindfulness = [];
    const personalizedChallenges = [];
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
    if (trends.moodDirection === "declining")
        prioritized.push("Atenção ao humor — tendência de queda");
    if (trends.sleepDirection === "declining")
        prioritized.push("Sono em queda — priorize descanso");
    if (trends.anxietyDirection === "declining")
        prioritized.push("Ansiedade aumentando");
    if (trends.socialDirection === "declining")
        prioritized.push("Isolamento social aumentando");
    return { prioritized, sleep, activity, social, mindfulness, personalizedChallenges };
}
function buildChatContext(patterns, trends, dailyData) {
    const recent = dailyData.slice(0, 5);
    const avgMood = recent.length > 0
        ? recent.reduce((s, d) => s + d.features.moodScore, 0) / recent.length : 5;
    let riskLevel = "low";
    if (avgMood < 3)
        riskLevel = "critical";
    else if (avgMood < 4)
        riskLevel = "high";
    else if (avgMood < 5.5)
        riskLevel = "medium";
    if (trends.moodDirection === "declining" && riskLevel !== "critical") {
        riskLevel = riskLevel === "low" ? "medium" : "high";
    }
    const bestDay = patterns.bestDays[0] || "domingo";
    const worstDay = patterns.worstDays[0] || "segunda-feira";
    const summary = `Paciente em ${riskLevel} risco. Humor médio: ${avgMood.toFixed(1)}/10. Melhor dia: ${bestDay}. Tendência: ${trends.moodDirection}.`;
    let keyInsight = `Correção sono-humor: ${patterns.sleepMoodCorrelation}.`;
    if (patterns.sleepMoodCorrelation < 0) {
        keyInsight = `Sono e humor correlacionados (${patterns.sleepMoodCorrelation}). Melhorar sono = melhorar humor.`;
    }
    else if (patterns.activityMoodCorrelation > 0.3) {
        keyInsight = `Atividade física tem forte impacto positivo no humor.`;
    }
    else {
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
async function analyzeUser(patientId, windowDays = 30) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - windowDays);
    const dailyDataSnap = await db.collection("dailyData")
        .where("patientId", "==", patientId)
        .orderBy("date", "desc")
        .get();
    const dailyData = dailyDataSnap.docs
        .map((doc) => (Object.assign({ id: doc.id }, doc.data())))
        .filter((d) => new Date(d.date) >= cutoff);
    if (dailyData.length < 2)
        return null;
    const patterns = analyzePatterns(dailyData);
    const trends = analyzeTrends(dailyData);
    const recommendations = generateRecommendations(patterns, trends);
    const chatContext = buildChatContext(patterns, trends, dailyData);
    const coherenceScore = Math.min(100, Math.round((dailyData.length / windowDays) * 100));
    const aiConfidence = Math.min(0.99, 0.3 + (dailyData.length / windowDays) * 0.5);
    const profile = {
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
exports.onCheckinCreated = functions.firestore.onDocumentCreated("checkins/{checkinId}", async (event) => {
    if (!event.data)
        return;
    const checkin = event.data.data();
    if (!checkin.patientId)
        return;
    console.log(`[Trigger] New check-in for ${checkin.patientId}`);
    await analyzeUser(checkin.patientId, 30);
});
/**
 * Scheduled: runs every day at 6am and 6pm (America/Sao_Paulo).
 */
exports.scheduledAnalysis = functions.scheduler.onSchedule("0 6,18 * * *", "America/Sao_Paulo", async () => {
    console.log("[Scheduled] Kibo analysis — 6am/6pm batch");
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const activeCheckins = await db.collection("checkins")
        .where("timestamp", ">", admin.firestore.Timestamp.fromDate(sevenDaysAgo))
        .get();
    const patientIds = new Set();
    activeCheckins.docs.forEach((doc) => {
        const data = doc.data();
        if (data.patientId)
            patientIds.add(data.patientId);
    });
    console.log(`[Scheduled] Analyzing ${patientIds.size} users`);
    const results = await Promise.allSettled(Array.from(patientIds).map((id) => analyzeUser(id, 30)));
    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    console.log(`[Scheduled] Done. Succeeded: ${succeeded}/${patientIds.size}`);
});
/**
 * HTTP callable: analyze a specific user on demand.
 */
exports.analyzeUserHttp = functions.https.onCall(async (request) => {
    var _a;
    const patientId = (_a = request.data) === null || _a === void 0 ? void 0 : _a.patientId;
    if (!patientId) {
        throw new functions.https.HttpsError("invalid-argument", "patientId is required");
    }
    const profile = await analyzeUser(patientId, 30);
    if (!profile) {
        throw new functions.https.HttpsError("not-found", "Insufficient data for analysis");
    }
    return profile;
});
//# sourceMappingURL=index.js.map