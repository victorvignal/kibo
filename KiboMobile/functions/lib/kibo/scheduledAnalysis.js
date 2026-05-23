"use strict";
/**
 * Scheduled Analysis - Kibo
 * Runs periodic analysis on all active users
 *
 * Schedule: every 6 hours (6am and 6pm recommended)
 * Also runs a deep weekly analysis on Sundays
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
exports.triggerAnalysis = exports.scheduledWeeklyDeep = exports.scheduledAnalysisDaily = exports.scheduledAnalysis6h = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const analyzeUserData_1 = require("./analyzeUserData");
const db = admin.firestore();
/**
 * Analyze all active patients
 * Returns summary of analyses performed
 */
async function analyzeAllActiveUsers(batchSize = 50) {
    const result = {
        analyzed: 0,
        failed: 0,
        highRisk: [],
        mediumRisk: [],
    };
    // Get all patients
    const patientsSnapshot = await db.collection("patients").get();
    functions.logger.info(`Starting scheduled analysis for ${patientsSnapshot.size} patients`);
    for (const patientDoc of patientsSnapshot.docs) {
        const patientId = patientDoc.id;
        const patientData = patientDoc.data();
        // Skip inactive patients
        if (patientData.status === "inactive")
            continue;
        try {
            const profile = await (0, analyzeUserData_1.analyzeUserData)(patientId, 30);
            if (profile) {
                result.analyzed++;
                if (profile.chatContext.riskLevel === "high" || profile.chatContext.riskLevel === "critical") {
                    result.highRisk.push(patientId);
                }
                else if (profile.chatContext.riskLevel === "medium") {
                    result.mediumRisk.push(patientId);
                }
                // Update patient's risk level in patients collection if significantly different
                const currentRisk = patientData.riskLevel || "low";
                const newRisk = profile.chatContext.riskLevel;
                if (newRisk === "high" && currentRisk !== "high") {
                    await db.collection("patients").doc(patientId).update({
                        riskLevel: "high",
                        status: "at_risk",
                        lastActive: admin.firestore.FieldValue.serverTimestamp(),
                    });
                    // Create alert for psychologist
                    await createRiskAlert(patientId, patientData.therapistId, profile);
                }
                // Update patient last active timestamp
                await db.collection("patients").doc(patientId).update({
                    lastActive: admin.firestore.FieldValue.serverTimestamp(),
                });
            }
        }
        catch (error) {
            functions.logger.error(`Failed to analyze patient ${patientId}:`, error);
            result.failed++;
        }
        // Batch sleep to avoid overwhelming Firestore
        if (result.analyzed % batchSize === 0) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
    }
    return result;
}
/**
 * Create risk alert for psychologist when patient risk increases
 */
async function createRiskAlert(patientId, therapistId, profile) {
    const severity = profile.chatContext.riskLevel === "critical"
        ? "high"
        : profile.chatContext.riskLevel === "high"
            ? "high"
            : "medium";
    const message = profile.chatContext.riskLevel === "critical"
        ? `RISICO CRÍTICO detectado. ${profile.chatContext.keyInsight}`
        : `Risco elevado detectado. ${profile.chatContext.keyInsight}`;
    await db.collection("alerts").add({
        patientId,
        therapistId: therapistId || null,
        type: "risk_increase",
        severity,
        message,
        recommendation: profile.recommendations.prioritized[0] || "Contato imediato recomendado",
        acknowledged: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        source: "kibo_analysis",
        profileSnapshot: {
            riskLevel: profile.chatContext.riskLevel,
            trend: profile.trends.moodDirection,
            streakHealth: profile.trends.streakHealth,
        },
    });
}
/**
 * Deep weekly analysis - runs comprehensive 90-day analysis
 */
async function runWeeklyDeepAnalysis() {
    const result = { analyzed: 0, failed: 0, newPatterns: 0 };
    const patientsSnapshot = await db.collection("patients").get();
    functions.logger.info(`Starting weekly deep analysis for ${patientsSnapshot.size} patients`);
    for (const patientDoc of patientsSnapshot.docs) {
        const patientId = patientDoc.id;
        try {
            // Deep analysis with 90 days of data
            const profile = await (0, analyzeUserData_1.analyzeUserData)(patientId, 90);
            if (profile) {
                result.analyzed++;
                if (profile.scoring.coherenceScore > 60) {
                    result.newPatterns++;
                }
            }
        }
        catch (error) {
            functions.logger.error(`Weekly analysis failed for ${patientId}:`, error);
            result.failed++;
        }
        // Rate limit
        await new Promise((resolve) => setTimeout(resolve, 500));
    }
    return result;
}
// ============================================================================
// Scheduled Functions
// ============================================================================
/**
 * Runs every 6 hours - quick analysis of active patients
 */
exports.scheduledAnalysis6h = functions.pubsub
    .schedule("every 6 hours")
    .onRun(async () => {
    functions.logger.info("Starting scheduled 6h analysis");
    try {
        const result = await analyzeAllActiveUsers();
        functions.logger.info("Scheduled analysis complete", {
            analyzed: result.analyzed,
            failed: result.failed,
            highRisk: result.highRisk.length,
            mediumRisk: result.mediumRisk.length,
        });
        // Send summary to Firebase Analytics / monitoring
        if (result.highRisk.length > 0) {
            functions.logger.warn("High risk patients detected:", result.highRisk);
        }
    }
    catch (error) {
        functions.logger.error("Scheduled analysis failed:", error);
    }
    return null;
});
/**
 * Runs daily at 6am - comprehensive daily analysis
 */
exports.scheduledAnalysisDaily = functions.pubsub
    .schedule("every 24 hours")
    .onRun(async () => {
    functions.logger.info("Starting daily analysis");
    try {
        const result = await analyzeAllActiveUsers(30); // smaller batch for daily
        // Log for monitoring
        functions.logger.info("Daily analysis complete", {
            analyzed: result.analyzed,
            failed: result.failed,
            highRisk: result.highRisk.length,
            mediumRisk: result.mediumRisk.length,
        });
        // Store analysis summary in a dedicated doc
        await db.collection("kiboMetrics").add({
            type: "daily_analysis",
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            ...result,
        });
    }
    catch (error) {
        functions.logger.error("Daily analysis failed:", error);
    }
    return null;
});
/**
 * Runs every Sunday at 7am - deep weekly analysis with 90-day window
 */
exports.scheduledWeeklyDeep = functions.pubsub
    .schedule("every Sunday 07:00")
    .timeZone("America/Sao_Paulo")
    .onRun(async () => {
    functions.logger.info("Starting weekly deep analysis");
    try {
        const result = await runWeeklyDeepAnalysis();
        functions.logger.info("Weekly deep analysis complete", result);
        await db.collection("kiboMetrics").add({
            type: "weekly_deep_analysis",
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            ...result,
        });
    }
    catch (error) {
        functions.logger.error("Weekly deep analysis failed:", error);
    }
    return null;
});
/**
 * HTTP endpoint to manually trigger analysis for a specific patient
 */
exports.triggerAnalysis = functions.https.onRequest(async (req, res) => {
    // Only allow POST
    if (req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" });
        return;
    }
    const { patientId, days } = req.body || {};
    if (!patientId) {
        res.status(400).json({ error: "patientId required" });
        return;
    }
    try {
        const profile = await (0, analyzeUserData_1.analyzeUserData)(patientId, days || 30);
        if (!profile) {
            res.status(404).json({ error: "Not enough data for analysis" });
            return;
        }
        res.json({
            success: true,
            profile: {
                riskLevel: profile.chatContext.riskLevel,
                summary: profile.chatContext.summary,
                keyInsight: profile.chatContext.keyInsight,
                trends: profile.trends,
                scoring: profile.scoring,
            },
        });
    }
    catch (error) {
        functions.logger.error("Manual analysis failed:", error);
        res.status(500).json({ error: "Analysis failed" });
    }
});
//# sourceMappingURL=scheduledAnalysis.js.map