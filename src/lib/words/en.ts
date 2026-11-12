import type { PriceUnit } from "@/domain/product";
import type { ShopType } from "@/domain/shop";
import { quantityWithUnit } from "../format";

// Every word a customer reads on a storefront, and the order message the
// seller receives. The other languages must have the same entries (Words).
export const en = {
  // Product cards
  soldOut: "Sold out",
  ask: "Ask",
  // After the price: "$2 / kg".
  per: { kg: "kg", bunch: "bunch", pack: "pack" } as Record<Exclude<PriceUnit, "each">, string>,
  add: (name: string) => `Add ${name}`,
  fewer: (name: string) => `Less ${name}`,
  remove: (name: string) => `Remove ${name}`,
  chooseOptions: (name: string) => `Choose options for ${name}`,
  inYourOrder: (count: string) => `${count} in your order`,

  // The page
  language: "Language",
  all: "All",
  showMore: "More",
  showLess: "Less",
  sections: "Sections",
  categories: "Categories",
  // Products with no shelf or category.
  otherProducts: "More",
  search: "Search products",
  searchCount: (count: number) => `Search ${count} products`,
  clearSearch: "Clear search",
  nothingMatches: (query: string) => `Nothing matches “${query}”`,
  tryAnotherWord: "Try another word, or the name on the label.",
  empty: {
    shop: "Products coming soon",
    food: "Menu coming soon",
    grocery: "Shelves coming soon",
    fashion: "New collection coming soon",
    market: "Fresh stock coming soon",
    bakery: "Fresh bakes coming soon",
  } as Record<ShopType, string>,
  madeWith: "Made with Shelfie",

  // Opening hours
  open24: "Open 24 hours",
  openUntil: (time: string) => `Open · until ${time}`,
  closed: "Closed",
  // when: "07:00", "tomorrow 07:00" or "Mon 07:00".
  closedOpens: (when: string) => `Closed · opens ${when}`,
  tomorrow: "tomorrow",
  // Sunday first.
  weekdays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],

  // Sizes and colours
  size: "Size",
  colour: "Colour",
  sizeOf: (size: string) => `Size ${size}`,
  addToOrder: "Add to order",
  chooseSize: "Choose a size",
  chooseColour: "Choose a colour",

  // Order bar and cart
  order: "Order",
  orderOnLine: "Order on LINE",
  reviewOrder: (items: string) => `Review order: ${items}`,
  items: (count: number) => `${count} item${count === 1 ? "" : "s"}`,
  yourOrder: "Your order",
  close: "Close",
  total: "Total",
  each: (price: string) => `${price} each`,
  priceOnRequest: "Price on request",
  noteFor: (name: string) => `Note for ${name}`,
  // Shop types without notes have none.
  noteHint: {
    food: "Note, e.g. less spicy, no ice",
    fashion: "Note, e.g. gift wrap please",
    market: "Note, e.g. ripe ones please",
    bakery: "Note, e.g. Happy birthday Mia",
  } as Partial<Record<ShopType, string>>,
  clearAll: "Clear all",
  howDoYouWantIt: "How do you want it?",
  pickup: "Pickup",
  delivery: "Delivery",
  pickupOnly: "Pickup only",
  deliveryOnly: "Delivery only",
  deliveryAddress: "Delivery address or area",
  deliveryHint: "Optional · you can also send it in the chat",
  whenDoYouWantIt: "When do you want it?",
  asSoonAsPossible: "As soon as possible",
  whenYouOpen: "When you open",
  pickATime: "Pick a time",
  dayAndTime: "Day and time",
  payWith: (scheme: string) => `Pay with ${scheme}`,
  payHint: "Tap to save it. Pay once the shop confirms your order.",
  openPaymentCode: (scheme: string) => `Open the ${scheme} code full size`,

  // The WhatsApp / LINE message, written for the seller.
  message: {
    greeting: (shop: string) => `Hi ${shop}! I'd like to order:`,
    // "2", "2 kg", "3 packs".
    quantity: (quantity: number, unit: PriceUnit) => quantityWithUnit(quantity, unit),
    total: (total: string) => `Total: ${total}`,
    pickup: "I'll pick it up.",
    deliverTo: (where: string) => `Please deliver to: ${where}`,
    deliver: "Please deliver it. I'll send the address.",
    when: (when: string) => `When: ${when}`,
    asSoonAsPossible: "as soon as possible",
    whenYouOpen: "when you open",
    todayAt: (time: string) => `today at ${time}`,
    tomorrowAt: (time: string) => `tomorrow at ${time}`,
    // day: "Sat 15 Nov", from dateLocale.
    dayAt: (day: string, time: string) => `${day} at ${time}`,
    dateLocale: "en-GB",
  },
};

export type Words = typeof en;
