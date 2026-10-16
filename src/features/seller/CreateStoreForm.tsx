"use client";

import { Store as StoreIcon } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { z } from "zod";
import { Reveal } from "@/components/motion/Reveal";
import { Button, Segmented, Stack, Surface, Text, TextField } from "@/components/ui";
import { sanitizeSlugInput, slugify } from "@/domain/slug";
import { storeInputSchema, type Currency, type LabelLanguage } from "@/domain/store";
import { useSignedInUser } from "@/features/auth";
import { storeUrlLabel } from "@/lib/site";
import { createStore, RulesNotDeployedError, SlugTakenError } from "./data";
import { CURRENCY_OPTIONS, LABEL_LANGUAGE_OPTIONS, PHONE_PLACEHOLDER } from "./options";
import styles from "./CreateStoreForm.module.scss";

type FieldErrors = Partial<Record<"name" | "slug" | "whatsapp" | "line" | "form", string>>;

function toFieldErrors(error: z.ZodError): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.at(-1) as keyof FieldErrors | undefined;
    if (key && !errors[key]) errors[key] = issue.message;
  }
  return errors;
}

export function CreateStoreForm() {
  const user = useSignedInUser();
  const [name, setName] = useState("");
  const [customSlug, setCustomSlug] = useState<string | null>(null);
  const [currency, setCurrency] = useState<Currency>("USD");
  const [labelLanguage, setLabelLanguage] = useState<LabelLanguage>("en");
  const [whatsapp, setWhatsapp] = useState("");
  const [line, setLine] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, setPending] = useState(false);

  // The link follows the name until the seller edits it by hand.
  const slug = customSlug ?? slugify(name);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = storeInputSchema.safeParse({
      name,
      slug: slugify(slug),
      currency,
      labelLanguage,
      contact: { whatsapp: whatsapp.trim() || undefined, line: line.trim() || undefined },
    });
    if (!parsed.success) return setErrors(toFieldErrors(parsed.error));
    if (!parsed.data.contact.whatsapp && !parsed.data.contact.line) {
      return setErrors({ whatsapp: "Add WhatsApp or LINE so customers can order" });
    }

    setErrors({});
    setPending(true);
    try {
      // On success the live store query picks it up and the dashboard switches view.
      await createStore(user.uid, parsed.data);
    } catch (error) {
      if (error instanceof SlugTakenError) setErrors({ slug: error.message });
      else if (error instanceof RulesNotDeployedError) setErrors({ form: error.message });
      else setErrors({ form: "Couldn't create your store. Try again." });
      setPending(false);
    }
  }

  return (
    <Reveal className={styles.wrap}>
      <Surface padding="lg" radius="xl">
        <form onSubmit={handleSubmit} noValidate className={styles.form}>
          <Stack gap={3} align="center">
            <div className={styles.icon} aria-hidden>
              <StoreIcon />
            </div>
            <Text as="h1" size="2xl" align="center">
              Set up your shop
            </Text>
          </Stack>

          <TextField
            label="Shop name"
            placeholder="Kamal Stores"
            value={name}
            onChange={(event) => setName(event.target.value)}
            error={errors.name}
            autoComplete="organization"
            required
          />

          <TextField
            label="Link"
            prefix={storeUrlLabel("")}
            value={slug}
            onChange={(event) => setCustomSlug(sanitizeSlugInput(event.target.value))}
            error={errors.slug}
            hint={name && !slug ? "Type a link using English letters" : undefined}
            autoCapitalize="none"
            spellCheck={false}
          />

          <Segmented label="Currency" options={CURRENCY_OPTIONS} value={currency} onChange={setCurrency} />
          <Segmented label="Label language" options={LABEL_LANGUAGE_OPTIONS} value={labelLanguage} onChange={setLabelLanguage} />

          <TextField
            label="WhatsApp"
            type="tel"
            inputMode="tel"
            placeholder={PHONE_PLACEHOLDER[currency]}
            value={whatsapp}
            onChange={(event) => setWhatsapp(event.target.value)}
            error={errors.whatsapp}
            autoComplete="tel"
          />

          {currency === "THB" ? (
            <TextField
              label="LINE ID"
              placeholder="@kamalstores"
              value={line}
              onChange={(event) => setLine(event.target.value)}
              error={errors.line}
              autoCapitalize="none"
            />
          ) : null}

          {errors.form ? (
            <Text role="alert" size="sm" tone="danger" align="center">
              {errors.form}
            </Text>
          ) : null}

          <Button type="submit" size="lg" block loading={pending}>
            Create my store
          </Button>
        </form>
      </Surface>
    </Reveal>
  );
}
