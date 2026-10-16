"use client";

import {
  ArrowLeft,
  ArrowRight,
  Camera,
  FlaskConical,
  Mic,
  RotateCcw,
  Sparkles,
  Sun,
  Timer,
  TriangleAlert,
  Upload,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { Reveal } from "@/components/motion/Reveal";
import { Badge, Button, EmptyState, Spinner, Stack, Text } from "@/components/ui";
import type { ExtractionResponse } from "@/domain/extraction";
import type { Store } from "@/domain/store";
import { useAuth, useSignedInUser } from "@/features/auth";
import { captureFrames, generateProductPhoto, saveProductImage, videoDuration } from "@/features/media";
import { DashboardSkeleton } from "@/features/seller";
import { addProducts, useMyStore, useRefreshStorefront } from "@/features/seller/data";
import { requestExtraction } from "./api";
import { isSavable, toDraft, toProductInput, type Draft } from "./drafts";
import { PhotoStep, type PhotoActions } from "./PhotoStep";
import { ReviewList } from "./ReviewList";
import { Stepper } from "./Stepper";
import styles from "./CapturePanel.module.scss";

type Phase = "pick" | "reading" | "review" | "photos" | "error";

const STEP_INDEX: Record<Phase, 0 | 1 | 2> = { pick: 0, reading: 0, error: 0, review: 1, photos: 2 };

export function CapturePanel() {
  const user = useSignedInUser();
  const store = useMyStore(user.uid);
  const router = useRouter();

  useEffect(() => {
    if (store.status === "ready" && !store.data) router.replace("/dashboard");
  }, [store.status, store.data, router]);

  if (store.status === "error") {
    return <EmptyState tone="berry" icon={<TriangleAlert />} title="Couldn't load your store" description={store.error?.message} />;
  }
  if (!store.data) return <DashboardSkeleton />;
  return <Capture store={store.data} />;
}

// Film → Check (review names & prices) → Photos → saved to the store.
function Capture({ store }: { store: Store }) {
  const { getIdToken } = useAuth();
  const refreshStorefront = useRefreshStorefront();
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("pick");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [provider, setProvider] = useState<ExtractionResponse["provider"] | null>(null);
  const [framesReady, setFramesReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Cancel any in-flight request on leave; free the video when it changes.
  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(() => () => void (previewUrl && URL.revokeObjectURL(previewUrl)), [previewUrl]);

  const selected = drafts.filter(isSavable);
  const photosBusy = drafts.some((draft) => draft.photoBusy);

  function patch(key: string, change: Partial<Draft>) {
    setDrafts((current) => current.map((draft) => (draft.key === key ? { ...draft, ...change } : draft)));
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const video = event.target.files?.[0];
    event.target.value = ""; // allow picking the same file again
    if (!video) return;

    const url = URL.createObjectURL(video);
    setPreviewUrl(url);
    setPhase("reading");
    setFramesReady(false);
    setError(null);

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const result = await requestExtraction({
        video,
        currency: store.currency,
        labelLanguage: store.labelLanguage,
        durationSeconds: await videoDuration(url),
        idToken: await getIdToken(),
        signal: controller.signal,
      });
      setProvider(result.provider);
      setDrafts(result.products.map(toDraft));
      setPhase("review");
    } catch (cause) {
      if (controller.signal.aborted) return;
      setError(cause instanceof Error ? cause.message : "Something went wrong");
      setPhase("error");
    }
  }

  // Grab one frame per product from the video, once. They're the default photos.
  async function goToPhotos() {
    setPhase("photos");
    if (framesReady || !previewUrl) return;

    const times = drafts.map((draft) => draft.seenAtSeconds ?? 0);
    setDrafts((current) => current.map((draft) => ({ ...draft, photoBusy: true })));
    const frames = await captureFrames(previewUrl, times);
    setDrafts((current) =>
      current.map((draft, index) => {
        const frame = frames[index] ?? null;
        if (draft.photoSource === "upload") return { ...draft, frame, photoBusy: false };
        return { ...draft, frame, photo: frame, photoSource: frame ? "video" : "none", photoBusy: false };
      }),
    );
    setFramesReady(true);
  }

  async function makeAiPhoto(draft: Draft) {
    patch(draft.key, { photoBusy: true });
    try {
      const photo = await generateProductPhoto({ name: draft.name, frame: draft.frame });
      patch(draft.key, { photo, photoSource: "ai", photoBusy: false });
    } catch (cause) {
      console.error(cause);
      patch(draft.key, { photoBusy: false });
    }
  }

  const photoActions: PhotoActions = {
    choose(key, source) {
      const draft = drafts.find((item) => item.key === key);
      if (!draft) return;
      if (source === "ai") void makeAiPhoto(draft);
      else if (source === "video") patch(key, { photo: draft.frame, photoSource: "video" });
      else patch(key, { photo: null, photoSource: "none" });
    },
    upload(key, file) {
      patch(key, { photo: file, photoSource: "upload" });
    },
    aiForAll() {
      selected.forEach((draft) => void makeAiPhoto(draft));
    },
    // Photos fill products in order, skipping ones that already have an upload.
    uploadMany(files) {
      setDrafts((current) => {
        let next = 0;
        return current.map((draft) =>
          isSavable(draft) && draft.photoSource !== "upload" && next < files.length
            ? { ...draft, photo: files[next++], photoSource: "upload" }
            : draft,
        );
      });
    },
  };

  function reset() {
    abortRef.current?.abort();
    setPreviewUrl(null);
    setDrafts([]);
    setProvider(null);
    setPhase("pick");
  }

  async function save() {
    if (selected.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const products = await Promise.all(
        selected.map(async (draft) =>
          toProductInput(draft, draft.photo ? await saveProductImage(store.slug, draft.photo) : undefined),
        ),
      );
      // Timestamp-based positions keep new items after older ones, in video order.
      await addProducts(store.slug, products, Date.now());
      await refreshStorefront(store.slug);
      router.push("/dashboard");
    } catch (cause) {
      console.error(cause);
      setError("Couldn't save the products. Try again.");
      setSaving(false);
    }
  }

  return (
    <>
      {phase !== "error" ? <Stepper current={STEP_INDEX[phase]} /> : null}

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={phase}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        >
          {phase === "pick" ? <PickVideo onFile={handleFile} /> : null}

          {phase === "reading" && previewUrl ? <Reading previewUrl={previewUrl} /> : null}

          {phase === "review" ? (
            drafts.length === 0 ? (
              <EmptyState
                tone="sun"
                icon={<Sparkles />}
                title="No products spotted"
                description="Try again a little slower, with the labels facing the camera."
                action={<Button icon={<RotateCcw />} onClick={reset}>Film again</Button>}
              />
            ) : (
              <Stack gap={5}>
                <Stack direction="row" align="center" gap={3}>
                  <Text as="h1" size="2xl">
                    Found {drafts.length}
                  </Text>
                  {provider === "mock" ? (
                    <Badge tone="sun" icon={<FlaskConical />} title="Sample data from the mock AI">
                      Mock AI
                    </Badge>
                  ) : (
                    <Badge tone="accent" icon={<Sparkles />}>
                      AI
                    </Badge>
                  )}
                </Stack>
                <ReviewList drafts={drafts} currency={store.currency} onChange={patch} />
                <ActionBar>
                  <Button variant="ghost" icon={<RotateCcw />} onClick={reset}>
                    Retake
                  </Button>
                  <Button
                    size="lg"
                    className={styles.primary}
                    iconAfter={<ArrowRight />}
                    disabled={selected.length === 0}
                    onClick={goToPhotos}
                  >
                    Photos
                  </Button>
                </ActionBar>
              </Stack>
            )
          ) : null}

          {phase === "photos" ? (
            <Stack gap={5}>
              <Text as="h1" size="2xl">
                Photos
              </Text>
              <PhotoStep drafts={selected} actions={photoActions} />
              {error ? (
                <Text role="alert" size="sm" tone="danger" align="center">
                  {error}
                </Text>
              ) : null}
              <ActionBar>
                <Button variant="ghost" icon={<ArrowLeft />} onClick={() => setPhase("review")} disabled={saving}>
                  Back
                </Button>
                <Button
                  size="lg"
                  className={styles.primary}
                  loading={saving}
                  disabled={photosBusy || selected.length === 0}
                  onClick={save}
                >
                  Add {selected.length} to store
                </Button>
              </ActionBar>
            </Stack>
          ) : null}

          {phase === "error" ? (
            <EmptyState
              tone="berry"
              icon={<TriangleAlert />}
              title="That didn't work"
              description={error ?? undefined}
              action={<Button icon={<RotateCcw />} onClick={reset}>Try again</Button>}
            />
          ) : null}
        </motion.div>
      </AnimatePresence>
    </>
  );
}

function ActionBar({ children }: { children: ReactNode }) {
  return <div className={styles.actions}>{children}</div>;
}

function PickVideo({ onFile }: { onFile: (event: ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <Stack gap={6}>
      <Reveal>
        <Text as="h1" size="3xl">
          Film your shelf
        </Text>
      </Reveal>

      <Reveal delay={0.06} className={styles.sources}>
        <VideoSource icon={<Camera />} label="Record" tone="brand" capture onFile={onFile} />
        <VideoSource icon={<Upload />} label="Upload" tone="tint" onFile={onFile} />
      </Reveal>

      <Reveal delay={0.12} className={styles.tips}>
        <Tip icon={<Sun />} text="Bright light" />
        <Tip icon={<Mic />} text="Say each price" />
        <Tip icon={<Timer />} text="Under 2 min" />
      </Reveal>
    </Stack>
  );
}

function VideoSource({
  icon,
  label,
  tone,
  capture,
  onFile,
}: {
  icon: ReactNode;
  label: string;
  tone: "brand" | "tint";
  capture?: boolean;
  onFile: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className={`${styles.source} ${styles[tone]}`}>
      <input
        type="file"
        accept="video/*"
        capture={capture ? "environment" : undefined}
        className={styles.fileInput}
        onChange={onFile}
      />
      <span className={styles.sourceIcon}>{icon}</span>
      <span className={styles.sourceLabel}>{label}</span>
    </label>
  );
}

function Tip({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <span className={styles.tip}>
      {icon}
      {text}
    </span>
  );
}

function Reading({ previewUrl }: { previewUrl: string }) {
  return (
    <Stack gap={5} align="center">
      <div className={styles.preview}>
        <video src={previewUrl} autoPlay muted loop playsInline />
        <span className={styles.scan} aria-hidden />
      </div>
      <Stack direction="row" gap={2} align="center">
        <Spinner />
        <Text weight={600}>Finding products and prices…</Text>
      </Stack>
    </Stack>
  );
}
