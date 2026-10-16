"use client";

import clsx from "clsx";
import { Film, ImageOff, ImagePlus, Images, Sparkles } from "lucide-react";
import type { ChangeEvent, ReactNode } from "react";
import { Stagger } from "@/components/motion/Reveal";
import { Badge, Button, Spinner, Text, Thumb } from "@/components/ui";
import { useObjectUrl } from "@/features/media";
import type { Draft, PhotoSource } from "./drafts";
import styles from "./PhotoStep.module.scss";

export type PhotoActions = {
  choose: (key: string, source: Exclude<PhotoSource, "upload">) => void;
  upload: (key: string, file: File) => void;
  aiForAll: () => void;
  uploadMany: (files: File[]) => void;
};

export function PhotoStep({ drafts, actions }: { drafts: Draft[]; actions: PhotoActions }) {
  const busy = drafts.some((draft) => draft.photoBusy);

  return (
    <div className={styles.step}>
      <div className={styles.bulk}>
        <Button variant="soft" size="sm" icon={<Sparkles />} onClick={actions.aiForAll} disabled={busy}>
          AI for all
        </Button>
        <label className={styles.uploadMany}>
          <Images aria-hidden />
          Upload many
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(event) => {
              actions.uploadMany(Array.from(event.target.files ?? []));
              event.target.value = "";
            }}
          />
        </label>
      </div>

      <Stagger as="ul" className={styles.grid} interval={0.04}>
        {drafts.map((draft) => (
          <PhotoCard key={draft.key} draft={draft} actions={actions} />
        ))}
      </Stagger>
    </div>
  );
}

function PhotoCard({ draft, actions }: { draft: Draft; actions: PhotoActions }) {
  const url = useObjectUrl(draft.photo);

  function onUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) actions.upload(draft.key, file);
    event.target.value = "";
  }

  return (
    <li className={styles.card}>
      <div className={styles.photo}>
        <Thumb label={draft.name || "?"} src={url ?? undefined} size={220} className={styles.thumb} />
        {draft.photoBusy ? (
          <span className={styles.busy}>
            <Spinner size={28} label="Making photo" />
          </span>
        ) : null}
        {draft.photoSource === "ai" && !draft.photoBusy ? (
          <Badge tone="accent" icon={<Sparkles />} className={styles.tag}>
            AI
          </Badge>
        ) : null}
      </div>

      <Text size="sm" weight={600} clamp={1}>
        {draft.name}
      </Text>

      <div className={styles.sources} role="group" aria-label={`Photo for ${draft.name}`}>
        <Source
          label="From video"
          icon={<Film />}
          active={draft.photoSource === "video"}
          disabled={!draft.frame || draft.photoBusy}
          onClick={() => actions.choose(draft.key, "video")}
        />
        <Source
          label="AI photo"
          icon={<Sparkles />}
          active={draft.photoSource === "ai"}
          disabled={draft.photoBusy}
          onClick={() => actions.choose(draft.key, "ai")}
        />
        <label
          className={clsx(styles.source, draft.photoSource === "upload" && styles.active)}
          title="Upload my photo"
        >
          <ImagePlus aria-hidden />
          <input type="file" accept="image/*" aria-label="Upload my photo" onChange={onUpload} />
        </label>
        <Source
          label="No photo"
          icon={<ImageOff />}
          active={draft.photoSource === "none"}
          disabled={draft.photoBusy}
          onClick={() => actions.choose(draft.key, "none")}
        />
      </div>
    </li>
  );
}

function Source({
  label,
  icon,
  active,
  disabled,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      className={clsx(styles.source, active && styles.active)}
      onClick={onClick}
    >
      {icon}
    </button>
  );
}
