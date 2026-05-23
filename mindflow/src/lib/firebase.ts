import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
  arrayUnion,
  Firestore,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "demo-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "demo.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "demo-project",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "demo.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "000000000000",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:000000000000:web:0000000000000000000000",
};

// Initialize Firebase lazily on client side only
function getFirebaseApp(): FirebaseApp {
  if (typeof window === "undefined") {
    throw new Error("Firebase can only be initialized on the client");
  }
  if (getApps().length === 0) {
    return initializeApp(firebaseConfig);
  }
  return getApps()[0];
}

export function getDatabase(): Firestore {
  return getFirestore(getFirebaseApp());
}

export function getAuthInstance() {
  return getAuth(getFirebaseApp());
}

export async function login(email: string, password: string) {
  const auth = getAuthInstance();
  return signInWithEmailAndPassword(auth, email, password);
}

export async function register(email: string, password: string, name: string, role: "psychologist" | "patient" = "patient") {
  const auth = getAuthInstance();
  const db = getDatabase();
  const result = await createUserWithEmailAndPassword(auth, email, password);
  
  // Create user profile in Firestore
  const profile: Record<string, unknown> = {
    name,
    email,
    role,
    createdAt: Timestamp.now(),
  };

  // Psychologists need a patientIds array for Firestore security rules
  if (role === 'psychologist') {
    profile.patientIds = [];
  }
  
  await setDoc(doc(db, "users", result.user.uid), profile);
  
  return result;
}

export async function logout() {
  const auth = getAuthInstance();
  return firebaseSignOut(auth);
}

export function onAuthChange(callback: (user: FirebaseUser | null) => void) {
  const auth = getAuthInstance();
  return onAuthStateChanged(auth, callback);
}

export {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
  arrayUnion,
};
