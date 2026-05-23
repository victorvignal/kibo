/**
 * Tests for lib/api.ts
 *
 * Mocks Firebase/Firestore to test patient data, alerts, and daily data APIs.
 */

import { jest } from '@jest/globals';

// ─── Firestore Mock Setup ────────────────────────────────────────────────────

const mockGetDocs = jest.fn<(q?: unknown) => Promise<unknown>>();
const mockGetDoc = jest.fn<(ref?: unknown) => Promise<unknown>>();
const mockSetDoc = jest.fn<(ref?: unknown, data?: unknown, opts?: unknown) => Promise<void>>();
const mockUpdateDoc = jest.fn<(ref?: unknown, data?: unknown) => Promise<void>>();
const mockCollection = jest.fn<(db: unknown, name: string) => string>();
const mockDoc = jest.fn<(db: unknown, col: string, id?: string) => { id: string }>();
const mockQuery = jest.fn<(...args: unknown[]) => string>();
const mockWhere = jest.fn<() => string>();
const mockOrderBy = jest.fn<() => string>();
const mockTimestampNow = jest.fn<() => { toDate: () => Date }>();
const mockArrayUnion = jest.fn<() => string[]>();

// Stable mock docRef generator
function docRef(colName: string, id?: string) {
  return { id: id ?? `${colName}-mock-id` };
}

// Mock Firestore
jest.mock('@/lib/firebase', () => ({
  getDatabase: jest.fn(() => ({})),
  collection: mockCollection,
  doc: mockDoc,
  getDoc: mockGetDoc,
  getDocs: mockGetDocs,
  setDoc: mockSetDoc,
  updateDoc: mockUpdateDoc,
  query: mockQuery,
  where: mockWhere,
  orderBy: mockOrderBy,
  Timestamp: { now: mockTimestampNow },
  arrayUnion: mockArrayUnion,
}));

// Reset call history between tests (NOT implementations)
beforeEach(() => {
  jest.clearAllMocks();
  mockTimestampNow.mockReturnValue({ toDate: () => new Date('2026-05-22') });
  mockArrayUnion.mockReturnValue(['patient-abc']);

  // Default implementations
  mockCollection.mockImplementation((_: unknown, colName: string) => `collection:${colName}`);
  mockDoc.mockImplementation((_: unknown, colName: string, id?: string) => docRef(colName, id));
  mockQuery.mockImplementation((..._args: unknown[]) => 'query-result');
  mockWhere.mockImplementation(() => 'where-result');
  mockOrderBy.mockImplementation(() => 'orderby-result');
});

// ─── Import after mocks are set up ──────────────────────────────────────────

import {
  getPatients,
  getPatient,
  createPatient,
  updatePatient,
  getPatientData,
  saveDailyFeatures,
  getAlerts,
  getPatientAlerts,
  acknowledgeAlert,
  createAlert,
} from '@/lib/api';

// ─── Test Helpers ───────────────────────────────────────────────────────────

function makeDocSnap(id: string, data: Record<string, unknown>) {
  return { id, data: () => data, exists: () => true };
}

function makeQuerySnap(docs: Array<{ id: string; data: Record<string, unknown> }>) {
  const snapshots = docs.map(d => makeDocSnap(d.id, d.data));
  const sliced = snapshots;
  return {
    docs: snapshots,
    size: docs.length,
    slice: (start: number, end: number) => ({
      docs: sliced.slice(start, end),
      map: (fn: (d: unknown) => unknown) => sliced.slice(start, end).map(fn),
    }),
  };
}

// ─── getPatients ────────────────────────────────────────────────────────────

describe('getPatients', () => {
  it('returns empty array when no patients found', async () => {
    mockCollection.mockReturnValueOnce('collection:patients');
    mockQuery.mockReturnValueOnce('query-result');
    mockGetDocs.mockResolvedValueOnce(makeQuerySnap([]));

    const result = await getPatients('therapist-123');

    expect(result).toEqual([]);
    expect(mockCollection).toHaveBeenCalledWith(expect.anything(), 'patients');
  });

  it('maps Firestore documents to Patient objects', async () => {
    const patientData = {
      name: 'Maria Silva',
      email: 'maria@example.com',
      phone: '11999999999',
      status: 'active',
      riskLevel: 'low',
      condition: 'depression',
      therapistId: 'therapist-123',
      createdAt: { toDate: () => new Date('2026-05-01') },
      lastActive: { toDate: () => new Date('2026-05-20') },
    };

    mockCollection.mockReturnValueOnce('collection:patients');
    mockQuery.mockReturnValueOnce('query-result');
    mockGetDocs.mockResolvedValueOnce(makeQuerySnap([{ id: 'patient-abc', data: patientData }]));

    const result = await getPatients('therapist-123');

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('patient-abc');
    expect(result[0].name).toBe('Maria Silva');
    expect(result[0].status).toBe('active');
    expect(result[0].riskLevel).toBe('low');
    expect(result[0].createdAt).toBeInstanceOf(Date);
  });

  it('handles patients with no optional fields', async () => {
    const minimalPatient = {
      name: 'João',
      email: 'joao@example.com',
      status: 'active',
      riskLevel: 'medium',
      createdAt: { toDate: () => new Date('2026-05-10') },
    };

    mockCollection.mockReturnValueOnce('collection:patients');
    mockQuery.mockReturnValueOnce('query-result');
    mockGetDocs.mockResolvedValueOnce(makeQuerySnap([{ id: 'patient-xyz', data: minimalPatient }]));

    const result = await getPatients('therapist-123');

    expect(result).toHaveLength(1);
    expect(result[0].condition).toBeUndefined();
    expect(result[0].phone).toBeUndefined();
  });
});

// ─── getPatient ─────────────────────────────────────────────────────────────

describe('getPatient', () => {
  it('returns null when patient does not exist', async () => {
    mockDoc.mockReturnValueOnce({ id: 'nonexistent' });
    mockGetDoc.mockResolvedValueOnce({ exists: () => false });

    const result = await getPatient('nonexistent');

    expect(result).toBeNull();
  });

  it('returns patient data when found', async () => {
    const patientData = {
      name: 'Ana Costa',
      email: 'ana@example.com',
      status: 'at_risk',
      riskLevel: 'high',
      condition: 'anxiety',
      createdAt: { toDate: () => new Date('2026-04-15') },
    };

    mockDoc.mockReturnValueOnce({ id: 'patient-abc' });
    mockGetDoc.mockResolvedValueOnce({ exists: () => true, data: () => patientData, id: 'patient-abc' });

    const result = await getPatient('patient-abc');

    expect(result).not.toBeNull();
    expect(result!.id).toBe('patient-abc');
    expect(result!.name).toBe('Ana Costa');
    expect(result!.riskLevel).toBe('high');
  });
});

// ─── createPatient ──────────────────────────────────────────────────────────

describe('createPatient', () => {
  it('creates patient document and updates therapist patientIds', async () => {
    // collection('patients') for patient doc
    mockCollection.mockReturnValueOnce('collection:patients');
    // doc(collection, '') for auto-id
    mockDoc.mockReturnValueOnce({ id: 'new-patient-id' });
    mockSetDoc.mockResolvedValueOnce(undefined);

    // updateDoc for therapist patientIds
    mockDoc.mockReturnValueOnce({ id: 'therapist-doc' });
    mockUpdateDoc.mockResolvedValueOnce(undefined);

    const patientData = {
      name: 'Novo Paciente',
      email: 'novo@example.com',
      phone: '11988888888',
      condition: 'anxiety' as const,
      status: 'active' as const,
      riskLevel: 'low' as const,
    };

    const result = await createPatient(patientData, 'therapist-123');

    // Verify patient was created
    const setDocCall = mockSetDoc.mock.calls[0];
    expect(setDocCall).toBeDefined();
    expect((setDocCall[1] as Record<string, unknown>).name).toBe('Novo Paciente');
    expect((setDocCall[1] as Record<string, unknown>).email).toBe('novo@example.com');
    expect((setDocCall[1] as Record<string, unknown>).therapistId).toBe('therapist-123');
    expect(result).toBe('new-patient-id');

    // Verify therapist patientIds was updated
    expect(mockUpdateDoc).toHaveBeenCalled();
  });

  it('creates patient even if therapist patientIds update fails', async () => {
    mockCollection.mockReturnValueOnce('collection:patients');
    mockDoc
      .mockReturnValueOnce({ id: 'new-patient-id' })       // patient doc
      .mockReturnValueOnce({ id: 'therapist-doc' });         // therapist doc
    mockSetDoc.mockResolvedValue(undefined);
    mockUpdateDoc.mockRejectedValueOnce(new Error('Field not found'));

    const patientData = {
      name: 'Test Patient',
      email: 'test@example.com',
      status: 'active' as const,
      riskLevel: 'low' as const,
    };

    const result = await createPatient(patientData, 'therapist-456');

    // Patient doc should still be created via setDoc with merge
    expect(mockSetDoc).toHaveBeenCalled();
    expect(result).toBe('new-patient-id');
  });
});

// ─── updatePatient ──────────────────────────────────────────────────────────

describe('updatePatient', () => {
  it('calls updateDoc with correct parameters', async () => {
    mockDoc.mockReturnValueOnce({ id: 'patient-abc' });
    mockUpdateDoc.mockResolvedValueOnce(undefined);

    await updatePatient('patient-abc', { riskLevel: 'high', status: 'at_risk' });

    expect(mockUpdateDoc).toHaveBeenCalledWith(
      { id: 'patient-abc' },
      { riskLevel: 'high', status: 'at_risk' }
    );
  });
});

// ─── getPatientData ─────────────────────────────────────────────────────────

describe('getPatientData', () => {
  it('falls back to checkins when dailyData is empty', async () => {
    // dailyData returns empty
    mockCollection
      .mockReturnValueOnce('collection:dailyData')
      .mockReturnValueOnce('collection:checkins');
    mockQuery
      .mockReturnValueOnce('query-result')
      .mockReturnValueOnce('query-result');
    mockGetDocs
      .mockResolvedValueOnce(makeQuerySnap([])) // dailyData empty
      .mockResolvedValueOnce(
        makeQuerySnap([{
          id: 'c1',
          data: {
            patientId: 'patient-abc',
            mood: 7,
            sleep: 8,
            anxiety: 3,
            activity: 5,
            social: 6,
            timestamp: { toDate: () => new Date('2026-05-20T10:00:00') },
          },
        }])
      );

    const result = await getPatientData('patient-abc', 30);

    expect(result.length).toBeGreaterThan(0);
    const may20 = result.find(d => d.date === '2026-05-20');
    expect(may20).toBeDefined();
    expect(may20!.features.moodScore).toBe(7);
    expect(may20!.features.sleepDuration).toBe(8);
  });

  it('returns empty array when no data available', async () => {
    mockCollection
      .mockReturnValueOnce('collection:dailyData')
      .mockReturnValueOnce('collection:checkins');
    mockQuery
      .mockReturnValueOnce('query-result')
      .mockReturnValueOnce('query-result');
    mockGetDocs
      .mockResolvedValueOnce(makeQuerySnap([]))
      .mockResolvedValueOnce(makeQuerySnap([]));

    const result = await getPatientData('patient-abc', 30);

    expect(result).toEqual([]);
  });

  it('aggregates multiple checkins from same day', async () => {
    const sameDay = '2026-05-20T10:00:00';
    const checkin1 = {
      patientId: 'patient-abc', mood: 6, sleep: 7, anxiety: 4, activity: 5, social: 6,
      timestamp: { toDate: () => new Date(sameDay) },
    };
    const checkin2 = {
      patientId: 'patient-abc', mood: 8, sleep: 9, anxiety: 2, activity: 6, social: 7,
      timestamp: { toDate: () => new Date(sameDay) },
    };

    mockCollection
      .mockReturnValueOnce('collection:dailyData')
      .mockReturnValueOnce('collection:checkins');
    mockQuery
      .mockReturnValueOnce('query-result')
      .mockReturnValueOnce('query-result');
    mockGetDocs
      .mockResolvedValueOnce(makeQuerySnap([]))
      .mockResolvedValueOnce(makeQuerySnap([{ id: 'c1', data: checkin1 }, { id: 'c2', data: checkin2 }]));

    const result = await getPatientData('patient-abc', 30);

    const may20 = result.find(d => d.date === '2026-05-20');
    expect(may20).toBeDefined();
    expect(may20!.features.moodScore).toBe(7);   // (6+8)/2
    expect(may20!.features.sleepDuration).toBe(8); // (7+9)/2
  });
});

// ─── saveDailyFeatures ──────────────────────────────────────────────────────

describe('saveDailyFeatures', () => {
  it('saves daily features with merge to avoid overwrites', async () => {
    mockDoc.mockReturnValueOnce({ id: 'patient-abc_2026-05-20' });
    mockSetDoc.mockResolvedValueOnce(undefined);
    mockTimestampNow.mockReturnValueOnce({ toDate: () => new Date() });

    const features = {
      locationsVisited: 3,
      timeAtHome: 50,
      radiusOfGyration: 5,
      sleepDuration: 7,
      sleepOnset: '23:00',
      sleepOffset: '07:00',
      sleepQuality: 70,
      nightDisturbances: 1,
      stepCount: 5000,
      physicalActivity: 30,
      sedentaryTime: 480,
      callsDuration: 30,
      callsFrequency: 5,
      smsFrequency: 10,
      socialInteractionScore: 60,
      rhythmStrength: 0.8,
      rhythmStability: 0.7,
      screenTime: 4,
      appCategories: {},
      moodScore: 7,
      stressScore: 3,
      anxietyScore: 3,
    };

    await saveDailyFeatures('patient-abc', '2026-05-20', features);

    // Verify doc was called with correct collection and id
    expect(mockDoc).toHaveBeenCalledWith(expect.anything(), 'dailyData', 'patient-abc_2026-05-20');
    // Verify setDoc was called with merge: true
    const setDocCall = mockSetDoc.mock.calls[0];
    expect(setDocCall).toBeDefined();
    expect((setDocCall[1] as Record<string, unknown>).patientId).toBe('patient-abc');
    expect(setDocCall[2]).toEqual({ merge: true });
  });
});

// ─── getAlerts ─────────────────────────────────────────────────────────────

describe('getAlerts', () => {
  it('returns alerts for therapist filtered by therapistId', async () => {
    const alertData = {
      patientId: 'patient-abc',
      type: 'risk_increase',
      severity: 'high',
      message: 'Patient mood dropping',
      recommendation: 'Contact patient',
      acknowledged: false,
      createdAt: { toDate: () => new Date('2026-05-21') },
    };

    mockCollection.mockReturnValueOnce('collection:alerts');
    mockQuery.mockReturnValueOnce('query-result');
    mockGetDocs.mockResolvedValueOnce(makeQuerySnap([{ id: 'alert-1', data: alertData }]));

    const result = await getAlerts('therapist-123');

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('risk_increase');
    expect(result[0].severity).toBe('high');
    expect(result[0].createdAt).toBeInstanceOf(Date);
  });

  it('limits alerts to specified limit', async () => {
    const manyAlerts = Array.from({ length: 25 }, (_, i) => ({
      patientId: 'patient-abc',
      type: 'checkin_due' as const,
      severity: 'low' as const,
      message: `Alert ${i}`,
      recommendation: '',
      acknowledged: false,
      createdAt: { toDate: () => new Date() },
    }));

    mockCollection.mockReturnValueOnce('collection:alerts');
    mockQuery.mockReturnValueOnce('query-result');
    mockGetDocs.mockResolvedValueOnce(makeQuerySnap(manyAlerts.map((d, i) => ({ id: `alert-${i}`, data: d }))));

    const result = await getAlerts('therapist-123', 10);

    expect(result.length).toBeLessThanOrEqual(10);
  });
});

// ─── getPatientAlerts ────────────────────────────────────────────────────────

describe('getPatientAlerts', () => {
  it('returns alerts for a specific patient', async () => {
    const alertData = {
      patientId: 'patient-abc',
      type: 'sleep_disturbance',
      severity: 'medium',
      message: 'Sleep quality dropped',
      recommendation: 'Review sleep hygiene',
      acknowledged: true,
      createdAt: { toDate: () => new Date('2026-05-20') },
    };

    mockCollection.mockReturnValueOnce('collection:alerts');
    mockQuery.mockReturnValueOnce('query-result');
    mockGetDocs.mockResolvedValueOnce(makeQuerySnap([{ id: 'alert-1', data: alertData }]));

    const result = await getPatientAlerts('patient-abc');

    expect(result).toHaveLength(1);
    expect(result[0].patientId).toBe('patient-abc');
    expect(result[0].acknowledged).toBe(true);
  });
});

// ─── acknowledgeAlert ────────────────────────────────────────────────────────

describe('acknowledgeAlert', () => {
  it('updates alert to acknowledged=true', async () => {
    mockDoc.mockReturnValueOnce({ id: 'alert-abc' });
    mockUpdateDoc.mockResolvedValueOnce(undefined);

    await acknowledgeAlert('alert-abc');

    expect(mockUpdateDoc).toHaveBeenCalledWith(
      { id: 'alert-abc' },
      { acknowledged: true }
    );
  });
});

// ─── createAlert ────────────────────────────────────────────────────────────

describe('createAlert', () => {
  it('creates alert with acknowledged=false and timestamp', async () => {
    mockCollection.mockReturnValueOnce('collection:alerts');
    mockDoc.mockReturnValueOnce({ id: 'new-alert-id' });
    mockSetDoc.mockResolvedValueOnce(undefined);

    const alert = {
      patientId: 'patient-abc',
      therapistId: 'therapist-123',
      type: 'sentiment_shift' as const,
      severity: 'medium' as const,
      message: 'Mood shifted significantly',
      recommendation: 'Schedule extra session',
    };

    const result = await createAlert(alert);

    // Find the setDoc call that has patientId
    const alertSetDocCall = mockSetDoc.mock.calls.find(
      (call) => (call[1] as Record<string, unknown>)?.patientId === 'patient-abc'
    );
    expect(alertSetDocCall).toBeDefined();
    expect((alertSetDocCall![1] as Record<string, unknown>).type).toBe('sentiment_shift');
    expect((alertSetDocCall![1] as Record<string, unknown>).acknowledged).toBe(false);
    expect(result).toBe('new-alert-id');
  });
});
