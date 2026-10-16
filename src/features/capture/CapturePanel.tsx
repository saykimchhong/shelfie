"use client";

import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
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
import { Badge, Button, ButtonLink, EmptyState, Spinner, Stack, Text } from "@/components/ui";
import type { ExtractionResponse } from "@/domain/extraction";
import type { Product } from "@/domain/product";
import { canonicalShelf, productsOnShelf, shelvesOf, UNSORTED } from "@/domain/shelf";
import { DEFAULT_RESTOCK, type Store } from "@/domain/store";
import { useAuth, useSignedInUser } from "@/features/auth";
import { captureFrames, generateProductPhoto, saveProductImage, videoDuration } from "@/features/media";
import { DashboardSkeleton } from "@/features/seller";
import {
  saveProductChanges,
  useMyStore,
  useProducts,
  useRefreshStorefront,
  type ProductUpdate,
} from "@/features/seller/data";
import { requestExtraction } from "./api";
import { isSavable, toProductInput, toProductUpdate, type Draft } from "./drafts";
import { mergeShelf, toKnownProducts, type Missing } from "./merge";
import { MergeReview } from "./MergeReview";
import { PhotoStep, type PhotoActions } from "./PhotoStep";
import { ShelfPicker, type CaptureTarget } from "./ShelfPicker";
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
  return <CaptureForStore store={store.data} />;
}

// The shelf choice and the merge need the current products first.
function CaptureForStore({ store }: { store: Store }) {
  const products = useProducts(store.slug);

  if (products.status === "error") {
    return <EmptyState tone="berry" icon={<TriangleAlert />} title="Couldn't load your products" description={products.error?.message} />;
  }
  if (products.status === "loading") return <DashboardSkeleton />;
  return <Capture store={store} products={products.data} />;
}

// What the review is merging into: the shelf as it was when the video was read.
type Shelf = { name: string; restock: boolean; products: ReadonlyMap<string, Product> };

const EMPTY_SHELF: Shelf = { name: UNSORTED, restock: false, products: new Map() };

// Film → Check (new products, updates, missing ones) → Photos (new ones) → saved.
function Capture({ store, products }: { store: Store; products: Product[] }) {
  const { getIdToken } = useAuth();
  const refreshStorefront = useRefreshStorefront();
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("pick");
  const [target, setTarget] = useState<CaptureTarget>({ mode: "add", shelf: UNSORTED });
  const [shelf, setShelf] = useState<Shelf>(EMPTY_SHELF);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [missing, setMissing] = useState<Missing[]>([]);
  const [provider, setProvider] = useState<ExtractionResponse["provider"] | null>(null);
  const [framesReady, setFramesReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Cancel any in-flight request on leave; free the video when it changes.
  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(() => () => void (previewUrl && URL.revokeObjectURL(previewUrl)), [previewUrl]);

  const newDrafts = drafts.filter((draft) => draft.group === "new");
  const updateDrafts = drafts.filter((draft) => draft.group === "update");
  const unchanged = drafts.length - newDrafts.length - updateDrafts.length;
  const merging = shelf.products.size > 0;

  // What saving will write.
  const adding = newDrafts.filter(isSavable);
  const updates: ProductUpdate[] = [
    ...drafts.flatMap((draft) => {
      const product = draft.include && draft.matchId ? shelf.products.get(draft.matchId) : undefined;
      const update = product ? toProductUpdate(draft, product) : null;
      return update ? [update] : [];
    }),
    ...missing.filter((item) => item.soldOut).map(({ product }) => ({ id: product.id, patch: { inStock: false } })),
  ];
  const photosBusy = drafts.some((draft) => draft.photoBusy);

  function patch(key: string, change: Partial<Draft>) {
    setDrafts((current) => current.map((draft) => (draft.key === key ? { ...draft, ...change } : draft)));
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const video = event.target.files?.[0];
    event.target.value = ""; // allow picking the same file again
    if (!video) return;

    const name = canonicalShelf(target.shelf, shelvesOf(products));
    const shelfProducts = productsOnShelf(products, name);
    const restock = target.mode === "restock";

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
        known: toKnownProducts(shelfProducts),
        idToken: await getIdToken(),
        signal: controller.signal,
      });
      const merge = mergeShelf(result.products, shelfProducts, {
        restock,
        markMissingSoldOut: (store.restock ?? DEFAULT_RESTOCK).missing === "soldOut",
      });
      setShelf({ name, restock, products: new Map(shelfProducts.map((product) => [product.id, product])) });
      setProvider(result.provider);
      setDrafts(merge.drafts);
      setMissing(merge.missing);
      setPhase("review");
    } catch (cause) {
      if (controller.signal.aborted) return;
      setError(cause instanceof Error ? cause.message : "Something went wrong");
      setPhase("error");
    }
  }

  // Grab one frame per new product from the video, once. They're the default
  // photos; known products keep the photo they have.
  async function goToPhotos() {
    setPhase("photos");
    if (framesReady || !previewUrl) return;

    const fresh = drafts.filter((draft) => draft.group === "new");
    const freshKeys = new Set(fresh.map((draft) => draft.key));
    setDrafts((current) => current.map((draft) => (freshKeys.has(draft.key) ? { ...draft, photoBusy: true } : draft)));
    const frames = await captureFrames(
      previewUrl,
      fresh.map((draft) => draft.seenAtSeconds ?? 0),
    );
    const frameByKey = new Map(fresh.map((draft, index) => [draft.key, frames[index] ?? null]));
    setDrafts((current) =>
      current.map((draft) => {
        if (!frameByKey.has(draft.key)) return draft;
        const frame = frameByKey.get(draft.key) ?? null;
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
      adding.forEach((draft) => void makeAiPhoto(draft));
    },
    // Photos fill new products in order, skipping ones that already have an upload.
    uploadMany(files) {
      setDrafts((current) => {
        let next = 0;
        return current.map((draft) =>
          draft.group === "new" && isSavable(draft) && draft.photoSource !== "upload" && next < files.length
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
    setMissing([]);
    setShelf(EMPTY_SHELF);
    setProvider(null);
    setPhase("pick");
  }

  async function save() {
    if (adding.length === 0 && updates.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const add = await Promise.all(
        adding.map(async (draft) =>
          toProductInput(draft, draft.photo ? await saveProductImage(store, draft.photo) : undefined, shelf.name),
        ),
      );
      // Timestamp-based positions keep new items after older ones, in video order.
      await saveProductChanges(store.slug, { add, update: updates }, Date.now());
      await refreshStorefront(store.slug);
      router.push("/dashboard");
    } catch (cause) {
      console.error(cause);
      setError("Couldn't save the products. Try again.");
      setSaving(false);
    }
  }

  const nothingSeen = drafts.length === 0 && missing.length === 0;
  const upToDate = !nothingSeen && newDrafts.length === 0 && updateDrafts.length === 0 && missing.length === 0;

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
          {phase === "pick" ? (
            <PickVideo products={products} target={target} onTarget={setTarget} onFile={handleFile} />
          ) : null}

          {phase === "reading" && previewUrl ? <Reading previewUrl={previewUrl} /> : null}

          {phase === "review" && nothingSeen ? (
            <EmptyState
              tone="sun"
              icon={<Sparkles />}
              title="No products spotted"
              description="Try again a little slower, with the labels facing the camera."
              action={<Button icon={<RotateCcw />} onClick={reset}>Film again</Button>}
            />
          ) : null}

          {phase === "review" && upToDate ? (
            <EmptyState
              tone="accent"
              icon={<Check />}
              title="This shelf is up to date"
              description={`All ${unchanged} products are already listed at these prices.`}
              action={<ButtonLink href="/dashboard">Done</ButtonLink>}
            />
          ) : null}

          {phase === "review" && !nothingSeen && !upToDate ? (
            <Stack gap={5}>
              <Stack direction="row" align="center" gap={3} wrap>
                <Text as="h1" size="2xl">
                  {merging ? (shelf.name || "Unsorted") : `Found ${drafts.length}`}
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

              <MergeReview
                drafts={drafts}
                missing={missing}
                known={shelf.products}
                currency={store.currency}
                onChange={patch}
                onToggleMissing={(id, soldOut) =>
                  setMissing((current) => current.map((item) => (item.product.id === id ? { ...item, soldOut } : item)))
                }
              />

              {error ? (
                <Text role="alert" size="sm" tone="danger" align="center">
                  {error}
                </Text>
              ) : null}

              <ActionBar>
                <Button variant="ghost" icon={<RotateCcw />} onClick={reset} disabled={saving}>
                  Retake
                </Button>
                {adding.length > 0 ? (
                  <Button size="lg" className={styles.primary} iconAfter={<ArrowRight />} onClick={goToPhotos}>
                    Photos
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    className={styles.primary}
                    loading={saving}
                    disabled={updates.length === 0}
                    onClick={save}
                  >
                    {saveLabel(0, updates.length)}
                  </Button>
                )}
              </ActionBar>
            </Stack>
          ) : null}

          {phase === "photos" ? (
            <Stack gap={5}>
              <Text as="h1" size="2xl">
                Photos
              </Text>
              <PhotoStep drafts={adding} actions={photoActions} />
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
                  disabled={photosBusy || adding.length === 0}
                  onClick={save}
                >
                  {saveLabel(adding.length, updates.length)}
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

function saveLabel(added: number, updated: number): string {
  const changes = `${updated} ${updated === 1 ? "change" : "changes"}`;
  if (updated === 0) return `Add ${added} to store`;
  if (added === 0) return `Save ${changes}`;
  return `Add ${added} · save ${changes}`;
}

function ActionBar({ children }: { children: ReactNode }) {
  return <div className={styles.actions}>{children}</div>;
}

function PickVideo({
  products,
  target,
  onTarget,
  onFile,
}: {
  products: Product[];
  target: CaptureTarget;
  onTarget: (target: CaptureTarget) => void;
  onFile: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <Stack gap={6}>
      <Reveal>
        <Text as="h1" size="3xl">
          {target.mode === "restock" ? "Re-film a shelf" : "Film your shelf"}
        </Text>
      </Reveal>

      <Reveal delay={0.04}>
        <ShelfPicker products={products} target={target} onChange={onTarget} />
      </Reveal>

      <Reveal delay={0.08} className={styles.sources}>
        <VideoSource icon={<Camera />} label="Record" tone="brand" capture onFile={onFile} />
        <VideoSource icon={<Upload />} label="Upload" tone="tint" onFile={onFile} />
      </Reveal>

      <Reveal delay={0.12} className={styles.tips}>
        <Tip icon={<Sun />} text="Bright light" />
        <Tip icon={<Mic />} text={target.mode === "restock" ? "Say new prices" : "Say each price"} />
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
