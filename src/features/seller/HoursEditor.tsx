"use client";

import clsx from "clsx";
import { Switch, Text, TextField } from "@/components/ui";
import { DEFAULT_HOURS, WEEKDAYS, type OpeningHours } from "@/domain/hours";
import styles from "./HoursEditor.module.scss";

// Monday first, as shops write their hours.
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

// Off = no hours shown. On = one open and close time, plus days off.
export function HoursEditor({
  value,
  onChange,
}: {
  value: OpeningHours | null;
  onChange: (hours: OpeningHours | null) => void;
}) {
  function toggleDay(day: number) {
    if (!value) return;
    const closed = value.closedDays.includes(day)
      ? value.closedDays.filter((item) => item !== day)
      : [...value.closedDays, day].sort();
    onChange({ ...value, closedDays: closed });
  }

  return (
    <div className={styles.editor}>
      <Switch
        checked={value !== null}
        onChange={(on) => onChange(on ? DEFAULT_HOURS : null)}
        label="Show opening hours"
        showLabel
      />
      {value ? (
        <>
          <div className={styles.times}>
            <TextField
              label="Opens"
              type="time"
              value={value.open}
              onChange={(event) => event.target.value && onChange({ ...value, open: event.target.value })}
            />
            <TextField
              label="Closes"
              type="time"
              value={value.close}
              onChange={(event) => event.target.value && onChange({ ...value, close: event.target.value })}
            />
          </div>
          <div className={styles.days} role="group" aria-label="Open on">
            {WEEK_ORDER.map((day) => {
              const open = !value.closedDays.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  aria-pressed={open}
                  className={clsx(styles.day, open && styles.open)}
                  onClick={() => toggleDay(day)}
                >
                  {WEEKDAYS[day]}
                </button>
              );
            })}
          </div>
          <Text size="xs" tone="subtle">
            Tap a day to mark it closed. A close time before the open time runs past midnight.
          </Text>
        </>
      ) : null}
    </div>
  );
}
