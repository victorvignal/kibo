import { generateLocalKiboResponse } from '../services/kiboApi';

describe('kiboApi - generateLocalKiboResponse', () => {
  const noContext = { userId: 'user-123' };

  const ctxWithMood = {
    userId: 'user-123',
    avgMood: 3.5,
    avgSleep: 4.0,
    avgAnxiety: 8.0,
    avgSocial: 3.0,
    streak: 0,
    trend: 'worsening' as const,
  };

  const ctxGood = {
    userId: 'user-123',
    avgMood: 8.0,
    avgSleep: 7.5,
    avgAnxiety: 2.0,
    avgSocial: 7.0,
    streak: 14,
    trend: 'improving' as const,
  };

  describe('risk detection', () => {
    it('detects suicide/self-harm keywords and provides crisis resources', () => {
      const response = generateLocalKiboResponse('Quero me matar', noContext);
      expect(response).toContain('CVV');
      expect(response).toContain('188');
      expect(response.toLowerCase()).toContain('sozinho');
    });

    it('detects suicidal ideation in Portuguese', () => {
      const response = generateLocalKiboResponse('tenho ideiaçao suicidaria', noContext);
      expect(response).toContain('CVV');
    });

    it('detects desperation patterns', () => {
      const response = generateLocalKiboResponse('não aguento mais, melhor sem mim', noContext);
      expect(response).toContain('CVV');
    });
  });

  describe('crisis detection', () => {
    it('detects crisis keywords and provides grounding techniques', () => {
      const response = generateLocalKiboResponse('estou em crise, pânico', noContext);
      expect(response).toContain('5-4-3-2-1');
      expect(response).toContain('188');
    });

    it('detects emergency keywords', () => {
      const response = generateLocalKiboResponse('emergência, preciso de ajuda agora', noContext);
      expect(response).toContain('5-4-3-2-1');
    });
  });

  describe('sadness responses', () => {
    it('responds to sadness with empathy', () => {
      const response = generateLocalKiboResponse('estou triste hoje', noContext);
      expect(response.toLowerCase()).toContain('triste');
    });

    it('gives personalized response when mood is low', () => {
      const response = generateLocalKiboResponse('estou triste', ctxWithMood);
      expect(response).toContain('3.5'); // avgMood context
    });

    it('asks follow-up when no specific context', () => {
      const response = generateLocalKiboResponse('estou chateada', noContext);
      expect(response.toLowerCase()).toContain('conta');
    });
  });

  describe('anxiety responses', () => {
    it('responds to anxiety with grounding technique', () => {
      const response = generateLocalKiboResponse('estou ansioso', noContext);
      expect(response).toContain('5-4-3-2-1');
    });

    it('mentions high anxiety levels when context shows it', () => {
      const response = generateLocalKiboResponse('estou muito nervoso', ctxWithMood);
      expect(response).toContain('8'); // avgAnxiety
    });
  });

  describe('stress responses', () => {
    it('responds to stress with practical tips', () => {
      const response = generateLocalKiboResponse('estou muito estressado', noContext);
      expect(response).not.toBe('');
      expect(response.length).toBeGreaterThan(20);
    });

    it('mentions sleep when sleep is low', () => {
      const response = generateLocalKiboResponse('estou sobrecarregado', ctxWithMood);
      expect(response).toContain('4'); // avgSleep
    });
  });

  describe('sleep responses', () => {
    it('responds to sleep-related queries with tips', () => {
      const response = generateLocalKiboResponse('não consigo dormir', noContext);
      expect(response.toLowerCase()).toContain('sono');
    });

    it('gives contextual sleep assessment', () => {
      const response = generateLocalKiboResponse('problemas para dormir', ctxGood);
      expect(response).toContain('bom');
    });
  });

  describe('loneliness responses', () => {
    it('responds empathetically to loneliness', () => {
      const response = generateLocalKiboResponse('me sinto muito sozinho', noContext);
      expect(response.toLowerCase()).toContain('solidão');
    });

    it('mentions social score when low', () => {
      const lowSocialCtx = { ...ctxWithMood, avgSocial: 2.5 };
      const response = generateLocalKiboResponse('estou isolado', lowSocialCtx);
      expect(response).toContain('2.5'); // avgSocial
    });
  });

  describe('positive responses', () => {
    it('celebrates positive feelings', () => {
      const response = generateLocalKiboResponse('estou muito feliz hoje', noContext);
      expect(response.toLowerCase()).toContain('feliz');
    });

    it('mentions streak when positive', () => {
      const response = generateLocalKiboResponse('estou muito bem', ctxGood);
      expect(response).toContain('14'); // streak
    });

    it('mentions improving trend when positive', () => {
      // "estou muito bem" triggers the positive pattern
      const response = generateLocalKiboResponse('estou muito bem', ctxGood);
      expect(response.toLowerCase()).toContain('melhora');
    });
  });

  describe('greetings', () => {
    it('responds to oi/olá', () => {
      const response = generateLocalKiboResponse('oi', noContext);
      expect(response.toLowerCase()).toContain('kibo');
    });

    it('responds to hey', () => {
      const response = generateLocalKiboResponse('hey', noContext);
      expect(response.toLowerCase()).toContain('kibo');
    });

    it('includes context in greeting when available', () => {
      // "kibo" alone triggers the greeting pattern
      const response = generateLocalKiboResponse('kibo', ctxGood);
      expect(response.toLowerCase()).toContain('kibo');
      expect(response).toContain('8'); // avgMood
    });
  });

  describe('gratitude', () => {
    it('responds to thanks/gratitude', () => {
      const response = generateLocalKiboResponse('obrigado pela ajuda', noContext);
      expect(response.toLowerCase()).toContain('de nada');
    });

    it('responds to valeu', () => {
      const response = generateLocalKiboResponse('valeu kibo', noContext);
      expect(response.toLowerCase()).toContain('de nada');
    });
  });

  describe('check-in encouragement', () => {
    it('encourages check-in when mentioned', () => {
      const response = generateLocalKiboResponse('quero fazer check-in', noContext);
      expect(response.toLowerCase()).toContain('check-in');
    });

    it('mentions streak when positive', () => {
      const response = generateLocalKiboResponse('check in', ctxGood);
      expect(response).toContain('14');
    });

    it('encourages first check-in when streak is 0', () => {
      const response = generateLocalKiboResponse('checkin', ctxWithMood);
      expect(response.toLowerCase()).toContain('ainda não fez');
    });
  });

  describe('breathing exercise', () => {
    it('mentions breathing exercises when asked', () => {
      const response = generateLocalKiboResponse('preciso relaxar', noContext);
      expect(response.toLowerCase()).toContain('respir');
    });

    it('describes breathing technique when requested', () => {
      const response = generateLocalKiboResponse('exercício de respiração', noContext);
      expect(response).toContain('4-7-8');
    });
  });

  describe('summary request', () => {
    it('shows summary when context is available', () => {
      const response = generateLocalKiboResponse('como estou?', ctxGood);
      expect(response).toContain('8'); // avgMood
      expect(response).toContain('médio');
    });

    it('says not enough data when no context', () => {
      const response = generateLocalKiboResponse('como vai minha saúde mental?', noContext);
      expect(response.toLowerCase()).toContain('dados suficientes');
    });

    it('calculates risk level correctly', () => {
      const response = generateLocalKiboResponse('status', ctxWithMood);
      expect(response.toLowerCase()).toContain('risco');
      // mood 3.5 + anxiety 8 = should be elevated risk
      expect(response.toLowerCase()).toMatch(/elevado|moderado/);
    });
  });

  describe('default responses', () => {
    it('returns a non-empty response for unknown inputs', () => {
      const response = generateLocalKiboResponse('o tempo está bonito hoje', noContext);
      expect(response.length).toBeGreaterThan(20);
    });

    it('returns one of the default response options', () => {
      const responses = new Set<string>();
      // Run multiple times to catch different random responses
      for (let i = 0; i < 20; i++) {
        responses.add(generateLocalKiboResponse('blah blah', noContext));
      }
      // Should cycle through at least a few different responses
      expect(responses.size).toBeGreaterThan(1);
    });
  });
});
