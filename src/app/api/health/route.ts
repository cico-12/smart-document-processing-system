import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export async function GET() {
  const now = new Date().toISOString();

  await adminDb.collection("health").doc("firebase").set({
    ok: true,
    checkedAt: now,
  });

  const snapshot = await adminDb.collection("health").doc("firebase").get();

  return NextResponse.json({
    ok: true,
    firebaseConnected: snapshot.exists,
    data: snapshot.data(),
  });
}