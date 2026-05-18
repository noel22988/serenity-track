/**
 * Timezone utilities — compute calendar dates and UTC day-boundaries
 * for any IANA timezone, using only built-in Intl (no extra deps).
 */

/** Returns YYYY-MM-DD for the given Date in the given IANA timezone. */
export function dateStringInTz(date: Date, tz: string): string {
  try {
    // en-CA conveniently formats as YYYY-MM-DD
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch {
    // Invalid tz — fall back to UTC
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  }
}

/**
 * Given a YYYY-MM-DD string interpreted as a calendar day in `tz`,
 * return the UTC Date instants representing the start (00:00:00.000)
 * and end (23:59:59.999) of that day.
 */
export function dayBoundsInTz(
  dateStr: string,
  tz: string
): { start: Date; end: Date } {
  const [yearStr, monthStr, dayStr] = dateStr.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;
  const day = parseInt(dayStr, 10);

  // Guess: UTC midnight of that calendar day
  const guessUtcMs = Date.UTC(year, month, day, 0, 0, 0);

  // What "wall time" does that UTC instant look like inside `tz`?
  let offsetMs = 0;
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).formatToParts(new Date(guessUtcMs));

    const map: Record<string, string> = {};
    for (const p of parts) {
      if (p.type !== "literal") map[p.type] = p.value;
    }

    const tzAsUtcMs = Date.UTC(
      parseInt(map.year, 10),
      parseInt(map.month, 10) - 1,
      parseInt(map.day, 10),
      parseInt(map.hour === "24" ? "0" : map.hour, 10),
      parseInt(map.minute, 10),
      parseInt(map.second, 10)
    );

    offsetMs = tzAsUtcMs - guessUtcMs;
  } catch {
    offsetMs = 0;
  }

  const startMs = guessUtcMs - offsetMs;
  const endMs = startMs + 86_400_000 - 1;
  return { start: new Date(startMs), end: new Date(endMs) };
}