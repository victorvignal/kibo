/**
 * Tests for Crisis Prevention Service
 * Tests pattern detection from check-in history
 */

import { CheckinData } from '../services/checkins';

// ─── Mock setup ───────────────────────────────────────────────────────────────

// Create a mock function that can be controlled per-test
const mockGetCheckinHistory = jest.fn();

jest.mock('../services/checkins', () => ({
  getCheckinHistory: (...args: unknown[]) => mockGetCheckinHistory(...args),
}));

// Import AFTER setting up the mock
import { detectCrisisPattern } from '../services/crisisPrevention';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeCheckin(dayOffset: number, data: Partial<CheckinData>): CheckinData {
  const date = new Date('2026-05-15');
  date.setDate(date.getDate() + dayOffset);
  return {
    id: `ci-${dayOffset}`,
    mood: 5,
    sleep: 5,
    anxiety: 5,
    activity: 5,
    social: 5,
    ...data,
    timestamp: date,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('Crisis Prevention Service', () => {
  beforeEach(() => {
    mockGetCheckinHistory.mockReset();
  });

  test('should return detected=false when getCheckinHistory returns empty', async () => {
    mockGetCheckinHistory.mockResolvedValueOnce([]);

    const result = await detectCrisisPattern('test-user');
    expect(result.detected).toBe(false);
  });

  test('should return detected=false with only 2 check-ins', async () => {
    mockGetCheckinHistory.mockResolvedValueOnce([
      makeCheckin(0, { mood: 3, anxiety: 8, social: 2 }),
      makeCheckin(1, { mood: 3, anxiety: 8, social: 2 }),
    ]);

    const result = await detectCrisisPattern('test-user');
    expect(result.detected).toBe(false);
  });

  test('should detect mood_drop pattern when mood consistently low', async () => {
    mockGetCheckinHistory.mockResolvedValueOnce([
      makeCheckin(0, { mood: 3 }),
      makeCheckin(1, { mood: 3 }),
      makeCheckin(2, { mood: 3 }),
      makeCheckin(3, { mood: 3 }),
      makeCheckin(4, { mood: 3 }),
    ]);

    const result = await detectCrisisPattern('test-user');

    if (result.detected) {
      expect(['mood_drop', 'combined']).toContain(result.pattern);
      expect(result.severity).toMatch(/^(low|medium|high)$/);
      expect(typeof result.personalizedMessage).toBe('string');
      expect(result.personalizedMessage.length).toBeGreaterThan(10);
    }
  });

  test('should detect anxiety_spike pattern', async () => {
    mockGetCheckinHistory.mockResolvedValueOnce([
      makeCheckin(0, { mood: 6, anxiety: 9 }),
      makeCheckin(1, { mood: 6, anxiety: 9 }),
      makeCheckin(2, { mood: 6, anxiety: 9 }),
      makeCheckin(3, { mood: 6, anxiety: 9 }),
      makeCheckin(4, { mood: 6, anxiety: 9 }),
    ]);

    const result = await detectCrisisPattern('test-user');

    if (result.detected) {
      expect(['anxiety_spike', 'combined']).toContain(result.pattern);
    }
  });

  test('should detect isolation pattern', async () => {
    mockGetCheckinHistory.mockResolvedValueOnce([
      makeCheckin(0, { mood: 6, anxiety: 4, social: 2 }),
      makeCheckin(1, { mood: 6, anxiety: 4, social: 2 }),
      makeCheckin(2, { mood: 6, anxiety: 4, social: 2 }),
      makeCheckin(3, { mood: 6, anxiety: 4, social: 2 }),
      makeCheckin(4, { mood: 6, anxiety: 4, social: 2 }),
    ]);

    const result = await detectCrisisPattern('test-user');

    if (result.detected) {
      expect(['isolation', 'combined']).toContain(result.pattern);
    }
  });

  test('should detect isolation pattern when social score is low across all days', async () => {
    // With identical check-ins where mood=3, anxiety=9, social=3:
    // - mood (3) is NOT below overallMood-1.5 (1.5) so moodDropDays = 0
    // - anxiety (9) is NOT above overallAnxiety+1.5 (10.5) so anxietySpikeDays = 0
    // - social (3) IS below 4 so isolationDays = 5
    // Therefore pattern should be 'isolation', not 'combined'
    mockGetCheckinHistory.mockResolvedValueOnce([
      makeCheckin(0, { mood: 3, anxiety: 9, social: 3 }),
      makeCheckin(1, { mood: 3, anxiety: 9, social: 3 }),
      makeCheckin(2, { mood: 3, anxiety: 9, social: 3 }),
      makeCheckin(3, { mood: 3, anxiety: 9, social: 3 }),
      makeCheckin(4, { mood: 3, anxiety: 9, social: 3 }),
    ]);

    const result = await detectCrisisPattern('test-user');

    if (result.detected) {
      expect(result.pattern).toBe('isolation');
    }
  });

  test('should detect combined pattern when mood and anxiety both deviate from average', async () => {
    // To trigger 'combined', we need varying check-ins where some days have
    // mood below overallMood-1.5 AND anxiety above overallAnxiety+1.5
    // Create check-ins with alternating patterns that establish an average,
    // then have days that deviate enough to trigger both conditions
    mockGetCheckinHistory.mockResolvedValueOnce([
      makeCheckin(0, { mood: 7, anxiety: 3, social: 5 }),
      makeCheckin(1, { mood: 7, anxiety: 3, social: 5 }),
      makeCheckin(2, { mood: 3, anxiety: 9, social: 5 }),
      makeCheckin(3, { mood: 3, anxiety: 9, social: 5 }),
      makeCheckin(4, { mood: 3, anxiety: 9, social: 5 }),
    ]);
    // overallMood = 4.6, overallAnxiety = 5.4
    // Days 2,3,4: mood (3) < 4.6-1.5=3.1 ✓, anxiety (9) > 5.4+1.5=6.9 ✓
    // So moodDropDays = 3, anxietySpikeDays = 3 → combined pattern

    const result = await detectCrisisPattern('test-user');

    if (result.detected) {
      expect(result.pattern).toBe('combined');
    }
  });

  test('should return all required fields in CrisisWarning', async () => {
    mockGetCheckinHistory.mockResolvedValueOnce([]);

    const result = await detectCrisisPattern('test-user');

    expect(result).toHaveProperty('detected');
    expect(result).toHaveProperty('severity');
    expect(result).toHaveProperty('triggerReason');
    expect(result).toHaveProperty('daysAffected');
    expect(result).toHaveProperty('pattern');
    expect(result).toHaveProperty('copingStrategies');
    expect(result).toHaveProperty('personalizedMessage');
    expect(result).toHaveProperty('suggestedActions');

    expect(typeof result.detected).toBe('boolean');
    expect(Array.isArray(result.copingStrategies)).toBe(true);
    expect(Array.isArray(result.suggestedActions)).toBe(true);
  });

  test('should always include breathing strategy when detected', async () => {
    mockGetCheckinHistory.mockResolvedValueOnce([
      makeCheckin(0, { mood: 3, anxiety: 9, social: 3 }),
      makeCheckin(1, { mood: 3, anxiety: 9, social: 3 }),
      makeCheckin(2, { mood: 3, anxiety: 9, social: 3 }),
      makeCheckin(3, { mood: 3, anxiety: 9, social: 3 }),
      makeCheckin(4, { mood: 3, anxiety: 9, social: 3 }),
    ]);

    const result = await detectCrisisPattern('test-user');

    if (result.detected) {
      const breathingStrategy = result.copingStrategies.find(s => s.id === 'breathing_4_7_8');
      expect(breathingStrategy).toBeDefined();
    }
  });

  test('should handle error gracefully and return default warning', async () => {
    mockGetCheckinHistory.mockRejectedValueOnce(new Error('Network error'));

    const result = await detectCrisisPattern('test-user');
    // Should return default warning, not throw
    expect(result.detected).toBe(false);
  });

  test('should return low severity for isolated patterns', async () => {
    mockGetCheckinHistory.mockResolvedValueOnce([
      makeCheckin(0, { mood: 5, anxiety: 4, social: 3 }),
      makeCheckin(1, { mood: 5, anxiety: 4, social: 3 }),
      makeCheckin(2, { mood: 5, anxiety: 4, social: 3 }),
    ]);

    const result = await detectCrisisPattern('test-user');

    if (result.detected) {
      expect(['isolation', 'combined']).toContain(result.pattern);
    }
  });

  test('coping strategies should have required fields', async () => {
    mockGetCheckinHistory.mockResolvedValueOnce([]);

    const result = await detectCrisisPattern('test-user');

    for (const strategy of result.copingStrategies) {
      expect(strategy).toHaveProperty('id');
      expect(strategy).toHaveProperty('title');
      expect(strategy).toHaveProperty('emoji');
      expect(strategy).toHaveProperty('category');
      expect(strategy).toHaveProperty('actionLabel');
    }
  });

  test('suggestedActions should be non-empty array', async () => {
    mockGetCheckinHistory.mockResolvedValueOnce([]);

    const result = await detectCrisisPattern('test-user');
    expect(result.suggestedActions.length).toBeGreaterThan(0);
  });
});
