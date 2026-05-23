import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

export interface CheckinData {
  id: string;
  mood: number;
  sleep: number;
  anxiety: number;
  activity: number;
  social: number;
  notes?: string;
  timestamp?: Date;
}

export async function getCheckinHistory(patientId: string, days: number = 30): Promise<CheckinData[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const q = query(
    collection(db, 'checkins'),
    where('patientId', '==', patientId),
    where('timestamp', '>=', Timestamp.fromDate(cutoff)),
    orderBy('timestamp', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      mood: data.mood || 5,
      sleep: data.sleep || 5,
      anxiety: data.anxiety || 5,
      activity: data.activity || 5,
      social: data.social || 5,
      notes: data.notes || '',
      timestamp: data.timestamp?.toDate(),
    };
  });
}

export async function getWeeklyAverage(patientId: string): Promise<{
  mood: number;
  sleep: number;
  anxiety: number;
  activity: number;
  social: number;
  checkinCount: number;
}> {
  const history = await getCheckinHistory(patientId, 7);

  if (history.length === 0) {
    return { mood: 0, sleep: 0, anxiety: 0, activity: 0, social: 0, checkinCount: 0 };
  }

  const totals = history.reduce(
    (acc, c) => ({
      mood: acc.mood + c.mood,
      sleep: acc.sleep + c.sleep,
      anxiety: acc.anxiety + c.anxiety,
      activity: acc.activity + c.activity,
      social: acc.social + c.social,
    }),
    { mood: 0, sleep: 0, anxiety: 0, activity: 0, social: 0 }
  );

  const count = history.length;
  return {
    mood: Math.round((totals.mood / count) * 10) / 10,
    sleep: Math.round((totals.sleep / count) * 10) / 10,
    anxiety: Math.round((totals.anxiety / count) * 10) / 10,
    activity: Math.round((totals.activity / count) * 10) / 10,
    social: Math.round((totals.social / count) * 10) / 10,
    checkinCount: count,
  };
}

export async function getMoodTrend(patientId: string, days: number = 14): Promise<Array<{ date: string; mood: number }>> {
  const history = await getCheckinHistory(patientId, days);

  // Group by date
  const byDate: Record<string, number[]> = {};
  for (const checkin of history) {
    if (!checkin.timestamp) continue;
    const dateKey = checkin.timestamp.toISOString().split('T')[0];
    if (!byDate[dateKey]) byDate[dateKey] = [];
    byDate[dateKey].push(checkin.mood);
  }

  // Average per day
  return Object.entries(byDate)
    .map(([date, moods]) => ({
      date,
      mood: Math.round((moods.reduce((a, b) => a + b, 0) / moods.length) * 10) / 10,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
