"use client";

import { ArrowLeft, Check, ImageOff, ImagePlus, TriangleAlert } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Reveal } from "@/components/motion/Reveal";
import { ThemeScope } from "@/components/theme/ThemeScope";
import {
  Badge,
  Button,
  ButtonLink,
  EmptyState,
  Segmented,
  Stack,
  Surface,
  Text,
  TextArea,
  TextField,
} from "@/components/ui";
import { sampleStorefront } from "@/domain/samples";
import {
  DEFAULT_RESTOCK,
  STORE_DESCRIPTION_MAX,
  storeInputSchema,
  storeSchema,
  type Currency,
  type LabelLanguage,
  type PublicStore,
  type RestockSettings,
  type Store,
} from "@/domain/store";
import { DEFAULT_THEME, type Theme } from "@/domain/theme";
import { useSignedInUser } from "@/features/auth";
import { saveStoreLogo, useObjectUrl } from "@/features/media";
import { StorefrontView } from "@/features/storefront";
import { PhonePreview, ThemePicker } from "@/features/theme";
import { initials } from "@/lib/format";
import { updateStore, useMyStore, useProducts, useRefreshStorefront } from "./data";
import { CURRENCY_OPTIONS, LABEL_LANGUAGE_OPTIONS, MISSING_PRODUCT_OPTIONS, PHONE_PLACEHOLDER } from "./options";
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
  description: string;
  whatsapp: string;
  line: string;
  currency: Currency;
  labelLanguage: LabelLanguage;
  theme: Theme;
  restock: RestockSettings;
};

// The logo is a file, so it's tracked apart from the text fields.
type Logo = { kind: "kept" } | { kind: "new"; blob: Blob } | { kind: "removed" };

function toForm(store: Store): Form {
  return {
    name: store.name,
    tagline: store.tagline ?? "",
    description: store.description ?? "",
    whatsapp: store.contact.whatsapp ?? "",
    line: store.contact.line ?? "",
    currency: store.currency,
    labelLanguage: store.labelLanguage,
    theme: store.theme ?? DEFAULT_THEME,
    restock: store.restock ?? DEFAULT_RESTOCK,
  };
}

const detailsSchema = storeInputSchema
  .pick({ name: true, tagline: true, currency: true, labelLanguage: true, contact: true })
  .extend({ description: storeSchema.shape.description });

type Errors = Partial<Record<"name" | "tagline" | "description" | "whatsapp" | "line" | "form", string>>;

function StoreEditor({ store }: { store: Store }) {
  const products = useProducts(store.slug);
  const refreshStorefront = useRefreshStorefront();
  const [saved, setSaved] = useState(() => toForm(store));
  const [form, setForm] = useState(saved);
  const [logo, setLogo] = useState<Logo>({ kind: "kept" });
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const newLogoUrl = useObjectUrl(logo.kind === "new" ? logo.blob : null);
  const logoUrl = logo.kind === "new" ? newLogoUrl : logo.kind === "kept" ? store.logoUrl : undefined;

  const dirty = logo.kind !== "kept" || JSON.stringify(form) !== JSON.stringify(saved);
  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setJustSaved(false);
  };
  const changeLogo = (next: Logo) => {
    setLogo(next);
    setJustSaved(false);
  };

  // Live preview: the real products (or samples until there are some).
  const previewStore: PublicStore = {
    slug: store.slug,
    name: form.name || store.name,
    tagline: form.tagline || undefined,
    description: form.description.trim() || undefined,
    logoUrl: logoUrl ?? undefined,
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
      description: form.description.trim() || undefined,
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
      const logoPatch =
        logo.kind === "new"
          ? { logoUrl: await saveStoreLogo(store.slug, logo.blob) }
          : logo.kind === "removed"
            ? { logoUrl: undefined } // removes it
            : {};
      // tagline/description are always sent: undefined removes them.
      await updateStore(store.slug, {
        ...parsed.data,
        tagline: parsed.data.tagline,
        description: parsed.data.description,
        theme: form.theme,
        restock: form.restock,
        ...logoPatch,
      });
      await refreshStorefront(store.slug);
      setSaved(form);
      setLogo({ kind: "kept" });
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
        <Reveal className={styles.profile}>
          <Section title="Profile">
            <div className={styles.logoRow}>
              <span className={styles.logo}>
                {logoUrl ? <Image src={logoUrl} alt="" fill sizes="88px" className={styles.logoImage} /> : initials(form.name || store.name)}
              </span>
              <Stack gap={2} align="start">
                <label className={styles.upload}>
                  <ImagePlus aria-hidden />
                  {logoUrl ? "Change logo" : "Add logo"}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) changeLogo({ kind: "new", blob: file });
                      event.target.value = "";
                    }}
                  />
                </label>
                {logoUrl ? (
                  <Button variant="ghost" size="sm" icon={<ImageOff />} onClick={() => changeLogo({ kind: "removed" })}>
                    Remove
                  </Button>
                ) : (
                  <Text size="xs" tone="subtle">
                    Optional · a shop photo works too
                  </Text>
                )}
              </Stack>
            </div>
            <TextField label="Shop name" value={form.name} onChange={(e) => set("name", e.target.value)} error={errors.name} />
            <TextField
              label="Tagline"
              placeholder="Fresh groceries in Phnom Penh"
              value={form.tagline}
              onChange={(e) => set("tagline", e.target.value)}
              error={errors.tagline}
            />
            <TextArea
              label="About your shop (optional)"
              placeholder={"Family shop since 1998.\nOpen 7am–9pm · Delivery around Toul Kork"}
              maxLength={STORE_DESCRIPTION_MAX}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              error={errors.description}
            />
          </Section>
        </Reveal>

        <Reveal delay={0.06} className={styles.look}>
          {/* Scoped to the chosen color so the picker itself previews it. */}
          <ThemeScope accent={form.theme.accent}>
            <Section title="Look">
              <ThemePicker value={form.theme} onChange={(theme) => set("theme", theme)} />
            </Section>
          </ThemeScope>
        </Reveal>

        <Reveal delay={0.1} className={styles.preview}>
          <PhonePreview className={styles.phone}>
            <StorefrontView store={previewStore} products={previewProducts} embedded />
          </PhonePreview>
          {usingSamples ? <Badge tone="sun">Sample products</Badge> : null}
        </Reveal>

        <Reveal delay={0.14} className={styles.details}>
          <Section title="Orders & labels">
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
          </Section>
        </Reveal>

        <Reveal delay={0.18} className={styles.restock}>
          <Section title="Restock">
            <Stack gap={2}>
              <Segmented
                label="Products missing from a re-filmed shelf"
                options={MISSING_PRODUCT_OPTIONS}
                value={form.restock.missing}
                onChange={(missing) => set("restock", { missing })}
              />
              <Text size="xs" tone="subtle">
                You can still change each one before saving.
              </Text>
            </Stack>
          </Section>
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

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Surface as="section" padding="lg" radius="xl">
      <Stack gap={5}>
        <Text as="h2" size="lg" weight={700}>
          {title}
        </Text>
        {children}
      </Stack>
    </Surface>
  );
}
