import { z } from "zod";

// One opening time for every day the shop opens, which is how most small
// shops work. A close time before the open time runs past midnight.

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export const openingHoursSchema = z.object({
  open: z.string().regex(TIME),
  close: z.string().regex(TIME),
  // 0 = Sunday … 6 = Saturday.
  closedDays: z.array(z.number().int().min(0).max(6)).max(7),
});

export type OpeningHours = z.infer<typeof openingHoursSchema>;

export const DEFAULT_HOURS: OpeningHours = { open: "08:00", close: "20:00", closedDays: [] };

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

// label is the English wording; the rest lets the storefront say it in
// another language: when it closes (open) or next opens (closed).
export type OpenState = {
  open: boolean;
  label: string;
  time?: string;
  // Closed: the day it opens next (0 = Sunday). Missing = later today.
  day?: "tomorrow" | number;
  allDay?: boolean;
};

const minutesOf = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));

// Weekday and minutes since midnight at `now`, in the shop's time zone.
export function shopClock(now: Date, timeZone?: string): { day: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return {
    day: WEEKDAYS.indexOf(part("weekday") as (typeof WEEKDAYS)[number]),
    minutes: Number(part("hour")) * 60 + Number(part("minute")),
  };
}

// "Open · until 21:00", "Closed · opens 07:00", "Closed · opens Mon 07:00".
export function openState(hours: OpeningHours, now: Date, timeZone?: string): OpenState {
  const { day, minutes } = shopClock(now, timeZone);
  const open = minutesOf(hours.open);
  const close = minutesOf(hours.close);
  const opensOn = (weekday: number) => !hours.closedDays.includes(weekday);
  const yesterday = (day + 6) % 7;

  if (open === close) {
    return opensOn(day) ? { open: true, label: "Open 24 hours", allDay: true } : nextOpening(hours, day, false);
  }
  const overnight = close < open;
  const isOpen = overnight
    ? (minutes >= open && opensOn(day)) || (minutes < close && opensOn(yesterday))
    : minutes >= open && minutes < close && opensOn(day);
  if (isOpen) return { open: true, label: `Open · until ${hours.close}`, time: hours.close };
  return nextOpening(hours, day, opensOn(day) && minutes < open);
}

function nextOpening(hours: OpeningHours, day: number, laterToday: boolean): OpenState {
  if (laterToday) return { open: false, label: `Closed · opens ${hours.open}`, time: hours.open };
  for (let ahead = 1; ahead <= 7; ahead++) {
    const weekday = (day + ahead) % 7;
    if (hours.closedDays.includes(weekday)) continue;
    const when = ahead === 1 ? "tomorrow" : WEEKDAYS[weekday];
    return { open: false, label: `Closed · opens ${when} ${hours.open}`, time: hours.open, day: ahead === 1 ? "tomorrow" : weekday };
  }
  return { open: false, label: "Closed" };
}
