import { describe, expect, it } from "vitest";
import { LABEL_LANGUAGES } from "@/domain/store";
import { isLanguage, LANGUAGE_LABELS, wordsFor, type Words } from "./index";

// Every string a word list can produce, with sample arguments.
function allStrings(value: unknown, path = ""): [string, string][] {
  if (typeof value === "string") return [[path, value]];
  if (typeof value === "function") {
    const made: unknown = (value as (...args: unknown[]) => unknown)("Mango", "12:30");
    return typeof made === "string" ? [[path, made]] : [];
  }
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, child]) => allStrings(child, path ? `${path}.${key}` : key));
  }
  return [];
}

const SCRIPTS = {
  km: /[ក-៿]/,
  si: /[඀-෿]/,
  ta: /[஀-௿]/,
  th: /[฀-๿]/,
} as const;

describe("word lists", () => {
  const english = allStrings(wordsFor("en"));

  it.each(LABEL_LANGUAGES)("%s has every entry, none of them empty", (language) => {
    const strings = allStrings(wordsFor(language));
    expect(strings.map(([path]) => path)).toEqual(english.map(([path]) => path));
    expect(strings.filter(([, text]) => !text.trim())).toEqual([]);
  });

  it.each(Object.entries(SCRIPTS))("%s is written in its own script", (language, script) => {
    const leftInEnglish = allStrings(wordsFor(language as keyof typeof SCRIPTS))
      .filter(([path, text]) => !script.test(text) && path !== "message.dateLocale")
      // A bare count or time has no words to translate.
      .filter(([, text]) => /[a-z]{3,}/i.test(text.replace(/Mango|Shelfie|LINE/g, "")));
    expect(leftInEnglish).toEqual([]);
  });

  it("puts the names it is given into the sentence", () => {
    for (const language of LABEL_LANGUAGES) {
      const words: Words = wordsFor(language);
      expect(words.add("Mango")).toContain("Mango");
      expect(words.payWith("PromptPay")).toContain("PromptPay");
      expect(words.closedOpens("07:00")).toContain("07:00");
      expect(words.message.greeting("Kamal Stores")).toContain("Kamal Stores");
      expect(words.message.deliverTo("Colombo 3")).toContain("Colombo 3");
      expect(words.message.quantity(1.5, "kg")).toMatch(/^1\.5 \S/);
      expect(words.message.quantity(2, "each")).toBe("2");
      expect(words.weekdays).toHaveLength(7);
    }
  });

  it("counts items in English with a plural", () => {
    expect(wordsFor("en").items(1)).toBe("1 item");
    expect(wordsFor("en").items(3)).toBe("3 items");
  });
});

describe("languages", () => {
  it("names each language in itself", () => {
    expect(Object.keys(LANGUAGE_LABELS).sort()).toEqual([...LABEL_LANGUAGES].sort());
    expect(LANGUAGE_LABELS.th).toBe("ไทย");
  });

  it("only accepts languages we have", () => {
    expect(isLanguage("km")).toBe(true);
    expect(isLanguage("fr")).toBe(false);
    expect(isLanguage(null)).toBe(false);
  });
});
