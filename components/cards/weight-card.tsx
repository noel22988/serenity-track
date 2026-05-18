"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { kgToLb } from "@/lib/utils";
import type { WeightEntry } from "@/lib/types";

export function WeightCard({
  entries,
  unit,
  forDate,
  weightsForDay,
}: {
  /** All recent entries (used for the sparkline + monthly delta on today's view). */
  entries: WeightEntry[];
  unit: "kg" | "lb";
  /** When set, the card switches to "viewing past day" mode. */
  forDate?: string;
  /** Entries logged on `forDate` in the user's tz (computed by parent). */
  weightsForDay?: WeightEntry[];
}) {
  const isPastView = !!forDate;
  const href = forDate ? `/log/weight?date=${forDate}` : "/log/weight";

  // Sparkline data — always built from the full recent history
  const sparklineData = [...entries]
    .reverse()
    .slice(-14)
    .map((d) => Number(d.weight_kg));

  if (isPastView) {
    const dayEntries = [...(weightsForDay ?? [])].sort(
      (a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime()
    );
    const dayLatest = dayEntries[0];

    return (
      <Link href={href} className="block">
        <Card>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-muted">Weight on this day</span>
            {dayEntries.length > 1 && (
              <span className="text-[11px] text-text-muted">
                {dayEntries.length} weigh-ins
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-1.5 mb-3">
            {dayLatest ? (
              <>
                <span className="text-4xl font-light numeric">
                  {unit === "kg"
                    ? Number(dayLatest.weight_kg).toFixed(1)
                    : kgToLb(Number(dayLatest.weight_kg)).toFixed(1)}
                </span>
                <span className="text-text-muted">{unit}</span>
              </>
            ) : (
              <span className="text-text-muted text-sm">
                Nothing logged this day — tap to add
              </span>
            )}
          </div>
          {sparklineData.length >= 2 && <Sparkline data={sparklineData} />}
        </Card>
      </Link>
    );
  }

  // --- Today (default) view ---
  const latest = entries[0];
  const monthAgo = entries.find((e) => {
    const d = new Date(e.logged_at);
    const ago = new Date();
    ago.setDate(ago.getDate() - 30);
    return d < ago;
  });
  const monthEarliest = entries[entries.length - 1];
  const compareTo = monthAgo ?? monthEarliest;
  const delta =
    latest && compareTo
      ? Number(latest.weight_kg) - Number(compareTo.weight_kg)
      : 0;
  const deltaDisplay = unit === "kg" ? delta : delta / 0.45359237;

  return (
    <Link href={href} className="block">
      <Card>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-text-muted">Current weight</span>
          {Math.abs(delta) > 0.05 && (
            <span className="text-[11px] text-primary bg-primary-soft px-2 py-0.5 rounded-sm numeric">
              {deltaDisplay > 0 ? "+" : ""}
              {deltaDisplay.toFixed(1)} {unit} this month
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-1.5 mb-3">
          {latest ? (
            <>
              <span className="text-4xl font-light numeric">
                {unit === "kg"
                  ? Number(latest.weight_kg).toFixed(1)
                  : kgToLb(Number(latest.weight_kg)).toFixed(1)}
              </span>
              <span className="text-text-muted">{unit}</span>
            </>
          ) : (
            <span className="text-text-muted text-sm">
              Not logged yet — tap to begin
            </span>
          )}
        </div>
        {sparklineData.length >= 2 && <Sparkline data={sparklineData} />}
      </Card>
    </Link>
  );
}

function Sparkline({ data }: { data: number[] }) {
  const W = 280;
  const H = 50;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * W;
      const y = H - ((v - min) / range) * (H - 8) - 4;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-12" aria-hidden="true">
      <polyline
        fill="none"
        stroke="var(--primary)"
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}