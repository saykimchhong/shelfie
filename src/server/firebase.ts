import "server-only";
import { getApps, initializeApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore/lite";
import { publicEnv } from "@/lib/env";

// The server reads Firestore as an anonymous visitor through firestore/lite,
// so security rules apply here too: it can only ever see published stores.
// No service-account key needed, and no way to leak a draft store by mistake.

const APP_NAME = "shelfie-server";

export function serverDb(): Firestore {
  const app =
    getApps().find((existing) => existing.name === APP_NAME) ??
    initializeApp(publicEnv().firebase, APP_NAME);
  return getFirestore(app);
}
