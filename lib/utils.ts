// Unit conversion
export const KG_PER_LB = 0.45359237;
export const kgToLb = (kg: number) => kg / KG_PER_LB;
export const lbToKg = (lb: number) => lb * KG_PER_LB;
export const formatWeight = (kg: number, unit: "kg" | "lb") =>
  unit === "kg" ? `${kg.toFixed(1)} kg` : `${kgToLb(kg).toFixed(1)} lb`;

// Streaks — counts consecutive days (in the user's local timezone) with at
// least one logged entry, ending at today (or yesterday if today is empty).
export function calculateStreak(
  loggedDates: Date[],
  tz: string = "UTC"
): number {
  if (loggedDates.length === 0) return 0;

  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  // Build a set of YYYY-MM-DD strings in the user's local tz
  const loggedDays = new Set(loggedDates.map((d) => fmt.format(d)));
  const today = fmt.format(new Date());

  // Shift a YYYY-MM-DD string by N days (positive = future)
  const shiftDay = (s: string, n: number) => {
    const [y, m, d] = s.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d + n));
    return dt.toISOString().slice(0, 10);
  };

  let cursor = today;
  if (!loggedDays.has(cursor)) {
    const yesterday = shiftDay(cursor, -1);
    if (!loggedDays.has(yesterday)) return 0;
    cursor = yesterday;
  }

  let streak = 0;
  while (loggedDays.has(cursor)) {
    streak++;
    cursor = shiftDay(cursor, -1);
  }
  return streak;
}

// Class name helper
export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

// Meal type from time of day
export function defaultMealType(d: Date = new Date()): "breakfast" | "lunch" | "dinner" | "snack" {
  const h = d.getHours();
  if (h >= 4 && h < 11) return "breakfast";
  if (h >= 11 && h < 15) return "lunch";
  if (h >= 17 && h < 21) return "dinner";
  return "snack";
}

// Greeting from time of day
export function greetingFor(d: Date = new Date()): string {
  const h = d.getHours();
  if (h < 5) return "Resting well";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 22) return "Good evening";
  return "Winding down";
}