"use client";

import clsx from "clsx";
import { ArrowLeft, Mic, RotateCcw, SendHorizontal, Square } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent, type KeyboardEvent } from "react";
import { Button, ButtonLink, Text } from "@/components/ui";
import type { Product } from "@/domain/product";
import type { Store } from "@/domain/store";
import {
  MAX_UPDATE_SECONDS,
  MAX_UPDATE_TEXT,
  type ChatTurn,
  type ProductChange,
  type UpdatesResponse,
} from "@/domain/updates";
import { ChangeCard } from "./ChangeCard";
import {
  describeChanges,
  keptChanges,
  loadChat,
  saveChat,
  toHistory,
  waitingChanges,
  withFailure,
  withProposal,
  withReply,
  type ChatMessage,
  type Proposal,
} from "./chat";
import { canRecord, startRecording, type Recording } from "./recorder";
import styles from "./ChatRoom.module.scss";

// One message to the assistant, with what the chat remembers.
export type Ask = { message: { text: string } | { audio: Blob }; history: ChatTurn[]; waiting: ProductChange[] };

type Props = {
  store: Store;
  products: Product[];
  // False while the products are still loading.
  ready: boolean;
  ask: (request: Ask) => Promise<Pick<UpdatesResponse, "heard" | "reply" | "changes">>;
  onSave: (changes: ProductChange[]) => Promise<void>;
};

type Phase = "idle" | "recording" | "reading";

const QUESTIONS = ["What is sold out?", "Which products have no price?", "How many products do I have?"];

const noSubscribe = () => () => {};
const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

// The chat itself: messages, the changes waiting to be saved, and the box to type or speak in.
export function ChatRoom({ store, products, ready, ask, onSave }: Props) {
  const micAvailable = useSyncExternalStore(noSubscribe, canRecord, () => false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadChat(store.slug));
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [seconds, setSeconds] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const recordingRef = useRef<Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const firstScroll = useRef(true);

  useEffect(() => saveChat(store.slug, messages), [store.slug, messages]);

  useEffect(
    () => () => {
      recordingRef.current?.cancel();
      if (timerRef.current) clearInterval(timerRef.current);
    },
    [],
  );

  // Keep the newest message in view; jump (no glide) on arrival and for reduced motion.
  useEffect(() => {
    const smooth = !firstScroll.current && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    firstScroll.current = false;
    endRef.current?.scrollIntoView({ block: "end", behavior: smooth ? "smooth" : "auto" });
  }, [messages.length, phase]);

  const byId = new Map(products.map((product): [string, Product] => [product.id, product]));
  const nameOf = (id: string) => byId.get(id)?.name;

  async function send(message: Ask["message"]) {
    if (!ready) return;
    const ownerId = newId();
    const replyId = newId();
    const before = messages;
    const mine: ChatMessage =
      "text" in message ? { id: ownerId, role: "owner", text: message.text } : { id: ownerId, role: "owner", text: "", voice: true };
    setMessages([...before, mine]);
    setPhase("reading");
    try {
      const response = await ask({ message, history: toHistory(before), waiting: waitingChanges(before) });
      setMessages((current) => withReply(current, ownerId, replyId, response));
    } catch (cause) {
      const reason = cause instanceof Error ? cause.message : "Couldn't read that. Try again.";
      setMessages((current) => withFailure(current, ownerId, replyId, reason));
      if ("text" in message) setText((current) => current || message.text);
    } finally {
      setPhase("idle");
    }
  }

  function submit(event?: FormEvent) {
    event?.preventDefault();
    const message = text.trim();
    if (!message || phase !== "idle" || !ready) return;
    setText("");
    void send({ text: message });
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) submit(event);
  }

  async function startVoice() {
    setMicError(null);
    try {
      recordingRef.current = await startRecording();
    } catch {
      setMicError("Couldn't use the microphone. Allow it, or type instead.");
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
    try {
      const audio = await recording.stop();
      await send({ audio });
    } catch {
      setPhase("idle");
      setMicError("Couldn't record that. Try again, or type instead.");
    }
  }

  async function save(id: string, proposal: Proposal) {
    const kept = keptChanges(proposal);
    const note = describeChanges(kept, nameOf);
    await onSave(kept);
    setMessages((current) => withProposal(current, id, (waiting) => ({ ...waiting, state: "saved", note })));
  }

  function drop(id: string, proposal: Proposal) {
    const note = describeChanges(keptChanges(proposal), nameOf);
    setMessages((current) => withProposal(current, id, (waiting) => ({ ...waiting, state: "dropped", note })));
  }

  function toggle(id: string, index: number) {
    setMessages((current) =>
      withProposal(current, id, (waiting) => ({
        ...waiting,
        skipped: waiting.skipped.includes(index)
          ? waiting.skipped.filter((skipped) => skipped !== index)
          : [...waiting.skipped, index],
      })),
    );
  }

  const recording = phase === "recording";
  const example = products[0] ? `“${products[0].name} is sold out”` : "“Add eggs, 4 each”";

  return (
    <div className={styles.room} data-fills-screen>
      <header className={styles.head}>
        <ButtonLink href="/dashboard" variant="ghost" size="sm" icon={<ArrowLeft />}>
          My store
        </ButtonLink>
        {messages.length > 0 ? (
          <Button variant="ghost" size="sm" icon={<RotateCcw />} onClick={() => setMessages([])} disabled={phase !== "idle"}>
            New chat
          </Button>
        ) : null}
      </header>

      <ol className={styles.messages} role="log" aria-label="Chat with your shop assistant">
        <li className={clsx(styles.turn, styles.theirs)}>
          <div className={styles.bubble}>
            <Text as="h1" size="md" weight={700}>
              Shop assistant
            </Text>
            Tell me what changed, like {example}, or ask about your products. Nothing is saved until you tap Save.
          </div>
          {messages.length === 0 ? (
            <div className={styles.questions}>
              {QUESTIONS.map((question) => (
                <button
                  key={question}
                  type="button"
                  className={styles.question}
                  disabled={phase !== "idle" || !ready}
                  onClick={() => void send({ text: question })}
                >
                  {question}
                </button>
              ))}
            </div>
          ) : null}
        </li>

        {messages.map((message) => {
          if (message.role === "owner") {
            return (
              <li key={message.id} className={clsx(styles.turn, styles.mine)}>
                <div className={styles.bubble}>
                  {message.voice ? <Mic aria-label="Voice note" className={styles.voice} /> : null}
                  {message.text || (message.voice ? "Voice note" : "")}
                </div>
                {message.failed ? <span className={styles.failed}>Not sent</span> : null}
              </li>
            );
          }
          const { id, proposal } = message;
          return (
            <li key={id} className={clsx(styles.turn, styles.theirs, proposal?.state === "waiting" && styles.wide)}>
              {message.text ? <div className={clsx(styles.bubble, message.error && styles.error)}>{message.text}</div> : null}
              {proposal ? (
                <ChangeCard
                  proposal={proposal}
                  products={byId}
                  currency={store.currency}
                  shopUnit={store.priceUnit}
                  busy={phase !== "idle"}
                  onToggle={(index) => toggle(id, index)}
                  onSave={() => save(id, proposal)}
                  onDrop={() => drop(id, proposal)}
                />
              ) : null}
            </li>
          );
        })}

        {phase === "reading" ? (
          <li className={clsx(styles.turn, styles.theirs)}>
            <div className={clsx(styles.bubble, styles.thinking)} role="status" aria-label="Working on it">
              <span />
              <span />
              <span />
            </div>
          </li>
        ) : null}
      </ol>

      <div className={styles.composer}>
        <form onSubmit={submit} className={styles.box}>
          <label htmlFor="assistant-message" className={styles.label}>
            Message
          </label>
          <textarea
            id="assistant-message"
            className={styles.input}
            value={recording ? "" : text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder={recording ? "Listening… say what changed" : "Type or say what changed, or ask a question"}
            maxLength={MAX_UPDATE_TEXT}
            rows={1}
            enterKeyHint="send"
            disabled={recording}
          />
          <div className={styles.actions}>
            {recording ? (
              <Button variant="danger" icon={<Square />} onClick={stopVoice} aria-label="Stop recording and send">
                <span className={styles.dot} aria-hidden />
                {formatSeconds(seconds)}
              </Button>
            ) : micAvailable ? (
              <Button variant="soft" icon={<Mic />} onClick={startVoice} disabled={phase === "reading" || !ready}>
                Say it
              </Button>
            ) : (
              <span />
            )}
            <Button
              type="submit"
              icon={<SendHorizontal />}
              loading={phase === "reading"}
              disabled={recording || !ready || (!text.trim() && phase === "idle")}
            >
              Send
            </Button>
          </div>
          {micError ? (
            <Text role="status" size="sm" tone="danger">
              {micError}
            </Text>
          ) : null}
        </form>
      </div>
      <div ref={endRef} aria-hidden />
    </div>
  );
}

function formatSeconds(total: number): string {
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
