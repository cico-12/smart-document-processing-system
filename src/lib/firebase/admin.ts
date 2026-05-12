import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import type { Firestore } from "firebase-admin/firestore";

function getFirebaseAdminDb() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Missing Firebase Admin environment variables.");
  }

  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  }

  return getFirestore();
}

export function getAdminDb() {
  return getFirebaseAdminDb();
}

export const adminDb = new Proxy({} as Firestore, {
  get(_target, property) {
    const db = getFirebaseAdminDb();
    const value = db[property as keyof Firestore];

    if (typeof value === "function") {
      return value.bind(db);
    }

    return value;
  },
});