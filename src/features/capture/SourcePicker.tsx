"use client";

import {
  ArrowRight,
  Camera,
  Images,
  ListChecks,
  Mic,
  ScanText,
  Sun,
  Tag,
  Timer,
  Type,
  Upload,
  Video,
} from "lucide-react";
import { useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { Reveal } from "@/components/motion/Reveal";
import { Button, Segmented, Stack, Text, TextArea } from "@/components/ui";
import { MAX_CAPTURE_PHOTOS, MAX_CAPTURE_TEXT, type CaptureSource } from "@/domain/extraction";
import type { Product } from "@/domain/product";
import { ShelfPicker, type CaptureTarget } from "./ShelfPicker";
import styles from "./SourcePicker.module.scss";

const TITLES: Record<CaptureTarget["mode"], Record<CaptureSource, string>> = {
  add: { video: "Film your shelf", photos: "Snap your shelf", text: "Type your list" },
  restock: { video: "Re-film a shelf", photos: "Restock from photos", text: "Restock from a list" },
};

const SOURCE_OPTIONS = [
  { value: "video", label: <Option icon={<Video />} text="Video" /> },
  { value: "photos", label: <Option icon={<Camera />} text="Photos" /> },
  { value: "text", label: <Option icon={<Type />} text="List" /> },
] as const;

export type SourcePickerProps = {
  products: Product[];
  target: CaptureTarget;
  onTarget: (target: CaptureTarget) => void;
  source: CaptureSource;
  onSource: (source: CaptureSource) => void;
  onVideo: (video: File) => void;
  onPhotos: (photos: File[]) => void;
  onText: (text: string) => void;
};

// Step one: what the AI reads (a video, photos or a typed list) and for which shelf.
export function SourcePicker({ products, target, onTarget, source, onSource, onVideo, onPhotos, onText }: SourcePickerProps) {
  const restock = target.mode === "restock";
  return (
    <Stack gap={6}>
      <Reveal>
        <Text as="h1" size="3xl">
          {TITLES[target.mode][source]}
        </Text>
      </Reveal>

      <Reveal delay={0.04}>
        <Segmented label="Read from" options={SOURCE_OPTIONS} value={source} onChange={onSource} />
      </Reveal>

      <Reveal delay={0.06}>
        <ShelfPicker products={products} target={target} onChange={onTarget} />
      </Reveal>

      {source === "video" ? (
        <Reveal delay={0.08} className={styles.sources}>
          <FileTile icon={<Camera />} label="Record" tone="brand" accept="video/*" capture onFiles={([file]) => onVideo(file)} />
          <FileTile icon={<Upload />} label="Upload" tone="tint" accept="video/*" onFiles={([file]) => onVideo(file)} />
        </Reveal>
      ) : null}

      {source === "photos" ? (
        <Reveal delay={0.08} className={styles.sources}>
          <FileTile icon={<Camera />} label="Take photo" tone="brand" accept="image/*" capture onFiles={onPhotos} />
          <FileTile icon={<Images />} label="Choose photos" tone="tint" accept="image/*" multiple onFiles={onPhotos} />
        </Reveal>
      ) : null}

      {source === "text" ? (
        <Reveal delay={0.08}>
          <ListForm onSubmit={onText} />
        </Reveal>
      ) : null}

      <Reveal delay={0.12} className={styles.tips}>
        {source === "video" ? (
          <>
            <Tip icon={<Sun />} text="Bright light" />
            <Tip icon={<Mic />} text={restock ? "Say new prices" : "Say each price"} />
            <Tip icon={<Timer />} text="Under 2 min" />
          </>
        ) : source === "photos" ? (
          <>
            <Tip icon={<Sun />} text="Bright light" />
            <Tip icon={<Tag />} text="Price tags in view" />
            <Tip icon={<Images />} text={`Up to ${MAX_CAPTURE_PHOTOS} photos`} />
          </>
        ) : (
          <>
            <Tip icon={<ListChecks />} text="One per line" />
            <Tip icon={<Tag />} text="Price after the name" />
            <Tip icon={<ScanText />} text="Any language" />
          </>
        )}
      </Reveal>
    </Stack>
  );
}

function ListForm({ onSubmit }: { onSubmit: (text: string) => void }) {
  const [text, setText] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    if (text.trim()) onSubmit(text.trim());
  }

  return (
    <form className={styles.listForm} onSubmit={submit}>
      <TextArea
        label="Your products"
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={"Coke 1.5L 25\nMilo 400g 95\nJasmine rice 5kg 250"}
        rows={6}
        maxLength={MAX_CAPTURE_TEXT}
      />
      <Button type="submit" size="lg" iconAfter={<ArrowRight />} disabled={!text.trim()}>
        Read my list
      </Button>
    </form>
  );
}

function FileTile({
  icon,
  label,
  tone,
  accept,
  capture,
  multiple,
  onFiles,
}: {
  icon: ReactNode;
  label: string;
  tone: "brand" | "tint";
  accept: string;
  capture?: boolean;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
}) {
  function onChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = ""; // allow picking the same file again
    if (files.length > 0) onFiles(files);
  }

  return (
    <label className={`${styles.source} ${styles[tone]}`}>
      <input
        type="file"
        accept={accept}
        capture={capture ? "environment" : undefined}
        multiple={multiple}
        className={styles.fileInput}
        onChange={onChange}
      />
      <span className={styles.sourceIcon}>{icon}</span>
      <span className={styles.sourceLabel}>{label}</span>
    </label>
  );
}

function Option({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <span className={styles.option}>
      {icon}
      {text}
    </span>
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
