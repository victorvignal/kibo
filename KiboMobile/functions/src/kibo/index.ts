/**
 * Kibo Analysis Module - Re-exports
 *
 * This module provides:
 * - UserProfile schema and types
 * - Pattern detection algorithms
 * - Cloud Functions for user data analysis
 * - Scheduled periodic analysis
 *
 * Deploy: firebase deploy --only functions
 */

export * from "./userProfile";
export * from "./patternDetector";
export {
  analyzeUserData,
  onCheckinAnalyze,
  analyzeUser,
  getUserProfile,
} from "./analyzeUserData";
export {
  scheduledAnalysis6h,
  scheduledAnalysisDaily,
  scheduledWeeklyDeep,
  triggerAnalysis,
} from "./scheduledAnalysis";
