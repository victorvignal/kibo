import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const FEATURES = [
  {
    emoji: '📋',
    title: 'Check-ins Diários',
    description: 'Responda perguntas simples sobre seu humor, sono, ansiedade, atividade e vida social. Leva apenas 1 minuto e ajuda você a entender seus padrões emocionais.',
  },
  {
    emoji: '🐱',
    title: 'Conversa com Kibo',
    description: 'Kibo é seu assistente de bem-estar mental. Ele conhece seu histórico e oferece suporte contextualizado, sugestões e técnicas de autoajuda.',
  },
  {
    emoji: '👨‍⚕️',
    title: 'Conexão com Psicólogo',
    description: 'Vincule-se ao seu psicólogo para que ele possa acompanhar seu progresso. Use um código de vinculação gerado no painel web.',
  },
  {
    emoji: '📊',
    title: 'Análise de Sensores',
    description: 'Com sua permissão, o app coleta dados de movimento e localização para entender melhor sua atividade diária e padrões de sono.',
  },
  {
    emoji: '💜',
    title: 'Prevenção de Crise',
    description: 'O Kibo detecta sinais de risco e oferece recursos de apoio. Em momentos difíceis, você encontra ajuda imediata como CVV, SAMU e CAPS.',
  },
  {
    emoji: '🔥',
    title: 'Sequência de Check-ins',
    description: 'Mantenha sua sequência de check-ins! Cada dia seguido conta um ponto. Desafie-se a manter a sequência e forme hábitos saudáveis.',
  },
  {
    emoji: '📓',
    title: 'Diário de Reflexões',
    description: 'Escreva livremente sobre seus pensamentos e sentimentos. Use prompts para inspiração e tags para organizar suas reflexões.',
  },
  {
    emoji: '🌬️',
    title: 'Exercícios de Respiração',
    description: 'Técnicas guiada como 4-7-8, respiração quadrada e mais para ajudar a reduzir ansiedade e estresse no momento.',
  },
];

export default function HowKiboWorksScreen() {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.headerEmoji}>🐱</Text>
          <Text style={styles.headerTitle}>Como funciona o Kibo</Text>
          <Text style={styles.headerSubtitle}>
            Seu assistente de bem-estar mental, sempre disponível no seu bolso.
          </Text>
        </View>

        <View style={styles.features}>
          {FEATURES.map((feature, i) => (
            <View key={i} style={styles.featureCard}>
              <Text style={styles.featureEmoji}>{feature.emoji}</Text>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.privacyNote}>
          <Text style={styles.privacyNoteTitle}>🔒 Seus dados são seus</Text>
          <Text style={styles.privacyNoteText}>
            Todas as suas informações são armazenadas com segurança no Firebase (projeto kibo-b298c). Você pode exportar ou solicitar a exclusão dos seus dados a qualquer momento nas configurações do app.
          </Text>
        </View>

        <View style={styles.contact}>
          <Text style={styles.contactTitle}>Dúvidas?</Text>
          <TouchableOpacity onPress={() => Linking.openURL('mailto:suporte@kibo.app')}>
            <Text style={styles.contactLink}>suporte@kibo.app</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
        <Text style={styles.closeButtonText}>Voltar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 80,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    paddingTop: 20,
  },
  headerEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  features: {
    gap: 12,
  },
  featureCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  featureEmoji: {
    fontSize: 32,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 19,
  },
  privacyNote: {
    backgroundColor: '#F3E8FF',
    borderRadius: 16,
    padding: 16,
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  privacyNoteTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#7C3AED',
    marginBottom: 8,
  },
  privacyNoteText: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 19,
  },
  contact: {
    alignItems: 'center',
    marginTop: 32,
    paddingBottom: 20,
  },
  contactTitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  contactLink: {
    fontSize: 16,
    color: '#7C3AED',
    fontWeight: '600',
  },
  closeButton: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7C3AED',
  },
});
