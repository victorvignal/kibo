import {
  predictRisk,
  getRiskColor,
  getRiskLabel,
  getRiskBgColor,
} from '@/lib/riskPredictor';
import type { DailyData } from '@/types';

// Fixed reference date for deterministic test dates
const REF_DATE = new Date('2026-05-24');

/** Returns YYYY-MM-DD string for a date n days before REF_DATE (n=0 means today) */
function daysAgoStr(n: number): string {
  const d = new Date(REF_DATE);
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

/** Returns last N days as YYYY-MM-DD strings, most recent first */
function lastNDays(n: number): string[] {
  return Array.from({ length: n }, (_, i) => daysAgoStr(i)).reverse();
}

function makeDailyData(
  patientId: string,
  overrides: Partial<DailyData['features']> & { date: string }
): DailyData {
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
      physicalActivity: 5,
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

function makeSet(
  days: string[],
  patientId: string,
  overrides: Partial<DailyData['features']> = {}
): DailyData[] {
  return days.map((date) => makeDailyData(patientId, { date, ...overrides }));
}

describe('predictRisk', () => {
  const patientId = 'patient-123';

  it('returns medium risk with low confidence when no data', () => {
    const result = predictRisk(patientId, []);
    expect(result.riskLevel).toBe('medium');
    expect(result.confidenceScore).toBeLessThan(0.5);
    expect(result.riskFactors).toHaveLength(0);
    expect(result.predictionExplanation).toContain('insuficientes');
  });

  it('returns low risk when all metrics are healthy', () => {
    const data = makeSet(
      lastNDays(7),
      patientId,
      {
        moodScore: 8,
        sleepDuration: 7.5,
        anxietyScore: 2,
        physicalActivity: 7,
        socialInteractionScore: 80,
      }
    );
    const result = predictRisk(patientId, data);
    expect(result.riskLevel).toBe('low');
    expect(result.riskFactors).toHaveLength(0);
    expect(result.protectiveFactors.length).toBeGreaterThan(0);
  });

  it('detects mood as a risk factor when persistently low', () => {
    const data = makeSet(
      ['2026-05-14', '2026-05-15', '2026-05-16', '2026-05-17', '2026-05-18', '2026-05-19', '2026-05-20'],
      patientId,
      { moodScore: 2.5 }
    );
    const result = predictRisk(patientId, data);
    const moodFactor = result.riskFactors.find((f) => f.type === 'mood');
    expect(moodFactor).toBeDefined();
    expect(['moderate', 'severe']).toContain(moodFactor!.severity);
    expect(result.riskLevel).toBeTruthy(); // just verify it returns a value
  });

  it('detects anxiety as a risk factor when very high', () => {
    const data = makeSet(
      ['2026-05-14', '2026-05-15', '2026-05-16', '2026-05-17', '2026-05-18', '2026-05-19', '2026-05-20'],
      patientId,
      { anxietyScore: 9 }
    );
    const result = predictRisk(patientId, data);
    const anxietyFactor = result.riskFactors.find((f) => f.type === 'anxiety');
    expect(anxietyFactor).toBeDefined();
  });

  it('detects sleep as a risk factor when severely compromised', () => {
    const data = makeSet(
      ['2026-05-14', '2026-05-15', '2026-05-16', '2026-05-17', '2026-05-18', '2026-05-19', '2026-05-20'],
      patientId,
      { sleepDuration: 3 }
    );
    const result = predictRisk(patientId, data);
    const sleepFactor = result.riskFactors.find((f) => f.type === 'sleep');
    expect(sleepFactor).toBeDefined();
    expect(['moderate', 'severe']).toContain(sleepFactor!.severity);
  });

  it('returns high risk when multiple severe risk factors are present', () => {
    // Multiple concurrent risk factors push adjustedRiskScore >= 0.6
    const data = makeSet(
      ['2026-05-14', '2026-05-15', '2026-05-16', '2026-05-17', '2026-05-18', '2026-05-19', '2026-05-20'],
      patientId,
      { moodScore: 2, anxietyScore: 9, sleepDuration: 3 }
    );
    const result = predictRisk(patientId, data);
    expect(result.riskLevel).toBe('high');
  });

  it('returns high risk when check-in gap is large', () => {
    // Only 3 days of data, last one 10 days ago
    const data = makeSet(['2026-05-10', '2026-05-11', '2026-05-12'], patientId);
    const result = predictRisk(patientId, data);
    const gapFactor = result.riskFactors.find((f) => f.type === 'checkin_gap');
    expect(gapFactor).toBeDefined();
    expect(gapFactor!.severity).toBe('severe');
  });

  it('detects declining trend as worsening', () => {
    // Older days: good mood, recent days: bad mood
    const data: DailyData[] = [
      makeDailyData(patientId, { date: '2026-05-07', moodScore: 7 }),
      makeDailyData(patientId, { date: '2026-05-08', moodScore: 7 }),
      makeDailyData(patientId, { date: '2026-05-09', moodScore: 7 }),
      makeDailyData(patientId, { date: '2026-05-10', moodScore: 7 }),
      makeDailyData(patientId, { date: '2026-05-11', moodScore: 7 }),
      makeDailyData(patientId, { date: '2026-05-12', moodScore: 7 }),
      makeDailyData(patientId, { date: '2026-05-13', moodScore: 7 }),
      makeDailyData(patientId, { date: '2026-05-14', moodScore: 3 }),
      makeDailyData(patientId, { date: '2026-05-15', moodScore: 2.5 }),
      makeDailyData(patientId, { date: '2026-05-16', moodScore: 2 }),
      makeDailyData(patientId, { date: '2026-05-17', moodScore: 2 }),
      makeDailyData(patientId, { date: '2026-05-18', moodScore: 2 }),
      makeDailyData(patientId, { date: '2026-05-19', moodScore: 2 }),
      makeDailyData(patientId, { date: '2026-05-20', moodScore: 2 }),
    ];
    const result = predictRisk(patientId, data);
    expect(result.trend).toBe('worsening');
  });

  it('detects improving trend', () => {
    // Older days: bad mood, recent days: good mood
    const data: DailyData[] = [
      makeDailyData(patientId, { date: '2026-05-07', moodScore: 2 }),
      makeDailyData(patientId, { date: '2026-05-08', moodScore: 2 }),
      makeDailyData(patientId, { date: '2026-05-09', moodScore: 2 }),
      makeDailyData(patientId, { date: '2026-05-10', moodScore: 2 }),
      makeDailyData(patientId, { date: '2026-05-11', moodScore: 2 }),
      makeDailyData(patientId, { date: '2026-05-12', moodScore: 2 }),
      makeDailyData(patientId, { date: '2026-05-13', moodScore: 2 }),
      makeDailyData(patientId, { date: '2026-05-14', moodScore: 7 }),
      makeDailyData(patientId, { date: '2026-05-15', moodScore: 8 }),
      makeDailyData(patientId, { date: '2026-05-16', moodScore: 8 }),
      makeDailyData(patientId, { date: '2026-05-17', moodScore: 8 }),
      makeDailyData(patientId, { date: '2026-05-18', moodScore: 8 }),
      makeDailyData(patientId, { date: '2026-05-19', moodScore: 8 }),
      makeDailyData(patientId, { date: '2026-05-20', moodScore: 8 }),
    ];
    const result = predictRisk(patientId, data);
    expect(result.trend).toBe('improving');
  });

  it('generates prediction explanation with risk factors', () => {
    const data = makeSet(
      ['2026-05-14', '2026-05-15', '2026-05-16', '2026-05-17', '2026-05-18', '2026-05-19', '2026-05-20'],
      patientId,
      { moodScore: 2, sleepDuration: 3 }
    );
    const result = predictRisk(patientId, data);
    expect(result.predictionExplanation).toContain('humor');
    expect(result.predictionExplanation).toContain('sono');
  });

  it('calculates daysAtRisk correctly', () => {
    const data = makeSet(
      ['2026-05-14', '2026-05-15', '2026-05-16', '2026-05-17', '2026-05-18', '2026-05-19', '2026-05-20'],
      patientId,
      { moodScore: 2, sleepDuration: 3 }
    );
    const result = predictRisk(patientId, data);
    expect(result.daysAtRisk).toBeGreaterThan(0);
  });

  it('includes protective factors when data is healthy', () => {
    const data = makeSet(
      lastNDays(7),
      patientId,
      {
        moodScore: 8,
        sleepDuration: 8,
        anxietyScore: 2,
        physicalActivity: 7,
        socialInteractionScore: 80,
      }
    );
    const result = predictRisk(patientId, data);
    expect(result.protectiveFactors.length).toBeGreaterThan(0);
    expect(result.riskFactors).toHaveLength(0);
  });

  it('sorts risk factors by contribution score descending', () => {
    const data = makeSet(
      ['2026-05-14', '2026-05-15', '2026-05-16', '2026-05-17', '2026-05-18', '2026-05-19', '2026-05-20'],
      patientId,
      { moodScore: 2, sleepDuration: 3, anxietyScore: 9 }
    );
    const result = predictRisk(patientId, data);
    for (let i = 0; i < result.riskFactors.length - 1; i++) {
      expect(result.riskFactors[i].contributionScore).toBeGreaterThanOrEqual(
        result.riskFactors[i + 1].contributionScore
      );
    }
  });
});

describe('getRiskColor', () => {
  it('returns green for low', () => {
    expect(getRiskColor('low')).toBe('#059669');
  });
  it('returns amber for medium', () => {
    expect(getRiskColor('medium')).toBe('#D97706');
  });
  it('returns red for high', () => {
    expect(getRiskColor('high')).toBe('#DC2626');
  });
});

describe('getRiskLabel', () => {
  it('returns Baixo for low', () => {
    expect(getRiskLabel('low')).toBe('Baixo');
  });
  it('returns Médio for medium', () => {
    expect(getRiskLabel('medium')).toBe('Médio');
  });
  it('returns Alto for high', () => {
    expect(getRiskLabel('high')).toBe('Alto');
  });
});

describe('getRiskBgColor', () => {
  it('returns light green for low', () => {
    expect(getRiskBgColor('low')).toBe('#D4EDDA');
  });
  it('returns light amber for medium', () => {
    expect(getRiskBgColor('medium')).toBe('#FEF3C7');
  });
  it('returns light red for high', () => {
    expect(getRiskBgColor('high')).toBe('#FEE2E2');
  });
});
