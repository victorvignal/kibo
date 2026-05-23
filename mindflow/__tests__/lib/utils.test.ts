/**
 * Tests for utils.ts
 */

import { formatDate, formatRelativeTime, getRiskColor, getRiskScoreLabel, cn } from '@/lib/utils';

describe('formatDate', () => {
  it('formats a Date object in Brazilian format', () => {
    const result = formatDate(new Date('2026-05-20'));
    expect(result).toMatch(/20/i);
    expect(result).toMatch(/mai/i);
    expect(result).toMatch(/2026/);
  });

  it('formats a date string (timezone-aware)', () => {
    // Use a full ISO string to avoid timezone ambiguity
    const result = formatDate(new Date('2026-12-25T12:00:00'));
    expect(result).toMatch(/dez/i);
    expect(result).toMatch(/2026/);
  });

  it('handles invalid dates gracefully', () => {
    const result = formatDate(new Date('invalid'));
    expect(typeof result).toBe('string');
  });
});

describe('formatRelativeTime', () => {
  it('returns "Hoje" for today', () => {
    const today = new Date();
    const result = formatRelativeTime(today);
    expect(result).toBe('Hoje');
  });

  it('returns "Ontem" for yesterday', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const result = formatRelativeTime(yesterday);
    expect(result).toBe('Ontem');
  });

  it('returns days for within a week', () => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const result = formatRelativeTime(threeDaysAgo);
    expect(result).toBe('3 dias atrás');
  });

  it('returns weeks for within a month', () => {
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const result = formatRelativeTime(twoWeeksAgo);
    expect(result).toMatch(/semanas/);
  });
});

describe('getRiskColor', () => {
  it('returns success for low', () => {
    expect(getRiskColor('low')).toBe('success');
  });
  it('returns warning for medium', () => {
    expect(getRiskColor('medium')).toBe('warning');
  });
  it('returns danger for high', () => {
    expect(getRiskColor('high')).toBe('danger');
  });
});

describe('getRiskScoreLabel', () => {
  it('returns low for score < 0.3', () => {
    expect(getRiskScoreLabel(0.1)).toBe('low');
    expect(getRiskScoreLabel(0.29)).toBe('low');
  });
  it('returns medium for 0.3 <= score < 0.7', () => {
    expect(getRiskScoreLabel(0.3)).toBe('medium');
    expect(getRiskScoreLabel(0.5)).toBe('medium');
    expect(getRiskScoreLabel(0.69)).toBe('medium');
  });
  it('returns high for score >= 0.7', () => {
    expect(getRiskScoreLabel(0.7)).toBe('high');
    expect(getRiskScoreLabel(1.0)).toBe('high');
  });
});

describe('cn (classnames)', () => {
  it('merges classnames', () => {
    const result = cn('foo', 'bar');
    expect(result).toContain('foo');
    expect(result).toContain('bar');
  });

  it('handles conditional classes', () => {
    const result = cn('foo', false && 'bar', 'baz');
    expect(result).toContain('foo');
    expect(result).toContain('baz');
    expect(result).not.toContain('bar');
  });
});
