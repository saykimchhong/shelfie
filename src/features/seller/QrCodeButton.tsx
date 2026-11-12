"use client";

import { Download, Printer, QrCode } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button, Sheet, Skeleton, Text } from "@/components/ui";
import { drawPoster, POSTER } from "./qr";
import styles from "./QrCodeButton.module.scss";

type Poster = { status: "drawing" } | { status: "ready"; url: string } | { status: "failed" };

const CAPTION = "Scan to see our products and order";

// A printable sheet with the store's QR code, for the counter or the window:
// walk-in customers scan it to open the store on their phone.
export function QrCodeButton({ url, linkLabel, shopName, slug }: { url: string; linkLabel: string; shopName: string; slug: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="soft" size="sm" icon={<QrCode />} onClick={() => setOpen(true)}>
        QR code
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} title="QR code for your shop">
        <PosterView url={url} linkLabel={linkLabel} shopName={shopName} slug={slug} />
      </Sheet>
    </>
  );
}

// Mounted only while the sheet is open, so each opening draws the current name.
function PosterView({ url, linkLabel, shopName, slug }: { url: string; linkLabel: string; shopName: string; slug: string }) {
  const [poster, setPoster] = useState<Poster>({ status: "drawing" });

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    async function draw() {
      const fontFamily = getComputedStyle(document.body).fontFamily;
      // Script fonts load on first use; wait so the canvas doesn't draw boxes.
      await document.fonts.load(`800 84px ${fontFamily}`, `${shopName} ${CAPTION}`).catch(() => {});
      const canvas = document.createElement("canvas");
      drawPoster(canvas, { shopName, caption: CAPTION, linkLabel, url, fontFamily });
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (cancelled) return;
      if (!blob) return setPoster({ status: "failed" });
      objectUrl = URL.createObjectURL(blob);
      setPoster({ status: "ready", url: objectUrl });
    }

    draw().catch(() => !cancelled && setPoster({ status: "failed" }));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url, linkLabel, shopName]);

  if (poster.status === "failed") {
    return (
      <Text tone="danger" align="center">
        Couldn&apos;t make the QR code. Close this and try again.
      </Text>
    );
  }

  return (
    <div className={styles.content}>
      <Text tone="muted" align="center">
        Print it and put it on your counter or window. Customers scan it with their phone camera to open your shop.
      </Text>
      {poster.status === "ready" ? (
        // eslint-disable-next-line @next/next/no-img-element -- a local picture made on this phone
        <img src={poster.url} alt={`QR code for ${shopName}`} width={POSTER.width} height={POSTER.height} className={styles.poster} />
      ) : (
        <Skeleton className={styles.poster} radius="var(--radius-lg)" />
      )}
      <div className={styles.actions}>
        <Button size="lg" block icon={<Printer />} disabled={poster.status !== "ready"} onClick={() => window.print()}>
          Print
        </Button>
        {poster.status === "ready" ? (
          <a href={poster.url} download={`${slug}-qr-code.png`} className={styles.save}>
            <Download aria-hidden />
            Save picture
          </a>
        ) : null}
      </div>
      {/* What the printer gets: only this sheet (see [data-print] in globals.scss). */}
      {poster.status === "ready"
        ? createPortal(
            <div data-print>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={poster.url} alt="" />
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
