import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CIRCLE_SIZE = SCREEN_WIDTH * 0.6;

interface BreathingTechnique {
  id: string;
  name: string;
  description: string;
  inhale: number;
  hold: number;
  exhale: number;
  holdAfterExhale?: number;
  emoji: string;
  color: string;
}

const TECHNIQUES: BreathingTechnique[] = [
  {
    id: '4-7-8',
    name: '4-7-8 Respiração',
    description: 'Técnica para relaxamento profundo e sono. Inspire por 4s, segure por 7s, expire por 8s.',
    inhale: 4,
    hold: 7,
    exhale: 8,
    holdAfterExhale: 0,
    emoji: '😴',
    color: '#7C3AED',
  },
  {
    id: 'box',
    name: 'Respiração Quadrada',
    description: 'Inspire, segure, expire, segure - todos pelo mesmo tempo. Ótimo para ansiedade aguda.',
    inhale: 4,
    hold: 4,
    exhale: 4,
    holdAfterExhale: 4,
    emoji: '📦',
    color: '#059669',
  },
  {
    id: 'calm',
    name: 'Respiração Calma',
    description: 'Inspire por 4s, expire por 6s. Expirar mais do que inspira ativa o sistema parassimpático.',
    inhale: 4,
    hold: 0,
    exhale: 6,
    holdAfterExhale: 0,
    emoji: '🌊',
    color: '#0EA5E9',
  },
  {
    id: 'energize',
    name: 'Respiração Energizante',
    description: 'Inspirações curtas e poderosas para aumentar energia e alertness.',
    inhale: 2,
    hold: 0,
    exhale: 2,
    holdAfterExhale: 0,
    emoji: '⚡',
    color: '#F59E0B',
  },
];

type Phase = 'idle' | 'inhale' | 'hold' | 'exhale' | 'holdAfterExhale';

const PHASE_LABELS: Record<Phase, string> = {
  idle: 'Toque para começar',
  inhale: 'Inspire',
  hold: 'Segure',
  exhale: 'Expire',
  holdAfterExhale: 'Segure',
};

export default function BreathingExerciseScreen() {
  const navigation = useNavigation<any>();
  const [selectedTechnique, setSelectedTechnique] = useState<BreathingTechnique>(TECHNIQUES[0]);
  const [isActive, setIsActive] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [countdown, setCountdown] = useState(0);
  const [cycleCount, setCycleCount] = useState(0);
  const [totalTime, setTotalTime] = useState(0);

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.6)).current;
  const countdownAnim = useRef(new Animated.Value(1)).current;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const totalTimeRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopExercise = useCallback(() => {
    setIsActive(false);
    setPhase('idle');
    setCountdown(0);
    scaleAnim.setValue(1);
    opacityAnim.setValue(0.6);

    if (intervalRef.current) clearInterval(intervalRef.current);
    if (totalTimeRef.current) clearInterval(totalTimeRef.current);
    intervalRef.current = null;
    totalTimeRef.current = null;
  }, []);

  const runPhase = useCallback((ph: Phase, duration: number) => {
    return new Promise<void>((resolve) => {
      setPhase(ph);
      setCountdown(duration);

      // Animate the circle
      if (ph === 'inhale') {
        // Expand
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 1.4,
            duration: duration * 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: duration * 1000,
            useNativeDriver: true,
          }),
        ]).start();
      } else if (ph === 'exhale') {
        // Contract
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: duration * 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0.6,
            duration: duration * 1000,
            useNativeDriver: true,
          }),
        ]).start();
      }
      // Hold phases don't animate - keep current state

      // Countdown
      let remaining = duration;
      intervalRef.current = setInterval(() => {
        remaining--;
        setCountdown(remaining);

        if (remaining <= 0) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          resolve();
        }
      }, 1000);
    });
  }, [scaleAnim, opacityAnim]);

  const startExercise = useCallback(async () => {
    setIsActive(true);
    setCycleCount(0);

    // Start total time counter
    let seconds = 0;
    totalTimeRef.current = setInterval(() => {
      seconds++;
      setTotalTime(seconds);
    }, 1000);

    // Run cycles
    while (isActive) {
      const t = selectedTechnique;

      // Inhale
      await runPhase('inhale', t.inhale);
      if (!isActive) break;

      // Hold (optional)
      if (t.hold > 0) {
        await runPhase('hold', t.hold);
        if (!isActive) break;
      }

      // Exhale
      await runPhase('exhale', t.exhale);
      if (!isActive) break;

      // Hold after exhale (optional)
      if (t.holdAfterExhale && t.holdAfterExhale > 0) {
        await runPhase('holdAfterExhale', t.holdAfterExhale);
        if (!isActive) break;
      }

      setCycleCount(c => c + 1);
    }
  }, [isActive, selectedTechnique, runPhase]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (totalTimeRef.current) clearInterval(totalTimeRef.current);
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getPhaseColor = () => {
    switch (phase) {
      case 'inhale': return '#10B981';
      case 'hold': return '#F59E0B';
      case 'exhale': return '#3B82F6';
      case 'holdAfterExhale': return '#8B5CF6';
      default: return selectedTechnique.color;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Exercícios de Respiração</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* Technique Selector */}
      {!isActive && (
        <View style={styles.techniqueSelector}>
          <Text style={styles.sectionTitle}>Escolha uma técnica</Text>
          <View style={styles.techniqueList}>
            {TECHNIQUES.map((tech) => (
              <TouchableOpacity
                key={tech.id}
                style={[
                  styles.techniqueCard,
                  selectedTechnique.id === tech.id && { borderColor: tech.color, borderWidth: 2 },
                ]}
                onPress={() => setSelectedTechnique(tech)}
                activeOpacity={0.7}
              >
                <Text style={styles.techniqueEmoji}>{tech.emoji}</Text>
                <View style={styles.techniqueInfo}>
                  <Text style={styles.techniqueName}>{tech.name}</Text>
                  <Text style={styles.techniqueDesc}>{tech.description}</Text>
                </View>
                {selectedTechnique.id === tech.id && (
                  <View style={[styles.selectedBadge, { backgroundColor: tech.color }]}>
                    <Text style={styles.selectedBadgeText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Breathing Circle */}
      <View style={styles.circleContainer}>
        <Animated.View
          style={[
            styles.circleOuter,
            {
              backgroundColor: getPhaseColor(),
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          <View style={[styles.circleInner, { borderColor: getPhaseColor() }]}>
            {isActive ? (
              <>
                <Text style={styles.phaseLabel}>{PHASE_LABELS[phase]}</Text>
                <Text style={[styles.countdown, { color: getPhaseColor() }]}>
                  {countdown}
                </Text>
                <Text style={styles.secondsLabel}>segundos</Text>
              </>
            ) : (
              <>
                <Text style={styles.circleEmoji}>{selectedTechnique.emoji}</Text>
                <Text style={styles.startHint}>Toque para começar</Text>
              </>
            )}
          </View>
        </Animated.View>
      </View>

      {/* Stats (when active) */}
      {isActive && (
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{cycleCount}</Text>
            <Text style={styles.statLabel}>Ciclos</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatTime(totalTime)}</Text>
            <Text style={styles.statLabel}>Tempo</Text>
          </View>
        </View>
      )}

      {/* Instructions */}
      {isActive && (
        <View style={styles.instructionCard}>
          <Text style={styles.instructionText}>
            {phase === 'inhale' && '🎯 Respire profundamente pelo nariz...'}
            {phase === 'hold' && '⏸️ Mantenha o ar nos pulmões...'}
            {phase === 'exhale' && '💨 Expire lentamente pela boca...'}
            {phase === 'holdAfterExhale' && '⏸️ Permaneça em repouso...'}
          </Text>
        </View>
      )}

      {/* Control Button */}
      <TouchableOpacity
        style={[
          styles.controlButton,
          isActive ? styles.stopButton : styles.startButton,
          { backgroundColor: isActive ? '#DC2626' : selectedTechnique.color },
        ]}
        onPress={isActive ? stopExercise : startExercise}
        activeOpacity={0.8}
      >
        <Text style={styles.controlButtonText}>
          {isActive ? 'Parar' : `Iniciar ${selectedTechnique.name}`}
        </Text>
      </TouchableOpacity>

      {/* Tip */}
      {!isActive && (
        <View style={styles.tipCard}>
          <Text style={styles.tipEmoji}>💡</Text>
          <Text style={styles.tipText}>
            Respire sempre pelo nariz quando possível. Se sentir tontura, pare e descanse.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backButton: {
    fontSize: 16,
    color: '#7C3AED',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
    marginHorizontal: 20,
  },
  techniqueSelector: {
    marginBottom: 16,
  },
  techniqueList: {
    paddingHorizontal: 20,
    gap: 10,
  },
  techniqueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  techniqueEmoji: {
    fontSize: 32,
  },
  techniqueInfo: {
    flex: 1,
  },
  techniqueName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  techniqueDesc: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
  selectedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedBadgeText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  circleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  circleOuter: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.6,
  },
  circleInner: {
    width: CIRCLE_SIZE - 30,
    height: CIRCLE_SIZE - 30,
    borderRadius: (CIRCLE_SIZE - 30) / 2,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  startHint: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  phaseLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 4,
  },
  countdown: {
    fontSize: 64,
    fontWeight: 'bold',
  },
  secondsLabel: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#7C3AED',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
  },
  instructionCard: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: '#F3E8FF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 15,
    color: '#5B21B6',
    fontWeight: '500',
    textAlign: 'center',
  },
  controlButton: {
    marginHorizontal: 20,
    marginTop: 20,
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  startButton: {},
  stopButton: {},
  controlButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  tipCard: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  tipEmoji: {
    fontSize: 20,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
  },
});
