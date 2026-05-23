import { collection, addDoc, query, where, orderBy, getDocs, Timestamp, doc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface JournalEntry {
  id: string;
  content: string;
  mood?: number;
  tags: string[];
  createdAt: Date;
  updatedAt?: Date;
}

const TAGS = [
  { id: 'gratitude', label: 'Gratidão', emoji: '🙏' },
  { id: 'challenge', label: 'Desafio', emoji: '💪' },
  { id: 'insight', label: 'Aprendizado', emoji: '💡' },
  { id: 'emotion', label: 'Emoção', emoji: '💜' },
  { id: 'goal', label: 'Meta', emoji: '🎯' },
  { id: 'memory', label: 'Memória', emoji: '📸' },
];

export { TAGS };

export async function saveJournalEntry(
  userId: string,
  content: string,
  mood?: number,
  tags: string[] = [],
  existingId?: string
): Promise<string> {
  if (existingId) {
    // Update existing entry
    const ref = doc(db, 'journal', existingId);
    const { updateDoc } = await import('firebase/firestore');
    await updateDoc(ref, {
      content,
      mood,
      tags,
      updatedAt: Timestamp.now(),
    });
    return existingId;
  }

  const ref = await addDoc(collection(db, 'journal'), {
    userId,
    content,
    mood,
    tags,
    createdAt: Timestamp.now(),
  });
  return ref.id;
}

export async function getJournalEntries(
  userId: string,
  limitCount: number = 50
): Promise<JournalEntry[]> {
  const q = query(
    collection(db, 'journal'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.slice(0, limitCount).map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      content: data.content || '',
      mood: data.mood,
      tags: data.tags || [],
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate(),
    };
  });
}

export async function getJournalEntriesByDate(
  userId: string,
  date: Date
): Promise<JournalEntry[]> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const q = query(
    collection(db, 'journal'),
    where('userId', '==', userId),
    where('createdAt', '>=', Timestamp.fromDate(startOfDay)),
    where('createdAt', '<=', Timestamp.fromDate(endOfDay)),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      content: data.content || '',
      mood: data.mood,
      tags: data.tags || [],
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate(),
    };
  });
}

export async function deleteJournalEntry(entryId: string): Promise<void> {
  const ref = doc(db, 'journal', entryId);
  await deleteDoc(ref);
}

export function getJournalPrompts(): string[] {
  return [
    'O que você é grato(a) hoje?',
    'Qual foi o momento mais desafiador do seu dia?',
    'O que você aprendeu sobre si mesmo(a) hoje?',
    'Como você cuidou de sua saúde mental hoje?',
    'O que te fez sorrir hoje?',
    'Se você pudesse mudar algo no seu dia, o que seria?',
    'Qual é uma coisa pequena que te trouxe alegria recentemente?',
    'Como você se sente agora, neste momento?',
    'O que você está evitando pensar?',
    'Qual é uma coisa que você quer melhorar amanhã?',
    'Descreva um momento de paz que você teve hoje.',
    'O que você fez hoje que foi bom para alguém?',
    'Se você pudesse dizer algo para si mesmo(a) de uma semana atrás, o que seria?',
    'Quais são as três melhores coisas que aconteceram esta semana?',
    'O que te dá energia e o que te draining?',
  ];
}
