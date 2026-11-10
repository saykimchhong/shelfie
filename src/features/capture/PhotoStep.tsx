"use client";

import clsx from "clsx";
import { Brush, Camera, Film, ImageOff, ImagePlus, Images } from "lucide-react";
import type { ChangeEvent, ReactNode } from "react";
import { Stagger } from "@/components/motion/Reveal";
import { Badge, Button, Spinner, Text, Thumb } from "@/components/ui";
import type { CaptureSource } from "@/domain/extraction";
import { useObjectUrl } from "@/features/media";
import type { Draft, PhotoSource } from "./drafts";
import styles from "./PhotoStep.module.scss";

export type PhotoActions = {
  choose: (key: string, source: Exclude<PhotoSource, "upload">) => void;
  upload: (key: string, file: File) => void;
  aiForAll: () => void;
  uploadMany: (files: File[]) => void;
};

export function PhotoStep({
  drafts,
  actions,
  source = "video",
}: {
  drafts: Draft[];
  actions: PhotoActions;
  // Where "From video" photos came from; a typed list has none.
  source?: CaptureSource;
}) {
  const busy = drafts.some((draft) => draft.photoBusy);

  return (
    <div className={styles.step}>
      <div className={styles.bulk}>
        <Button variant="soft" size="sm" icon={<Brush />} onClick={actions.aiForAll} disabled={busy}>
          Clean all photos
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
          <PhotoCard key={draft.key} draft={draft} actions={actions} source={source} />
        ))}
      </Stagger>
    </div>
  );
}

function PhotoCard({ draft, actions, source }: { draft: Draft; actions: PhotoActions; source: CaptureSource }) {
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
        {draft.photoSource === "ai" && !draft.photoBusy && !draft.photoFailed ? (
          <Badge tone="accent" className={styles.tag}>
            Cleaned
          </Badge>
        ) : null}
        {draft.photoFailed && !draft.photoBusy ? (
          <Badge tone="danger" className={styles.tag}>
            Couldn&apos;t clean it
          </Badge>
        ) : null}
      </div>

      <Text size="sm" weight={600} clamp={1}>
        {draft.name}
      </Text>

      <div className={styles.sources} role="group" aria-label={`Photo for ${draft.name}`}>
        {source !== "text" ? (
          <Source
            label={source === "photos" ? "From photo" : "From video"}
            short={source === "photos" ? "Photo" : "Video"}
            icon={source === "photos" ? <Camera /> : <Film />}
            active={draft.photoSource === "video"}
            disabled={!draft.frame || draft.photoBusy}
            onClick={() => actions.choose(draft.key, "video")}
          />
        ) : null}
        <Source
          label="Clean photo"
          short="Clean"
          icon={<Brush />}
          active={draft.photoSource === "ai"}
          disabled={draft.photoBusy}
          onClick={() => actions.choose(draft.key, "ai")}
        />
        <label
          className={clsx(styles.source, draft.photoSource === "upload" && styles.active)}
          title="Upload my photo"
        >
          <ImagePlus aria-hidden />
          <span className={styles.sourceText}>Upload</span>
          <input type="file" accept="image/*" aria-label="Upload my photo" onChange={onUpload} />
        </label>
        <Source
          label="No photo"
          short="None"
          icon={<ImageOff />}
          active={draft.photoSource === "none"}
          disabled={draft.photoBusy}
          onClick={() => actions.choose(draft.key, "none")}
        />
      </div>
    </li>
  );
}

// Icon plus a word: sellers shouldn't have to guess what a picture means.
function Source({
  label,
  short,
  icon,
  active,
  disabled,
  onClick,
}: {
  label: string;
  short: string;
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
      <span className={styles.sourceText}>{short}</span>
    </button>
  );
}
