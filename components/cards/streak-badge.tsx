import { Card } from "@/components/ui/card";

export function StreakBadge({ streak }: { streak: number }) {
  if (streak === 0) {
    return null;
  }
  const message =
    streak === 1
      ? "You showed up today"
      : `${streak} days of showing up`;
  return (
    <div className="bg-primary-soft text-text px-4 py-2.5 rounded-md text-sm flex items-center gap-2">
      <span className="text-base">🌿</span>
      <span>{message}</span>
    </div>
  );
}
