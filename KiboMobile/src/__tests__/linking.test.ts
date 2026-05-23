/**
 * Tests for Therapist Linking Service (linking.ts)
 *
 * Both useTherapistCode and getLinkedTherapist call getAuth() directly (not using
 * the module-level auth import), so they correctly read the current mock state.
 */

import * as firebaseMock from '../__mocks__/firebase';
import { Timestamp } from '../__mocks__/firebase';

const mockUser = {
  uid: 'patient-uid',
  email: 'patient@test.com',
  displayName: 'João Paciente',
};

// Shared mutable auth object - getAuth() returns this same reference
const mockAuthObj: { currentUser: typeof mockUser | null } = { currentUser: mockUser };

(firebaseMock.getAuth as jest.Mock).mockReturnValue(mockAuthObj);
firebaseMock.getFirestore.mockReturnValue({});

function makeSnapshot(docs: any[] = []) {
  return { docs, empty: docs.length === 0, size: docs.length };
}

beforeEach(() => {
  jest.clearAllMocks();
  (firebaseMock.getAuth as jest.Mock).mockReturnValue(mockAuthObj);
  firebaseMock.getFirestore.mockReturnValue({});
  mockAuthObj.currentUser = mockUser; // Reset to logged-in state

  firebaseMock.getDocs.mockResolvedValue(makeSnapshot([]));
  firebaseMock.getDoc.mockResolvedValue({ exists: () => false, data: () => ({}) });
  firebaseMock.setDoc.mockResolvedValue(undefined);
  firebaseMock.updateDoc.mockResolvedValue(undefined);
  firebaseMock.deleteDoc.mockResolvedValue(undefined);
  firebaseMock.collection.mockReturnValue('mock-collection');
  firebaseMock.doc.mockReturnValue('mock-doc');
  firebaseMock.query.mockReturnValue('mock-query');
  firebaseMock.where.mockReturnValue('mock-where');
});

import { useTherapistCode, getLinkedTherapist } from '../services/linking';

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('useTherapistCode', () => {
  it('should return error when code is not found', async () => {
    firebaseMock.getDocs.mockResolvedValueOnce(makeSnapshot([]));

    const result = await useTherapistCode('ABC123', 'João');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Código inválido ou expirado.');
  });

  it('should return error when code is expired', async () => {
    const expiredDate = new Date();
    expiredDate.setHours(expiredDate.getHours() - 1);

    firebaseMock.getDocs.mockResolvedValueOnce(makeSnapshot([{
      data: () => ({
        psychologistId: 'psy-uid',
        psychologistName: 'Dr. Silva',
        expiresAt: Timestamp.fromDate(expiredDate),
        used: false,
      }),
      ref: { id: 'code-doc-id' },
    }]));
    firebaseMock.deleteDoc.mockResolvedValueOnce(undefined);

    const result = await useTherapistCode('ABC123', 'João');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Este código expirou. Peça um novo ao seu psicólogo.');
    expect(firebaseMock.deleteDoc).toHaveBeenCalled();
  });

  it('should return error when user is not authenticated', async () => {
    mockAuthObj.currentUser = null;

    const result = await useTherapistCode('ABC123', 'João');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Você precisa estar logado para conectar.');
  });

  it('should successfully link patient to psychologist', async () => {
    const futureDate = new Date();
    futureDate.setHours(futureDate.getHours() + 24);

    firebaseMock.getDocs.mockResolvedValueOnce(makeSnapshot([{
      data: () => ({
        psychologistId: 'psy-uid',
        psychologistName: 'Dr. Silva',
        expiresAt: Timestamp.fromDate(futureDate),
        used: false,
      }),
      ref: { id: 'code-doc-id' },
    }]));

    const result = await useTherapistCode('ABC123', 'João Paciente');

    expect(result.success).toBe(true);
    expect(result.psychologistName).toBe('Dr. Silva');
    // Updates user's own document with therapist info
    expect(firebaseMock.setDoc).toHaveBeenCalled();
    // Marks the linking code as used
    expect(firebaseMock.updateDoc).toHaveBeenCalledTimes(1);
  });

  it('should return error when Firestore throws during search', async () => {
    firebaseMock.getDocs.mockRejectedValueOnce(new Error('Network error'));

    const result = await useTherapistCode('ABC123', 'João');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Erro ao conectar com psicólogo. Tente novamente.');
  });
});

describe('getLinkedTherapist', () => {
  it('should return null when no user is logged in', async () => {
    mockAuthObj.currentUser = null;

    const result = await getLinkedTherapist();

    expect(result).toBeNull();
  });

  it('should return null when user document does not exist', async () => {
    firebaseMock.getDoc.mockResolvedValueOnce({ exists: () => false, data: () => ({}) });

    const result = await getLinkedTherapist();

    expect(result).toBeNull();
  });

  it('should return null when user has no therapistId', async () => {
    firebaseMock.getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ name: 'João', email: 'joao@test.com' }),
    });

    const result = await getLinkedTherapist();

    expect(result).toBeNull();
  });

  it('should return therapist info when linked', async () => {
    firebaseMock.getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ name: 'João', therapistId: 'psy-uid', therapistName: 'Dr. Silva' }),
    });

    const result = await getLinkedTherapist();

    expect(result).toEqual({ therapistId: 'psy-uid', therapistName: 'Dr. Silva' });
  });

  it('should return therapistId with null therapistName when name not stored', async () => {
    firebaseMock.getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ name: 'João', therapistId: 'psy-uid' }),
    });

    const result = await getLinkedTherapist();

    expect(result).toEqual({ therapistId: 'psy-uid', therapistName: null });
  });

  it('should return null and catch errors gracefully', async () => {
    firebaseMock.getDoc.mockRejectedValueOnce(new Error('Permission denied'));

    const result = await getLinkedTherapist();

    expect(result).toBeNull();
  });
});
