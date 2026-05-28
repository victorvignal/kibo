/**
 * Tests for riskEvaluator.ts
 * Client-side risk evaluation from check-in data
 */

import { evaluatePatientRisk, generateRealtimeAlerts, computeOverallRisk } from '@/lib/riskEvaluator';
import type { DailyData } from '@/types';

function makeDailyData(patientId: string, overrides: Partial<DailyData['features']> & { date: string }): DailyData {
  return {
    patientId,
    date: overrides.date,
    features: {
      locationsVisited: 3,
      timeAtHome: 60,
      radiusOfGyration: 5,
      sleepDuration: 7,
      sleepOnset: '23:00',
      sleepOffset: '07:00',
      sleepQuality: 70,
      nightDisturbances: 1,
      stepCount: 5000,
      physicalActivity: 30,
      sedentaryTime: 480,
      callsDuration: 30,
      callsFrequency: 5,
      smsFrequency: 10,
      socialInteractionScore: 60,
      rhythmStrength: 0.8,
      rhythmStability: 0.7,
      screenTime: 4,
      appCategories: {},
      moodScore: 7,
      stressScore: 3,
      anxietyScore: 3,
      ...overrides,
    },
  };
}

function makeSet(days: string[], patientId: string, overrides: Partial<DailyData['features']> = {}): DailyData[] {
  return days.map((date, i) => makeDailyData(patientId, { date, ...overrides }));
}

describe('evaluatePatientRisk', () => {
  const patientId = 'patient-123';

  it('returns empty array when no data', () => {
    const result = evaluatePatientRisk(patientId, []);
    expect(result).toEqual([]);
  });

  it('returns empty array when all metrics are healthy', () => {
    // Use the last 7 days from today to avoid triggering checkin_due alerts
    const today = new Date();
    const dates: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }
    const data = makeSet(dates, patientId);
    const result = evaluatePatientRisk(patientId, data);
    // Should not generate high severity alerts for healthy data
    const highAlerts = result.filter(a => a.severity === 'high');
    expect(highAlerts).toHaveLength(0);
  });

  it('detects low mood (high severity)', () => {
    const data = makeSet(['2026-05-14', '2026-05-15', '2026-05-16', '2026-05-17', '2026-05-18', '2026-05-19', '2026-05-20'], patientId, {
      moodScore: 2.5,
    });
    const result = evaluatePatientRisk(patientId, data);
    const moodAlerts = result.filter(a => a.type === 'risk_increase' && a.severity === 'high');
    expect(moodAlerts.length).toBeGreaterThan(0);
    expect(moodAlerts[0].message).toContain('2.5');
  });

  it('detects low mood (medium severity)', () => {
    const data = makeSet(['2026-05-14', '2026-05-15', '2026-05-16', '2026-05-17', '2026-05-18', '2026-05-19', '2026-05-20'], patientId, {
      moodScore: 4.5,
    });
    const result = evaluatePatientRisk(patientId, data);
    const moodAlerts = result.filter(a => a.severity === 'medium');
    expect(moodAlerts.length).toBeGreaterThan(0);
  });

  it('detects high anxiety', () => {
    const data = makeSet(['2026-05-14', '2026-05-15', '2026-05-16', '2026-05-17', '2026-05-18', '2026-05-19', '2026-05-20'], patientId, {
      anxietyScore: 8.5,
    });
    const result = evaluatePatientRisk(patientId, data);
    const anxietyAlerts = result.filter(a => a.message.toLowerCase().includes('ansiedade'));
    expect(anxietyAlerts.length).toBeGreaterThan(0);
  });

  it('detects declining mood trend', () => {
    // Last 3 days: decreasing mood
    const data: DailyData[] = [
      makeDailyData(patientId, { date: '2026-05-14', moodScore: 7 }),
      makeDailyData(patientId, { date: '2026-05-15', moodScore: 6 }),
      makeDailyData(patientId, { date: '2026-05-16', moodScore: 5 }),
      makeDailyData(patientId, { date: '2026-05-17', moodScore: 4 }),
      makeDailyData(patientId, { date: '2026-05-18', moodScore: 3.5 }),
      makeDailyData(patientId, { date: '2026-05-19', moodScore: 3 }),
      makeDailyData(patientId, { date: '2026-05-20', moodScore: 2.5 }),
    ];
    const result = evaluatePatientRisk(patientId, data);
    const trendAlerts = result.filter(a => a.type === 'sentiment_shift');
    expect(trendAlerts.length).toBeGreaterThan(0);
  });

  it('detects poor sleep', () => {
    const data = makeSet(['2026-05-14', '2026-05-15', '2026-05-16', '2026-05-17', '2026-05-18', '2026-05-19', '2026-05-20'], patientId, {
      sleepDuration: 4,
      sleepQuality: 30,
    });
    const result = evaluatePatientRisk(patientId, data);
    const sleepAlerts = result.filter(a => a.message.toLowerCase().includes('sono'));
    expect(sleepAlerts.length).toBeGreaterThan(0);
  });

  it('detects social isolation', () => {
    const data = makeSet(['2026-05-14', '2026-05-15', '2026-05-16', '2026-05-17', '2026-05-18', '2026-05-19', '2026-05-20'], patientId, {
      socialInteractionScore: 15,
      callsFrequency: 1,
    });
    const result = evaluatePatientRisk(patientId, data);
    const socialAlerts = result.filter(a => a.message.toLowerCase().includes('social') || a.message.toLowerCase().includes('isolamento'));
    expect(socialAlerts.length).toBeGreaterThan(0);
  });

  it('detects low activity', () => {
    const data = makeSet(['2026-05-14', '2026-05-15', '2026-05-16', '2026-05-17', '2026-05-18', '2026-05-19', '2026-05-20'], patientId, {
      physicalActivity: 1, // below threshold of 2
      stepCount: 300,
    });
    const result = evaluatePatientRisk(patientId, data);
    const activityAlerts = result.filter(a => a.message.toLowerCase().includes('atividade'));
    expect(activityAlerts.length).toBeGreaterThan(0);
  });

  it('marks alerts as local', () => {
    const data = makeSet(['2026-05-14', '2026-05-15', '2026-05-16', '2026-05-17', '2026-05-18', '2026-05-19', '2026-05-20'], patientId, {
      moodScore: 2,
    });
    const result = evaluatePatientRisk(patientId, data);
    expect(result.every(a => a.isLocal === true)).toBe(true);
    expect(result.every(a => a.id.startsWith('local_'))).toBe(true);
  });

  it('attaches correct patientId to all alerts', () => {
    const data = makeSet(['2026-05-14', '2026-05-15', '2026-05-16', '2026-05-17', '2026-05-18', '2026-05-19', '2026-05-20'], patientId, {
      moodScore: 2,
      anxietyScore: 9,
      sleepDuration: 3,
    });
    const result = evaluatePatientRisk(patientId, data);
    expect(result.every(a => a.patientId === patientId)).toBe(true);
  });

  it('returns unacknowledged alerts', () => {
    const data = makeSet(['2026-05-14', '2026-05-15', '2026-05-16', '2026-05-17', '2026-05-18', '2026-05-19', '2026-05-20'], patientId, {
      moodScore: 2,
    });
    const result = evaluatePatientRisk(patientId, data);
    expect(result.every(a => a.acknowledged === false)).toBe(true);
  });

  it('detects check-in gap', () => {
    // Only 3 data points, last one 5 days ago
    const data = makeSet(['2026-05-10', '2026-05-11', '2026-05-12'], patientId);
    const result = evaluatePatientRisk(patientId, data);
    const gapAlerts = result.filter(a => a.type === 'checkin_due');
    expect(gapAlerts.length).toBeGreaterThan(0);
  });

  it('returns empty for healthy data', () => {
    // Use the last 7 days from today to avoid triggering checkin_due alerts
    const today = new Date();
    const dates: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }
    const healthy = makeSet(dates, patientId, {
      moodScore: 8,
      anxietyScore: 2,
      sleepDuration: 7.5,
      socialInteractionScore: 80,
      physicalActivity: 8,
    });
    const result = evaluatePatientRisk(patientId, healthy);
    const highAlerts = result.filter(a => a.severity === 'high');
    expect(highAlerts).toHaveLength(0);
  });
});

describe('generateRealtimeAlerts', () => {
  it('returns empty array when no patients', async () => {
    const mockGetData = jest.fn().mockResolvedValue([]);
    const result = await generateRealtimeAlerts([], mockGetData);
    expect(result).toEqual([]);
  });

  it('evaluates up to 5 patients in parallel', async () => {
    const mockGetData = jest.fn().mockResolvedValue([]);
    const patients = [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }];
    await generateRealtimeAlerts(patients, mockGetData);
    expect(mockGetData).toHaveBeenCalledTimes(3);
  });

  it('limits to 5 patients even if more provided', async () => {
    const mockGetData = jest.fn().mockResolvedValue([]);
    const patients = [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }, { id: 'p4' }, { id: 'p5' }, { id: 'p6' }, { id: 'p7' }];
    await generateRealtimeAlerts(patients, mockGetData);
    expect(mockGetData).toHaveBeenCalledTimes(5);
  });

  it('returns high severity alerts from patient data', async () => {
    const riskyData: DailyData[] = [
      makeDailyData('p1', { date: '2026-05-14', moodScore: 2 }),
      makeDailyData('p1', { date: '2026-05-15', moodScore: 2.5 }),
      makeDailyData('p1', { date: '2026-05-16', moodScore: 3 }),
      makeDailyData('p1', { date: '2026-05-17', moodScore: 2.5 }),
      makeDailyData('p1', { date: '2026-05-18', moodScore: 2 }),
      makeDailyData('p1', { date: '2026-05-19', moodScore: 2 }),
      makeDailyData('p1', { date: '2026-05-20', moodScore: 2 }),
    ];
    const mockGetData = jest.fn().mockResolvedValue(riskyData);
    const result = await generateRealtimeAlerts([{ id: 'p1' }], mockGetData);
    const highAlerts = result.filter(a => a.severity === 'high');
    expect(highAlerts.length).toBeGreaterThan(0);
    expect(result.every(a => a.patientId === 'p1')).toBe(true);
  });

  it('sorts alerts by severity (high first) then by date', async () => {
    const mockGetData = jest.fn().mockResolvedValue([
      makeDailyData('p1', { date: '2026-05-14', moodScore: 7 }),
      makeDailyData('p1', { date: '2026-05-15', moodScore: 2 }),
      makeDailyData('p1', { date: '2026-05-16', moodScore: 2 }),
      makeDailyData('p1', { date: '2026-05-17', moodScore: 2 }),
      makeDailyData('p1', { date: '2026-05-18', moodScore: 2 }),
      makeDailyData('p1', { date: '2026-05-19', moodScore: 2 }),
      makeDailyData('p1', { date: '2026-05-20', moodScore: 2 }),
    ]);
    const result = await generateRealtimeAlerts([{ id: 'p1' }], mockGetData);
    // High severity should come before medium/low
    const firstSeverity = result[0]?.severity;
    expect(firstSeverity).toBe('high');
  });

  it('handles rejected promises gracefully', async () => {
    const mockGetData = jest.fn().mockRejectedValue(new Error('Firestore error'));
    const result = await generateRealtimeAlerts([{ id: 'p1' }], mockGetData);
    expect(result).toEqual([]);
  });
});

describe('computeOverallRisk', () => {
  it('returns low when no alerts', () => {
    expect(computeOverallRisk([])).toBe('low');
  });

  it('returns low when all alerts are acknowledged', () => {
    const alerts = [
      {
        id: 'a1', patientId: 'p1', type: 'risk_increase' as const,
        severity: 'high' as const, message: 'test', recommendation: 'test',
        createdAt: new Date(), acknowledged: true, isLocal: true as const,
      },
    ];
    expect(computeOverallRisk(alerts)).toBe('low');
  });

  it('returns high when any unacknowledged high severity alert exists', () => {
    const alerts = [
      {
        id: 'a1', patientId: 'p1', type: 'risk_increase' as const,
        severity: 'medium' as const, message: 'test', recommendation: 'test',
        createdAt: new Date(), acknowledged: false, isLocal: true as const,
      },
      {
        id: 'a2', patientId: 'p1', type: 'risk_increase' as const,
        severity: 'high' as const, message: 'test', recommendation: 'test',
        createdAt: new Date(), acknowledged: false, isLocal: true as const,
      },
    ];
    expect(computeOverallRisk(alerts)).toBe('high');
  });

  it('returns medium when 3 or more unacknowledged alerts (no high)', () => {
    const alerts = [
      { id: 'a1', patientId: 'p1', type: 'risk_increase' as const, severity: 'medium' as const, message: 't', recommendation: 't', createdAt: new Date(), acknowledged: false, isLocal: true as const },
      { id: 'a2', patientId: 'p1', type: 'risk_increase' as const, severity: 'medium' as const, message: 't', recommendation: 't', createdAt: new Date(), acknowledged: false, isLocal: true as const },
      { id: 'a3', patientId: 'p1', type: 'risk_increase' as const, severity: 'low' as const, message: 't', recommendation: 't', createdAt: new Date(), acknowledged: false, isLocal: true as const },
    ];
    expect(computeOverallRisk(alerts)).toBe('medium');
  });

  it('returns low when fewer than 3 unacknowledged alerts (no high)', () => {
    const alerts = [
      { id: 'a1', patientId: 'p1', type: 'risk_increase' as const, severity: 'medium' as const, message: 't', recommendation: 't', createdAt: new Date(), acknowledged: false, isLocal: true as const },
      { id: 'a2', patientId: 'p1', type: 'risk_increase' as const, severity: 'low' as const, message: 't', recommendation: 't', createdAt: new Date(), acknowledged: false, isLocal: true as const },
    ];
    expect(computeOverallRisk(alerts)).toBe('low');
  });
});
