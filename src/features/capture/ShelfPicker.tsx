"use client";

import clsx from "clsx";
import { useId } from "react";
import { Segmented, TextField, type SegmentedOption } from "@/components/ui";
import { SHELF_NAME_MAX, type Product } from "@/domain/product";
import { productsOnShelf, shelvesOf, UNSORTED } from "@/domain/shelf";
import styles from "./ShelfPicker.module.scss";

// What the next video is for:
// - add:     products for a shelf, new or existing (nothing gets marked sold out)
// - restock: re-film one existing shelf; its products missing from the video
//            are suggested as sold out
export type CaptureTarget = { mode: "add" | "restock"; shelf: string };

const MODE_OPTIONS: readonly SegmentedOption<CaptureTarget["mode"]>[] = [
  { value: "add", label: "New products" },
  { value: "restock", label: "Restock" },
];

export function ShelfPicker({
  products,
  target,
  onChange,
}: {
  products: readonly Product[];
  target: CaptureTarget;
  onChange: (target: CaptureTarget) => void;
}) {
  const listId = useId();
  const shelves = shelvesOf(products);
  const restockable = restockableShelves(products);

  return (
    <div className={styles.picker}>
      {products.length > 0 ? (
        <Segmented
          label="What are you filming?"
          options={MODE_OPTIONS}
          value={target.mode}
          onChange={(mode) => onChange({ mode, shelf: mode === "restock" ? restockable[0] : UNSORTED })}
        />
      ) : null}

      {target.mode === "add" ? (
        <>
          <TextField
            label="Shelf"
            placeholder="e.g. Drinks"
            hint="Optional · groups products in your store"
            maxLength={SHELF_NAME_MAX}
            value={target.shelf}
            onChange={(event) => onChange({ mode: "add", shelf: event.target.value })}
            list={shelves.length > 0 ? listId : undefined}
          />
          {shelves.length > 0 ? (
            <datalist id={listId}>
              {shelves.map((shelf) => (
                <option key={shelf} value={shelf} />
              ))}
            </datalist>
          ) : null}
        </>
      ) : (
        <div className={styles.field}>
          <span id={`${listId}-label`} className={styles.label}>
            Which shelf?
          </span>
          <div role="radiogroup" aria-labelledby={`${listId}-label`} className={styles.chips}>
            {restockable.map((shelf) => {
              const selected = shelf === target.shelf;
              return (
                <button
                  key={shelf || "unsorted"}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={clsx(styles.chip, selected && styles.selected)}
                  onClick={() => onChange({ mode: "restock", shelf })}
                >
                  {shelf || "Unsorted"}
                  <span className={styles.count}>{productsOnShelf(products, shelf).length}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Named shelves first, then the products that have none.
function restockableShelves(products: readonly Product[]): string[] {
  const shelves = shelvesOf(products);
  return products.some((product) => !product.shelf?.trim()) ? [...shelves, UNSORTED] : shelves;
}
