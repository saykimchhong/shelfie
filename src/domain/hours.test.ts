import { describe, expect, it } from "vitest";
import { openState, shopClock, type OpeningHours } from "./hours";

const daily: OpeningHours = { open: "07:00", close: "21:00", closedDays: [] };
// Wednesday 12 Nov 2025 in Bangkok (UTC+7) at the given local time.
const bangkok = (time: string, date = "2025-11-12") => new Date(`${date}T${time}:00+07:00`);
const at = (hours: OpeningHours, time: string, date?: string) => openState(hours, bangkok(time, date), "Asia/Bangkok");

describe("shopClock", () => {
  it("reads the weekday and time in the shop's time zone, not the viewer's", () => {
    expect(shopClock(new Date("2025-11-12T18:30:00Z"), "Asia/Bangkok")).toEqual({ day: 4, minutes: 90 });
  });
});

describe("openState", () => {
  it("is open between the times, until close", () => {
    expect(at(daily, "12:00")).toEqual({ open: true, label: "Open · until 21:00" });
    expect(at(daily, "21:00")).toEqual({ open: false, label: "Closed · opens tomorrow 07:00" });
  });

  it("says when it opens later today", () => {
    expect(at(daily, "06:15")).toEqual({ open: false, label: "Closed · opens 07:00" });
  });

  it("skips closed days", () => {
    const closedThursFri = { ...daily, closedDays: [4, 5] };
    expect(at(closedThursFri, "22:00")).toEqual({ open: false, label: "Closed · opens Sat 07:00" });
    expect(at({ ...daily, closedDays: [3] }, "12:00").open).toBe(false);
  });

  it("runs past midnight when it closes before it opens", () => {
    const nightMarket = { open: "18:00", close: "02:00", closedDays: [] };
    expect(at(nightMarket, "23:30")).toEqual({ open: true, label: "Open · until 02:00" });
    expect(at(nightMarket, "01:30")).toEqual({ open: true, label: "Open · until 02:00" });
    expect(at(nightMarket, "03:00")).toEqual({ open: false, label: "Closed · opens 18:00" });
  });

  it("keeps the night open after a closed day only if that night started on an open day", () => {
    const closedTuesdays = { open: "18:00", close: "02:00", closedDays: [2] };
    // Wednesday 01:30 is the tail of Tuesday night, which was closed.
    expect(at(closedTuesdays, "01:30").open).toBe(false);
  });

  it("handles always-open and never-open shops", () => {
    expect(at({ open: "00:00", close: "00:00", closedDays: [] }, "03:00")).toEqual({ open: true, label: "Open 24 hours" });
    expect(at({ ...daily, closedDays: [0, 1, 2, 3, 4, 5, 6] }, "12:00")).toEqual({ open: false, label: "Closed" });
  });
});
