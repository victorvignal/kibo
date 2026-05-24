import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const LAST_UPDATED = '24 de Maio de 2026';

const SECTIONS = [
  {
    emoji: '📋',
    title: '1. Informações que coletamos',
    content: `O Kibo coleta as seguintes informações:

• **Dados de check-in**: humor, sono, ansiedade, atividade física e interação social que você nos fornece voluntariamente
• **Mensagens**: conversas com Kibo (armazenadas para continuidade)
• **Dados de sensores**: movimento (acelerômetro) e localização (GPS), apenas com seu consentimento explícito
• **Dados de journal**: suas reflexões escritas
• **Dados de autenticação**: email e senha (via Firebase Authentication)`,
  },
  {
    emoji: '🔒',
    title: '2. Como usamos seus dados',
    content: `Seus dados são usados para:

• Fornecer suporte personalizado via Kibo (IA)
• Gerar insights e tendências de bem-estar
• Compartilhar progresso com seu psicólogo (se você vincular)
• Detectar sinais de risco e oferecer ajuda
• Melhorar sua experiência no app`,
  },
  {
    emoji: '👨‍⚕️',
    title: '3. Compartilhamento com terceiros',
    content: `Seus dados podem ser compartilhados nas seguintes situações:

• **Psicólogo vinculado**: Se você usar um código de vinculação, seu psicólogo terá acesso aos seus check-ins e dados de progresso
• **Serviços de infraestrutura**: Utilizamos Firebase (Google) para autenticação e banco de dados
• **Recursos de crise**: Em caso de risco iminente, podemos direcioná-lo a serviços de emergência (CVV, SAMU)

**Nunca vendemos seus dados.**`,
  },
  {
    emoji: '📍',
    title: '4. Dados de localização',
    content: `O Kibo solicita acesso à localização para:

• Entender padrões de atividade (ex: caminhadas, mobilidade)
• Correlacionar sono e atividade com localização

A coleta de localização é **opcional** e pode ser desativada a qualquer momento nas configurações. Quando desativada, apenas dados de acelerômetro são coletados. Dados de localização nunca são compartilhados com terceiros.`,
  },
  {
    emoji: '⏱️',
    title: '5. Retenção de dados',
    content: `Seus dados são mantidos enquanto sua conta estiver ativa.

• Check-ins e mensagens: mantidos por tempo indeterminado
• Dados de sensores: mantidos por 90 dias, depois anonimizados
• Journal: você pode excluir a qualquer momento
• Ao solicitar exclusão de conta, todos os dados são removidos em até 30 dias`,
  },
  {
    emoji: '🗑️',
    title: '6. Seus direitos (LGPD)',
    content: `Você tem direito a:

• **Acesso**: ver todos os seus dados armazenados
• **Correção**: corrigir dados incorretos
• **Exclusão**: solicitar exclusão dos seus dados
• **Portabilidade**: exportar seus dados em formato legível
• **Revogação**:撤回 consentimento a qualquer momento

Para exercer qualquer direito, use a função "Exportar relatório" ou "Solicitar exclusão" nas configurações do app, ou envie um email para privacidade@kibo.app.`,
  },
  {
    emoji: '🔐',
    title: '7. Segurança',
    content: `Implementamos medidas de segurança técnicas e organizacionais:

• Criptografia em trânsito (HTTPS/TLS)
• Autenticação via Firebase com email/senha ou biometria
• Regras de acesso no banco de dados (Firestore Security Rules)
• Biometria local para ações sensíveis

Nenhum sistema é 100% seguro, mas trabalhamos continuamente para proteger seus dados.`,
  },
  {
    emoji: '🍪',
    title: '8. Cookies e analytics',
    content: `O app Kibo não utiliza cookies de rastreamento.

O painel web mindflow (para psicólogos) pode utilizar cookies essenciais para autenticação.

Não utilizamos serviços de analytics de terceiros que coletam dados pessoais.`,
  },
  {
    emoji: '👶',
    title: '9. Menores de idade',
    content: `O Kibo não é direcionado a menores de 18 anos.

Se soubermos que uma pessoa menor de 18 anos está usando o app sem consentimento dos pais, removeremos suas informações imediatamente.

Se você é menor e tem dúvidas, peça ajuda a um adulto de confiança ou entre em contato pelo email abaixo.`,
  },
  {
    emoji: '📧',
    title: '10. Contato',
    content: `Para questões sobre privacidade e proteção de dados:

📧 **privacidade@kibo.app**

Respondez em até 30 dias. Para assuntos urgentes relacionados a risco, use os recursos de crise no app (CVV: 188).`,
  },
];

export default function PrivacyPolicyScreen() {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.headerEmoji}>🔒</Text>
          <Text style={styles.headerTitle}>Política de Privacidade</Text>
          <Text style={styles.headerDate}>Última atualização: {LAST_UPDATED}</Text>
        </View>

        <View style={styles.intro}>
          <Text style={styles.introText}>
            A sua privacidade é importante para nós. Esta política explica como o Kibo coleta, usa, armazena e protege seus dados pessoais, em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei 13.709/2018).
          </Text>
        </View>

        {SECTIONS.map((section, i) => (
          <View key={i} style={styles.section}>
            <Text style={styles.sectionEmoji}>{section.emoji}</Text>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionContent}>{section.content}</Text>
          </View>
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Ao usar o Kibo, você concorda com esta política de privacidade.
          </Text>
          <TouchableOpacity onPress={() => Linking.openURL('mailto:privacidade@kibo.app')}>
            <Text style={styles.footerLink}>privacidade@kibo.app</Text>
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
    marginBottom: 24,
    paddingTop: 20,
  },
  headerEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
  },
  headerDate: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 8,
  },
  intro: {
    backgroundColor: '#F3E8FF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  introText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  sectionEmoji: {
    fontSize: 20,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  sectionContent: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 20,
  },
  footer: {
    alignItems: 'center',
    marginTop: 24,
    paddingBottom: 20,
    gap: 8,
  },
  footerText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
  },
  footerLink: {
    fontSize: 15,
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
