import { Mic } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";
import { Stagger } from "@/components/motion/Reveal";
import { Text } from "@/components/ui";
import type { AgentEvent } from "@/domain/agents";
import { AgentActivityFeed } from "@/features/capture/AgentActivityFeed";
import { orderMessage } from "@/lib/contact";
import { formatPrice } from "@/lib/format";
import styles from "./HowItWorks.module.scss";

// A finished run, as the seller sees it on the review screen.
const RUN: AgentEvent[] = [
  { step: "watcher", status: "done", summary: "Found 6 products, heard 6 prices", ms: 5200 },
  { step: "priceMatcher", status: "done", summary: "Paired 6 prices", ms: 3 },
  { step: "shelfMatcher", status: "skipped" },
  { step: "checker", status: "done", summary: "All clear", ms: 2 },
];

// The real order message a customer sends, built by the same code as the cart.
const rupees = (amount: number) => formatPrice(amount, "LKR");
const MESSAGE = orderMessage({
  storeName: "Nimal's Fruit Stall",
  lines: [
    { name: "Mango", quantity: 2, unit: "kg", lineTotal: 1200 },
    { name: "Pineapple", quantity: 1, unit: "each", lineTotal: 450 },
  ],
  total: rupees(1650),
  formatLineTotal: rupees,
  fulfillment: { method: "delivery", address: "Nugegoda" },
});

// Three steps, each shown with the real thing rather than a drawing.
export function HowItWorks() {
  return (
    <Stagger as="ol" interval={0.08} className={styles.steps}>
      <Step number={1} title="Film your shelf" body="Walk past your shelf and say each price out loud. Photos or a typed list work too.">
        <div className={styles.film}>
          <Image src="/landing/fruit-stand.jpg" alt="" fill sizes="(min-width: 768px) 30vw, 90vw" className={styles.photo} />
          <span className={styles.rec}>REC</span>
          <span className={styles.said}>
            <Mic aria-hidden />
            “Mango, 600 a kilo”
          </span>
        </div>
      </Step>
      <Step number={2} title="Four agents read it" body="Gemini agents list every product with its price. You check it and fix anything with one tap.">
        <div className={styles.panel}>
          <AgentActivityFeed steps={RUN} variant="recap" className={styles.feed} />
        </div>
      </Step>
      <Step number={3} title="Customers order in chat" body="Share your shop link. Orders arrive in your WhatsApp or LINE, ready to reply to.">
        <div className={styles.panel}>
          <p className={styles.bubble}>{MESSAGE}</p>
        </div>
      </Step>
    </Stagger>
  );
}

function Step({ number, title, body, children }: { number: number; title: string; body: string; children: ReactNode }) {
  return (
    <li className={styles.step}>
      <div className={styles.visual}>{children}</div>
      <Text as="h3" size="lg" weight={700}>
        <span className={styles.number}>{number}</span>
        {title}
      </Text>
      <Text tone="muted">{body}</Text>
    </li>
  );
}
