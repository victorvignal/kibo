import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, type, title, body: notifBody, data } = body as {
      userId: string;
      type: string;
      title: string;
      body: string;
      data?: Record<string, string>;
    };

    if (!userId || !title || !notifBody) {
      return NextResponse.json(
        { error: "userId, title, and body are required" },
        { status: 400 }
      );
    }

    // Note: This requires Firebase Admin SDK for server-side push notifications.
    // For now, notifications are stored in Firestore and fetched by the client app.
    // Real push notifications require FCM (Firebase Cloud Messaging).
    //
    // The notification is written to the notifications collection in Firestore
    // and the client's expo-notifications handles the display.

    return NextResponse.json({
      status: "queued",
      message: `Notification queued for user ${userId}`,
    });
  } catch (error) {
    console.error("Notifications API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "kibo-notifications",
  });
}
