import "client-only";
import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";
import { getFirestore, initializeFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { publicEnv } from "@/lib/env";

// Browser Firebase. Everything is created lazily on first use, so importing this
// module during SSR or the build never needs env vars or touches the network.

let firestore: Firestore | undefined;

function app(): FirebaseApp {
  return getApps().length > 0 ? getApp() : initializeApp(publicEnv().firebase);
}

export function clientAuth(): Auth {
  return getAuth(app());
}

export function clientDb(): Firestore {
  if (!firestore) {
    try {
      // Optional fields can be passed as `undefined` and are simply not written.
      firestore = initializeFirestore(app(), { ignoreUndefinedProperties: true });
    } catch {
      // Already initialized (e.g. after a hot reload).
      firestore = getFirestore(app());
    }
  }
  return firestore;
}

// null when the project has no Storage bucket configured (photos then stay inline).
export function clientStorage(): FirebaseStorage | null {
  return publicEnv().firebase.storageBucket ? getStorage(app()) : null;
}

export function googleProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return provider;
}
