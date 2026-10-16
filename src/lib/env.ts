import { z } from "zod";

// Public (NEXT_PUBLIC_*) env, safe on client and server. Each var is read with a
// literal `process.env.X` so Next can inline it into the client bundle.
const publicEnvSchema = z.object({
  firebase: z.object({
    apiKey: z.string().min(1),
    authDomain: z.string().min(1),
    projectId: z.string().min(1),
    appId: z.string().min(1),
    storageBucket: z.string().optional(),
    messagingSenderId: z.string().optional(),
  }),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

let cached: PublicEnv | undefined;

// Parsed lazily so a missing var fails loudly where it's used, not at build time.
export function publicEnv(): PublicEnv {
  if (cached) return cached;

  const parsed = publicEnvSchema.safeParse({
    firebase: {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || undefined,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || undefined,
    },
  });

  if (!parsed.success) {
    throw new Error(
      `Invalid public env. Copy .env.example to .env.local and fill it in.\n${z.prettifyError(parsed.error)}`,
    );
  }

  cached = parsed.data;
  return cached;
}
