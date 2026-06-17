"use client";

import Link from "next/link";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { kgToLb } from "@/lib/utils";
import type { WeightEntry } from "@/lib/types";

type SparkPoint = { value: number; date: Date };

export function WeightCard({
  entries,
  unit,
  forDate,
  weightsForDay,
  startingWeightKg,
}: {
  entries: WeightEntry[];
  unit: "kg" | "lb";
  forDate?: string;
  weightsForDay?: WeightEntry[];
  startingWeightKg?: number | null;
}) {
  const isPastView = !!forDate;
  const href = forDate ? `/log/weight?date=${forDate}` : "/log/weight";

  const sparkPoints: SparkPoint[] = [...entries]
    .reverse()
    .slice(-14)
    .map((d) => ({
      value: unit === "kg" ? Number(d.weight_kg) : kgToLb(Number(d.weight_kg)),
      date: new Date(d.logged_at),
    }));

  if (isPastView) {
    const dayEntries = [...(weightsForDay ?? [])].sort(
      (a, b) =>
        new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime()
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
          {sparkPoints.length >= 2 && (
            <Sparkline points={sparkPoints} unit={unit} />
          )}
        </Card>
      </Link>
    );
  }

  // Today (default) view
  const latest = entries[0];
  // Prefer profile.starting_weight_kg; fall back to the oldest weight on file
  const startKg =
    startingWeightKg ??
    (entries.length > 0
      ? Number(entries[entries.length - 1].weight_kg)
      : null);
  const delta =
    latest && startKg !== null ? Number(latest.weight_kg) - startKg : 0;
  const deltaDisplay = unit === "kg" ? delta : delta / 0.45359237;

  return (
    <Link href={href} className="block">
      <Card>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-text-muted">Current weight</span>
          {Math.abs(delta) > 0.05 && (
            <span className="text-[11px] text-primary bg-primary-soft px-2 py-0.5 rounded-sm numeric">
              {deltaDisplay > 0 ? "+" : ""}
              {deltaDisplay.toFixed(1)} {unit} since start
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
        {sparkPoints.length >= 2 && (
          <Sparkline points={sparkPoints} unit={unit} />
        )}
      </Card>
    </Link>
  );
}

function Sparkline({
  points,
  unit,
}: {
  points: SparkPoint[];
  unit: "kg" | "lb";
}) {
  const W = 300;
  const H = 90;
  const padL = 28;
  const padR = 6;
  const padT = 8;
  const padB = 18;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const xy = points.map((p, i) => {
    const x = padL + (i / (points.length - 1)) * chartW;
    const y = padT + chartH - ((p.value - min) / range) * chartH;
    return { x, y, ...p };
  });

  const pathPoints = xy.map((p) => `${p.x},${p.y}`).join(" ");

  const firstDate = format(points[0].date, "MMM d");
  const lastDate = format(points[points.length - 1].date, "MMM d");

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      aria-label="Weight trend"
    >
      <line
        x1={padL}
        y1={padT + chartH}
        x2={W - padR}
        y2={padT + chartH}
        stroke="var(--border)"
        strokeWidth={0.5}
      />
      <text
        x={padL - 4}
        y={padT + 4}
        textAnchor="end"
        fontSize="9"
        fill="var(--text-muted)"
        className="numeric"
      >
        {max.toFixed(1)}
      </text>
      <text
        x={padL - 4}
        y={padT + chartH + 3}
        textAnchor="end"
        fontSize="9"
        fill="var(--text-muted)"
        className="numeric"
      >
        {min.toFixed(1)}
      </text>
      <text
        x={padL - 4}
        y={padT + chartH / 2 + 3}
        textAnchor="end"
        fontSize="8"
        fill="var(--text-muted)"
        opacity={0.6}
      >
        {unit}
      </text>
      <text
        x={padL}
        y={H - 4}
        textAnchor="start"
        fontSize="9"
        fill="var(--text-muted)"
      >
        {firstDate}
      </text>
      <text
        x={W - padR}
        y={H - 4}
        textAnchor="end"
        fontSize="9"
        fill="var(--text-muted)"
      >
        {lastDate}
      </text>
      <polyline
        fill="none"
        stroke="var(--primary)"
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        points={pathPoints}
      />
      {xy.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={1.8} fill="var(--primary)" />
      ))}
    </svg>
  );
}
