"use client";

import { ArrowLeft, Check, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Reveal } from "@/components/motion/Reveal";
import { ThemeScope } from "@/components/theme/ThemeScope";
import { Badge, Button, ButtonLink, EmptyState, Segmented, Stack, Surface, Text, TextField } from "@/components/ui";
import { sampleStorefront } from "@/domain/samples";
import { storeInputSchema, type Currency, type LabelLanguage, type PublicStore, type Store } from "@/domain/store";
import { DEFAULT_THEME, type Theme } from "@/domain/theme";
import { useSignedInUser } from "@/features/auth";
import { StorefrontView } from "@/features/storefront";
import { PhonePreview, ThemePicker } from "@/features/theme";
import { updateStore, useMyStore, useProducts, useRefreshStorefront } from "./data";
import { CURRENCY_OPTIONS, LABEL_LANGUAGE_OPTIONS, PHONE_PLACEHOLDER } from "./options";
import { DashboardSkeleton } from "./SellerHome";
import styles from "./StoreEditor.module.scss";

export function StoreEditorPage() {
  const user = useSignedInUser();
  const store = useMyStore(user.uid);
  const router = useRouter();

  useEffect(() => {
    if (store.status === "ready" && !store.data) router.replace("/dashboard");
  }, [store.status, store.data, router]);

  if (store.status === "error") {
    return <EmptyState tone="berry" icon={<TriangleAlert />} title="Couldn't load your store" description={store.error?.message} />;
  }
  if (!store.data) return <DashboardSkeleton />;
  return <StoreEditor key={store.data.slug} store={store.data} />;
}

type Form = {
  name: string;
  tagline: string;
  whatsapp: string;
  line: string;
  currency: Currency;
  labelLanguage: LabelLanguage;
  theme: Theme;
};

function toForm(store: Store): Form {
  return {
    name: store.name,
    tagline: store.tagline ?? "",
    whatsapp: store.contact.whatsapp ?? "",
    line: store.contact.line ?? "",
    currency: store.currency,
    labelLanguage: store.labelLanguage,
    theme: store.theme ?? DEFAULT_THEME,
  };
}

const detailsSchema = storeInputSchema.pick({
  name: true,
  tagline: true,
  currency: true,
  labelLanguage: true,
  contact: true,
});

type Errors = Partial<Record<"name" | "tagline" | "whatsapp" | "line" | "form", string>>;

function StoreEditor({ store }: { store: Store }) {
  const products = useProducts(store.slug);
  const refreshStorefront = useRefreshStorefront();
  const [saved, setSaved] = useState(() => toForm(store));
  const [form, setForm] = useState(saved);
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const dirty = JSON.stringify(form) !== JSON.stringify(saved);
  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setJustSaved(false);
  };

  // Live preview: the real products (or samples until there are some).
  const previewStore: PublicStore = {
    slug: store.slug,
    name: form.name || store.name,
    tagline: form.tagline || undefined,
    currency: form.currency,
    labelLanguage: form.labelLanguage,
    contact: { whatsapp: form.whatsapp || undefined, line: form.line || undefined },
    theme: form.theme,
    published: store.published,
    createdAt: store.createdAt,
    updatedAt: store.updatedAt,
  };
  const usingSamples = products.status === "ready" && products.data.length === 0;
  const previewProducts = usingSamples ? sampleStorefront(form.labelLanguage).products : products.data;

  async function save() {
    const parsed = detailsSchema.safeParse({
      name: form.name,
      tagline: form.tagline.trim() || undefined,
      currency: form.currency,
      labelLanguage: form.labelLanguage,
      contact: { whatsapp: form.whatsapp.trim() || undefined, line: form.line.trim() || undefined },
    });
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.at(-1) as keyof Errors;
        next[key] ??= issue.message;
      }
      return setErrors(next);
    }
    if (!parsed.data.contact.whatsapp && !parsed.data.contact.line) {
      return setErrors({ whatsapp: "Add WhatsApp or LINE so customers can order" });
    }

    setErrors({});
    setSaving(true);
    try {
      // tagline is always sent: undefined removes it.
      await updateStore(store.slug, { ...parsed.data, tagline: parsed.data.tagline, theme: form.theme });
      await refreshStorefront(store.slug);
      setSaved(form);
      setJustSaved(true);
    } catch (cause) {
      console.error(cause);
      setErrors({ form: "Couldn't save. Try again." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.page}>
      <Stack direction="row" align="center" gap={2}>
        <ButtonLink href="/dashboard" variant="ghost" size="sm" iconOnly icon={<ArrowLeft />} aria-label="Back" />
        <Text as="h1" size="2xl">
          Edit store
        </Text>
      </Stack>

      <div className={styles.layout}>
        <Reveal className={styles.look}>
          {/* Scoped to the chosen color so the picker itself previews it. */}
          <ThemeScope accent={form.theme.accent}>
            <Surface padding="lg" radius="xl">
              <ThemePicker value={form.theme} onChange={(theme) => set("theme", theme)} />
            </Surface>
          </ThemeScope>
        </Reveal>

        <Reveal delay={0.06} className={styles.preview}>
          <PhonePreview className={styles.phone}>
            <StorefrontView store={previewStore} products={previewProducts} embedded />
          </PhonePreview>
          {usingSamples ? <Badge tone="sun">Sample products</Badge> : null}
        </Reveal>

        <Reveal delay={0.12} className={styles.details}>
          <Surface padding="lg" radius="xl">
            <Stack gap={5}>
              <TextField label="Shop name" value={form.name} onChange={(e) => set("name", e.target.value)} error={errors.name} />
              <TextField
                label="Tagline"
                placeholder="Fresh groceries in Phnom Penh"
                value={form.tagline}
                onChange={(e) => set("tagline", e.target.value)}
                error={errors.tagline}
              />
              <Segmented label="Currency" options={CURRENCY_OPTIONS} value={form.currency} onChange={(v) => set("currency", v)} />
              <Segmented
                label="Label language"
                options={LABEL_LANGUAGE_OPTIONS}
                value={form.labelLanguage}
                onChange={(v) => set("labelLanguage", v)}
              />
              <TextField
                label="WhatsApp"
                type="tel"
                inputMode="tel"
                placeholder={PHONE_PLACEHOLDER[form.currency]}
                value={form.whatsapp}
                onChange={(e) => set("whatsapp", e.target.value)}
                error={errors.whatsapp}
              />
              <TextField
                label="LINE ID"
                placeholder="@yourshop"
                value={form.line}
                onChange={(e) => set("line", e.target.value)}
                error={errors.line}
                autoCapitalize="none"
              />
            </Stack>
          </Surface>
        </Reveal>
      </div>

      <div className={styles.saveBar}>
        {errors.form ? (
          <Text size="sm" tone="danger" role="alert">
            {errors.form}
          </Text>
        ) : justSaved ? (
          <Badge tone="success" icon={<Check />}>
            Saved
          </Badge>
        ) : (
          <span />
        )}
        <Button size="lg" onClick={save} loading={saving} disabled={!dirty}>
          Save changes
        </Button>
      </div>
    </div>
  );
}
