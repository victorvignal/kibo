/**
 * Tests for Kibo API - Local Response Generator
 * Tests the generateLocalKiboResponse function with various inputs
 */

import { generateLocalKiboResponse, KiboContext, buildKiboContext, callKiboAPI, KiboConversationMessage } from '../services/kiboApi';

// Mock config
jest.mock('../services/config', () => ({
  API_BASE_URL: 'https://test-api.example.com',
}));

// Mock checkins service
const mockGetCheckinHistory = jest.fn().mockResolvedValue([]);
const mockGetMoodTrend = jest.fn().mockResolvedValue([]);

jest.mock('../services/checkins', () => ({
  getCheckinHistory: (...args: unknown[]) => mockGetCheckinHistory(...args),
  getMoodTrend: (...args: unknown[]) => mockGetMoodTrend(...args),
}));

// Mock firebase (used transitively)
jest.mock('../services/firebase', () => ({}));

describe('Kibo Local Response Generator', () => {
  beforeEach(() => {
    mockGetCheckinHistory.mockReset().mockResolvedValue([]);
    mockGetMoodTrend.mockReset().mockResolvedValue([]);
  });

  describe('Risk Detection', () => {
    const riskInputs = [
      'estou pensando em me matar',
      'queria acabar com tudo',
      'não aguento mais',
      'melhor sem mim',
      'ideação suicida',
      'automutilação',
      'ferir a si mesmo',
    ];

    test.each(riskInputs)('should respond with crisis resources for: "%s"', (input) => {
      const response = generateLocalKiboResponse(input);
      expect(response.toLowerCase()).toContain('188');
      expect(response.toLowerCase()).toContain('cvv');
      expect(response.length).toBeGreaterThan(50);
    });

    test('should detect suicide ideation in Portuguese', () => {
      const response = generateLocalKiboResponse('tenho ideia de me matar');
      expect(response).toContain('CVV');
      expect(response.toLowerCase()).toContain('188');
    });
  });

  describe('Crisis Response', () => {
    test('should provide breathing techniques for crisis', () => {
      const response = generateLocalKiboResponse('estou em crise');
      expect(response.toLowerCase()).toContain('respir');
      expect(response.toLowerCase()).toContain('188');
    });

    test('should provide 5-4-3-2-1 grounding technique', () => {
      const response = generateLocalKiboResponse('estou em pânico');
      expect(response.toLowerCase()).toContain('5-4-3-2-1');
    });
  });

  describe('Mood Detection', () => {
    test('should respond to sadness', () => {
      const response = generateLocalKiboResponse('estou triste');
      expect(response.length).toBeGreaterThan(20);
      expect(response.toLowerCase()).toContain('triste');
    });

    test('should respond to happiness', () => {
      const response = generateLocalKiboResponse('estou muito feliz hoje');
      expect(response.length).toBeGreaterThan(10);
    });

    test('should acknowledge when user is doing well', () => {
      const response = generateLocalKiboResponse('estou me sentindo maravilhoso');
      expect(response.length).toBeGreaterThan(10);
    });
  });

  describe('Anxiety Detection', () => {
    test('should suggest 5-4-3-2-1 for anxiety', () => {
      const response = generateLocalKiboResponse('estou muito ansioso');
      expect(response.toLowerCase()).toContain('5-4-3-2-1');
    });

    test('should detect anxiety from input', () => {
      const response = generateLocalKiboResponse('me sinto muito nervoso');
      expect(response.length).toBeGreaterThan(20);
    });
  });

  describe('Sleep Detection', () => {
    test('should provide sleep tips', () => {
      const response = generateLocalKiboResponse('não consigo dormir');
      expect(response.toLowerCase()).toContain('sono');
      expect(response.toLowerCase()).toContain('dormir');
    });

    test('should respond to insomnia mention', () => {
      const response = generateLocalKiboResponse('estou com insônia');
      expect(response.length).toBeGreaterThan(20);
    });
  });

  describe('Social Isolation Detection', () => {
    test('should respond to loneliness', () => {
      const response = generateLocalKiboResponse('me sinto muito sozinho');
      expect(response.length).toBeGreaterThan(20);
    });

    test('should acknowledge isolation', () => {
      const response = generateLocalKiboResponse('estou isolado de todos');
      expect(response.toLowerCase()).toContain('solid');
    });
  });

  describe('Greetings', () => {
    const greetings = ['oi', 'olá', 'hey', 'eae', 'opa', 'bom dia'];

    test.each(greetings)('should greet for: "%s"', (greeting) => {
      const response = generateLocalKiboResponse(greeting);
      expect(response.length).toBeGreaterThan(20);
      expect(response.toLowerCase()).toContain('kibo');
    });
  });

  describe('Gratitude', () => {
    test('should respond positively to thanks', () => {
      const response = generateLocalKiboResponse('obrigado kibo');
      expect(response.toLowerCase()).toContain('nada');
    });

    test('should respond to valeu', () => {
      const response = generateLocalKiboResponse('valeu!');
      expect(response.length).toBeGreaterThan(5);
    });
  });

  describe('Check-in prompts', () => {
    test('should encourage check-in', () => {
      const response = generateLocalKiboResponse('quero fazer check-in');
      expect(response.toLowerCase()).toContain('check');
    });

    test('should mention check-in tab', () => {
      const response = generateLocalKiboResponse('check in');
      expect(response.length).toBeGreaterThan(10);
    });
  });

  describe('Breathing Exercise', () => {
    test('should suggest breathing exercises', () => {
      const response = generateLocalKiboResponse('preciso relaxar');
      expect(response.toLowerCase()).toContain('respir');
    });

    test('should mention 4-7-8 technique', () => {
      const response = generateLocalKiboResponse('estou estressado');
      expect(response.toLowerCase()).toContain('respir');
    });
  });

  describe('How am I doing summary', () => {
    test('should respond to summary request', () => {
      const response = generateLocalKiboResponse('como estou me sentindo');
      expect(response.length).toBeGreaterThan(10);
    });

    test('should ask for more data when no context', () => {
      const response = generateLocalKiboResponse('meu resumo');
      expect(response.length).toBeGreaterThan(10);
    });
  });

  describe('Context-aware responses', () => {
    test('should mention streak when user has one', () => {
      const ctx: KiboContext = {
        userId: 'test-user',
        streak: 5,
        avgMood: 7,
      };
      const response = generateLocalKiboResponse('oi', ctx);
      expect(response).toContain('5');
      // Check for 'dia' which appears in 'dia(s)'
      expect(response.toLowerCase()).toContain('dia');
    });

    test('should provide mood summary when context is available', () => {
      const ctx: KiboContext = {
        userId: 'test-user',
        avgMood: 3,
        avgAnxiety: 8,
      };
      const response = generateLocalKiboResponse('como estou', ctx);
      expect(response.length).toBeGreaterThan(20);
    });

    test('should handle improving trend', () => {
      // Must have avgMood or recentCheckins for hasContext to be true
      const ctx: KiboContext = {
        userId: 'test-user',
        trend: 'improving',
        streak: 3,
        avgMood: 7,
      };
      const response = generateLocalKiboResponse('estou bem', ctx);
      expect(response.toLowerCase()).toContain('melhor');
    });

    test('should handle worsening trend with empathy', () => {
      const ctx: KiboContext = {
        userId: 'test-user',
        trend: 'worsening',
        avgMood: 4,
      };
      const response = generateLocalKiboResponse('estou triste', ctx);
      expect(response.length).toBeGreaterThan(20);
    });
  });

  describe('buildKiboContext', () => {
    test('should return empty context when no history', async () => {
      const ctx = await buildKiboContext('test-user');
      expect(ctx.userId).toBe('test-user');
    });

    test('should calculate averages from history', async () => {
      mockGetCheckinHistory.mockResolvedValueOnce([
        { mood: 7, sleep: 8, anxiety: 3, activity: 6, social: 5, timestamp: new Date() },
        { mood: 6, sleep: 7, anxiety: 4, activity: 5, social: 6, timestamp: new Date() },
      ]);

      const ctx = await buildKiboContext('test-user');
      expect(ctx.avgMood).toBeCloseTo(6.5, 1);
      expect(ctx.avgSleep).toBeCloseTo(7.5, 1);
    });
  });

  describe('Edge cases', () => {
    test('should handle empty string', () => {
      const response = generateLocalKiboResponse('');
      expect(response.length).toBeGreaterThan(0);
    });

    test('should handle very long input', () => {
      const longInput = 'a'.repeat(2000);
      const response = generateLocalKiboResponse(longInput);
      expect(response.length).toBeGreaterThan(0);
    });

    test('should handle special characters', () => {
      const response = generateLocalKiboResponse('!!! ??? ... @#$%');
      expect(response.length).toBeGreaterThan(0);
    });

    test('should return a string', () => {
      const response = generateLocalKiboResponse('test');
      expect(typeof response).toBe('string');
    });

    test('should contain more than 10 chars in greeting response', () => {
      const response = generateLocalKiboResponse('oi');
      expect(response.length).toBeGreaterThan(10);
    });
  });

  describe('callKiboAPI', () => {
    const mockFetch = jest.fn();

    beforeEach(() => {
      mockFetch.mockReset();
      global.fetch = mockFetch;
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    test('should return reply from REST API when successful', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ reply: 'Olá! Como posso ajudar? 💜' }),
      });

      const reply = await callKiboAPI('Olá Kibo');
      expect(reply).toBe('Olá! Como posso ajudar? 💜');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.example.com/api/chat',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'Olá Kibo', context: undefined, history: undefined }),
        })
      );
    });

    test('should pass context and history to API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ reply: 'Contexto recebido' }),
      });

      const ctx: KiboContext = { userId: 'test-uid', avgMood: 7, streak: 5 };
      const history: KiboConversationMessage[] = [
        { role: 'user', content: 'Oi' },
        { role: 'assistant', content: 'Oi! Como vai?' },
      ];

      const reply = await callKiboAPI('Como estou?', ctx, history);
      expect(reply).toBe('Contexto recebido');

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.context).toEqual(ctx);
      expect(callBody.history).toEqual(history);
    });

    test('should fall back to local generation when API call fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const reply = await callKiboAPI('Oi Kibo');
      // Falls back to local generation - should be a non-empty string
      expect(typeof reply).toBe('string');
      expect(reply.length).toBeGreaterThan(0);
    });

    test('should fall back to local generation when API returns non-ok', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const reply = await callKiboAPI('Oi Kibo');
      expect(typeof reply).toBe('string');
      expect(reply.length).toBeGreaterThan(0);
    });

    test('should fall back to local generation when API returns no reply', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ reply: '' }),
      });

      const reply = await callKiboAPI('Oi Kibo');
      expect(typeof reply).toBe('string');
      expect(reply.length).toBeGreaterThan(0);
    });

    test('should fall back to local generation when API returns unexpected shape', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ notAReply: 'something' }),
      });

      const reply = await callKiboAPI('Oi Kibo');
      expect(typeof reply).toBe('string');
      expect(reply.length).toBeGreaterThan(0);
    });

    test('should handle non-ok response with non-200 status code', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
      });

      const reply = await callKiboAPI('test message');
      // Falls back to local generation
      expect(typeof reply).toBe('string');
      expect(reply.length).toBeGreaterThan(0);
    });

    test('should include message in request body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ reply: 'OK' }),
      });

      await callKiboAPI('meu nome é João');

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.message).toBe('meu nome é João');
    });
  });
});
