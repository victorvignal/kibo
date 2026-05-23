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
            bestDays: [],
            worstDays: [],
            bestTimeOfDay: "unknown",
            triggers: [],
            sleepMoodCorrelation: 0,
            activityMoodCorrelation: 0,
            anxietySleepCorrelation: 0,
            socialMoodCorrelation: 0,
        };
    }
    // Day-of-week analysis
    const dayScores = {
        sunday: [], monday: [], tuesday: [], wednesday: [],
        thursday: [], friday: [], saturday: [],
    };
    const dayAnxiety = {
        sunday: [], monday: [], tuesday: [], wednesday: [],
        thursday: [], friday: [], saturday: [],
    };
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    for (const d of dailyData) {
        const date = new Date(d.date);
        const day = dayNames[date.getDay()];
        dayScores[day].push(d.features.moodScore);
        dayAnxiety[day].push(d.features.anxietyScore);
    }
    const avgByDay = (arr) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 5;
    const dayAverages = dayNames.map((day) => ({ day, avg: avgByDay(dayScores[day]) }));
    dayAverages.sort((a, b) => b.avg - a.avg);
    const bestDays = dayAverages.slice(0, 2).map((d) => d.day);
    const worstDays = dayAverages.slice(-2).map((d) => d.day);
    // Correlation: sleep vs mood
    const n = dailyData.length;
    const sumSleep = dailyData.reduce((s, d) => s + d.features.sleepDuration, 0);
    const sumMood = dailyData.reduce((s, d) => s + d.features.moodScore, 0);
    const sumProduct = dailyData.reduce((s, d) => s + d.features.sleepDuration * d.features.moodScore, 0);
    const sumSleepSq = dailyData.reduce((s, d) => s + d.features.sleepDuration ** 2, 0);
    const sumMoodSq = dailyData.reduce((s, d) => s + d.features.moodScore ** 2, 0);
    const num = sumProduct - (sumSleep * sumMood) / n;
    const den = Math.sqrt((sumSleepSq - (sumSleep ** 2) / n) * (sumMoodSq - (sumMood ** 2) / n));
    const sleepMoodCorrelation = den !== 0 ? Math.round((num / den) * 100) / 100 : 0;
    // Activity vs mood correlation
    const sumActivity = dailyData.reduce((s, d) => s + d.features.physicalActivity, 0);
    const sumActProduct = dailyData.reduce((s, d) => s + d.features.physicalActivity * d.features.moodScore, 0);
    const sumActSq = dailyData.reduce((s, d) => s + d.features.physicalActivity ** 2, 0);
    const numAct = sumActProduct - (sumActivity * sumMood) / n;
    const denAct = Math.sqrt((sumActSq - (sumActivity ** 2) / n) * (sumMoodSq - (sumMood ** 2) / n));
    const activityMoodCorrelation = denAct !== 0 ? Math.round((numAct / denAct) * 100) / 100 : 0;
    // Anxiety vs sleep correlation
    const sumAnx = dailyData.reduce((s, d) => s + d.features.anxietyScore, 0);
    const sumAnxProduct = dailyData.reduce((s, d) => s + d.features.anxietyScore * d.features.sleepDuration, 0);
    const sumAnxSq = dailyData.reduce((s, d) => s + d.features.anxietyScore ** 2, 0);
    const numAnx = sumAnxProduct - (sumAnx * sumSleep) / n;
    const denAnx = Math.sqrt((sumAnxSq - (sumAnx ** 2) / n) * (sumSleepSq - (sumSleep ** 2) / n));
    const anxietySleepCorrelation = denAnx !== 0 ? Math.round((numAnx / denAnx) * 100) / 100 : 0;
    // Social vs mood correlation
    const sumSocial = dailyData.reduce((s, d) => s + d.features.socialInteractionScore, 0);
    const sumSocialProduct = dailyData.reduce((s, d) => s + d.features.socialInteractionScore * d.features.moodScore, 0);
    const sumSocialSq = dailyData.reduce((s, d) => s + d.features.socialInteractionScore ** 2, 0);
    const numSocial = sumSocialProduct - (sumSocial * sumMood) / n;
    const denSocial = Math.sqrt((sumSocialSq - (sumSocial ** 2) / n) * (sumMoodSq - (sumMood ** 2) / n));
    const socialMoodCorrelation = denSocial !== 0 ? Math.round((numSocial / denSocial) * 100) / 100 : 0;
    // Best time of day (based on check-in timestamps if available)
    const bestTimeOfDay = "afternoon"; // default
    // Triggers detection
    const triggers = [];
    if (sleepMoodCorrelation < -0.3)
        triggers.push("poor_sleep_affects_mood");
    if (activityMoodCorrelation < -0.3)
        triggers.push("lack_of_activity");
    if (socialMoodCorrelation < -0.3)
        triggers.push("social_isolation");
    if (anxietySleepCorrelation < -0.3)
        triggers.push("anxiety_disrupts_sleep");
    return {
        bestDays,
        worstDays,
        bestTimeOfDay,
        triggers,
        sleepMoodCorrelation,
        activityMoodCorrelation,
        anxietySleepCorrelation,
        socialMoodCorrelation,
    };
}
function analyzeTrends(dailyData) {
    var _a, _b, _c, _d;
    if (dailyData.length < 7) {
        return {
            moodDirection: "stable",
            sleepDirection: "stable",
            anxietyDirection: "stable",
            socialDirection: "stable",
            streakHealth: 50,
            consecutiveCheckins: dailyData.length,
            lastCheckinDate: (_b = (_a = dailyData[0]) === null || _a === void 0 ? void 0 : _a.date) !== null && _b !== void 0 ? _b : null,
        };
    }
    const recent = dailyData.slice(0, Math.min(7, Math.floor(dailyData.length / 2)));
    const older = dailyData.slice(Math.min(7, Math.floor(dailyData.length / 2)));
    const avgRecent = (key) => recent.reduce((s, d) => s + d.features[key], 0) / recent.length;
    const avgOlder = (key) => older.reduce((s, d) => s + d.features[key], 0) / older.length;
    const diff = (recent, older) => recent - older;
    const trend = (r, o) => {
        const d = diff(r, o);
        if (d > 0.5)
            return "improving";
        if (d < -0.5)
            return "declining";
        return "stable";
    };
    const moodTrend = trend(avgRecent("moodScore"), avgOlder("moodScore"));
    const sleepTrend = trend(avgRecent("sleepDuration"), avgOlder("sleepDuration"));
    const anxietyTrend = trend(avgOlder("anxietyScore"), avgRecent("anxietyScore")); // inverted
    const socialTrend = trend(avgRecent("socialInteractionScore"), avgOlder("socialInteractionScore"));
    // Streak health: based on consistency of check-ins
    const streakHealth = Math.min(100, Math.round((dailyData.length / 30) * 100));
    return {
        moodDirection: moodTrend,
        sleepDirection: sleepTrend,
        anxietyDirection: anxietyTrend,
        socialDirection: socialTrend,
        streakHealth,
        consecutiveCheckins: dailyData.length,
        lastCheckinDate: (_d = (_c = dailyData[0]) === null || _c === void 0 ? void 0 : _c.date) !== null && _d !== void 0 ? _d : null,
    };
}
function generateRecommendations(patterns, trends, dailyData) {
    const prioritized = [];
    const sleep = [];
    const activity = [];
    const social = [];
    const mindfulness = [];
    const personalizedChallenges = [];
    // Sleep recommendations
    if (patterns.sleepMoodCorrelation < 0) {
        sleep.push("Melhore a qualidade do sono — impacto direto no humor");
        sleep.push("Routine noturna: evitar telas 1h antes de dormir");
        if (patterns.anxietySleepCorrelation < 0) {
            sleep.push("Técnica 4-7-8: inalar 4s, segurar 7s, exalar 8s antes de dormir");
        }
    }
    // Activity recommendations
    if (patterns.activityMoodCorrelation < 0.3) {
        activity.push("Exercício físico regular eleva mood — mesmo 20min conta");
        activity.push("Caminhada ao ar livre tem efeito ansiolítico");
        personalizedChallenges.push("Desafio Movimento: 20min de atividade por dia, 7 dias");
    }
    // Social recommendations
    if (patterns.socialMoodCorrelation < 0.3) {
        social.push("Interação social, mesmo breve, melhora humor");
        social.push("Uma conversa significativa por dia — meta alcançável");
        personalizedChallenges.push("Desafio Social: uma conversa >5min por dia");
    }
    // Mindfulness
    mindfulness.push("5-min de respiração focada reduz ansiedade em 40%");
    mindfulness.push("Body scan antes de dormir melhora qualidade do sono");
    // Prioritized based on trends
    const t = trends;
    if (t.moodDirection === "declining")
        prioritized.push("Atenção ao humor — tendência de queda");
    if (t.sleepDirection === "declining")
        prioritized.push("Sono em queda — priorize descanso");
    if (t.anxietyDirection === "declining")
        prioritized.push("Ansiedade aumentando — pratique técnicas de relaxamento");
    if (t.socialDirection === "declining")
        prioritized.push("Isolamento social aumentando — busque conexão");
    // Dynamic challenge based on weakest area
    const weakest = [t.moodDirection, t.sleepDirection, t.anxietyDirection, t.socialDirection]
        .filter((d) => d === "declining")[0];
    if (weakest === "declining") {
        personalizedChallenges.push("Comece com 3 dias: pequeño passo, grande impacto");
    }
    return { prioritized, sleep, activity, social, mindfulness, personalizedChallenges };
}
function buildChatContext(patterns, trends, recommendations, dailyData) {
    var _a, _b, _c, _d, _e, _f, _g;
    const recent = dailyData.slice(0, 5);
    const avgMood = recent.length > 0
        ? recent.reduce((s, d) => s + d.features.moodScore, 0) / recent.length
        : 5;
    // Determine risk level
    let riskLevel = "low";
    if (avgMood < 3)
        riskLevel = "critical";
    else if (avgMood < 4)
        riskLevel = "high";
    else if (avgMood < 5.5)
        riskLevel = "medium";
    // Worsening trend escalates risk
    if (trends.moodDirection === "declining" && riskLevel !== "critical") {
        riskLevel = riskLevel === "low" ? "medium" : "high";
    }
    const bestDay = (_b = (_a = patterns.bestDays) === null || _a === void 0 ? void 0 : _a[0]) !== null && _b !== void 0 ? _b : "domingo";
    const worstDay = (_d = (_c = patterns.worstDays) === null || _c === void 0 ? void 0 : _c[0]) !== null && _d !== void 0 ? _d : "segunda-feira";
    const trigger = (_f = (_e = patterns.triggers) === null || _e === void 0 ? void 0 : _e[0]) !== null && _f !== void 0 ? _f : "verifique padrões de sono";
    const summary = `Paciente em ${riskLevel} risco. Humor médio recente: ${avgMood.toFixed(1)}/10. Melhor dia: ${bestDay}. Tendência: ${trends.moodDirection}.`;
    const keyInsight = patterns.sleepMoodCorrelation < 0
        ? `Sono e humor fortemente correlacionados (${patterns.sleepMoodCorrelation}). Melhorar sono = melhorar humor.`
        : patterns.activityMoodCorrelation > 0.3
            ? `Atividade física tem forte impacto positivo no humor deste paciente.`
            : `Principal gatilho identificado: ${trigger}.`;
    const triggerWarning = ((_g = patterns.triggers) === null || _g === void 0 ? void 0 : _g.length) > 0
        ? `Alerta: ${patterns.triggers.join(", ")} detectados como gatilhos.`
        : "Nenhum gatilho claro identificado ainda.";
    return {
        summary,
        riskLevel,
        keyInsight,
        bestDayForEngagement: bestDay,
        worstDayAlert: worstDay,
        triggerWarning,
    };
}
// ─── Core Analysis Function ──────────────────────────────────────────────────
async function analyzeUser(patientId, windowDays = 30) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2;
    // Fetch daily data
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - windowDays);
    const dailyDataSnap = await db.collection("dailyData")
        .where("patientId", "==", patientId)
        .orderBy("date", "desc")
        .get();
    const dailyData = dailyDataSnap.docs
        .map((doc) => (Object.assign({ id: doc.id }, doc.data())))
        .filter((d) => new Date(d.date) >= cutoff);
    if (dailyData.length < 2) {
        console.log(`[Kibo Analysis] ${patientId}: insufficient data (${dailyData.length} days)`);
        return null;
    }
    // Run analysis
    const patterns = analyzePatterns(dailyData);
    const trends = analyzeTrends(dailyData);
    const recommendations = generateRecommendations(patterns, trends, dailyData);
    const chatContext = buildChatContext(patterns, trends, recommendations, dailyData);
    // Calculate coherence score
    const coherenceScore = Math.min(100, Math.round((dailyData.length / windowDays) * 100));
    const aiConfidence = Math.min(0.99, 0.3 + (dailyData.length / windowDays) * 0.5);
    const profile = {
        userId: patientId,
        updatedAt: admin.firestore.Timestamp.now(),
        patterns: {
            bestDays: (_a = patterns.bestDays) !== null && _a !== void 0 ? _a : [],
            worstDays: (_b = patterns.worstDays) !== null && _b !== void 0 ? _b : [],
            bestTimeOfDay: (_c = patterns.bestTimeOfDay) !== null && _c !== void 0 ? _c : "unknown",
            triggers: (_d = patterns.triggers) !== null && _d !== void 0 ? _d : [],
            sleepMoodCorrelation: (_e = patterns.sleepMoodCorrelation) !== null && _e !== void 0 ? _e : 0,
            activityMoodCorrelation: (_f = patterns.activityMoodCorrelation) !== null && _f !== void 0 ? _f : 0,
            anxietySleepCorrelation: (_g = patterns.anxietySleepCorrelation) !== null && _g !== void 0 ? _g : 0,
            socialMoodCorrelation: (_h = patterns.socialMoodCorrelation) !== null && _h !== void 0 ? _h : 0,
        },
        trends: {
            moodDirection: (_j = trends.moodDirection) !== null && _j !== void 0 ? _j : "stable",
            sleepDirection: (_k = trends.sleepDirection) !== null && _k !== void 0 ? _k : "stable",
            anxietyDirection: (_l = trends.anxietyDirection) !== null && _l !== void 0 ? _l : "stable",
            socialDirection: (_m = trends.socialDirection) !== null && _m !== void 0 ? _m : "stable",
            streakHealth: (_o = trends.streakHealth) !== null && _o !== void 0 ? _o : 50,
            consecutiveCheckins: (_p = trends.consecutiveCheckins) !== null && _p !== void 0 ? _p : 0,
            lastCheckinDate: (_q = trends.lastCheckinDate) !== null && _q !== void 0 ? _q : null,
        },
        recommendations: {
            prioritized: (_r = recommendations.prioritized) !== null && _r !== void 0 ? _r : [],
            sleep: (_s = recommendations.sleep) !== null && _s !== void 0 ? _s : [],
            activity: (_t = recommendations.activity) !== null && _t !== void 0 ? _t : [],
            social: (_u = recommendations.social) !== null && _u !== void 0 ? _u : [],
            mindfulness: (_v = recommendations.mindfulness) !== null && _v !== void 0 ? _v : [],
            personalizedChallenges: (_w = recommendations.personalizedChallenges) !== null && _w !== void 0 ? _w : [],
        },
        scoring: {
            coherenceScore,
            aiConfidence,
            dataPointsAnalyzed: dailyData.length,
            analysisWindowDays: windowDays,
        },
        chatContext: {
            summary: (_x = chatContext.summary) !== null && _x !== void 0 ? _x : "",
            riskLevel: (_y = chatContext.riskLevel) !== null && _y !== void 0 ? _y : "low",
            keyInsight: (_z = chatContext.keyInsight) !== null && _z !== void 0 ? _z : "",
            bestDayForEngagement: (_0 = chatContext.bestDayForEngagement) !== null && _0 !== void 0 ? _0 : "sunday",
            worstDayAlert: (_1 = chatContext.worstDayAlert) !== null && _1 !== void 0 ? _1 : "monday",
            triggerWarning: (_2 = chatContext.triggerWarning) !== null && _2 !== void 0 ? _2 : "",
        },
    };
    // Save to Firestore
    await db.doc(`users/${patientId}/profile/weekly`).set(profile, { merge: true });
    console.log(`[Kibo Analysis] ${patientId}: profile updated. Confidence: ${aiConfidence.toFixed(2)}`);
    return profile;
}
// ─── Triggered Functions ──────────────────────────────────────────────────────
/**
 * Runs every time a new check-in is created.
 * Analyzes the user's pattern and updates their profile.
 */
exports.onCheckinCreated = functions.firestore
    .document("checkins/{checkinId}")
    .onCreate(async (snap) => {
    const checkin = snap.data();
    if (!checkin.patientId)
        return;
    console.log(`[Trigger] New check-in for ${checkin.patientId}`);
    await analyzeUser(checkin.patientId, 30);
});
/**
 * Runs daily at 6am and 6pm (Brazil time: America/Sao_Paulo)
 * Refreshes all active user profiles.
 */
exports.scheduledAnalysis = functions.pubsub
    .schedule("0 6,18 * * *")
    .timeZone("America/Sao_Paulo")
    .onRun(async () => {
    console.log("[Scheduled] Running daily Kibo analysis at 6am/6pm");
    // Get all users with check-ins in the last 7 days
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
    console.log(`[Scheduled] Analyzing ${patientIds.size} active users`);
    const results = await Promise.allSettled(Array.from(patientIds).map((id) => analyzeUser(id, 30)));
    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;
    console.log(`[Scheduled] Analysis complete. Succeeded: ${succeeded}, Failed: ${failed}`);
    return null;
});
/**
 * Manual trigger: analyze a specific user via HTTP call.
 * POST /analyzeUser with body { patientId }
 */
exports.analyzeUserHttp = functions.https.onCall(async (data) => {
    const patientId = data === null || data === void 0 ? void 0 : data.patientId;
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