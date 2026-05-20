import type { FoodLog } from "./types";

/**
 * TCM meal window guidance — hours expressed as floats
 * (e.g. 13.5 = 1:30 pm).  Snack intentionally has no window.
 */
export const MEAL_WINDOWS: Record<
  FoodLog["meal_type"],
  { startHour: number; endHour: number; label: string } | null
> = {
  breakfast: { startHour: 6, endHour: 9, label: "6 – 9 am" },
  lunch: { startHour: 11, endHour: 13.5, label: "11 am – 1:30 pm" },
  dinner: { startHour: 16, endHour: 19, label: "4 – 7 pm" },
  snack: null,
};

/**
 * Whether `date` falls within `meal`'s TCM window. Uses the runtime's local
 * timezone — on the client that's the user's tz, which is what we want.
 * Always returns true for snack (no window).
 */
export function isInMealWindow(
  date: Date,
  meal: FoodLog["meal_type"]
): boolean {
  const w = MEAL_WINDOWS[meal];
  if (!w) return true;
  const hour = date.getHours() + date.getMinutes() / 60;
  return hour >= w.startHour && hour <= w.endHour;
}