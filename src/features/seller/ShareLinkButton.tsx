"use client";

import { Check, Share2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui";

// Native share sheet on phones (straight into WhatsApp/LINE), copy elsewhere.
export function ShareLinkButton({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    if (navigator.share) {
      await navigator.share({ url, title }).catch(() => {});
      return;
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <Button variant="soft" size="sm" icon={copied ? <Check /> : <Share2 />} onClick={handleClick}>
      {copied ? "Copied" : "Share"}
    </Button>
  );
}
