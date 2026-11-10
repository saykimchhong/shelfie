"use client";

import { Mic, SendHorizontal, Sparkles, Square } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent, type KeyboardEvent } from "react";
import { Button, Surface, Text } from "@/components/ui";
import type { Product } from "@/domain/product";
import type { Store } from "@/domain/store";
import { MAX_UPDATE_SECONDS, MAX_UPDATE_TEXT, type ProductChange, type UpdatesResponse } from "@/domain/updates";
import { useAuth } from "@/features/auth";
import { removeImage } from "@/features/media";
import { saveProductChanges, useRefreshStorefront } from "@/features/seller/data";
import { pluralize } from "@/lib/format";
import { requestUpdates } from "./api";
import { toListedProducts, toWrites } from "./changes";
import { canRecord, startRecording, type Recording } from "./recorder";
import { UpdateReview } from "./UpdateReview";
import styles from "./QuickUpdate.module.scss";

type Phase = "idle" | "recording" | "reading";
type Status = { tone: "muted" | "danger" | "accent"; text: string };
// `open` is separate so the sheet keeps its content while it closes.
type Review = { id: number; result: UpdatesResponse; open: boolean };

const noSubscribe = () => () => {};

// "Tell AI what changed": type or say it, check the changes, save. No video needed.
export function QuickUpdate({ store, products }: { store: Store; products: Product[] }) {
  const { getIdToken } = useAuth();
  const refreshStorefront = useRefreshStorefront();
  const micAvailable = useSyncExternalStore(noSubscribe, canRecord, () => false);
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [seconds, setSeconds] = useState(0);
  const [status, setStatus] = useState<Status | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const recordingRef = useRef<Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(
    () => () => {
      recordingRef.current?.cancel();
      if (timerRef.current) clearInterval(timerRef.current);
    },
    [],
  );

  async function read(message: { text: string } | { audio: Blob }) {
    setPhase("reading");
    setStatus(null);
    try {
      const result = await requestUpdates({
        message,
        products: toListedProducts(products, store.priceUnit),
        currency: store.currency,
        labelLanguage: store.labelLanguage,
        shopType: store.shopType,
        idToken: await getIdToken(),
      });
      if (result.changes.length > 0) setReview({ id: Date.now(), result, open: true });
      else
        setStatus({
          tone: "muted",
          text: result.heard
            ? `Heard “${result.heard}” but found nothing to change.`
            : "Found nothing to change. Name the product and what changed.",
        });
    } catch (cause) {
      setStatus({ tone: "danger", text: cause instanceof Error ? cause.message : "Couldn't read that. Try again." });
    } finally {
      setPhase("idle");
    }
  }

  function submit(event?: FormEvent) {
    event?.preventDefault();
    const message = text.trim();
    if (message && phase === "idle") void read({ text: message });
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) submit(event);
  }

  async function startVoice() {
    setStatus(null);
    try {
      recordingRef.current = await startRecording();
    } catch {
      setStatus({ tone: "danger", text: "Couldn't use the microphone. Allow it, or type instead." });
      return;
    }
    const started = Date.now();
    setSeconds(0);
    setPhase("recording");
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - started) / 1000);
      setSeconds(elapsed);
      if (elapsed >= MAX_UPDATE_SECONDS) void stopVoice();
    }, 250);
  }

  async function stopVoice() {
    const recording = recordingRef.current;
    recordingRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
    if (!recording) return;
    setPhase("reading");
    try {
      await read({ audio: await recording.stop() });
    } catch {
      setPhase("idle");
      setStatus({ tone: "danger", text: "Couldn't record that. Try again, or type instead." });
    }
  }

  async function apply(changes: ProductChange[]) {
    const writes = toWrites(changes, new Map(products.map((product) => [product.id, product])));
    await saveProductChanges(
      store.slug,
      { add: writes.add, update: writes.update, remove: writes.remove.map((product) => product.id) },
      Date.now(),
    );
    writes.remove.forEach((product) => removeImage(product.imageUrl));
    await refreshStorefront(store.slug);
    setReview((current) => current && { ...current, open: false });
    setText("");
    setStatus({ tone: "accent", text: `Saved ${pluralize(changes.length, "change")}` });
  }

  const recording = phase === "recording";

  return (
    <Surface padding="md" radius="xl" className={styles.box}>
      <form onSubmit={submit} className={styles.form}>
        <label htmlFor="quick-update" className={styles.title}>
          <Sparkles aria-hidden />
          Tell AI what changed
        </label>

        <textarea
          id="quick-update"
          className={styles.input}
          value={recording ? "" : text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={recording ? "Listening… say what changed" : "e.g. Coke is 25 now, Milo sold out, add eggs 4 each"}
          maxLength={MAX_UPDATE_TEXT}
          rows={2}
          enterKeyHint="send"
          disabled={phase !== "idle"}
        />

        <div className={styles.actions}>
          {recording ? (
            <Button variant="danger" icon={<Square />} onClick={stopVoice} aria-label="Stop recording">
              <span className={styles.dot} aria-hidden />
              {formatSeconds(seconds)}
            </Button>
          ) : micAvailable ? (
            <Button variant="soft" icon={<Mic />} onClick={startVoice} disabled={phase === "reading"}>
              Say it
            </Button>
          ) : (
            <span />
          )}
          <Button
            type="submit"
            icon={<SendHorizontal />}
            loading={phase === "reading"}
            disabled={recording || (!text.trim() && phase === "idle")}
          >
            Update
          </Button>
        </div>

        {status ? (
          <Text role="status" size="sm" tone={status.tone} className={styles.status}>
            {status.text}
          </Text>
        ) : null}
      </form>

      {review ? (
        <UpdateReview
          key={review.id}
          open={review.open}
          result={review.result}
          products={new Map(products.map((product) => [product.id, product]))}
          currency={store.currency}
          shopUnit={store.priceUnit}
          onClose={() => setReview((current) => current && { ...current, open: false })}
          onApply={apply}
        />
      ) : null}
    </Surface>
  );
}

function formatSeconds(total: number): string {
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
