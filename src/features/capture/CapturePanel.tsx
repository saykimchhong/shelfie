"use client";

import clsx from "clsx";
import { ArrowLeft, ArrowRight, Check, FlaskConical, RotateCcw, Sparkles, TriangleAlert } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Badge, Button, ButtonLink, EmptyState, Spinner, Stack, Surface, Text } from "@/components/ui";
import type { AgentEvent } from "@/domain/agents";
import { MAX_CAPTURE_PHOTOS, type CaptureSource, type ExtractionResponse } from "@/domain/extraction";
import type { Product } from "@/domain/product";
import { canonicalShelf, productsOnShelf, shelvesOf, UNSORTED } from "@/domain/shelf";
import { DEFAULT_RESTOCK, type Store } from "@/domain/store";
import { useAuth, useSignedInUser } from "@/features/auth";
import {
  captureFrames,
  cropSquare,
  fitPhoto,
  generateProductPhoto,
  pickShots,
  saveProductImage,
  videoDuration,
} from "@/features/media";
import { DashboardSkeleton } from "@/features/seller";
import {
  saveProductChanges,
  useMyStore,
  useProducts,
  useRefreshStorefront,
  type ProductUpdate,
} from "@/features/seller/data";
import { pluralize } from "@/lib/format";
import { AgentActivityFeed } from "./AgentActivityFeed";
import { requestExtraction, type CaptureInput } from "./api";
import { isSavable, toProductInput, toProductUpdate, type Draft } from "./drafts";
import { mergeShelf, toKnownProducts, type Missing } from "./merge";
import { MergeReview } from "./MergeReview";
import { PhotoStep, type PhotoActions } from "./PhotoStep";
import type { CaptureTarget } from "./ShelfPicker";
import { SourcePicker } from "./SourcePicker";
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

// What the AI is reading, shown while it works. New products' photos come
// from the video, or are cropped from the full-size photos.
type Preview =
  | { source: "video"; url: string }
  | { source: "photos"; urls: string[]; originals: Blob[] }
  | { source: "text"; text: string };

function revokePreview(preview: Preview | null) {
  if (preview?.source === "video") URL.revokeObjectURL(preview.url);
  if (preview?.source === "photos") preview.urls.forEach((url) => URL.revokeObjectURL(url));
}

// Photos go up at this size: plenty to read labels and prices.
const UPLOAD_PHOTO_SIDE = 1600;

const RETRY_HINT: Record<CaptureSource, string> = {
  video: "Try again a little slower, with the labels facing the camera.",
  photos: "Try closer photos, with the labels facing the camera.",
  text: "Put one product per line, with its price after the name.",
};

// Film → Check (new products, updates, missing ones) → Photos (new ones) → saved.
function Capture({ store, products }: { store: Store; products: Product[] }) {
  const { getIdToken } = useAuth();
  const refreshStorefront = useRefreshStorefront();
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("pick");
  const [target, setTarget] = useState<CaptureTarget>({ mode: "add", shelf: UNSORTED });
  const [shelf, setShelf] = useState<Shelf>(EMPTY_SHELF);
  const [source, setSource] = useState<CaptureSource>("video");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [missing, setMissing] = useState<Missing[]>([]);
  const [provider, setProvider] = useState<ExtractionResponse["provider"] | null>(null);
  // Each agent's progress while the video is read, for the activity feed.
  const [steps, setSteps] = useState<AgentEvent[]>([]);
  // 0–1 while a video over the upload cap is made smaller first; null otherwise.
  const [shrinking, setShrinking] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  // Bumped per read, so a stale read's photos never land on a newer one.
  const runRef = useRef(0);

  // Cancel any in-flight request on leave; free the video or photos when they change.
  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(() => () => revokePreview(preview), [preview]);

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

  function show(next: Preview) {
    setPreview(next);
    setPhase("reading");
    setError(null);
    setSteps([]);
    setShrinking(null);
  }

  async function readVideo(video: File) {
    const next: Preview = { source: "video", url: URL.createObjectURL(video) };
    show(next);
    await read({ source: "video", video, durationSeconds: await videoDuration(next.url) }, next);
  }

  async function readPhotos(files: File[]) {
    const originals = files.slice(0, MAX_CAPTURE_PHOTOS);
    const next: Preview = { source: "photos", urls: originals.map((photo) => URL.createObjectURL(photo)), originals };
    show(next);
    let photos: Blob[];
    try {
      photos = await Promise.all(originals.map((photo) => fitPhoto(photo, UPLOAD_PHOTO_SIDE, 0.85)));
    } catch (cause) {
      console.error(cause);
      setError("Couldn't open those photos. Try JPG or PNG photos.");
      setPhase("error");
      return;
    }
    await read({ source: "photos", photos }, next);
  }

  function readText(text: string) {
    const next: Preview = { source: "text", text };
    show(next);
    void read({ source: "text", text }, next);
  }

  async function read(capture: CaptureInput, next: Preview) {
    const name = canonicalShelf(target.shelf, shelvesOf(products));
    const shelfProducts = productsOnShelf(products, name);
    const restock = target.mode === "restock";
    const run = ++runRef.current;

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const result = await requestExtraction({
        capture,
        currency: store.currency,
        labelLanguage: store.labelLanguage,
        shopType: store.shopType,
        known: toKnownProducts(shelfProducts),
        idToken: await getIdToken(),
        signal: controller.signal,
        onStep: (event) => setSteps((current) => [...current, event]),
        onShrink: setShrinking,
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
      void preparePhotos(run, next, merge.drafts, result.provider);
    } catch (cause) {
      if (controller.signal.aborted) return;
      setError(cause instanceof Error ? cause.message : "Something went wrong");
      setPhase("error");
    }
  }

  // New products' photos, made in the background during review. A typed list
  // has none: the seller picks AI photos or uploads on the next step.
  async function preparePhotos(run: number, from: Preview, all: Draft[], ai: ExtractionResponse["provider"]) {
    const fresh = all.filter((draft) => draft.group === "new");
    if (fresh.length === 0 || from.source === "text") return;
    const freshKeys = new Set(fresh.map((draft) => draft.key));
    setDrafts((current) => current.map((draft) => (freshKeys.has(draft.key) ? { ...draft, photoBusy: true } : draft)));

    const frames =
      from.source === "video" ? await videoFrames(from.url, fresh, ai) : await photoFrames(from.originals, fresh);
    if (runRef.current !== run) return;

    const frameByKey = new Map(fresh.map((draft, index) => [draft.key, frames[index] ?? null]));
    setDrafts((current) =>
      current.map((draft) => {
        if (!frameByKey.has(draft.key)) return draft;
        const frame = frameByKey.get(draft.key) ?? null;
        if (draft.photoSource === "upload") return { ...draft, frame, photoBusy: false };
        return { ...draft, frame, photo: frame, photoSource: frame ? "video" : "none", photoBusy: false };
      }),
    );
  }

  async function makeAiPhoto(draft: Draft) {
    patch(draft.key, { photoBusy: true, photoFailed: false });
    try {
      const photo = await generateProductPhoto({ name: draft.name, frame: draft.frame });
      patch(draft.key, { photo, photoSource: "ai", photoBusy: false });
    } catch (cause) {
      console.error(cause);
      patch(draft.key, { photoBusy: false, photoFailed: true });
    }
  }

  const photoActions: PhotoActions = {
    choose(key, source) {
      const draft = drafts.find((item) => item.key === key);
      if (!draft) return;
      if (source === "ai") void makeAiPhoto(draft);
      else if (source === "video") patch(key, { photo: draft.frame, photoSource: "video", photoFailed: false });
      else patch(key, { photo: null, photoSource: "none", photoFailed: false });
    },
    upload(key, file) {
      patch(key, { photo: file, photoSource: "upload", photoFailed: false });
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
            ? { ...draft, photo: files[next++], photoSource: "upload", photoFailed: false }
            : draft,
        );
      });
    },
  };

  function reset() {
    abortRef.current?.abort();
    runRef.current++;
    setPreview(null);
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

  const shown: CaptureSource = preview?.source ?? source;
  const nothingSeen = drafts.length === 0 && missing.length === 0;
  const upToDate = !nothingSeen && newDrafts.length === 0 && updateDrafts.length === 0 && missing.length === 0;

  return (
    <>
      {phase !== "error" ? <Stepper current={STEP_INDEX[phase]} source={shown} /> : null}

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={phase}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        >
          {phase === "pick" ? (
            <SourcePicker
              products={products}
              target={target}
              onTarget={setTarget}
              source={source}
              onSource={setSource}
              onVideo={readVideo}
              onPhotos={readPhotos}
              onText={readText}
            />
          ) : null}

          {phase === "reading" && preview ? <Reading preview={preview} steps={steps} shrinking={shrinking} /> : null}

          {phase === "review" && nothingSeen ? (
            <EmptyState
              tone="sun"
              icon={<Sparkles />}
              title="No products spotted"
              description={RETRY_HINT[shown]}
              action={<Button icon={<RotateCcw />} onClick={reset}>Try again</Button>}
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

              {steps.length > 0 ? (
                <Surface tone="tint" padding="sm" radius="xl">
                  <AgentActivityFeed steps={steps} variant="recap" source={shown} />
                </Surface>
              ) : null}

              <MergeReview
                drafts={drafts}
                missing={missing}
                known={shelf.products}
                source={shown}
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
                  <Button size="lg" className={styles.primary} iconAfter={<ArrowRight />} onClick={() => setPhase("photos")}>
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
              <PhotoStep drafts={adding} actions={photoActions} source={shown} />
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

// While the AI reads: what it's reading, and each agent's progress as it streams in.
function Reading({ preview, steps, shrinking }: { preview: Preview; steps: AgentEvent[]; shrinking: number | null }) {
  return (
    <div className={styles.reading}>
      <div className={clsx(styles.preview, preview.source === "text" && styles.listPreview)}>
        {preview.source === "video" ? <video src={preview.url} autoPlay muted loop playsInline /> : null}
        {preview.source === "photos" ? (
          <>
            {/* A local object URL: next/image can't optimize it. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview.urls[0]} alt="" />
            {preview.urls.length > 1 ? (
              <span className={styles.count}>{pluralize(preview.urls.length, "photo")}</span>
            ) : null}
          </>
        ) : null}
        {preview.source === "text" ? <p className={styles.listText}>{preview.text}</p> : null}
        <span className={styles.scan} aria-hidden />
      </div>
      <Stack gap={4} className={styles.progress}>
        <Stack direction="row" gap={2} align="center">
          {/* Until the first agent starts (e.g. while the upload runs). */}
          {steps.length === 0 ? <Spinner /> : null}
          <Text weight={600}>
            {/* A big phone video is made smaller before it's sent. */}
            {shrinking !== null && steps.length === 0
              ? `Making your video smaller… ${Math.round(shrinking * 100)}%`
              : "Finding products and prices…"}
          </Text>
        </Stack>
        <AgentActivityFeed steps={steps} source={preview.source} />
      </Stack>
    </div>
  );
}

async function videoFrames(url: string, drafts: readonly Draft[], ai: ExtractionResponse["provider"]) {
  const targets = drafts.map((draft) => ({
    name: draft.name,
    localName: draft.localName,
    seconds: draft.seenAtSeconds ?? 0,
    box: draft.box,
  }));
  const requests =
    ai === "gemini" ? await pickShots(url, targets) : targets.map(({ seconds, box }) => ({ seconds, box }));
  return captureFrames(url, requests);
}

// Each product's square from the full-size photo it's in. A line on a price
// list has no box, so no photo: the seller picks one on the next step.
function photoFrames(originals: readonly Blob[], drafts: readonly Draft[]): Promise<(Blob | null)[]> {
  return Promise.all(
    drafts.map((draft) => {
      const photo = originals[draft.seenAtSeconds ?? 0];
      return photo && draft.box ? cropSquare(photo, draft.box).catch(() => null) : Promise.resolve(null);
    }),
  );
}
