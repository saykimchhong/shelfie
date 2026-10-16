"use client";

import { ImageOff, ImagePlus, Sparkles, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button, Sheet, Spinner, Switch, TextField, Thumb } from "@/components/ui";
import type { Product, ProductInput } from "@/domain/product";
import type { Store } from "@/domain/store";
import { generateProductPhoto, saveProductImage, urlToBlob, useObjectUrl } from "@/features/media";
import { addProducts, deleteProduct, updateProduct, useRefreshStorefront } from "./data";
import styles from "./ProductEditor.module.scss";

// `product === null` → adding a new product by hand.
export function ProductEditor({
  open,
  onClose,
  store,
  product,
}: {
  open: boolean;
  onClose: () => void;
  store: Store;
  product: Product | null;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={product ? "Edit product" : "Add product"}>
      {/* Keyed so the form resets for each product. */}
      <EditorForm key={product?.id ?? "new"} store={store} product={product} onDone={onClose} />
    </Sheet>
  );
}

type PhotoState =
  | { kind: "kept" } // unchanged: whatever product.imageUrl is
  | { kind: "new"; blob: Blob }
  | { kind: "removed" };

function EditorForm({ store, product, onDone }: { store: Store; product: Product | null; onDone: () => void }) {
  const refreshStorefront = useRefreshStorefront();
  const [name, setName] = useState(product?.name ?? "");
  const [localName, setLocalName] = useState(product?.localName ?? "");
  const [price, setPrice] = useState(product?.price != null ? String(product.price) : "");
  const [category, setCategory] = useState(product?.category ?? "");
  const [inStock, setInStock] = useState(product?.inStock ?? true);
  const [photo, setPhoto] = useState<PhotoState>({ kind: "kept" });
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const newPhotoUrl = useObjectUrl(photo.kind === "new" ? photo.blob : null);
  const photoUrl = photo.kind === "new" ? newPhotoUrl : photo.kind === "kept" ? product?.imageUrl : undefined;

  async function makeAiPhoto() {
    setGenerating(true);
    try {
      const frame = photo.kind === "new" ? photo.blob : photoUrl ? await urlToBlob(photoUrl) : null;
      setPhoto({ kind: "new", blob: await generateProductPhoto({ name: name || "Product", frame }) });
    } finally {
      setGenerating(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return setError("Give it a name");

    const amount = price.trim() === "" ? null : Number(price.replace(/[^0-9.]/g, ""));
    if (amount !== null && !Number.isFinite(amount)) return setError("Price should be a number");

    setSaving(true);
    setError(null);
    try {
      const fields: ProductInput = {
        name: name.trim(),
        localName: localName.trim() || undefined,
        price: amount,
        category: category.trim() || undefined,
        inStock,
      };
      const imageUrl =
        photo.kind === "new" ? await saveProductImage(store.slug, photo.blob) : photo.kind === "removed" ? undefined : null;

      if (product) {
        // imageUrl: null = leave as is; undefined = remove; string = replace.
        await updateProduct(store.slug, product.id, imageUrl === null ? fields : { ...fields, imageUrl });
      } else {
        await addProducts(store.slug, [{ ...fields, imageUrl: imageUrl ?? undefined }], Date.now());
      }
      await refreshStorefront(store.slug);
      onDone();
    } catch (cause) {
      console.error(cause);
      setError("Couldn't save. Try again.");
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!product) return;
    if (!confirmDelete) return setConfirmDelete(true);
    setSaving(true);
    await deleteProduct(store.slug, product.id);
    await refreshStorefront(store.slug);
    onDone();
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={styles.photoRow}>
        <div className={styles.photo}>
          <Thumb label={name || "?"} src={photoUrl ?? undefined} size={120} />
          {generating ? (
            <span className={styles.busy}>
              <Spinner size={24} label="Making photo" />
            </span>
          ) : null}
        </div>
        <div className={styles.photoActions}>
          <label className={styles.upload}>
            <ImagePlus aria-hidden />
            {photoUrl ? "Replace" : "Upload"}
            <input
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) setPhoto({ kind: "new", blob: file });
                event.target.value = "";
              }}
            />
          </label>
          <Button variant="soft" size="sm" icon={<Sparkles />} onClick={makeAiPhoto} disabled={generating}>
            AI photo
          </Button>
          {photoUrl ? (
            <Button variant="ghost" size="sm" icon={<ImageOff />} onClick={() => setPhoto({ kind: "removed" })}>
              Remove
            </Button>
          ) : null}
        </div>
      </div>

      <TextField label="Name" value={name} onChange={(event) => setName(event.target.value)} required />
      <TextField
        label="Label name"
        hint="As printed on the pack, in any script"
        value={localName}
        onChange={(event) => setLocalName(event.target.value)}
      />
      <div className={styles.pair}>
        <TextField
          label="Price"
          prefix={store.currency}
          inputMode="decimal"
          placeholder="Ask"
          value={price}
          onChange={(event) => setPrice(event.target.value)}
        />
        <TextField label="Category" value={category} onChange={(event) => setCategory(event.target.value)} />
      </div>
      <Switch checked={inStock} onChange={setInStock} label="In stock" showLabel />

      {error ? (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      ) : null}

      <div className={styles.actions}>
        {product ? (
          <Button variant="danger" icon={<Trash2 />} onClick={handleDelete} disabled={saving}>
            {confirmDelete ? "Sure?" : "Delete"}
          </Button>
        ) : null}
        <Button type="submit" size="lg" className={styles.save} loading={saving} disabled={generating}>
          {product ? "Save" : "Add"}
        </Button>
      </div>
    </form>
  );
}
