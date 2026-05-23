/**
 * ColorCheckinScreen - Emotion check-in via color selection
 * Replaces sliders with an intuitive color canvas
 *
 * Colors map to emotional states:
 * 🔴 Vermelho = Agitado / Raiva
 * 🔵 Azul = Triste
 * 🟡 Amarelo = Bem / Feliz
 * 🟢 Verde = Calmo
 * 🟣 Roxo = Ansioso
 * 🟠 Laranja = Energizado
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView,
  Alert, Animated, Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { onAuthChange } from '../services/firebase';
import { offlineFirstSaveCheckin } from '../services/offlineService';

const { width } = Dimensions.get('window');

// Color definitions with their emotional mappings
export const EMOTION_COLORS = [
  { id: 'agitated', label: 'Agitado', emoji: '😤', color: '#EF4444', bgLight: '#FEE2E2' },
  { id: 'sad',      label: 'Triste',    emoji: '😢', color: '#3B82F6', bgLight: '#DBEAFE' },
  { id: 'happy',    label: 'Bem',        emoji: '😊', color: '#FACC15', bgLight: '#FEF9C3' },
  { id: 'calm',     label: 'Calmo',      emoji: '😌', color: '#22C55E', bgLight: '#DCFCE7' },
  { id: 'anxious',  label: 'Ansioso',   emoji: '😰', color: '#A855F7', bgLight: '#F3E8FF' },
  { id: 'energized',label: 'Energizado',emoji: '🤩', color: '#F97316', bgLight: '#FFEDD5' },
];

type Step = 'color' | 'intensity' | 'notes';

interface DecisionTiming {
  colorSelectedAt: number;  // timestamp when color was selected
  intensitySelectedAt: number; // timestamp when intensity was selected
  hesitationMs: number;     // time between color first appearing and selection
}

export default function ColorCheckinScreen() {
  const navigation = useNavigation<any>();
  const [userId, setUserId] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('color');
  const [selectedColor, setSelectedColor] = useState<(typeof EMOTION_COLORS)[0] | null>(null);
  const [intensity, setIntensity] = useState(5); // 1-10, affects brightness
  const [notes, setNotes] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'pending' | 'offline'>('synced');

  // Decision timing
  const colorAppearedAt = useRef<number>(Date.now());
  const colorSelectedAt = useRef<number | null>(null);
  const intensityAppearedAt = useRef<number>(Date.now());
  const decisionTiming = useRef<DecisionTiming>({
    colorSelectedAt: 0,
    intensitySelectedAt: 0,
    hesitationMs: 0,
  });

  // Animation for color items
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const successAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate colors in
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();

    colorAppearedAt.current = Date.now();

    const unsubscribe = onAuthChange((user) => {
      if (user) setUserId(user.uid);
    });
    return () => unsubscribe();
  }, []);

  const handleColorSelect = (color: (typeof EMOTION_COLORS)[0]) => {
    colorSelectedAt.current = Date.now();
    decisionTiming.current.colorSelectedAt = colorSelectedAt.current;
    decisionTiming.current.hesitationMs = colorSelectedAt.current - colorAppearedAt.current;
    decisionTiming.current.intensitySelectedAt = 0;

    setSelectedColor(color);

    // Brief delay before transition for visual feedback
    setTimeout(() => {
      setStep('intensity');
      intensityAppearedAt.current = Date.now();
    }, 300);
  };

  const handleIntensitySelect = (value: number) => {
    setIntensity(value);
    decisionTiming.current.intensitySelectedAt = Date.now();
  };

  const handleIntensityConfirm = () => {
    setStep('notes');
  };

  const handleBack = () => {
    if (step === 'intensity') {
      setStep('color');
      colorAppearedAt.current = Date.now();
      colorSelectedAt.current = null;
    } else if (step === 'notes') {
      setStep('intensity');
    }
  };

  const handleComplete = async () => {
    if (!userId || !selectedColor) return;

    // Map color + intensity to the numeric scale (mood: 1-10)
    // Higher intensity = stronger emotion expression
    const moodMap: Record<string, number> = {
      happy: 7 + Math.floor(intensity / 3),     // 7-10
      calm: 6 + Math.floor(intensity / 4),      // 6-9
      energized: 5 + Math.floor(intensity / 3), // 5-9
      sad: 10 - Math.floor(intensity / 3),      // 7-3 (inverse - low score = sad)
      agitated: 10 - Math.floor(intensity / 3),// 7-3 (inverse)
      anxious: 10 - Math.floor(intensity / 3), // 7-3 (inverse)
    };

    const mood = Math.min(10, Math.max(1, moodMap[selectedColor.id] || 5));

    // Social and activity get neutral defaults; anxiety mapped from color
    const anxietyMap: Record<string, number> = {
      anxious: 5 + Math.floor(intensity / 2),
      agitated: 3 + Math.floor(intensity / 3),
      sad: 2 + Math.floor(intensity / 3),
      calm: 1,
      happy: 1,
      energized: 4 + Math.floor(intensity / 3),
    };

    try {
      // Use offline-first save
      const result = await offlineFirstSaveCheckin(userId, {
        mood,
        sleep: 5,
        anxiety: Math.min(10, anxietyMap[selectedColor.id] || 5),
        activity: 5,
        social: 5,
        notes: notes || undefined,
      });

      setSyncStatus(result.synced ? 'synced' : 'pending');

      // Animate success
      Animated.spring(successAnim, {
        toValue: 1,
        tension: 50,
        friction: 6,
        useNativeDriver: true,
      }).start();

      setShowSuccess(true);

      setTimeout(() => {
        navigation.goBack();
      }, 2200);

    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar o check-in. Tente novamente.');
    }
  };

  const getIntensityLabel = () => {
    if (intensity <= 3) return 'Levemente';
    if (intensity <= 6) return 'Moderadamente';
    if (intensity <= 8) return 'Bastante';
    return 'Muito intensamente';
  };

  const getSyncLabel = () => {
    switch (syncStatus) {
      case 'synced': return '✓ Sincronizado';
      case 'pending': return '⏳ Aguardando sync';
      case 'offline': return '📴 Modo offline';
    }
  };

  // ── Success Screen ─────────────────────────────────────────────────────────
  if (showSuccess) {
    return (
      <View style={[styles.container, { backgroundColor: selectedColor?.bgLight }]}>
        <Animated.View
          style={[
            styles.successCard,
            {
              transform: [{ scale: successAnim }],
              backgroundColor: '#FFFFFF',
            }
          ]}
        >
          <Text style={styles.successEmoji}>{selectedColor?.emoji}</Text>
          <Text style={styles.successTitle}>
            {selectedColor?.label} — {getIntensityLabel()}
          </Text>
          <Text style={styles.successSubtitle}>
            Seu check-in foi registrado 💜
          </Text>
          <Text style={styles.syncLabel}>{getSyncLabel()}</Text>
        </Animated.View>
      </View>
    );
  }

  // ── Step 1: Color Selection ────────────────────────────────────────────────
  if (step === 'color') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Como você está se sentindo?</Text>
          <Text style={styles.headerSubtitle}>Toque na cor que mais representa</Text>
        </View>

        <View style={styles.colorGrid}>
          {EMOTION_COLORS.map((item, index) => (
            <Animated.View
              key={item.id}
              style={[
                styles.colorItemWrapper,
                {
                  transform: [{
                    scale: scaleAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.5 + index * 0.05, 1],
                    }),
                  }],
                  opacity: scaleAnim,
                }
              ]}
            >
              <TouchableOpacity
                style={[styles.colorItem, { backgroundColor: item.color }]}
                onPress={() => handleColorSelect(item)}
                activeOpacity={0.7}
              >
                <Text style={styles.colorEmoji}>{item.emoji}</Text>
              </TouchableOpacity>
              <Text style={styles.colorLabel}>{item.label}</Text>
            </Animated.View>
          ))}
        </View>
      </View>
    );
  }

  // ── Step 2: Intensity Selection ───────────────────────────────────────────
  if (step === 'intensity' && selectedColor) {
    const intensityLevels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    return (
      <View style={[styles.container, { backgroundColor: '#FAFAFA' }]}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>← Voltar</Text>
        </TouchableOpacity>

        <View style={[styles.intensityPreview, { backgroundColor: selectedColor.color }]}>
          <Text style={styles.intensityPreviewEmoji}>{selectedColor.emoji}</Text>
          <Text style={styles.intensityPreviewLabel}>{selectedColor.label}</Text>
          <Text style={styles.intensityPreviewHint}>
            O quanto isso está forte agora?
          </Text>
        </View>

        <View style={styles.intensityGrid}>
          {intensityLevels.map((level) => (
            <TouchableOpacity
              key={level}
              style={[
                styles.intensityItem,
                {
                  backgroundColor: selectedColor.color,
                  opacity: level <= intensity ? 1 : 0.2,
                  transform: [{ scale: level === intensity ? 1.15 : 1 }],
                },
              ]}
              onPress={() => handleIntensitySelect(level)}
              activeOpacity={0.7}
            >
              <Text style={styles.intensityNumber}>{level}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.intensityLabel}>
          {getIntensityLabel()} {selectedColor.label.toLowerCase()}
        </Text>

        <TouchableOpacity
          style={[styles.nextButton, { backgroundColor: selectedColor.color }]}
          onPress={handleIntensityConfirm}
        >
          <Text style={styles.nextButtonText}>Próximo →</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Step 3: Optional Notes ─────────────────────────────────────────────────
  if (step === 'notes' && selectedColor) {
    return (
      <View style={[styles.container, { backgroundColor: '#FAFAFA' }]}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>← Voltar</Text>
        </TouchableOpacity>

        <ScrollView contentContainerStyle={styles.notesScroll}>
          <View style={[styles.notesPreview, { backgroundColor: selectedColor.color }]}>
            <Text style={styles.notesPreviewEmoji}>{selectedColor.emoji}</Text>
            <Text style={styles.notesPreviewText}>
              {selectedColor.label} — {getIntensityLabel()}
            </Text>
          </View>

          <Text style={styles.notesTitle}>Quer adicionar algo? (opcional)</Text>
          <View style={styles.notesInputWrapper}>
            <View style={[styles.notesInputContainer, { borderColor: selectedColor.color + '40' }]}>
              <TextInput
                style={styles.notesInput}
                placeholder="Ex: Tive uma reunião difícil no trabalho..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={4}
                value={notes}
                onChangeText={setNotes}
                maxLength={300}
              />
            </View>
            <Text style={styles.charCount}>{notes.length}/300</Text>
          </View>

          {/* Quick note chips */}
          <View style={styles.quickNotes}>
            {['Dia difícil 😔', 'Dormi mal 😴', 'Malhorei! 😊', 'Ansioso 😰'].map((quick) => (
              <TouchableOpacity
                key={quick}
                style={[styles.quickNoteChip, { borderColor: selectedColor.color + '60' }]}
                onPress={() => setNotes(prev => prev ? `${prev} ${quick}` : quick)}
              >
                <Text style={styles.quickNoteChipText}>{quick}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.completeButton, { backgroundColor: selectedColor.color }]}
            onPress={handleComplete}
          >
            <Text style={styles.completeButtonText}>Finalizar ✓</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    padding: 32,
    paddingTop: 60,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 16,
    marginTop: 20,
  },
  colorItemWrapper: {
    alignItems: 'center',
    width: (width - 80) / 3,
  },
  colorItem: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  colorEmoji: {
    fontSize: 36,
  },
  colorLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginTop: 8,
  },
  // Intensity step
  backButton: {
    padding: 20,
    paddingTop: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: '#7C3AED',
    fontWeight: '600',
  },
  intensityPreview: {
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  intensityPreviewEmoji: {
    fontSize: 64,
    marginBottom: 12,
  },
  intensityPreviewLabel: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  intensityPreviewHint: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
  },
  intensityGrid: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    marginTop: 24,
    gap: 8,
  },
  intensityItem: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  intensityNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  intensityLabel: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 16,
    fontWeight: '500',
  },
  nextButton: {
    marginHorizontal: 20,
    marginTop: 24,
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  // Notes step
  notesScroll: {
    paddingBottom: 40,
  },
  notesPreview: {
    marginHorizontal: 20,
    marginTop: 0,
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notesPreviewEmoji: {
    fontSize: 40,
  },
  notesPreviewText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
  },
  notesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 12,
  },
  notesInputWrapper: {
    marginHorizontal: 20,
  },
  notesInputContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    padding: 16,
    minHeight: 100,
  },
  notesInput: {
    fontSize: 15,
    color: '#111827',
    textAlignVertical: 'top',
    minHeight: 80,
  },
  charCount: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: 4,
  },
  quickNotes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    marginTop: 12,
    gap: 8,
  },
  quickNoteChip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  quickNoteChipText: {
    fontSize: 13,
    color: '#6B7280',
  },
  completeButton: {
    marginHorizontal: 20,
    marginTop: 24,
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  completeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  // Success
  successCard: {
    margin: 40,
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 5,
    flex: 1,
    justifyContent: 'center',
  },
  successEmoji: {
    fontSize: 80,
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 12,
  },
  syncLabel: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 4,
  },
});
