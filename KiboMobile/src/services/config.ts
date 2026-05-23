/**
 * Kibo Mobile - App Configuration
 *
 * Central configuration for KiboMobile.
 * All API URLs and constants are defined here.
 */

// ─── API Endpoints ─────────────────────────────────────────────────────────

// Mindflow web dashboard API (chat, AI responses)
export const API_BASE_URL = 'https://mindflow-ruby.vercel.app';

// Firebase Cloud Function (fallback for chat)
export const CLOUD_FUNCTION_BASE = '';

// ─── Sensor Config ─────────────────────────────────────────────────────────

export const SENSOR_FLUSH_INTERVAL_MS = 30000; // 30 seconds
export const SENSOR_UPDATE_INTERVAL_MS = 100;  // 10 Hz

// ─── Check-in Config ────────────────────────────────────────────────────────

export const CHECKIN_HISTORY_DAYS = 30;
export const STREAK_GRACE_HOURS = 12; // Hours after midnight to still count yesterday's check-in

// ─── UI Config ─────────────────────────────────────────────────────────────

export const ACCENT_COLOR = '#7C3AED';
export const SUCCESS_COLOR = '#059669';
export const WARNING_COLOR = '#D97706';
export const DANGER_COLOR = '#DC2626';

// ─── Risk Detection ─────────────────────────────────────────────────────────

export const HIGH_RISK_MOOD_THRESHOLD = 3;
export const HIGH_RISK_ANXIETY_THRESHOLD = 8;
export const MODERATE_RISK_MOOD_THRESHOLD = 5;
export const MODERATE_RISK_ANXIETY_THRESHOLD = 6;
