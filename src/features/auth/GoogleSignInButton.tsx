"use client";

import { useState } from "react";
import { Button, Text } from "@/components/ui";
import { useAuth } from "./AuthProvider";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7Z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1Z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A11.5 11.5 0 0 0 12 0 12 12 0 0 0 1.3 6.6l4 3.1c.9-2.8 3.6-4.9 6.7-4.9Z" />
    </svg>
  );
}

// Setup mistakes get a message that says what to fix; anything else stays generic.
const SETUP_ERRORS: Record<string, string> = {
  "auth/configuration-not-found": "Firebase Authentication isn't set up yet (Firebase console → Authentication → Get started).",
  "auth/operation-not-allowed": "Google sign-in is turned off (Authentication → Sign-in method → Google).",
  "auth/unauthorized-domain": "This domain isn't allowed (Authentication → Settings → Authorized domains).",
};

export function GoogleSignInButton() {
  const { signIn } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setPending(true);
    setError(null);
    try {
      await signIn();
    } catch (cause) {
      console.error(cause);
      const code = (cause as { code?: string }).code ?? "";
      setError(SETUP_ERRORS[code] ?? "Sign-in didn't work. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button variant="soft" size="lg" block icon={<GoogleIcon />} loading={pending} onClick={handleClick}>
        Continue with Google
      </Button>
      {error ? (
        <Text role="alert" size="sm" tone="danger" align="center">
          {error}
        </Text>
      ) : null}
    </>
  );
}
