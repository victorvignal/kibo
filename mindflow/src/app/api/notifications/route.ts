import { NextRequest, NextResponse } from 'next/server';

const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/databases/(default)/documents`;
const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '';

/**
 * POST /api/notifications
 * Send a push notification to a patient.
 * Falls back to Firestore queue when Expo token is not configured.
 *
 * Requires Firebase ID token in Authorization header.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 });
    }
    const idToken = authHeader.slice(7);

    const body = (await request.json()) as {
      patientId: string;
      title: string;
      body: string;
      data?: Record<string, string>;
    };
    const { patientId, title, body: notificationBody } = body;

    if (!patientId || !title || !notificationBody) {
      return NextResponse.json({ error: 'patientId, title, and body are required' }, { status: 400 });
    }

    // Get patient's push token from Firestore via REST
    const patientRes = await fetch(
      `${FIRESTORE_BASE}/users/${patientId}?key=${FIREBASE_API_KEY}&access_token=${idToken}&prettyPrint=false`,
      { headers: { Authorization: `Bearer ${idToken}` } }
    );

    if (!patientRes.ok) {
      return NextResponse.json({ error: 'Patient not found or access denied' }, { status: 404 });
    }

    const patientData = await patientRes.json();
    const pushToken: string | undefined = patientData.fields?.pushToken?.stringValue;

    if (!pushToken) {
      // Queue notification in Firestore as fallback
      await queueNotification(idToken, patientId, title, notificationBody, body.data || {});
      return NextResponse.json({ success: true, method: 'firestore-queue', reason: 'no-push-token' });
    }

    // Send via Expo Push API
    const expoToken = process.env.EXPO_ACCESS_TOKEN;
    if (!expoToken) {
      // Queue for later delivery
      await queueNotification(idToken, patientId, title, notificationBody, body.data || {});
      return NextResponse.json({ success: true, method: 'firestore-queue', reason: 'no-expo-token' });
    }

    const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${expoToken}`,
      },
      body: JSON.stringify({
        to: pushToken,
        title,
        body: notificationBody,
        data: body.data || {},
        sound: 'default',
        priority: 'high',
      }),
    });

    if (!expoResponse.ok) {
      const errorText = await expoResponse.text();
      console.error('Expo push error:', errorText);
      // Fallback to Firestore queue
      await queueNotification(idToken, patientId, title, notificationBody, body.data || {});
      return NextResponse.json({ success: true, method: 'firestore-queue', reason: 'expo-error' });
    }

    const result = await expoResponse.json();
    return NextResponse.json({ success: true, method: 'expo', result });
  } catch (error) {
    console.error('Notification API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function queueNotification(
  idToken: string,
  userId: string,
  title: string,
  body: string,
  data: Record<string, string>
): Promise<void> {
  const docId = `notif_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  await fetch(`${FIRESTORE_BASE}/notifications/${docId}?key=${FIREBASE_API_KEY}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      fields: {
        toUserId: { stringValue: userId },
        title: { stringValue: title },
        body: { stringValue: body },
        data: { mapValue: { fields: data } },
        read: { booleanValue: false },
        createdAt: { timestampValue: new Date().toISOString() },
      },
    }),
  });
}
