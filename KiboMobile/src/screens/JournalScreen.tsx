import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, Alert, RefreshControl, KeyboardAvoidingView,
  Platform, FlatList,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { onAuthChange } from '../services/firebase';
import {
  JournalEntry,
  saveJournalEntry,
  getJournalEntries,
  deleteJournalEntry,
  TAGS,
  getJournalPrompts,
} from '../services/journal';

export default function JournalScreen() {
  const [userId, setUserId] = useState<string | null>(null);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [entryContent, setEntryContent] = useState('');
  const [entryMood, setEntryMood] = useState(5);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [promptModalVisible, setPromptModalVisible] = useState(false);
  const [prompts] = useState<string[]>(getJournalPrompts());

  useEffect(() => {
    const unsubscribe = onAuthChange(async (user) => {
      if (user) {
        setUserId(user.uid);
        await loadEntries(user.uid);
      }
    });
    return () => unsubscribe();
  }, []);

  const loadEntries = async (uid: string) => {
    try {
      const loaded = await getJournalEntries(uid);
      setEntries(loaded);
    } catch (error) {
      console.warn('Failed to load journal entries:', error);
    }
  };

  const onRefresh = useCallback(async () => {
    if (!userId) return;
    setRefreshing(true);
    await loadEntries(userId);
    setRefreshing(false);
  }, [userId]);

  const openNewEntry = () => {
    setEditingEntry(null);
    setEntryContent('');
    setEntryMood(5);
    setSelectedTags([]);
    setIsEditing(true);
  };

  const openEditEntry = (entry: JournalEntry) => {
    setEditingEntry(entry);
    setEntryContent(entry.content);
    setEntryMood(entry.mood || 5);
    setSelectedTags(entry.tags);
    setIsEditing(true);
  };

  const closeEditor = () => {
    setIsEditing(false);
    setEditingEntry(null);
    setEntryContent('');
    setEntryMood(5);
    setSelectedTags([]);
  };

  const handleSave = async () => {
    if (!userId || !entryContent.trim()) {
      Alert.alert('Erro', 'Escreva algo antes de salvar.');
      return;
    }

    try {
      if (editingEntry) {
        await saveJournalEntry(userId, entryContent.trim(), entryMood, selectedTags, editingEntry.id);
        // Update in state
        setEntries(prev => prev.map(e =>
          e.id === editingEntry.id
            ? { ...e, content: entryContent.trim(), mood: entryMood, tags: selectedTags, updatedAt: new Date() }
            : e
        ));
      } else {
        const id = await saveJournalEntry(userId, entryContent.trim(), entryMood, selectedTags);
        const newEntry: JournalEntry = {
          id,
          content: entryContent.trim(),
          mood: entryMood,
          tags: selectedTags,
          createdAt: new Date(),
        };
        setEntries(prev => [newEntry, ...prev]);
      }
      closeEditor();
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar. Tente novamente.');
    }
  };

  const handleDelete = (entry: JournalEntry) => {
    Alert.alert(
      'Excluir reflexão?',
      'Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteJournalEntry(entry.id);
              setEntries(prev => prev.filter(e => e.id !== entry.id));
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível excluir.');
            }
          },
        },
      ]
    );
  };

  const getRandomPrompt = () => {
    const prompt = prompts[Math.floor(Math.random() * prompts.length)];
    setEntryContent(prev => prev ? prev + '\n\n' : '');
    setPromptModalVisible(false);
    // Add the prompt as a heading
    setEntryContent(prev => `${prev}${prompt}\n`);
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev =>
      prev.includes(tagId)
        ? prev.filter(t => t !== tagId)
        : [...prev, tagId]
    );
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const getMoodEmoji = (mood: number) => {
    if (mood <= 2) return '😔';
    if (mood <= 4) return '😕';
    if (mood <= 6) return '😐';
    if (mood <= 8) return '😊';
    return '😄';
  };

  const renderEntry = ({ item }: { item: JournalEntry }) => (
    <TouchableOpacity
      style={styles.entryCard}
      onPress={() => openEditEntry(item)}
      onLongPress={() => handleDelete(item)}
      activeOpacity={0.7}
    >
      <View style={styles.entryHeader}>
        <View style={styles.entryMeta}>
          <Text style={styles.entryDate}>{formatDate(item.createdAt)}</Text>
          <Text style={styles.entryTime}>{formatTime(item.createdAt)}</Text>
        </View>
        {item.mood && (
          <View style={styles.moodBadge}>
            <Text style={styles.moodBadgeEmoji}>{getMoodEmoji(item.mood)}</Text>
            <Text style={styles.moodBadgeText}>{item.mood}/10</Text>
          </View>
        )}
      </View>

      <Text style={styles.entryContent} numberOfLines={4}>
        {item.content}
      </Text>

      {item.tags.length > 0 && (
        <View style={styles.tagsRow}>
          {item.tags.map(tagId => {
            const tag = TAGS.find(t => t.id === tagId);
            return tag ? (
              <View key={tag.id} style={styles.tagBadge}>
                <Text style={styles.tagBadgeEmoji}>{tag.emoji}</Text>
                <Text style={styles.tagBadgeText}>{tag.label}</Text>
              </View>
            ) : null;
          })}
        </View>
      )}

      {item.updatedAt && (
        <Text style={styles.editedLabel}>Editado</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>📓 Diário</Text>
          <Text style={styles.headerSubtitle}>
            Suas reflexões e pensamentos
          </Text>
        </View>
        <TouchableOpacity style={styles.newButton} onPress={openNewEntry}>
          <Text style={styles.newButtonText}>+ Nova</Text>
        </TouchableOpacity>
      </View>

      {/* Entries list */}
      <FlatList
        data={entries}
        renderItem={renderEntry}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7C3AED']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateEmoji}>📓</Text>
            <Text style={styles.emptyStateTitle}>Seu diário está vazio</Text>
            <Text style={styles.emptyStateText}>
              Escreva sua primeira reflexão.{'\n'}
              Toque em "+ Nova" para começar.
            </Text>
          </View>
        }
        ListHeaderComponent={
          entries.length > 0 ? (
            <Text style={styles.entryCount}>
              {entries.length} reflexão{entries.length !== 1 ? 'ões' : ''}
            </Text>
          ) : null
        }
      />

      {/* Editor Modal */}
      <Modal
        visible={isEditing}
        animationType="slide"
        onRequestClose={closeEditor}
      >
        <KeyboardAvoidingView
          style={styles.editorContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.editorHeader}>
            <TouchableOpacity onPress={closeEditor}>
              <Text style={styles.editorCancel}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.editorTitle}>
              {editingEntry ? 'Editar reflexão' : 'Nova reflexão'}
            </Text>
            <TouchableOpacity onPress={handleSave}>
              <Text style={styles.editorSave}>Salvar</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.editorScroll} keyboardShouldPersistTaps="handled">
            {/* Mood selector */}
            <View style={styles.moodSection}>
              <Text style={styles.moodLabel}>
                {getMoodEmoji(entryMood)} Como você está se sentindo?
              </Text>
              <View style={styles.moodRow}>
                <Text style={styles.moodMin}>1</Text>
                <Slider
                  style={styles.moodSlider}
                  minimumValue={1}
                  maximumValue={10}
                  step={1}
                  value={entryMood}
                  onValueChange={setEntryMood}
                  minimumTrackTintColor="#7C3AED"
                  maximumTrackTintColor="#E5E7EB"
                  thumbTintColor="#7C3AED"
                />
                <Text style={styles.moodMax}>10</Text>
              </View>
              <Text style={styles.moodValue}>{entryMood}/10</Text>
            </View>

            {/* Tags */}
            <View style={styles.tagsSection}>
              <Text style={styles.sectionLabel}>Tags (opcional)</Text>
              <View style={styles.tagsGrid}>
                {TAGS.map(tag => (
                  <TouchableOpacity
                    key={tag.id}
                    style={[
                      styles.tagOption,
                      selectedTags.includes(tag.id) && styles.tagOptionSelected,
                    ]}
                    onPress={() => toggleTag(tag.id)}
                  >
                    <Text style={styles.tagOptionEmoji}>{tag.emoji}</Text>
                    <Text style={[
                      styles.tagOptionText,
                      selectedTags.includes(tag.id) && styles.tagOptionTextSelected,
                    ]}>
                      {tag.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Prompt suggestion */}
            <TouchableOpacity
              style={styles.promptButton}
              onPress={() => setPromptModalVisible(true)}
            >
              <Text style={styles.promptButtonText}>💡 Usar um prompt de reflexão</Text>
            </TouchableOpacity>

            {/* Content input */}
            <TextInput
              style={styles.contentInput}
              placeholder="O que está pensando? Escreva livremente..."
              placeholderTextColor="#9CA3AF"
              value={entryContent}
              onChangeText={setEntryContent}
              multiline
              textAlignVertical="top"
              autoFocus
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Prompt Modal */}
      <Modal
        visible={promptModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPromptModalVisible(false)}
      >
        <View style={styles.promptModalOverlay}>
          <View style={styles.promptModalContent}>
            <Text style={styles.promptModalTitle}>💡 Escolha um prompt</Text>
            <Text style={styles.promptModalSubtitle}>
              Toque em um para começar sua reflexão
            </Text>
            {prompts.slice(0, 8).map((prompt, i) => (
              <TouchableOpacity
                key={i}
                style={styles.promptItem}
                onPress={() => {
                  setEntryContent(prompt + '\n\n');
                  setPromptModalVisible(false);
                }}
              >
                <Text style={styles.promptItemText}>{prompt}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.promptModalClose}
              onPress={() => setPromptModalVisible(false)}
            >
              <Text style={styles.promptModalCloseText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  newButton: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  newButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  entryCount: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
    fontWeight: '500',
  },
  entryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  entryMeta: {},
  entryDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    textTransform: 'capitalize',
  },
  entryTime: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  moodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
  },
  moodBadgeEmoji: {
    fontSize: 16,
  },
  moodBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7C3AED',
  },
  entryContent: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 6,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  tagBadgeEmoji: {
    fontSize: 12,
  },
  tagBadgeText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  editedLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontStyle: 'italic',
    marginTop: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  // Editor styles
  editorContainer: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  editorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingTop: Platform.OS === 'android' ? 48 : 16,
  },
  editorCancel: {
    fontSize: 16,
    color: '#6B7280',
  },
  editorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  editorSave: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#7C3AED',
  },
  editorScroll: {
    flex: 1,
    padding: 16,
  },
  moodSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  moodLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  moodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  moodSlider: {
    flex: 1,
    height: 40,
  },
  moodMin: {
    fontSize: 12,
    color: '#9CA3AF',
    width: 20,
  },
  moodMax: {
    fontSize: 12,
    color: '#9CA3AF',
    width: 20,
    textAlign: 'right',
  },
  moodValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#7C3AED',
    marginTop: 4,
  },
  tagsSection: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
  },
  tagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  tagOptionSelected: {
    backgroundColor: '#F3E8FF',
    borderColor: '#7C3AED',
  },
  tagOptionEmoji: {
    fontSize: 16,
  },
  tagOptionText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  tagOptionTextSelected: {
    color: '#7C3AED',
  },
  promptButton: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  promptButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
  },
  contentInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    minHeight: 200,
    color: '#111827',
    lineHeight: 24,
  },
  // Prompt modal
  promptModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  promptModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  promptModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  promptModalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  promptItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  promptItemText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 20,
  },
  promptModalClose: {
    marginTop: 16,
    padding: 14,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    alignItems: 'center',
  },
  promptModalCloseText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
});
