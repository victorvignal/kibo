import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert } from 'react-native';

const EMERGENCY_CONTACTS = [
  {
    id: '1',
    name: 'CVV - Centro de Valorização da Vida',
    phone: '188',
    description: 'Apoio emocional, escuta qualificada e prevenção do suicídio. Atendimento 24 horas, gratuito.',
    emoji: '📞',
    color: '#059669',
    bgColor: '#D1FAE5',
  },
  {
    id: '2',
    name: 'SAMU - Serviço de Atendimento Móvel',
    phone: '192',
    description: 'Emergências médicas e orientação em saúde. Atendimento 24 horas.',
    emoji: '🏥',
    color: '#DC2626',
    bgColor: '#FEE2E2',
  },
  {
    id: '3',
    name: 'Polícia Militar',
    phone: '190',
    description: 'Emergências que requerem presença policial imediata.',
    emoji: '🚔',
    color: '#1E40AF',
    bgColor: '#DBEAFE',
  },
  {
    id: '4',
    name: 'CAPS - Centro de Atenção Psicossocial',
    phone: '',
    description: 'Serviços de saúde mental pelo SUS. Procure o CAPS mais próximo da sua cidade.',
    emoji: '🧠',
    color: '#7C3AED',
    bgColor: '#EDE9FE',
    url: 'https://www.gov.br/saude/pt-br/assuntos/saude-para-voce/saude-mental/caps',
  },
  {
    id: '5',
    name: 'Disque Direitos Humanos',
    phone: '100',
    description: 'Denúncia de violações de direitos humanos. Atendimento 24 horas, gratuito.',
    emoji: '⚖️',
    color: '#D97706',
    bgColor: '#FEF3C7',
  },
  {
    id: '6',
    name: 'Bombeiros',
    phone: '193',
    description: 'Emergências que requerem atendimento de salvamento e combate a incêndio.',
    emoji: '🚒',
    color: '#EA580C',
    bgColor: '#FED7AA',
  },
];

const PSYCHOEDUCATION_TIPS = [
  {
    title: 'Você não está sozinho',
    text: 'Sentir-se em crise é difícil, mas existem pessoas e serviços prontos para te ajudar. Não carregue esse peso sozinho.',
    emoji: '🤝',
  },
  {
    title: 'Pedir ajuda é força',
    text: 'Buscar apoio é um sinal de coragem, não de fraqueza. Todos precisamos de ajuda em algum momento.',
    emoji: '💪',
  },
  {
    title: 'Técnica de respiração',
    text: 'Respire fundo: 4 segundos inspirando, 7 segundos segurando, 8 segundos expirando. Repita 3 vezes.',
    emoji: '🌬️',
  },
  {
    title: 'Técnica 5-4-3-2-1',
    text: 'Nomeie: 5 coisas que você vê, 4 que toca, 3 que ouve, 2 que cheira, 1 que prova. Isso ajuda a se reenraizar no presente.',
    emoji: '🌍',
  },
];

export default function CrisisScreen({ navigation }: any) {
  const handleCall = (phone: string) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  };

  const handleOpenUrl = (url: string, name: string) => {
    Alert.alert(
      name,
      `Deseja abrir o site do ${name}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Abrir', onPress: () => Linking.openURL(url) },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerEmoji}>🆘</Text>
        <Text style={styles.headerTitle}>Recursos de Crise</Text>
        <Text style={styles.headerSubtitle}>
          Se você está em crise ou precisa de ajuda imediata, entre em contato com um destes recursos:
        </Text>
      </View>

      {/* Emergency Contacts */}
      <Text style={styles.sectionTitle}>Contatos de Emergência</Text>
      {EMERGENCY_CONTACTS.map((contact) => (
        <TouchableOpacity
          key={contact.id}
          style={[styles.contactCard, { backgroundColor: contact.bgColor }]}
          onPress={() => contact.phone 
            ? handleCall(contact.phone) 
            : contact.url 
              ? handleOpenUrl(contact.url, contact.name)
              : null
          }
          activeOpacity={0.7}
        >
          <Text style={styles.contactEmoji}>{contact.emoji}</Text>
          <View style={styles.contactInfo}>
            <Text style={[styles.contactName, { color: contact.color }]}>{contact.name}</Text>
            <Text style={styles.contactDesc}>{contact.description}</Text>
          </View>
          {contact.phone ? (
            <View style={[styles.phoneBadge, { backgroundColor: contact.color }]}>
              <Text style={styles.phoneBadgeText}>{contact.phone}</Text>
            </View>
          ) : (
            <Text style={styles.arrow}>→</Text>
          )}
        </TouchableOpacity>
      ))}

      {/* Psychoeducation Tips */}
      <Text style={styles.sectionTitle}>Dicas para Momentos de Crise</Text>
      <View style={styles.tipsContainer}>
        {PSYCHOEDUCATION_TIPS.map((tip, index) => (
          <View key={index} style={styles.tipCard}>
            <Text style={styles.tipEmoji}>{tip.emoji}</Text>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>{tip.title}</Text>
              <Text style={styles.tipText}>{tip.text}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Encouragement Message */}
      <View style={styles.encouragementCard}>
        <Text style={styles.encouragementEmoji}>💜</Text>
        <Text style={styles.encouragementTitle}>Você merece apoio</Text>
        <Text style={styles.encouragementText}>
          Crises são momentos difíceis, mas temporários. Com o suporte adequado, é possível superar.
          Não hesite em buscar ajuda - você não está sozinho(a).
        </Text>
      </View>

      {/* Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation?.goBack?.()}
      >
        <Text style={styles.backButtonText}>← Voltar</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    backgroundColor: '#FEE2E2',
    padding: 24,
    paddingTop: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#FECACA',
  },
  headerEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#DC2626',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#7F1D1D',
    textAlign: 'center',
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 12,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  contactEmoji: {
    fontSize: 32,
    marginRight: 14,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  contactDesc: {
    fontSize: 12,
    color: '#374151',
    lineHeight: 16,
  },
  phoneBadge: {
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginLeft: 8,
  },
  phoneBadgeText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  arrow: {
    fontSize: 18,
    color: '#6B7280',
    marginLeft: 8,
  },
  tipsContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  tipCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'flex-start',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tipEmoji: {
    fontSize: 24,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  tipText: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  encouragementCard: {
    margin: 20,
    backgroundColor: '#F3E8FF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  encouragementEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  encouragementTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#7C3AED',
    marginBottom: 8,
  },
  encouragementText: {
    fontSize: 14,
    color: '#5B21B6',
    textAlign: 'center',
    lineHeight: 22,
  },
  backButton: {
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
});
