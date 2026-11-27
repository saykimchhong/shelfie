import clsx from "clsx";
import { Check, MessageCircle, Mic, Sparkles, Video } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";
import { ScrollStagger } from "@/components/motion/ScrollStagger";
import { Text } from "@/components/ui";
import { orderMessage } from "@/lib/contact";
import { formatPrice } from "@/lib/format";
import { AgentRunDemo } from "./AgentRunDemo";
import { GuidedSteps } from "./GuidedSteps";
import { MagicBurst } from "./MagicBurst";
import styles from "./HowItWorks.module.scss";

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

// Three steps, each shown with the real thing, then how the shop stays current.
export function HowItWorks() {
  return (
    <div className={styles.how}>
      <Steps />
      <UpdateAnytime />
    </div>
  );
}

function Steps() {
  return (
    <GuidedSteps className={styles.steps}>
      <Step
        number={1}
        icon={<Video />}
        title="Film your shelf"
        body="Say each price out loud as you film. Photos or a typed list work too."
      >
        <div className={clsx(styles.box, styles.film)}>
          <Image src="/landing/fruit-stand.jpg" alt="" fill sizes="(min-width: 1024px) 30vw, (min-width: 768px) 45vw, 90vw" className={styles.photo} />
          <span className={styles.rec}>REC</span>
          <span className={styles.said}>
            <Mic aria-hidden />
            “Mango, 600 a kilo”
          </span>
        </div>
      </Step>
      <Step
        number={2}
        icon={<Sparkles />}
        magic
        title="Four agents read it"
        body="Gemini lists every product and price, with photos from your video. Fix anything with one tap."
      >
        <AgentRunDemo className={clsx(styles.box, styles.agents)} />
      </Step>
      <Step
        number={3}
        icon={<MessageCircle />}
        title="Customers order in chat"
        body="Share your link. Orders arrive in your WhatsApp or LINE, ready to reply to."
      >
        <div className={clsx(styles.box, styles.chat)}>
          <p className={styles.incoming}>{MESSAGE}</p>
          <p className={styles.outgoing}>Thank you! On its way by 5 pm.</p>
        </div>
      </Step>
    </GuidedSteps>
  );
}

// The shop assistant, as the seller sees it: say what changed, check, save.
function UpdateAnytime() {
  return (
    <section aria-labelledby="update-title">
      <ScrollStagger interval={0.12} className={styles.update}>
        <div className={styles.updateCopy}>
          <Text as="h3" size="2xl" id="update-title">
            Keep it up to date, your way
          </Text>
          <Text tone="muted">
            Prices changed or something sold out? Tell your assistant in a message or a voice note. Nothing changes
            until you tap Save.
          </Text>
          <Text size="sm" tone="subtle">
            You can also re-film a shelf, snap photos or type a list.
          </Text>
        </div>
        <div className={clsx(styles.box, styles.chat, styles.assistant)} aria-hidden>
          <p className={styles.sent}>Mango is 700 now, bananas sold out</p>
          <div className={styles.reply}>
            <strong>2 changes ready</strong>
            <span>
              <Check /> Mango: Rs 600 → Rs 700
            </span>
            <span>
              <Check /> Bananas: sold out
            </span>
            <span className={styles.save}>Save</span>
          </div>
        </div>
      </ScrollStagger>
    </section>
  );
}

type StepProps = { number: number; icon: ReactNode; title: string; body: string; magic?: boolean; children: ReactNode };

// Each step's icon is a node on one line that joins the steps into a process.
// A magic step's icon flicks like a wand and bursts into stars when it's reached.
function Step({ number, icon, title, body, magic, children }: StepProps) {
  return (
    <li className={styles.step}>
      <span className={styles.node} aria-hidden>
        <span className={clsx(styles.icon, magic && styles.magic)}>
          {magic ? <MagicBurst /> : null}
          {icon}
        </span>
        <span className={styles.line}>
          <span className={styles.fill} />
        </span>
      </span>
      <div className={styles.heading}>
        <Text as="span" size="sm" weight={700} tone="brand" className={styles.eyebrow} aria-hidden>
          Step {number}
        </Text>
        <Text as="h3" size="xl" weight={700}>
          {title}
        </Text>
      </div>
      <div className={styles.visual}>{children}</div>
      <Text tone="muted" className={styles.body}>
        {body}
      </Text>
    </li>
  );
}
