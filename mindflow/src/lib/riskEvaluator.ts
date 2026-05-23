/**
 * Client-side Risk Evaluator
 *
 * Analyzes patient check-in data in the browser to generate real-time alerts.
 * Complements Firestore alerts (which require Cloud Functions to create server-side).
 *
 * This runs entirely client-side so psychologists get immediate alerts
 * without needing Cloud Functions deployed.
 */

import type { DailyData, ClinicaAlert } from "@/types";

export interface RiskAlert {
  id: string; // prefixed with "local_" to distinguish from Firestore alerts
  patientId: string;
  type: ClinicaAlert["type"];
  severity: ClinicaAlert["severity"];
  message: string;
  recommendation: string;
  createdAt: Date;
  acknowledged: boolean;
  isLocal: true; // distinguishes from server-side alerts
}

interface CheckinRecord {
  date: string;
  mood: number;
  sleep: number;
  anxiety: number;
  activity: number;
  social: number;
}

/** Analyze daily data and generate client-side risk alerts */
export function evaluatePatientRisk(
  patientId: string,
  dailyData: DailyData[]
): RiskAlert[] {
  const alerts: RiskAlert[] = [];

  if (dailyData.length === 0) return alerts;

  // Sort by date ascending (oldest first)
  const sorted = [...dailyData].sort((a, b) => a.date.localeCompare(b.date));
  const recent7 = sorted.slice(-7);
  const recent3 = sorted.slice(-3);

  if (recent7.length === 0) return alerts;

  // ── Risk 1: Low mood average in last 7 days ───────────────────────────────
  const avgMood7 =
    recent7.reduce((sum, d) => sum + d.features.moodScore, 0) / recent7.length;

  if (avgMood7 < 3) {
    alerts.push({
      id: `local_${patientId}_lowmood_${Date.now()}`,
      patientId,
      type: "risk_increase",
      severity: "high",
      message: `Humor persistentemente baixo: média ${avgMood7.toFixed(1)}/10 nos últimos 7 dias.`,
      recommendation: "Entrar em contato com o paciente. Considerar ajuste de plano terapêutico.",
      createdAt: new Date(),
      acknowledged: false,
      isLocal: true,
    });
  } else if (avgMood7 < 5) {
    alerts.push({
      id: `local_${patientId}_lowmood_${Date.now()}`,
      patientId,
      type: "risk_increase",
      severity: "medium",
      message: `Humor abaixo do ideal: média ${avgMood7.toFixed(1)}/10 nos últimos 7 dias.`,
      recommendation: "Monitorar de perto. Discutir no próximo atendimento.",
      createdAt: new Date(),
      acknowledged: false,
      isLocal: true,
    });
  }

  // ── Risk 2: High anxiety average ───────────────────────────────────────────
  const avgAnxiety7 =
    recent7.reduce((sum, d) => sum + d.features.anxietyScore, 0) / recent7.length;

  if (avgAnxiety7 >= 8) {
    alerts.push({
      id: `local_${patientId}_highanxiety_${Date.now()}`,
      patientId,
      type: "risk_increase",
      severity: "high",
      message: `Ansiedade elevada persistente: média ${avgAnxiety7.toFixed(1)}/10 nos últimos 7 dias.`,
      recommendation: "Ansiedade alta requer atenção. Considerar técnicas de regulação emocional na sessão.",
      createdAt: new Date(),
      acknowledged: false,
      isLocal: true,
    });
  } else if (avgAnxiety7 >= 6) {
    alerts.push({
      id: `local_${patientId}_highanxiety_${Date.now()}`,
      patientId,
      type: "risk_increase",
      severity: "medium",
      message: `Ansiedade elevada: média ${avgAnxiety7.toFixed(1)}/10 nos últimos 7 dias.`,
      recommendation: "Aplicar escalas de ansiedade na próxima sessão.",
      createdAt: new Date(),
      acknowledged: false,
      isLocal: true,
    });
  }

  // ── Risk 3: Declining mood trend (recent worse than older) ──────────────────
  if (recent7.length >= 4 && recent3.length >= 2) {
    const olderPeriod = recent7.slice(0, recent7.length - recent3.length);
    const olderAvg =
      olderPeriod.reduce((sum, d) => sum + d.features.moodScore, 0) /
      (olderPeriod.length || 1);
    const recentAvg =
      recent3.reduce((sum, d) => sum + d.features.moodScore, 0) /
      recent3.length;

    const moodDrop = olderAvg - recentAvg;

    if (moodDrop >= 2) {
      alerts.push({
        id: `local_${patientId}_mooddrop_${Date.now()}`,
        patientId,
        type: "sentiment_shift",
        severity: "high",
        message: `Queda acentuada de humor detectada: média caiu de ${olderAvg.toFixed(1)} para ${recentAvg.toFixed(1)}/10.`,
        recommendation: "Investigação imediata necessária. Entrar em contato com o paciente.",
        createdAt: new Date(),
        acknowledged: false,
        isLocal: true,
      });
    } else if (moodDrop >= 1) {
      alerts.push({
        id: `local_${patientId}_mooddrop_${Date.now()}`,
        patientId,
        type: "sentiment_shift",
        severity: "medium",
        message: `Humor em declínio: média caiu de ${olderAvg.toFixed(1)} para ${recentAvg.toFixed(1)}/10.`,
        recommendation: "Acompanhamento mais próximo recomendado.",
        createdAt: new Date(),
        acknowledged: false,
        isLocal: true,
      });
    }
  }

  // ── Risk 4: Poor sleep ────────────────────────────────────────────────────
  const avgSleep7 =
    recent7.reduce((sum, d) => sum + d.features.sleepDuration, 0) /
    recent7.length;

  if (avgSleep7 < 4) {
    alerts.push({
      id: `local_${patientId}_poorsleep_${Date.now()}`,
      patientId,
      type: "sleep_disturbance",
      severity: "high",
      message: `Sono severamente comprometido: média de ${avgSleep7.toFixed(1)}h por noite (últimos 7 dias).`,
      recommendation: "Sono < 4h está associado a risco. Investigar causas e considerar encaminhamento.",
      createdAt: new Date(),
      acknowledged: false,
      isLocal: true,
    });
  } else if (avgSleep7 < 5.5) {
    alerts.push({
      id: `local_${patientId}_poorsleep_${Date.now()}`,
      patientId,
      type: "sleep_disturbance",
      severity: "medium",
      message: `Sono abaixo do ideal: média de ${avgSleep7.toFixed(1)}h por noite (últimos 7 dias).`,
      recommendation: "Higiene do sono pode ser um tópico a explorar na sessão.",
      createdAt: new Date(),
      acknowledged: false,
      isLocal: true,
    });
  }

  // ── Risk 5: Social isolation ───────────────────────────────────────────────
  const avgSocial7 =
    recent7.reduce((sum, d) => sum + d.features.socialInteractionScore, 0) /
    recent7.length;

  if (avgSocial7 < 20) {
    alerts.push({
      id: `local_${patientId}_isolation_${Date.now()}`,
      patientId,
      type: "social_isolation",
      severity: "medium",
      message: `Isolamento social detectado: pontuação média de ${avgSocial7.toFixed(0)}/100 (últimos 7 dias).`,
      recommendation: "Explorar fatores de isolamento na sessão. Considerar intervenções de redes de apoio.",
      createdAt: new Date(),
      acknowledged: false,
      isLocal: true,
    });
  }

  // ── Risk 6: Low physical activity ───────────────────────────────────────
  const avgActivity7 =
    recent7.reduce((sum, d) => sum + d.features.physicalActivity, 0) /
    recent7.length;

  if (avgActivity7 < 2) {
    alerts.push({
      id: `local_${patientId}_lowactivity_${Date.now()}`,
      patientId,
      type: "activity_decline",
      severity: "medium",
      message: `Atividade física muito baixa: média de ${avgActivity7.toFixed(1)}/10 nos últimos 7 dias.`,
      recommendation: "Sedentarismo agrava sintomas depressivos. Encouraging micro-movimentos.",
      createdAt: new Date(),
      acknowledged: false,
      isLocal: true,
    });
  }

  // ── Risk 7: Missed check-ins (data gap detection) ────────────────────────
  if (dailyData.length >= 3) {
    const lastEntry = sorted[sorted.length - 1];
    const daysSinceLastCheckin = Math.floor(
      (Date.now() - new Date(lastEntry.date).getTime()) / 86400000
    );

    if (daysSinceLastCheckin >= 3) {
      alerts.push({
        id: `local_${patientId}_missedcheckin_${Date.now()}`,
        patientId,
        type: "checkin_due",
        severity: daysSinceLastCheckin >= 7 ? "high" : "medium",
        message: `Paciente sem check-in há ${daysSinceLastCheckin} dia(s). Último registro: ${new Date(lastEntry.date).toLocaleDateString("pt-BR")}.`,
        recommendation: daysSinceLastCheckin >= 7
          ? "Contato imediato recomendado. Risco de desengajamento terapêutico."
          : "Verificar contato. Pode indicar desmotivação ou melhora.",
        createdAt: new Date(),
        acknowledged: false,
        isLocal: true,
      });
    }
  }

  return alerts;
}

/**
 * Evaluate all patients for a psychologist and return merged alerts
 * (real-time client-side + any existing Firestore alerts).
 */
export async function generateRealtimeAlerts(
  patients: Array<{ id: string }>,
  getPatientDataFn: (patientId: string, days: number) => Promise<DailyData[]>
): Promise<RiskAlert[]> {
  const allAlerts: RiskAlert[] = [];

  // Evaluate up to 5 patients in parallel (avoid overwhelming the browser)
  const toEvaluate = patients.slice(0, 5);
  const results = await Promise.allSettled(
    toEvaluate.map(async (p) => {
      const data = await getPatientDataFn(p.id, 14);
      return evaluatePatientRisk(p.id, data);
    })
  );

  for (const result of results) {
    if (result.status === "fulfilled") {
      allAlerts.push(...result.value);
    }
  }

  // Sort by severity (high first) then by date (newest first)
  const severityOrder: Record<ClinicaAlert["severity"], number> = {
    high: 0,
    medium: 1,
    low: 2,
  };

  return allAlerts.sort((a, b) => {
    const sevDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (sevDiff !== 0) return sevDiff;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}

/** Compute overall risk level from multiple alerts */
export function computeOverallRisk(
  alerts: RiskAlert[]
): "low" | "medium" | "high" {
  const unacknowledged = alerts.filter((a) => !a.acknowledged);
  if (unacknowledged.some((a) => a.severity === "high")) return "high";
  if (unacknowledged.length >= 3) return "medium";
  if (unacknowledged.length >= 1) return "low";
  return "low";
}
