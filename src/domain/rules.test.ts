import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PRICE_UNITS } from "./product";
import { CURRENCIES, FULFILLMENT_OFFERS, LABEL_LANGUAGES, MISSING_PRODUCT_ACTIONS } from "./store";
import { TEMPLATES } from "./theme";

// firestore.rules / storage.rules are the access control, so a value the app
// can save but the rules don't list fails every save. Keep the lists in sync.

const firestoreRules = readFileSync(new URL("../../firestore.rules", import.meta.url), "utf8");
const storageRules = readFileSync(new URL("../../storage.rules", import.meta.url), "utf8");

// The quoted values in `<field> in [ ... ]`.
function listIn(rules: string, field: string): string[] {
  const escaped = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = rules.match(new RegExp(`${escaped} in \\[([^\\]]*)\\]`));
  if (!match) throw new Error(`No "${field} in [...]" in the rules`);
  return [...match[1].matchAll(/'([^']*)'/g)].map((value) => value[1]);
}

describe("firestore.rules matches src/domain", () => {
  it.each([
    ["data.currency", CURRENCIES],
    ["data.labelLanguage", LABEL_LANGUAGES],
    ["data.fulfillment", FULFILLMENT_OFFERS],
    ["data.restock.missing", MISSING_PRODUCT_ACTIONS],
    ["data.theme.template", TEMPLATES],
    // validUnit(data, field): product `unit` and store `priceUnit`.
    ["data[field]", PRICE_UNITS],
  ])("%s", (field, values) => {
    expect(listIn(firestoreRules, field)).toEqual([...values]);
  });
});

describe("storage.rules", () => {
  it("lets sellers upload to every photo folder, payment QR included", () => {
    expect(listIn(storageRules, "folder")).toEqual(["products", "logo", "payment"]);
  });
});
