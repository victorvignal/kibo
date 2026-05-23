import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Modal,
  Linking, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { onAuthChange, getMessages } from '../services/firebase';
import { offlineFirstSaveMessage } from '../services/offlineService';
import { callKiboAPI, KiboContext, buildKiboContext, KiboConversationMessage } from '../services/kiboApi';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const CRISIS_RESOURCES = [
  { name: 'CVV - Centro de Valorização da Vida', phone: '188', description: 'Apoio emocional 24h', emoji: '📞' },
  { name: 'SAMU', phone: '192', description: 'Emergências médicas', emoji: '🏥' },
  { name: 'Polícia', phone: '190', description: 'Emergências', emoji: '🚔' },
  { name: 'CAPS mais próximo', phone: '', description: 'Centro de Atenção Psicossocial', emoji: '🧠' },
];

function CrisisPanel({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const handleCall = (phone: string) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    } else {
      Alert.alert(
        'CAPS',
        'Procure o CAPS mais próximo da sua região. O link levará ao site do Ministério da Saúde com mais informações.',
        [
          { text: 'Entendi', style: 'cancel' },
          { text: 'Abrir site', onPress: () => Linking.openURL('https://www.gov.br/saude/pt-br/assuntos/saude-para-voce/saude-mental/caps') },
        ]
      );
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={crisisStyles.overlay}>
        <View style={crisisStyles.panel}>
          <View style={crisisStyles.panelHeader}>
            <Text style={crisisStyles.panelTitle}>🆘 Recursos de Crise</Text>
            <TouchableOpacity onPress={onClose} style={crisisStyles.closeButton}>
              <Text style={crisisStyles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={crisisStyles.panelSubtitle}>
            Se você está em crise ou precisa de ajuda imediata, entre em contato:
          </Text>
          {CRISIS_RESOURCES.map((resource) => (
            <TouchableOpacity
              key={resource.name}
              style={crisisStyles.resourceItem}
              onPress={() => handleCall(resource.phone)}
            >
              <Text style={crisisStyles.resourceEmoji}>{resource.emoji}</Text>
              <View style={crisisStyles.resourceInfo}>
                <Text style={crisisStyles.resourceName}>{resource.name}</Text>
                <Text style={crisisStyles.resourceDesc}>{resource.description}</Text>
              </View>
              {resource.phone ? (
                <View style={crisisStyles.phoneBadge}>
                  <Text style={crisisStyles.phoneBadgeText}>{resource.phone}</Text>
                </View>
              ) : (
                <Text style={crisisStyles.arrow}>→</Text>
              )}
            </TouchableOpacity>
          ))}
          <View style={crisisStyles.messageBox}>
            <Text style={crisisStyles.messageBoxText}>
              💜 Você não está sozinho(a). Pedir ajuda é um sinal de força.
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const crisisStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  panel: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  panelTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#DC2626',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 20,
    color: '#6B7280',
  },
  panelSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
    lineHeight: 20,
  },
  resourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  resourceEmoji: {
    fontSize: 28,
    marginRight: 12,
  },
  resourceInfo: {
    flex: 1,
  },
  resourceName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  resourceDesc: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  phoneBadge: {
    backgroundColor: '#DC2626',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  phoneBadgeText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  arrow: {
    fontSize: 18,
    color: '#6B7280',
  },
  messageBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  messageBoxText: {
    fontSize: 14,
    color: '#92400E',
    textAlign: 'center',
    fontWeight: '500',
  },
});

const KIBO_PERSONA = {
  name: 'Kibo',
  emoji: '🐱',
};

export default function ChatScreen() {
  const navigation = useNavigation<any>();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Olá! Sou o Kibo, seu assistente de bem-estar mental. Como você está se sentindo hoje? 💜',
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [crisisVisible, setCrisisVisible] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const unsubscribe = onAuthChange(async (user) => {
      if (user) {
        setUserId(user.uid);
        // Load previous messages from Firebase
        try {
          const previousMessages = await getMessages(user.uid);
          if (previousMessages.length > 0) {
            const loaded = previousMessages.reverse().map((m: any) => ({
              id: m.id,
              role: m.role as 'user' | 'assistant',
              content: m.content,
              timestamp: m.timestamp?.toDate() || new Date(),
            }));
            setMessages(prev => [prev[0], ...loaded]);
          }
        } catch (err) {
          console.warn('Failed to load message history:', err);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const scrollToBottom = () => {
    scrollRef.current?.scrollToEnd({ animated: true });
  };

  const handleSend = async () => {
    if (!inputText.trim() || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    // Save user message to Firebase (offline-first)
    if (userId) {
      try {
        await offlineFirstSaveMessage(userId, {
          role: 'user',
          content: inputText.trim(),
          type: 'chat',
        });
      } catch (err) {
        console.warn('Failed to save user message:', err);
      }
    }

    // Build context for Kibo (with recent check-in data)
    const kiboContext: KiboContext | undefined = userId
      ? await buildKiboContext(userId)
      : undefined;

    // Build conversation history for context-aware responses (last 10 messages)
    const conversationHistory: KiboConversationMessage[] = messages.slice(-10).map(m => ({
      role: m.role,
      content: m.content,
    }));

    // Get Kibo's response
    try {
      const kiboResponse = await callKiboAPI(inputText.trim(), kiboContext, conversationHistory);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: kiboResponse,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (userId) {
        await offlineFirstSaveMessage(userId, {
          role: 'assistant',
          content: kiboResponse,
          type: 'chat',
        });
      }
    } catch (err) {
      console.error('Kibo response error:', err);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Desculpe, tive um problema ao processar sua mensagem. Tente novamente. 💜',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
      setTimeout(scrollToBottom, 100);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Crisis button */}
      <TouchableOpacity
        style={styles.crisisButton}
        onPress={() => setCrisisVisible(true)}
      >
        <Text style={styles.crisisButtonEmoji}>🆘</Text>
        <Text style={styles.crisisButtonText}>Preciso de ajuda</Text>
      </TouchableOpacity>

      <ScrollView
        ref={scrollRef}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={scrollToBottom}
      >
        {messages.map((message) => (
          <View
            key={message.id}
            style={[
              styles.messageRow,
              message.role === 'user' ? styles.userRow : styles.assistantRow,
            ]}
          >
            {message.role === 'assistant' && (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{KIBO_PERSONA.emoji}</Text>
              </View>
            )}
            <View
              style={[
                styles.messageBubble,
                message.role === 'user' ? styles.userBubble : styles.assistantBubble,
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  message.role === 'user' && styles.userMessageText,
                ]}
              >
                {message.content}
              </Text>
              <Text
                style={[
                  styles.messageTime,
                  message.role === 'user' && styles.userMessageTime,
                ]}
              >
                {formatTime(message.timestamp)}
              </Text>
            </View>
          </View>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <View style={[styles.messageRow, styles.assistantRow]}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{KIBO_PERSONA.emoji}</Text>
            </View>
            <View style={[styles.messageBubble, styles.assistantBubble]}>
              <View style={styles.typingIndicator}>
                <View style={styles.typingDot} />
                <View style={styles.typingDot} />
                <View style={styles.typingDot} />
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Quick action chips */}
      <View style={styles.quickActions}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickActionsContent}>
          {[
            { label: '📊 Como estou?', action: 'Como estou me sentindo?', navigate: null },
            { label: '📋 Check-in', action: 'Quero fazer meu check-in', navigate: 'Checkin' },
            { label: '🌬️ Respirar', action: null, navigate: 'BreathingExercise' },
            { label: '😔 Estou triste', action: 'Estou me sentindo triste', navigate: null },
            { label: '😰 Estou ansioso', action: 'Estou me sentindo ansioso', navigate: null },
          ].map((qa) => (
            <TouchableOpacity
              key={qa.label}
              style={styles.quickActionChip}
              onPress={() => {
                if (qa.navigate) {
                  navigation.navigate(qa.navigate);
                } else if (qa.action) {
                  setInputText(qa.action);
                }
              }}
              disabled={isTyping}
            >
              <Text style={styles.quickActionChipText}>{qa.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Digite sua mensagem..."
          placeholderTextColor="#9CA3AF"
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={500}
          editable={!isTyping}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!inputText.trim() || isTyping) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim() || isTyping}
        >
          {isTyping ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.sendButtonText}>Enviar</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
    <CrisisPanel visible={crisisVisible} onClose={() => setCrisisVisible(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  crisisButton: {
    backgroundColor: '#FEE2E2',
    borderBottomWidth: 1,
    borderBottomColor: '#FECACA',
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  crisisButtonEmoji: {
    fontSize: 18,
  },
  crisisButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  assistantRow: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  avatarText: {
    fontSize: 18,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 14,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: '#7C3AED',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#374151',
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  messageTime: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  userMessageTime: {
    color: 'rgba(255,255,255,0.7)',
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#9CA3AF',
  },
  quickActions: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  quickActionsContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    flexDirection: 'row',
  },
  quickActionChip: {
    backgroundColor: '#F3E8FF',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  quickActionChipText: {
    fontSize: 13,
    color: '#7C3AED',
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'flex-end',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    color: '#111827',
  },
  sendButton: {
    backgroundColor: '#7C3AED',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 70,
  },
  sendButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
});
