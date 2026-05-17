// Unit conversion
export const KG_PER_LB = 0.45359237;
export const kgToLb = (kg: number) => kg / KG_PER_LB;
export const lbToKg = (lb: number) => lb * KG_PER_LB;
export const formatWeight = (kg: number, unit: "kg" | "lb") =>
  unit === "kg" ? `${kg.toFixed(1)} kg` : `${kgToLb(kg).toFixed(1)} lb`;

// Streaks
export function calculateStreak(loggedDates: Date[]): number {
  if (loggedDates.length === 0) return 0;
  const startOfDay = (d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };
  const subDays = (d: Date, n: number) => {
    const x = new Date(d);
    x.setDate(x.getDate() - n);
    return x;
  };
  const days = new Set(loggedDates.map((d) => startOfDay(d).getTime()));
  let streak = 0;
  let cursor = startOfDay(new Date());
  if (!days.has(cursor.getTime())) {
    const y = subDays(cursor, 1);
    if (!days.has(y.getTime())) return 0;
    cursor = y;
  }
  while (days.has(cursor.getTime())) {
    streak++;
    cursor = subDays(cursor, 1);
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
