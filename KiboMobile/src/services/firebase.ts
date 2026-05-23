import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';

// Firebase config - same project as mindflow web app (kibo-b298c)
const firebaseConfig = {
  apiKey: "AIzaSyCp1N9TqP9Sbg-do9XIdtWyv1Iun4rcbks",
  authDomain: "kibo-b298c.firebaseapp.com",
  projectId: "kibo-b298c",
  storageBucket: "kibo-b298c.firebasestorage.app",
  messagingSenderId: "200340570493",
  appId: "1:200340570493:web:22ef427660944d88338c14",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };

// ─── Auth functions ─────────────────────────────────────────────────────────

export async function login(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function register(email: string, password: string, name: string, role: 'patient' | 'psychologist') {
  const result = await createUserWithEmailAndPassword(auth, email, password);

  // Create user profile in Firestore
  const profile: Record<string, unknown> = {
    name,
    email,
    role,
    createdAt: Timestamp.now(),
  };

  // Psychologists need a patientIds array for Firestore rules
  if (role === 'psychologist') {
    profile.patientIds = [];
  }

  await setDoc(doc(db, 'users', result.user.uid), profile);

  return result;
}

export async function logout() {
  return signOut(auth);
}

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export function getCurrentUser() {
  return auth.currentUser;
}

// ─── Firestore functions ───────────────────────────────────────────────────

export async function getUserProfile(userId: string) {
  const docSnap = await getDoc(doc(db, 'users', userId));
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() };
  }
  return null;
}

export async function updateUserProfile(userId: string, data: Record<string, unknown>) {
  await setDoc(doc(db, 'users', userId), data, { merge: true });
}

export async function saveMessage(patientId: string, message: { role: string; content: string; type?: string }) {
  await addDoc(collection(db, 'messages'), {
    patientId,
    ...message,
    timestamp: Timestamp.now(),
  });
}

export async function getMessages(patientId: string, limit: number = 50) {
  const q = query(
    collection(db, 'messages'),
    where('patientId', '==', patientId),
    orderBy('timestamp', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function saveCheckin(patientId: string, checkin: {
  mood: number;
  sleep: number;
  anxiety: number;
  activity: number;
  social: number;
  notes?: string;
}) {
  await addDoc(collection(db, 'checkins'), {
    patientId,
    ...checkin,
    timestamp: Timestamp.now(),
  });
}

export async function saveSensorData(patientId: string, data: {
  type: string;
  readings: unknown[];
  count: number;
  flushedAt?: string;
}) {
  await addDoc(collection(db, 'sensorData'), {
    patientId,
    ...data,
    timestamp: Timestamp.now(),
  });
}

export async function getPatientData(patientId: string, days: number = 7) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const q = query(
    collection(db, 'sensorData'),
    where('patientId', '==', patientId),
    orderBy('timestamp', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// ─── Push Token management ─────────────────────────────────────────────────

export async function savePushToken(userId: string, token: string): Promise<void> {
  await setDoc(
    doc(db, 'users', userId),
    { pushToken: token, pushTokenUpdatedAt: Timestamp.now() },
    { merge: true }
  );
}

export async function getPushToken(userId: string): Promise<string | null> {
  const docSnap = await getDoc(doc(db, 'users', userId));
  if (!docSnap.exists()) return null;
  const data = docSnap.data();
  return data.pushToken ?? null;
}

// ─── Notifications ──────────────────────────────────────────────────────────

export interface KiboNotification {
  id: string;
  toUserId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  read: boolean;
  createdAt: Date;
}

export async function getNotifications(userId: string, limit: number = 20): Promise<KiboNotification[]> {
  const q = query(
    collection(db, 'notifications'),
    where('toUserId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.slice(0, limit).map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      toUserId: data.toUserId || '',
      title: data.title || '',
      body: data.body || '',
      data: data.data || {},
      read: data.read || false,
      createdAt: data.createdAt?.toDate() || new Date(),
    };
  });
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  await setDoc(
    doc(db, 'notifications', notificationId),
    { read: true },
    { merge: true }
  );
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const q = query(
    collection(db, 'notifications'),
    where('toUserId', '==', userId),
    where('read', '==', false)
  );
  const snapshot = await getDocs(q);
  return snapshot.size;
}
