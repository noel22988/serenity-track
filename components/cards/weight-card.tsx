"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { formatWeight, kgToLb } from "@/lib/utils";
import type { WeightEntry } from "@/lib/types";

export function WeightCard({
  entries,
  unit,
}: {
  entries: WeightEntry[];
  unit: "kg" | "lb";
}) {
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
    latest && compareTo ? latest.weight_kg - compareTo.weight_kg : 0;
  const deltaDisplay = unit === "kg" ? delta : delta / 0.45359237;

  // Sparkline points
  const data = [...entries].reverse().slice(-14);

  return (
    <Link href="/log/weight" className="block">
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
                  ? latest.weight_kg.toFixed(1)
                  : kgToLb(latest.weight_kg).toFixed(1)}
              </span>
              <span className="text-text-muted">{unit}</span>
            </>
          ) : (
            <span className="text-text-muted text-sm">Not logged yet — tap to begin</span>
          )}
        </div>
        {data.length >= 2 && <Sparkline data={data.map((d) => d.weight_kg)} />}
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
