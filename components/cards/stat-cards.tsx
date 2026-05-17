"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import type { FoodLog, ExerciseLog } from "@/lib/types";

const MEAL_LABELS: Record<FoodLog["meal_type"], string> = {
  breakfast: "B",
  lunch: "L",
  dinner: "D",
  snack: "S",
};

export function NourishmentCard({ logs }: { logs: FoodLog[] }) {
  const total = Math.round(logs.reduce((s, l) => s + Number(l.calories), 0));
  const meals = new Set(logs.map((l) => l.meal_type));

  return (
    <Link href="/log/food" className="block flex-1">
      <Card className="h-full">
        <p className="text-xs text-text-muted mb-1.5">Nourishment</p>
        <p className="text-2xl font-light numeric">{total.toLocaleString()}</p>
        <p className="text-xs text-text-muted mt-0.5">kcal today</p>
        <div className="flex gap-1.5 mt-3">
          {(["breakfast", "lunch", "dinner", "snack"] as const).map((m) => (
            <span
              key={m}
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium ${
                meals.has(m)
                  ? "bg-primary-soft text-text"
                  : "bg-surface-muted text-text-muted"
              }`}
              aria-label={`${m} ${meals.has(m) ? "logged" : "not logged"}`}
            >
              {MEAL_LABELS[m]}
            </span>
          ))}
        </div>
      </Card>
    </Link>
  );
}

export function MovementCard({ logs }: { logs: ExerciseLog[] }) {
  const totalMin = logs.reduce((s, l) => s + l.duration_minutes, 0);
  const last = logs[0];

  return (
    <Link href="/log/exercise" className="block flex-1">
      <Card className="h-full">
        <p className="text-xs text-text-muted mb-1.5">Movement</p>
        <p className="text-2xl font-light numeric">
          {totalMin}
          <span className="text-base text-text-muted ml-1">min</span>
        </p>
        <p className="text-xs text-text-muted mt-0.5">
          {last ? `${last.exercise_type} · ${last.intensity}` : "Nothing yet"}
        </p>
        <div className="flex gap-1 mt-3">
          {[1, 2, 3].map((i) => {
            const filled = last
              ? (last.intensity === "light" && i === 1) ||
                (last.intensity === "medium" && i <= 2) ||
                (last.intensity === "hard" && i <= 3)
              : false;
            return (
              <span
                key={i}
                className={`w-1.5 h-1.5 rounded-full ${
                  filled ? "bg-primary" : "bg-surface-muted"
                }`}
              />
            );
          })}
        </div>
      </Card>
    </Link>
  );
}
