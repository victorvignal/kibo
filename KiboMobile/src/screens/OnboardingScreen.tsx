import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, Dimensions, TouchableOpacity,
  FlatList, Animated, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface OnboardingSlide {
  id: string;
  emoji: string;
  title: string;
  description: string;
  color: string;
}

const SLIDES: OnboardingSlide[] = [
  {
    id: '1',
    emoji: '🐱',
    title: 'Bem-vindo ao Kibo!',
    description: 'Seu assistente pessoal de bem-estar mental. Estamos aqui para te acompanhar em cada passo da sua jornada.',
    color: '#7C3AED',
  },
  {
    id: '2',
    emoji: '📋',
    title: 'Check-ins Diários',
    description: 'Registre seu humor, sono, ansiedade e mais. Em apenas 1 minuto por dia, você constrói um histórico valioso do seu bem-estar.',
    color: '#059669',
  },
  {
    id: '3',
    emoji: '📊',
    title: 'Acompanhe seu Progresso',
    description: 'Veja gráficos, tendências e insights personalizados. Entenda seus padrões emocionais ao longo do tempo.',
    color: '#0EA5E9',
  },
  {
    id: '4',
    emoji: '💬',
    title: 'Assistente Kibo',
    description: 'Conversa inteligente que conhece seu histórico. Receba apoio, técnicas e recursos quando precisar.',
    color: '#F59E0B',
  },
  {
    id: '5',
    emoji: '🆘',
    title: 'Recursos de Crise',
    description: 'Recursos de apoio disponíveis 24h. Você nunca está sozinho - ajuda está a um toque de distância.',
    color: '#DC2626',
  },
];

export default function OnboardingScreen() {
  const navigation = useNavigation<any>();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const renderSlide = ({ item }: { item: OnboardingSlide }) => (
    <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
      <View style={[styles.emojiContainer, { backgroundColor: `${item.color}20` }]}>
        <Text style={styles.slideEmoji}>{item.emoji}</Text>
      </View>
      <Text style={[styles.slideTitle, { color: item.color }]}>{item.title}</Text>
      <Text style={styles.slideDescription}>{item.description}</Text>
    </View>
  );

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    }
  };

  const handleFinish = () => {
    // Mark onboarding as complete in local storage
    if (Platform.OS !== 'web') {
      try {
        AsyncStorage.setItem('onboarding_complete', 'true').catch(() => {});
      } catch {}
    }
    navigation.replace('Login');
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index ?? 0);
    }
  }).current;

  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 50,
  }).current;

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      />

      {/* Pagination dots */}
      <View style={styles.pagination}>
        {SLIDES.map((_, index) => {
          const inputRange = [
            (index - 1) * SCREEN_WIDTH,
            index * SCREEN_WIDTH,
            (index + 1) * SCREEN_WIDTH,
          ];
          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [8, 24, 8],
            extrapolate: 'clamp',
          });
          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                { width: dotWidth, opacity },
              ]}
            />
          );
        })}
      </View>

      {/* Navigation buttons */}
      <View style={styles.buttons}>
        {currentIndex < SLIDES.length - 1 ? (
          <>
            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleFinish}
            >
              <Text style={styles.skipText}>Pular</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.nextButton}
              onPress={handleNext}
            >
              <Text style={styles.nextText}>Próximo →</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={styles.finishButton}
            onPress={handleFinish}
          >
            <Text style={styles.finishText}>Começar →</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Privacy note */}
      <Text style={styles.privacyNote}>
        🔒 Seus dados são privados e seguros.{'\n'}
        Apenas você e profissionais que você autorizar podem ver suas informações.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    paddingTop: 60,
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emojiContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  slideEmoji: {
    fontSize: 80,
  },
  slideTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  slideDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginBottom: 32,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#7C3AED',
  },
  buttons: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 20,
  },
  skipButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  skipText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  nextButton: {
    flex: 2,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
  },
  nextText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  finishButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
  },
  finishText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  privacyNote: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingHorizontal: 40,
    paddingBottom: 40,
    lineHeight: 18,
  },
});
