// Tipos para o assistente Kibo

export type MessageRole = "user" | "assistant" | "system";

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  type?: "text" | "alert" | "checkin" | "psicoeducation";
  metadata?: {
    patientId?: string;
    riskLevel?: "low" | "medium" | "high";
    sentiment?: "positive" | "neutral" | "negative";
    alertId?: string;
  };
}

export interface ChatSession {
  id: string;
  patientId?: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  lastInteraction: Date;
  context?: {
    currentRisk?: "low" | "medium" | "high";
    lastCheckin?: Date;
    activeAlerts?: number;
    sentimentTrend?: "improving" | "stable" | "worsening";
  };
}

export interface CheckinQuestion {
  id: string;
  question: string;
  type: "mood" | "sleep" | "activity" | "social" | "medication" | "custom";
  scale?: {
    min: number;
    max: number;
    labels?: string[];
  };
  followUp?: string[];
}

export interface CheckinResponse {
  questionId: string;
  answer: string | number;
  timestamp: Date;
}

export interface ClinicaAlert {
  id: string;
  patientId: string;
  type: "risk_increase" | "checkin_due" | "crisis_detected" | "sentiment_shift" | "sleep_disturbance" | "social_isolation" | "activity_decline";
  severity: "low" | "medium" | "high";
  message: string;
  recommendation: string;
  createdAt: Date;
  acknowledged: boolean;
  source?: "kibo_analysis" | "firestore";
}

// Tipos originais do projeto

export interface Patient {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status: "active" | "inactive" | "at_risk";
  riskLevel: "low" | "medium" | "high";
  condition?: "depression" | "anxiety" | "bipolar" | "other";
  therapistId?: string;
  createdAt: Date;
  lastActive?: Date;
}

export interface BehavioralFeatures {
  // Mobility
  locationsVisited: number;
  timeAtHome: number; // percentage
  radiusOfGyration: number;
  
  // Sleep
  sleepDuration: number; // hours
  sleepOnset: string; // HH:MM
  sleepOffset: string; // HH:MM
  sleepQuality: number; // 0-100
  nightDisturbances: number;
  
  // Activity
  stepCount: number;
  physicalActivity: number; // minutes
  sedentaryTime: number; // minutes
  
  // Social
  callsDuration: number; // minutes
  callsFrequency: number;
  smsFrequency: number;
  socialInteractionScore: number; // 0-100
  
  // Circadian
  rhythmStrength: number; // 0-1
  rhythmStability: number; // 0-1
  
  // Digital
  screenTime: number; // hours
  appCategories: Record<string, number>; // category -> minutes
  
  // EMA
  moodScore: number; // 1-10
  stressScore: number; // 1-10
  anxietyScore: number; // 1-10
}

export interface DailyData {
  id?: string;
  patientId: string;
  date: string;
  features: BehavioralFeatures;
}
