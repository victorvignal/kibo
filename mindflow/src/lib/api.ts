import { getDatabase, collection, doc, getDoc, getDocs, setDoc, updateDoc, query, where, orderBy, Timestamp, arrayUnion } from "./firebase";
import type { Patient, DailyData, ClinicaAlert, BehavioralFeatures } from "@/types";

// Helper to get db instance
function getDb() {
  if (typeof window === "undefined") {
    throw new Error("Firebase can only be used on the client");
  }
  return getDatabase();
}

// Patient API
export async function getPatients(userId: string): Promise<Patient[]> {
  const db = getDb();
  const q = query(
    collection(db, "patients"),
    where("therapistId", "==", userId),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate(),
    lastActive: doc.data().lastActive?.toDate(),
  })) as Patient[];
}

export async function getPatient(patientId: string): Promise<Patient | null> {
  const db = getDb();
  const docRef = doc(db, "patients", patientId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return {
    id: docSnap.id,
    ...docSnap.data(),
    createdAt: docSnap.data().createdAt?.toDate(),
    lastActive: docSnap.data().lastActive?.toDate(),
  } as Patient;
}

export async function createPatient(
  patient: Omit<Patient, "id" | "createdAt">,
  userId: string
): Promise<string> {
  const db = getDb();
  const docRef = doc(collection(db, "patients"));

  // Write patient record
  await setDoc(docRef, {
    ...patient,
    therapistId: userId,
    createdAt: Timestamp.now(),
  });

  // IMPORTANT: Also register the patient as a Firebase Auth user with the same email.
  // In a production app, this would use Firebase Admin SDK or a Cloud Function
  // to create the auth account. For now, the psychologist should instruct the patient
  // to sign up with this email — the patient record will be linked via therapistId.
  //
  // Also update the psychologist's patientIds array so Firestore security rules work
  // (rules check therapistId on patients, and patientIds on users — both must be consistent).
  const psychologistRef = doc(db, "users", userId);
  try {
    await updateDoc(psychologistRef, {
      patientIds: arrayUnion(docRef.id),
    });
  } catch {
    // If patientIds doesn't exist yet on the user doc, create it
    await setDoc(
      psychologistRef,
      { patientIds: [docRef.id] },
      { merge: true }
    );
  }

  return docRef.id;
}

export async function updatePatient(
  patientId: string,
  updates: Partial<Patient>
): Promise<void> {
  const db = getDb();
  const docRef = doc(db, "patients", patientId);
  await updateDoc(docRef, updates);
}

// Daily Data API
// Tries dailyData first (populated by Cloud Functions), falls back to raw checkins
export async function getPatientData(
  patientId: string,
  days: number = 30
): Promise<DailyData[]> {
  const db = getDb();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  // Try dailyData first (Cloud Function aggregated data)
  try {
    const q = query(
      collection(db, "dailyData"),
      where("patientId", "==", patientId),
      orderBy("date", "desc")
    );
    const snapshot = await getDocs(q);
    const results = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }) as unknown as DailyData)
      .filter((d) => new Date(d.date) >= cutoff);

    if (results.length > 0) return results;
  } catch {
    // dailyData query may fail if index doesn't exist yet — fall through
  }

  // Fallback: aggregate directly from checkins collection
  const checkinQ = query(
    collection(db, "checkins"),
    where("patientId", "==", patientId),
    orderBy("timestamp", "desc")
  );
  const checkinSnapshot = await getDocs(checkinQ);

  // Group by date and aggregate
  const dateMap = new Map<string, { mood: number; sleep: number; anxiety: number; activity: number; social: number; count: number }>();

  for (const snap of checkinSnapshot.docs) {
    const data = snap.data();
    if (!data.timestamp) continue;
    const checkinDate = new Date(data.timestamp.toDate());
    if (checkinDate < cutoff) continue;
    const dateKey = checkinDate.toISOString().split("T")[0];

    const existing = dateMap.get(dateKey) ?? { mood: 0, sleep: 0, anxiety: 0, activity: 0, social: 0, count: 0 };
    existing.mood += data.mood ?? 5;
    existing.sleep += data.sleep ?? 5;
    existing.anxiety += data.anxiety ?? 5;
    existing.activity += data.activity ?? 5;
    existing.social += data.social ?? 5;
    existing.count += 1;
    dateMap.set(dateKey, existing);
  }

  return Array.from(dateMap.entries())
    .map(([date, vals]) => ({
      id: `${patientId}_${date}`,
      patientId,
      date,
      features: {
        moodScore: Math.round((vals.mood / vals.count) * 10) / 10,
        sleepDuration: Math.round((vals.sleep / vals.count) * 10) / 10,
        anxietyScore: Math.round((vals.anxiety / vals.count) * 10) / 10,
        physicalActivity: Math.round((vals.activity / vals.count) * 10) / 10,
        socialInteractionScore: Math.round((vals.social / vals.count) * 10) / 10,
      } as BehavioralFeatures,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function saveDailyFeatures(
  patientId: string,
  date: string,
  features: BehavioralFeatures
): Promise<void> {
  const db = getDb();
  const docRef = doc(db, "dailyData", `${patientId}_${date}`);
  await setDoc(
    docRef,
    {
      patientId,
      date,
      features,
      updatedAt: Timestamp.now(),
    },
    { merge: true }
  );
}

// Alerts API
export async function getAlerts(
  userId: string,
  limit: number = 20
): Promise<ClinicaAlert[]> {
  const db = getDb();
  const q = query(
    collection(db, "alerts"),
    where("therapistId", "==", userId),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.slice(0, limit).map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate(),
  })) as ClinicaAlert[];
}

export async function getPatientAlerts(
  patientId: string,
  limit: number = 20
): Promise<ClinicaAlert[]> {
  const db = getDb();
  const q = query(
    collection(db, "alerts"),
    where("patientId", "==", patientId),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.slice(0, limit).map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate(),
  })) as ClinicaAlert[];
}

export async function acknowledgeAlert(alertId: string): Promise<void> {
  const db = getDb();
  const docRef = doc(db, "alerts", alertId);
  await updateDoc(docRef, { acknowledged: true });
}

export async function createAlert(
  alert: Omit<ClinicaAlert, "id" | "createdAt" | "acknowledged">
): Promise<string> {
  const db = getDb();
  const docRef = doc(collection(db, "alerts"));
  await setDoc(docRef, {
    ...alert,
    acknowledged: false,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
}

// Kibo User Profile API
export interface KiboUserProfile {
  userId: string;
  updatedAt: Date;
  patterns: {
    bestDays: string[];
    worstDays: string[];
    bestTimeOfDay: string;
    triggers: string[];
    sleepMoodCorrelation: number;
    activityMoodCorrelation: number;
    anxietySleepCorrelation: number;
    socialMoodCorrelation: number;
  };
  trends: {
    moodDirection: "improving" | "stable" | "declining";
    sleepDirection: "improving" | "stable" | "declining";
    anxietyDirection: "improving" | "stable" | "declining";
    socialDirection: "improving" | "stable" | "declining";
    streakHealth: number;
    consecutiveCheckins: number;
    lastCheckinDate: string | null;
  };
  recommendations: {
    prioritized: string[];
    sleep: string[];
    activity: string[];
    social: string[];
    mindfulness: string[];
    personalizedChallenges: string[];
  };
  scoring: {
    coherenceScore: number;
    aiConfidence: number;
    dataPointsAnalyzed: number;
    analysisWindowDays: number;
  };
  chatContext: {
    summary: string;
    riskLevel: "low" | "medium" | "high" | "critical";
    keyInsight: string;
    bestDayForEngagement: string;
    worstDayAlert: string;
    triggerWarning: string;
  };
}

export async function getUserProfile(
  patientId: string
): Promise<KiboUserProfile | null> {
  const db = getDb();
  try {
    const docRef = doc(db, "users", patientId, "profile", "weekly");
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    const data = docSnap.data();
    return {
      ...data,
      updatedAt: data.updatedAt?.toDate() || new Date(),
    } as KiboUserProfile;
  } catch (error) {
    console.error("Failed to get user profile:", error);
    return null;
  }
}

// ─── Therapist Linking Codes ─────────────────────────────────────────────────

export interface LinkingCode {
  code: string;
  psychologistId: string;
  psychologistName: string;
  createdAt: Date;
  expiresAt: Date;
  used: boolean;
}

function generateCode(length = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I, O, 0, 1 to avoid confusion
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function generateLinkingCode(psychologistId: string): Promise<LinkingCode> {
  const db = getDb();

  // First, revoke any existing active codes for this psychologist
  const existingQ = query(
    collection(db, 'linkingCodes'),
    where('psychologistId', '==', psychologistId),
    where('used', '==', false)
  );
  const existingSnap = await getDocs(existingQ);
  for (const d of existingSnap.docs) {
    await import('firebase/firestore').then(({ deleteDoc }) => deleteDoc(d.ref));
  }

  // Get psychologist name
  const userDoc = await getDoc(doc(db, 'users', psychologistId));
  const psychologistName = userDoc.exists() ? (userDoc.data().name as string) || 'Psicólogo' : 'Psicólogo';

  // Create new code
  const code = generateCode();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

  await setDoc(doc(collection(db, 'linkingCodes')), {
    code,
    psychologistId,
    psychologistName,
    createdAt: Timestamp.now(),
    expiresAt,
    used: false,
  });

  return { code, psychologistId, psychologistName, createdAt: new Date(), expiresAt, used: false };
}

export async function getActiveLinkingCode(psychologistId: string): Promise<LinkingCode | null> {
  const db = getDb();
  const q = query(
    collection(db, 'linkingCodes'),
    where('psychologistId', '==', psychologistId),
    where('used', '==', false)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;

  const doc = snapshot.docs[0];
  const data = doc.data();
  const expiresAt = data.expiresAt instanceof Timestamp ? data.expiresAt.toDate() : new Date(data.expiresAt);

  if (expiresAt < new Date()) {
    // Expired - delete it
    await import('firebase/firestore').then(({ deleteDoc }) => deleteDoc(doc.ref));
    return null;
  }

  return {
    code: data.code,
    psychologistId: data.psychologistId,
    psychologistName: data.psychologistName,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
    expiresAt,
    used: false,
  };
}

export async function useLinkingCode(
  code: string,
  patientId: string,
  patientEmail: string,
  patientName: string
): Promise<{ success: boolean; error?: string }> {
  const db = getDb();

  // Find the code
  const q = query(
    collection(db, 'linkingCodes'),
    where('code', '==', code.toUpperCase()),
    where('used', '==', false)
  );
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return { success: false, error: 'Código inválido ou expirado.' };
  }

  const codeDoc = snapshot.docs[0];
  const data = codeDoc.data();
  const expiresAt = data.expiresAt instanceof Timestamp ? data.expiresAt.toDate() : new Date(data.expiresAt);

  if (expiresAt < new Date()) {
    await import('firebase/firestore').then(({ deleteDoc }) => deleteDoc(codeDoc.ref));
    return { success: false, error: 'Este código expirou. Peça um novo ao seu psicólogo.' };
  }

  const psychologistId = data.psychologistId;

  try {
    // Create patient record (so psychologist can see this patient)
    const patientRef = doc(collection(db, 'patients'));
    await setDoc(patientRef, {
      name: patientName,
      email: patientEmail,
      therapistId: psychologistId,
      status: 'active',
      riskLevel: 'low',
      createdAt: Timestamp.now(),
      linkedAt: Timestamp.now(),
    });

    // Update psychologist's patientIds array
    const psychologistRef = doc(db, 'users', psychologistId);
    try {
      await updateDoc(psychologistRef, {
        patientIds: arrayUnion(patientRef.id),
      });
    } catch {
      await setDoc(psychologistRef, { patientIds: [patientRef.id] }, { merge: true });
    }

    // Mark code as used
    await updateDoc(codeDoc.ref, { used: true, usedBy: patientId, usedAt: Timestamp.now() });

    return { success: true };
  } catch (err) {
    console.error('Linking code error:', err);
    return { success: false, error: 'Erro ao conectar. Tente novamente.' };
  }
}

export async function revokeLinkingCode(psychologistId: string): Promise<void> {
  const db = getDb();
  const q = query(
    collection(db, 'linkingCodes'),
    where('psychologistId', '==', psychologistId),
    where('used', '==', false)
  );
  const snapshot = await getDocs(q);
  for (const d of snapshot.docs) {
    await import('firebase/firestore').then(({ deleteDoc }) => deleteDoc(d.ref));
  }
}
