// Mock Firebase modules
const mockQuerySnapshot = {
  docs: [],
  empty: true,
};

export const initializeApp = jest.fn();
export const getAuth = jest.fn(() => ({ currentUser: null }));
export const getFirestore = jest.fn(() => ({}));
export const getFunctions = jest.fn();
export const signInWithEmailAndPassword = jest.fn();
export const createUserWithEmailAndPassword = jest.fn();
export const signOut = jest.fn();
export const onAuthStateChanged = jest.fn((auth, cb) => {
  cb(null);
  return jest.fn();
});
export const collection = jest.fn(() => 'mock-collection');
export const doc = jest.fn(() => 'mock-doc');
export const setDoc = jest.fn().mockResolvedValue(undefined);
export const getDoc = jest.fn().mockResolvedValue({ exists: () => false, data: () => ({}) });
export const addDoc = jest.fn().mockResolvedValue({ id: 'mock-id' });
export const getDocs = jest.fn().mockResolvedValue(mockQuerySnapshot);
export const query = jest.fn(() => 'mock-query');
export const where = jest.fn(() => 'mock-where');
export const orderBy = jest.fn(() => 'mock-order-by');
export class Timestamp {
  seconds: number;
  constructor(seconds: number) {
    this.seconds = seconds;
  }
  toDate(): Date {
    return new Date(this.seconds * 1000);
  }
  static now(): Timestamp {
    return new Timestamp(Date.now() / 1000);
  }
  static fromDate(date: Date): Timestamp {
    return new Timestamp(date.getTime() / 1000);
  }
}
export const arrayUnion = jest.fn();
export const updateDoc = jest.fn().mockResolvedValue(undefined);
export const deleteDoc = jest.fn().mockResolvedValue(undefined);
export const httpsCallable = jest.fn();
