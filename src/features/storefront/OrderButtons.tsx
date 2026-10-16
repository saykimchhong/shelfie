import clsx from "clsx";
import { MessageCircle } from "lucide-react";
import { ButtonLink } from "@/components/ui";
import type { OrderSummary } from "./order";
import styles from "./OrderButtons.module.scss";

// WhatsApp / LINE in their own brand colors: recognisable without extra words.
export function OrderButtons({ summary, block }: { summary: OrderSummary; block?: boolean }) {
  return (
    <div className={clsx(styles.buttons, block && styles.block)}>
      {summary.lineHref ? (
        <ButtonLink
          href={summary.lineHref}
          target="_blank"
          rel="noreferrer"
          className={styles.line}
          aria-label="Order on LINE"
        >
          LINE
        </ButtonLink>
      ) : null}
      {summary.whatsappHref ? (
        <ButtonLink
          href={summary.whatsappHref}
          target="_blank"
          rel="noreferrer"
          icon={<MessageCircle />}
          className={styles.whatsapp}
        >
          Order
        </ButtonLink>
      ) : null}
    </div>
  );
}
