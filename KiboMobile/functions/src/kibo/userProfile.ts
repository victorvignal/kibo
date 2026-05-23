/**
 * Kibo User Profile Schema
 * Stored in Firestore at: users/{userId}/profile/weekly
 */

import { Timestamp } from "firebase-admin/firestore";

export interface UserProfilePatterns {
  bestDays: string[]; // ["saturday", "sunday"]
  worstDays: string[];
  bestTimeOfDay: string; // "morning" | "afternoon" | "evening" | "night"
  triggers: string[]; // ["lack_of_sleep", "social_isolation", "no_exercise"]
  sleepMoodCorrelation: number; // -1 to 1 (Pearson correlation)
  activityMoodCorrelation: number;
  anxietySleepCorrelation: number;
  socialMoodCorrelation: number;
}

export interface UserProfileTrends {
  moodDirection: "improving" | "stable" | "declining";
  sleepDirection: "improving" | "stable" | "declining";
  anxietyDirection: "improving" | "stable" | "declining";
  socialDirection: "improving" | "stable" | "declining";
  streakHealth: number; // 0-100 (composite score)
  consecutiveCheckins: number;
  lastCheckinDate: string | null;
}

export interface UserProfileRecommendations {
  prioritized: string[]; // Most important recommendations
  sleep: string[];
  activity: string[];
  social: string[];
  mindfulness: string[];
  personalizedChallenges: string[]; // Based on failing areas
}

export interface UserProfileScoring {
  coherenceScore: number; // 0-100, how consistent the data is
  aiConfidence: number; // 0-1, confidence in the analysis
  dataPointsAnalyzed: number;
  analysisWindowDays: number;
}

export interface UserProfile {
  userId: string;
  updatedAt: Timestamp;

  // AI-detected patterns
  patterns: UserProfilePatterns;

  // Trends over time
  trends: UserProfileTrends;

  // AI-generated recommendations
  recommendations: UserProfileRecommendations;

  // Quality metrics
  scoring: UserProfileScoring;

  // Context for Kibo chat
  chatContext: {
    summary: string; // e.g. "Usuário em risco moderado - sono em queda há 5 dias"
    riskLevel: "low" | "medium" | "high" | "critical";
    keyInsight: string; // Most important single insight
    bestDayForEngagement: string; // Day name
    worstDayAlert: string; // Warning for worst days
    triggerWarning: string; // Main trigger to watch
  };
}

// Input data structure for analysis
export interface CheckinRecord {
  date: string; // YYYY-MM-DD
  dayOfWeek: string; // "monday", "tuesday", etc.
  hourOfDay: number; // 0-23
  mood: number; // 1-10
  sleep: number; // 0-10 (hours scaled)
  anxiety: number; // 1-10
  activity: number; // 1-10
  social: number; // 1-10
  stress?: number; // 1-10
}

// Output of pattern analysis
export interface PatternAnalysis {
  patterns: UserProfilePatterns;
  trends: UserProfileTrends;
}

// Trigger types for detection
export type TriggerType =
  | "lack_of_sleep"
  | "social_isolation"
  | "no_exercise"
  | "high_stress"
  | "poor_circadian"
  | "weekend_isolation"
  | "monday_blues";

export const TRIGGER_LABELS: Record<TriggerType, string> = {
  lack_of_sleep: "Sono insuficiente",
  social_isolation: "Isolamento social",
  no_exercise: "Sedentarismo",
  high_stress: "Estresse elevado",
  poor_circadian: "Ritmo circadiano irregular",
  weekend_isolation: "Isolamento nos fins de semana",
  monday_blues: "Segunda-feira difícil",
};

export const TRIGGER_DESCRIPTIONS: Record<TriggerType, string> = {
  lack_of_sleep: "Dias com menos de 5h de sono tendem a ter humor pior no dia seguinte",
  social_isolation: "Baixa socialização está correlacionada com queda de humor",
  no_exercise: "Dias sem atividade física estão associados a humor mais baixo",
  high_stress: "Períodos de alto estresse precedem dias ruins com frequência",
  poor_circadian: "Inconsistência no horário de dormir/acordar prejudica o bem-estar",
  weekend_isolation: "Fins de semana isolados podem indicar risco elevado",
  monday_blues: "Segundas-feiras consistentemente ruins podem indicar reação ao trabalho",
};
