/**
 * Predictive Risk Analysis Service
 *
 * Analyzes patient data to predict risk levels and generate
 * actionable risk explanations for psychologists.
 */

import type { DailyData, Patient } from "@/types";

export interface RiskPrediction {
  patientId: string;
  riskLevel: "low" | "medium" | "high";
  confidenceScore: number; // 0-1, how confident is the model
  riskFactors: RiskFactor[];
  protectiveFactors: ProtectiveFactor[];
  predictionExplanation: string;
  trend: "improving" | "stable" | "worsening";
  daysAtRisk: number;
}

export interface RiskFactor {
  type: "sleep" | "activity" | "social" | "mood" | "anxiety" | "checkin_gap";
  severity: "mild" | "moderate" | "severe";
  description: string;
  daysDetected: number;
  contributionScore: number; // How much this factor contributes to overall risk (0-1)
}

export interface ProtectiveFactor {
  type: "consistency" | "social" | "activity" | "sleep" | "mood";
  description: string;
  strength: "weak" | "moderate" | "strong";
}

// Classification thresholds
const THRESHOLDS = {
  mood: { low: 7, medium: 5, high: 3 }, // Average mood score
  sleep: { low: 7, medium: 5.5, high: 4 }, // Hours of sleep
  anxiety: { low: 3, medium: 5, high: 7 }, // Anxiety score (inverted - higher is worse)
  activity: { low: 6, medium: 4, high: 2 }, // Activity score
  social: { low: 60, medium: 40, high: 20 }, // Social interaction score (0-100)
  checkinGap: { low: 2, medium: 4, high: 7 }, // Days without check-in
};

/**
 * Predict risk level for a patient based on their historical data
 */
export function predictRisk(
  patientId: string,
  dailyData: DailyData[],
  patient?: Partial<Patient>
): RiskPrediction {
  const riskFactors: RiskFactor[] = [];
  const protectiveFactors: ProtectiveFactor[] = [];

  if (dailyData.length === 0) {
    return {
      patientId,
      riskLevel: "medium",
      confidenceScore: 0.3,
      riskFactors: [],
      protectiveFactors: [],
      predictionExplanation: "Dados insuficientes para análise de risco. Incentivar check-ins regulares.",
      trend: "stable",
      daysAtRisk: 0,
    };
  }

  // Sort by date ascending
  const sorted = [...dailyData].sort((a, b) => a.date.localeCompare(b.date));
  const recent7 = sorted.slice(-7);
  const recent14 = sorted.slice(-14);

  // Calculate averages
  const avgMood7 = recent7.reduce((sum, d) => sum + d.features.moodScore, 0) / Math.max(1, recent7.length);
  const avgSleep7 = recent7.reduce((sum, d) => sum + d.features.sleepDuration, 0) / Math.max(1, recent7.length);
  const avgAnxiety7 = recent7.reduce((sum, d) => sum + d.features.anxietyScore, 0) / Math.max(1, recent7.length);
  const avgActivity7 = recent7.reduce((sum, d) => sum + d.features.physicalActivity, 0) / Math.max(1, recent7.length);
  const avgSocial7 = recent7.reduce((sum, d) => sum + d.features.socialInteractionScore, 0) / Math.max(1, recent7.length);

  // Calculate trend (compare last 7 vs previous 7)
  let moodTrend = 0;
  let sleepTrend = 0;
  let anxietyTrend = 0;
  let socialTrend = 0;

  if (recent14.length >= 7 && recent7.length >= 3) {
    const older7 = recent14.slice(0, 7);
    moodTrend = avgMood7 - (older7.reduce((sum, d) => sum + d.features.moodScore, 0) / Math.max(1, older7.length));
    sleepTrend = avgSleep7 - (older7.reduce((sum, d) => sum + d.features.sleepDuration, 0) / Math.max(1, older7.length));
    anxietyTrend = avgAnxiety7 - (older7.reduce((sum, d) => sum + d.features.anxietyScore, 0) / Math.max(1, older7.length));
    socialTrend = avgSocial7 - (older7.reduce((sum, d) => sum + d.features.socialInteractionScore, 0) / Math.max(1, older7.length));
  }

  // Determine trend direction
  const overallTrend: "improving" | "stable" | "worsening" =
    moodTrend > 0.5 || sleepTrend > 0.5
      ? "improving"
      : moodTrend < -0.5 || sleepTrend < -0.5 || anxietyTrend > 0.5
      ? "worsening"
      : "stable";

  // ── Risk Factor Analysis ──────────────────────────────────────────────────

  // Sleep risk
  if (avgSleep7 < THRESHOLDS.sleep.high) {
    const daysPoorSleep = recent7.filter(d => d.features.sleepDuration < THRESHOLDS.sleep.high).length;
    riskFactors.push({
      type: "sleep",
      severity: avgSleep7 < THRESHOLDS.sleep.high - 1 ? "severe" : daysPoorSleep >= 5 ? "moderate" : "mild",
      description: `Sono persistentemente baixo: média de ${avgSleep7.toFixed(1)}h por noite`,
      daysDetected: daysPoorSleep,
      contributionScore: Math.min(1, daysPoorSleep / 7 * 1.5),
    });
  } else if (avgSleep7 >= THRESHOLDS.sleep.low) {
    protectiveFactors.push({
      type: "sleep",
      description: "Sono dentro dos parâmetros recomendados",
      strength: avgSleep7 >= 7.5 ? "strong" : "moderate",
    });
  }

  // Mood risk
  if (avgMood7 < THRESHOLDS.mood.high) {
    const daysLowMood = recent7.filter(d => d.features.moodScore < THRESHOLDS.mood.high).length;
    riskFactors.push({
      type: "mood",
      severity: avgMood7 < THRESHOLDS.mood.high - 1 ? "severe" : daysLowMood >= 5 ? "moderate" : "mild",
      description: `Humor persistentemente baixo: média de ${avgMood7.toFixed(1)}/10`,
      daysDetected: daysLowMood,
      contributionScore: Math.min(1, daysLowMood / 7 * 1.8),
    });
  } else if (avgMood7 >= THRESHOLDS.mood.low) {
    protectiveFactors.push({
      type: "mood",
      description: "Humor estável e dentro da faixa saudável",
      strength: avgMood7 >= 7 ? "strong" : "moderate",
    });
  }

  // Anxiety risk
  if (avgAnxiety7 > THRESHOLDS.anxiety.high) {
    const daysHighAnxiety = recent7.filter(d => d.features.anxietyScore > THRESHOLDS.anxiety.high).length;
    riskFactors.push({
      type: "anxiety",
      severity: avgAnxiety7 > THRESHOLDS.anxiety.high + 1 ? "severe" : daysHighAnxiety >= 5 ? "moderate" : "mild",
      description: `Ansiedade elevada: média de ${avgAnxiety7.toFixed(1)}/10`,
      daysDetected: daysHighAnxiety,
      contributionScore: Math.min(1, daysHighAnxiety / 7 * 1.5),
    });
  }

  // Activity risk
  if (avgActivity7 < THRESHOLDS.activity.high) {
    const daysLowActivity = recent7.filter(d => d.features.physicalActivity < THRESHOLDS.activity.medium).length;
    riskFactors.push({
      type: "activity",
      severity: avgActivity7 < THRESHOLDS.activity.high - 1 ? "severe" : daysLowActivity >= 5 ? "moderate" : "mild",
      description: `Atividade física reduzida: média de ${avgActivity7.toFixed(1)}/10`,
      daysDetected: daysLowActivity,
      contributionScore: Math.min(1, daysLowActivity / 7 * 1.2),
    });
  } else if (avgActivity7 >= THRESHOLDS.activity.low) {
    protectiveFactors.push({
      type: "activity",
      description: "Níveis adequados de atividade física",
      strength: avgActivity7 >= 7 ? "strong" : "moderate",
    });
  }

  // Social risk
  if (avgSocial7 < THRESHOLDS.social.high) {
    const daysLowSocial = recent7.filter(d => d.features.socialInteractionScore < THRESHOLDS.social.medium).length;
    riskFactors.push({
      type: "social",
      severity: avgSocial7 < THRESHOLDS.social.high - 10 ? "severe" : daysLowSocial >= 5 ? "moderate" : "mild",
      description: `Socialização baixa: média de ${avgSocial7.toFixed(0)}/100`,
      daysDetected: daysLowSocial,
      contributionScore: Math.min(1, daysLowSocial / 7 * 1.3),
    });
  } else if (avgSocial7 >= THRESHOLDS.social.low) {
    protectiveFactors.push({
      type: "social",
      description: "Boa rede de suporte social",
      strength: avgSocial7 >= 70 ? "strong" : "moderate",
    });
  }

  // Check-in gap risk
  const lastEntry = sorted[sorted.length - 1];
  const daysSinceLastCheckin = Math.floor(
    (Date.now() - new Date(lastEntry.date).getTime()) / 86400000
  );
  if (daysSinceLastCheckin >= THRESHOLDS.checkinGap.medium) {
    riskFactors.push({
      type: "checkin_gap",
      severity: daysSinceLastCheckin >= THRESHOLDS.checkinGap.high ? "severe" : "moderate",
      description: `Sem check-in há ${daysSinceLastCheckin} dia(s)`,
      daysDetected: daysSinceLastCheckin,
      contributionScore: Math.min(1, daysSinceLastCheckin / 14 * 2),
    });
  } else if (daysSinceLastCheckin <= 1) {
    protectiveFactors.push({
      type: "consistency",
      description: "Check-ins regulares e consistentes",
      strength: "strong",
    });
  }

  // ── Calculate Overall Risk Score ──────────────────────────────────────────
  const totalRiskContribution = riskFactors.reduce((sum, f) => sum + f.contributionScore, 0);
  const riskScore = Math.min(1, totalRiskContribution / 3); // Normalize to 0-1

  // Adjust based on trend
  let adjustedRiskScore = riskScore;
  if (overallTrend === "worsening") {
    adjustedRiskScore = Math.min(1, riskScore * 1.3);
  } else if (overallTrend === "improving") {
    adjustedRiskScore = Math.max(0, riskScore * 0.7);
  }

  // Determine risk level
  let riskLevel: "low" | "medium" | "high";
  let confidenceScore: number;

  if (adjustedRiskScore >= 0.6) {
    riskLevel = "high";
    confidenceScore = Math.min(0.95, 0.6 + riskFactors.length * 0.08);
  } else if (adjustedRiskScore >= 0.35) {
    riskLevel = "medium";
    confidenceScore = Math.min(0.9, 0.5 + riskFactors.length * 0.06);
  } else {
    riskLevel = "low";
    confidenceScore = Math.min(0.85, 0.4 + protectiveFactors.length * 0.1);
  }

  // Generate explanation
  const topRiskFactors = riskFactors
    .sort((a, b) => b.contributionScore - a.contributionScore)
    .slice(0, 2);

  let predictionExplanation: string;
  if (topRiskFactors.length === 0) {
    predictionExplanation = "Nenhum fator de risco significativo identificado. Paciente estável.";
  } else {
    const reasons = topRiskFactors.map(f => {
      switch (f.type) {
        case "sleep": return `sono em queda há ${f.daysDetected} dias`;
        case "mood": return `humor baixo há ${f.daysDetected} dias`;
        case "anxiety": return `ansiedade elevada há ${f.daysDetected} dias`;
        case "social": return `isolamento social há ${f.daysDetected} dias`;
        case "activity": return `atividade física reduzida há ${f.daysDetected} dias`;
        case "checkin_gap": return `sem check-in há ${f.daysDetected} dias`;
        default: return f.description;
      }
    });
    predictionExplanation = `Risco elevado porque: ${reasons.join(" + ")}.`;
  }

  const daysAtRisk = riskFactors.reduce((max, f) => Math.max(max, f.daysDetected), 0);

  return {
    patientId,
    riskLevel,
    confidenceScore: Math.round(confidenceScore * 100) / 100,
    riskFactors: riskFactors.sort((a, b) => b.contributionScore - a.contributionScore),
    protectiveFactors,
    predictionExplanation,
    trend: overallTrend,
    daysAtRisk,
  };
}

/**
 * Get color for risk level
 */
export function getRiskColor(level: "low" | "medium" | "high"): string {
  switch (level) {
    case "low": return "#059669";
    case "medium": return "#D97706";
    case "high": return "#DC2626";
  }
}

/**
 * Get label for risk level
 */
export function getRiskLabel(level: "low" | "medium" | "high"): string {
  switch (level) {
    case "low": return "Baixo";
    case "medium": return "Médio";
    case "high": return "Alto";
  }
}

/**
 * Get background color for risk level
 */
export function getRiskBgColor(level: "low" | "medium" | "high"): string {
  switch (level) {
    case "low": return "#D4EDDA";
    case "medium": return "#FEF3C7";
    case "high": return "#FEE2E2";
  }
}
