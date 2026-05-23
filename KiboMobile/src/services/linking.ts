/**
 * Therapist Linking Service
 *
 * Allows patients to connect with their psychologist using a 6-character
 * linking code generated from the mindflow web dashboard.
 */

import { db } from './firebase';
import { getAuth } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';

export interface LinkingResult {
  success: boolean;
  error?: string;
  psychologistName?: string;
}

/**
 * Use a therapist linking code to connect the current patient with their psychologist.
 * This creates a patient record visible to the psychologist in the mindflow dashboard.
 */
export async function useTherapistCode(
  code: string,
  patientName: string
): Promise<LinkingResult> {
  try {
    // Auth check first - call getAuth() directly to get current value
    const auth = getAuth();
    if (!auth.currentUser) {
      return { success: false, error: 'Você precisa estar logado para conectar.' };
    }

    // Find the code in Firestore
    const codesRef = collection(db, 'linkingCodes');
    const q = query(
      codesRef,
      where('code', '==', code.toUpperCase()),
      where('used', '==', false)
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return { success: false, error: 'Código inválido ou expirado.' };
    }

    const codeDoc = snapshot.docs[0];
    const data = codeDoc.data() as {
      psychologistId: string;
      psychologistName: string;
      expiresAt: Timestamp | Date;
      used: boolean;
    };

    // Check expiry
    const expiresAt = data.expiresAt instanceof Timestamp
      ? data.expiresAt.toDate()
      : new Date(data.expiresAt);

    if (expiresAt < new Date()) {
      // Delete expired code
      await deleteDoc(codeDoc.ref);
      return { success: false, error: 'Este código expirou. Peça um novo ao seu psicólogo.' };
    }

    const user = auth.currentUser!;
    const psychologistId = data.psychologistId;
    const psychologistName = data.psychologistName;

    // Store therapistId on patient's own user document for app-side reference
    // The psychologist manages their patient list via the mindflow web dashboard
    await setDoc(doc(db, 'users', user.uid), {
      therapistId: psychologistId,
      therapistName: psychologistName,
    }, { merge: true });

    // Mark code as used
    await updateDoc(codeDoc.ref, {
      used: true,
      usedBy: user.uid,
      usedAt: Timestamp.now(),
    });

    return { success: true, psychologistName };
  } catch (err) {
    console.error('Therapist linking error:', err);
    return { success: false, error: 'Erro ao conectar com psicólogo. Tente novamente.' };
  }
}

/**
 * Check if the current patient is already linked to a psychologist.
 */
export async function getLinkedTherapist(): Promise<{
  therapistId: string | null;
  therapistName: string | null;
} | null> {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return null;

    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) return null;

    const data = userDoc.data();
    if (data.therapistId) {
      return {
        therapistId: data.therapistId,
        therapistName: data.therapistName || null,
      };
    }
    return null;
  } catch {
    return null;
  }
}
