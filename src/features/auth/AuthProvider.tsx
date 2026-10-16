"use client";

import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { clientAuth, googleProvider } from "@/lib/firebase/client";

export type SessionUser = {
  uid: string;
  name: string;
  email: string | null;
  photoURL: string | null;
};

type AuthState =
  | { status: "loading"; user: null }
  | { status: "signed-out"; user: null }
  | { status: "signed-in"; user: SessionUser };

type AuthContextValue = AuthState & {
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  // Fresh Firebase ID token for calling our API routes / server actions.
  getIdToken: () => Promise<string>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function toSessionUser(user: User): SessionUser {
  return {
    uid: user.uid,
    name: user.displayName ?? user.email?.split("@")[0] ?? "Seller",
    email: user.email,
    photoURL: user.photoURL,
  };
}

// Popups are blocked in some in-app browsers (e.g. opened from LINE/WhatsApp).
const REDIRECT_FALLBACK = new Set(["auth/popup-blocked", "auth/operation-not-supported-in-this-environment"]);
const USER_CANCELLED = new Set(["auth/popup-closed-by-user", "auth/cancelled-popup-request"]);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading", user: null });

  useEffect(
    () =>
      onAuthStateChanged(clientAuth(), (user) => {
        setState(user ? { status: "signed-in", user: toSessionUser(user) } : { status: "signed-out", user: null });
      }),
    [],
  );

  const signIn = useCallback(async () => {
    const auth = clientAuth();
    try {
      await signInWithPopup(auth, googleProvider());
    } catch (error) {
      const code = (error as { code?: string }).code ?? "";
      if (USER_CANCELLED.has(code)) return;
      if (REDIRECT_FALLBACK.has(code)) return signInWithRedirect(auth, googleProvider());
      throw error;
    }
  }, []);

  const signOut = useCallback(() => firebaseSignOut(clientAuth()), []);

  const getIdToken = useCallback(async () => {
    const user = clientAuth().currentUser;
    if (!user) throw new Error("Not signed in");
    return user.getIdToken();
  }, []);

  const value = useMemo(() => ({ ...state, signIn, signOut, getIdToken }), [state, signIn, signOut, getIdToken]);

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthContextValue {
  const context = use(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}

// For components rendered inside <AuthGate>, where a user is guaranteed.
export function useSignedInUser(): SessionUser {
  const { user } = useAuth();
  if (!user) throw new Error("useSignedInUser must be used inside <AuthGate>");
  return user;
}
