"use strict";
/**
 * Kibo User Data Analysis - Cloud Function
 * Triggered by: Firestore onCreate of checkin, or scheduled
 *
 * Analyzes user's last 30 days of data and generates/updates UserProfile
 */
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
exports.getUserProfile = exports.analyzeUser = exports.onCheckinAnalyze = void 0;
exports.analyzeUserData = analyzeUserData;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-admin/firestore");
const patternDetector_1 = require("./patternDetector");
const db = admin.firestore();
// Environment config
const OPENROUTER_API_KEY = functions.config().openrouter?.api_key ||
    process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = functions.config().openrouter?.model ||
    process.env.OPENROUTER_MODEL ||
    "google/gemini-2.0-flash-exp";
/**
 * Fetch last N days of check-in data for a user
 */
async function fetchUserCheckins(userId, days = 30) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const snapshot = await db
        .collection("checkins")
        .where("patientId", "==", userId)
        .where("timestamp", ">=", admin.firestore.Timestamp.fromDate(cutoff))
        .orderBy("timestamp", "desc")
        .get();
    const records = [];
    for (const doc of snapshot.docs) {
        const data = doc.data();
        const timestamp = data.timestamp?.toDate?.() || new Date();
        const dayOfWeek = DAY_NAMES[timestamp.getDay()];
        records.push({
            date: timestamp.toISOString().split("T")[0],
            dayOfWeek,
            hourOfDay: timestamp.getHours(),
            mood: data.mood ?? 5,
            sleep: data.sleep ?? 5,
            anxiety: data.anxiety ?? 5,
            activity: data.activity ?? 5,
            social: data.social ?? 5,
            stress: data.stress ?? 5,
        });
    }
    return records;
}
const DAY_NAMES = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
];
/**
 * Generate personalized recommendations based on patterns
 */
function generateRecommendations(patterns, trends, recentRecords) {
    const prioritized = [];
    const sleep = [];
    const activity = [];
    const social = [];
    const mindfulness = [];
    const personalizedChallenges = [];
    // Risk-based prioritization
    if (trends.moodDirection === "declining") {
        prioritized.push("Humor em declínio detectado. Recomendamos contato próximo esta semana.");
        personalizedChallenges.push("Manter check-ins diários durante período difícil");
    }
    if (trends.sleepDirection === "declining") {
        sleep.push("Sono piorando - implementar higiene do sono");
        personalizedChallenges.push("Estabelecer horário fixo para dormir");
    }
    if (trends.anxietyDirection === "declining") {
        mindfulness.push("Ansiedade aumentando - introduzir exercícios de respiração");
        personalizedChallenges.push("Praticar técnica 5-4-3-2-1 diariamente");
    }
    // Trigger-based recommendations
    if (patterns.triggers.includes("lack_of_sleep")) {
        sleep.push("Sono afetando seu humor - priorize descanso");
        mindfulness.push("Técnicas de relaxamento antes de dormir");
    }
    if (patterns.triggers.includes("social_isolation")) {
        social.push("Isolamento detectado - tente uma interação social breve hoje");
        personalizedChallenges.push("Iniciar pelo menos uma conversa por dia");
    }
    if (patterns.triggers.includes("no_exercise")) {
        activity.push("Atividade física está correlacionada com seu bem-estar");
        personalizedChallenges.push("Incluir 15min de movimento no dia");
    }
    if (patterns.triggers.includes("weekend_isolation")) {
        social.push("Fins de semana são desafiadores - planeje atividade social");
        personalizedChallenges.push("Agendar atividade prazerosa para o fim de semana");
    }
    // Trend-based
    if (patterns.sleepMoodCorrelation > 0.5) {
        sleep.push("Sono forte preditor do seu humor - cuide do descanso");
    }
    if (patterns.activityMoodCorrelation > 0.4) {
        activity.push("Exercício físico melhora seu humor significativamente");
    }
    // Best days exploitation
    if (patterns.bestDays.length > 0) {
        const bestDays = patterns.bestDays.join(" e ");
        mindfulness.push(`Seus melhores dias são ${bestDays} - aproveite para atividades importantes`);
    }
    // Add general recommendations if lists are short
    if (sleep.length === 0) {
        sleep.push("Manter rotina de sono consistente");
    }
    if (activity.length === 0) {
        activity.push("Manter nível de atividade física regular");
    }
    if (social.length === 0) {
        social.push("Manter conexões sociais ativas");
    }
    if (mindfulness.length === 0) {
        mindfulness.push("Praticar atenção plena diariamente");
    }
    return { prioritized, sleep, activity, social, mindfulness, personalizedChallenges };
}
/**
 * Build chat context for Kibo AI
 */
function buildChatContext(patterns, trends, recentRecords) {
    // Determine risk level
    let riskLevel = "low";
    if (trends.moodDirection === "declining" && trends.streakHealth < 50) {
        riskLevel = "high";
    }
    else if (trends.moodDirection === "declining" || trends.sleepDirection === "declining") {
        riskLevel = "medium";
    }
    else if (trends.moodDirection === "improving" && trends.streakHealth > 70) {
        riskLevel = "low";
    }
    // Find most concerning trigger
    let mainTrigger = "";
    if (patterns.triggers.length > 0) {
        mainTrigger = patterns.triggers[0];
    }
    // Build summary
    let summary = "";
    if (riskLevel === "high") {
        summary = `Usuário em risco ELEVADO - ${trends.moodDirection === "declining" ? "humor em queda" : "indicadores em declínio"}. `;
    }
    else if (riskLevel === "medium") {
        summary = `Usuário em risco MODERADO - ${patterns.bestDays.length > 0 ? `melhores dias: ${patterns.bestDays.join(", ")}` : "padrões identificados"}. `;
    }
    else {
        summary = "Usuário estável. ";
    }
    if (mainTrigger) {
        summary += `Gatilho principal identificado: ${mainTrigger.replace(/_/g, " ")}.`;
    }
    // Key insight
    let keyInsight = "";
    if (patterns.sleepMoodCorrelation > 0.5) {
        keyInsight = "Sono é seu maior influenciador de humor";
    }
    else if (patterns.activityMoodCorrelation > 0.4) {
        keyInsight = "Atividade física é strongly correlacionada com seu bem-estar";
    }
    else if (patterns.socialMoodCorrelation > 0.4) {
        keyInsight = "Interação social tem forte impacto no seu humor";
    }
    else if (patterns.bestDays.length > 0) {
        keyInsight = `${patterns.bestDays[0]} é seu melhor dia - aproveite para atividades importantes`;
    }
    else {
        keyInsight = "Continue mantendo a rotina de check-ins";
    }
    // Worst day alert
    const worstDayAlert = patterns.worstDays.length > 0
        ? `Cuidado com ${patterns.worstDays.join(" e ")} - são seus dias mais desafiadores`
        : "Mantenha vigilância com seus dias menos favoráveis";
    // Trigger warning
    const triggerWarning = mainTrigger.length > 0
        ? `Atenção: ${mainTrigger.replace(/_/g, " ")} detectado como fator de risco`
        : "Nenhum gatilho principal identificado";
    return {
        summary,
        riskLevel,
        keyInsight,
        bestDayForEngagement: patterns.bestDays.length > 0 ? patterns.bestDays[0] : "saturday",
        worstDayAlert,
        triggerWarning,
    };
}
/**
 * Generate AI summary using LLM (optional enhancement)
 */
async function generateAISummary(patterns, trends, records) {
    if (!OPENROUTER_API_KEY) {
        return buildDefaultSummary(patterns, trends);
    }
    try {
        const prompt = `Analise os dados de check-in de um paciente e gere um resumo clínico conciso:

Dados (últimos 30 dias):
- Check-ins: ${records.length}
- Humor: ${trends.moodDirection}
- Sono: ${trends.sleepDirection}
- Ansiedade: ${trends.anxietyDirection}
- Social: ${trends.socialDirection}
- Gatilhos: ${patterns.triggers.join(", ") || "nenhum identificado"}
- Correlação sono-hum: ${patterns.sleepMoodCorrelation}
- Correlação atividade-hum: ${patterns.activityMoodCorrelation}
- Melhores dias: ${patterns.bestDays.join(", ") || "não identificado"}

Gere um resumo de 2-3 frases em português brasileiro para um psicólogo, destacando o mais importante.`;
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${OPENROUTER_API_KEY}`,
                "HTTP-Referer": "https://kibo.app",
                "X-Title": "Kibo AI",
            },
            body: JSON.stringify({
                model: OPENROUTER_MODEL,
                messages: [{ role: "user", content: prompt }],
                max_tokens: 200,
                temperature: 0.5,
            }),
        });
        if (!response.ok) {
            throw new Error(`OpenRouter error: ${response.status}`);
        }
        const data = (await response.json());
        return data.choices?.[0]?.message?.content || buildDefaultSummary(patterns, trends);
    }
    catch (error) {
        console.error("AI summary generation failed:", error);
        return buildDefaultSummary(patterns, trends);
    }
}
function buildDefaultSummary(patterns, trends) {
    const direction = trends.moodDirection === "improving"
        ? "em melhora"
        : trends.moodDirection === "declining"
            ? "em declínio"
            : "estável";
    const trigger = patterns.triggers.length > 0
        ? ` Gatilho identificado: ${patterns.triggers[0].replace(/_/g, " ")}.`
        : "";
    return `Paciente ${direction}.${trigger} Sequência de check-ins: ${trends.streakHealth}% consistente.`;
}
/**
 * Main analysis function - analyzes user data and saves UserProfile
 */
async function analyzeUserData(userId, days = 30) {
    functions.logger.info(`Analyzing data for user: ${userId}`);
    // Fetch check-in data
    const records = await fetchUserCheckins(userId, days);
    if (records.length < 3) {
        functions.logger.info(`Not enough data for user ${userId} (${records.length} records)`);
        return null;
    }
    // Run pattern detection
    const { patterns, trends } = (0, patternDetector_1.detectPatterns)(records, days);
    // Generate recommendations
    const recommendations = generateRecommendations(patterns, trends, records);
    // Build chat context
    const chatContext = buildChatContext(patterns, trends, records);
    // Calculate scoring
    const coherenceScore = calculateCoherenceScore(records);
    const aiConfidence = Math.min(0.95, 0.5 + records.length * 0.02); // More data = more confidence
    // Generate AI summary (or fallback)
    const summary = await generateAISummary(patterns, trends, records);
    chatContext.summary = summary;
    // Build UserProfile
    const profile = {
        userId,
        updatedAt: firestore_1.Timestamp.now(),
        patterns,
        trends,
        recommendations,
        scoring: {
            coherenceScore,
            aiConfidence,
            dataPointsAnalyzed: records.length,
            analysisWindowDays: days,
        },
        chatContext,
    };
    // Save to Firestore
    const profileRef = db
        .collection("users")
        .doc(userId)
        .collection("profile")
        .doc("weekly");
    await profileRef.set(profile, { merge: true });
    functions.logger.info(`Profile saved for user ${userId}`, {
        dataPoints: records.length,
        coherenceScore,
        aiConfidence,
        riskLevel: chatContext.riskLevel,
    });
    return profile;
}
function calculateCoherenceScore(records) {
    if (records.length < 3)
        return 20;
    const dataScore = Math.min(40, records.length * 4);
    return Math.min(100, dataScore + 30 + 30);
}
// ============================================================================
// Cloud Function: Triggered on new check-in
// ============================================================================
exports.onCheckinAnalyze = functions.firestore
    .document("checkins/{checkinId}")
    .onCreate(async (snap) => {
    const data = snap.data();
    const userId = data.patientId;
    if (!userId) {
        functions.logger.warn("Check-in without patientId, skipping analysis");
        return null;
    }
    try {
        const profile = await analyzeUserData(userId, 30);
        if (profile) {
            functions.logger.info(`Analysis complete for ${userId}, risk: ${profile.chatContext.riskLevel}`);
        }
        return null;
    }
    catch (error) {
        functions.logger.error("Analysis failed:", error);
        return null;
    }
});
// ============================================================================
// Cloud Function: HTTP callable for on-demand analysis
// ============================================================================
exports.analyzeUser = functions.https.onCall(async (request) => {
    const userId = request.data.userId || request.auth?.uid;
    if (!userId) {
        throw new functions.https.HttpsError("unauthenticated", "userId required");
    }
    const days = request.data.days || 30;
    try {
        const profile = await analyzeUserData(userId, days);
        if (!profile) {
            return {
                success: false,
                message: "Not enough data to generate profile",
            };
        }
        return {
            success: true,
            profile,
        };
    }
    catch (error) {
        functions.logger.error("Analysis failed:", error);
        throw new functions.https.HttpsError("internal", "Analysis failed");
    }
});
// ============================================================================
// Cloud Function: Get user profile for Kibo chat context injection
// ============================================================================
exports.getUserProfile = functions.https.onCall(async (request) => {
    const userId = request.data.userId || request.auth?.uid;
    if (!userId) {
        throw new functions.https.HttpsError("unauthenticated", "userId required");
    }
    try {
        const profileRef = db
            .collection("users")
            .doc(userId)
            .collection("profile")
            .doc("weekly");
        const snap = await profileRef.get();
        if (!snap.exists) {
            return { exists: false };
        }
        const data = snap.data();
        return {
            exists: true,
            profile: {
                riskLevel: data?.chatContext?.riskLevel,
                summary: data?.chatContext?.summary,
                keyInsight: data?.chatContext?.keyInsight,
                bestDay: data?.chatContext?.bestDayForEngagement,
                worstDayAlert: data?.chatContext?.worstDayAlert,
                triggerWarning: data?.chatContext?.triggerWarning,
                patterns: data?.patterns,
                trends: data?.trends,
                recommendations: data?.recommendations,
                coherenceScore: data?.scoring?.coherenceScore,
                aiConfidence: data?.scoring?.aiConfidence,
            },
        };
    }
    catch (error) {
        functions.logger.error("Get profile failed:", error);
        throw new functions.https.HttpsError("internal", "Failed to get profile");
    }
});
//# sourceMappingURL=analyzeUserData.js.map