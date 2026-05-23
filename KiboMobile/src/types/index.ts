export interface User {
  id: string;
  email: string;
  name: string;
  role: 'patient' | 'psychologist';
  createdAt: Date;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  type?: 'text' | 'checkin' | 'alert' | 'psicoeducation';
}

export interface CheckinResponse {
  mood: number;
  sleep: number;
  anxiety: number;
  activity: number;
  social: number;
  timestamp: Date;
}

export interface SensorData {
  latitude?: number;
  longitude?: number;
  altitude?: number;
  accelerometer?: { x: number; y: number; z: number };
  stepCount?: number;
  timestamp: Date;
}

export interface WellnessScore {
  overall: number;
  mood: number;
  sleep: number;
  activity: number;
  social: number;
  trend: 'improving' | 'stable' | 'worsening';
}
