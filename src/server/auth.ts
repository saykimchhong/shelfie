import "server-only";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { publicEnv } from "@/lib/env";

// Verifying Firebase ID tokens only needs the project id (Google's public keys
// are fetched automatically), so there is no service account to manage.

export type VerifiedUser = {
  uid: string;
  email?: string;
};

export class AuthError extends Error {
  readonly status = 401;
}

function adminAuth() {
  const app = getApps()[0] ?? initializeApp({ projectId: publicEnv().firebase.projectId });
  return getAuth(app);
}

export async function verifyIdToken(idToken: string): Promise<VerifiedUser> {
  if (!idToken) throw new AuthError("Missing ID token");
  // Outside the try: a config problem should surface as a 500, not a 401.
  const auth = adminAuth();
  try {
    const decoded = await auth.verifyIdToken(idToken);
    return { uid: decoded.uid, email: decoded.email };
  } catch {
    throw new AuthError("Invalid or expired ID token");
  }
}

// For Route Handlers: expects `Authorization: Bearer <Firebase ID token>`.
export async function requireUser(request: Request): Promise<VerifiedUser> {
  const header = request.headers.get("authorization") ?? "";
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    throw new AuthError("Missing bearer token");
  }
  return verifyIdToken(token);
}
