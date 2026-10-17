"use client";

import { useState, type ReactNode } from "react";
import { Button } from "../Button/Button";
import { Checkbox } from "../Checkbox/Checkbox";
import { Sheet } from "../Sheet/Sheet";
import { Stack } from "../Stack/Stack";
import { Text } from "../Text/Text";

export type ConfirmSheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  // What will happen, in a sentence or two.
  children: ReactNode;
  // What the user ticks to unlock the action, e.g. "I understand this can't be undone".
  acknowledge: string;
  confirmLabel: string;
  confirmIcon?: ReactNode;
  // Resolving closes the sheet; rejecting shows `errorMessage` so they can retry.
  onConfirm: () => Promise<void>;
  errorMessage?: string;
};

// A destructive action behind a sheet. The confirm button stays disabled until
// the acknowledgement is ticked, and the tick resets every time it opens.
export function ConfirmSheet({ open, onClose, title, ...body }: ConfirmSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <ConfirmBody {...body} onClose={onClose} />
    </Sheet>
  );
}

function ConfirmBody({
  children,
  acknowledge,
  confirmLabel,
  confirmIcon,
  onConfirm,
  errorMessage = "That didn't work. Try again.",
  onClose,
}: Omit<ConfirmSheetProps, "open" | "title">) {
  const [ticked, setTicked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function confirm() {
    setBusy(true);
    setFailed(false);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error(error);
      setFailed(true);
      setBusy(false);
    }
  }

  return (
    <Stack gap={5}>
      <Text tone="muted">{children}</Text>
      <Checkbox tone="danger" checked={ticked} onChange={setTicked} label={acknowledge} disabled={busy} />
      {failed ? (
        <Text role="alert" size="sm" tone="danger" weight={600}>
          {errorMessage}
        </Text>
      ) : null}
      <Stack direction="row" justify="end" gap={2}>
        <Button variant="ghost" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button variant="danger" icon={confirmIcon} onClick={confirm} disabled={!ticked} loading={busy}>
          {confirmLabel}
        </Button>
      </Stack>
    </Stack>
  );
}
