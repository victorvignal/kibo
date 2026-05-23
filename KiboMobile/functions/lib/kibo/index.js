"use strict";
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.triggerAnalysis = exports.scheduledWeeklyDeep = exports.scheduledAnalysisDaily = exports.scheduledAnalysis6h = exports.getUserProfile = exports.analyzeUser = exports.onCheckinAnalyze = exports.analyzeUserData = void 0;
__exportStar(require("./userProfile"), exports);
__exportStar(require("./patternDetector"), exports);
var analyzeUserData_1 = require("./analyzeUserData");
Object.defineProperty(exports, "analyzeUserData", { enumerable: true, get: function () { return analyzeUserData_1.analyzeUserData; } });
Object.defineProperty(exports, "onCheckinAnalyze", { enumerable: true, get: function () { return analyzeUserData_1.onCheckinAnalyze; } });
Object.defineProperty(exports, "analyzeUser", { enumerable: true, get: function () { return analyzeUserData_1.analyzeUser; } });
Object.defineProperty(exports, "getUserProfile", { enumerable: true, get: function () { return analyzeUserData_1.getUserProfile; } });
var scheduledAnalysis_1 = require("./scheduledAnalysis");
Object.defineProperty(exports, "scheduledAnalysis6h", { enumerable: true, get: function () { return scheduledAnalysis_1.scheduledAnalysis6h; } });
Object.defineProperty(exports, "scheduledAnalysisDaily", { enumerable: true, get: function () { return scheduledAnalysis_1.scheduledAnalysisDaily; } });
Object.defineProperty(exports, "scheduledWeeklyDeep", { enumerable: true, get: function () { return scheduledAnalysis_1.scheduledWeeklyDeep; } });
Object.defineProperty(exports, "triggerAnalysis", { enumerable: true, get: function () { return scheduledAnalysis_1.triggerAnalysis; } });
//# sourceMappingURL=index.js.map